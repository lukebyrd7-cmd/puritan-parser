const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const audit = require('../audits/v1.9.1-hebrew-vocabulary-audit.json');
const manualReview = require('../audits/v1.9.1-hebrew-vocabulary-manual-review.json');
const corrections = require('../data/glosses/corrections.json');
const glossSource = require('../data/glosses/hebrew-glosses.json');
const vocab = require('../vocab_all.json');
const GlossModel = require('../src/models/gloss');
const {
  EXPECTED_ENTRY_COUNT,
  GLOSS_STATUSES,
  MAPPING_STATUSES,
  buildAudit,
  classifyFrequency,
  parseVgbh
} = require('../scripts/vgbh-vocabulary-audit');

const sourcePath = process.env.VGBH_AUDIT_SOURCE || path.join(os.homedir(), 'Downloads', 'VGBH', 'VGBH_1-1903_Cleaned_With_Metadata.txt');

test('local VGBH parser extracts structured audit metadata without requiring runtime distribution', () => {
  const parsed = parseVgbh('#1\tאָב\t(ms) father (10)\n#2\tאָמַר\t(Q) say; also spelled אֹמֶר (10); cf אָב (#1)\n');
  assert.equal(parsed.length, 2);
  assert.deepEqual(parsed[0], {
    number: 1, headword: 'אָב', normalizedHeadword: 'אָב', consonants: 'אב', definition: '(ms) father (10)',
    frequency: 10, pos: 'noun', stems: [], alternateSpellings: [], crossReferences: []
  });
  assert.equal(parsed[1].pos, 'verb');
  assert.deepEqual(parsed[1].stems, ['Q']);
  assert.deepEqual(parsed[1].crossReferences, [1]);
});

test('all 1,903 audit entries are represented sequentially with mapping and gloss statuses', () => {
  assert.equal(audit.summary.totalEntries, EXPECTED_ENTRY_COUNT);
  assert.equal(audit.entries.length, EXPECTED_ENTRY_COUNT);
  audit.entries.forEach((entry, index) => {
    assert.equal(entry.vgbhNumber, index + 1);
    assert.ok(MAPPING_STATUSES.has(entry.mappingStatus), `entry ${entry.vgbhNumber} mapping`);
    assert.ok(GLOSS_STATUSES.has(entry.glossStatus), `entry ${entry.vgbhNumber} gloss`);
    assert.equal(Object.hasOwn(entry, 'definition'), false);
    assert.ok(entry.ppVocabularyId || entry.mappingReason);
  });
});

test('the available private source parses all 1,903 entries and reproduces the committed deterministic audit', { skip: !fs.existsSync(sourcePath) }, () => {
  const sourceText = fs.readFileSync(sourcePath, 'utf8');
  assert.equal(parseVgbh(sourceText).length, EXPECTED_ENTRY_COUNT);
  const regenerated = buildAudit({
    sourceText,
    vocab,
    glossSource,
    corrections,
    manualReview,
    sourceSha256: crypto.createHash('sha256').update(sourceText).digest('hex')
  });
  assert.deepEqual(regenerated.summary, audit.summary);
  assert.deepEqual(regenerated.source, audit.source);
  let sanitizedGlossChanges = 0;
  regenerated.entries.forEach((entry, index) => {
    const historical = audit.entries[index];
    const currentComparable = { ...entry }; const historicalComparable = { ...historical };
    for(const field of ['ppCurrentGloss','ppSourceGloss']){ delete currentComparable[field]; delete historicalComparable[field]; }
    assert.deepEqual(currentComparable, historicalComparable, `VGBH #${entry.vgbhNumber}`);
    if(entry.ppCurrentGloss !== historical.ppCurrentGloss || entry.ppSourceGloss !== historical.ppSourceGloss){
      sanitizedGlossChanges += 1;
      assert.doesNotMatch(`${entry.ppCurrentGloss || ''}; ${entry.ppSourceGloss || ''}`, /\b(?:see also|see|compare|marg\. for)\s+H\d+/i);
    }
  });
  assert.ok(sanitizedGlossChanges > 0);
});

test('stable-ID mapping keeps the two high-frequency אֵת homonyms distinct', () => {
  const objectMarker = audit.entries.find(entry => entry.vgbhNumber === 5);
  const preposition = audit.entries.find(entry => entry.vgbhNumber === 50);
  assert.equal(objectMarker.ppVocabularyId, 'lemma:hebrew:853');
  assert.equal(preposition.ppVocabularyId, 'lemma:hebrew:854');
  assert.notEqual(objectMarker.ppVocabularyId, preposition.ppVocabularyId);
  assert.equal(objectMarker.homographReview, true);
  assert.equal(preposition.homographReview, true);
});

test('manual review covers the top 100 and every applied correction', () => {
  assert.deepEqual(manualReview.reviewedEntryRanges, [[1, 100]]);
  assert.ok(audit.entries.slice(0, 100).every(entry => entry.manualReviewCompleted));
  const hebrewCorrections = corrections.corrections.filter(correction => correction.language === 'hebrew');
  const corrected = audit.entries.filter(entry => entry.correctionId);
  assert.equal(new Set(corrected.map(entry => entry.correctionId)).size, hebrewCorrections.length);
  for (const correction of hebrewCorrections) {
    const trigger = Number(correction.verificationTrigger.match(/entry (\d+)/)?.[1]);
    assert.equal(audit.entries[trigger - 1].manualReviewCompleted, true);
  }
});

test('correction manifest is stable-ID keyed and independently source-supported', () => {
  const hebrewCorrections = corrections.corrections.filter(correction => correction.language === 'hebrew');
  assert.equal(hebrewCorrections.length, 14);
  for (const correction of hebrewCorrections) {
    assert.match(correction.vocabularyId, /^lemma:hebrew:\S+$/);
    assert.match(correction.sourceReference, /Strong’s Hebrew Dictionary \(1890\), H\d+/);
    assert.doesNotMatch(correction.sourceReference, /VGBH/i);
    assert.match(correction.verificationTrigger, /verification only/i);
  }
});

test('effective resolver applies reviewed ordering and preserves personal add/replace modes', () => {
  GlossModel.setGlossCorrections(corrections);
  const expected = {
    113: ['lord', 'master', 'owner', 'sovereign'],
    120: ['man', 'mankind'],
    1571: ['also', 'even', 'again', 'likewise'],
    1696: ['speak', 'say', 'command'],
    2009: ['behold', 'see', 'lo'],
    259: ['one', 'united', 'alone', 'altogether'],
    310: ['after', 'behind', 'away from', 'the hind part'],
    3548: ['priest', 'chief ruler', 'prince'],
    3651: ['so', 'after that'],
    518: ['if', 'whether', 'but', 'except', 'either', 'lo'],
    5973: ['with', 'together with', 'among', 'accompanying', 'against'],
    8478: ['under', 'beneath', 'instead of', 'the bottom'],
    854: ['with', 'among', 'by', 'near', 'against', 'before'],
    859: ['you', 'thou', 'thee']
  };
  for (const correction of corrections.corrections.filter(item => item.language === 'hebrew')) {
    const lemma = correction.vocabularyId.replace(/^lemma:hebrew:/, '');
    const resolved = GlossModel.resolveLexicalGloss({ lang: 'hebrew', lemma, ...glossSource[lemma] }, { personal: null });
    assert.equal(resolved.correction?.valid, true, correction.id);
    assert.deepEqual(resolved.standard.all, expected[lemma], correction.id);
  }
  const word = { lang: 'hebrew', lemma: '120', ...glossSource['120'] };
  const standard = GlossModel.resolveLexicalGloss(word, { personal: null });
  const additive = GlossModel.resolveLexicalGloss(word, { personal: { mode: 'add', glosses: ['my reminder'] } });
  const replacement = GlossModel.resolveLexicalGloss(word, { personal: { mode: 'replace', glosses: ['my gloss'] } });
  assert.deepEqual(standard.standard.all, ['man', 'mankind']);
  assert.deepEqual(additive.effective.all, ['man', 'mankind', 'my reminder']);
  assert.deepEqual(replacement.effective.all, ['my gloss']);
  assert.match(GlossModel.glossSearchText(word), /man; mankind/);
  GlossModel.setGlossCorrections({ corrections: [] });
});

test('אָדָם keeps the human noun distinct from its red verb root and proper-name identity', () => {
  assert.equal(glossSource['119'].primaryGloss, 'be red');
  assert.equal(glossSource['120'].primaryGloss, 'man');
  assert.equal(glossSource['121'].primaryGloss, 'adam');
  assert.ok(vocab.some(entry => entry.lang === 'hebrew' && entry.lemma === '119' && entry.pos === 'verb'));
  assert.ok(vocab.some(entry => entry.lang === 'hebrew' && entry.lemma === '120' && entry.pos === 'noun'));
  assert.ok(vocab.some(entry => entry.lang === 'hebrew' && entry.lemma === '121' && entry.pos === 'noun'));
});

test('Search, Reader, Learn, and flashcards resolve learner-facing glosses through the shared model', () => {
  const files = {
    search: fs.readFileSync(path.join(ROOT, 'src/features/global-search/index.js'), 'utf8'),
    reader: fs.readFileSync(path.join(ROOT, 'src/features/reader/index.js'), 'utf8'),
    learn: fs.readFileSync(path.join(ROOT, 'src/features/learn/index.js'), 'utf8'),
    flashcards: fs.readFileSync(path.join(ROOT, 'src/features/flashcards/index.js'), 'utf8')
  };
  assert.match(files.search, /getDisplayGloss/);
  assert.match(files.reader, /resolveLexicalGloss/);
  assert.match(files.learn, /getDisplayGloss/);
  assert.match(files.flashcards, /getDisplayGloss/);
});

test('frequency variance thresholds are deterministic and frequency-aware', () => {
  assert.equal(classifyFrequency(100, 105).status, 'CLOSE');
  assert.equal(classifyFrequency(100, 140).status, 'MODERATE_VARIANCE');
  assert.equal(classifyFrequency(100, 200).status, 'LARGE_VARIANCE');
  assert.equal(classifyFrequency(100, 400).status, 'LIKELY_IDENTITY_MISMATCH');
});

test('the private transcription and raw definitions are not tracked or embedded in audit output', () => {
  const tracked = execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' }).split(/\r?\n/).filter(Boolean);
  assert.equal(tracked.some(file => /VGBH_1-1903_Cleaned_With_Metadata\.txt$/i.test(file)), false);
  assert.equal(JSON.stringify(audit).includes('Format: #Number'), false);
  assert.equal(audit.entries.some(entry => Object.hasOwn(entry, 'definition') || Object.hasOwn(entry, 'alternateSpellings')), false);
});
