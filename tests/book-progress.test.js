const test = require('node:test');
const assert = require('node:assert/strict');

global.todayISO = () => '2026-06-26';
global.state = {
  data: {
    greek: [
      { id: 'lemma:greek:λόγος', lang: 'greek', lemma: 'λόγος', word: 'λόγος', freq: 330 },
      { id: 'lemma:greek:ἀγάπη', lang: 'greek', lemma: 'ἀγάπη', word: 'ἀγάπη', freq: 116 },
      { id: 'lemma:greek:ἔργον', lang: 'greek', lemma: 'ἔργον', word: 'ἔργον', freq: 169 }
    ]
  }
};
global.getStudyEntries = entries => entries;

const BookProgress = require('../src/core/book-progress');
const VocabularyLearning = require('../src/models/vocabulary-learning');

const chapter = {
  book: 'fixture',
  bookName: 'Fixture',
  chapter: 1,
  verses: [
    { verse: 1, tokens: [
      { surface: 'λόγος', lemma: 'λόγος' },
      { surface: 'λόγος', lemma: 'λόγος' },
      { surface: 'ἀγάπη', lemma: 'ἀγάπη' },
      { surface: 'ἔργον', lemma: 'ἔργον' },
      { surface: 'ἔργον', lemma: 'ἔργον' },
      { surface: 'ἔργον', lemma: 'ἔργον' }
    ] }
  ]
};

test('Book Progress counts known vocabulary against the selected scope denominator', () => {
  let store = VocabularyLearning.introduceEntry(VocabularyLearning.normalizeStore(), global.state.data.greek[0], {}, '2026-06-20');
  store = VocabularyLearning.reviewEntry(store, global.state.data.greek[0], 'recognized', '2026-06-20');
  store = VocabularyLearning.reviewEntry(store, global.state.data.greek[0], 'recognized', '2026-06-21');
  store = VocabularyLearning.reviewEntry(store, global.state.data.greek[0], 'recognized', '2026-06-24');

  const allWords = BookProgress.calculateProgress({ language: 'greek', chapters: [chapter], threshold: 'all', store });
  assert.equal(allWords.known, 1);
  assert.equal(allWords.total, 3);
  assert.equal(allWords.remaining, 2);

  const twoPlus = BookProgress.calculateProgress({ language: 'greek', chapters: [chapter], threshold: '2', store });
  assert.equal(twoPlus.known, 1);
  assert.equal(twoPlus.total, 2);
  assert.equal(twoPlus.remaining, 1);
});

test('Book Progress exposes current Greek and Hebrew milestone labels', () => {
  assert.deepEqual(BookProgress.languageThresholds('greek'), ['25', '10', '5', 'all']);
  assert.deepEqual(BookProgress.languageThresholds('hebrew'), ['60', '30', '10', '5', 'all']);
  assert.equal(BookProgress.frequencyLabel('all'), 'All Words');
  assert.equal(BookProgress.frequencyLabel('10'), '10+');
});
