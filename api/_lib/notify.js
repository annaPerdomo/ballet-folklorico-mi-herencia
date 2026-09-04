
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

const shortDate = (d) => fmtDate(d).replace(/, \d{4}$/, '');

// The sample reply must stay in a shape api/_lib/groupme-parse.js understands.
export function askText(ev, { again = false } = {}) {
  const when = ev.event_date ? shortDate(ev.event_date) : (ev.date_text || 'date TBD');
  const where = [ev.venue, ev.city].filter(Boolean).join(', ');
  const time = [ev.start_time, ev.end_time].filter(Boolean).join('–');
  const d = ev.event_date ? shortDate(ev.event_date).replace(/^\w+, /, '') : 'that day';
  return [
    `${again ? '🙋 Still need answers' : '🙋 Who can dance'}: ${ev.title || ev.event_type || 'Performance'}`,
    [when, time, where].filter(Boolean).join(' · '),
    `Reply "Sofia yes for ${d}" or "we can't".`,
  ].join('\n');
}

export function tallyText(ev, roster) {
  const g = { yes: [], maybe: [], no: [], pending: [] };
  for (const f of roster) for (const d of f.dancers) g[d.status || 'pending'].push(d.name.split(' ')[0]);
  const line = (k, mark) => g[k].length ? `${mark} ${g[k].join(', ')}` : null;
  return [`📊 ${ev.title || 'Gig'} — ${shortDate(ev.event_date)}`, line('yes', '✓'), line('maybe', '?'), line('no', '✗'),
    g.pending.length ? `Waiting on: ${g.pending.join(', ')}` : 'Everyone answered 🎉'].filter(Boolean).join('\n');
}
