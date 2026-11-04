import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeInquiry, cityFromDateText, queuedAt } from './inquiry.js';

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

test('a fresh website copy uses server time; only a held-back copy keeps its submit time', () => {
  const now = Date.parse('2026-11-04T12:00:00Z');
  assert.equal(queuedAt(0, now), null);
  assert.equal(queuedAt(90 * 1000, now), null);
  assert.equal(queuedAt(undefined, now), null);
  assert.equal(queuedAt('junk', now), null);
  assert.equal(queuedAt(-5000, now), null);
  assert.equal(queuedAt(31 * 24 * 3600 * 1000, now), null);
  assert.equal(queuedAt(3 * 3600 * 1000, now).toISOString(), '2026-11-04T09:00:00.000Z');
});

test('Anna’s own test submissions are recognized, real ones are not', async () => {
  const { isTestInquiry } = await import('./inquiry.js');
  assert.equal(isTestInquiry({ client_email: 'annamaliamiura@gmail.com', client_name: 'Anna' }), true);
  assert.equal(isTestInquiry({ client_email: 'Anna.Malia.Miura+form@gmail.com' }), true);
  assert.equal(isTestInquiry({ client_name: 'Test', client_email: 'x@y.com' }), true);
  assert.equal(isTestInquiry({ client_name: 'Test Prep Academy PTA', client_email: 'pta@school.org' }), false);
  assert.equal(isTestInquiry({ client_email: 'maria@example.com' }), true);
  assert.equal(isTestInquiry({ client_name: 'Maria', client_email: 'm@y.com', message: 'testing' }), true);
  assert.equal(isTestInquiry({ client_name: 'Celeste Testa', client_email: 'celeste@gmail.com', message: 'We would love a test run of the dance' }), false);
  assert.equal(isTestInquiry({ client_name: 'Anna Rojas', client_email: 'grazideelementarypta@gmail.com' }), false);
});
