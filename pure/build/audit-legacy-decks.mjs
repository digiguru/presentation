import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { discoverPresentations } from '../../scripts/presentations.mjs';
import { loadLegacyDeck } from './legacy-deck.mjs';

const stageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(stageRoot, '..');

export async function auditLegacyDecks(root = repoRoot) {
  const presentations = await discoverPresentations({ root });
  const decks = [];

  for (const presentation of presentations) {
    const legacy = await loadLegacyDeck(path.join(root, presentation.url));
    decks.push({
      file: presentation.url,
      themes: legacy.themes,
      capabilities: legacy.capabilities,
      externalStylesheets: legacy.externalStylesheets.length,
      externalScripts: legacy.externalScripts.length,
      localReferences: legacy.localReferences,
      localSupportScripts: legacy.localSupportScripts,
      inlineScripts: legacy.inlineScripts,
    });
  }

  return decks;
}

export function summariseCompatibility(decks) {
  const themeCounts = new Map();
  const capabilityCounts = {};
  const customInlineDecks = [];
  const localSupportScriptDecks = [];

  for (const deck of decks) {
    for (const theme of deck.themes) themeCounts.set(theme, (themeCounts.get(theme) || 0) + 1);
    for (const [capability, enabled] of Object.entries(deck.capabilities)) {
      if (enabled) capabilityCounts[capability] = (capabilityCounts[capability] || 0) + 1;
    }
    if (deck.inlineScripts.custom) customInlineDecks.push(`${deck.file} (${deck.inlineScripts.custom})`);
    if (deck.localSupportScripts.length) {
      localSupportScriptDecks.push(`${deck.file}: ${deck.localSupportScripts.join(', ')}`);
    }
  }

  return {
    total: decks.length,
    themes: Object.fromEntries([...themeCounts.entries()].sort(([a], [b]) => a.localeCompare(b))),
    capabilities: Object.fromEntries(Object.entries(capabilityCounts).sort(([a], [b]) => a.localeCompare(b))),
    customInlineDecks,
    localSupportScriptDecks,
  };
}

function printSummary(summary) {
  console.log(`Compatibility-audited ${summary.total} legacy presentations.`);
  console.log(`Themes: ${Object.entries(summary.themes).map(([name, count]) => `${name}=${count}`).join(', ') || 'none'}`);
  console.log(`Capabilities: ${Object.entries(summary.capabilities).map(([name, count]) => `${name}=${count}`).join(', ') || 'none'}`);
  console.log(`Decks with custom inline scripts requiring Stage 3 review: ${summary.customInlineDecks.length}`);
  for (const deck of summary.customInlineDecks) console.log(`  - ${deck}`);
  console.log(`Decks with non-standard local support scripts: ${summary.localSupportScriptDecks.length}`);
  for (const deck of summary.localSupportScriptDecks) console.log(`  - ${deck}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  printSummary(summariseCompatibility(await auditLegacyDecks()));
}
