import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeInquiry, cityFromDateText } from './inquiry.js';

test('the main form sends city on its own and it is kept as-is', () => {
  const n = normalizeInquiry({ name: 'Maria', email: 'M@Example.com', subject: 'quinceanera', event_date: '2026-10-24', city: ' West Covina ' });
  assert.equal(n.city, 'West Covina');
  assert.equal(n.event_date, '2026-10-24');
  assert.equal(n.date_text, null);
});

test('the landing pages send "date — city" in one box and the city is split out', () => {
  assert.equal(cityFromDateText('Oct 24 — West Covina'), 'West Covina');
  assert.equal(cityFromDateText('Oct 24 - Los Angeles'), 'Los Angeles');
  assert.equal(cityFromDateText('October 24, 2026, Whittier'), 'Whittier');
  assert.equal(cityFromDateText('Nov 8th in Pomona'), 'Pomona');
  assert.equal(cityFromDateText('8 de noviembre en Pomona'), 'Pomona');
  assert.equal(cityFromDateText('Oct 24 — West Covina, CA'), 'West Covina', 'the state is not the city');
  assert.equal(cityFromDateText('Nov 8 in Whittier, California'), 'Whittier');
  assert.equal(cityFromDateText('Oct 24, CA'), null);
  assert.equal(cityFromDateText('Oct 24 in the evening'), null, 'a time of day is not a city');
  assert.equal(cityFromDateText('Sat Oct 24 in Pomona in the afternoon'), null);
  assert.equal(cityFromDateText('24 de octubre en la tarde'), null);
  assert.equal(cityFromDateText('sometime in May or June'), null);
  assert.equal(cityFromDateText('Oct 24, 2026'), null, 'a year is not a city');
  assert.equal(cityFromDateText('Sometime in October'), null);
  assert.equal(cityFromDateText('not sure yet'), null);
  assert.equal(cityFromDateText(''), null);
  const n = normalizeInquiry({ name: 'Ana', email: 'a@b.co', subject: 'wedding', event_date_city: 'Oct 24 — West Covina', page: '/weddings/' });
  assert.equal(n.city, 'West Covina');
  assert.equal(n.date_text, 'Oct 24 — West Covina', 'the original text is kept for the owners');
});
