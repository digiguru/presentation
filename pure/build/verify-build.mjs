import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const buildInfo = JSON.parse(await readFile(path.join(dist, 'build-info.json'), 'utf8'));
const manifest = JSON.parse(await readFile(path.join(dist, 'presentations.json'), 'utf8'));
const indexHtml = await readFile(path.join(dist, 'index.html'), 'utf8');

assert.match(buildInfo.commitSha, /^[0-9a-f]{40}$/i);
assert.equal(manifest.length, buildInfo.presentationCount);
assert.equal(manifest.length, 25);
assert.ok(indexHtml.includes(buildInfo.commitSha));

let supersededGptScripts = 0;
for (const presentation of manifest) {
  assert.ok(indexHtml.includes(presentation.url));
  assert.equal(presentation.inlineScripts.custom, 0);
  assert.equal(presentation.localSupportScripts.length, 0);
  supersededGptScripts += presentation.inlineScripts.legacyGpt || 0;

  const html = await readFile(path.join(dist, presentation.url), 'utf8');
  assert.ok(html.includes('Pure · Reveal.js 6.0.1'));
  assert.ok(html.includes(buildInfo.commitSha));
  assert.ok(html.includes(`content="${presentation.url}"`));
  for (const localReference of presentation.localReferences) {
    await access(path.join(dist, localReference));
  }
}

assert.equal(supersededGptScripts, 3);
console.log(`Verified all ${manifest.length} Pure presentations at ${buildInfo.commitSha}.`);
