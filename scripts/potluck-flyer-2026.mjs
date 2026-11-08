// Swapped the 2026 end-of-year potluck flyer in production on 2026-11-08, mirroring the app's Change the flyer.
//   node --env-file=.env.local scripts/potluck-flyer-2026.mjs <image.jpg>           # dry run
//   node --env-file=.env.local scripts/potluck-flyer-2026.mjs <image.jpg> --apply   # uploads and writes, tagged as an owner edit
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import { getPool, withSource } from '../api/_lib/db.js';
import { storageReady, signedUrl, objectSize, removeObject } from '../api/_lib/storage.js';

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const file = args.find((a) => a !== '--apply');
if (!file || !/\.jpe?g$/i.test(file)) { console.error('Pass the flyer as a .jpg (sips -s format jpeg in.png --out flyer.jpg), plus --apply to write.'); process.exit(1); }
if (!storageReady()) { console.error('R2_* env vars are missing.'); process.exit(1); }

const bytes = readFileSync(file);
const dims = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', file], { encoding: 'utf8' });
const width = +dims.match(/pixelWidth: (\d+)/)[1], height = +dims.match(/pixelHeight: (\d+)/)[1];

const pool = getPool();
const { rows } = await pool.query(
  `SELECT id, title, event_date, flyer_key FROM events WHERE status = 'gathering' AND event_date = '2026-12-05' ORDER BY id`);
console.table(rows);
if (rows.length !== 1) { console.log('Expected exactly one gathering on 2026-12-05.'); process.exit(1); }
const ev = rows[0];
const key = `gig-${ev.id}/flyer-${Date.now().toString(36)}-${crypto.randomBytes(6).toString('base64url')}.jpg`;
console.log(`Event ${ev.id} “${ev.title}”: ${ev.flyer_key || '(no flyer)'} → ${key} (${width}×${height}, ${bytes.length} bytes)`);
if (apply) {
  const put = await fetch(signedUrl('PUT', key, { length: bytes.length }), { method: 'PUT', body: bytes, headers: { 'content-type': 'image/jpeg' } });
  if (!put.ok) throw new Error(`Upload failed: ${put.status} ${await put.text()}`);
  const size = await objectSize(key);
  if (size !== bytes.length) throw new Error(`Upload did not land (${size})`);
  await withSource({ source: 'owner', actor: 'script:potluck-flyer-2026' }, (q) =>
    q(`UPDATE events SET flyer_key = $2, flyer_bytes = $3, flyer_w = $4, flyer_h = $5, updated_at = now() WHERE id = $1`,
      [ev.id, key, size, width, height]));
  if (ev.flyer_key) await removeObject(ev.flyer_key);
  console.log('Updated.');
} else console.log('Dry run. Re-run with --apply to write it.');
await pool.end();
