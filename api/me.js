import { route, ok, readJson, query, int } from './_lib/http.js';
import { whoami, requireInsights, feedSig, adminFeedSig, sheetSig } from './_lib/auth.js';
import { channels, siteUrl } from './_lib/notify.js';
import { one } from './_lib/db.js';
import { insightsReport, recordUsage } from './_lib/insights.js';

async function feedUrl(me) {
  if (me.role === 'admin') return `${siteUrl()}/api/calendar?a=${adminFeedSig()}`;
  if (me.role !== 'member') return null;
  const fam = await one('SELECT id, access_token FROM families WHERE id = $1', [me.family.id]);
  return fam ? `${siteUrl()}/api/calendar?f=${fam.id}&k=${feedSig(fam.id, fam.access_token)}` : null;
}

// Insights and usage beacons live here: Vercel Hobby caps the project at 12 functions.
export default route({
  async GET(req, res) {
    const q = query(req);
    if (q.insights !== undefined) {
      await requireInsights(req);
      return ok(res, await insightsReport({ days: int(q.days) }));
    }
    const me = await whoami(req);
    const extra = me.role === 'admin' ? { sheet_key: sheetSig(), insights_configured: Boolean(process.env.INSIGHTS_PASSWORD) } : {};
    ok(res, { ...me, ...extra, calendar_feed: await feedUrl(me), channels: channels(), configured: Boolean(process.env.ADMIN_PASSWORD) });
  },
  // sendBeacon posts its JSON as text/plain.
  async POST(req, res) {
    const me = await whoami(req);
    if (me.role === 'anon' || me.insights) return ok(res, { stored: 0 });
    ok(res, { stored: await recordUsage(me, await readJson(req)) });
  },
});
