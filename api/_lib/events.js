import { sql, one } from './db.js';

export const STATUSES = ['inquiry', 'open', 'confirmed', 'done', 'declined', 'cancelled'];
export const MEMBER_VISIBLE = ['open', 'confirmed', 'done'];

const ADMIN_COLS = `e.*`;
// Pay is deliberately absent from MEMBER_COLS: what a gig pays is the owners' business.
const MEMBER_COLS = `e.id, e.title, e.status, e.event_type, e.event_date, e.start_time, e.end_time, e.call_time,
  e.venue, e.address, e.city, e.dancers_needed, e.details, e.rehearsals, e.published_at, e.confirmed_at, e.updated_at, e.website`;

const AVAIL_JSON = `
  COALESCE((SELECT json_agg(json_build_object(
      'dancer_id', a.dancer_id, 'dancer_name', d.name, 'family_id', d.family_id, 'family_name', f.name,
      'status', a.status, 'note', a.note, 'updated_at', a.updated_at) ORDER BY d.name)
    FROM availability a JOIN dancers d ON d.id = a.dancer_id JOIN families f ON f.id = d.family_id
    WHERE a.event_id = e.id), '[]'::json) AS availability`;

export async function listEvents({ admin, includePast = false }) {
  const where = admin
    ? (includePast ? 'TRUE' : `(e.status IN ('inquiry','open','confirmed') OR e.updated_at > now() - interval '60 days')`)
    : `e.status = ANY($1) AND (e.event_date IS NULL OR e.event_date >= current_date - 14)`;
  const params = admin ? [] : [MEMBER_VISIBLE];
  const rows = await sql(
    `SELECT ${admin ? ADMIN_COLS : MEMBER_COLS}, ${AVAIL_JSON}
       FROM events e WHERE ${where}
       ORDER BY CASE e.status WHEN 'inquiry' THEN 0 WHEN 'open' THEN 1 WHEN 'confirmed' THEN 1 ELSE 2 END,
                e.event_date NULLS LAST, e.id DESC`, params);
  return rows;
}

export async function getEvent(id, { admin }) {
  return one(`SELECT ${admin ? ADMIN_COLS : MEMBER_COLS}, ${AVAIL_JSON} FROM events e WHERE e.id = $1`, [id]);
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
