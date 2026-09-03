import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMessage, detectIntent, findDates } from './groupme-parse.js';

const families = [
  { id: 1, name: 'Aceves', groupme_user_id: '65115438' },
  { id: 2, name: 'Marin', groupme_user_id: '64889724' },
  { id: 3, name: 'Orozco', groupme_user_id: '65115441' },
  { id: 4, name: 'Barragan', groupme_user_id: null },
  { id: 5, name: 'Alvarez', groupme_user_id: null },
  { id: 6, name: 'Cindy (Zamyra & Zarina)', groupme_user_id: '5335698' },
  { id: 8, name: 'Anna Mendez Perdomo', groupme_user_id: null },
  { id: 9, name: 'Ramirez', groupme_user_id: null },
];
let did = 0;
const D = (family_id, name) => ({ id: ++did, family_id, name, active: true });
const dancers = [
  D(1, 'Kiley Aceves'), D(2, 'Lia Marin'), D(2, 'Donatien Marin'), D(2, 'Isaias Marin'),
  D(3, 'Ashley Orozco'), D(3, 'Emily Orozco'), D(3, 'Sharlene Orozco'), D(4, 'Camila Barragan'), D(5, 'Isabella Alvarez'),
  D(6, 'Zamyra'), D(6, 'Zarina'), D(8, 'Anna Mendez Perdomo'), D(9, 'Tati Ramirez'), D(9, 'Nati Ramirez'), D(9, 'Sebas Ramirez'),
];
const E = (id, event_date, title, event_type, city, status = 'open', published_at = '2026-08-14') => ({ id, event_date, title, event_type, city, status, published_at });
const events = [
  E(1, '2026-09-12', '50th Birthday Dinner — Knott’s Berry Farm Hotel', 'private', 'Buena Park', 'confirmed'),
  E(2, '2026-09-14', 'Corporate Reception — Rancho Palos Verdes', 'corporate', 'Rancho Palos Verdes', 'confirmed'),
  E(3, '2026-09-19', 'Montebello Mall', 'festival', 'Montebello', 'open', '2026-08-25'),
  E(4, '2026-09-25', 'Long Beach — The Loft', 'private', 'Long Beach', 'open', '2026-08-25'),
  E(5, '2026-09-26', 'Stonewood Center Mall — Downey', 'festival', 'Downey', 'open', '2026-08-25'),
  E(6, '2026-10-13', 'Paramount Pictures — internal event', 'corporate', 'Los Angeles', 'open', '2026-09-01'),
  E(7, '2026-11-04', 'La Serna High School — Whittier', 'school', 'Whittier', 'open', '2026-09-01'),
];
const ctx = { dancers, families, events };
const P = (text, senderName, senderUserId) => parseMessage({ text, senderName, senderUserId }, ctx);
const st = (r) => Object.fromEntries(r.updates.map((u) => [`${u.dancer.name.split(' ')[0]}:${u.event.event_date.slice(5)}`, u.status]).sort());

test('intent detection', () => {
  assert.equal(detectIntent("Sofia can't make it"), 'no');
  assert.equal(detectIntent('Sofia can make it'), 'yes');
  assert.equal(detectIntent('not sure yet'), 'maybe');
  assert.equal(detectIntent('Lucía no puede'), 'no');
  assert.equal(detectIntent('sí podemos'), 'yes');
  assert.equal(detectIntent('Mia no está segura todavía'), 'maybe');
  assert.equal(detectIntent('what time is call?'), null);
  assert.equal(detectIntent('Anyone can feel free to reach me anytime'), null);
});

test('dates', () => {
  assert.deepEqual(findDates('see you 9/20 and Oct 4th and el 4 de octubre'), [[9, 20], [10, 4]]);
  assert.deepEqual(findDates('Sep 25&26'), [[9, 25], [9, 26]]);
  assert.deepEqual(findDates('the 25th and 26th'), [[null, 25], [null, 26]]);
  assert.deepEqual(findDates('No for 19th'), [[null, 19]]);
});

test('multi-date from a linked parent', () => {
  const r = P('Yes for Lia and Donatien Sep 25&26\nNot sure yet about the 19', 'Folk-Claudia Marin (DT & Lia)', '64889724');
  assert.deepEqual(st(r), { 'Lia:09-25': 'yes', 'Lia:09-26': 'yes', 'Donatien:09-25': 'yes', 'Donatien:09-26': 'yes', 'Lia:09-19': 'maybe', 'Donatien:09-19': 'maybe' });
});

test('bare day numbers, adult dancer for herself', () => {
  const r = P('Good afternoon, \nNo for 19th\nYes for 26th\nNo for 10/13', 'Folk-Ashley Orozco', '80447802');
  assert.deepEqual(st(r), { 'Ashley:09-19': 'no', 'Ashley:09-26': 'yes', 'Ashley:10-13': 'no' });
  assert.equal(r.sender.how, 'dancer-name');
});

test('comma-separated day list', () => {
  const r = P('Camila for September 12 ,19 ,25 yes', 'Erika Barragan', '143826068');
  assert.deepEqual(st(r), { 'Camila:09-12': 'yes', 'Camila:09-19': 'yes', 'Camila:09-25': 'yes' });
});

test('header name then one date per line', () => {
  const r = P('Isabella \nSat Sept 19, 2026, Montebello - yes\n \nFri Sept 25, 2026, Long Beach - no\n \nSat Sept 26, 2026, Downey - no', 'CYNTHIA ALVAREZ (Isabella)', '136328681');
  assert.deepEqual(st(r), { 'Isabella:09-19': 'yes', 'Isabella:09-25': 'no', 'Isabella:09-26': 'no' });
});

test('contrast within one line, self reference', () => {
  const r = P('I’m not available September 19th but I could make the 25th and 26th work!', 'Anna Mendez Perdomo (Adult)', '19478548');
  assert.deepEqual(st(r), { 'Anna:09-19': 'no', 'Anna:09-25': 'yes', 'Anna:09-26': 'yes' });
});

test('all open gigs for my girls', () => {
  const r = P('My girls are yes on all', 'Folk-Cindy(Zamyra & Zarina)', '5335698');
  const s = st(r);
  assert.equal(Object.keys(s).length, 14);
  assert.equal(s['Zamyra:11-04'], 'yes'); assert.equal(s['Zarina:09-12'], 'yes');
});

test('one-line answers with name and date', () => {
  assert.deepEqual(st(P('Kiley is a no for 9/14', 'Folk-Johanna Aceves (Kiley)', '65115438')), { 'Kiley:09-14': 'no' });
  assert.deepEqual(st(P('Yes, for 11/4 for Kiley. Thanks!', 'Folk-Johanna Aceves (Kiley)', '65115438')), { 'Kiley:11-04': 'yes' });
  assert.deepEqual(st(P('I’m going to say yes for Kiley on 11/4, even though she’s on campus right now. 😁', 'Folk-Johanna Aceves (Kiley)', '65115438')), { 'Kiley:11-04': 'yes' });
  assert.deepEqual(st(P('September 12th yes for Isabella', 'CYNTHIA ALVAREZ (Isabella)')), { 'Isabella:09-12': 'yes' });
  assert.deepEqual(st(P('No for 9/14\nYes for 9/12', 'Folk-Ashley Orozco')), { 'Ashley:09-14': 'no', 'Ashley:09-12': 'yes' });
});

test('long multi-date correction message', () => {
  const r = P('Yes for Kiley on 10/13. And to confirm again the Sept dates: no for 9/14 and 9/19..\n\nYes for 9/12, 9/25, 9/26 and now 10/13.', 'Folk-Johanna Aceves (Kiley)', '65115438');
  assert.deepEqual(st(r), { 'Kiley:10-13': 'yes', 'Kiley:09-14': 'no', 'Kiley:09-19': 'no', 'Kiley:09-12': 'yes', 'Kiley:09-25': 'yes', 'Kiley:09-26': 'yes' });
});

test('maybe + question line with a date is not an answer', () => {
  const r = P('For Kiley, the 19th is a maybe, she’ll know more in a couple of days, \n\nYes on the 25th and 26th. \n\nAny news on 9/12? She’ll have to make sure she doesn’t get scheduled for work that time so I wanted to confirm.', 'Folk-Johanna Aceves (Kiley)', '65115438');
  assert.deepEqual(st(r), { 'Kiley:09-19': 'maybe', 'Kiley:09-25': 'yes', 'Kiley:09-26': 'yes' });
});

test('dates with no matching gig are skipped, not guessed', () => {
  const r = P('no for oct 14th, \nyes sept 19th, \nyes sept 26th, \nyes oct 13th', 'Isaias Marin', '134892319');
  assert.deepEqual(st(r), { 'Isaias:09-19': 'yes', 'Isaias:09-26': 'yes', 'Isaias:10-13': 'yes' });
});

test('no dates: short message goes to the latest gig, named by title if possible', () => {
  const r = P('I could make that performance! It would be pretty awesome to perform at Paramount!!', 'Anna Mendez Perdomo (Adult)', '19478548');
  assert.deepEqual(st(r), { 'Anna:10-13': 'yes' }); assert.equal(r.eventGuessed, false);
  const r2 = P('Kiley is a yes! Thank you.', 'Folk-Johanna Aceves (Kiley)', '65115438');
  assert.deepEqual(Object.keys(st(r2)), ['Kiley:11-04']); assert.equal(r2.eventGuessed, true);
});

test('chit-chat with a date is not an answer', () => {
  for (const [t, n, u] of [
    ['Ok, what time is call on the 19th?', 'Folk-Claudia Marin (DT & Lia)', '64889724'],
    ['No problem, see you on the 19th!', 'Folk-Claudia Marin (DT & Lia)', '64889724'],
    ['Are we going to wear the red skirts on 9/19?', 'Folk-Johanna Aceves (Kiley)', '65115438'],
    ['We might be a little late on the 26th, traffic', 'Folk-Maricela Orozco (Ashley Emily & Sharlene)', '65115441'],
    ['Is Isabella available for 9/26?', 'Babe', '65375326'],
    ['Reminder team: Paramount is 10/13 at 3p, please let me know if you can attend', 'Anna Mendez Perdomo (Adult)', '19478548'],
    ['Confirmed', 'Folk-Johanna Aceves (Kiley)', '65115438'],
    ['We are running late as well. See you soon.', 'Folk-Johanna Aceves (Kiley)', '65115438'],
  ]) assert.deepEqual(st(P(t, n, u)), {}, t);
  assert.deepEqual(st(P('Can Kiley be a yes for 9/19?', 'Folk-Johanna Aceves (Kiley)', '65115438')), { 'Kiley:09-19': 'yes' });
});

test('chit-chat and announcements are ignored', () => {
  for (const [t, n, u] of [
    ['What color skirts for Saturday?', 'Anna Mendez Perdomo (Adult)', '19478548'],
    ['Hi 🙋🏼‍♀️,\nThat sounds awesome!', 'Folk-Maricela Orozco (Ashley Emily & Sharlene)', '65115441'],
    ['👍🏼', 'Folk-Maricela Orozco (Ashley Emily & Sharlene)', '65115441'],
    ['Absolutely! Anyone can feel free to reach me anytime at (562) 555-1234!', 'Anna Mendez Perdomo (Adult)', '19478548'],
    ['Hi team, it’s been busy with potential performance inquiries and we recently received another new inquiry from Paramount Pictures for a small internal event on Tuesday October 13 at 3p in LA.  Please let me know ASAP if you can attend', 'Babe', '65375326'],
    ['Hi Everyone, looking forward to seeing everyone at practice tomorrow. Have a great night.', 'Mayra Ramirez(Tati, Nati, Sebas)', '62268023'],
  ]) assert.deepEqual(st(P(t, n, u)), {}, t);
});
