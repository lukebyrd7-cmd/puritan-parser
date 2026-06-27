const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

global.escHtml = value => String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
global.$ = () => null;
global.$$ = () => [];
global.todayISO = () => '2026-06-26';

const storage = new Map();
global.localStorage = {
  getItem: key => storage.get(key) || null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: key => storage.delete(key)
};
global.state = {
  data: {
    greek: [
      { id: 'lemma:greek:logos', studyEntryType: 'lemma', lang: 'greek', lemma: 'logos', word: 'logos', primaryGloss: 'word', alternateGlosses: ['word', 'message', 'account', 'message'], freq: 330 },
      { id: 'lemma:greek:agape', studyEntryType: 'lemma', lang: 'greek', lemma: 'agape', word: 'agape', primaryGloss: 'love', freq: 116 },
      { id: 'lemma:greek:adelphos', studyEntryType: 'lemma', lang: 'greek', lemma: 'adelphos', word: 'adelphos', primaryGloss: 'brother', freq: 343 },
      { id: 'lemma:greek:eis', studyEntryType: 'lemma', lang: 'greek', lemma: 'eis', word: 'eis', primaryGloss: 'into, to, for', alternateGlosses: ['to', 'for'], freq: 1754 }
    ],
    hebrew: [
      { id: 'lemma:hebrew:ברא', studyEntryType: 'lemma', lang: 'hebrew', lemma: 'ברא', word: 'ברא', primaryGloss: 'create', freq: 54 },
      { id: 'lemma:hebrew:אמר', studyEntryType: 'lemma', lang: 'hebrew', lemma: 'אמר', word: 'אמר', primaryGloss: 'say', freq: 5300 }
    ]
  }
};
global.getStudyEntries = entries => entries;
global.getDisplayGloss = entry => entry.customGloss || entry.primaryGloss || entry.gloss || '(missing gloss)';
global.normalizeAlternateGlosses = value => Array.isArray(value) ? value : [];

const learn = require('../src/features/learn/index.js');
const VocabularyLearning = require('../src/models/vocabulary-learning');
const BookProgress = require('../src/core/book-progress');

function renderedText(html){
  return String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function renderPage(page){
  learn.learnState.page = page;
  learn.learnState.history = [];
  learn.learnState.customFrequencyErrors = {};
  learn.learnState.activeVocabularyPath = '';
  learn.learnState.currentVocabularyWordId = '';
  learn.learnState.focusedReviewWordId = '';
  learn.learnState.reviewReveal = false;
  return learn.renderLearnPage();
}

test('Learn home opens the three permanent study areas', () => {
  const html = renderPage('home');
  assert.match(html, /Vocabulary/);
  assert.match(html, /Build long-term vocabulary through flexible study paths/);
  assert.match(html, /Paradigms/);
  assert.match(html, /Strengthen recognition of Greek and Hebrew grammar/);
  assert.match(html, /Reading Readiness/);
  assert.match(html, /See how prepared you are to read books and chapters/);
  assert.match(html, /id="learnBackBtn"/);
  assert.doesNotMatch(html, /alert\(/);
});

test('Vocabulary shell opens review and the new words path chooser', () => {
  const html = renderPage('vocabulary');
  ['Review', 'New Words'].forEach(label => assert.match(html, new RegExp(label)));
  assert.doesNotMatch(html, /data-learn-page="vocabulary:frequency"/);
  assert.doesNotMatch(html, /data-learn-page="vocabulary:book"/);

  const review = renderPage('vocabulary:review');
  assert.match(renderedText(review), /Reviews Available/);
  assert.match(review, /data-learn-page="vocabulary:review:greek"/);
  assert.match(review, /data-learn-page="vocabulary:review:hebrew"/);
  assert.match(renderedText(review), /Greek Review/);
  assert.match(renderedText(review), /Hebrew Review/);
  const newWords = renderPage('vocabulary:new-words');
  assert.match(newWords, /Choose how you want to prepare for reading/);
  assert.match(renderedText(newWords), /Greek 25\+ 10\+ 5\+ All Words Custom Frequency/);
  assert.match(renderedText(newWords), /Hebrew 60\+ 30\+ 10\+ 5\+ All Words Custom Frequency/);
  assert.match(newWords, /data-learn-page="vocabulary:frequency:greek:25"/);
  assert.match(newWords, /data-learn-page="vocabulary:frequency:hebrew:60"/);
  assert.doesNotMatch(newWords, /data-learn-page="vocabulary:book"/);
  assert.doesNotMatch(renderedText(newWords), /By Frequency/);
  assert.doesNotMatch(renderedText(newWords), /By Book/);
});

test('Vocabulary by frequency exposes permanent language thresholds', () => {
  const shell = renderPage('vocabulary:frequency');
  assert.match(shell, /Greek/);
  assert.match(shell, /Hebrew/);
  assert.match(shell, /data-learn-page="vocabulary:frequency:greek"/);
  assert.match(shell, /data-learn-page="vocabulary:frequency:hebrew"/);

  const greek = renderPage('vocabulary:frequency:greek');
  ['25+', '10+', '5+', 'All Words'].forEach(label => assert.match(renderedText(greek), new RegExp(label.replace('+', '\\+'))));
  assert.match(greek, /Custom Frequency/);
  assert.match(renderedText(renderPage('vocabulary:frequency:greek:25')), /Study every Greek lemma occurring 25 times or more/);
  const greek25 = renderPage('vocabulary:frequency:greek:25');
  assert.match(greek25, /Start Learning/);
  assert.match(greek25, /learn-start-learning-action/);

  const hebrew = renderPage('vocabulary:frequency:hebrew');
  ['60+', '30+', '10+', '5+', 'All Words'].forEach(label => assert.match(renderedText(hebrew), new RegExp(label.replace('+', '\\+'))));
  assert.match(renderedText(renderPage('vocabulary:frequency:hebrew:60')), /Study every Hebrew lemma occurring 60 times or more/);
});

test('Reading Readiness owns book and chapter preparation paths', async () => {
  const shell = renderPage('reading-readiness');
  assert.match(shell, /Old Testament/);
  assert.match(shell, /New Testament/);

  const oldTestament = renderPage('reading-readiness:old-testament');
  assert.match(oldTestament, /Genesis/);
  assert.match(oldTestament, /data-learn-page="reading-readiness:old-testament:genesis"/);

  const newTestament = renderPage('reading-readiness:new-testament');
  assert.match(newTestament, /Matthew/);
  assert.match(newTestament, /data-learn-page="reading-readiness:new-testament:matthew"/);

  learn.learnState.progressCache['book:greek:matthew'] = await BookProgress.bookProgress('greek', 'matthew');
  const bookHtml = renderPage('reading-readiness:new-testament:matthew');
  const bookStudy = renderedText(bookHtml);
  assert.match(bookStudy, /Matthew/);
  assert.match(bookStudy, /Known Vocabulary \d+ of \d+/);
  assert.match(bookStudy, /Remaining Words \d+/);
  assert.match(bookStudy, /Study/);
  assert.match(bookStudy, /By Chapter/);
  ['25+', '10+', '5+', 'All Words', 'Custom Frequency'].forEach(label => assert.match(bookStudy, new RegExp(label.replace('+', '\\+'))));
  assert.match(bookHtml, /data-learn-page="reading-readiness:new-testament:matthew:overall:25"/);
  assert.match(bookHtml, /data-learn-page="reading-readiness:new-testament:matthew:chapter"/);

  learn.learnState.progressCache['book:hebrew:genesis'] = await BookProgress.bookProgress('hebrew', 'genesis');
  const overall = renderedText(renderPage('reading-readiness:old-testament:genesis'));
  assert.match(overall, /60\+/);
  assert.match(overall, /30\+/);
  assert.match(renderedText(renderPage('reading-readiness:old-testament:genesis:overall:60')), /Start Learning/);
  assert.doesNotMatch(renderedText(renderPage('reading-readiness:old-testament:genesis:overall:60')), /connected to vocabulary learning in a future release/);

  const chapters = renderPage('reading-readiness:new-testament:matthew:chapter');
  assert.match(chapters, /Known Vocabulary 0 of \d+/);
  assert.match(chapters, /data-learn-page="reading-readiness:new-testament:matthew:chapter:28"/);

  learn.learnState.progressCache['chapter:greek:matthew:1'] = await BookProgress.chapterProgress('greek', 'matthew', 1);
  const chapterHtml = renderPage('reading-readiness:new-testament:matthew:chapter:1');
  const chapterStudy = renderedText(chapterHtml);
  assert.match(chapterStudy, /Matthew 1/);
  assert.match(chapterStudy, /Known Vocabulary \d+ of \d+/);
  assert.match(chapterStudy, /25\+/);
  assert.match(chapterStudy, /Custom Frequency/);
  assert.match(chapterHtml, /data-learn-page="reading-readiness:new-testament:matthew:chapter:1:25"/);
  assert.match(renderedText(renderPage('reading-readiness:new-testament:matthew:chapter:1:25')), /Start Learning/);
  assert.doesNotMatch(chapterStudy, /percent|score|mastery|due/i);
});

test('Learn breadcrumbs expose compact clickable path navigation', () => {
  const html = renderPage('reading-readiness:new-testament:romans:chapter:3:custom-7');
  const text = renderedText(html);
  assert.match(text, /Learn › Reading Readiness › New Testament › Romans › By Chapter › Romans 3 › 7\+/);
  [
    'home',
    'reading-readiness',
    'reading-readiness:new-testament',
    'reading-readiness:new-testament:romans',
    'reading-readiness:new-testament:romans:chapter',
    'reading-readiness:new-testament:romans:chapter:3'
  ].forEach(page => assert.match(html, new RegExp(`data-learn-page="${page}"`)));
});

test('Custom frequency validates positive whole numbers and navigates to placeholders', () => {
  assert.deepEqual(learn.parseLearnCustomFrequency('3'), { valid: true, threshold: 3, pageToken: 'custom-3' });
  assert.deepEqual(learn.parseLearnCustomFrequency(' 30 '), { valid: true, threshold: 30, pageToken: 'custom-30' });
  assert.equal(learn.parseLearnCustomFrequency('0').valid, false);
  assert.equal(learn.parseLearnCustomFrequency('2.5').valid, false);
  assert.equal(learn.parseLearnCustomFrequency('abc').valid, false);

  learn.learnState.page = 'vocabulary:frequency:greek';
  learn.learnState.history = [];
  learn.learnState.customFrequencyErrors = {};
  assert.equal(learn.setLearnCustomFrequency('vocabulary:frequency:greek', '3'), true);
  assert.equal(learn.learnState.page, 'vocabulary:frequency:greek:custom-3');
  assert.match(renderedText(learn.renderLearnPage()), /Study every Greek lemma occurring 3 times or more/);

  assert.equal(learn.setLearnCustomFrequency('vocabulary:frequency:greek', '0'), false);
  assert.equal(learn.learnState.customFrequencyErrors['vocabulary:frequency:greek'], 'Enter a positive whole number.');
});

test('Custom frequency works for scoped book and chapter paths', async () => {
  learn.learnState.progressCache['book:greek:romans'] = await BookProgress.bookProgress('greek', 'romans');
  learn.learnState.page = 'reading-readiness:new-testament:romans';
  learn.learnState.history = [];
  learn.learnState.customFrequencyErrors = {};
  assert.equal(learn.setLearnCustomFrequency('reading-readiness:new-testament:romans:overall', '7'), true);
  assert.equal(learn.learnState.page, 'reading-readiness:new-testament:romans:overall:custom-7');
  assert.match(renderedText(learn.renderLearnPage()), /Start Learning/);

  learn.learnState.progressCache['chapter:greek:romans:8'] = await BookProgress.chapterProgress('greek', 'romans', 8);
  assert.equal(learn.setLearnCustomFrequency('reading-readiness:new-testament:romans:chapter:8', '7'), true);
  assert.equal(learn.learnState.page, 'reading-readiness:new-testament:romans:chapter:8:custom-7');
  assert.match(renderedText(learn.renderLearnPage()), /Start Learning/);
});

test('Book and chapter frequency paths keep their scoped vocabulary ids', async () => {
  learn.learnState.progressCache['book:greek:romans'] = await BookProgress.bookProgress('greek', 'romans');
  learn.learnState.progressCache['chapter:greek:romans:8'] = await BookProgress.chapterProgress('greek', 'romans', 8);

  const bookPath = learn.learnPathForPage('reading-readiness:new-testament:romans:overall:5', 'greek', '5');
  const chapterPath = learn.learnPathForPage('reading-readiness:new-testament:romans:chapter:8:5', 'greek', '5');
  const globalPath = learn.learnPathForPage('vocabulary:frequency:greek:5', 'greek', '5');

  assert.equal(bookPath.type, 'scoped-vocabulary');
  assert.equal(chapterPath.type, 'scoped-vocabulary');
  assert.equal(globalPath.type, 'frequency');
  assert.ok(bookPath.vocabularyIds.length > chapterPath.vocabularyIds.length);
  assert.ok(chapterPath.vocabularyIds.every(id => bookPath.vocabularyIds.includes(id)));
});

test('Frequency path starts learning and Learn Another Word advances with remaining count', () => {
  storage.delete(VocabularyLearning.STORAGE_KEY);
  learn.learnState.page = 'vocabulary:frequency:greek:25';
  learn.learnState.activeVocabularyPath = '';
  learn.learnState.currentVocabularyWordId = '';

  let html = learn.renderLearnPage();
  assert.match(html, /Start Learning/);
  assert.match(renderedText(html), /4 words remaining in this path/);

  learn.startLearnVocabularyPath('vocabulary:frequency:greek:25');
  html = learn.renderLearnPage();
  assert.match(renderedText(html), /eis/);
  assert.match(html, /Learn Another Word/);

  learn.learnCurrentVocabularyWord('greek', '25');
  html = learn.renderLearnPage();
  assert.equal(VocabularyLearning.learningStatus(VocabularyLearning.loadStore(), global.state.data.greek[3], '2026-06-26'), 'Learning');
  assert.match(renderedText(html), /3 words remaining in this path/);
  assert.match(renderedText(html), /adelphos/);
});

test('Language review pages separate Greek and Hebrew due queues from the shared model', () => {
  storage.delete(VocabularyLearning.STORAGE_KEY);
  let store = VocabularyLearning.normalizeStore();
  store = VocabularyLearning.introduceEntry(store, global.state.data.greek[0], { type: 'frequency', language: 'greek' }, '2026-06-26');
  store = VocabularyLearning.introduceEntry(store, global.state.data.hebrew[1], { type: 'frequency', language: 'hebrew' }, '2026-06-26');
  VocabularyLearning.saveStore(store);

  const chooser = renderPage('vocabulary:review');
  assert.match(renderedText(chooser), /Greek Review 1 review available/);
  assert.match(renderedText(chooser), /Hebrew Review 1 review available/);

  const greek = renderPage('vocabulary:review:greek');
  assert.match(renderedText(greek), /Greek Review Reviews Available/);
  assert.match(renderedText(greek), /logos/);
  assert.doesNotMatch(renderedText(greek), /אמר/);

  const hebrew = renderPage('vocabulary:review:hebrew');
  assert.match(renderedText(hebrew), /Hebrew Review Reviews Available/);
  assert.match(renderedText(hebrew), /אמר/);
  assert.doesNotMatch(renderedText(hebrew), /logos/);

  const loaded = VocabularyLearning.loadStore();
  assert.ok(loaded.records['lemma:greek:logos']);
  assert.ok(loaded.records['lemma:hebrew:אמר']);
  assert.equal(Object.prototype.hasOwnProperty.call(loaded, 'decks'), false);
});

test('Language review page reveals due vocabulary and grading updates state', () => {
  storage.delete(VocabularyLearning.STORAGE_KEY);
  VocabularyLearning.saveStore(VocabularyLearning.introduceEntry(VocabularyLearning.normalizeStore(), global.state.data.greek[0], { type: 'frequency' }, '2026-06-26'));

  let html = renderPage('vocabulary:review:greek');
  assert.match(renderedText(html), /Greek Review Reviews Available/);
  assert.match(renderedText(html), /logos/);
  assert.match(html, /Reveal Meaning/);
  assert.match(html, /learn-review-action/);
  assert.doesNotMatch(html, /Recognized/);

  learn.revealLearnReview();
  html = learn.renderLearnPage();
  const text = renderedText(html);
  assert.match(text, /word Other translations message • account Greek · freq 330×/);
  assert.doesNotMatch(text, /message, account/);
  assert.doesNotMatch(text, /word •/);
  assert.equal((html.match(/<span>word<\/span>/g) || []).length, 0);
  assert.equal((html.match(/<span>message<\/span>/g) || []).length, 1);
  assert.match(html, /Recognized/);
  assert.match(html, /Missed/);
  assert.match(html, /learn-review-recognized/);
  assert.match(html, /learn-review-missed/);

  learn.gradeLearnReview('greek', 'lemma:greek:logos', 'recognized');
  let record = VocabularyLearning.getRecord(VocabularyLearning.loadStore(), global.state.data.greek[0]);
  assert.equal(record.successCount, 1);
  assert.equal(record.due, '2026-06-27');

  learn.gradeLearnReview('greek', 'lemma:greek:logos', 'missed');
  record = VocabularyLearning.getRecord(VocabularyLearning.loadStore(), global.state.data.greek[0]);
  assert.equal(record.successCount, 0);
  assert.equal(record.due, '2026-06-27');
});

test('Focused word review reuses the existing review interface even when the word is not due', () => {
  storage.delete(VocabularyLearning.STORAGE_KEY);
  let store = VocabularyLearning.normalizeStore();
  store = VocabularyLearning.introduceEntry(store, global.state.data.greek[0], { type: 'word-page' }, '2026-06-26');
  store = VocabularyLearning.reviewEntry(store, global.state.data.greek[0], 'recognized', '2026-06-26');
  VocabularyLearning.saveStore(store);

  learn.reviewLearnVocabularyWord('greek', 'lemma:greek:logos');
  const html = learn.renderLearnPage();
  assert.equal(learn.learnState.page, 'vocabulary:review:greek');
  assert.match(renderedText(html), /Greek Review Word Review/);
  assert.match(renderedText(html), /logos/);
  assert.match(html, /Reveal Meaning/);
  assert.match(html, /learn-review-action/);
});

test('Review gloss display splits embedded separators before deduping alternates', () => {
  storage.delete(VocabularyLearning.STORAGE_KEY);
  VocabularyLearning.saveStore(VocabularyLearning.introduceEntry(VocabularyLearning.normalizeStore(), global.state.data.greek[3], { type: 'frequency' }, '2026-06-26'));

  renderPage('vocabulary:review:greek');
  learn.revealLearnReview();
  const html = learn.renderLearnPage();
  const text = renderedText(html);

  assert.match(text, /eis into Other translations to • for Greek · freq 1754×/);
  assert.doesNotMatch(text, /into, to, for • to • for/);
  assert.doesNotMatch(text, /,/);
  assert.equal((html.match(/<span>to<\/span>/g) || []).length, 1);
  assert.equal((html.match(/<span>for<\/span>/g) || []).length, 1);
});

test('Paradigms shell is organized by language and emphasizes verbs', () => {
  const html = renderPage('paradigms');
  assert.match(html, /Greek/);
  assert.match(html, /Hebrew/);
  assert.equal((html.match(/learn-card-emphasis/g) || []).length, 2);
  assert.match(html, /data-learn-page="paradigms:greek-verbs"/);
  assert.match(html, /data-learn-page="paradigms:greek-nouns"/);
  assert.match(html, /data-learn-page="paradigms:hebrew-verbs"/);
  assert.match(html, /data-learn-page="paradigms:hebrew-nouns"/);

  assert.match(renderedText(renderPage('paradigms:greek-verbs')), /Greek verb recognition practice will be added in a future release/);
  assert.match(renderedText(renderPage('paradigms:hebrew-nouns')), /Hebrew noun recognition practice will be added in a future release/);
});

test('Reading Readiness opens Testament book lists from Reader manifests', () => {
  const html = renderPage('reading-readiness');
  assert.match(html, /Old Testament/);
  assert.match(html, /New Testament/);
  assert.doesNotMatch(html, /percent|score|mastery|due/i);

  assert.match(renderPage('reading-readiness:old-testament'), /data-learn-page="reading-readiness:old-testament:genesis"/);
  assert.match(renderPage('reading-readiness:new-testament'), /data-learn-page="reading-readiness:new-testament:matthew"/);
});

test('Learn back navigation returns through the Learn page stack and exits from home', () => {
  let shownView = '';
  global.showView = view => { shownView = view; };
  learn.learnState.page = 'home';
  learn.learnState.history = [];
  learn.setLearnPage('vocabulary');
  learn.setLearnPage('vocabulary:review');
  learn.backLearnPage();
  assert.equal(learn.learnState.page, 'vocabulary');
  learn.backLearnPage();
  assert.equal(learn.learnState.page, 'home');
  learn.backLearnPage();
  assert.equal(shownView, 'listView');
  delete global.showView;
});

test('resetLearn returns Learn to home and clears the Learn page stack', () => {
  learn.learnState.page = 'reading-readiness:new-testament:romans:chapter:3';
  learn.learnState.history = ['home', 'vocabulary'];
  learn.learnState.customFrequencyErrors = { 'vocabulary:frequency:greek': 'Enter a positive whole number.' };
  learn.resetLearn({ render: false });
  assert.equal(learn.learnState.page, 'home');
  assert.deepEqual(learn.learnState.history, []);
  assert.deepEqual(learn.learnState.customFrequencyErrors, {});
});

test('Primary Learn nav click resets Learn before routing', () => {
  const listeners = {};
  function makeElement(id){
    return {
      id,
      value: '',
      checked: false,
      addEventListener(event, handler){ listeners[`${id}:${event}`] = handler; },
      classList: { toggle() {}, contains(){ return false; } },
      textContent: '',
      style: {}
    };
  }
  const elements = new Map([
    'searchInput','freqMin','freqMax','dueOnlyToggle','posFilterSelect','parsingFamilySelect','sortSelect',
    'startFlashBtn','endFlashBtn','fcFlipToBack','fcFlipToFront','flashCompleteBack',
    'parsingMode','lemmaSearch','startParsing','endParsing','parsingSubmit','parsingReveal','nextParsing','finishParsing',
    'closeModal','modalCloseBtn2','wordModal','openSettings','closeSettingsBtn','wordPageBackToReader','applyAccent',
    'customAccent','studyModeSetting','fontSizeSlider','fontSizeLabel','importData','importFile','exportData','resetSRS','clearAll'
  ].map(id => [id, makeElement(id)]));
  const navLearn = makeElement('navLearn');
  navLearn.dataset = { view: 'learn' };
  let resetCalled = false;
  let routedPath = '';
  const context = {
    console,
    document: {
      activeElement: { tagName: 'BODY' },
      getElementById: id => elements.get(id) || null,
      querySelector: selector => selector.startsWith('#') ? (elements.get(selector.slice(1)) || null) : null,
      querySelectorAll: selector => selector === '.nav-tab' ? [navLearn] : []
    },
    window: { addEventListener: () => {} },
    state: { currentView: 'learnView', lang: 'greek', prefs: {}, session: { queue: [] } },
    resetLearn: options => { resetCalled = options?.render === false; },
    navigateTo: path => { routedPath = path; },
    setLang: () => {},
    debounce: fn => fn,
    renderList: () => {},
    readFiltersFromDOM: () => {},
    renderLemmaPicker: () => {},
    updateParsingMatchCount: () => {},
    readParsingFiltersFromDOM: () => ({}),
    cleanParsingFiltersForMode: () => {},
    updateParsingFilterOptions: () => {},
    startFlash: () => {},
    endFlash: () => {},
    setCardFlipped: () => {},
    wireSwipe: () => {},
    updateParsingModeUI: () => {},
    startParsing: () => {},
    endParsing: () => {},
    checkParsingAnswer: () => {},
    revealParsingAnswer: () => {},
    renderParsingQuestion: () => {},
    closeWordModal: () => {},
    showView: () => {},
    applyTheme: () => {},
    setAccent: () => {},
    toast: () => {},
    savePrefs: () => {},
    exportData: () => {},
    clearUserStorage: () => {},
    location: { reload: () => {} },
    confirm: () => false,
    module: undefined
  };
  context.$ = selector => context.document.querySelector(selector);
  context.$$ = selector => Array.from(context.document.querySelectorAll(selector));
  context.document.addEventListener = () => {};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('src/features/settings/events.js', 'utf8'), context, { filename: 'src/features/settings/events.js' });
  context.wireEvents();
  listeners['navLearn:click']();
  assert.equal(resetCalled, true);
  assert.equal(routedPath, '/learn');
});

test('Learn route and view navigation are wired into the app shell', () => {
  function makeElement(id){
    const classes = new Set(id === 'learnView' ? ['hidden'] : []);
    return {
      id,
      classList: {
        toggle(name, force){ force ? classes.add(name) : classes.delete(name); },
        contains(name){ return classes.has(name); }
      },
      textContent: ''
    };
  }

  const ids = ['listView','flashView','parsingView','dashboardView','settingsView','grammarView','readerView','wordPageView','learnView','profileView','sharedFilterBar','filterSearchGroup','filterSortGroup','filterEntriesCount','filterPosGroup','footerLang'];
  const elements = new Map(ids.map(id => [id, makeElement(id)]));
  const context = {
    console,
    document: {
      getElementById: id => elements.get(id) || null,
      querySelector: selector => selector.startsWith('#') ? (elements.get(selector.slice(1)) || null) : null,
      querySelectorAll: () => []
    },
    window: { location: { pathname: '/list' }, addEventListener() {} },
    history: {
      pushState: (s, t, path) => { context.window.location.pathname = path; },
      replaceState: (s, t, path) => { context.window.location.pathname = path; }
    },
    state: { currentView: 'listView', lang: 'greek', dashboard: {}, prefs: {}, data: { greek: [], hebrew: [] }, filters: {} },
    selectedLemma: null,
    parsingModeFamily: () => 'all',
    readFiltersFromDOM: () => {},
    renderDashboard: () => {},
    renderList: () => {},
    renderLearn: () => { context.renderLearnCalls += 1; },
    renderLearnCalls: 0,
    updateParsingModeUI: () => {},
    renderLemmaPicker: () => {},
    getCurrentStudyList: () => [],
    getCurrentList: () => [],
    module: undefined
  };
  context.$ = selector => context.document.querySelector(selector);
  context.$$ = selector => Array.from(context.document.querySelectorAll(selector));
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('src/core/router.js', 'utf8'), context, { filename: 'src/core/router.js' });
  const vocabSource = fs.readFileSync('src/features/vocab/index.js', 'utf8');
  vm.runInContext(vocabSource.slice(0, vocabSource.indexOf('/* ---------- Language ---------- */')), context, { filename: 'src/features/vocab/index.js' });

  context.navigateTo('/learn');
  assert.equal(context.window.location.pathname, '/learn');
  assert.equal(context.state.currentView, 'learnView');
  assert.equal(elements.get('learnView').classList.contains('hidden'), false);
  assert.equal(elements.get('listView').classList.contains('hidden'), true);
  assert.equal(context.renderLearnCalls, 1);
});
