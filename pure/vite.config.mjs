import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import config from './vite.pure.config.mjs';

const pureRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(pureRoot, '..');
const publicRoot = path.join(pureRoot, '.pure-public');
const shell = readFileSync(path.join(pureRoot, 'deck.html'), 'utf8');
const ignoredHtml = new Set(['index.html', 'demo.html', 'test.html']);

const deckNames = readdirSync(repoRoot)
  .filter(fileName => fileName.endsWith('.html') && !ignoredHtml.has(fileName))
  .filter(fileName => {
    const source = readFileSync(path.join(repoRoot, fileName), 'utf8');
    return /class\s*=\s*["'][^"']*\breveal\b[^"']*["']/i.test(source)
      && /class\s*=\s*["'][^"']*\bslides\b[^"']*["']/i.test(source);
  });

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

const customTheme = readFileSync(path.join(repoRoot, 'dist', 'theme', 'AND.css'), 'utf8');
writeFileSync(
  path.join(publicRoot, 'themes', 'AND.css'),
  customTheme.replace(/(?:\.\.\/)+assets\//g, '../assets/'),
  'utf8'
);

export default {
  ...config,
  publicDir: publicRoot,
};
