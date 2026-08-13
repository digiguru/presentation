import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import config from './vite.pure.config.mjs';
import { pureDeckNames } from './build/deck-names.mjs';

const pureRoot = path.dirname(fileURLToPath(import.meta.url));
const shell = readFileSync(path.join(pureRoot, 'deck.html'), 'utf8');
for (const deckName of pureDeckNames) {
  writeFileSync(path.join(pureRoot, deckName), shell, 'utf8');
}

export default config;
