// Group events (status 'gathering'): never a gig, so never in GroupMe asks, calendar feeds or bfmh.dance.

import crypto from 'node:crypto';
import { sql, one, withSource } from './db.js';
import { httpError, str, int } from './http.js';
import { withCalendarLinks } from './events.js';
import { actorOf } from './auth.js';

export const KINDS = ['potluck', 'posada', 'party', 'practice', 'meeting', 'outing', 'fundraiser', 'other'];
export const CATEGORIES = ['mains', 'sides', 'desserts', 'drinks', 'supplies', 'other'];
const ANSWERS = ['yes', 'maybe', 'no'];
const MAX_RSVPS = 400;
const MAX_ITEMS = 150;
const MAX_PARTY = 30;
const MAX_WRITE_INS_PER_MINUTE = 20;
const TODAY = `(now() AT TIME ZONE 'America/Los_Angeles')::date`;

const COLS = `id, title, status, event_type, event_date, start_time, end_time, venue, address, city, details, potluck,
  event_date < ${TODAY} AS past,
  (SELECT count(*) FROM media m WHERE m.event_id = events.id AND m.ready AND m.kind <> 'audio')::int AS media_count`;

export const hashKey = (key) => crypto.createHash('sha256').update(String(key)).digest('hex');
export const newGuestKey = () => crypto.randomBytes(18).toString('base64url');

export function cleanRsvp(b, { guest }) {
  const status = ANSWERS.includes(b.status) ? b.status : null;
  if (!status) throw httpError(400, 'Pick going, maybe or can’t go');
  const name = str(b.name, 80);
  if (guest && !name) throw httpError(400, 'Write your name so the hosts know who’s coming');
  const count = (v, dflt) => { const n = int(v); return n == null ? dflt : Math.max(0, Math.min(MAX_PARTY, n)); };
  let adults = count(b.adults, 1), kids = count(b.kids, 0);
  if (status === 'no') { adults = 0; kids = 0; } else if (adults + kids === 0) adults = 1;
  return { status, name, adults, kids, note: str(b.note, 300) };
}

export function cleanItem(b) {
  const label = str(b.label, 80);
  if (!label) throw httpError(400, 'Say what it is');
  const category = CATEGORIES.includes(b.category) ? b.category : 'other';
  const slots = Math.max(1, Math.min(20, int(b.slots) || 1));
  return { label, category, slots, note: str(b.note, 120) };
}

export function familyTally(answers, extra = 0) {
  const yes = answers.filter((s) => s === 'yes').length, maybe = answers.filter((s) => s === 'maybe').length;
  const status = yes ? 'yes' : maybe ? 'maybe' : 'no';
  return { status, adults: status === 'no' ? 0 : extra, kids: status === 'yes' ? yes : status === 'maybe' ? maybe : 0 };
}

export const flyerOf = (ev) => (ev.flyer_key && storageReady() ? { url: signedUrl('GET', ev.flyer_key), w: ev.flyer_w, h: ev.flyer_h } : null);

async function gathering(id) {
  const ev = await one(`SELECT ${COLS} FROM events WHERE id = $1 AND status = 'gathering'`, [id]);
  if (!ev) throw httpError(404, 'This event isn’t here anymore');
  return ev;
}

export function viewerOf(me, { id, sig, verify, guestKey, asGuest }) {
  if (me.role === 'anon' && !verify(id, sig)) throw httpError(403, 'That invite link is not valid');
  const owner = me.role === 'admin';
  const family = !asGuest && me.family ? me.family : null;
  return { owner, member: me.role !== 'anon', family, sessionFamily: me.family ? me.family.name : null, actor: me.role === 'anon' ? null : actorOf(me),
    keyHash: !family && guestKey ? hashKey(guestKey) : null };
}

async function myRsvp(eventId, v, q = sql) {
  if (v.family) return (await q('SELECT * FROM gathering_rsvps WHERE event_id = $1 AND family_id = $2', [eventId, v.family.id]))[0] || null;
  if (v.keyHash) return (await q('SELECT * FROM gathering_rsvps WHERE event_id = $1 AND key_hash = $2', [eventId, v.keyHash]))[0] || null;
  return null;
}

export async function loadParty(id, v) {
  const ev = await gathering(id);
  const [rsvps, items, claims, mine, members, dancers] = await Promise.all([
    sql(`SELECT id, family_id, name, status, adults, kids, extra, note, updated_at FROM gathering_rsvps WHERE event_id = $1
          ORDER BY CASE status WHEN 'yes' THEN 0 WHEN 'maybe' THEN 1 ELSE 2 END, lower(name), id`, [id]),
    sql('SELECT id, label, category, slots, rsvp_id FROM gathering_items WHERE event_id = $1 ORDER BY id', [id]),
    sql(`SELECT c.item_id, c.rsvp_id, c.note FROM gathering_claims c JOIN gathering_items i ON i.id = c.item_id
          WHERE i.event_id = $1 ORDER BY c.created_at`, [id]),
    myRsvp(id, v),
    sql(`SELECT m.rsvp_id, m.dancer_id, split_part(d.name, ' ', 1) AS name, m.status FROM gathering_members m
          JOIN gathering_rsvps r ON r.id = m.rsvp_id JOIN dancers d ON d.id = m.dancer_id AND d.active
          WHERE r.event_id = $1 ORDER BY d.name`, [id]),
    v.family ? sql('SELECT id, name FROM dancers WHERE family_id = $1 AND active ORDER BY name', [v.family.id]) : [],
  ]);
  const myId = mine && mine.id;
  const { past, flyer_key, flyer_w, flyer_h, ...event } = ev;
  const mineAnswers = members.filter((m) => m.rsvp_id === myId);
  // Dancers' names stay off the public invite link, which travels beyond the team; who said no is for the hosts.
  const membersOf = (r) => (v.member || r.id === myId ? members.filter((m) => m.rsvp_id === r.id && (v.owner || r.id === myId || m.status !== 'no'))
    .map((m) => ({ name: m.name, status: m.status })) : []);
  return {
    event: withCalendarLinks(event),
    past,
    // Notes and who said no are for the hosts; guests get only the count.
    declined: rsvps.filter((r) => r.status === 'no').length,
    rsvps: rsvps.filter((r) => r.status !== 'no' || v.owner || r.id === myId).map((r) => ({ id: r.id, name: r.name, family: Boolean(r.family_id), status: r.status, adults: r.adults, kids: r.kids,
      mine: r.id === myId, note: v.owner || r.id === myId ? r.note : undefined, members: r.family_id ? membersOf(r) : [], extra: r.family_id ? r.extra : 0 })),
    items: items.map((i) => ({ id: i.id, label: i.label, category: i.category, slots: i.slots, by: i.rsvp_id, mine: Boolean(myId) && i.rsvp_id === myId,
      claims: claims.filter((c) => c.item_id === i.id).map((c) => ({ rsvp_id: c.rsvp_id, note: c.note, mine: c.rsvp_id === myId })) })),
    me: { as: v.family ? 'family' : 'guest', family_name: v.family ? v.family.name : null, session_family: v.family ? null : v.sessionFamily,
      rsvp_id: myId || null, owner: v.owner, member: v.member,
      dancers: dancers.map((d) => ({ id: d.id, name: d.name, status: (mineAnswers.find((m) => m.dancer_id === d.id) || {}).status || null })) },
  };
}

const coming = (r) => r && (r.status === 'yes' || r.status === 'maybe');

export async function partyAction(id, v, b) {
  const ev = await gathering(id);
  if (ev.past && !v.owner) throw httpError(403, 'This event already happened');
  const action = String(b.action || '');
  const tag = { source: v.owner ? 'owner' : v.family ? 'family' : 'guest', actor: v.actor };

  return withSource(tag, async (q) => {
    const mine = await myRsvp(id, v, q);
    const requireOwner = () => { if (!v.owner) throw httpError(403, 'Only Mayra and Angel can do that'); };
    const requireComing = () => { if (!coming(mine)) throw httpError(409, 'RSVP first, so everyone knows who’s bringing it'); };
    const dropBringing = async (rsvpId) => {
      await q('DELETE FROM gathering_claims WHERE rsvp_id = $1', [rsvpId]);
      await q('DELETE FROM gathering_items WHERE rsvp_id = $1', [rsvpId]);
    };

    if (action === 'rsvp') {
      const r = cleanRsvp(b, { guest: !v.family });
      const name = v.family ? v.family.name : r.name;
      let key = null, rsvpId;
      if (mine) {
        await q(`UPDATE gathering_rsvps SET name = $2, status = $3, adults = $4, kids = $5, note = $6, updated_at = now() WHERE id = $1`,
          [mine.id, name, r.status, r.adults, r.kids, r.note]);
        rsvpId = mine.id;
      } else {
        const [{ n }] = await q('SELECT count(*)::int AS n FROM gathering_rsvps WHERE event_id = $1', [id]);
        if (n >= MAX_RSVPS) throw httpError(409, 'The guest list is full');
        if (!v.family) {
          const [{ recent }] = await q(`SELECT count(*)::int AS recent FROM gathering_rsvps
            WHERE event_id = $1 AND key_hash IS NOT NULL AND created_at > now() - interval '1 minute'`, [id]);
          if (recent >= MAX_WRITE_INS_PER_MINUTE) throw httpError(429, 'Lots of RSVPs at once — try again in a minute');
          key = newGuestKey();
        }
        // Two phones of one family can send their first answer at once.
        const rows = await q(`INSERT INTO gathering_rsvps (event_id, family_id, name, status, adults, kids, note, key_hash)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (event_id, family_id) WHERE family_id IS NOT NULL
          DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status, adults = EXCLUDED.adults, kids = EXCLUDED.kids,
            note = EXCLUDED.note, updated_at = now() RETURNING id`,
          [id, v.family ? v.family.id : null, name, r.status, r.adults, r.kids, r.note, key ? hashKey(key) : null]);
        rsvpId = rows[0].id;
      }
      if (r.status === 'no') await dropBringing(rsvpId);
      return { key };
    }
    const retally = async (rsvpId, extra) => {
      const now = await q(`SELECT m.status FROM gathering_members m JOIN dancers d ON d.id = m.dancer_id AND d.active WHERE m.rsvp_id = $1`, [rsvpId]);
      const tally = familyTally(now.map((m) => m.status), extra);
      await q('UPDATE gathering_rsvps SET name = $2, status = $3, adults = $4, kids = $5, extra = $6, updated_at = now() WHERE id = $1',
        [rsvpId, v.family.name, tally.status, tally.adults, tally.kids, extra]);
      if (tally.status === 'no') await dropBringing(rsvpId);
    };
    if (action === 'extra') {
      if (!v.family || !mine) throw httpError(409, 'Answer for your dancers first');
      await retally(mine.id, Math.max(0, Math.min(MAX_PARTY, int(b.extra) || 0)));
      return {};
    }
    if (action === 'members') {
      if (!v.family) throw httpError(403, 'Only a team family answers dancer by dancer');
      const own = await q('SELECT id FROM dancers WHERE family_id = $1 AND active', [v.family.id]);
      const ids = new Set(own.map((d) => d.id));
      const answers = Object.entries(b.answers || {}).map(([d, st]) => [int(d), st]).filter(([d, st]) => ids.has(d) && ANSWERS.includes(st));
      if (!answers.length) throw httpError(400, 'Pick going, maybe or can’t go');
      let rsvpId = mine && mine.id;
      if (!rsvpId) {
        const [{ n }] = await q('SELECT count(*)::int AS n FROM gathering_rsvps WHERE event_id = $1', [id]);
        if (n >= MAX_RSVPS) throw httpError(409, 'The guest list is full');
        const rows = await q(`INSERT INTO gathering_rsvps (event_id, family_id, name, status, adults, kids) VALUES ($1, $2, $3, 'maybe', 0, 0)
          ON CONFLICT (event_id, family_id) WHERE family_id IS NOT NULL DO UPDATE SET updated_at = now() RETURNING id`, [id, v.family.id, v.family.name]);
        rsvpId = rows[0].id;
      }
      await q(`INSERT INTO gathering_members (rsvp_id, dancer_id, status) SELECT $1, d, s FROM unnest($2::int[], $3::text[]) AS a(d, s)
        ON CONFLICT (rsvp_id, dancer_id) DO UPDATE SET status = EXCLUDED.status, updated_at = now()`,
        [rsvpId, answers.map((a) => a[0]), answers.map((a) => a[1])]);
      await retally(rsvpId, mine ? mine.extra || 0 : 0);
      return {};
    }
    if (action === 'note') {
      if (!mine) throw httpError(409, 'RSVP first');
      await q('UPDATE gathering_rsvps SET note = $2, updated_at = now() WHERE id = $1', [mine.id, str(b.note, 300)]);
      return {};
    }
    if (action === 'leave') {
      if (mine) await q('DELETE FROM gathering_rsvps WHERE id = $1', [mine.id]);
      return {};
    }
    if (action === 'claim') {
      requireComing();
      const item = (await q('SELECT * FROM gathering_items WHERE id = $1 AND event_id = $2 FOR UPDATE', [int(b.item), id]))[0];
      if (!item || item.rsvp_id) throw httpError(404, 'That item isn’t on the list anymore');
      const taken = await q('SELECT rsvp_id FROM gathering_claims WHERE item_id = $1', [item.id]);
      if (!taken.some((c) => c.rsvp_id === mine.id) && taken.length >= item.slots) throw httpError(409, 'Someone just took that one — pick another');
      await q(`INSERT INTO gathering_claims (item_id, rsvp_id, note) VALUES ($1, $2, $3)
               ON CONFLICT (item_id, rsvp_id) DO UPDATE SET note = EXCLUDED.note`, [item.id, mine.id, str(b.note, 120)]);
      return {};
    }
    if (action === 'unclaim') {
      const who = v.owner && b.rsvp ? int(b.rsvp) : mine && mine.id;
      if (!who) throw httpError(409, 'Nothing to undo');
      await q(`DELETE FROM gathering_claims c USING gathering_items i
                WHERE c.item_id = i.id AND i.event_id = $1 AND c.item_id = $2 AND c.rsvp_id = $3`, [id, int(b.item), who]);
      return {};
    }
    if (action === 'bring' || action === 'need') {
      if (action === 'bring') requireComing(); else requireOwner();
      const it = cleanItem(b);
      const [{ n }] = await q('SELECT count(*)::int AS n FROM gathering_items WHERE event_id = $1', [id]);
      if (n >= MAX_ITEMS) throw httpError(409, 'The potluck list is full');
      await q('INSERT INTO gathering_items (event_id, label, category, slots, rsvp_id) VALUES ($1, $2, $3, $4, $5)',
        [id, it.label, it.category, action === 'need' ? it.slots : 1, action === 'bring' ? mine.id : null]);
      if (action === 'need' && !ev.potluck) await q('UPDATE events SET potluck = true, updated_at = now() WHERE id = $1', [id]);
      return {};
    }
    if (action === 'drop') {
      const item = (await q('SELECT * FROM gathering_items WHERE id = $1 AND event_id = $2', [int(b.item), id]))[0];
      if (!item) return {};
      if (!v.owner && !(mine && item.rsvp_id === mine.id)) throw httpError(403, 'Only whoever added it can take it off');
      await q('DELETE FROM gathering_items WHERE id = $1', [item.id]);
      return {};
    }
    if (action === 'remove') {
      requireOwner();
      await q('DELETE FROM gathering_rsvps WHERE id = $1 AND event_id = $2', [int(b.rsvp), id]);
      return {};
    }
    throw httpError(400, 'Unknown action');
  });
}

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function longDate(d) {
  if (!d) return '';
  return new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

export function inviteHtml(ev, { id, sig, origin }) {
  const title = ev ? `${ev.title} · ${longDate(ev.event_date)}`.replace(/ · $/, '') : 'Ballet Folklórico Mi Herencia';
  const desc = ev ? (ev.details ? ev.details.replace(/\s+/g, ' ').slice(0, 180) : 'You’re invited! RSVP and see who’s coming. · ¡Estás invitado! Confirma tu asistencia.')
    : 'This invite link is not valid.';
  const data = ev ? ` data-party="${esc(id)}" data-s="${esc(sig)}"` : ' data-party-invalid="1"';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="theme-color" content="#0c0514" />
  <meta name="robots" content="noindex, nofollow" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Ballet Folklórico Mi Herencia" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(desc)}" />
  <meta property="og:image" content="${esc(origin)}/og-image.jpg?v=6" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <link rel="icon" href="/favicon.ico" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,400;1,500&family=Montserrat:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/team/team.css" />
  <link rel="stylesheet" href="/team/party.css" />
</head>
<body class="party-standalone">
  <header class="tm-header">
    <a class="tm-brand" href="/" aria-label="Ballet Folklórico Mi Herencia">
      <img class="tm-logo" src="/images/optimized/logo-dancers-color.webp" alt="" />
      <span class="tm-wordmark notranslate" translate="no">
        <span class="tm-wm-1">Ballet Folklórico</span>
        <span class="tm-wm-2">Mi Herencia</span>
        <span class="tm-wm-short">BFMH</span>
      </span>
    </a>
    <div class="tm-header-right" id="header-right"></div>
  </header>
  <main class="tm-main party-main" id="app"${data}></main>
  <div id="toast" class="tm-toast" role="status" hidden></div>
  <script src="/team/party.js"></script>
</body>
</html>`;
}
