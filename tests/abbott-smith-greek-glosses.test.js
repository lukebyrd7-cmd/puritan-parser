const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const manifest = require('../data/metadata/abbott-smith-source.json');
const review = require('../data/glosses/abbott-smith-reviewed-high-frequency.json');
const qualityReview = require('../data/glosses/abbott-smith-learner-quality-review.json');
const verification = require('../data/glosses/abbott-smith-swanson-verification.json');
const glosses = require('../data/glosses/greek-glosses.json');
const audit = require('../audits/v1.9.2-abbott-smith-import.json');
const vocab = require('../vocab_all.json');
const GlossModel = require('../src/models/gloss');
const StudyEntries = require('../src/core/study-entries');
const LearningPractice = require('../src/core/learning-practice');
const { applyGreekLexicalSource } = require('../src/core/source-data/vocab-source');
const AbbottSmith = require('../scripts/abbott-smith-greek-glosses');

test('Abbott-Smith provenance pins the exact public-domain TEI release and source hashes', () => {
  assert.equal(manifest.source.release, '1.1');
  assert.equal(manifest.source.releaseCommit, '64fd85d');
  assert.equal(manifest.source.license, 'Public domain');
  assert.match(manifest.source.licenseEvidence, /marked-up version.*public domain/i);
  assert.deepEqual(manifest.files.map(item => item.sha256), [
    '6bdeda42d25d5fa3c3b0a230a6cf9e753f1ec431d0ef3613054786b427dfe323',
    '072d60acc2dd17a49cbaa86a8e1f63f936470486c8953fbd5fb8c7d0551ccb7d'
  ]);
  if(manifest.files.every(item => fs.existsSync(path.join(ROOT, item.path)))) assert.deepEqual(AbbottSmith.verifySourceFiles(), []);
});

test('TEI parser retains identity signals, senses, alternates, cross references, and homonym distinctions', () => {
  const fixture = `<entry n="λόγος|G3056"><note type="occurrencesNT">3</note><form><orth>λόγος</orth><orth>λόγον</orth></form><pos>noun</pos><sense><gloss>word</gloss><ref osisRef="John.1.1">Jn 1:1</ref></sense><re>λέγω</re></entry>
    <entry n="λόγος|G9999"><form><orth>λόγος</orth></form><sense><gloss>account</gloss></sense></entry>`;
  const entries = AbbottSmith.parseAbbottSmith(fixture);
  assert.equal(entries.length, 2);
  assert.deepEqual({ headword: entries[0].headword, normalized: entries[0].normalizedHeadword, strong: entries[0].strong, pos: entries[0].pos }, { headword: 'λόγος', normalized: 'λογος', strong: 3056, pos: 'noun' });
  assert.deepEqual(entries[0].glosses, ['word']);
  assert.deepEqual(entries[0].lexicalGlosses, ['word']);
  assert.deepEqual(entries[0].etymologyGlosses, []);
  assert.deepEqual(entries[0].alternateForms, ['λόγον']);
  assert.deepEqual(entries[0].crossReferences, ['λέγω']);
  assert.equal(entries[0].homonymCount, 2);
});

test('learner extraction admits concise English and rejects prose, citations, and grammatical commentary', () => {
  assert.deepEqual(AbbottSmith.learnerCandidates({ glosses: ['to sleep', 'Mt 1:1', 'c. acc.', 'its wall had jasper built into it', 'fall asleep'] }), ['sleep', 'fall asleep']);
  assert.deepEqual(AbbottSmith.learnerCandidates({ glosses: ["to defend one's self", 'to practise', 'upon', 'S. properly so-called'] }), ['defend oneself', 'practice']);
  assert.equal(AbbottSmith.automaticGloss({ glosses: ['word', 'message'] }).status, 'RECOVERED_AUTOMATIC');
  assert.equal(AbbottSmith.automaticGloss({ glosses: ['alpha', 'beta', 'gamma', 'delta', 'epsilon'] }).status, 'EXTRACTION_UNSAFE');
});

test('sense-level glosses outrank derivational gloss fragments', () => {
  const fixture = `<entry n="φιμόω|G5392"><form><orth>φιμόω</orth></form><etym><gloss>a muzzle</gloss></etym><sense><gloss>to muzzle</gloss><gloss>to silence</gloss></sense></entry>`;
  const [entry] = AbbottSmith.parseAbbottSmith(fixture);
  assert.deepEqual(entry.etymologyGlosses, ['a muzzle']);
  assert.deepEqual(entry.lexicalGlosses, ['to muzzle', 'to silence']);
  assert.deepEqual(AbbottSmith.learnerCandidates(entry), ['muzzle', 'silence']);
});

test('all 40 high-frequency identities are stable-ID mapped, source-traceable, manually ordered, and recovered', () => {
  assert.equal(review.records.length, 40);
  assert.equal(audit.reviewedHighFrequency.length, 40);
  for(const item of audit.reviewedHighFrequency){
    assert.equal(item.vocabularyId, `lemma:greek:${item.lemma}`);
    assert.ok(item.frequency >= 10 && item.frequency < 25, item.vocabularyId);
    assert.equal(item.action, 'RECOVERED_MANUAL');
    assert.equal(item.identityConfidence, 'HIGH');
    assert.match(item.abbottSmithIdentity, /\|G\d+$/);
    assert.notEqual(item.swansonVerification, 'NOT_SAMPLED');
    assert.equal(GlossModel.isLearnerEnglishGloss(item.extractedLearnerGloss), true, item.vocabularyId);
  }
  assert.deepEqual(GlossModel.resolveLexicalGloss({ lang: 'greek', lemma: 'κοιμάομαι', ...glosses['κοιμάομαι'] }).standard.all, ['fall asleep', 'put to sleep']);
});

test('deterministic lower-frequency verification contains 100 classifications and vetoes unresolved sample entries', () => {
  assert.equal(verification.sampleIds.length, 100);
  assert.equal(new Set(verification.sampleIds).size, 100);
  assert.equal(audit.summary.lowerFrequencySwansonSampleComplete, true);
  assert.equal(audit.lowerFrequencySwansonVerification.length, 100);
  const allowed = new Set(['AGREES','ACCEPTABLE_VARIATION','SENSE_ORDER_DIFFERENCE','POSSIBLE_MISSING_SENSE','IDENTITY_CONCERN','NEEDS_HUMAN_REVIEW']);
  assert.ok(audit.lowerFrequencySwansonVerification.every(item => allowed.has(item.classification)));
  assert.equal(audit.summary.actions.SOURCE_DISAGREEMENT, 5);
});

test('runtime Abbott-Smith records contain only compact learner fields and no lexicon prose leakage', () => {
  const recovered = Object.values(glosses).filter(record => String(record.glossSource || '').startsWith('Abbott-Smith'));
  assert.equal(recovered.length, 2930);
  for(const record of recovered){
    assert.ok(Object.keys(record).every(key => ['primaryGloss','alternateGlosses','glossSource','glossSourceUrl','glossLicense','glossAttribution','glossSourceEntry','glossSourceStrong'].includes(key)), record.glossSourceEntry);
    for(const value of [record.primaryGloss, ...record.alternateGlosses]){
      assert.equal(GlossModel.isLearnerEnglishGloss(value), true, `${record.glossSourceEntry}: ${value}`);
      assert.doesNotMatch(value, /<[^>]+>|\b(?:Matt?|Mk|Luke|Jn|Acts?|Rom|Cor|Rev)\.?\s*\d|\b(?:c\. acc|s\.v|q\.v|v\.s)\b/i);
      assert.doesNotMatch(value, /set at nought|put asunder|one['’]s self|\b(?:lit\.?|literally)\b|s\. properly|Strong['’]?s|\bG\d{2,}\b/i);
      assert.ok(value.length <= 56, value);
    }
  }
});

test('all 2,930 recoveries receive deterministic learner-quality classification and completed review', () => {
  const quality = audit.learnerGlossQuality;
  assert.equal(quality.totalRecoveredIdentities, 2930);
  assert.deepEqual(quality.initialClassificationTotals, {
    GOOD_LEARNER_GLOSS: 2719,
    ARCHAIC_WORDING: 56,
    ARCHAIC_SPELLING: 32,
    LEXICOGRAPHICAL_PROSE: 9,
    PRIMARY_ORDER_PROBLEM: 29,
    OVERLY_LONG: 8,
    REDUNDANT_SENSES: 37,
    ROOT_OR_ETYMOLOGY_LANGUAGE: 89,
    IDIOM_AS_LEXICAL: 13,
    ODD_REFLEXIVE_WORDING: 1,
    SOURCE_METADATA_LEAKAGE: 1,
    PUNCTUATION_OR_FORMATTING: 14,
    POSSIBLE_SEMANTIC_PROBLEM: 8,
    NEEDS_HUMAN_REVIEW: 0
  });
  assert.deepEqual(quality.finalClassificationTotals, Object.fromEntries([
    ['GOOD_LEARNER_GLOSS', 2930],
    ...AbbottSmith.QUALITY_CLASSIFICATIONS.filter(value => value !== 'GOOD_LEARNER_GLOSS').map(value => [value, 0])
  ]));
  assert.equal(quality.automaticallyNormalizedIdentities, 113);
  assert.equal(quality.manuallyCorrectedIdentities, 99);
  assert.equal(quality.primarySensesReordered, 30);
  assert.equal(quality.duplicateOrArchaicSensesRemoved, 82);
  assert.equal(quality.identitiesReturnedToUnavailable, 0);
  assert.equal(quality.allFlaggedManualReviewCompleted, true);
  assert.equal(audit.learnerGlossQualityRecords.length, 2930);
  assert.ok(audit.learnerGlossQualityRecords.every(item => item.manualReviewCompleted && item.finalClassifications.length === 1 && item.finalClassifications[0] === 'GOOD_LEARNER_GLOSS'));
});

test('stratified 2-9 and hapax samples each contain 100 manually reviewed identities across parts of speech', () => {
  for(const [name, sample] of Object.entries(audit.learnerGlossQuality.samples)){
    assert.equal(sample.length, 100, name);
    assert.equal(new Set(sample.map(item => item.vocabularyId)).size, 100, name);
    assert.ok(sample.every(item => item.manualReviewCompleted), name);
    assert.ok(new Set(sample.flatMap(item => item.partOfSpeech)).size >= 5, name);
    if(name === 'frequency2To9') assert.ok(sample.every(item => item.frequency >= 2 && item.frequency <= 9));
    else assert.ok(sample.every(item => item.frequency === 1));
  }
  assert.equal(qualityReview.samples.frequency2To9.manualReviewCompleted, true);
  assert.equal(qualityReview.samples.hapax.manualReviewCompleted, true);
});

test('known learner-quality cases retain meaning with modern concise presentation', () => {
  const resolved = lemma => GlossModel.resolveLexicalGloss({ lang: 'greek', lemma, ...glosses[lemma] }).standard.all;
  assert.deepEqual(resolved('ἐξουθενέω'), ['despise utterly', 'treat with contempt']);
  assert.deepEqual(resolved('χωρίζω'), ['separate', 'divide']);
  assert.deepEqual(resolved('ἀπολογέομαι'), ['defend oneself']);
  assert.deepEqual(resolved('ὀνειδίζω'), ['reproach']);
  assert.deepEqual(resolved('νομίζω'), ['consider', 'suppose', 'practice']);
  assert.deepEqual(resolved('κοιμάομαι'), ['fall asleep', 'put to sleep']);
  assert.deepEqual(resolved('κατέχω'), ['restrain', 'hold fast', 'possess']);
  assert.deepEqual(resolved('ἀπολαμβάνω'), ['receive from', 'receive back', 'take aside']);
  assert.deepEqual(resolved('σιωπάω'), ['be silent or still']);
  assert.deepEqual(resolved('φιμόω'), ['muzzle', 'silence']);
  assert.deepEqual(resolved('παραβάτης'), ['a transgressor']);
  assert.deepEqual(resolved('χειραγωγός'), ['a guide', 'leading by the hand']);
});

test('Swanson remains a wording-free safety check with no proposed correction vetoed', () => {
  const safety = audit.learnerGlossQuality.swansonSafetyChecks;
  assert.equal(safety.identitiesChecked, 13);
  assert.equal(safety.vetoes, 0);
  assert.equal(safety.wordingCopied, false);
  assert.equal(safety.results.length, 13);
  assert.ok(safety.results.every(row => row.length === 2 && row[0].startsWith('lemma:greek:')));
});

test('exhaustive Greek English resolution is either trustworthy English or explicit unavailable', () => {
  assert.equal(Object.keys(glosses).length, 5478);
  let covered = 0; let unavailable = 0;
  for(const [lemma, record] of Object.entries(glosses)){
    const resolved = GlossModel.resolveLexicalGloss({ lang: 'greek', lemma, ...record }, { missingLabel: 'Gloss unavailable' }).standard;
    if(resolved.available){ covered++; assert.equal(GlossModel.isLearnerEnglishGloss(resolved.compact), true, lemma); }
    else { unavailable++; assert.equal(resolved.compact, 'Gloss unavailable', lemma); }
    assert.equal(GlossModel.containsGreekScript(resolved.compact), false, lemma);
  }
  assert.deepEqual({ covered, unavailable }, { covered: 4709, unavailable: 769 });
});

test('runtime lexical overlay preserves IDs and enables recovered entries across shared practice behavior', () => {
  const greek = vocab.filter(item => item.lang === 'greek').map(item => ({ ...item, alternateGlosses: [...(item.alternateGlosses || [])] }));
  const ids = new Map(greek.map(item => [item.id, item.lemma]));
  applyGreekLexicalSource(greek, glosses);
  assert.ok(greek.every(item => ids.get(item.id) === item.lemma));
  const grouped = StudyEntries.getStudyEntries(greek, 'lemma');
  const result = LearningPractice.filterStudyableEntries(grouped, 'greek', { model: require('../src/models/vocabulary-learning') });
  assert.equal(result.entries.length, 4709);
  assert.ok(result.entries.some(item => item.lemma === 'κοιμάομαι'));
  assert.ok(result.entries.some(item => item.lemma === 'μαργαρίτης'));
  assert.ok(result.entries.some(item => item.lemma === 'ἀρχαῖος'));
  assert.ok(result.entries.some(item => item.lemma === 'ἀμέμπτως'));
  assert.ok(result.entries.some(item => item.lemma === 'κυκλόθεν'));
  assert.ok(result.entries.some(item => item.lemma === 'δήπου'));
});

test('proper names remain separate and the correction layer still controls αἴρω', () => {
  assert.equal(audit.summary.actions.PROPER_NAME_EXCLUDED, 407);
  assert.equal(audit.summary.ordinaryStudyRelevantIdentities, 4915);
  const excluded = audit.remainingUnavailable.find(item => item.category === 'PROPER_NAME_EXCLUDED');
  assert.ok(excluded);
  assert.equal(GlossModel.containsGreekScript(glosses[excluded.lemma].primaryGloss), true);
  GlossModel.setGlossCorrections(require('../data/glosses/corrections.json'));
  assert.deepEqual(GlossModel.resolveLexicalGloss({ lang: 'greek', lemma: 'αἴρω', ...glosses['αἴρω'] }).standard.all, ['remove', 'take up', 'lift']);
});

test('generated output is deterministic when the pinned development source is available', { skip: AbbottSmith.verifySourceFiles().length > 0 }, () => {
  const rebuilt = AbbottSmith.build(AbbottSmith.inputs());
  assert.equal(AbbottSmith.sha256(JSON.stringify(rebuilt.glossSource)), audit.generatedAsset.logicalSha256);
  assert.deepEqual(rebuilt.audit.summary, audit.summary);
  assert.deepEqual(rebuilt.audit.learnerGlossQuality, audit.learnerGlossQuality);
});
