/* ---------- Book Progress ---------- */
(function(root, factory){
  const api = factory(root);
  if(typeof module === 'object' && module.exports) module.exports = api;
  root.BookProgress = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(root){
  const VocabularyLearningModel = root.VocabularyLearning || (typeof require === 'function' ? require('../models/vocabulary-learning') : null);
  const Thresholds = {
    greek: ['25', '10', '5', 'all'],
    hebrew: ['60', '30', '10', '5', 'all']
  };
  const cache = new Map();
  const manifestCache = new Map();

  function clean(value){ return typeof value === 'string' ? value.trim() : ''; }
  function normalizeText(value){ return clean(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
  function thresholdNumber(value){
    if(value === 'all') return null;
    const custom = clean(value).match(/^custom-(\d+)$/);
    const parsed = Number(custom ? custom[1] : value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
  function frequencyLabel(value){
    const threshold = thresholdNumber(value);
    return threshold == null ? 'All Words' : `${threshold}+`;
  }
  function languageThresholds(language){ return Thresholds[language] || Thresholds.greek; }
  function fallbackBook(language, bookId){
    const list = language === 'hebrew'
      ? [{ id: 'jonah', name: 'Jonah', chapters: [1] }]
      : [{ id: 'matthew', name: 'Matthew', chapters: [1, 2] }];
    return list.find(book => book.id === bookId) || list[0];
  }
  function getBook(language, bookId){
    if(typeof root.getReaderBook === 'function') return root.getReaderBook(language, bookId);
    if(typeof require === 'function'){
      try {
        const manifest = require(`../../data/${language}/manifest.json`);
        const book = (manifest.books || []).find(item => item.id === bookId) || manifest.books?.[0];
        if(book) return { ...book, chapters: Array.isArray(book.chapters) ? book.chapters : [] };
      } catch(e) {}
    }
    return fallbackBook(language, bookId);
  }
  async function listBooks(language){
    if(typeof root.loadReaderManifest === 'function'){
      const manifest = await root.loadReaderManifest(language);
      const books = Array.isArray(manifest?.books) ? manifest.books : [];
      if(books.length) return books.map(book => ({ ...book, chapters: Array.isArray(book.chapters) ? book.chapters : [] }));
    }
    if(typeof require === 'function'){
      try {
        const manifest = require(`../../data/${language}/manifest.json`);
        if(Array.isArray(manifest.books)) return manifest.books.map(book => ({ ...book, chapters: Array.isArray(book.chapters) ? book.chapters : [] }));
      } catch(e) {}
    }
    if(typeof root.fetch === 'function'){
      if(!manifestCache.has(language)) manifestCache.set(language, root.fetch(`/data/${language}/manifest.json`).then(response => {
        if(!response.ok) throw new Error(`Unable to load the ${language} book list.`);
        return response.json();
      }));
      const manifest = await manifestCache.get(language);
      if(Array.isArray(manifest?.books)) return manifest.books.map(book => ({ ...book, chapters: Array.isArray(book.chapters) ? book.chapters : [] }));
    }
    return [fallbackBook(language)];
  }
  async function loadChapter(language, bookId, chapter){
    if(typeof root.loadReaderChapter === 'function') return root.loadReaderChapter(language, bookId, chapter);
    if(typeof require === 'function') return require(`../../data/${language}/${bookId}/${chapter}.json`);
    if(typeof root.fetch === 'function'){
      const response = await root.fetch(`/data/${language}/${bookId}/${chapter}.json`);
      if(!response.ok) throw new Error(`Unable to load ${bookId} ${chapter}.`);
      return response.json();
    }
    throw new Error('Reader chapter loading is unavailable.');
  }
  async function loadBookChapters(language, bookId){
    if(typeof root.loadReaderManifest === 'function') {
      try { await root.loadReaderManifest(language); } catch(e) {}
    }
    const books = await listBooks(language);
    const book = books.find(item => item.id === bookId) || books[0] || getBook(language, bookId);
    const chapters = Array.isArray(book?.chapters) ? book.chapters : [];
    const data = await Promise.all(chapters.map(chapter => loadChapter(language, book.id, chapter)));
    return { book, chapters: data };
  }
  function chapterTokens(chapter = {}){
    const verses = Array.isArray(chapter.verses) ? chapter.verses : (chapter.paragraphs || []).flatMap(paragraph => paragraph.verses || []);
    return verses.flatMap(verse => Array.isArray(verse.tokens) ? verse.tokens : []);
  }
  function vocabularyEntries(language){
    const list = Array.isArray(root.state?.data?.[language]) ? root.state.data[language] : [];
    if(typeof root.getStudyEntries === 'function') return root.getStudyEntries(list, 'lemma');
    return list;
  }
  function vocabularyIndex(language){
    const exact = new Map();
    const normalized = new Map();
    vocabularyEntries(language).forEach(entry => {
      const lemma = clean(entry.lemma || entry.word || entry.lexicalForm);
      if(!lemma) return;
      if(!exact.has(lemma)) exact.set(lemma, entry);
      const key = normalizeText(lemma);
      if(key && !normalized.has(key)) normalized.set(key, entry);
    });
    return { exact, normalized };
  }
  function entryForLemma(lemma, language, index = vocabularyIndex(language)){
    return index.exact.get(lemma) || index.normalized.get(normalizeText(lemma)) || {
      id: `lemma:${language}:${lemma}`,
      lang: language,
      lemma,
      word: lemma,
      freq: 0
    };
  }
  function collectVocabulary(chapters = [], language){
    const index = vocabularyIndex(language);
    const map = new Map();
    chapters.forEach(chapter => {
      chapterTokens(chapter).forEach(token => {
        const lemma = clean(token.lemma || token.surface);
        if(!lemma) return;
        const key = normalizeText(lemma) || lemma;
        const existing = map.get(key);
        if(existing) existing.count += 1;
        else map.set(key, { lemma, count: 1, entry: entryForLemma(lemma, language, index) });
      });
    });
    return Array.from(map.values());
  }
  function scopedVocabulary(vocabulary = [], threshold = 'all'){
    const minimum = thresholdNumber(threshold);
    return minimum == null ? vocabulary : vocabulary.filter(item => item.count >= minimum);
  }
  function statsForVocabulary(vocabulary = [], store){
    const normalizedStore = VocabularyLearningModel?.normalizeStore ? VocabularyLearningModel.normalizeStore(store) : store;
    const known = vocabulary.filter(item => VocabularyLearningModel?.learningStatus?.(normalizedStore, item.entry) === VocabularyLearningModel.STATUS.KNOWN).length;
    return {
      known,
      total: vocabulary.length,
      remaining: Math.max(0, vocabulary.length - known),
      vocabulary,
      vocabularyIds: vocabulary.map(item => VocabularyLearningModel?.lemmaId ? VocabularyLearningModel.lemmaId(item.entry) : item.entry.id).filter(Boolean)
    };
  }
  function calculateProgress({ language = 'greek', book, chapters = [], chapter, threshold = 'all', store } = {}){
    const allVocabulary = collectVocabulary(chapters, language);
    const scoped = scopedVocabulary(allVocabulary, threshold);
    const stats = statsForVocabulary(scoped, store || VocabularyLearningModel?.loadStore?.());
    return {
      language,
      book,
      chapter: chapter || '',
      threshold,
      label: frequencyLabel(threshold),
      ...stats
    };
  }
  async function bookProgress(language, bookId, options = {}){
    const key = `book:${language}:${bookId}`;
    if(!options.force && cache.has(key)) return cache.get(key);
    const loaded = await loadBookChapters(language, bookId);
    const store = options.store || VocabularyLearningModel?.loadStore?.();
    const overall = calculateProgress({ language, book: loaded.book, chapters: loaded.chapters, store });
    const frequency = languageThresholds(language).map(threshold => calculateProgress({ language, book: loaded.book, chapters: loaded.chapters, threshold, store }));
    const byChapter = loaded.chapters.map(chapterData => calculateProgress({
      language,
      book: loaded.book,
      chapters: [chapterData],
      chapter: Number(chapterData.chapter),
      store
    }));
    const result = { language, book: loaded.book, chapters: loaded.chapters, overall, frequency, byChapter };
    cache.set(key, result);
    return result;
  }
  async function chapterProgress(language, bookId, chapter, options = {}){
    const books = await listBooks(language);
    const book = books.find(item => item.id === bookId) || getBook(language, bookId);
    const chapterData = await loadChapter(language, book.id, Number(chapter) || 1);
    const store = options.store || VocabularyLearningModel?.loadStore?.();
    const overall = calculateProgress({ language, book, chapters: [chapterData], chapter: Number(chapterData.chapter), store });
    const frequency = languageThresholds(language).map(threshold => calculateProgress({ language, book, chapters: [chapterData], chapter: Number(chapterData.chapter), threshold, store }));
    return { language, book, chapter: Number(chapterData.chapter), chapterData, overall, frequency };
  }

  return {
    Thresholds,
    cache,
    languageThresholds,
    frequencyLabel,
    listBooks,
    collectVocabulary,
    calculateProgress,
    bookProgress,
    chapterProgress
  };
});
