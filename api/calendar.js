import { route, query, int, str, httpError } from './_lib/http.js';
import { whoami, verifyCalendarSig, verifyFeedSig, verifyAdminFeedSig } from './_lib/auth.js';
import { one, sql } from './_lib/db.js';
import { buildCalendar, googleEventUrl, outlookEventUrl } from './_lib/ics.js';
import { MEMBER_VISIBLE } from './_lib/events.js';

const COLS = `id, title, status, event_type, event_date, start_time, end_time, call_time,
  venue, address, city, dancers_needed, details, rehearsals, updated_at`;
// Only the owners' own feed carries the pay line into the calendar entry.
const cols = (admin) => (admin ? COLS + ', pay' : COLS);

// Calendar apps fetch a subscription URL with no cookies, so ?f=&k= carries a feed-only signature
// (see feedSig) — a leaked subscription URL exposes the family's gigs, never their sign-in.
async function viewer(req) {
  const q = query(req);
  const adminKey = str(q.a, 40);
  if (adminKey) {
    if (!verifyAdminFeedSig(adminKey)) throw httpError(404, 'That calendar link is no longer valid');
    return { role: 'admin', scope: 'admin' };
  }
  const famId = int(q.f);
  const k = str(q.k, 40);
  if (famId || k) {
    const family = famId && await one('SELECT id, name, access_token FROM families WHERE id = $1', [famId]);
    if (!family || !verifyFeedSig(family.id, family.access_token, k)) {
      throw httpError(404, 'That calendar link is no longer valid');
    }
    return { role: 'member', family: { id: family.id, name: family.name } };
  }
  const me = await whoami(req);
  if (me.role === 'anon') throw httpError(401, 'Sign in required');
  return me;
}

function icsName(ev) {
  const slug = String(ev.title || 'gig').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  return `${slug || 'gig'}.ics`;
}

function sendEvent(res, ev, to) {
  const url = to === 'google' ? googleEventUrl(ev) : to === 'outlook' ? outlookEventUrl(ev) : null;
  if (url) {
    res.statusCode = 302;
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Location', url);
    return res.end();
  }
  return sendIcs(res, buildCalendar([ev], { name: ev.title || 'Performance' }), icsName(ev));
}

function sendIcs(res, body, filename) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Disposition', `${filename ? 'attachment' : 'inline'}${filename ? `; filename="${filename}"` : ''}`);
  res.end(body);
}

export default route({
  async GET(req, res) {
    const q = query(req);

    const signedId = int(q.e);
    if (signedId && verifyCalendarSig(signedId, str(q.s, 32))) {
      const ev = await one(`SELECT ${cols(false)} FROM events WHERE id = $1`, [signedId]);
      if (!ev || !MEMBER_VISIBLE.includes(ev.status)) throw httpError(404, 'Not found');
      if (!ev.event_date) throw httpError(400, 'This gig has no date yet');
      return sendEvent(res, ev, str(q.to, 10));
    }
    if (q.e) throw httpError(403, 'That calendar link is not valid');

    const me = await viewer(req);
    const admin = me.role === 'admin';
    const id = int(q.event);

    if (id) {
      const ev = await one(`SELECT ${cols(admin)} FROM events WHERE id = $1`, [id]);
      if (!ev) throw httpError(404, 'Not found');
      if (!admin && !MEMBER_VISIBLE.includes(ev.status)) throw httpError(404, 'Not found');
      if (!ev.event_date) throw httpError(400, 'This gig has no date yet');
      return sendEvent(res, ev, str(q.to, 10));
    }

    const events = admin
      ? await sql(`SELECT ${cols(true)} FROM events WHERE status IN ('open','confirmed','done')
                     AND event_date IS NOT NULL AND event_date >= current_date - 120 ORDER BY event_date`)
      // Drops only when every active dancer in the household answered 'no'. One sibling's 'no', or
      // silence, is not enough: an unanswered gig is exactly what the subscription is for.
      : await sql(`SELECT ${cols(false)} FROM events e WHERE status = ANY($1)
                     AND event_date IS NOT NULL AND event_date >= current_date - 120
                     AND NOT (EXISTS (SELECT 1 FROM dancers d WHERE d.family_id = $2 AND d.active)
                              AND NOT EXISTS (
                                SELECT 1 FROM dancers d
                                 WHERE d.family_id = $2 AND d.active
                                   AND NOT EXISTS (SELECT 1 FROM availability a
                                                    WHERE a.event_id = e.id AND a.dancer_id = d.id
                                                      AND a.status = 'no')))
                     ORDER BY event_date`, [MEMBER_VISIBLE, me.family.id]);

    const name = admin ? 'Mi Herencia · All gigs' : `Mi Herencia · ${me.family.name}`;
    sendIcs(res, buildCalendar(events, { name, feed: true }));
  },
});
