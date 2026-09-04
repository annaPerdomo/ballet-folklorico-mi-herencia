// Calendar feeds for dancers. Times are stored as free text ("6:00 PM", "18:30") against a plain
// date, so everything is resolved in America/Los_Angeles and emitted as UTC — no VTIMEZONE needed.

import crypto from 'node:crypto';
import { siteUrl } from './notify.js';

const DEFAULT_HOURS = 2;

export function parseTime(s) {
  const m = /^\s*(\d{1,2})(?::(\d{2}))?\s*([ap])?\.?m?\.?/i.exec(String(s || ''));
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  if (h > 23 || min > 59) return null;
  const half = m[3] && m[3].toLowerCase();
  if (half === 'p' && h < 12) h += 12;
  if (half === 'a' && h === 12) h = 0;
  return { h, m: min };
}

// Second Sunday in March through the first Sunday in November.
function nthSunday(year, month, n) {
  const first = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  return 1 + ((7 - first) % 7) + (n - 1) * 7;
}
export function ptOffset(y, mo, d) {
  if (mo < 3 || mo > 11) return 8;
  if (mo > 3 && mo < 11) return 7;
  if (mo === 3) return d >= nthSunday(y, 3, 2) ? 7 : 8;
  return d < nthSunday(y, 11, 1) ? 7 : 8;
}

const pad = (n) => String(n).padStart(2, '0');

function utcMs(dateStr, time) {
  const [y, mo, d] = String(dateStr).split('-').map(Number);
  if (!y || !mo || !d) return null;
  const t = parseTime(time) || { h: 0, m: 0 };
  return Date.UTC(y, mo - 1, d, t.h + ptOffset(y, mo, d), t.m);
}

const stampOf = (ms) => {
  const dt = new Date(ms);
  return `${dt.getUTCFullYear()}${pad(dt.getUTCMonth() + 1)}${pad(dt.getUTCDate())}T${pad(dt.getUTCHours())}${pad(dt.getUTCMinutes())}00Z`;
};

export function utcStamp(dateStr, time) {
  const ms = utcMs(dateStr, time);
  return ms == null ? null : stampOf(ms);
}

// Added to the start instant, never to the parsed hour: a 10 PM call time has to roll into the
// next day rather than produce a "24:00" that parses back to midnight and ends before it starts.
export function utcStampPlus(dateStr, time, hours) {
  const ms = utcMs(dateStr, time);
  return ms == null ? null : stampOf(ms + hours * 3600000);
}

export const dateStamp = (dateStr, addDays = 0) => {
  const [y, mo, d] = String(dateStr).split('-').map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, d + addDays));
  return `${dt.getUTCFullYear()}${pad(dt.getUTCMonth() + 1)}${pad(dt.getUTCDate())}`;
};

export const esc = (s) => String(s == null ? '' : s)
  .replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

// RFC 5545 caps lines at 75 octets; continuations start with a single space.
export function fold(line) {
  const bytes = Buffer.from(line, 'utf8');
  if (bytes.length <= 75) return line;
  const out = []; let start = 0;
  while (start < bytes.length) {
    let end = Math.min(start + (out.length ? 74 : 75), bytes.length);
    while (end > start && end < bytes.length && (bytes[end] & 0xc0) === 0x80) end--;
    out.push((out.length ? ' ' : '') + bytes.slice(start, end).toString('utf8'));
    start = end;
  }
  return out.join('\r\n');
}

const now = () => new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

function block(lines) {
  return lines.filter(Boolean).map(fold).join('\r\n');
}

export function eventVevent(ev, { uidSuffix = '' } = {}) {
  if (!ev.event_date) return null;
  const where = [ev.venue, ev.address, ev.city].filter(Boolean).join(', ');
  const desc = [
    ev.call_time ? `Call time: ${ev.call_time}` : null,
    ev.dancers_needed ? `Dancers needed: ${ev.dancers_needed}` : null,
    ev.pay ? `Pay: ${ev.pay}` : null,
    ev.details || null,
    `${siteUrl()}/team/#event-${ev.id}`,
  ].filter(Boolean).join('\n');

  // The call time is when dancers must actually arrive, so it opens the calendar entry.
  const startText = ev.call_time || ev.start_time;
  const timed = Boolean(parseTime(startText));
  let dtstart, dtend;
  if (timed) {
    dtstart = `DTSTART:${utcStamp(ev.event_date, startText)}`;
    const endT = parseTime(ev.end_time);
    if (endT) {
      dtend = `DTEND:${utcStamp(ev.event_date, ev.end_time)}`;
    } else {
      dtend = `DTEND:${utcStampPlus(ev.event_date, startText, DEFAULT_HOURS)}`;
    }
  } else {
    dtstart = `DTSTART;VALUE=DATE:${dateStamp(ev.event_date)}`;
    dtend = `DTEND;VALUE=DATE:${dateStamp(ev.event_date, 1)}`;
  }

  const seq = ev.updated_at ? Math.floor(new Date(ev.updated_at).getTime() / 60000) % 2147483647 : 0;
  return block([
    'BEGIN:VEVENT',
    `UID:event-${ev.id}${uidSuffix}@bfmh.dance`,
    `DTSTAMP:${now()}`,
    `SEQUENCE:${seq}`,
    dtstart,
    dtend,
    `SUMMARY:${esc(ev.title || 'Performance')}`,
    where ? `LOCATION:${esc(where)}` : null,
    desc ? `DESCRIPTION:${esc(desc)}` : null,
    `STATUS:${ev.status === 'confirmed' ? 'CONFIRMED' : ev.status === 'cancelled' ? 'CANCELLED' : 'TENTATIVE'}`,
    `URL:${siteUrl()}/team/#event-${ev.id}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'TRIGGER:-P1D',
    `DESCRIPTION:${esc(ev.title || 'Performance')} is tomorrow`,
    'END:VALARM',
    'END:VEVENT',
  ]);
}

// Keyed off the rehearsal's own slot rather than its position: deleting the first of two must not
// hand its UID — and so its calendar entry — to the survivor on phones that already downloaded it.
const rehearsalUid = (ev, r) =>
  `event-${ev.id}-rehearsal-${crypto.createHash('sha1').update(`${r.date}T${r.time || ''}`).digest('hex').slice(0, 10)}`;

export function rehearsalVevents(ev) {
  return (ev.rehearsals || []).map((r) => {
    if (!r || !r.date) return null;
    const timed = Boolean(parseTime(r.time));
    const dtstart = timed ? `DTSTART:${utcStamp(r.date, r.time)}` : `DTSTART;VALUE=DATE:${dateStamp(r.date)}`;
    let dtend;
    if (timed) {
      dtend = `DTEND:${utcStampPlus(r.date, r.time, DEFAULT_HOURS)}`;
    } else {
      dtend = `DTEND;VALUE=DATE:${dateStamp(r.date, 1)}`;
    }
    return block([
      'BEGIN:VEVENT',
      `UID:${rehearsalUid(ev, r)}@bfmh.dance`,
      `DTSTAMP:${now()}`,
      dtstart,
      dtend,
      `SUMMARY:${esc(`Rehearsal — ${ev.title || 'Performance'}`)}`,
      r.location ? `LOCATION:${esc(r.location)}` : null,
      r.note ? `DESCRIPTION:${esc(r.note)}` : null,
      `URL:${siteUrl()}/team/#event-${ev.id}`,
      'END:VEVENT',
    ]);
  }).filter(Boolean);
}

// Single events must NOT carry X-WR-CALNAME or a refresh interval: Apple Calendar reads those as
// "make a new calendar" and spawns one per gig instead of using the user's default.
export function buildCalendar(events, { name = 'Ballet Folklórico Mi Herencia', rehearsals = true, feed = false } = {}) {
  const bodies = [];
  for (const ev of events) {
    const v = eventVevent(ev);
    if (v) bodies.push(v);
    if (rehearsals) bodies.push(...rehearsalVevents(ev));
  }
  return [
    block([
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Ballet Folklorico Mi Herencia//Team//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-TIMEZONE:America/Los_Angeles',
      feed ? `X-WR-CALNAME:${esc(name)}` : null,
      feed ? 'REFRESH-INTERVAL;VALUE=DURATION:PT12H' : null,
      feed ? 'X-PUBLISHED-TTL:PT12H' : null,
    ]),
    ...bodies,
    'END:VCALENDAR',
    '',
  ].join('\r\n');
}
