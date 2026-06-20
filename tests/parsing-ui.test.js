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
  [
    'src/app-state.js',
    'src/ui/dom.js',
    'src/core/filters.js',
    'src/features/vocab/index.js',
    'src/features/parsing/index.js'
  ].forEach(file => vm.runInContext(fs.readFileSync(file, 'utf8').replace(/\ninit\(\);\s*$/, '\n'), context));
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

test('Greek number parsing controls only expose singular and plural', () => {
  const app = loadAppParsingHelpers();
  const greekNoun = { parse: 'N-ASM', lang: 'greek', pos: 'noun' };
  const greekParticiple = { parse: 'V-PAP-NSM', lang: 'greek', pos: 'verb' };

  const greekNominalNumberSpec = app.parsingFilterSpecs('greek', 'nominals').find(f => f.id === 'number');
  assert.deepEqual(JSON.parse(JSON.stringify(greekNominalNumberSpec.options)), ['s', 'p']);

  const nounNumberField = app.getParsingFields(greekNoun).find(f => f.id === 'number');
  assert.deepEqual(JSON.parse(JSON.stringify(nounNumberField.opts.map(o => o.value))), ['s', 'p']);

  const participleNumberField = app.getParsingFields(greekParticiple).find(f => f.id === 'number');
  assert.deepEqual(JSON.parse(JSON.stringify(participleNumberField.opts.map(o => o.value))), ['s', 'p']);
  assert.equal(app.formatParsingValue('number', 'd'), 'dual');
});

test('Hebrew number filters keep dual where appropriate and Hebrew details match', () => {
  const app = loadAppParsingHelpers();
  const hebrewNoun = { word: 'יָדַיִם', lang: 'hebrew', pos: 'noun', parse: 'N-FDA' };

  const hebrewNominalNumberSpec = app.parsingFilterSpecs('hebrew', 'nominals').find(f => f.id === 'number');
  assert.deepEqual(JSON.parse(JSON.stringify(hebrewNominalNumberSpec.options)), ['s', 'p', 'd']);

  const nounNumberField = app.getParsingFields(hebrewNoun).find(f => f.id === 'number');
  assert.deepEqual(JSON.parse(JSON.stringify(nounNumberField.opts.map(o => o.value))), ['s', 'p', 'd']);
  assert.equal(app.matchesParsingFilters(hebrewNoun, { family: 'nominals', details: { number: 'd', state: 'a' } }), true);
});

test('language-specific parsing details do not leak across languages', () => {
  const app = loadAppParsingHelpers();
  const greekNoun = { word: 'λόγον', lang: 'greek', pos: 'noun', parse: 'N-ASM' };
  const hebrewNoun = { word: 'בֵּן', lang: 'hebrew', pos: 'noun', parse: 'N-MSA' };

  assert.equal(app.matchesParsingFilters(hebrewNoun, { family: 'nominals', details: { case: 'a', state: 'a' } }), true);
  assert.equal(app.matchesParsingFilters(greekNoun, { family: 'nominals', details: { state: 'a', case: 'a' } }), true);
  assert.equal(app.matchesParsingFilters(hebrewNoun, { family: 'nominals', details: { case: 'n', state: 'a' } }), true);
});

test('switching languages clears parsing detail selections', () => {
  const app = loadAppParsingHelpers();

  vm.runInContext(`
    renderList = () => {};
    updateDueBadge = () => {};
    updatePosOptions = () => {};
    state.parsingFilters = { family: 'nominals', details: { case: 'a', number: 'p' } };
    setLang('hebrew');
  `, app);

  const filters = vm.runInContext('JSON.parse(JSON.stringify(state.parsingFilters))', app);
  assert.deepEqual(JSON.parse(JSON.stringify(filters)), { family: 'nominals', details: {} });
});

test('parsing filter UI rebuilds with language-specific titles and groups', () => {
  const app = loadAppParsingHelpers();

  const result = vm.runInContext(`
    const titleEl = { textContent: '' };
    const familyEl = { value: 'nominals' };
    const detailEl = { innerHTML: '' };
    document.querySelector = selector => {
      if(selector === '.parsing-filters-title') return titleEl;
      if(selector === '#parsingFamilySelect') return familyEl;
      if(selector === '#parsingDetailFilters') return detailEl;
      return null;
    };
    document.querySelectorAll = selector => selector === '.parsing-filter-select' ? [] : [];
    state.lang = 'hebrew';
    state.parsingFilters = { family: 'nominals', details: { case: 'a' } };
    updateParsingFilterOptions();
    JSON.stringify({ title: titleEl.textContent, html: detailEl.innerHTML, filters: state.parsingFilters });
  `, app);

  const parsed = JSON.parse(result);
  assert.equal(parsed.title, 'Hebrew Parsing Filters');
  assert.match(parsed.html, /Hebrew Nominal Filters/);
  assert.doesNotMatch(parsed.html, /Case/);
  assert.match(parsed.html, /State/);
  assert.deepEqual(parsed.filters, { family: 'nominals', details: {} });
});

test('parsing pool receives raw form entries even when lemma study mode is enabled', () => {
  const app = loadAppParsingHelpers();

  const result = vm.runInContext(`
    state.prefs.studyMode = 'lemma';
    state.lang = 'greek';
    state.filters = { query: '', minFreq: 1, maxFreq: 9999, dueOnly: false, pos: 'all' };
    state.data.greek = [
      { word: 'λόγος', lemma: 'λόγος', lang: 'greek', pos: 'noun', parse: 'N-NSM', freq: 10, due: '2000-01-01', parsing: { streak: 0 } },
      { word: 'λόγον', lemma: 'λόγος', lang: 'greek', pos: 'noun', parse: 'N-ASM', freq: 9, due: '2000-01-01', parsing: { streak: 0 } }
    ];
    document.querySelector = selector => {
      if(selector === '#parsingMode') return { value: 'mixed' };
      if(selector === '#posFilterSelect') return { value: 'all' };
      if(selector === '#freqMin') return { value: '1' };
      if(selector === '#freqMax') return { value: '9999' };
      if(selector === '#dueOnlyToggle') return { checked: false };
      if(selector === '#parsingFamilySelect') return { value: 'all' };
      return null;
    };
    JSON.stringify(parsingPool().map(entry => entry.word));
  `, app);

  assert.deepEqual(JSON.parse(result), ['λόγος', 'λόγον']);
});
