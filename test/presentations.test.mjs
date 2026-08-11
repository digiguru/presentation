import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  cleanName,
  discoverPresentations,
  exportSite,
  isValidVersion,
  normaliseAttendance,
  parseLegacyYaml,
  parsePresentationDate,
  toYaml
} from '../scripts/presentations.mjs';

function revealDeck(title, extraHead = '') {
  return `<!doctype html>
<html>
<head><title>${title}</title>${extraHead}</head>
<body><div class="reveal"><div class="slides"><section><h1>Test</h1></section></div></div></body>
</html>`;
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

test('parseLegacyYaml creates a URL-keyed compatibility registry', () => {
  const registry = parseLegacyYaml(`- name: Old Talk\n  version: v1.2\n  date: 01/02/2020\n  url: old.html\n  attendance: 12\n`);
  assert.deepEqual(registry.get('old.html'), {
    name: 'Old Talk',
    version: 'v1.2',
    date: '01/02/2020',
    url: 'old.html',
    attendance: '12'
  });
});

test('cleanName removes version/date suffixes but preserves legacy names', () => {
  assert.equal(cleanName('A Useful Talk - v6.2 - 11/08/2026'), 'A Useful Talk');
  assert.equal(cleanName('Ignored', { name: 'Historic Display Name' }), 'Historic Display Name');
});

test('discoverPresentations discovers, validates and sorts Reveal decks', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'presentation-metadata-'));
  try {
    await writeFile(path.join(root, 'later.html'), revealDeck('Later - v2.0 - 02/01/2025'));
    await writeFile(path.join(root, 'earlier.html'), revealDeck('Earlier - v1.0 - 01/01/2025', '<meta name="presentation-attendance" content="25">'));
    await writeFile(path.join(root, 'not-a-deck.html'), '<html><head><title>Ignored</title></head><body>No Reveal containers</body></html>');

    const presentations = await discoverPresentations({ root });
    assert.deepEqual(presentations, [
      { name: 'Earlier', version: 'v1.0', date: '01/01/2025', url: 'earlier.html', attendance: 25 },
      { name: 'Later', version: 'v2.0', date: '02/01/2025', url: 'later.html', attendance: undefined }
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('discoverPresentations rejects invalid explicit metadata', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'presentation-invalid-'));
  try {
    await writeFile(
      path.join(root, 'bad.html'),
      revealDeck(
        'Bad metadata',
        '<meta name="presentation-name" content="Bad"><meta name="presentation-version" content="6"><meta name="presentation-date" content="31/02/2026"><meta name="presentation-attendance" content="many">'
      )
    );

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

test('exportSite can write inside the source root without recursively copying itself', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'presentation-export-'));
  const outputDir = path.join(root, 'preview-site');

  try {
    await writeFile(path.join(root, 'talk.html'), revealDeck('Preview Talk - v1.0 - 11/08/2026'));
    await mkdir(path.join(root, 'dist'), { recursive: true });
    await writeFile(path.join(root, 'dist', 'runtime.js'), 'console.log("runtime");\n');

    const presentations = await discoverPresentations({ root });
    await exportSite(outputDir, presentations, { root });

    assert.match(await readFile(path.join(outputDir, 'talk.html'), 'utf8'), /class="reveal"/);
    assert.equal(await readFile(path.join(outputDir, 'dist', 'runtime.js'), 'utf8'), 'console.log("runtime");\n');
    assert.equal((await readdir(outputDir)).includes('preview-site'), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
