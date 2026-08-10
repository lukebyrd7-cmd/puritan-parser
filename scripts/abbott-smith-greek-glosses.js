const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(ROOT, 'data', 'metadata', 'abbott-smith-source.json');
const REVIEW_PATH = path.join(ROOT, 'data', 'glosses', 'abbott-smith-reviewed-high-frequency.json');
const VERIFICATION_PATH = path.join(ROOT, 'data', 'glosses', 'abbott-smith-swanson-verification.json');
const GLOSS_PATH = path.join(ROOT, 'data', 'glosses', 'greek-glosses.json');
const AUDIT_PATH = path.join(ROOT, 'audits', 'v1.9.2-abbott-smith-import.json');
const PP_AUDIT_PATH = path.join(ROOT, 'audits', 'v1.9.2-greek-vocabulary-audit.json');
const GREEK_SCRIPT = /[\u0370-\u03ff\u1f00-\u1fff]/u;
const SOURCE_NAME = 'Abbott-Smith, A Manual Greek Lexicon of the New Testament (1922), TEI 1.1';

function clean(value){ return String(value || '').normalize('NFC').replace(/\s+/g, ' ').trim(); }
function decodeXml(value){
  return clean(String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'").replace(/&amp;/g, '&')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, number) => String.fromCodePoint(Number(number))));
}
function foldGreek(value){
  return clean(value).normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('el')
    .replace(/[†*()\s]/g, '').normalize('NFC');
}
function sha256(value){ return crypto.createHash('sha256').update(value).digest('hex'); }
function sourcePaths(manifest = require(MANIFEST_PATH)){
  return Object.fromEntries(manifest.files.map(file => [path.basename(file.path), path.join(ROOT, file.path)]));
}
function verifySourceFiles(manifest = require(MANIFEST_PATH)){
  const errors = [];
  for(const record of manifest.files){
    const file = path.join(ROOT, record.path);
    if(!fs.existsSync(file)){ errors.push(`${record.path}: source file missing`); continue; }
    const bytes = fs.readFileSync(file);
    if(bytes.length !== record.bytes) errors.push(`${record.path}: expected ${record.bytes} bytes, found ${bytes.length}`);
    if(sha256(bytes) !== record.sha256) errors.push(`${record.path}: SHA-256 mismatch`);
  }
  return errors;
}
function parseAbbottSmith(xml){
  const entries = [];
  for(const match of String(xml || '').matchAll(/<entry\b([^>]*)>([\s\S]*?)<\/entry>/g)){
    const attrs = match[1]; const body = match[2];
    const identity = decodeXml((attrs.match(/\bn="([^"]+)"/) || [])[1]);
    const [identityHeadword, strongText = ''] = identity.split('|');
    const orths = Array.from(body.matchAll(/<orth\b[^>]*>([\s\S]*?)<\/orth>/g), item => decodeXml(item[1])).filter(Boolean);
    const headword = identityHeadword || orths[0];
    const glosses = Array.from(body.matchAll(/<gloss\b[^>]*>([\s\S]*?)<\/gloss>/g), item => decodeXml(item[1])).filter(Boolean);
    const crossReferences = Array.from(body.matchAll(/<re\b[^>]*>([\s\S]*?)<\/re>/g), item => decodeXml(item[1])).filter(Boolean);
    const pos = decodeXml((body.match(/<pos\b[^>]*>([\s\S]*?)<\/pos>/) || [])[1]);
    entries.push({
      identity, headword, displayHeadword: orths[0] || headword, normalizedHeadword: foldGreek(headword),
      strong: /^G\d+$/.test(strongText) ? Number(strongText.slice(1)) : null,
      pos, glosses, crossReferences, alternateForms: orths.filter(value => value !== headword),
      occurrenceCount: Number((body.match(/<note\s+type="occurrencesNT">(\d+)<\/note>/) || [])[1]) || 0
    });
  }
  const byFolded = new Map();
  for(const entry of entries){
    if(!byFolded.has(entry.normalizedHeadword)) byFolded.set(entry.normalizedHeadword, []);
    byFolded.get(entry.normalizedHeadword).push(entry);
  }
  for(const entry of entries) entry.homonymCount = byFolded.get(entry.normalizedHeadword).length;
  return entries;
}
function parseMorphGntLookup(source){
  const map = new Map();
  for(const match of String(source || '').matchAll(/^\s*"([^"]+)"\s*:\s*"([^"]+)"/gm)) map.set(clean(match[1]), clean(match[2]));
  return map;
}
function normalizeLearnerCandidate(value){
  let text = clean(value).replace(/^[.;:,]+|[.;:,]+$/g, '').trim();
  text = text.replace(/^to\s+/i, '').trim();
  if(!text || text.length > 56 || GREEK_SCRIPT.test(text) || /\d|\b(?:dat|acc|gen|nom|voc|mid|pass|act|trans|intrans|lit|metaph|cf|q\.v|v\.s)\b/i.test(text)) return '';
  const words = text.match(/[A-Za-z]+(?:['’][A-Za-z]+)?/g) || [];
  if(/^(?:of|for|from|with|by|as|aside|one|oneself)$/i.test(text) || /^I\s+/i.test(text) || /\b(?:hath|had)\b/i.test(text) || (words.length > 3 && /\b(?:my|your|our|their|its)\b/i.test(text)) || /\b(?:Christ|Jesus)\b/.test(text) || !/[A-Za-z]/.test(text)) return '';
  if(words.length > 8) return '';
  return text.charAt(0).toLocaleLowerCase('en') + text.slice(1);
}
function learnerCandidates(entry){
  const candidates = [];
  for(const gloss of entry.glosses){
    for(const piece of gloss.split(/[,;|]/)){
      const value = normalizeLearnerCandidate(piece);
      if(value && !candidates.some(existing => existing.toLowerCase() === value.toLowerCase())) candidates.push(value);
    }
  }
  const comparable = value => value.toLowerCase().replace(/^(?:a|an|the)\s+/, '');
  const represented = new Set();
  return candidates.filter(value => {
    const key = comparable(value); if(represented.has(key)) return false; represented.add(key); return true;
  });
}
function automaticGloss(entry){
  const candidates = learnerCandidates(entry);
  if(!candidates.length) return { status: 'EXTRACTION_UNSAFE', glosses: [], reason: 'No concise learner-English gloss element passed the extraction rules.' };
  if(candidates.length > 4) return { status: 'EXTRACTION_UNSAFE', glosses: [], reason: `The entry exposes ${candidates.length} candidate senses and requires sense-order review.` };
  return { status: 'RECOVERED_AUTOMATIC', glosses: candidates.slice(0, 3), reason: 'Unique MorphGNT lookup and bounded TEI gloss extraction.' };
}
function sourceRecord(glosses, entry){
  return {
    primaryGloss: glosses[0], alternateGlosses: glosses.slice(1), glossSource: SOURCE_NAME,
    glossSourceUrl: require(MANIFEST_PATH).source.projectUrl, glossLicense: 'Public domain',
    glossAttribution: 'G. Abbott-Smith; TEI transcription by the Abbott-Smith project',
    glossSourceEntry: entry.identity, glossSourceStrong: entry.strong ? `G${entry.strong}` : ''
  };
}
function frequencyTiers(entries){
  const definitions = [
    ['500+', value => value >= 500], ['100-499', value => value >= 100 && value < 500],
    ['50-99', value => value >= 50 && value < 100], ['25-49', value => value >= 25 && value < 50],
    ['10-24', value => value >= 10 && value < 25], ['2-9', value => value >= 2 && value < 10], ['1', value => value === 1]
  ];
  return Object.fromEntries(definitions.map(([label, accepts]) => {
    const tier = entries.filter(item => accepts(item.frequency)); const covered = tier.filter(item => item.covered).length;
    return [label, { covered, total: tier.length, percentage: tier.length ? Number((covered / tier.length * 100).toFixed(2)) : 0, unavailable: tier.length - covered }];
  }));
}
function build({ xml, lookupSource, glossSource, vocab, previousAudit, review, verification = null }){
  const entries = parseAbbottSmith(xml); const lookup = parseMorphGntLookup(lookupSource);
  const byHeadword = new Map();
  for(const entry of entries){ if(!byHeadword.has(entry.headword)) byHeadword.set(entry.headword, []); byHeadword.get(entry.headword).push(entry); }
  const reviewByLemma = new Map(review.records.map(row => [row[0], row]));
  const classified = new Map(Object.entries(verification?.classifications || {}).flatMap(([classification, ids]) => ids.map(id => [id, classification])));
  const verificationRecords = verification?.sampleIds
    ? verification.sampleIds.map(vocabularyId => ({ vocabularyId, classification: classified.get(vocabularyId) || verification.defaultClassification || 'NEEDS_HUMAN_REVIEW' }))
    : (verification?.records || []).map(item => Array.isArray(item) ? { vocabularyId: item[0], classification: item[1] } : item);
  const verificationById = new Map(verificationRecords.map(item => [item.vocabularyId, item]));
  const oldByLemma = new Map(previousAudit.ppEntries.map(item => [item.lemma, item]));
  const identityRows = Array.from(new Map(vocab.filter(item => item.lang === 'greek').map(item => [item.lemma, null])).keys()).map(lemma => {
    const old = oldByLemma.get(lemma); return { lemma, vocabularyId: `lemma:greek:${lemma}`, frequency: old.frequency, properName: old.mappingStatus === 'PROPER_NAME_SPECIAL_CASE' };
  }).sort((a,b) => b.frequency - a.frequency || a.lemma.localeCompare(b.lemma, 'el'));
  const output = {}; const decisions = [];
  for(const identity of identityRows){
    const current = glossSource[identity.lemma] || {};
    if(identity.lemma === 'ἄγνωστος'){
      const selected = (byHeadword.get('ἄγνωστος') || [])[0];
      if(!selected || !selected.glosses.some(value => clean(value).toLowerCase() === 'unknown')) throw new Error('lemma:greek:ἄγνωστος: Abbott-Smith no longer supports the literal English normalization');
      output[identity.lemma] = sourceRecord(['not known'], selected);
      decisions.push({ ...identity, covered: true, action: 'RECOVERED_LITERAL_ENGLISH_NORMALIZED', reason: 'The source-backed lexical adjective “unknown” is expanded to “not known” so it is not mistaken for a missing-data sentinel.', abbottSmithIdentity: selected.identity, abbottSmithHeadword: selected.headword, strong: selected.strong, extractedLearnerGloss: 'not known', identityConfidence: 'HIGH', swansonVerification: 'NOT_SAMPLED' });
      continue;
    }
    const unavailableBefore = GREEK_SCRIPT.test(clean(current.primaryGloss)) || String(current.glossSource || '').startsWith('Abbott-Smith');
    if(!unavailableBefore){ output[identity.lemma] = current; decisions.push({ ...identity, covered: true, action: 'PRESERVED_APPROVED_SOURCE' }); continue; }
    const target = lookup.get(identity.lemma) || identity.lemma;
    const matches = byHeadword.get(target) || [];
    let action; let reason; let selected = null; let glosses = [];
    if(identity.properName){ action = 'PROPER_NAME_EXCLUDED'; reason = 'Proper names remain separate from ordinary vocabulary practice.'; }
    else if(!matches.length){ action = 'NO_ABBOTT_SMITH_ENTRY'; reason = 'The pinned lookup did not resolve to an Abbott-Smith entry.'; }
    else if(matches.length > 1 || matches[0].homonymCount > 1){ action = 'HOMONYM_COLLISION'; reason = 'The normalized source headword corresponds to multiple Abbott-Smith identities.'; }
    else {
      selected = matches[0]; const manual = reviewByLemma.get(identity.lemma);
      if(manual){
        const [, expectedFrequency, expectedHeadword, expectedStrong, reviewedGlosses] = manual;
        if(identity.frequency !== expectedFrequency || selected.headword !== expectedHeadword || selected.strong !== expectedStrong) throw new Error(`${identity.vocabularyId}: reviewed identity no longer matches source signals`);
        const candidates = learnerCandidates(selected).map(value => value.toLowerCase());
        for(const gloss of reviewedGlosses) if(!candidates.includes(gloss.toLowerCase())) throw new Error(`${identity.vocabularyId}: reviewed gloss is not traceable to a TEI gloss element: ${gloss}`);
        action = 'RECOVERED_MANUAL'; reason = 'High-frequency identity and primary ordering manually reviewed.'; glosses = reviewedGlosses;
      } else {
        const automatic = automaticGloss(selected); action = automatic.status; reason = automatic.reason; glosses = automatic.glosses;
        const verificationResult = verificationById.get(identity.vocabularyId)?.classification;
        if(action === 'RECOVERED_AUTOMATIC' && ['IDENTITY_CONCERN', 'NEEDS_HUMAN_REVIEW'].includes(verificationResult)){
          action = 'SOURCE_DISAGREEMENT'; reason = `The deterministic Swanson sample returned ${verificationResult}; the gloss remains unavailable pending review.`; glosses = [];
        }
      }
    }
    const recovered = action.startsWith('RECOVERED_');
    output[identity.lemma] = recovered ? sourceRecord(glosses, selected) : current;
    decisions.push({ ...identity, covered: recovered, action, reason, abbottSmithIdentity: selected?.identity || '', abbottSmithHeadword: selected?.headword || target, strong: selected?.strong || null, extractedLearnerGloss: glosses.join('; '), identityConfidence: recovered ? 'HIGH' : 'UNRESOLVED', swansonVerification: reviewByLemma.get(identity.lemma)?.[6] || verificationById.get(identity.vocabularyId)?.classification || 'NOT_SAMPLED' });
  }
  const recovered = decisions.filter(item => item.action.startsWith('RECOVERED_'));
  const remaining = decisions.filter(item => !item.covered);
  const readerOccurrences = greekReaderOccurrenceCounts();
  const ordinary = decisions.filter(item => !item.properName && (readerOccurrences.get(item.lemma) || 0) > 0);
  const totalTokens = previousAudit.summary.reader.totalTokens;
  const unavailableTokens = remaining.reduce((sum, item) => sum + Number(oldByLemma.get(item.lemma)?.canonicalReaderOccurrences || 0), 0);
  const actionCounts = decisions.reduce((map, item) => ((map[item.action] = (map[item.action] || 0) + 1), map), {});
  const countedRemaining = remaining.reduce((map, item) => ((map[item.action] = (map[item.action] || 0) + 1), map), {});
  const remainingCounts = {
    NO_ABBOTT_SMITH_ENTRY: countedRemaining.NO_ABBOTT_SMITH_ENTRY || 0,
    AMBIGUOUS_MAPPING: countedRemaining.AMBIGUOUS_MAPPING || 0,
    HOMONYM_COLLISION: countedRemaining.HOMONYM_COLLISION || 0,
    EXTRACTION_UNSAFE: countedRemaining.EXTRACTION_UNSAFE || 0,
    PROPER_NAME_EXCLUDED: countedRemaining.PROPER_NAME_EXCLUDED || 0,
    VARIANT_SPECIAL_FORM: countedRemaining.VARIANT_SPECIAL_FORM || 0,
    SOURCE_DISAGREEMENT: countedRemaining.SOURCE_DISAGREEMENT || 0,
    OTHER: countedRemaining.OTHER || 0
  };
  const eligibleSample = decisions.filter(item => item.frequency < 10 && (item.action === 'RECOVERED_AUTOMATIC' || item.action === 'SOURCE_DISAGREEMENT'));
  const sample = verificationRecords.length
    ? verificationRecords.map(item => decisions.find(decision => decision.vocabularyId === item.vocabularyId)).filter(Boolean)
    : eligibleSample.slice().sort((a,b) => sha256(a.vocabularyId).localeCompare(sha256(b.vocabularyId))).slice(0, 100);
  return {
    glossSource: output,
    audit: {
      schemaVersion: 1, release: 'v1.9.2 — Abbott-Smith Greek lexical coverage',
      source: { ...require(MANIFEST_PATH).source, parsedEntries: entries.length, distributedRawProse: false },
      generatedAsset: { path: 'data/glosses/greek-glosses.json', logicalSha256: sha256(JSON.stringify(output)), records: Object.keys(output).length },
      summary: {
        totalIdentities: decisions.length, previousEnglishCovered: previousAudit.summary.greekEnglishGlossCoverage.initialTrustworthyEnglish,
        newlyRecovered: recovered.length, finalEnglishCovered: decisions.filter(item => item.covered).length,
        finalUnavailable: remaining.length, totalCoveragePercentage: Number((decisions.filter(item => item.covered).length / decisions.length * 100).toFixed(2)),
        ordinaryStudyRelevantIdentities: ordinary.length, ordinaryStudyRelevantCovered: ordinary.filter(item => item.covered).length,
        ordinaryStudyRelevantCoveragePercentage: Number((ordinary.filter(item => item.covered).length / ordinary.length * 100).toFixed(2)),
        readerTokensWithEnglish: totalTokens - unavailableTokens, readerTotalTokens: totalTokens,
        readerTokenCoveragePercentage: Number(((totalTokens - unavailableTokens) / totalTokens * 100).toFixed(2)),
        frequencyTiers: frequencyTiers(decisions), actions: actionCounts,
        remainingUnavailableCategories: remainingCounts,
        unavailableAtLeast10: remaining.filter(item => item.frequency >= 10).map(item => ({ vocabularyId: item.vocabularyId, lemma: item.lemma, frequency: item.frequency, reason: item.reason })),
        unavailableAtLeast25: remaining.filter(item => item.frequency >= 25).length,
        lowerFrequencySwansonSampleIds: sample.map(item => item.vocabularyId),
        lowerFrequencySwansonSampleComplete: sample.length >= 100 && sample.every(item => verificationById.has(item.vocabularyId))
      },
      reviewedHighFrequency: decisions.filter(item => reviewByLemma.has(item.lemma)),
      lowerFrequencySwansonVerification: sample.map(item => verificationById.get(item.vocabularyId) || { vocabularyId: item.vocabularyId, classification: 'NEEDS_HUMAN_REVIEW' }),
      remainingUnavailable: remaining.map(item => ({ vocabularyId: item.vocabularyId, lemma: item.lemma, frequency: item.frequency, category: item.action, reason: item.reason })),
      traceability: recovered.map(item => ({ vocabularyId: item.vocabularyId, lemma: item.lemma, abbottSmithIdentity: item.abbottSmithIdentity, learnerGloss: item.extractedLearnerGloss, method: item.action }))
    }
  };
}
function greekReaderOccurrenceCounts(){
  const manifest = require(path.join(ROOT, 'data', 'greek', 'manifest.json')); const counts = new Map();
  for(const book of manifest.books) for(const chapter of book.chapters){
    const data = require(path.join(ROOT, 'data', 'greek', book.id, `${chapter}.json`));
    for(const verse of data.verses || []) for(const token of verse.tokens || []) if(clean(token.lemma)) counts.set(clean(token.lemma), (counts.get(clean(token.lemma)) || 0) + 1);
  }
  return counts;
}
function inputs(){
  const paths = sourcePaths();
  return {
    xml: fs.readFileSync(paths['abbott-smith.tei.xml'], 'utf8'), lookupSource: fs.readFileSync(paths['gnt2asLookups.js'], 'utf8'),
    glossSource: require(GLOSS_PATH), vocab: require(path.join(ROOT, 'vocab_all.json')), previousAudit: require(PP_AUDIT_PATH),
    review: require(REVIEW_PATH), verification: fs.existsSync(VERIFICATION_PATH) ? require(VERIFICATION_PATH) : null
  };
}
function main(){
  const sourceErrors = verifySourceFiles(); if(sourceErrors.length) throw new Error(sourceErrors.join('\n'));
  const result = build(inputs());
  if(process.argv.includes('--write')){
    fs.writeFileSync(GLOSS_PATH, `${JSON.stringify(result.glossSource, null, 2)}\n`);
    fs.writeFileSync(AUDIT_PATH, `${JSON.stringify(result.audit, null, 2)}\n`);
    console.log(`Wrote ${path.relative(ROOT, GLOSS_PATH)} and ${path.relative(ROOT, AUDIT_PATH)}; recovered ${result.audit.summary.newlyRecovered}.`);
  } else console.log(JSON.stringify(result.audit.summary, null, 2));
}
if(require.main === module) main();
module.exports = { clean, foldGreek, verifySourceFiles, parseAbbottSmith, parseMorphGntLookup, learnerCandidates, automaticGloss, build, inputs, sha256 };
