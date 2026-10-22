import test from 'node:test';
import assert from 'node:assert/strict';
import { youtubeId, isPlaylist } from './media.js';

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
