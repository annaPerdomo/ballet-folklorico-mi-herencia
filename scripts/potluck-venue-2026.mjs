// Names and address from GroupMe: "Francisca"/"Jorge" as the group spells them; the street is Babe's
// 2019-11-26 post ("At my in-law's house"), never re-posted since. Applied to production 2026-11-08.
//   node --env-file=.env.local scripts/potluck-venue-2026.mjs           # dry run: shows the event and what changes
//   node --env-file=.env.local scripts/potluck-venue-2026.mjs --apply   # writes it, tagged as an owner edit
import { getPool, withSource, ensureSchema } from '../api/_lib/db.js';

const unknown = process.argv.slice(2).filter((a) => a !== '--apply');
if (unknown.length) { console.error(`Unknown option ${unknown.join(' ')}. Use --apply, or nothing for a dry run.`); process.exit(1); }
const apply = process.argv.includes('--apply');

const VENUE = 'Francisca & Jorge’s house (Mayra’s parents)';
const ADDRESS = '12501 Camilla St';
const CITY = 'Whittier';
// Mayra's GroupMe post of 2026-11-08, for the potluck suggestions box.
const NOTES = 'Sign up for a main dish or a side dish. College students: please bring dessert. BYOB — sodas and water are provided.';

const pool = getPool();
// Adds potluck_notes if this runs before the branch that introduced it is deployed.
await ensureSchema();
const { rows } = await pool.query(
  `SELECT id, title, event_date, venue, address, city, potluck, potluck_notes FROM events
    WHERE status = 'gathering' AND event_date BETWEEN '2026-11-15' AND '2026-12-31' ORDER BY event_date, id`);
console.table(rows);
const ev = rows.find((r) => r.event_date === '2026-12-05') || (rows.length === 1 ? rows[0] : null);
if (!ev) { console.log('Could not pick the potluck out of these — pass the right date in the script.'); process.exit(1); }
console.log(`Event ${ev.id} “${ev.title}” → venue: ${VENUE} · ${ADDRESS}, ${CITY}${ev.potluck_notes ? ' (suggestions already set, left alone)' : ' · suggestions added'}`);
if (apply) {
  await withSource({ source: 'owner', actor: 'script:potluck-venue-2026' }, (q) =>
    q(`UPDATE events SET venue = $2, address = $3, city = $4, potluck = true, potluck_notes = COALESCE(potluck_notes, $5), updated_at = now() WHERE id = $1`,
      [ev.id, VENUE, ADDRESS, CITY, NOTES]));
  console.log('Updated.');
} else console.log('Dry run. Re-run with --apply to write it.');
await pool.end();
