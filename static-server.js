'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const port = process.env.STATIC_PORT || process.argv[2] || 3000;
const base = process.argv[3] || 'public';

const mimeMap = {
  '.ico': 'image/x-icon',
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword'
};

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);

  const parsedUrl = new URL(
    req.url,
    `http://${req.headers.host || 'localhost'}`
  );
  let safePath = path
    .normalize(parsedUrl.pathname)
    .replace(/^(\.\.[/\\])+/, '');
  if (safePath === '/' || safePath === '') {
    safePath = '/index.html';
  }

  let filePath = path.join(__dirname, base, safePath);

  if (!fs.existsSync(filePath)) {
    res.statusCode = 404;
    res.end(`File ${safePath} not found!`);
    return;
  }

  if (fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
    if (!fs.existsSync(filePath)) {
      res.statusCode = 404;
      res.end(`Index file in ${safePath} not found!`);
      return;
    }
  }

  const ext = path.extname(filePath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.statusCode = 500;
      res.end(`Error reading file: ${err.message}`);
      return;
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET, POST, OPTIONS, PUT, PATCH, DELETE'
    );
    res.setHeader(
      'Access-Control-Allow-Headers',
      'X-Requested-With,content-type'
    );
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Content-Type', mimeMap[ext] || 'text/plain');
    res.end(data);
  });
});

server.listen(parseInt(port, 10), () => {
  console.log(`Static server listening on port ${port}`);
});
