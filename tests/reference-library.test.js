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
  assert.ok(lyo.paradigmTabs.find(t => t.label === 'Aorist').charts.some(c => c.label === 'Aorist Passive'));
  assert.ok(lyo.paradigmTabs.find(t => t.label === 'Participle'));
  assert.deepEqual(library.getReferenceTopic('greek-logos-paradigm').charts[0].rows.map(r => r[0]), ['Nom','Gen','Dat','Acc']);
  for (const stem of ['qal','niphal','piel','pual','hiphil','hophal','hitpael']) {
    const topic = library.getReferenceTopic(`hebrew-${stem}`);
    assert.ok(topic.paradigmTabs.find(t => t.label === 'Perfect'));
    assert.ok(topic.paradigmTabs.find(t => t.label === 'Infinitives'));
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
  assert.match(ui, /renderParsingDecoder/);
  assert.match(ui, /reference-breadcrumbs/);
  assert.match(ui, /reference-tab/);
});

test('v3.5.2 cache visibility assets are version-bumped', () => {
  const sw = fs.readFileSync('sw.js', 'utf8');
  const html = fs.readFileSync('index.html', 'utf8');
  assert.match(sw, /const CACHE = 'puritan-parser-v10'/);
  assert.doesNotMatch(sw, /puritan-parser-v9/);
  assert.match(html, /src="src\/main\.js\?v=v3\.5\.2-cache-bust"/);
});

test('Greek reference search is accent-insensitive while accented search still works', () => {
  assert.equal(library.searchReferenceTopics('λυω', 'greek').some(t => t.id === 'greek-lyo-paradigm'), true);
  assert.equal(library.searchReferenceTopics('λύω', 'greek').some(t => t.id === 'greek-lyo-paradigm'), true);
  assert.equal(library.searchReferenceTopics('λογος', 'greek').some(t => t.id === 'greek-logos-paradigm'), true);
  assert.equal(library.searchReferenceTopics('λόγος', 'greek').some(t => t.id === 'greek-logos-paradigm'), true);
});

test('Parsing Decoder is a searchable reference topic that routes to decoder UI', () => {
  const topic = library.getReferenceTopic('grammar-parsing-decoder');
  assert.ok(topic);
  assert.equal(library.searchReferenceTopics('Parsing Decoder', 'greek').some(t => t.id === 'grammar-parsing-decoder'), true);
  assert.equal(library.searchReferenceTopics('grammar-parsing-decoder', 'greek').some(t => t.id === 'grammar-parsing-decoder'), true);
  const ui = fs.readFileSync(path.join(__dirname, '../src/features/grammar/index.js'), 'utf8');
  assert.match(ui, /topicId==='grammar-parsing-decoder'\) return renderParsingDecoder\(\)/);
  assert.match(ui, /btn\.dataset\.topicId==='grammar-parsing-decoder' \? renderParsingDecoder\(\)/);
});

test('scoped $$ helper usage is supported', () => {
  const dom = fs.readFileSync(path.join(__dirname, '../src/ui/dom.js'), 'utf8');
  assert.match(dom, /const \$\$ = \(selector, root = document\) => Array\.from\(root\.querySelectorAll\(selector\)\)/);
  const ui = fs.readFileSync(path.join(__dirname, '../src/features/grammar/index.js'), 'utf8');
  assert.match(ui, /\$\$\('\.reference-topic-btn,\.reference-card', list\)/);
});

test('Grammar Home contains expected v3.5.2 navigation markers', () => {
  const ui = fs.readFileSync(path.join(__dirname, '../src/features/grammar/index.js'), 'utf8');
  for (const marker of ['Favorites', 'Recent', 'Paradigms', 'Cheat Sheets', 'Parsing Decoder']) {
    assert.match(ui, new RegExp(marker));
  }
});
