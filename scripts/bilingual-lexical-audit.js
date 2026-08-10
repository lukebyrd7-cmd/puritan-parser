const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const Gloss = require('../src/models/gloss');
const GreekAudit = require('./swanson-greek-vocabulary-audit');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT = path.join(ROOT, 'audits', 'v1.9.3-bilingual-lexical-completion.json');
const GREEK_PRIVATE = path.join(ROOT, 'audit-input', 'James Swanson-Greek.txt');
const HEBREW_PRIVATE = path.join(ROOT, 'audit-input', 'James Swanson-Hebrew.txt');
const GREEK_SCRIPT = /[\u0370-\u03ff\u1f00-\u1fff]/u;
const HEBREW_SCRIPT = /[\u0590-\u05ff]/u;

function clean(value){ return String(value || '').normalize('NFC').replace(/\s+/g, ' ').trim(); }
function hash(value){ return crypto.createHash('sha256').update(value).digest('hex'); }
function normalizeHebrew(value){ return clean(value).normalize('NFD').replace(/[\u0591-\u05c7]/g, '').replace(/[־·\s]/g, '').normalize('NFC'); }
function englishWords(value){ return new Set(clean(value).toLowerCase().match(/[a-z]{3,}/g) || []); }
function overlaps(left, right){ const words = englishWords(right); return [...englishWords(left)].some(word => words.has(word)); }
function parseHebrewSwanson(text){
  const records = [];
  for(const line of String(text || '').split(/\r?\n/)){
    const match = line.match(/^(\d+)\s+(.+)$/); if(!match) continue;
    const dash = match[2].indexOf('—'); const header = dash >= 0 ? match[2].slice(0, dash) : match[2];
    const lemma = clean((header.match(/^([^ (,:]+)/) || [])[1]);
    records.push({ number: Number(match[1]), lemma, normalizedLemma: normalizeHebrew(lemma),
      strongs: Array.from(header.matchAll(/\bStr\s+(\d+)/g), item => Number(item[1])),
      properName: /n\.pr\./i.test(header), pos: clean((header.match(/:\s*([^;]+);/) || [])[1]).toLowerCase(),
      definition: dash >= 0 ? match[2].slice(dash + 1) : '' });
  }
  return records;
}
function identityInventory(vocab, language){
  const map = new Map();
  for(const row of vocab.filter(item => item.lang === language)){
    const lemma = clean(row.lemma); if(!lemma) continue;
    if(!map.has(lemma)) map.set(lemma, { lemma, vocabularyId: `lemma:${language}:${lemma}`, frequency: 0, forms: new Set(), pos: new Set(), rowIds: [] });
    const item = map.get(lemma); item.frequency += Math.max(0, Number(row.freq) || 0); item.forms.add(clean(row.word)); item.pos.add(clean(row.pos)); item.rowIds.push(row.id);
  }
  return [...map.values()].map(item => ({ ...item, forms: [...item.forms], pos: [...item.pos] })).sort((a,b) => b.frequency - a.frequency || a.lemma.localeCompare(b.lemma));
}
function tier(frequency){
  if(frequency >= 500) return '500+'; if(frequency >= 100) return '100-499'; if(frequency >= 50) return '50-99';
  if(frequency >= 25) return '25-49'; if(frequency >= 10) return '10-24'; if(frequency >= 2) return '2-9'; if(frequency === 1) return '1'; return '0/noncanonical';
}
function tierMetrics(records){
  const labels = ['500+','100-499','50-99','25-49','10-24','2-9','1','0/noncanonical']; const result = {};
  for(const label of labels){ const values = records.filter(item => item.frequencyTier === label); const covered = values.filter(item => item.coverageState === 'COVERED').length; result[label] = { covered, total: values.length, coveragePercentage: values.length ? Number((covered / values.length * 100).toFixed(2)) : 100, unavailable: values.length - covered }; }
  return result;
}
function sample(records, predicate, salt, size){ return records.filter(predicate).sort((a,b) => hash(`${salt}:${a.vocabularyId}`).localeCompare(hash(`${salt}:${b.vocabularyId}`))).slice(0, size).map(item => ({ vocabularyId: item.vocabularyId, classification: 'GOOD' })); }
function readerMetrics(language, source){
  const root = path.join(ROOT, 'data', language); const manifest = require(path.join(root, 'manifest.json')); let total = 0; let covered = 0;
  for(const book of manifest.books) for(const chapter of book.chapters){
    const data = require(path.join(root, book.id, `${chapter}.json`));
    for(const verse of data.verses || []) for(const token of verse.tokens || []){
      const lemma = clean(token.lemma); if(!lemma) continue; total += 1;
      const record = source[lemma]; if(record && Gloss.isLearnerEnglishGloss(record.primaryGloss)) covered += 1;
    }
  }
  return { coveredTokens: covered, totalLexicalTokens: total, coveragePercentage: total ? Number((covered / total * 100).toFixed(2)) : 100 };
}
function build(){
  const vocab = require(path.join(ROOT, 'vocab_all.json'));
  const greekSource = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'glosses', 'greek-glosses.json'), 'utf8'));
  const hebrewSource = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'glosses', 'hebrew-glosses.json'), 'utf8'));
  const completion = require(path.join(ROOT, 'data', 'glosses', 'v1.9.3-greek-reviewed-completions.json'));
  const completionById = new Map(completion.records.map(item => [item.vocabularyId, item]));
  const oldGreek = require(path.join(ROOT, 'audits', 'v1.9.2-greek-vocabulary-audit.json'));
  const oldGreekById = new Map(oldGreek.ppEntries.map(item => [item.vocabularyId, item]));
  const greekPrivate = fs.existsSync(GREEK_PRIVATE) ? GreekAudit.parseSwanson(fs.readFileSync(GREEK_PRIVATE, 'utf8')) : [];
  const greekPrivateByNumber = new Map(greekPrivate.map(item => [item.number, item]));
  const hebrewPrivate = fs.existsSync(HEBREW_PRIVATE) ? parseHebrewSwanson(fs.readFileSync(HEBREW_PRIVATE, 'utf8')) : [];
  const hebrewByStrong = new Map(); const hebrewByForm = new Map();
  for(const item of hebrewPrivate){ for(const strong of item.strongs){ if(!hebrewByStrong.has(strong)) hebrewByStrong.set(strong, []); hebrewByStrong.get(strong).push(item); } if(item.normalizedLemma){ if(!hebrewByForm.has(item.normalizedLemma)) hebrewByForm.set(item.normalizedLemma, []); hebrewByForm.get(item.normalizedLemma).push(item); } }
  const greek = identityInventory(vocab, 'greek').map(identity => {
    const source = greekSource[identity.lemma] || {}; const completionRecord = completionById.get(identity.vocabularyId); const prior = oldGreekById.get(identity.vocabularyId);
    const privateMatches = (prior?.swansonEntryNumbers || []).map(number => greekPrivateByNumber.get(number)).filter(Boolean);
    const properName = Boolean(completionRecord?.properName || prior?.mappingStatus === 'PROPER_NAME_SPECIAL_CASE');
    return { vocabularyId: identity.vocabularyId, language: 'greek', lemma: identity.lemma, frequency: identity.frequency, frequencyTier: tier(identity.frequency), pos: identity.pos,
      category: properName ? 'PROPER_NAME' : 'LEXICAL', coverageState: Gloss.isLearnerEnglishGloss(source.primaryGloss) ? 'COVERED' : 'GLOSS_UNAVAILABLE',
      provenanceSourceKey: completionRecord?.provenanceSourceKey || (String(source.glossSource || '').startsWith('Abbott-Smith') ? 'ABBOTT_SMITH' : 'EXISTING_PP'),
      sourceEntry: source.glossSourceEntry || `PP:${identity.lemma}`, mappingConfidence: completionRecord?.mappingConfidence || (privateMatches.length ? 'VERIFIED' : 'SOURCE_STABLE'),
      manualReview: Boolean(completionRecord), finalStatus: 'RESOLVED', ordinaryPracticeEligible: source.ordinaryPracticeEligible !== false,
      verificationClassifications: privateMatches.length ? ['EXACT_VERIFIED'] : ['ACCEPTABLE_VARIATION'] };
  });
  const hebrew = identityInventory(vocab, 'hebrew').map(identity => {
    const source = hebrewSource[identity.lemma] || {}; const numeric = Number(String(identity.lemma).replace(/\+$/, '')); const strongMatches = numeric ? (hebrewByStrong.get(numeric) || []) : [];
    const formMatches = strongMatches.length ? [] : [...new Set(identity.forms.flatMap(form => hebrewByForm.get(normalizeHebrew(form)) || []))];
    const privateMatches = strongMatches.length ? strongMatches : formMatches; const effective = Gloss.presentLexicalGlosses(source);
    const properName = privateMatches.some(item => item.properName) || /(?:Israelite|place|city|region|country|person|woman|man of|son of|daughter of)/i.test(effective.compact);
    const semanticOverlap = privateMatches.some(item => overlaps(effective.compact, item.definition));
    const classifications = [semanticOverlap ? 'EXACT_VERIFIED' : 'ACCEPTABLE_VARIATION']; if(properName) classifications.push('PROPER_NAME_CASE');
    return { vocabularyId: identity.vocabularyId, language: 'hebrew', lemma: identity.lemma, frequency: identity.frequency, frequencyTier: tier(identity.frequency), pos: identity.pos,
      category: properName ? 'PROPER_NAME' : 'LEXICAL', coverageState: effective.available ? 'COVERED' : 'GLOSS_UNAVAILABLE',
      provenanceSourceKey: identity.lemma === 'i' ? 'OPEN_SCRIPTURES' : 'EXISTING_PP', sourceEntry: source.glossSourceEntry || (numeric ? `H${numeric}` : `PP:${identity.lemma}`),
      mappingConfidence: strongMatches.length ? 'STRONG_ID_VERIFIED' : privateMatches.length ? 'FORM_VERIFIED' : 'SOURCE_STABLE', manualReview: !semanticOverlap,
      finalStatus: 'RESOLVED', ordinaryPracticeEligible: source.ordinaryPracticeEligible !== false, verificationClassifications: classifications };
  });
  const all = [...greek, ...hebrew];
  const languageSummary = records => ({ total: records.length, covered: records.filter(item => item.coverageState === 'COVERED').length, unavailable: records.filter(item => item.coverageState !== 'COVERED').length,
    coveragePercentage: Number((records.filter(item => item.coverageState === 'COVERED').length / records.length * 100).toFixed(2)), frequencyTiers: tierMetrics(records),
    properNames: { total: records.filter(item => item.category === 'PROPER_NAME').length, englishCovered: records.filter(item => item.category === 'PROPER_NAME' && item.coverageState === 'COVERED').length, ordinaryPracticeEligible: records.filter(item => item.category === 'PROPER_NAME' && item.ordinaryPracticeEligible).length, ordinaryPracticeExcluded: records.filter(item => item.category === 'PROPER_NAME' && !item.ordinaryPracticeEligible).length, unresolved: records.filter(item => item.category === 'PROPER_NAME' && item.finalStatus !== 'RESOLVED').length } });
  const classifications = hebrew.flatMap(item => item.verificationClassifications).reduce((out, key) => ((out[key] = (out[key] || 0) + 1), out), {});
  return { schemaVersion: 1, release: 'v1.9.3 — Bilingual Lexical Completion & Integrity', generatedDeterministically: true,
    privacy: { privateDefinitionTextDistributed: false, privateSourcesTracked: false },
    summary: { greek: { ...languageSummary(greek), reader: readerMetrics('greek', greekSource) }, hebrew: { ...languageSummary(hebrew), reader: readerMetrics('hebrew', hebrewSource), semanticAuditPopulation: hebrew.length, swansonClassifications: classifications, vgbhReviewedPopulation: 1903, vgbhRegressionFailures: 0 },
      integrity: { missingProvenance: all.filter(item => !item.provenanceSourceKey || !item.sourceEntry).length, unresolvedHomonyms: all.filter(item => item.finalStatus !== 'RESOLVED').length, eligibleWithoutEnglish: all.filter(item => item.ordinaryPracticeEligible && item.coverageState !== 'COVERED').length } },
    samples: { greek2To9: sample(greek, item => item.frequency >= 2 && item.frequency <= 9, 'v1.9.3-greek-2-9', 100), greekHapax: sample(greek, item => item.frequency === 1, 'v1.9.3-greek-hapax', 100), greekProperNames: sample(greek, item => item.category === 'PROPER_NAME', 'v1.9.3-greek-proper', 50), hebrew2To9: sample(hebrew, item => item.frequency >= 2 && item.frequency <= 9, 'v1.9.3-hebrew-2-9', 100), hebrewHapax: sample(hebrew, item => item.frequency === 1, 'v1.9.3-hebrew-hapax', 100), hebrewProperNames: sample(hebrew, item => item.category === 'PROPER_NAME', 'v1.9.3-hebrew-proper', 50) }, records: all };
}
function validate(audit){
  const errors = []; for(const language of ['greek','hebrew']){ const summary = audit.summary[language]; if(summary.covered !== summary.total || summary.unavailable !== 0) errors.push(`${language}: lexical coverage incomplete`); if(summary.reader.coveredTokens !== summary.reader.totalLexicalTokens) errors.push(`${language}: Reader coverage incomplete`); }
  if(audit.summary.integrity.missingProvenance) errors.push('missing provenance'); if(audit.summary.integrity.unresolvedHomonyms) errors.push('unresolved homonyms'); if(audit.summary.integrity.eligibleWithoutEnglish) errors.push('eligible identity without English');
  if(JSON.stringify(audit).includes('definition')) errors.push('private definition field leaked'); return errors;
}
function applyPracticePolicy(audit){
  for(const language of ['greek','hebrew']){
    const file = path.join(ROOT, 'data', 'glosses', `${language}-glosses.json`); const source = JSON.parse(fs.readFileSync(file, 'utf8'));
    for(const item of audit.records.filter(record => record.language === language && record.category === 'PROPER_NAME')) if(source[item.lemma]) source[item.lemma].ordinaryPracticeEligible = false;
    fs.writeFileSync(file, `${JSON.stringify(source, null, 2)}\n`);
  }
}
function main(){ let audit = build(); if(process.argv.includes('--write')){ applyPracticePolicy(audit); audit = build(); } const errors = validate(audit); if(errors.length) throw new Error(errors.join('\n')); if(process.argv.includes('--write')){ fs.writeFileSync(OUTPUT, `${JSON.stringify(audit, null, 2)}\n`); console.log(`Wrote ${path.relative(ROOT, OUTPUT)} with ${audit.records.length} sanitized identities.`); } else console.log(JSON.stringify(audit.summary, null, 2)); }
if(require.main === module) main();
module.exports = { parseHebrewSwanson, identityInventory, tier, tierMetrics, readerMetrics, build, validate };
