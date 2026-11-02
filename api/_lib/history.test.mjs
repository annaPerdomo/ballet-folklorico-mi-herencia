import test from 'node:test';
import assert from 'node:assert/strict';

const DB_URL = process.env.HISTORY_TEST_DB;
if (!DB_URL) {
  test('history (skipped, set HISTORY_TEST_DB to run)', () => {});
} else {
  process.env.DATABASE_URL = DB_URL;
  const { sql, one, withSource, getPool } = await import('./db.js');
  const { ingestMessage } = await import('./groupme-ingest.js');
  const { deleteEvent } = await import('./events.js');

  async function makeFixtures() {
    const family = await one(`INSERT INTO families (name, access_token) VALUES ('History Test Family', $1) RETURNING id`, [`hist-${Date.now()}-${Math.random()}`]);
    const dancer = await one(`INSERT INTO dancers (family_id, name) VALUES ($1, 'History Test Dancer') RETURNING id`, [family.id]);
    const event = await one(`INSERT INTO events (title, status, venue) VALUES ('History Test Event', 'open', 'Original Venue') RETURNING id`);
    return { familyId: family.id, dancerId: dancer.id, eventId: event.id };
  }

  async function cleanup({ familyId, eventId }) {
    await sql(`DELETE FROM availability WHERE event_id = $1`, [eventId]);
    await sql(`DELETE FROM events WHERE id = $1`, [eventId]);
    await sql(`DELETE FROM dancers WHERE family_id = $1`, [familyId]);
    await sql(`DELETE FROM families WHERE id = $1`, [familyId]);
    await sql(`DELETE FROM availability_history WHERE event_id = $1`, [eventId]);
    await sql(`DELETE FROM events_history WHERE event_id = $1`, [eventId]);
  }

  // Scoped to this fixture's title: a broader orphan sweep would delete the history of every
  // real deleted gig, which history exists to keep.
  async function cleanupOrphans() {
    await sql(`DELETE FROM availability_history WHERE event_id IN (
      SELECT id FROM events WHERE title = 'History Test Event'
      UNION
      SELECT event_id FROM events_history WHERE old_row->>'title' = 'History Test Event' OR new_row->>'title' = 'History Test Event'
    )`);
    await sql(`DELETE FROM events_history WHERE event_id IN (SELECT id FROM events WHERE title = 'History Test Event')
      OR old_row->>'title' = 'History Test Event' OR new_row->>'title' = 'History Test Event'`);
  }

  test.before(cleanupOrphans);

  test('insert via withSource logs source/actor/message', async () => {
    const fx = await makeFixtures();
    try {
      await withSource({ source: 'bot', actor: 'X', messageId: 5 }, (q) =>
        q(`INSERT INTO availability (event_id, dancer_id, status) VALUES ($1, $2, 'yes')`, [fx.eventId, fx.dancerId]));
      const rows = await sql(`SELECT * FROM availability_history WHERE event_id = $1`, [fx.eventId]);
      assert.equal(rows.length, 1);
      assert.equal(rows[0].op, 'insert');
      assert.equal(rows[0].source, 'bot');
      assert.equal(rows[0].actor, 'X');
      assert.equal(rows[0].groupme_message_id, 5);
      assert.equal(rows[0].old_row, null);
    } finally {
      await cleanup(fx);
    }
  });

  test('plain sql() update logs source sql with old/new status', async () => {
    const fx = await makeFixtures();
    try {
      await sql(`INSERT INTO availability (event_id, dancer_id, status) VALUES ($1, $2, 'yes')`, [fx.eventId, fx.dancerId]);
      await sql(`UPDATE availability SET status = 'no' WHERE event_id = $1 AND dancer_id = $2`, [fx.eventId, fx.dancerId]);
      const rows = await sql(`SELECT * FROM availability_history WHERE event_id = $1 ORDER BY id`, [fx.eventId]);
      const update = rows.find((r) => r.op === 'update');
      assert.ok(update);
      assert.equal(update.source, 'sql');
      assert.equal(update.old_status, 'yes');
      assert.equal(update.new_status, 'no');
      assert.ok(update.old_row.updated_at);
    } finally {
      await cleanup(fx);
    }
  });

  test('update that only bumps updated_at logs nothing', async () => {
    const fx = await makeFixtures();
    try {
      await sql(`INSERT INTO availability (event_id, dancer_id, status) VALUES ($1, $2, 'yes')`, [fx.eventId, fx.dancerId]);
      const before = await sql(`SELECT count(*) FROM availability_history WHERE event_id = $1`, [fx.eventId]);
      await sql(`UPDATE availability SET updated_at = now() WHERE event_id = $1 AND dancer_id = $2`, [fx.eventId, fx.dancerId]);
      const after = await sql(`SELECT count(*) FROM availability_history WHERE event_id = $1`, [fx.eventId]);
      assert.equal(after[0].count, before[0].count);
    } finally {
      await cleanup(fx);
    }
  });

  test('delete inside withSource logs op delete with no new_row', async () => {
    const fx = await makeFixtures();
    try {
      await sql(`INSERT INTO availability (event_id, dancer_id, status) VALUES ($1, $2, 'yes')`, [fx.eventId, fx.dancerId]);
      await withSource({ source: 'family' }, (q) =>
        q(`DELETE FROM availability WHERE event_id = $1 AND dancer_id = $2`, [fx.eventId, fx.dancerId]));
      const rows = await sql(`SELECT * FROM availability_history WHERE event_id = $1 ORDER BY id`, [fx.eventId]);
      const del = rows.find((r) => r.op === 'delete');
      assert.ok(del);
      assert.equal(del.source, 'family');
      assert.equal(del.new_row, null);
    } finally {
      await cleanup(fx);
    }
  });

  test('throw inside withSource rolls back the write and its history row', async () => {
    const fx = await makeFixtures();
    try {
      await assert.rejects(withSource({ source: 'bot' }, async (q) => {
        await q(`INSERT INTO availability (event_id, dancer_id, status) VALUES ($1, $2, 'yes')`, [fx.eventId, fx.dancerId]);
        throw new Error('boom');
      }));
      const avail = await sql(`SELECT * FROM availability WHERE event_id = $1 AND dancer_id = $2`, [fx.eventId, fx.dancerId]);
      const hist = await sql(`SELECT * FROM availability_history WHERE event_id = $1`, [fx.eventId]);
      assert.equal(avail.length, 0);
      assert.equal(hist.length, 0);
    } finally {
      await cleanup(fx);
    }
  });

  test('event update changing venue logs events_history with changed=[venue]; deleting the event keeps history', async () => {
    const fx = await makeFixtures();
    try {
      await sql(`UPDATE events SET venue = 'New Venue' WHERE id = $1`, [fx.eventId]);
      const rows = await sql(`SELECT * FROM events_history WHERE event_id = $1 ORDER BY id`, [fx.eventId]);
      const update = rows.find((r) => r.op === 'update');
      assert.ok(update);
      assert.deepEqual(update.changed, ['venue']);
      await sql(`DELETE FROM events WHERE id = $1`, [fx.eventId]);
      const after = await sql(`SELECT * FROM events_history WHERE event_id = $1`, [fx.eventId]);
      assert.ok(after.length >= rows.length);
    } finally {
      await cleanup(fx);
    }
  });

  test('a swallowed error inside withSource still rolls back', async () => {
    const fx = await makeFixtures();
    try {
      await assert.rejects(withSource({ source: 'bot' }, async (q) => {
        await q(`INSERT INTO availability (event_id, dancer_id, status) VALUES ($1, $2, 'yes')`, [fx.eventId, fx.dancerId]);
        try {
          await q(`SELECT 1/0`);
        } catch {}
      }));
      const avail = await sql(`SELECT * FROM availability WHERE event_id = $1 AND dancer_id = $2`, [fx.eventId, fx.dancerId]);
      const hist = await sql(`SELECT * FROM availability_history WHERE event_id = $1`, [fx.eventId]);
      assert.equal(avail.length, 0);
      assert.equal(hist.length, 0);
    } finally {
      await cleanup(fx);
    }
  });

  test('ingestMessage tags history with source=bot, actor=sender, groupme_message_id', async () => {
    const fx = await makeFixtures();
    const gm = await one(
      `INSERT INTO groupme_messages (message_id, sender_name, text) VALUES ($1, 'History Test Dancer', 'History is a yes for History Test Event') RETURNING id`,
      [`hist-msg-${Date.now()}-${Math.random()}`]);
    try {
      const res = await ingestMessage({
        text: 'History is a yes for History Test Event', senderName: 'History Test Dancer', senderUserId: null, sentAt: null, messageId: gm.id,
      });
      assert.ok(res.applied);
      const rows = await sql(`SELECT * FROM availability_history WHERE event_id = $1 AND dancer_id = $2`, [fx.eventId, fx.dancerId]);
      assert.equal(rows.length, 1);
      assert.equal(rows[0].source, 'bot');
      assert.equal(rows[0].groupme_message_id, gm.id);
      assert.equal(rows[0].actor, 'History Test Dancer');
    } finally {
      await sql(`DELETE FROM groupme_messages WHERE id = $1`, [gm.id]);
      await cleanup(fx);
    }
  });

  test('deleting a gig with a cover photo tags the cover_media_id cascade owner, never sql', async () => {
    const fx = await makeFixtures();
    const media = await one(
      `INSERT INTO media (event_id, kind, title, storage_key, thumb_key, ready) VALUES ($1, 'photo', 'History Test Cover', 'k.jpg', 'k-t.jpg', true) RETURNING id`,
      [fx.eventId]);
    await sql(`UPDATE events SET cover_media_id = $2 WHERE id = $1`, [fx.eventId, media.id]);
    try {
      const before = await sql(`SELECT COALESCE(max(id), 0) AS id FROM events_history WHERE event_id = $1`, [fx.eventId]);
      await deleteEvent(fx.eventId);
      const rows = await sql(`SELECT * FROM events_history WHERE event_id = $1 AND id > $2 ORDER BY id`, [fx.eventId, before[0].id]);
      assert.equal(rows.length, 2);
      assert.deepEqual(rows[0].changed, ['cover_media_id']);
      assert.equal(rows[1].op, 'delete');
      assert.ok(rows.every((r) => r.source === 'owner'));
    } finally {
      await cleanup(fx);
    }
  });

  test('deleting a dancer cascades the availability delete under the same tagged source', async () => {
    const fx = await makeFixtures();
    try {
      await sql(`INSERT INTO availability (event_id, dancer_id, status) VALUES ($1, $2, 'yes')`, [fx.eventId, fx.dancerId]);
      await withSource({ source: 'family', actor: 'History Test Family' }, (q) => q('DELETE FROM dancers WHERE id = $1', [fx.dancerId]));
      const rows = await sql(`SELECT * FROM availability_history WHERE event_id = $1 AND dancer_id = $2 ORDER BY id`, [fx.eventId, fx.dancerId]);
      const del = rows.find((r) => r.op === 'delete');
      assert.ok(del);
      assert.equal(del.source, 'family');
      assert.equal(del.actor, 'History Test Family');
    } finally {
      await cleanup(fx);
    }
  });

  test('ensureSchema SQL applies cleanly twice', async () => {
    const { SCHEMA } = await import('./db.js');
    await getPool().query(SCHEMA);
    await getPool().query(SCHEMA);
  });

  test.after(() => getPool().end());
}
