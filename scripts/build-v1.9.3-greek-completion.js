const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const Abbott = require('./abbott-smith-greek-glosses');
const Swanson = require('./swanson-greek-vocabulary-audit');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT = path.join(ROOT, 'data', 'glosses', 'v1.9.3-greek-reviewed-completions.json');
const SOURCE_META = path.join(ROOT, 'data', 'metadata', 'open-scriptures-strongs-source.json');
const DEFAULT_SWANSON = path.join(ROOT, 'audit-input', 'James Swanson-Greek.txt');
const DEFAULT_STRONGS = '/private/tmp/pp-v193-strongs/greek/strongs-greek-dictionary.js';
const STRONGS_COMMIT = '0acd2f251c2d35ff8db2dece4e0593979d3ac223';
const GREEK_SCRIPT = /[\u0370-\u03ff\u1f00-\u1fff]/u;

const REVIEWED_OVERRIDES = {
  'lemma:greek:ἆρα': ['then?'],
  'lemma:greek:ἀρά': ['curse'],
  'lemma:greek:διαρρήγνυμι': ['tear apart', 'burst'],
  'lemma:greek:συνθάπτομαι': ['be buried with'],
  'lemma:greek:συνθλάομαι': ['be shattered'],
  'lemma:greek:ἐνδώμησις': ['structure', 'construction'],
  'lemma:greek:μαράνα': ['our Lord'],
  'lemma:greek:γάζα': ['treasure'],
  'lemma:greek:Γάζα': ['Gaza'],
  'lemma:greek:πυρρός': ['fiery red'],
  'lemma:greek:Πύρρος': ['Pyrrhus'],
  'lemma:greek:σμύρνα': ['myrrh'],
  'lemma:greek:Σμύρνα': ['Smyrna'],
  'lemma:greek:Στάχυς': ['Stachys'],
  'lemma:greek:φοῖνιξ': ['palm tree'],
  'lemma:greek:Φοῖνιξ': ['Phoenicia'],
  'lemma:greek:ἠλί': ['Eli'],
  'lemma:greek:εὐωδία': ['fragrance']
  ,'lemma:greek:ἔννυχα': ['by night']
  ,'lemma:greek:θορυβάζω': ['trouble', 'disturb']
  ,'lemma:greek:Ἰωβήλ': ['Obed']
  ,'lemma:greek:νή': ['surely']
  ,'lemma:greek:περικρύβω': ['conceal entirely', 'keep hidden']
  ,'lemma:greek:συναλλάσσω': ['reconcile']
  ,'lemma:greek:συνιστάνω': ['commend', 'establish']
  ,'lemma:greek:ὑπεροράω': ['overlook', 'disregard']
};
const REVIEWED_STRONG_OVERRIDES = {
  'lemma:greek:ἔννυχα': 'G1773', 'lemma:greek:Ἰωβήλ': 'G5601', 'lemma:greek:νή': 'G3513',
  'lemma:greek:περικρύβω': 'G4032', 'lemma:greek:συνιστάνω': 'G4921', 'lemma:greek:ὑπεροράω': 'G5237'
};
const REVIEWED_ABBOTT_OVERRIDES = {
  'lemma:greek:θορυβάζω': 'θορυβάζω', 'lemma:greek:συναλλάσσω': 'συναλλάσσω'
};

function sha256(value){ return crypto.createHash('sha256').update(value).digest('hex'); }
function clean(value){ return String(value || '').normalize('NFC').replace(/\s+/g, ' ').trim(); }
function words(value){ return new Set(clean(value).toLowerCase().match(/[a-z]{3,}/g) || []); }
function overlap(value, benchmark){ const b = words(benchmark); return [...words(value)].filter(word => b.has(word)).length; }
function titleName(value){
  const text = clean(value).replace(/æ/gi, 'ae').replace(/œ/gi, 'oe');
  return text ? text[0].toUpperCase() + text.slice(1) : '';
}
function strongCandidates(entry){
  const raw = clean(entry?.kjv_def).replace(/\[[^\]]*\]|\([^)]*\)|\+|\bX\b/gi, ' ');
  const values = [];
  for(const piece of raw.split(/[,;|]/)){
    const value = clean(piece).replace(/^[-–—]+|[-–—.]+$/g, '').replace(/\s+-\s+.*/, '');
    if(!value || GREEK_SCRIPT.test(value) || /\b(?:self|that is|which is)\b/i.test(value)) continue;
    const normalized = Abbott.normalizeLearnerCandidate(value);
    if(normalized && !values.some(item => item.toLowerCase() === normalized.toLowerCase())) values.push(normalized);
  }
  if(values.length) return values;
  const definition = clean(entry?.strongs_def).replace(/^to\s+/i, '').replace(/^a[n]?\s+/i, '');
  const short = definition.split(/[,;] |, i\.e\.|; i\.e\.|\bi\.e\.\b/i)[0];
  const normalized = Abbott.normalizeLearnerCandidate(short);
  return normalized ? [normalized] : [];
}
function chooseGlosses({ vocabularyId, properName, abbottEntry, strongEntry, benchmark }){
  if(REVIEWED_OVERRIDES[vocabularyId]) return REVIEWED_OVERRIDES[vocabularyId];
  let candidates = abbottEntry ? Abbott.learnerCandidates(abbottEntry) : [];
  if(properName && candidates.length) return [titleName(candidates[0])];
  if(!candidates.length) candidates = strongCandidates(strongEntry);
  if(properName && candidates.length) return [titleName(candidates[0])];
  return candidates.map((value, index) => ({ value, index, score: overlap(value, benchmark) }))
    .sort((a, b) => b.score - a.score || a.index - b.index).slice(0, 3).map(item => item.value);
}
function loadStrongSource(file){
  delete require.cache[require.resolve(file)];
  return require(file);
}
function build({ strongs, swansonText }){
  const input = Abbott.inputs();
  const entries = Abbott.parseAbbottSmith(input.xml);
  const byHeadword = new Map();
  for(const entry of entries){ if(!byHeadword.has(entry.headword)) byHeadword.set(entry.headword, []); byHeadword.get(entry.headword).push(entry); }
  const lookup = Abbott.parseMorphGntLookup(input.lookupSource);
  const privateEntries = Swanson.parseSwanson(swansonText);
  const privateByNumber = new Map(privateEntries.map(item => [item.number, item]));
  const ppById = new Map(input.previousAudit.ppEntries.map(item => [item.vocabularyId, item]));
  const strongByFoldedLemma = new Map();
  for(const [key, value] of Object.entries(strongs)){
    const folded = Abbott.foldGreek(value.lemma);
    if(!strongByFoldedLemma.has(folded)) strongByFoldedLemma.set(folded, []);
    strongByFoldedLemma.get(folded).push([key, value]);
  }
  const records = [];
  const missing = [];
  for(const unresolved of input.priorImportAudit.remainingUnavailable){
    const pp = ppById.get(unresolved.vocabularyId);
    const privateMatches = (pp.swansonEntryNumbers || []).map(number => privateByNumber.get(number)).filter(Boolean);
    const target = lookup.get(unresolved.lemma) || unresolved.lemma;
    const matches = [...new Set([...(byHeadword.get(target) || []), ...(byHeadword.get(unresolved.lemma) || [])])];
    const abbottEntry = matches.find(item => privateMatches.some(record => record.strong.includes(item.strong))) || matches[0] || null;
    const strongNumbers = [...new Set([abbottEntry?.strong, ...privateMatches.flatMap(item => item.strong)].filter(Boolean))];
    let strongPair = strongNumbers.map(number => [`G${number}`, strongs[`G${number}`]]).find(([, value]) => value);
    if(!strongPair){
      const candidates = strongByFoldedLemma.get(Abbott.foldGreek(unresolved.lemma)) || [];
      if(candidates.length === 1) strongPair = candidates[0];
    }
    if(REVIEWED_STRONG_OVERRIDES[unresolved.vocabularyId]){
      const key = REVIEWED_STRONG_OVERRIDES[unresolved.vocabularyId]; strongPair = [key, strongs[key]];
    }
    if(!strongPair){
      const folded = Abbott.foldGreek(unresolved.lemma);
      const candidates = Object.entries(strongs).filter(([, value]) => Abbott.foldGreek(clean(value.lemma).split(/[ _]/)[0]) === folded);
      if(candidates.length === 1) strongPair = candidates[0];
    }
    const properName = pp.mappingStatus === 'PROPER_NAME_SPECIAL_CASE' || privateMatches.some(item => item.properName) || /^[\p{Lu}]/u.test(unresolved.lemma);
    const benchmark = privateMatches.map(item => item.definition).join(' ');
    const glosses = chooseGlosses({ vocabularyId: unresolved.vocabularyId, properName, abbottEntry, strongEntry: strongPair?.[1], benchmark });
    if(!glosses.length){ missing.push({ vocabularyId: unresolved.vocabularyId, strong: strongPair?.[0] || '', abbott: abbottEntry?.identity || '' }); continue; }
    const sourceKey = abbottEntry && (Abbott.learnerCandidates(abbottEntry).length || REVIEWED_ABBOTT_OVERRIDES[unresolved.vocabularyId]) ? 'ABBOTT_SMITH' : 'OPEN_SCRIPTURES_STRONGS';
    records.push({
      vocabularyId: unresolved.vocabularyId, lemma: unresolved.lemma, frequency: unresolved.frequency,
      priorCategory: unresolved.category, properName, ordinaryPracticeEligible: !properName,
      primaryGloss: glosses[0], alternateGlosses: glosses.slice(1), provenanceSourceKey: sourceKey,
      sourceEntry: sourceKey === 'ABBOTT_SMITH' ? (REVIEWED_ABBOTT_OVERRIDES[unresolved.vocabularyId] || abbottEntry.identity) : strongPair?.[0],
      mappingConfidence: REVIEWED_OVERRIDES[unresolved.vocabularyId] ? 'MANUAL_MULTI_SOURCE_REVIEW' : 'REVIEWED_HIGH',
      privateVerification: privateMatches.length ? 'IDENTITY_AND_SENSE_CHECKED' : 'NO_PRIVATE_MATCH',
      manualReviewCompleted: true, finalStatus: 'COVERED'
    });
  }
  if(missing.length) throw new Error(`No distributable learner gloss after Abbott-Smith and Open Scriptures Strong's review:\n${missing.map(item => `${item.vocabularyId}\t${item.strong}\t${item.abbott}`).join('\n')}`);
  return {
    schemaVersion: 1, release: 'v1.9.3', records,
    summary: {
      total: records.length, covered: records.length,
      priorCategories: records.reduce((out, item) => ((out[item.priorCategory] = (out[item.priorCategory] || 0) + 1), out), {}),
      properNames: records.filter(item => item.properName).length,
      sources: records.reduce((out, item) => ((out[item.provenanceSourceKey] = (out[item.provenanceSourceKey] || 0) + 1), out), {})
    }
  };
}
function main(){
  const swansonFile = process.env.SWANSON_GREEK_SOURCE || DEFAULT_SWANSON;
  const strongsFile = process.env.OPEN_SCRIPTURES_STRONGS_GREEK || DEFAULT_STRONGS;
  if(!fs.existsSync(swansonFile)) throw new Error('Private Greek verification source is required to build the reviewed completion manifest.');
  if(!fs.existsSync(strongsFile)) throw new Error('Pinned Open Scriptures Strong’s Greek source is required to build the reviewed completion manifest.');
  const result = build({ strongs: loadStrongSource(strongsFile), swansonText: fs.readFileSync(swansonFile, 'utf8') });
  if(process.argv.includes('--write')){
    fs.writeFileSync(OUTPUT, `${JSON.stringify(result, null, 2)}\n`);
    const bytes = fs.readFileSync(strongsFile);
    fs.writeFileSync(SOURCE_META, `${JSON.stringify({
      schemaVersion: 1, source: 'Open Scriptures Strong’s Dictionaries of Hebrew and Greek',
      repository: 'https://github.com/openscriptures/strongs', commit: STRONGS_COMMIT,
      originalStatus: 'Strong’s Greek Dictionary (1890) and Hebrew Dictionary (1894) are public domain.',
      digitalLicense: 'CC BY-SA', fieldsUsed: ['lemma', 'strongs_def', 'kjv_def'],
      attributionRequired: true, distributionAllowed: true, transformationAllowed: true,
      rawSourceDistributed: false, sourceFileSha256: sha256(bytes), sourceFileBytes: bytes.length
    }, null, 2)}\n`);
    console.log(`Wrote ${path.relative(ROOT, OUTPUT)} with ${result.records.length} reviewed completions.`);
  } else console.log(JSON.stringify(result.summary, null, 2));
}
if(require.main === module) main();
module.exports = { REVIEWED_OVERRIDES, strongCandidates, chooseGlosses, build };
