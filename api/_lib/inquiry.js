import { one, sql } from './db.js';
import { str } from './http.js';

const TYPE_TITLES = {
  festival: 'Cultural Festival', quinceanera: 'Quinceañera', wedding: 'Wedding', private: 'Private Event',
  corporate: 'Corporate Event', school: 'School Assembly', classes: 'Classes', other: 'Inquiry',
};

export function normalizeInquiry(f = {}) {
  const type = str(f.subject || f.event_type, 40)?.toLowerCase() || null;
  const dateText = str(f.event_date_city || f.date_text, 200);
  let eventDate = str(f.event_date, 20);
  if (eventDate && !/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) eventDate = null;
  const name = str(f.name, 120);
  return {
    title: [TYPE_TITLES[type] || 'Inquiry', name ? `for ${name}` : null].filter(Boolean).join(' '),
    event_type: type,
    event_date: eventDate,
    date_text: dateText,
    city: str(f.city, 120),
    client_name: name,
    client_email: str(f.email, 200)?.toLowerCase() || null,
    client_phone: str(f.phone, 40),
    message: str(f.message, 4000),
    source_page: str(f.page || f._page, 200),
  };
}

// The site posts directly and Formspree may webhook the same submission, so dedupe within 10 minutes.
export async function recordInquiry(fields, { source, sourceRef, raw }) {
  const n = normalizeInquiry(fields);
  if (!n.client_email && !n.client_name) return { skipped: 'empty' };
  if (sourceRef) {
    const dupRef = await one('SELECT id FROM events WHERE source_ref = $1', [sourceRef]);
    if (dupRef) return { id: dupRef.id, skipped: 'duplicate' };
  }
  const dup = await one(
    `SELECT id FROM events WHERE client_email IS NOT DISTINCT FROM $1 AND message IS NOT DISTINCT FROM $2
       AND created_at > now() - interval '10 minutes' ORDER BY id DESC LIMIT 1`,
    [n.client_email, n.message]);
  if (dup) {
    if (sourceRef) await sql('UPDATE events SET source_ref = COALESCE(source_ref, $2) WHERE id = $1', [dup.id, sourceRef]);
    return { id: dup.id, skipped: 'duplicate' };
  }
  const row = await one(
    `INSERT INTO events (title, status, event_type, event_date, date_text, city, client_name, client_email, client_phone,
                         message, source, source_ref, raw, notes)
     VALUES ($1,'inquiry',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
    [n.title, n.event_type, n.event_date, n.date_text, n.city, n.client_name, n.client_email, n.client_phone,
     n.message, source, sourceRef || null, raw ? (JSON.stringify(raw).length <= 10000 ? JSON.stringify(raw) : JSON.stringify({ truncated: true })) : null,
     n.source_page ? `Submitted from ${n.source_page}` : null]);
  return { id: row.id };
}
