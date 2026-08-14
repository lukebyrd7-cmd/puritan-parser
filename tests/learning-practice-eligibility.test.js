const test = require('node:test');
const assert = require('node:assert/strict');

const VocabularyLearning = require('../src/models/vocabulary-learning');
const GlossModel = require('../src/models/gloss');
global.VocabularyMastery = require('../src/core/vocabulary-mastery');
const LearningPractice = require('../src/core/learning-practice');

const greek = (lemma, gloss = 'word', freq = 10) => ({ id: `lemma:greek:${lemma}`, lang: 'greek', lemma, word: lemma, gloss, freq });
const hebrew = (id, form, gloss = '', freq = 10) => ({ id: `lemma:hebrew:${id}`, lang: 'hebrew', lemma: String(id), word: String(id), canonicalForm: form, representativeForm: form, gloss, freq });
const knownStore = entries => VocabularyLearning.normalizeStore({ records: Object.fromEntries(entries.map(entry => [entry.id, { id: entry.id, lemma: entry.lemma, lang: entry.lang, status: 'Known', knownSource: 'manual', successCount: 5, intervalDays: 14, due: '9999-12-31' }])) });

test('central card eligibility resolves Hebrew forms and mapped lexical glosses without exposing numeric ids', () => {
  const entry = hebrew(1004, 'בַּיִת');
  const result = LearningPractice.validateVocabularyCard(entry, 'hebrew', { model: VocabularyLearning, glossMap: { 1004: { primaryGloss: 'house', alternateGlosses: ['home'] } } });
  assert.equal(result.valid, true);
  assert.equal(result.entry.studyForm, 'בַּיִת');
  assert.equal(result.entry.primaryGloss, 'house');
  assert.notEqual(result.entry.studyForm, '1004');
});

test('central card eligibility excludes numeric prompts, missing glosses, malformed records, and wrong languages', () => {
  const fixtures = [
    hebrew(1115, ''),
    hebrew(1116, 'דָּבָר', '(missing gloss)'),
    null,
    greek('λόγος')
  ];
  const result = LearningPractice.filterStudyableEntries(fixtures, 'hebrew', { model: VocabularyLearning });
  assert.equal(result.entries.length, 0);
  assert.equal(result.diagnostics.skipped, 4);
  assert.equal(result.diagnostics.reasons['missing-study-form'], 1);
  assert.equal(result.diagnostics.reasons['missing-gloss'], 1);
});

test('central card eligibility rejects Greek and Hebrew script used as an English gloss', () => {
  for(const [entry, language] of [[greek('ἀκρίς', 'ἀκρίς'), 'greek'], [hebrew(1117, 'דָּבָר', 'דָּבָר'), 'hebrew']]){
    const result = LearningPractice.validateVocabularyCard(entry, language, { model: VocabularyLearning });
    assert.equal(result.valid, false);
    assert.equal(result.reason, 'missing-gloss');
  }
  assert.equal(GlossModel.isLearnerEnglishGloss('word'), true);
});

test('covered proper names remain excluded from ordinary vocabulary practice', () => {
  const entry = { ...greek('Ἀβραάμ', 'Abraham'), ordinaryPracticeEligible: false };
  const result = LearningPractice.validateVocabularyCard(entry, 'greek', { model: VocabularyLearning });
  assert.equal(result.valid, false);
  assert.equal(result.reason, 'practice-excluded');
});

test('finite focused sessions replace invalid cards and preserve the requested size when possible', () => {
  const valid = [greek('λόγος'), greek('ἀγάπη'), greek('θεός'), greek('ἄνθρωπος')];
  const invalid = [greek('1234'), greek('γραφή', '(missing gloss)')];
  const session = LearningPractice.assembleFocusedSession({
    language: 'greek',
    profile: { ...LearningPractice.defaultProfile('greek'), source: 'frequency', sourceId: '1:1', size: 3 },
    entries: [...invalid, ...valid],
    store: knownStore(valid),
    model: VocabularyLearning
  });
  assert.equal(session.cards.length, 3);
  assert.equal(session.diagnostics.skipped, 2);
  assert.equal(session.cards.some(card => /1234/.test(card.vocabularyId)), false);
});

test('profile migration adds safe chapter, status, and New-word defaults while retaining direction values', () => {
  const migrated = LearningPractice.normalizeProfile({ schemaVersion: 1, language: 'hebrew', source: 'book', sourceId: 'genesis', promptDirection: 'mixed' });
  assert.equal(migrated.schemaVersion, 3);
  assert.equal(migrated.passageScope, 'book');
  assert.equal(migrated.chapter, 0);
  assert.deepEqual(migrated.statusFilters, ['known', 'learning']);
  assert.equal(migrated.introduceNewCount, 0);
  assert.equal(migrated.promptDirection, 'mixed');
  assert.equal(migrated.dailyAmountMode, 'goal');
  assert.equal(migrated.dailyAmount, 20);
  assert.equal(LearningPractice.normalizeProfile({ ...migrated, passageScope: 'chapter', chapter: -4 }).chapter, 0);
});

test('controlled New words use highest frequency, remain inside size, and are capped at 25 percent', () => {
  const known = Array.from({ length: 10 }, (_, index) => greek(`known-${index}`, 'known', 10 - index));
  const fresh = [greek('new-low', 'low', 2), greek('new-high', 'high', 200), greek('new-mid', 'mid', 50)];
  const session = LearningPractice.assembleFocusedSession({
    language: 'greek',
    profile: { ...LearningPractice.defaultProfile('greek'), size: 8, introduceNewCount: 5 },
    entries: [...known, ...fresh],
    store: knownStore(known),
    model: VocabularyLearning
  });
  assert.equal(session.cards.length, 8);
  assert.equal(session.introducedWordIds.length, 2);
  assert.deepEqual(session.introducedWordIds, ['lemma:greek:new-high', 'lemma:greek:new-mid']);
  assert.equal(session.cards.filter(card => card.phase === 'new').length, 2);
});

test('revealing or resuming a New card does not change status; first rating changes it once', () => {
  const word = greek('καινός', 'new', 100);
  const store = VocabularyLearning.normalizeStore();
  const session = LearningPractice.assembleFocusedSession({
    language: 'greek',
    profile: { ...LearningPractice.defaultProfile('greek'), size: 4, introduceNewCount: 1 },
    entries: [word], newEntries: [word], store, model: VocabularyLearning
  });
  const revealed = LearningPractice.normalizeSession({ ...session, revealedCardId: session.cards[0].cardId });
  assert.equal(VocabularyLearning.learningStatus(store, word), VocabularyLearning.STATUS.NOT_LEARNED);
  assert.equal(revealed.revealedCardId, session.cards[0].cardId);
  const answer = LearningPractice.recordAnswer({ session: revealed, cardId: session.cards[0].cardId, entry: word, confidence: 'good', store, model: VocabularyLearning });
  assert.equal(answer.accepted, true);
  assert.equal(VocabularyLearning.learningStatus(answer.store, word), VocabularyLearning.STATUS.REVIEWING);
  const duplicate = LearningPractice.recordAnswer({ session: revealed, cardId: session.cards[0].cardId, entry: word, confidence: 'good', store: answer.store, model: VocabularyLearning });
  assert.equal(duplicate.accepted, false);
});

test('reverse and mixed cards preserve their internal compatibility values through resume', () => {
  const words = [greek('λόγος'), greek('ἀγάπη')];
  const reverse = LearningPractice.assembleFocusedSession({ language: 'greek', profile: { ...LearningPractice.defaultProfile('greek'), size: 1, promptDirection: 'reverse' }, entries: words, store: knownStore(words), model: VocabularyLearning });
  assert.equal(reverse.cards[0].direction, 'reverse');
  const mixed = LearningPractice.assembleFocusedSession({ language: 'greek', profile: { ...LearningPractice.defaultProfile('greek'), size: 2, promptDirection: 'mixed' }, entries: words, store: knownStore(words), model: VocabularyLearning });
  assert.equal(LearningPractice.normalizeSession(mixed).promptDirection, 'mixed');
  assert.deepEqual(LearningPractice.normalizeSession(mixed).cards.map(card => card.direction), mixed.cards.map(card => card.direction));
});
