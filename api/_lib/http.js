
export async function readJson(req) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return {}; } }
    return req.body;
  }
  const chunks = [];
  for await (const c of req) chunks.push(c);
  if (!chunks.length) return {};
  const raw = Buffer.concat(chunks).toString('utf8');
  const type = String(req.headers['content-type'] || '');
  if (type.includes('application/x-www-form-urlencoded')) {
    return Object.fromEntries(new URLSearchParams(raw));
  }
  try { return JSON.parse(raw); } catch { return {}; }
}

export function send(res, status, body, headers = {}) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.end(JSON.stringify(body));
}

export const ok = (res, body = { ok: true }, headers) => send(res, 200, body, headers);
export const bad = (res, message, status = 400) => send(res, status, { error: message });

export function query(req) {
  if (req.query && typeof req.query === 'object') return req.query;
  const u = new URL(req.url, 'http://x');
  return Object.fromEntries(u.searchParams);
}

export function parseCookies(req) {
  const out = {};
  const raw = req.headers.cookie || '';
  raw.split(';').forEach((p) => {
    const i = p.indexOf('=');
    if (i < 0) return;
    const v = p.slice(i + 1).trim();
    try { out[p.slice(0, i).trim()] = decodeURIComponent(v); } catch { out[p.slice(0, i).trim()] = v; }
  });
  return out;
}

// NODE_ENV alone isn't reliable across build configs; VERCEL is set on every deployment.
const secureByDefault = () => process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);

export function cookie(name, value, { maxAge = 60 * 60 * 24 * 365, secure } = {}) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
  ];
  if (secure ?? secureByDefault()) parts.push('Secure');
  return parts.join('; ');
}

// Must share attributes with the cookie it clears, or a strict browser won't match them.
export function clearCookie(name) {
  return `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureByDefault() ? '; Secure' : ''}`;
}

export function route(handlers) {
  return async function handler(req, res) {
    const fn = handlers[req.method] || handlers.ALL;
    if (!fn) return bad(res, 'Method not allowed', 405);
    try {
      await fn(req, res);
    } catch (err) {
      console.error(err);
      if (res.headersSent) return;
      const detail = err.expose || process.env.NODE_ENV !== 'production' || /DATABASE_URL|ADMIN_PASSWORD|SESSION_SECRET/.test(err.message)
        ? err.message : 'Server error';
      bad(res, detail, err.status || 500);
    }
  };
}

export function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  e.expose = true;
  return e;
}

export const str = (v, max = 2000) => (v == null ? null : String(v).trim().slice(0, max) || null);
export const int = (v) => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : null; };
