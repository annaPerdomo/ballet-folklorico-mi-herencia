/* Offline shell: the installed app has no address bar, so a cold start with no signal is
   otherwise a dead end. Network first — a deploy must never be served stale.
   /api/ is never cached: a stale roster is worse than an honest error. */
var CACHE = 'bfmh-team-v3';
var SHELL = ['/team/', '/team/team.js', '/team/team.css', '/team/manifest.webmanifest',
  '/team/icons/icon-192.png', '/team/icons/icon-512.png', '/team/icons/icon-180.png',
  '/images/optimized/la-chona-badge.webp', '/images/optimized/la-chona-sm.webp'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.indexOf('/api/') === 0) return;
  e.respondWith(fetch(e.request).then(function (res) {
    if (res && res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(e.request, copy); }); }
    return res;
  }).catch(function () {
    return caches.match(e.request).then(function (hit) {
      return hit || (e.request.mode === 'navigate' ? caches.match('/team/') : Promise.reject(new Error('offline')));
    });
  }));
});
