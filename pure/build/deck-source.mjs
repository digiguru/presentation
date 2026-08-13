import { readFile } from 'node:fs/promises';

const externalUrl = /^(?:https?:)?\/\//i;

function attr(tag, name) {
  return tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, 'i'))?.[1];
}

function metaValues(html, name) {
  return (html.match(/<meta\b[^>]*>/gi) || [])
    .filter(tag => attr(tag, 'name')?.toLowerCase() === name.toLowerCase())
    .map(tag => attr(tag, 'content'))
    .filter(value => value !== undefined);
}

function metaValue(html, name) {
  return metaValues(html, name)[0];
}

export function isCanonicalSource(html) {
  return metaValue(html, 'presentation-format') === 'pure-v1';
}

export function extractSlides(html) {
  const startMatch = html.match(/<div\s+class=["'][^"']*\bslides\b[^"']*["'][^>]*>/i);
  if (!startMatch || startMatch.index === undefined) {
    throw new Error('Could not find the canonical .slides container.');
  }

  const contentStart = startMatch.index + startMatch[0].length;
  const divTag = /<\/?div\b[^>]*>/gi;
  divTag.lastIndex = contentStart;
  let depth = 1;
  let match;

  while ((match = divTag.exec(html))) {
    depth += match[0].startsWith('</') ? -1 : 1;
    if (depth === 0) return html.slice(contentStart, match.index).trim();
  }

  throw new Error('Could not find the closing tag for the canonical .slides container.');
}

export function extractInlineStyles(html) {
  return [...html.matchAll(/<style\b[^>]*>[\s\S]*?<\/style>/gi)]
    .map(match => match[0])
    .join('\n');
}

export function extractTitle(html) {
  return html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() || 'Presentation';
}

export function extractRevealClasses(html) {
  return metaValue(html, 'presentation-reveal-classes') || 'reveal';
}

export function extractThemes(html) {
  return [...new Set(metaValues(html, 'presentation-theme'))];
}

export function extractExternalStylesheets(html) {
  return (html.match(/<link\b[^>]*>/gi) || [])
    .filter(tag => externalUrl.test(attr(tag, 'href') || ''));
}

export function extractExternalScripts(html) {
  return (html.match(/<script\b[^>]*\bsrc=["'][^"']+["'][^>]*>\s*<\/script>/gi) || [])
    .filter(tag => externalUrl.test(attr(tag, 'src') || ''));
}

export function extractRevealOptions(html) {
  const match = html.match(/<script\b[^>]*\bid=["']presentation-options["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!match) return {};

  let options;
  try {
    options = JSON.parse(match[1]);
  } catch (error) {
    throw new Error(`Invalid presentation-options JSON: ${error.message}`);
  }

  if (!options || Array.isArray(options) || typeof options !== 'object') {
    throw new Error('presentation-options must contain a JSON object.');
  }

  for (const [name, value] of Object.entries(options)) {
    if (!['boolean', 'number', 'string'].includes(typeof value) && value !== null) {
      throw new Error(`Presentation option ${name} must be a scalar JSON value.`);
    }
  }
  return options;
}

export function collectAssetPaths(html) {
  const paths = new Set();
  for (const match of html.matchAll(/\bassets\/([^"'()\s<>]+)/gi)) {
    const value = match[1].replace(/[;,]+$/, '').split(/[?#]/, 1)[0];
    if (value && !value.includes('..')) paths.add(value);
  }
  return [...paths].sort();
}

export function collectLocalReferences(html) {
  const paths = new Set();
  const attributePattern = /\b(?:src|href|poster|data-src|data-markdown)\s*=\s*["']([^"']+)["']/gi;
  for (const [, raw] of html.matchAll(attributePattern)) {
    if (!raw || raw.startsWith('#') || raw.startsWith('/') || externalUrl.test(raw)
      || /^(?:data|javascript|mailto|tel):/i.test(raw)) continue;
    const value = raw.split(/[?#]/, 1)[0];
    if (!value || value.includes('..') || value.startsWith('assets/')) continue;
    paths.add(value);
  }
  return [...paths].sort();
}

export function extractCapabilities(html) {
  return {
    focusBackground: /data-state=["']focus-bg["']/i.test(html),
    gptInput: /<gpt-input\b/i.test(html),
    pieChart: /<pie-chart\b/i.test(html),
    markdown: /\bdata-markdown(?:\s*=|\b)/i.test(html),
    canvas: /<canvas\b/i.test(html),
    iframe: /<iframe\b/i.test(html),
  };
}

export async function loadDeckSource(filePath) {
  const html = await readFile(filePath, 'utf8');
  if (!isCanonicalSource(html)) {
    throw new Error('Presentation source is not canonical pure-v1 format.');
  }

  const slides = extractSlides(html);
  const styles = extractInlineStyles(html);

  return {
    title: extractTitle(html),
    revealClasses: extractRevealClasses(html),
    slides,
    styles,
    assets: collectAssetPaths(`${slides}\n${styles}`),
    localReferences: collectLocalReferences(slides),
    themes: extractThemes(html),
    externalStylesheets: extractExternalStylesheets(html),
    externalScripts: extractExternalScripts(html),
    options: extractRevealOptions(html),
    capabilities: extractCapabilities(html),
  };
}
