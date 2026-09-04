import { route, readJson, ok, query, str, int, httpError } from './_lib/http.js';
import { whoami, requireAdmin } from './_lib/auth.js';
import { sql } from './_lib/db.js';
import { listEvents, EDITABLE } from './_lib/events.js';

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
    const me = await whoami(req);
    if (me.role === 'anon') throw httpError(401, 'Sign in required');
    const q = query(req);
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
