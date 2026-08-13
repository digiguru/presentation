import assert from 'node:assert/strict';
import test from 'node:test';
import { auditLegacyDecks, summariseCompatibility } from '../build/audit-legacy-decks.mjs';

test('all presentations are ready for the Pure corpus', async () => {
  const summary = summariseCompatibility(await auditLegacyDecks());
  assert.equal(summary.total, 25);
  assert.equal(summary.legacyGptInlineDecks.length, 3);
  assert.equal(summary.customInlineDecks.length, 0);
  assert.equal(summary.localSupportScriptDecks.length, 0);
});
