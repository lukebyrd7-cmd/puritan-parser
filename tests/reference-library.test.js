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

test('v1.3.2 reference content exposes paradigm-first destinations', () => {
  assert.deepEqual(
    library.referenceTopics.filter(t => t.language === 'greek').map(t => t.id),
    ['greek-paradigm-charts','greek-grammar-handbook','greek-verbs','greek-nouns','greek-pronouns','greek-adjectives']
  );
  assert.deepEqual(
    library.referenceTopics.filter(t => t.language === 'hebrew').map(t => t.id),
    ['hebrew-paradigm-charts','hebrew-grammar-handbook','hebrew-verbs','hebrew-nouns']
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

test('v1.3.2 Reference landing is organized around two primary destinations', () => {
  for (const language of ['greek', 'hebrew']) {
    const sections = library.referenceLandingSections(language);
    assert.deepEqual(sections.map(section => section.title), ['Reference']);
    assert.deepEqual(sections[0].entries.map(entry => entry.label), ['Paradigm Charts', 'Grammar Handbook']);
    assert.equal(sections[0].entries[0].featured, true);
    assert.doesNotMatch(sections.flatMap(section => section.entries).map(entry => entry.label).join(' '), /Supplemental Reference|Additional Tools|Morphology Guide|Quick Reference|Reading Helps|Parsing Abbreviations/);
    for (const entry of sections.flatMap(section => section.entries)) {
      assert.ok(library.getReferenceTopic(entry.id), `${entry.id} should resolve`);
    }
  }
});



test('v1.3 removed Reference routes redirect calmly to current destinations', () => {
  assert.equal(library.getReferenceTopic('greek-quick-reference').id, 'greek-grammar-handbook');
  assert.equal(library.getReferenceTopic('hebrew-quick-reference').id, 'hebrew-grammar-handbook');
  assert.equal(library.getReferenceTopic('greek-reading-helps').id, 'greek-grammar-handbook');
  assert.equal(library.getReferenceTopic('hebrew-reading-helps').id, 'hebrew-grammar-handbook');
  assert.equal(library.getReferenceTopic('grammar-parsing-decoder').id, 'greek-grammar-handbook');
  assert.equal(library.getReferenceTopic('greek-morphology-guide').id, 'greek-grammar-handbook');
  assert.equal(library.getReferenceTopic('hebrew-morphology-guide').id, 'hebrew-grammar-handbook');
});

test('v5.5 Reference pages remain consultative rather than progress-based', () => {
  const referenceText = library.referenceTopics.map(topic => [
    topic.title,
    topic.summary,
    ...(topic.body || []),
    ...(topic.searchTerms || [])
  ].join(' ')).join(' ');
  assert.doesNotMatch(referenceText, /completion percentage|streak|achievement|continue where you left off/i);
});

test('v4.2.5 paradigm source groups are reusable for future recognition practice', () => {
  const greek = library.referenceParadigmGroups('greek').map(group => group.topicId);
  const hebrew = library.referenceParadigmGroups('hebrew').map(group => group.topicId);
  assert.deepEqual(greek.slice(0, 2), ['greek-verbs', 'greek-nouns']);
  assert.deepEqual(hebrew.slice(0, 2), ['hebrew-verbs', 'hebrew-nouns']);
  const hebrewVerbs = library.referenceParadigmGroups('hebrew').find(group => group.topicId === 'hebrew-verbs');
  assert.deepEqual(hebrewVerbs.sections.slice(0, 4).map(section => section.title), ['Strong Verb Paradigms','Stems','Qal','Niphal']);
  assert.ok(library.futureGrammarHooks.some(hook => hook.id === 'paradigm-recognition-source' && hook.source === 'referenceTopics'));
});

test('v3.6.3 Greek nouns consolidate article, declensions, endings, cases, and examples', () => {
  const nouns = library.getReferenceTopic('greek-nouns');
  for (const title of ['Article','First Declension','Second Declension','Third Declension','Case Endings','Case Uses','Recognition Tips','Common Patterns','Examples']) {
    assert.ok(sectionTitles(nouns).includes(title), `${title} section missing`);
  }
  assert.ok(sectionCharts(nouns).some(c => c.label === 'Greek article chart'));
  assert.ok(sectionCharts(nouns).some(c => c.label === 'Third-declension guttural stems: νύξ and σάρξ'));
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
  assert.ok(sectionCharts(verbs).some(c => c.label === 'τιμάω present active indicative'));
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
  assert.ok(sectionTabCharts(verbs).some(c => c.label === 'δίδωμι present active indicative'));
});

test('v3.6.3 Greek adjectives, pronouns, and prepositions remain category pages', () => {
  const adjectives = library.getReferenceTopic('greek-adjectives');
  for (const title of ['Endings','Agreement','Comparative','Superlative','Examples']) {
    assert.ok(sectionTitles(adjectives).includes(title), `${title} section missing`);
  }
  assert.ok(sectionCharts(adjectives).some(c => c.label === 'Adjective endings'));
  assert.equal(library.getReferenceTopic('greek-pronouns').title, 'Pronouns');
  assert.ok(library.getReferenceTopic('greek-pronouns').charts.some(c => c.label === 'Demonstrative pronoun: οὗτος, αὕτη, τοῦτο'));
  assert.equal(library.getReferenceTopic('greek-prepositions').id, 'greek-grammar-handbook');
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
  assert.ok(sectionCharts(verbs).some(c => c.label === 'Qal perfect — קטל'));
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
  assert.ok(sectionTabCharts(verbs).some(c => c.label === 'Qal perfect — קטל'));
  assert.ok(sectionTabCharts(verbs).some(c => c.label === 'Stem overview'));
  assert.ok(sectionTabCharts(verbs).some(c => c.label === 'Wayyiqtol clues'));
});

test('v4.2.5 Hebrew non-Qal paradigms do not reuse Qal non-finite and participle forms', () => {
  const verbs = library.getReferenceTopic('hebrew-verbs');
  const paradigmCharts = verbs.sectionTabs.find(tab => tab.id === 'paradigms').sections.flatMap(section => section.charts || []);
  const chartRows = label => paradigmCharts.find(chart => chart.label === label)?.rows || [];
  assert.deepEqual(chartRows('Hiphil imperative — קטל').map(row => row[3]), ['הַקְטֵל','הַקְטִילִי','הַקְטִילוּ','הַקְטֵלְנָה']);
  assert.deepEqual(chartRows('Hitpael participle anchor — קטל').map(row => row[4]), ['מִתְקַטֵּל']);
  assert.equal(paradigmCharts.some(chart => chart.label === 'Pual infinitive construct — קטל'), false);
  assert.notEqual(chartRows('Niphal participle anchor — קטל')[0][4], 'קֹטֵל');
});

test('v4.2.5B Hebrew stem summary charts use the same stem-specific source rows as the paradigm tabs', () => {
  const verbs = library.getReferenceTopic('hebrew-verbs');
  const paradigmCharts = verbs.sectionTabs.find(tab => tab.id === 'paradigms').sections.flatMap(section => section.charts || []);
  const chartRows = label => paradigmCharts.find(chart => chart.label === label)?.rows || [];
  assert.equal(chartRows('Niphal representative paradigm: קטל').find(row => row[0] === 'Imperative')[1], 'הִקָּטֵל');
  assert.equal(chartRows('Piel representative paradigm: קטל').find(row => row[0] === 'Participle')[1], 'מְקַטֵּל');
  assert.equal(chartRows('Hiphil representative paradigm: קטל').find(row => row[0] === 'Infinitive Construct')[1], 'הַקְטִיל');
  assert.equal(chartRows('Pual representative paradigm: קטל').find(row => row[0] === 'Imperative')[1].label, 'Not supplied');
});

test('v4.2.5B Greek participle detail rows use real declension forms, not suffix guesses', () => {
  const verbs = library.getReferenceTopic('greek-verbs');
  const paradigmCharts = verbs.sectionTabs.find(tab => tab.id === 'paradigms').sections.flatMap(section => section.charts || []);
  const chartRows = label => paradigmCharts.find(chart => chart.label === label)?.rows || [];
  assert.deepEqual(chartRows('Present Middle/Passive Participle')[1], ['Gen sg','λυομένου','λυομένης','λυομένου']);
  assert.deepEqual(chartRows('Aorist Active Participle')[1], ['Gen sg','λύσαντος','λυσάσης','λύσαντος']);
  assert.deepEqual(chartRows('Aorist Passive Participle').find(row => row[0] === 'Nom pl'), ['Nom pl','λυθέντες','λυθεῖσαι','λυθέντα']);
  assert.deepEqual(chartRows('Perfect Active Participle')[1], ['Gen sg','λελυκότος','λελυκυίας','λελυκότος']);
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
      'Grammar Handbook':'greek-grammar-handbook',
      'Paradigm Charts':'greek-paradigm-charts',
      'Morphology Guide':'greek-grammar-handbook',
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
      'Grammar Handbook':'hebrew-grammar-handbook',
      'Paradigm Charts':'hebrew-paradigm-charts',
      'Morphology Guide':'hebrew-grammar-handbook',
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
  const vocab = fs.readFileSync(path.join(__dirname, '../src/features/vocab/index.js'), 'utf8');
  assert.match(html, /id="referenceSearchInput"/);
  assert.match(html, /id="referenceLanguageSelect"/);
  assert.match(html, /aria-label="Reference language"/);
  assert.match(html, /id="referenceTopicList"/);
  assert.match(html, /id="referencePage"/);
  assert.match(main, /src\/features\/grammar\/reference-data\.js/);
  assert.match(main, /src\/features\/grammar\/index\.js/);
  assert.match(ui, /setReferenceLanguage/);
  assert.match(ui, /referenceLanguageSelect/);
  assert.doesNotMatch(vocab, /state\.currentView==='grammarView'[\s\S]*renderReferenceLibrary\(\)/);
  assert.doesNotMatch(vocab, /setReferenceLanguage/);
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
    $: () => null,
    $$: () => [],
    debounce: fn => fn
  };
  vm.createContext(context);
  vm.runInContext(`${ui}; this.__renderedGrammarHome = renderGrammarHome();`, context);
  return context.__renderedGrammarHome;
}

function renderGrammarHomeAfterLocalSelection(initialLanguage, selectedLanguage) {
  const vm = require('node:vm');
  const ui = fs.readFileSync(path.join(__dirname, '../src/features/grammar/index.js'), 'utf8');
  const context = {
    PuritanReferenceLibrary: library,
    state: { lang: initialLanguage },
    document: {},
    localStorage: { getItem: () => null, setItem: () => {} },
    $: () => null,
    $$: () => [],
    debounce: fn => fn
  };
  vm.createContext(context);
  vm.runInContext(`${ui}; setReferenceLanguage('${selectedLanguage}', { render: false }); this.__renderedGrammarHome = renderGrammarHome();`, context);
  return context.__renderedGrammarHome;
}

test('v1.3 Reference local language selector controls handbook home language', () => {
  const greek = renderGrammarHomeFor('greek');
  assert.match(greek, /<nav class="grammar-home" aria-label="Reference contents">/);
  assert.match(greek, /<section class="grammar-home-language"><h2>Greek<\/h2>[\s\S]*<h2>Reference<\/h2>[\s\S]*grammar-toc-featured[\s\S]*>Paradigm Charts<[\s\S]*>Grammar Handbook</);
  assert.doesNotMatch(greek, /<h2>Hebrew<\/h2>/);
  assert.doesNotMatch(greek, />Particles</);

  const hebrew = renderGrammarHomeFor('hebrew');
  assert.match(hebrew, /<section class="grammar-home-language"><h2>Hebrew<\/h2>[\s\S]*<h2>Reference<\/h2>[\s\S]*grammar-toc-featured[\s\S]*>Paradigm Charts<[\s\S]*>Grammar Handbook/);
  assert.doesNotMatch(hebrew, /<h2>Greek<\/h2>/);
  assert.doesNotMatch(hebrew, />Articles</);
  assert.doesNotMatch(hebrew, />Pronouns</);

  for (const removed of ['Quick Reference','Reading Helps','Parsing Abbreviations','Recently Visited','Recently Viewed','Favorites','Supporting Material','Supporting Reference','Start Here','Cheat Sheets','Featured Topics','Grammar Pages','Contract Verbs','Case Endings']) {
    assert.doesNotMatch(greek, new RegExp(`>${removed}<`), `${removed} should not appear on Grammar Home`);
    assert.doesNotMatch(hebrew, new RegExp(`>${removed}<`), `${removed} should not appear on Grammar Home`);
  }
  assert.doesNotMatch(greek, /reference-card|reference-card-grid|reference-lang-chip|reference-segmented/);
  assert.doesNotMatch(hebrew, /reference-card|reference-card-grid|reference-lang-chip|reference-segmented/);
});

test('Reference local language selection is independent of global app language', () => {
  const hebrew = renderGrammarHomeAfterLocalSelection('greek', 'hebrew');
  assert.match(hebrew, /<section class="grammar-home-language"><h2>Hebrew<\/h2>/);
  assert.doesNotMatch(hebrew, /<h2>Greek<\/h2>/);

  const greek = renderGrammarHomeAfterLocalSelection('hebrew', 'greek');
  assert.match(greek, /<section class="grammar-home-language"><h2>Greek<\/h2>/);
  assert.doesNotMatch(greek, /<h2>Hebrew<\/h2>/);
});



test('v1.3.7 Grammar Handbook and Paradigm Charts expose compact internal navigation', () => {
  const vm = require('node:vm');
  const ui = fs.readFileSync(path.join(__dirname, '../src/features/grammar/index.js'), 'utf8');
  const page = { innerHTML: '', classList: { toggle(){} }, addEventListener(){} };
  const context = {
    PuritanReferenceLibrary: library,
    state: { lang: 'greek' },
    document: {},
    localStorage: { getItem: () => null, setItem: () => {} },
    $: selector => selector === '#referencePage' ? page : null,
    $$: () => [],
    debounce: fn => fn
  };
  vm.createContext(context);
  vm.runInContext(`${ui}; renderReferenceTopic(PuritanReferenceLibrary.getReferenceTopic('greek-grammar-handbook'));`, context);
  assert.match(page.innerHTML, /id="handbookSectionFilter"/);
  assert.match(page.innerHTML, /id="handbookArticleSearch"/);
  assert.match(page.innerHTML, /aria-label="Grammar Handbook articles"/);
  assert.match(page.innerHTML, /data-handbook-article-id="greek-cases-agreement"/);
  vm.runInContext(`renderReferenceTopic(PuritanReferenceLibrary.getReferenceTopic('greek-paradigm-charts'));`, context);
  assert.match(page.innerHTML, /aria-label="Topic sections"/);
  assert.match(page.innerHTML, /href="#present"/);
  assert.doesNotMatch(page.innerHTML, />Noun Declensions<[\s\S]*>Article<[\s\S]*>Pronouns</);
  assert.doesNotMatch(page.innerHTML, />Common prepositions</);
});

test('Reference Search results render immediately under the search controls with count and empty state', () => {
  const vm = require('node:vm');
  const ui = fs.readFileSync(path.join(__dirname, '../src/features/grammar/index.js'), 'utf8');
  const makeElement = (attrs = {}) => ({
    ...attrs,
    innerHTML: '',
    classList: { toggle(){} },
    addEventListener(){},
    querySelectorAll: () => []
  });
  const searchInput = makeElement({ value: 'verb' });
  const searchResults = makeElement();
  const topicList = makeElement();
  const referencePage = makeElement();
  const elements = {
    '#referenceSearchInput': searchInput,
    '#referenceSearchResults': searchResults,
    '#referenceTopicList': topicList,
    '#referencePage': referencePage
  };
  const context = {
    PuritanReferenceLibrary: library,
    state: { lang: 'greek' },
    document: {},
    localStorage: { getItem: () => null, setItem: () => {} },
    $: selector => elements[selector] || null,
    $$: () => [],
    debounce: fn => fn
  };
  vm.createContext(context);
  vm.runInContext(`${ui}; renderReferenceLibrary();`, context);
  assert.match(searchResults.innerHTML, /Reference Search · \d+ results/);
  assert.match(searchResults.innerHTML, /reference-topic-btn/);
  assert.match(topicList.innerHTML, /<nav class="grammar-home"/);

  searchInput.value = 'zzzz-no-topic';
  vm.runInContext('renderReferenceLibrary();', context);
  assert.match(searchResults.innerHTML, /Reference Search · 0 results/);
  assert.match(searchResults.innerHTML, /No reference topics match “zzzz-no-topic.”/);

  searchInput.value = '';
  vm.runInContext('renderReferenceLibrary();', context);
  assert.equal(searchResults.innerHTML, '');
});

test('service worker cache version and app shell cache bust are bumped', () => {
  const sw = fs.readFileSync('sw.js', 'utf8');
  const html = fs.readFileSync('index.html', 'utf8');
  assert.match(sw, /const CACHE = 'puritan-parser-v104-v1\.9-unified-glosses-data-trust'/);
  assert.doesNotMatch(sw, /puritan-parser-v39-v1\.4\.1/);
  assert.doesNotMatch(sw, /puritan-parser-v13-reader-startup/);
  assert.match(sw, /'\.\/src\/features\/reader\/index\.js'/);
  assert.match(sw, /'\.\/src\/features\/grammar\/handbook-data\.js'/);
  assert.match(sw, /caches\.delete\(k\)/);
  assert.match(sw, /self\.clients\.claim\(\)/);
  assert.match(html, /src="\/src\/main\.js\?v=v1\.9-unified-glosses-data-trust-8"/);
});
