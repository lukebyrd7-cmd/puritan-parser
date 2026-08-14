const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const vm = require('node:vm');

const CalendarDate = require('../src/core/calendar-date');
const VocabularyLearning = require('../src/models/vocabulary-learning');
const VocabularyMastery = require('../src/core/vocabulary-mastery');
const LearningPractice = require('../src/core/learning-practice');

const DAY = '2026-08-14';
const RATINGS = ['again', 'hard', 'good', 'easy'];

function seededRandom(seed = 0x197197){
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}

test('calendar dates use the learner local day and shift without DST or timezone drift', () => {
  assert.equal(CalendarDate.shiftISODate('2024-02-28', 1), '2024-02-29');
  assert.equal(CalendarDate.shiftISODate('2024-03-09', 1), '2024-03-10');
  assert.equal(CalendarDate.shiftISODate('2024-11-02', 1), '2024-11-03');
  assert.equal(CalendarDate.shiftISODate('2026-01-01', -1), '2025-12-31');
  assert.equal(CalendarDate.parseDateISO('2026-02-30'), null);

  const script = "const d=require('./src/core/calendar-date');process.stdout.write(d.todayISO(0,new Date('2026-08-14T01:30:00Z')))";
  const dateIn = timezone => execFileSync(process.execPath, ['-e', script], {
    cwd: process.cwd(), encoding: 'utf8', env: { ...process.env, TZ: timezone }
  });
  assert.equal(dateIn('America/Los_Angeles'), '2026-08-13');
  assert.equal(dateIn('Pacific/Kiritimati'), '2026-08-14');
});

test('every confidence transition is atomic from New, Learning, Reviewing, Known, and manual Known', () => {
  const startingRecords = {
    New: {},
    Learning: { status: 'Learning', knownSource: 'review', successCount: 0, intervalDays: 0, due: DAY },
    Reviewing: { status: 'Reviewing', knownSource: 'review', successCount: 1, intervalDays: 3, due: DAY },
    Known: { status: 'Known', knownSource: 'review', successCount: 3, intervalDays: 14, due: DAY },
    'manual Known': { status: 'Known', knownSource: 'manual', successCount: 0, intervalDays: 0, due: '9999-12-31' }
  };
  for(const [startingStatus, fields] of Object.entries(startingRecords)){
    for(const rating of RATINGS){
      const id = `lemma:greek:${startingStatus}:${rating}`;
      const before = { id, lemma: id, lang: 'greek', history: [], ...fields };
      const transition = LearningPractice.applyConfidence(before, rating, {
        eventId: `${id}:event`, vocabularyId: id, language: 'greek', date: DAY,
        timestamp: `${DAY}T12:00:00.000Z`, practiceType: 'scheduled', scheduleUpdated: true
      });
      const { record, event } = transition;
      assert.equal(record.history.length, 1, `${startingStatus} + ${rating}`);
      assert.equal(record.history[0].eventId, event.eventId);
      assert.equal(event.vocabularyId, id);
      assert.equal(event.confidence, rating);
      assert.equal(event.result, rating === 'again' ? 'missed' : 'recognized');
      assert.equal(record.lastReviewed, DAY);
      assert.match(record.due, /^\d{4}-\d{2}-\d{2}$/);
      assert.ok(record.intervalDays >= 1 && record.intervalDays <= 3650);
      assert.ok(['Learning', 'Reviewing', 'Known'].includes(record.status));
      assert.equal(record.knownSource, 'review');
      assert.equal(event.status, record.status);
      assert.equal(event.intervalDays, record.intervalDays);
      assert.equal(event.due, record.due);
      assert.equal(event.successCount, record.successCount);
      assert.equal(record.status, rating === 'again' ? 'Learning' : record.successCount >= 3 ? 'Known' : 'Reviewing');
    }
  }
});

test('maintenance Off records mastery evidence without partially changing scheduling state', () => {
  const before = {
    id: 'lemma:hebrew:1697', lemma: '1697', lang: 'hebrew', status: 'Known', knownSource: 'manual',
    successCount: 0, intervalDays: 0, due: '9999-12-31', lastReviewed: '', history: []
  };
  for(const rating of RATINGS){
    const { record, event } = LearningPractice.appendEvidenceOnly(before, rating, {
      eventId: `maintenance-${rating}`, vocabularyId: before.id, language: 'hebrew', date: DAY,
      timestamp: `${DAY}T12:00:00.000Z`, practiceType: 'maintenance', scheduleUpdated: false
    });
    for(const field of ['status', 'knownSource', 'successCount', 'intervalDays', 'due', 'lastReviewed']) assert.equal(record[field], before[field]);
    assert.equal(event.scheduleUpdated, false);
    assert.equal(VocabularyLearning.reviewStatistics(record).total, 1);
    assert.equal(VocabularyMastery.masteryGrade(record).attempts, 1);
  }
});

test('seeded 500-identity, 5,000-rating simulation preserves scheduler and counter invariants', () => {
  const random = seededRandom();
  const records = Object.fromEntries(Array.from({ length: 500 }, (_, index) => {
    const language = index % 2 ? 'hebrew' : 'greek';
    const id = `lemma:${language}:audit-${index}`;
    return [id, { id, lemma: `audit-${index}`, lang: language, status: 'Learning', knownSource: 'review', successCount: 0, intervalDays: 0, due: DAY, history: [] }];
  }));
  const ids = Object.keys(records);
  const expectedRatings = Object.fromEntries(ids.map(id => [id, { again: 0, hard: 0, good: 0, easy: 0 }]));

  for(let index = 0; index < 5000; index += 1){
    const id = ids[Math.floor(random() * ids.length)];
    const rating = RATINGS[Math.floor(random() * RATINGS.length)];
    const date = CalendarDate.shiftISODate(DAY, Math.floor(index / 250));
    const previousTotal = VocabularyLearning.reviewStatistics(records[id]).total;
    const { record, event } = LearningPractice.applyConfidence(records[id], rating, {
      eventId: `seeded-${index}`, vocabularyId: id, language: records[id].lang, date,
      timestamp: `${date}T12:00:00.000Z`, practiceType: index % 7 ? 'scheduled' : 'maintenance', scheduleUpdated: true
    });
    records[id] = record;
    expectedRatings[id][rating] += 1;
    const stats = VocabularyLearning.reviewStatistics(record);
    const details = VocabularyLearning.learningStatusDetails({ schemaVersion: 2, records }, id, date);
    const grade = VocabularyMastery.masteryGrade(record, date);
    assert.equal(stats.total, previousTotal + 1);
    assert.equal(stats.events.filter(item => item.eventId === event.eventId).length, 1);
    assert.equal(stats.recognized + stats.missed, stats.total);
    assert.ok(stats.recognized <= stats.total);
    assert.deepEqual(stats.ratings, expectedRatings[id]);
    assert.equal(stats.last.eventId, event.eventId);
    assert.equal(details.totalReviews, stats.total);
    assert.equal(details.successfulReviews, stats.recognized);
    assert.equal(details.lastRating, rating);
    assert.equal(details.status, VocabularyLearning.learningStatusForRecord(record, date));
    assert.ok(['A', 'B', 'C', 'D', 'F'].includes(grade.letter));
    assert.ok(Number.isFinite(grade.evidencePoints));
    assert.ok(Number.isFinite(record.intervalDays));
    assert.ok(CalendarDate.parseDateISO(record.due));
  }
});

test('rapid duplicate submission cannot create a second event or advance twice', () => {
  const entry = { id: 'lemma:greek:λόγος', lang: 'greek', lemma: 'λόγος', primaryGloss: 'word', freq: 330 };
  const store = VocabularyLearning.markEntryKnown(VocabularyLearning.normalizeStore(), entry, { type: 'test' }, DAY);
  const session = LearningPractice.assembleFocusedSession({
    language: 'greek', profile: { ...LearningPractice.defaultProfile('greek'), size: 1 }, entries: [entry], store, model: VocabularyLearning
  });
  const card = LearningPractice.currentCard(session);
  const first = LearningPractice.recordAnswer({ session, cardId: card.cardId, entry, confidence: 'good', model: VocabularyLearning, store, dateISO: DAY });
  const duplicate = LearningPractice.recordAnswer({ session, cardId: card.cardId, entry, confidence: 'good', model: VocabularyLearning, store: first.store, dateISO: DAY });
  assert.equal(first.accepted, true);
  assert.equal(duplicate.accepted, false);
  assert.equal(duplicate.reason, 'duplicate');
  assert.equal(VocabularyLearning.reviewStatistics(duplicate.store.records[entry.id]).total, 1);
  assert.equal(duplicate.session.position, first.session.position);
});

test('export/import surface includes every local profile domain and restores settings without duplicate theme writes', () => {
  const source = fs.readFileSync('src/core/data-loader.js', 'utf8');
  const bootstrapSource = fs.readFileSync('src/bootstrap.js', 'utf8');
  const settingsSource = fs.readFileSync('src/features/settings/index.js', 'utf8');
  assert.match(bootstrapSource, /applyTheme\([^\n]+\{ persist: false \}\)/);
  assert.match(bootstrapSource, /setAccent\([^\n]+\{ persist: false \}\)/);
  assert.match(settingsSource, /applyTheme\([^\n]+\{ persist: false \}\)/);
  const saved = {};
  let preferenceWrites = 0;
  let dashboardWrites = 0;
  const parserCore = { normalizeImportedPayload: payload => [...(payload.greek || []), ...(payload.hebrew || [])], validateVocabItem: () => ({ errors: [] }) };
  const context = {
    console,
    window: { PuritanParserCore: parserCore }, ParserCore: parserCore,
    document: { createElement: () => ({ click(){} }), documentElement: { style: { setProperty(){} } } },
    Blob, URL: { createObjectURL: () => 'blob:test', revokeObjectURL(){} },
    state: { data: { greek: [], hebrew: [] }, dataRevision: 0, prefs: { theme: 'dark', accent: '#123456', cardFontSize: 61 }, dashboard: { streak: 4 } },
    DEFAULTS: { accent: '#4e8f6e' },
    VocabularyLearning: { loadStore: () => ({ records: { greek: true } }), normalizeStore: value => value, saveStore: value => { saved.learning = value; } },
    PuritanStudySets: { loadStore: () => ({ sets: [{ id: 'deck-1' }] }), normalizeStore: value => value, saveStore: value => { saved.decks = value; } },
    LearningPractice: { exportState: () => ({ sessions: { greek: {} } }), importState: value => { saved.practice = value; } },
    PuritanPersonalGlosses: { exportState: () => ({ records: { gloss: true } }), importState: value => { saved.glosses = value; }, vocabularyId: entry => entry.id },
    PuritanSavedVocabulary: { loadStore: () => ({ items: { saved: true } }), normalizeStore: value => value, saveStore: value => { saved.savedVocabulary = value; } },
    PuritanReaderPreferences: { readLocationRecord: () => ({ greek: { book: 'matthew', chapter: 2 } }), importLocation: value => { saved.readerLocation = value; } },
    learnReviewTargets: () => ({ greek: { dailyTarget: 30 }, hebrew: { dailyTarget: 20 } }),
    learnPracticeSrsPreference: () => ({ enabled: false }),
    readStorageJson: () => ({ mode: 'continuous' }), writeStorageJson: (key, value) => { saved[key] = value; },
    createPreferences: value => ({ ...value, studyMode: 'lemma' }), savePrefs: () => { preferenceWrites += 1; },
    applyTheme: (value, options) => { saved.theme = { value, options }; }, setAccent: (value, options) => { saved.accent = { value, options }; },
    createDashboardStats: value => ({ ...value }), saveDashboard: () => { dashboardWrites += 1; },
    saveLearnReviewTargets: value => { saved.targets = value; }, setLearnPracticeSrsPreference: value => { saved.srsPreference = value; },
    ensureSRS: value => value, createWordEntry: value => value, saveVocab(){}, updatePosOptions(){}, updateParsingFilterOptions(){}, renderList(){}, updateDueBadge(){}, toast: (...args) => { saved.toast = args; },
    $: () => ({ textContent: '', classList: { remove(){} } })
  };
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'src/core/data-loader.js' });
  const payload = vm.runInContext("buildExportData('2026-08-14T12:00:00.000Z')", context);
  for(const key of ['greek', 'hebrew', 'vocabularyLearning', 'customDecks', 'learningPractice', 'personalGlosses', 'savedVocabulary', 'preferences', 'dashboard', 'learnReviewTargets', 'practiceSrsPreference', 'readerLocation', 'readerSettings']) assert.ok(Object.hasOwn(payload, key), key);
  return vm.runInContext(`importDataFile({ text: async () => ${JSON.stringify(JSON.stringify(payload))} })`, context).then(() => {
    assert.notDeepEqual(saved.toast, ['Import failed.', 'danger'], JSON.stringify(saved));
    assert.equal(JSON.stringify(saved.savedVocabulary), JSON.stringify(payload.savedVocabulary));
    assert.equal(JSON.stringify(saved.learning), JSON.stringify(payload.vocabularyLearning));
    assert.equal(preferenceWrites, 1);
    assert.equal(dashboardWrites, 1);
    assert.equal(saved.theme.options.persist, false);
    assert.equal(saved.accent.options.persist, false);
    const restored = vm.runInContext('({ prefs: state.prefs, dashboard: state.dashboard })', context);
    assert.equal(restored.prefs.theme, 'dark');
    assert.equal(restored.prefs.cardFontSize, 61);
    assert.equal(restored.dashboard.streak, 4);
  });
});
