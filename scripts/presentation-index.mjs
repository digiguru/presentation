import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { discoverPresentations } from './presentations.mjs';

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function renderPresentationIndex(presentations) {
  const newestFirst = [...presentations].reverse();
  const rows = newestFirst.map((presentation) => {
    const attendance = presentation.attendance === undefined
      ? ''
      : `<span class="attendance">${escapeHtml(presentation.attendance)} attendees</span>`;

    return `
      <li class="presentation-card">
        <a href="${escapeHtml(presentation.url)}">
          <strong>${escapeHtml(presentation.name)}</strong>
          <span class="meta">${escapeHtml(presentation.version)} · ${escapeHtml(presentation.date)}</span>
          ${attendance}
        </a>
      </li>`;
  }).join('');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Digiguru Presentations</title>
  <meta name="description" content="Presentation archive for Digiguru talks and workshops.">
  <style>
    :root { color-scheme: light dark; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    * { box-sizing: border-box; }
    body { margin: 0; background: Canvas; color: CanvasText; }
    main { width: min(100% - 2rem, 72rem); margin: 0 auto; padding: 4rem 0; }
    header { margin-bottom: 2rem; }
    h1 { margin: 0 0 .5rem; font-size: clamp(2rem, 5vw, 4rem); letter-spacing: -.04em; }
    p { margin: 0; max-width: 46rem; color: color-mix(in srgb, CanvasText 72%, transparent); font-size: 1.05rem; line-height: 1.6; }
    ul { list-style: none; padding: 0; margin: 2rem 0 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr)); gap: 1rem; }
    .presentation-card a { display: flex; min-height: 9rem; flex-direction: column; gap: .65rem; padding: 1.25rem; border: 1px solid color-mix(in srgb, CanvasText 18%, transparent); border-radius: 1rem; color: inherit; text-decoration: none; background: color-mix(in srgb, Canvas 94%, CanvasText 6%); transition: transform .15s ease, border-color .15s ease; }
    .presentation-card a:hover, .presentation-card a:focus-visible { transform: translateY(-2px); border-color: color-mix(in srgb, CanvasText 48%, transparent); outline: none; }
    .presentation-card strong { font-size: 1.15rem; line-height: 1.3; }
    .meta, .attendance { font-size: .9rem; color: color-mix(in srgb, CanvasText 66%, transparent); }
    .attendance { margin-top: auto; }
    footer { margin-top: 2.5rem; font-size: .9rem; color: color-mix(in srgb, CanvasText 60%, transparent); }
  </style>
</head>
<body>
  <main>
    <header>
      <h1>Presentations</h1>
      <p>${presentations.length} talks and workshops. This archive is generated directly from the presentation source, so preview deployments and the public website always expose the same set of decks.</p>
    </header>
    <ul aria-label="Presentation archive">${rows}
    </ul>
    <footer>Generated from the Digiguru presentation repository.</footer>
  </main>
</body>
</html>
`;
}

export async function writePresentationIndex(outputDir, presentations = await discoverPresentations()) {
  const resolvedOutput = path.resolve(outputDir);
  await mkdir(resolvedOutput, { recursive: true });
  const indexPath = path.join(resolvedOutput, 'index.html');
  await writeFile(indexPath, renderPresentationIndex(presentations), 'utf8');
  return indexPath;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const outputDir = process.argv[2];
  if (!outputDir) {
    throw new Error('Usage: node scripts/presentation-index.mjs <output-directory>');
  }

  const indexPath = await writePresentationIndex(outputDir);
  console.log(`Generated presentation index at ${indexPath}`);
}
