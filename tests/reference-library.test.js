const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const library = require('../src/features/grammar/reference-data');

test('reference content loads with upgraded model fields', () => {
  assert.ok(Array.isArray(library.referenceTopics));
  assert.ok(library.referenceTopics.length >= 25);
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

test('Greek paradigm and cheat-sheet topics are present', () => {
  for (const id of ['greek-lyo-paradigm', 'greek-logos-paradigm', 'greek-kalos-paradigm', 'greek-noun-endings', 'greek-verb-endings', 'greek-common-parsing-clues']) {
    assert.ok(library.getReferenceTopic(id), `${id} missing`);
  }
  assert.deepEqual(library.getReferenceTopic('greek-lyo-paradigm').principalParts, ['λύω','λύσω','ἔλυσα','λέλυκα','λέλυμαι','ἐλύθην']);
});

test('Hebrew full stem paradigm pages are present', () => {
  for (const stem of ['qal','niphal','piel','pual','hiphil','hophal','hitpael']) {
    const topic = library.getReferenceTopic(`hebrew-${stem}`);
    assert.ok(topic, `${stem} missing`);
    assert.ok(topic.stemRelationships, `${stem} missing stem relationships`);
    assert.ok(topic.charts.some(c => c.label.includes('representative paradigm')));
    for (const form of ['Perfect', 'Imperfect', 'Imperative', 'Infinitive Construct', 'Infinitive Absolute', 'Participle']) {
      assert.equal(topic.charts.some(c => c.rows.flat().includes(form)), true, `${stem} missing ${form}`);
    }
  }
});

test('examples store word, reference, and translation', () => {
  const examples = library.referenceTopics.flatMap(t => t.examples);
  assert.ok(examples.some(e => e.word === 'λύω' && e.reference === 'John 8:32'));
  assert.ok(examples.some(e => e.word === 'λέγω' && e.reference === 'Matthew 5:37'));
  assert.ok(examples.some(e => e.word === 'אָמַר' && e.reference === 'Genesis 1:3'));
  assert.ok(examples.some(e => e.word === 'כתב' && e.reference === 'Jeremiah 36:2'));
  for (const example of examples) {
    assert.ok(example.word || example.text);
    assert.ok(example.reference || example.note);
    assert.ok(example.translation || example.note);
  }
});

test('related reference topic links resolve', () => {
  for (const topic of library.referenceTopics) {
    for (const relatedId of topic.related) {
      assert.ok(library.getReferenceTopic(relatedId), `${topic.id} related topic missing: ${relatedId}`);
    }
  }
});

test('search covers tips, examples, chart labels, principal parts, references, and related topics', () => {
  assert.equal(library.searchReferenceTopics('ουσι', 'greek').some(t => t.id === 'greek-verb-endings'), true);
  assert.equal(library.searchReferenceTopics('John 8:32', 'greek').some(t => t.id === 'greek-lyo-paradigm'), true);
  assert.equal(library.searchReferenceTopics('λέλυμαι', 'greek').some(t => t.id === 'greek-lyo-paradigm'), true);
  assert.equal(library.searchReferenceTopics('representative paradigm', 'hebrew').some(t => t.id === 'hebrew-qal'), true);
  assert.equal(library.searchReferenceTopics('wayyiqtol', 'hebrew').some(t => t.id === 'hebrew-prefixes'), true);
  assert.equal(library.searchReferenceTopics('Niphal', 'hebrew').some(t => t.id === 'hebrew-qal'), true);
});

test('chart rendering data supports labels, notes, and color coding', () => {
  const h = library.getReferenceTopic('hebrew-hiphil');
  assert.equal(h.color, 'hiphil');
  assert.equal(h.charts.some(c => c.color === 'hiphil' && c.note), true);
  const g = library.getReferenceTopic('greek-tense-explanations');
  assert.equal(g.color, 'tense');
  assert.equal(g.charts.some(c => c.label && c.columns.length && c.rows.length), true);
});

test('feature links are lightweight hook metadata', () => {
  const topic = library.getReferenceTopic('hebrew-hiphil');
  assert.ok(topic.featureLinks.some(link => link.label === 'See words with this feature'));
  assert.ok(topic.featureLinks.every(link => link.type && link.target));
});

test('app shell includes reference controls and startup modules', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  const main = fs.readFileSync('src/main.js', 'utf8');
  assert.match(html, /id="referenceSearchInput"/);
  assert.match(html, /id="referenceLanguageFilter"/);
  assert.match(html, /id="referenceTopicList"/);
  assert.match(html, /id="referencePage"/);
  assert.match(main, /src\/features\/grammar\/reference-data\.js/);
  assert.match(main, /src\/features\/grammar\/index\.js/);
});

test('v3.5.2 full paradigm tabs and decoder entries are available', () => {
  const lyo = library.getReferenceTopic('greek-lyo-paradigm');
  assert.ok(lyo.paradigmTabs.find(t => t.label === 'Aorist').charts.some(c => c.label === 'Aorist Passive Indicative'));
  assert.ok(lyo.paradigmTabs.find(t => t.label === 'Infinitives & Participles'));
  assert.deepEqual(library.getReferenceTopic('greek-logos-paradigm').charts[0].rows.map(r => r[0]), ['Nominative','Genitive','Dative','Accusative','Vocative']);
  for (const stem of ['qal','niphal','piel','pual','hiphil','hophal','hitpael']) {
    const topic = library.getReferenceTopic(`hebrew-${stem}`);
    assert.ok(topic.paradigmTabs.find(t => t.label === 'Perfect'));
    assert.ok(topic.paradigmTabs.find(t => t.label === 'Infinitive Construct'));
    assert.equal(topic.paradigmTabs.find(t => t.label === 'Perfect').charts[0].columns.includes('3ms'), true);
  }
  assert.equal(library.decodeParsing('V-AAI-1P').examples.includes('ἐλύσαμεν'), true);
  assert.equal(library.decodeParsing('Hiphil Imperfect 2mp').related.includes('hebrew-hiphil'), true);
});

test('v3.5.2 search includes paradigm forms and cheat sheets', () => {
  assert.equal(library.searchReferenceTopics('θη', 'greek').some(t => t.id === 'greek-lyo-paradigm'), true);
  assert.equal(library.searchReferenceTopics('ουσι', 'greek').some(t => t.id === 'greek-lyo-paradigm'), true);
  assert.equal(library.searchReferenceTopics('Hiphil', 'hebrew').some(t => t.id === 'hebrew-hiphil'), true);
  assert.equal(library.searchReferenceTopics('Qal', 'hebrew').some(t => t.id === 'hebrew-qal'), true);
  assert.equal(library.searchReferenceTopics('λόγος', 'greek').some(t => t.id === 'greek-logos-paradigm'), true);
});

test('app shell exposes v3.5.2 grammar navigation hooks', () => {
  const ui = fs.readFileSync(path.join(__dirname, '../src/features/grammar/index.js'), 'utf8');
  assert.match(ui, /GRAMMAR_FAVORITES_KEY/);
  assert.match(ui, /GRAMMAR_RECENTS_KEY/);
  assert.match(ui, /renderParsingGuide/);
  assert.match(ui, /reference-breadcrumbs/);
  assert.match(ui, /reference-tab/);
});

test('v3.5.2 cache visibility assets are version-bumped', () => {
  const sw = fs.readFileSync('sw.js', 'utf8');
  const html = fs.readFileSync('index.html', 'utf8');
  assert.match(sw, /const CACHE = 'puritan-parser-v12'/);
  assert.doesNotMatch(sw, /puritan-parser-v11/);
  assert.match(html, /src="src\/main\.js\?v=v3\.5\.4b-cache-bust"/);
});

test('Greek reference search is accent-insensitive while accented search still works', () => {
  assert.equal(library.searchReferenceTopics('λυω', 'greek').some(t => t.id === 'greek-lyo-paradigm'), true);
  assert.equal(library.searchReferenceTopics('λύω', 'greek').some(t => t.id === 'greek-lyo-paradigm'), true);
  assert.equal(library.searchReferenceTopics('λογος', 'greek').some(t => t.id === 'greek-logos-paradigm'), true);
  assert.equal(library.searchReferenceTopics('λόγος', 'greek').some(t => t.id === 'greek-logos-paradigm'), true);
});

test('Parsing Guide is a searchable reference topic that routes to guide UI', () => {
  const topic = library.getReferenceTopic('grammar-parsing-decoder');
  assert.ok(topic);
  assert.equal(library.searchReferenceTopics('Parsing Guide', 'greek').some(t => t.id === 'grammar-parsing-decoder'), true);
  assert.equal(library.searchReferenceTopics('grammar-parsing-decoder', 'greek').some(t => t.id === 'grammar-parsing-decoder'), true);
  const ui = fs.readFileSync(path.join(__dirname, '../src/features/grammar/index.js'), 'utf8');
  assert.match(ui, /topicId==='grammar-parsing-decoder'\) return renderParsingGuide\(\)/);
  assert.match(ui, /btn\.dataset\.topicId==='grammar-parsing-decoder' \? renderParsingGuide\(\)/);
});

test('scoped $$ helper usage is supported', () => {
  const dom = fs.readFileSync(path.join(__dirname, '../src/ui/dom.js'), 'utf8');
  assert.match(dom, /const \$\$ = \(selector, root = document\) => Array\.from\(root\.querySelectorAll\(selector\)\)/);
  const ui = fs.readFileSync(path.join(__dirname, '../src/features/grammar/index.js'), 'utf8');
  assert.match(ui, /\$\$\('\.reference-topic-btn,\.reference-card', list\)/);
});

test('Grammar Home contains expected v3.5.2 navigation markers', () => {
  const ui = fs.readFileSync(path.join(__dirname, '../src/features/grammar/index.js'), 'utf8');
  for (const marker of ['Favorites', 'Recently Viewed', 'Start Here', 'Supporting Reference', 'Parsing Guide']) {
    assert.match(ui, new RegExp(marker));
  }
});


test('v3.5.3 language-aware grammar and comprehensive paradigm tabs are available', () => {
  const lyo = library.getReferenceTopic('greek-lyo-paradigm');
  assert.deepEqual(lyo.paradigmTabs.map(t => t.label).slice(0, 7), ['Present','Imperfect','Future','Aorist','Perfect','Pluperfect','Infinitives & Participles']);
  assert.ok(lyo.paradigmTabs.find(t => t.label === 'Present').charts.some(c => c.label === 'Present Active Subjunctive'));
  assert.ok(lyo.paradigmTabs.find(t => t.label === 'Aorist').charts.some(c => c.label === 'Aorist Passive Participle'));
  assert.ok(lyo.paradigmTabs.find(t => t.label === 'Pluperfect').charts.some(c => c.label === 'Pluperfect Middle/Passive Indicative'));
  for (const stem of ['qal','niphal','piel','pual','hiphil','hophal','hitpael']) {
    const labels = library.getReferenceTopic(`hebrew-${stem}`).paradigmTabs.map(t => t.label);
    assert.deepEqual(labels.slice(0, 6), ['Perfect','Imperfect','Imperative','Infinitive Construct','Infinitive Absolute','Participles']);
  }
  assert.equal(library.decodeParsing('V-API-3S').related.includes('greek-lyo-paradigm'), true);
});

test('v3.5.3 grammar UI removes emoji cards and follows app language', () => {
  const ui = fs.readFileSync(path.join(__dirname, '../src/features/grammar/index.js'), 'utf8');
  assert.match(ui, /appGrammarLanguage/);
  assert.match(ui, /setReferenceLanguage\(appGrammarLanguage\(\)\)/);
  assert.match(ui, /defaultReferenceTopicId\(language\)/);
  assert.doesNotMatch(ui, /📚|📝|🔍|⭐|🕒/);
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  assert.doesNotMatch(html, /Search reference.*🔍/);
});

test('v3.5.4 category-based paradigm pages and favorites guidance are visible', () => {
  assert.equal(library.getReferenceTopic('greek-lyo-paradigm').title, 'Verb Paradigms');
  assert.equal(library.getReferenceTopic('greek-logos-paradigm').category, 'Noun Paradigms');
  assert.equal(library.getReferenceTopic('greek-kalos-paradigm').category, 'Adjective Paradigms');
  assert.equal(library.getReferenceTopic('greek-articles').category, 'Article Paradigms');
  assert.equal(library.getReferenceTopic('greek-pronouns').category, 'Pronoun Paradigms');
  for (const stem of ['qal','niphal','piel','pual','hiphil','hophal','hitpael']) {
    assert.match(library.getReferenceTopic(`hebrew-${stem}`).category, /Paradigms$/);
  }
  const ui = fs.readFileSync(path.join(__dirname, '../src/features/grammar/index.js'), 'utf8');
  assert.match(ui, /Star any page to build your frequently consulted grammar shelf/);
  assert.match(ui, /'Favorites', favs/);
  assert.match(ui, /reference-star/);
});

test('v3.5.4 Greek case ending, pronoun, participle, and contract verb references are present', () => {
  for (const id of ['greek-first-declension-endings','greek-second-declension-endings','greek-third-declension-basics','greek-article-endings','greek-adjective-endings','greek-pronoun-endings','greek-case-functions','greek-participles','greek-contract-verbs']) {
    const topic = library.getReferenceTopic(id);
    assert.ok(topic, `${id} missing`);
    assert.ok(topic.charts.length > 0, `${id} missing charts`);
  }
  assert.ok(library.getReferenceTopic('greek-first-declension-endings').charts[0].rows.some(r => r[0] === 'Vocative'));
  assert.ok(library.getReferenceTopic('greek-pronouns').charts.some(c => c.label === 'Demonstrative pronouns'));
  assert.ok(library.getReferenceTopic('greek-pronouns').charts.some(c => c.label === 'Relative pronoun'));
  assert.ok(library.getReferenceTopic('greek-pronouns').charts.some(c => c.label === 'Interrogative pronoun'));
  assert.ok(library.getReferenceTopic('greek-participles').charts[0].rows.some(r => r[0] === 'Perfect middle/passive'));
  assert.ok(library.getReferenceTopic('greek-contract-verbs').charts[0].rows.some(r => r[0] === 'Alpha contract'));
});

test('v3.5.4 Hebrew dual, construct, suffix, and weak verb references are present', () => {
  for (const id of ['hebrew-dual-forms','hebrew-pronominal-suffixes','hebrew-construct-chains','hebrew-weak-verbs']) {
    const topic = library.getReferenceTopic(id);
    assert.ok(topic, `${id} missing`);
    assert.ok(topic.charts.length > 0, `${id} missing charts`);
  }
  assert.ok(library.getReferenceTopic('hebrew-dual-forms').charts[0].rows.some(r => r.includes('Dual')));
  assert.ok(library.getReferenceTopic('hebrew-pronominal-suffixes').charts[0].rows.some(r => r.includes('3ms')));
  assert.ok(library.getReferenceTopic('hebrew-construct-chains').charts[0].rows.some(r => r.includes('Construct state')));
  assert.ok(library.getReferenceTopic('hebrew-weak-verbs').charts[0].rows.some(r => r[0] === 'I-נ'));
});

test('v3.5.4 search covers new handbook refinements and hidden future hooks', () => {
  assert.equal(library.searchReferenceTopics('case endings', 'greek').some(t => t.id === 'greek-case-functions' || t.id === 'greek-first-declension-endings'), true);
  assert.equal(library.searchReferenceTopics('participles', 'greek').some(t => t.id === 'greek-participles'), true);
  assert.equal(library.searchReferenceTopics('contract verbs', 'greek').some(t => t.id === 'greek-contract-verbs'), true);
  assert.equal(library.searchReferenceTopics('demonstrative pronouns', 'greek').some(t => t.id === 'greek-pronouns'), true);
  assert.equal(library.searchReferenceTopics('dual forms', 'hebrew').some(t => t.id === 'hebrew-dual-forms'), true);
  assert.equal(library.searchReferenceTopics('construct chains', 'hebrew').some(t => t.id === 'hebrew-construct-chains'), true);
  assert.equal(library.searchReferenceTopics('pronominal suffixes', 'hebrew').some(t => t.id === 'hebrew-pronominal-suffixes'), true);
  assert.equal(library.searchReferenceTopics('weak verbs', 'hebrew').some(t => t.id === 'hebrew-weak-verbs'), true);
  assert.equal(library.searchReferenceTopics('μι verbs', 'greek').some(t => t.id === 'greek-mi-verbs-hook'), false);
  assert.equal(library.searchReferenceTopics('irregular verbs', 'greek').some(t => t.id === 'greek-irregular-verbs-hook'), false);
});

test('v3.5.4 cross-links resolve for shared explanations and new references', () => {
  for (const id of ['greek-participles','greek-contract-verbs','hebrew-pronominal-suffixes','hebrew-construct-chains','hebrew-dual-forms','grammar-parsing-ambiguity']) {
    const topic = library.getReferenceTopic(id);
    assert.ok(topic.related.length > 0, `${id} missing cross-links`);
    for (const relatedId of topic.related) assert.ok(library.getReferenceTopic(relatedId), `${id} broken link ${relatedId}`);
  }
});

function renderGrammarHomeFor(language, favorites = [], recents = []) {
  const vm = require('node:vm');
  const ui = fs.readFileSync(path.join(__dirname, '../src/features/grammar/index.js'), 'utf8');
  const store = {
    pp_grammar_favorites_v1: JSON.stringify(favorites),
    pp_grammar_recent_v1: JSON.stringify(recents)
  };
  const context = {
    PuritanReferenceLibrary: library,
    state: { lang: language },
    document: {},
    localStorage: { getItem: key => store[key] || null, setItem: (key, value) => { store[key] = value; } },
    $: selector => selector === '#referenceLanguageFilter' ? { value: language } : null,
    $$: () => [],
    debounce: fn => fn
  };
  vm.createContext(context);
  vm.runInContext(`${ui}; this.__renderedGrammarHome = renderGrammarHome();`, context);
  return context.__renderedGrammarHome;
}

test('v3.5.4b rendered Greek Grammar Home uses category-first top-level cards', () => {
  const home = renderGrammarHomeFor('greek');
  for (const label of ['Verb Paradigms','Noun Paradigms','Adjective Paradigms','Article Paradigms','Pronoun Paradigms','Case Endings','Participles','Contract Verbs','Greek Cheat Sheets','Parsing Guide']) {
    assert.match(home, new RegExp(`>${label}<`), `${label} missing from rendered Greek home`);
  }
  assert.doesNotMatch(home, />λύω paradigm</i);
  assert.doesNotMatch(home, />λόγος paradigm</i);
  assert.doesNotMatch(home, />καλός paradigm</i);
});

test('v3.5.4b rendered Greek Case Endings section exposes declension and ending pages', () => {
  const home = renderGrammarHomeFor('greek');
  assert.match(home, /<h3>Case Endings<\/h3>/);
  for (const label of ['First Declension','Second Declension','Third Declension Basics','Article Endings','Adjective Endings','Pronoun Endings']) {
    assert.match(home, new RegExp(`>${label}<`), `${label} missing from Case Endings section`);
  }
});

test('v3.5.4b rendered Hebrew Grammar Home uses useful category cards', () => {
  const home = renderGrammarHomeFor('hebrew');
  for (const label of ['Qal Paradigms','Niphal Paradigms','Piel Paradigms','Pual Paradigms','Hiphil Paradigms','Hophal Paradigms','Hitpael Paradigms','Dual Forms','Pronominal Suffixes','Construct Chains','Weak Verb Overview','Hebrew Cheat Sheets','Parsing Guide']) {
    assert.match(home, new RegExp(`>${label}<`), `${label} missing from rendered Hebrew home`);
  }
});

test('v3.5.4b search finds category-first Greek and Hebrew topics', () => {
  const expected = {
    greek: ['case endings','first declension','second declension','third declension','article endings','adjective endings','pronoun endings','participles','contract verbs','verb paradigms','noun paradigms','adjective paradigms'],
    hebrew: ['dual forms','pronominal suffixes','construct chains','weak verbs','Qal paradigms','Hiphil paradigms']
  };
  for (const query of expected.greek) assert.ok(library.searchReferenceTopics(query, 'greek').length, `No Greek result for ${query}`);
  for (const query of expected.hebrew) assert.ok(library.searchReferenceTopics(query, 'hebrew').length, `No Hebrew result for ${query}`);
  assert.equal(library.searchReferenceTopics('case endings', 'greek').some(t => t.id === 'greek-case-endings'), true);
  assert.equal(library.searchReferenceTopics('first declension', 'greek').some(t => t.id === 'greek-first-declension-endings'), true);
});

test('v3.5.4b favorites and recent pages render on Grammar Home', () => {
  const home = renderGrammarHomeFor('greek', ['greek-case-endings'], ['greek-participles']);
  assert.match(home, /<h3>Favorites<\/h3>[\s\S]*>Case Endings</);
  assert.match(home, /<h3>Recently Viewed<\/h3>[\s\S]*>Participles</);
  assert.match(fs.readFileSync(path.join(__dirname, '../src/features/grammar/index.js'), 'utf8'), /Star any page to build your frequently consulted grammar shelf/);
  assert.match(fs.readFileSync(path.join(__dirname, '../src/features/grammar/index.js'), 'utf8'), /Recently viewed grammar pages appear here automatically/);
});

test('v3.5.4b service worker cache version and app shell cache bust are bumped', () => {
  const sw = fs.readFileSync('sw.js', 'utf8');
  const html = fs.readFileSync('index.html', 'utf8');
  assert.match(sw, /const CACHE = 'puritan-parser-v12'/);
  assert.doesNotMatch(sw, /puritan-parser-v11/);
  assert.match(html, /src="src\/main\.js\?v=v3\.5\.4b-cache-bust"/);
});
