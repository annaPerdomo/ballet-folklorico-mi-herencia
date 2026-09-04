import { route, readJson, ok, query, int, str, httpError } from './_lib/http.js';
import { requireAdmin, requireManage, newFamilyToken } from './_lib/auth.js';
import { one, sql } from './_lib/db.js';
import { siteUrl } from './_lib/notify.js';

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

export default route({
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
});
