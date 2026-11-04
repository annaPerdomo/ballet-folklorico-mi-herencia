// Owner-login uploads before CUTOFF were Anna's (she had no account yet); later ones are Mayra
// and Angel's. Applied to production on 2026-11-04 (11 items).
//   node --env-file=.env.local scripts/credit-owner-uploads.mjs           # dry run: counts what would change
//   node --env-file=.env.local scripts/credit-owner-uploads.mjs --apply   # writes the credit
import { getPool } from '../api/_lib/db.js';
import { ADMIN_CREDIT } from '../api/_lib/media.js';

const unknown = process.argv.slice(2).filter((a) => a !== '--apply');
if (unknown.length) { console.error(`Unknown option ${unknown.join(' ')}. Use --apply, or nothing for a dry run.`); process.exit(1); }
const apply = process.argv.includes('--apply');
const CUTOFF = '2026-11-05';
const WHERE = `uploader = 'owners' AND credit IS NULL AND family_id IS NULL AND created_at < '${CUTOFF}'`;
const pool = getPool();
const { rows } = await pool.query(`SELECT kind, count(*)::int AS n, min(created_at) AS first, max(created_at) AS last FROM media WHERE ${WHERE} GROUP BY kind ORDER BY kind`);
console.table(rows.map((r) => ({ kind: r.kind, items: r.n, first: r.first.toISOString().slice(0, 10), last: r.last.toISOString().slice(0, 10) })));
if (!rows.length) console.log('Nothing to credit.');
else if (apply) {
  const res = await pool.query(`UPDATE media SET credit = $1 WHERE ${WHERE}`, [ADMIN_CREDIT]);
  console.log(`Credited ${res.rowCount} items to ${ADMIN_CREDIT}.`);
} else console.log(`Dry run. Re-run with --apply to credit these to ${ADMIN_CREDIT}.`);
await pool.end();
