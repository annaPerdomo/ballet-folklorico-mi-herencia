// Re-adds hard-deleted events from events_history as hidden 'deleted' rows; merged ones stay gone.
// Run only once the soft-delete build is live: older code shows 'deleted' rows to owners.
//   node --env-file=.env.local scripts/restore-deleted-events.mjs          (dry run)
//   node --env-file=.env.local scripts/restore-deleted-events.mjs --apply
import { withSource, getPool } from '../api/_lib/db.js';

const FROM = `FROM (SELECT DISTINCT ON (event_id) * FROM events_history ORDER BY event_id, id DESC) h
  WHERE h.op = 'delete' AND h.source <> 'merge' AND NOT EXISTS (SELECT 1 FROM events e WHERE e.id = h.event_id)`;

// Bare pool: sql() applies the schema, and a dry run must not write.
const { rows } = await getPool().query(`SELECT h.event_id, h.changed_at, h.old_row->>'status' AS status, h.old_row->>'source' AS source,
  h.old_row->>'created_at' AS created_at, h.old_row->>'title' AS title ${FROM} ORDER BY h.event_id`);
console.table(rows);

if (process.argv.includes('--apply') && rows.length) {
  const done = await withSource({ source: 'restore', actor: 'script' }, (q) => q(
    `INSERT INTO events
     SELECT (jsonb_populate_record(NULL::events,
               h.old_row || jsonb_build_object('status', 'deleted', 'deleted_at', h.changed_at, 'cover_media_id', NULL))).*
       ${FROM}
     RETURNING id`));
  console.log(`Restored ${done.length} as hidden 'deleted' rows.`);
} else if (rows.length) {
  console.log('Dry run. Re-run with --apply to restore these.');
}
await getPool().end();
