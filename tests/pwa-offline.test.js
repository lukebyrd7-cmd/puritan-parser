const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const ORIGIN = 'https://puritan-parser.test';

function localPathForUrl(value) {
  const url = new URL(typeof value === 'string' ? value : value.url, `${ORIGIN}/`);
  const pathname = url.pathname.endsWith('/') ? `${url.pathname}index.html` : url.pathname;
  return path.join(ROOT, decodeURIComponent(pathname).replace(/^\/+/, ''));
}

function createServiceWorkerHarness() {
  const listeners = {};
  const stores = new Map();
  let online = true;

  class MemoryCache {
    constructor() { this.responses = new Map(); }
    key(value, options = {}) {
      const url = new URL(typeof value === 'string' ? value : value.url, `${ORIGIN}/`);
      if (options.ignoreSearch) url.search = '';
      return url.href;
    }
    async match(value, options = {}) {
      const key = this.key(value, options);
      if (!options.ignoreSearch) return this.responses.get(key)?.clone();
      for (const [storedKey, response] of this.responses) {
        const candidate = new URL(storedKey);
        candidate.search = '';
        if (candidate.href === key) return response.clone();
      }
      return undefined;
    }
    async put(value, response) { this.responses.set(this.key(value), response.clone()); }
  }

  const caches = {
    async open(name) {
      if (!stores.has(name)) stores.set(name, new MemoryCache());
      return stores.get(name);
    },
    async keys() { return [...stores.keys()]; },
    async delete(name) { return stores.delete(name); }
  };

  const fakeFetch = async value => {
    if (!online) throw new Error('TOTAL_NETWORK_LOSS');
    const filePath = localPathForUrl(value);
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return new Response('missing', { status: 404 });
    const contentType = filePath.endsWith('.json') ? 'application/json' : filePath.endsWith('.js') ? 'text/javascript' : filePath.endsWith('.woff2') ? 'font/woff2' : 'application/octet-stream';
    const body = filePath.endsWith('/manifest.json') || filePath.endsWith('content-manifest.json') || filePath.endsWith('.woff2')
      ? fs.readFileSync(filePath)
      : Buffer.from(filePath.endsWith('.json') ? '{}' : 'cached');
    return new Response(body, { status: 200, headers: { 'content-type': contentType } });
  };

  const self = {
    registration: { scope: `${ORIGIN}/` },
    location: { origin: ORIGIN },
    clients: { claim: async () => true },
    skipWaiting: async () => true,
    addEventListener(type, listener) { listeners[type] = listener; }
  };
  const context = { self, caches, fetch: fakeFetch, Request, Response, URL, console, Promise, Map, Set, Error };
  vm.createContext(context);
  const source = `${fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8')}\nself.__test = { APP_VERSION, CACHE, CACHE_PREFIX, APP_SHELL_FILES, OFFLINE_DATA_SEEDS, expandOfflineDataFiles, installOfflineApplication };`;
  vm.runInContext(source, context, { filename: 'sw.js' });

  async function dispatchLifecycle(type) {
    let pending;
    listeners[type]({ waitUntil(value) { pending = value; } });
    await pending;
  }
  async function dispatchFetch(url, options = {}) {
    let responsePromise;
    const request = options.navigate
      ? { url: new URL(url, `${ORIGIN}/`).href, mode: 'navigate', method: 'GET' }
      : new Request(new URL(url, `${ORIGIN}/`), { method: 'GET' });
    listeners.fetch({ request, respondWith(value) { responsePromise = value; } });
    return responsePromise ? responsePromise : fakeFetch(request);
  }

  return { self, stores, caches, setOnline(value) { online = value; }, dispatchLifecycle, dispatchFetch };
}

test('v1.9.5 installs one complete version-compatible offline application state', async () => {
  const harness = createServiceWorkerHarness();
  await harness.dispatchLifecycle('install');
  const { CACHE, APP_VERSION, APP_SHELL_FILES, OFFLINE_DATA_SEEDS } = harness.self.__test;
  const cache = harness.stores.get(CACHE);
  const expanded = await harness.self.__test.expandOfflineDataFiles(cache);

  assert.match(CACHE, /puritan-parser-v115-v1\.9\.7-reliability-performance-trust-1/);
  assert.ok(expanded.length > 4000, `expected complete corpora, received ${expanded.length} files`);
  assert.equal(cache.responses.size, new Set([...APP_SHELL_FILES, ...OFFLINE_DATA_SEEDS, ...expanded].map(value => new URL(value, `${ORIGIN}/`).href)).size);

  for (const script of APP_SHELL_FILES.filter(value => value.includes('.js?'))) {
    assert.match(script, new RegExp(`\\?v=${APP_VERSION}$`));
    assert.ok(await cache.match(new URL(script, `${ORIGIN}/`).href), script);
  }
  const greekFonts = APP_SHELL_FILES.filter(value => value.includes('/assets/fonts/eb-garamond-v33-greek'));
  assert.equal(greekFonts.length, 2);
  for (const font of greekFonts) {
    assert.match(font, new RegExp(`\\?v=${APP_VERSION}$`));
    assert.ok(await cache.match(new URL(font, `${ORIGIN}/`).href), font);
  }
  assert.equal(await cache.match(`${ORIGIN}/src/main.js?v=v1.9.3-bilingual-lexical-completion-1`), undefined);
});

test('total network loss still serves cold launches, routes, bilingual data, word details, Search, Learn, and translations', async () => {
  const harness = createServiceWorkerHarness();
  await harness.dispatchLifecycle('install');
  await harness.dispatchLifecycle('activate');
  harness.setOnline(false);

  for (const route of ['/', '/learn', '/reader', '/search', '/grammar', '/settings']) {
    const response = await harness.dispatchFetch(route, { navigate: true });
    assert.equal(response.status, 200, route);
  }

  for (const asset of [
    '/vocab_all.json',
    '/data/glosses/greek-glosses.json',
    '/data/glosses/hebrew-glosses.json',
    '/data/lexical/canonical-forms.json',
    '/data/greek/manifest.json',
    '/data/greek/matthew/1.json',
    '/data/greek/search-index.json',
    '/data/hebrew/manifest.json',
    '/data/hebrew/jonah/1.json',
    '/data/hebrew/search-index.json',
    '/data/hebrew-interlinear/jonah/1.json',
    '/data/translations/oeb/books/john/1.json',
    '/data/translations/web/books/john/1.json'
  ]) {
    const response = await harness.dispatchFetch(asset);
    assert.equal(response.status, 200, asset);
  }

  for (const font of [
    `/assets/fonts/eb-garamond-v33-greek-ext.woff2?v=${harness.self.__test.APP_VERSION}`,
    `/assets/fonts/eb-garamond-v33-greek.woff2?v=${harness.self.__test.APP_VERSION}`
  ]) {
    const response = await harness.dispatchFetch(font);
    assert.equal(response.status, 200, font);
    assert.equal(response.headers.get('content-type'), 'font/woff2');
    assert.equal((await response.arrayBuffer()).byteLength, fs.statSync(localPathForUrl(font)).size);
  }

  const version = harness.self.__test.APP_VERSION;
  for (const script of ['/src/main.js', '/src/features/reader/index.js', '/src/features/learn/index.js', '/src/features/global-search/index.js', '/src/features/grammar/index.js', '/src/features/settings/index.js']) {
    const response = await harness.dispatchFetch(`${script}?v=${version}`);
    assert.equal(response.status, 200, script);
  }

  // A second cold standalone relaunch uses the same fully populated cache.
  const secondLaunch = await harness.dispatchFetch('/reader', { navigate: true });
  assert.equal(secondLaunch.status, 200);
});

test('Greek Reader uses the local EB Garamond subsets without changing Hebrew typography', () => {
  const css = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
  assert.match(css, /font-family: 'Puritan EB Garamond Greek'/);
  assert.match(css, /eb-garamond-v33-greek-ext\.woff2\?v=v1\.9\.4-pwa-offline-reliability-2/);
  assert.match(css, /eb-garamond-v33-greek\.woff2\?v=v1\.9\.4-pwa-offline-reliability-2/);
  assert.match(css, /\.reader-text-greek,[\s\S]*font-family: var\(--font-greek\)/);
  assert.match(css, /\.reader-text-hebrew \{ text-align: right; \}/);
  assert.doesNotMatch(css, /\.reader-text-hebrew[^}]*font-greek/);
});

test('activation removes only obsolete Puritan Parser caches and never user storage', async () => {
  const harness = createServiceWorkerHarness();
  await harness.caches.open('puritan-parser-v109-v1.9.3-bilingual-lexical-completion');
  await harness.caches.open('unrelated-origin-cache');
  await harness.dispatchLifecycle('install');
  await harness.dispatchLifecycle('activate');
  const keys = await harness.caches.keys();
  assert.ok(keys.includes(harness.self.__test.CACHE));
  assert.ok(keys.includes('unrelated-origin-cache'));
  assert.ok(!keys.includes('puritan-parser-v109-v1.9.3-bilingual-lexical-completion'));
  assert.doesNotMatch(fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8'), /localStorage|indexedDB|pp_vocab_learning|pp_reader_location/);
});

test('critical offline inventory is deterministic, complete on disk, and excludes development sources', async t => {
  const harness = createServiceWorkerHarness();
  await harness.dispatchLifecycle('install');
  const cache = harness.stores.get(harness.self.__test.CACHE);
  const expanded = await harness.self.__test.expandOfflineDataFiles(cache);
  const inventory = [...new Set([...harness.self.__test.APP_SHELL_FILES, ...harness.self.__test.OFFLINE_DATA_SEEDS, ...expanded])];
  let bytes = 0;
  for (const asset of inventory) {
    const filePath = localPathForUrl(asset);
    assert.ok(fs.existsSync(filePath), asset);
    bytes += fs.statSync(filePath).size;
  }
  assert.equal(inventory.some(asset => /audit-input|abbott-smith|swanson|vgbh|tests?\//i.test(asset)), false);
  assert.ok(bytes > 150 * 1024 * 1024);
  t.diagnostic(`critical offline assets: ${inventory.length}; uncompressed bytes: ${bytes}`);
});
