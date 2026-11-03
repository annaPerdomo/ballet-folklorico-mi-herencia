import test from 'node:test';
import assert from 'node:assert/strict';
import { youtubeId, isPlaylist, feedBatches, isMine } from './media.js';

const ID = 'QyovrKHoHNs';

test('youtubeId reads every video link shape', () => {
  for (const url of [
    `https://www.youtube.com/watch?v=${ID}`, `https://youtu.be/${ID}?si=x`, `https://m.youtube.com/watch?v=${ID}`,
    `https://music.youtube.com/watch?v=${ID}`, `https://www.youtube.com/shorts/${ID}`, `https://www.youtube.com/live/${ID}`,
    `https://www.youtube-nocookie.com/embed/${ID}`, `https://www.youtube.com/watch?v=${ID}&list=PLabc`,
  ]) assert.equal(youtubeId(url), ID, url);
  assert.equal(youtubeId('https://www.youtube.com/embed/videoseries?list=PLabc'), null);
  assert.equal(youtubeId('https://example.com/watch?v=' + ID), null);
});

test('isPlaylist catches playlist-only links but not a video inside a playlist', () => {
  for (const url of ['https://www.youtube.com/playlist?list=PLabc', 'https://www.youtube.com/watch?list=PLabc',
    'https://www.youtube.com/embed/videoseries?list=PLabc', 'https://www.youtube-nocookie.com/embed/videoseries?list=PLabc'])
    assert.equal(isPlaylist(url), true, url);
  for (const url of [`https://www.youtube.com/watch?v=${ID}&list=PLabc`, `https://youtu.be/${ID}`, 'https://example.com/?list=1', 'not a url'])
    assert.equal(isPlaylist(url), false, url);
});

test('feedBatches groups one uploader’s run into one folder and splits on gaps or other uploaders', () => {
  const at = (min) => new Date(Date.UTC(2026, 10, 1, 12, 0) - min * 60000).toISOString();
  const row = (id, min, extra = {}) => ({ id, created_at: at(min), event_id: 7, family_id: 3, uploader: 'Ramirez', credit: null, kind: 'photo', ...extra });
  const ids = (b) => b.map((rows) => rows.map((r) => r.id));
  assert.deepEqual(ids(feedBatches([row(1, 0), row(2, 5), row(3, 50), row(4, 200)])), [[1, 2, 3], [4]]);
  assert.deepEqual(ids(feedBatches([row(1, 0), row(2, 1, { family_id: 4, uploader: 'Marin' }), row(3, 2)])), [[1], [2], [3]]);
  assert.deepEqual(ids(feedBatches([row(1, 0), row(2, 1, { event_id: 8 }), row(3, 2, { kind: 'video' }), row(4, 3, { kind: 'audio', event_id: null })])), [[1], [2], [3], [4]]);
  assert.deepEqual(feedBatches([]), []);
});

test('isMine matches a family’s own rows, and an owner’s rows under their family name or “owners”', () => {
  const fam = { role: 'family', family: { id: 3, name: 'Ramirez' } };
  assert.equal(isMine({ family_id: 3 }, fam), true);
  assert.equal(isMine({ family_id: 4 }, fam), false);
  assert.equal(isMine({ family_id: null, uploader: 'owners' }, { role: 'admin', family: null }), true);
  assert.equal(isMine({ family_id: null, uploader: 'owners' }, { role: 'admin', family: { id: 8, name: 'Mendez Perdomo' } }), false);
  assert.equal(isMine({ family_id: null, uploader: 'Mendez Perdomo' }, { role: 'admin', family: { id: 8, name: 'Mendez Perdomo' } }), true);
  assert.equal(isMine({ family_id: null, uploader: 'Mendez Perdomo', credit: 'Anna Mendez Perdomo' }, { role: 'admin', family: { id: 8, name: 'Mendez Perdomo' } }), false);
});
