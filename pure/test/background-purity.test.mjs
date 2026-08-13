import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { discoverPresentations } from '../../scripts/presentations.mjs';

const pureRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(pureRoot, '..');

test('presentation backgrounds are declarative', async () => {
  const presentations = await discoverPresentations({ root: repoRoot });
  const coupled = [];

  for (const presentation of presentations) {
    const html = await readFile(path.join(repoRoot, presentation.url), 'utf8');
    if (html.includes('Reveal.addEventListener') && html.includes('parallaxBackgroundImage')) coupled.push(presentation.url);
  }

  assert.deepEqual(coupled, [], `Use data-background-image instead: ${coupled.join(', ')}`);
});
