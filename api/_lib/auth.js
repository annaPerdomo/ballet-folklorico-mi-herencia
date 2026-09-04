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

// Calendar links are posted in GroupMe, so they carry no cookie and must not be guessable by
// walking event ids. Signed, not secret: anyone with the link sees that one gig's details.
export function calendarSig(eventId) {
  return sign(`cal.${eventId}`).slice(0, 16);
}

export function verifyCalendarSig(eventId, sig) {
  return Boolean(sig) && safeEqual(calendarSig(eventId), sig);
}

// Given instead of the family's access_token so a picker session is not itself a forwardable
// login. No expiry — a phone stays signed in until someone signs out, or until the owners tap
// "New link", which rotates the access_token this epoch is taken from.
const epochOf = (accessToken) => String(accessToken || '').slice(0, 8) || 'none';

export function memberToken(familyId, accessToken, scope = 'pick') {
  const payload = `${scope}.${familyId}.${epochOf(accessToken)}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyMemberToken(token) {
  const p = String(token || '').split('.');
  if (p.length !== 4) return null;
  const [scope, id, epoch, sig] = p;
  if (scope !== 'pick' && scope !== 'fam') return null;
  if (!safeEqual(sign(`${scope}.${id}.${epoch}`), sig)) return null;
  const familyId = parseInt(id, 10);
  return familyId ? { familyId, scope, epoch } : null;
}

// A subscription URL is fetched cookie-less and lives on in Google's servers and in access logs,
// so its key only ever opens the feed. Rotates with the family's invite link.
export function feedSig(familyId, accessToken) {
  return sign(`feed.${familyId}.${epochOf(accessToken)}`).slice(0, 20);
}

export function verifyFeedSig(familyId, accessToken, sig) {
  return Boolean(sig) && safeEqual(feedSig(familyId, accessToken), sig);
}

async function asMember(family, scope) {
  if (!family) return null;
  const dancers = await sql('SELECT id, name FROM dancers WHERE family_id = $1 AND active ORDER BY name', [family.id]);
  return { role: 'member', scope, family: { id: family.id, name: family.name }, dancers };
}

export async function whoami(req) {
  const c = parseCookies(req);
  if (verifyAdminToken(c[ADMIN_COOKIE])) return { role: 'admin', scope: 'admin' };
  const raw = c[FAMILY_COOKIE];
  if (raw) {
    const claim = verifyMemberToken(raw);
    if (claim) {
      const family = await one('SELECT id, name, access_token FROM families WHERE id = $1', [claim.familyId]);
      if (family && epochOf(family.access_token) === claim.epoch) {
        const me = await asMember(family, claim.scope);
        if (me) return me;
      }
      return { role: 'anon' };
    }
    const family = await one('SELECT id, name FROM families WHERE access_token = $1', [raw]);
    const me = await asMember(family, 'fam');
    if (me) return me;
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

// A picker session comes off a link anyone in the GroupMe chat can hold: it may answer for a
// family, never reshape one. Editing dancers needs the family's own invite link, or the owners.
export async function requireManage(req) {
  const me = await requireUser(req);
  if (me.scope === 'pick') throw httpError(403, 'Open your family’s own link to change this');
  return me;
}
