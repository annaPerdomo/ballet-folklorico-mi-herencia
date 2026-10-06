import test from 'node:test';
import assert from 'node:assert/strict';

process.env.SESSION_SECRET ||= 'test-secret';
const { askText, eventSummary, mapLink } = await import('./notify.js');

const ev = { id: 5, title: 'Quinceañera — Lopez', event_date: '2026-10-24', start_time: '6:00 PM', end_time: '7:30 PM',
  call_time: '5:15 PM', venue: 'Grand Ballroom', address: '123 Main St', city: 'West Covina' };

test('the ask blast carries the call time, the full address and a map link', () => {
  const text = askText(ev);
  assert.match(text, /Call time \/ Hora de llegada: 5:15 PM/);
  assert.match(text, /📍 Grand Ballroom, 123 Main St, West Covina/);
  assert.match(text, /🗺 https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=Grand%20Ballroom%2C%20123%20Main%20St%2C%20West%20Covina/);
  assert.match(text, /Sat, Oct 24 · 6:00 PM–7:30 PM/);
  assert.match(text, /Reply "Sofia yes for Oct 24" or "we can't"\./, 'the sample reply the parser understands is unchanged');
  assert.ok(text.length < 990, 'fits in one GroupMe post');
});

test('missing pieces are left out rather than printed blank', () => {
  const text = askText({ id: 6, title: 'Parade', event_date: '2026-10-24', city: 'Bell' });
  assert.doesNotMatch(text, /Call time/);
  assert.match(text, /📍 Bell/);
  assert.equal(mapLink({}), null);
  assert.doesNotMatch(askText({ id: 7, title: 'Parade', event_date: '2026-10-24' }), /🗺|📍/);
});

test('asking again reminds how far off the gig is instead of announcing it as new', () => {
  const now = new Date('2026-10-20T23:30:00-07:00');
  assert.match(askText(ev, { again: true, now }), /^📢 Friendly reminder! This gig is coming up in 4 days\. Update your RSVP if anything changed\./);
  assert.match(askText(ev, { again: true, now: new Date('2026-10-23T12:00:00-07:00') }), /This gig is tomorrow\./);
  assert.match(askText(ev, { again: true, now: new Date('2026-10-24T09:00:00-07:00') }), /This gig is today\./);
  assert.match(askText(ev, { again: true, now: new Date('2026-10-25T09:00:00-07:00') }), /^📢 Friendly reminder! Update your RSVP/);
  assert.match(askText(ev), /^📢 New gig request received!/);
});

test('publish and confirm summaries include the map link under the address', () => {
  const text = eventSummary(ev);
  assert.match(text, /⏰ Call time \/ Hora de llegada: 5:15 PM\n📍 Where: Grand Ballroom, 123 Main St, West Covina\n🗺 https:/);
});
