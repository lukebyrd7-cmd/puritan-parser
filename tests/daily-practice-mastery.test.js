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

test('maintenance sessions default to all vocabulary, reinforcement order, and grades C, D, and F', () => {
  const words = [entry('c'), entry('f'), entry('d')];
  const store = storeOf([
    knownRecord(words[0], ['recognized']),
    knownRecord(words[1], ['missed','missed','missed']),
    knownRecord(words[2], ['recognized','recognized','missed','missed'])
  ]);
  const session = VocabularyMastery.buildMaintenanceSession(words, store, VocabularyLearning, {});
  assert.equal(session.source, VocabularyMastery.DEFAULT_SOURCE);
  assert.equal(session.order, VocabularyMastery.DEFAULT_ORDER);
  assert.deepEqual(session.selectedGrades, ['C', 'D', 'F']);
  assert.deepEqual(session.entries.map(item => item.lemma), ['f','d','c']);
});

test('selected mastery grades are exact and never broadened to fill a session', () => {
  const words = [entry('f'), entry('b'), entry('a')];
  const store = storeOf([
    knownRecord(words[0], ['missed','missed','missed']),
    knownRecord(words[1], ['recognized','recognized','recognized','missed','recognized']),
    knownRecord(words[2], Array(8).fill('recognized'))
  ]);
  const session = VocabularyMastery.buildMaintenanceSession(words, store, VocabularyLearning, { selectedGrades: ['D', 'F'], size: 3 });
  assert.equal(session.entries[0].lemma, 'f');
  assert.equal(session.entries.length, 1);
  assert.equal(session.limitedByPool, true);
});

test('independent grade combinations reach session construction unchanged', () => {
  const words = ['a','b','c','d','f'].map(value => entry(value));
  const store = storeOf([
    knownRecord(words[0], Array(8).fill('recognized')),
    knownRecord(words[1], ['recognized','recognized','recognized','missed','recognized']),
    knownRecord(words[2], ['recognized']),
    knownRecord(words[3], ['recognized','recognized','missed','missed']),
    knownRecord(words[4], ['missed','missed','missed'])
  ]);
  for(const selectedGrades of [['A'], ['B','D'], ['A','B','C'], ['A','B','C','D','F']]){
    const session = VocabularyMastery.buildMaintenanceSession(words, store, VocabularyLearning, { selectedGrades, size: 20 });
    assert.deepEqual(session.selectedGrades, selectedGrades);
    assert.deepEqual(new Set(session.candidates.map(item => item.grade.letter)), new Set(selectedGrades));
  }
});

test('random sessions accept deterministic randomness across all vocabulary', () => {
  const words = ['a','b','c'].map(value => entry(value));
  const store = storeOf(words.map(word => knownRecord(word, ['recognized'])));
  const session = VocabularyMastery.buildMaintenanceSession(words, store, VocabularyLearning, { order: 'random', selectedGrades: ['C'], size: 2, random: () => 0 });
  assert.deepEqual(session.entries.map(item => item.lemma), ['b','c']);
});

test('selected-book sessions use the supplied occurrence index with either practice order', () => {
  const greek = [entry('in-book'), entry('out-book')];
  const hebrew = entry('in-book', 'hebrew');
  const store = storeOf([...greek.map(word => knownRecord(word, ['recognized'])), knownRecord(hebrew, ['recognized'])]);
  for(const order of ['reinforcement', 'random']){
    const session = VocabularyMastery.buildMaintenanceSession(greek, store, VocabularyLearning, {
      source: 'book',
      order,
      selectedGrades: ['C'],
      size: 10,
      bookIds: new Set([greek[0].id]),
      random: () => 0
    });
    assert.deepEqual(session.entries.map(item => item.id), [greek[0].id]);
  }
});

test('all-vocabulary scope ignores stale book filters', () => {
  const words = [entry('one'), entry('two')];
  const store = storeOf(words.map(word => knownRecord(word, ['recognized'])));
  const session = VocabularyMastery.buildMaintenanceSession(words, store, VocabularyLearning, {
    source: 'all',
    order: 'reinforcement',
    selectedGrades: ['C'],
    size: 20,
    bookIds: new Set([words[0].id])
  });
  assert.deepEqual(session.entries.map(item => item.id).sort(), words.map(item => item.id).sort());
});

test('finite session sizes are exact, unique, and limited honestly by the eligible pool', () => {
  const words = Array.from({ length: 80 }, (_, index) => entry(`word-${index}`));
  const store = storeOf(words.map(word => knownRecord(word, ['recognized'])));
  for(const size of [1, 7, 37, 75]){
    const session = VocabularyMastery.buildMaintenanceSession(words, store, VocabularyLearning, { selectedGrades: ['C'], size });
    assert.equal(session.entries.length, size);
    assert.equal(new Set(session.entries.map(item => item.id)).size, size);
    assert.equal(session.limitedByPool, false);
  }
  const oversized = VocabularyMastery.buildMaintenanceSession(words.slice(0, 7), store, VocabularyLearning, { selectedGrades: ['C'], size: 75 });
  assert.equal(oversized.entries.length, 7);
  assert.equal(new Set(oversized.entries.map(item => item.id)).size, 7);
  assert.equal(oversized.limitedByPool, true);
});

test('duplicate input lemmas cannot create duplicate finite or unlimited queue entries', () => {
  const word = entry('unique');
  const store = storeOf([knownRecord(word, ['recognized'])]);
  const finite = VocabularyMastery.buildMaintenanceSession([word, { ...word }], store, VocabularyLearning, { selectedGrades: ['C'], size: 20 });
  const unlimited = VocabularyMastery.buildMaintenanceSession([word, { ...word }], store, VocabularyLearning, { selectedGrades: ['C'], size: 'unlimited' });
  assert.deepEqual(finite.entries.map(item => item.id), [word.id]);
  assert.deepEqual(unlimited.entries.map(item => item.id), [word.id]);
  assert.equal(unlimited.unlimited, true);
});

test('export and import keep optional learning history while older vocabulary-only payloads remain accepted', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/core/data-loader.js'), 'utf8');
  assert.match(source, /vocabularyLearning:\s*typeof VocabularyLearning/);
  assert.match(source, /learnReviewTargets:\s*typeof learnReviewTargets/);
  assert.match(source, /practiceSrsPreference:\s*typeof learnPracticeSrsPreference/);
  assert.match(source, /learningPractice:\s*typeof LearningPractice/);
  assert.match(source, /customDecks:\s*typeof PuritanStudySets/);
  assert.match(source, /if\(!valid\.length && !learningImported && !practiceImported && !decksImported && !readerLocationImported && !personalGlossesImported\)/);
  assert.match(source, /VocabularyLearning\.saveStore\(VocabularyLearning\.normalizeStore\(payload\.vocabularyLearning\)\)/);
});

test('clear-all storage intentionally covers maintenance history and Learn preferences', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/core/storage/storage.js'), 'utf8');
  for(const key of ['pp_vocab_learning','pp_learn_review_targets','pp_learn_practice_srs_preference','pp_learn_active_paths','pp_recognition_history']){
    assert.match(source, new RegExp(`['"]${key}['"]`));
  }
});
