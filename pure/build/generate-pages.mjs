import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pureDeckNames } from './deck-names.mjs';

export async function generatePurePages(pureRoot) {
  const shell = await readFile(path.join(pureRoot, 'deck-shell.html'), 'utf8');
  for (const deckName of pureDeckNames) {
    await writeFile(path.join(pureRoot, deckName), shell, 'utf8');
  }
  return pureDeckNames;
}
