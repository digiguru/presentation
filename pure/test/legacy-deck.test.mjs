import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { auditLegacyDecks, summariseCompatibility } from '../build/audit-legacy-decks.mjs';
import {
  collectAssetPaths,
  collectLocalReferences,
  extractExternalScripts,
  extractExternalStylesheets,
  extractInlineStyles,
  extractRevealOptions,
  extractSlides,
  extractThemes,
  loadLegacyDeck,
} from '../build/legacy-deck.mjs';

const pureRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(pureRoot, '..');

function deckPath(name) {
  return path.join(repoRoot, name);
}

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

test('compatibility extraction preserves themes, external dependencies and safe support files', () => {
  const html = `
    <link rel="stylesheet" href="dist/theme/black.css">
    <link rel="stylesheet" href="dist/theme/AND.css">
    <link rel="stylesheet" href="https://example.com/font.css">
    <script src="https://example.com/chart.js"></script>
    <a href="output/example.html">output</a>
    <script>Reveal.initialize({ hash: true, controls: false, transition: 'fade' });</script>`;

  assert.deepEqual(extractThemes(html), ['black', 'AND']);
  assert.equal(extractExternalStylesheets(html).length, 1);
  assert.equal(extractExternalScripts(html).length, 1);
  assert.deepEqual(collectLocalReferences(html), ['output/example.html']);
  assert.deepEqual(extractRevealOptions(html), { hash: true, controls: false, transition: 'fade' });
});

test('Pure preserves the existing public assets contract', async () => {
  const deck = await loadLegacyDeck(deckPath('ai-connections.html'));
  assert.match(deck.slides, /data-background-image="assets\//);
  assert.doesNotMatch(deck.slides, /legacy-assets\//);
});

test('ai-connections remains consumable by Pure', async () => {
  const source = await readFile(deckPath('ai-connections.html'), 'utf8');
  const deck = await loadLegacyDeck(deckPath('ai-connections.html'));

  assert.match(deck.slides, /Connect the AIs/);
  assert.match(deck.slides, /class="fragment fade-up"/);
  assert.match(deck.slides, /data-auto-animate/);
  assert.match(deck.slides, /data-background-image="assets\//);
  assert.ok(deck.assets.includes('adamhall.jpg'));
  assert.ok(deck.assets.includes('feedback-16th-may.png'));
  assert.ok(extractInlineStyles(source).includes('.pie'));
  assert.doesNotMatch(deck.slides, /dist\/reveal\.js/);
});

test('BigBus exercises the richer Pure compatibility surface', async () => {
  const deck = await loadLegacyDeck(deckPath('bigbus.html'));

  assert.deepEqual(deck.themes, ['black', 'AND']);
  assert.match(deck.revealClasses, /\bbackground\b/);
  assert.equal(deck.options.hash, true);
  assert.equal(deck.capabilities.gptInput, true);
  assert.equal(deck.capabilities.focusBackground, true);
  assert.ok(deck.externalStylesheets.some(tag => /font-awesome/i.test(tag)));
  assert.ok(deck.externalScripts.some(tag => /js-base64/i.test(tag)));
  assert.ok(deck.externalScripts.some(tag => /chart\.js/i.test(tag)));
  assert.ok(deck.localReferences.includes('output/bigbus.html'));
});

test('all discovered presentations can be inventoried before full Pure migration', async () => {
  const decks = await auditLegacyDecks();
  const summary = summariseCompatibility(decks);

  assert.ok(summary.total >= 25, `Expected the full legacy deck corpus, got ${summary.total}`);
  assert.ok(summary.themes.black > 0);
  assert.ok(summary.capabilities.focusBackground > 0);
  assert.ok(Array.isArray(summary.customInlineDecks));
  assert.ok(Array.isArray(summary.localSupportScriptDecks));
});
