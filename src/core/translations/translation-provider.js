/* ---------- Translation provider helpers ---------- */
(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  Object.assign(root, api);
}(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  const DEFAULT_TRANSLATION_ID = 'oeb';
  const DEFAULT_TRANSLATION_ROOT = 'data/translations';
  const providerCache = new Map();
  const manifestCache = new Map();
  const manifestPromises = new Map();
  const chapterCache = new Map();
  const chapterPromises = new Map();

  function cleanTranslationId(id) {
    return String(id || DEFAULT_TRANSLATION_ID).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  }

  function cleanTranslationPart(value) {
    return String(value || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  }

  function translationPath(...parts) {
    const clean = parts.map(cleanTranslationPart).filter(Boolean);
    if (!clean.length) throw new Error('Translation path requires at least one safe path part.');
    return `${DEFAULT_TRANSLATION_ROOT}/${clean.join('/')}`;
  }

  function normalizeTranslationVerse(verse = {}) {
    const number = Number(verse.verse ?? verse.number);
    return {
      verse: Number.isFinite(number) ? number : 0,
      text: String(verse.text || '').replace(/\s+/g, ' ').trim()
    };
  }

  function normalizeTranslationChapter(chapter = {}) {
    chapter = chapter || {};
    const verses = Array.isArray(chapter.verses) ? chapter.verses.map(normalizeTranslationVerse).filter(verse => verse.verse && verse.text) : [];
    return {
      translation: cleanTranslationId(chapter.translation || chapter.translationId || DEFAULT_TRANSLATION_ID),
      language: 'english',
      book: cleanTranslationPart(chapter.book),
      bookName: String(chapter.bookName || '').trim(),
      chapter: Number(chapter.chapter) || 0,
      source: String(chapter.source || '').trim(),
      verses
    };
  }

  function normalizeTranslationBook(book = {}) {
    const chapters = Array.isArray(book.chapters)
      ? book.chapters.map(Number).filter(Boolean).sort((a, b) => a - b)
      : Array.from({ length: Number(book.chapters) || 0 }, (_, i) => i + 1);
    return {
      id: cleanTranslationPart(book.id),
      name: String(book.name || '').trim(),
      chapters,
      verseCount: Number(book.verseCount) || 0
    };
  }

  function normalizeTranslationManifest(manifest = {}) {
    const id = cleanTranslationId(manifest.id || manifest.translation || DEFAULT_TRANSLATION_ID);
    const books = (manifest.books || []).map(normalizeTranslationBook).filter(book => book.id && book.chapters.length);
    return {
      schemaVersion: Number(manifest.schemaVersion || 1),
      id,
      name: String(manifest.name || id.toUpperCase()).trim(),
      abbreviation: String(manifest.abbreviation || id.toUpperCase()).trim(),
      language: 'english',
      default: Boolean(manifest.default),
      source: String(manifest.source || '').trim(),
      sourceUrl: String(manifest.sourceUrl || '').trim(),
      license: String(manifest.license || '').trim(),
      attribution: String(manifest.attribution || '').trim(),
      generated: String(manifest.generated || '').trim(),
      dataRoot: String(manifest.dataRoot || translationPath(id, 'books')).replace(/\/$/, ''),
      books
    };
  }

  async function fetchTranslationJson(path, options = {}) {
    if (typeof options.fetchJson === 'function') return options.fetchJson(path);
    if (typeof fetch !== 'function') throw new Error('fetch is not available for translation loading');
    const response = await fetch(path, { cache: options.cache || 'no-store' });
    if (!response.ok) throw new Error(`Unable to load translation data: ${path}`);
    return response.json();
  }

  function createTranslationProvider(id = DEFAULT_TRANSLATION_ID, options = {}) {
    const translationId = cleanTranslationId(id);
    const manifestPath = options.manifestPath || `${translationPath(translationId)}/manifest.json`;
    return {
      id: translationId,
      manifestPath,
      async manifest(loadOptions = {}) {
        const key = `${translationId}:manifest:${manifestPath}`;
        if (!loadOptions.force && manifestCache.has(key)) return manifestCache.get(key);
        if (!loadOptions.force && manifestPromises.has(key)) return manifestPromises.get(key);
        const pending = (async () => {
          const manifest = normalizeTranslationManifest(await fetchTranslationJson(manifestPath, { ...options, ...loadOptions }));
          manifestCache.set(key, manifest);
          return manifest;
        })().finally(() => manifestPromises.delete(key));
        if(!loadOptions.force) manifestPromises.set(key, pending);
        return pending;
      },
      async loadChapter(book, chapter, loadOptions = {}) {
        const cleanBook = cleanTranslationPart(book);
        const cleanChapter = Number(chapter) || 1;
        const key = `${translationId}:${cleanBook}:${cleanChapter}`;
        if (!loadOptions.force && chapterCache.has(key)) return chapterCache.get(key);
        if (!loadOptions.force && chapterPromises.has(key)) return chapterPromises.get(key);
        const pending = (async () => {
          const manifest = await this.manifest(loadOptions);
          const path = `${manifest.dataRoot}/${cleanBook}/${cleanChapter}.json`;
          const data = normalizeTranslationChapter(await fetchTranslationJson(path, { ...options, ...loadOptions }));
          chapterCache.set(key, data);
          return data;
        })().finally(() => chapterPromises.delete(key));
        if(!loadOptions.force) chapterPromises.set(key, pending);
        return pending;
      },
      hasChapter(manifest, book, chapter) {
        const cleanBook = cleanTranslationPart(book);
        const cleanChapter = Number(chapter) || 1;
        return Boolean((manifest?.books || []).find(item => item.id === cleanBook && item.chapters.includes(cleanChapter)));
      }
    };
  }

  function getTranslationProvider(id = DEFAULT_TRANSLATION_ID, options = {}) {
    const translationId = cleanTranslationId(id);
    if (!options.force && providerCache.has(translationId)) return providerCache.get(translationId);
    const provider = createTranslationProvider(translationId, options);
    providerCache.set(translationId, provider);
    return provider;
  }

  function translationVerseText(chapter = {}, verseNumber) {
    const number = Number(verseNumber);
    return normalizeTranslationChapter(chapter).verses.find(verse => verse.verse === number)?.text || '';
  }

  const api = {
    DEFAULT_TRANSLATION_ID,
    translationPath,
    normalizeTranslationManifest,
    normalizeTranslationChapter,
    createTranslationProvider,
    getTranslationProvider,
    translationVerseText,
    translationProviderCache: providerCache,
    translationManifestCache: manifestCache,
    translationManifestPromises: manifestPromises,
    translationChapterCache: chapterCache,
    translationChapterPromises: chapterPromises
  };
  return api;
}));
