import { route, ok } from './_lib/http.js';
import { sql } from './_lib/db.js';

export default route({
  async GET(req, res) {
    const rows = await sql(
      `SELECT id, title, event_date, start_time, end_time, venue, city FROM events
        WHERE website AND event_date IS NOT NULL AND status IN ('confirmed','done','open')
        ORDER BY event_date`);
    const events = rows.map((e) => {
      const name = e.venue || e.title || 'Performance';
      const loc = e.city ? `${e.city}, CA` : '';
      const time = [e.start_time, e.end_time].filter(Boolean).join(' – ') || null;
      return { id: e.id, name: { en: name, es: name }, date: e.event_date, time, location: { en: loc, es: loc } };
    });
    ok(res, { events }, { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600' });
  },
});
