import { route, readJson, ok, bad, cookie, clearCookie, int, str } from './_lib/http.js';
import { checkAdminPassword, makeAdminToken, memberToken, verifyCalendarSig, ADMIN_COOKIE, FAMILY_COOKIE } from './_lib/auth.js';
import { one } from './_lib/db.js';

const ANSWERABLE = ['open', 'confirmed'];
// Browsers cap cookie lifetime near 400 days, so this is as close to "until you sign out" as a
// cookie gets; the token behind it never expires on its own.
const MEMBER_MAX_AGE = 60 * 60 * 24 * 400;

export default route({
  async POST(req, res) {
    const body = await readJson(req);
    if (body.password !== undefined) {
      if (!checkAdminPassword(body.password)) return bad(res, 'Wrong password', 401);
      return ok(res, { role: 'admin' }, { 'Set-Cookie': [cookie(ADMIN_COOKIE, makeAdminToken(), { maxAge: 60 * 60 * 24 * 30 }), clearCookie(FAMILY_COOKIE)] });
    }
    // The signature proves they came off the GroupMe post — the same "whoever is in the chat"
    // trust the bot already reads answers under. What it grants is answer-only: see requireManage.
    if (body.family_id !== undefined) {
      const eventId = int(body.e);
      if (!eventId || !verifyCalendarSig(eventId, str(body.s, 32))) return bad(res, 'That link is not valid', 403);
      const ev = await one('SELECT id, status FROM events WHERE id = $1', [eventId]);
      if (!ev || !ANSWERABLE.includes(ev.status)) return bad(res, 'This gig is closed', 403);
      const fam = await one(
        `SELECT f.id, f.name, f.access_token FROM families f
          WHERE f.id = $1 AND EXISTS (SELECT 1 FROM dancers d WHERE d.family_id = f.id AND d.active)`,
        [int(body.family_id)]);
      if (!fam) return bad(res, 'Family not found', 404);
      const token = memberToken(fam.id, fam.access_token);
      return ok(res, { role: 'member', family: { id: fam.id, name: fam.name } },
        { 'Set-Cookie': [cookie(FAMILY_COOKIE, token, { maxAge: MEMBER_MAX_AGE }), clearCookie(ADMIN_COOKIE)] });
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
