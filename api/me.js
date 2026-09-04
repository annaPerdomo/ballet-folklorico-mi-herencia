import { route, ok } from './_lib/http.js';
import { whoami, feedSig, adminFeedSig } from './_lib/auth.js';
import { channels, siteUrl } from './_lib/notify.js';
import { one } from './_lib/db.js';

async function feedUrl(me) {
  if (me.role === 'admin') return `${siteUrl()}/api/calendar?a=${adminFeedSig()}`;
  if (me.role !== 'member') return null;
  const fam = await one('SELECT id, access_token FROM families WHERE id = $1', [me.family.id]);
  return fam ? `${siteUrl()}/api/calendar?f=${fam.id}&k=${feedSig(fam.id, fam.access_token)}` : null;
}

export default route({
  async GET(req, res) {
    const me = await whoami(req);
    ok(res, { ...me, calendar_feed: await feedUrl(me), channels: channels(), configured: Boolean(process.env.ADMIN_PASSWORD) });
  },
});
