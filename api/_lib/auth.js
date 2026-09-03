import crypto from 'node:crypto';
import { one, sql } from './db.js';
import { parseCookies, httpError } from './http.js';

export const ADMIN_COOKIE = 'bfmh_admin';
export const FAMILY_COOKIE = 'bfmh_family';
const ADMIN_TTL = 60 * 60 * 24 * 30; // 30 days

function secret() {
  const s = process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD;
  if (!s) throw new Error('SESSION_SECRET / ADMIN_PASSWORD not set');
  return s;
}

function sign(payload) {
  return crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
}

export function safeEqual(a, b) {
  const ba = Buffer.from(String(a)); const bb = Buffer.from(String(b));
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

export function checkAdminPassword(password) {
  const expected = process.env.ADMIN_PASSWORD;
  return Boolean(expected) && Boolean(password) && safeEqual(password, expected);
}

export function makeAdminToken() {
  const exp = Math.floor(Date.now() / 1000) + ADMIN_TTL;
  const payload = `admin.${exp}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyAdminToken(token) {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const payload = `${parts[0]}.${parts[1]}`;
  if (!safeEqual(sign(payload), parts[2])) return false;
  return parseInt(parts[1], 10) > Math.floor(Date.now() / 1000);
}

export function newFamilyToken() {
  return crypto.randomBytes(18).toString('base64url');
}

export async function whoami(req) {
  const c = parseCookies(req);
  if (verifyAdminToken(c[ADMIN_COOKIE])) return { role: 'admin' };
  if (c[FAMILY_COOKIE]) {
    const family = await one('SELECT id, name, email, phone FROM families WHERE access_token = $1', [c[FAMILY_COOKIE]]);
    if (family) {
      const dancers = await sql('SELECT id, name FROM dancers WHERE family_id = $1 AND active ORDER BY name', [family.id]);
      return { role: 'member', family, dancers };
    }
  }
  return { role: 'anon' };
}

export async function requireAdmin(req) {
  const me = await whoami(req);
  if (me.role !== 'admin') throw httpError(401, 'Owner login required');
  return me;
}

export async function requireUser(req) {
  const me = await whoami(req);
  if (me.role === 'anon') throw httpError(401, 'Sign in required');
  return me;
}
