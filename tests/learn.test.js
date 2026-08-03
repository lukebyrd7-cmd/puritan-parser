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
const LearningPractice = require('../src/core/learning-practice.js');
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

test('Learn home prioritizes independent daily practice, parsing, focused sources, and tools', () => {
  storage.delete(VocabularyLearning.STORAGE_KEY);
  storage.delete(StudySets.STORAGE_KEY);
  storage.delete(learn.LearnActivePathsStorageKey || 'pp_learn_active_paths');
  const html = renderPage('home');
  const text = renderedText(html);
  ['Today’s Practice', 'Greek practice', 'Hebrew practice', 'Parsing Practice', 'Practice by book', 'Practice by frequency', 'Practice weak words', 'Custom Decks', 'Vocabulary tools'].forEach(label => assert.match(text, new RegExp(label.replace(/[()]/g, '\\$&'))));
  const order = ['Today’s Practice', 'Parsing Practice', 'Focused vocabulary practice', 'Vocabulary tools'].map(label => text.indexOf(label));
  assert.deepEqual(order, [...order].sort((a, b) => a - b));
  assert.match(html, /data-learn-start-daily="greek"/);
  assert.match(html, /data-learn-start-daily="hebrew"/);
  assert.doesNotMatch(text, /Review Mixed|generic practice option simply called/);
  assert.doesNotMatch(html, /id="learnBackBtn"/);
  assert.doesNotMatch(html, /alert\(/);
});

test('Parsing Practice presents equivalent Greek and Hebrew choices and stacks on mobile', () => {
  const html = renderPage('home');
  const styles = require('node:fs').readFileSync('styles.css', 'utf8');
  const choices = html.match(/<button class="learn-parsing-choice"[^>]*data-learn-page="parsing:setup:(greek|hebrew)"/g) || [];
  assert.equal(choices.length, 2);
  assert.match(html, /Recognize Greek and Hebrew forms through focused paradigm drills/);
  assert.doesNotMatch(html, /learn-parsing-choice[^>]*(btn-primary|primary|recommended)/);
  assert.match(styles, /\.learn-parsing-choice-grid\{grid-template-columns:1fr\}/);
  assert.match(styles, /\.learn-parsing-choice\{width:100%\}/);
});

test('daily and focused practice setup render only context-valid dependent controls', () => {
  storage.delete(StudySets.STORAGE_KEY);
  learn.learnState.profileError = '';
  learn.learnState.profileDrafts = { greek: { ...LearningPractice.defaultProfile('greek'), source: 'all-known', sourceId: '' } };
  let html = renderPage('vocabulary:customize:greek');
  assert.match(html, /Vocabulary scope/);
  assert.match(renderedText(html), /Customize Greek daily practice.*Daily practice amount.*Finish today’s goal.*recommended.*Practice a set number.*Continue until I stop/);
  assert.match(html, /name="dailyAmount"[^>]*min="1"[^>]*max="200"[^>]*disabled/);
  assert.equal(learn.learnBreadcrumbs('vocabulary:customize:greek').at(-1).label, 'Customize Greek daily practice');
  assert.doesNotMatch(html, /data-dependent-field=/);

  learn.learnState.profileDrafts.greek = { ...LearningPractice.defaultProfile('greek'), source: 'book', sourceId: '' };
  html = renderPage('vocabulary:customize:greek:book');
  assert.match(html, /data-dependent-field="book"/);
  assert.match(html, /Choose a book/);
  assert.doesNotMatch(html, /name="frequencyChoice"|name="source"/);
  assert.match(html, /disabled aria-disabled="true"/);

  learn.learnState.profileDrafts.greek = { ...LearningPractice.defaultProfile('greek'), source: 'frequency', sourceId: 'custom:5:9' };
  html = renderPage('vocabulary:customize:greek:frequency:custom:5:9');
  assert.match(html, /data-dependent-field="frequency"/);
  assert.match(html, /name="frequencyMinimum"[^>]*value="5"/);
  assert.match(html, /name="frequencyMaximum"[^>]*value="9"/);
  assert.doesNotMatch(html, /Choose a book|Choose a Custom Deck/);

  const greekDeck = learn.createLearnStudySet({ title: 'Greek deck', language: 'greek', type: 'vocabulary', source: 'hand-picked' });
  learn.createLearnStudySet({ title: 'Hebrew deck', language: 'hebrew', type: 'vocabulary', source: 'hand-picked' });
  learn.learnState.profileDrafts.greek = { ...LearningPractice.defaultProfile('greek'), source: 'custom-deck', sourceId: greekDeck.id };
  html = renderPage(`vocabulary:customize:greek:custom-deck:${greekDeck.id}`);
  assert.match(html, /Greek deck/);
  assert.doesNotMatch(html, /Hebrew deck|Choose a book|name="frequencyChoice"/);

  learn.learnState.profileDrafts.greek = { ...LearningPractice.defaultProfile('greek'), source: 'weak', sourceId: '' };
  html = renderPage('vocabulary:customize:greek:weak');
  assert.match(renderedText(html), /recent difficulty, Hard or Again answers, and words marked Needs attention/);
  assert.doesNotMatch(html, /name="source"|name="strategy"|name="selectedGrades"/);
  assert.match(html, /Continue until I stop/);
});

test('language vocabulary preparation deduplicates concurrent jobs and isolates caches', async () => {
  const originalAsync = global.getStudyEntriesAsync;
  let builds = 0;
  global.getStudyEntriesAsync = async entries => { builds += 1; await new Promise(resolve => setImmediate(resolve)); return entries.slice(); };
  learn.learnState.vocabularyEntryCache = {};
  learn.learnState.vocabularyEntryPromises = {};
  const first = learn.prepareLearnVocabularyEntries('hebrew');
  const second = learn.prepareLearnVocabularyEntries('hebrew');
  const [firstEntries, secondEntries] = await Promise.all([first, second]);
  assert.equal(builds, 1);
  assert.equal(firstEntries, secondEntries);
  await learn.prepareLearnVocabularyEntries('greek');
  assert.equal(builds, 2);
  assert.notEqual(learn.learnState.vocabularyEntryCache.greek.entries, learn.learnState.vocabularyEntryCache.hebrew.entries);
  global.getStudyEntriesAsync = originalAsync;
});

test('twenty repeated Learn route renders keep profile state and storage stable', () => {
  const writesBefore = storage.size;
  const profileSnapshot = JSON.stringify(LearningPractice.loadProfiles().profiles);
  for(let cycle = 0; cycle < 20; cycle += 1){
    renderPage(cycle % 2 ? 'home' : 'vocabulary:customize:greek');
    assert.equal(JSON.stringify(LearningPractice.loadProfiles().profiles), profileSnapshot);
  }
  assert.equal(storage.size, writesBefore);
});

test('recognition parsing setup is language-specific and separated from vocabulary filters', () => {
  let html = renderPage('parsing:setup:greek');
  assert.match(renderedText(html), /Greek parsing practice.*Mixed recognition.*Verbs.*Nouns.*5.*10.*20.*30.*Start parsing practice/);
  assert.doesNotMatch(html, /Due only|Needs attention|Frequency|vocab JSON/);
  html = renderPage('parsing:setup:hebrew');
  assert.match(renderedText(html), /Hebrew parsing practice/);
  assert.match(html, /data-learn-parsing-start="hebrew"/);
  assert.match(html, /data-learn-page="home"/);
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
  assert.deepEqual(StudySets.loadStore(), { schemaVersion: 2, revision: 0, sets: [] });

  storage.set(StudySets.STORAGE_KEY, '{bad json');
  assert.deepEqual(StudySets.loadStore(), { schemaVersion: 2, revision: 0, sets: [] });
});

test('Study Sets page creates and renders a simple vocabulary set', () => {
  storage.delete(StudySets.STORAGE_KEY);
  storage.delete(VocabularyLearning.STORAGE_KEY);

  let html = renderPage('study-sets');
  let text = renderedText(html);
  assert.match(text, /Custom Decks Focused custom collections/);
  assert.match(text, /No Custom Decks yet/);
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
  assert.match(text, /Greek vocabulary, 25\+ occurrences/);
  assert.match(text, /Word count 4/);
  assert.match(html, new RegExp(`data-learn-page="vocabulary:customize:greek:custom-deck:${created.id}"`));
  html = renderPage(`vocabulary:customize:greek:custom-deck:${created.id}`);
  assert.doesNotMatch(html, /name="source"/);
  assert.match(html, new RegExp(`option value="${created.id}" selected`));

  html = renderPage(`study-sets:browse:${created.id}`);
  text = renderedText(html);
  assert.match(text, /eis/);
  assert.match(text, /into/);
});

test('book-derived Custom Decks retain scoped vocabulary membership', () => {
  storage.delete(StudySets.STORAGE_KEY);
  learn.learnState.studySetDraft = { title: 'Matthew words', language: 'greek', source: 'book', sourceId: 'matthew' };
  delete learn.learnState.progressCache['book:greek:matthew'];
  let html = renderPage('study-sets:create');
  assert.match(html, /Create Custom Deck<\/button>/);

  learn.learnState.progressCache['book:greek:matthew'] = {
    overall: { vocabulary: state.data.greek.slice(0, 2).map(entry => ({ entry })) }
  };
  html = renderPage('study-sets:create');
  assert.doesNotMatch(html, /Create Custom Deck<\/button>\s*<\/div>[\s\S]*disabled/);
  const created = learn.createLearnStudySet({ title: 'Matthew words', language: 'greek', source: 'book', sourceId: 'matthew' });
  assert.deepEqual(created.criteria.vocabularyIds, ['lemma:greek:logos', 'lemma:greek:agape']);
  assert.match(renderedText(learn.renderLearnPage()), /Word count 2/);
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
  assert.match(text, /Hand-picked Greek vocabulary collection/);
  assert.match(text, /Word count 1/);

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
  assert.match(text, /Add words/);
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
  assert.match(text, /Word count 1/);

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

test('Learn dashboard separates Greek and Hebrew and never hides due work behind the target', () => {
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
  assert.match(text, /Greek practice 0 of 2 Scheduled 4/);
  assert.match(text, /Hebrew practice 0 of 30 Scheduled 1/);
  assert.match(text, /4 scheduled reviews/);
  assert.doesNotMatch(text, /0 more available|daily target limits/);

  const greekSummary = learn.learnReviewQueueSummary('greek');
  assert.equal(greekSummary.todayCount, 2);
  assert.equal(greekSummary.moreAvailable, 2);
  assert.match(text, /Start Greek practice Customize.*Start Hebrew practice Customize/);
  assert.doesNotMatch(html, /disabled aria-disabled="true"/);
  storage.delete(learn.LearnReviewTargetStorageKey);
});

test('Learn dashboard primary labels adapt after daily goals are complete', () => {
  storage.delete(VocabularyLearning.STORAGE_KEY);
  storage.delete(learn.LearnReviewTargetStorageKey);
  let html = renderPage('home');
  let text = renderedText(html);
  assert.match(text, /Start Greek practice/);
  assert.match(text, /Start Hebrew practice/);

  storage.set(learn.LearnReviewTargetStorageKey, JSON.stringify({
    greek: { preset: 'custom', dailyTarget: 1 },
    hebrew: { preset: 'custom', dailyTarget: 1 }
  }));
  let completedStore = VocabularyLearning.normalizeStore();
  for(const word of [global.state.data.greek[0], global.state.data.hebrew[0]]){
    completedStore = VocabularyLearning.markEntryKnown(completedStore, word, { type: 'manual', knownSource: 'manual' }, '2026-06-25');
    completedStore = VocabularyLearning.maintenancePracticeEntry(completedStore, word, 'recognized', { adjustSchedule: false }, '2026-06-26');
  }
  VocabularyLearning.saveStore(completedStore);
  assert.equal(learn.learnDailyPracticeSummary('greek', '2026-06-26').combined, 1);
  assert.equal(learn.learnDailyPracticeSummary('hebrew', '2026-06-26').combined, 1);
  assert.equal(learn.learnDailyPracticeSummary('greek').combined, 1);
  assert.equal(learn.learnDailyPracticeSummary('hebrew').combined, 1);
  learn.learnState.page = 'home';
  html = learn.renderLearnPage();
  text = renderedText(html);
  assert.match(text, /Practice more Greek/);
  assert.match(text, /Practice more Hebrew/);
  storage.delete(learn.LearnReviewTargetStorageKey);
  storage.delete(VocabularyLearning.STORAGE_KEY);
});

test('daily practice moves from scheduled work into maintenance with shared confidence controls and resume state', () => {
  storage.delete(VocabularyLearning.STORAGE_KEY);
  storage.delete(LearningPractice.SESSION_KEY);
  storage.delete(LearningPractice.PROFILE_KEY);
  storage.set(learn.LearnReviewTargetStorageKey, JSON.stringify({ greek: { preset: 'custom', dailyTarget: 2 }, hebrew: { preset: 'standard', dailyTarget: 30 } }));
  const scheduled = global.state.data.greek[0];
  const maintenance = global.state.data.greek[1];
  VocabularyLearning.saveStore(VocabularyLearning.normalizeStore({ records: {
    [scheduled.id]: { id: scheduled.id, lemma: scheduled.lemma, lang: 'greek', status: 'Reviewing', knownSource: 'review', successCount: 1, intervalDays: 3, due: '2026-06-26', introducedAt: '2026-06-01', history: [] },
    [maintenance.id]: { id: maintenance.id, lemma: maintenance.lemma, lang: 'greek', status: 'Known', knownSource: 'manual', successCount: 6, intervalDays: 14, due: '9999-12-31', introducedAt: '2026-01-01', history: Array(8).fill(null).map((_, index) => ({ date: `2026-05-${String(index + 1).padStart(2, '0')}`, result: 'recognized' })) }
  } }));

  const session = learn.startDailyPractice('greek');
  assert.deepEqual(session.cards.map(card => card.phase), ['scheduled', 'maintenance']);
  let html = learn.renderLearnPage();
  assert.match(renderedText(html), /Greek daily practice Scheduled reviews 1 of 2 words today/);
  assert.match(html, /data-learn-unified-reveal="true"/);

  learn.revealUnifiedPractice();
  html = learn.renderLearnPage();
  for(const confidence of ['again','hard','good','easy']) assert.match(html, new RegExp(`data-learn-unified-confidence="${confidence}"`));
  assert.equal(learn.gradeUnifiedPractice('good'), true);
  const resumed = LearningPractice.activeSession('greek');
  assert.equal(resumed.position, 1);
  assert.equal(LearningPractice.currentCard(resumed).phase, 'maintenance');
  assert.match(renderedText(learn.renderLearnPage()), /Balanced maintenance/);

  learn.revealUnifiedPractice();
  assert.equal(learn.gradeUnifiedPractice('hard'), true);
  assert.match(renderedText(learn.renderLearnPage()), /Greek practice complete.*Scheduled reviews 1.*Maintenance words 1.*Review difficult words again/);
  storage.delete(learn.LearnReviewTargetStorageKey);
});

test('legacy Review Greek links delegate to the resumable Greek LearningPractice route', () => {
  storage.delete(VocabularyLearning.STORAGE_KEY);
  storage.delete(LearningPractice.SESSION_KEY);
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
    assert.equal(learn.learnState.page, 'vocabulary:daily:greek');
    assert.match(text, /Greek practice/);
    assert.match(text, /Start practice/);
    assert.doesNotMatch(text, /Known|Missed/);
  } finally {
    shell.restore();
    storage.delete(learn.LearnReviewTargetStorageKey);
  }
});

test('legacy Review Hebrew links delegate to the resumable Hebrew LearningPractice route', () => {
  storage.delete(VocabularyLearning.STORAGE_KEY);
  storage.delete(LearningPractice.SESSION_KEY);
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
    assert.equal(learn.learnState.page, 'vocabulary:daily:hebrew');
    assert.match(text, /Hebrew practice/);
    assert.match(text, /Start practice/);
    assert.doesNotMatch(text, /Known|Missed/);
  } finally {
    shell.restore();
  }
});

test('legacy mixed review links return to separate Greek and Hebrew daily practice', () => {
  storage.delete(VocabularyLearning.STORAGE_KEY);
  storage.delete(LearningPractice.SESSION_KEY);
  storage.delete(learn.LearnReviewTargetStorageKey);
  let store = VocabularyLearning.normalizeStore();
  store = VocabularyLearning.introduceEntry(store, global.state.data.greek[0], { type: 'frequency', language: 'greek' }, '2026-06-26');
  store = VocabularyLearning.introduceEntry(store, global.state.data.hebrew[1], { type: 'frequency', language: 'hebrew' }, '2026-06-26');
  VocabularyLearning.saveStore(store);

  const shell = wireHomeReviewButtons();
  try {
    shell.buttons.mixed.click();
    const text = renderedText(shell.root.innerHTML);
    assert.equal(learn.learnState.page, 'home');
    assert.match(text, /Greek practice.*Hebrew practice/);
    assert.doesNotMatch(text, /Mixed Review|Known|Missed/);
  } finally {
    shell.restore();
  }
});

test('legacy empty review links retain a calm shared-engine start state', () => {
  storage.delete(VocabularyLearning.STORAGE_KEY);
  storage.delete(LearningPractice.SESSION_KEY);
  storage.delete(learn.LearnReviewTargetStorageKey);

  const shell = wireHomeReviewButtons();
  try {
    shell.buttons.greek.click();
    assert.equal(learn.learnState.page, 'vocabulary:daily:greek');
    let text = renderedText(shell.root.innerHTML);
    assert.match(text, /Greek practice.*No resumable session is available.*Start practice/);

    shell.buttons.hebrew.click();
    assert.equal(learn.learnState.page, 'vocabulary:daily:hebrew');
    text = renderedText(shell.root.innerHTML);
    assert.match(text, /Hebrew practice.*No resumable session is available.*Start practice/);

    shell.buttons.mixed.click();
    assert.equal(learn.learnState.page, 'home');
    text = renderedText(shell.root.innerHTML);
    assert.match(text, /Today’s Practice.*Greek practice.*Hebrew practice/);
  } finally {
    shell.restore();
  }
});

test('Learning preferences persist review targets and practice SRS preference', () => {
  storage.delete(learn.LearnReviewTargetStorageKey);
  storage.delete(learn.LearnPracticeSrsPreferenceStorageKey);
  storage.delete(LearningPractice.MAINTENANCE_SRS_KEY);

  assert.equal(learn.learnReviewTarget('greek'), 30);
  assert.equal(learn.learnReviewTarget('hebrew'), 30);
  assert.equal(learn.learnPracticeSrsPreference(), 'count-srs');

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
  assert.equal(JSON.parse(storage.get(LearningPractice.MAINTENANCE_SRS_KEY)).enabled, true);
  assert.equal(learn.setLearnPracticeSrsPreference('ask'), 'practice-only');
  assert.equal(JSON.parse(storage.get(LearningPractice.MAINTENANCE_SRS_KEY)).enabled, false);
  assert.equal(learn.setLearnPracticeSrsPreference('nope'), 'practice-only');
  assert.equal(learn.learnPracticeSrsPreference(), 'practice-only');

  const html = renderPage('learning-preferences');
  const text = renderedText(html);
  assert.match(text, /Greek Review Target/);
  assert.match(text, /Hebrew Review Target/);
  assert.match(text, /Maintenance Practice/);
  assert.match(text, /Practice updates review schedule/);
});

test('Vocabulary Practice exposes on-demand sources and can practice non-due frequency words', () => {
  storage.delete(VocabularyLearning.STORAGE_KEY);
  storage.delete(StudySets.STORAGE_KEY);
  storage.set(learn.LearnPracticeSrsPreferenceStorageKey, 'practice-only');

  const home = renderPage('vocabulary:practice');
  const homeText = renderedText(home);
  assert.match(homeText, /Vocabulary Practice Drill on demand/);
  ['Frequency', 'Learning Status', 'Saved Words', 'Custom Deck', 'Book', 'Chapter', 'Overdue / Backlog'].forEach(source => assert.match(homeText, new RegExp(source.replace('/', '\\/'))));
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
  assert.equal(VocabularyLearning.getRecord(VocabularyLearning.loadStore(), global.state.data.greek[0]).history.at(-1).confidence, 'good');
  assert.match(renderedText(learn.renderLearnPage()), /Recognized 1/);

  storage.delete(learn.LearnPracticeSrsPreferenceStorageKey);
});

test('Maintenance practice setup exposes safe defaults and all targeting controls', () => {
  storage.delete(VocabularyLearning.STORAGE_KEY);
  LearningPractice.setMaintenancePreference(true);
  learn.learnState.maintenanceSession = null;
  learn.learnState.maintenanceConfig = null;
  const html = renderPage('vocabulary:maintenance:greek');
  const text = renderedText(html);
  assert.match(text, /Greek maintenance practice/);
  assert.match(text, /Vocabulary scope All known vocabulary One selected book/);
  assert.match(text, /Practice order Words needing reinforcement Random order/);
  assert.match(text, /A — Strong \(0\).*B — Familiar \(0\).*C — Developing \(0\).*D — Weak \(0\).*F — Relearning \(0\)/);
  assert.match(text, /Select all grades/);
  assert.match(text, /Session size Number of words Choose a whole number from 1 to 200.*Continue until stopped/);
  assert.match(text, /Maintenance scheduling follows Settings → Learn → Maintenance Practice/);
  assert.match(text, /Session summary 0 words All known Greek vocabulary Grades C, D, and F Words needing reinforcement Review schedule will be updated/);
  assert.match(html, /name="source"[\s\S]*value="all" selected/);
  assert.match(html, /name="order"[\s\S]*value="reinforcement" selected/);
  for(const grade of ['C', 'D', 'F']) assert.match(html, new RegExp(`name="selectedGrades" value="${grade}" checked`));
  for(const grade of ['A', 'B']) assert.doesNotMatch(html, new RegExp(`name="selectedGrades" value="${grade}" checked`));
  assert.match(html, /name="size" value="20" min="1" max="200" step="1" inputmode="numeric"/);
  assert.doesNotMatch(html, /<label>Book/);
  assert.doesNotMatch(html, /name="adjustSchedule"/);
  const setupOrder = ['name="source"', 'name="order"', 'class="learn-maintenance-grades"', 'class="learn-maintenance-size"'].map(marker => html.indexOf(marker));
  assert.deepEqual(setupOrder, [...setupOrder].sort((a, b) => a - b));
  const source = fs.readFileSync('src/features/learn/index.js', 'utf8');
  const styles = fs.readFileSync('styles.css', 'utf8');
  assert.match(source, /function renderMaintenanceSetup\(language\)\{\s*ensureLearnManifest\(language\)/);
  assert.match(source, /fetch\(`\/data\/\$\{language\}\/manifest\.json`\)/);
  assert.match(styles, /\.learn-maintenance-grade-options\s*\{[^}]*flex-wrap:wrap/);
  assert.match(styles, /@media \(max-width: 480px\)[\s\S]*\.learn-maintenance-setup[\s\S]*grid-template-columns:1fr/);
});

test('selected-book scope conditionally shows the language-specific book list and resets invalid books', () => {
  learn.learnState.maintenanceSession = null;
  learn.learnState.maintenanceConfig = {
    language: 'greek',
    source: 'book',
    order: 'random',
    selectedGrades: ['A'],
    size: '7',
    unlimited: false,
    adjustSchedule: false,
    bookId: 'matthew'
  };
  learn.learnState.progressCache['book:greek:matthew'] = { overall: { vocabulary: [] } };
  let html = renderPage('vocabulary:maintenance:greek');
  assert.match(html, /<label>Book/);
  assert.equal((html.match(/<option value="/g) || []).length, 27 + 4);
  assert.match(renderedText(html), /Matthew.*Revelation/);
  assert.match(html, /name="order"[\s\S]*value="random" selected/);

  learn.learnState.maintenanceConfig = { ...learn.learnState.maintenanceConfig, language: 'greek', bookId: 'revelation' };
  learn.learnState.progressCache['book:hebrew:genesis'] = { overall: { vocabulary: [] } };
  html = renderPage('vocabulary:maintenance:hebrew');
  assert.match(html, /<label>Book/);
  assert.match(html, /name="source"[\s\S]*value="book" selected/);
  assert.equal(learn.learnState.maintenanceConfig.language, 'hebrew');
  assert.equal(learn.learnState.maintenanceConfig.bookId, 'genesis');
  assert.equal(learn.learnBookList('hebrew').length, 39);
});

test('maintenance session size validation rejects every invalid finite value', () => {
  for(const value of ['0', '-1', '1.5', 'words', '', '201']){
    const parsed = learn.parseMaintenanceSessionSize(value, false);
    assert.equal(parsed.valid, false, value);
    assert.match(parsed.error, /whole number|from 1 to 200/);
  }
  for(const value of ['1', '7', '15', '20', '37', '75', '200']){
    assert.deepEqual(learn.parseMaintenanceSessionSize(value, false), { valid: true, value: Number(value) });
  }
  assert.deepEqual(learn.parseMaintenanceSessionSize('', true), { valid: true, value: 'unlimited' });
  assert.equal(learn.LearnMaintenanceSessionSizeMax, 200);
});

test('Select all grades updates the setup and small pools are explained before Start', () => {
  storage.delete(VocabularyLearning.STORAGE_KEY);
  const word = global.state.data.greek[0];
  let store = VocabularyLearning.markEntryKnown(
    VocabularyLearning.normalizeStore(),
    word,
    { type: 'manual', knownSource: 'manual' },
    '2026-06-20'
  );
  store = VocabularyLearning.maintenancePracticeEntry(store, word, 'recognized', { adjustSchedule: false }, '2026-06-21');
  VocabularyLearning.saveStore(store);
  learn.learnState.maintenanceSession = null;
  learn.learnState.maintenanceConfig = {
    language: 'greek',
    source: 'all',
    order: 'reinforcement',
    selectedGrades: ['C'],
    size: '20',
    unlimited: false,
    adjustSchedule: false,
    bookId: 'matthew'
  };
  let html = renderPage('vocabulary:maintenance:greek');
  assert.match(renderedText(html), /C — Developing \(1\)/);
  assert.match(renderedText(html), /1 eligible word is available, so this session will contain 1 word/);
  assert.match(html, />Start maintenance practice</);

  assert.deepEqual(learn.selectAllLearnMaintenanceGrades('greek'), ['A', 'B', 'C', 'D', 'F']);
  html = learn.renderLearnPage();
  for(const grade of ['A', 'B', 'C', 'D', 'F']){
    assert.match(html, new RegExp(`name="selectedGrades" value="${grade}" checked`));
  }
});

test('invalid setup states render accessible inline guidance and prevent Start', () => {
  learn.learnState.maintenanceSession = null;
  learn.learnState.maintenanceConfig = {
    language: 'greek',
    source: 'all',
    order: 'reinforcement',
    selectedGrades: [],
    size: '0',
    unlimited: false,
    adjustSchedule: false,
    bookId: 'matthew'
  };
  let html = renderPage('vocabulary:maintenance:greek');
  assert.match(html, /role="status" aria-live="polite"/);
  assert.match(renderedText(html), /Select at least one mastery grade/);
  assert.match(html, /type="submit" disabled aria-disabled="true" aria-describedby="learnMaintenanceError"/);

  learn.learnState.maintenanceConfig = { ...learn.learnState.maintenanceConfig, selectedGrades: ['C'], size: '1.5' };
  html = learn.renderLearnPage();
  assert.match(renderedText(html), /Session size must be a whole number from 1 to 200/);
  assert.match(html, /type="submit" disabled aria-disabled="true"/);
});

test('maintenance construction receives an immutable explicit configuration and ignores stale books for all vocabulary', () => {
  storage.delete(VocabularyLearning.STORAGE_KEY);
  const records = {};
  global.state.data.greek.forEach(word => {
    records[word.id] = {
      id: word.id,
      lemma: word.lemma,
      lang: 'greek',
      status: 'Known',
      knownSource: 'manual',
      due: '9999-12-31',
      history: [{ date: '2026-06-20', result: 'recognized' }]
    };
  });
  VocabularyLearning.saveStore(VocabularyLearning.normalizeStore({ records }));
  const before = JSON.stringify(VocabularyLearning.loadStore());
  const session = learn.startLearnMaintenanceSession({
    language: 'greek',
    source: 'all',
    bookId: 'not-a-book',
    order: 'reinforcement',
    selectedGrades: ['C'],
    size: '1',
    unlimited: false
  });
  assert.ok(session);
  assert.deepEqual(session.configuration, {
    language: 'greek',
    source: 'all',
    bookId: null,
    order: 'reinforcement',
    selectedGrades: ['C'],
    size: 1,
    unlimited: false
  });
  assert.equal(Object.isFrozen(session.configuration), true);
  assert.equal(Object.isFrozen(session.configuration.selectedGrades), true);
  assert.equal(session.entries.length, 1);
  assert.equal(JSON.stringify(VocabularyLearning.loadStore()), before);
});

test('selected-book sessions use the cached occurrence vocabulary without changing source or grades', () => {
  storage.delete(VocabularyLearning.STORAGE_KEY);
  const inBook = global.state.data.greek[0];
  const outBook = global.state.data.greek[1];
  const records = Object.fromEntries([inBook, outBook].map(word => [word.id, {
    id: word.id,
    lemma: word.lemma,
    lang: 'greek',
    status: 'Known',
    knownSource: 'manual',
    due: '9999-12-31',
    history: [{ date: '2026-06-20', result: 'recognized' }]
  }]));
  VocabularyLearning.saveStore(VocabularyLearning.normalizeStore({ records }));
  learn.learnState.progressCache['book:greek:matthew'] = { overall: { vocabulary: [{ entry: inBook }] } };
  const session = learn.startLearnMaintenanceSession({
    language: 'greek',
    source: 'book',
    bookId: 'matthew',
    order: 'random',
    selectedGrades: ['C'],
    size: '20',
    unlimited: false,
    adjustSchedule: false,
    random: () => 0
  });
  assert.deepEqual(session.entries.map(item => item.id), [inBook.id]);
  assert.equal(session.configuration.source, 'book');
  assert.equal(session.configuration.bookId, 'matthew');
  assert.equal(session.configuration.order, 'random');
  assert.deepEqual(session.configuration.selectedGrades, ['C']);
  assert.equal(session.limitedByPool, true);
});

test('maintenance setup blocks empty grades and supports bounded continue-until-stopped sessions', () => {
  storage.delete(VocabularyLearning.STORAGE_KEY);
  const word = global.state.data.greek[0];
  VocabularyLearning.saveStore(VocabularyLearning.normalizeStore({ records: {
    [word.id]: {
      id: word.id,
      lemma: word.lemma,
      lang: 'greek',
      status: 'Known',
      knownSource: 'manual',
      due: '9999-12-31',
      history: [{ date: '2026-06-20', result: 'recognized' }]
    }
  } }));
  assert.equal(learn.startLearnMaintenanceSession({
    language: 'greek',
    source: 'all',
    order: 'reinforcement',
    selectedGrades: [],
    size: '20',
    unlimited: false
  }), null);
  assert.match(learn.learnState.maintenanceError, /Select at least one mastery grade/);
  const session = learn.startLearnMaintenanceSession({
    language: 'greek',
    source: 'all',
    order: 'reinforcement',
    selectedGrades: ['C'],
    size: '',
    unlimited: true,
    adjustSchedule: false
  });
  assert.ok(session);
  assert.equal(session.size, 'unlimited');
  assert.equal(session.entries.length, 1);
  for(let index = 0; index < 3; index += 1){
    learn.learnState.maintenanceSession.revealed = true;
    learn.gradeLearnMaintenance('recognized');
  }
  assert.equal(session.index, 3);
  assert.equal(session.entries.length, 1);
});

test('On-demand practice can count toward SRS through the preference', () => {
  storage.delete(VocabularyLearning.STORAGE_KEY);
  LearningPractice.setMaintenancePreference(true);

  renderPage('vocabulary:practice:frequency:greek:25');
  learn.revealLearnPractice();
  learn.gradeLearnPractice('recognized');

  const record = VocabularyLearning.getRecord(VocabularyLearning.loadStore(), global.state.data.greek[0]);
  assert.equal(record.successCount, 1);
  assert.equal(record.due, '2026-06-29');
  storage.delete(learn.LearnPracticeSrsPreferenceStorageKey);
});

test('global maintenance Off preserves schedule but still records confidence evidence', () => {
  storage.delete(VocabularyLearning.STORAGE_KEY);
  LearningPractice.setMaintenancePreference(false);

  renderPage('vocabulary:practice:frequency:hebrew:60');
  learn.revealLearnPractice();
  learn.gradeLearnPractice('missed');
  const record = VocabularyLearning.getRecord(VocabularyLearning.loadStore(), global.state.data.hebrew[1]);
  assert.equal(record.successCount, 0);
  assert.equal(record.intervalDays, 0);
  assert.equal(record.history.at(-1).confidence, 'again');
  assert.equal(record.history.at(-1).scheduleUpdated, false);
  LearningPractice.setMaintenancePreference(true);
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
  for(const confidence of ['Again','Hard','Good','Easy']) assert.match(html, new RegExp(confidence));

  learn.gradeLearnReview('greek', 'lemma:greek:logos', 'good');
  let record = VocabularyLearning.getRecord(VocabularyLearning.loadStore(), global.state.data.greek[0]);
  assert.equal(record.successCount, 1);
  assert.equal(record.due, '2026-06-29');
  assert.match(renderedText(learn.renderLearnPage()), /Last Review logos: Reviewing\. Next review: 2026-06-29\. Interval: 3 days\./);

  learn.gradeLearnReview('greek', 'lemma:greek:logos', 'again');
  record = VocabularyLearning.getRecord(VocabularyLearning.loadStore(), global.state.data.greek[0]);
  assert.equal(record.successCount, 0);
  assert.equal(record.due, '2026-06-27');
});

test('Focused word review uses the resumable LearningPractice engine even when the word is not due', () => {
  storage.delete(VocabularyLearning.STORAGE_KEY);
  let store = VocabularyLearning.normalizeStore();
  store = VocabularyLearning.introduceEntry(store, global.state.data.greek[0], { type: 'word-page' }, '2026-06-26');
  store = VocabularyLearning.reviewEntry(store, global.state.data.greek[0], 'recognized', '2026-06-26');
  VocabularyLearning.saveStore(store);

  learn.reviewLearnVocabularyWord('greek', 'lemma:greek:logos');
  const html = learn.renderLearnPage();
  assert.equal(learn.learnState.page, 'vocabulary:daily:greek');
  assert.match(renderedText(html), /Greek daily practice Scheduled reviews 1 of 1 words today/);
  assert.match(renderedText(html), /logos/);
  assert.match(html, /data-learn-unified-reveal="true"/);
  assert.doesNotMatch(html, /Known|Missed/);
});

test('legacy vocabulary practice routes normalize to shared-engine destinations', () => {
  assert.equal(learn.normalizeLegacyLearnPracticePage('vocabulary:maintenance:greek'), 'vocabulary:customize:greek:all-known');
  assert.equal(learn.normalizeLegacyLearnPracticePage('vocabulary:practice:frequency:hebrew:10'), 'vocabulary:customize:hebrew:frequency:10:');
  assert.equal(learn.normalizeLegacyLearnPracticePage('vocabulary:practice:book:greek:romans'), 'vocabulary:customize:greek:book:romans');
  assert.equal(learn.normalizeLegacyLearnPracticePage('vocabulary:practice:study-sets'), 'study-sets');
  assert.equal(learn.normalizeLegacyLearnPracticePage('vocabulary:review:mixed'), 'home');
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

test('Paradigms shell emphasizes Recognition Practice and exposes Parsing Practice', () => {
  const html = renderPage('paradigms');
  assert.match(renderedText(html), /Recognition Practice/);
  assert.match(renderedText(html), /Parsing Practice/);
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

  const parsingPractice = renderPage('paradigms:parsing-drills');
  assert.match(renderedText(parsingPractice), /Parsing Practice.*Greek parsing.*Hebrew parsing/);
  assert.match(parsingPractice, /data-learn-page="parsing:setup:greek"/);
  assert.match(parsingPractice, /data-learn-page="parsing:setup:hebrew"/);

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
