import { route, readJson, ok, bad, str } from './_lib/http.js';
import { recordInquiry, queuedAt } from './_lib/inquiry.js';

export default route({
  async POST(req, res) {
    const body = await readJson(req);
    if (body._gotcha) return ok(res); // honeypot
    if (!body.email && !body.name) return bad(res, 'Missing name/email');
    const cid = str(body._cid, 40);
    const result = await recordInquiry(body, {
      source: 'website', raw: body, sourceRef: cid && /^[a-z0-9]+$/.test(cid) ? `web:${cid}` : null, at: queuedAt(body._age),
    });
    ok(res, result);
  },
});
