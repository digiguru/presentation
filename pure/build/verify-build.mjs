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
  assert.match(html, /Pure · Reveal\.js 6\.0\.1/, `${file} should identify the Pure runtime`);
  assert.doesNotMatch(html, /src=["']dist\/reveal\.js|src=["']plugin\/notes\/notes\.js|src=["']js\/gpt-component\.js/, `${file} must not load forked/legacy runtime scripts`);
  assert.match(html, /_runtime\/.+\.js/, `${file} should load a Vite runtime bundle`);
}

for (const asset of [
  'adamhall.jpg',
  'robot-wannabe.png',
  'feedback-16th-may.png',
  'AND-logo.png',
]) {
  await access(path.join(root, 'dist', 'legacy-assets', asset));
}

await access(path.join(root, 'dist', 'themes', 'black.css'));
await access(path.join(root, 'dist', 'themes', 'AND.css'));
await access(path.join(root, 'dist', 'output', 'bigbus.html'));
await assert.rejects(access(path.join(root, 'dist', 'js', 'gpt-component.js')));
await assert.rejects(access(path.join(root, 'dist', 'js', 'gpt-component.html')));

console.log('Verified Pure multi-deck Reveal 6 build without legacy GPT runtime files.');
