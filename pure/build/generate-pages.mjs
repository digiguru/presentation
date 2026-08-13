import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { discoverPureDeckNames } from './corpus.mjs';

export async function generatePurePages(pureRoot) {
  const shell = await readFile(path.join(pureRoot, 'deck.html'), 'utf8');
  const deckNames = await discoverPureDeckNames(pureRoot);
  for (const deckName of deckNames) {
    await writeFile(path.join(pureRoot, deckName), shell, 'utf8');
  }
  return deckNames;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const pureRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const deckNames = await generatePurePages(pureRoot);
  console.log(`Generated ${deckNames.length} Pure presentation entry pages.`);
}
