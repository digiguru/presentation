import { execFile, execFileSync, spawnSync } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const presentationsScript = path.join(root, 'scripts', 'presentations.mjs');
const workDir = await mkdtemp(path.join(tmpdir(), 'presentation-smoke-'));
const exportDir = path.join(workDir, 'site');
const ignoredMissingPaths = new Set(['/favicon.ico']);

function findChrome() {
  const candidates = [
    process.env.CHROME_BIN,
    'google-chrome',
    'google-chrome-stable',
    'chromium',
    'chromium-browser',
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (path.isAbsolute(candidate)) return candidate;
    const result = spawnSync('which', [candidate], { encoding: 'utf8' });
    if (result.status === 0 && result.stdout.trim()) return result.stdout.trim();
  }

  throw new Error(`Could not find Chrome/Chromium. Checked: ${candidates.join(', ')}`);
}

function contentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  return {
    '.css': 'text/css; charset=utf-8',
    '.gif': 'image/gif',
    '.html': 'text/html; charset=utf-8',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
  }[extension] || 'application/octet-stream';
}

async function serveFile(req, res, missingRequests) {
  const url = new URL(req.url, 'http://127.0.0.1');
  let requestPath;

  try {
    requestPath = decodeURIComponent(url.pathname);
  } catch {
    res.writeHead(400).end('Bad request');
    return;
  }

  let filePath = path.resolve(exportDir, `.${requestPath}`);
  if (!filePath.startsWith(`${exportDir}${path.sep}`) && filePath !== exportDir) {
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
  for (const match of dom.matchAll(/class=["']([^"']*)["']/gi)) {
    const classes = new Set(match[1].split(/\s+/));
    if (classes.has('reveal') && classes.has('ready')) return true;
  }
  return false;
}

async function dumpDom(chrome, url, virtualTimeBudget = 3000) {
  return execFileAsync(chrome, [
    '--headless=new',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--disable-background-networking',
    '--disable-default-apps',
    '--disable-extensions',
    '--disable-sync',
    '--metrics-recording-only',
    `--virtual-time-budget=${virtualTimeBudget}`,
    '--dump-dom',
    url,
  ], {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
    timeout: 30000,
  });
}

let server;

try {
  execFileSync(process.execPath, [presentationsScript, '--export', exportDir], {
    cwd: root,
    stdio: 'inherit',
  });

  const manifest = JSON.parse(await readFile(path.join(exportDir, 'presentations.json'), 'utf8'));
  const decks = manifest.map(presentation => presentation.url).sort();

  if (!decks.length) throw new Error('No exported presentations found in presentations.json for smoke testing.');

  const missingRequests = new Set();
  server = createServer((req, res) => {
    serveFile(req, res, missingRequests).catch(error => {
      console.error(error);
      res.writeHead(500).end('Internal server error');
    });
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();
  const chrome = findChrome();
  const failures = [];

  missingRequests.clear();
  try {
    const { stdout } = await dumpDom(chrome, `http://127.0.0.1:${address.port}/index.html`, 1500);
    for (const deck of decks) {
      if (!stdout.includes(`href="./${deck}"`)) failures.push(`index.html: missing link to ${deck}`);
    }
  } catch (error) {
    failures.push(`index.html: Chrome failed: ${error.message}`);
  }
  for (const missing of missingRequests) failures.push(`index.html: local request returned 404: ${missing}`);

  for (const deck of decks) {
    missingRequests.clear();
    const url = `http://127.0.0.1:${address.port}/${encodeURIComponent(deck)}`;

    try {
      const { stdout } = await dumpDom(chrome, url);
      if (!revealIsReady(stdout)) failures.push(`${deck}: Reveal did not reach the ready state`);
    } catch (error) {
      failures.push(`${deck}: Chrome failed: ${error.message}`);
    }

    for (const missing of missingRequests) failures.push(`${deck}: local request returned 404: ${missing}`);
  }

  if (failures.length) {
    throw new Error(`Presentation smoke tests failed:\n- ${failures.join('\n- ')}`);
  }

  console.log(`Smoke tested Pure index and ${decks.length} presentations in headless Chrome with no local 404s.`);
} finally {
  if (server) await new Promise(resolve => server.close(resolve));
  await rm(workDir, { recursive: true, force: true });
}
