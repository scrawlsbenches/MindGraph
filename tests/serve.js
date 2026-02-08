const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PORT = process.env.PORT || 3000;

const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.map': 'application/json',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

http
  .createServer((req, res) => {
    const url = req.url === '/' ? '/index.html' : req.url.split('?')[0];
    const filePath = path.join(ROOT, url);
    const ext = path.extname(filePath);
    try {
      const data = fs.readFileSync(filePath);
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end('Not Found');
    }
  })
  .listen(PORT, () => console.log(`Serving on http://localhost:${PORT}`));
