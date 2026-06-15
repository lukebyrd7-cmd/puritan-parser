// Service worker for the static Puritan Parser app.
// Keep this file next to index.html so navigator.serviceWorker.register('./sw.js') works.
const CACHE = 'puritan-parser-v3';
const FILES = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './src/parser-core.js',
  './vocab_all.json',
  './logo.png',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (evt) => {
  evt.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (evt) => {
  evt.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => (k !== CACHE ? caches.delete(k) : undefined))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (evt) => {
  const url = new URL(evt.request.url);
  if (url.pathname.endsWith('.json')) {
    evt.respondWith(
      fetch(evt.request).then(r => {
        if (!r || r.status !== 200) return caches.match(evt.request);
        const copy = r.clone();
        caches.open(CACHE).then(cache => cache.put(evt.request, copy));
        return r;
      }).catch(() => caches.match(evt.request))
    );
    return;
  }

  evt.respondWith(
    caches.match(evt.request)
      .then(resp => resp || fetch(evt.request).catch(() => caches.match('./')))
  );
});
