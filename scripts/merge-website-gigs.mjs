// Merges 2026 website inquiries into the gigs they became, so Insights counts them as booked.
//   node --env-file=.env.local scripts/merge-website-gigs.mjs          (dry run)
//   node --env-file=.env.local scripts/merge-website-gigs.mjs --apply
import { mergeInquiry, MERGEABLE } from '../api/_lib/events.js';
import { ADMIN_NAME } from '../api/_lib/auth.js';
import { getPool, withSource } from '../api/_lib/db.js';

const PAIRS = [
  [108, 2, 'Lexis Nexis: Nicole Brevoort, Mon Sept 14, 6:30–7:30 = the Rancho Palos Verdes reception'],
  [116, 6, 'Paramount: Maritza Murillo @paramount.com'],
  [107, 31, 'Mesa Robles: Stefanie Gomez, Mesa Robles PTO (her Sept 17 follow-up #131 stays hidden)'],
];
const NO_INQUIRY = [[21, 'Amazon MGM']];

// Merged before mergeInquiry carried a form source onto GroupMe-imported gigs.
const RESOURCE = [[2, 'formspree'], [6, 'formspree']];

const pool = getPool();
const ids = [...PAIRS.flat(), ...NO_INQUIRY.flat(), ...RESOURCE.flat()].filter((x) => typeof x === 'number');
const { rows } = await pool.query('SELECT id, title, status, source, client_name FROM events WHERE id = ANY($1)', [ids]);
const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
const todo = PAIRS.filter(([from, into, why]) => {
  const f = byId[from], g = byId[into];
  const ok = f && g && MERGEABLE.includes(f.status);
  console.log(`${ok ? 'merge' : 'skip '} #${from} ${f ? `“${f.title}” (${f.status})` : '(gone)'} → #${into} ${g ? `“${g.title}”` : '(gone)'} — ${why}`);
  return ok;
});

const relabel = NO_INQUIRY.filter(([id, why]) => {
  const g = byId[id], ok = g && ['manual', 'website'].includes(g.source) && !g.client_name;
  console.log(`${ok ? 'mark ' : 'skip '} #${id} ${g ? `“${g.title}” (source ${g.source})` : '(gone)'} as source 'site' — ${why}`);
  return ok;
});

const resource = RESOURCE.filter(([id, src]) => {
  const g = byId[id], ok = g && g.source === 'groupme-seed' && g.client_name;
  console.log(`${ok ? 'mark ' : 'skip '} #${id} ${g ? `“${g.title}” (source ${g.source})` : '(gone)'} as source '${src}', its merged inquiry's`);
  return ok;
});

if (process.argv.includes('--apply')) {
  for (const [from, into] of todo) await mergeInquiry(from, into, ADMIN_NAME);
  if (relabel.length) await withSource({ source: 'owner', actor: ADMIN_NAME }, (q) => q(
    `UPDATE events SET source = 'site', updated_at = now() WHERE id = ANY($1) AND source IN ('manual', 'website') AND client_name IS NULL`, [relabel.map(([id]) => id)]));
  for (const [id, src] of resource) await withSource({ source: 'owner', actor: ADMIN_NAME }, (q) => q(
    `UPDATE events SET source = $2, updated_at = now() WHERE id = $1 AND source = 'groupme-seed'`, [id, src]));
  console.log(`Merged ${todo.length}, re-sourced ${resource.length}, marked ${relabel.length} as found through the site.`);
} else if (todo.length || relabel.length || resource.length) {
  console.log('Dry run. Re-run with --apply.');
}
await pool.end();
