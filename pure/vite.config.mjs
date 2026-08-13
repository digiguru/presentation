import { execFileSync } from 'node:child_process';
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { collectAssetPaths, loadLegacyDeck } from './build/legacy-deck.mjs';

const pureRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(pureRoot, '..');
const generatedPublic = path.join(pureRoot, '.pure-public');
const legacyAssetsDir = path.join(repoRoot, 'assets');
const officialThemesDir = path.join(pureRoot, 'node_modules', 'reveal.js', 'dist', 'theme');
const legacyThemesDir = path.join(repoRoot, 'dist', 'theme');
const compatibilityDeckNames = ['ai-connections.html', 'anti-ai.html', 'bigbus.html'];
const decks = new Map();
const copiedThemes = new Set();

function resolveCommitSha() {
  for (const value of [process.env.VERCEL_GIT_COMMIT_SHA, process.env.GITHUB_SHA]) {
    if (/^[0-9a-f]{40}$/i.test(value || '')) return value.toLowerCase();
  }

  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim().toLowerCase();
  } catch {
    return 'unknown';
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

const buildCommitSha = resolveCommitSha();
const buildCommitShort = buildCommitSha === 'unknown' ? 'unknown' : buildCommitSha.slice(0, 8);

await rm(generatedPublic, { recursive: true, force: true });
await mkdir(generatedPublic, { recursive: true });
await writeFile(
  path.join(generatedPublic, 'build-info.json'),
  `${JSON.stringify({ commitSha: buildCommitSha }, null, 2)}\n`,
  'utf8'
);

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
    await copySafe(legacyAssetsDir, asset, generatedPublic, path.join('assets', asset));
  }

  // Custom compiled themes historically lived at dist/theme/. Once copied to
  // /themes/, rewrite only their relative asset prefix while preserving the
  // public /assets/ contract used by every existing presentation.
  const rewritten = css.replace(/(?:\.\.\/)+assets\//g, '../assets/');
  await writeFile(destination, rewritten, 'utf8');
}

for (const deckName of compatibilityDeckNames) {
  const deck = await loadLegacyDeck(path.join(repoRoot, deckName));
  decks.set(deckName, deck);

  for (const asset of deck.assets) {
    await copySafe(legacyAssetsDir, asset, generatedPublic, path.join('assets', asset));
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

function pureDeckPlugin() {
  return {
    name: 'digiguru-pure-compatibility',
    transformIndexHtml: {
      order: 'pre',
      handler(html, context) {
        const fileName = path.basename(context.filename);

        if (fileName === 'index.html') {
          const list = compatibilityDeckNames.map(deckName => {
            const deck = decks.get(deckName);
            return `<li><a href="./${escapeHtml(deckName)}">${escapeHtml(deck.title)}</a><small>${escapeHtml(deckName)} · commit <code>${buildCommitSha}</code></small></li>`;
          }).join('\n');

          return html
            .replace('<!-- PURE_COMMIT_SHA -->', buildCommitSha)
            .replace('<!-- PURE_PRESENTATION_LIST -->', list);
        }

        const deck = decks.get(fileName);
        if (!deck) return html;

        const themeStyles = deck.themes
          .map(theme => `<link rel="stylesheet" href="themes/${theme}.css">`)
          .join('\n');
        const config = {
          source: fileName,
          options: deck.options,
          capabilities: deck.capabilities,
          buildCommitSha,
        };

        return html
          .replace('<!-- LEGACY_TITLE -->', deck.title)
          .replace('<!-- LEGACY_THEME_STYLES -->', themeStyles)
          .replace('<!-- LEGACY_EXTERNAL_STYLES -->', htmlForTags(deck.externalStylesheets))
          .replace('<!-- LEGACY_INLINE_STYLES -->', deck.styles)
          .replace('<!-- LEGACY_EXTERNAL_SCRIPTS -->', htmlForTags(deck.externalScripts))
          .replace('<!-- LEGACY_REVEAL_CLASSES -->', deck.revealClasses)
          .replace('<!-- LEGACY_SLIDES -->', deck.slides)
          .replace('<!-- LEGACY_CONFIG -->', safeJson(config))
          .replace('Pure · Reveal.js 6.0.1', `Pure · Reveal.js 6.0.1 · ${buildCommitShort}`)
          .replace('</head>', `    <meta name="build-commit" content="${buildCommitSha}">\n  </head>`);
      }
    }
  };
}

export default defineConfig({
  root: pureRoot,
  base: './',
  publicDir: generatedPublic,
  plugins: [pureDeckPlugin()],
  server: {
    fs: {
      allow: [repoRoot]
    }
  },
  build: {
    outDir: path.join(pureRoot, 'dist'),
    emptyOutDir: true,
    assetsDir: '_runtime',
    rollupOptions: {
      input: {
        index: path.join(pureRoot, 'index.html'),
        ...Object.fromEntries(compatibilityDeckNames.map(deckName => [
          path.basename(deckName, '.html'),
          path.join(pureRoot, deckName),
        ])),
      }
    }
  }
});
