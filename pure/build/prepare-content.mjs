import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const pureRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(pureRoot, '..');
const outputRoot = path.join(pureRoot, 'dist');

await mkdir(path.join(outputRoot, 'themes'), { recursive: true });
await cp(path.join(repoRoot, 'assets'), path.join(outputRoot, 'assets'), { recursive: true, force: true });
await cp(path.join(repoRoot, 'output'), path.join(outputRoot, 'output'), { recursive: true, force: true });
await cp(
  path.join(pureRoot, 'node_modules', 'reveal.js', 'dist', 'theme'),
  path.join(outputRoot, 'themes'),
  { recursive: true, force: true }
);

const customTheme = await readFile(path.join(repoRoot, 'dist', 'theme', 'AND.css'), 'utf8');
await writeFile(
  path.join(outputRoot, 'themes', 'AND.css'),
  customTheme.replace(/(?:\.\.\/)+assets\//g, '../assets/'),
  'utf8'
);

console.log('Copied presentation assets, output files and themes into the Pure build.');
