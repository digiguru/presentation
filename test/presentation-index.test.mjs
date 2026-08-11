import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { renderPresentationIndex, writePresentationIndex } from '../scripts/presentation-index.mjs';

const presentations = [
  { name: 'Older & useful', version: 'v1.0', date: '01/01/2025', url: 'older.html', attendance: 12 },
  { name: 'Newer <Talk>', version: 'v2.0', date: '02/01/2026', url: 'newer.html', attendance: undefined }
];

test('renderPresentationIndex creates escaped newest-first deck links', () => {
  const html = renderPresentationIndex(presentations);

  assert.match(html, /<title>Digiguru Presentations<\/title>/);
  assert.match(html, /2 talks and workshops/);
  assert.ok(html.indexOf('newer.html') < html.indexOf('older.html'));
  assert.match(html, /Newer &lt;Talk&gt;/);
  assert.match(html, /Older &amp; useful/);
  assert.match(html, /12 attendees/);
  assert.doesNotMatch(html, /undefined attendees/);
});

test('writePresentationIndex writes index.html into the requested export directory', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'presentation-index-'));
  try {
    const indexPath = await writePresentationIndex(root, presentations);
    assert.equal(indexPath, path.join(root, 'index.html'));

    const html = await readFile(indexPath, 'utf8');
    assert.match(html, /href="newer\.html"/);
    assert.match(html, /href="older\.html"/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
