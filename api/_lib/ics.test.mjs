import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTime, ptOffset, utcStamp, utcStampPlus, esc, fold, eventSpan, eventVevent, rehearsalVevents, googleEventUrl, outlookEventUrl } from './ics.js';

const lines = (s) => s.split('\r\n');
const val = (s, key) => lines(s).find((l) => l.startsWith(key + ':'))?.slice(key.length + 1);

test('parseTime reads the free-text times the owners actually type', () => {
  assert.deepEqual(parseTime('6:00 PM'), { h: 18, m: 0 });
  assert.deepEqual(parseTime('6pm'), { h: 18, m: 0 });
  assert.deepEqual(parseTime('12:15 AM'), { h: 0, m: 15 });
  assert.deepEqual(parseTime('12 pm'), { h: 12, m: 0 });
  assert.deepEqual(parseTime('18:30'), { h: 18, m: 30 });
  assert.equal(parseTime('24:00'), null);
  assert.equal(parseTime('whenever'), null);
});

test('ptOffset switches on the US DST Sundays', () => {
  assert.equal(ptOffset(2026, 1, 15), 8);
  assert.equal(ptOffset(2026, 3, 7), 8);
  assert.equal(ptOffset(2026, 3, 8), 7);
  assert.equal(ptOffset(2026, 7, 4), 7);
  assert.equal(ptOffset(2026, 11, 1), 8);
  assert.equal(ptOffset(2026, 10, 31), 7);
});

test('utcStampPlus rolls past midnight instead of wrapping to the same morning', () => {
  assert.equal(utcStamp('2026-11-04', '10:00 PM'), '20261105T060000Z');
  assert.equal(utcStampPlus('2026-11-04', '10:00 PM', 2), '20261105T080000Z');
  assert.equal(utcStampPlus('2026-07-04', '6:00 PM', 2), '20260705T030000Z');
});

test('a late-night gig with no end time still ends after it starts', () => {
  const v = eventVevent({ id: 42, title: 'Quinceañera', event_date: '2026-11-04', call_time: '10:00 PM', status: 'confirmed' });
  assert.ok(val(v, 'DTEND') > val(v, 'DTSTART'), `${val(v, 'DTSTART')} .. ${val(v, 'DTEND')}`);
});

test('an all-day gig spans exactly one day', () => {
  const v = eventVevent({ id: 7, title: 'Festival', event_date: '2026-05-05', status: 'open' });
  assert.ok(lines(v).includes('DTSTART;VALUE=DATE:20260505'));
  assert.ok(lines(v).includes('DTEND;VALUE=DATE:20260506'));
});

test('rehearsal UIDs follow the rehearsal, not its position in the list', () => {
  const two = { id: 5, title: 'Gig', rehearsals: [{ date: '2026-09-01', time: '6pm' }, { date: '2026-09-08', time: '6pm' }] };
  const one = { id: 5, title: 'Gig', rehearsals: [{ date: '2026-09-08', time: '6pm' }] };
  const uid = (v) => val(v, 'UID');
  assert.equal(uid(rehearsalVevents(two)[1]), uid(rehearsalVevents(one)[0]));
  assert.notEqual(uid(rehearsalVevents(two)[0]), uid(rehearsalVevents(two)[1]));
});

test('esc and fold keep RFC 5545 happy', () => {
  assert.equal(esc('a, b; c\\d\ne'), 'a\\, b\\; c\\\\d\\ne');
  const folded = fold('DESCRIPTION:' + 'ñ'.repeat(90));
  for (const l of lines(folded)) assert.ok(Buffer.byteLength(l, 'utf8') <= 75);
  assert.equal(lines(folded).slice(1).every((l) => l.startsWith(' ')), true);
  assert.equal(lines(folded).map((l, i) => (i ? l.slice(1) : l)).join(''), 'DESCRIPTION:' + 'ñ'.repeat(90));
});

test('eventSpan needs a date, and only goes timed when the call time parses', () => {
  assert.equal(eventSpan({ id: 1, call_time: '6pm' }), null);
  assert.deepEqual(eventSpan({ id: 1, event_date: '2026-05-05', call_time: 'whenever' }), { timed: false, start: '20260505', end: '20260506' });
  assert.deepEqual(eventSpan({ id: 1, event_date: '2026-05-05', call_time: '6pm', end_time: '8pm' }),
    { timed: true, start: '20260506T010000Z', end: '20260506T030000Z' });
});

test('Google and Outlook links carry the span with an exclusive all-day end', () => {
  const allDay = { id: 7, title: 'Festival', event_date: '2026-05-05', venue: 'Plaza', city: 'Salinas' };
  const g = new URL(googleEventUrl(allDay));
  assert.equal(g.searchParams.get('dates'), '20260505/20260506');
  assert.equal(g.searchParams.get('ctz'), 'America/Los_Angeles');
  assert.equal(g.searchParams.get('location'), 'Plaza, Salinas');
  const o = new URL(outlookEventUrl(allDay));
  assert.equal(o.searchParams.get('allday'), 'true');
  assert.equal(o.searchParams.get('startdt'), '2026-05-05');
  assert.equal(o.searchParams.get('enddt'), '2026-05-06');

  const timed = { id: 8, title: 'Boda, Salinas & Co', event_date: '2026-07-04', call_time: '6:00 PM' };
  assert.equal(new URL(googleEventUrl(timed)).searchParams.get('dates'), '20260705T010000Z/20260705T030000Z');
  const ot = new URL(outlookEventUrl(timed));
  assert.equal(ot.searchParams.get('allday'), null);
  assert.equal(ot.searchParams.get('startdt'), '2026-07-05T01:00:00Z');
  assert.equal(ot.searchParams.get('subject'), 'Boda, Salinas & Co');
  assert.equal(googleEventUrl({ id: 9, title: 'No date' }), null);
});
