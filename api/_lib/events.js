import { sql, one, getPool, ensureSchema } from './db.js';
import { httpError } from './http.js';
import { googleEventUrl, outlookEventUrl, googleDayUrl, outlookDayUrl, galleryOpen } from './ics.js';

export const STATUSES = ['inquiry', 'open', 'confirmed', 'done', 'declined', 'cancelled', 'lapsed'];
const LAPSE_AFTER_DAYS = 14;
export const MEMBER_VISIBLE = ['open', 'confirmed', 'done'];
// A folder is a gallery-only event: never in Gigs, calendars or GroupMe.
export const GALLERY_VISIBLE = [...MEMBER_VISIBLE, 'folder'];

const ADMIN_COLS = `e.*`;
// Pay is deliberately absent from MEMBER_COLS: what a gig pays is the owners' business.
const MEMBER_COLS = `e.id, e.title, e.status, e.event_type, e.event_date, e.start_time, e.end_time, e.call_time,
  e.venue, e.address, e.city, e.dancers_needed, e.details, e.rehearsals, e.published_at, e.confirmed_at, e.updated_at, e.website`;

const AVAIL_JSON = `
  COALESCE((SELECT json_agg(json_build_object(
      'dancer_id', a.dancer_id, 'dancer_name', d.name, 'family_id', d.family_id, 'family_name', f.name,
      'status', a.status, 'note', a.note, 'updated_at', a.updated_at) ORDER BY d.name)
    FROM availability a JOIN dancers d ON d.id = a.dancer_id JOIN families f ON f.id = d.family_id
    WHERE a.event_id = e.id), '[]'::json) AS availability,
  (SELECT count(*) FROM media m WHERE m.event_id = e.id AND m.ready AND m.kind <> 'audio')::int AS media_count`;

export async function listEvents({ admin, includePast = false }) {
  if (admin) await lapseStaleInquiries();
  const where = admin
    ? (includePast ? `e.status <> 'folder'` : `(e.status IN ('inquiry','open','confirmed') OR (e.status <> 'folder' AND e.updated_at > now() - interval '60 days'))`)
    : `e.status = ANY($1) AND (e.event_date IS NULL OR e.event_date >= current_date - 14)`;
  const params = admin ? [] : [MEMBER_VISIBLE];
  const rows = await sql(
    `SELECT ${admin ? ADMIN_COLS : MEMBER_COLS}, ${AVAIL_JSON}
       FROM events e WHERE ${where}
       ORDER BY CASE e.status WHEN 'inquiry' THEN 0 WHEN 'open' THEN 1 WHEN 'confirmed' THEN 1 ELSE 2 END,
                e.event_date NULLS LAST, e.id DESC`, params);
  return rows.map(withCalendarLinks);
}

// The updated_at guard spares inquiries reopened or edited after the lapse point.
export async function lapseStaleInquiries() {
  await sql(`UPDATE events SET status = 'lapsed', updated_at = now()
              WHERE status = 'inquiry' AND event_date IS NOT NULL AND event_date < current_date - $1::int
                AND updated_at < event_date + $1::int`, [LAPSE_AFTER_DAYS]);
}

export async function getEvent(id, { admin }) {
  const ev = await one(`SELECT ${admin ? ADMIN_COLS : MEMBER_COLS}, ${AVAIL_JSON} FROM events e WHERE e.id = $1`, [id]);
  return ev && withCalendarLinks(ev);
}

// Direct "new event" links for Google and Outlook. The phone opens these as plain cross-origin
// links, so they work with no cookie and no redirect — the installed app and in-app browsers
// (GroupMe, Safari's sheet) don't reliably carry the sign-in through /api/calendar.
export function withCalendarLinks(ev) {
  if (!ev) return ev;
  if (!ev.event_date) return { ...ev, gallery_open: false };
  return { ...ev, gallery_open: galleryOpen(ev), calendar: { google: googleEventUrl(ev), outlook: outlookEventUrl(ev), google_day: googleDayUrl(ev), outlook_day: outlookDayUrl(ev) } };
}

export const EDITABLE = ['title', 'event_type', 'event_date', 'date_text', 'start_time', 'end_time', 'call_time', 'venue',
  'address', 'city', 'client_name', 'client_email', 'client_phone', 'message', 'dancers_needed', 'pay', 'notes',
  'details', 'rehearsals'];

export async function updateEvent(id, patch) {
  const sets = []; const params = [id];
  for (const [k, v] of Object.entries(patch)) {
    params.push(v); sets.push(`${k} = $${params.length}`);
  }
  sets.push('updated_at = now()');
  return one(`UPDATE events SET ${sets.join(', ')} WHERE id = $1 RETURNING id`, params);
}

export const MERGEABLE = ['inquiry', 'lapsed', 'declined'];
export const MERGE_TARGETS = ['open', 'confirmed', 'done', 'cancelled'];
const FILL = ['client_name', 'client_email', 'client_phone', 'message', 'event_type', 'event_date', 'date_text', 'venue', 'address', 'city', 'raw'];

// An owner answered the inquiry by email and made the gig by hand, so the two rows tell one story.
export async function mergeInquiry(fromId, intoId) {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query('SELECT * FROM events WHERE id = ANY($1) ORDER BY id FOR UPDATE', [[fromId, intoId]]);
    const from = rows.find((r) => r.id === fromId);
    const into = rows.find((r) => r.id === intoId);
    if (!from || !into) throw httpError(404, 'Not found');
    if (!MERGEABLE.includes(from.status)) throw httpError(400, `Cannot merge an event that is ${from.status}`);
    if (fromId === intoId || !MERGE_TARGETS.includes(into.status)) throw httpError(400, 'Pick a gig to merge into');
    // COALESCE drops a differing client; the notes keep it.
    const kept = ['client_name', 'client_email', 'client_phone', 'message']
      .filter((c) => from[c] && into[c] && from[c] !== into[c]).map((c) => from[c]);
    const merged = kept.length ? `From merged inquiry “${from.title}”:\n${kept.join('\n')}` : null;
    const notes = [...new Set([into.notes, from.notes, merged].filter(Boolean))].join('\n') || null;
    const params = [intoId, notes, from.created_at, from.source, from.source_ref];
    const fill = FILL.map((c) => { params.push(c === 'raw' && from.raw ? JSON.stringify(from.raw) : c === 'event_type' && from[c] === 'other' ? null : from[c]); return `${c} = COALESCE(${c}, $${params.length})`; });
    await client.query(
      `UPDATE events SET ${fill.join(', ')}, notes = $2, created_at = LEAST(created_at, $3),
              source = CASE WHEN source = 'manual' THEN $4 ELSE source END, source_ref = COALESCE(source_ref, $5), updated_at = now()
        WHERE id = $1`, params);
    await client.query(`INSERT INTO availability (event_id, dancer_id, status, note, self, updated_at)
                        SELECT $2, dancer_id, status, note, self, updated_at FROM availability WHERE event_id = $1
                        ON CONFLICT DO NOTHING`, [fromId, intoId]);
    await client.query(`INSERT INTO event_songs (event_id, media_id, position)
                        SELECT $2, media_id, position FROM event_songs WHERE event_id = $1
                        ON CONFLICT DO NOTHING`, [fromId, intoId]);
    await client.query('UPDATE media SET event_id = $2 WHERE event_id = $1', [fromId, intoId]);
    await client.query('UPDATE groupme_messages SET event_id = $2 WHERE event_id = $1', [fromId, intoId]);
    await client.query('DELETE FROM events WHERE id = $1', [fromId]);
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

export async function rosterFor(eventId) {
  const families = await sql(
    `SELECT f.id, f.name,
            COALESCE(json_agg(json_build_object('id', d.id, 'name', d.name, 'status', a.status) ORDER BY d.name)
                     FILTER (WHERE d.id IS NOT NULL), '[]'::json) AS dancers
       FROM families f
       LEFT JOIN dancers d ON d.family_id = f.id AND d.active
       LEFT JOIN availability a ON a.dancer_id = d.id AND a.event_id = $1
      GROUP BY f.id ORDER BY f.name`, [eventId]);
  return families;
}
