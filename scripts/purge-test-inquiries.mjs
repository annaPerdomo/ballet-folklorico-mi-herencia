//   node --env-file=.env.local scripts/purge-test-inquiries.mjs           # dry run: lists what matches
//   node --env-file=.env.local scripts/purge-test-inquiries.mjs --apply   # deletes them
// Anything an owner turned into a gig, or that has answers or photos attached, is listed but
// kept: deleting it would cascade to those rows and orphan the files in R2.
import { withSource, getPool } from '../api/_lib/db.js';
import { isTestInquiry } from '../api/_lib/inquiry.js';

const unknown = process.argv.slice(2).filter((a) => a !== '--apply');
if (unknown.length) { console.error(`Unknown option ${unknown.join(' ')}. Use --apply, or nothing for a dry run.`); process.exit(1); }
const apply = process.argv.includes('--apply');
const KEEP = ['open', 'confirmed', 'done', 'cancelled'];
const read = async (text, params) => (await getPool().query(text, params)).rows;

const rows = await read(`SELECT id, status, created_at, client_name, client_email, left(message, 60) AS message,
    EXISTS (SELECT 1 FROM media m WHERE m.event_id = e.id) OR EXISTS (SELECT 1 FROM availability a WHERE a.event_id = e.id) AS attached
  FROM events e WHERE source IN ('website', 'formspree') ORDER BY created_at`);
const tests = rows.filter(isTestInquiry);
const gone = await read(`SELECT DISTINCT event_id AS id, old_row->>'client_name' AS client_name, old_row->>'client_email' AS client_email,
    old_row->>'message' AS message FROM events_history
  WHERE op = 'delete' AND old_row->>'source' IN ('website', 'formspree') AND NOT EXISTS (SELECT 1 FROM events e WHERE e.id = events_history.event_id)`);
const goneTests = gone.filter(isTestInquiry);

const keep = (r) => KEEP.includes(r.status) || r.attached;
const kept = tests.filter(keep);
const doomed = tests.filter((r) => !keep(r));
console.log(`${rows.length} website inquiries, ${tests.length} look like tests:`);
console.table(tests.map((r) => ({ id: r.id, status: r.status, at: r.created_at.toISOString().slice(0, 16), name: r.client_name, email: r.client_email, keep: keep(r) })));
if (goneTests.length) console.log(`Plus ${goneTests.length} already-deleted test rows still in events_history: ${goneTests.map((r) => r.id).join(', ')}`);
if (kept.length) console.log(`Keeping ${kept.length} that became gigs or have answers/photos: ${kept.map((r) => r.id).join(', ')}`);

const ids = [...doomed.map((r) => r.id), ...goneTests.map((r) => r.id)];
if (apply && ids.length) {
  await withSource({ source: 'cleanup', actor: 'purge-test-inquiries' }, async (q) => {
    await q('DELETE FROM events WHERE id = ANY($1)', [doomed.map((r) => r.id)]);
    await q('DELETE FROM events_history WHERE event_id = ANY($1)', [ids]);
  });
  console.log(`Deleted ${doomed.length} test inquiries and their history.`);
} else if (ids.length) {
  console.log('Dry run. Re-run with --apply to delete.');
}
await getPool().end();
