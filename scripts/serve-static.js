const fs = require('fs');
const http = require('http');
const path = require('path');

const rootDir = path.resolve(process.cwd(), process.argv[2] || 'build');
const port = Number(process.argv[3] || 3000);

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

const sendFile = (filePath, res) => {
  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Unable to read requested file.');
      return;
    }

    const extension = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': contentTypes[extension] || 'application/octet-stream',
    });
    res.end(data);
  });
};

const server = http.createServer((req, res) => {
  const requestPath = decodeURIComponent((req.url || '/').split('?')[0]);
  const normalizedPath = requestPath === '/' ? '/index.html' : requestPath;
  const safePath = normalizedPath.replace(/^\/+/, '');
  const targetPath = path.resolve(rootDir, safePath);

  if (!targetPath.startsWith(rootDir)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  fs.stat(targetPath, (error, stats) => {
    if (!error && stats.isFile()) {
      sendFile(targetPath, res);
      return;
    }

    sendFile(path.join(rootDir, 'index.html'), res);
  });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Static server ready at http://127.0.0.1:${port}`);
});

const shutdown = () => {
  server.close(() => process.exit(0));
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
