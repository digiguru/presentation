import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { discoverPresentations } from '../../scripts/presentations.mjs';
import { loadLegacyDeck } from './legacy-deck.mjs';

const pureRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(pureRoot, '..');

export async function auditLegacyDecks(root = repoRoot) {
  const presentations = await discoverPresentations({ root });
  const decks = [];

  for (const presentation of presentations) {
    const source = await loadLegacyDeck(path.join(root, presentation.url));
    decks.push({
      file: presentation.url,
      themes: source.themes,
      capabilities: source.capabilities,
      externalStylesheets: source.externalStylesheets.length,
      externalScripts: source.externalScripts.length,
      localReferences: source.localReferences,
      localSupportScripts: source.localSupportScripts,
      inlineScripts: source.inlineScripts,
    });
  }

  return decks;
}

export function summariseCompatibility(decks) {
  const themeCounts = new Map();
  const capabilityCounts = {};
  const legacyGptInlineDecks = [];
  const customInlineDecks = [];
  const localSupportScriptDecks = [];

  for (const deck of decks) {
    for (const theme of deck.themes) themeCounts.set(theme, (themeCounts.get(theme) || 0) + 1);
    for (const [capability, enabled] of Object.entries(deck.capabilities)) {
      if (enabled) capabilityCounts[capability] = (capabilityCounts[capability] || 0) + 1;
    }
    if (deck.inlineScripts.legacyGpt) legacyGptInlineDecks.push(`${deck.file} (${deck.inlineScripts.legacyGpt})`);
    if (deck.inlineScripts.custom) customInlineDecks.push(`${deck.file} (${deck.inlineScripts.custom})`);
    if (deck.localSupportScripts.length) {
      localSupportScriptDecks.push(`${deck.file}: ${deck.localSupportScripts.join(', ')}`);
    }
  }

  return {
    total: decks.length,
    themes: Object.fromEntries([...themeCounts.entries()].sort(([a], [b]) => a.localeCompare(b))),
    capabilities: Object.fromEntries(Object.entries(capabilityCounts).sort(([a], [b]) => a.localeCompare(b))),
    legacyGptInlineDecks,
    customInlineDecks,
    localSupportScriptDecks,
  };
}

function printSummary(summary) {
  console.log(`Compatibility-audited ${summary.total} presentation sources.`);
  console.log(`Themes: ${Object.entries(summary.themes).map(([name, count]) => `${name}=${count}`).join(', ') || 'none'}`);
  console.log(`Capabilities: ${Object.entries(summary.capabilities).map(([name, count]) => `${name}=${count}`).join(', ') || 'none'}`);
  console.log(`Historical inline GPT implementations superseded by Pure: ${summary.legacyGptInlineDecks.length}`);
  for (const deck of summary.legacyGptInlineDecks) console.log(`  - ${deck}`);
  console.log(`Unported custom inline scripts: ${summary.customInlineDecks.length}`);
  for (const deck of summary.customInlineDecks) console.log(`  - ${deck}`);
  console.log(`Non-standard local support scripts: ${summary.localSupportScriptDecks.length}`);
  for (const deck of summary.localSupportScriptDecks) console.log(`  - ${deck}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  printSummary(summariseCompatibility(await auditLegacyDecks()));
}
