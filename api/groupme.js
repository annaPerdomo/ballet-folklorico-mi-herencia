import { route, ok, query, int, readJson, httpError } from './_lib/http.js';
import { one } from './_lib/db.js';
import { ingestMessage, recordIngest } from './_lib/groupme-ingest.js';
import { undoMessage } from './_lib/groupme-undo.js';
import { requireAdmin } from './_lib/auth.js';
import { sql } from './_lib/db.js';

export default route({
  async GET(req, res) {
    await requireAdmin(req);
    const limit = Math.min(int(query(req).limit) || 40, 200);
    const messages = await sql(
      `SELECT g.id, g.message_id, g.user_id, g.sender_name, g.text, g.event_id, e.title AS event_title, e.event_date, g.applied, g.result, g.created_at, g.undone_at,
              (g.undone_at IS NULL AND EXISTS (
                 SELECT 1 FROM availability_history h
                  WHERE h.groupme_message_id = g.id AND h.source = 'bot'
                    AND h.id > COALESCE((SELECT max(id) FROM availability_history WHERE groupme_message_id = g.id AND source = 'undo'), 0)
               )) AS undoable
         FROM groupme_messages g LEFT JOIN events e ON e.id = g.event_id
        ORDER BY g.id DESC LIMIT $1`, [limit]);
    ok(res, { messages });
  },
  async POST(req, res) {
    await requireAdmin(req);
    const b = await readJson(req);
    if (b.action === 'undo') {
      const result = await undoMessage(int(b.id));
      return ok(res, result);
    }
    const row = await one('SELECT * FROM groupme_messages WHERE id = $1', [int(b.id)]);
    if (!row) throw httpError(404, 'Message not found');
    const { applied, result, eventId } = await ingestMessage({ text: row.text, senderName: row.sender_name, senderUserId: row.user_id, sentAt: row.created_at, messageId: row.id });
    await recordIngest(row.id, { applied, result, eventId });
    ok(res, { applied, ...result });
  },
});
