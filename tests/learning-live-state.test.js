const test = require('node:test');
const assert = require('node:assert/strict');

const storage = new Map();
global.localStorage = {
  getItem: key => storage.get(key) || null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: key => storage.delete(key)
};
global.todayISO = () => '2026-08-14';
global.escHtml = value => String(value || '').replace(/[&<>]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[character]));
global.$ = () => null;
global.$$ = () => [];
global.normalizeAlternateGlosses = value => Array.isArray(value) ? value : [];
global.getDisplayGloss = entry => entry.primaryGloss || entry.gloss || '';
global.getStudyEntries = entries => entries;
global.getStudyEntriesAsync = async entries => entries;

const numericHebrew = {
  id: 'lemma:hebrew:1697', studyEntryType: 'lemma', lang: 'hebrew', lemma: '1697', word: '1697',
  lexicalForm: 'דָּבָר', canonicalForm: 'דָּבָר', primaryGloss: 'speech', alternateGlosses: ['matter'], pos: 'noun', freq: 240
};
const displayCollision = {
  id: 'lemma:hebrew:דָּבָר', studyEntryType: 'lemma', lang: 'hebrew', lemma: 'דָּבָר', word: 'דָּבָר',
  lexicalForm: 'דָּבָר', canonicalForm: 'דָּבָר', primaryGloss: 'word', pos: 'noun', freq: 1440
};
global.state = { dataRevision: 1, prefs: { studyMode: 'lemma' }, data: { greek: [], hebrew: [displayCollision, numericHebrew] } };

const VocabularyLearning = require('../src/models/vocabulary-learning');
const VocabularyMastery = require('../src/core/vocabulary-mastery');
const LearningPractice = require('../src/core/learning-practice');
global.VocabularyLearning = VocabularyLearning;
global.VocabularyMastery = VocabularyMastery;
global.LearningPractice = LearningPractice;

let openedInfo = null;
global.openReaderWordPageFromInfo = info => { openedInfo = info; return true; };
const GlobalSearch = require('../src/features/global-search/index');
const Reader = require('../src/features/reader/index');

function resetLearning(){
  storage.clear();
  VocabularyLearning.invalidateStoreCache();
  openedInfo = null;
}

function rateThroughPersistedSession(confidence){
  let store = VocabularyLearning.normalizeStore();
  store = VocabularyLearning.markEntryKnown(store, numericHebrew, { type: 'test', knownSource: 'manual' }, '2026-08-13');
  store = VocabularyLearning.saveStore(store);
  const profile = { ...LearningPractice.defaultProfile('hebrew'), source: 'all-known', size: 1, selectedGrades: ['C'] };
  let session = LearningPractice.assembleFocusedSession({ language: 'hebrew', profile, entries: [numericHebrew], store, model: VocabularyLearning });
  const card = LearningPractice.currentCard(session);
  session.revealedCardId = card.cardId;
  const transition = LearningPractice.recordAnswer({ session, cardId: card.cardId, entry: numericHebrew, confidence, model: VocabularyLearning, store, maintenanceSrs: true, dateISO: '2026-08-14' });
  assert.equal(transition.accepted, true);
  VocabularyLearning.saveStore(transition.store);
  LearningPractice.saveSession(transition.session, undefined, { bumpRevision: false });
  return transition.event;
}

for(const [confidence, expected] of Object.entries({
  again: { status: 'Learning', interval: 1, due: '2026-08-15', result: 'missed' },
  hard: { status: 'Reviewing', interval: 2, due: '2026-08-16', result: 'recognized' },
  good: { status: 'Reviewing', interval: 3, due: '2026-08-17', result: 'recognized' },
  easy: { status: 'Reviewing', interval: 5, due: '2026-08-19', result: 'recognized' }
})){
  test(`${confidence} persists once and is immediately authoritative on the stable-ID Word Page`, () => {
    resetLearning();
    const event = rateThroughPersistedSession(confidence);
    assert.equal(event.vocabularyId, numericHebrew.id);
    assert.equal(event.language, 'hebrew');
    assert.equal(event.confidence, confidence);
    assert.equal(event.result, expected.result);
    assert.doesNotThrow(() => new Date(event.timestamp).toISOString());

    const result = GlobalSearch.searchGlobalVocabulary({ query: 'speech', language: 'hebrew' });
    const item = result.results.find(candidate => candidate.id === numericHebrew.id);
    assert.ok(item);
    assert.equal(GlobalSearch.openGlobalSearchResult(item), true);
    assert.equal(openedInfo.id, numericHebrew.id);
    assert.equal(Reader.readerVocabularyLearningEntry(openedInfo).id, numericHebrew.id);

    const details = Reader.readerLearningDetailsForInfo(openedInfo);
    assert.equal(details.totalReviews, 1);
    assert.equal(details.ratingCounts[confidence], 1);
    assert.equal(details.lastRating, confidence);
    assert.equal(details.lastReviewed, '2026-08-14');
    assert.match(details.lastReviewedAt, /^2026-\d\d-\d\dT/);
    assert.equal(details.status, expected.status);
    assert.equal(details.intervalDays, expected.interval);
    assert.equal(details.nextReview, expected.due);
    assert.equal(details.successfulReviews, expected.result === 'recognized' ? 1 : 0);
    assert.equal(VocabularyLearning.reviewStatistics(VocabularyLearning.loadStore().records[numericHebrew.id]).events.filter(item => item.eventId === event.eventId).length, 1);

    const html = Reader.renderReaderWordLearning(openedInfo);
    assert.match(html, /All Reviews<\/dt><dd>1<\/dd>/);
    assert.match(html, /Last Review<\/dt><dd>2026-\d\d-\d\d \d\d:\d\d UTC<\/dd>/);
    assert.match(html, new RegExp(`Last Rating<\\/dt><dd>${confidence.replace(/^./, character => character.toUpperCase())}<\\/dd>`));
    assert.match(html, new RegExp(`${confidence.replace(/^./, character => character.toUpperCase())} 1`));

    VocabularyLearning.invalidateStoreCache();
    const reloaded = Reader.readerLearningDetailsForInfo(openedInfo);
    assert.equal(reloaded.totalReviews, 1);
    assert.equal(reloaded.lastRating, confidence);
    assert.equal(reloaded.nextReview, expected.due);
  });
}

test('stable-ID Hebrew Word Pages render a complete New state instead of an empty Learning section', () => {
  resetLearning();
  const info = { id: numericHebrew.id, language: 'hebrew', lemma: numericHebrew.lexicalForm, lexicalForm: numericHebrew.lexicalForm };
  assert.equal(Reader.readerVocabularyLearningEntry(info).id, numericHebrew.id);
  const html = Reader.renderReaderWordLearning(info);
  assert.match(html, /○ New/);
  assert.match(html, /All Reviews<\/dt><dd>0<\/dd>/);
  assert.match(html, /No reviews yet\./);
  assert.match(html, /Add to Learning/);
  assert.doesNotMatch(html, /Not available in vocabulary learning/);
});

test('async completion summary matches the authoritative synchronous result', async () => {
  resetLearning();
  rateThroughPersistedSession('again');
  const store = VocabularyLearning.loadStore();
  const sync = VocabularyMastery.dailyPracticeSummary(store, 'hebrew', '2026-08-14', 30);
  const asyncSummary = await VocabularyMastery.dailyPracticeSummaryAsync(store, 'hebrew', '2026-08-14', 30, { budgetMs: 4 });
  assert.deepEqual({ scheduled: asyncSummary.scheduled, maintenance: asyncSummary.maintenance, combined: asyncSummary.combined, remaining: asyncSummary.remaining },
    { scheduled: sync.scheduled, maintenance: sync.maintenance, combined: sync.combined, remaining: sync.remaining });
});
