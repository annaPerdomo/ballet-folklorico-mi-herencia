import { route, readJson, ok, bad, query, str } from '../_lib/http.js';
import { sql } from '../_lib/db.js';
import { recordInquiry } from '../_lib/inquiry.js';
import { ingestMessage } from '../_lib/groupme-ingest.js';
import { safeEqual } from '../_lib/auth.js';
import { postGroupMe, fmtDate, siteUrl } from '../_lib/notify.js';

/* Both webhooks share one function to stay under the 12-function limit on the Hobby plan; the
   public URLs are unchanged. GroupMe's bot callback must stay
   <SITE_URL>/api/webhooks/groupme?secret=<GROUPME_WEBHOOK_SECRET>; GroupMe retries on non-2xx. */

const MARK = { yes: '✓', maybe: '?', no: '✗' };
const short = (d) => fmtDate(d).replace(/, \d{4}$/, '');

// Short on purpose: it lands in a busy parent chat. Only answers that changed something are echoed.
function ackText(updates) {
  const byEvent = new Map();
  for (const u of updates) {
    const k = u.event.id;
    if (!byEvent.has(k)) byEvent.set(k, { event: u.event, parts: [] });
    byEvent.get(k).parts.push(`${u.dancer.name.split(' ')[0]} ${MARK[u.status]}`);
  }
  const lines = [...byEvent.values()].sort((a, b) => String(a.event.event_date).localeCompare(String(b.event.event_date)))
    .map(({ event, parts }) => `${event.event_date ? short(event.event_date) : event.title}: ${[...new Set(parts)].join(' · ')}`);
  return `🤖 Noted / Anotado:\n${lines.join('\n')}\nChange / cambiar: ${siteUrl()}/team/`;
}

// Formspree's body is { form, submission: { _id, ...fields } } on some plans and flat on others.
async function formspree(req, res) {
  const secret = process.env.FORMSPREE_WEBHOOK_SECRET;
  if (secret && query(req).secret !== secret) return bad(res, 'Forbidden', 403);
  const body = await readJson(req);
  const fields = body.submission || body.data || body;
  const ref = fields._id || body.id || body.submission_id || null;
  const result = await recordInquiry(fields, { source: 'formspree', sourceRef: ref ? `formspree:${ref}` : null, raw: body });
  ok(res, result);
}

async function groupme(req, res) {
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

  let applied = false, changed = [], result, eventId = null;
  try {
    ({ applied, changed, result, eventId } = await ingestMessage({ text, senderName: m.name, senderUserId: m.user_id, sentAt: m.created_at ? new Date(m.created_at * 1000) : null }));
  } catch (err) {
    console.error('groupme ingest', err);
    result = { reason: 'error', error: String(err.message || err) };
  }
  await sql('UPDATE groupme_messages SET applied = $2, result = $3, event_id = $4 WHERE id = $1', [claimed[0].id, applied, JSON.stringify(result), eventId]);

  if (changed.length && process.env.GROUPME_BOT_ACK !== '0') await postGroupMe(ackText(changed));
  ok(res, { applied, ...result });
}

const SOURCES = { formspree, groupme };

export default route({
  async POST(req, res) {
    const fn = SOURCES[query(req).source];
    if (!fn) return bad(res, 'Unknown webhook source', 404);
    await fn(req, res);
  },
});
