import { one, sql, withSource } from './db.js';
import { str, httpError } from './http.js';
import { parseDancers, createFamily } from './family.js';

export const STAGES = ['new', 'contacted', 'trying', 'joined', 'gone'];
export const READ_KINDS = ['inquiry', 'student'];

// The site's own POST and Formspree's webhook can land together; the lock keeps them to one lead.
export function recordStudentLead(n, { source, sourceRef = null, raw = null, at = null, ages = null }) {
  return withSource({ source: 'inquiry', actor: source }, async (q) => {
    await q('SELECT pg_advisory_xact_lock(hashtext($1))', [`student:${n.client_email || ''}:${n.message || ''}`]);
    if (sourceRef) {
      const [dupRef] = await q('SELECT id FROM student_leads WHERE source_ref = $1', [sourceRef]);
      if (dupRef) return { id: dupRef.id, student: true, skipped: 'duplicate' };
    }
    const [dup] = await q(
      `SELECT id FROM student_leads WHERE email IS NOT DISTINCT FROM $1 AND message IS NOT DISTINCT FROM $2
         AND abs(extract(epoch FROM created_at - COALESCE($3::timestamptz, now()))) < 600 ORDER BY id DESC LIMIT 1`,
      [n.client_email, n.message, at]);
    if (dup) {
      if (sourceRef) await q('UPDATE student_leads SET source_ref = COALESCE(source_ref, $2) WHERE id = $1', [dup.id, sourceRef]);
      return { id: dup.id, student: true, skipped: 'duplicate' };
    }
    const json = raw ? JSON.stringify(raw) : null;
    const [row] = await q(
      `INSERT INTO student_leads (name, email, phone, ages, message, source, source_ref, source_page, raw, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, COALESCE($10::timestamptz, now())) RETURNING id`,
      [n.client_name, n.client_email, n.client_phone, ages, n.message, source, sourceRef, n.source_page,
       json && json.length <= 10000 ? json : json ? JSON.stringify({ truncated: true }) : null, at]);
    return { id: row.id, student: true };
  });
}

export function listStudents() {
  return sql(`SELECT s.id, s.name, s.email, s.phone, s.ages, s.message, s.stage, s.notes, s.source, s.source_page,
                     s.family_id, f.name AS family_name, s.created_at, s.updated_at
                FROM student_leads s LEFT JOIN families f ON f.id = s.family_id
               ORDER BY s.created_at DESC, s.id DESC`);
}

export async function updateStudent(id, b) {
  const sets = []; const params = [id];
  const put = (col, v) => { params.push(v); sets.push(`${col} = $${params.length}`); };
  if ('stage' in b) {
    if (!STAGES.includes(b.stage) || b.stage === 'joined') throw httpError(400, 'Unknown stage');
    put('stage', b.stage);
  }
  for (const [k, max] of [['notes', 4000], ['name', 120], ['phone', 40], ['ages', 300]]) if (k in b) put(k, str(b[k], max));
  if ('email' in b) put('email', str(b.email, 200)?.toLowerCase() || null);
  if (!sets.length) throw httpError(400, 'Nothing to change');
  const row = await one(`UPDATE student_leads SET ${sets.join(', ')}, updated_at = now() WHERE id = $1 RETURNING id`, params);
  if (!row) throw httpError(404, 'Student not found');
}

export async function deleteStudent(id) {
  await sql("DELETE FROM inbox_reads WHERE kind = 'student' AND item_id = $1", [id]);
  const row = await one('DELETE FROM student_leads WHERE id = $1 RETURNING id', [id]);
  if (!row) throw httpError(404, 'Student not found');
}

const MOVABLE = ['inquiry', 'lapsed', 'declined', 'deleted'];

// The inquiry row is deleted, not soft-deleted: a deleted inquiry still counts in Insights, and a
// student is not a gig lead. events_history keeps the old row under source 'student'.
export async function moveInquiryToStudent(eventId, actor) {
  return withSource({ source: 'student', actor }, async (q) => {
    const [ev] = await q('SELECT * FROM events WHERE id = $1 FOR UPDATE', [eventId]);
    if (!ev) throw httpError(404, 'Inquiry not found');
    if (!MOVABLE.includes(ev.status)) throw httpError(409, 'Only an inquiry can move to Students');
    const raw = ev.raw || {};
    const ages = str(raw.dancers_ages || (raw.submission && raw.submission.dancers_ages), 300);
    const page = str(raw.page || raw._page, 200) || (String(ev.notes || '').match(/Submitted from (\S+)/) || [])[1] || null;
    const [row] = await q(
      `INSERT INTO student_leads (name, email, phone, ages, message, source, source_ref, source_page, raw, from_event_id, created_at, stage)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (from_event_id) WHERE from_event_id IS NOT NULL DO UPDATE SET updated_at = now() RETURNING id`,
      [ev.client_name, ev.client_email, ev.client_phone, ages, ev.message, ev.source, ev.source_ref, page,
       ev.raw ? JSON.stringify(ev.raw) : null, ev.id, ev.created_at, ev.status === 'declined' ? 'gone' : 'new']);
    await q(`INSERT INTO inbox_reads (reader, kind, item_id, read_at)
             SELECT reader, 'student', $2, read_at FROM inbox_reads WHERE kind = 'inquiry' AND item_id = $1
             ON CONFLICT DO NOTHING`, [ev.id, row.id]);
    await q("DELETE FROM inbox_reads WHERE kind = 'inquiry' AND item_id = $1", [ev.id]);
    await q('DELETE FROM events WHERE id = $1', [ev.id]);
    return { id: row.id };
  });
}

export async function joinStudent(id, b) {
  const familyName = str(b.family_name, 120);
  if (!familyName) throw httpError(400, 'Family name is required');
  const dancers = parseDancers(b.dancers);
  if (!dancers.length) throw httpError(400, 'Add at least one dancer');
  return withSource({ source: 'owner' }, async (q) => {
    const [lead] = await q('SELECT id, family_id FROM student_leads WHERE id = $1 FOR UPDATE', [id]);
    if (!lead) throw httpError(404, 'Student not found');
    if (lead.family_id) throw httpError(409, 'Already added to Familia');
    const fam = await createFamily(q, { name: familyName, dancers });
    await q("UPDATE student_leads SET stage = 'joined', family_id = $2, updated_at = now() WHERE id = $1", [id, fam.id]);
    return { family_id: fam.id, invite_link: fam.invite_link };
  });
}

export const cleanReader = (v) => str(v, 40);

export async function listReads(reader) {
  if (!reader) return [];
  return sql('SELECT kind, item_id AS id FROM inbox_reads WHERE reader = $1', [reader]);
}

export async function markReads(reader, items, unread = false) {
  const clean = (Array.isArray(items) ? items : []).slice(0, 500)
    .map((it) => ({ kind: it && it.kind, id: parseInt(it && it.id, 10) }))
    .filter((it) => READ_KINDS.includes(it.kind) && Number.isFinite(it.id));
  if (!reader || !clean.length) return 0;
  const kinds = clean.map((it) => it.kind), ids = clean.map((it) => it.id);
  if (unread) {
    await sql(`DELETE FROM inbox_reads r USING unnest($2::text[], $3::int[]) AS x(kind, id)
                WHERE r.reader = $1 AND r.kind = x.kind AND r.item_id = x.id`, [reader, kinds, ids]);
  } else {
    await sql(`INSERT INTO inbox_reads (reader, kind, item_id) SELECT $1, x.kind, x.id FROM unnest($2::text[], $3::int[]) AS x(kind, id)
               ON CONFLICT DO NOTHING`, [reader, kinds, ids]);
  }
  return clean.length;
}
