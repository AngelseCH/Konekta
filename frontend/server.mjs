import { createReadStream, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';

const root = fileURLToPath(new URL('.', import.meta.url));
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'application/javascript; charset=utf-8'
};
createServer((request, response) => {
  const pathname = new URL(request.url || '/', 'http://localhost').pathname;
  const requested = pathname === '/' ? '/index.html' : pathname;
  const filePath = normalize(join(root, requested));
  if (!filePath.startsWith(root)) { response.writeHead(403); response.end(); return; }
  try {
    statSync(filePath);
    const type = types[extname(filePath)] || 'application/octet-stream';
    response.writeHead(200, { 'Content-Type': type });
    const stream = createReadStream(filePath);
    stream.on('error', () => {
      if (!response.headersSent) response.writeHead(404);
      response.end('Not found');
    });
    stream.pipe(response);
  } catch {
    response.writeHead(404);
    response.end('Not found');
  }
}).listen(5500, () => console.log('Frontend disponible en http://localhost:5500'));
