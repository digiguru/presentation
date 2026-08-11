import { readFile } from 'node:fs/promises';
import path from 'node:path';
import puppeteer from 'puppeteer';
import { discoverPresentations } from './presentations.mjs';

const previewBase = process.env.PREVIEW_BASE?.replace(/\/$/, '');
const prodBase = process.env.PROD_BASE?.replace(/\/$/, '');
if (!previewBase || !prodBase) throw new Error('PREVIEW_BASE and PROD_BASE are required');

const presentations = await discoverPresentations();
const profiles = [];
for (const presentation of presentations) {
  const html = await readFile(path.resolve(presentation.url), 'utf8');
  const count = regex => (html.match(regex) || []).length;
  profiles.push({
    ...presentation,
    sections: count(/<section\b/gi),
    fragments: count(/\bfragment\b/gi),
    autoAnimate: count(/data-auto-animate\b/gi),
    iframes: count(/<iframe\b/gi),
    customElements: count(/<(?:gpt-input|pie-chart|pie-component)\b/gi),
    externalScripts: count(/<script[^>]+src=["']https?:/gi),
    apiCalls: count(/\bfetch\s*\(/gi)
  });
}

const bySections = [...profiles].sort((a, b) => a.sections - b.sections || a.url.localeCompare(b.url));
const byAnimation = [...profiles].sort((a, b) => (b.autoAnimate * 10 + b.fragments) - (a.autoAnimate * 10 + a.fragments));
const byIntegration = [...profiles].sort((a, b) => (b.customElements * 20 + b.iframes * 10 + b.apiCalls * 5 + b.externalScripts) - (a.customElements * 20 + a.iframes * 10 + a.apiCalls * 5 + a.externalScripts));

const candidates = [
  ['oldest', profiles[0]],
  ['newest', profiles.at(-1)],
  ['shortest', bySections[0]],
  ['longest', bySections.at(-1)],
  ['animation-heavy-1', byAnimation[0]],
  ['animation-heavy-2', byAnimation[1]],
  ['integration-heavy-1', byIntegration[0]],
  ['integration-heavy-2', byIntegration[1]]
];

const selected = new Map();
for (const [reason, profile] of candidates) {
  if (!profile) continue;
  if (!selected.has(profile.url)) selected.set(profile.url, { profile, reasons: [] });
  selected.get(profile.url).reasons.push(reason);
}

console.log('SELECTED DECKS');
for (const { profile, reasons } of selected.values()) {
  console.log(JSON.stringify({ url: profile.url, date: profile.date, reasons, sections: profile.sections, fragments: profile.fragments, autoAnimate: profile.autoAnimate, iframes: profile.iframes, customElements: profile.customElements, externalScripts: profile.externalScripts, apiCalls: profile.apiCalls }));
}

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });

async function inspect(base, deck) {
  const page = await browser.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  const failedRequests = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('requestfailed', request => failedRequests.push(`${request.method()} ${request.url()} :: ${request.failure()?.errorText || 'failed'}`));

  const response = await page.goto(`${base}/${deck}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  const status = response?.status();
  let ready = false;
  try {
    await page.waitForFunction(() => window.Reveal && typeof Reveal.isReady === 'function' && Reveal.isReady(), { timeout: 12000 });
    ready = true;
  } catch {}

  const snapshot = await page.evaluate(async () => {
    const reveal = window.Reveal;
    const before = reveal?.getIndices?.() || null;
    const visibleBefore = document.querySelectorAll('.fragment.visible').length;
    if (reveal?.next) reveal.next();
    await new Promise(resolve => setTimeout(resolve, 300));
    const after = reveal?.getIndices?.() || null;
    const visibleAfter = document.querySelectorAll('.fragment.visible').length;
    let overviewWorks = null;
    if (reveal?.toggleOverview && reveal?.isOverview) {
      reveal.toggleOverview();
      await new Promise(resolve => setTimeout(resolve, 100));
      overviewWorks = reveal.isOverview();
      reveal.toggleOverview();
    }
    return {
      version: reveal?.VERSION || null,
      totalSlides: reveal?.getTotalSlides?.() ?? reveal?.getSlides?.()?.length ?? null,
      fragments: document.querySelectorAll('.fragment').length,
      visibleFragmentsBefore: visibleBefore,
      visibleFragmentsAfter: visibleAfter,
      autoAnimateSections: document.querySelectorAll('section[data-auto-animate]').length,
      iframes: document.querySelectorAll('iframe').length,
      gptInputs: document.querySelectorAll('gpt-input').length,
      pieElements: document.querySelectorAll('pie-chart, pie-component').length,
      notes: document.querySelectorAll('aside.notes').length,
      notesPlugin: Boolean(reveal?.getPlugin?.('notes')),
      plugins: reveal?.getPlugins ? Object.keys(reveal.getPlugins()).sort() : [],
      before,
      after,
      navigationChanged: JSON.stringify(before) !== JSON.stringify(after) || visibleBefore !== visibleAfter,
      overviewWorks,
      gptDefined: document.querySelector('gpt-input') ? Boolean(customElements.get('gpt-input')) : null
    };
  });

  await page.close();
  return { status, ready, ...snapshot, pageErrors, consoleErrors, failedRequests };
}

function normalizedErrors(values) {
  return [...new Set(values.map(value => value.replace(/https?:\/\/[^\s)]+/g, '<url>')))].sort();
}

const failures = [];
const report = [];
for (const [deck, { profile, reasons }] of selected) {
  console.log(`\nCHECK ${deck} (${reasons.join(', ')})`);
  const prod = await inspect(prodBase, deck);
  const preview = await inspect(previewBase, deck);
  const issues = [];

  if (prod.status !== 200) issues.push(`production returned HTTP ${prod.status}`);
  if (preview.status !== 200) issues.push(`preview returned HTTP ${preview.status}`);
  if (!prod.ready) issues.push('production Reveal did not become ready');
  if (!preview.ready) issues.push('preview Reveal did not become ready');
  if (prod.totalSlides !== preview.totalSlides) issues.push(`slide count changed ${prod.totalSlides} -> ${preview.totalSlides}`);
  for (const key of ['fragments', 'autoAnimateSections', 'iframes', 'gptInputs', 'pieElements', 'notes']) {
    if (prod[key] !== preview[key]) issues.push(`${key} changed ${prod[key]} -> ${preview[key]}`);
  }
  if (prod.navigationChanged && !preview.navigationChanged) issues.push('next navigation/fragments work in prod but not preview');
  if (prod.overviewWorks === true && preview.overviewWorks !== true) issues.push('overview works in prod but not preview');
  if (prod.gptDefined === true && preview.gptDefined !== true) issues.push('gpt-input custom element is defined in prod but not preview');

  const prodPageErrors = normalizedErrors(prod.pageErrors);
  const previewPageErrors = normalizedErrors(preview.pageErrors);
  for (const error of previewPageErrors) if (!prodPageErrors.includes(error)) issues.push(`new preview page error: ${error}`);

  const result = { deck, reasons, profile, prod, preview, issues };
  report.push(result);
  console.log(JSON.stringify(result, null, 2));
  if (issues.length) failures.push(`${deck}: ${issues.join('; ')}`);
}

await browser.close();
console.log('\nSUMMARY');
console.log(JSON.stringify({ selected: report.map(({ deck, reasons, issues }) => ({ deck, reasons, issues })), failures }, null, 2));
if (failures.length) process.exitCode = 1;
