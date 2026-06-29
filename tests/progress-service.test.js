const test = require('node:test');
const assert = require('node:assert/strict');

global.todayISO = () => '2026-06-29';
global.getStudyEntries = entries => entries;
global.escHtml = value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const storage = new Map();
global.activeStorageAdapter = {
  get: key => storage.get(key) || null,
  set: (key, value) => storage.set(key, value),
  remove: key => storage.delete(key)
};
global.state = {
  data: {
    greek: [
      { id: 'lemma:greek:logos', lang: 'greek', lemma: 'logos', word: 'logos', freq: 330 },
      { id: 'lemma:greek:agape', lang: 'greek', lemma: 'agape', word: 'agape', freq: 116 }
    ],
    hebrew: [
      { id: 'lemma:hebrew:אמר', lang: 'hebrew', lemma: 'אמר', word: 'אמר', freq: 5300 }
    ]
  }
};

const VocabularyLearning = require('../src/models/vocabulary-learning');
global.VocabularyLearning = VocabularyLearning;
const ProgressService = require('../src/core/progress-service');
global.ProgressService = ProgressService;
const ProgressView = require('../src/features/progress/index');

function resetStorage(){
  storage.clear();
}

test('Progress service calculates vocabulary status from existing learning data', () => {
  resetStorage();
  let store = VocabularyLearning.normalizeStore();
  store = VocabularyLearning.introduceEntry(store, global.state.data.greek[0], { type: 'frequency' }, '2026-06-20');
  store = VocabularyLearning.reviewEntry(store, global.state.data.greek[0], 'recognized', '2026-06-20');
  store = VocabularyLearning.reviewEntry(store, global.state.data.greek[0], 'recognized', '2026-06-21');
  store = VocabularyLearning.reviewEntry(store, global.state.data.greek[0], 'recognized', '2026-06-24');
  store = VocabularyLearning.introduceEntry(store, global.state.data.hebrew[0], { type: 'frequency' }, '2026-06-29');

  const progress = ProgressService.vocabularyProgress(global.state.data, store, '2026-06-29');
  assert.equal(progress.known, 1);
  assert.equal(progress.learning, 1);
  assert.equal(progress.dueToday, 1);
  assert.equal(progress.byLanguage.greek.known, 1);
  assert.equal(progress.byLanguage.hebrew.learning, 1);
});

test('Progress recommendations are practical and data-derived', () => {
  const recommendations = ProgressService.recommendationCandidates({
    vocabulary: { byLanguage: { greek: { dueToday: 12 }, hebrew: { dueToday: 0 } } },
    readiness: {
      allBooks: [
        {
          language: 'greek',
          book: { name: 'Philippians', chapters: [1, 2, 3, 4] },
          remaining: 8,
          frequency: [{ threshold: '25', label: '25+', remaining: 7, book: { name: 'Philippians' } }]
        },
        { language: 'greek', book: { name: 'Romans', chapters: Array.from({ length: 16 }, (_, index) => index + 1) }, remaining: 2, frequency: [] }
      ]
    },
    recognition: { lastHebrewSession: '2026-06-20' }
  }, '2026-06-29');

  assert.ok(recommendations.includes('You have 12 Greek vocabulary reviews due.'));
  assert.ok(recommendations.includes('Study 7 more words to unlock Philippians at 25+ readiness.'));
  assert.ok(recommendations.includes('Romans is your closest unfinished major book.'));
  assert.ok(recommendations.includes('You have not practiced Hebrew paradigms in several days.'));
  assert.doesNotMatch(recommendations.join(' '), /streak|badge|trophy|achievement|confetti/i);
});

test('Reading Readiness summaries count ready books and chapters separately from closest goals', () => {
  assert.deepEqual(ProgressService.readinessSummary([
    { total: 12, remaining: 0 },
    { total: 9, remaining: 2 },
    { total: 0, remaining: 0 }
  ]), { ready: 1, total: 2 });
  assert.deepEqual(ProgressService.readinessSummary([]), {
    ready: ProgressService.NOT_TRACKED,
    total: ProgressService.NOT_TRACKED
  });
  assert.equal(ProgressView.formatReadinessSummary({ ready: 2, total: 27 }), '2 / 27');
});

test('Progress statistics display tracked totals and Not yet tracked empty states', () => {
  resetStorage();
  let store = VocabularyLearning.normalizeStore();
  store = VocabularyLearning.introduceEntry(store, global.state.data.greek[0], {}, '2026-06-20');
  store = VocabularyLearning.reviewEntry(store, global.state.data.greek[0], 'recognized', '2026-06-20');
  store = VocabularyLearning.reviewEntry(store, global.state.data.greek[0], 'missed', '2026-06-21');
  VocabularyLearning.saveStore(store);

  const html = ProgressView.renderProgressStatistics(ProgressService.statistics({ store }));
  assert.match(html, /Reviews completed[\s\S]*2/);
  assert.match(html, /Correct recognitions[\s\S]*1/);
  assert.match(html, /Missed recognitions[\s\S]*1/);
  assert.match(html, /Greek sessions[\s\S]*Not yet tracked/);
  assert.match(html, /Word lookups[\s\S]*Not yet tracked/);
});

test('Progress overview renders empty states without fabricated statistics', () => {
  const html = ProgressView.renderProgressOverview({
    vocabulary: { known: 0, learning: 0, dueToday: 0 },
    readiness: {
      closestBooks: [],
      closestChapters: [],
      oldTestament: { books: { ready: 0, total: 39 }, chapters: { ready: 0, total: 929 } },
      newTestament: { books: { ready: 0, total: 27 }, chapters: { ready: 0, total: 260 } }
    },
    recognition: { sessionsCompleted: 0, greek: { completedTargets: 0, totalTargets: 0 }, hebrew: { completedTargets: 0, totalTargets: 0 } },
    recommendations: ['Choose a high-frequency vocabulary path or open the closest Reading Readiness book to decide what to study next.']
  });

  assert.match(html, /Known[\s\S]*0/);
  assert.match(html, /No readiness data yet/);
  assert.match(html, /Closest Books/);
  assert.match(html, /Closest Chapters/);
  assert.match(html, /Old Testament[\s\S]*0 \/ 39[\s\S]*Books Ready: 0 \/ 39[\s\S]*Chapters Ready: 0 \/ 929/);
  assert.match(html, /New Testament[\s\S]*0 \/ 27[\s\S]*Books Ready: 0 \/ 27[\s\S]*Chapters Ready: 0 \/ 260/);
  assert.doesNotMatch(html, /Closest completed books|Closest completed chapters/);
  const readinessSection = html.match(/<section class="progress-section" aria-labelledby="progressReadinessTitle">[\s\S]*?<section class="progress-section" aria-labelledby="progressGrammarTitle">/)?.[0] || '';
  assert.equal((readinessSection.match(/class="progress-metric"/g) || []).length, 4);
  assert.doesNotMatch(readinessSection, /progress-plain-list|<ul|<li>/);
  assert.doesNotMatch(html, /progress-bar|badge|trophy|confetti/i);
});

test('Progress service records completed recognition sessions for shared statistics', () => {
  resetStorage();
  ProgressService.recordRecognitionSession({ targetId: 'greek-verbs', language: 'greek', recognized: 4, missed: 1, total: 5 }, '2026-06-29');

  const progress = ProgressService.recognitionProgress();
  assert.equal(progress.sessionsCompleted, 1);
  assert.equal(progress.greek.sessions, 1);
  assert.equal(progress.totalParadigmsPracticed, 5);

  const stats = ProgressService.statistics();
  assert.equal(stats.grammar.greekSessions, 1);
  assert.equal(stats.grammar.totalParadigmsPracticed, 5);
});
