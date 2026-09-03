import { route, ok } from './_lib/http.js';
import { whoami } from './_lib/auth.js';
import { channels } from './_lib/notify.js';

export default route({
  async GET(req, res) {
    const me = await whoami(req);
    ok(res, { ...me, channels: channels(), configured: Boolean(process.env.ADMIN_PASSWORD) });
  },
});
