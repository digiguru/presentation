import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { discoverPresentations } from '../scripts/presentations.mjs';
import { loadLegacyDeck } from './build/legacy-deck.mjs';
import { promptProxy } from './build/dev-proxy.mjs';

const pureRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(pureRoot, '..');
const presentations = await discoverPresentations({ root: repoRoot });
const deckNames = presentations.map(presentation => presentation.url);
const decks = new Map();

for (const presentation of presentations) {
  decks.set(presentation.url, await loadLegacyDeck(path.join(repoRoot, presentation.url)));
}

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

function tags(values) {
  return values.join('\n');
}

function safeJson(value) {
  return JSON.stringify(value).replaceAll('<', '\\u003c');
}

const buildCommitSha = resolveCommitSha();
const buildCommitShort = buildCommitSha === 'unknown' ? 'unknown' : buildCommitSha.slice(0, 8);
const manifest = presentations.map(presentation => {
  const deck = decks.get(presentation.url);
  return {
    ...presentation,
    title: deck.title,
    themes: deck.themes,
    capabilities: deck.capabilities,
    localReferences: deck.localReferences,
    localSupportScripts: deck.localSupportScripts,
    inlineScripts: deck.inlineScripts,
  };
});

const unported = manifest.filter(presentation => (
  presentation.inlineScripts.custom > 0 || presentation.localSupportScripts.length > 0
));
if (unported.length) {
  throw new Error(`Pure has unported presentation runtime code: ${unported.map(presentation => presentation.url).join(', ')}`);
}

function purePlugin() {
  return {
    name: 'digiguru-pure-corpus',
    transformIndexHtml: {
      order: 'pre',
      handler(html, context) {
        const fileName = path.basename(context.filename);
        if (fileName === 'index.html') {
          const list = presentations.map(presentation => (
            `<li><a href="./${escapeHtml(presentation.url)}">${escapeHtml(presentation.name)}</a>`
            + `<small>${escapeHtml(presentation.version)} · ${escapeHtml(presentation.date)} · ${escapeHtml(presentation.url)} · commit <code>${buildCommitSha}</code></small></li>`
          )).join('\n');
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
          .replace('<!-- PURE_SOURCE_META -->', `<meta name="pure-source" content="${escapeHtml(fileName)}">`)
          .replace('<!-- PURE_TITLE -->', deck.title)
          .replace('<!-- PURE_THEME_STYLES -->', themeStyles)
          .replace('<!-- PURE_EXTERNAL_STYLES -->', tags(deck.externalStylesheets))
          .replace('<!-- PURE_INLINE_STYLES -->', deck.styles)
          .replace('<!-- PURE_EXTERNAL_SCRIPTS -->', tags(deck.externalScripts))
          .replace('<!-- PURE_REVEAL_CLASSES -->', deck.revealClasses)
          .replace('<!-- PURE_SLIDES -->', deck.slides)
          .replace('<!-- PURE_CONFIG -->', safeJson(config))
          .replace('Pure · Reveal.js 6.0.1', `Pure · Reveal.js 6.0.1 · ${buildCommitShort}`)
          .replace('</head>', `    <meta name="build-commit" content="${buildCommitSha}">\n  </head>`);
      }
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'build-info.json',
        source: `${JSON.stringify({ commitSha: buildCommitSha, presentationCount: manifest.length }, null, 2)}\n`,
      });
      this.emitFile({
        type: 'asset',
        fileName: 'presentations.json',
        source: `${JSON.stringify(manifest, null, 2)}\n`,
      });
    },
  };
}

export default defineConfig({
  root: pureRoot,
  base: './',
  publicDir: false,
  plugins: [purePlugin()],
  server: {
    fs: { allow: [pureRoot, repoRoot] },
    proxy: promptProxy,
  },
  build: {
    outDir: path.join(pureRoot, 'dist'),
    emptyOutDir: true,
    assetsDir: '_runtime',
    rollupOptions: {
      input: {
        index: path.join(pureRoot, 'index.html'),
        ...Object.fromEntries(deckNames.map(deckName => [
          path.basename(deckName, '.html'),
          path.join(pureRoot, deckName),
        ])),
      },
    },
  },
});
