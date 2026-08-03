const test = require('node:test');
const assert = require('node:assert/strict');
const {
  decodeParse,
  grammarCategories,
  matchesGrammarCategory,
  isWeakCard,
  normalizeImportedPayload,
  validateVocabItem
} = require('../src/parser-core');

test('decodes Greek noun parse codes', () => {
  const parsed = decodeParse('N-NSM', 'greek');
  assert.equal(parsed.summary, 'Noun, nominative, singular, masculine');
});

test('decodes compact Greek verb parse codes', () => {
  const parsed = decodeParse('V-PAI-1S', 'greek');
  assert.equal(parsed.summary, 'Verb, present, active, indicative, 1st person singular');
});

test('decodes MorphGNT-style Greek verb parse codes', () => {
  const parsed = decodeParse('V-3AAI-S--', 'greek');
  assert.equal(parsed.summary, 'Verb, aorist, active, indicative, 3rd person singular');
});

test('decodes padded MorphGNT reader parse codes', () => {
  assert.equal(decodeParse('N- ----NSM-', 'greek').summary, 'Noun, nominative, singular, masculine');
  assert.equal(decodeParse('RA ----NSM-', 'greek').summary, 'Article, nominative, singular, masculine');
  assert.equal(decodeParse('V- 3IAI-S--', 'greek').summary, 'Verb, imperfect, active, indicative, 3rd person singular');
});

test('decodes Greek participle parse codes', () => {
  const parsed = decodeParse('V-PAP-NSM', 'greek');
  assert.equal(parsed.summary, 'Verb, present, active, participle, nominative, singular, masculine');
  const padded = decodeParse('V- -PAPNSM-', 'greek');
  assert.equal(padded.summary, 'Verb, present, active, participle, nominative, singular, masculine');
});

test('decodes Hebrew verb parse codes', () => {
  const parsed = decodeParse('V-QAL-PERF-3MS', 'hebrew');
  assert.equal(parsed.summary, 'Verb, Qal, perfect, 3rd person masculine singular');
});

test('decodes Hebrew nominal parse codes', () => {
  const parsed = decodeParse('N-MSA', 'hebrew');
  assert.equal(parsed.summary, 'Noun, masculine, singular, absolute');
});

test('decodes OSHB Hebrew reader parse codes', () => {
  assert.equal(decodeParse('HC/Vqw3ms', 'hebrew').summary, 'Verb, Qal, wayyiqtol, 3rd person masculine singular');
  assert.equal(decodeParse('HNcmsc', 'hebrew').summary, 'Noun, masculine, singular, construct');
  assert.equal(decodeParse('HR', 'hebrew').label, 'Preposition');
});

test('builds and matches grammar categories', () => {
  const rows = [
    { word: 'λόγος', lang: 'greek', pos: 'noun', parse: 'N-NSM' },
    { word: 'λέγω', lang: 'greek', pos: 'verb', parse: 'V-PRES-ACT-1S' }
  ];
  const categories = grammarCategories(rows, 'greek');
  const cats = categories.map(cat => cat.id);
  assert.ok(cats.includes('nominals'));
  assert.ok(cats.includes('verbs'));
  assert.ok(categories.some(cat => cat.id === 'pos:noun' && cat.label === 'Part of speech: noun'));
  assert.ok(categories.some(cat => cat.id === 'pos:verb' && cat.label === 'Part of speech: verb'));
  assert.ok(categories.some(cat => cat.id === 'detail:nominative' && cat.label === 'Case: nominative' && cat.group === 'Case'));
  assert.equal(cats.some(id => id.startsWith('token:')), false);
  assert.equal(matchesGrammarCategory(rows[0], 'detail:nominative', 'greek'), true);
  assert.equal(matchesGrammarCategory(rows[1], 'detail:nominative', 'greek'), false);
});

test('detects weak cards from recent misses and ease', () => {
  assert.equal(isWeakCard({ ease: 2.5, repetitions: 4, history: [{ q: 5 }, { q: 2 }] }), true);
  assert.equal(isWeakCard({ ease: 1.9, repetitions: 4, history: [{ q: 5 }] }), true);
  assert.equal(isWeakCard({ ease: 2.5, repetitions: 4, history: [{ q: 5 }, { q: 4 }] }), false);
});

test('normalizes import payload shapes and validates required fields', () => {
  const payload = {
    greek: [{ word: 'καί', gloss: 'and', lang: 'greek' }],
    hebrew: [{ word: 'אָמַר', gloss: 'to say', lang: 'hebrew' }]
  };
  assert.equal(normalizeImportedPayload(payload).length, 2);
  assert.deepEqual(validateVocabItem(payload.greek[0], 0).errors, []);
  assert.ok(validateVocabItem({ word: 'x' }, 0).errors.length > 0);
});
