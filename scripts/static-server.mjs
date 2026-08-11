import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';

const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.gif', 'image/gif'],
  ['.html', 'text/html; charset=utf-8'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.map', 'application/json; charset=utf-8'],
  ['.pdf', 'application/pdf'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.webp', 'image/webp'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2']
]);

export function contentType(filePath) {
  return contentTypes.get(path.extname(filePath).toLowerCase()) || 'application/octet-stream';
}

export function resolveRequestPath(root, requestUrl) {
  const url = new URL(requestUrl || '/', 'http://localhost');
  let pathname;

  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    return { status: 400 };
  }

  const resolvedRoot = path.resolve(root);
  const candidate = path.resolve(resolvedRoot, `.${pathname}`);
  if (candidate !== resolvedRoot && !candidate.startsWith(`${resolvedRoot}${path.sep}`)) {
    return { status: 403 };
  }

  return { status: 200, path: candidate };
}

export async function createStaticServer({ root = '.', host = 'localhost', port = 8000 } = {}) {
  const resolvedRoot = path.resolve(root);

  const server = createServer(async (request, response) => {
    const resolved = resolveRequestPath(resolvedRoot, request.url);
    if (resolved.status !== 200) {
      response.writeHead(resolved.status).end(resolved.status === 400 ? 'Bad request' : 'Forbidden');
      return;
    }

    let filePath = resolved.path;

    try {
      const info = await stat(filePath);
      if (info.isDirectory()) filePath = path.join(filePath, 'index.html');
      const fileInfo = await stat(filePath);
      if (!fileInfo.isFile()) throw new Error('Not a file');
    } catch {
      response.writeHead(404).end('Not found');
      return;
    }

    response.writeHead(200, {
      'content-type': contentType(filePath),
      'cache-control': 'no-store'
    });
    createReadStream(filePath).pipe(response);
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, resolve);
  });

  return server;
}
