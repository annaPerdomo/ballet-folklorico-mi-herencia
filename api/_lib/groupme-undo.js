import { withSource } from './db.js';
import { httpError } from './http.js';

export async function undoMessage(messageId) {
  return withSource({ source: 'undo', actor: 'owner', messageId }, async (q) => {
    const [msg] = await q('SELECT * FROM groupme_messages WHERE id = $1 FOR UPDATE', [messageId]);
    if (!msg) throw httpError(404, 'Message not found');
    if (msg.undone_at) throw httpError(409, 'Already undone');

    const [lastUndo] = await q(
      `SELECT max(id) AS id FROM availability_history WHERE groupme_message_id = $1 AND source = 'undo'`,
      [messageId]);
    const sinceId = lastUndo.id || 0;
    const rows = await q(
      `SELECT * FROM availability_history WHERE groupme_message_id = $1 AND source = 'bot' AND id > $2 ORDER BY id`,
      [messageId, sinceId]);
    if (!rows.length) throw httpError(409, 'nothing to undo');

    const groups = new Map();
    for (const r of rows) {
      const key = `${r.event_id}:${r.dancer_id}`;
      const g = groups.get(key);
      if (!g) groups.set(key, { event_id: r.event_id, dancer_id: r.dancer_id, msgRows: [r], lastId: r.id });
      else { g.msgRows.push(r); g.lastId = r.id; }
    }
    const ordered = [...groups.values()].sort((a, b) => a.event_id - b.event_id || a.dancer_id - b.dancer_id);

    const restored = [];
    const skipped = [];
    for (const g of ordered) {
      const [dancer] = await q('SELECT name FROM dancers WHERE id = $1', [g.dancer_id]);
      if (!dancer) {
        skipped.push({ event_id: g.event_id, dancer_id: g.dancer_id, dancer_name: null, reason: 'dancer-deleted' });
        continue;
      }

      const [cur] = await q('SELECT * FROM availability WHERE event_id = $1 AND dancer_id = $2 FOR UPDATE', [g.event_id, g.dancer_id]);

      const changedSince = await q(
        'SELECT 1 FROM availability_history WHERE event_id = $1 AND dancer_id = $2 AND id > $3 LIMIT 1',
        [g.event_id, g.dancer_id, g.lastId]);
      if (changedSince.length) {
        skipped.push({ event_id: g.event_id, dancer_id: g.dancer_id, dancer_name: dancer.name, reason: 'changed-since' });
        continue;
      }

      // Fence: latest change to this pair that isn't this message's own bot write, so undo
      // never rolls back past something someone else did in between.
      const [fence] = await q(
        `SELECT max(id) AS id FROM availability_history
          WHERE event_id = $1 AND dancer_id = $2 AND id < $3 AND NOT (source = 'bot' AND groupme_message_id = $4)`,
        [g.event_id, g.dancer_id, g.lastId, messageId]);
      const before = g.msgRows.find((r) => r.id > (fence.id || 0)).old_row;

      const from = cur ? cur.status : null;
      if (!before) {
        if (cur) await q('DELETE FROM availability WHERE event_id = $1 AND dancer_id = $2', [g.event_id, g.dancer_id]);
        restored.push({ event_id: g.event_id, dancer_id: g.dancer_id, dancer_name: dancer.name, from, to: null });
      } else {
        await q(
          `INSERT INTO availability (event_id, dancer_id, status, note, self, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (event_id, dancer_id) DO UPDATE SET
             status = EXCLUDED.status, note = EXCLUDED.note, self = EXCLUDED.self, updated_at = EXCLUDED.updated_at`,
          [g.event_id, g.dancer_id, before.status, before.note, before.self, before.updated_at]);
        restored.push({ event_id: g.event_id, dancer_id: g.dancer_id, dancer_name: dancer.name, from, to: before.status });
      }
    }

    await q('UPDATE groupme_messages SET undone_at = now() WHERE id = $1', [messageId]);
    return { restored, skipped };
  });
}
