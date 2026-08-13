import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { auditSources, summariseSources } from '../build/audit-sources.mjs';

const pureRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(pureRoot, '..');

test('all presentations use the canonical Pure source format', async () => {
  const summary = summariseSources(await auditSources());
  assert.equal(summary.total, 26);
  assert.deepEqual(summary.themes, { AND: 3, black: 26 });
  assert.deepEqual(summary.capabilities, {
    canvas: 6,
    focusBackground: 26,
    gptInput: 24,
    iframe: 19,
  });
  assert.deepEqual(summary.impureDecks, []);
});

test('Christmas LEGO movie quiz remains a live eight-round image quiz', async () => {
  const html = await readFile(path.join(repoRoot, 'christmas-lego-movie-sets.html'), 'utf8');

  assert.match(html, /presentation-name" content="Christmas LEGO Movie Sets"/);
  assert.match(html, /presentation-date" content="21\/11\/2023"/);
  assert.match(html, /presentation-attendance" content="12"/);
  assert.equal((html.match(/<gpt-input data-show-image="true" data-show-input="true">/g) || []).length, 8);
  assert.equal((html.match(/class="quiz-prompt"/g) || []).length, 8);
  assert.equal((html.match(/class="fragment answer"/g) || []).length, 8);
  assert.match(html, /do not include the movie title/i);
});
