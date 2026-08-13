import assert from 'node:assert/strict';
import test from 'node:test';
import { auditSources, summariseSources } from '../build/audit-sources.mjs';

test('all presentations use the canonical Pure source format', async () => {
  const summary = summariseSources(await auditSources());
  assert.equal(summary.total, 25);
  assert.deepEqual(summary.themes, { AND: 3, black: 25 });
  assert.deepEqual(summary.capabilities, {
    canvas: 6,
    focusBackground: 25,
    gptInput: 23,
    iframe: 19,
  });
  assert.deepEqual(summary.impureDecks, []);
});
