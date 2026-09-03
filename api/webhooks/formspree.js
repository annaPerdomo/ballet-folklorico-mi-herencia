import { route, readJson, ok, bad, query } from '../_lib/http.js';
import { recordInquiry } from '../_lib/inquiry.js';

// Formspree's webhook body is { form, submission: { _id, ...fields } } on some plans and flat on others.
export default route({
  async POST(req, res) {
    const secret = process.env.FORMSPREE_WEBHOOK_SECRET;
    if (secret && query(req).secret !== secret) return bad(res, 'Forbidden', 403);
    const body = await readJson(req);
    const fields = body.submission || body.data || body;
    const ref = fields._id || body.id || body.submission_id || null;
    const result = await recordInquiry(fields, { source: 'formspree', sourceRef: ref ? `formspree:${ref}` : null, raw: body });
    ok(res, result);
  },
});
