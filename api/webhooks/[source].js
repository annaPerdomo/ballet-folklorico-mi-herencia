import { route, readJson, ok, bad, query, str } from '../_lib/http.js';
import { sql } from '../_lib/db.js';
import { recordInquiry } from '../_lib/inquiry.js';
import { ingestMessage, recordIngest } from '../_lib/groupme-ingest.js';
import { safeEqual } from '../_lib/auth.js';

/* Both webhooks share one function to stay under the 12-function limit on the Hobby plan; the
   public URLs are unchanged. GroupMe's bot callback must stay
   <SITE_URL>/api/webhooks/groupme?secret=<GROUPME_WEBHOOK_SECRET>; GroupMe retries on non-2xx. */

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

  // Answers are recorded silently: a reply in the chat would notify the whole group.
  let applied = false, result, eventId = null;
  try {
    ({ applied, result, eventId } = await ingestMessage({ text, senderName: m.name, senderUserId: m.user_id, sentAt: m.created_at ? new Date(m.created_at * 1000) : null, messageId: claimed[0].id }));
  } catch (err) {
    console.error('groupme ingest', err);
    result = { reason: 'error', error: String(err.message || err) };
  }
  await recordIngest(claimed[0].id, { applied, result, eventId });

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
