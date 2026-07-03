const test = require('node:test');
const assert = require('node:assert/strict');

const Onboarding = require('../src/models/onboarding');
const VocabularyLearning = require('../src/models/vocabulary-learning');

const entries = [
  { id: 'lemma:greek:logos', lang: 'greek', lemma: 'logos', word: 'logos', primaryGloss: 'word', freq: 330 },
  { id: 'lemma:greek:agape', lang: 'greek', lemma: 'agape', word: 'agape', primaryGloss: 'love', freq: 116 },
  { id: 'lemma:greek:rare', lang: 'greek', lemma: 'rare', word: 'rare', primaryGloss: 'rare', freq: 7 },
  { id: 'lemma:hebrew:אמר', lang: 'hebrew', lemma: 'אמר', word: 'אמר', primaryGloss: 'say', freq: 5300 },
  { id: 'lemma:hebrew:ברא', lang: 'hebrew', lemma: 'ברא', word: 'ברא', primaryGloss: 'create', freq: 54 },
  { id: 'lemma:hebrew:rare', lang: 'hebrew', lemma: 'rare', word: 'rare', primaryGloss: 'rare', freq: 12 }
];

function installStorage(items = []) {
  const storage = new Map(items);
  global.localStorage = {
    getItem: key => storage.get(key) || null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: key => storage.delete(key)
  };
  return storage;
}

test('onboarding profile normalizes safe defaults and separate language survey data', () => {
  const profile = Onboarding.normalizeProfile({
    selectedLanguage: 'both',
    goal: 'maintain',
    greek: {
      surveyChoice: 'yes',
      proficiency: 'first-year',
      vocabBand: '30',
      familiarGrammar: ['noun-cases', 'participles', 'not-a-topic']
    },
    hebrew: {
      surveyChoice: 'yes',
      proficiency: 'narrative-with-help',
      vocabBand: '50',
      familiarGrammar: ['qal-verbs', 'wayyiqtol', 'noun-cases']
    }
  });

  assert.deepEqual(profile.languages, ['greek', 'hebrew']);
  assert.equal(profile.goal, 'maintain');
  assert.deepEqual(profile.greek.familiarGrammar, ['noun-cases', 'participles']);
  assert.deepEqual(profile.hebrew.familiarGrammar, ['qal-verbs', 'wayyiqtol']);
});

test('first-run onboarding is skipped for existing users with local data', () => {
  const storage = installStorage();

  assert.equal(Onboarding.shouldShowOnboarding(), true);
  storage.set(Onboarding.COMPLETED_KEY, 'true');
  assert.equal(Onboarding.shouldShowOnboarding(), false);

  storage.delete(Onboarding.COMPLETED_KEY);
  storage.set('pp_vocab_learning', JSON.stringify({
    records: {
      'lemma:greek:logos': { id: 'lemma:greek:logos', lang: 'greek', lemma: 'logos', status: 'Learning', due: '2026-07-03' }
    }
  }));
  assert.equal(Onboarding.shouldShowOnboarding(), false);

  delete global.localStorage;
});

test('corrupt onboarding profile storage falls back without crashing', () => {
  installStorage([[Onboarding.PROFILE_KEY, '{bad json']]);

  const profile = Onboarding.loadProfile();
  assert.equal(profile.selectedLanguage, 'greek');
  assert.deepEqual(profile.languages, ['greek']);
  assert.equal(profile.greek.surveyChoice, 'skip');

  delete global.localStorage;
});

test('self-reported vocabulary seeding marks only matching not-learned words and creates no due reviews', () => {
  let store = VocabularyLearning.normalizeStore();
  store = VocabularyLearning.introduceEntry(store, entries[0], { type: 'frequency', language: 'greek' }, '2026-07-03');

  const result = Onboarding.seedSelfReportedVocabulary(entries, store, 'greek', '30', VocabularyLearning, '2026-07-03');
  store = result.store;

  assert.equal(result.count, 1);
  assert.equal(VocabularyLearning.learningStatus(store, entries[0], '2026-07-03'), 'Learning');
  assert.equal(VocabularyLearning.learningStatus(store, entries[1], '2026-07-03'), 'Known by Self-Report');
  assert.equal(VocabularyLearning.learningStatus(store, entries[2], '2026-07-03'), 'Not Learned');

  const marked = VocabularyLearning.getRecord(store, entries[1]);
  assert.equal(marked.knownSource, VocabularyLearning.KNOWN_SOURCES.SELF_REPORTED);
  assert.equal(marked.due, '9999-12-31');
  assert.deepEqual(VocabularyLearning.dueEntries(entries, store, '2026-07-03').map(entry => entry.lemma), ['logos']);
});

test('none and missing-frequency bands do not seed vocabulary', () => {
  const store = VocabularyLearning.normalizeStore();
  const none = Onboarding.seedSelfReportedVocabulary(entries, store, 'hebrew', 'none', VocabularyLearning, '2026-07-03');
  assert.equal(none.count, 0);
  assert.deepEqual(VocabularyLearning.dueEntries(entries, none.store, '2026-07-03'), []);

  const missingFrequency = Onboarding.seedSelfReportedVocabulary([{ id: 'lemma:hebrew:x', lang: 'hebrew', lemma: 'x' }], store, 'hebrew', '50', VocabularyLearning, '2026-07-03');
  assert.equal(missingFrequency.count, 0);

  const hebrew = Onboarding.seedSelfReportedVocabulary(entries, store, 'hebrew', '50', VocabularyLearning, '2026-07-03');
  assert.equal(hebrew.count, 2);
  assert.equal(VocabularyLearning.learningStatus(hebrew.store, entries[3], '2026-07-03'), 'Known by Self-Report');
  assert.equal(VocabularyLearning.learningStatus(hebrew.store, entries[5], '2026-07-03'), 'Not Learned');
});

test('Start Here recommendations adapt to selected language and seed profile', () => {
  const greek = Onboarding.defaultStartHere(Onboarding.normalizeProfile({
    selectedLanguage: 'greek',
    goal: 'read-greek'
  }), { greek: { band: '30', count: 2 } });
  assert.match(greek[0].label, /Review Greek/);
  assert.match(greek[1].label, /1 John 1/);

  const hebrew = Onboarding.defaultStartHere(Onboarding.normalizeProfile({
    selectedLanguage: 'hebrew',
    goal: 'read-hebrew'
  }), { hebrew: { band: 'none', count: 0 } });
  assert.match(hebrew[0].label, /Begin Hebrew frequency vocabulary/);
  assert.match(hebrew[1].label, /Genesis 1/);
});
