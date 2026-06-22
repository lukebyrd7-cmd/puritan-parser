const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

global.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
global.escHtml = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
global.$ = () => null;
global.$$ = () => [];

function storageHarness(){
  const store = new Map();
  global.readStorageJson = (key, fallback = null) => store.has(key) ? JSON.parse(store.get(key)) : fallback;
  global.writeStorageJson = (key, value) => store.set(key, JSON.stringify(value));
  return store;
}

global.fetch = async filePath => {
  const resolved = path.join(process.cwd(), filePath);
  delete require.cache[require.resolve(resolved)];
  const data = require(resolved);
  return { ok: true, json: async () => structuredClone(data) };
};

const reader = require('../src/features/reader/index.js');

test('reader loads a Greek chapter from the chapter-file structure', async () => {
  const chapter = await reader.loadReaderChapter('greek', 'matthew', 1);
  assert.equal(chapter.bookName, 'Matthew');
  assert.equal(chapter.chapter, 1);
  assert.match(reader.renderReaderChapter(chapter), /Βίβλος γενέσεως/);
});

test('book navigation crosses from Matthew to Mark', async () => {
  await reader.setReaderLocation({ language: 'greek', book: 'matthew', chapter: 28 });
  assert.deepEqual(reader.getAdjacentReaderLocation(1), { language: 'greek', book: 'mark', chapter: 1 });
});

test('chapter navigation moves previous and next within a book', async () => {
  await reader.setReaderLocation({ language: 'greek', book: 'matthew', chapter: 1 });
  assert.equal(reader.getAdjacentReaderLocation(1).chapter, 2);
  await reader.setReaderLocation({ language: 'greek', book: 'matthew', chapter: 28 });
  assert.equal(reader.getAdjacentReaderLocation(-1).chapter, 27);
});

test('last reader location persists', () => {
  storageHarness();
  reader.saveReaderLocation({ language: 'greek', book: 'mark', chapter: 1 });
  assert.deepEqual(reader.loadReaderLocation(), { language: 'greek', book: 'mark', chapter: 1 });
});

test('search supports lemma, surface text, and verse references', async () => {
  let html = '';
  const resultBox = { set innerHTML(value){ html = value; }, get innerHTML(){ return html; } };
  global.$ = selector => selector === '#readerSearchResults' ? resultBox : null;
  global.$$ = () => [];
  const lemmaResults = await reader.runReaderSearch('γεννάω');
  assert.ok(lemmaResults.some(item => item.book === 'matthew' && item.chapter === 1 && item.verse === 2));
  const surfaceResults = await reader.runReaderSearch('βίβλος');
  assert.ok(surfaceResults.some(item => item.book === 'matthew' && item.chapter === 1));
  assert.deepEqual(reader.parseReaderReference('Matthew 1:18'), { language: 'greek', book: 'matthew', chapter: 1, verse: '18' });
  assert.deepEqual(reader.parseReaderReference('Matthew 5'), { language: 'greek', book: 'matthew', chapter: 5, verse: '' });
});

test('chapter data lazy loads only requested chapters and uses cache', async () => {
  reader.readerChapterCache.clear();
  for(const key of Object.keys(reader.readerLoadCounts)) delete reader.readerLoadCounts[key];
  await reader.loadReaderChapter('greek', 'matthew', 1);
  await reader.loadReaderChapter('greek', 'matthew', 1);
  assert.equal(reader.readerLoadCounts['greek/matthew/1'], 1);
  assert.equal(reader.readerLoadCounts['greek/matthew/28'] || 0, 0);
});

const fs = require('node:fs');
const vm = require('node:vm');

function makeElement(id = ''){
  const classes = new Set();
  return {
    id,
    dataset: {},
    innerHTML: '',
    textContent: '',
    value: '',
    disabled: false,
    listeners: {},
    classList: {
      add: cls => classes.add(cls),
      remove: cls => classes.delete(cls),
      contains: cls => classes.has(cls),
      toggle: (cls, force) => {
        const shouldAdd = force === undefined ? !classes.has(cls) : Boolean(force);
        if(shouldAdd) classes.add(cls); else classes.delete(cls);
        return shouldAdd;
      }
    },
    addEventListener(type, fn){ this.listeners[type] = fn; },
    click(){ this.listeners.click?.({ target: this }); }
  };
}

function createReaderStartupHarness(){
  const ids = ['listView','flashView','parsingView','dashboardView','settingsView','grammarView','readerView','profileView','sharedFilterBar','filterSearchGroup','filterSortGroup','filterEntriesCount','filterPosGroup','footerLang'];
  const elements = new Map(ids.map(id => [id, makeElement(id)]));
  elements.get('readerView').classList.add('hidden');
  const readerTab = makeElement('readerTab');
  readerTab.dataset.view = 'reader';
  const navTabs = [readerTab];
  const document = {
    getElementById: id => elements.get(id) || null,
    querySelector: selector => selector.startsWith('#') ? (elements.get(selector.slice(1)) || null) : null,
    querySelectorAll: selector => selector === '.nav-tab' ? navTabs : []
  };
  const context = {
    console,
    document,
    window: { location: { pathname: '/list' }, addEventListener() {} },
    history: {
      pushState: (s, t, url) => { context.window.location.pathname = url; },
      replaceState: (s, t, url) => { context.window.location.pathname = url; }
    },
    state: { currentView: 'listView', lang: 'greek', dashboard: {}, prefs: {}, data: { greek: [], hebrew: [] }, filters: {} },
    selectedLemma: null,
    parsingModeFamily: () => 'all',
    readFiltersFromDOM: () => {},
    renderDashboard: () => {},
    renderList: () => {},
    updateParsingModeUI: () => {},
    renderLemmaPicker: () => {},
    getCurrentStudyList: () => [],
    getCurrentList: () => [],
    initReaderCalls: 0,
    module: undefined
  };
  context.$ = selector => document.querySelector(selector);
  context.$$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  context.initReader = () => { context.initReaderCalls += 1; return Promise.resolve(); };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('src/core/router.js', 'utf8'), context, { filename: 'src/core/router.js' });
  const vocabSource = fs.readFileSync('src/features/vocab/index.js', 'utf8');
  vm.runInContext(vocabSource.slice(0, vocabSource.indexOf('/* ---------- Language ---------- */')), context, { filename: 'src/features/vocab/index.js' });
  return { context, elements, readerTab };
}

test('Reader button opens Reader view and initializes successfully', () => {
  const { context, elements, readerTab } = createReaderStartupHarness();
  readerTab.addEventListener('click', () => context.navigateTo('/reader'));
  readerTab.click();
  assert.equal(context.window.location.pathname, '/reader');
  assert.equal(context.state.currentView, 'readerView');
  assert.equal(elements.get('readerView').classList.contains('hidden'), false);
  assert.equal(elements.get('listView').classList.contains('hidden'), true);
  assert.equal(context.initReaderCalls, 1);
});

test('Reader route can be entered directly and showView accepts reader nav id', () => {
  const { context, elements } = createReaderStartupHarness();
  context.window.location.pathname = '/reader';
  context.initRouter();
  assert.equal(context.state.currentView, 'readerView');
  assert.equal(elements.get('readerView').classList.contains('hidden'), false);

  context.showView('reader');
  assert.equal(context.state.currentView, 'readerView');
  assert.equal(context.routeForView('reader'), '/reader');
});

test('Reader render creates visible chapter controls and loaded chapter text', async () => {
  let html = '';
  const shell = { set innerHTML(value){ html = value; }, get innerHTML(){ return html; } };
  global.$ = selector => selector === '#readerShell' ? shell : null;
  global.$$ = () => [];
  await reader.setReaderLocation({ language: 'greek', book: 'matthew', chapter: 1 });
  assert.match(html, /id="readerBookSelect"/);
  assert.match(html, /id="readerChapterSelect"/);
  assert.match(html, /Matthew 1/);
  assert.match(html, /Βίβλος γενέσεως/);
  assert.equal(reader.readerState().error, '');
});

test('Matthew 28 loads from generated chapter data', async () => {
  const chapter = await reader.loadReaderChapter('greek', 'matthew', 28);
  assert.equal(chapter.bookName, 'Matthew');
  assert.equal(chapter.chapter, 28);
  assert.equal(chapter.verses.at(-1).verse, 20);
  assert.match(reader.renderReaderChapter(chapter), /πάντα τὰ ἔθνη/);
});

test('Matthew chapter selector contains all 28 chapters', async () => {
  let html = '';
  const shell = { set innerHTML(value){ html = value; }, get innerHTML(){ return html; } };
  global.$ = selector => selector === '#readerShell' ? shell : null;
  global.$$ = () => [];
  await reader.setReaderLocation({ language: 'greek', book: 'matthew', chapter: 1 });
  const chapterOptions = [...html.matchAll(/<option value="(\d+)"/g)].map(match => Number(match[1]));
  assert.deepEqual(chapterOptions, Array.from({ length: 28 }, (_, i) => i + 1));
});
