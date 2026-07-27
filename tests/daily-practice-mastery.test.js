const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const VocabularyLearning = require('../src/models/vocabulary-learning');
const VocabularyMastery = require('../src/core/vocabulary-mastery');

const DATE = '2026-07-27';
const entry = (lemma, lang = 'greek', freq = 10) => ({ id: `lemma:${lang}:${lemma}`, lemma, lang, freq });
const events = results => results.map((result, index) => ({ date: `2026-07-${String(10 + index).padStart(2, '0')}`, result }));
function knownRecord(word, results = [], extras = {}){
  return {
    id: word.id,
    lemma: word.lemma,
    lang: word.lang,
    status: 'Known',
    knownSource: 'manual',
    successCount: 3,
    intervalDays: 7,
    due: '9999-12-31',
    introducedAt: '2026-07-01',
    history: events(results),
    ...extras
  };
}
function storeOf(records){
  return VocabularyLearning.normalizeStore({ records: Object.fromEntries(records.map(record => [record.id, record])) });
}

test('mastery grades deterministically classify A through F', () => {
  assert.equal(VocabularyMastery.masteryGrade(knownRecord(entry('a'), Array(8).fill('recognized'))).letter, 'A');
  assert.equal(VocabularyMastery.masteryGrade(knownRecord(entry('b'), ['recognized','recognized','recognized','missed','recognized'])).letter, 'B');
  assert.equal(VocabularyMastery.masteryGrade(knownRecord(entry('c'), ['recognized'])).letter, 'C');
  assert.equal(VocabularyMastery.masteryGrade(knownRecord(entry('d'), ['recognized','recognized','missed','missed'])).letter, 'D');
  assert.equal(VocabularyMastery.masteryGrade(knownRecord(entry('f'), ['missed','missed','missed'])).letter, 'F');
});

test('sparse and legacy known records begin at Developing without invented evidence', () => {
  const grade = VocabularyMastery.masteryGrade(knownRecord(entry('legacy')));
  assert.equal(grade.letter, 'C');
  assert.equal(grade.attempts, 0);
  assert.match(grade.explanation, /Limited recorded recall history/);
});

test('direct normalized-record status checks preserve the existing status rules', () => {
  const word = entry('status-parity');
  const store = storeOf([knownRecord(word, [], {
    successCount: 3,
    intervalDays: 7,
    due: '2026-08-03',
    knownSource: VocabularyLearning.KNOWN_SOURCES.REVIEW
  })]);
  const record = store.records[VocabularyLearning.lemmaId(word)];
  assert.equal(
    VocabularyLearning.learningStatusForRecord(record, DATE),
    VocabularyLearning.learningStatus(store, word, DATE)
  );
});

test('a recent miss lowers strong evidence without permanently forcing relearning', () => {
  const grade = VocabularyMastery.masteryGrade(knownRecord(entry('recent'), [...Array(8).fill('recognized'), 'missed']));
  assert.equal(grade.letter, 'B');
  assert.match(grade.explanation, /most recent attempt was missed/);
});

test('maintenance evidence participates in grade and explanation with schedule adjustment off', () => {
  const word = entry('logos');
  const beforeStore = storeOf([knownRecord(word, ['recognized'])]);
  const before = VocabularyLearning.getRecord(beforeStore, word);
  const afterStore = VocabularyLearning.maintenancePracticeEntry(beforeStore, word, 'missed', { adjustSchedule: false }, DATE);
  const after = VocabularyLearning.getRecord(afterStore, word);
  assert.equal(after.due, before.due);
  assert.equal(after.intervalDays, before.intervalDays);
  assert.equal(after.successCount, before.successCount);
  assert.equal(after.history.at(-1).practice, 'maintenance');
  assert.equal(after.history.at(-1).scheduleAdjusted, false);
  assert.match(VocabularyMastery.masteryGrade(after).explanation, /maintenance attempts/);
});

test('maintenance schedule adjustment on reuses the normal review transition', () => {
  const word = entry('agape');
  const original = storeOf([knownRecord(word, ['recognized'], { due: DATE })]);
  const ordinary = VocabularyLearning.reviewEntry(original, word, 'recognized', DATE);
  const maintenance = VocabularyLearning.maintenancePracticeEntry(original, word, 'recognized', { adjustSchedule: true }, DATE);
  const expected = VocabularyLearning.getRecord(ordinary, word);
  const actual = VocabularyLearning.getRecord(maintenance, word);
  for(const field of ['status','successCount','intervalDays','due','lastReviewed']) assert.equal(actual[field], expected[field]);
  assert.equal(actual.history.at(-1).practice, 'maintenance');
  assert.equal(actual.history.at(-1).scheduleAdjusted, true);
});

test('maintenance misses with schedule adjustment on use the normal missed path', () => {
  const word = entry('miss');
  const original = storeOf([knownRecord(word, ['recognized'], { due: DATE })]);
  const ordinary = VocabularyLearning.getRecord(VocabularyLearning.reviewEntry(original, word, 'missed', DATE), word);
  const actual = VocabularyLearning.getRecord(VocabularyLearning.maintenancePracticeEntry(original, word, 'missed', { adjustSchedule: true }, DATE), word);
  for(const field of ['status','successCount','intervalDays','due']) assert.equal(actual[field], ordinary[field]);
});

test('maintenance history remains bounded without deleting scheduled history', () => {
  const word = entry('bounded');
  const scheduled = [
    { date: '2026-07-01', result: 'recognized', marker: 'scheduled-first' },
    { date: '2026-07-15', result: 'missed', marker: 'scheduled-middle' },
    { date: '2026-07-26', result: 'recognized', marker: 'scheduled-last' }
  ];
  const interleaved = Array.from({ length: 25 }, (_, index) => ({
    date: `2026-07-${String((index % 20) + 1).padStart(2, '0')}`,
    result: index % 2 ? 'recognized' : 'missed',
    practice: 'maintenance',
    scheduleAdjusted: false
  }));
  interleaved.splice(0, 0, scheduled[0]);
  interleaved.splice(13, 0, scheduled[1]);
  interleaved.push(scheduled[2]);
  let store = storeOf([knownRecord(word, [], { history: interleaved })]);
  for(let index = 0; index < 25; index += 1){
    store = VocabularyLearning.maintenancePracticeEntry(store, word, index % 2 ? 'recognized' : 'missed', { adjustSchedule: false }, DATE);
  }
  const history = VocabularyLearning.getRecord(store, word).history;
  assert.equal(history.filter(item => item.practice === 'maintenance').length, VocabularyLearning.MAX_MAINTENANCE_HISTORY);
  assert.deepEqual(history.filter(item => !item.practice).map(item => item.marker), scheduled.map(item => item.marker));
});

test('daily accounting deduplicates repeats and overlap while preserving category totals', () => {
  const shared = entry('shared');
  const maintenance = entry('maintenance');
  const scheduled = entry('scheduled');
  const store = storeOf([
    knownRecord(shared, [], { history: [
      { date: DATE, result: 'recognized' },
      { date: DATE, result: 'recognized', practice: 'maintenance' },
      { date: DATE, result: 'missed', practice: 'maintenance' }
    ] }),
    knownRecord(maintenance, [], { history: [{ date: DATE, result: 'recognized', practice: 'maintenance' }] }),
    knownRecord(scheduled, [], { history: [{ date: DATE, result: 'recognized' }] })
  ]);
  const summary = VocabularyMastery.dailyPracticeSummary(store, 'greek', DATE, 3);
  assert.equal(summary.scheduled, 2);
  assert.equal(summary.maintenance, 2);
  assert.equal(summary.combined, 3);
  assert.equal(summary.complete, true);
  assert.equal(summary.hasCounted(shared.id), true);
});

test('daily accounting separates languages and local study dates', () => {
  const greek = entry('same', 'greek');
  const hebrew = entry('same', 'hebrew');
  const store = storeOf([
    knownRecord(greek, [], { history: [{ date: DATE, result: 'recognized' }] }),
    knownRecord(hebrew, [], { history: [{ date: '2026-07-28', result: 'recognized', practice: 'maintenance' }] })
  ]);
  assert.equal(VocabularyMastery.dailyPracticeSummary(store, 'greek', DATE, 2).combined, 1);
  assert.equal(VocabularyMastery.dailyPracticeSummary(store, 'hebrew', DATE, 2).combined, 0);
  assert.equal(VocabularyMastery.dailyPracticeSummary(store, 'hebrew', '2026-07-28', 2).maintenance, 1);
});

test('zero daily target is safe and never reports required completion', () => {
  const summary = VocabularyMastery.dailyPracticeSummary(storeOf([]), 'greek', DATE, 0);
  assert.equal(summary.target, 0);
  assert.equal(summary.remaining, 0);
  assert.equal(summary.complete, false);
});

test('reinforcement sessions default to C–F and rank F before D before C', () => {
  const words = [entry('c'), entry('f'), entry('d')];
  const store = storeOf([
    knownRecord(words[0], ['recognized']),
    knownRecord(words[1], ['missed','missed','missed']),
    knownRecord(words[2], ['recognized','recognized','missed','missed'])
  ]);
  const session = VocabularyMastery.buildMaintenanceSession(words, store, VocabularyLearning, {});
  assert.equal(session.focus, VocabularyMastery.DEFAULT_FOCUS);
  assert.equal(session.gradeFilter, VocabularyMastery.DEFAULT_GRADE_FILTER);
  assert.deepEqual(session.entries.map(item => item.lemma), ['f','d','c']);
});

test('session construction fills from safer grades only when needed and has no duplicates', () => {
  const words = [entry('f'), entry('b'), entry('a')];
  const store = storeOf([
    knownRecord(words[0], ['missed','missed','missed']),
    knownRecord(words[1], ['recognized','recognized','recognized','missed','recognized']),
    knownRecord(words[2], Array(8).fill('recognized'))
  ]);
  const session = VocabularyMastery.buildMaintenanceSession(words, store, VocabularyLearning, { gradeFilter: 'd-f', size: 3 });
  assert.equal(session.entries[0].lemma, 'f');
  assert.equal(session.entries.length, 3);
  assert.equal(new Set(session.entries.map(item => item.id)).size, 3);
  assert.equal(session.broadened, true);
});

test('random sessions accept deterministic randomness and respect size', () => {
  const words = ['a','b','c'].map(value => entry(value));
  const store = storeOf(words.map(word => knownRecord(word, ['recognized'])));
  const session = VocabularyMastery.buildMaintenanceSession(words, store, VocabularyLearning, { focus: 'random', gradeFilter: 'all', size: 2, random: () => 0 });
  assert.deepEqual(session.entries.map(item => item.lemma), ['b','c']);
});

test('book-filtered sessions use the supplied occurrence index and remain language-safe', () => {
  const greek = [entry('in-book'), entry('out-book')];
  const hebrew = entry('in-book', 'hebrew');
  const store = storeOf([...greek.map(word => knownRecord(word, ['recognized'])), knownRecord(hebrew, ['recognized'])]);
  const session = VocabularyMastery.buildMaintenanceSession(greek, store, VocabularyLearning, {
    focus: 'book',
    gradeFilter: 'all',
    size: 10,
    bookIds: new Set([greek[0].id])
  });
  assert.deepEqual(session.entries.map(item => item.id), [greek[0].id]);
});

test('export and import keep optional learning history while older vocabulary-only payloads remain accepted', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/core/data-loader.js'), 'utf8');
  assert.match(source, /vocabularyLearning:\s*typeof VocabularyLearning/);
  assert.match(source, /learnReviewTargets:\s*typeof learnReviewTargets/);
  assert.match(source, /practiceSrsPreference:\s*typeof learnPracticeSrsPreference/);
  assert.match(source, /if\(!valid\.length && !learningImported\)/);
  assert.match(source, /VocabularyLearning\.saveStore\(VocabularyLearning\.normalizeStore\(payload\.vocabularyLearning\)\)/);
});

test('clear-all storage intentionally covers maintenance history and Learn preferences', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/core/storage/storage.js'), 'utf8');
  for(const key of ['pp_vocab_learning','pp_learn_review_targets','pp_learn_practice_srs_preference','pp_learn_active_paths','pp_recognition_history']){
    assert.match(source, new RegExp(`['"]${key}['"]`));
  }
});
