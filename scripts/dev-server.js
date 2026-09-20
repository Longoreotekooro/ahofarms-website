// Local preview server. Node built-ins only. Serves the static site and,
// so the portals can be exercised end to end without Vercel, also:
//   - runs middleware.js on every request the way Vercel's Edge does
//     (redirects, pass-through headers)
//   - routes /api/* to the handlers in api/**.js
//   - loads .env.local (gitignored) into process.env for SESSION_SECRET,
//     PORTAL_USERS and friends
//   - mirrors vercel.json's directory behaviour for /portal paths
const http = require('http');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.join(__dirname, '..');
const PORT = process.env.PORT || 8123;

// .env.local: KEY=VALUE lines, quotes optional, # comments.
const envFile = path.join(ROOT, '.env.local');
if (fs.existsSync(envFile)) {
  fs.readFileSync(envFile, 'utf8').split(/\r?\n/).forEach(line => {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (!m || line.trim().startsWith('#')) return;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!(m[1] in process.env)) process.env[m[1]] = v;
  });
  console.log('dev-server: loaded .env.local');
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.mp4': 'video/mp4', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.json': 'application/json', '.ico': 'image/x-icon', '.pdf': 'application/pdf', '.woff2': 'font/woff2',
};

function send416(res) { res.writeHead(416, { 'Content-Range': '*/0' }); res.end(); }

function serveFile(req, res, full, extraHeaders) {
  fs.stat(full, (err, stat) => {
    if (err || !stat.isFile()) { res.writeHead(404); res.end('Not found'); return; }
    const type = MIME[path.extname(full).toLowerCase()] || 'application/octet-stream';
    const range = req.headers.range;
    const headers = Object.assign({ 'Content-Type': type, 'Accept-Ranges': 'bytes' }, extraHeaders || {});
    if (range) {
      const m = /bytes=(\d*)-(\d*)/.exec(range);
      if (!m) return send416(res);
      const start = m[1] ? parseInt(m[1], 10) : 0;
      const end = m[2] ? parseInt(m[2], 10) : stat.size - 1;
      if (start >= stat.size || end >= stat.size) return send416(res);
      res.writeHead(206, Object.assign(headers, { 'Content-Range': `bytes ${start}-${end}/${stat.size}`, 'Content-Length': end - start + 1 }));
      fs.createReadStream(full, { start, end }).pipe(res);
      return;
    }
    res.writeHead(200, Object.assign(headers, { 'Content-Length': stat.size }));
    fs.createReadStream(full).pipe(res);
  });
}

// ---- API: api/<segments>.js, ESM default export (req, res) ----
async function handleApi(req, res, reqPath) {
  const rel = reqPath.replace(/^\/api\//, '').replace(/\/+$/, '');
  const file = path.join(ROOT, 'api', rel + '.js');
  if (!file.startsWith(path.join(ROOT, 'api')) || !fs.existsSync(file)) { res.writeHead(404, { 'Content-Type': 'application/json' }); res.end('{"ok":false,"error":"Not found"}'); return; }
  try {
    // cache-bust on every request so edits are picked up without a restart
    const mod = await import(pathToFileURL(file).href + '?t=' + fs.statSync(file).mtimeMs);
    await mod.default(req, res);
  } catch (e) {
    console.error('api error', reqPath, e);
    if (!res.headersSent) { res.writeHead(500, { 'Content-Type': 'application/json' }); }
    res.end(JSON.stringify({ ok: false, error: 'Server error: ' + e.message }));
  }
}

// ---- middleware.js, as Vercel's Edge runtime would call it ----
async function runMiddleware(req, reqPath) {
  const file = path.join(ROOT, 'middleware.js');
  if (!fs.existsSync(file)) return null;
  const mod = await import(pathToFileURL(file).href + '?t=' + fs.statSync(file).mtimeMs);
  const matcher = (mod.config && mod.config.matcher) || [];
  const matches = [].concat(matcher).some(m => new RegExp('^' + m.replace(/:path\*/g, '.*').replace(/:[a-z]+/g, '[^/]+') + '$').test(reqPath));
  if (!matches) return null;
  const url = `http://${req.headers.host || 'localhost'}${req.url}`;
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v);
  return mod.default(new Request(url, { method: req.method, headers }));
}

const server = http.createServer(async (req, res) => {
  let reqPath = decodeURIComponent(req.url.split('?')[0]);
  if (reqPath.startsWith('/api/')) return handleApi(req, res, reqPath);

  // vercel.json redirects for the portal directory forms
  if (/^\/portal\/(prescriber|pharmacy|export-partner)\/?$/.test(reqPath)) { res.writeHead(302, { Location: reqPath.replace(/\/?$/, '') + '/home.html' }); res.end(); return; }
  if (reqPath === '/portal' || reqPath === '/portal/') reqPath = '/portal/index.html';
  if (reqPath === '/') reqPath = '/index.html';

  let extra = {};
  try {
    const out = await runMiddleware(req, reqPath);
    if (out instanceof Response) {
      if (out.headers.get('x-middleware-next')) {
        out.headers.forEach((v, k) => { if (k !== 'x-middleware-next') extra[k] = v; });
      } else {
        res.statusCode = out.status;
        out.headers.forEach((v, k) => { if (k.toLowerCase() === 'set-cookie') return; res.setHeader(k, v); });
        const cookies = typeof out.headers.getSetCookie === 'function' ? out.headers.getSetCookie() : [];
        if (cookies.length) res.setHeader('Set-Cookie', cookies);
        res.end(await out.text());
        return;
      }
    }
  } catch (e) {
    console.error('middleware error', e);
    res.writeHead(500); res.end('middleware error: ' + e.message); return;
  }

  const full = path.normalize(path.join(ROOT, reqPath));
  if (!full.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
  serveFile(req, res, full, extra);
});

server.listen(PORT, () => console.log(`dev-server listening on http://localhost:${PORT}`));
