import { sql } from './db.js';
import { parseMessage } from './groupme-parse.js';
import { str } from './http.js';

export async function ingestMessage({ text, senderName, senderUserId, sentAt }) {
  const [dancers, families, events] = await Promise.all([
    sql('SELECT id, family_id, name, active, groupme_user_id FROM dancers'),
    sql('SELECT id, name, groupme_user_id FROM families'),
    sql(`SELECT id, title, status, event_type, event_date, venue, city, client_name, published_at, asked_at FROM events
          WHERE status IN ('open','confirmed') AND (event_date IS NULL OR event_date >= current_date - 1)`),
  ]);
  const r = parseMessage({ text, senderName, senderUserId }, { dancers, families, events });

  let applied = false; const skipped = []; const changed = [];
  if (r.updates.length) {
    const note = `via GroupMe (${str(senderName, 60) || 'unknown'}): ${text.slice(0, 160)}`;
    for (const u of r.updates) {
      // Re-reading an old message must not overwrite a newer answer, and a parent's unnamed
      // "we can't" must not overwrite what a dancer on their own account already said.
      const keepSelf = u.wholeFamily && Boolean(u.dancer.groupme_user_id);
      const row = await sql(
        `WITH old AS (SELECT status FROM availability WHERE event_id = $1 AND dancer_id = $2)
         INSERT INTO availability (event_id, dancer_id, status, note, self) VALUES ($1,$2,$3,$4,$6)
         ON CONFLICT (event_id, dancer_id) DO UPDATE SET status = EXCLUDED.status, note = EXCLUDED.note, self = EXCLUDED.self, updated_at = now()
         WHERE ($5::timestamptz IS NULL OR availability.updated_at <= $5::timestamptz) AND NOT ($7::boolean AND availability.self)
         RETURNING dancer_id, (SELECT status FROM old) AS was`,
        [u.event.id, u.dancer.id, u.status, note, sentAt || null, u.self, keepSelf]);
      if (!row.length) { skipped.push(u); continue; }
      applied = true;
      if (row[0].was !== u.status) changed.push(u);
    }
    // Surname / first-name matches are guesses; linking on them would bind strangers to a family.
    // An unlinked family's full-name match may be a parent who dances, so only a one-dancer family is linked.
    const uid = senderUserId ? String(senderUserId) : null;
    const fam = r.sender && r.sender.family;
    const famSize = fam ? dancers.filter((d) => d.family_id === fam.id && d.active).length : 0;
    let linkDancer = null; let linkFamily = null;
    if (applied && uid && fam && !fam.groupme_user_id && (r.sender.how === 'family-name' || (r.sender.how === 'dancer-name' && famSize === 1))) linkFamily = fam.id;
    else if (applied && uid && fam && fam.groupme_user_id && r.sender.how === 'dancer-name') linkDancer = r.sender.dancer.id;
    const unclaimed = 'NOT EXISTS (SELECT 1 FROM dancers WHERE groupme_user_id = $2) AND NOT EXISTS (SELECT 1 FROM families WHERE groupme_user_id = $2)';
    if (linkDancer) await sql(`UPDATE dancers SET groupme_user_id = $2 WHERE id = $1 AND groupme_user_id IS NULL AND ${unclaimed}`, [linkDancer, uid]);
    if (linkFamily) await sql(`UPDATE families SET groupme_user_id = $2 WHERE id = $1 AND groupme_user_id IS NULL AND ${unclaimed}`, [linkFamily, uid]);
  }
  const eventIds = [...new Set(r.updates.map((u) => u.event.id))];
  const result = {
    intent: r.intent, reason: r.reason || (r.updates.length && !applied ? 'kept-existing' : null), event_guessed: r.eventGuessed,
    sender: r.sender ? { how: r.sender.how, family_id: r.sender.family?.id || null, dancer_id: r.sender.dancer?.id || null } : null,
    updates: r.updates.filter((u) => !skipped.includes(u)).map((u) => ({ dancer_id: u.dancer.id, dancer_name: u.dancer.name, event_id: u.event.id, event_date: u.event.event_date, event_title: u.event.title, status: u.status })),
    skipped: skipped.map((u) => ({ dancer_name: u.dancer.name, event_date: u.event.event_date })),
    ambiguous: r.ambiguous,
  };
  return { parsed: r, applied, changed, result, eventId: eventIds.length === 1 ? eventIds[0] : null };
}
