
import { calendarSig } from './auth.js';

export const siteUrl = () => (process.env.SITE_URL || 'https://bfmh.dance').replace(/\/$/, '');

export function channels() {
  return { groupme: Boolean(process.env.GROUPME_BOT_ID), groupme_listen: Boolean(process.env.GROUPME_WEBHOOK_SECRET) };
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

export function fmtDate(d) {
  if (!d) return 'Date TBD';
  const dt = typeof d === 'string' ? new Date(d + 'T12:00:00') : d;
  return dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

// Opens the gig in the team app with the "which calendar?" sheet up (Apple / Google / Outlook),
// signed so it works without signing in.
export function calLink(ev) {
  if (!ev || !ev.id || !ev.event_date) return null;
  return `${siteUrl()}/team/?e=${ev.id}&s=${calendarSig(ev.id)}&cal=1`;
}
export const CAL_LABEL = '📅 Add to my calendar / Agregar a mi calendario';
export const UNCAL_LABEL = '🗓 Remove from my calendar / Quitar de mi calendario';

export const eventWhere = (ev) => [ev.venue, ev.address, ev.city].filter(Boolean).join(', ');

// GroupMe auto-links URLs, so a Google Maps search opens the map app on either phone.
export function mapLink(ev) {
  const where = eventWhere(ev);
  return where ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(where)}` : null;
}

export function eventSummary(ev) {
  const lines = [
    `${ev.title || ev.event_type || 'Performance'} — ${fmtDate(ev.event_date)}`,
  ];
  const time = [ev.start_time, ev.end_time].filter(Boolean).join('–');
  if (time) lines.push(`Time: ${time}`);
  if (ev.call_time) lines.push(`⏰ Call time / Hora de llegada: ${ev.call_time}`);
  const where = eventWhere(ev);
  if (where) lines.push(`📍 Where: ${where}`, `🗺 ${mapLink(ev)}`);
  if (ev.dancers_needed) lines.push(`Dancers needed: ${ev.dancers_needed}`);
  if (ev.details) lines.push(ev.details);
  return lines.join('\n');
}

const shortDate = (d) => fmtDate(d).replace(/, \d{4}$/, '');

// The sample reply must stay in a shape api/_lib/groupme-parse.js understands.
export function askText(ev, { again = false } = {}) {
  const when = ev.event_date ? shortDate(ev.event_date) : (ev.date_text || 'date TBD');
  const where = eventWhere(ev);
  const time = [ev.start_time, ev.end_time].filter(Boolean).join('–');
  const d = ev.event_date ? shortDate(ev.event_date).replace(/^\w+, /, '') : 'that day';
  const cal = calLink(ev);
  return [
    again ? '📢 Friendly reminder! Who else can join us for this one?' : '📢 New gig request received! Who can join us for this one?',
    ev.title || ev.event_type || 'Performance',
    [when, time].filter(Boolean).join(' · '),
    ev.call_time ? `⏰ Call time / Hora de llegada: ${ev.call_time}` : null,
    where ? `📍 ${where}` : null,
    where ? `🗺 ${mapLink(ev)}` : null,
    '',
    `Reply "Sofia yes for ${d}" or "we can't".`,
    `Or tap / O toca: ${siteUrl()}/team/?e=${ev.id}&s=${calendarSig(ev.id)}`,
    cal ? `${CAL_LABEL}: ${cal}` : null,
  ].filter((l) => l !== null).join('\n');
}

export function tallyText(ev, roster) {
  const g = { yes: [], maybe: [], no: [], pending: [] };
  for (const f of roster) for (const d of f.dancers) g[d.status || 'pending'].push(d.name.split(' ')[0]);
  const line = (k, mark) => g[k].length ? `${mark} ${g[k].join(', ')}` : null;
  return [`📊 ${ev.title || 'Gig'} — ${shortDate(ev.event_date)}`, line('yes', '✓'), line('maybe', '?'), line('no', '✗'),
    g.pending.length ? `Waiting on: ${g.pending.join(', ')}` : 'Everyone answered 🎉'].filter(Boolean).join('\n');
}
