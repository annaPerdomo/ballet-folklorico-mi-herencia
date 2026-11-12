// Moves people asking to join as dancers out of the gig inbox and into Students.
//   node --env-file=.env.local scripts/move-class-inquiries.mjs                 (dry run)
//   node --env-file=.env.local scripts/move-class-inquiries.mjs --apply
import { moveInquiryToStudent } from '../api/_lib/students.js';
import { getPool } from '../api/_lib/db.js';

const ALSO = [[136, 'Lizbeth Perez, “Other”: wants her 7-year-old daughter to participate']];
const READERS = ['Mayra', 'Angel', 'Anna'];
const apply = process.argv.includes('--apply');

const pool = getPool();
const { rows } = await pool.query(
  `SELECT id, status, event_type, client_name, left(regexp_replace(coalesce(message, ''), '\\s+', ' ', 'g'), 70) AS msg
     FROM events WHERE status IN ('inquiry', 'lapsed', 'declined', 'deleted') AND (event_type = 'classes' OR id = ANY($1))
    ORDER BY id`, [ALSO.map(([id]) => id)]);
for (const r of rows) console.log(`${apply ? 'move' : 'would move'} #${r.id} ${r.client_name} (${r.event_type}, ${r.status}) — ${r.msg}`);
for (const [id, why] of ALSO) if (!rows.some((r) => r.id === id)) console.log(`skip #${id} (gone or not an inquiry) — ${why}`);

if (apply) {
  for (const r of rows) {
    const { id } = await moveInquiryToStudent(r.id, 'script');
    await pool.query(`INSERT INTO inbox_reads (reader, kind, item_id) SELECT unnest($1::text[]), 'student', $2 ON CONFLICT DO NOTHING`, [READERS, id]);
  }
  console.log(`Moved ${rows.length}.`);
} else console.log('Dry run. Pass --apply to move them.');
await pool.end();
