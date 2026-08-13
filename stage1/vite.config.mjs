import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { collectAssetPaths, loadLegacyDeck } from './build/legacy-deck.mjs';

const stageRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(stageRoot, '..');
const generatedPublic = path.join(stageRoot, '.stage1-public');
const legacyAssetsDir = path.join(repoRoot, 'assets');
const officialThemesDir = path.join(stageRoot, 'node_modules', 'reveal.js', 'dist', 'theme');
const legacyThemesDir = path.join(repoRoot, 'dist', 'theme');
const compatibilityDeckNames = ['ai-connections.html', 'anti-ai.html', 'bigbus.html'];
const decks = new Map();
const copiedThemes = new Set();

await rm(generatedPublic, { recursive: true, force: true });

async function copySafe(sourceRoot, relativePath, destinationRoot, destinationPath = relativePath) {
  const source = path.resolve(sourceRoot, relativePath);
  const relative = path.relative(sourceRoot, source);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Compatibility file escapes source root: ${relativePath}`);
  }

  const destination = path.resolve(destinationRoot, destinationPath);
  const destinationRelative = path.relative(destinationRoot, destination);
  if (destinationRelative.startsWith('..') || path.isAbsolute(destinationRelative)) {
    throw new Error(`Compatibility file escapes public root: ${destinationPath}`);
  }

  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(source, destination);
}

async function copyTheme(theme) {
  if (copiedThemes.has(theme)) return;
  copiedThemes.add(theme);

  const destination = path.join(generatedPublic, 'themes', `${theme}.css`);
  await mkdir(path.dirname(destination), { recursive: true });

  try {
    await copyFile(path.join(officialThemesDir, `${theme}.css`), destination);
    return;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  const source = path.join(legacyThemesDir, `${theme}.css`);
  const css = await readFile(source, 'utf8');
  for (const asset of collectAssetPaths(css)) {
    await copySafe(legacyAssetsDir, asset, generatedPublic, path.join('legacy-assets', asset));
  }

  // Custom compiled themes historically lived at dist/theme/, so their
  // ../../assets/ URLs resolve differently once moved into /themes/. Keep the
  // theme source unchanged and rewrite only that presentation-owned asset root.
  const rewritten = css.replace(/(?:\.\.\/)+assets\//g, '../legacy-assets/');
  await writeFile(destination, rewritten, 'utf8');
}

for (const deckName of compatibilityDeckNames) {
  const deck = await loadLegacyDeck(path.join(repoRoot, deckName));
  decks.set(deckName, deck);

  for (const asset of deck.assets) {
    await copySafe(legacyAssetsDir, asset, generatedPublic, path.join('legacy-assets', asset));
  }

  for (const supportFile of deck.localReferences) {
    await copySafe(repoRoot, supportFile, generatedPublic);
  }

  for (const theme of deck.themes) await copyTheme(theme);
}

function htmlForTags(tags) {
  return tags.join('\n');
}

function safeJson(value) {
  return JSON.stringify(value).replaceAll('<', '\\u003c');
}

function compatibilityDeckPlugin() {
  return {
    name: 'digiguru-stage2-compatibility',
    transformIndexHtml: {
      order: 'pre',
      handler(html, context) {
        const deckName = path.basename(context.filename);
        const deck = decks.get(deckName);
        if (!deck) return html;

        const themeStyles = deck.themes
          .map(theme => `<link rel="stylesheet" href="themes/${theme}.css">`)
          .join('\n');
        const config = {
          source: deckName,
          options: deck.options,
          capabilities: deck.capabilities,
        };

        return html
          .replace('<!-- LEGACY_TITLE -->', deck.title)
          .replace('<!-- LEGACY_THEME_STYLES -->', themeStyles)
          .replace('<!-- LEGACY_EXTERNAL_STYLES -->', htmlForTags(deck.externalStylesheets))
          .replace('<!-- LEGACY_INLINE_STYLES -->', deck.styles)
          .replace('<!-- LEGACY_EXTERNAL_SCRIPTS -->', htmlForTags(deck.externalScripts))
          .replace('<!-- LEGACY_REVEAL_CLASSES -->', deck.revealClasses)
          .replace('<!-- LEGACY_SLIDES -->', deck.slides)
          .replace('<!-- LEGACY_CONFIG -->', safeJson(config));
      }
    }
  };
}

export default defineConfig({
  root: stageRoot,
  base: './',
  publicDir: generatedPublic,
  plugins: [compatibilityDeckPlugin()],
  server: {
    fs: {
      allow: [repoRoot]
    }
  },
  build: {
    outDir: path.join(stageRoot, 'dist'),
    emptyOutDir: true,
    assetsDir: '_runtime',
    rollupOptions: {
      input: Object.fromEntries(compatibilityDeckNames.map(deckName => [
        path.basename(deckName, '.html'),
        path.join(stageRoot, deckName),
      ]))
    }
  }
});
