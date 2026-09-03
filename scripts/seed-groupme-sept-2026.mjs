// One-off seed from the GroupMe thread (Aug 14 – Sep 1, 2026); rerunnable, skips rows that exist.
import { readFileSync } from 'node:fs';
import pg from 'pg';

const env = readFileSync('.env.local', 'utf8');
const url = process.env.DATABASE_URL || env.match(/^DATABASE_URL="?([^"\n]+)/m)[1];
const db = new pg.Pool({ connectionString: url });
const q = async (t, p) => (await db.query(t, p)).rows;

const EVENTS = [
  { key: '2026-09-12', title: '50th Birthday Dinner — Knott’s Berry Farm Hotel', event_type: 'private', status: 'confirmed', start_time: '6:00 PM', venue: 'Knott’s Berry Farm Hotel', city: 'Buena Park', details: 'Confirmed and booked. Details to follow.' },
  { key: '2026-09-14', title: 'Corporate Reception — Rancho Palos Verdes (adults only)', event_type: 'corporate', status: 'confirmed', start_time: '6:30 PM', end_time: '7:30 PM', city: 'Rancho Palos Verdes', details: 'Adult / advanced dancers only. Confirmed and booked.' },
  { key: '2026-09-19', title: 'Montebello Mall', event_type: 'festival', status: 'open', start_time: '12:00 PM', end_time: '3:00 PM', venue: 'Montebello Mall', city: 'Montebello', details: 'Tentative time 12–3p.' },
  { key: '2026-09-25', title: 'Long Beach — The Loft', event_type: 'private', status: 'cancelled', start_time: '6:00 PM', end_time: '6:30 PM', venue: 'The Loft', city: 'Long Beach', details: 'Declined by the group on 9/1.' },
  { key: '2026-09-26', title: 'Stonewood Center Mall — Downey', event_type: 'festival', status: 'open', start_time: '1:00 PM', end_time: '3:00 PM', venue: 'Stonewood Center Mall', city: 'Downey', details: 'Tentative time 1–3p.' },
  { key: '2026-10-13', title: 'Paramount Pictures — internal event', event_type: 'corporate', status: 'open', start_time: '3:00 PM', venue: 'Paramount Pictures', city: 'Los Angeles', details: 'Small internal event.' },
  { key: '2026-11-04', title: 'La Serna High School — Whittier', event_type: 'school', status: 'open', start_time: '6:00 PM', venue: 'La Serna High School', city: 'Whittier' },
];

const FAMILIES = [
  { name: 'Aceves', groupme_user_id: '65115438', dancers: ['Kiley Aceves'] },
  { name: 'Marin', groupme_user_id: '64889724', dancers: ['Lia Marin', 'Donatien Marin', 'Isaias Marin'] },
  { name: 'Orozco', groupme_user_id: '65115441', dancers: ['Ashley Orozco', 'Emily Orozco', 'Sharlene Orozco'] },
  { name: 'Barragan', groupme_user_id: '143826068', dancers: ['Camila Barragan'] },
  { name: 'Alvarez', groupme_user_id: '136328681', dancers: ['Isabella Alvarez'] },
  { name: 'Cindy (Zamyra & Zarina)', groupme_user_id: '5335698', dancers: ['Zamyra', 'Zarina'] },
  { name: 'Melissa (Alexa)', groupme_user_id: '115561793', dancers: ['Alexa'] },
  { name: 'Anna Mendez Perdomo', groupme_user_id: '19478548', dancers: ['Anna Mendez Perdomo'] },
  { name: 'Ramirez', groupme_user_id: null, dancers: ['Tati Ramirez', 'Nati Ramirez', 'Sebas Ramirez'] },
  { name: 'Dominguez', groupme_user_id: '116647208', dancers: ['Hailey Dominguez'] },
  { name: 'Coco Ramirez (Anisa)', groupme_user_id: '47465306', dancers: ['Anisa'] },
];

// Last answer wins: later thread messages override earlier ones.
const A = {
  '2026-09-12': { yes: ['Kiley', 'Lia', 'Donatien', 'Isabella', 'Zamyra', 'Zarina', 'Alexa', 'Ashley', 'Camila'], no: ['Anna'] },
  '2026-09-14': { yes: ['Anna'], no: ['Kiley', 'Lia', 'Donatien', 'Ashley', 'Isaias'] },
  '2026-09-19': { yes: ['Zamyra', 'Zarina', 'Isabella', 'Camila', 'Isaias'], no: ['Anna', 'Kiley', 'Ashley'], maybe: ['Lia', 'Donatien'] },
  '2026-09-25': { yes: ['Anna', 'Kiley', 'Lia', 'Donatien', 'Zamyra', 'Zarina', 'Camila'], no: ['Isabella'] },
  '2026-09-26': { yes: ['Anna', 'Kiley', 'Lia', 'Donatien', 'Zamyra', 'Zarina', 'Ashley', 'Isaias'], no: ['Isabella'] },
  '2026-10-13': { yes: ['Anna', 'Kiley', 'Lia', 'Donatien', 'Isaias'], no: ['Ashley'] },
  '2026-11-04': { yes: ['Lia', 'Donatien', 'Kiley'] },
};

const evIds = {};
for (const e of EVENTS) {
  const found = await q('SELECT id FROM events WHERE event_date = $1 AND source = $2', [e.key, 'groupme-seed']);
  if (found.length) { evIds[e.key] = found[0].id; console.log('event exists', e.key); continue; }
  const r = await q(
    `INSERT INTO events (title, status, event_type, event_date, start_time, end_time, venue, city, details, source, published_at, confirmed_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'groupme-seed', now(), $10) RETURNING id`,
    [e.title, e.status, e.event_type, e.key, e.start_time || null, e.end_time || null, e.venue || null, e.city || null, e.details || null,
     e.status === 'confirmed' ? new Date() : null]);
  evIds[e.key] = r[0].id; console.log('event', e.key, '->', r[0].id);
}

const dancerByFirst = {};
for (const f of FAMILIES) {
  let fam = (await q('SELECT id FROM families WHERE name = $1', [f.name]))[0];
  if (!fam) {
    const token = (await import('node:crypto')).randomBytes(18).toString('base64url');
    fam = (await q('INSERT INTO families (name, groupme_user_id, access_token) VALUES ($1,$2,$3) RETURNING id', [f.name, f.groupme_user_id, token]))[0];
    console.log('family', f.name, '->', fam.id);
  }
  for (const name of f.dancers) {
    let d = (await q('SELECT id FROM dancers WHERE family_id = $1 AND name = $2', [fam.id, name]))[0];
    if (!d) d = (await q('INSERT INTO dancers (family_id, name) VALUES ($1,$2) RETURNING id', [fam.id, name]))[0];
    dancerByFirst[name.split(' ')[0]] = d.id;
  }
}

let n = 0;
for (const [date, byStatus] of Object.entries(A)) {
  for (const [status, names] of Object.entries(byStatus)) {
    for (const first of names) {
      const id = dancerByFirst[first]; if (!id) throw new Error('unknown dancer ' + first);
      await q(`INSERT INTO availability (event_id, dancer_id, status, note) VALUES ($1,$2,$3,'from GroupMe thread (seeded 2026-09-02)')
               ON CONFLICT (event_id, dancer_id) DO UPDATE SET status = EXCLUDED.status, note = EXCLUDED.note, updated_at = now()`, [evIds[date], id, status]);
      n++;
    }
  }
}
console.log('availability rows written:', n);
await db.end();
