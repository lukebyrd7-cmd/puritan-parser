const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const library = require('../src/features/grammar/reference-data');

test('reference content loads with expected model fields', () => {
  assert.ok(Array.isArray(library.referenceTopics));
  assert.ok(library.referenceTopics.length >= 17);
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
  }
});

test('Greek first-pass grammar topics are present', () => {
  const titles = library.referenceTopics.filter(t => t.language === 'greek').map(t => t.title).sort();
  assert.deepEqual(titles, ['Adjective paradigms', 'Articles', 'Mood explanations', 'Noun paradigms', 'Pronouns', 'Tense explanations', 'Verb overview', 'Voice explanations'].sort());
});

test('Hebrew first-pass grammar topics are present', () => {
  const titles = library.referenceTopics.filter(t => t.language === 'hebrew').map(t => t.title).sort();
  assert.deepEqual(titles, ['Pronouns', 'Noun patterns / noun basics', 'Qal', 'Niphal', 'Piel', 'Pual', 'Hiphil', 'Hophal', 'Hitpael'].sort());
});

test('reference search finds expected Greek and Hebrew topics', () => {
  assert.equal(library.searchReferenceTopics('subjunctive', 'greek').some(t => t.id === 'greek-mood-explanations'), true);
  assert.equal(library.searchReferenceTopics('construct chain', 'hebrew').some(t => t.id === 'hebrew-noun-basics'), true);
  assert.equal(library.searchReferenceTopics('causative', 'all').some(t => t.id === 'hebrew-hiphil'), true);
});

test('related reference topic links resolve', () => {
  for (const topic of library.referenceTopics) {
    for (const relatedId of topic.related) {
      assert.ok(library.getReferenceTopic(relatedId), `${topic.id} related topic missing: ${relatedId}`);
    }
  }
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
