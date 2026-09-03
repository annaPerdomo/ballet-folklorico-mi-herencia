import { route, readJson, ok, bad, query, str } from '../_lib/http.js';
import { sql } from '../_lib/db.js';
import { ingestMessage } from '../_lib/groupme-ingest.js';
import { safeEqual } from '../_lib/auth.js';
import { postGroupMe, fmtDate, siteUrl } from '../_lib/notify.js';

// GroupMe posts every group message here. The bot's callback URL (dev.groupme.com/bots) must be
// <SITE_URL>/api/webhooks/groupme?secret=<GROUPME_WEBHOOK_SECRET>; GroupMe retries on non-2xx.

const MARK = { yes: '✓', maybe: '?', no: '✗' };
const short = (d) => fmtDate(d).replace(/, \d{4}$/, '');

function ackText(r) {
  const byEvent = new Map();
  for (const u of r.updates) {
    const k = u.event.id;
    if (!byEvent.has(k)) byEvent.set(k, { event: u.event, parts: [] });
    byEvent.get(k).parts.push(`${u.dancer.name.split(' ')[0]} ${MARK[u.status]}`);
  }
  const lines = [...byEvent.values()].sort((a, b) => String(a.event.event_date).localeCompare(String(b.event.event_date)))
    .map(({ event, parts }) => `${event.event_date ? short(event.event_date) : event.title}: ${[...new Set(parts)].join(' · ')}`);
  const head = r.eventGuessed ? '🤖 Noted (assumed the latest gig — say the date if you meant another):' : '🤖 Noted:';
  return `${head}\n${lines.join('\n')}\nAnotado. Cambiar / change: ${siteUrl()}/team/`;
}

export default route({
  async POST(req, res) {
    const secret = process.env.GROUPME_WEBHOOK_SECRET;
    if (!secret) return bad(res, 'GROUPME_WEBHOOK_SECRET is not set', 503);
    if (!safeEqual(query(req).secret || '', secret)) return bad(res, 'Forbidden', 403);
    const m = await readJson(req);
    const wantGroup = process.env.GROUPME_GROUP_ID;
    if (wantGroup && String(m.group_id) !== String(wantGroup)) return ok(res, { ignored: 'other-group' });
    const text = str(m.text, 2000);
    if (m.sender_type !== 'user' || !text) return ok(res, { ignored: 'not-a-user-message' });
    const messageId = m.id ? String(m.id) : `nomid:${m.user_id}:${m.created_at}`;
    // Claim before applying: GroupMe can deliver the same message twice.
    const claimed = await sql(
      `INSERT INTO groupme_messages (message_id, group_id, user_id, sender_name, text) VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (message_id) DO NOTHING RETURNING id`,
      [messageId, str(m.group_id, 40), str(m.user_id, 40), str(m.name, 120), text]);
    if (!claimed.length) return ok(res, { ignored: 'duplicate' });

    let r, applied = false, result, eventId = null;
    try {
      ({ parsed: r, applied, result, eventId } = await ingestMessage({ text, senderName: m.name, senderUserId: m.user_id, sentAt: m.created_at ? new Date(m.created_at * 1000) : null }));
    } catch (err) {
      console.error('groupme ingest', err);
      result = { reason: 'error', error: String(err.message || err) };
    }
    await sql('UPDATE groupme_messages SET applied = $2, result = $3, event_id = $4 WHERE id = $1', [claimed[0].id, applied, JSON.stringify(result), eventId]);

    if (applied && process.env.GROUPME_BOT_ACK !== '0') await postGroupMe(ackText(r));
    ok(res, { applied, ...result });
  },
});
