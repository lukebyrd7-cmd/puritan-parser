/* ---------- Lazy content loading helpers ---------- */
(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  Object.assign(root, api);
}(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  const MANIFEST_PATH = 'data/metadata/content-manifest.json';
  const metadataApi = root.normalizeContentManifest ? root : (typeof require === 'function' ? require('./content-metadata') : {});
  const manifestCache = new Map();
  const contentCache = new Map();

  function resolveContentPath(path, params = {}) {
    let resolved = String(path || '').trim();
    Object.keys(params).forEach(key => {
      const safe = String(params[key] || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
      resolved = resolved.replace(new RegExp(`\\{${key}\\}`, 'g'), safe);
    });
    if (!resolved || resolved.startsWith('/') || resolved.includes('..')) throw new Error(`Unsafe content path: ${path}`);
    return resolved;
  }

  async function fetchJson(path, options = {}) {
    if (typeof options.fetchJson === 'function') return options.fetchJson(path);
    if (typeof fetch !== 'function') throw new Error('fetch is not available for content loading');
    const response = await fetch(path, { cache: options.cache || 'no-store' });
    if (!response.ok) throw new Error(`Unable to load content: ${path}`);
    return response.json();
  }

  async function getContentManifest(options = {}) {
    const manifestPath = resolveContentPath(options.manifestPath || MANIFEST_PATH);
    if (!options.force && manifestCache.has(manifestPath)) return manifestCache.get(manifestPath);
    const manifest = metadataApi.normalizeContentManifest(await fetchJson(manifestPath, options));
    manifestCache.set(manifestPath, manifest);
    return manifest;
  }

  async function getContentMetadata(id, options = {}) {
    const manifest = await getContentManifest(options);
    return manifest.items.find(item => item.id === id) || null;
  }

  async function loadById(id, params = {}, options = {}) {
    const metadata = await getContentMetadata(id, options);
    if (!metadata) return null;
    const path = resolveContentPath(metadata.path, params);
    if (!options.force && contentCache.has(path)) return contentCache.get(path);
    const payload = await fetchJson(path, options);
    contentCache.set(path, payload);
    return payload;
  }

  const loadGlossData = (language, options = {}) => loadById(`future-${language}-glosses`, {}, options);
  const loadGrammarIndex = (options = {}) => loadById('future-grammar-index', {}, options);
  const loadBibleBook = (language, book, options = {}) => loadById(`future-${language}-bible`, { book }, options);
  const loadSearchIndex = (options = {}) => loadById('future-search-indexes', {}, options);

  const contentLoader = { MANIFEST_PATH, resolveContentPath, getContentManifest, getContentMetadata, loadById, loadGlossData, loadGrammarIndex, loadBibleBook, loadSearchIndex };
  return Object.assign({ contentLoader }, contentLoader);
}));
