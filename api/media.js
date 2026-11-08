import crypto from 'node:crypto';
import { route, readJson, ok, query, str, int, httpError } from './_lib/http.js';
import { requireUser, requireAdmin, actorOf, ownerTag } from './_lib/auth.js';
import { sql, one, withSource } from './_lib/db.js';
import { GALLERY_VISIBLE, LISTED } from './_lib/events.js';
import { signedUrl, objectSize, storageReady, removeObject } from './_lib/storage.js';
import { galleryOpen } from './_lib/ics.js';
import { LIMITS, THUMB_MAX, TYPES, quotaBytes, usedBytes, youtubeId, youtubeTitle, isPlaylist, safeLink, toItem, removeFiles, canPublish, websiteFlags, coverUrl, FEATURED_FIRST, feedBatches, isMine, creditOf, FLYER_MAX } from './_lib/media.js';

async function visibleEvent(id, me) {
  const ev = await one(`SELECT id, title, event_type, event_date, start_time, call_time, status, venue, city, cover_media_id FROM events WHERE id = $1 AND status <> 'deleted'`, [id]);
  if (!ev || (me.role !== 'admin' && !GALLERY_VISIBLE.includes(ev.status))) throw httpError(404, 'Gig not found');
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

// A group event's photos are the group's own: they never go up on bfmh.dance.
const shareable = (ev) => Boolean(ev) && ev.status !== 'gathering';
// The gallery's Gigs | Events filter; folders and old "Group gathering" gigs count as events.
const KIND_SQL = `CASE WHEN e.status IN ('gathering', 'folder') OR e.event_type = 'team' THEN 'event' ELSE 'gig' END`;

const uploaderOf = (me) => (me.family ? me.family.name : 'owners');
// Owners' rows stay owner-only: /familia is open, so a family id would let anyone edit them.
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

const FEED_PAGE = 150;
// Microsecond ISO: a JS Date drops the last three digits, so a row would match a cursor or seen mark taken from itself.
const STAMP = `to_char(m.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS stamp`;
const STAMP_RE = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d{1,6})?Z$/;
const FEED_FROM = `FROM media m LEFT JOIN events e ON e.id = m.event_id WHERE m.ready AND (m.event_id IS NULL OR e.status = ANY($1))`;
// Owners' pre-loaded gigs would otherwise fill a member's page; galleryOpen settles the day itself.
const memberCut = (me) => (me.role === 'admin' ? '' : `AND (m.event_id IS NULL OR e.status = 'folder' OR e.event_date <= current_date + 1)`);
const feedVisible = (r, me) => me.role === 'admin' || r.event_id == null || galleryOpen(r);

function stampParam(v) {
  if (!STAMP_RE.test(String(v))) throw httpError(400, 'Bad feed position');
  return String(v);
}

const BLAST_FROM = `FROM blasts b JOIN events e ON e.id = b.event_id
  WHERE e.status <> 'deleted' AND ($1 OR e.status = ANY($2) OR (b.kind = 'cancelled' AND e.status = 'cancelled'))`;
const BLAST_STAMP = STAMP.replace('m.created_at', 'b.created_at');

async function blastsBetween(me, after, upto) {
  const rows = await sql(`SELECT b.id, b.kind, b.created_at, ${BLAST_STAMP}, e.id AS event_id, e.title, e.event_type, e.event_date, e.start_time, e.venue, e.city, e.status
    ${BLAST_FROM} AND ($3::timestamptz IS NULL OR b.created_at >= $3::timestamptz) AND ($4::timestamptz IS NULL OR b.created_at < $4::timestamptz)
    ORDER BY b.created_at DESC, b.id DESC LIMIT 1000`, [me.role === 'admin', LISTED, after, upto]);
  return rows.map((r) => ({
    blast: r.kind, id: 'b' + r.id, at: r.created_at, stamp: r.stamp, mine: me.role === 'admin',
    event: { id: r.event_id, title: r.title, event_type: r.event_type, event_date: r.event_date, start_time: r.start_time, venue: r.venue, city: r.city, status: r.status },
  }));
}

const EVENT_JSON = `json_build_object('id', e.id, 'title', e.title, 'event_type', e.event_type, 'event_date', e.event_date, 'start_time', e.start_time,
  'venue', e.venue, 'city', e.city, 'status', e.status) AS event`;
const stampOf = (col) => `to_char(${col} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;

const FOLD_MS = 5 * 60 * 1000;
const ANSWER_PAGE = 200;
function foldAnswers(rows) {
  const out = [], open = {};
  for (const r of rows) {
    const key = `${r.event_id}_${r.family_id}`, g = open[key];
    if (g && !g.legacy && !r.legacy && new Date(g.oldest) - new Date(r.at) < FOLD_MS) {
      for (const d of r.dancers) if (!g.dancers.some((x) => x.name === d.name)) g.dancers.push(d);
      g.changed = g.changed || r.changed; g.oldest = r.at;
    } else out.push((open[key] = { ...r, dancers: [...r.dancers], oldest: r.at }));
  }
  return out;
}

// Families never see who said no to a team event, nor RSVPs to one not yet posted to GroupMe.
async function answersBetween(me, after, upto) {
  const admin = me.role === 'admin', fam = me.family && me.family.id;
  const gigQuery = (from, limit) => sql(`WITH h AS (
          SELECT h.event_id, d.family_id, h.changed_at AS at, bool_or(h.old_status IS NOT NULL) AS changed, false AS legacy,
            json_agg(json_build_object('name', d.name, 'status', h.new_status) ORDER BY d.name) AS dancers
          FROM availability_history h JOIN dancers d ON d.id = h.dancer_id
          WHERE h.new_status IS NOT NULL AND h.new_status IS DISTINCT FROM h.old_status
          GROUP BY h.event_id, d.family_id, h.changed_at
          UNION ALL
          SELECT a.event_id, d.family_id, max(a.updated_at), false, true,
            json_agg(json_build_object('name', d.name, 'status', a.status) ORDER BY d.name)
          FROM availability a JOIN dancers d ON d.id = a.dancer_id
          WHERE NOT EXISTS (SELECT 1 FROM availability_history x WHERE x.event_id = a.event_id AND x.dancer_id = a.dancer_id)
          GROUP BY a.event_id, d.family_id)
        SELECT h.*, ${stampOf('h.at')} AS stamp, f.name AS family_name, ${EVENT_JSON}
        FROM h JOIN families f ON f.id = h.family_id JOIN events e ON e.id = h.event_id
        WHERE e.status <> 'deleted' AND ($1 OR e.status = ANY($2))
          AND ($3::timestamptz IS NULL OR h.at >= $3::timestamptz) AND ($4::timestamptz IS NULL OR h.at < $4::timestamptz)
        ORDER BY h.at DESC LIMIT ${limit}`, [admin, LISTED, from, upto]);
  const rsvpQuery = (from, limit) => sql(`SELECT l.id, l.status, l.adults, l.kids, l.bringing, l.changed, l.created_at AS at, ${stampOf('l.created_at')} AS stamp,
          r.family_id, r.name, f.name AS family_name, ${EVENT_JSON}
        FROM gathering_rsvp_log l JOIN gathering_rsvps r ON r.id = l.rsvp_id JOIN events e ON e.id = l.event_id LEFT JOIN families f ON f.id = r.family_id
        WHERE e.status = 'gathering' AND ($1 OR (l.status <> 'no' AND e.asked_at IS NOT NULL))
          AND ($2::timestamptz IS NULL OR l.created_at >= $2::timestamptz) AND ($3::timestamptz IS NULL OR l.created_at < $3::timestamptz)
        ORDER BY l.created_at DESC LIMIT ${limit}`, [admin, from, upto]);
  // Refetch from the cut so rows tied at its stamp aren't split across pages.
  const page = async (query) => {
    const rows = await query(after, ANSWER_PAGE);
    if (rows.length < ANSWER_PAGE) return { rows, cut: null };
    const cut = rows.at(-1).stamp;
    return { rows: await query(cut, ANSWER_PAGE * 10), cut };
  };
  const [g, r] = await Promise.all([page(gigQuery), page(rsvpQuery)]);
  const gigs = g.rows, rsvps = r.rows;
  const cut = [g.cut, r.cut].filter(Boolean).sort().at(-1) || null;
  const list = [
    ...foldAnswers(gigs).map((r) => ({ answers: 'gig', id: `a${r.event_id}_${r.family_id}_${r.stamp}`, at: r.at, stamp: r.stamp, mine: Boolean(fam) && r.family_id === fam,
      changed: r.changed, family: r.family_name, dancers: r.dancers, event: r.event })),
    ...rsvps.map((r) => ({ answers: 'party', id: 'r' + r.id, at: r.at, stamp: r.stamp, mine: Boolean(fam) && r.family_id === fam, changed: r.changed,
      name: r.name, family: Boolean(r.family_id) && r.name === r.family_name, status: r.status, adults: r.adults, kids: r.kids, bringing: r.bringing, event: r.event })),
  ];
  return { list, cut };
}

async function feed(q, me) {
  if (q.since !== undefined) {
    const since = stampParam(q.since);
    const rows = await sql(`SELECT m.id, m.kind, m.created_at, m.event_id, m.family_id, m.uploader, m.credit, e.event_date, e.start_time, e.call_time, e.status
      ${FEED_FROM} ${memberCut(me)} AND m.created_at > $2::timestamptz ORDER BY m.created_at DESC, m.id DESC LIMIT 500`, [GALLERY_VISIBLE, since]);
    const blasts = me.role === 'admin' ? [] : await sql(`SELECT b.id ${BLAST_FROM} AND b.created_at > $3::timestamptz LIMIT 100`, [false, LISTED, since]);
    const answers = (await answersBetween(me, since, null)).list.filter((a) => !a.mine && a.stamp > since);
    return { fresh: feedBatches(rows.filter((r) => feedVisible(r, me) && !isMine(r, me))).length + blasts.length + answers.length };
  }
  let cursor = null;
  if (q.before !== undefined) {
    const [at, id] = String(q.before).split('_');
    cursor = [stampParam(at), int(id)];
    if (cursor[1] == null) throw httpError(400, 'Bad feed position');
  }
  const upto = cursor && cursor[0];
  const shown = [];
  let next = null;
  for (let tries = 0; tries < 5 && !shown.length; tries++) {
    const rows = await sql(`SELECT m.*, ${STAMP}, e.title AS event_title, e.event_type, e.event_date, e.start_time, e.call_time, e.status
      ${FEED_FROM} ${memberCut(me)} AND ($2::timestamptz IS NULL OR (m.created_at, m.id) < ($2::timestamptz, $3::int))
      ORDER BY m.created_at DESC, m.id DESC LIMIT ${FEED_PAGE}`, [GALLERY_VISIBLE, cursor && cursor[0], cursor && cursor[1]]);
    let batches = feedBatches(rows);
    const more = rows.length === FEED_PAGE;
    // A full page may have cut the oldest batch short; it comes back whole on the next page.
    if (more && batches.length > 1) batches = batches.slice(0, -1);
    shown.push(...batches.map((b) => b.filter((r) => feedVisible(r, me))).filter((b) => b.length));
    const last = batches.length ? batches[batches.length - 1].at(-1) : null;
    next = more && last ? `${last.stamp}_${last.id}` : null;
    if (!next) break;
    cursor = [last.stamp, last.id];
  }
  const uploads = shown.map((b) => {
    const r = b[0];
    return {
      id: r.id, at: r.created_at, stamp: r.stamp, uploader: r.uploader, credit: r.credit || null, mine: isMine(r, me),
      event: r.event_id ? { id: r.event_id, title: r.event_title, event_type: r.event_type, event_date: r.event_date, status: r.status } : null,
      items: b.map((x) => toItem(x, me)),
    };
  });
  // The last page takes every older blast; otherwise blasts stop where the next page's uploads start.
  const after = next && next.split('_')[0];
  const [blasts, answers] = await Promise.all([blastsBetween(me, after, upto), answersBetween(me, after, upto)]);
  let all = [...uploads, ...blasts, ...answers.list];
  // Id 0 sorts below every upload at the cut stamp, so the next page starts strictly before what this one showed.
  if (answers.cut) { all = all.filter((b) => b.stamp >= answers.cut); next = `${answers.cut}_0`; }
  const batches = all.sort((a, b) => (a.stamp < b.stamp ? 1 : a.stamp > b.stamp ? -1 : 0));
  return { next, batches };
}

export default route({
  async GET(req, res) {
    const me = await requireUser(req);
    const q = query(req);
    const base = { storage: storageReady(), usage: await usage(me) };

    if (q.library !== undefined) {
      // Includes tracks once attached to a gig, from before music moved to the library only.
      const rows = await sql(`SELECT * FROM media WHERE kind = 'audio' AND ready ORDER BY lower(title), id`);
      return ok(res, { ...base, songs: rows.map((r) => toItem(r, me)) });
    }

    if (q.videos !== undefined) {
      const rows = await sql(`SELECT m.*, e.title AS event_title, e.event_type, e.event_date, e.start_time, e.call_time, e.status
        FROM media m JOIN events e ON e.id = m.event_id
        WHERE m.kind IN ('video','link') AND m.ready AND e.status = ANY($1)
        ORDER BY e.event_date DESC NULLS LAST, e.id, ${FEATURED_FIRST}, m.created_at, m.id`, [GALLERY_VISIBLE]);
      const videos = rows.filter((r) => me.role === 'admin' || galleryOpen(r))
        .map((r) => ({ ...toItem(r, me), event_title: r.event_title, event_type: r.event_type, event_date: r.event_date, event_status: r.status }));
      return ok(res, { ...base, videos });
    }

    if (q.feed !== undefined) return ok(res, { ...base, ...(await feed(q, me)) });

    const eventId = int(q.event);
    if (eventId) {
      const event = await visibleEvent(eventId, me);
      const rows = await sql(`SELECT * FROM media m WHERE event_id = $1 AND kind <> 'audio' AND ready ORDER BY ${FEATURED_FIRST}, created_at, id`, [eventId]);
      return ok(res, { ...base, event, items: rows.map((r) => toItem(r, me)) });
    }

    const gigs = await sql(`
      SELECT e.id, e.title, e.event_type, e.event_date, e.start_time, e.call_time, e.status, e.venue, e.city, ${KIND_SQL} AS kind,
        count(m.id) FILTER (WHERE m.kind = 'photo')::int AS photos,
        count(m.id) FILTER (WHERE m.kind IN ('video','link'))::int AS videos,
        (SELECT json_agg(x) FROM (SELECT c.kind, c.thumb_key, c.url FROM media c
          WHERE c.event_id = e.id AND c.ready AND ((c.kind = 'photo' AND c.thumb_key IS NOT NULL) OR (c.kind = 'link' AND c.url ~* '^https://([a-z]+\\.)?(youtube\\.com|youtube-nocookie\\.com|youtu\\.be)/'))
          ORDER BY c.id IS NOT DISTINCT FROM e.cover_media_id DESC, c.kind = 'photo' DESC, c.created_at DESC LIMIT 5) x) AS cover_rows
      FROM events e LEFT JOIN media m ON m.event_id = e.id AND m.ready
      WHERE e.status = ANY($1) AND (e.status = 'folder' OR e.event_date <= current_date + 1)
      GROUP BY e.id ORDER BY e.event_date DESC NULLS FIRST, e.id DESC`, [GALLERY_VISIBLE]);
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
      const eventId = kind === 'audio' ? null : int(b.event_id);
      const ev = eventId ? await visibleEvent(eventId, me) : null;
      if (!ev && kind !== 'audio') throw httpError(400, 'Photos and videos belong to a gig');
      if (!storageReady()) throw httpError(503, 'Media storage is not set up yet');
      const thumbSize = kind === 'photo' && b.thumb ? int(b.thumb_size) || 0 : 0;
      if (kind === 'photo' && b.thumb && (thumbSize <= 0 || thumbSize > THUMB_MAX)) throw httpError(400, 'Bad thumbnail');
      await sweepStale();
      if (await usedBytes() + size + thumbSize > quotaBytes()) throw httpError(507, 'The gallery is full — ask Mayra or Angel to clear out old videos');

      const rand = crypto.randomBytes(6).toString('base64url');
      const folder = eventId ? `gig-${eventId}` : 'library';
      const stem = `${folder}/${Date.now().toString(36)}-${rand}`;
      const key = `${stem}.${extOf(b.name, type)}`;
      const thumbKey = thumbSize ? `${stem}-t.jpg` : null;
      const title = str(b.title, 200) || (kind === 'audio' ? str(String(b.name || '').replace(/\.[^.]+$/, ''), 200) : null);
      const flags = websiteFlags(me, b.website, shareable(ev) && canPublish(kind, thumbKey));
      const row = await one(`INSERT INTO media (event_id, kind, title, note, storage_key, thumb_key, mime, bytes, thumb_bytes, width, height,
          family_id, uploader, website, suggested, credit)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING id`,
        [eventId, kind, title, str(b.note, 500), key, thumbKey, type, size + thumbSize, thumbSize, int(b.width), int(b.height),
          familyOf(me), uploaderOf(me), flags.website, flags.suggested, creditOf(me)]);
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
        const actor = actorOf(me);
        await withSource({ source: me.role === 'admin' ? 'owner' : 'family', actor }, (q) =>
          q('DELETE FROM media WHERE id = $1', [row.id]));
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
      const ev = await visibleEvent(eventId, me);
      const url = safeLink(b.url);
      if (!url) throw httpError(400, 'Paste a full https:// link');
      if (isPlaylist(url)) throw httpError(400, 'Add the videos one at a time — playlists don’t show in the gallery');
      const title = str(b.title, 200) || (youtubeId(url) ? await youtubeTitle(youtubeId(url)) : new URL(url).hostname.replace(/^www\./, ''));
      const flags = websiteFlags(me, b.website, shareable(ev));
      const row = await one(`INSERT INTO media (event_id, kind, title, url, family_id, uploader, ready, website, suggested, credit)
        VALUES ($1, 'link', $2, $3, $4, $5, true, $6, $7, $8) RETURNING *`,
        [eventId, title, url, familyOf(me), uploaderOf(me),
          flags.website, flags.suggested, creditOf(me)]);
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
      const rows = await withSource(ownerTag(me), (q) =>
        q(`UPDATE events SET cover_media_id = $2 WHERE id = $1 AND status <> 'deleted' RETURNING id`, [eventId, mediaId]));
      const ev = rows[0] || null;
      if (!ev) throw httpError(404, 'Gig not found');
      return ok(res);
    }

    if (b.action === 'flyer' || b.action === 'flyer_set' || b.action === 'flyer_clear') {
      const admin = await requireAdmin(req);
      const ev = await one(`SELECT id, flyer_key FROM events WHERE id = $1 AND status = 'gathering'`, [int(b.event_id)]);
      if (!ev) throw httpError(404, 'Event not found');
      const prefix = `gig-${ev.id}/flyer-`;
      if (b.action === 'flyer') {
        const type = str(b.type, 100) || '';
        const size = int(b.size) || 0;
        if (!/^image\/(jpeg|png|webp|gif)$/.test(type)) throw httpError(400, 'A flyer has to be a photo or image');
        if (size <= 0 || size > FLYER_MAX) throw httpError(413, `A flyer can be up to ${Math.round(FLYER_MAX / 1048576)} MB`);
        if (!storageReady()) throw httpError(503, 'Media storage is not set up yet');
        if (await usedBytes() + size > quotaBytes()) throw httpError(507, 'The gallery is full — clear out old videos first');
        const key = `${prefix}${Date.now().toString(36)}-${crypto.randomBytes(6).toString('base64url')}.${extOf(b.name, type)}`;
        return ok(res, { key, put: signedUrl('PUT', key, { length: size }) });
      }
      let key = null, bytes = null;
      if (b.action === 'flyer_set') {
        key = str(b.key, 200);
        if (!key || !key.startsWith(prefix) || !/^[\w\-./]+$/.test(key) || key.includes('..')) throw httpError(400, 'Bad flyer');
        bytes = await objectSize(key);
        if (!bytes) throw httpError(400, 'The flyer did not arrive — try again');
        if (bytes > FLYER_MAX) { await removeObject(key); throw httpError(413, 'That flyer is too big'); }
      }
      await withSource(ownerTag(admin), (q) => q(`UPDATE events SET flyer_key = $2, flyer_bytes = $3, flyer_w = $4, flyer_h = $5, updated_at = now() WHERE id = $1`,
        [ev.id, key, bytes, key ? int(b.width) : null, key ? int(b.height) : null]));
      if (ev.flyer_key && ev.flyer_key !== key) await removeObject(ev.flyer_key).catch((e) => console.error('flyer delete', e.message));
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
      const ev = row.event_id && await one('SELECT status FROM events WHERE id = $1', [row.event_id]);
      const allowed = shareable(ev) && canPublish(row.kind, row.thumb_key);
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
    const actor = actorOf(me);
    await withSource({ source: me.role === 'admin' ? 'owner' : 'family', actor }, (q) =>
      q('DELETE FROM media WHERE id = $1', [row.id]));
    await removeFiles([row]);
    ok(res);
  },
});
