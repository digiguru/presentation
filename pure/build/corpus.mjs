import path from 'node:path';
import { discoverPresentations } from '../../scripts/presentations.mjs';

export async function discoverPurePresentations(pureRoot) {
  const repoRoot = path.resolve(pureRoot, '..');
  return discoverPresentations({ root: repoRoot });
}

export async function discoverPureDeckNames(pureRoot) {
  return (await discoverPurePresentations(pureRoot)).map(presentation => presentation.url);
}
