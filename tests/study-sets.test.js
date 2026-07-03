const test = require('node:test');
const assert = require('node:assert/strict');

const StudySets = require('../src/models/study-sets');
const VocabularyLearning = require('../src/models/vocabulary-learning');

const entries = [
  { id: 'lemma:greek:logos', lang: 'greek', lemma: 'logos', word: 'logos', primaryGloss: 'word', freq: 330 },
  { id: 'lemma:greek:agape', lang: 'greek', lemma: 'agape', word: 'agape', primaryGloss: 'love', freq: 116 },
  { id: 'lemma:greek:rare', lang: 'greek', lemma: 'rare', word: 'rare', primaryGloss: 'rare', freq: 7 },
  { id: 'lemma:hebrew:אמר', lang: 'hebrew', lemma: 'אמר', word: 'אמר', primaryGloss: 'say', freq: 5300 }
];

function installStorage(){
  const storage = new Map();
  global.localStorage = {
    getItem: key => storage.get(key) || null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: key => storage.delete(key)
  };
  return storage;
}

test('Study Set creation persists small criteria-based records', () => {
  const storage = installStorage();
  const result = StudySets.createStudySet({
    title: 'Quiz',
    language: 'greek',
    type: 'vocabulary',
    criteria: { kind: 'frequency', threshold: '25' }
  });

  assert.equal(result.set.title, 'Quiz');
  assert.equal(result.set.type, 'vocabulary');
  assert.deepEqual(result.set.criteria, { kind: 'frequency', threshold: '25' });
  assert.deepEqual(result.set.itemRefs, []);
  assert.equal(JSON.parse(storage.get(StudySets.STORAGE_KEY)).sets.length, 1);

  delete global.localStorage;
});

test('Study Set normalization handles corrupt and unsupported values safely', () => {
  const normalized = StudySets.normalizeSet({
    title: '',
    language: 'latin',
    type: 'deck',
    criteria: { kind: 'frequency', threshold: '-1' }
  });
  assert.equal(normalized.title, 'Untitled Study Set');
  assert.equal(normalized.language, 'greek');
  assert.equal(normalized.type, 'vocabulary');
  assert.deepEqual(normalized.criteria, { kind: 'frequency', threshold: '1' });
});

test('Study Set criteria resolves frequency and status vocabulary without duplicating data', () => {
  let store = VocabularyLearning.normalizeStore();
  store = VocabularyLearning.markEntryKnown(store, entries[0], { type: 'test' }, '2026-07-03');
  store = VocabularyLearning.introduceEntry(store, entries[1], { type: 'test' }, '2026-07-03');

  const frequency = StudySets.normalizeSet({ title: 'Common', language: 'greek', type: 'vocabulary', criteria: { kind: 'frequency', threshold: '25' } });
  assert.deepEqual(StudySets.resolveVocabularyEntries(frequency, entries, VocabularyLearning, store).map(item => item.lemma), ['logos', 'agape']);

  const known = StudySets.normalizeSet({ title: 'Known', language: 'greek', type: 'vocabulary', criteria: { kind: 'known' } });
  assert.deepEqual(StudySets.resolveVocabularyEntries(known, entries, VocabularyLearning, store).map(item => item.lemma), ['logos']);

  const learning = StudySets.normalizeSet({ title: 'Learning', language: 'greek', type: 'vocabulary', criteria: { kind: 'learning' } });
  assert.deepEqual(StudySets.resolveVocabularyEntries(learning, entries, VocabularyLearning, store).map(item => item.lemma), ['agape']);
});
