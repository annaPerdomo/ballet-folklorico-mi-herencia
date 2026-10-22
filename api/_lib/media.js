import { sql } from './db.js';
import { signedUrl, removeObject, storageReady } from './storage.js';

const MB = 1024 * 1024;
// Clips only: full performances go on YouTube so they don't eat the free tier.
export const LIMITS = { photo: 25 * MB, video: 150 * MB, audio: 60 * MB };
export const THUMB_MAX = MB;
export const TYPES = { photo: /^image\//, video: /^video\//, audio: /^audio\// };

// R2's free tier is 10 GB-month. Stop a little short so a busy month never turns into a bill.
export const quotaBytes = () => Math.round((Number(process.env.MEDIA_QUOTA_GB) || 9) * 1024 * MB);

export async function usedBytes() {
  const [{ n }] = await sql('SELECT COALESCE(sum(bytes), 0)::bigint AS n FROM media');
  return Number(n);
}

export function youtubeId(url) {
  let u;
  try { u = new URL(String(url)); } catch { return null; }
  const host = u.hostname.replace(/^(www|m|music)\./, '');
  let id = null;
  if (host === 'youtu.be') id = u.pathname.slice(1).split('/')[0];
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    id = u.searchParams.get('v') || (u.pathname.match(/^\/(?:shorts|live|embed)\/([^/?#]+)/) || [])[1] || null;
  }
  return id && /^[\w-]{11}$/.test(id) ? id : null;
}

export function safeLink(url) {
  try {
    const u = new URL(String(url).trim());
    return u.protocol === 'https:' ? u.href : null;
  } catch { return null; }
}

export function fileName(row) {
  const ext = (row.storage_key || '').split('.').pop();
  const base = (row.title || `${row.kind}-${row.id}`).replace(/[\\/:*?"<>|\n\r]+/g, ' ').trim().slice(0, 80);
  return ext && !base.toLowerCase().endsWith('.' + ext.toLowerCase()) ? `${base}.${ext}` : base;
}

export function toItem(row, me) {
  const mine = me.role === 'admin' || (me.family && row.family_id === me.family.id);
  const item = {
    id: row.id, kind: row.kind, title: row.title, note: row.note, event_id: row.event_id,
    mime: row.mime, bytes: Number(row.bytes) || 0, width: row.width, height: row.height,
    uploader: row.uploader, credit: row.credit || null, created_at: row.created_at, can_edit: Boolean(mine), website: Boolean(row.website), suggested: Boolean(row.suggested),
  };
  if (row.kind === 'link') {
    item.url = row.url;
    const yt = youtubeId(row.url);
    if (yt) { item.youtube = yt; item.thumb = `https://i.ytimg.com/vi/${yt}/hqdefault.jpg`; }
    return item;
  }
  if (!storageReady()) return item;
  item.url = signedUrl('GET', row.storage_key);
  item.download = signedUrl('GET', row.storage_key, { download: fileName(row) });
  if (row.thumb_key) item.thumb = signedUrl('GET', row.thumb_key);
  return item;
}

export function coverUrl(row) {
  if (!row) return null;
  if (row.kind === 'photo') return row.thumb_key && storageReady() ? signedUrl('GET', row.thumb_key) : null;
  const yt = row.kind === 'link' && youtubeId(row.url);
  return yt ? `https://i.ytimg.com/vi/${yt}/hqdefault.jpg` : null;
}

// Music stays in the group. A photo's thumbnail proves the browser re-encoded it, stripping EXIF GPS.
export function canPublish(kind, thumbKey) {
  return ['photo', 'video', 'link'].includes(kind) && (kind !== 'photo' || Boolean(thumbKey));
}

// /familia is open to anyone, so only an owner can publish; families can only suggest.
export function websiteFlags(me, want, allowed) {
  const on = want === true && allowed;
  return me.role === 'admin' ? { website: on, suggested: false } : { website: false, suggested: on };
}

export async function removeFiles(rows) {
  await Promise.all(rows.flatMap((r) => [r.storage_key, r.thumb_key]).filter(Boolean)
    .map((k) => removeObject(k).catch((e) => console.error('media delete', k, e.message))));
}

// Delete rows before files, so a failed gig delete never leaves rows pointing at missing files.
export function takeEventMedia(eventId) {
  return sql('DELETE FROM media WHERE event_id = $1 RETURNING storage_key, thumb_key', [eventId]);
}
