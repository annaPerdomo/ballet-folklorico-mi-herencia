import http from 'node:http';
import { readFile, stat, mkdir } from 'node:fs/promises';
import { existsSync, readFileSync, readdirSync, createReadStream, createWriteStream } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = path.dirname(new URL(import.meta.url).pathname);

const envFile = path.join(ROOT, '.env.local');
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m || line.trim().startsWith('#')) continue;
    if (process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^(["'])(.*)\1$/, '$2');
  }
}
const PORT = process.env.PORT || 3456;
for (const k of ['DATABASE_URL', 'ADMIN_PASSWORD']) {
  if (!process.env[k]) console.warn(`⚠️  ${k} is not set — add it to .env.local (see .env.example). The app will not work without it.`);
}
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.mp4': 'video/mp4', '.webm': 'video/webm', '.xml': 'application/xml', '.txt': 'text/plain',
  '.mov': 'video/quicktime', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.wav': 'audio/wav', '.heic': 'image/heic' };

async function serveDevMedia(req, res, url) {
  const { verifyDevUrl, DEV_DIR } = await import('./api/_lib/storage.js');
  const key = decodeURIComponent(url.pathname.slice('/__media/'.length));
  const method = req.method === 'HEAD' ? 'GET' : req.method;
  const q = url.searchParams;
  if (key.split('/').some((seg) => !seg || seg.startsWith('.')) || q.get('m') !== method || !verifyDevUrl(method, key, q.get('exp'), q.get('sig'), q.get('len'))) {
    res.statusCode = 403; return res.end('Forbidden');
  }
  // R2 enforces a signed content-length; mirror it so local uploads fail the same way.
  if (q.get('len') && req.headers['content-length'] !== q.get('len')) { res.statusCode = 403; return res.end('Wrong size'); }
  const file = path.join(DEV_DIR, key);
  if (method === 'PUT') {
    await mkdir(path.dirname(file), { recursive: true });
    req.pipe(createWriteStream(file)).on('finish', () => { res.statusCode = 200; res.end(); });
    return;
  }
  let size;
  try { size = (await stat(file)).size; } catch { res.statusCode = 404; return res.end('Not found'); }
  res.setHeader('Content-Type', MIME[path.extname(file).toLowerCase()] || 'application/octet-stream');
  res.setHeader('Accept-Ranges', 'bytes');
  if (q.get('dl')) res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(q.get('dl'))}`);
  const range = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
  if (range) {
    const start = range[1] ? +range[1] : size - +range[2];
    const end = range[1] && range[2] ? Math.min(+range[2], size - 1) : size - 1;
    res.statusCode = 206;
    res.setHeader('Content-Range', `bytes ${start}-${end}/${size}`);
    res.setHeader('Content-Length', end - start + 1);
    return req.method === 'HEAD' ? res.end() : createReadStream(file, { start, end }).pipe(res);
  }
  res.setHeader('Content-Length', size);
  return req.method === 'HEAD' ? res.end() : createReadStream(file).pipe(res);
}

// Mirrors the rewrites in vercel.json, so dev and production route these the same way.
const REWRITES = { '/api/dancers': ['/api/families', { r: 'dancers' }], '/api/availability': ['/api/families', { r: 'availability' }] };

async function resolveApi(pathname) {
  const [target, extra] = REWRITES[pathname] || [pathname, {}];
  const rel = target.replace(/^\/api\//, '');
  const direct = path.join(ROOT, 'api', rel + '.js');
  if (existsSync(direct)) return { file: direct, params: extra };
  const parts = rel.split('/');
  const last = parts.pop();
  const dir = path.join(ROOT, 'api', ...parts);
  const dyn = existsSync(dir) && readdirSync(dir).find((f) => /^\[.+\]\.js$/.test(f));
  if (dyn) return { file: path.join(dir, dyn), params: { ...extra, [dyn.slice(1, -4).replace(/\]$/, '')]: last } };
  return null;
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname.startsWith('/__media/')) return serveDevMedia(req, res, url);
  if (url.pathname.startsWith('/api/')) {
    const hit = await resolveApi(url.pathname);
    if (!hit) { res.statusCode = 404; return res.end('{"error":"no such api"}'); }
    req.query = { ...Object.fromEntries(url.searchParams), ...hit.params };
    const mod = await import(pathToFileURL(hit.file).href);
    return mod.default(req, res);
  }
  if (/^\/famil(y|ia)\/?$/.test(url.pathname)) {
    if (url.pathname !== '/familia') { res.statusCode = 308; res.setHeader('Location', '/familia' + url.search); return res.end(); }
    url.pathname = '/team/index.html';
  }
  const rel = decodeURIComponent(url.pathname);
  if (rel.split('/').some((seg) => seg.startsWith('.')) || /^\/(?:node_modules|scripts|feedback-images)(?:\/|$)/.test(rel)) { res.statusCode = 404; return res.end('Not found'); }
  let file = path.join(ROOT, rel);
  try {
    if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
  } catch { if (existsSync(file + '.html')) file = file + '.html'; }
  try {
    const data = await readFile(file);
    res.setHeader('Content-Type', MIME[path.extname(file)] || 'application/octet-stream');
    res.end(data);
  } catch { res.statusCode = 404; res.end('Not found'); }
}).listen(PORT, '127.0.0.1', () => console.log(`dev server on http://localhost:${PORT}  →  team app: http://localhost:${PORT}/team/`));
