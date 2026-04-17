var http = require('http');
var fs = require('fs');
var path = require('path');
var https = require('https');
var querystring = require('querystring');

var root = __dirname;
var port = 3000;

function send(res, code, body, type) {
  res.writeHead(code, { 'Content-Type': type || 'text/plain; charset=utf-8' });
  res.end(body);
}

function readFile(res, filePath, type) {
  fs.readFile(filePath, function(err, data) {
    if (err) return send(res, 404, 'Not found');
    send(res, 200, data, type);
  });
}

function handleProxy(req, res, body) {
  var data = querystring.parse(body);
  var baseURL = data.baseURL || 'https://api.openai.com';
  var apiKey = data.apiKey || '';
  var model = data.model || 'gpt-3.5-turbo';
  var message = data.message || '';
  var url = baseURL.replace(/\/+$/, '') + '/v1/chat/completions';
  var parsed = require('url').parse(url);
  var payload = JSON.stringify({
    model: model,
    messages: [{ role: 'user', content: message }]
  });

  var options = {
    hostname: parsed.hostname,
    port: parsed.port || 443,
    path: parsed.path,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
      'Authorization': 'Bearer ' + apiKey
    }
  };

  var proxyReq = https.request(options, function(proxyRes) {
    var chunks = '';
    proxyRes.on('data', function(c) { chunks += c; });
    proxyRes.on('end', function() {
      send(res, 200, chunks, 'application/json; charset=utf-8');
    });
  });

  proxyReq.on('error', function() {
    send(res, 500, JSON.stringify({ error: { message: 'Request failed' } }), 'application/json; charset=utf-8');
  });

  proxyReq.write(payload);
  proxyReq.end();
}

http.createServer(function(req, res) {
  if (req.url === '/api' && req.method === 'POST') {
    var body = '';
    req.on('data', function(chunk) { body += chunk; });
    req.on('end', function() { handleProxy(req, res, body); });
    return;
  }

  if (req.url === '/' || req.url === '/index.html') {
    return readFile(res, path.join(root, 'index.html'), 'text/html; charset=utf-8');
  }
  if (req.url === '/style.css') {
    return readFile(res, path.join(root, 'style.css'), 'text/css; charset=utf-8');
  }
  if (req.url === '/app.js') {
    return readFile(res, path.join(root, 'app.js'), 'application/javascript; charset=utf-8');
  }
  if (req.url === '/logo.png') {
    return readFile(res, path.join(root, 'logo.png'), 'image/png');
  }

  send(res, 404, 'Not found');
}).listen(port, function() {
  console.log('rampyai running at http://localhost:' + port + '/');
});
