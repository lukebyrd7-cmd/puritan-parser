const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { loadGlossSource, loadGlossSources, mergeWithExisting } = require('../scripts/build-expanded-vocab');

function writeGlossFile(records) {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'gloss-source-')), 'glosses.json');
  fs.writeFileSync(file, JSON.stringify(records));
  return file;
}

test('Greek gloss source loads compact lemma records', () => {
  const glosses = loadGlossSource('greek');
  const logos = glosses.get('greek\u0001λόγος');
  assert.ok(logos);
  assert.equal(logos.primaryGloss, 'word');
  assert.ok(logos.alternateGlosses.includes('message'));
  assert.equal(logos.glossLicense, 'CC0-1.0');
});

test('shared gloss source loader combines Greek and Hebrew by lang + lemma', () => {
  const greekFile = writeGlossFile({ λόγος: { primaryGloss: 'word', alternateGlosses: ['message'] } });
  const hebrewFile = writeGlossFile({ דבר: { primaryGloss: 'word', alternateGlosses: ['matter'] } });
  const glosses = loadGlossSources({ greek: greekFile, hebrew: hebrewFile });
  assert.equal(glosses.get('greek\u0001λόγος').primaryGloss, 'word');
  assert.deepEqual(glosses.get('hebrew\u0001דבר').alternateGlosses, ['matter']);
});

test('Greek rebuild merge prefers source glosses by lang + lemma and preserves morphology fields', () => {
  const greekFile = writeGlossFile({ λόγος: {
    primaryGloss: 'word',
    alternateGlosses: ['message', 'account'],
    glossSource: 'test source',
    glossLicense: 'test license',
    glossAttribution: 'test attribution'
  } });
  const source = loadGlossSources({ greek: greekFile });
  const expanded = [{ word: 'λόγον', lemma: 'λόγος', gloss: '', pos: 'noun', freq: 3, lang: 'greek', parse: 'N-ASM', lexicalForm: 'λόγος', customGloss: 'speech', source: 'MorphGNT SBLGNT' }];
  const existing = [{ word: 'λόγον', lemma: 'λόγος', gloss: 'old', primaryGloss: 'old', alternateGlosses: [], lang: 'greek', parse: 'N-ASM' }];
  const [merged] = mergeWithExisting(expanded, existing, source);
  assert.equal(merged.primaryGloss, 'word');
  assert.deepEqual(merged.alternateGlosses, ['message', 'account']);
  assert.equal(merged.glossSource, 'test source');
  assert.equal(merged.glossLicense, 'test license');
  assert.equal(merged.glossAttribution, 'test attribution');
  assert.equal(merged.word, 'λόγον');
  assert.equal(merged.lemma, 'λόγος');
  assert.equal(merged.parse, 'N-ASM');
  assert.equal(merged.freq, 3);
  assert.equal(merged.lang, 'greek');
  assert.equal(merged.lexicalForm, 'λόγος');
  assert.equal(merged.customGloss, 'speech');
});

test('custom glosses continue to override merged Greek source glosses at runtime', () => {
  const greekFile = writeGlossFile({ λόγος: { primaryGloss: 'word', alternateGlosses: ['message'] } });
  const source = loadGlossSources({ greek: greekFile });
  const [merged] = mergeWithExisting(
    [{ word: 'λόγος', lemma: 'λόγος', gloss: '', pos: 'noun', freq: 1, lang: 'greek', parse: 'N-NSM', customGloss: 'my note' }],
    [],
    source
  );
  assert.equal(merged.primaryGloss, 'word');
  assert.equal(merged.customGloss, 'my note');
});
