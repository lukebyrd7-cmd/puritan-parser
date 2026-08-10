const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Gloss = require('../src/models/gloss');
const Audit = require('../scripts/bilingual-lexical-audit');

const ROOT = path.resolve(__dirname, '..');
const report = require('../audits/v1.9.3-bilingual-lexical-completion.json');
const greek = require('../data/glosses/greek-glosses.json');
const hebrew = require('../data/glosses/hebrew-glosses.json');
const completion = require('../data/glosses/v1.9.3-greek-reviewed-completions.json');

test('v1.9.3 permanently enforces complete bilingual lexical identity coverage', () => {
  assert.deepEqual(Audit.validate(report), []);
  assert.deepEqual({ total: report.summary.greek.total, covered: report.summary.greek.covered, unavailable: report.summary.greek.unavailable }, { total: 5478, covered: 5478, unavailable: 0 });
  assert.deepEqual({ total: report.summary.hebrew.total, covered: report.summary.hebrew.covered, unavailable: report.summary.hebrew.unavailable }, { total: 9152, covered: 9152, unavailable: 0 });
  assert.equal(report.summary.greek.reader.coveragePercentage, 100);
  assert.equal(report.summary.hebrew.reader.coveragePercentage, 100);
});

test('every standard lexical identity has learner English and sanitized provenance', () => {
  assert.equal(report.records.length, 14630);
  assert.equal(new Set(report.records.map(item => item.vocabularyId)).size, report.records.length);
  for(const item of report.records){
    const source = item.language === 'greek' ? greek[item.lemma] : hebrew[item.lemma];
    assert.ok(source, item.vocabularyId);
    assert.equal(Gloss.isLearnerEnglishGloss(source.primaryGloss), true, item.vocabularyId);
    assert.ok(item.provenanceSourceKey && item.sourceEntry, item.vocabularyId);
    assert.equal(item.finalStatus, 'RESOLVED', item.vocabularyId);
  }
  assert.equal(report.summary.integrity.missingProvenance, 0);
  assert.equal(report.summary.integrity.unresolvedHomonyms, 0);
  assert.equal(report.summary.integrity.eligibleWithoutEnglish, 0);
});

test('source script, malformed source metadata, and unavailable sentinels never masquerade as English', () => {
  for(const [language, source] of [['greek', greek], ['hebrew', hebrew]]) for(const [lemma, record] of Object.entries(source)){
    const compact = [record.primaryGloss, ...(record.alternateGlosses || [])].join('; ');
    assert.equal(language === 'greek' ? Gloss.containsGreekScript(compact) : Gloss.containsHebrewScript(compact), false, `${language}:${lemma}`);
    assert.equal(/\b(?:Strong['’]s|G\d{2,}|H\d{2,}|LXX|TWOT|q\.v\.|s\.v\.|v\.s\.)\b/i.test(compact), false, `${language}:${lemma}`);
    assert.equal(/^(?:unknown|unavailable|gloss unavailable)$/i.test(record.primaryGloss), false, `${language}:${lemma}`);
  }
});

test('proper names are covered but remain independently excluded from ordinary practice', () => {
  for(const language of ['greek','hebrew']){
    const metrics = report.summary[language].properNames;
    assert.equal(metrics.englishCovered, metrics.total);
    assert.equal(metrics.ordinaryPracticeEligible, 0);
    assert.equal(metrics.ordinaryPracticeExcluded, metrics.total);
    assert.equal(metrics.unresolved, 0);
  }
});

test('all former Greek tail categories are exhausted with stable homonym separation', () => {
  assert.equal(completion.records.length, 769);
  assert.deepEqual(completion.summary.priorCategories, { EXTRACTION_UNSAFE: 329, PROPER_NAME_EXCLUDED: 407, SOURCE_DISAGREEMENT: 5, NO_ABBOTT_SMITH_ENTRY: 15, HOMONYM_COLLISION: 13 });
  const expected = new Map([['lemma:greek:γάζα','treasure'],['lemma:greek:Γάζα','Gaza'],['lemma:greek:σμύρνα','myrrh'],['lemma:greek:Σμύρνα','Smyrna'],['lemma:greek:φοῖνιξ','palm tree'],['lemma:greek:Φοῖνιξ','Phoenicia']]);
  for(const [id, gloss] of expected){ const item = completion.records.find(record => record.vocabularyId === id); assert.equal(item.primaryGloss, gloss); }
});

test('deterministic semantic samples are complete and contain no sampled problem', () => {
  for(const [key, values] of Object.entries(report.samples)){
    assert.equal(values.length, key.toLowerCase().includes('proper') ? 50 : 100, key);
    assert.equal(values.some(item => item.classification === 'PROBLEM'), false, key);
  }
});

test('private verification sources remain ignored and absent from distributed audit fields', () => {
  const ignore = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8').split(/\r?\n/);
  assert.ok(ignore.includes('audit-input/'));
  assert.equal(report.privacy.privateDefinitionTextDistributed, false);
  assert.equal(report.privacy.privateSourcesTracked, false);
  assert.equal(report.records.some(item => Object.hasOwn(item, 'definition')), false);
});
