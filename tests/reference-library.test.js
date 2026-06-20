const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

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
