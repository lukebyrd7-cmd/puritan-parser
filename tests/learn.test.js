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
const StudySets = require('../src/models/study-sets');
const SavedVocabulary = require('../src/models/saved-vocabulary');

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
  learn.learnState.practiceSession = null;
  learn.learnState.selectedRecognitionTargets = {};
  return learn.renderLearnPage();
}

function makeLearnPageButton(page){
  return {
    dataset: { learnPage: page },
    handler: null,
    addEventListener(event, handler){
      if(event === 'click') this.handler = handler;
    },
    click(){
      assert.equal(typeof this.handler, 'function');
      this.handler();
    }
  };
}

function wireHomeReviewButtons(){
  const buttons = {
    greek: makeLearnPageButton('vocabulary:review:greek'),
    hebrew: makeLearnPageButton('vocabulary:review:hebrew'),
    mixed: makeLearnPageButton('vocabulary:review:mixed')
  };
  const root = {
    innerHTML: renderPage('home'),
    querySelector: () => null,
    querySelectorAll: selector => selector === '[data-learn-page]' ? Object.values(buttons) : []
  };
  const previousDollar = global.$;
  const previousDollars = global.$$;
  global.$ = selector => selector === '#learnShell' ? root : null;
  global.$$ = (selector, scope = root) => Array.from(scope.querySelectorAll(selector));
  learn.wireLearn();
  return {
    root,
    buttons,
    restore(){
      global.$ = previousDollar;
      global.$$ = previousDollars;
    }
  };
}

test('Learn home connects scheduled reviews, daily practice, and Learning Paths', () => {
  storage.delete(VocabularyLearning.STORAGE_KEY);
  storage.delete(StudySets.STORAGE_KEY);
  storage.delete(learn.LearnActivePathsStorageKey || 'pp_learn_active_paths');
  const html = renderPage('home');
  const text = renderedText(html);
  ['Scheduled reviews', 'Daily practice', 'Practice known words', 'Learning Paths', 'Active Paths', 'Study Sets (0)', 'More Practice', 'Practice Vocabulary', 'Paradigm Practice'].forEach(label => assert.match(text, new RegExp(label.replace(/[()]/g, '\\$&'))));
  const order = ['review-queue', 'learning-paths', 'study-sets', 'more-practice'].map(section => html.indexOf(`data-learn-dashboard-section="${section}"`));
  assert.deepEqual(order, [...order].sort((a, b) => a - b));
  assert.match(html, /data-learn-page="vocabulary:review:greek"/);
  assert.match(html, /data-learn-page="vocabulary:review:hebrew"/);
  assert.match(html, /data-learn-page="vocabulary:review:mixed"/);
  assert.doesNotMatch(text, /Continue Learning|Start Something New|Grammar Paths|Grammar Practice|Mixed Practice/);
  assert.match(text, /Scheduled reviews complete/);
  assert.match(text, /What you are actively learning/);
  assert.match(text, /No active learning paths/);
  assert.equal((html.match(/data-learn-page="study-sets"/g) || []).length, 1);
  assert.doesNotMatch(html, /id="learnBackBtn"/);
  assert.doesNotMatch(html, /alert\(/);
});

test('Learning Paths renders a persisted actual path with progress and no generic Continue card', () => {
  storage.delete('pp_learn_active_paths');
  storage.delete(VocabularyLearning.STORAGE_KEY);
  renderPage('vocabulary:frequency:greek:25');
  learn.startLearnVocabularyPath('vocabulary:frequency:greek:25');
  learn.learnCurrentVocabularyWord('greek', '25', 'vocabulary:frequency:greek:25');
  const html = renderPage('home');
  const text = renderedText(html);
  assert.match(text, /Greek 25\+ Vocabulary/);
  assert.match(text, /\d+% complete/);
  assert.match(text, /\d+ words remaining/);
  assert.match(html, /data-learn-active-path="vocabulary:frequency:greek:25"/);
  assert.doesNotMatch(text, /Continue Greek Vocabulary|Continue Learning Greek Words|Continue Vocabulary/);
});

test('completed Learning Paths leave Active Paths without losing their review action', () => {
  storage.delete('pp_learn_active_paths');
  storage.delete(VocabularyLearning.STORAGE_KEY);
  renderPage('vocabulary:frequency:greek:25');
  learn.startLearnVocabularyPath('vocabulary:frequency:greek:25');
  const path = { type: 'frequency', language: 'greek', threshold: '25' };
  VocabularyLearning.saveStore(VocabularyLearning.markPathKnown(state.data.greek, VocabularyLearning.loadStore(), path).store);
  const html = renderPage('home');
  assert.match(renderedText(html), /Completed Paths \(1\).*Greek 25\+ Vocabulary.*100% complete.*Review/);
  assert.doesNotMatch(html, /data-learn-active-path="vocabulary:frequency:greek:25"/);
  assert.match(html, /data-learn-page="vocabulary:frequency:greek:25"/);
});

test('Study Sets storage fails gracefully for missing and corrupt data', () => {
  storage.delete(StudySets.STORAGE_KEY);
  assert.deepEqual(StudySets.loadStore(), { schemaVersion: 1, sets: [] });

  storage.set(StudySets.STORAGE_KEY, '{bad json');
  assert.deepEqual(StudySets.loadStore(), { schemaVersion: 1, sets: [] });
});

test('Study Sets page creates and renders a simple vocabulary set', () => {
  storage.delete(StudySets.STORAGE_KEY);
  storage.delete(VocabularyLearning.STORAGE_KEY);

  let html = renderPage('study-sets');
  let text = renderedText(html);
  assert.match(text, /Study Sets Focused custom collections/);
  assert.match(text, /No Study Sets yet/);
  assert.match(html, /data-learn-page="study-sets:create"/);

  const created = learn.createLearnStudySet({
    title: 'Romans Quiz',
    language: 'greek',
    type: 'vocabulary',
    source: 'frequency',
    threshold: '25'
  });
  assert.equal(created.title, 'Romans Quiz');
  assert.equal(created.criteria.kind, 'frequency');
  assert.equal(learn.learnState.page, `study-sets:detail:${created.id}`);
  assert.equal(StudySets.loadStore().sets.length, 1);

  html = learn.renderLearnPage();
  text = renderedText(html);
  assert.match(text, /Romans Quiz/);
  assert.match(text, /Greek vocabulary, 25x and higher/);
  assert.match(text, /4 items/);
  assert.match(html, new RegExp(`data-learn-page="vocabulary:practice:study-set:${created.id}"`));
  assert.match(html, new RegExp(`data-learn-page="study-sets:browse:${created.id}"`));

  html = renderPage(`study-sets:browse:${created.id}`);
  text = renderedText(html);
  assert.match(text, /eis/);
  assert.match(text, /into/);
});

test('Study Sets accept explicit vocabulary words and practice includes them', () => {
  storage.delete(StudySets.STORAGE_KEY);
  storage.delete(VocabularyLearning.STORAGE_KEY);

  const created = learn.createLearnStudySet({
    title: 'Rare Quiz',
    language: 'greek',
    type: 'vocabulary',
    source: 'hand-picked'
  });
  const rare = global.state.data.greek[1];

  let result = learn.addVocabularyToLearnStudySet(created.id, rare);
  assert.equal(result.added, true);
  result = learn.addVocabularyToLearnStudySet(created.id, rare);
  assert.equal(result.added, false);
  assert.equal(StudySets.loadStore().sets[0].explicitItems.length, 1);
  assert.equal(Object.keys(VocabularyLearning.loadStore().records || {}).length, 0);

  let html = renderPage(`study-sets:detail:${created.id}`);
  let text = renderedText(html);
  assert.match(text, /Rare Quiz/);
  assert.match(text, /Hand-picked vocabulary collection/);
  assert.match(text, /Hand-picked words 1/);

  html = renderPage(`study-sets:browse:${created.id}`);
  text = renderedText(html);
  assert.match(text, /agape/);
  assert.match(text, /love/);

  html = renderPage(`vocabulary:practice:study-set:${created.id}`);
  text = renderedText(html);
  assert.match(text, /Rare Quiz/);
  assert.match(text, /1 of 1/);
  assert.match(text, /agape/);
});

test('Study Set detail can add selected words without duplicates or SRS changes', () => {
  storage.delete(StudySets.STORAGE_KEY);
  storage.delete(VocabularyLearning.STORAGE_KEY);

  const created = learn.createLearnStudySet({
    title: 'Hand picked',
    language: 'greek',
    type: 'vocabulary',
    source: 'hand-picked'
  });

  let html = renderPage(`study-sets:detail:${created.id}`);
  let text = renderedText(html);
  assert.match(text, /Add Words/);
  assert.match(text, /logos/);

  learn.addSelectedVocabularyToLearnStudySet(created.id, ['lemma:greek:logos', 'lemma:greek:logos']);
  learn.addSelectedVocabularyToLearnStudySet(created.id, ['lemma:greek:logos']);
  const set = StudySets.loadStore().sets[0];
  assert.equal(set.explicitItems.length, 1);
  assert.equal(Object.keys(VocabularyLearning.loadStore().records || {}).length, 0);

  html = renderPage(`study-sets:browse:${created.id}`);
  text = renderedText(html);
  assert.match(text, /logos/);
  assert.match(text, /word/);
});

test('Saved words source can be created and practiced', () => {
  storage.delete(StudySets.STORAGE_KEY);
  storage.delete(VocabularyLearning.STORAGE_KEY);
  storage.delete(SavedVocabulary.STORAGE_KEY);
  SavedVocabulary.saveEntry(global.state.data.greek[0]);

  const created = learn.createLearnStudySet({
    title: 'Saved Greek',
    language: 'greek',
    type: 'vocabulary',
    source: 'saved'
  });
  assert.equal(created.criteria.kind, 'saved');

  let html = renderPage(`study-sets:detail:${created.id}`);
  let text = renderedText(html);
  assert.match(text, /Saved Greek words/);
  assert.match(text, /1 items/);

  html = renderPage(`vocabulary:practice:study-set:${created.id}`);
  text = renderedText(html);
  assert.match(text, /logos/);
});

test('Study Set delete requires confirmation and preserves learning data', () => {
  storage.delete(StudySets.STORAGE_KEY);
  storage.delete(VocabularyLearning.STORAGE_KEY);
  const set = learn.createLearnStudySet({ title: 'Delete Me', language: 'greek', type: 'vocabulary', source: 'frequency', threshold: '25' });
  let store = VocabularyLearning.introduceEntry(VocabularyLearning.normalizeStore(), global.state.data.greek[0], { type: 'frequency' }, '2026-06-26');
  VocabularyLearning.saveStore(store);

  global.confirm = () => false;
  assert.equal(learn.deleteLearnStudySet(set.id), null);
  assert.equal(StudySets.loadStore().sets.length, 1);

  global.confirm = () => true;
  const result = learn.deleteLearnStudySet(set.id);
  assert.equal(result.deleted, true);
  assert.equal(StudySets.loadStore().sets.length, 0);
  assert.ok(VocabularyLearning.getRecord(VocabularyLearning.loadStore(), global.state.data.greek[0]));
  delete global.confirm;
});

test('Learn dashboard review queue separates Greek and Hebrew with capped today counts', () => {
  storage.delete(VocabularyLearning.STORAGE_KEY);
  storage.set(learn.LearnReviewTargetStorageKey, JSON.stringify({
    greek: { preset: 'custom', dailyTarget: 2 },
    hebrew: { preset: 'standard', dailyTarget: 30 }
  }));
  let store = VocabularyLearning.normalizeStore();
  global.state.data.greek.forEach(entry => {
    store = VocabularyLearning.introduceEntry(store, entry, { type: 'frequency', language: 'greek' }, '2026-06-26');
  });
  store = VocabularyLearning.introduceEntry(store, global.state.data.hebrew[1], { type: 'frequency', language: 'hebrew' }, '2026-06-26');
  VocabularyLearning.saveStore(store);

  const html = renderPage('home');
  const text = renderedText(html);
  assert.match(text, /Greek 2 due 2 beyond daily target · Target 2\/day/);
  assert.match(text, /Hebrew 1 due Target 30\/day/);
  assert.match(text, /3 due today About \d+ minutes?/);
  assert.doesNotMatch(text, /0 more available|daily target limits/);

  const greekSummary = learn.learnReviewQueueSummary('greek');
  assert.equal(greekSummary.todayCount, 2);
  assert.equal(greekSummary.moreAvailable, 2);
  storage.delete(learn.LearnReviewTargetStorageKey);
});

test('Clicking Review Greek from the dashboard starts the capped Greek review session', () => {
  storage.delete(VocabularyLearning.STORAGE_KEY);
  storage.delete(learn.LearnReviewTargetStorageKey);
  storage.set(learn.LearnReviewTargetStorageKey, JSON.stringify({
    greek: { preset: 'custom', dailyTarget: 1 },
    hebrew: { preset: 'standard', dailyTarget: 30 }
  }));
  let store = VocabularyLearning.normalizeStore();
  global.state.data.greek.forEach(entry => {
    store = VocabularyLearning.introduceEntry(store, entry, { type: 'frequency', language: 'greek' }, '2026-06-26');
  });
  VocabularyLearning.saveStore(store);

  const shell = wireHomeReviewButtons();
  try {
    shell.buttons.greek.click();
    const text = renderedText(shell.root.innerHTML);
    assert.equal(learn.learnState.page, 'vocabulary:review:greek');
    assert.match(text, /Greek Review Reviews Available/);
    assert.match(text, /eis/);
    assert.doesNotMatch(text, /logos/);
    assert.match(text, /Reveal Meaning/);
  } finally {
    shell.restore();
    storage.delete(learn.LearnReviewTargetStorageKey);
  }
});

test('Clicking Review Hebrew from the dashboard starts the Hebrew review session', () => {
  storage.delete(VocabularyLearning.STORAGE_KEY);
  storage.delete(learn.LearnReviewTargetStorageKey);
  VocabularyLearning.saveStore(VocabularyLearning.introduceEntry(
    VocabularyLearning.normalizeStore(),
    global.state.data.hebrew[1],
    { type: 'frequency', language: 'hebrew' },
    '2026-06-26'
  ));

  const shell = wireHomeReviewButtons();
  try {
    shell.buttons.hebrew.click();
    const text = renderedText(shell.root.innerHTML);
    assert.equal(learn.learnState.page, 'vocabulary:review:hebrew');
    assert.match(text, /Hebrew Review Reviews Available/);
    assert.match(text, /אמר/);
    assert.match(text, /Reveal Meaning/);
  } finally {
    shell.restore();
  }
});

test('Clicking Review Mixed from the dashboard starts a mixed review session from today queues', () => {
  storage.delete(VocabularyLearning.STORAGE_KEY);
  storage.delete(learn.LearnReviewTargetStorageKey);
  let store = VocabularyLearning.normalizeStore();
  store = VocabularyLearning.introduceEntry(store, global.state.data.greek[0], { type: 'frequency', language: 'greek' }, '2026-06-26');
  store = VocabularyLearning.introduceEntry(store, global.state.data.hebrew[1], { type: 'frequency', language: 'hebrew' }, '2026-06-26');
  VocabularyLearning.saveStore(store);

  const shell = wireHomeReviewButtons();
  try {
    shell.buttons.mixed.click();
    const text = renderedText(shell.root.innerHTML);
    assert.equal(learn.learnState.page, 'vocabulary:review:mixed');
    assert.match(text, /Mixed Review Reviews Available/);
    assert.match(text, /logos/);
    assert.match(text, /2 reviews available/);
    assert.match(text, /Reveal Meaning/);
  } finally {
    shell.restore();
  }
});

test('Dashboard review buttons show a calm empty state when no reviews are available', () => {
  storage.delete(VocabularyLearning.STORAGE_KEY);
  storage.delete(learn.LearnReviewTargetStorageKey);

  const shell = wireHomeReviewButtons();
  try {
    shell.buttons.greek.click();
    assert.equal(learn.learnState.page, 'vocabulary:review:greek');
    let text = renderedText(shell.root.innerHTML);
    assert.match(text, /Greek Review/);
    assert.match(text, /Scheduled reviews complete/);
    assert.match(text, /Continue daily practice/);

    shell.buttons.hebrew.click();
    assert.equal(learn.learnState.page, 'vocabulary:review:hebrew');
    text = renderedText(shell.root.innerHTML);
    assert.match(text, /Hebrew Review/);
    assert.match(text, /Scheduled reviews complete/);
    assert.match(text, /Continue daily practice/);

    shell.buttons.mixed.click();
    assert.equal(learn.learnState.page, 'vocabulary:review:mixed');
    text = renderedText(shell.root.innerHTML);
    assert.match(text, /Mixed Review/);
    assert.match(text, /Scheduled reviews complete/);
    assert.match(text, /Practice known words/);
  } finally {
    shell.restore();
  }
});

test('Learning preferences persist review targets and practice SRS preference', () => {
  storage.delete(learn.LearnReviewTargetStorageKey);
  storage.delete(learn.LearnPracticeSrsPreferenceStorageKey);

  assert.equal(learn.learnReviewTarget('greek'), 30);
  assert.equal(learn.learnReviewTarget('hebrew'), 30);
  assert.equal(learn.learnPracticeSrsPreference(), 'practice-only');

  learn.setLearnReviewTarget('greek', 'light');
  learn.setLearnReviewTarget('hebrew', 'custom', '72');
  assert.equal(learn.learnReviewTarget('greek'), 15);
  assert.equal(learn.learnReviewTarget('hebrew'), 72);

  learn.setLearnReviewTarget('hebrew', 'custom', '0');
  assert.equal(learn.learnReviewTarget('hebrew'), 1);
  learn.setLearnReviewTarget('hebrew', 'custom', '999');
  assert.equal(learn.learnReviewTarget('hebrew'), 200);

  assert.equal(learn.setLearnPracticeSrsPreference('count-srs'), 'count-srs');
  assert.equal(learn.learnPracticeSrsPreference(), 'count-srs');
  storage.set(learn.LearnPracticeSrsPreferenceStorageKey, 'count-srs');
  assert.equal(learn.learnPracticeSrsPreference(), 'count-srs');
  storage.set(learn.LearnPracticeSrsPreferenceStorageKey, 'practice-only');
  assert.equal(learn.learnPracticeSrsPreference(), 'practice-only');
  assert.equal(learn.setLearnPracticeSrsPreference('nope'), 'practice-only');
  storage.delete(learn.LearnPracticeSrsPreferenceStorageKey);
  assert.equal(learn.learnPracticeSrsPreference(), 'practice-only');

  const html = renderPage('learning-preferences');
  const text = renderedText(html);
  assert.match(text, /Greek Review Target/);
  assert.match(text, /Hebrew Review Target/);
  assert.match(text, /Do not adjust schedule/);
});

test('Vocabulary Practice exposes on-demand sources and can practice non-due frequency words', () => {
  storage.delete(VocabularyLearning.STORAGE_KEY);
  storage.delete(StudySets.STORAGE_KEY);
  storage.set(learn.LearnPracticeSrsPreferenceStorageKey, 'practice-only');

  const home = renderPage('vocabulary:practice');
  const homeText = renderedText(home);
  assert.match(homeText, /Vocabulary Practice Drill on demand/);
  ['Frequency', 'Learning Status', 'Saved Words', 'Study Set', 'Book', 'Chapter', 'Overdue / Backlog'].forEach(source => assert.match(homeText, new RegExp(source.replace('/', '\\/'))));
  assert.match(home, /data-learn-page="vocabulary:practice:frequency"/);
  assert.match(home, /data-learn-page="vocabulary:practice:status"/);
  assert.match(home, /data-learn-page="vocabulary:practice:saved"/);
  assert.match(home, /data-learn-page="vocabulary:practice:study-sets"/);
  assert.match(home, /data-learn-page="vocabulary:practice:book"/);
  assert.match(home, /data-learn-page="vocabulary:practice:chapter"/);

  const status = renderPage('vocabulary:practice:status:greek');
  assert.match(renderedText(status), /Known Words/);
  assert.match(renderedText(status), /Learning Words/);
  assert.match(renderedText(status), /Not Learned Words/);

  let html = renderPage('vocabulary:practice:frequency:greek:25');
  assert.match(renderedText(html), /Greek 25\+ Practice On-demand practice/);
  assert.match(renderedText(html), /logos/);
  assert.match(html, /Reveal Meaning/);

  learn.revealLearnPractice();
  html = learn.renderLearnPage();
  assert.match(renderedText(html), /word Other translations message • account/);
  learn.gradeLearnPractice('recognized');
  assert.equal(VocabularyLearning.getRecord(VocabularyLearning.loadStore(), global.state.data.greek[0]), null);
  assert.match(renderedText(learn.renderLearnPage()), /Recognized 1/);

  storage.delete(learn.LearnPracticeSrsPreferenceStorageKey);
});

test('Maintenance practice setup exposes safe defaults and all targeting controls', () => {
  learn.learnState.maintenanceSession = null;
  learn.learnState.maintenanceConfig = null;
  const html = renderPage('vocabulary:maintenance:greek');
  const text = renderedText(html);
  assert.match(text, /Greek maintenance practice/);
  assert.match(text, /Words needing reinforcement Random known words Choose a book/);
  assert.match(text, /C–F D–F All known words/);
  assert.match(text, /10 20 50 Continue until stopped/);
  assert.match(text, /Adjust review schedule from this session Default: Off/);
  assert.match(text, /This session will not change review due dates/);
  assert.match(html, /name="focus"[\s\S]*value="reinforcement" selected/);
  assert.match(html, /name="gradeFilter"[\s\S]*value="c-f" selected/);
  assert.doesNotMatch(html, /name="adjustSchedule" checked/);
  const source = fs.readFileSync('src/features/learn/index.js', 'utf8');
  assert.match(source, /function renderMaintenanceSetup\(language\)\{\s*ensureLearnManifest\(language\)/);
  assert.match(source, /fetch\(`\/data\/\$\{language\}\/manifest\.json`\)/);
});

test('On-demand practice can count toward SRS through the preference', () => {
  storage.delete(VocabularyLearning.STORAGE_KEY);
  storage.set(learn.LearnPracticeSrsPreferenceStorageKey, 'count-srs');

  renderPage('vocabulary:practice:frequency:greek:25');
  learn.revealLearnPractice();
  learn.gradeLearnPractice('recognized');

  const record = VocabularyLearning.getRecord(VocabularyLearning.loadStore(), global.state.data.greek[0]);
  assert.equal(record.successCount, 1);
  assert.equal(record.due, '2026-06-27');
  storage.delete(learn.LearnPracticeSrsPreferenceStorageKey);
});

test('Ask-mode practice exposes an explicit count-toward-SRS action at session end', () => {
  storage.delete(VocabularyLearning.STORAGE_KEY);
  storage.set(learn.LearnPracticeSrsPreferenceStorageKey, 'ask');

  renderPage('vocabulary:practice:frequency:hebrew:60');
  learn.revealLearnPractice();
  learn.gradeLearnPractice('missed');
  let html = learn.renderLearnPage();
  assert.match(html, /data-learn-practice-count-srs="true"/);
  assert.equal(VocabularyLearning.getRecord(VocabularyLearning.loadStore(), global.state.data.hebrew[1]), null);

  learn.countLearnPracticeTowardSrs();
  const record = VocabularyLearning.getRecord(VocabularyLearning.loadStore(), global.state.data.hebrew[1]);
  assert.equal(record.successCount, 0);
  assert.equal(record.intervalDays, 1);
  assert.match(renderedText(learn.renderLearnPage()), /This session has been counted toward SRS/);
  storage.delete(learn.LearnPracticeSrsPreferenceStorageKey);
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
  assert.match(review, /data-learn-page="vocabulary:review:mixed"/);
  assert.match(renderedText(review), /Greek Review/);
  assert.match(renderedText(review), /Hebrew Review/);
  assert.match(renderedText(review), /Mixed Review/);
  const newWords = renderPage('vocabulary:new-words');
  assert.match(renderedText(newWords), /Start Learning Path Choose a structured vocabulary goal/);
  assert.match(renderedText(newWords), /Frequency Vocabulary/);
  assert.match(renderedText(newWords), /Book Vocabulary/);
  assert.match(renderedText(newWords), /Chapter Vocabulary/);
  assert.match(newWords, /data-learn-page="vocabulary:frequency"/);
  assert.match(newWords, /data-learn-page="vocabulary:book"/);
  assert.match(newWords, /data-learn-page="vocabulary:chapter"/);
  assert.doesNotMatch(renderedText(newWords), /Grammar Paths/);
});

test('Book and chapter path choosers expose canonical books and selected-book chapters', async () => {
  const bookShell = renderPage('vocabulary:book');
  assert.match(renderedText(bookShell), /Old Testament/);
  assert.match(renderedText(bookShell), /New Testament/);
  assert.match(renderPage('vocabulary:book:new-testament'), /Matthew/);
  assert.match(renderPage('vocabulary:book:new-testament'), /Romans/);

  const chapterShell = renderPage('vocabulary:chapter');
  assert.match(renderedText(chapterShell), /Chapter Vocabulary/);
  assert.match(renderPage('vocabulary:chapter:new-testament'), /Romans/);
  learn.learnState.progressCache['book:greek:romans'] = await BookProgress.bookProgress('greek', 'romans');
  const chapters = renderPage('vocabulary:chapter:greek:romans');
  assert.match(chapters, /data-learn-page="vocabulary:book:greek:romans:chapter:1"/);
  assert.match(chapters, /data-learn-page="vocabulary:book:greek:romans:chapter:16"/);
});

test('Starting book and chapter paths persists one specific active path each', async () => {
  storage.delete('pp_learn_active_paths');
  learn.learnState.progressCache['book:greek:romans'] = await BookProgress.bookProgress('greek', 'romans');
  learn.learnState.progressCache['chapter:greek:romans:8'] = await BookProgress.chapterProgress('greek', 'romans', 8);

  learn.startLearnVocabularyPath('vocabulary:book:greek:romans:overall:all');
  learn.startLearnVocabularyPath('vocabulary:book:greek:romans:chapter:8:all');
  const records = JSON.parse(storage.get('pp_learn_active_paths'));
  assert.equal(records.length, 2);
  assert.equal(records[0].title, 'Romans 8 Vocabulary');
  assert.equal(records[1].title, 'Romans Vocabulary');
  assert.equal(records.filter(record => record.page === 'vocabulary:book:greek:romans:chapter:8:all').length, 1);

  const home = renderedText(renderPage('home'));
  assert.match(home, /Romans 8 Vocabulary/);
  assert.match(home, /Romans Vocabulary/);
  assert.doesNotMatch(home, /Continue Greek Vocabulary/);
});

test('Book and chapter practice use scoped words without creating active paths', async () => {
  storage.delete('pp_learn_active_paths');
  learn.learnState.progressCache['book:greek:romans'] = await BookProgress.bookProgress('greek', 'romans');
  learn.learnState.progressCache['chapter:greek:romans:8'] = await BookProgress.chapterProgress('greek', 'romans', 8);

  const book = renderPage('vocabulary:practice:book:greek:romans');
  assert.match(renderedText(book), /Romans Vocabulary Practice/);
  assert.match(book, /On-demand practice/);

  const chapter = renderPage('vocabulary:practice:chapter:greek:romans:8');
  assert.match(renderedText(chapter), /Romans 8 Vocabulary Practice/);
  assert.match(chapter, /On-demand practice/);
  assert.equal(storage.get('pp_learn_active_paths'), undefined);
});

test('Start Learning Path and Practice Vocabulary route to distinct source screens', () => {
  const paths = renderPage('vocabulary:new-words');
  const practice = renderPage('vocabulary:practice');
  assert.match(paths, /data-learn-page="vocabulary:chapter"/);
  assert.doesNotMatch(paths, /Learning Status|Saved Words|Overdue \/ Backlog/);
  assert.match(practice, /data-learn-page="vocabulary:practice:chapter"/);
  assert.match(renderedText(practice), /Learning Status/);
  assert.doesNotMatch(practice, /data-learn-page="vocabulary:frequency:greek"/);
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

test('Mark Path as Known confirms and marks only current path words without due reviews', () => {
  storage.delete(VocabularyLearning.STORAGE_KEY);
  let confirmMessage = '';
  global.confirm = message => { confirmMessage = message; return true; };

  const html = renderPage('vocabulary:frequency:greek:25');
  assert.match(html, /Mark Path as Known/);
  assert.match(html, /data-learn-mark-path-known="true"/);
  assert.match(html, /btn btn-ghost btn-sm/);

  const result = learn.markLearnPathKnown('greek', '25', 'vocabulary:frequency:greek:25');
  assert.equal(confirmMessage, 'Mark all words in this path as Known? This will update Reading Readiness and Progress.');
  assert.equal(result.count, 4);

  const store = VocabularyLearning.loadStore();
  global.state.data.greek.forEach(entry => {
    assert.equal(VocabularyLearning.learningStatus(store, entry, '2026-06-26'), 'Known');
  });
  assert.equal(VocabularyLearning.dueEntries(global.state.data.greek, store, '2026-06-26').length, 0);
  assert.match(renderedText(learn.renderLearnPage()), /0 words remaining in this path/);

  delete global.confirm;
});

test('Mark Path as Known can be cancelled without changing the path', () => {
  storage.delete(VocabularyLearning.STORAGE_KEY);
  global.confirm = () => false;
  const result = learn.markLearnPathKnown('hebrew', '60', 'vocabulary:frequency:hebrew:60');
  assert.equal(result, null);
  const store = VocabularyLearning.loadStore();
  assert.equal(VocabularyLearning.learningStatus(store, global.state.data.hebrew[1], '2026-06-26'), 'Not Learned');
  delete global.confirm;
});

test('Mark Path as Known updates scoped chapter readiness for the current path only', async () => {
  storage.delete(VocabularyLearning.STORAGE_KEY);
  global.confirm = () => true;
  learn.learnState.progressCache['chapter:greek:romans:8'] = await BookProgress.chapterProgress('greek', 'romans', 8);
  const before = learn.learnState.progressCache['chapter:greek:romans:8'].frequency.find(item => String(item.threshold) === '5');
  assert.ok(before.remaining > 0);

  const page = 'reading-readiness:new-testament:romans:chapter:8:5';
  const result = learn.markLearnPathKnown('greek', '5', page);
  assert.ok(result.count > 0);
  assert.equal(learn.learnState.progressCache['chapter:greek:romans:8'], undefined);

  const after = await BookProgress.chapterProgress('greek', 'romans', 8);
  const afterFive = after.frequency.find(item => String(item.threshold) === '5');
  assert.equal(afterFive.remaining, 0);
  assert.equal(VocabularyLearning.dueEntries(afterFive.vocabulary.map(item => item.entry), VocabularyLearning.loadStore(), '2026-06-26').length, 0);

  delete global.confirm;
});

test('Language review pages separate Greek and Hebrew due queues from the shared model', () => {
  storage.delete(VocabularyLearning.STORAGE_KEY);
  let store = VocabularyLearning.normalizeStore();
  store = VocabularyLearning.introduceEntry(store, global.state.data.greek[0], { type: 'frequency', language: 'greek' }, '2026-06-26');
  store = VocabularyLearning.introduceEntry(store, global.state.data.hebrew[1], { type: 'frequency', language: 'hebrew' }, '2026-06-26');
  VocabularyLearning.saveStore(store);

  const chooser = renderPage('vocabulary:review');
  assert.match(renderedText(chooser), /Greek Review 1 due today/);
  assert.match(renderedText(chooser), /Hebrew Review 1 due today/);
  assert.match(renderedText(chooser), /Mixed Review/);

  const greek = renderPage('vocabulary:review:greek');
  assert.match(renderedText(greek), /Greek Review Reviews Available/);
  assert.match(renderedText(greek), /logos/);
  assert.doesNotMatch(renderedText(greek), /אמר/);

  const hebrew = renderPage('vocabulary:review:hebrew');
  assert.match(renderedText(hebrew), /Hebrew Review Reviews Available/);
  assert.match(renderedText(hebrew), /אמר/);
  assert.doesNotMatch(renderedText(hebrew), /logos/);

  const mixed = renderPage('vocabulary:review:mixed');
  assert.match(renderedText(mixed), /Mixed Review Reviews Available/);
  assert.match(renderedText(mixed), /logos/);

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
  assert.match(text, /Learning · Still being learned\. Due today\./);
  assert.match(text, /Next review Due today Interval Not scheduled Reviews 0 successful · 0 total/);
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
  assert.match(renderedText(learn.renderLearnPage()), /Last Review logos: Reviewing\. Next review: 2026-06-27\. Interval: 1 day\./);

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

test('Paradigms shell emphasizes Recognition Practice and exposes Parsing Drills', () => {
  const html = renderPage('paradigms');
  assert.match(renderedText(html), /Recognition Practice/);
  assert.match(renderedText(html), /Parsing Drills/);
  assert.match(html, /data-learn-page="paradigms:recognition-practice"/);
  assert.match(html, /data-learn-page="paradigms:parsing-drills"/);
  assert.equal((html.match(/learn-card-emphasis/g) || []).length, 1);

  const recognition = renderPage('paradigms:recognition-practice');
  assert.match(renderedText(recognition), /Recognition Practice Recognition Practice is the primary paradigm study path/);
  assert.match(recognition, /Greek/);
  assert.match(recognition, /Hebrew/);
  assert.equal((recognition.match(/learn-card-emphasis/g) || []).length, 2);
  assert.match(recognition, /data-learn-page="paradigms:greek-verbs"/);
  assert.match(recognition, /data-learn-page="paradigms:greek-nouns"/);
  assert.match(recognition, /data-learn-page="paradigms:hebrew-verbs"/);
  assert.match(recognition, /data-learn-page="paradigms:hebrew-nouns"/);

  const parsingDrills = renderPage('paradigms:parsing-drills');
  assert.match(renderedText(parsingDrills), /Greek Parsing Drills/);
  assert.match(renderedText(parsingDrills), /Hebrew Parsing Drills/);
  assert.match(parsingDrills, /data-learn-open-view="parsing"/);
  assert.match(parsingDrills, /data-learn-open-lang="greek"/);
  assert.match(parsingDrills, /data-learn-open-lang="hebrew"/);

  assert.match(renderedText(renderPage('paradigms:greek-verbs')), /Greek Verbs Choose grouped practice or one paradigm/);
  assert.match(renderPage('paradigms:greek-verbs'), /data-learn-recognition-start="greek-verbs"/);
  assert.match(renderPage('paradigms:greek-verbs'), /data-learn-page="paradigms:greek-verbs:session:greek-present-active-indicative"/);
  assert.match(renderedText(renderPage('paradigms:hebrew-nouns')), /Hebrew Nouns Choose grouped practice or one paradigm/);
});

test('Reading Readiness describes vocabulary-based book and chapter preparation', () => {
  const html = renderPage('reading-readiness');
  assert.match(renderedText(html), /Track your reading readiness and study book or chapter vocabulary paths/);
});

test('Legacy Paradigms recognition paths remain accessible', () => {
  const html = renderPage('paradigms:recognition-practice');
  assert.match(html, /Greek/);
  assert.match(html, /Hebrew/);
  assert.equal((html.match(/learn-card-emphasis/g) || []).length, 2);
  assert.match(html, /data-learn-page="paradigms:greek-verbs"/);
  assert.match(html, /data-learn-page="paradigms:greek-nouns"/);
  assert.match(html, /data-learn-page="paradigms:hebrew-verbs"/);
  assert.match(html, /data-learn-page="paradigms:hebrew-nouns"/);

  assert.match(renderedText(renderPage('paradigms:greek-verbs')), /Greek Verbs Choose grouped practice or one paradigm/);
  assert.match(renderPage('paradigms:greek-verbs'), /data-learn-recognition-start="greek-verbs"/);
  assert.match(renderPage('paradigms:greek-verbs'), /data-learn-page="paradigms:greek-verbs:session:greek-present-active-indicative"/);
  assert.match(renderedText(renderPage('paradigms:hebrew-nouns')), /Hebrew Nouns Choose grouped practice or one paradigm/);
});

test('Paradigm Recognition supports selected single and multiple target sessions', () => {
  let html = renderPage('paradigms:greek-verbs');
  assert.match(html, /Start All/);
  assert.match(html, /Start Selected/);
  assert.match(html, /Clear Selection/);
  assert.match(html, /data-learn-recognition-start-selected="greek-verbs" disabled/);

  let selected = learn.toggleRecognitionSelection('greek-verbs', 'greek-present-active-indicative');
  assert.deepEqual(selected, ['greek-present-active-indicative']);
  html = learn.renderLearnPage();
  assert.match(renderedText(html), /1 selected/);
  assert.doesNotMatch(html, /data-learn-recognition-start-selected="greek-verbs" disabled/);

  let session = learn.startSelectedRecognitionSession('greek-verbs');
  assert.equal(session.targetId, 'selected-greek-verbs');
  html = learn.renderLearnPage();
  assert.match(renderedText(html), /Selected Paradigms/);
  assert.match(renderedText(html), /Present Active Indicative/);

  renderPage('paradigms:greek-verbs');
  learn.toggleRecognitionSelection('greek-verbs', 'greek-present-active-indicative');
  selected = learn.toggleRecognitionSelection('greek-verbs', 'greek-aorist-active-indicative');
  assert.deepEqual(selected.sort(), ['greek-aorist-active-indicative', 'greek-present-active-indicative']);
  session = learn.startSelectedRecognitionSession('greek-verbs');
  html = learn.renderLearnPage();
  const text = renderedText(html);
  assert.match(text, /Selected Paradigms/);
  assert.ok(/Present Active Indicative|Aorist Active Indicative/.test(text));
  const built = require('../src/features/learn/recognition-engine').createCombinedSession(session.selectedTargetIds, { id: session.targetId });
  assert.ok(built.items.every(item => item.categories.includes('present-active-indicative') || item.categories.includes('aorist-active-indicative')));
  assert.equal(built.items.some(item => item.categories.includes('imperfect-active-indicative')), false);

  renderPage('paradigms:greek-verbs');
  learn.toggleRecognitionSelection('greek-verbs', 'greek-present-active-indicative');
  learn.clearRecognitionSelection('greek-verbs');
  assert.deepEqual(learn.selectedRecognitionTargetIds('greek-verbs'), []);
});

test('Paradigm recognition sessions reveal answers, track simple progress, and link Reference', () => {
  let html = renderPage('paradigms:greek-verbs:session:greek-present-active-indicative');
  assert.match(renderedText(html), /Present Active Indicative/);
  assert.match(renderedText(html), /Recognize this form/);
  assert.match(html, /Reveal Answer/);
  assert.match(html, /data-learn-reference-topic="greek-verbs"/);
  assert.doesNotMatch(html, /type="text"|textarea/i);

  learn.revealRecognitionAnswer();
  html = learn.renderLearnPage();
  assert.match(renderedText(html), /Recognition clues/);
  assert.match(html, /I recognized it/);
  assert.match(html, /I missed it/);
  assert.match(html, /data-learn-recognition-grade="recognized"/);

  learn.gradeRecognitionAnswer('recognized');
  html = learn.renderLearnPage();
  assert.match(renderedText(html), /Recognized 1/);
  assert.match(renderedText(html), /Missed 0/);

  html = renderPage('paradigms:hebrew-verbs:session:hebrew-qal');
  assert.match(renderedText(html), /Qal/);
  assert.match(html, /dir="rtl"/);
  assert.match(html, /data-learn-reference-topic="hebrew-verbs"/);
});

test('View Reference navigation from recognition opens the grammar reference topic', () => {
  let shownView = '';
  let routedPath = '';
  let renderedTopic = '';
  global.showView = view => { shownView = view; };
  global.navigateTo = path => { routedPath = path; };
  global.renderReferenceLibrary = topicId => { renderedTopic = topicId; };
  global.state.lang = 'greek';

  learn.openLearnReference('hebrew-verbs', 'strong-verbs');
  assert.equal(global.state.lang, 'hebrew');
  assert.equal(shownView, 'grammarView');
  assert.equal(routedPath, '/grammar');
  assert.equal(renderedTopic, 'hebrew-verbs');

  delete global.showView;
  delete global.navigateTo;
  delete global.renderReferenceLibrary;
});

test('Reading Readiness opens Testament book lists from Reader manifests', () => {
  const html = renderPage('reading-readiness');
  assert.match(html, /Old Testament/);
  assert.match(html, /New Testament/);
  assert.doesNotMatch(html, /percent|score|mastery|due/i);

  assert.match(renderPage('reading-readiness:old-testament'), /data-learn-page="reading-readiness:old-testament:genesis"/);
  assert.match(renderPage('reading-readiness:new-testament'), /data-learn-page="reading-readiness:new-testament:matthew"/);
});

test('Learn back navigation returns through the Learn page stack and stays in Learn at home', () => {
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
  assert.equal(learn.learnState.page, 'home');
  assert.equal(shownView, '');

  learn.learnState.page = 'reading-readiness:new-testament:matthew';
  learn.learnState.history = ['__reader__'];
  learn.backLearnPage();
  assert.equal(shownView, 'readerView');
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

  const ids = ['listView','flashView','parsingView','dashboardView','progressView','settingsView','globalSearchView','grammarView','readerView','wordPageView','learnView','profileView','sharedFilterBar','filterSearchGroup','filterSortGroup','filterEntriesCount','filterPosGroup','footerLang'];
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

test('Top navigation keeps Learn central and removes duplicate study tabs', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  assert.doesNotMatch(html, /class="lang-toggle"/);
  assert.doesNotMatch(html, /id="btnHebrew"|id="btnGreek"/);
  const navMatch = html.match(/<div class="view-nav" id="viewNav">([\s\S]*?)<\/div>/);
  assert.ok(navMatch);
  const labels = [...navMatch[1].matchAll(/data-view="([^"]+)"[^>]*>([^<]+)/g)].map(match => ({ view: match[1], label: match[2] }));
  assert.deepEqual(labels, [
    { view: 'learn', label: 'Learn' },
    { view: 'reader', label: 'Reader' },
    { view: 'grammar', label: 'Reference' },
    { view: 'progress', label: 'Progress' }
  ]);
  ['Vocabulary', 'Flashcards', 'Parsing', 'Dashboard', 'Profile'].forEach(label => {
    assert.equal(labels.some(item => item.label === label), false);
  });
});
