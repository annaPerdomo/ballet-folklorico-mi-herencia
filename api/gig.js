import { route, ok, query, int, str, httpError, readJson } from './_lib/http.js';
import { verifyCalendarSig, calendarSig, whoami } from './_lib/auth.js';
import { one, sql } from './_lib/db.js';
import { MEMBER_VISIBLE, withCalendarLinks } from './_lib/events.js';
import { viewerOf, loadParty, partyAction, inviteHtml, hashKey } from './_lib/gatherings.js';

const guestKey = (req) => str(req.headers['x-bfmh-guest'], 64);

async function partyViewer(req, id, sig, asGuest) {
  if (!id) throw httpError(400, 'Which event?');
  return viewerOf(await whoami(req), { id, sig, verify: verifyCalendarSig, guestKey: guestKey(req), asGuest });
}

async function partyPayload(id, v) {
  const party = await loadParty(id, v);
  return v.member ? { ...party, sig: calendarSig(id) } : party;
}

async function invitePage(req, res, q) {
  const id = int(q.invite);
  const sig = str(q.s, 32);
  const ok = Boolean(id) && verifyCalendarSig(id, sig);
  const ev = ok ? await one(`SELECT title, event_date, details FROM events WHERE id = $1 AND status = 'gathering'`, [id]) : null;
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'bfmh.dance';
  const proto = req.headers['x-forwarded-proto'] || (/^(localhost|127\.)/.test(host) ? 'http' : 'https');
  res.statusCode = ev ? 200 : 404;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(inviteHtml(ev, { id, sig, origin: `${proto}://${host}` }));
}

// Readable with no cookie, off a link that travels (forwards, screenshots), so it carries only
// enough to tell the families apart: first names, no surnames, no answers, no pay, no tokens.
const COLS = `id, title, status, event_type, event_date, start_time, end_time, call_time,
  venue, address, city, dancers_needed, details, rehearsals`;

export default route({
  async GET(req, res) {
    const q = query(req);
    if (q.invite !== undefined) return invitePage(req, res, q);
    if (q.party !== undefined) {
      const id = int(q.party);
      return ok(res, await partyPayload(id, await partyViewer(req, id, str(q.s, 32), q.guest === '1')));
    }
    const id = int(q.e);
    if (!id || !verifyCalendarSig(id, str(q.s, 32))) throw httpError(403, 'That link is not valid');

    const event = await one(`SELECT ${COLS} FROM events WHERE id = $1`, [id]);
    // The bot's "remove from my calendar" link points here after a cancel.
    if (!event || !(MEMBER_VISIBLE.includes(event.status) || event.status === 'cancelled')) throw httpError(404, 'Not found');

    const families = await sql(
      `SELECT f.id, f.name,
              COALESCE(json_agg(json_build_object('id', d.id, 'name', split_part(d.name, ' ', 1)) ORDER BY d.name)
                       FILTER (WHERE d.id IS NOT NULL), '[]'::json) AS dancers
         FROM families f
         LEFT JOIN dancers d ON d.family_id = f.id AND d.active
        GROUP BY f.id ORDER BY f.name`);

    ok(res, {
      event: withCalendarLinks(event),
      families: families.filter((f) => f.dancers.length),
      answering: ['open', 'confirmed'].includes(event.status),
    });
  },
  async POST(req, res) {
    const b = await readJson(req);
    const id = int(b.party);
    const v = await partyViewer(req, id, str(b.s, 32), b.guest === true);
    const { key } = await partyAction(id, v, b);
    const party = await partyPayload(id, key ? { ...v, keyHash: hashKey(key) } : v);
    ok(res, key ? { ...party, key } : party);
  },
});
