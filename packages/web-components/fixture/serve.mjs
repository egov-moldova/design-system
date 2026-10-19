// Serves the fixture for the Playwright spec:  node serve.mjs <port>
//   /static/**       the hand-written pages of this directory (the loader, import map and script-tag shapes)
//   /node_modules/** the installed packages, the way a plain-HTML page or a CDN-style setup reaches them
//   everything else  the Vite production build (`dist/`), where `/` is the adapter page
// A path that does not exist is a 404, which the browser logs as a console error and the spec fails on.
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const port = Number(process.argv[2]);
if (!Number.isInteger(port) || port <= 0) throw new Error('usage: node serve.mjs <port>');

const TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.map': 'application/json',
  '.mjs': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

/** The file a request path maps to, and the directory it must stay inside. */
function target(path) {
  if (path.startsWith('/node_modules/') || path.startsWith('/static/')) return { root: here, file: join(here, path) };
  const root = join(here, 'dist');
  return { root, file: join(root, path) };
}

createServer((request, response) => {
  let path;
  try {
    path = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
  } catch {
    // A malformed escape (`%E0%A4%A`) throws URIError; the request is the client's mistake.
    response.writeHead(400).end();
    return;
  }
  const { root, file: joined } = target(path);
  let file = normalize(joined);
  if (!file.startsWith(root + sep) && file !== root) {
    response.writeHead(403).end();
    return;
  }
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  if (!existsSync(file)) {
    response.writeHead(404).end();
    return;
  }
  response.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(response);
}).listen(port, '127.0.0.1');
