import { route, ok, query, int, str, httpError } from './_lib/http.js';
import { verifyCalendarSig } from './_lib/auth.js';
import { one, sql } from './_lib/db.js';
import { MEMBER_VISIBLE } from './_lib/events.js';

// Readable with no cookie, off a link that travels (forwards, screenshots), so it carries only
// enough to tell the families apart: first names, no surnames, no answers, no pay, no tokens.
const COLS = `id, title, status, event_type, event_date, start_time, end_time, call_time,
  venue, address, city, dancers_needed, details, rehearsals`;

export default route({
  async GET(req, res) {
    const q = query(req);
    const id = int(q.e);
    if (!id || !verifyCalendarSig(id, str(q.s, 32))) throw httpError(403, 'That link is not valid');

    const event = await one(`SELECT ${COLS} FROM events WHERE id = $1`, [id]);
    if (!event || !MEMBER_VISIBLE.includes(event.status)) throw httpError(404, 'Not found');

    const families = await sql(
      `SELECT f.id, f.name,
              COALESCE(json_agg(json_build_object('id', d.id, 'name', split_part(d.name, ' ', 1)) ORDER BY d.name)
                       FILTER (WHERE d.id IS NOT NULL), '[]'::json) AS dancers
         FROM families f
         LEFT JOIN dancers d ON d.family_id = f.id AND d.active
        GROUP BY f.id ORDER BY f.name`);

    ok(res, {
      event,
      families: families.filter((f) => f.dancers.length),
      answering: ['open', 'confirmed'].includes(event.status),
    });
  },
});
