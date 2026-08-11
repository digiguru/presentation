import assert from 'node:assert/strict';
import test from 'node:test';

import {
  addMissingImageAlts,
  humaniseAssetReference,
  inferAltText,
  missingImageAlts
} from '../scripts/presentation-accessibility.mjs';

test('humaniseAssetReference turns useful filenames into readable labels', () => {
  assert.equal(humaniseAssetReference('assets/OpenAI_Logo.png'), 'Open AI logo');
  assert.equal(humaniseAssetReference('assets/ai-growth.png'), 'AI growth');
  assert.equal(humaniseAssetReference('assets/1749563169075.jpeg'), undefined);
});

test('inferAltText prefers explicit image hints', () => {
  assert.equal(inferAltText('<img src="assets/x.png" data-alt="Diagram of the process">'), 'Diagram of the process');
  assert.equal(inferAltText('<img src="assets/x.png" title="A useful chart">'), 'A useful chart');
});

test('inferAltText uses nearby slide context when the asset name is meaningless', () => {
  const html = '<section><h2>How AI adoption grows</h2><img src="assets/1749563169075.jpeg"></section>';
  const index = html.indexOf('<img');
  assert.equal(inferAltText('<img src="assets/1749563169075.jpeg">', html, index), 'Illustration for How AI adoption grows');
});

test('addMissingImageAlts preserves existing alts and marks generated ones', () => {
  const input = '<section><h2>Growth</h2><img src="assets/ai-growth.png"><img src="assets/logo.png" alt="Existing"></section>';
  const result = addMissingImageAlts(input);
  assert.equal(result.added, 1);
  assert.match(result.html, /alt="AI growth" data-generated-alt="true"/);
  assert.match(result.html, /alt="Existing"/);
  assert.equal(missingImageAlts(result.html).length, 0);
});
