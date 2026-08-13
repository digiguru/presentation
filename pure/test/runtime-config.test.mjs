import assert from 'node:assert/strict';
import test from 'node:test';

import { defaultGptApiBase, resolveGptApiBase } from '../src/presentation-runtime/runtime-config.js';

test('Pure GPT defaults to the same-origin preview API boundary', () => {
  assert.equal(defaultGptApiBase, '/api/prompt');
  assert.equal(resolveGptApiBase(undefined), '/api/prompt');
});

test('Pure GPT uses an explicitly stamped production API base', () => {
  const documentRoot = {
    querySelector(selector) {
      assert.equal(selector, 'meta[name="pure-gpt-api-base"]');
      return { getAttribute: () => 'https://ai-prompt-writer.vercel.app/api/' };
    },
  };

  assert.equal(resolveGptApiBase(documentRoot), 'https://ai-prompt-writer.vercel.app/api');
});
