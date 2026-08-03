const test = require('node:test');
const assert = require('node:assert/strict');

global.todayISO = () => '2026-08-03';
global.VocabularyLearning = require('../src/models/vocabulary-learning');
const { vocabularyBrowseState } = require('../src/features/vocab/index');

const word = { id: 'lemma:greek:logos', lang: 'greek', lemma: 'logos', word: 'logos', freq: 330, due: '2026-08-03', ease: 2.5 };

test('Browse treats transient legacy defaults as New without a schedule or storage write', () => {
  let writes = 0;
  global.activeStorageAdapter = { get: () => null, set: () => { writes += 1; }, remove: () => {} };
  const store = VocabularyLearning.normalizeStore();
  const before = JSON.stringify(store);
  const state = vocabularyBrowseState(word, store, '2026-08-03');
  assert.deepEqual(state, { key: 'new', label: 'New', due: '', dueState: 'not-scheduled', tracked: false });
  assert.equal(JSON.stringify(store), before);
  assert.equal(writes, 0);
  delete global.activeStorageAdapter;
});

test('Browse exposes real Learning and Known records while preserving legitimate schedules', () => {
  let store = VocabularyLearning.introduceEntry(VocabularyLearning.normalizeStore(), word, { type: 'test' }, '2026-08-03');
  let state = vocabularyBrowseState(word, store, '2026-08-03');
  assert.equal(state.key, 'learning');
  assert.equal(state.due, '2026-08-03');
  assert.equal(state.dueState, 'due-today');

  store = VocabularyLearning.markEntryKnown(store, word, { type: 'manual', knownSource: 'manual' }, '2026-08-03');
  state = vocabularyBrowseState(word, store, '2026-08-03');
  assert.equal(state.key, 'known');
  assert.equal(state.due, '');
});
