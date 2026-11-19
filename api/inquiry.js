import { route, readJson, ok, bad, str, int, query, httpError } from './_lib/http.js';
import { requireAdmin, actorOf, reviewSig } from './_lib/auth.js';
import { siteUrl } from './_lib/notify.js';
import { listReviews, reviewTarget, reviewFor, setReviewStatus, deleteReview } from './_lib/reviews.js';
import { recordInquiry, queuedAt } from './_lib/inquiry.js';
import {
  listStudents, updateStudent, deleteStudent, moveInquiryToStudent, joinStudent, listReads, markReads, cleanReader,
} from './_lib/students.js';

// Students and per-owner read marks live here: Vercel Hobby caps the project at 12 functions.
const OWNER = {
  async read(req, res, b) {
    ok(res, { marked: await markReads(cleanReader(b.reader), b.items, b.unread === true) });
  },
  async move(req, res, b, me) {
    const id = int(b.event_id);
    if (!id) throw httpError(400, 'Which inquiry?');
    ok(res, await moveInquiryToStudent(id, actorOf(me)));
  },
  async join(req, res, b) {
    const id = int(b.id);
    if (!id) throw httpError(400, 'Which student?');
    ok(res, await joinStudent(id, b));
  },
};

const REVIEW_ACTIONS = { approve: 'approved', hide: 'hidden', pending: 'pending' };

const OWNER_GET = {
  async reviews(req, res) {
    ok(res, { reviews: await listReviews() });
  },
  async 'review-link'(req, res) {
    const id = int(query(req).event);
    if (!id || !(await reviewTarget(id))) throw httpError(404, 'No such gig');
    const review = await reviewFor(id);
    ok(res, { url: `${siteUrl()}/r/${id}/${reviewSig(id)}`, review: review ? { id: review.id, status: review.status } : null });
  },
};

OWNER.reviews = async (req, res, b) => {
  const id = int(b.id);
  if (!id) throw httpError(400, 'Which review?');
  if (b.action === 'delete') await deleteReview(id);
  else if (Object.hasOwn(REVIEW_ACTIONS, b.action)) await setReviewStatus(id, REVIEW_ACTIONS[b.action], int(b.rev));
  else throw httpError(400, 'Unknown action');
  ok(res);
};

export default route({
  async GET(req, res) {
    await requireAdmin(req);
    const r = query(req).r;
    if (Object.hasOwn(OWNER_GET, r)) return OWNER_GET[r](req, res);
    const reader = cleanReader(query(req).reader);
    const [students, reads] = await Promise.all([listStudents(), listReads(reader)]);
    ok(res, { students, reads });
  },
  async POST(req, res) {
    const body = await readJson(req);
    const r = query(req).r;
    const op = Object.hasOwn(OWNER, r) ? OWNER[r] : null;
    if (op) return op(req, res, body, await requireAdmin(req));
    if (body._gotcha) return ok(res); // honeypot
    if (!body.email && !body.name) return bad(res, 'Missing name/email');
    const cid = str(body._cid, 40);
    const result = await recordInquiry(body, {
      source: 'website', raw: body, sourceRef: cid && /^[a-z0-9]+$/.test(cid) ? `web:${cid}` : null, at: queuedAt(body._age),
    });
    ok(res, result);
  },
  async PATCH(req, res) {
    await requireAdmin(req);
    const b = await readJson(req);
    const id = int(query(req).id || b.id);
    if (!id) throw httpError(400, 'Which student?');
    await updateStudent(id, b);
    ok(res);
  },
  async DELETE(req, res) {
    await requireAdmin(req);
    const id = int(query(req).id);
    if (!id) throw httpError(400, 'Which student?');
    await deleteStudent(id);
    ok(res);
  },
});
