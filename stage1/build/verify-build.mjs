import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'dist', 'ai-connections.html');
const html = await readFile(output, 'utf8');

assert.match(html, /Connect the AIs/i, 'representative deck content should be present');
assert.match(html, /Stage 1 · Reveal\.js 6\.0\.1/, 'comparison badge should identify the new runtime');
assert.doesNotMatch(html, /dist\/reveal\.js|plugin\/notes\/notes\.js/, 'legacy Reveal runtime paths must not leak into Stage 1');
assert.match(html, /_runtime\/.+\.js/, 'Vite should emit the new runtime bundle');

for (const asset of [
  'adamhall.jpg',
  'robot-wannabe.png',
  'feedback-16th-may.png'
]) {
  await access(path.join(root, 'dist', 'legacy-assets', asset));
}

console.log('Verified Stage 1 Reveal 6 build and representative assets.');
