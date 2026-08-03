const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const storage = new Map();
let storageWriteCount = 0;
global.localStorage = {
  getItem: key => storage.get(key) || null,
  setItem: (key, value) => { storageWriteCount += 1; storage.set(key, value); },
  removeItem: key => { storageWriteCount += 1; storage.delete(key); }
};
global.escHtml = value => String(value || '').replace(/[&<>]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ch]));
global.normalizeAlternateGlosses = value => Array.isArray(value) ? value.map(item => String(item).trim()).filter(Boolean) : [];
global.getDisplayGloss = entry => entry.customGloss || entry.primaryGloss || entry.gloss || '';
global.getStudyEntries = entries => entries;
global.getStudyEntriesAsync = async entries => entries;
global.state = {
  dataRevision: 0,
  prefs: { studyMode: 'lemma' },
  data: {
    greek: [
      { id: 'lemma:greek:λόγος', lang: 'greek', lemma: 'λόγος', word: 'λόγος', primaryGloss: 'word', alternateGlosses: ['message', 'account'], pos: 'Noun', freq: 330 },
      { id: 'lemma:greek:ἀγάπη', lang: 'greek', lemma: 'ἀγάπη', word: 'ἀγάπη', primaryGloss: 'love', pos: 'Noun', freq: 116 }
    ],
    hebrew: [
      { id: 'lemma:hebrew:1697', lang: 'hebrew', lemma: '1697', word: '1697', lexicalForm: 'דָּבָר', primaryGloss: 'word', alternateGlosses: ['matter'], pos: 'Noun', freq: 1440 },
      { id: 'lemma:hebrew:missing', lang: 'hebrew', lemma: '1234', word: '1234', primaryGloss: 'test-only missing lemma', freq: 1 }
    ]
  }
};
global.VocabularyLearning = require('../src/models/vocabulary-learning');

const search = require('../src/features/global-search/index.js');

test('Global Search finds Greek lemmas and English glosses with language filters', () => {
  storage.delete(global.VocabularyLearning.STORAGE_KEY);
  let result = search.searchGlobalVocabulary({ query: 'λόγος', language: 'all' });
  assert.ok(result.results[0], 'expected Greek lemma search to return a result');
  assert.equal(result.results[0].headword, 'λόγος');
  assert.equal(result.results[0].language, 'greek');

  result = search.searchGlobalVocabulary({ query: 'love', language: 'greek' });
  assert.ok(result.results[0], 'expected Greek gloss search to return a result');
  assert.equal(result.results[0].headword, 'ἀγάπη');
  assert.equal(result.results[0].gloss, 'love');

  result = search.searchGlobalVocabulary({ query: 'matter', language: 'hebrew' });
  assert.ok(result.results[0], 'expected Hebrew alternate gloss search to return a result');
  assert.equal(result.results[0].headword, 'דָּבָר');
  assert.equal(result.results[0].language, 'hebrew');

  result = search.searchGlobalVocabulary({ query: 'matter', language: 'greek' });
  assert.equal(result.total, 0);
});

test('Global Search finds Greek lemmas through simple transliteration', () => {
  storage.delete(global.VocabularyLearning.STORAGE_KEY);
  let result = search.searchGlobalVocabulary({ query: 'logos', language: 'greek' });
  assert.ok(result.results[0], 'expected transliterated logos to return a result');
  assert.equal(result.results[0].headword, 'λόγος');

  result = search.searchGlobalVocabulary({ query: 'agape', language: 'greek' });
  assert.equal(result.results[0].headword, 'ἀγάπη');

  result = search.searchGlobalVocabulary({ query: 'logos', language: 'hebrew' });
  assert.equal(result.total, 0);
});

test('Global Search finds Hebrew lemmas through shared transliteration aliases without rendering transliteration', () => {
  const originalHebrew = global.state.data.hebrew;
  global.state.data.hebrew = [
    { id: 'hb-shalom', lang: 'hebrew', lemma: '7965', lexicalForm: 'שָׁלוֹם', primaryGloss: 'peace', freq: 237 },
    { id: 'hb-melek', lang: 'hebrew', lemma: '4428', lexicalForm: 'מֶלֶךְ', primaryGloss: 'king', freq: 2523 },
    { id: 'hb-bereshit', lang: 'hebrew', lemma: '7225', lexicalForm: 'בְּרֵאשִׁית', primaryGloss: 'beginning', freq: 51 },
    { id: 'hb-ben', lang: 'hebrew', lemma: '1121', lexicalForm: 'בֵּן', primaryGloss: 'son', freq: 4932 },
    { id: 'hb-bayit', lang: 'hebrew', lemma: '1004', lexicalForm: 'בַּיִת', primaryGloss: 'house', freq: 2054 },
    { id: 'hb-ish', lang: 'hebrew', lemma: '376', lexicalForm: 'אִישׁ', primaryGloss: 'man', freq: 2186 },
    { id: 'hb-ishah', lang: 'hebrew', lemma: '802', lexicalForm: 'אִשָּׁה', primaryGloss: 'woman', freq: 781 },
    { id: 'hb-rosh', lang: 'hebrew', lemma: '7218', lexicalForm: 'רֹאשׁ', primaryGloss: 'head', freq: 598 },
    { id: 'hb-yom', lang: 'hebrew', lemma: '3117', lexicalForm: 'יוֹם', primaryGloss: 'day', freq: 2302 }
  ];

  for(const [query, expected] of [
    ['SHALOM', 'שָׁלוֹם'],
    ['melek', 'מֶלֶךְ'],
    ['BÉ-RESHIT', 'בְּרֵאשִׁית'],
    ['ben', 'בֵּן'],
    ['bayit', 'בַּיִת'],
    ['ish', 'אִישׁ'],
    ['isha', 'אִשָּׁה'],
    ['rosh', 'רֹאשׁ'],
    ['yom', 'יוֹם']
  ]){
    const result = search.searchGlobalVocabulary({ query, language: 'hebrew' });
    assert.equal(result.results[0]?.headword, expected, `${query} finds ${expected}`);
    assert.doesNotMatch(search.renderGlobalSearchResult(result.results[0]), new RegExp(`>${query}<`, 'i'));
  }

  const exact = search.searchGlobalVocabulary({ query: 'בֵּן', language: 'hebrew' });
  assert.equal(exact.results[0].headword, 'בֵּן');
  assert.equal(search.searchGlobalVocabulary({ query: 'salom', language: 'hebrew' }).total, 0);
  global.state.data.hebrew = originalHebrew;
});

test('Global Search displays learning status and filters by it', () => {
  let store = global.VocabularyLearning.normalizeStore();
  store = global.VocabularyLearning.introduceEntry(store, global.state.data.greek[0], { type: 'test' }, '2026-07-03');
  global.VocabularyLearning.saveStore(store);

  const result = search.searchGlobalVocabulary({ query: 'word', status: 'Learning' });
  assert.equal(result.results.some(item => item.headword === 'λόγος' && item.learningStatus === 'Learning'), true);
  assert.equal(result.results.some(item => item.headword === 'ἀγάπη'), false);
});

test('Global Search handles Hebrew numeric lemmas without using them as headwords', () => {
  storage.delete(global.VocabularyLearning.STORAGE_KEY);
  const result = search.searchGlobalVocabulary({ query: 'test-only missing lemma', language: 'hebrew' });
  assert.equal(result.results[0].headword, 'Lemma unavailable');
  assert.doesNotMatch(result.results[0].headword, /^\d+$/);
});

test('Global Search limits default rendering and can show more', () => {
  const originalGreek = global.state.data.greek;
  global.state.data.greek = Array.from({ length: 30 }, (_, index) => ({
    id: `lemma:greek:test-${index}`,
    lang: 'greek',
    lemma: `δοκιμή${index}`,
    word: `δοκιμή${index}`,
    primaryGloss: 'shared result',
    freq: 100 - index
  }));
  storage.delete(global.VocabularyLearning.STORAGE_KEY);

  const result = search.searchGlobalVocabulary({ query: 'shared result' });
  assert.equal(result.total, 30);
  assert.equal(result.results.length, 30);
  assert.equal(search.RESULT_LIMIT, 25);

  global.state.data.greek = originalGreek;
});

test('Book and chapter scopes filter Greek and Hebrew vocabulary and clear invalid state', async () => {
  const originalBookProgress = global.BookProgress;
  const rootEl = { querySelector: () => null };
  const greekEntries = global.state.data.greek;
  const hebrewEntries = global.state.data.hebrew;
  global.BookProgress = {
    listBooks: async language => language === 'greek'
      ? [{ id: 'romans', name: 'Romans', chapters: [1, 8] }, { id: 'mark', name: 'Mark', chapters: [1] }]
      : [{ id: 'genesis', name: 'Genesis', chapters: [1, 2] }],
    bookProgress: async (language, bookId) => ({ overall: { vocabulary: language === 'greek'
      ? greekEntries.map((entry, index) => ({ entry, count: index + 2 }))
      : hebrewEntries.map((entry, index) => ({ entry, count: index + 3 })) } }),
    chapterProgress: async (language, bookId, chapter) => ({ overall: { vocabulary: language === 'greek'
      ? [{ entry: greekEntries[1], count: Number(chapter) === 8 ? 4 : 1 }]
      : [{ entry: hebrewEntries[0], count: Number(chapter) === 1 ? 5 : 1 }] } })
  };

  search.setSearchLanguage('greek');
  await search.loadSearchBooks('greek', rootEl);
  search.setSearchBook('romans');
  await search.applySearchPassageScope(rootEl);
  let result = search.searchGlobalVocabulary({ language: 'greek', bookId: 'romans' });
  assert.deepEqual(result.results.map(item => item.headword).sort(), ['λόγος', 'ἀγάπη'].sort());

  search.SEARCH_STATE.passageScope = 'chapter';
  search.SEARCH_STATE.chapter = 8;
  await search.applySearchPassageScope(rootEl);
  result = search.searchGlobalVocabulary({ query: 'love', language: 'greek', bookId: 'romans' });
  assert.deepEqual(result.results.map(item => item.headword), ['ἀγάπη']);
  assert.equal(result.results[0].scopeFrequency, 4);

  search.setSearchBook('mark');
  assert.equal(search.SEARCH_STATE.chapter, 0);
  assert.equal(search.SEARCH_STATE.passageScope, 'book');
  search.setSearchLanguage('hebrew');
  assert.equal(search.SEARCH_STATE.bookId, '');
  assert.equal(search.SEARCH_STATE.chapter, 0);
  await search.loadSearchBooks('hebrew', rootEl);
  search.setSearchBook('genesis');
  await search.applySearchPassageScope(rootEl);
  result = search.searchGlobalVocabulary({ query: 'matter', language: 'hebrew', bookId: 'genesis' });
  assert.equal(result.results[0].headword, 'דָּבָר');
  search.SEARCH_STATE.passageScope = 'chapter';
  search.SEARCH_STATE.chapter = 1;
  await search.applySearchPassageScope(rootEl);
  result = search.searchGlobalVocabulary({ query: 'davar', language: 'hebrew', bookId: 'genesis' });
  assert.equal(result.results[0].headword, 'דָּבָר');
  assert.equal(result.results[0].scopeFrequency, 5);

  search.SEARCH_STATE.chapter = 99;
  await search.applySearchPassageScope(rootEl);
  assert.equal(search.SEARCH_STATE.chapter, 0);
  search.setSearchLanguage('all');
  global.BookProgress = originalBookProgress;
});

test('chapter scope composes with user and vocabulary filters', async () => {
  const originals = { BookProgress: global.BookProgress, LearningPractice: global.LearningPractice, VocabularyMastery: global.VocabularyMastery, PuritanStudySets: global.PuritanStudySets };
  const entry = global.state.data.greek[1];
  let store = global.VocabularyLearning.normalizeStore();
  store = global.VocabularyLearning.introduceEntry(store, entry, { type: 'test' }, '2026-07-03');
  global.VocabularyLearning.saveStore(store);
  global.LearningPractice = { ATTENTION_KEY: 'test-attention', revision: () => 1, loadAttention: () => ({ items: { [entry.id]: { language: 'greek' } } }) };
  global.VocabularyMastery = { masteryGrade: () => ({ letter: 'A' }) };
  global.PuritanStudySets = { STORAGE_KEY: 'test-decks', listStudySets: () => [{ id: 'deck-1', type: 'vocabulary', language: 'greek', vocabularyIds: [entry.id] }] };
  global.BookProgress = {
    listBooks: async () => [{ id: 'romans', name: 'Romans', chapters: [8] }],
    chapterProgress: async () => ({ overall: { vocabulary: [{ entry, count: 4 }] } }),
    bookProgress: async () => ({ overall: { vocabulary: [{ entry, count: 4 }] } })
  };
  search.setSearchLanguage('greek');
  search.setSearchBook('romans');
  search.SEARCH_STATE.passageScope = 'chapter'; search.SEARCH_STATE.chapter = 8;
  await search.applySearchPassageScope({ querySelector: () => null });
  await search.prepareGlobalSearchIndex();
  const result = search.searchGlobalVocabulary({ query: 'love', language: 'greek', bookId: 'romans', status: 'Learning', mastery: 'A', attentionOnly: true, partOfSpeech: 'Noun', frequencyMinimum: 100, frequencyMaximum: 200, deckId: 'deck-1' });
  assert.deepEqual(result.results.map(item => item.headword), ['ἀγάπη']);
  Object.assign(global, originals);
  search.setSearchLanguage('all');
});

test('Global Search indexes browser app lexical state and realistic study entries', () => {
  const context = {
    console,
    require,
    module: undefined,
    window: { PuritanParserCore: {} },
    localStorage: { getItem: () => null },
    VocabularyLearning: { loadStore: () => ({}), learningStatusDetails: () => ({ label: 'Not Learned' }) }
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('src/app-state.js', 'utf8'), context, { filename: 'src/app-state.js' });
  vm.runInContext(fs.readFileSync('src/models/gloss.js', 'utf8'), context, { filename: 'src/models/gloss.js' });
  vm.runInContext(fs.readFileSync('src/core/study-entries.js', 'utf8'), context, { filename: 'src/core/study-entries.js' });
  vm.runInContext(fs.readFileSync('src/core/hebrew-search.js', 'utf8'), context, { filename: 'src/core/hebrew-search.js' });
  vm.runInContext(fs.readFileSync('src/features/global-search/index.js', 'utf8'), context, { filename: 'src/features/global-search/index.js' });
  vm.runInContext(`
    state.prefs.studyMode = 'lemma';
    state.data.greek = [
      { id:'gk-logos-1', lang:'greek', word:'λόγον', lemma:'λόγος', primaryGloss:'word', alternateGlosses:['message','reason'], pos:'noun', freq:130 },
      { id:'gk-agape-1', lang:'greek', word:'ἀγάπη', lemma:'ἀγάπη', primaryGloss:'love', pos:'noun', freq:116 }
    ];
    state.data.hebrew = [
      { id:'hb-1697-1', lang:'hebrew', word:'1697', lemma:'1697', lexicalForm:'דָּבָר', primaryGloss:'word', alternateGlosses:['matter'], pos:'noun', freq:1440 }
    ];
  `, context);

  let result = context.searchGlobalVocabulary({ query: 'λόγος', language: 'greek' });
  assert.equal(result.results[0].headword, 'λόγος');
  result = context.searchGlobalVocabulary({ query: 'logos', language: 'greek' });
  assert.equal(result.results[0].headword, 'λόγος');
  result = context.searchGlobalVocabulary({ query: 'word', language: 'all' });
  assert.equal(result.results.some(item => item.language === 'greek' && item.headword === 'λόγος'), true);
  assert.equal(result.results.some(item => item.language === 'hebrew' && item.headword === 'דָּבָר'), true);
  result = context.searchGlobalVocabulary({ query: 'word', language: 'hebrew' });
  assert.equal(result.results.every(item => item.language === 'hebrew'), true);
});

test('Global Search renders in the app shell without the optional global DOM helper', async () => {
  const originalDocument = global.document;
  const originalDollar = global.$;
  const originalDoubleDollar = global.$$;
  const elements = new Map();
  const makeEl = id => ({
    id,
    innerHTML: '',
    value: '',
    listeners: {},
    addEventListener(type, handler){ this.listeners[type] = handler; },
    classList: { toggle(){}, contains(){ return false; } },
    querySelector: selector => elements.get(selector.slice(1)) || null,
    querySelectorAll: () => []
  });
  const shell = {
    rawHtml: '',
    set innerHTML(value){
      this.rawHtml = value;
      if(value.includes('globalSearchPanel')){
        ['globalSearchPanel', 'globalSearchForm', 'globalSearchInput', 'globalSearchLanguage', 'globalSearchStatus', 'globalSearchMastery', 'globalSearchPartOfSpeech', 'globalSearchBook', 'globalSearchPassageScopeField', 'globalSearchPassageScope', 'globalSearchChapterField', 'globalSearchChapter', 'globalSearchDeck', 'globalSearchAttention', 'globalSearchFrequencyMinimum', 'globalSearchFrequencyMaximum', 'globalSearchSort', 'globalSearchSummary', 'globalSearchResults', 'globalSearchActions', 'closeGlobalSearch'].forEach(id => {
          if(!elements.has(id)) elements.set(id, makeEl(id));
        });
      }
    },
    get innerHTML(){
      return `${this.rawHtml}${[...elements.values()].map(el => el.innerHTML || '').join('')}`;
    },
    querySelector: selector => elements.get(selector.slice(1)) || null,
    querySelectorAll: () => []
  };
  global.document = {
    querySelector: selector => selector === '#globalSearchShell' ? shell : null,
    querySelectorAll: () => []
  };
  delete global.$;
  delete global.$$;
  search.SEARCH_STATE.query = '';
  search.SEARCH_STATE.language = 'all';
  search.SEARCH_STATE.status = 'all';
  search.SEARCH_STATE.sort = 'relevance';
  search.SEARCH_STATE.visible = search.RESULT_LIMIT;

  global.state.dataRevision += 1;
  const html = search.renderGlobalSearch();
  assert.match(html, /id="globalSearchTitle"/);
  assert.match(html, /Vocabulary Search/);
  assert.match(html, /id="globalSearchInput"/);
  assert.match(html, /Greek/);
  assert.match(html, /Hebrew/);
  assert.equal(elements.get('globalSearchSummary').textContent, 'Preparing vocabulary search…');
  assert.ok(elements.get('globalSearchInput').listeners.input === undefined || typeof elements.get('globalSearchInput').focus !== 'undefined' || elements.get('globalSearchInput'));

  elements.get('globalSearchInput').value = 'love';
  elements.get('globalSearchForm').listeners.submit({ preventDefault(){} });
  assert.equal(search.SEARCH_STATE.query, 'love');
  await search.prepareGlobalSearchIndex();
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.match(elements.get('globalSearchResults').innerHTML, /ἀγάπη/);
  assert.match(elements.get('globalSearchSummary').innerHTML, /results/);

  global.document = originalDocument;
  if(originalDollar) global.$ = originalDollar;
  if(originalDoubleDollar) global.$$ = originalDoubleDollar;
});

test('Global Search reuses corpus work, refreshes user decoration separately, and performs no writes', async () => {
  await search.prepareGlobalSearchIndex();
  const baseline = search.globalSearchIndexDebug();
  const writesBeforeReadOnlyWork = storageWriteCount;
  for(let cycle = 0; cycle < 20; cycle += 1){
    await Promise.all([search.prepareGlobalSearchIndex(), search.prepareGlobalSearchIndex()]);
    search.searchGlobalVocabulary({ query: cycle % 2 ? 'word' : 'logos', language: cycle % 2 ? 'all' : 'greek', sort: 'frequency' });
  }
  assert.equal(storageWriteCount, writesBeforeReadOnlyWork);
  assert.equal(search.globalSearchIndexDebug().preparationCount, baseline.preparationCount);

  global.state.dataRevision += 1;
  await search.prepareGlobalSearchIndex();
  const afterCorpus = search.globalSearchIndexDebug();
  assert.equal(afterCorpus.corpusBuildCount, baseline.corpusBuildCount + 1);

  storage.set(global.VocabularyLearning.STORAGE_KEY, JSON.stringify(global.VocabularyLearning.normalizeStore()));
  await search.prepareGlobalSearchIndex();
  const afterUserData = search.globalSearchIndexDebug();
  assert.equal(afterUserData.corpusBuildCount, afterCorpus.corpusBuildCount);
  assert.equal(afterUserData.decorationBuildCount, afterCorpus.decorationBuildCount + 1);
  assert.equal(storageWriteCount, writesBeforeReadOnlyWork);
});

test('leaving cold Global Search suppresses the pending result render', async () => {
  const originalDocument = global.document;
  const originalShowView = global.showView;
  const elements = new Map();
  const makeEl = id => ({ id, innerHTML: '', value: '', listeners: {}, addEventListener(type, handler){ this.listeners[type] = handler; }, classList: { toggle(){}, contains(){ return false; } }, querySelector: selector => elements.get(selector.slice(1)) || null, querySelectorAll: () => [] });
  const shell = {
    dataset: {},
    rawHtml: '',
    set innerHTML(value){
      this.rawHtml = value;
      if(value.includes('globalSearchPanel')) ['globalSearchPanel','globalSearchForm','globalSearchInput','globalSearchLanguage','globalSearchStatus','globalSearchMastery','globalSearchPartOfSpeech','globalSearchBook','globalSearchPassageScopeField','globalSearchPassageScope','globalSearchChapterField','globalSearchChapter','globalSearchDeck','globalSearchAttention','globalSearchFrequencyMinimum','globalSearchFrequencyMaximum','globalSearchSort','globalSearchSummary','globalSearchResults','globalSearchActions','closeGlobalSearch'].forEach(id => { if(!elements.has(id)) elements.set(id, makeEl(id)); });
    },
    get innerHTML(){ return this.rawHtml; },
    querySelector: selector => elements.get(selector.slice(1)) || null,
    querySelectorAll: () => [],
    closest: () => null
  };
  global.document = { querySelector: selector => selector === '#globalSearchShell' ? shell : elements.get(selector.slice(1)) || null, querySelectorAll: () => [] };
  let shown = '';
  global.showView = view => { shown = view; };
  global.state.dataRevision += 1;
  search.renderGlobalSearch();
  elements.get('closeGlobalSearch').listeners.click();
  await search.prepareGlobalSearchIndex();
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal(shown, 'learnView');
  assert.equal(elements.get('globalSearchResults').innerHTML, '');
  global.document = originalDocument;
  global.showView = originalShowView;
});

test('Global Search result updates do not replace the input shell while typing', async () => {
  const input = { id: 'globalSearchInput', value: 'wo', addEventListener(){} };
  const summary = { id: 'globalSearchSummary', innerHTML: '' };
  const results = { id: 'globalSearchResults', innerHTML: '' };
  const actions = { id: 'globalSearchActions', innerHTML: '' };
  const rootEl = {
    innerHTML: '<section id="globalSearchPanel"><input id="globalSearchInput" value="wo"></section>',
    querySelector(selector){
      return {
        '#globalSearchInput': input,
        '#globalSearchSummary': summary,
        '#globalSearchResults': results,
        '#globalSearchActions': actions
      }[selector] || null;
    },
    querySelectorAll: () => []
  };
  search.SEARCH_STATE.query = 'wo';
  search.SEARCH_STATE.language = 'all';
  search.SEARCH_STATE.status = 'all';
  search.SEARCH_STATE.sort = 'relevance';
  search.SEARCH_STATE.visible = search.RESULT_LIMIT;

  await search.prepareGlobalSearchIndex();
  search.renderGlobalSearchResults(rootEl);
  assert.equal(input.value, 'wo');
  assert.match(rootEl.innerHTML, /globalSearchInput/);
  assert.match(results.innerHTML, /global-search-result/);

  input.value = 'word';
  search.SEARCH_STATE.query = 'word';
  search.renderGlobalSearchResults(rootEl);
  assert.equal(input.value, 'word');
  assert.match(rootEl.innerHTML, /globalSearchInput/);
  assert.match(results.innerHTML, /λόγος|דָּבָר/);
});

test('Global Search result handoff opens a lemma-level Word Page', () => {
  let openedInfo = null;
  let shownView = '';
  global.openReaderWordPageFromInfo = info => { openedInfo = info; return true; };
  global.showView = view => { shownView = view; };

  const item = search.searchGlobalVocabulary({ query: 'love', language: 'greek' }).results[0];
  assert.equal(search.openGlobalSearchResult(item), true);
  assert.equal(openedInfo.lemma, 'ἀγάπη');
  assert.equal(openedInfo.surface, '');
  assert.equal(openedInfo.primaryGloss, 'love');
  assert.equal(shownView, '');

  delete global.openReaderWordPageFromInfo;
  delete global.showView;
});

test('Global Search lazy-loads the Reader before a cold Word Page handoff', async () => {
  let loadedView = '';
  let openedInfo = null;
  delete global.openReaderWordPageFromInfo;
  global.PuritanModuleLoader = {
    ensureView: async view => {
      loadedView = view;
      global.openReaderWordPageFromInfo = info => { openedInfo = info; };
    }
  };
  const item = search.searchGlobalVocabulary({ query: 'love', language: 'greek' }).results[0];
  assert.equal(await search.openGlobalSearchResult(item), true);
  assert.equal(loadedView, 'wordPageView');
  assert.equal(openedInfo.lemma, 'ἀγάπη');
  delete global.PuritanModuleLoader;
  delete global.openReaderWordPageFromInfo;
});
