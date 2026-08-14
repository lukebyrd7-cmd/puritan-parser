const test = require('node:test');
const assert = require('node:assert/strict');

const VocabularyLearning = require('../src/models/vocabulary-learning');

const entries = [
  { id: 'lemma:greek:logos', lang: 'greek', lemma: 'logos', word: 'logos', primaryGloss: 'word', alternateGlosses: ['message'], freq: 330 },
  { id: 'lemma:greek:agape', lang: 'greek', lemma: 'agape', word: 'agape', primaryGloss: 'love', freq: 116 },
  { id: 'lemma:greek:adelphos', lang: 'greek', lemma: 'adelphos', word: 'adelphos', primaryGloss: 'brother', freq: 343 },
  { id: 'lemma:hebrew:ברא', lang: 'hebrew', lemma: 'ברא', word: 'ברא', primaryGloss: 'create', freq: 54 }
];
const greek25 = { type: 'frequency', language: 'greek', threshold: '25', page: 'vocabulary:frequency:greek:25' };

test('frequency path selects the next Not Learned word from the path', () => {
  const store = VocabularyLearning.normalizeStore();
  const next = VocabularyLearning.nextNotLearnedEntry(entries, store, greek25);
  assert.equal(next.lemma, 'adelphos');
  assert.equal(VocabularyLearning.remainingNotLearnedCount(entries, store, greek25), 3);
  assert.equal(VocabularyLearning.nextNotLearnedEntry(entries, store, { type: 'frequency', language: 'hebrew', threshold: '60' }), null);
});

test('learning a word changes it from Not Learned to Learning and advances within the same path', () => {
  let store = VocabularyLearning.normalizeStore();
  const first = VocabularyLearning.nextNotLearnedEntry(entries, store, greek25);
  assert.equal(VocabularyLearning.learningStatus(store, first, '2026-06-26'), 'Not Learned');

  store = VocabularyLearning.introduceEntry(store, first, greek25, '2026-06-26');

  assert.equal(VocabularyLearning.learningStatus(store, first, '2026-06-26'), 'Learning');
  assert.equal(VocabularyLearning.remainingNotLearnedCount(entries, store, greek25), 2);
  assert.equal(VocabularyLearning.nextNotLearnedEntry(entries, store, greek25).lemma, 'logos');
});

test('review page source shows due Learning words', () => {
  let store = VocabularyLearning.normalizeStore();
  store = VocabularyLearning.introduceEntry(store, entries[0], greek25, '2026-06-26');
  store = VocabularyLearning.introduceEntry(store, entries[1], greek25, '2026-06-26');
  store = VocabularyLearning.reviewEntry(store, entries[1], 'recognized', '2026-06-26');

  const due = VocabularyLearning.dueEntries(entries, store, '2026-06-26').map(entry => entry.lemma);
  assert.deepEqual(due, ['logos']);
});

test('Recognized updates review state and Known requires 3 successes with a future due date', () => {
  let store = VocabularyLearning.introduceEntry(VocabularyLearning.normalizeStore(), entries[0], greek25, '2026-06-26');

  store = VocabularyLearning.reviewEntry(store, entries[0], 'recognized', '2026-06-26');
  let record = VocabularyLearning.getRecord(store, entries[0]);
  assert.equal(record.successCount, 1);
  assert.equal(record.intervalDays, 1);
  assert.equal(record.due, '2026-06-27');
  assert.equal(VocabularyLearning.learningStatus(store, entries[0], '2026-06-26'), 'Reviewing');

  store = VocabularyLearning.reviewEntry(store, entries[0], 'recognized', '2026-06-27');
  store = VocabularyLearning.reviewEntry(store, entries[0], 'recognized', '2026-06-30');
  record = VocabularyLearning.getRecord(store, entries[0]);
  assert.equal(record.successCount, 3);
  assert.equal(record.intervalDays, 7);
  assert.equal(record.due, '2026-07-07');
  assert.equal(VocabularyLearning.learningStatus(store, entries[0], '2026-06-30'), 'Known');
  assert.equal(VocabularyLearning.learningStatus(store, entries[0], '2026-07-07'), 'Reviewing');
});

test('learning status details provide transparent SRS labels and safe fallbacks', () => {
  let store = VocabularyLearning.normalizeStore();
  assert.equal(VocabularyLearning.learningStatusDetails(store, entries[0], '2026-06-26').label, 'Not Learned');
  assert.match(VocabularyLearning.learningStatusDetails(store, entries[0], '2026-06-26').explanation, /New word/);

  store = VocabularyLearning.introduceEntry(store, entries[0], greek25, '2026-06-26');
  let details = VocabularyLearning.learningStatusDetails(store, entries[0], '2026-06-26');
  assert.equal(details.label, 'Learning');
  assert.equal(details.nextReviewLabel, 'Due today');
  assert.equal(details.intervalLabel, 'Not scheduled');

  store = VocabularyLearning.reviewEntry(store, entries[0], 'recognized', '2026-06-26');
  details = VocabularyLearning.learningStatusDetails(store, entries[0], '2026-06-26');
  assert.equal(details.label, 'Reviewing');
  assert.equal(details.nextReviewLabel, '2026-06-27');
  assert.equal(details.intervalLabel, '1 day');
  assert.equal(details.successfulReviews, 1);
  assert.equal(details.totalReviews, 1);
  assert.match(details.historySummary, /1 reviews: 1 recognized, 0 missed/);

  store = VocabularyLearning.reviewEntry(store, entries[0], 'recognized', '2026-06-27');
  store = VocabularyLearning.reviewEntry(store, entries[0], 'recognized', '2026-06-30');
  details = VocabularyLearning.learningStatusDetails(store, entries[0], '2026-06-30');
  assert.equal(details.label, 'Known');
  assert.equal(details.intervalLabel, '7 days');

  const legacy = VocabularyLearning.normalizeStore({
    records: {
      'lemma:greek:legacy': { id: 'lemma:greek:legacy', lang: 'greek', lemma: 'legacy', status: 'Known', due: '9999-12-31' }
    }
  });
  details = VocabularyLearning.learningStatusDetails(legacy, { id: 'lemma:greek:legacy', lang: 'greek', lemma: 'legacy' }, '2026-06-26');
  assert.equal(details.label, 'Known');
  assert.equal(details.historySummary, 'No reviews yet.');
});

test('self-reported known is represented without creating due backlog', () => {
  const store = VocabularyLearning.normalizeStore({
    records: {
      'lemma:greek:logos': {
        id: 'lemma:greek:logos',
        lang: 'greek',
        lemma: 'logos',
        status: 'Known by Self-Report',
        knownSource: 'self_reported',
        due: '9999-12-31',
        history: []
      }
    }
  });
  const details = VocabularyLearning.learningStatusDetails(store, entries[0], '2026-06-26');
  assert.equal(details.label, 'Known by Self-Report');
  assert.match(details.explanation, /sampled gradually/);
  assert.deepEqual(VocabularyLearning.dueEntries(entries, store, '2026-06-26'), []);
});

test('legacy manual Known scheduler streak is not presented as review history', () => {
  const legacy = VocabularyLearning.normalizeStore({ records: {
    'lemma:greek:logos': {
      ...entries[0],
      status: 'Known',
      knownSource: 'manual',
      successCount: 3,
      intervalDays: 0,
      due: '9999-12-31',
      history: [{ date: '2026-06-20', result: 'marked-known' }]
    }
  } });
  const details = VocabularyLearning.learningStatusDetails(legacy, entries[0], '2026-06-26');
  assert.deepEqual({ successful: details.successfulReviews, total: details.totalReviews, history: details.historySummary }, {
    successful: 0,
    total: 0,
    history: 'No reviews yet.'
  });
  assert.equal(details.schedulingSuccessStreak, 3);
  assert.equal(details.scheduled, false);
});

test('manual Known and Return to Learning do not fabricate or erase review history', () => {
  let store = VocabularyLearning.reviewEntry(VocabularyLearning.normalizeStore(), entries[0], 'recognized', '2026-06-20');
  store = VocabularyLearning.markEntryKnown(store, entries[0], { type: 'word-page' }, '2026-06-21');
  let record = VocabularyLearning.getRecord(store, entries[0]);
  assert.equal(record.successCount, 1);
  assert.equal(record.intervalDays, 0);
  assert.equal(VocabularyLearning.reviewStatistics(record).total, 1);
  assert.equal(record.due, '9999-12-31');
  assert.equal(VocabularyLearning.learningStatusDetails(store, entries[0], '2026-06-21').intervalLabel, 'Not scheduled');
  store = VocabularyLearning.introduceEntry(store, entries[0], { type: 'word-page' }, '2026-06-22');
  record = VocabularyLearning.getRecord(store, entries[0]);
  assert.equal(record.status, 'Learning');
  assert.equal(record.successCount, 0);
  assert.equal(record.intervalDays, 0);
  assert.equal(record.due, '2026-06-22');
  assert.equal(VocabularyLearning.reviewStatistics(record).total, 1);
  assert.equal(VocabularyLearning.learningStatus(store, entries[0], '2026-06-22'), 'Learning');
});

test('review statistics centralize confidence and result event semantics', () => {
  const stats = VocabularyLearning.reviewStatistics({ history: [
    { confidence: 'again' }, { confidence: 'hard' }, { confidence: 'good' }, { confidence: 'easy' },
    { result: 'recognized' }, { result: 'marked-known' }
  ] });
  assert.equal(stats.total, 5);
  assert.equal(stats.recognized, 4);
  assert.equal(stats.missed, 1);
  assert.deepEqual(stats.ratings, { again: 1, hard: 1, good: 1, easy: 1 });
});

test('Missed updates review state by returning the word to Learning sooner', () => {
  let store = VocabularyLearning.introduceEntry(VocabularyLearning.normalizeStore(), entries[0], greek25, '2026-06-26');
  store = VocabularyLearning.reviewEntry(store, entries[0], 'recognized', '2026-06-26');
  store = VocabularyLearning.reviewEntry(store, entries[0], 'missed', '2026-06-27');

  const record = VocabularyLearning.getRecord(store, entries[0]);
  assert.equal(record.status, 'Learning');
  assert.equal(record.successCount, 0);
  assert.equal(record.intervalDays, 1);
  assert.equal(record.due, '2026-06-28');
});

test('Mark Path as Known marks only Not Learned path entries without due reviews', () => {
  let store = VocabularyLearning.introduceEntry(VocabularyLearning.normalizeStore(), entries[0], greek25, '2026-06-26');
  const result = VocabularyLearning.markPathKnown(entries, store, greek25, '2026-06-26');
  store = result.store;

  assert.equal(result.count, 2);
  assert.equal(VocabularyLearning.learningStatus(store, entries[0], '2026-06-26'), 'Learning');
  assert.equal(VocabularyLearning.learningStatus(store, entries[1], '2026-06-26'), 'Known');
  assert.equal(VocabularyLearning.learningStatus(store, entries[2], '2026-06-26'), 'Known');
  assert.equal(VocabularyLearning.learningStatus(store, entries[3], '2026-06-26'), 'Not Learned');
  assert.deepEqual(VocabularyLearning.dueEntries(entries, store, '2026-06-26').map(entry => entry.lemma), ['logos']);

  const marked = VocabularyLearning.getRecord(store, entries[1]);
  assert.equal(marked.due, '9999-12-31');
  assert.equal(marked.history.at(-1).result, 'marked-known');
});

test('localStorage persistence uses one global vocabulary learning collection without decks', () => {
  const saved = new Map();
  global.localStorage = {
    getItem: key => saved.get(key) || null,
    setItem: (key, value) => saved.set(key, value),
    removeItem: key => saved.delete(key)
  };

  VocabularyLearning.saveStore(VocabularyLearning.introduceEntry(VocabularyLearning.normalizeStore(), entries[0], greek25, '2026-06-26'));
  const loaded = VocabularyLearning.loadStore();

  assert.ok(loaded.records['lemma:greek:logos']);
  assert.equal(loaded.records['lemma:greek:logos'].introducedBy.page, 'vocabulary:frequency:greek:25');
  assert.equal(Object.prototype.hasOwnProperty.call(loaded, 'decks'), false);
  assert.equal(saved.has(VocabularyLearning.STORAGE_KEY), true);

  delete global.localStorage;
});
