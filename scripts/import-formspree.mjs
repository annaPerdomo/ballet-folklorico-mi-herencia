// Adds Formspree submissions missing from events: dashboard JSON (`_id`, `_date`) or records from
// the notification emails (`submitted_at`). Missing after go-live means an owner hard-deleted it,
// so it comes back hidden. Run after the soft-delete build is live and restore-deleted-events.mjs.
//   node --env-file=.env.local scripts/import-formspree.mjs <file.json>...           (dry run)
//   node --env-file=.env.local scripts/import-formspree.mjs <file.json>... --apply
import { readFileSync } from 'node:fs';
import { withSource, getPool } from '../api/_lib/db.js';
import { normalizeInquiry } from '../api/_lib/inquiry.js';

const apply = process.argv.includes('--apply');
const files = process.argv.slice(2).filter((a) => !a.startsWith('--'));
// Bare pool: sql() applies the schema, and a dry run must not write.
const read = async (text, params) => (await getPool().query(text, params)).rows;
const IMPORTED = 'Imported from Formspree';
const subs = files.flatMap((f) => JSON.parse(readFileSync(f, 'utf8')))
  .filter((s) => !s.test)
  .map((s) => ({ fields: s, at: new Date(s._date || s.submitted_at), ref: s._id ? `formspree:${s._id}` : null }))
  .sort((a, b) => a.at - b.at);

const today = new Date().toISOString().slice(0, 10);
const [{ live }] = await read(`SELECT min(created_at) AS live FROM events
  WHERE source IN ('website', 'formspree') AND notes IS DISTINCT FROM $1`, [IMPORTED]);
console.log(`Inbox live since ${live?.toISOString()}`);
const missing = [];
for (const s of subs) {
  const n = normalizeInquiry(s.fields);
  if (!n.client_email && !n.client_name) continue;
  const [hit] = await read(
    `SELECT 1 FROM events
      WHERE ($1::text IS NOT NULL AND source_ref = $1)
         OR (client_email = $2 AND abs(extract(epoch FROM created_at - $3::timestamptz)) < 86400)
     UNION ALL
     SELECT 1 FROM events_history
      WHERE op = 'delete' AND (($1::text IS NOT NULL AND old_row->>'source_ref' = $1)
         OR (old_row->>'client_email' = $2 AND abs(extract(epoch FROM (old_row->>'created_at')::timestamptz - $3::timestamptz)) < 86400))
     LIMIT 1`, [s.ref, n.client_email, s.at.toISOString()]);
  if (hit) continue;
  // Past ones keep their own date as updated_at so they don't flood the recent "Didn't happen" list.
  const status = live && s.at >= live ? 'deleted' : n.event_date && n.event_date >= today ? 'inquiry' : 'lapsed';
  missing.push({ ...s, n, status });
}

console.log(`${subs.length} submissions, ${missing.length} not in events:`);
console.table(missing.map((m) => ({ at: m.at.toISOString().slice(0, 16), type: m.n.event_type, name: m.n.client_name, date: m.n.event_date, status: m.status })));

if (apply && missing.length) {
  await withSource({ source: 'import', actor: 'formspree' }, async (q) => {
    for (const m of missing) {
      const n = m.n;
      await q(
        `INSERT INTO events (title, status, event_type, event_date, date_text, city, client_name, client_email, client_phone,
                             message, source, source_ref, raw, notes, created_at, updated_at, deleted_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'formspree',$11,$12,$13,$14,
                 CASE WHEN $2 = 'inquiry' THEN now() ELSE $14 END, CASE WHEN $2 = 'deleted' THEN now() END)`,
        [n.title, m.status, n.event_type, n.event_date, n.date_text, n.city, n.client_name, n.client_email, n.client_phone,
         n.message, m.ref, JSON.stringify(m.fields), IMPORTED, m.at.toISOString()]);
    }
  });
  console.log(`Imported ${missing.length}.`);
} else if (missing.length) {
  console.log('Dry run. Re-run with --apply to import these.');
}
await getPool().end();
