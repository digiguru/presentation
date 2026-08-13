import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  collectAssetPaths,
  extractInlineStyles,
  extractSlides,
  loadLegacyDeck,
  rewriteLegacyAssets
} from '../build/legacy-deck.mjs';

const stage1Root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(stage1Root, '..');
const representativeDeck = path.join(repoRoot, 'ai-connections.html');

test('extractSlides handles nested divs without truncating the deck', () => {
  const html = '<div class="reveal"><div class="slides"><section><div>one</div></section><section>two</section></div></div>';
  assert.equal(extractSlides(html), '<section><div>one</div></section><section>two</section>');
});

test('asset collection is deterministic and rejects traversal-like matches', () => {
  assert.deepEqual(
    collectAssetPaths('<img src="assets/b.png"><div style="background:url(assets/a.png)"></div><img src="assets/../bad.png">'),
    ['a.png', 'b.png']
  );
});

test('legacy asset references are moved behind the Stage 1 public boundary', () => {
  assert.equal(rewriteLegacyAssets('assets/example.png'), 'legacy-assets/example.png');
});

test('representative ai-connections deck can be consumed by the clean runtime', async () => {
  const source = await readFile(representativeDeck, 'utf8');
  const deck = await loadLegacyDeck(representativeDeck);

  assert.match(deck.slides, /Connect the AIs/);
  assert.match(deck.slides, /class="fragment fade-up"/);
  assert.match(deck.slides, /data-auto-animate/);
  assert.match(deck.slides, /data-background-image="legacy-assets\//);
  assert.ok(deck.assets.includes('adamhall.jpg'));
  assert.ok(deck.assets.includes('feedback-16th-may.png'));
  assert.ok(extractInlineStyles(source).includes('.pie'));
  assert.doesNotMatch(deck.slides, /dist\/reveal\.js/);
});
