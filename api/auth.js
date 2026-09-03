import { route, readJson, ok, bad, cookie, clearCookie } from './_lib/http.js';
import { checkAdminPassword, makeAdminToken, ADMIN_COOKIE, FAMILY_COOKIE } from './_lib/auth.js';
import { one } from './_lib/db.js';

export default route({
  async POST(req, res) {
    const body = await readJson(req);
    if (body.password !== undefined) {
      if (!checkAdminPassword(body.password)) return bad(res, 'Wrong password', 401);
      return ok(res, { role: 'admin' }, { 'Set-Cookie': [cookie(ADMIN_COOKIE, makeAdminToken(), { maxAge: 60 * 60 * 24 * 30 }), clearCookie(FAMILY_COOKIE)] });
    }
    if (body.key) {
      const fam = await one('SELECT id, name FROM families WHERE access_token = $1', [String(body.key)]);
      if (!fam) return bad(res, 'That link is not valid anymore. Ask the owners for a new one.', 401);
      return ok(res, { role: 'member', family: fam }, { 'Set-Cookie': [cookie(FAMILY_COOKIE, String(body.key)), clearCookie(ADMIN_COOKIE)] });
    }
    return bad(res, 'Nothing to sign in with');
  },
  async DELETE(_req, res) {
    ok(res, { ok: true }, { 'Set-Cookie': [clearCookie(ADMIN_COOKIE), clearCookie(FAMILY_COOKIE)] });
  },
});
