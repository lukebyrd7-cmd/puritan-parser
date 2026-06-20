const test = require('node:test');
const assert = require('node:assert/strict');
const {
  groupEntriesByLemma,
  getStudyEntries,
  getStudyEntrySearchText,
  getStudyEntryOriginals
} = require('../src/core/study-entries');

const entries = [
  { id:'g1', lang:'greek', word:'λόγος', lemma:'λόγος', primaryGloss:'word', alternateGlosses:['message'], freq:10, due:'2026-01-02', parse:'N-NSM', pos:'noun' },
  { id:'g2', lang:'greek', word:'λόγον', lemma:'λόγος', gloss:'word', alternateGlosses:['account'], freq:5, due:'2026-01-01', parse:'N-ASM', pos:'noun' },
  { id:'h1', lang:'hebrew', word:'דָּבָר', lemma:'λόγος', primaryGloss:'thing', freq:7, due:'2026-01-03', parse:'N-MSA', pos:'noun' }
];

test('groups study entries by lang + lemma and preserves contained forms', () => {
  const grouped = groupEntriesByLemma(entries);
  assert.equal(grouped.length, 2);
  const greek = grouped.find(entry => entry.lang === 'greek' && entry.lemma === 'λόγος');
  assert.ok(greek);
  assert.deepEqual(greek.forms.sort(), ['λόγον', 'λόγος'].sort());
  assert.equal(greek.freq, 10);
  assert.equal(greek.due, '2026-01-01');
  assert.equal(greek.primaryGloss, 'word');
  assert.ok(greek.alternateGlosses.includes('message'));
  assert.equal(greek.originalEntries.length, 2);
});



test('lemma grouped frequency does not overcount duplicated lemma frequencies', () => {
  const grouped = groupEntriesByLemma([
    { id:'a', lang:'greek', word:'λέγω', lemma:'λέγω', primaryGloss:'say', freq:2350 },
    { id:'b', lang:'greek', word:'λέγει', lemma:'λέγω', primaryGloss:'say', freq:2350 },
    { id:'c', lang:'greek', word:'εἶπον', lemma:'λέγω', primaryGloss:'say', freq:2350 }
  ]);

  assert.equal(grouped.length, 1);
  assert.equal(grouped[0].freq, 2350);
});

test('lemma grouped frequency prefers explicit lemma frequency when present', () => {
  const grouped = groupEntriesByLemma([
    { id:'a', lang:'hebrew', word:'אָמַר', lemma:'אמר', primaryGloss:'say', freq:410, lemmaFrequency:5300 },
    { id:'b', lang:'hebrew', word:'וַיֹּאמֶר', lemma:'אמר', primaryGloss:'say', freq:4890, lemmaFrequency:5300 }
  ]);

  assert.equal(grouped[0].freq, 5300);
});


test('same lemma text in Greek and Hebrew does not merge', () => {
  const grouped = groupEntriesByLemma(entries);
  assert.equal(grouped.filter(entry => entry.lemma === 'λόγος').length, 2);
  assert.ok(grouped.some(entry => entry.lang === 'greek'));
  assert.ok(grouped.some(entry => entry.lang === 'hebrew'));
});

test('form mode preserves individual entries', () => {
  assert.equal(getStudyEntries(entries, 'form'), entries);
});

test('lemma mode returns grouped entries', () => {
  const grouped = getStudyEntries(entries, 'lemma');
  assert.equal(grouped.length, 2);
  assert.equal(grouped[0].studyEntryType, 'lemma');
});

test('lemma search text includes lemma, glosses, and contained forms', () => {
  const greek = getStudyEntries(entries, 'lemma').find(entry => entry.lang === 'greek');
  const text = getStudyEntrySearchText(greek);
  assert.match(text, /λόγος/);
  assert.match(text, /λόγον/);
  assert.match(text, /message/);
  assert.match(text, /account/);
});

test('flashcards can consume lemma study entries and resolve original review targets', () => {
  const greek = getStudyEntries(entries, 'lemma').find(entry => entry.lang === 'greek');
  assert.equal(greek.word, 'λόγος');
  assert.equal(greek.gloss, 'word');
  assert.deepEqual(getStudyEntryOriginals(greek).map(entry => entry.id).sort(), ['g1', 'g2']);
});
