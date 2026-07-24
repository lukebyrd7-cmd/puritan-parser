const test = require('node:test');
const assert = require('node:assert/strict');

const search = require('../src/core/hebrew-search');

const confirmedWords = [
  ['shalom', 'שָׁלוֹם'],
  ['melek', 'מֶלֶךְ', 'melekh'],
  ['bereshit', 'בְּרֵאשִׁית'],
  ['ben', 'בֵּן'],
  ['bayit', 'בַּיִת'],
  ['ish', 'אִישׁ'],
  ['ishah', 'אִשָּׁה'],
  ['rosh', 'רֹאשׁ'],
  ['yom', 'יוֹם']
];

test('shared Hebrew search derives canonical transliterations from confirmed dataset words', () => {
  for(const [latin, hebrew, canonical = latin] of confirmedWords){
    assert.equal(search.transliterateHebrew(hebrew), canonical, `${hebrew} transliterates as ${canonical}`);
    assert.ok(search.scoreHebrewSearchTerms(search.createHebrewSearchTerms(hebrew), latin) >= 900);
  }
});

test('Hebrew transliteration search accepts conservative common aliases', () => {
  assert.equal(search.scoreHebrewSearchTerms(search.createHebrewSearchTerms('מֶלֶךְ'), 'melek'), 900);
  assert.equal(search.scoreHebrewSearchTerms(search.createHebrewSearchTerms('אִשָּׁה'), 'isha'), 900);
  assert.equal(search.scoreHebrewSearchTerms(search.createHebrewSearchTerms('צִיּוֹן'), 'tzion'), 900);
  assert.equal(search.scoreHebrewSearchTerms(search.createHebrewSearchTerms('קָהָל'), 'kahal'), 900);
  assert.equal(search.scoreHebrewSearchTerms(search.createHebrewSearchTerms('חֶסֶד'), 'khesed'), 900);
});

test('Latin normalization is case-insensitive and ignores ordinary punctuation, spacing, and diacritics', () => {
  const terms = search.createHebrewSearchTerms('בְּרֵאשִׁית');
  assert.equal(search.scoreHebrewSearchTerms(terms, 'BE-RESHIT'), 950);
  assert.equal(search.scoreHebrewSearchTerms(terms, 'BÉ RESHIT'), 950);
});

test('exact Hebrew outranks transliteration and exact transliteration outranks aliases and prefixes', () => {
  const terms = search.createHebrewSearchTerms('מֶלֶךְ');
  assert.equal(search.scoreHebrewSearchTerms(terms, 'מֶלֶךְ'), 1000);
  assert.equal(search.scoreHebrewSearchTerms(terms, 'melekh'), 950);
  assert.equal(search.scoreHebrewSearchTerms(terms, 'melek'), 900);
  assert.equal(search.scoreHebrewSearchTerms(terms, 'mel'), 780);
});

test('consonantal distinctions remain conservative', () => {
  const bet = search.createHebrewSearchTerms('בֵּן');
  const between = search.createHebrewSearchTerms('בֵּין');
  assert.equal(search.scoreHebrewSearchTerms(bet, 'ben'), 950);
  assert.equal(search.scoreHebrewSearchTerms(between, 'ben'), 0);
  assert.equal(search.scoreHebrewSearchTerms(search.createHebrewSearchTerms('שָׁלוֹם'), 'salom'), 0);
  assert.equal(search.scoreHebrewSearchTerms(search.createHebrewSearchTerms('סוּס'), 'shush'), 0);
});

test('derived record index builds lazily and is reused without mutating records', () => {
  search.resetSearchCache();
  const records = [{ surface: 'שָׁלוֹם' }, { surface: 'מֶלֶךְ' }];
  const original = JSON.stringify(records);
  assert.equal(search.searchDebugState().buildCount, 0);
  assert.equal(search.searchHebrewRecords(records, 'shalom', item => item.surface)[0].record, records[0]);
  assert.equal(search.searchDebugState().buildCount, 1);
  search.searchHebrewRecords(records, 'melek', item => item.surface);
  assert.equal(search.searchDebugState().buildCount, 1);
  assert.equal(JSON.stringify(records), original);
});
