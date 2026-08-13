import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  discoverPresentations,
  exportSite,
  isCanonicalPresentationSource,
  isValidVersion,
  normaliseAttendance,
  parsePresentationDate,
  toYaml
} from '../scripts/presentations.mjs';

function canonicalSource({
  title = 'Test talk',
  name = 'Test Talk',
  version = 'v1.0',
  date = '01/01/2025',
  attendance,
  extraMeta = '',
} = {}) {
  const attendanceMeta = attendance === undefined
    ? ''
    : `<meta name="presentation-attendance" content="${attendance}">`;
  return `<!doctype html>
<title>${title}</title>
<meta name="presentation-format" content="pure-v1">
<meta name="presentation-name" content="${name}">
<meta name="presentation-version" content="${version}">
<meta name="presentation-date" content="${date}">
${attendanceMeta}${extraMeta}
<script type="application/json" id="presentation-options">{}</script>
<div class="slides"><section><h1>Test</h1></section></div>
`;
}

test('parsePresentationDate accepts real dates including leap days', () => {
  assert.equal(typeof parsePresentationDate('29/02/2024'), 'number');
  assert.equal(parsePresentationDate('31/02/2024'), undefined);
  assert.equal(parsePresentationDate('not-a-date'), undefined);
});

test('isValidVersion enforces the documented vX.Y format', () => {
  assert.equal(isValidVersion('v6.2'), true);
  assert.equal(isValidVersion('V12.10'), true);
  assert.equal(isValidVersion('6.2'), false);
  assert.equal(isValidVersion('v6'), false);
  assert.equal(isValidVersion('v6.2.1'), false);
});

test('normaliseAttendance accepts only non-negative integers', () => {
  assert.equal(normaliseAttendance('40'), 40);
  assert.equal(normaliseAttendance(0), 0);
  assert.equal(normaliseAttendance('?'), undefined);
  assert.equal(normaliseAttendance('-1'), undefined);
  assert.equal(normaliseAttendance('4.5'), undefined);
  assert.equal(normaliseAttendance('lots'), undefined);
});

test('canonical source detection requires pure-v1 plus slides', () => {
  assert.equal(isCanonicalPresentationSource(canonicalSource()), true);
  assert.equal(isCanonicalPresentationSource('<div class="reveal"><div class="slides"></div></div>'), false);
  assert.equal(isCanonicalPresentationSource('<meta name="presentation-format" content="pure-v1">'), false);
});

test('discoverPresentations discovers, validates and sorts canonical sources', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'presentation-metadata-'));
  try {
    await writeFile(path.join(root, 'later.html'), canonicalSource({
      title: 'Later', name: 'Later', version: 'v2.0', date: '02/01/2025'
    }));
    await writeFile(path.join(root, 'earlier.html'), canonicalSource({
      title: 'Earlier', name: 'Earlier', version: 'v1.0', date: '01/01/2025', attendance: 25
    }));
    await writeFile(path.join(root, 'not-a-deck.html'), '<html><body>Ignored non-presentation HTML</body></html>');

    const presentations = await discoverPresentations({ root });
    assert.deepEqual(presentations, [
      { name: 'Earlier', version: 'v1.0', date: '01/01/2025', url: 'earlier.html', attendance: 25 },
      { name: 'Later', version: 'v2.0', date: '02/01/2025', url: 'later.html', attendance: undefined }
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('discoverPresentations rejects presentation-shaped legacy sources', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'presentation-legacy-'));
  try {
    await writeFile(
      path.join(root, 'legacy.html'),
      '<div class="reveal"><div class="slides"><section>Legacy source</section></div></div>'
    );

    await assert.rejects(
      discoverPresentations({ root }),
      /must declare presentation-format="pure-v1"/
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('discoverPresentations rejects invalid explicit metadata', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'presentation-invalid-'));
  try {
    await writeFile(path.join(root, 'bad.html'), canonicalSource({
      title: 'Bad metadata',
      name: 'Bad',
      version: '6',
      date: '31/02/2026',
      attendance: 'many'
    }));

    await assert.rejects(
      discoverPresentations({ root }),
      error => {
        assert.match(error.message, /invalid version/);
        assert.match(error.message, /invalid date/);
        assert.match(error.message, /invalid attendance/);
        return true;
      }
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('toYaml emits numeric attendance without quotes', () => {
  const yaml = toYaml([
    { name: 'Talk', version: 'v1.0', date: '01/01/2026', url: 'talk.html', attendance: 12 }
  ]);
  assert.match(yaml, /attendance: 12/);
  assert.doesNotMatch(yaml, /attendance: "12"/);
});

test('exportSite copies only a validated Pure build artifact', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'presentation-export-'));
  const builtSiteDir = path.join(root, 'pure-dist');
  const outputDir = path.join(root, 'preview-site');
  const presentations = [
    { name: 'Preview Talk', version: 'v1.0', date: '11/08/2026', url: 'talk.html', attendance: undefined }
  ];

  try {
    await mkdir(path.join(builtSiteDir, '_runtime'), { recursive: true });
    await writeFile(path.join(builtSiteDir, 'talk.html'), '<html><meta name="build-commit" content="abc"><body>Pure</body></html>');
    await writeFile(path.join(builtSiteDir, 'index.html'), '<html>Pure index</html>');
    await writeFile(path.join(builtSiteDir, '_runtime', 'runtime.js'), 'console.log("pure runtime");\n');
    await writeFile(path.join(builtSiteDir, 'build-info.json'), JSON.stringify({ commitSha: 'abc', presentationCount: 1 }));
    await writeFile(path.join(builtSiteDir, 'presentations.json'), JSON.stringify(presentations));
    await writeFile(path.join(root, 'legacy-runtime.js'), 'must not be exported');

    await exportSite(outputDir, presentations, { root, builtSiteDir });

    assert.match(await readFile(path.join(outputDir, 'talk.html'), 'utf8'), /Pure/);
    assert.equal(await readFile(path.join(outputDir, '_runtime', 'runtime.js'), 'utf8'), 'console.log("pure runtime");\n');
    assert.equal((await readdir(outputDir)).includes('legacy-runtime.js'), false);
    assert.deepEqual(
      JSON.parse(await readFile(path.join(outputDir, 'presentations.json'), 'utf8')),
      JSON.parse(JSON.stringify(presentations))
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('exportSite rejects a Pure build whose presentation manifest is stale', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'presentation-export-stale-'));
  const builtSiteDir = path.join(root, 'pure-dist');
  try {
    await mkdir(builtSiteDir, { recursive: true });
    await writeFile(path.join(builtSiteDir, 'presentations.json'), JSON.stringify([{ url: 'wrong.html' }]));

    await assert.rejects(
      exportSite(path.join(root, 'out'), [{ url: 'talk.html' }], { root, builtSiteDir }),
      /does not match metadata discovery/
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
