var http = require('http');
var https = require('https');
var fs = require('fs');
var path = require('path');
var url = require('url');
var querystring = require('querystring');

var PORT = process.env.PORT || 3000;
var ROOT = __dirname;
var OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
var OPENROUTER_SITE_URL = process.env.OPENROUTER_SITE_URL || '';
var OPENROUTER_APP_NAME = process.env.OPENROUTER_APP_NAME || 'rampyai free';

function send(res, statusCode, contentType, body) {
    res.writeHead(statusCode, { 'Content-Type': contentType });
    res.end(body);
}

function serveStatic(req, res) {
    var pathname = url.parse(req.url).pathname;
    if (pathname === '/' || pathname === '/index.html') pathname = '/index.html';
    if (pathname === '/favicon.ico') {
        return send(res, 204, 'text/plain; charset=utf-8', '');
    }

    var filePath = path.join(ROOT, pathname);
    if (filePath.indexOf(ROOT) !== 0) {
        return send(res, 403, 'text/plain; charset=utf-8', 'Forbidden');
    }

    fs.readFile(filePath, function(err, data) {
        if (err) {
            fs.readFile(path.join(ROOT, 'index.html'), function(indexErr, indexData) {
                if (indexErr) {
                    return send(res, 404, 'text/plain; charset=utf-8', 'Not found');
                }
                send(res, 200, 'text/html; charset=utf-8', indexData);
            });
            return;
        }

        var ext = path.extname(filePath).toLowerCase();
        var type = 'text/plain; charset=utf-8';
        if (ext === '.html') type = 'text/html; charset=utf-8';
        else if (ext === '.css') type = 'text/css; charset=utf-8';
        else if (ext === '.js') type = 'application/javascript; charset=utf-8';
        else if (ext === '.png') type = 'image/png';
        else if (ext === '.jpg' || ext === '.jpeg') type = 'image/jpeg';

        send(res, 200, type, data);
    });
}

function proxyChat(req, res, body) {
    var baseURL = body.baseURL || 'https://openrouter.ai/api/v1';
    var apiKey = body.apiKey || '';
    var model = body.model || 'llama3.2';
    var message = body.message || '';

    if (!message) {
        return send(res, 400, 'application/json; charset=utf-8', JSON.stringify({ error: { message: 'Missing message' } }));
    }

    var parsed = url.parse(baseURL);
    var isHttps = parsed.protocol === 'https:';
    var apiHost = parsed.host || parsed.hostname;
    var basePath = (parsed.pathname || '').replace(/\/$/, '');
    var usesOllamaNative = /\/api$/i.test(basePath) || /api\/chat$/i.test(basePath);
    var isOpenRouter = /openrouter\.ai$/i.test(apiHost || '') || /openrouter\.ai/i.test(baseURL);
    var apiPath;

    if (usesOllamaNative) {
        apiPath = basePath.replace(/\/api$/i, '') + '/api/chat';
        if (apiPath === '/api/chat') apiPath = '/api/chat';
    } else {
        if (!basePath || basePath === '/') {
            apiPath = '/v1/chat/completions';
        } else if (/\/api\/v1$/i.test(basePath)) {
            apiPath = basePath + '/chat/completions';
        } else if (/\/v1$/i.test(basePath)) {
            apiPath = basePath + '/chat/completions';
        } else {
            apiPath = basePath + '/v1/chat/completions';
        }
    }

    var payload = usesOllamaNative ? JSON.stringify({
        model: model,
        messages: [
            { role: 'user', content: message }
        ],
        stream: false
    }) : JSON.stringify({
        model: model,
        messages: [
            { role: 'user', content: message }
        ]
    });

    var headers = {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
    };

    if (isOpenRouter) {
        var effectiveKey = apiKey || OPENROUTER_API_KEY || '';
        if (!effectiveKey) {
            return send(res, 400, 'application/json; charset=utf-8', JSON.stringify({ error: { message: 'Missing OpenRouter API key' } }));
        }
        headers.Authorization = 'Bearer ' + effectiveKey;
        if (OPENROUTER_SITE_URL) headers['HTTP-Referer'] = OPENROUTER_SITE_URL;
        headers['X-Title'] = OPENROUTER_APP_NAME;
    } else if (/localhost:11434/i.test(baseURL) && !/\/v1/i.test(basePath)) {
        headers['Accept'] = 'application/json';
    }

    var requestOptions = {
        hostname: apiHost,
        port: parsed.port || (isHttps ? 443 : 80),
        path: apiPath,
        method: 'POST',
        headers: headers
    };

    var client = isHttps ? https : http;
    var apiReq = client.request(requestOptions, function(apiRes) {
        var chunks = [];
        apiRes.on('data', function(chunk) { chunks.push(chunk); });
        apiRes.on('end', function() {
            var raw = Buffer.concat(chunks).toString('utf8');
            if (apiRes.statusCode === 404) {
                raw = JSON.stringify({ error: { message: 'OpenRouter returned 404 Not Found. Check the model name and Server URL.', statusCode: 404 } });
            } else if (apiRes.statusCode >= 400 && !raw) {
                raw = JSON.stringify({ error: { message: 'Upstream error', statusCode: apiRes.statusCode } });
            }
            send(res, apiRes.statusCode || 500, 'application/json; charset=utf-8', raw);
        });
    });

    apiReq.on('error', function(err) {
        send(res, 500, 'application/json; charset=utf-8', JSON.stringify({ error: { message: err.message } }));
    });

    apiReq.write(payload);
    apiReq.end();
}

http.createServer(function(req, res) {
    if (req.method === 'POST' && url.parse(req.url).pathname === '/api') {
        var body = '';
        req.on('data', function(chunk) { body += chunk; });
        req.on('end', function() {
            var parsedBody = querystring.parse(body);
            proxyChat(req, res, parsedBody);
        });
        return;
    }

    serveStatic(req, res);
}).listen(PORT, function() {
    console.log('rampyai free listening on http://localhost:' + PORT);
});
