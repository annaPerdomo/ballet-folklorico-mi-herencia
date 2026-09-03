import { route, readJson, ok, int, str, httpError } from './_lib/http.js';
import { requireUser } from './_lib/auth.js';
import { one, sql } from './_lib/db.js';

export default route({
  async POST(req, res) {
    const me = await requireUser(req);
    const body = await readJson(req);
    const eventId = int(body.event_id); const dancerId = int(body.dancer_id);
    const status = body.status == null || body.status === '' ? null : String(body.status);
    if (!eventId || !dancerId) throw httpError(400, 'event_id and dancer_id required');
    if (status && !['yes', 'no', 'maybe'].includes(status)) throw httpError(400, 'Bad status');

    const dancer = await one('SELECT id, family_id FROM dancers WHERE id = $1 AND active', [dancerId]);
    if (!dancer) throw httpError(404, 'Dancer not found');
    if (me.role !== 'admin' && dancer.family_id !== me.family.id) throw httpError(403, 'Not your dancer');

    const ev = await one('SELECT id, status FROM events WHERE id = $1', [eventId]);
    if (!ev) throw httpError(404, 'Event not found');
    if (me.role !== 'admin' && !['open', 'confirmed'].includes(ev.status)) throw httpError(400, 'This event is not taking answers');

    if (!status) {
      await sql('DELETE FROM availability WHERE event_id = $1 AND dancer_id = $2', [eventId, dancerId]);
    } else {
      await sql(
        `INSERT INTO availability (event_id, dancer_id, status, note) VALUES ($1,$2,$3,$4)
         ON CONFLICT (event_id, dancer_id) DO UPDATE SET status = EXCLUDED.status, note = EXCLUDED.note, updated_at = now()`,
        [eventId, dancerId, status, str(body.note, 300)]);
    }
    ok(res);
  },
});
