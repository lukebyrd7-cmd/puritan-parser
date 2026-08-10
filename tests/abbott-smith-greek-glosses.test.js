const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const manifest = require('../data/metadata/abbott-smith-source.json');
const review = require('../data/glosses/abbott-smith-reviewed-high-frequency.json');
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
  assert.deepEqual(entries[0].alternateForms, ['λόγον']);
  assert.deepEqual(entries[0].crossReferences, ['λέγω']);
  assert.equal(entries[0].homonymCount, 2);
});

test('learner extraction admits concise English and rejects prose, citations, and grammatical commentary', () => {
  assert.deepEqual(AbbottSmith.learnerCandidates({ glosses: ['to sleep', 'Mt 1:1', 'c. acc.', 'its wall had jasper built into it', 'fall asleep'] }), ['sleep', 'fall asleep']);
  assert.equal(AbbottSmith.automaticGloss({ glosses: ['word', 'message'] }).status, 'RECOVERED_AUTOMATIC');
  assert.equal(AbbottSmith.automaticGloss({ glosses: ['alpha', 'beta', 'gamma', 'delta', 'epsilon'] }).status, 'EXTRACTION_UNSAFE');
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
      assert.ok(value.length <= 56, value);
    }
  }
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
});
