import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { attr, defaultRoot, isRevealDeck } from './presentations.mjs';

const excludedRootHtml = new Set(['index.html', 'demo.html', 'test.html']);

function decodeUri(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function stripHtml(value = '') {
  return value
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeAttribute(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

export function humaniseAssetReference(value = '') {
  const cleaned = decodeUri(value)
    .split(/[?#]/, 1)[0]
    .split('/')
    .filter(Boolean)
    .at(-1)
    ?.replace(/\.[a-z0-9]{2,8}$/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return undefined;

  const compact = cleaned.replace(/[^a-z0-9]/gi, '');
  const mostlyNumeric = compact.length > 0 && compact.replace(/\d/g, '').length / compact.length < 0.35;
  const looksHashed = /^[a-f0-9]{16,}$/i.test(compact) || /^[a-f0-9-]{30,}$/i.test(cleaned);
  const generic = /^(image|img|photo|picture|screenshot|slide|asset|background|bg|untitled)(\s*\d+)?$/i.test(cleaned);

  if (mostlyNumeric || looksHashed || generic) return undefined;

  return cleaned
    .split(' ')
    .map((word, index) => {
      if (/^[A-Z0-9]{2,}$/.test(word)) return word;
      if (/^(ai|api|ui|ux|and|uk|eu|dfe|iag|kcl)$/i.test(word)) return word.toUpperCase();
      return index === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word.toLowerCase();
    })
    .join(' ');
}

function slideContext(html, imageIndex) {
  const sectionStart = html.lastIndexOf('<section', imageIndex);
  const contextStart = sectionStart >= 0 ? sectionStart : Math.max(0, imageIndex - 2500);
  const beforeImage = html.slice(contextStart, imageIndex);

  const headings = [...beforeImage.matchAll(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/gi)];
  const heading = headings.length ? stripHtml(headings.at(-1)[1]) : undefined;
  if (heading) return heading.slice(0, 180);

  const paragraphs = [...beforeImage.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)];
  const paragraph = paragraphs.length ? stripHtml(paragraphs.at(-1)[1]) : undefined;
  return paragraph ? paragraph.slice(0, 180) : undefined;
}

export function inferAltText(tag, html = '', imageIndex = 0) {
  const explicit = attr(tag, 'data-alt') || attr(tag, 'title') || attr(tag, 'aria-label');
  if (explicit) return explicit;

  const source = attr(tag, 'src') || attr(tag, 'data-src');
  const asset = humaniseAssetReference(source);
  const context = slideContext(html, imageIndex);

  if (asset && /\blogo\b/i.test(asset)) return asset;
  if (asset && asset.length >= 4) return asset;
  if (context) return `Illustration for ${context}`;
  return 'Presentation illustration';
}

export function addMissingImageAlts(html) {
  let added = 0;
  let cursor = 0;
  let output = '';
  const imagePattern = /<img\b[^>]*>/gi;

  for (const match of html.matchAll(imagePattern)) {
    const tag = match[0];
    const index = match.index;
    output += html.slice(cursor, index);

    if (/\balt\s*=\s*["']/i.test(tag)) {
      output += tag;
    } else {
      const alt = escapeAttribute(inferAltText(tag, html, index));
      output += tag.replace(/^<img\b/i, `<img alt="${alt}" data-generated-alt="true"`);
      added += 1;
    }

    cursor = index + tag.length;
  }

  output += html.slice(cursor);
  return { html: output, added };
}

export function missingImageAlts(html) {
  return [...html.matchAll(/<img\b[^>]*>/gi)]
    .filter(match => !/\balt\s*=\s*["']/i.test(match[0]))
    .map(match => ({ index: match.index, tag: match[0] }));
}

export async function processPresentationAccessibility({ root = defaultRoot, write = false } = {}) {
  const files = (await readdir(root, { withFileTypes: true }))
    .filter(entry => entry.isFile() && entry.name.endsWith('.html') && !excludedRootHtml.has(entry.name))
    .map(entry => entry.name)
    .sort();

  const failures = [];
  let deckCount = 0;
  let addedCount = 0;

  for (const file of files) {
    const filePath = path.join(root, file);
    const source = await readFile(filePath, 'utf8');
    if (!isRevealDeck(source)) continue;
    deckCount += 1;

    if (write) {
      const fixed = addMissingImageAlts(source);
      if (fixed.added > 0) {
        await writeFile(filePath, fixed.html, 'utf8');
        addedCount += fixed.added;
      }
    } else {
      const missing = missingImageAlts(source);
      if (missing.length) failures.push(`${file}: ${missing.length} image(s) missing alt attributes`);
    }
  }

  if (!write && failures.length) {
    throw new Error(`Presentation accessibility validation failed:\n- ${failures.join('\n- ')}`);
  }

  return { deckCount, addedCount };
}

async function runCli() {
  const write = process.argv.includes('--write');
  const result = await processPresentationAccessibility({ write });

  if (write) {
    console.log(`Added ${result.addedCount} contextual alt attributes across ${result.deckCount} presentation files.`);
  } else {
    console.log(`Validated image alt attributes across ${result.deckCount} presentation files.`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await runCli();
}
