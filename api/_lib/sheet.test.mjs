import test from 'node:test';
import assert from 'node:assert/strict';
import { seasonOf, sheetTitle, columnHeader, cellText, renderSheet, firstName } from './sheet.js';

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
  assert.equal(sheetTitle(events, 'en'), 'Fall 2026 Performance Schedule');
  assert.equal(sheetTitle(events, 'es'), 'Calendario de presentaciones · Otoño 2026');
  assert.equal(sheetTitle([], 'en'), 'Performance Schedule');
  assert.equal(sheetTitle([], 'es'), 'Calendario de presentaciones');
});

test('columnHeader formats date, time, and place per language', () => {
  const ev = { event_date: '2026-09-12', title: 'Fiesta', venue: 'Plaza', city: 'Salinas', start_time: '6:00 PM', end_time: '7:30 PM' };
  assert.deepEqual(columnHeader(ev, 'en'), { date: 'Sat, Sep 12', title: 'Fiesta', place: 'Plaza, Salinas', call: '', time: 'Performance: 6:00 PM–7:30 PM' });
  const es = columnHeader(ev, 'es');
  assert.ok(es.time.startsWith('Función:'));
  assert.ok(es.date.startsWith('sáb'));

  assert.deepEqual(columnHeader({}, 'en'), { date: '', title: '', place: '', call: '', time: '' });
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
    { id: 1, title: 'Fiesta <b>', event_date: '2026-09-12', dancers_needed: 12, pay: 987, notes: 'secret', phone: '555-1212' },
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
  const blankRow = '<tr class="blank"><td class="name"></td><td></td><td></td></tr>';
  assert.equal(html.split(blankRow).length - 1, 2);
  assert.ok(html.includes('2<span class="of"> / 12</span>'));
  assert.ok(!html.includes('3<span class="of"> / 12</span>'));
  assert.ok(!html.includes('<b>'));
  assert.ok(html.includes('&lt;b&gt;'));
  assert.ok(!/\b987\b/.test(html));
  assert.ok(!html.includes('secret'));
  assert.ok(!html.includes('555-1212'));

  const one = renderSheet({ events: events.slice(0, 1), dancers, availability, lang: 'en' });
  assert.ok(!one.includes('size: letter'), 'orientation is left to the print dialog');
  assert.ok(one.includes('<col class="name"><col></colgroup>'), 'one column per gig');
  assert.ok(!one.includes('Family'), 'family names never appear on the sheet');
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
    dancers: [{ id: 10, name: '<i>Angel Ramirez' }],
    availability: [],
    lang: 'en',
  });
  assert.ok(!html.includes('<i>'));
  assert.ok(html.includes('&lt;i&gt;'));
});

test('the sheet shows first names only and call times when the owners set one', () => {
  assert.equal(firstName('Anna Mendez Perdomo'), 'Anna');
  assert.equal(firstName('  Sebas '), 'Sebas');
  assert.equal(firstName(''), '');
  const html = renderSheet({ events: [], availability: [], dancers: [{ id: 1, name: 'Kiley Aceves' }], lang: 'en' });
  assert.ok(html.includes('</span> Kiley</td>'));
  assert.ok(!html.includes('Aceves'));
  const h = columnHeader({ event_date: '2026-09-12', call_time: '5:15 PM', start_time: '6:00 PM', end_time: '7:30 PM' }, 'en');
  assert.equal(h.call, 'Call time: 5:15 PM');
  assert.equal(h.time, 'Performance: 6:00 PM–7:30 PM');
  assert.equal(columnHeader({ call_time: '5 PM' }, 'es').call, 'Llamado: 5 PM');
  assert.equal(columnHeader({ call_time: '5 PM' }, 'es').time, '');
  assert.equal(columnHeader({ address: '123 Main St, Downey' }, 'en').place, '123 Main St, Downey');
});

test('columnHeader drops venue and city that the title already says', () => {
  assert.equal(columnHeader({ title: 'Stonewood Center Mall — Downey', venue: 'Stonewood Center Mall', city: 'Downey' }, 'en').place, '');
  assert.equal(columnHeader({ title: 'Paramount Pictures — internal event', venue: 'Paramount Pictures', city: 'Los Angeles' }, 'en').place, 'Los Angeles');
  assert.equal(columnHeader({ title: "St. John Vianney Church's ECD", venue: 'St. John Vianney Church', city: 'Hacienda Heights' }, 'en').place, 'Hacienda Heights');
  assert.equal(columnHeader({ title: 'Quinceañera — Lopez', venue: 'Grand Ballroom', city: 'West Covina' }, 'en').place, 'Grand Ballroom, West Covina');
  assert.equal(columnHeader({ title: 'Fiesta en Montebello', venue: 'Montebello Mall', city: 'Montebello' }, 'en').place, 'Montebello Mall');
});
