import crypto from 'node:crypto';
import { route, readJson, ok, query, str, int, httpError } from './_lib/http.js';
import { requireUser, requireAdmin } from './_lib/auth.js';
import { sql, one } from './_lib/db.js';
import { MEMBER_VISIBLE } from './_lib/events.js';
import { signedUrl, objectSize, storageReady } from './_lib/storage.js';
import { galleryOpen } from './_lib/ics.js';
import { LIMITS, THUMB_MAX, TYPES, quotaBytes, usedBytes, youtubeId, safeLink, toItem, removeFiles, canPublish, websiteFlags, coverUrl } from './_lib/media.js';

async function visibleEvent(id, me) {
  const ev = await one('SELECT id, title, event_type, event_date, start_time, call_time, status, venue, city, cover_media_id FROM events WHERE id = $1', [id]);
  if (!ev || (me.role !== 'admin' && !MEMBER_VISIBLE.includes(ev.status))) throw httpError(404, 'Gig not found');
  // Owners bypass: a gig with media that gets moved later would otherwise lock its files away.
  if (!galleryOpen(ev) && me.role !== 'admin') throw httpError(403, 'This gig’s gallery opens when the gig starts');
  return ev;
}

async function ownRow(id, me) {
  const row = await one('SELECT * FROM media WHERE id = $1', [id]);
  if (!row) throw httpError(404, 'Not found');
  if (me.role !== 'admin' && row.family_id !== me.family.id) throw httpError(403, 'Only the person who added this can change it');
  return row;
}

const uploaderOf = (me) => (me.role === 'admin' ? 'owners' : me.family.name);
const familyOf = (me) => (me.role === 'admin' ? null : me.family.id);

function extOf(name, type) {
  const fromName = String(name || '').match(/\.([a-z0-9]{1,5})$/i);
  if (fromName) return fromName[1].toLowerCase();
  return (String(type).split('/')[1] || 'bin').replace(/[^a-z0-9]/gi, '').slice(0, 5) || 'bin';
}

async function sweepStale() {
  const stale = await sql(`DELETE FROM media WHERE NOT ready AND created_at < now() - interval '1 day'
    RETURNING storage_key, thumb_key`);
  if (stale.length) await removeFiles(stale);
}

async function usage(me) {
  return me.role === 'admin' ? { used: await usedBytes(), quota: quotaBytes() } : undefined;
}

export default route({
  async GET(req, res) {
    const me = await requireUser(req);
    const q = query(req);
    const base = { storage: storageReady(), usage: await usage(me) };

    if (q.library !== undefined) {
      const rows = await sql(`SELECT * FROM media WHERE kind = 'audio' AND event_id IS NULL AND ready ORDER BY lower(title), id`);
      return ok(res, { ...base, songs: rows.map((r) => toItem(r, me)) });
    }

    const eventId = int(q.event);
    if (eventId) {
      const event = await visibleEvent(eventId, me);
      const rows = await sql('SELECT * FROM media WHERE event_id = $1 AND ready ORDER BY created_at, id', [eventId]);
      const linked = await sql(`SELECT m.* FROM event_songs s JOIN media m ON m.id = s.media_id
        WHERE s.event_id = $1 AND m.ready ORDER BY s.position, lower(m.title)`, [eventId]);
      return ok(res, { ...base, event, items: rows.map((r) => toItem(r, me)), setlist: linked.map((r) => toItem(r, me)) });
    }

    const gigs = await sql(`
      SELECT e.id, e.title, e.event_type, e.event_date, e.start_time, e.call_time, e.status, e.venue, e.city,
        count(m.id) FILTER (WHERE m.kind = 'photo')::int AS photos,
        count(m.id) FILTER (WHERE m.kind IN ('video','link'))::int AS videos,
        (count(m.id) FILTER (WHERE m.kind = 'audio') + (SELECT count(*) FROM event_songs s WHERE s.event_id = e.id))::int AS songs,
        (SELECT json_agg(x) FROM (SELECT c.kind, c.thumb_key, c.url FROM media c
          WHERE c.event_id = e.id AND c.ready AND ((c.kind = 'photo' AND c.thumb_key IS NOT NULL) OR (c.kind = 'link' AND c.url ~* '^https://([a-z]+\\.)?(youtube\\.com|youtube-nocookie\\.com|youtu\\.be)/'))
          ORDER BY c.id IS NOT DISTINCT FROM e.cover_media_id DESC, c.kind = 'photo' DESC, c.created_at DESC LIMIT 5) x) AS cover_rows
      FROM events e LEFT JOIN media m ON m.event_id = e.id AND m.ready
      WHERE e.status = ANY($1) AND e.event_date <= current_date + 1
      GROUP BY e.id ORDER BY e.event_date DESC, e.id DESC`, [MEMBER_VISIBLE]);
    const review = me.role === 'admin'
      ? (await sql(`SELECT m.*, e.title AS event_title, e.event_date FROM media m JOIN events e ON e.id = m.event_id
          WHERE m.suggested AND NOT m.website AND m.ready ORDER BY m.created_at`)).map((r) => ({ ...toItem(r, me), event_title: r.event_title, event_date: r.event_date }))
      : undefined;
    ok(res, { ...base, review, gigs: gigs.filter((g) => galleryOpen(g)).map(({ cover_rows, start_time, call_time, ...g }) => ({ ...g, cover: (cover_rows || []).map(coverUrl).find(Boolean) || null })) });
  },

  async POST(req, res) {
    const me = await requireUser(req);
    const b = await readJson(req);

    if (b.action === 'upload') {
      const kind = String(b.kind);
      if (!LIMITS[kind]) throw httpError(400, 'Unknown kind');
      const type = str(b.type, 100) || '';
      if (!TYPES[kind].test(type)) throw httpError(400, 'That file type does not belong here');
      const size = int(b.size) || 0;
      if (size <= 0) throw httpError(400, 'Empty file');
      if (size > LIMITS[kind]) {
        throw httpError(413, kind === 'video' ? 'This video is too big — put it on YouTube (unlisted) and add the link instead'
          : `Files like this can be up to ${Math.round(LIMITS[kind] / 1048576)} MB`);
      }
      const eventId = int(b.event_id);
      if (eventId) await visibleEvent(eventId, me);
      else if (kind !== 'audio') throw httpError(400, 'Photos and videos belong to a gig');
      if (!storageReady()) throw httpError(503, 'Media storage is not set up yet');
      const thumbSize = kind === 'photo' && b.thumb ? int(b.thumb_size) || 0 : 0;
      if (kind === 'photo' && b.thumb && (thumbSize <= 0 || thumbSize > THUMB_MAX)) throw httpError(400, 'Bad thumbnail');
      await sweepStale();
      if (await usedBytes() + size + thumbSize > quotaBytes()) throw httpError(507, 'The gallery is full — ask the owners to clear out old videos');

      const rand = crypto.randomBytes(6).toString('base64url');
      const folder = eventId ? `gig-${eventId}` : 'library';
      const stem = `${folder}/${Date.now().toString(36)}-${rand}`;
      const key = `${stem}.${extOf(b.name, type)}`;
      const thumbKey = thumbSize ? `${stem}-t.jpg` : null;
      const title = str(b.title, 200) || (kind === 'audio' ? str(String(b.name || '').replace(/\.[^.]+$/, ''), 200) : null);
      const flags = websiteFlags(me, b.website, Boolean(eventId) && canPublish(kind, thumbKey));
      const row = await one(`INSERT INTO media (event_id, kind, title, note, storage_key, thumb_key, mime, bytes, thumb_bytes, width, height,
          family_id, uploader, website, suggested)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING id`,
        [eventId, kind, title, str(b.note, 500), key, thumbKey, type, size + thumbSize, thumbSize, int(b.width), int(b.height),
          familyOf(me), uploaderOf(me), flags.website, flags.suggested]);
      return ok(res, { id: row.id, put: signedUrl('PUT', key, { length: size }),
        thumb_put: thumbKey ? signedUrl('PUT', thumbKey, { length: thumbSize }) : null });
    }

    if (b.action === 'done') {
      const row = await ownRow(int(b.id), me);
      if (row.ready) return ok(res, { item: toItem(row, me) });
      // PUTs are signed for an exact length, so a mismatch means the upload never landed.
      const size = await objectSize(row.storage_key);
      const thumb = row.thumb_key ? await objectSize(row.thumb_key) : 0;
      const declared = Number(row.bytes) - row.thumb_bytes;
      if (size !== declared) {
        await removeFiles([row]);
        await sql('DELETE FROM media WHERE id = $1', [row.id]);
        throw httpError(400, 'The upload did not arrive — try again');
      }
      const keepThumb = thumb === row.thumb_bytes && thumb > 0;
      const publishable = canPublish(row.kind, keepThumb ? row.thumb_key : null);
      const done = await one(`UPDATE media SET ready = true, bytes = $2, thumb_key = CASE WHEN $3 THEN thumb_key END,
          website = website AND $4, suggested = suggested AND $4
        WHERE id = $1 RETURNING *`, [row.id, size + (keepThumb ? thumb : 0), keepThumb, publishable]);
      if (row.thumb_key && !keepThumb) await removeFiles([{ thumb_key: row.thumb_key }]);
      return ok(res, { item: toItem(done, me) });
    }

    if (b.action === 'link') {
      const eventId = int(b.event_id);
      if (!eventId) throw httpError(400, 'Links belong to a gig');
      await visibleEvent(eventId, me);
      const url = safeLink(b.url);
      if (!url) throw httpError(400, 'Paste a full https:// link');
      const flags = websiteFlags(me, b.website, true);
      const row = await one(`INSERT INTO media (event_id, kind, title, url, family_id, uploader, ready, website, suggested)
        VALUES ($1, 'link', $2, $3, $4, $5, true, $6, $7) RETURNING *`,
        [eventId, str(b.title, 200) || (youtubeId(url) ? null : new URL(url).hostname.replace(/^www\./, '')), url, familyOf(me), uploaderOf(me),
          flags.website, flags.suggested]);
      return ok(res, { item: toItem(row, me) });
    }

    if (b.action === 'cover') {
      await requireAdmin(req);
      const eventId = int(b.event_id);
      if (!eventId) throw httpError(400, 'Pick a gig');
      const mediaId = b.media_id == null ? null : int(b.media_id);
      if (b.media_id != null && !mediaId) throw httpError(400, 'Pick a photo or YouTube video from this gig');
      if (mediaId) {
        const row = await one('SELECT * FROM media WHERE id = $1 AND event_id = $2 AND ready', [mediaId, eventId]);
        if (!coverUrl(row)) throw httpError(400, 'Pick a photo or YouTube video from this gig');
      }
      const ev = await one('UPDATE events SET cover_media_id = $2 WHERE id = $1 RETURNING id', [eventId, mediaId]);
      if (!ev) throw httpError(404, 'Gig not found');
      return ok(res);
    }

    if (b.action === 'setlist') {
      await requireAdmin(req);
      const eventId = int(b.event_id); const mediaId = int(b.media_id);
      const song = await one(`SELECT id FROM media WHERE id = $1 AND kind = 'audio' AND event_id IS NULL`, [mediaId]);
      if (!eventId || !song) throw httpError(400, 'Pick a song from the library');
      if (b.on === false) await sql('DELETE FROM event_songs WHERE event_id = $1 AND media_id = $2', [eventId, mediaId]);
      else {
        await sql(`INSERT INTO event_songs (event_id, media_id, position)
          VALUES ($1, $2, (SELECT COALESCE(max(position), 0) + 1 FROM event_songs WHERE event_id = $1)) ON CONFLICT DO NOTHING`, [eventId, mediaId]);
      }
      return ok(res);
    }

    throw httpError(400, 'Unknown action');
  },

  async PATCH(req, res) {
    const me = await requireUser(req);
    const row = await ownRow(int(query(req).id), me);
    const b = await readJson(req);
    let { website, suggested } = row;
    if ('website' in b) {
      const allowed = Boolean(row.event_id) && canPublish(row.kind, row.thumb_key);
      if (me.role === 'admin') ({ website, suggested } = websiteFlags(me, b.website, allowed));
      else if (b.website === true) suggested = allowed;
      else { website = false; suggested = false; }
    }
    const done = await one(`UPDATE media SET title = $2, note = $3, website = $4, suggested = $5 WHERE id = $1 RETURNING *`,
      [row.id, 'title' in b ? str(b.title, 200) : row.title, 'note' in b ? str(b.note, 500) : row.note, website, suggested]);
    ok(res, { item: toItem(done, me) });
  },

  async DELETE(req, res) {
    const me = await requireUser(req);
    const row = await ownRow(int(query(req).id), me);
    await sql('DELETE FROM media WHERE id = $1', [row.id]);
    await removeFiles([row]);
    ok(res);
  },
});
