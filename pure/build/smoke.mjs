import { execFile, spawnSync } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const ignoredMissingPaths = new Set(['/favicon.ico']);
const decks = [
  { file: 'ai-connections.html' },
  { file: 'anti-ai.html' },
  { file: 'bigbus.html', expectsGpt: true },
];

function findChrome() {
  const candidates = [
    process.env.CHROME_BIN,
    'google-chrome',
    'google-chrome-stable',
    'chromium',
    'chromium-browser'
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (path.isAbsolute(candidate)) return candidate;
    const result = spawnSync('which', [candidate], { encoding: 'utf8' });
    if (result.status === 0 && result.stdout.trim()) return result.stdout.trim();
  }

  throw new Error(`Could not find Chrome/Chromium. Checked: ${candidates.join(', ')}`);
}

function contentType(filePath) {
  return {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2'
  }[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

async function serve(req, res, missingRequests) {
  const requestUrl = new URL(req.url, 'http://127.0.0.1');
  const requestPath = decodeURIComponent(requestUrl.pathname);
  let filePath = path.resolve(dist, `.${requestPath}`);

  if (filePath !== dist && !filePath.startsWith(`${dist}${path.sep}`)) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  try {
    const info = await stat(filePath);
    if (info.isDirectory()) filePath = path.join(filePath, 'index.html');
    await stat(filePath);
  } catch {
    if (!ignoredMissingPaths.has(requestPath)) missingRequests.add(requestPath);
    res.writeHead(404).end('Not found');
    return;
  }

  res.writeHead(200, { 'content-type': contentType(filePath) });
  createReadStream(filePath).pipe(res);
}

function revealIsReady(dom) {
  return [...dom.matchAll(/class=["']([^"']*)["']/gi)].some(match => {
    const classes = new Set(match[1].split(/\s+/));
    return classes.has('reveal') && classes.has('ready');
  });
}

const server = createServer();

try {
  await new Promise((resolve, reject) => {
    server.on('request', (req, res) => {
      const missingRequests = server.missingRequests;
      serve(req, res, missingRequests).catch(error => {
        console.error(error);
        res.writeHead(500).end('Internal server error');
      });
    });
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  const chrome = findChrome();
  const address = server.address();
  const failures = [];

  for (const deck of decks) {
    server.missingRequests = new Set();
    const url = `http://127.0.0.1:${address.port}/${deck.file}`;

    try {
      const { stdout } = await execFileAsync(chrome, [
        '--headless=new',
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-background-networking',
        '--disable-default-apps',
        '--disable-extensions',
        '--disable-sync',
        '--metrics-recording-only',
        '--virtual-time-budget=5000',
        '--dump-dom',
        url
      ], {
        encoding: 'utf8',
        maxBuffer: 20 * 1024 * 1024,
        timeout: 30000
      });

      if (!revealIsReady(stdout)) failures.push(`${deck.file}: Reveal did not reach ready`);
      if (!stdout.includes(`data-pure-source="${deck.file}"`)) {
        failures.push(`${deck.file}: Pure source marker was not set`);
      }
      if (deck.expectsGpt && !stdout.includes('data-gpt-input-ready="true"')) {
        failures.push(`${deck.file}: Pure <gpt-input> control did not register`);
      }
    } catch (error) {
      failures.push(`${deck.file}: Chrome failed: ${error.message}`);
    }

    for (const missing of server.missingRequests) failures.push(`${deck.file}: local request returned 404: ${missing}`);
  }

  if (failures.length) throw new Error(`Pure presentation smoke tests failed:\n- ${failures.join('\n- ')}`);

  console.log(`Smoke tested ${decks.length} Pure decks: Reveal ready, controls loaded, no local 404s.`);
} finally {
  await new Promise(resolve => server.close(resolve));
}
