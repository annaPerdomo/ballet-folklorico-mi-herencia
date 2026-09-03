import { route, readJson, ok, bad } from './_lib/http.js';
import { recordInquiry } from './_lib/inquiry.js';

export default route({
  async POST(req, res) {
    const body = await readJson(req);
    if (body._gotcha) return ok(res); // honeypot
    if (!body.email && !body.name) return bad(res, 'Missing name/email');
    const result = await recordInquiry(body, { source: 'website', raw: body });
    ok(res, result);
  },
});
