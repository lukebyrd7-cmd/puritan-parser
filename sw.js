// Service worker for the static Puritan Parser app.
// Keep this file next to index.html so root-scoped registration covers every route.
const APP_VERSION = 'v1.9.5-canonical-vocabulary-forms-1';
const CACHE_PREFIX = 'puritan-parser-';
const CACHE = `${CACHE_PREFIX}v111-${APP_VERSION}`;
const CACHE_BATCH_SIZE = 24;

const STARTUP_SCRIPT_PATHS = [
  'src/main.js',
  'src/core/parser-core.js',
  'src/core/hebrew-search.js',
  'src/core/migrations/migrations.js',
  'src/core/migrations/migration-runner.js',
  'src/app-state.js',
  'src/ui/dom.js',
  'src/ui/toast.js',
  'src/models/canonical-forms.js',
  'src/models/word-entry.js',
  'src/models/gloss.js',
  'src/models/personal-glosses.js',
  'src/models/user-progress.js',
  'src/models/parse-data.js',
  'src/models/review-history.js',
  'src/models/preferences.js',
  'src/models/dashboard-stats.js',
  'src/models/vocabulary-learning.js',
  'src/core/vocabulary-mastery.js',
  'src/core/learning-practice.js',
  'src/models/saved-vocabulary.js',
  'src/models/study-sets.js',
  'src/models/onboarding.js',
  'src/core/storage/storage.js',
  'src/core/storage/vocab-storage.js',
  'src/core/storage/prefs-storage.js',
  'src/core/storage/dashboard-storage.js',
  'src/core/reader-preferences.js',
  'src/core/source-data/vocab-source.js',
  'src/core/source-data/parser-source.js',
  'src/core/content/content-metadata.js',
  'src/core/content/content-loader.js',
  'src/core/translations/translation-provider.js',
  'src/core/srs.js',
  'src/core/sample-data.js',
  'src/core/data-loader.js',
  'src/ui/theme.js',
  'src/core/filters.js',
  'src/core/study-entries.js',
  'src/core/runtime-preparation.js',
  'src/core/book-progress.js',
  'src/core/progress-service.js',
  'src/core/router.js',
  'src/features/grammar/handbook-data.js',
  'src/features/grammar/reference-data.js',
  'src/features/grammar/index.js',
  'src/features/reader/index.js',
  'src/features/global-search/index.js',
  'src/features/onboarding/index.js',
  'src/features/learn/recognition-engine.js',
  'src/features/learn/index.js',
  'src/features/vocab/index.js',
  'src/ui/modal.js',
  'src/features/flashcards/index.js',
  'src/features/parsing/index.js',
  'src/features/dashboard/index.js',
  'src/features/progress/index.js',
  'src/features/settings/index.js',
  'src/features/settings/events.js',
  'src/bootstrap.js'
];

// Every injected script uses the same query version. Cache the exact URLs so an
// offline launch never substitutes index.html for a missing JavaScript module.
const APP_SHELL_FILES = [
  './',
  './index.html',
  `./styles.css?v=${APP_VERSION}`,
  ...STARTUP_SCRIPT_PATHS.map(path => `./${path}?v=${APP_VERSION}`),
  './manifest.json',
  `./assets/fonts/eb-garamond-v33-greek-ext.woff2?v=${APP_VERSION}`,
  `./assets/fonts/eb-garamond-v33-greek.woff2?v=${APP_VERSION}`,
  './data/metadata/content-manifest.json',
  `./data/glosses/corrections.json?v=${APP_VERSION}`,
  './logo.png',
  './icon-192.png',
  './icon-512.png'
];

// These small files describe every larger runtime file needed for deterministic
// offline population. Development lexicons, audits, and source inputs are not
// included.
const OFFLINE_DATA_SEEDS = [
  './vocab_all.json',
  './data/glosses/greek-glosses.json',
  './data/glosses/hebrew-glosses.json',
  './data/glosses/unavailable-glosses.json',
  './data/lexical/canonical-forms.json',
  './data/greek/manifest.json',
  './data/greek/search-index.json',
  './data/hebrew/manifest.json',
  './data/hebrew/search-index.json',
  './data/hebrew-interlinear/manifest.json',
  './data/translations/oeb/manifest.json',
  './data/translations/web/manifest.json'
];

function scopedUrl(path) {
  return new URL(path, self.registration.scope).href;
}

async function cacheFiles(cache, paths, options = {}) {
  const unique = [...new Set(paths)];
  const batchSize = Math.max(1, Number(options.batchSize) || CACHE_BATCH_SIZE);
  for (let index = 0; index < unique.length; index += batchSize) {
    const batch = unique.slice(index, index + batchSize);
    await Promise.all(batch.map(async path => {
      const url = scopedUrl(path);
      const response = await fetch(new Request(url, { cache: 'reload' }));
      if (!response || !response.ok) throw new Error(`Required offline asset unavailable: ${path}`);
      await cache.put(url, response);
    }));
  }
  return unique.length;
}

async function cachedJson(cache, path) {
  const response = await cache.match(scopedUrl(path));
  if (!response) throw new Error(`Required offline manifest unavailable: ${path}`);
  return response.json();
}

function chapterPaths(manifest, dataRoot) {
  return (manifest?.books || []).flatMap(book => (book.chapters || []).map(chapter => `./${dataRoot}/${book.id}/${chapter}.json`));
}

function translationChapterPaths(manifest, fallbackRoot) {
  const dataRoot = String(manifest?.dataRoot || fallbackRoot).replace(/^\/+|\/$/g, '');
  return chapterPaths(manifest, dataRoot);
}

async function expandOfflineDataFiles(cache) {
  const [greek, hebrew, interlinear, oeb, web] = await Promise.all([
    cachedJson(cache, './data/greek/manifest.json'),
    cachedJson(cache, './data/hebrew/manifest.json'),
    cachedJson(cache, './data/hebrew-interlinear/manifest.json'),
    cachedJson(cache, './data/translations/oeb/manifest.json'),
    cachedJson(cache, './data/translations/web/manifest.json')
  ]);
  return [
    ...chapterPaths(greek, 'data/greek'),
    ...chapterPaths(hebrew, 'data/hebrew'),
    ...chapterPaths(interlinear, 'data/hebrew-interlinear'),
    ...translationChapterPaths(oeb, 'data/translations/oeb/books'),
    ...translationChapterPaths(web, 'data/translations/web/books')
  ];
}

async function installOfflineApplication() {
  const cache = await caches.open(CACHE);
  await cacheFiles(cache, [...APP_SHELL_FILES, ...OFFLINE_DATA_SEEDS]);
  await cacheFiles(cache, await expandOfflineDataFiles(cache));
  await self.skipWaiting();
}

self.addEventListener('install', event => {
  event.waitUntil(installOfflineApplication());
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(key => (key.startsWith(CACHE_PREFIX) && key !== CACHE ? caches.delete(key) : undefined))))
      .then(() => self.clients.claim())
  );
});

function isCoreOfflineData(pathname) {
  return pathname === '/vocab_all.json'
    || pathname.startsWith('/data/glosses/')
    || pathname.startsWith('/data/lexical/')
    || pathname.startsWith('/data/greek/')
    || pathname.startsWith('/data/hebrew/')
    || pathname.startsWith('/data/hebrew-interlinear/')
    || pathname.startsWith('/data/translations/oeb/')
    || pathname.startsWith('/data/translations/web/');
}

async function cachedResponse(request, options = {}) {
  const cache = await caches.open(CACHE);
  return cache.match(request, options);
}

async function cacheFirst(request, options = {}) {
  const cached = await cachedResponse(request, options);
  if (cached) return cached;
  const response = await fetch(request);
  if (response?.ok) {
    const cache = await caches.open(CACHE);
    await cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener('fetch', event => {
  if (event.request.method && event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  if (event.request.mode === 'navigate') {
    event.respondWith(
      cachedResponse(scopedUrl('./index.html'))
        .then(response => response || fetch(event.request))
        .catch(() => cachedResponse(scopedUrl('./index.html')))
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  if (url.pathname.endsWith('.json')) {
    event.respondWith(cacheFirst(event.request, { ignoreSearch: isCoreOfflineData(url.pathname) }));
    return;
  }

  event.respondWith(cacheFirst(event.request));
});
