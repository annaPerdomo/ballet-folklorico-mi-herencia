// One-off cleanup: family name = surname only, dancer name = first name only.
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

// "Coco Ramirez (Anisa)" -> "Ramirez"; "Cindy (Zamyra & Zaryna)" -> "" (parent's first name only, no surname known)
function surnameOf(family) {
  const base = family.replace(/\(.*?\)/g, '').trim();
  const words = base.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return words.slice(1).join(' ');
  return '';
}

function firstNameOf(dancer, surname) {
  const words = dancer.trim().split(/\s+/);
  if (words.length === 1) return dancer.trim();
  if (surname && norm(dancer).endsWith(' ' + norm(surname))) return dancer.trim().slice(0, dancer.trim().length - surname.length).trim();
  return words[0];
}

const { rows } = await client.query(
  `SELECT f.id AS fid, f.name AS family, d.id AS did, d.name AS dancer
     FROM families f LEFT JOIN dancers d ON d.family_id = f.id ORDER BY f.name, d.name`);

const familyUpdates = new Map();
const dancerUpdates = [];
const needsSurname = [];
for (const r of rows) {
  const hasParens = /\(/.test(r.family);
  const surname = surnameOf(r.family);
  const singleWord = r.family.trim().split(/\s+/).length === 1 && !hasParens;
  const inferred = singleWord ? r.family.trim() : surname;
  if (inferred && inferred !== r.family) familyUpdates.set(r.fid, { from: r.family, to: inferred });
  if (!inferred && !familyUpdates.has(r.fid)) needsSurname.push(r.family);
  if (r.did) {
    const first = firstNameOf(r.dancer, inferred || surname);
    if (first !== r.dancer) dancerUpdates.push({ id: r.did, from: r.dancer, to: first });
  }
}

console.log(apply ? 'Applying:' : 'Dry run (add --apply to write):');
for (const [id, u] of familyUpdates) console.log(`  family #${id}: "${u.from}" -> "${u.to}"`);
for (const u of dancerUpdates) console.log(`  dancer #${u.id}: "${u.from}" -> "${u.to}"`);
if (!familyUpdates.size && !dancerUpdates.length) console.log('  nothing to change');
for (const f of [...new Set(needsSurname)]) console.log(`  ! family "${f}" has no surname to use; rename it in the Team tab`);

if (apply) {
  await client.query('BEGIN');
  for (const [id, u] of familyUpdates) await client.query('UPDATE families SET name = $2 WHERE id = $1', [id, u.to]);
  for (const u of dancerUpdates) await client.query('UPDATE dancers SET name = $2 WHERE id = $1', [u.id, u.to]);
  await client.query('COMMIT');
  console.log(`Done: ${familyUpdates.size} families, ${dancerUpdates.length} dancers renamed.`);
}
await client.end();
