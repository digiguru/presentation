import { copyFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { loadLegacyDeck } from './build/legacy-deck.mjs';

const stage1Root = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(stage1Root, '..');
const legacyDeckPath = path.join(repoRoot, 'ai-connections.html');
const generatedPublic = path.join(stage1Root, '.stage1-public');
const legacyAssetsDir = path.join(repoRoot, 'assets');
const deck = await loadLegacyDeck(legacyDeckPath);

await rm(generatedPublic, { recursive: true, force: true });

for (const asset of deck.assets) {
  const source = path.resolve(legacyAssetsDir, asset);
  const destination = path.resolve(generatedPublic, 'legacy-assets', asset);
  const relative = path.relative(legacyAssetsDir, source);

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Legacy asset escapes assets directory: ${asset}`);
  }

  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(source, destination);
}

function stage1DeckPlugin() {
  return {
    name: 'digiguru-stage1-deck',
    transformIndexHtml: {
      order: 'pre',
      handler(html, context) {
        if (!context.filename.endsWith('ai-connections.html')) return html;

        return html
          .replace('<!-- LEGACY_TITLE -->', deck.title)
          .replace('<!-- LEGACY_INLINE_STYLES -->', deck.styles)
          .replace('<!-- LEGACY_SLIDES -->', deck.slides);
      }
    }
  };
}

export default defineConfig({
  root: stage1Root,
  base: './',
  publicDir: generatedPublic,
  plugins: [stage1DeckPlugin()],
  server: {
    fs: {
      allow: [repoRoot]
    }
  },
  build: {
    outDir: path.join(stage1Root, 'dist'),
    emptyOutDir: true,
    assetsDir: '_runtime',
    rollupOptions: {
      input: {
        'ai-connections': path.join(stage1Root, 'ai-connections.html')
      }
    }
  }
});
