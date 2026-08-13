import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const pureRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(pureRoot, '..');
const publicRoot = path.join(pureRoot, '.pure-public');

await rm(publicRoot, { recursive: true, force: true });
await mkdir(path.join(publicRoot, 'themes'), { recursive: true });
await cp(path.join(repoRoot, 'assets'), path.join(publicRoot, 'assets'), { recursive: true });
await cp(path.join(repoRoot, 'output'), path.join(publicRoot, 'output'), { recursive: true });
await cp(
  path.join(pureRoot, 'node_modules', 'reveal.js', 'dist', 'theme'),
  path.join(publicRoot, 'themes'),
  { recursive: true }
);

const customTheme = await readFile(path.join(repoRoot, 'dist', 'theme', 'AND.css'), 'utf8');
await writeFile(
  path.join(publicRoot, 'themes', 'AND.css'),
  customTheme.replace(/(?:\.\.\/)+assets\//g, '../assets/'),
  'utf8'
);

console.log('Prepared Pure presentation assets, output files and themes.');
