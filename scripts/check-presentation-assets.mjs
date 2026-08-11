import { access, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const excludedRootHtml = new Set(['index.html', 'demo.html', 'test.html']);

function isRevealDeck(html) {
  return /class\s*=\s*["'][^"']*\breveal\b[^"']*["']/i.test(html)
    && /class\s*=\s*["'][^"']*\bslides\b[^"']*["']/i.test(html);
}

function isExternalOrDynamic(value) {
  return !value
    || value.startsWith('#')
    || value.startsWith('?')
    || value.startsWith('//')
    || value.includes('{{')
    || value.includes('${')
    || /^[a-z][a-z0-9+.-]*:/i.test(value);
}

function looksLikeAsset(value, attribute) {
  if (!attribute.startsWith('data-background')) return true;
  return value.startsWith('/') || value.includes('/') || /\.[a-z0-9]{2,8}(?:[?#]|$)/i.test(value);
}

function normaliseReference(value) {
  const withoutFragment = value.split('#', 1)[0].split('?', 1)[0].trim();
  if (!withoutFragment) return undefined;

  try {
    return decodeURIComponent(withoutFragment);
  } catch {
    return withoutFragment;
  }
}

function cssReferences(css) {
  const references = [];
  const cssUrlPattern = /url\(\s*["']?([^"')]+)["']?\s*\)/gi;

  for (const match of css.matchAll(cssUrlPattern)) {
    const value = match[1].trim();
    if (!isExternalOrDynamic(value)) references.push({ attribute: 'css-url', value });
  }

  return references;
}

function referencesFromHtml(html) {
  const references = [];
  const attributePattern = /\b(src|href|poster|data-src|data-background|data-background-image|data-background-video)\s*=\s*["']([^"']+)["']/gi;

  for (const match of html.matchAll(attributePattern)) {
    const attribute = match[1].toLowerCase();
    const value = match[2].trim();
    if (!isExternalOrDynamic(value) && looksLikeAsset(value, attribute)) {
      references.push({ attribute, value });
    }
  }

  const srcsetPattern = /\bsrcset\s*=\s*["']([^"']+)["']/gi;
  for (const match of html.matchAll(srcsetPattern)) {
    for (const candidate of match[1].split(',')) {
      const value = candidate.trim().split(/\s+/, 1)[0];
      if (!isExternalOrDynamic(value)) references.push({ attribute: 'srcset', value });
    }
  }

  for (const match of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) {
    references.push(...cssReferences(match[1]));
  }

  for (const match of html.matchAll(/\bstyle\s*=\s*["']([^"']+)["']/gi)) {
    references.push(...cssReferences(match[1]));
  }

  return references;
}

async function pathExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

const errors = [];
let deckCount = 0;
let referenceCount = 0;

for (const entry of await readdir(root, { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith('.html') || excludedRootHtml.has(entry.name)) continue;

  const html = await readFile(path.join(root, entry.name), 'utf8');
  if (!isRevealDeck(html)) continue;

  deckCount += 1;

  for (const reference of referencesFromHtml(html)) {
    const normalised = normaliseReference(reference.value);
    if (!normalised) continue;

    referenceCount += 1;
    const resolved = normalised.startsWith('/')
      ? path.resolve(root, `.${normalised}`)
      : path.resolve(root, normalised);

    if (!resolved.startsWith(`${root}${path.sep}`) && resolved !== root) {
      errors.push(`${entry.name}: ${reference.attribute} escapes the presentation root: ${reference.value}`);
      continue;
    }

    if (!await pathExists(resolved)) {
      errors.push(`${entry.name}: missing local asset referenced by ${reference.attribute}: ${reference.value}`);
    }
  }
}

if (errors.length) {
  throw new Error(`Presentation asset validation failed:\n- ${errors.join('\n- ')}`);
}

console.log(`Validated ${referenceCount} local asset references across ${deckCount} presentation files.`);
