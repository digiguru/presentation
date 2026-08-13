import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { discoverPresentations } from '../../scripts/presentations.mjs';
import { loadDeckSource } from './deck-source.mjs';

const pureRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(pureRoot, '..');
const forbiddenMarkers = [
  'Reveal.initialize(',
  'dist/reveal.js',
  'dist/reset.css',
  'dist/theme/',
  'plugin/notes/',
  'plugin/markdown/',
  'plugin/highlight/',
  'js/gpt-component.js',
  'js/pie-component.js',
  '<html',
  '<head',
  '<body',
];

export async function auditSources(root = repoRoot) {
  const presentations = await discoverPresentations({ root });
  const decks = [];

  for (const presentation of presentations) {
    const filePath = path.join(root, presentation.url);
    const [html, source] = await Promise.all([
      readFile(filePath, 'utf8'),
      loadDeckSource(filePath),
    ]);
    decks.push({
      file: presentation.url,
      themes: source.themes,
      capabilities: source.capabilities,
      forbiddenMarkers: forbiddenMarkers.filter(marker => html.includes(marker)),
    });
  }
  return decks;
}

export function summariseSources(decks) {
  const themeCounts = new Map();
  const capabilityCounts = {};
  const impureDecks = [];

  for (const deck of decks) {
    for (const theme of deck.themes) themeCounts.set(theme, (themeCounts.get(theme) || 0) + 1);
    for (const [capability, enabled] of Object.entries(deck.capabilities)) {
      if (enabled) capabilityCounts[capability] = (capabilityCounts[capability] || 0) + 1;
    }
    if (deck.forbiddenMarkers.length) {
      impureDecks.push(`${deck.file}: ${deck.forbiddenMarkers.join(', ')}`);
    }
  }

  return {
    total: decks.length,
    themes: Object.fromEntries([...themeCounts.entries()].sort(([a], [b]) => a.localeCompare(b))),
    capabilities: Object.fromEntries(Object.entries(capabilityCounts).sort(([a], [b]) => a.localeCompare(b))),
    impureDecks,
  };
}

function printSummary(summary) {
  console.log(`Audited ${summary.total} canonical pure-v1 presentation sources.`);
  console.log(`Themes: ${Object.entries(summary.themes).map(([name, count]) => `${name}=${count}`).join(', ') || 'none'}`);
  console.log(`Capabilities: ${Object.entries(summary.capabilities).map(([name, count]) => `${name}=${count}`).join(', ') || 'none'}`);
  console.log(`Sources with forbidden legacy runtime markers: ${summary.impureDecks.length}`);
  for (const deck of summary.impureDecks) console.log(`  - ${deck}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  printSummary(summariseSources(await auditSources()));
}
