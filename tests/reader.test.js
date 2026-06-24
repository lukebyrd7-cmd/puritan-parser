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

function renderedText(html){
  return String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

test('reader loads a Greek chapter from the chapter-file structure', async () => {
  const chapter = await reader.loadReaderChapter('greek', 'matthew', 1);
  assert.equal(chapter.bookName, 'Matthew');
  assert.equal(chapter.chapter, 1);
  assert.match(renderedText(reader.renderReaderChapter(chapter)), /Βίβλος γενέσεως/);
});

test('reader renders clickable tokens when token metadata exists', () => {
  const html = reader.renderReaderVerse({
    verse: 1,
    text: 'λόγος',
    tokens: [{ surface: 'λόγος', lemma: 'λόγος', parse: 'N-NSM' }]
  }, { book: 'john', bookName: 'John', chapter: 1 });
  assert.match(html, /class="reader-token"/);
  assert.match(html, /data-lemma="λόγος"/);
  assert.match(html, /data-parse="N-NSM"/);
  assert.doesNotMatch(html, /word<\/button>\s*<span/);
});

test('reader falls back to plain verse text when token metadata is unavailable', () => {
  const html = reader.renderReaderVerse({ verse: 1, text: 'plain Greek text' }, { bookName: 'Sample', chapter: 1 });
  assert.match(html, /plain Greek text/);
  assert.doesNotMatch(html, /reader-token/);
});

test('reader word lookup shows gloss, parsing explanation, aggregate frequency, and reference', async () => {
  global.state = {
    data: {
      greek: [
        { lang: 'greek', word: 'λόγος', lemma: 'λόγος', primaryGloss: 'word', alternateGlosses: ['message'], gloss: 'word, message, account', freq: 68 },
        { lang: 'greek', word: 'λόγον', lemma: 'λόγος', primaryGloss: 'word', alternateGlosses: ['account'], gloss: 'word, message, account', freq: 130 }
      ]
    }
  };
  const info = await reader.lookupReaderWordInfo(
    { surface: 'λόγος', lemma: 'λόγος', parse: 'N-NSM' },
    { bookName: 'John', chapter: 1, verse: 1 },
    'greek'
  );
  assert.equal(info.surface, 'λόγος');
  assert.equal(info.lemma, 'λόγος');
  assert.equal(info.primaryGloss, 'word');
  assert.ok(info.alternateGlosses.includes('message'));
  assert.ok(info.alternateGlosses.includes('account'));
  assert.equal(info.parse, 'N-NSM');
  assert.equal(info.parseExplanation, 'Noun — nominative singular masculine');
  assert.equal(info.frequency, 198);
  assert.equal(info.reference, 'John 1:1');
  delete global.state;
});

test('reader word lookup falls back gracefully when data is missing', async () => {
  global.state = { data: { greek: [] } };
  const info = await reader.lookupReaderWordInfo(
    { surface: 'ἀγνωστον', lemma: 'ἀγνωστον', parse: 'X- ---' },
    { bookName: 'John', chapter: 1, verse: 2 },
    'greek'
  );
  assert.equal(info.primaryGloss, '');
  assert.deepEqual(info.alternateGlosses, []);
  assert.equal(info.parseExplanation, 'X- ---');
  assert.equal(info.frequency, '');
  assert.equal(info.reference, 'John 1:2');
  delete global.state;
});

test('reader grammar links resolve to existing Greek topics by parse kind', () => {
  global.PuritanReferenceLibrary = { getReferenceTopic: id => ({ id }) };
  assert.deepEqual(reader.readerGrammarLinksForInfo({ parse: 'N-NSM', parseExplanation: 'Noun — nominative singular masculine' }).map(link => link.topicId), ['greek-nouns']);
  assert.deepEqual(reader.readerGrammarLinksForInfo({ parse: 'A-NSF', parseExplanation: 'Adjective — nominative singular feminine' }).map(link => link.topicId), ['greek-adjectives']);
  assert.deepEqual(reader.readerGrammarLinksForInfo({ parse: 'V-PAI-3S', parseExplanation: 'Verb — present active indicative 3rd singular' }).map(link => link.topicId), ['greek-verbs']);
  assert.deepEqual(reader.readerGrammarLinksForInfo({ parse: 'V-PAP-NSM', parseExplanation: 'Verb — present active participle nominative singular masculine' }).map(link => link.topicId), ['greek-verbs']);
  assert.deepEqual(reader.readerGrammarLinksForInfo({ parse: 'RA ----NSM-', parseExplanation: 'Article — nominative singular masculine' }).map(link => link.topicId), ['greek-nouns']);
  assert.deepEqual(reader.readerGrammarLinksForInfo({ language: 'hebrew', parse: 'Qal Perfect 3ms', parseExplanation: 'QAL PERFECT 3MS' }).map(link => link.topicId), ['hebrew-verbs']);
  delete global.PuritanReferenceLibrary;
});

test('clicking a reader token opens and closes the popup', async () => {
  let popupHtml = '';
  const root = {
    set innerHTML(value){ popupHtml = value; },
    get innerHTML(){ return popupHtml; },
    querySelector: selector => selector === '.reader-word-close' ? { addEventListener(){}, focus(){} } : null,
    querySelectorAll: () => []
  };
  global.$ = selector => selector === '#readerWordPopupRoot' ? root : null;
  global.$$ = () => [];
  global.state = { data: { greek: [{ lang: 'greek', word: 'λόγος', lemma: 'λόγος', primaryGloss: 'word', alternateGlosses: [], gloss: 'word', freq: 1 }] } };
  await reader.openReaderTokenPopup({
    dataset: { surface: 'λόγος', lemma: 'λόγος', parse: 'N-NSM', book: 'john', bookName: 'John', chapter: '1', verse: '1' },
    focus(){}
  });
  assert.match(popupHtml, /reader-word-popup/);
  assert.match(popupHtml, /λόγος/);
  assert.match(popupHtml, /word/);
  assert.match(popupHtml, /Noun — nominative singular masculine/);
  assert.match(popupHtml, /Parse: N-NSM/);
  assert.match(popupHtml, /Open Word Page/);
  assert.doesNotMatch(popupHtml, /<dt>Parsing<\/dt>/);
  assert.doesNotMatch(popupHtml, /<dt>Meaning<\/dt>/);
  reader.closeReaderWordPopup();
  assert.equal(popupHtml, '');
  delete global.state;
});

test('Open Word Page closes the popup and announces the placeholder', async () => {
  let popupHtml = '';
  let toastMessage = '';
  const root = {
    set innerHTML(value){ popupHtml = value; },
    get innerHTML(){ return popupHtml; },
    querySelector: selector => selector === '.reader-word-close' ? { addEventListener(){}, focus(){} } : null,
    querySelectorAll: () => []
  };
  global.$ = selector => selector === '#readerWordPopupRoot' ? root : null;
  global.$$ = () => [];
  global.toast = message => { toastMessage = message; };
  global.state = { data: { greek: [{ lang: 'greek', word: 'λόγος', lemma: 'λόγος', primaryGloss: 'word', gloss: 'word', freq: 1 }] } };
  await reader.openReaderTokenPopup({
    dataset: { surface: 'λόγος', lemma: 'λόγος', parse: 'N-NSM', bookName: 'John', chapter: '1', verse: '1' },
    focus(){}
  });
  assert.match(popupHtml, /Open Word Page/);
  reader.openReaderWordPagePlaceholder();
  assert.equal(popupHtml, '');
  assert.equal(toastMessage, 'Word Pages coming soon');
  delete global.state;
  delete global.toast;
});

test('book navigation crosses from Matthew to Mark', async () => {
  await reader.setReaderLocation({ language: 'greek', book: 'matthew', chapter: 28 });
  assert.deepEqual(reader.getAdjacentReaderLocation(1), { language: 'greek', book: 'mark', chapter: 1 });
});

test('book navigation crosses from Mark to Luke and Luke to John', async () => {
  await reader.setReaderLocation({ language: 'greek', book: 'mark', chapter: 16 });
  assert.deepEqual(reader.getAdjacentReaderLocation(1), { language: 'greek', book: 'luke', chapter: 1 });
  await reader.setReaderLocation({ language: 'greek', book: 'luke', chapter: 1 });
  assert.deepEqual(reader.getAdjacentReaderLocation(-1), { language: 'greek', book: 'mark', chapter: 16 });
  await reader.setReaderLocation({ language: 'greek', book: 'luke', chapter: 24 });
  assert.deepEqual(reader.getAdjacentReaderLocation(1), { language: 'greek', book: 'john', chapter: 1 });
  await reader.setReaderLocation({ language: 'greek', book: 'john', chapter: 1 });
  assert.deepEqual(reader.getAdjacentReaderLocation(-1), { language: 'greek', book: 'luke', chapter: 24 });
});

test('Mark appears in the book selector with all 16 chapters', async () => {
  let html = '';
  const shell = { set innerHTML(value){ html = value; }, get innerHTML(){ return html; } };
  global.$ = selector => selector === '#readerShell' ? shell : null;
  global.$$ = () => [];
  await reader.setReaderLocation({ language: 'greek', book: 'mark', chapter: 1 });
  assert.match(html, /<option value="mark" selected>Mark<\/option>/);
  const chapterOptions = [...html.matchAll(/<option value="(\d+)"/g)].map(match => Number(match[1]));
  assert.deepEqual(chapterOptions, Array.from({ length: 16 }, (_, i) => i + 1));
});

test('Mark 1 and Mark 16 load from generated chapter data', async () => {
  const mark1 = await reader.loadReaderChapter('greek', 'mark', 1);
  assert.equal(mark1.bookName, 'Mark');
  assert.equal(mark1.chapter, 1);
  assert.equal(mark1.verses[0].verse, 1);
  assert.match(renderedText(reader.renderReaderChapter(mark1)), /Ἀρχὴ τοῦ εὐαγγελίου/);

  const mark16 = await reader.loadReaderChapter('greek', 'mark', 16);
  assert.equal(mark16.bookName, 'Mark');
  assert.equal(mark16.chapter, 16);
  assert.equal(mark16.verses.at(-1).verse, 20);
  assert.match(renderedText(reader.renderReaderChapter(mark16)), /ἐκήρυξαν πανταχοῦ/);
});

test('Luke appears in the book selector with all 24 chapters', async () => {
  let html = '';
  const shell = { set innerHTML(value){ html = value; }, get innerHTML(){ return html; } };
  global.$ = selector => selector === '#readerShell' ? shell : null;
  global.$$ = () => [];
  await reader.setReaderLocation({ language: 'greek', book: 'luke', chapter: 1 });
  assert.match(html, /<option value="luke" selected>Luke<\/option>/);
  const chapterOptions = [...html.matchAll(/<option value="(\d+)"/g)].map(match => Number(match[1]));
  assert.deepEqual(chapterOptions, Array.from({ length: 24 }, (_, i) => i + 1));
});

test('Luke 1 and Luke 24 load from generated chapter data', async () => {
  const luke1 = await reader.loadReaderChapter('greek', 'luke', 1);
  assert.equal(luke1.bookName, 'Luke');
  assert.equal(luke1.chapter, 1);
  assert.equal(luke1.verses.length, 80);
  assert.match(renderedText(reader.renderReaderChapter(luke1)), /Ἐπειδήπερ πολλοὶ/);

  const luke24 = await reader.loadReaderChapter('greek', 'luke', 24);
  assert.equal(luke24.bookName, 'Luke');
  assert.equal(luke24.chapter, 24);
  assert.equal(luke24.verses.length, 53);
  assert.equal(luke24.verses.at(-1).verse, 53);
  assert.match(renderedText(reader.renderReaderChapter(luke24)), /εὐλογοῦντες τὸν ⸀θεόν/);
});


test('John appears in the book selector with all 21 chapters', async () => {
  let html = '';
  const shell = { set innerHTML(value){ html = value; }, get innerHTML(){ return html; } };
  global.$ = selector => selector === '#readerShell' ? shell : null;
  global.$$ = () => [];
  await reader.setReaderLocation({ language: 'greek', book: 'john', chapter: 1 });
  assert.match(html, /<option value="john" selected>John<\/option>/);
  const chapterOptions = [...html.matchAll(/<option value="(\d+)"/g)].map(match => Number(match[1]));
  assert.deepEqual(chapterOptions, Array.from({ length: 21 }, (_, i) => i + 1));
});

test('John 1 and John 21 load from generated chapter data', async () => {
  const john1 = await reader.loadReaderChapter('greek', 'john', 1);
  assert.equal(john1.bookName, 'John');
  assert.equal(john1.chapter, 1);
  assert.equal(john1.verses.length, 51);
  assert.match(renderedText(reader.renderReaderChapter(john1)), /Ἐν ἀρχῇ ἦν ὁ λόγος/);

  const john21 = await reader.loadReaderChapter('greek', 'john', 21);
  assert.equal(john21.bookName, 'John');
  assert.equal(john21.chapter, 21);
  assert.equal(john21.verses.length, 25);
  assert.equal(john21.verses.at(-1).verse, 25);
  assert.match(renderedText(reader.renderReaderChapter(john21)), /ἔστιν δὲ καὶ ἄλλα πολλὰ/);
});

test('rendering John 1 creates clickable token elements and clicking λόγος opens the popup', async () => {
  const elements = new Map();
  let tokenButtons = [];
  let popupHtml = '';
  const makeControl = () => ({ addEventListener(){} });
  const attr = (html, name) => html.match(new RegExp(`${name}="([^"]*)"`))?.[1] || '';
  const toDataset = html => ({
    surface: attr(html, 'data-surface'),
    lemma: attr(html, 'data-lemma'),
    parse: attr(html, 'data-parse'),
    book: attr(html, 'data-book'),
    bookName: attr(html, 'data-book-name'),
    chapter: attr(html, 'data-chapter'),
    verse: attr(html, 'data-verse')
  });
  const shell = {
    set innerHTML(value){
      this.html = value;
      tokenButtons = [...value.matchAll(/<button class="reader-token"[\s\S]*?<\/button>/g)].map(match => {
        const handlers = {};
        const text = match[0].replace(/[\s\S]*?>/, '').replace(/<\/button>$/, '');
        return {
          dataset: toDataset(match[0]),
          textContent: text,
          handlers,
          addEventListener(type, handler){ handlers[type] = handler; },
          focus(){}
        };
      });
    },
    get innerHTML(){ return this.html || ''; }
  };
  const popupRoot = {
    set innerHTML(value){ popupHtml = value; },
    get innerHTML(){ return popupHtml; },
    querySelector(selector){ return selector === '.reader-word-close' ? makeControl() : null; },
    querySelectorAll(){ return []; }
  };
  elements.set('#readerShell', shell);
  elements.set('#readerWordPopupRoot', popupRoot);
  ['#readerBookSelect', '#readerChapterSelect', '#readerPrevBtn', '#readerNextBtn', '#readerSearchBtn', '#readerSearchInput'].forEach(selector => elements.set(selector, makeControl()));
  global.$ = (selector, root) => root?.querySelector ? root.querySelector(selector) : elements.get(selector) || null;
  global.$$ = (selector, root) => {
    if(root?.querySelectorAll) return root.querySelectorAll(selector);
    return selector === '.reader-token' ? tokenButtons : [];
  };
  global.state = { data: { greek: [{ lang: 'greek', word: 'λόγος', lemma: 'λόγος', primaryGloss: 'word', gloss: 'word', freq: 1 }] } };

  await reader.setReaderLocation({ language: 'greek', book: 'john', chapter: 1 });
  assert.ok(tokenButtons.length > 0);
  const logosButton = tokenButtons.find(button => button.dataset.surface === 'λόγος' && button.dataset.lemma === 'λόγος');
  assert.ok(logosButton);
  assert.equal(typeof logosButton.handlers.click, 'function');

  await logosButton.handlers.click();
  assert.match(popupHtml, /reader-word-popup/);
  assert.match(popupHtml, /λόγος/);
  assert.match(popupHtml, /word/);

  reader.closeReaderWordPopup();
  delete global.state;
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

test('search finds Mark surface forms, lemmas, and references', async () => {
  let html = '';
  const resultBox = { set innerHTML(value){ html = value; }, get innerHTML(){ return html; } };
  global.$ = selector => selector === '#readerSearchResults' ? resultBox : null;
  global.$$ = () => [];
  await reader.loadReaderManifest('greek');
  const surfaceResults = await reader.runReaderSearch('εὐαγγέλιον');
  assert.ok(surfaceResults.some(item => item.book === 'mark' && item.chapter === 1 && item.verse === 1));
  const lemmaResults = await reader.runReaderSearch('βαπτίζω');
  assert.ok(lemmaResults.some(item => item.book === 'mark'));
  assert.deepEqual(reader.parseReaderReference('Mark 1:1'), { language: 'greek', book: 'mark', chapter: 1, verse: '1' });
  assert.deepEqual(reader.parseReaderReference('Mark 16'), { language: 'greek', book: 'mark', chapter: 16, verse: '' });
  assert.match(html, /Mark/);
});

test('search finds Luke surface forms, lemmas, and references', async () => {
  let html = '';
  const resultBox = { set innerHTML(value){ html = value; }, get innerHTML(){ return html; } };
  global.$ = selector => selector === '#readerSearchResults' ? resultBox : null;
  global.$$ = () => [];
  await reader.loadReaderManifest('greek');
  const surfaceResults = await reader.runReaderSearch('Ἐπειδήπερ');
  assert.ok(surfaceResults.some(item => item.book === 'luke' && item.chapter === 1 && item.verse === 1));
  const lemmaResults = await reader.runReaderSearch('ἀπογράφω');
  assert.ok(lemmaResults.some(item => item.book === 'luke' && item.chapter === 2));
  assert.deepEqual(reader.parseReaderReference('Luke 1:1'), { language: 'greek', book: 'luke', chapter: 1, verse: '1' });
  assert.deepEqual(reader.parseReaderReference('Luke 24'), { language: 'greek', book: 'luke', chapter: 24, verse: '' });
  assert.match(html, /Luke/);
});

test('search finds John surface forms, lemmas, and references', async () => {
  let html = '';
  const resultBox = { set innerHTML(value){ html = value; }, get innerHTML(){ return html; } };
  global.$ = selector => selector === '#readerSearchResults' ? resultBox : null;
  global.$$ = () => [];
  await reader.loadReaderManifest('greek');
  const surfaceResults = await reader.runReaderSearch('ὁ λόγος ἦν πρὸς');
  assert.ok(surfaceResults.some(item => item.book === 'john' && item.chapter === 1 && item.verse === 1));
  const lemmaResults = await reader.runReaderSearch('Ἰησοῦς ὅστις');
  assert.ok(lemmaResults.some(item => item.book === 'john' && item.chapter === 21));
  assert.deepEqual(reader.parseReaderReference('John 1:1'), { language: 'greek', book: 'john', chapter: 1, verse: '1' });
  assert.deepEqual(reader.parseReaderReference('John 21'), { language: 'greek', book: 'john', chapter: 21, verse: '' });
  assert.match(html, /John/);
});

test('chapter data lazy loads only requested chapters and uses cache', async () => {
  reader.readerChapterCache.clear();
  for(const key of Object.keys(reader.readerLoadCounts)) delete reader.readerLoadCounts[key];
  await reader.loadReaderChapter('greek', 'matthew', 1);
  await reader.loadReaderChapter('greek', 'matthew', 1);
  assert.equal(reader.readerLoadCounts['greek/matthew/1'], 1);
  assert.equal(reader.readerLoadCounts['greek/matthew/28'] || 0, 0);
  assert.equal(reader.readerLoadCounts['greek/luke/24'] || 0, 0);
  assert.equal(reader.readerLoadCounts['greek/john/21'] || 0, 0);
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
  assert.match(renderedText(html), /Βίβλος γενέσεως/);
  assert.equal(reader.readerState().error, '');
});

test('Matthew 28 loads from generated chapter data', async () => {
  const chapter = await reader.loadReaderChapter('greek', 'matthew', 28);
  assert.equal(chapter.bookName, 'Matthew');
  assert.equal(chapter.chapter, 28);
  assert.equal(chapter.verses.at(-1).verse, 20);
  assert.match(renderedText(reader.renderReaderChapter(chapter)), /πάντα τὰ ἔθνη/);
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

test('Reader loads generated manifest and exposes Matthew 1-28 dynamically', async () => {
  reader.readerManifestCache.clear();
  reader.ReaderConfig.greek.books = [];
  await reader.loadReaderManifest('greek');
  assert.deepEqual(reader.getReaderBookChapters('greek', 'matthew'), Array.from({ length: 28 }, (_, i) => i + 1));
  assert.deepEqual(reader.getReaderBookChapters('greek', 'mark'), Array.from({ length: 16 }, (_, i) => i + 1));
  assert.deepEqual(reader.getReaderBookChapters('greek', 'luke'), Array.from({ length: 24 }, (_, i) => i + 1));
  assert.deepEqual(reader.getReaderBookChapters('greek', 'john'), Array.from({ length: 21 }, (_, i) => i + 1));
});

test('Reader runtime schema accepts generated chapter verse objects', async () => {
  const chapter = await reader.loadReaderChapter('greek', 'matthew', 1);
  assert.ok(Array.isArray(chapter.verses));
  assert.deepEqual(Object.keys(chapter.verses[0]).sort(), ['text', 'tokens', 'verse']);
  const html = reader.renderReaderChapter(chapter);
  assert.match(html, /reader-chapter-heading/);
  assert.match(html, /class="reader-token"/);
  assert.match(renderedText(html), /1 Βίβλος γενέσεως/);
});

test('Reader fetches generated data paths and not sample reader data', async () => {
  const paths = [];
  const previousFetch = global.fetch;
  global.fetch = async filePath => {
    paths.push(filePath);
    return previousFetch(filePath);
  };
  reader.readerManifestCache.clear();
  reader.readerChapterCache.clear();
  reader.ReaderConfig.greek.books = [];
  await reader.setReaderLocation({ language: 'greek', book: 'matthew', chapter: 1 });
  global.fetch = previousFetch;
  assert.ok(paths.includes('data/greek/manifest.json'));
  assert.ok(paths.includes('data/greek/matthew/1.json'));
  assert.ok(paths.every(item => !String(item).includes('sample')));
});
