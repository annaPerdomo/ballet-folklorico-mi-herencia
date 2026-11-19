import test from 'node:test';
import assert from 'node:assert/strict';

process.env.SESSION_SECRET = 'test-secret';
const { calendarSig, verifyCalendarSig, reviewSig, verifyReviewSig } = await import('./auth.js');
const {
  defaultDisplayName, firstName, cleanReview, cleanPhoto, publicReview, photoKey, PHOTO_BYTES,
} = await import('./reviews.js');

const valid = { rating: 5, body: 'They were wonderful.', display_name: 'Bianca B.', consent: true };

test('defaultDisplayName keeps the first name and the last initial', () => {
  assert.equal(defaultDisplayName('Bianca Barrera'), 'Bianca B.');
  assert.equal(defaultDisplayName('Bianca'), 'Bianca');
  assert.equal(defaultDisplayName(' maria de la cruz '), 'maria C.');
  assert.equal(defaultDisplayName(''), '');
  assert.equal(defaultDisplayName(null), '');
});

test('firstName is the first token or empty', () => {
  assert.equal(firstName('Bianca Barrera'), 'Bianca');
  assert.equal(firstName(''), '');
  assert.equal(firstName(null), '');
});

test('cleanReview trims fields and defaults the language to en', () => {
  const c = cleanReview({ ...valid, body: '  They were wonderful.  ', display_name: '  Bianca   B.  ' });
  assert.deepEqual(c, { rating: 5, body: 'They were wonderful.', display_name: 'Bianca B.', lang: 'en' });
  assert.equal(cleanReview({ ...valid, lang: 'es' }).lang, 'es');
});

test('cleanReview rejects bad input', () => {
  const bad = [
    { rating: 0 }, { rating: 6 }, { rating: 4.5 }, { rating: '5x' },
    { body: 'a'.repeat(9) }, { body: 'a'.repeat(1501) },
    { display_name: '   ' }, { display_name: 'a'.repeat(61) },
    { consent: 'true' }, { consent: undefined },
  ];
  for (const over of bad) {
    assert.throws(() => cleanReview({ ...valid, ...over }), (e) => e.status === 400, JSON.stringify(over));
  }
});

test('cleanPhoto checks type and size', () => {
  assert.deepEqual(cleanPhoto({ type: 'image/jpeg', size: PHOTO_BYTES }), { mime: 'image/jpeg', bytes: PHOTO_BYTES });
  for (const p of [
    { type: 'image/gif', size: 100 }, { type: 'image/heic', size: 100 }, { type: 'image/png', size: 0 },
    { type: 'image/png', size: PHOTO_BYTES + 1 }, { type: 'image/png', size: '12' },
  ]) assert.throws(() => cleanPhoto(p), (e) => e.status === 400, JSON.stringify(p));
});

test('publicReview exposes only the public keys', () => {
  const out = publicReview({
    id: 3, rating: 5, body: 'Great', display_name: 'Bianca B.', event_type: 'quinceanera', event_date: '2026-10-24',
    client_name: 'Bianca Barrera', title: 'Quince', client_email: 'b@example.com',
  });
  assert.deepEqual(Object.keys(out).sort(), ['body', 'id', 'month', 'name', 'rating', 'type']);
  assert.equal(out.month, '2026-10');
  assert.equal(publicReview({ id: 1, rating: 4, body: 'x', display_name: 'A', event_type: null, event_date: null }).month, null);
});

test('photoKey is namespaced, typed and random', () => {
  assert.match(photoKey(9, 'image/jpeg'), /^reviews\/9\/[0-9a-f]{16}\.jpg$/);
  assert.match(photoKey(9, 'image/png'), /\.png$/);
  assert.match(photoKey(9, 'image/webp'), /\.webp$/);
  assert.notEqual(photoKey(9, 'image/png'), photoKey(9, 'image/png'));
});

test('review and calendar signatures do not open each other', () => {
  assert.equal(verifyReviewSig(7, reviewSig(7)), true);
  assert.equal(verifyReviewSig(7, calendarSig(7)), false);
  assert.equal(verifyCalendarSig(7, reviewSig(7)), false);
  assert.equal(verifyReviewSig(8, reviewSig(7)), false);
});

test('reviewHtml carries the id and sig, is noindex and escapes a hostile sig', async () => {
  const { reviewHtml } = await import('./reviews.js');
  const html = reviewHtml({ title: 'Quince', client_email: 'b@example.com', client_phone: '555-0100' }, { id: 7, sig: reviewSig(7) });
  assert.ok(html.includes('data-review="7"'));
  assert.ok(html.includes(`data-s="${reviewSig(7)}"`));
  assert.ok(html.includes('noindex'));
  assert.ok(html.includes('/team/review.js'));
  assert.ok(!html.includes('b@example.com'));
  assert.ok(!html.includes('555-0100'));
  const evil = reviewHtml({ title: 'x' }, { id: 7, sig: '"><script>' });
  assert.ok(!evil.includes('"><script>'));
  assert.ok(evil.includes('data-s="&quot;&gt;&lt;script&gt;"'));
});

test('reviewHtml for an invalid link has data-invalid and no sig', async () => {
  const { reviewHtml } = await import('./reviews.js');
  const html = reviewHtml(null, { id: 7, sig: 'abc' });
  assert.ok(html.includes('data-invalid="1"'));
  assert.ok(!html.includes('data-s'));
});
