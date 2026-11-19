import crypto from 'node:crypto';
import { one, sql } from './db.js';
import { httpError } from './http.js';
import { signedUrl, objectSize, removeObject } from './storage.js';

export const REVIEW_STATUSES = ['pending', 'approved', 'hidden'];
export const REVIEWABLE = ['confirmed', 'done'];
export const PHOTO_MAX = 4;
export const PHOTO_BYTES = 8 * 1024 * 1024;
export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

const tokens = (name) => String(name || '').trim().split(/\s+/).filter(Boolean);

export function firstName(clientName) {
  return tokens(clientName)[0] || '';
}

export function defaultDisplayName(clientName) {
  const t = tokens(clientName);
  if (t.length < 2) return t[0] || '';
  return `${t[0]} ${t[t.length - 1][0].toUpperCase()}.`;
}

export function cleanReview(input) {
  const b = input || {};
  const rating = typeof b.rating === 'number' ? b.rating : NaN;
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw httpError(400, 'Pick a star rating from 1 to 5');
  const body = String(b.body == null ? '' : b.body).trim();
  if (body.length < 10) throw httpError(400, 'Please write at least a sentence or two');
  if (body.length > 1500) throw httpError(400, 'Please keep it under 1500 characters');
  const display_name = String(b.display_name == null ? '' : b.display_name).replace(/\s+/g, ' ').trim();
  if (!display_name) throw httpError(400, 'Please add the name to show with your review');
  if (display_name.length > 60) throw httpError(400, 'That name is too long');
  if (b.consent !== true) throw httpError(400, 'Please tick the box to let us share your review');
  return { rating, body, display_name, lang: b.lang === 'es' ? 'es' : 'en' };
}

export function cleanPhoto({ type, size } = {}) {
  if (!PHOTO_TYPES.includes(type)) throw httpError(400, 'Photos can be JPEG, PNG or WebP');
  if (!Number.isInteger(size) || size <= 0) throw httpError(400, 'Empty file');
  if (size > PHOTO_BYTES) throw httpError(400, 'Photos can be up to 8 MB');
  return { mime: type, bytes: size };
}

export function publicReview(row) {
  return {
    id: row.id,
    rating: row.rating,
    body: row.body,
    name: row.display_name,
    type: row.event_type,
    month: row.event_date ? String(row.event_date).slice(0, 7) : null,
  };
}

export function photoKey(reviewId, mime) {
  return `reviews/${reviewId}/${crypto.randomBytes(8).toString('hex')}.${EXT[mime]}`;
}

export async function reviewTarget(eventId) {
  if (!eventId) return null;
  return one(
    `SELECT id, title, event_type, event_date, client_name, status FROM events WHERE id = $1 AND status = ANY($2)`,
    [eventId, REVIEWABLE]);
}

export async function reviewFor(eventId) {
  return one('SELECT * FROM reviews WHERE event_id = $1', [eventId]);
}

export async function photoCount(reviewId) {
  return Number((await one('SELECT count(*) AS n FROM review_photos WHERE review_id = $1', [reviewId])).n);
}

export async function submitReview(eventId, clean) {
  const row = await one(
    `INSERT INTO reviews (event_id, rating, body, display_name, consent, lang)
     VALUES ($1, $2, $3, $4, true, $5)
     ON CONFLICT (event_id) DO UPDATE
       SET rating = EXCLUDED.rating, body = EXCLUDED.body, display_name = EXCLUDED.display_name,
           consent = true, lang = EXCLUDED.lang, updated_at = now(), rev = reviews.rev + 1
       WHERE reviews.status = 'pending'
     RETURNING *`,
    [eventId, clean.rating, clean.body, clean.display_name, clean.lang]);
  if (!row) throw httpError(409, 'review already received');
  return row;
}

async function dropObjects(keys) {
  await Promise.all(keys.map((k) => removeObject(k).catch(() => {})));
}

export async function startPhoto(reviewId, clean) {
  const stale = await sql(
    `DELETE FROM review_photos WHERE review_id = $1 AND NOT ready AND created_at < now() - interval '1 day' RETURNING storage_key`,
    [reviewId]);
  await dropObjects(stale.map((r) => r.storage_key));
  const key = photoKey(reviewId, clean.mime);
  const row = await one(
    `INSERT INTO review_photos (review_id, slot, storage_key, mime, bytes)
     SELECT $1, s, $2, $3, $4 FROM generate_series(1, ${PHOTO_MAX}) s
      WHERE NOT EXISTS (SELECT 1 FROM review_photos p WHERE p.review_id = $1 AND p.slot = s)
      ORDER BY s LIMIT 1
     ON CONFLICT (review_id, slot) DO NOTHING RETURNING id`,
    [reviewId, key, clean.mime, clean.bytes]);
  if (!row) throw httpError(409, 'photo limit reached');
  return { id: row.id, put: await signedUrl('PUT', key, { length: clean.bytes }) };
}

export async function finishPhoto(reviewId, photoId) {
  const row = photoId ? await one('SELECT * FROM review_photos WHERE id = $1 AND review_id = $2', [photoId, reviewId]) : null;
  if (!row) throw httpError(404, 'No such photo');
  if (row.ready) return;
  if (await objectSize(row.storage_key) !== row.bytes) throw httpError(400, 'The upload did not arrive, try again');
  await sql('UPDATE review_photos SET ready = true WHERE id = $1', [row.id]);
}

export async function listReviews() {
  const rows = await sql(
    `SELECT r.*, e.title, e.event_type, e.event_date, e.client_name
       FROM reviews r JOIN events e ON e.id = r.event_id
      ORDER BY r.created_at DESC`);
  const photos = await sql('SELECT id, review_id, storage_key FROM review_photos WHERE ready ORDER BY id');
  return rows.map((r) => ({
    ...r,
    photos: photos.filter((p) => p.review_id === r.id).map((p) => ({ id: p.id, url: signedUrl('GET', p.storage_key) })),
  }));
}

export async function setReviewStatus(id, status, rev) {
  if (!REVIEW_STATUSES.includes(status)) throw httpError(400, 'Unknown status');
  const approving = status === 'approved';
  if (approving && !Number.isInteger(rev)) throw httpError(400, 'Reload and try again');
  const row = await one(
    `UPDATE reviews SET status = $2, approved_at = CASE WHEN $2 = 'approved' THEN now() END, updated_at = now()
      WHERE id = $1 AND ($3::int IS NULL OR rev = $3) RETURNING *`,
    [id, status, approving ? rev : null]);
  if (row) return row;
  if (await one('SELECT 1 AS x FROM reviews WHERE id = $1', [id])) throw httpError(409, 'review changed');
  throw httpError(404, 'No such review');
}

export async function deleteReview(id) {
  const photos = await sql('SELECT storage_key FROM review_photos WHERE review_id = $1', [id]);
  const gone = await one('DELETE FROM reviews WHERE id = $1 RETURNING id', [id]);
  if (!gone) throw httpError(404, 'No such review');
  await dropObjects(photos.map((p) => p.storage_key));
}

export async function approvedReviews(limit = 30) {
  const rows = await sql(
    `SELECT r.id, r.rating, r.body, r.display_name, e.event_type, e.event_date
       FROM reviews r JOIN events e ON e.id = r.event_id
      WHERE r.status = 'approved' AND r.consent AND e.status = ANY($2)
      ORDER BY r.approved_at DESC NULLS LAST LIMIT $1`,
    [limit, REVIEWABLE]);
  return rows.map(publicReview);
}

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function reviewHtml(ev, { id, sig }) {
  const data = ev ? ` data-review="${esc(id)}" data-s="${esc(sig)}"` : ' data-invalid="1"';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="theme-color" content="#0c0514" />
  <meta name="robots" content="noindex" />
  <title>Review | Ballet Folklórico Mi Herencia</title>
  <link rel="icon" href="/favicon.ico" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,400;1,500&family=Montserrat:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/team/team.css" />
  <link rel="stylesheet" href="/team/review.css" />
</head>
<body>
  <header class="tm-header">
    <a class="tm-brand" href="/" aria-label="Ballet Folklórico Mi Herencia">
      <img class="tm-logo" src="/images/optimized/logo-dancers-color.webp" alt="" />
      <span class="tm-wordmark notranslate" translate="no">
        <span class="tm-wm-1">Ballet Folklórico</span>
        <span class="tm-wm-2">Mi Herencia</span>
        <span class="tm-wm-short">BFMH</span>
      </span>
    </a>
    <div class="tm-header-right" id="header-right"></div>
  </header>
  <main class="tm-main rv-main" id="review"${data}></main>
  <script src="/team/review.js" defer></script>
</body>
</html>`;
}
