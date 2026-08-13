import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectAssetPaths } from './legacy-deck.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const expectedDecks = {
  'ai-connections.html': /Connect the AIs/i,
  'anti-ai.html': /Android Apocolypse/i,
  'bigbus.html': /AI with BigBus/i,
};

const buildInfo = JSON.parse(await readFile(path.join(dist, 'build-info.json'), 'utf8'));
assert.match(buildInfo.commitSha, /^[0-9a-f]{40}$/i, 'Pure builds must record the exact 40-character Git commit SHA');

const indexHtml = await readFile(path.join(dist, 'index.html'), 'utf8');
assert.match(indexHtml, new RegExp(buildInfo.commitSha, 'i'), 'Pure index must display the build commit SHA');
for (const file of Object.keys(expectedDecks)) {
  assert.match(indexHtml, new RegExp(file.replace('.', '\\.')), `Pure index must list ${file}`);
  assert.ok(indexHtml.includes(`${file} · commit <code>${buildInfo.commitSha}</code>`), `${file} must show the build commit on the Pure index`);
}

const referencedAssets = new Set();

for (const [file, content] of Object.entries(expectedDecks)) {
  const html = await readFile(path.join(dist, file), 'utf8');
  assert.match(html, content, `${file} should contain its legacy deck content`);
  assert.match(html, /Pure · Reveal\.js 6\.0\.1/, `${file} should identify the Pure runtime`);
  assert.ok(html.includes(`<meta name="build-commit" content="${buildInfo.commitSha}">`), `${file} should expose the exact build commit SHA`);
  assert.match(html, new RegExp(`Pure · Reveal\\.js 6\\.0\\.1 · ${buildInfo.commitSha.slice(0, 8)}`), `${file} should visibly identify its build commit`);
  assert.doesNotMatch(html, /src=["']dist\/reveal\.js|src=["']plugin\/notes\/notes\.js|src=["']js\/gpt-component\.js/, `${file} must not load forked/legacy runtime scripts`);
  assert.doesNotMatch(html, /legacy-assets\//, `${file} should preserve the existing assets/ URL contract`);
  assert.match(html, /_runtime\/.+\.js/, `${file} should load a Vite runtime bundle`);

  for (const asset of collectAssetPaths(html)) referencedAssets.add(asset);
}

for (const theme of ['black.css', 'AND.css']) {
  const css = await readFile(path.join(dist, 'themes', theme), 'utf8');
  for (const asset of collectAssetPaths(css)) referencedAssets.add(asset);
}

assert.ok(referencedAssets.size > 4, 'Expected Pure to verify more than the original sample assets');
for (const asset of referencedAssets) {
  await access(path.join(dist, 'assets', asset));
}

await access(path.join(dist, 'assets', 'adamhall.jpg'));
await access(path.join(dist, 'assets', 'robot-wannabe.png'));
await access(path.join(dist, 'assets', 'feedback-16th-may.png'));
await access(path.join(dist, 'assets', 'AND-logo.png'));
await access(path.join(dist, 'output', 'bigbus.html'));
await assert.rejects(access(path.join(dist, 'js', 'gpt-component.js')));
await assert.rejects(access(path.join(dist, 'js', 'gpt-component.html')));

console.log(`Verified Pure Reveal 6 build ${buildInfo.commitSha} and ${referencedAssets.size} referenced presentation assets.`);
