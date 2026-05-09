const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 5173;
const DIST_DIR = path.join(__dirname, 'dist');

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json'
};

function serveFile(filePath, res) {
  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  let url = req.url.split('?')[0];

  // 去掉末尾斜杠
  if (url.endsWith('/') && url !== '/') {
    url = url.slice(0, -1);
  }

  // 静态文件
  const staticFile = path.join(DIST_DIR, url);
  if (fs.existsSync(staticFile) && fs.statSync(staticFile).isFile()) {
    serveFile(staticFile, res);
    return;
  }

  // Admin 路由 - 返回 admin/index.html
  if (url.startsWith('/admin')) {
    const adminIndex = path.join(DIST_DIR, 'admin', 'index.html');
    serveFile(adminIndex, res);
    return;
  }

  // API 路由代理（如果需要）
  if (url.startsWith('/api/')) {
    res.writeHead(404);
    res.end('API not configured');
    return;
  }

  // 默认 - 返回 index.html（SPA）
  const indexPath = path.join(DIST_DIR, 'index.html');
  serveFile(indexPath, res);
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Serving files from: ${DIST_DIR}`);
});
