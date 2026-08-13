import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { discoverPresentations } from '../scripts/presentations.mjs';
import config from './vite.pure.config.mjs';

const pureRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(pureRoot, '..');
const publicRoot = path.join(pureRoot, '.pure-public');
const shell = readFileSync(path.join(pureRoot, 'deck.html'), 'utf8');
const deckNames = (await discoverPresentations({ root: repoRoot })).map(presentation => presentation.url);

for (const deckName of deckNames) {
  writeFileSync(path.join(pureRoot, deckName), shell, 'utf8');
}

rmSync(publicRoot, { recursive: true, force: true });
mkdirSync(path.join(publicRoot, 'themes'), { recursive: true });
cpSync(path.join(repoRoot, 'assets'), path.join(publicRoot, 'assets'), { recursive: true });
cpSync(path.join(repoRoot, 'output'), path.join(publicRoot, 'output'), { recursive: true });
cpSync(
  path.join(pureRoot, 'node_modules', 'reveal.js', 'dist', 'theme'),
  path.join(publicRoot, 'themes'),
  { recursive: true }
);

const customTheme = readFileSync(path.join(pureRoot, 'themes', 'AND.css'), 'utf8');
writeFileSync(
  path.join(publicRoot, 'themes', 'AND.css'),
  customTheme.replace(/(?:\.\.\/)+assets\//g, '../assets/'),
  'utf8'
);

export default {
  ...config,
  publicDir: publicRoot,
};
