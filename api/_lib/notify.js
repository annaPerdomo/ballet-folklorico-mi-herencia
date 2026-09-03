
export const siteUrl = () => (process.env.SITE_URL || 'https://bfmh.dance').replace(/\/$/, '');

export function channels() {
  return { groupme: Boolean(process.env.GROUPME_BOT_ID), groupme_listen: Boolean(process.env.GROUPME_WEBHOOK_SECRET), email: Boolean(process.env.RESEND_API_KEY) };
}

export async function postGroupMe(text) {
  const bot_id = process.env.GROUPME_BOT_ID;
  if (!bot_id || !text) return false;
  try {
    const r = await fetch('https://api.groupme.com/v3/bots/post', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bot_id, text: text.slice(0, 990) }),
    });
    return r.ok;
  } catch (e) { console.error('groupme', e); return false; }
}

export async function sendEmail({ to, subject, text }) {
  const key = process.env.RESEND_API_KEY;
  const list = (Array.isArray(to) ? to : [to]).filter(Boolean);
  if (!key || !list.length) return false;
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.NOTIFY_FROM || 'Ballet Folklórico Mi Herencia <team@bfmh.dance>',
        to: list.slice(0, 50), subject, text,
      }),
    });
    return r.ok;
  } catch (e) { console.error('resend', e); return false; }
}

export function fmtDate(d) {
  if (!d) return 'Date TBD';
  const dt = typeof d === 'string' ? new Date(d + 'T12:00:00') : d;
  return dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

export function eventSummary(ev) {
  const lines = [
    `${ev.title || ev.event_type || 'Performance'} — ${fmtDate(ev.event_date)}`,
  ];
  const time = [ev.start_time, ev.end_time].filter(Boolean).join('–');
  if (time) lines.push(`Time: ${time}`);
  if (ev.call_time) lines.push(`Call time: ${ev.call_time}`);
  const where = [ev.venue, ev.address, ev.city].filter(Boolean).join(', ');
  if (where) lines.push(`Where: ${where}`);
  if (ev.dancers_needed) lines.push(`Dancers needed: ${ev.dancers_needed}`);
  if (ev.details) lines.push(ev.details);
  return lines.join('\n');
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const shortDate = (d) => fmtDate(d).replace(/, \d{4}$/, '');

// The question the bot posts in the group. Replies are read by api/webhooks/groupme.js, so the
// wording shows exactly the shapes the parser understands (name + yes/no/maybe, one gig per line).
export function askText(ev, { again = false } = {}) {
  const when = ev.event_date ? shortDate(ev.event_date) : (ev.date_text || 'date TBD');
  const where = [ev.venue, ev.city].filter(Boolean).join(', ');
  const head = again ? '🙋 Still looking for answers / Todavía faltan respuestas:' : '🙋 Who is available? / ¿Quién está disponible?';
  const lines = [head, `${ev.title || ev.event_type || 'Performance'} — ${when}${where ? ' · ' + where : ''}`];
  const time = [ev.start_time, ev.end_time].filter(Boolean).join('–');
  if (time) lines.push(`Time / Hora: ${time}`);
  if (ev.dancers_needed) lines.push(`Dancers needed / Bailarines: ${ev.dancers_needed}`);
  if (ev.details && !again) lines.push(ev.details.slice(0, 200));
  const d = ev.event_date ? shortDate(ev.event_date).replace(/^\w+, /, '') : when;
  const dEs = ev.event_date ? `el ${+ev.event_date.slice(8, 10)} de ${MESES[+ev.event_date.slice(5, 7) - 1]}` : 'para esa fecha';
  lines.push('', `Reply here with the dancer's name + yes / no / maybe, e.g. "Sofia yes for ${d}", "Mateo no puede ${dEs}", "we can go".`,
    `Responde aquí con el nombre + sí / no / tal vez. O marca en ${siteUrl()}/team/#event-${ev.id}`);
  return lines.join('\n');
}

export function tallyText(ev, roster) {
  const g = { yes: [], maybe: [], no: [], pending: [] };
  for (const f of roster) for (const d of f.dancers) g[d.status || 'pending'].push(d.name.split(' ')[0]);
  const line = (k, mark) => g[k].length ? `${mark} ${g[k].join(', ')}` : null;
  return [`📊 ${ev.title || 'Gig'} — ${shortDate(ev.event_date)}`, line('yes', '✓'), line('maybe', '?'), line('no', '✗'),
    g.pending.length ? `Waiting on / Faltan: ${g.pending.join(', ')}` : 'Everyone has answered / Ya respondieron todos 🎉'].filter(Boolean).join('\n');
}
