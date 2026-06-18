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

test('grammar filter helpers combine part of speech and feature filters', () => {
  const app = loadAppParsingHelpers();
  const noun = { word: 'λόγον', lang: 'greek', pos: 'noun', parse: 'N-ASM' };
  const verb = { word: 'λέγει', lang: 'greek', pos: 'verb', parse: 'V-PAI-3S' };

  assert.equal(app.matchesGrammarFilters(noun, { pos: 'pos:noun', details: { Case: 'detail:accusative' } }), true);
  assert.equal(app.matchesGrammarFilters(noun, { pos: 'pos:noun', details: { Case: 'detail:nominative' } }), false);
  assert.equal(app.matchesGrammarFilters(verb, { pos: 'pos:verb', details: { Mood: 'detail:indicative', Voice: 'detail:active' } }), true);
  assert.equal(app.matchesGrammarFilters(verb, { pos: 'pos:verb', details: { Voice: 'detail:passive' } }), false);
});
