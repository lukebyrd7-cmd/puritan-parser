#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { performance } = require('node:perf_hooks');

const ROOT = path.resolve(__dirname, '..');
const sourceRef = process.argv.find(value => value.startsWith('--source-ref='))?.split('=')[1] || '';
const RECORDS = 1000;
const EVENTS_PER_RECORD = 100;

function source(file){
  if(sourceRef) return execFileSync('git', ['show', `${sourceRef}:${file}`], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function loadModels(adapter){
  const context = vm.createContext({ console, Date, JSON, Math, Object, Array, Set, Map, Promise, setTimeout, crypto: crypto.webcrypto, performance, activeStorageAdapter: adapter, module: { exports: {} }, exports: {} });
  for(const file of ['src/core/calendar-date.js', 'src/models/vocabulary-learning.js', 'src/core/vocabulary-mastery.js', 'src/core/learning-practice.js']){
    let contents;
    try { contents = source(file); }
    catch(error){
      if(sourceRef && file === 'src/core/calendar-date.js') continue;
      throw error;
    }
    context.module = { exports: {} };
    context.exports = context.module.exports;
    vm.runInContext(contents, context, { filename: file });
  }
  return { learning: context.VocabularyLearning, mastery: context.VocabularyMastery, practice: context.LearningPractice };
}

async function run(){
  const values = new Map();
  let writes = 0;
  let bytesWritten = 0;
  const adapter = {
    get: key => values.get(key),
    set: (key, value) => { writes += 1; bytesWritten += Buffer.byteLength(String(value)); values.set(key, value); },
    remove: key => values.delete(key)
  };
  const { learning, mastery, practice } = loadModels(adapter);
  const histories = Array.from({ length: EVENTS_PER_RECORD }, (_, index) => ({
    schemaVersion: 3,
    eventId: `history-${index}`,
    vocabularyId: '',
    language: 'greek',
    timestamp: `2026-08-14T12:${String(index % 60).padStart(2, '0')}:00.000Z`,
    date: '2026-08-14',
    practice: index % 3 ? 'scheduled' : 'maintenance',
    confidence: index % 4 === 0 ? 'again' : 'good',
    result: index % 4 === 0 ? 'missed' : 'recognized',
    countTowardDaily: true
  }));
  const records = {};
  for(let index = 0; index < RECORDS; index += 1){
    const id = `lemma:greek:finish-${index}`;
    records[id] = {
      id, lemma: `finish-${index}`, lang: 'greek', status: 'Known', knownSource: 'review', successCount: 4,
      intervalDays: 14, due: '2026-08-20', revision: 1,
      history: histories.map(event => ({ ...event, eventId: `${id}:${event.eventId}`, vocabularyId: id }))
    };
  }
  let store = learning.normalizeStore({ schemaVersion: 2, revision: 1, records });
  const entry = { id: 'lemma:greek:finish-0', lang: 'greek', lemma: 'finish-0', word: 'finish-0', studyForm: 'τελος', primaryGloss: 'end', freq: 1 };
  const profile = { ...practice.defaultProfile('greek'), source: 'all-known', size: 1, selectedGrades: ['A','B','C','D','F'] };
  let session = practice.assembleFocusedSession({ language: 'greek', profile, entries: [entry], store, model: learning });
  const card = practice.currentCard(session);
  const writesBefore = writes;
  const bytesBefore = bytesWritten;
  const commitStarted = performance.now();
  const answer = practice.recordAnswer({ session, cardId: card.cardId, entry, confidence: 'good', model: learning, store, maintenanceSrs: true, adapter, dateISO: '2026-08-14' });
  store = learning.saveStore(answer.store, { normalized: true });
  session = practice.saveSession(answer.session, adapter, { bumpRevision: false });
  const interactiveReadyMs = performance.now() - commitStarted;

  const slices = [];
  const aggregationStarted = performance.now();
  const summary = typeof mastery.dailyPracticeSummaryAsync === 'function' && !sourceRef
    ? await mastery.dailyPracticeSummaryAsync(store, 'greek', '2026-08-14', 30, { budgetMs: 8, onChunk: duration => slices.push(duration) })
    : mastery.dailyPracticeSummary(store, 'greek', '2026-08-14', 30);
  const aggregationTotalMs = performance.now() - aggregationStarted;
  if(!slices.length) slices.push(aggregationTotalMs);

  return {
    source: sourceRef || 'worktree',
    records: RECORDS,
    historyEvents: RECORDS * EVENTS_PER_RECORD,
    finalRatingCommitMs: Number(interactiveReadyMs.toFixed(3)),
    destinationInteractiveMs: Number(interactiveReadyMs.toFixed(3)),
    aggregationTotalMs: Number(aggregationTotalMs.toFixed(3)),
    maxAggregationSliceMs: Number(Math.max(...slices).toFixed(3)),
    finalCardWrites: writes - writesBefore,
    finalCardBytes: bytesWritten - bytesBefore,
    sessionCompleted: Boolean(session.completedAt),
    countedVocabulary: summary.combined,
    reviewEventsForRatedWord: learning.reviewStatistics(store.records[entry.id]).total
  };
}

run().then(result => process.stdout.write(`${JSON.stringify(result, null, 2)}\n`));
