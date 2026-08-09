// Service worker for the static Puritan Parser app.
// Keep this file next to index.html so root-scoped registration covers every route.
const CACHE = 'puritan-parser-v106-v1.9.2-greek-vocabulary-audit';
const FILES = [
  './',
  './index.html',
  './styles.css',
  './styles.css?v=v1.9.2-greek-vocabulary-audit-7',
  './src/main.js',
  './src/main.js?v=v1.9.2-greek-vocabulary-audit-7',
  './src/core/parser-core.js',
  './src/core/hebrew-search.js',
  './src/core/migrations/migrations.js',
  './src/core/migrations/migration-runner.js',
  './src/app-state.js',
  './src/ui/dom.js',
  './src/ui/toast.js',
  './src/models/word-entry.js',
  './src/models/gloss.js',
  './src/models/personal-glosses.js',
  './src/models/user-progress.js',
  './src/models/parse-data.js',
  './src/models/review-history.js',
  './src/models/preferences.js',
  './src/models/dashboard-stats.js',
  './src/models/vocabulary-learning.js',
  './src/core/vocabulary-mastery.js',
  './src/core/learning-practice.js',
  './src/models/saved-vocabulary.js',
  './src/models/study-sets.js',
  './src/models/onboarding.js',
  './src/core/storage/storage.js',
  './src/core/storage/vocab-storage.js',
  './src/core/storage/prefs-storage.js',
  './src/core/storage/dashboard-storage.js',
  './src/core/reader-preferences.js',
  './src/core/source-data/vocab-source.js',
  './src/core/source-data/parser-source.js',
  './src/core/content/content-metadata.js',
  './src/core/content/content-loader.js',
  './src/core/translations/translation-provider.js',
  './src/core/srs.js',
  './src/core/sample-data.js',
  './src/core/data-loader.js',
  './src/ui/theme.js',
  './src/core/filters.js',
  './src/core/study-entries.js',
  './src/core/book-progress.js',
  './src/core/progress-service.js',
  './src/core/router.js',
  './src/features/grammar/handbook-data.js',
  './src/features/grammar/reference-data.js',
  './src/features/grammar/index.js',
  './src/features/reader/index.js',
  './src/features/global-search/index.js',
  './src/features/onboarding/index.js',
  './src/features/learn/recognition-engine.js',
  './src/features/learn/index.js',
  './src/features/vocab/index.js',
  './src/ui/modal.js',
  './src/features/flashcards/index.js',
  './src/features/parsing/index.js',
  './src/features/dashboard/index.js',
  './src/features/progress/index.js',
  './src/features/settings/index.js',
  './src/features/settings/events.js',
  './src/bootstrap.js',
  './data/metadata/content-manifest.json',
  './data/glosses/corrections.json?v=v1.9.2-greek-vocabulary-audit-7',
  './data/glosses/unavailable-glosses.json',
  './data/translations/oeb/manifest.json',
  './data/translations/web/manifest.json',
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

  if (evt.request.mode === 'navigate') {
    evt.respondWith(
      fetch(evt.request).catch(() => caches.match('./index.html').then(resp => resp || caches.match('./')))
    );
    return;
  }
  // JSON content uses network-first runtime caching. Future large Bible, grammar,
  // gloss, and search-index files must not be added to FILES; they should be
  // cached here only after a feature lazy-loads them on demand.
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

  const isVersionedStartupAsset = url.searchParams.has('v')
    && (url.pathname.endsWith('.js') || url.pathname.endsWith('.css'));
  evt.respondWith(
    caches.match(evt.request, { ignoreSearch: !isVersionedStartupAsset })
      .then(resp => resp || fetch(evt.request).catch(() => caches.match('./')))
  );
});
