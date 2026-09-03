import { sql } from './db.js';
import { parseMessage } from './groupme-parse.js';
import { str } from './http.js';

export async function ingestMessage({ text, senderName, senderUserId, sentAt }) {
  const [dancers, families, events] = await Promise.all([
    sql('SELECT id, family_id, name, active FROM dancers WHERE active'),
    sql('SELECT id, name, groupme_user_id FROM families'),
    sql(`SELECT id, title, status, event_type, event_date, venue, city, client_name, published_at FROM events
          WHERE status IN ('open','confirmed') AND (event_date IS NULL OR event_date >= current_date - 1)`),
  ]);
  const r = parseMessage({ text, senderName, senderUserId }, { dancers, families, events });

  let applied = false; const skipped = [];
  if (r.updates.length) {
    const note = `via GroupMe (${str(senderName, 60) || 'unknown'}): ${text.slice(0, 160)}`;
    for (const u of r.updates) {
      // Re-reading an old message must not overwrite a newer answer.
      const row = await sql(
        `INSERT INTO availability (event_id, dancer_id, status, note) VALUES ($1,$2,$3,$4)
         ON CONFLICT (event_id, dancer_id) DO UPDATE SET status = EXCLUDED.status, note = EXCLUDED.note, updated_at = now()
         WHERE $5::timestamptz IS NULL OR availability.updated_at <= $5::timestamptz RETURNING dancer_id`,
        [u.event.id, u.dancer.id, u.status, note, sentAt || null]);
      if (row.length) applied = true; else skipped.push(u);
    }
    // Surname / first-name matches are guesses; linking on them would bind strangers to a family.
    if (applied && senderUserId && r.sender && r.sender.family && !r.sender.family.groupme_user_id && ['dancer-name', 'family-name'].includes(r.sender.how)) {
      await sql('UPDATE families SET groupme_user_id = $2 WHERE id = $1 AND groupme_user_id IS NULL', [r.sender.family.id, String(senderUserId)]);
    }
  }
  const eventIds = [...new Set(r.updates.map((u) => u.event.id))];
  const result = {
    intent: r.intent, reason: r.reason, event_guessed: r.eventGuessed,
    sender: r.sender ? { how: r.sender.how, family_id: r.sender.family?.id || null, dancer_id: r.sender.dancer?.id || null } : null,
    updates: r.updates.filter((u) => !skipped.includes(u)).map((u) => ({ dancer_id: u.dancer.id, dancer_name: u.dancer.name, event_id: u.event.id, event_date: u.event.event_date, event_title: u.event.title, status: u.status })),
    skipped: skipped.map((u) => ({ dancer_name: u.dancer.name, event_date: u.event.event_date })),
    ambiguous: r.ambiguous,
  };
  return { parsed: r, applied, result, eventId: eventIds.length === 1 ? eventIds[0] : null };
}
