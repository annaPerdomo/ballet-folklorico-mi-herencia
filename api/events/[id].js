import { route, readJson, ok, query, int, httpError, str } from '../_lib/http.js';
import { whoami, requireAdmin } from '../_lib/auth.js';
import { sql } from '../_lib/db.js';
import { getEvent, updateEvent, rosterFor } from '../_lib/events.js';
import { cleanPatch } from '../events.js';
import { postGroupMe, sendEmail, eventSummary, siteUrl, fmtDate, askText, tallyText } from '../_lib/notify.js';

const TRANSITIONS = {
  publish:  { to: 'open',      from: ['inquiry', 'declined', 'cancelled', 'confirmed'] },
  confirm:  { to: 'confirmed', from: ['open', 'inquiry', 'cancelled'] },
  decline:  { to: 'declined',  from: ['inquiry', 'open'] },
  cancel:   { to: 'cancelled', from: ['open', 'confirmed'] },
  done:     { to: 'done',      from: ['confirmed', 'open'] },
  reopen:   { to: 'inquiry',   from: ['declined', 'cancelled', 'done'] },
};

function teamLink(id) { return `${siteUrl()}/team/#event-${id}`; }

async function notifyPublish(ev) {
  const text = `📣 New gig: are you available?\n${eventSummary(ev)}\n\nMark your availability: ${teamLink(ev.id)}`;
  const fams = await sql('SELECT email FROM families WHERE email IS NOT NULL');
  const [g, m] = await Promise.all([
    postGroupMe(text),
    sendEmail({ to: fams.map((f) => f.email), subject: `Are you available? ${ev.title} · ${fmtDate(ev.event_date)}`, text }),
  ]);
  return { groupme: g, email: m };
}

async function notifyConfirm(ev) {
  const roster = await rosterFor(ev.id);
  const going = roster.filter((f) => f.dancers.some((d) => d.status === 'yes'));
  const names = going.flatMap((f) => f.dancers.filter((d) => d.status === 'yes').map((d) => d.name));
  const reh = (ev.rehearsals || []).map((r) => `• ${fmtDate(r.date)}${r.time ? ' ' + r.time : ''}${r.location ? ' @ ' + r.location : ''}${r.note ? ' — ' + r.note : ''}`).join('\n');
  const text = `✅ CONFIRMED: ${eventSummary(ev)}` +
    (names.length ? `\n\nDancers: ${names.join(', ')}` : '') +
    (reh ? `\n\nRehearsals:\n${reh}` : '') +
    `\n\nDetails: ${teamLink(ev.id)}`;
  const [g, m] = await Promise.all([
    postGroupMe(text),
    sendEmail({ to: going.map((f) => f.email), subject: `Confirmed: ${ev.title} · ${fmtDate(ev.event_date)}`, text }),
  ]);
  return { groupme: g, email: m };
}

export function reminderText(ev, roster) {
  const missing = [];
  for (const f of roster) for (const d of f.dancers) if (!d.status) missing.push(d.name);
  const head = `⏰ Reminder — ${ev.title} on ${fmtDate(ev.event_date)}.`;
  if (!missing.length) return `${head} Everyone has answered, thank you!`;
  return `${head} Still need an answer from: ${missing.join(', ')}.\n${teamLink(ev.id)}`;
}

export default route({
  async GET(req, res) {
    const me = await whoami(req);
    if (me.role === 'anon') throw httpError(401, 'Sign in required');
    const id = int(query(req).id);
    const ev = await getEvent(id, { admin: me.role === 'admin' });
    if (!ev) throw httpError(404, 'Not found');
    if (me.role !== 'admin' && !['open', 'confirmed', 'done'].includes(ev.status)) throw httpError(404, 'Not found');
    const roster = me.role === 'admin' ? await rosterFor(id) : undefined;
    ok(res, { event: ev, roster });
  },
  async PATCH(req, res) {
    await requireAdmin(req);
    const id = int(query(req).id);
    const body = await readJson(req);
    const current = await getEvent(id, { admin: true });
    if (!current) throw httpError(404, 'Not found');

    const patch = cleanPatch(body);
    if (Object.keys(patch).length) await updateEvent(id, patch);
    if (typeof body.website === 'boolean') await sql('UPDATE events SET website = $2, updated_at = now() WHERE id = $1', [id, body.website]);

    let notified = null;
    const action = str(body.action, 20);
    if (action === 'remind') {
      const ev = await getEvent(id, { admin: true });
      const text = reminderText(ev, await rosterFor(id));
      notified = { groupme: await postGroupMe(text), text };
    } else if (action === 'ask') {
      // One tap from the inbox: open the gig (so replies have something to land on) and have the bot ask the group.
      if (!['inquiry', 'open', 'confirmed'].includes(current.status)) throw httpError(400, `Cannot ask about an event that is ${current.status}`);
      if (current.status === 'inquiry') await sql(`UPDATE events SET status = 'open', published_at = COALESCE(published_at, now()), updated_at = now() WHERE id = $1`, [id]);
      const text = askText(await getEvent(id, { admin: true }), { again: current.ask_count > 0 });
      const posted = await postGroupMe(text);
      if (posted) await sql('UPDATE events SET asked_at = now(), ask_count = ask_count + 1, updated_at = now() WHERE id = $1', [id]);
      notified = { groupme: posted, text };
    } else if (action === 'tally') {
      const ev = await getEvent(id, { admin: true });
      const text = tallyText(ev, await rosterFor(id));
      notified = { groupme: await postGroupMe(text), text };
    } else if (action) {
      const t = TRANSITIONS[action];
      if (!t) throw httpError(400, 'Unknown action');
      if (!t.from.includes(current.status) && current.status !== t.to) throw httpError(400, `Cannot ${action} an event that is ${current.status}`);
      const stamp = t.to === 'open' ? 'published_at = COALESCE(published_at, now()),' : t.to === 'confirmed' ? 'confirmed_at = now(),' : '';
      await sql(`UPDATE events SET status = $2, ${stamp} updated_at = now() WHERE id = $1`, [id, t.to]);
      const ev = await getEvent(id, { admin: true });
      if (body.notify !== false) {
        if (action === 'publish') notified = await notifyPublish(ev);
        if (action === 'confirm') notified = await notifyConfirm(ev);
      }
    }
    const ev = await getEvent(id, { admin: true });
    ok(res, { event: ev, roster: await rosterFor(id), notified });
  },
  async DELETE(req, res) {
    await requireAdmin(req);
    const id = int(query(req).id);
    await sql('DELETE FROM events WHERE id = $1', [id]);
    ok(res);
  },
});
