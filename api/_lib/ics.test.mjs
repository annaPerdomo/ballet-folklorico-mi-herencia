import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTime, ptOffset, utcStamp, utcStampPlus, esc, fold, eventVevent, rehearsalVevents } from './ics.js';

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
