import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanUsage } from './insights.js';

test('usage beacons keep only known actions, clamp ages, and cap the batch', () => {
  const rows = cleanUsage({ events: [
    { a: 'open', d: 'en|app|familia' }, { a: 'drop table' }, { a: 'view', m: '12', e: 'x', t: -5 }, { a: 'tab', d: 'media', t: 9e12 },
  ] });
  assert.deepEqual(rows.map((r) => r.action), ['open', 'view', 'tab']);
  assert.equal(rows[1].media_id, 12);
  assert.equal(rows[1].event_id, null);
  assert.equal(rows[1].ago, 0);
  assert.equal(rows[2].ago, 24 * 3600 * 1000);
  assert.equal(cleanUsage({ events: Array(100).fill({ a: 'open' }) }).length, 60);
  assert.deepEqual(cleanUsage({}), []);
});
