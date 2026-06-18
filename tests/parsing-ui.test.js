const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function loadAppParsingHelpers() {
  const context = {
    console,
    setTimeout,
    clearTimeout,
    document: {
      querySelector: () => null,
      querySelectorAll: () => [],
      documentElement: { style: { setProperty() {} }, classList: { remove() {}, add() {} } }
    },
    window: { PuritanParserCore: require('../src/parser-core'), matchMedia: () => ({ matches: false }) },
    localStorage: { getItem: () => null, setItem() {} }
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('app.js', 'utf8').replace(/\ninit\(\);\s*$/, '\n'), context);
  return context;
}

test('parsing helpers compare and display field-specific Greek nominal answers', () => {
  const app = loadAppParsingHelpers();
  const qn = { parse: 'N-ASN', lang: 'greek', pos: 'noun' };

  assert.equal(app.parseHasSelection(qn, 'case', 'n'), false);
  assert.equal(app.getExpectedParsingValue(qn, 'case'), 'a');
  assert.equal(app.formatParsingValue('case', 'n'), 'nominative');
  assert.equal(app.formatParsingValue('case', 'a'), 'accusative');
  assert.equal(app.getExpectedParsingValue(qn, 'gender'), 'n');
  assert.equal(app.formatParsingValue('gender', 'n'), 'neuter');
});

test('parsing helpers support compact MorphGNT-style Greek verb answers', () => {
  const app = loadAppParsingHelpers();
  const qn = { parse: 'V-3AAI-S--', lang: 'greek', pos: 'verb' };

  assert.equal(app.getExpectedParsingValue(qn, 'tense'), 'aor');
  assert.equal(app.getExpectedParsingValue(qn, 'voice'), 'act');
  assert.equal(app.getExpectedParsingValue(qn, 'mood'), 'ind');
  assert.equal(app.getExpectedParsingValue(qn, 'person'), '3s');
  assert.equal(app.parseHasSelection(qn, 'person', '3s'), true);
});

test('word list part-of-speech filter stays separate from parsing filters', () => {
  const app = loadAppParsingHelpers();
  const noun = { word: 'λόγον', lang: 'greek', pos: 'noun', parse: 'N-ASM' };
  const verb = { word: 'λέγει', lang: 'greek', pos: 'verb', parse: 'V-PAI-3S' };

  assert.equal(app.matchesPosFilter(noun, 'all'), true);
  assert.equal(app.matchesPosFilter(noun, 'noun'), true);
  assert.equal(app.matchesPosFilter(verb, 'noun'), false);
});

test('parsing filter specs only expose filters for selected language and drill family', () => {
  const app = loadAppParsingHelpers();

  const labels = (lang, family) => JSON.parse(JSON.stringify(app.parsingFilterSpecs(lang, family).map(f => f.label)));

  assert.deepEqual(labels('greek', 'all'), []);
  assert.deepEqual(labels('greek', 'nominals'), ['Case', 'Number', 'Gender']);
  assert.deepEqual(labels('greek', 'verbs'), ['Tense', 'Voice', 'Mood', 'Person/Number']);
  assert.deepEqual(labels('hebrew', 'nominals'), ['Gender', 'Number', 'State']);
  assert.deepEqual(labels('hebrew', 'verbs'), ['Stem', 'Form', 'Person/Gender/Number']);
});

test('dedicated parsing filters match family and language-specific details', () => {
  const app = loadAppParsingHelpers();
  const greekNoun = { word: 'λόγον', lang: 'greek', pos: 'noun', parse: 'N-ASM' };
  const greekVerb = { word: 'λέγει', lang: 'greek', pos: 'verb', parse: 'V-PAI-3S' };
  const hebrewNoun = { word: 'בֵּן', lang: 'hebrew', pos: 'noun', parse: 'N-MSA' };
  const hebrewVerb = { word: 'אָמַר', lang: 'hebrew', pos: 'verb', parse: 'V-QAL-PERF-3MS' };

  assert.equal(app.matchesParsingFilters(greekNoun, { family: 'nominals', details: { case: 'a', gender: 'm' } }), true);
  assert.equal(app.matchesParsingFilters(greekNoun, { family: 'nominals', details: { case: 'n' } }), false);
  assert.equal(app.matchesParsingFilters(greekVerb, { family: 'verbs', details: { tense: 'pres', mood: 'ind', person: '3s' } }), true);
  assert.equal(app.matchesParsingFilters(greekVerb, { family: 'nominals', details: {} }), false);
  assert.equal(app.matchesParsingFilters(hebrewNoun, { family: 'nominals', details: { state: 'a', number: 's' } }), true);
  assert.equal(app.matchesParsingFilters(hebrewVerb, { family: 'verbs', details: { stem: 'qal', form: 'perf', person: '3ms' } }), true);
});
