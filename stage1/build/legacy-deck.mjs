import { readFile } from 'node:fs/promises';

export function extractSlides(html) {
  const startMatch = html.match(/<div\s+class=["'][^"']*\bslides\b[^"']*["'][^>]*>/i);
  if (!startMatch || startMatch.index === undefined) {
    throw new Error('Could not find the Reveal .slides container.');
  }

  const contentStart = startMatch.index + startMatch[0].length;
  const divTag = /<\/?div\b[^>]*>/gi;
  divTag.lastIndex = contentStart;
  let depth = 1;
  let match;

  while ((match = divTag.exec(html))) {
    depth += match[0].startsWith('</') ? -1 : 1;
    if (depth === 0) {
      return html.slice(contentStart, match.index).trim();
    }
  }

  throw new Error('Could not find the closing tag for the Reveal .slides container.');
}

export function extractInlineStyles(html) {
  return [...html.matchAll(/<style\b[^>]*>[\s\S]*?<\/style>/gi)]
    .map(match => match[0])
    .join('\n');
}

export function extractTitle(html) {
  return html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() || 'Presentation';
}

export function collectAssetPaths(html) {
  const paths = new Set();
  for (const match of html.matchAll(/\bassets\/([^"'()\s<>]+)/gi)) {
    const value = match[1].replace(/[;,]+$/, '');
    if (value && !value.includes('..')) paths.add(value);
  }
  return [...paths].sort();
}

export function rewriteLegacyAssets(html) {
  return html.replaceAll('assets/', 'legacy-assets/');
}

export async function loadLegacyDeck(filePath) {
  const html = await readFile(filePath, 'utf8');
  const slides = extractSlides(html);
  const styles = extractInlineStyles(html);

  return {
    title: extractTitle(html),
    slides: rewriteLegacyAssets(slides),
    styles: rewriteLegacyAssets(styles),
    assets: collectAssetPaths(`${slides}\n${styles}`)
  };
}
