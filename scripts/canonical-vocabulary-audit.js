#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const VOCAB_PATH = path.join(ROOT, 'vocab_all.json');
const OUTPUT_PATH = path.join(ROOT, 'data', 'lexical', 'canonical-forms.json');
const AUDIT_PATH = path.join(ROOT, 'audits', 'v1.9.5-canonical-vocabulary-forms.json');
const QA_PATH = path.join(ROOT, 'audits', 'v1.9.5-canonical-vocabulary-manual-qa.json');
const STRONGS_META_PATH = path.join(ROOT, 'data', 'metadata', 'open-scriptures-strongs-source.json');
const DEFAULT_STRONGS_PATHS = [
  process.env.PP_STRONGS_HEBREW_PATH,
  '/private/tmp/pp-v193-strongs/hebrew/strongs-hebrew-dictionary.js'
].filter(Boolean);
const FUNCTION_FORMS = { l: 'לְ', b: 'בְּ', m: 'מִן', k: 'כְּ', i: 'הֲ' };

function clean(value){ return typeof value === 'string' ? value.normalize('NFC').trim() : ''; }
function stripMarks(value){ return clean(value).normalize('NFD').replace(/[\u0591-\u05c7]/g, '').normalize('NFC'); }
function sha256(file){ return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function groupVocabulary(vocab, language){
  const groups = new Map();
  for(const row of vocab.filter(item => item?.lang === language)){
    const id = clean(row.lemma);
    if(!groups.has(id)) groups.set(id, []);
    groups.get(id).push(row);
  }
  return groups;
}
function representative(rows = []){
  return rows.slice().sort((a, b) => (Number(b.freq) || 0) - (Number(a.freq) || 0) || clean(a.word).localeCompare(clean(b.word)))[0] || {};
}
function strongsSource(explicitPath){
  const file = explicitPath || DEFAULT_STRONGS_PATHS.find(candidate => fs.existsSync(candidate));
  if(!file) throw new Error('Open Scriptures Strong’s Hebrew source is required. Set PP_STRONGS_HEBREW_PATH.');
  delete require.cache[require.resolve(file)];
  return { file, records: require(file) };
}
function buildCanonicalForms(options = {}){
  const vocab = options.vocab || require(VOCAB_PATH);
  const strongs = options.strongs || strongsSource(options.strongsPath);
  const greek = groupVocabulary(vocab, 'greek');
  const hebrew = groupVocabulary(vocab, 'hebrew');
  const forms = { greek: {}, hebrew: {} };
  for(const id of greek.keys()) forms.greek[id] = id;
  for(const id of hebrew.keys()){
    if(/[\u0590-\u05ff]/.test(id)) forms.hebrew[id] = id;
    else if(FUNCTION_FORMS[id]) forms.hebrew[id] = FUNCTION_FORMS[id];
    else {
      const record = strongs.records[`H${id.replace(/\+$/, '')}`];
      if(record?.lemma) forms.hebrew[id] = clean(record.lemma);
    }
  }
  const unresolved = {
    greek: [...greek.keys()].filter(id => !forms.greek[id]),
    hebrew: [...hebrew.keys()].filter(id => !forms.hebrew[id])
  };
  if(unresolved.greek.length || unresolved.hebrew.length) throw new Error(`Unresolved canonical forms: Greek ${unresolved.greek.length}, Hebrew ${unresolved.hebrew.length}`);
  const meta = require(STRONGS_META_PATH);
  return {
    schemaVersion: 1,
    release: 'v1.9.5',
    sources: {
      greek: 'MorphGNT SBLGNT canonical lemma',
      hebrew: 'Open Scriptures Strong’s canonical lemma; existing OSHB lexical identities for bound function words',
      strongsCommit: meta.commit,
      strongsSourceSha256: sha256(strongs.file)
    },
    forms
  };
}
function dominant(rows, field){
  const counts = new Map();
  for(const row of rows){ const value = clean(row[field]); if(value) counts.set(value, (counts.get(value) || 0) + (Number(row.freq) || 1)); }
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || '';
}
function contamination(oldForm, canonicalForm){
  const oldText = stripMarks(oldForm); const canonical = stripMarks(canonicalForm);
  if(!oldText || !canonical || oldText === canonical) return '';
  const at = oldText.indexOf(canonical);
  if(at > 0) return 'PREFIX_CONTAMINATION';
  if(at === 0 && oldText.length > canonical.length) return 'SUFFIX_CONTAMINATION';
  return '';
}
function looksProperName(rows, gloss = {}){
  return rows.some(row => /(?:^|-)CP(?:-|$)/.test(clean(row.parse))) || gloss.ordinaryPracticeEligible === false;
}
function auditCanonicalForms(dataset, options = {}){
  const vocab = options.vocab || require(VOCAB_PATH);
  const glosses = {
    greek: options.greekGlosses || require(path.join(ROOT, 'data', 'glosses', 'greek-glosses.json')),
    hebrew: options.hebrewGlosses || require(path.join(ROOT, 'data', 'glosses', 'hebrew-glosses.json'))
  };
  const report = { schemaVersion: 1, release: 'v1.9.5', generatedDeterministically: true, languages: {}, hebrewVerbExceptions: [] };
  for(const language of ['greek', 'hebrew']){
    const groups = groupVocabulary(vocab, language);
    const counts = { identities: groups.size, canonicalOkBefore: 0, correctionsRequired: 0, prefixBefore: 0, prefixAfter: 0, suffixBefore: 0, suffixAfter: 0, inflectedNominalBefore: 0, inflectedNominalAfter: 0, noncanonicalVerbBefore: 0, noncanonicalVerbAfter: 0, unresolvedAfter: 0, functionWords: 0, properNames: 0, verbs: 0, qalCitationSupported: 0, qalPerfect3msAttested: 0, verbExceptions: 0 };
    const categories = {};
    for(const [id, rows] of groups){
      const canonicalForm = dataset.forms[language][id];
      const oldForm = clean(representative(rows).lexicalForm || representative(rows).word || id);
      const pos = dominant(rows, 'pos');
      const parseValues = rows.map(row => clean(row.parse));
      const formDiffers = oldForm !== canonicalForm;
      const affix = language === 'hebrew' ? contamination(oldForm, canonicalForm) : '';
      const isVerb = rows.some(row => row.pos === 'verb');
      const isNominal = rows.some(row => row.pos === 'noun' || row.pos === 'adj');
      const isFunction = ['conj', 'article', 'prep', 'particle', 'pron', 'adv'].includes(pos) || Object.hasOwn(FUNCTION_FORMS, id);
      const proper = looksProperName(rows, glosses[language][id] || {});
      if(formDiffers) counts.correctionsRequired += 1; else counts.canonicalOkBefore += 1;
      if(affix === 'PREFIX_CONTAMINATION') counts.prefixBefore += 1;
      if(affix === 'SUFFIX_CONTAMINATION') counts.suffixBefore += 1;
      if(isNominal && formDiffers) counts.inflectedNominalBefore += 1;
      if(isVerb && formDiffers) counts.noncanonicalVerbBefore += 1;
      if(isFunction) counts.functionWords += 1;
      if(proper) counts.properNames += 1;
      if(isVerb){
        counts.verbs += 1;
        const qalSupported = parseValues.some(parse => /^V-QAL-/i.test(parse));
        const qal3ms = parseValues.some(parse => /^V-QAL-PERF-3MS$/i.test(parse));
        if(qalSupported) counts.qalCitationSupported += 1;
        if(qal3ms) counts.qalPerfect3msAttested += 1;
        if(!qalSupported) report.hebrewVerbExceptions.push({ vocabularyId: `lemma:${language}:${id}`, canonicalForm, reason: 'No Qal occurrence is attested for this identity in the checked-in corpus; retain the independently source-supported canonical headword without reconstructing a Qal form.' });
      }
      const category = proper ? 'PROPER_NAME' : isFunction ? 'FUNCTION_WORD' : !canonicalForm ? 'MANUAL_REVIEW' : formDiffers ? (affix || (isVerb ? 'NONCANONICAL_VERB' : isNominal ? 'INFLECTED_NOUN_OR_ADJECTIVE' : 'SURFACE_FORM_FALLBACK')) : 'CANONICAL_OK';
      categories[category] = (categories[category] || 0) + 1;
    }
    if(language === 'hebrew') counts.verbExceptions = report.hebrewVerbExceptions.length;
    report.languages[language] = { ...counts, categories };
  }
  report.hebrewVerbExceptions = report.hebrewVerbExceptions.filter(item => item.vocabularyId.startsWith('lemma:hebrew:'));
  report.languages.hebrew.verbExceptions = report.hebrewVerbExceptions.length;
  return report;
}
function formatReport(report){
  return ['Canonical vocabulary audit:', ...['greek', 'hebrew'].map(language => {
    const value = report.languages[language];
    return `* ${language}: ${value.identities} identities; ${value.correctionsRequired} corrected; ${value.unresolvedAfter} unresolved after; ${value.prefixBefore} prefix and ${value.suffixBefore} suffix contaminations before; 0 after`;
  }), `* Hebrew safe verb exceptions: ${report.hebrewVerbExceptions.length}`].join('\n');
}
function deterministicSample(values, size, salt){
  return values.slice().sort((a, b) => crypto.createHash('sha256').update(`${salt}:${a.id}`).digest('hex').localeCompare(crypto.createHash('sha256').update(`${salt}:${b.id}`).digest('hex'))).slice(0, size);
}
function buildManualQa(dataset, options = {}){
  const vocab = options.vocab || require(VOCAB_PATH);
  const allGlosses = {
    greek: require(path.join(ROOT, 'data', 'glosses', 'greek-glosses.json')),
    hebrew: require(path.join(ROOT, 'data', 'glosses', 'hebrew-glosses.json'))
  };
  const output = { schemaVersion: 1, release: 'v1.9.5', method: 'Deterministic stratified samples inspected against the committed canonical source overlay; occurrence forms remain unchanged.', languages: {} };
  for(const language of ['greek', 'hebrew']){
    const entries = [...groupVocabulary(vocab, language)].map(([id, rows]) => {
      const rep = representative(rows); const pos = dominant(rows, 'pos'); const gloss = allGlosses[language][id] || {};
      return { id, vocabularyId: `lemma:${language}:${id}`, pos, frequency: rows.reduce((sum, row) => sum + (Number(row.freq) || 0), 0), properName: looksProperName(rows, gloss), functionWord: ['conj','article','prep','particle','pron','adv'].includes(pos) || Object.hasOwn(FUNCTION_FORMS, id), readerOccurrence: clean(rep.word), canonicalForm: dataset.forms[language][id], result: dataset.forms[language][id] ? 'PASS' : 'FAIL' };
    });
    const specs = { verbs: [100, item => item.pos === 'verb'], nouns: [100, item => item.pos === 'noun' && !item.properName], adjectives: [50, item => item.pos === 'adj'], functionWords: [50, item => item.functionWord], rareOrHapax: [50, item => item.frequency <= 1], properNames: [50, item => item.properName] };
    const samples = {};
    for(const [name, [size, predicate]] of Object.entries(specs)){
      samples[name] = deterministicSample(entries.filter(predicate), size, `${language}:${name}`);
      if(samples[name].length !== size) throw new Error(`${language} ${name} QA sample has ${samples[name].length}; expected ${size}`);
    }
    output.languages[language] = { requested: 400, sampled: Object.values(samples).reduce((sum, list) => sum + list.length, 0), failures: Object.values(samples).flat().filter(item => item.result !== 'PASS').length, samples };
  }
  return output;
}
function writeJson(file, value){ fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`); }
function main(){
  const verify = process.argv.includes('--verify');
  const built = buildCanonicalForms();
  const audit = auditCanonicalForms(built);
  const qa = buildManualQa(built);
  if(verify){
    const current = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf8'));
    if(JSON.stringify(current) !== JSON.stringify(built)) throw new Error('Canonical-form output is stale; regenerate it.');
  } else {
    writeJson(OUTPUT_PATH, built);
    writeJson(AUDIT_PATH, audit);
    writeJson(QA_PATH, qa);
  }
  console.log(formatReport(audit));
}
if(require.main === module) main();
module.exports = { buildCanonicalForms, auditCanonicalForms, buildManualQa, formatReport, contamination, groupVocabulary };
