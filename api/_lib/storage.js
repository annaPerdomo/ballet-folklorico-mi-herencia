import crypto from 'node:crypto';
import { rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { httpError } from './http.js';

// Private Cloudflare R2 bucket (S3 API); browsers only ever get short-lived presigned URLs.
// Without R2_* (local dev only) files go to .media-dev/ and dev-server.mjs serves them.

const r2 = () => {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) return null;
  return { host: `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, bucket: R2_BUCKET, accessKey: R2_ACCESS_KEY_ID, secretKey: R2_SECRET_ACCESS_KEY };
};

const devMode = () => !r2() && !process.env.VERCEL;
export const DEV_DIR = path.resolve('.media-dev');

export function storageReady() {
  return Boolean(r2()) || devMode();
}

function need() {
  if (!storageReady()) throw httpError(503, 'Media storage is not set up yet (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET)');
}

const enc = (s) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
const hmac = (k, s) => crypto.createHmac('sha256', k).update(s).digest();
const amzDate = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

// Uploads sign content-length: R2 then refuses any body size other than the one counted against the quota.
export function presign({ method, host, path: p, accessKey, secretKey, region = 'auto', expires, date = new Date(), extra = {}, headers = {} }) {
  const stamp = amzDate(date);
  const day = stamp.slice(0, 8);
  const scope = `${day}/${region}/s3/aws4_request`;
  const signed = { ...headers, host };
  const names = Object.keys(signed).map((k) => k.toLowerCase()).sort();
  const lower = Object.fromEntries(Object.entries(signed).map(([k, v]) => [k.toLowerCase(), String(v)]));
  const params = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${accessKey}/${scope}`,
    'X-Amz-Date': stamp,
    'X-Amz-Expires': String(expires),
    'X-Amz-SignedHeaders': names.join(';'),
    ...extra,
  };
  const qs = Object.keys(params).sort().map((k) => `${enc(k)}=${enc(params[k])}`).join('&');
  const uri = p.split('/').map(enc).join('/');
  const canonicalHeaders = names.map((k) => `${k}:${lower[k]}\n`).join('');
  const canonical = [method, uri, qs, canonicalHeaders, names.join(';'), 'UNSIGNED-PAYLOAD'].join('\n');
  const toSign = ['AWS4-HMAC-SHA256', stamp, scope, sha256(canonical)].join('\n');
  let key = hmac(`AWS4${secretKey}`, day);
  for (const part of [region, 's3', 'aws4_request']) key = hmac(key, part);
  const sig = crypto.createHmac('sha256', key).update(toSign).digest('hex');
  return `https://${host}${uri}?${qs}&X-Amz-Signature=${sig}`;
}

function devSign(method, key, exp, len = '') {
  const secret = process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || 'dev';
  return crypto.createHmac('sha256', secret).update(`${method}.${key}.${exp}.${len}`).digest('base64url').slice(0, 32);
}

export function verifyDevUrl(method, key, exp, sig, len) {
  return Number(exp) * 1000 > Date.now() && sig === devSign(method, key, exp, len || '');
}

// GET links are minted per 6-hour window so a photo's URL stays stable for the browser cache.
const WINDOW = 6 * 3600 * 1000;

export function signedUrl(method, key, { download, length } = {}) {
  need();
  const now = Date.now();
  const date = method === 'GET' ? new Date(Math.floor(now / WINDOW) * WINDOW) : new Date(now);
  const expires = method === 'GET' ? 12 * 3600 : 600;
  const extra = download ? { 'response-content-disposition': `attachment; filename*=UTF-8''${enc(download)}` } : {};
  const c = r2();
  if (!c) {
    const exp = Math.floor(date.getTime() / 1000) + expires;
    const dl = download ? `&dl=${enc(download)}` : '';
    const len = length != null ? `&len=${length}` : '';
    return `/__media/${key.split('/').map(enc).join('/')}?m=${method}&exp=${exp}&sig=${devSign(method, key, exp, length ?? '')}${dl}${len}`;
  }
  const headers = length != null ? { 'content-length': length } : {};
  return presign({ method, host: c.host, path: `/${c.bucket}/${key}`, accessKey: c.accessKey, secretKey: c.secretKey, expires, date, extra, headers });
}

export async function objectSize(key) {
  need();
  if (!r2()) {
    try { return (await stat(path.join(DEV_DIR, key))).size; } catch { return null; }
  }
  const r = await fetch(signedUrl('HEAD', key), { method: 'HEAD' });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`Storage HEAD failed: ${r.status}`);
  return Number(r.headers.get('content-length')) || 0;
}

export async function removeObject(key) {
  if (!key || !storageReady()) return;
  if (!r2()) { await rm(path.join(DEV_DIR, key), { force: true }); return; }
  const r = await fetch(signedUrl('DELETE', key), { method: 'DELETE' });
  if (!r.ok && r.status !== 404) throw new Error(`Storage DELETE failed: ${r.status}`);
}
