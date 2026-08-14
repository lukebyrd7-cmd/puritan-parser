const test = require('node:test');
const assert = require('node:assert/strict');
const { createWordEntry, getDisplayHeadword } = require('../src/models/word-entry');
const { groupEntriesByLemma, getStudyEntrySearchText } = require('../src/core/study-entries');

const entries = [
  { id:'a', lang:'greek', word:'βίβλον', lemma:'βίβλος', lexicalForm:'βίβλος, ἡ', primaryGloss:'book', freq:3 },
  { id:'b', lang:'greek', word:'βίβλοις', lemma:'βίβλος', lexicalForm:'βίβλος, ἡ', primaryGloss:'books', freq:2 },
  { id:'c', lang:'greek', word:'λόγον', lemma:'λόγος', primaryGloss:'word', freq:1 }
];

test('createWordEntry preserves optional lexicalForm', () => {
  const entry = createWordEntry({ word:'βίβλον', lemma:'βίβλος', lexicalForm:'βίβλος, ἡ' });
  assert.equal(entry.lexicalForm, 'βίβλος, ἡ');
});

test('getDisplayHeadword uses canonical lexical fields and never falls back to an occurrence word', () => {
  assert.equal(getDisplayHeadword({ word:'βίβλον', lemma:'βίβλος', lexicalForm:'βίβλος, ἡ' }), 'βίβλος, ἡ');
  assert.equal(getDisplayHeadword({ word:'βίβλον', lemma:'βίβλος' }), 'βίβλος');
  assert.equal(getDisplayHeadword({ word:'βίβλον' }), '');
  assert.equal(getDisplayHeadword({}), '');
});

test('lexicalForm does not change lemma grouping key', () => {
  const grouped = groupEntriesByLemma(entries);
  const biblos = grouped.find(entry => entry.lemma === 'βίβλος');
  assert.equal(grouped.length, 2);
  assert.equal(biblos.lexicalForm, 'βίβλος, ἡ');
  assert.deepEqual(biblos.originalEntries.map(entry => entry.id).sort(), ['a', 'b']);
});

test('study search text includes lexicalForm without losing form data', () => {
  const biblos = groupEntriesByLemma(entries).find(entry => entry.lemma === 'βίβλος');
  const text = getStudyEntrySearchText(biblos);
  assert.match(text, /βίβλος, ἡ/);
  assert.match(text, /βίβλον/);
});
