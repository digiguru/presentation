import { readFile } from 'node:fs/promises';

const externalUrl = /^(?:https?:)?\/\//i;
const revealRuntimeScripts = [
  /^dist\/reveal(?:\.esm)?\.js$/i,
  /^plugin\/(?:notes|markdown|highlight)\/(?:notes|markdown|highlight)(?:\.esm)?\.js$/i,
  /^js\/gpt-component\.js$/i,
  /^js\/pie-component\.js$/i,
];
const revealRuntimeStyles = [
  /^dist\/(?:reset|reveal)\.css$/i,
  /^dist\/theme\/[^/]+\.css$/i,
  /^plugin\/highlight\/(?:monokai|zenburn)\.css$/i,
  /^custom\.css$/i,
  /^js\/pie-component\.css$/i,
];
const supersededExternalScripts = [
  /googletagmanager\.com\/gtag\/js/i,
  /cdn\.jsdelivr\.net\/npm\/js-base64/i,
];
const scalarRevealOptions = new Set([
  'hash', 'controls', 'progress', 'center', 'touch', 'loop', 'rtl', 'shuffle',
  'keyboard', 'overview', 'embedded', 'help', 'pause', 'showNotes', 'slideNumber',
  'transition', 'backgroundTransition',
]);

function attr(tag, name) {
  return tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, 'i'))?.[1];
}

function isRuntimePath(value, patterns) {
  const clean = value.split(/[?#]/, 1)[0];
  return patterns.some(pattern => pattern.test(clean));
}

function withoutSupersededTemplates(html) {
  return html.replace(/<template\b[^>]*\bid=["']GPT["'][^>]*>[\s\S]*?<\/template>/gi, '');
}

function extractBalancedObject(source, start) {
  let depth = 0;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (lineComment) {
      if (char === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (char === '*' && next === '/') {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '/' && next === '/') {
      lineComment = true;
      index += 1;
      continue;
    }
    if (char === '/' && next === '*') {
      blockComment = true;
      index += 1;
      continue;
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      continue;
    }
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }

  return undefined;
}

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
    if (depth === 0) return html.slice(contentStart, match.index).trim();
  }

  throw new Error('Could not find the closing tag for the Reveal .slides container.');
}

export function extractInlineStyles(html) {
  const source = withoutSupersededTemplates(html);
  return [...source.matchAll(/<style\b[^>]*>[\s\S]*?<\/style>/gi)]
    .map(match => match[0])
    .join('\n');
}

export function extractTitle(html) {
  return html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() || 'Presentation';
}

export function extractRevealClasses(html) {
  const tags = html.match(/<div\b[^>]*class=["'][^"']*\breveal\b[^"']*["'][^>]*>/gi) || [];
  const tag = tags.find(candidate => !/\bslides\b/i.test(attr(candidate, 'class') || ''));
  return attr(tag || '', 'class') || 'reveal';
}

export function extractThemes(html) {
  const themes = new Set();
  for (const match of html.matchAll(/<link\b[^>]*href=["']dist\/theme\/([^"'/?#]+)\.css(?:[?#][^"']*)?["'][^>]*>/gi)) {
    themes.add(match[1]);
  }
  return [...themes];
}

export function extractExternalStylesheets(html) {
  return (html.match(/<link\b[^>]*>/gi) || [])
    .filter(tag => externalUrl.test(attr(tag, 'href') || ''));
}

export function extractExternalScripts(html) {
  return (html.match(/<script\b[^>]*\bsrc=["'][^"']+["'][^>]*>\s*<\/script>/gi) || [])
    .filter(tag => externalUrl.test(attr(tag, 'src') || ''))
    .filter(tag => !supersededExternalScripts.some(pattern => pattern.test(attr(tag, 'src') || '')));
}

export function extractRevealOptions(html) {
  const marker = /Reveal\.initialize\s*\(\s*\{/g.exec(html);
  if (!marker) return {};
  const objectStart = marker.index + marker[0].lastIndexOf('{');
  const objectSource = extractBalancedObject(html, objectStart);
  if (!objectSource) return {};

  const options = {};
  const optionPattern = /\b([A-Za-z][A-Za-z0-9]*)\s*:\s*(true|false|null|-?\d+(?:\.\d+)?|["'][^"']*["'])/g;
  for (const match of objectSource.matchAll(optionPattern)) {
    if (!scalarRevealOptions.has(match[1])) continue;
    const raw = match[2];
    if (raw === 'true' || raw === 'false') options[match[1]] = raw === 'true';
    else if (raw === 'null') options[match[1]] = null;
    else if (/^-?\d/.test(raw)) options[match[1]] = Number(raw);
    else options[match[1]] = raw.slice(1, -1);
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
    if (isRuntimePath(value, revealRuntimeScripts) || isRuntimePath(value, revealRuntimeStyles)) continue;
    paths.add(value);
  }
  return [...paths].sort();
}

export function classifyInlineScripts(html) {
  const result = { analytics: 0, revealRuntime: 0, legacyGpt: 0, custom: 0 };
  for (const match of html.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)) {
    const source = match[1].trim();
    if (!source) continue;
    if (/dataLayer/.test(source) && /\bgtag\s*\(/.test(source)) result.analytics += 1;
    else if (/Reveal\.initialize\s*\(/.test(source)) result.revealRuntime += 1;
    else if (/customElements\.define\s*\(\s*["']gpt-input["']/.test(source) || (/\bqueryGPT\b/.test(source) && /ai-prompt-writer/.test(source))) result.legacyGpt += 1;
    else result.custom += 1;
  }
  return result;
}

export function findLocalSupportScripts(html) {
  return (html.match(/<script\b[^>]*\bsrc=["'][^"']+["'][^>]*>\s*<\/script>/gi) || [])
    .map(tag => attr(tag, 'src'))
    .filter(Boolean)
    .filter(src => !externalUrl.test(src) && !isRuntimePath(src, revealRuntimeScripts));
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

export async function loadLegacyDeck(filePath) {
  const html = await readFile(filePath, 'utf8');
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
    inlineScripts: classifyInlineScripts(html),
    localSupportScripts: findLocalSupportScripts(html),
  };
}
