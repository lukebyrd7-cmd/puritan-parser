const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { mergeWithExisting, loadHebrewGlossSource } = require('../scripts/build-expanded-vocab');

test('Hebrew gloss source loads compact lemma records', () => {
  const glosses = loadHebrewGlossSource();
  const amar = glosses.get('hebrew\u0001אָמַר');
  assert.ok(amar);
  assert.equal(amar.primaryGloss, 'say');
  assert.deepEqual(amar.alternateGlosses, ['speak', 'tell']);
  assert.equal(amar.glossLicense, 'CC0-1.0');
});

test('Hebrew rebuild merge prefers source glosses by lang + lemma and preserves morphology', () => {
  const sourceFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'hebrew-glosses-')), 'glosses.json');
  fs.writeFileSync(sourceFile, JSON.stringify({
    'דבר': {
      primaryGloss: 'word',
      alternateGlosses: ['matter', 'thing'],
      glossSource: 'test source',
      glossLicense: 'test license',
      glossAttribution: 'test attribution'
    }
  }));
  const source = loadHebrewGlossSource(sourceFile);
  const expanded = [{ word: 'דבר', lemma: 'דבר', gloss: '', pos: 'noun', freq: 1, lang: 'hebrew', parse: 'N-MSA', lexicalForm: 'דבר', customGloss: 'my word', source: 'Open Scriptures Hebrew Bible' }];
  const existing = [{ word: 'דבר', lemma: 'דבר', gloss: 'old', primaryGloss: 'old', alternateGlosses: [], lang: 'hebrew', parse: 'N-MSA' }];
  const [merged] = mergeWithExisting(expanded, existing, source);
  assert.equal(merged.primaryGloss, 'word');
  assert.deepEqual(merged.alternateGlosses, ['matter', 'thing']);
  assert.equal(merged.glossSource, 'test source');
  assert.equal(merged.glossLicense, 'test license');
  assert.equal(merged.glossAttribution, 'test attribution');
  assert.equal(merged.word, 'דבר');
  assert.equal(merged.lemma, 'דבר');
  assert.equal(merged.parse, 'N-MSA');
  assert.equal(merged.freq, 1);
  assert.equal(merged.lang, 'hebrew');
  assert.equal(merged.lexicalForm, 'דבר');
  assert.equal(merged.customGloss, 'my word');
});

test('Hebrew source does not change parsing behavior or non-Hebrew glosses', () => {
  const source = new Map([['hebrew\u0001λόγος', { primaryGloss: 'Hebrew only', alternateGlosses: [] }]]);
  const expanded = [
    { word: 'λόγος', lemma: 'λόγος', gloss: '', pos: 'noun', freq: 1, lang: 'greek', parse: 'N-NSM' },
    { word: 'דבר', lemma: 'λόγος', gloss: '', pos: 'noun', freq: 1, lang: 'hebrew', parse: 'N-MSA' }
  ];
  const existing = [{ word: 'λόγος', lemma: 'λόγος', gloss: 'word', primaryGloss: 'word', lang: 'greek', parse: 'N-NSM' }];
  const merged = mergeWithExisting(expanded, existing, source);
  assert.equal(merged.find(entry => entry.lang === 'greek').primaryGloss, 'word');
  assert.equal(merged.find(entry => entry.lang === 'hebrew').primaryGloss, 'Hebrew only');
  assert.equal(merged.find(entry => entry.lang === 'hebrew').parse, 'N-MSA');
});


test('Hebrew gloss source covers every lemma with aggregate frequency at least 50', () => {
  const vocab = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'vocab_all.json'), 'utf8'));
  const glosses = loadHebrewGlossSource();
  const lemmaFreq = new Map();
  vocab.filter(entry => entry.lang === 'hebrew').forEach(entry => {
    const lemma = typeof entry.lemma === 'string' && entry.lemma.trim() ? entry.lemma.trim() : entry.word;
    lemmaFreq.set(lemma, (lemmaFreq.get(lemma) || 0) + (Number(entry.freq) || 0));
  });
  const missingHighFrequency = Array.from(lemmaFreq.entries())
    .filter(([, freq]) => freq >= 50)
    .filter(([lemma]) => !glosses.has(`hebrew\u0001${lemma}`))
    .map(([lemma, freq]) => `${lemma} (${freq})`);

  assert.deepEqual(missingHighFrequency, []);
});

test('Hebrew gloss source covers every lemma with aggregate frequency 25 through 49', () => {
  const vocab = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'vocab_all.json'), 'utf8'));
  const glosses = loadHebrewGlossSource();
  const lemmaFreq = new Map();
  vocab.filter(entry => entry.lang === 'hebrew').forEach(entry => {
    const lemma = typeof entry.lemma === 'string' && entry.lemma.trim() ? entry.lemma.trim() : entry.word;
    lemmaFreq.set(lemma, (lemmaFreq.get(lemma) || 0) + (Number(entry.freq) || 0));
  });
  const missingFrequencyBand = Array.from(lemmaFreq.entries())
    .filter(([, freq]) => freq >= 25 && freq <= 49)
    .filter(([lemma]) => !glosses.has(`hebrew\u0001${lemma}`))
    .map(([lemma, freq]) => `${lemma} (${freq})`);

  assert.deepEqual(missingFrequencyBand, []);
});

test('Hebrew gloss source covers every lemma with aggregate frequency 10 through 24', () => {
  const vocab = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'vocab_all.json'), 'utf8'));
  const glosses = loadHebrewGlossSource();
  const lemmaFreq = new Map();
  vocab.filter(entry => entry.lang === 'hebrew').forEach(entry => {
    const lemma = typeof entry.lemma === 'string' && entry.lemma.trim() ? entry.lemma.trim() : entry.word;
    lemmaFreq.set(lemma, (lemmaFreq.get(lemma) || 0) + (Number(entry.freq) || 0));
  });
  const missingFrequencyBand = Array.from(lemmaFreq.entries())
    .filter(([, freq]) => freq >= 10 && freq <= 24)
    .filter(([lemma]) => !glosses.has(`hebrew\u0001${lemma}`))
    .map(([lemma, freq]) => `${lemma} (${freq})`);

  assert.deepEqual(missingFrequencyBand, []);
});


test('Hebrew gloss source covers every lemma with aggregate frequency 5 through 9', () => {
  const vocab = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'vocab_all.json'), 'utf8'));
  const glosses = loadHebrewGlossSource();
  const lemmaFreq = new Map();
  vocab.filter(entry => entry.lang === 'hebrew').forEach(entry => {
    const lemma = typeof entry.lemma === 'string' && entry.lemma.trim() ? entry.lemma.trim() : entry.word;
    lemmaFreq.set(lemma, (lemmaFreq.get(lemma) || 0) + (Number(entry.freq) || 0));
  });
  const missingFrequencyBand = Array.from(lemmaFreq.entries())
    .filter(([, freq]) => freq >= 5 && freq <= 9)
    .filter(([lemma]) => !glosses.has(`hebrew\u0001${lemma}`))
    .map(([lemma, freq]) => `${lemma} (${freq})`);

  assert.deepEqual(missingFrequencyBand, []);
});


test('Hebrew gloss source covers every lemma with aggregate frequency 1 through 4', () => {
  const vocab = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'vocab_all.json'), 'utf8'));
  const glosses = loadHebrewGlossSource();
  const lemmaFreq = new Map();
  vocab.filter(entry => entry.lang === 'hebrew').forEach(entry => {
    const lemma = typeof entry.lemma === 'string' && entry.lemma.trim() ? entry.lemma.trim() : entry.word;
    lemmaFreq.set(lemma, (lemmaFreq.get(lemma) || 0) + (Number(entry.freq) || 0));
  });
  const missingFrequencyBand = Array.from(lemmaFreq.entries())
    .filter(([, freq]) => freq >= 1 && freq <= 4)
    .filter(([lemma]) => !glosses.has(`hebrew\u0001${lemma}`))
    .map(([lemma, freq]) => `${lemma} (${freq})`);

  assert.deepEqual(missingFrequencyBand, []);
});
