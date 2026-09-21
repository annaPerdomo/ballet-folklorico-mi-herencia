// One-off cleanup: dancer display names become first names only. Family names are left as they are,
// since some are a parent's full name and that is where the surname lives.
// Dry run by default; pass --apply to write. Needs DATABASE_URL (or .env.local) like the seed scripts.
import { readFileSync, existsSync } from 'node:fs';
import pg from 'pg';

const env = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '';
const url = process.env.DATABASE_URL || (env.match(/^DATABASE_URL="?([^"\n]+)/m) || [])[1];
if (!url) { console.error('DATABASE_URL is not set'); process.exit(1); }
const apply = process.argv.includes('--apply');
const client = new pg.Client({ connectionString: url, ssl: /localhost|127\.0\.0\.1/.test(url) ? false : { rejectUnauthorized: false } });
await client.connect();

const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// "Anna Mendez Perdomo" in family "Mendez Perdomo" -> "Anna"; otherwise the first word.
function firstNameOf(dancer, family) {
  const name = dancer.trim();
  const words = name.split(/\s+/);
  if (words.length === 1) return name;
  const famWords = family.replace(/\(.*?\)/g, '').trim().split(/\s+/).filter(Boolean);
  for (let i = 1; i < famWords.length + 1 && i <= famWords.length; i++) {
    const tail = famWords.slice(famWords.length - i).join(' ');
    if (tail && norm(name).endsWith(' ' + norm(tail))) return name.slice(0, name.length - tail.length).trim();
  }
  return words[0];
}

const { rows } = await client.query(
  `SELECT f.name AS family, d.id, d.name FROM dancers d JOIN families f ON f.id = d.family_id ORDER BY f.name, d.name`);

const updates = rows.map((r) => ({ id: r.id, family: r.family, from: r.name, to: firstNameOf(r.name, r.family) })).filter((u) => u.to !== u.from);

console.log(apply ? 'Applying:' : 'Dry run (add --apply to write):');
for (const u of updates) console.log(`  dancer #${u.id} (${u.family}): "${u.from}" -> "${u.to}"`);
if (!updates.length) console.log('  nothing to change');

if (apply) {
  await client.query('BEGIN');
  for (const u of updates) await client.query('UPDATE dancers SET name = $2 WHERE id = $1', [u.id, u.to]);
  await client.query('COMMIT');
  console.log(`Done: ${updates.length} dancers renamed.`);
}
await client.end();
