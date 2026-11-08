import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanRsvp, cleanItem, viewerOf, hashKey } from './gatherings.js';

test('cleanRsvp needs a name from a write-in guest but not from a family', () => {
  assert.throws(() => cleanRsvp({ status: 'yes' }, { guest: true }), /name/);
  assert.equal(cleanRsvp({ status: 'yes' }, { guest: false }).status, 'yes');
  assert.throws(() => cleanRsvp({ status: 'sure', name: 'Lupe' }, { guest: true }));
});

test('cleanRsvp clamps party size and zeroes it for a no', () => {
  assert.deepEqual(cleanRsvp({ status: 'yes', name: 'Lupe', adults: 99, kids: -3 }, { guest: true }), { status: 'yes', name: 'Lupe', adults: 30, kids: 0, note: null });
  const none = cleanRsvp({ status: 'maybe', name: 'Lupe', adults: 0, kids: 0 }, { guest: true });
  assert.equal(none.adults, 1);
  const no = cleanRsvp({ status: 'no', name: 'Lupe', adults: 4, kids: 2 }, { guest: true });
  assert.equal(no.adults + no.kids, 0);
});

test('cleanItem defaults the category and bounds the slots', () => {
  assert.throws(() => cleanItem({ label: '  ' }));
  assert.deepEqual(cleanItem({ label: 'Tamales', category: 'nope', slots: 400 }), { label: 'Tamales', category: 'other', slots: 20, note: null });
});

test('viewerOf lets a signed link or a session in, and a family can choose to write themselves in', () => {
  const verify = (id, sig) => sig === 'good';
  assert.throws(() => viewerOf({ role: 'anon' }, { id: 1, sig: 'bad', verify }), /not valid/);
  const guest = viewerOf({ role: 'anon' }, { id: 1, sig: 'good', verify, guestKey: 'k' });
  assert.equal(guest.keyHash, hashKey('k'));
  const fam = { role: 'member', family: { id: 2, name: 'Garcia' } };
  assert.equal(viewerOf(fam, { id: 1, verify }).family.id, 2);
  const asGuest = viewerOf(fam, { id: 1, verify, asGuest: true, guestKey: 'k' });
  assert.equal(asGuest.family, null);
  assert.equal(asGuest.sessionFamily, 'Garcia');
});
