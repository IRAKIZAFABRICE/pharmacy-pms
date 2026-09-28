// scripts/update-server.js
// Simple HTTP server for local update testing
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const UPDATES_DIR = 'C:\\updates';
const PORT = 3000;

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  let filePath = path.join(UPDATES_DIR, parsedUrl.pathname);

  // Security: Prevent directory traversal
  if (!filePath.startsWith(UPDATES_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  // Check if file exists
  fs.stat(filePath, (err, stats) => {
    if (err) {
      res.writeHead(404);
      res.end('File not found');
      console.log(`❌ 404: ${parsedUrl.pathname}`);
      return;
    }

    // If it's a directory, try index.html or list files
    if (stats.isDirectory()) {
      fs.readdir(filePath, (err, files) => {
        if (err) {
          res.writeHead(500);
          res.end('Error reading directory');
          return;
        }
        
        // Check if index.html exists
        if (files.includes('index.html')) {
          filePath = path.join(filePath, 'index.html');
          serveFile(filePath, res);
        } else {
          // List files
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.write(`<h1>Updates Directory</h1><ul>`);
          for (const file of files) {
            const fileStat = fs.statSync(path.join(filePath, file));
            if (fileStat.isFile()) {
              const fileSize = (fileStat.size / 1024 / 1024).toFixed(2);
              res.write(`<li><a href="${parsedUrl.pathname}${file}">${file}</a> (${fileSize} MB)</li>`);
            }
          }
          res.write('</ul>');
          res.end();
        }
      });
      return;
    }

    // Serve the file
    serveFile(filePath, res);
  });
});

function serveFile(filePath, res) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.exe': 'application/octet-stream',
    '.yml': 'text/yaml',
    '.yaml': 'text/yaml',
    '.json': 'application/json',
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
  };

  const mimeType = mimeTypes[ext] || 'application/octet-stream';
  
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500);
      res.end('Error reading file');
      console.log(`❌ Error reading: ${filePath}`);
      return;
    }

    res.writeHead(200, {
      'Content-Type': mimeType,
      'Content-Length': data.length,
      'Access-Control-Allow-Origin': '*',
    });
    res.end(data);
    console.log(`✅ Served: ${path.basename(filePath)} (${(data.length / 1024 / 1024).toFixed(2)} MB)`);
  });
}

server.listen(PORT, () => {
  console.log('========================================');
  console.log('  Update Server Started');
  console.log('========================================');
  console.log(`🌐 Server running at: http://localhost:${PORT}`);
  console.log(`📁 Serving updates from: ${UPDATES_DIR}`);
  console.log('');
  console.log('📋 To use this server, set package.json publish URL to:');
  console.log(`   "url": "http://localhost:${PORT}/"`);
  console.log('');
  console.log('📥 To test updates:');
  console.log(`   1. Build new version: npm run release:publish`);
  console.log(`   2. Run the old version`);
  console.log(`   3. App will detect the update`);
  console.log('');
  console.log('Press Ctrl+C to stop the server');
  console.log('========================================');
});