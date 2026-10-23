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

// Client gigs never name the client: only the kind of event and the city.
const PRIVATE_LABEL = {
  quinceanera: { en: 'Quinceañera', es: 'Quinceañera', ja: 'キンセアニェーラ', zh: '成年礼', zht: '成年禮' },
  wedding: { en: 'Wedding celebration', es: 'Celebración de boda', ja: '結婚式のお祝い', zh: '婚礼庆典', zht: '婚禮慶典' },
  private: { en: 'Private celebration', es: 'Celebración privada', ja: 'プライベートなお祝い', zh: '私人庆祝活动', zht: '私人慶祝活動' },
};
const PERFORMANCE = { en: 'Performance', es: 'Presentación', ja: 'パフォーマンス', zh: '演出', zht: '演出' };
// Inquiry titles read "<Type> for <client name>" (api/_lib/inquiry.js), so an unrenamed one names the client.
const INQUIRY_TITLE = /^(inquiry|cultural festival|quinceañera|wedding|private event|corporate event|school assembly|classes)( for |$)/i;

const TODAY = `(now() AT TIME ZONE 'America/Los_Angeles')::date`;
const HISTORY = `status IN ('confirmed','done') AND event_date < ${TODAY} AND coalesce(event_type, '') NOT IN ('team', 'school')`;

function untrustedTitle(e) {
  const t = e.title || '';
  return INQUIRY_TITLE.test(t) || Boolean(e.client_name && t.toLowerCase().includes(e.client_name.toLowerCase()));
}

function publicName(e) {
  if (e.website) return e.title || e.venue || 'Performance';
  if (PRIVATE_LABEL[e.event_type]) return PRIVATE_LABEL[e.event_type];
  if (untrustedTitle(e)) return e.venue || PERFORMANCE;
  return e.title || e.venue || PERFORMANCE;
}

export default route({
  async GET(req, res) {
    const rows = await sql(
      `SELECT id, title, event_type, website, client_name, event_date, start_time, end_time, venue, city FROM events
        WHERE event_date IS NOT NULL AND (website AND status IN ('confirmed','done','open') OR ${HISTORY})
        ORDER BY event_date`);
    const media = (await sql(
      `SELECT m.id, m.kind, m.title, m.url, m.storage_key, m.thumb_key, m.width, m.height, m.event_id
         FROM media m JOIN events e ON e.id = m.event_id
        WHERE m.website AND m.ready AND m.kind IN ('photo','video','link') AND e.status IN ('confirmed','done','open','folder')
        ORDER BY e.event_date DESC NULLS LAST, m.created_at DESC LIMIT 200`)).map(publicItem).filter(Boolean);
    const byEvent = {};
    media.forEach((m) => { (byEvent[m.event_id] = byEvent[m.event_id] || []).push(m); });

    const events = rows.map((e) => {
      const n = publicName(e);
      const name = typeof n === 'string' ? { en: n, es: n } : n;
      const hideVenue = !e.website && PRIVATE_LABEL[e.event_type];
      const loc = e.city ? `${e.city}, CA` : '';
      const time = [e.start_time, e.end_time].filter(Boolean).join(' – ') || null;
      return {
        id: e.id, listed: e.website, name, date: e.event_date, time, location: { en: loc, es: loc },
        venue: hideVenue ? null : e.venue || null, city: e.city || null, startTime: e.start_time || null, endTime: e.end_time || null,
        media: byEvent[e.id] || [],
      };
    });
    ok(res, { events, media }, { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600' });
  },
});
