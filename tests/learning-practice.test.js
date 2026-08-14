const test = require('node:test');
const assert = require('node:assert/strict');

const VocabularyLearning = require('../src/models/vocabulary-learning');
const VocabularyMastery = require('../src/core/vocabulary-mastery');
global.VocabularyMastery = VocabularyMastery;
const LearningPractice = require('../src/core/learning-practice');

const DATE = '2026-07-31';
const entry = (lemma, lang = 'greek', freq = 10) => ({ id: `lemma:${lang}:${lemma}`, lemma, word: lemma, lang, freq, gloss: `gloss ${lemma}` });
const memory = initial => {
  const values = new Map(Object.entries(initial || {}));
  return { get: key => values.get(key), set: (key, value) => values.set(key, value), remove: key => values.delete(key), values };
};
function record(word, options = {}){
  return {
    id: word.id,
    lemma: word.lemma,
    lang: word.lang,
    status: options.status || 'Known',
    knownSource: options.knownSource || 'manual',
    successCount: options.successCount ?? 6,
    intervalDays: options.intervalDays ?? 14,
    due: options.due || '9999-12-31',
    introducedAt: options.introducedAt || '2026-01-01',
    history: options.history || []
  };
}
function store(records){ return VocabularyLearning.normalizeStore({ records: Object.fromEntries(records.map(item => [item.id, item])) }); }

test('first-use profiles are independent, broad, balanced, and reading-first', () => {
  const adapter = memory();
  const profiles = LearningPractice.loadProfiles(adapter).profiles;
  assert.notEqual(profiles.greek, profiles.hebrew);
  for(const language of ['greek','hebrew']) assert.deepEqual(
    { language: profiles[language].language, source: profiles[language].source, strategy: profiles[language].strategy, direction: profiles[language].promptDirection, size: profiles[language].size, grades: profiles[language].selectedGrades },
    { language, source: 'all-known', strategy: 'balanced', direction: 'reading', size: 20, grades: ['A','B','C','D','F'] }
  );
  for(const language of ['greek','hebrew']){
    assert.equal(Object.hasOwn(profiles[language], 'maintenanceSrs'), false);
    assert.equal(Object.hasOwn(profiles[language], 'srsPreference'), false);
  }
});

test('profile drafts do not persist and a successful save changes one language only', () => {
  const adapter = memory();
  const draft = LearningPractice.normalizeProfile({ language: 'greek', source: 'weak', strategy: 'reinforcement', size: 12 }, 'greek');
  assert.equal(LearningPractice.loadProfiles(adapter).profiles.greek.source, 'all-known');
  LearningPractice.saveProfile(draft, adapter);
  assert.equal(LearningPractice.loadProfiles(adapter).profiles.greek.source, 'weak');
  assert.equal(LearningPractice.loadProfiles(adapter).profiles.hebrew.source, 'all-known');
});

test('legacy daily profiles migrate idempotently to independent finish-goal amounts', () => {
  const adapter = memory({
    [LearningPractice.PROFILE_KEY]: JSON.stringify({ schemaVersion: 2, revision: 4, profiles: {
      greek: { language: 'greek', size: 12, unlimited: true },
      hebrew: { language: 'hebrew', size: 35 }
    } })
  });
  const first = LearningPractice.loadProfiles(adapter);
  const second = LearningPractice.loadProfiles(adapter);
  assert.deepEqual(first, second);
  assert.equal(first.schemaVersion, 3);
  assert.deepEqual(
    [first.profiles.greek.dailyAmountMode, first.profiles.hebrew.dailyAmountMode],
    ['goal', 'goal']
  );
  LearningPractice.saveProfile({ ...first.profiles.greek, dailyAmountMode: 'set', dailyAmount: 17 }, adapter);
  const saved = LearningPractice.loadProfiles(adapter).profiles;
  assert.deepEqual([saved.greek.dailyAmountMode, saved.greek.dailyAmount, saved.hebrew.dailyAmountMode], ['set', 17, 'goal']);
});

test('maintenance preference migration defaults missing, malformed, and legacy auto-default to On', () => {
  for(const initial of [{}, { [LearningPractice.MAINTENANCE_SRS_KEY]: '{bad' }, { [LearningPractice.LEGACY_SRS_KEY]: 'practice-only' }]){
    const adapter = memory(initial);
    assert.equal(LearningPractice.loadMaintenancePreference(adapter).enabled, true);
    assert.equal(LearningPractice.loadMaintenancePreference(adapter).enabled, true);
  }
});

test('maintenance preference deterministically migrates legacy ask to canonical Off and stays idempotent', () => {
  const on = memory({ [LearningPractice.LEGACY_SRS_KEY]: 'count-srs' });
  const off = memory({ [LearningPractice.LEGACY_SRS_KEY]: 'ask' });
  const canonicalString = memory({ [LearningPractice.MAINTENANCE_SRS_KEY]: JSON.stringify('ask') });
  const canonicalRaw = memory({ [LearningPractice.MAINTENANCE_SRS_KEY]: 'ask' });
  assert.deepEqual({ enabled: LearningPractice.loadMaintenancePreference(on).enabled, chosen: LearningPractice.loadMaintenancePreference(on).userChosen }, { enabled: true, chosen: true });
  const migrated = LearningPractice.loadMaintenancePreference(off);
  const persisted = off.values.get(LearningPractice.MAINTENANCE_SRS_KEY);
  assert.deepEqual({ enabled: migrated.enabled, chosen: migrated.userChosen }, { enabled: false, chosen: true });
  assert.equal(JSON.parse(persisted).enabled, false);
  assert.equal(LearningPractice.loadMaintenancePreference(off).enabled, false);
  assert.equal(off.values.get(LearningPractice.MAINTENANCE_SRS_KEY), persisted);
  assert.equal(LearningPractice.loadMaintenancePreference(canonicalString).enabled, false);
  assert.equal(LearningPractice.loadMaintenancePreference(canonicalRaw).enabled, false);
  LearningPractice.setMaintenancePreference(false, on);
  assert.equal(LearningPractice.loadMaintenancePreference(on).enabled, false);
});

test('confidence scheduling is deterministic and ordered Again < Hard < Good < Easy', () => {
  const base = record(entry('logos'), { successCount: 3, intervalDays: 7, due: DATE });
  const intervals = ['again','hard','good','easy'].map(confidence => LearningPractice.applyConfidence(base, confidence, { date: DATE }).record.intervalDays);
  assert.deepEqual(intervals, intervals.slice().sort((a,b) => a-b));
  assert.equal(new Set(intervals).size, 4);
});

test('maintenance Off preserves every scheduling field while retaining evidence', () => {
  const word = entry('logos');
  const original = record(word, { successCount: 5, intervalDays: 30, due: '2026-08-30' });
  const result = LearningPractice.appendEvidenceOnly(original, 'hard', { vocabularyId: word.id, language: 'greek', scheduleUpdated: false });
  for(const field of ['successCount','intervalDays','due','status','knownSource']) assert.equal(result.record[field], original[field]);
  assert.equal(result.event.confidence, 'hard');
  assert.equal(result.event.scheduleUpdated, false);
});

test('balanced rotation filters grades, avoids duplicates, fills exact sizes, and bounds newly known words', () => {
  const words = Array.from({ length: 40 }, (_, index) => entry(`w${index}`));
  const records = words.map((word,index) => record(word, {
    successCount: index < 20 ? 3 : 8,
    introducedAt: index < 20 ? '2026-07-30' : '2025-01-01',
    history: index < 10 ? [{ date: '2026-07-20', result: 'missed' }] : Array(8).fill(null).map((_,eventIndex) => ({ date: `2026-06-${String(eventIndex + 1).padStart(2,'0')}`, result: 'recognized' }))
  }));
  const built = LearningPractice.buildBalancedSession([...words, words[0]], store(records), VocabularyLearning, { selectedGrades: ['A','B','C','D','F'], size: 20, dateISO: DATE });
  assert.equal(built.entries.length, 20);
  assert.equal(new Set(built.entries.map(word => word.id)).size, 20);
  const newlyKnown = built.entries.filter(word => records.find(item => item.id === word.id).introducedAt === '2026-07-30');
  assert.ok(newlyKnown.length <= 5);
});

test('balanced rotation redistributes empty categories and eventually visits every eligible word', () => {
  const words = Array.from({ length: 17 }, (_, index) => entry(`rotate-${index}`));
  let current = store(words.map(word => record(word, { successCount: 8, introducedAt: '2025-01-01', history: [] })));
  const seen = new Set();
  for(let round = 0; round < 6; round += 1){
    const built = LearningPractice.buildBalancedSession(words, current, VocabularyLearning, { size: 4, selectedGrades: ['A','B','C','D','F'], dateISO: DATE });
    assert.equal(built.entries.length, 4);
    for(const word of built.entries){
      seen.add(word.id);
      current.records[word.id].history.push({ date: DATE, timestamp: `${DATE}T12:00:${String(round).padStart(2,'0')}Z`, result: 'recognized', confidence: 'good', practice: 'maintenance' });
    }
  }
  assert.equal(seen.size, words.length);
});

test('daily assembly puts all scheduled work before learning and maintenance even beyond target', () => {
  const due = ['due-1','due-2','due-3'].map(name => entry(name));
  const learning = entry('learning');
  const known = ['known-1','known-2','known-3'].map(name => entry(name));
  const all = [...due, learning, ...known];
  const current = store([
    ...due.map(word => record(word, { knownSource: 'review', successCount: 3, due: DATE })),
    record(learning, { status: 'Learning', knownSource: 'review', successCount: 0, intervalDays: 0, due: DATE }),
    ...known.map(word => record(word))
  ]);
  const session = LearningPractice.assembleSession({ language: 'greek', profile: LearningPractice.defaultProfile('greek'), entries: all, maintenanceEntries: known, store: current, model: VocabularyLearning, target: 2, todayIds: new Set(), dateISO: DATE });
  assert.deepEqual(session.cards.map(card => card.phase), ['scheduled','scheduled','scheduled','learning']);
});

test('daily set amounts add exact non-due work after mandatory due reviews', () => {
  const due = ['due-1','due-2'].map(name => entry(name));
  const known = Array.from({ length: 8 }, (_, index) => entry(`known-${index}`));
  const current = store([...due.map(word => record(word, { due: DATE })), ...known.map(word => record(word))]);
  const profile = { ...LearningPractice.defaultProfile('greek'), dailyAmountMode: 'set', dailyAmount: 5 };
  const session = LearningPractice.assembleSession({ language: 'greek', profile, entries: [...due, ...known], maintenanceEntries: known, store: current, model: VocabularyLearning, target: 20, todayIds: new Set(), dateISO: DATE });
  assert.deepEqual(session.cards.map(card => card.phase), ['scheduled','scheduled','maintenance','maintenance','maintenance','maintenance','maintenance']);
  assert.equal(session.dailyAmountMode, 'set');
  assert.equal(session.dailyAmount, 5);
});

test('daily continue-until-stopped uses bounded lazy batches and remains resumable', () => {
  const due = entry('due');
  const known = Array.from({ length: 205 }, (_, index) => entry(`daily-${index}`));
  const current = store([record(due, { due: DATE }), ...known.map(word => record(word))]);
  const profile = { ...LearningPractice.defaultProfile('greek'), dailyAmountMode: 'unlimited' };
  let session = LearningPractice.assembleSession({ language: 'greek', profile, entries: [due, ...known], maintenanceEntries: known, store: current, model: VocabularyLearning, dateISO: DATE });
  assert.equal(session.cards.length, 101);
  assert.equal(session.cards[0].phase, 'scheduled');
  assert.equal(session.remainingCandidateIds.length, 105);
  assert.equal(session.unlimited, true);
  for(let index = 0; index < 101; index++) session = LearningPractice.advanceSession(session, { eventId: `daily-event-${index}`, confidence: 'good' });
  assert.equal(session.cards.length, 201);
  assert.equal(session.completedAt, '');
});

test('zero due enters maintenance and no eligible maintenance completes honestly', () => {
  const word = entry('known'); const current = store([record(word)]);
  const maintenance = LearningPractice.assembleSession({ language: 'greek', profile: LearningPractice.defaultProfile('greek'), entries: [word], maintenanceEntries: [word], store: current, model: VocabularyLearning, target: 1, todayIds: new Set(), dateISO: DATE });
  assert.equal(maintenance.cards[0].phase, 'maintenance');
  const empty = LearningPractice.assembleSession({ language: 'greek', profile: LearningPractice.defaultProfile('greek'), entries: [], maintenanceEntries: [], store: store([]), model: VocabularyLearning, target: 20, todayIds: new Set(), dateISO: DATE });
  assert.equal(empty.phase, 'complete');
  assert.equal(empty.limitedByPool, true);
  assert.equal(LearningPractice.activeSession(empty), null);
});

test('large new-word pools use bounded direct status checks instead of whole-store learningStatus calls', () => {
  const words = Array.from({ length: 10000 }, (_, index) => entry(`new-${index}`, 'greek', 10000 - index));
  const directModel = {
    ...VocabularyLearning,
    learningStatus(){ throw new Error('whole-store status lookup must not run during session assembly'); }
  };
  const session = LearningPractice.assembleSession({
    language: 'greek',
    profile: { ...LearningPractice.defaultProfile('greek'), introduceNewCount: 5 },
    entries: words,
    newEntries: words,
    maintenanceEntries: [],
    store: store([]),
    model: directModel,
    target: 20,
    dateISO: DATE
  });
  assert.equal(session.cards.length, 5);
  assert.ok(session.cards.every(card => card.phase === 'new'));
});

test('focused finite and continue-until-stopped sessions use only the selected pool and remain resumable', () => {
  const words = Array.from({ length: 205 }, (_, index) => entry(`focused-${index}`));
  const current = store(words.map(word => record(word)));
  const finite = LearningPractice.assembleFocusedSession({ language: 'greek', profile: { ...LearningPractice.defaultProfile('greek'), source: 'frequency', sourceId: 'custom:5:9', size: 12 }, entries: words, store: current, model: VocabularyLearning });
  assert.equal(finite.sessionType, 'focused');
  assert.equal(finite.cards.length, 12);
  assert.ok(finite.cards.every(card => card.phase === 'maintenance'));

  const unlimited = LearningPractice.assembleFocusedSession({ language: 'greek', profile: { ...LearningPractice.defaultProfile('greek'), source: 'book', sourceId: 'romans', unlimited: true }, entries: words, store: current, model: VocabularyLearning, returnPage: 'vocabulary:customize:greek:book' });
  assert.equal(unlimited.cards.length, 100);
  assert.equal(unlimited.remainingCandidateIds.length, 105);
  assert.equal(unlimited.returnPage, 'vocabulary:customize:greek:book');
  let advanced = unlimited;
  for(let index = 0; index < 100; index++) advanced = LearningPractice.advanceSession(advanced, { eventId: `event-${index}`, confidence: 'good' });
  assert.equal(advanced.cards.length, 200);
  assert.equal(advanced.position, 100);
  assert.equal(advanced.completedAt, '');
});

test('mixed prompt direction is deterministic and survives session normalization', () => {
  const first = LearningPractice.directionFor('mixed', 'session-1', 'lemma:greek:logos', 2);
  assert.equal(LearningPractice.directionFor('mixed', 'session-1', 'lemma:greek:logos', 2), first);
  const normalized = LearningPractice.normalizeSession({ language: 'greek', promptDirection: 'mixed', cards: [{ vocabularyId: 'lemma:greek:logos', direction: first }] });
  assert.equal(normalized.cards[0].direction, first);
});

test('answer acceptance advances exactly once and reload resumes at the next card', () => {
  const adapter = memory(); const words = [entry('one'), entry('two')];
  const current = store(words.map(word => record(word, { knownSource: 'review', successCount: 3, due: DATE })));
  const session = LearningPractice.assembleSession({ language: 'greek', profile: LearningPractice.defaultProfile('greek'), entries: words, maintenanceEntries: [], store: current, model: VocabularyLearning, target: 1, dateISO: DATE });
  const card = LearningPractice.currentCard(session);
  const first = LearningPractice.recordAnswer({ session, cardId: card.cardId, entry: words[0], confidence: 'good', model: VocabularyLearning, store: current, adapter, dateISO: DATE });
  assert.equal(first.accepted, true);
  const duplicate = LearningPractice.recordAnswer({ session, cardId: card.cardId, entry: words[0], confidence: 'good', model: VocabularyLearning, store: first.store, adapter, dateISO: DATE });
  assert.equal(duplicate.accepted, false);
  assert.equal(duplicate.reason, 'duplicate');
  LearningPractice.saveSession(first.session, adapter);
  assert.equal(LearningPractice.currentCard(LearningPractice.activeSession('greek', adapter)).vocabularyId, words[1].id);
});

test('Greek and Hebrew active sessions coexist and expire after seven days', () => {
  const adapter = memory();
  LearningPractice.saveSession({ language: 'greek', cards: [{ vocabularyId: 'lemma:greek:a' }] }, adapter);
  LearningPractice.saveSession({ language: 'hebrew', cards: [{ vocabularyId: 'lemma:hebrew:b' }] }, adapter);
  assert.ok(LearningPractice.activeSession('greek', adapter));
  assert.ok(LearningPractice.activeSession('hebrew', adapter));
  assert.equal(LearningPractice.sessionExpired({ updatedAt: '2026-07-01T00:00:00Z' }, new Date('2026-07-31T00:00:00Z').getTime()), true);
});

test('Needs attention is language-safe, does not mutate learning state, and round trips', () => {
  const adapter = memory();
  LearningPractice.setNeedsAttention('lemma:greek:logos', 'greek', true, adapter);
  assert.equal(LearningPractice.needsAttention('lemma:greek:logos', 'greek', adapter), true);
  assert.equal(LearningPractice.needsAttention('lemma:greek:logos', 'hebrew', adapter), false);
  const exported = LearningPractice.exportState(adapter);
  const restored = memory(); LearningPractice.importState(exported, restored);
  assert.equal(LearningPractice.needsAttention('lemma:greek:logos', 'greek', restored), true);
});

test('recap is one deduplicated pass, keeps direction, and never updates schedule or daily count', () => {
  const base = LearningPractice.normalizeSession({ language: 'greek', completedAt: new Date().toISOString(), difficultIds: ['lemma:greek:a','lemma:greek:a'], cards: [{ vocabularyId: 'lemma:greek:a', direction: 'reverse', answered: true }] });
  const recap = LearningPractice.buildRecap(base);
  assert.equal(recap.cards.filter(card => card.phase === 'recap').length, 1);
  assert.equal(LearningPractice.currentCard(recap).direction, 'reverse');
  const evidence = LearningPractice.appendEvidenceOnly(record(entry('a')), 'good', { practiceType: 'recap', recap: true, countTowardDaily: false });
  assert.equal(evidence.event.scheduleUpdated, false);
  assert.equal(evidence.event.countTowardDaily, false);
});

test('two hundred persisted session transitions stay bounded and keep one authoritative review event', () => {
  const adapter = memory();
  const words = Array.from({ length: 205 }, (_, index) => entry(`stress-${index}`));
  let current = store(words.map(word => record(word)));
  let session = LearningPractice.assembleFocusedSession({
    language: 'greek',
    profile: { ...LearningPractice.defaultProfile('greek'), unlimited: true },
    entries: words,
    store: current,
    model: VocabularyLearning
  });
  const byId = new Map(words.map(word => [word.id, word]));
  for(let index = 0; index < 200; index += 1){
    const card = LearningPractice.currentCard(session);
    const answer = LearningPractice.recordAnswer({
      session,
      cardId: card.cardId,
      entry: byId.get(card.vocabularyId),
      confidence: ['again','hard','good','easy'][index % 4],
      model: VocabularyLearning,
      store: current,
      adapter,
      dateISO: DATE
    });
    assert.equal(answer.accepted, true);
    current = answer.store;
    session = LearningPractice.saveSession(answer.session, adapter);
  }
  const reviewCount = Object.values(current.records).reduce((sum, item) => sum + VocabularyLearning.reviewStatistics(item).total, 0);
  assert.equal(reviewCount, 200);
  assert.equal(session.position, 200);
  assert.equal(session.cards.length, 205);
  assert.equal(session.submittedEventIds.length, 200);
  assert.equal(adapter.values.has(LearningPractice.ATTEMPT_KEY), false);
  assert.ok(Object.values(current.records).every(item => item.history.length <= 1));
  assert.ok(LearningPractice.currentCard(session));
});

test('legacy global attempts remain importable and exportable without receiving duplicate writes', () => {
  const event = { eventId: 'legacy-attempt', result: 'recognized' };
  const adapter = memory({ [LearningPractice.ATTEMPT_KEY]: JSON.stringify({ schemaVersion: 3, revision: 1, events: [event] }) });
  const exported = LearningPractice.exportState(adapter);
  assert.deepEqual(exported.attempts.events, [event]);
  const restored = memory();
  LearningPractice.importState(exported, restored);
  assert.deepEqual(LearningPractice.exportState(restored).attempts.events, [event]);
});
