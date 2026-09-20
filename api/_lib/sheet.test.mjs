import test from 'node:test';
import assert from 'node:assert/strict';
import { seasonOf, sheetTitle, columnHeader, cellText, renderSheet } from './sheet.js';

test('seasonOf buckets by month, ignoring year boundaries', () => {
  assert.equal(seasonOf('2026-09-12'), 'fall');
  assert.equal(seasonOf('2026-12-01'), 'winter');
  assert.equal(seasonOf('2027-02-28'), 'winter');
  assert.equal(seasonOf('2026-04-01'), 'spring');
  assert.equal(seasonOf('2026-07-04'), 'summer');
  assert.equal(seasonOf(''), null);
});

test('sheetTitle picks the earliest date regardless of input order', () => {
  const events = [{ event_date: '2026-11-01' }, { event_date: '2026-09-12' }, { event_date: '2026-10-05' }];
  assert.equal(sheetTitle(events, 'en'), 'FALL 2026 PERFORMANCE SCHEDULE');
  assert.equal(sheetTitle(events, 'es'), 'CALENDARIO DE PRESENTACIONES · OTOÑO 2026');
  assert.equal(sheetTitle([], 'en'), 'PERFORMANCE SCHEDULE');
  assert.equal(sheetTitle([], 'es'), 'CALENDARIO DE PRESENTACIONES');
});

test('columnHeader formats date, time, and place per language', () => {
  const ev = { event_date: '2026-09-12', title: 'Fiesta', venue: 'Plaza', city: 'Salinas', start_time: '6:00 PM', end_time: '7:30 PM' };
  assert.deepEqual(columnHeader(ev, 'en'), { date: 'Sat, Sep 12', title: 'Fiesta', place: 'Plaza, Salinas', time: 'Time: 6:00 PM–7:30 PM' });
  const es = columnHeader(ev, 'es');
  assert.ok(es.time.startsWith('Hora:'));
  assert.ok(es.date.startsWith('sáb'));

  assert.deepEqual(columnHeader({}, 'en'), { date: '', title: '', place: '', time: '' });
});

test('cellText maps status to language', () => {
  assert.equal(cellText('yes', 'en'), 'Yes');
  assert.equal(cellText('yes', 'es'), 'Sí');
  assert.equal(cellText('no', 'en'), 'No');
  assert.equal(cellText('no', 'es'), 'No');
  assert.equal(cellText('maybe', 'en'), 'Maybe');
  assert.equal(cellText('maybe', 'es'), 'Quizás');
  assert.equal(cellText(undefined, 'en'), '');
});

test('renderSheet builds the printable grid', () => {
  const events = [
    { id: 1, title: 'Fiesta <b>', event_date: '2026-09-12', dancers_needed: 12, pay: 500, notes: 'secret', phone: '555-1212' },
    { id: 2, title: 'Boda', event_date: '2026-09-19' },
  ];
  const dancers = [
    { id: 10, name: 'Angel' },
    { id: 11, name: 'Bea' },
  ];
  const availability = [
    { event_id: 1, dancer_id: 10, status: 'yes' },
    { event_id: 1, dancer_id: 11, status: 'yes' },
    { event_id: 1, dancer_id: 99, status: 'yes' },
  ];
  const html = renderSheet({ events, dancers, availability, lang: 'en', printedAt: new Date('2026-09-01T12:00:00Z') });

  assert.equal((html.match(/<th[ >]/g) || []).length, 3);
  assert.ok(html.includes('<span class="n">1.</span> Angel'));
  assert.ok(html.includes('class="c-yes">Yes<'));
  assert.ok(html.includes('class="c-none"></td>'));
  const blankRow = '<tr class="first blank"><td class="name"></td><td></td><td></td></tr>';
  assert.equal(html.split(blankRow).length - 1, 2);
  assert.ok(html.includes('2<span class="of"> / 12</span>'));
  assert.ok(!html.includes('3<span class="of"> / 12</span>'));
  assert.ok(!html.includes('<b>'));
  assert.ok(html.includes('&lt;b&gt;'));
  assert.ok(!/\b500\b/.test(html));
  assert.ok(!html.includes('secret'));
  assert.ok(!html.includes('555-1212'));

  const one = renderSheet({ events: events.slice(0, 1), dancers, availability, lang: 'en' });
  assert.ok(!one.includes('size: letter'), 'orientation is left to the print dialog');
  assert.ok(!one.includes('class="fam"'), 'no family column when no dancer has a family');

  const grouped = renderSheet({
    events: events.slice(0, 1), availability,
    dancers: [{ id: 1, name: 'Angel', family: 'Ramirez' }, { id: 2, name: 'Mayra', family: 'Ramirez' }, { id: 3, name: 'Lia', family: 'Marin' }],
    lang: 'en',
  });
  assert.ok(grouped.includes('<th class="fam">Family</th>'));
  assert.ok(grouped.includes('<td class="fam" rowspan="2">Ramirez</td>'));
  assert.ok(grouped.includes('<td class="fam" rowspan="1">Marin</td>'));
  assert.equal((grouped.match(/<td class="fam"/g) || []).length, 4, 'one family cell per family plus the two blank rows');
  assert.ok(grouped.includes('<span class="n">3.</span> Lia'), 'numbering runs across families');
  assert.ok(grouped.includes('<td colspan="2">Going</td>'));
});

test('renderSheet footer date uses the LA timezone, not the server UTC day', () => {
  const html = renderSheet({ events: [], dancers: [], availability: [], lang: 'en', printedAt: new Date('2026-09-20T02:30:00Z') });
  assert.ok(html.includes('Sep 19, 2026'));
});

test('renderSheet in Spanish', () => {
  const html = renderSheet({ events: [], dancers: [], availability: [], lang: 'es', printedAt: new Date('2026-09-01T12:00:00Z') });
  assert.ok(html.includes('Bailarín'));
  assert.ok(html.includes('Van'));
  assert.ok(html.includes('Impreso'));
});

test('renderSheet escapes dancer names', () => {
  const html = renderSheet({
    events: [{ id: 1, title: 'Fiesta', event_date: '2026-09-12' }],
    dancers: [{ id: 10, name: 'Angel <i>' }],
    availability: [],
    lang: 'en',
  });
  assert.ok(!html.includes('<i>'));
  assert.ok(html.includes('&lt;i&gt;'));
});
