import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { discoverPresentations } from './presentations.mjs';
import { loadLegacyDeck } from '../pure/build/legacy-deck.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function escapeAttribute(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function meta(name, value) {
  return `<meta name="${name}" content="${escapeAttribute(value)}">`;
}

function renderCanonicalSource(presentation, deck) {
  const lines = [
    '<!doctype html>',
    `<title>${deck.title}</title>`,
    meta('presentation-format', 'pure-v1'),
    meta('presentation-name', presentation.name),
    meta('presentation-version', presentation.version),
    meta('presentation-date', presentation.date),
  ];

  if (presentation.attendance !== undefined) {
    lines.push(meta('presentation-attendance', presentation.attendance));
  }

  lines.push(meta('presentation-reveal-classes', deck.revealClasses));
  for (const theme of deck.themes) lines.push(meta('presentation-theme', theme));

  if (deck.externalStylesheets.length) {
    lines.push('', ...deck.externalStylesheets);
  }
  if (deck.styles) lines.push('', deck.styles);

  lines.push(
    '',
    '<script type="application/json" id="presentation-options">',
    JSON.stringify(deck.options, null, 2).replaceAll('</script', '<\\/script'),
    '</script>',
    '',
    '<div class="slides">',
    deck.slides,
    '</div>'
  );

  if (deck.externalScripts.length) lines.push('', ...deck.externalScripts);
  lines.push('');
  return lines.join('\n');
}

const presentations = await discoverPresentations({ root: repoRoot });
if (presentations.length !== 25) {
  throw new Error(`Expected 25 presentation sources before Stage 7 migration, found ${presentations.length}.`);
}

let supersededGpt = 0;
for (const presentation of presentations) {
  const filePath = path.join(repoRoot, presentation.url);
  const before = await readFile(filePath, 'utf8');
  const deck = await loadLegacyDeck(filePath);

  if (deck.inlineScripts.custom > 0) {
    throw new Error(`${presentation.url} contains ${deck.inlineScripts.custom} unported custom inline script(s).`);
  }
  if (deck.localSupportScripts.length > 0) {
    throw new Error(`${presentation.url} contains local support scripts: ${deck.localSupportScripts.join(', ')}`);
  }

  supersededGpt += deck.inlineScripts.legacyGpt;
  const after = renderCanonicalSource(presentation, deck);
  if (after === before) throw new Error(`${presentation.url} was already canonical; migration is not one-shot.`);
  await writeFile(filePath, after, 'utf8');
  console.log(`Migrated ${presentation.url}`);
}

console.log(`Migrated ${presentations.length} presentation sources to pure-v1.`);
console.log(`Dropped ${supersededGpt} superseded historical inline GPT implementation(s).`);
