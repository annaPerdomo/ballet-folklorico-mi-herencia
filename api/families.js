import { route, readJson, ok, query, int, str, httpError } from './_lib/http.js';
import { requireAdmin, requireManage, requireUser, newFamilyToken } from './_lib/auth.js';
import { one, sql } from './_lib/db.js';
import { siteUrl } from './_lib/notify.js';

/* Families, dancers and availability share one function to stay under the 12-function limit on
   the Hobby plan. /api/dancers and /api/availability keep their own URLs: vercel.json rewrites
   them here with ?r=, and dev-server.mjs mirrors those rewrites. */

const inviteLink = (token) => `${siteUrl()}/team/?k=${token}`;

async function listFamilies() {
  const rows = await sql(
    `SELECT f.id, f.name, f.groupme_user_id, f.access_token, f.created_at,
            COALESCE(json_agg(json_build_object('id', d.id, 'name', d.name, 'active', d.active) ORDER BY d.name)
                     FILTER (WHERE d.id IS NOT NULL), '[]'::json) AS dancers
       FROM families f LEFT JOIN dancers d ON d.family_id = f.id
      GROUP BY f.id ORDER BY f.name`);
  return rows.map((f) => ({ ...f, invite_link: inviteLink(f.access_token), access_token: undefined }));
}

async function ownedDancer(me, id) {
  const d = await one('SELECT id, family_id FROM dancers WHERE id = $1', [id]);
  if (!d) throw httpError(404, 'Dancer not found');
  if (me.role !== 'admin' && d.family_id !== me.family.id) throw httpError(403, 'Forbidden');
  return d;
}

const dancers = {
  async POST(req, res) {
    const me = await requireManage(req);
    const b = await readJson(req);
    const familyId = me.role === 'admin' ? int(b.family_id) : me.family.id;
    const name = str(b.name, 80);
    if (!familyId || !name) throw httpError(400, 'family_id and name required');
    const row = await one('INSERT INTO dancers (family_id, name) VALUES ($1,$2) RETURNING id', [familyId, name]);
    ok(res, { id: row.id });
  },
  async PATCH(req, res) {
    const me = await requireManage(req);
    const b = await readJson(req);
    const id = int(query(req).id || b.id);
    await ownedDancer(me, id);
    if ('name' in b) await sql('UPDATE dancers SET name = $2 WHERE id = $1', [id, str(b.name, 80)]);
    if ('active' in b) await sql('UPDATE dancers SET active = $2 WHERE id = $1', [id, Boolean(b.active)]);
    ok(res);
  },
  async DELETE(req, res) {
    const me = await requireManage(req);
    const id = int(query(req).id);
    await ownedDancer(me, id);
    await sql('DELETE FROM dancers WHERE id = $1', [id]);
    ok(res);
  },
};

const availability = {
  async POST(req, res) {
    const me = await requireUser(req);
    const body = await readJson(req);
    const eventId = int(body.event_id); const dancerId = int(body.dancer_id);
    const status = body.status == null || body.status === '' ? null : String(body.status);
    if (!eventId || !dancerId) throw httpError(400, 'event_id and dancer_id required');
    if (status && !['yes', 'no', 'maybe'].includes(status)) throw httpError(400, 'Bad status');

    const dancer = await one('SELECT id, family_id FROM dancers WHERE id = $1 AND active', [dancerId]);
    if (!dancer) throw httpError(404, 'Dancer not found');
    if (me.role !== 'admin' && dancer.family_id !== me.family.id) throw httpError(403, 'Not your dancer');

    const ev = await one('SELECT id, status FROM events WHERE id = $1', [eventId]);
    if (!ev) throw httpError(404, 'Event not found');
    if (me.role !== 'admin' && !['open', 'confirmed'].includes(ev.status)) throw httpError(400, 'This event is not taking answers');

    if (!status) {
      await sql('DELETE FROM availability WHERE event_id = $1 AND dancer_id = $2', [eventId, dancerId]);
    } else {
      await sql(
        `INSERT INTO availability (event_id, dancer_id, status, note) VALUES ($1,$2,$3,$4)
         ON CONFLICT (event_id, dancer_id) DO UPDATE SET status = EXCLUDED.status, note = EXCLUDED.note, updated_at = now()`,
        [eventId, dancerId, status, str(body.note, 300)]);
    }
    ok(res);
  },
};

const families = {
  async GET(req, res) {
    await requireAdmin(req);
    ok(res, { families: await listFamilies() });
  },
  async POST(req, res) {
    await requireAdmin(req);
    const b = await readJson(req);
    const name = str(b.name, 120);
    if (!name) throw httpError(400, 'Family name is required');
    const fam = await one(
      'INSERT INTO families (name, access_token, groupme_user_id) VALUES ($1,$2,$3) RETURNING id, access_token',
      [name, newFamilyToken(), str(b.groupme_user_id, 40)]);
    const dancers = (Array.isArray(b.dancers) ? b.dancers : String(b.dancers || '').split(/[,\n]/))
      .map((d) => str(d, 80)).filter(Boolean).slice(0, 20);
    for (const d of dancers) await sql('INSERT INTO dancers (family_id, name) VALUES ($1,$2)', [fam.id, d]);
    ok(res, { id: fam.id, invite_link: inviteLink(fam.access_token) });
  },
  async PATCH(req, res) {
    const me = await requireManage(req);
    const b = await readJson(req);
    const id = int(query(req).id || b.id);
    if (me.role !== 'admin' && me.family.id !== id) throw httpError(403, 'Forbidden');
    if (b.action === 'rotate') {
      if (me.role !== 'admin') throw httpError(403, 'Forbidden');
      const token = newFamilyToken();
      await sql('UPDATE families SET access_token = $2 WHERE id = $1', [id, token]);
      return ok(res, { invite_link: inviteLink(token) });
    }
    const sets = []; const params = [id];
    if ('name' in b) { params.push(str(b.name, 120)); sets.push(`name = $${params.length}`); }
    if ('groupme_user_id' in b && me.role === 'admin') { params.push(str(b.groupme_user_id, 40)); sets.push(`groupme_user_id = $${params.length}`); }
    if (sets.length) await sql(`UPDATE families SET ${sets.join(', ')} WHERE id = $1`, params);
    ok(res);
  },
  async DELETE(req, res) {
    await requireAdmin(req);
    const id = int(query(req).id);
    await sql('DELETE FROM families WHERE id = $1', [id]);
    ok(res);
  },
};

const RESOURCES = { dancers, availability, families };

export default route({
  async ALL(req, res) {
    const set = RESOURCES[query(req).r || 'families'];
    if (!set) throw httpError(404, 'Unknown resource');
    const fn = set[req.method];
    if (!fn) throw httpError(405, 'Method not allowed');
    await fn(req, res);
  },
});
