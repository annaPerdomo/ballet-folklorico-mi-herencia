import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
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
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.mp4': 'video/mp4', '.webm': 'video/webm', '.xml': 'application/xml', '.txt': 'text/plain' };

async function resolveApi(pathname) {
  const rel = pathname.replace(/^\/api\//, '');
  const direct = path.join(ROOT, 'api', rel + '.js');
  if (existsSync(direct)) return { file: direct, params: {} };
  const parts = rel.split('/');
  const last = parts.pop();
  const dyn = path.join(ROOT, 'api', ...parts, '[id].js');
  if (existsSync(dyn)) return { file: dyn, params: { id: last } };
  return null;
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname.startsWith('/api/')) {
    const hit = await resolveApi(url.pathname);
    if (!hit) { res.statusCode = 404; return res.end('{"error":"no such api"}'); }
    req.query = { ...Object.fromEntries(url.searchParams), ...hit.params };
    const mod = await import(pathToFileURL(hit.file).href);
    return mod.default(req, res);
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
