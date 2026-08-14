#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { performance } = require('node:perf_hooks');

const ROOT = path.resolve(__dirname, '..');
const vocabulary = JSON.parse(fs.readFileSync(path.join(ROOT, 'vocab_all.json'), 'utf8'));
const storage = new Map();

global.performance = performance;
global.localStorage = {
  getItem: key => storage.get(key) || null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: key => storage.delete(key)
};
global.PuritanCalendarDate = require('../src/core/calendar-date');
global.VocabularyLearning = require('../src/models/vocabulary-learning');
global.PuritanHebrewSearch = require('../src/core/hebrew-search');
global.normalizeAlternateGlosses = value => Array.isArray(value) ? value.map(item => String(item || '').trim()).filter(Boolean) : [];
global.getDisplayGloss = entry => entry.customGloss || entry.primaryGloss || entry.gloss || '';
const StudyEntries = require('../src/core/study-entries');
global.getStudyEntries = StudyEntries.getStudyEntries;
global.getStudyEntriesAsync = StudyEntries.getStudyEntriesAsync;
global.PuritanStudySets = { loadStore: () => ({ revision: 0 }), listStudySets: () => [] };
global.LearningPractice = { loadAttention: () => ({ revision: 0, items: {} }), needsAttention: () => false };
global.state = {
  dataRevision: 1,
  prefs: { studyMode: 'lemma' },
  data: {
    greek: vocabulary.filter(entry => entry.lang === 'greek'),
    hebrew: vocabulary.filter(entry => entry.lang === 'hebrew')
  }
};

const Search = require('../src/features/global-search');

function percentile(values, proportion){
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * proportion) - 1))] || 0;
}

function summarize(values){
  return {
    p50Ms: Number(percentile(values, .5).toFixed(3)),
    p95Ms: Number(percentile(values, .95).toFixed(3)),
    maxMs: Number(Math.max(...values).toFixed(3))
  };
}

async function run(){
  const coldStarted = performance.now();
  await Search.prepareGlobalSearchIndex();
  const coldPrepareMs = performance.now() - coldStarted;
  const warmReentryStarted = performance.now();
  await Search.prepareGlobalSearchIndex();
  const warmReentryMs = performance.now() - warmReentryStarted;
  const queries = [
    ['λόγος', 'greek'], ['logos', 'greek'], ['word', 'all'], ['love', 'greek'],
    ['שָׁלוֹם', 'hebrew'], ['shalom', 'hebrew'], ['king', 'hebrew'], ['and', 'all'],
    ['ἄπαξ', 'greek'], ['xyz-no-result', 'all']
  ];
  const samples = [];
  let returnedResults = 0;
  for(let index = 0; index < 500; index += 1){
    const [query, language] = queries[index % queries.length];
    const started = performance.now();
    const result = Search.searchGlobalVocabulary({ query, language });
    samples.push(performance.now() - started);
    returnedResults += result.total;
  }
  const debug = Search.globalSearchIndexDebug();
  return {
    sourceRows: vocabulary.length,
    indexedIdentities: debug.entries,
    queries: samples.length,
    coldPrepareMs: Number(coldPrepareMs.toFixed(3)),
    warmReentryMs: Number(warmReentryMs.toFixed(3)),
    warmQueries: summarize(samples),
    returnedResults,
    index: debug
  };
}

run().then(result => process.stdout.write(`${JSON.stringify(result, null, 2)}\n`));
