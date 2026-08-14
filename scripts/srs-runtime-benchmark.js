#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { performance } = require('node:perf_hooks');

const ROOT = path.resolve(__dirname, '..');
const ITERATIONS = 200;
const sourceRef = process.argv.find(value => value.startsWith('--source-ref='))?.split('=')[1] || '';
const language = process.argv.includes('--hebrew') ? 'hebrew' : 'greek';

function source(file){
  if(sourceRef) return execFileSync('git', ['show', `${sourceRef}:${file}`], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function loadModels(adapter){
  const context = vm.createContext({
    console,
    Date,
    JSON,
    Math,
    Object,
    Array,
    Set,
    Map,
    Promise,
    crypto: crypto.webcrypto,
    performance,
    activeStorageAdapter: adapter,
    module: { exports: {} },
    exports: {}
  });
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
  return { learning: context.VocabularyLearning, practice: context.LearningPractice };
}

function percentile(values, proportion){
  const sorted = values.slice().sort((a,b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * proportion) - 1))] || 0;
}

function summarize(values){
  return {
    p50Ms: Number(percentile(values, .5).toFixed(3)),
    p95Ms: Number(percentile(values, .95).toFixed(3)),
    maxMs: Number(Math.max(...values).toFixed(3))
  };
}

function run(){
  const values = new Map();
  let writes = 0;
  let bytesWritten = 0;
  const adapter = {
    get: key => values.get(key),
    set: (key, value) => { writes += 1; bytesWritten += Buffer.byteLength(String(value)); values.set(key, value); },
    remove: key => values.delete(key)
  };
  const { learning, practice } = loadModels(adapter);
  const script = language === 'hebrew' ? 'דבר' : 'λόγος';
  const words = Array.from({ length: 205 }, (_, index) => ({
    id: `lemma:${language}:${script}${index}`,
    lang: language,
    lemma: `${script}${index}`,
    word: `${script}${index}`,
    primaryGloss: `word ${index}`,
    freq: 1000 - index
  }));
  let store = learning.normalizeStore({ records: Object.fromEntries(words.map(word => [word.id, {
    ...word,
    status: 'Known',
    knownSource: 'manual',
    successCount: 0,
    intervalDays: 0,
    due: '9999-12-31',
    history: []
  }])) });
  let session = practice.assembleFocusedSession({
    language,
    profile: { ...practice.defaultProfile(language), unlimited: true },
    entries: words,
    store,
    model: learning
  });
  const byId = new Map(words.map(word => [word.id, word]));
  const samples = [];
  if(typeof global.gc === 'function') global.gc();
  const heapBefore = process.memoryUsage().heapUsed;
  for(let index = 0; index < ITERATIONS; index += 1){
    const started = performance.now();
    const card = practice.currentCard(session);
    const answer = practice.recordAnswer({
      session,
      cardId: card.cardId,
      entry: byId.get(card.vocabularyId),
      confidence: ['again','hard','good','easy'][index % 4],
      model: learning,
      store,
      adapter,
      dateISO: '2026-08-14'
    });
    store = learning.saveStore(answer.store);
    session = practice.saveSession(answer.session, adapter, { bumpRevision: false });
    samples.push(performance.now() - started);
  }
  if(typeof global.gc === 'function') global.gc();
  const heapAfter = process.memoryUsage().heapUsed;
  const bucket = (start, end) => summarize(samples.slice(start - 1, end));
  return {
    source: sourceRef || 'worktree',
    language,
    interactions: ITERATIONS,
    first10: bucket(1, 10),
    cards41to50: bucket(41, 50),
    cards91to100: bucket(91, 100),
    cards191to200: bucket(191, 200),
    overall: summarize(samples),
    writes,
    bytesWritten,
    storedBytes: [...values.values()].reduce((sum, value) => sum + Buffer.byteLength(String(value)), 0),
    attemptEvents: JSON.parse(values.get(practice.ATTEMPT_KEY) || '{"events":[]}').events.length,
    reviewEvents: Object.values(store.records).reduce((sum, record) => sum + (learning.reviewStatistics
      ? learning.reviewStatistics(record).total
      : (record.history || []).filter(event => event?.result === 'recognized' || event?.result === 'missed').length), 0),
    sessionCards: session.cards.length,
    pendingCards: session.cards.length - session.position,
    heapDeltaBytes: heapAfter - heapBefore
  };
}

process.stdout.write(`${JSON.stringify(run(), null, 2)}\n`);
