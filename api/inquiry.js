import { route, readJson, ok, bad, str, int, query, httpError } from './_lib/http.js';
import { requireAdmin, actorOf } from './_lib/auth.js';
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

export default route({
  async GET(req, res) {
    await requireAdmin(req);
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
