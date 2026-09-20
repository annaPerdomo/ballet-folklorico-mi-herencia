import { route, readJson, ok, query, str, int, httpError } from './_lib/http.js';
import { whoami, requireAdmin, verifySheetSig } from './_lib/auth.js';
import { sql } from './_lib/db.js';
import { listEvents, EDITABLE } from './_lib/events.js';
import { renderSheet } from './_lib/sheet.js';

export function cleanPatch(body) {
  const patch = {};
  for (const k of EDITABLE) {
    if (!(k in body)) continue;
    const v = body[k];
    if (k === 'dancers_needed') patch[k] = int(v);
    else if (k === 'rehearsals') {
      const arr = Array.isArray(v) ? v : [];
      patch[k] = JSON.stringify(arr.slice(0, 30).map((r) => ({
        date: str(r.date, 20), time: str(r.time, 40), location: str(r.location, 200), note: str(r.note, 500),
      })));
    } else if (k === 'event_date') {
      patch[k] = v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
    } else patch[k] = str(v, k === 'message' || k === 'notes' || k === 'details' ? 6000 : 300);
  }
  return patch;
}

export default route({
  async GET(req, res) {
    const q = query(req);
    if (q.sheet !== undefined) {
      const allowed = verifySheetSig(str(q.a, 40)) || (await whoami(req)).role === 'admin';
      if (!allowed) throw httpError(403, 'That link is not valid');
      const lang = q.lang === 'es' ? 'es' : 'en';
      const cols = 'id, title, event_date, start_time, end_time, venue, city, dancers_needed';
      const sheet = str(q.sheet, 200) || '';
      let events;
      if (sheet === 'all') {
        events = await sql(
          `SELECT ${cols} FROM events WHERE status IN ('open','confirmed') AND event_date >= current_date ORDER BY event_date, id`
        );
      } else {
        const ids = [...new Set(sheet.split(',').map((v) => int(v)).filter(Boolean))].slice(0, 10);
        events = ids.length
          ? await sql(`SELECT ${cols} FROM events WHERE id = ANY($1) ORDER BY event_date NULLS LAST, id`, [ids])
          : [];
      }
      const dancers = await sql('SELECT id, name FROM dancers WHERE active ORDER BY name');
      const availability = events.length
        ? await sql('SELECT event_id, dancer_id, status FROM availability WHERE event_id = ANY($1)', [events.map((e) => e.id)])
        : [];
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.end(renderSheet({ events, dancers, availability, lang }));
      return;
    }
    const me = await whoami(req);
    if (me.role === 'anon') throw httpError(401, 'Sign in required');
    const events = await listEvents({ admin: me.role === 'admin', includePast: q.all === '1' });
    // Families see how many dancers are still out, but never who they are.
    const [{ n }] = await sql('SELECT count(*)::int AS n FROM dancers WHERE active');
    ok(res, { events, roster: n });
  },
  async POST(req, res) {
    await requireAdmin(req);
    const body = await readJson(req);
    const patch = cleanPatch(body);
    if (!patch.title) throw httpError(400, 'Title is required');
    const cols = Object.keys(patch);
    const vals = Object.values(patch);
    const status = ['inquiry', 'open'].includes(body.status) ? body.status : 'inquiry';
    const row = await sql(
      `INSERT INTO events (${cols.join(',')}, status, source, published_at)
       VALUES (${cols.map((_, i) => `$${i + 1}`).join(',')}, $${cols.length + 1}, 'manual',
               CASE WHEN $${cols.length + 1} = 'open' THEN now() ELSE NULL END) RETURNING id`,
      [...vals, status]);
    ok(res, { id: row[0].id });
  },
});
