import { route, readJson, ok, query, int, str, httpError } from './_lib/http.js';
import { requireUser } from './_lib/auth.js';
import { one, sql } from './_lib/db.js';

async function ownedDancer(me, id) {
  const d = await one('SELECT id, family_id FROM dancers WHERE id = $1', [id]);
  if (!d) throw httpError(404, 'Dancer not found');
  if (me.role !== 'admin' && d.family_id !== me.family.id) throw httpError(403, 'Forbidden');
  return d;
}

export default route({
  async POST(req, res) {
    const me = await requireUser(req);
    const b = await readJson(req);
    const familyId = me.role === 'admin' ? int(b.family_id) : me.family.id;
    const name = str(b.name, 80);
    if (!familyId || !name) throw httpError(400, 'family_id and name required');
    const row = await one('INSERT INTO dancers (family_id, name) VALUES ($1,$2) RETURNING id', [familyId, name]);
    ok(res, { id: row.id });
  },
  async PATCH(req, res) {
    const me = await requireUser(req);
    const b = await readJson(req);
    const id = int(query(req).id || b.id);
    await ownedDancer(me, id);
    if ('name' in b) await sql('UPDATE dancers SET name = $2 WHERE id = $1', [id, str(b.name, 80)]);
    if ('active' in b) await sql('UPDATE dancers SET active = $2 WHERE id = $1', [id, Boolean(b.active)]);
    ok(res);
  },
  async DELETE(req, res) {
    const me = await requireUser(req);
    const id = int(query(req).id);
    await ownedDancer(me, id);
    await sql('DELETE FROM dancers WHERE id = $1', [id]);
    ok(res);
  },
});
