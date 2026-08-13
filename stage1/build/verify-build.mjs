import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const expectedDecks = {
  'ai-connections.html': /Connect the AIs/i,
  'anti-ai.html': /Android Apocolypse/i,
  'bigbus.html': /AI with BigBus/i,
};

for (const [file, content] of Object.entries(expectedDecks)) {
  const html = await readFile(path.join(root, 'dist', file), 'utf8');
  assert.match(html, content, `${file} should contain its legacy deck content`);
  assert.match(html, /Stage 2 · Reveal\.js 6\.0\.1/, `${file} should identify the compatibility runtime`);
  assert.doesNotMatch(html, /src=["']dist\/reveal\.js|src=["']plugin\/notes\/notes\.js/, `${file} must not load the forked Reveal runtime`);
  assert.match(html, /_runtime\/.+\.js/, `${file} should load a Vite runtime bundle`);
}

for (const asset of [
  'adamhall.jpg',
  'robot-wannabe.png',
  'feedback-16th-may.png',
]) {
  await access(path.join(root, 'dist', 'legacy-assets', asset));
}

await access(path.join(root, 'dist', 'themes', 'black.css'));
await access(path.join(root, 'dist', 'themes', 'AND.css'));
await access(path.join(root, 'dist', 'js', 'gpt-component.js'));
await access(path.join(root, 'dist', 'js', 'gpt-component.html'));
await access(path.join(root, 'dist', 'output', 'bigbus.html'));

console.log('Verified Stage 2 multi-deck Reveal 6 compatibility build.');
