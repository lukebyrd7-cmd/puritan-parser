const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const library = require('../src/features/grammar/reference-data');

const allExamples = topic => [
  ...(topic.examples || []),
  ...(topic.sections || []).flatMap(section => section.examples || [])
];
const sectionTitles = topic => (topic.sections || []).map(section => section.title);
const sectionCharts = topic => (topic.sections || []).flatMap(section => section.charts || []);
const sectionTabLabels = topic => (topic.sectionTabs || []).map(tab => tab.label);
const sectionTabJumpLabels = topic => (topic.sectionTabs || []).flatMap(tab => (tab.jumpChips || []).map(chip => chip.label));
const sectionTabCharts = topic => (topic.sectionTabs || []).flatMap(tab => (tab.sections || []).flatMap(section => section.charts || []));

test('v3.6.3 reference content exposes few visible handbook destinations', () => {
  assert.deepEqual(
    library.referenceTopics.filter(t => t.language === 'greek').map(t => t.id),
    ['grammar-parsing-decoder','greek-pronouns','grammar-parsing-ambiguity','greek-nouns','greek-verbs','greek-adjectives','greek-prepositions']
  );
  assert.deepEqual(
    library.referenceTopics.filter(t => t.language === 'hebrew').map(t => t.id),
    ['hebrew-nouns','hebrew-verbs','hebrew-particles']
  );
  for (const topic of library.referenceTopics) {
    assert.ok(topic.id);
    assert.match(topic.language, /^(greek|hebrew)$/);
    assert.ok(topic.title);
    assert.ok(topic.category);
    assert.ok(topic.summary);
    assert.ok(Array.isArray(topic.body));
    assert.ok(Array.isArray(topic.charts));
    assert.ok(Array.isArray(topic.examples));
    assert.ok(Array.isArray(topic.related));
    assert.ok(Array.isArray(topic.recognitionTips), `${topic.id} missing recognition tips`);
  }
});

test('v3.6.3 Greek nouns consolidate article, declensions, endings, cases, and examples', () => {
  const nouns = library.getReferenceTopic('greek-nouns');
  for (const title of ['Article','First Declension','Second Declension','Third Declension','Case Endings','Case Uses','Recognition Tips','Common Patterns','Examples']) {
    assert.ok(sectionTitles(nouns).includes(title), `${title} section missing`);
  }
  assert.ok(sectionCharts(nouns).some(c => c.label === 'Greek article chart'));
  assert.ok(sectionCharts(nouns).some(c => c.label === 'Third declension basic endings'));
  assert.ok(sectionCharts(nouns).some(c => c.rows.some(r => r[0] === 'Vocative')));
  assert.ok(allExamples(nouns).some(e => e.word === 'σάρξ'));
});

test('v3.6.3 Greek verbs consolidate paradigms, explanation sections, non-finite forms, and special verbs', () => {
  const verbs = library.getReferenceTopic('greek-verbs');
  for (const title of ['Principal Parts','Present','Imperfect','Future','Aorist','Perfect','Voices','Moods','Non-Finite Forms','Contract Verbs','μι Verbs','Common Irregulars','Aspect','Recognition Tips','Examples']) {
    assert.ok(sectionTitles(verbs).includes(title), `${title} section missing`);
  }
  for (const removed of ['Recognition Cheat Sheet','Indicative Paradigms','Pluperfect']) {
    assert.equal(sectionTitles(verbs).includes(removed), false, `${removed} section should be removed`);
  }
  assert.deepEqual(verbs.principalParts, ['λύω','λύσω','ἔλυσα','λέλυκα','λέλυμαι','ἐλύθην']);
  assert.ok(sectionCharts(verbs).some(c => c.label === 'Aorist Passive Indicative'));
  assert.ok(sectionCharts(verbs).some(c => c.label === 'Participle quick index'));
  assert.ok(sectionCharts(verbs).some(c => c.label === 'Contract verb clues'));
  assert.ok(allExamples(verbs).some(e => e.word === 'ἐλύθησαν'));
});

test('v3.6.3d Greek verbs use recognition-first category tabs and jump chips', () => {
  const verbs = library.getReferenceTopic('greek-verbs');
  assert.deepEqual(sectionTabLabels(verbs), ['Paradigms','Concepts','Reference Material']);
  for (const label of ['Present','Imperfect','Future','Aorist','Perfect','Participles','Infinitives','Contract Verbs','μι Verbs','Irregular Verbs','Aspect','Voice','Augment','Reduplication','Principal Parts','Historical Present','Deponency','Recognition Notes']) {
    assert.ok(sectionTabJumpLabels(verbs).includes(label), `${label} jump chip missing`);
  }
  assert.ok(sectionTabCharts(verbs).some(c => c.label === 'Aorist Passive Indicative'));
  assert.ok(sectionTabCharts(verbs).some(c => c.label === 'Infinitive quick index'));
  assert.ok(sectionTabCharts(verbs).some(c => c.label === 'Participle quick index'));
  assert.ok(sectionTabCharts(verbs).some(c => c.label === 'Common μι verb anchors'));
});

test('v3.6.3 Greek adjectives, pronouns, and prepositions remain category pages', () => {
  const adjectives = library.getReferenceTopic('greek-adjectives');
  for (const title of ['Endings','Agreement','Comparative','Superlative','Examples']) {
    assert.ok(sectionTitles(adjectives).includes(title), `${title} section missing`);
  }
  assert.ok(sectionCharts(adjectives).some(c => c.label === 'Adjective endings'));
  assert.equal(library.getReferenceTopic('greek-pronouns').title, 'Pronouns');
  assert.ok(library.getReferenceTopic('greek-pronouns').charts.some(c => c.label === 'Demonstrative pronouns'));
  assert.ok(library.getReferenceTopic('greek-prepositions').charts.some(c => c.label === 'Common prepositions'));
});

test('v3.6.3 Hebrew nouns consolidate state, number, suffixes, article, and examples', () => {
  const nouns = library.getReferenceTopic('hebrew-nouns');
  for (const title of ['Construct State','Absolute State','Dual','Pronominal Suffixes','Article','Recognition Tips','Examples']) {
    assert.ok(sectionTitles(nouns).includes(title), `${title} section missing`);
  }
  assert.ok(sectionCharts(nouns).some(c => c.rows.some(r => r.includes('Construct state'))));
  assert.ok(sectionCharts(nouns).some(c => c.rows.some(r => r.includes('3ms'))));
  assert.ok(allExamples(nouns).some(e => e.word === 'דְּבַר יְהוָה'));
});

test('v3.6.3 Hebrew verbs consolidate strong paradigms, stems, weak verbs, aspect, and waw consecutive', () => {
  const verbs = library.getReferenceTopic('hebrew-verbs');
  for (const title of ['Strong Verb Paradigms','Perfect','Imperfect','Imperative','Infinitive Construct','Infinitive Absolute','Participle','Stems','Qal','Niphal','Piel','Pual','Hiphil','Hophal','Hitpael','Weak Verbs','I-Aleph','Aspect','Waw Consecutive','Recognition Tips','Examples']) {
    assert.ok(sectionTitles(verbs).includes(title), `${title} section missing`);
  }
  assert.equal(sectionTitles(verbs).includes('Recognition Cheat Sheet'), false);
  assert.ok(sectionCharts(verbs).some(c => c.label === 'Qal Perfect: כתב'));
  assert.ok(sectionCharts(verbs).some(c => c.label === 'Stem overview'));
  assert.ok(sectionCharts(verbs).some(c => c.label === 'Wayyiqtol clues'));
  assert.ok(allExamples(verbs).some(e => e.word === 'וַיֹּאמֶר'));
});

test('v3.6.3d Hebrew verbs use recognition-first category tabs and expanded weak verbs', () => {
  const verbs = library.getReferenceTopic('hebrew-verbs');
  assert.deepEqual(sectionTabLabels(verbs), ['Paradigms','Concepts','Reference Material']);
  for (const label of ['Strong Verbs','Stems','Weak Verbs','Participles','Infinitives','Imperatives','Aspect','Waw Consecutive','Volitives','Stem Meanings','Energic Nun','Sequential Use','Recognition Notes']) {
    assert.ok(sectionTabJumpLabels(verbs).includes(label), `${label} jump chip missing`);
  }
  for (const title of ['I-Aleph','I-Nun','Pe-Yod','Hollow','Geminate','III-He','Lamed-He']) {
    assert.ok(verbs.sectionTabs.flatMap(tab => tab.sections).some(section => section.title === title), `${title} weak verb section missing`);
  }
  assert.ok(sectionTabCharts(verbs).some(c => c.label === 'Qal Perfect: כתב'));
  assert.ok(sectionTabCharts(verbs).some(c => c.label === 'Stem overview'));
  assert.ok(sectionTabCharts(verbs).some(c => c.label === 'Wayyiqtol clues'));
});

test('v3.6.3d major grammar pages use Paradigms, Concepts, and Reference Material', () => {
  for (const id of ['greek-nouns','greek-verbs','greek-adjectives','hebrew-nouns','hebrew-verbs']) {
    assert.deepEqual(sectionTabLabels(library.getReferenceTopic(id)), ['Paradigms','Concepts','Reference Material'], `${id} category tabs`);
  }
  assert.equal(library.searchReferenceTopics('cheat sheet', 'greek').length, 0);
});

test('old handbook ids resolve as redirects to consolidated destinations', () => {
  const aliases = {
    'greek-logos-paradigm':'greek-nouns',
    'greek-noun-endings':'greek-nouns',
    'greek-third-declension-basics':'greek-nouns',
    'greek-articles':'greek-nouns',
    'greek-lyo-paradigm':'greek-verbs',
    'greek-participles':'greek-verbs',
    'greek-contract-verbs':'greek-verbs',
    'greek-kalos-paradigm':'greek-adjectives',
    'hebrew-qal':'hebrew-verbs',
    'hebrew-hiphil':'hebrew-verbs',
    'hebrew-wayyiqtol':'hebrew-verbs',
    'hebrew-construct-chains':'hebrew-nouns',
    'hebrew-pronominal-suffixes':'hebrew-nouns'
  };
  for (const [oldId, newId] of Object.entries(aliases)) {
    assert.equal(library.getReferenceTopic(oldId).id, newId, `${oldId} should resolve to ${newId}`);
    assert.equal(library.canonicalTopicId(oldId), newId);
  }
});

test('search preserves old terms while returning consolidated pages', () => {
  const expected = {
    greek: {
      'third declension':'greek-nouns',
      'noun endings':'greek-nouns',
      'article endings':'greek-nouns',
      'case uses':'greek-nouns',
      'contract verbs':'greek-verbs',
      'participles':'greek-verbs',
      'infinitives':'greek-verbs',
      'mi verbs':'greek-verbs',
      'δίδωμι':'greek-verbs',
      'aorist passive indicative':'greek-verbs',
      'adjective endings':'greek-adjectives',
      'comparative':'greek-adjectives'
    },
    hebrew: {
      'waw consecutive':'hebrew-verbs',
      'wayyiqtol':'hebrew-verbs',
      'Qal paradigms':'hebrew-verbs',
      'weak verbs':'hebrew-verbs',
      'I-Nun':'hebrew-verbs',
      'construct chains':'hebrew-nouns',
      'dual forms':'hebrew-nouns',
      'pronominal suffixes':'hebrew-nouns'
    }
  };
  for (const [query, id] of Object.entries(expected.greek)) {
    assert.equal(library.searchReferenceTopics(query, 'greek').some(t => t.id === id), true, `No Greek result for ${query}`);
  }
  for (const [query, id] of Object.entries(expected.hebrew)) {
    assert.equal(library.searchReferenceTopics(query, 'hebrew').some(t => t.id === id), true, `No Hebrew result for ${query}`);
  }
  assert.equal(library.searchReferenceTopics('ἐλύθησαν', 'greek').some(t => t.id === 'greek-verbs'), true);
  assert.equal(library.searchReferenceTopics('וַיֹּאמֶר', 'hebrew').some(t => t.id === 'hebrew-verbs'), true);
});

test('search remains accent-insensitive and includes examples, charts, and principal parts', () => {
  assert.equal(library.searchReferenceTopics('λυω', 'greek').some(t => t.id === 'greek-verbs'), true);
  assert.equal(library.searchReferenceTopics('λύω', 'greek').some(t => t.id === 'greek-verbs'), true);
  assert.equal(library.searchReferenceTopics('λογος', 'greek').some(t => t.id === 'greek-nouns'), true);
  assert.equal(library.searchReferenceTopics('λόγος', 'greek').some(t => t.id === 'greek-nouns'), true);
  assert.equal(library.searchReferenceTopics('John 8:32', 'greek').some(t => t.id === 'greek-verbs'), true);
  assert.equal(library.searchReferenceTopics('representative paradigm', 'hebrew').some(t => t.id === 'hebrew-verbs'), true);
});

test('decoder entries still route through canonical consolidated topics', () => {
  assert.equal(library.decodeParsing('V-AAI-1P').examples.includes('ἐλύσαμεν'), true);
  assert.equal(library.getReferenceTopic(library.decodeParsing('V-AAI-1P').related[0]).id, 'greek-verbs');
  assert.equal(library.getReferenceTopic(library.decodeParsing('Hiphil Imperfect 2mp').related[0]).id, 'hebrew-verbs');
});

test('app shell includes reference controls and section rendering support', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  const main = fs.readFileSync('src/main.js', 'utf8');
  const ui = fs.readFileSync(path.join(__dirname, '../src/features/grammar/index.js'), 'utf8');
  assert.match(html, /id="referenceSearchInput"/);
  assert.match(html, /id="referenceLanguageFilter"/);
  assert.match(html, /id="referenceTopicList"/);
  assert.match(html, /id="referencePage"/);
  assert.match(main, /src\/features\/grammar\/reference-data\.js/);
  assert.match(main, /src\/features\/grammar\/index\.js/);
  assert.match(ui, /renderReferenceSection/);
  assert.match(ui, /renderSectionTabs/);
  assert.match(ui, /reference-jump-chip/);
  assert.match(ui, /reference-section-tab-panel/);
  assert.match(ui, /referenceSectionTabScrollPositions/);
  assert.match(ui, /canonicalTopicId/);
});

test('v3.6.3a grammar styling uses theme colors instead of artificial categories', () => {
  const css = fs.readFileSync('styles.css', 'utf8');
  const ui = fs.readFileSync(path.join(__dirname, '../src/features/grammar/index.js'), 'utf8');
  assert.doesNotMatch(css, /reference-color-(blue|green|purple|orange|amber|red|teal|tense|voice|mood|qal|niphal|piel|pual|hiphil|hophal|hitpael)/);
  assert.doesNotMatch(ui, /referenceColorClass/);
  assert.equal(Object.keys(library.referenceColors).length, 0);
});

function renderGrammarHomeFor(language) {
  const vm = require('node:vm');
  const ui = fs.readFileSync(path.join(__dirname, '../src/features/grammar/index.js'), 'utf8');
  const context = {
    PuritanReferenceLibrary: library,
    state: { lang: language },
    document: {},
    localStorage: { getItem: () => null, setItem: () => {} },
    $: selector => selector === '#referenceLanguageFilter' ? { value: language } : null,
    $$: () => [],
    debounce: fn => fn
  };
  vm.createContext(context);
  vm.runInContext(`${ui}; this.__renderedGrammarHome = renderGrammarHome();`, context);
  return context.__renderedGrammarHome;
}

test('v3.6.3e rendered Grammar Home is a simple table of contents', () => {
  const greek = renderGrammarHomeFor('greek');
  assert.match(greek, /<nav class="grammar-home" aria-label="Grammar handbook contents">/);
  assert.match(greek, /<h2>Greek<\/h2>[\s\S]*>Verbs<[\s\S]*>Nouns<[\s\S]*>Adjectives<[\s\S]*>Pronouns<[\s\S]*>Prepositions</);
  assert.match(greek, /<h2>Hebrew<\/h2>[\s\S]*>Verbs<[\s\S]*>Nouns<[\s\S]*>Particles</);
  for (const removed of ['Recently Visited','Recently Viewed','Favorites','Supporting Material','Supporting Reference','Start Here','Cheat Sheets','Featured Topics','Parsing Guide','Grammar Pages','Contract Verbs','Case Endings']) {
    assert.doesNotMatch(greek, new RegExp(`>${removed}<`), `${removed} should not appear on Grammar Home`);
  }
  assert.doesNotMatch(greek, /reference-card|reference-card-grid|reference-lang-chip|reference-segmented/);

  const hebrew = renderGrammarHomeFor('hebrew');
  assert.equal(hebrew, greek);
});

test('v3.6.3d service worker cache version and app shell cache bust are bumped', () => {
  const sw = fs.readFileSync('sw.js', 'utf8');
  const html = fs.readFileSync('index.html', 'utf8');
  assert.match(sw, /const CACHE = 'puritan-parser-v16-grammar-navigation-polish'/);
  assert.doesNotMatch(sw, /puritan-parser-v13-reader-startup/);
  assert.match(html, /src="src\/main\.js\?v=v3\.6\.3d-grammar-navigation-polish"/);
});
