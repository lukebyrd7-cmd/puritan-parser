// Minimal service worker: caches app shell and JSON vocab files for offline use.
// Install/activate events: basic static caching.
// NOTE: keep this file next to index.html
const CACHE = 'puritan-parser-v1';
const FILES = [
  './',
  './index.html',
  './greek_25plus.json',
  './hebrew_60plus.json',
  './logo.png'
];

self.addEventListener('install', (evt) => {
  evt.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(FILES)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (evt) => {
  evt.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => {
      if(k !== CACHE) return caches.delete(k);
    }))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (evt) => {
  // Network-first for JSON files, cache-first for shell
  const url = new URL(evt.request.url);
  if(url.pathname.endsWith('.json')){
    evt.respondWith(
      fetch(evt.request).then(r => {
        if(!r || r.status !== 200) return caches.match(evt.request);
        const copy = r.clone();
        caches.open(CACHE).then(cache => cache.put(evt.request, copy));
        return r;
      }).catch(()=> caches.match(evt.request))
    );
    return;
  }
  evt.respondWith(
    caches.match(evt.request).then(resp => resp || fetch(evt.request).catch(()=> caches.match('./')))
  );
});
