const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const storage = new Map();
global.localStorage = {
  getItem: key => storage.get(key) || null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: key => storage.delete(key)
};
global.escHtml = value => String(value || '').replace(/[&<>]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ch]));
global.normalizeAlternateGlosses = value => Array.isArray(value) ? value.map(item => String(item).trim()).filter(Boolean) : [];
global.getDisplayGloss = entry => entry.customGloss || entry.primaryGloss || entry.gloss || '';
global.getStudyEntries = entries => entries;
global.state = {
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
  result = context.searchGlobalVocabulary({ query: 'word', language: 'all' });
  assert.equal(result.results.some(item => item.language === 'greek' && item.headword === 'λόγος'), true);
  assert.equal(result.results.some(item => item.language === 'hebrew' && item.headword === 'דָּבָר'), true);
  result = context.searchGlobalVocabulary({ query: 'word', language: 'hebrew' });
  assert.equal(result.results.every(item => item.language === 'hebrew'), true);
});

test('Global Search renders in the app shell without the optional global DOM helper', () => {
  const originalDocument = global.document;
  const originalDollar = global.$;
  const originalDoubleDollar = global.$$;
  const elements = new Map();
  const makeEl = id => ({
    id,
    innerHTML: '',
    addEventListener(){},
    querySelector: selector => elements.get(selector.slice(1)) || null,
    querySelectorAll: () => []
  });
  const shell = {
    rawHtml: '',
    set innerHTML(value){
      this.rawHtml = value;
      if(value.includes('globalSearchPanel')){
        ['globalSearchPanel', 'globalSearchInput', 'globalSearchLanguage', 'globalSearchStatus', 'globalSearchSort', 'globalSearchSummary', 'globalSearchResults', 'globalSearchActions', 'closeGlobalSearch'].forEach(id => {
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

  const html = search.renderGlobalSearch();
  assert.match(html, /id="globalSearchTitle"/);
  assert.match(html, /Search Words/);
  assert.match(html, /id="globalSearchInput"/);
  assert.match(html, /Greek/);
  assert.match(html, /Hebrew/);
  assert.match(html, /Search words by lemma or gloss/);

  global.document = originalDocument;
  if(originalDollar) global.$ = originalDollar;
  if(originalDoubleDollar) global.$$ = originalDoubleDollar;
});

test('Global Search result updates do not replace the input shell while typing', () => {
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
