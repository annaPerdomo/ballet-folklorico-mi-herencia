import { sql } from './db.js';
import { undoableSql } from './groupme-undo.js';

const NOISY_EVENT_COLUMNS = ['asked_at', 'ask_count'];

export async function eventChanges(eventId, limit = 50) {
  const [answers, gigs] = await Promise.all([
    sql(
      `SELECT h.id, h.changed_at, h.op, h.old_status, h.new_status, h.source, h.actor,
              d.name AS dancer_name,
              g.id AS message_id, g.sender_name AS message_sender_name, g.text AS message_text,
              ${undoableSql('g.id', 'g.undone_at')} AS message_undoable
         FROM availability_history h
         LEFT JOIN dancers d ON d.id = h.dancer_id
         LEFT JOIN groupme_messages g ON g.id = h.groupme_message_id
        WHERE h.event_id = $1
        ORDER BY h.id DESC
        LIMIT $2`,
      [eventId, limit]),
    sql(
      `SELECT h.id, h.changed_at, h.op, h.changed, h.source, h.actor
         FROM events_history h
        WHERE h.event_id = $1
          AND (h.op <> 'update' OR NOT (h.changed <@ $2::text[]))
        ORDER BY h.id DESC
        LIMIT $3`,
      [eventId, NOISY_EVENT_COLUMNS, limit]),
  ]);

  const changes = [
    ...answers.map((r) => ({
      kind: 'answer',
      id: r.id,
      changed_at: r.changed_at,
      dancer_name: r.dancer_name,
      old_status: r.old_status,
      new_status: r.new_status,
      op: r.op,
      source: r.source,
      actor: r.actor,
      message: r.message_id
        ? { id: r.message_id, sender_name: r.message_sender_name, text: r.message_text, undoable: r.message_undoable }
        : null,
    })),
    ...gigs.map((r) => ({
      kind: 'gig',
      id: r.id,
      changed_at: r.changed_at,
      op: r.op,
      changed: r.changed,
      source: r.source,
      actor: r.actor,
    })),
  ];

  changes.sort((a, b) => new Date(b.changed_at) - new Date(a.changed_at));
  return changes.slice(0, limit);
}
