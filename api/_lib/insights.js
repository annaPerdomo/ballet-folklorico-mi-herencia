import { sql } from './db.js';
import { str, int } from './http.js';
import { toItem, usedBytes, quotaBytes, ADMIN_CREDIT } from './media.js';
import { isTestInquiry } from './inquiry.js';

const TZ = 'America/Los_Angeles';
// The owners are the Ramirez family (families.name 'Ramirez'); their unlabelled uploads count there.
const OWNERS_FAMILY = 'Ramirez';
export const USAGE_ACTIONS = ['open', 'tab', 'gallery', 'view', 'play', 'download', 'calendar', 'dance', 'song'];
const MAX_BATCH = 60;
const MAX_AGO_MS = 24 * 3600 * 1000;
const MAX_ROWS_PER_MINUTE = 120;
const RETAIN_DAYS = 400;
const id32 = (v) => { const n = int(v); return n > 0 && n < 2147483647 ? n : null; };

export function cleanUsage(body) {
  const list = Array.isArray(body && body.events) ? body.events.slice(0, MAX_BATCH) : [];
  return list.filter((e) => e && USAGE_ACTIONS.includes(e.a)).map((e) => ({
    action: e.a, event_id: id32(e.e), media_id: id32(e.m), detail: str(e.d, 80),
    ago: Math.min(Math.max(int(e.t) || 0, 0), MAX_AGO_MS),
  }));
}

// The media lookup drops ids that don't exist instead of failing the batch on the foreign key.
export async function recordUsage(me, body) {
  const rows = cleanUsage(body);
  if (!rows.length) return 0;
  const device = str(body.device, 40);
  const familyId = me.family ? me.family.id : null;
  // Counted on arrival time: `at` is backdated by the client and would dodge the window.
  // Owners with no family share family_id NULL, so they're limited per device only.
  const [{ n }] = await sql(`SELECT count(*)::int AS n FROM usage_events WHERE received_at > now() - interval '1 minute'
    AND (device = $1 OR ($2::int IS NOT NULL AND family_id = $2))`, [device, familyId]);
  if (n + rows.length > MAX_ROWS_PER_MINUTE) return 0;
  await sql(
    `INSERT INTO usage_events (at, role, family_id, device, action, event_id, media_id, detail)
     SELECT now() - make_interval(secs => x.ago / 1000.0), $1, $2, $3, x.action, x.event_id,
            (SELECT id FROM media WHERE id = x.media_id), x.detail
       FROM json_to_recordset($4::json) AS x(ago int, action text, event_id int, media_id int, detail text)`,
    [me.role === 'admin' ? 'owner' : 'member', familyId, device, JSON.stringify(rows)]);
  return rows.length;
}

// mergeInquiry hard-deletes the inquiry, so it survives only in events_history — unless its
// source moved onto the gig it joined, which is then already counted.
const INQUIRIES = `
  WITH live AS (
    SELECT e.id, e.created_at, e.status, e.event_type, e.event_date, e.date_text, e.city, e.client_name, e.client_email,
           e.client_phone, e.message, e.source, e.source_ref, e.deleted_at, e.published_at, e.confirmed_at,
           COALESCE(e.raw->>'page', e.raw->>'_page', substring(e.notes FROM 'Submitted from (\\S+)')) AS page
      FROM events e WHERE e.source IN ('website', 'formspree')
  ), merged AS (
    SELECT DISTINCT ON (h.event_id) h.event_id AS id, (h.old_row->>'created_at')::timestamptz AS created_at, 'merged' AS status,
           h.old_row->>'event_type' AS event_type, (h.old_row->>'event_date')::date AS event_date, h.old_row->>'date_text' AS date_text,
           h.old_row->>'city' AS city, h.old_row->>'client_name' AS client_name, h.old_row->>'client_email' AS client_email,
           h.old_row->>'client_phone' AS client_phone, h.old_row->>'message' AS message, h.old_row->>'source' AS source,
           h.old_row->>'source_ref' AS source_ref, h.changed_at AS deleted_at, NULL::timestamptz AS published_at, NULL::timestamptz AS confirmed_at,
           substring(h.old_row->>'notes' FROM 'Submitted from (\\S+)') AS page
      FROM events_history h
     WHERE h.op = 'delete' AND h.source = 'merge' AND h.old_row->>'source' IN ('website', 'formspree')
       AND NOT EXISTS (SELECT 1 FROM events x WHERE x.id = h.event_id)
     ORDER BY h.event_id, h.id DESC
  ), every AS (
    SELECT * FROM live
    UNION ALL
    SELECT m.* FROM merged m WHERE NOT EXISTS (
      SELECT 1 FROM live l WHERE (m.source_ref IS NOT NULL AND l.source_ref = m.source_ref) OR l.created_at = m.created_at)
  )
  SELECT * FROM every ORDER BY created_at DESC`;

async function usage(days) {
  const since = `now() - make_interval(days => $1::int)`;
  const [daily, actions, tabs, heat, topMedia, galleries, dances, families, owners, calendar, entry, [span]] = await Promise.all([
    sql(`SELECT to_char((at AT TIME ZONE '${TZ}')::date, 'YYYY-MM-DD') AS day,
            count(*) FILTER (WHERE action = 'open')::int AS opens,
            count(DISTINCT device)::int AS devices,
            count(DISTINCT family_id) FILTER (WHERE role = 'member')::int AS families,
            count(*) FILTER (WHERE action IN ('view', 'play'))::int AS views
       FROM usage_events WHERE at > ${since} GROUP BY 1 ORDER BY 1`, [days]),
    sql(`SELECT action, role, count(*)::int AS n FROM usage_events WHERE at > ${since} GROUP BY 1, 2`, [days]),
    sql(`SELECT detail AS tab, role, count(*)::int AS n FROM usage_events WHERE action = 'tab' AND at > ${since} GROUP BY 1, 2`, [days]),
    sql(`SELECT extract(dow FROM at AT TIME ZONE '${TZ}')::int AS dow, extract(hour FROM at AT TIME ZONE '${TZ}')::int AS hour, count(*)::int AS n
       FROM usage_events WHERE action = 'open' AND at > ${since} GROUP BY 1, 2`, [days]),
    sql(`SELECT m.*, e.title AS event_title, e.event_date, u.views, u.plays, u.downloads, u.viewers
       FROM (SELECT media_id, count(*) FILTER (WHERE action = 'view')::int AS views, count(*) FILTER (WHERE action = 'play')::int AS plays,
                    count(*) FILTER (WHERE action = 'download')::int AS downloads, count(DISTINCT device)::int AS viewers
               FROM usage_events WHERE media_id IS NOT NULL AND at > ${since} GROUP BY media_id) u
       JOIN media m ON m.id = u.media_id LEFT JOIN events e ON e.id = m.event_id
      ORDER BY u.viewers DESC, u.views + u.plays DESC LIMIT 12`, [days]),
    sql(`SELECT e.id, e.title, e.event_date, e.status, count(*)::int AS opens, count(DISTINCT u.device)::int AS viewers
       FROM usage_events u JOIN events e ON e.id = u.event_id
      WHERE u.action = 'gallery' AND e.status <> 'deleted' AND u.at > ${since} GROUP BY e.id ORDER BY viewers DESC, opens DESC LIMIT 10`, [days]),
    sql(`SELECT detail AS dance, count(*)::int AS n, count(DISTINCT device)::int AS viewers FROM usage_events
      WHERE action = 'dance' AND detail IS NOT NULL AND at > ${since} GROUP BY 1 ORDER BY viewers DESC, n DESC LIMIT 10`, [days]),
    sql(`SELECT family_id, count(*) FILTER (WHERE action = 'open')::int AS opens, count(*) FILTER (WHERE action IN ('view', 'play'))::int AS views,
            count(DISTINCT device)::int AS devices
       FROM usage_events WHERE role = 'member' AND family_id IS NOT NULL AND at > ${since} GROUP BY 1`, [days]),
    sql(`SELECT count(DISTINCT device)::int AS devices, count(*) FILTER (WHERE action = 'open')::int AS opens, max(at) AS last_seen
       FROM usage_events WHERE role = 'owner' AND at > ${since}`, [days]),
    sql(`SELECT COALESCE(detail, 'other') AS what, count(*)::int AS n FROM usage_events WHERE action = 'calendar' AND at > ${since} GROUP BY 1`, [days]),
    sql(`SELECT split_part(detail, '|', 1) AS lang, split_part(detail, '|', 2) AS mode, split_part(detail, '|', 3) AS via, count(*)::int AS n
       FROM usage_events WHERE action = 'open' AND at > ${since} GROUP BY 1, 2, 3`, [days]),
    sql(`SELECT min(at) AS first, count(*)::int AS total FROM usage_events`),
  ]);
  const admin = { role: 'admin' };
  return {
    since: span.first, total: span.total, daily, actions, tabs, heat, galleries, dances, families, owners: owners[0], calendar, entry,
    top_media: topMedia.map((r) => ({ ...toItem(r, admin), event_title: r.event_title, event_date: r.event_date,
      views: r.views, plays: r.plays, downloads: r.downloads, viewers: r.viewers })),
  };
}

async function gallery() {
  const [byMonth, byFamily, totals, used] = await Promise.all([
    sql(`SELECT to_char(created_at AT TIME ZONE '${TZ}', 'YYYY-MM') AS month, kind, count(*)::int AS n
       FROM media WHERE ready GROUP BY 1, 2 ORDER BY 1`),
    sql(`SELECT CASE WHEN m.credit = $1 THEN $1 ELSE COALESCE(f.name, m.credit, NULLIF(m.uploader, 'owners'), '${OWNERS_FAMILY}') END AS who,
            count(*) FILTER (WHERE m.kind = 'photo')::int AS photos, count(*) FILTER (WHERE m.kind = 'video')::int AS videos,
            count(*) FILTER (WHERE m.kind = 'link')::int AS links, count(*) FILTER (WHERE m.kind = 'audio')::int AS songs,
            count(*) FILTER (WHERE m.created_at > now() - interval '30 days')::int AS recent, max(m.created_at) AS last_at
       FROM media m LEFT JOIN families f ON f.id = m.family_id WHERE m.ready
      GROUP BY 1 ORDER BY count(*) DESC LIMIT 25`, [ADMIN_CREDIT]),
    sql(`SELECT kind, count(*)::int AS n, COALESCE(sum(bytes), 0)::bigint AS bytes,
            count(*) FILTER (WHERE website)::int AS website, count(*) FILTER (WHERE suggested AND NOT website)::int AS suggested
       FROM media WHERE ready GROUP BY 1`),
    usedBytes(),
  ]);
  return { by_month: byMonth, by_family: byFamily, totals: totals.map((r) => ({ ...r, bytes: Number(r.bytes) })), used, quota: quotaBytes() };
}

// availability_history starts 2026-11-02; older answers fall back to updated_at (the last change).
async function families() {
  const [rows, channels] = await Promise.all([
    sql(`WITH first AS (
           SELECT a.event_id, a.dancer_id, COALESCE(min(h.changed_at), a.updated_at) AS at
             FROM availability a LEFT JOIN availability_history h ON h.event_id = a.event_id AND h.dancer_id = a.dancer_id AND h.op <> 'delete'
            GROUP BY a.event_id, a.dancer_id, a.updated_at
         ), posted AS (
           SELECT id, published_at FROM events WHERE status IN ('open', 'confirmed', 'done') AND published_at IS NOT NULL
             AND published_at > now() - interval '365 days' AND NOT quiet
         )
         SELECT f.id, f.name, f.created_at,
                (SELECT count(*) FROM dancers d WHERE d.family_id = f.id AND d.active)::int AS dancers,
                (SELECT count(*) FROM posted p WHERE p.published_at >= f.created_at - interval '1 day'
                   OR EXISTS (SELECT 1 FROM availability a JOIN dancers d ON d.id = a.dancer_id WHERE a.event_id = p.id AND d.family_id = f.id))::int AS gigs_posted,
                (SELECT count(DISTINCT p.id) FROM posted p JOIN availability a ON a.event_id = p.id JOIN dancers d ON d.id = a.dancer_id
                  WHERE d.family_id = f.id)::int AS gigs_answered,
                (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY extract(epoch FROM x.at - p.published_at) / 3600)
                   FROM first x JOIN posted p ON p.id = x.event_id JOIN dancers d ON d.id = x.dancer_id
                  WHERE d.family_id = f.id AND x.at >= p.published_at) AS median_hours,
                (SELECT count(*) FROM media m WHERE m.family_id = f.id AND m.ready)::int AS uploads,
                (SELECT max(at) FROM usage_events u WHERE u.family_id = f.id AND u.role = 'member') AS last_seen
           FROM families f
          WHERE EXISTS (SELECT 1 FROM dancers d WHERE d.family_id = f.id AND d.active)
          ORDER BY f.name`),
    sql(`SELECT to_char(changed_at AT TIME ZONE '${TZ}', 'YYYY-MM') AS month,
            CASE WHEN source = 'bot' THEN 'chona' WHEN source = 'family' THEN 'app' WHEN source IN ('owner', 'merge') THEN 'owner' ELSE 'other' END AS channel,
            count(*)::int AS n
       FROM availability_history WHERE op <> 'delete' GROUP BY 1, 2 ORDER BY 1`),
  ]);
  return { families: rows.map((r) => ({ ...r, median_hours: r.median_hours == null ? null : Number(r.median_hours) })), channels };
}

async function gigs() {
  return sql(`SELECT e.id, e.title, e.status, e.event_type, e.event_date, e.city, e.dancers_needed, e.source, e.created_at, e.published_at, e.confirmed_at,
      (SELECT count(*) FROM availability a WHERE a.event_id = e.id AND a.status = 'yes')::int AS yes,
      (SELECT count(*) FROM availability a WHERE a.event_id = e.id)::int AS answers,
      (SELECT count(*) FROM media m WHERE m.event_id = e.id AND m.ready AND m.kind <> 'audio')::int AS media
    FROM events e WHERE e.status IN ('open', 'confirmed', 'done', 'cancelled') ORDER BY e.event_date DESC NULLS LAST`);
}

async function chona() {
  return sql(`SELECT to_char(created_at AT TIME ZONE '${TZ}', 'YYYY-MM') AS month, count(*)::int AS messages,
      count(*) FILTER (WHERE applied)::int AS applied, count(*) FILTER (WHERE undone_at IS NOT NULL)::int AS undone,
      count(DISTINCT user_id)::int AS people
    FROM groupme_messages GROUP BY 1 ORDER BY 1`);
}

export async function insightsReport({ days }) {
  const window = [7, 30, 90, 365].includes(days) ? days : 30;
  const [inquiries, use, media, fam, gigList, bot, [{ roster }], recentUploads] = await Promise.all([
    sql(INQUIRIES), usage(window), gallery(), families(), gigs(), chona(),
    sql(`SELECT count(*)::int AS roster FROM dancers WHERE active`),
    sql(`SELECT count(*)::int AS n FROM media WHERE ready AND created_at > now() - interval '30 days'`).then((r) => r[0].n),
    sql(`DELETE FROM usage_events WHERE at < now() - make_interval(days => $1::int)`, [RETAIN_DAYS]),
  ]);
  return { generated_at: new Date().toISOString(), tz: TZ, days: window, roster,
    inquiries: inquiries.filter((r) => !isTestInquiry(r)), recent_uploads: recentUploads, usage: use, gallery: media, families: fam.families, answer_channels: fam.channels, gigs: gigList, chona: bot };
}
