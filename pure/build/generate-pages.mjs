import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { discoverPureDeckNames } from './corpus.mjs';

export async function generatePurePages(pureRoot) {
  const shell = await readFile(path.join(pureRoot, 'deck-shell.html'), 'utf8');
  const deckNames = await discoverPureDeckNames(pureRoot);
  for (const deckName of deckNames) {
    await writeFile(path.join(pureRoot, deckName), shell, 'utf8');
  }
  return deckNames;
}
