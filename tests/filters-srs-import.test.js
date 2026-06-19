const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ParserCore = require('../src/parser-core');

function loadFiltersSrs() {
  const context = {
    console,
    window: { PuritanParserCore: ParserCore },
    ParserCore,
    document: { querySelector: () => null, querySelectorAll: () => [] },
    state: { lang: 'greek', filters: { minFreq: 2, maxFreq: 10, dueOnly: true, pos: 'noun' }, prefs: { initialEase: 2.5, minEase: 1.3, useSM2: true } },
    todayISO: (offset = 0) => offset ? '2026-06-20' : '2026-06-19',
    clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
    uid: () => 'id'
  };
  vm.createContext(context);
  ['src/app-state.js', 'src/core/filters.js', 'src/features/parsing/index.js', 'src/core/srs.js'].forEach(file => vm.runInContext(fs.readFileSync(file, 'utf8'), context));
  vm.runInContext("state.filters = { minFreq: 2, maxFreq: 10, dueOnly: true, pos: 'noun' }; state.prefs = { initialEase: 2.5, minEase: 1.3, useSM2: true };", context);
  return context;
}

test('frequency, due, and parsing filters include only matching cards', () => {
  const app = loadFiltersSrs();
  const cards = [
    { word: 'a', freq: 5, due: '2026-06-19', pos: 'noun', lang: 'greek', parse: 'N-NSM' },
    { word: 'b', freq: 1, due: '2026-06-19', pos: 'noun', lang: 'greek', parse: 'N-ASM' },
    { word: 'c', freq: 5, due: '2026-06-20', pos: 'noun', lang: 'greek', parse: 'N-NSM' },
    { word: 'd', freq: 5, due: '2026-06-19', pos: 'verb', lang: 'greek', parse: 'V-PAI-3S' }
  ];
  assert.deepEqual(app.applyFreqFilter(cards).map(x => x.word), ['a']);
  assert.equal(app.matchesParsingFilters(cards[0], { family: 'nominals', details: { case: 'n' } }), true);
  assert.equal(app.matchesParsingFilters(cards[3], { family: 'nominals', details: {} }), false);
});

test('SRS intervals and ease update for successful and failed reviews', () => {
  const app = loadFiltersSrs();
  const item = { ease: 2.5, interval: 0, repetitions: 0, history: [] };
  app.sm2Update(item, 5);
  assert.equal(item.interval, 1);
  assert.equal(item.repetitions, 1);
  assert.ok(item.ease > 2.5);
  app.sm2Update(item, 2);
  assert.equal(item.interval, 1);
  assert.equal(item.repetitions, 0);
  assert.ok(item.ease >= 1.3);
});

test('import payloads round trip through normalizer by language', () => {
  const payload = { greek: [{ word: 'λόγος', gloss: 'word' }], hebrew: [{ word: 'דָּבָר', gloss: 'word' }] };
  const normalized = ParserCore.normalizeImportedPayload(JSON.parse(JSON.stringify(payload)));
  assert.deepEqual(normalized.map(item => item.lang), ['greek', 'hebrew']);
  assert.deepEqual(normalized.map(item => ParserCore.validateVocabItem(item, 0).errors.length), [0, 0]);
});
