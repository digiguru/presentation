import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';

import { contentType, resolveRequestPath } from '../scripts/static-server.mjs';

test('contentType returns useful web content types', () => {
  assert.equal(contentType('deck.html'), 'text/html; charset=utf-8');
  assert.equal(contentType('theme.css'), 'text/css; charset=utf-8');
  assert.equal(contentType('asset.bin'), 'application/octet-stream');
});

test('resolveRequestPath keeps requests inside the configured root', () => {
  const root = path.resolve('/tmp/site');
  assert.equal(resolveRequestPath(root, '/deck.html').path, path.join(root, 'deck.html'));
  assert.equal(resolveRequestPath(root, '/..%2fsecret.txt').status, 403);
  assert.equal(resolveRequestPath(root, '/%E0%A4%A').status, 400);
});
