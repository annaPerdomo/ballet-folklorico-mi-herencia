import { route, ok } from './_lib/http.js';
import { sql } from './_lib/db.js';
import { storageReady, signedUrl } from './_lib/storage.js';
import { youtubeId } from './_lib/media.js';

// Public: no uploader names. Signed links outlive the CDN cache below by hours.
function publicItem(m) {
  const base = { id: m.id, kind: m.kind, title: m.title || null, event_id: m.event_id, width: m.width, height: m.height };
  if (m.kind === 'link') {
    const yt = youtubeId(m.url);
    return yt ? { ...base, youtube: yt, url: m.url, thumb: `https://i.ytimg.com/vi/${yt}/hqdefault.jpg` } : null;
  }
  if (!storageReady()) return null;
  return { ...base, url: signedUrl('GET', m.storage_key), thumb: m.thumb_key ? signedUrl('GET', m.thumb_key) : null };
}

export default route({
  async GET(req, res) {
    const rows = await sql(
      `SELECT id, title, event_date, start_time, end_time, venue, city FROM events
        WHERE website AND event_date IS NOT NULL AND status IN ('confirmed','done','open')
        ORDER BY event_date`);
    const media = (await sql(
      `SELECT m.id, m.kind, m.title, m.url, m.storage_key, m.thumb_key, m.width, m.height, m.event_id
         FROM media m JOIN events e ON e.id = m.event_id
        WHERE m.website AND m.ready AND m.kind IN ('photo','video','link') AND e.status IN ('confirmed','done','open','folder')
        ORDER BY e.event_date DESC NULLS LAST, m.created_at DESC LIMIT 200`)).map(publicItem).filter(Boolean);
    const byEvent = {};
    media.forEach((m) => { (byEvent[m.event_id] = byEvent[m.event_id] || []).push(m); });

    const events = rows.map((e) => {
      const name = e.title || e.venue || 'Performance';
      const loc = e.city ? `${e.city}, CA` : '';
      const time = [e.start_time, e.end_time].filter(Boolean).join(' – ') || null;
      return {
        id: e.id, name: { en: name, es: name }, date: e.event_date, time, location: { en: loc, es: loc },
        venue: e.venue || null, city: e.city || null, startTime: e.start_time || null, endTime: e.end_time || null,
        media: byEvent[e.id] || [],
      };
    });
    ok(res, { events, media }, { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600' });
  },
});
