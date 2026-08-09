const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_VOCAB_PATH = path.join(ROOT, 'vocab_all.json');
const DEFAULT_GLOSS_PATH = path.join(ROOT, 'data', 'glosses', 'hebrew-glosses.json');
const DEFAULT_CORRECTIONS_PATH = path.join(ROOT, 'data', 'glosses', 'corrections.json');
const DEFAULT_MANUAL_REVIEW_PATH = path.join(ROOT, 'audits', 'v1.9.1-hebrew-vocabulary-manual-review.json');
const EXPECTED_ENTRY_COUNT = 1903;
const MAPPING_STATUSES = new Set([
  'MATCHED_EXACT',
  'MATCHED_HIGH_CONFIDENCE',
  'AMBIGUOUS_MAPPING',
  'MISSING_PP_ENTRY',
  'PP_HOMONYM_COLLISION',
  'PP_POSSIBLE_DUPLICATE',
  'NEEDS_HUMAN_REVIEW'
]);
const GLOSS_STATUSES = new Set([
  'GOOD_MATCH',
  'ACCEPTABLE_VARIATION',
  'PRIMARY_ORDER_PROBLEM',
  'MISSING_MAJOR_SENSE',
  'SUSPICIOUS_EXTRA_SENSE',
  'LIKELY_BAD_GLOSS',
  'HOMONYM_CONTAMINATION',
  'MALFORMED_PRESENTATION',
  'NEEDS_HUMAN_REVIEW'
]);

function nfc(value) {
  return String(value || '').normalize('NFC').trim();
}

function normalizePointedHebrew(value) {
  return nfc(value)
    .replace(/[\u0591-\u05AF\u05BD\u05BF\u05C4\u05C5\u05C7]/g, '')
    .replace(/[־·\s]/g, '')
    .replace(/[.׃]/g, '');
}

function normalizeConsonants(value) {
  return normalizePointedHebrew(value).normalize('NFD').replace(/[\u0591-\u05C7]/g, '').normalize('NFC');
}

function parseFrequency(definition) {
  const matches = Array.from(String(definition || '').matchAll(/\(([\d,]+)(?:×)?\)/g));
  if (!matches.length) return null;
  return Number(matches[matches.length - 1][1].replace(/,/g, ''));
}

function parsePos(definition) {
  const labels = Array.from(String(definition || '').matchAll(/\(([^)]{1,40})\)/g), match => match[1].toLowerCase());
  const joined = labels.join(' ');
  if (/definite article/.test(joined)) return 'article';
  if (/\bprep\b/.test(joined)) return 'prep';
  if (/\bconj\b/.test(joined)) return 'conj';
  if (/\badv\b/.test(joined)) return 'adv';
  if (/pron/.test(joined)) return 'pron';
  if (/particle|object marker/.test(joined)) return 'particle';
  if (/\badj\b/.test(joined)) return 'adj';
  if (/\b(?:Q|Ni|Pi|Pu|Hi|Hoph|Hith|Polel|Poel|Hitpolel)\b/.test(definition)) return 'verb';
  if (/\b(?:m|f|c)[sp]\b/i.test(joined)) return 'noun';
  return '';
}

function parseStems(definition) {
  const allowed = ['Q', 'Ni', 'Pi', 'Pu', 'Hi', 'Hoph', 'Hith', 'Polel', 'Poel', 'Hitpolel'];
  return allowed.filter(stem => new RegExp(`\\(${stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`).test(definition));
}

function parseAlternateSpellings(definition) {
  const values = [];
  for (const match of String(definition || '').matchAll(/also spelled\s+([^;(]+)/gi)) {
    const value = nfc(match[1]).replace(/\s+with\s+.*$/i, '').trim();
    if (value) values.push(value);
  }
  return values;
}

function parseCrossReferences(definition) {
  return Array.from(String(definition || '').matchAll(/\(#(\d+)\)/g), match => Number(match[1]));
}

function parseVgbh(text) {
  const entries = [];
  for (const line of String(text || '').split(/\r?\n/)) {
    const match = line.match(/^#(\d+)\s+([^\t]+)\t(.+)$/);
    if (!match) continue;
    const number = Number(match[1]);
    const headword = nfc(match[2]);
    const definition = match[3].trim();
    entries.push({
      number,
      headword,
      normalizedHeadword: normalizePointedHebrew(headword),
      consonants: normalizeConsonants(headword),
      definition,
      frequency: parseFrequency(definition),
      pos: parsePos(definition),
      stems: parseStems(definition),
      alternateSpellings: parseAlternateSpellings(definition),
      crossReferences: parseCrossReferences(definition)
    });
  }
  return entries;
}

function ppVocabularyId(lemma) {
  return `lemma:hebrew:${lemma}`;
}

function coarsePos(value) {
  const pos = String(value || '').toLowerCase();
  if (pos === 'other') return '';
  return pos === 'rel' ? 'pron' : pos;
}

function buildLexicalIndex(vocab, glossSource) {
  const lexemes = new Map();
  for (const row of vocab.filter(item => item && item.lang === 'hebrew')) {
    const lemma = String(row.lemma || '').trim();
    if (!lemma) continue;
    if (!lexemes.has(lemma)) {
      lexemes.set(lemma, {
        lemma,
        vocabularyId: ppVocabularyId(lemma),
        frequency: 0,
        forms: new Set(),
        pointedForms: new Set(),
        consonantalForms: new Set(),
        pos: new Set(),
        records: []
      });
    }
    const lexeme = lexemes.get(lemma);
    lexeme.frequency += Math.max(0, Number(row.freq) || 0);
    lexeme.forms.add(nfc(row.word));
    lexeme.pointedForms.add(normalizePointedHebrew(row.word));
    lexeme.consonantalForms.add(normalizeConsonants(row.word));
    if (coarsePos(row.pos)) lexeme.pos.add(coarsePos(row.pos));
    lexeme.records.push(row);
  }
  for (const lexeme of lexemes.values()) {
    const source = glossSource[lexeme.lemma] || {};
    const representative = lexeme.records.slice().sort((a, b) => (Number(b.freq) || 0) - (Number(a.freq) || 0))[0] || {};
    lexeme.primaryGloss = source.primaryGloss || representative.primaryGloss || representative.gloss || '';
    lexeme.alternateGlosses = Array.isArray(source.alternateGlosses)
      ? source.alternateGlosses.slice()
      : Array.isArray(representative.alternateGlosses) ? representative.alternateGlosses.slice() : [];
    lexeme.glossSource = source.glossSource || representative.glossSource || representative.source || '';
    lexeme.forms = Array.from(lexeme.forms).sort();
    lexeme.pointedForms = Array.from(lexeme.pointedForms).sort();
    lexeme.consonantalForms = Array.from(lexeme.consonantalForms).sort();
    lexeme.pos = Array.from(lexeme.pos).sort();
    delete lexeme.records;
  }
  return lexemes;
}

function applyCorrections(lexemes, manifest = {}) {
  const GlossModel = require('../src/models/gloss');
  const applied = [];
  for (const correction of Array.isArray(manifest.corrections) ? manifest.corrections : []) {
    const lemma = String(correction.vocabularyId || '').replace(/^lemma:hebrew:/, '');
    const lexeme = lexemes.get(lemma);
    if (!lexeme) continue;
    const source = GlossModel.presentLexicalGlosses({
      lang: 'hebrew', lemma, primaryGloss: lexeme.primaryGloss, alternateGlosses: lexeme.alternateGlosses, glossSource: lexeme.glossSource
    });
    if (source.compact !== correction.expectedSourceValue) continue;
    lexeme.sourceGloss = source.compact;
    lexeme.sourcePrimaryGloss = lexeme.primaryGloss;
    lexeme.sourceAlternateGlosses = lexeme.alternateGlosses.slice();
    lexeme.primaryGloss = (correction.correctedPrimary || []).join('; ');
    lexeme.alternateGlosses = (correction.correctedAdditional || []).slice();
    lexeme.correctionId = correction.id;
    applied.push(correction.id);
  }
  return applied;
}

function frequencyScore(expected, actual) {
  if (!(expected > 0) || !(actual > 0)) return 0;
  const ratio = Math.max(expected, actual) / Math.min(expected, actual);
  if (ratio <= 1.1) return 24;
  if (ratio <= 1.25) return 20;
  if (ratio <= 1.5) return 14;
  if (ratio <= 2) return 8;
  return 0;
}

function candidateScore(entry, lexeme) {
  const pointed = lexeme.pointedForms.includes(entry.normalizedHeadword);
  const consonantal = lexeme.consonantalForms.includes(entry.consonants);
  const posMatch = !entry.pos || lexeme.pos.includes(entry.pos);
  const canonicalLexicalIdentity = /^\d+\+?$/.test(lexeme.lemma);
  return {
    lexeme,
    pointed,
    consonantal,
    posMatch,
    canonicalLexicalIdentity,
    score: (pointed ? 100 : consonantal ? 55 : 0) + (posMatch ? 18 : 0) + frequencyScore(entry.frequency, lexeme.frequency) + (canonicalLexicalIdentity ? 12 : 0)
  };
}

function candidatesFor(entry, lexemes) {
  const candidates = [];
  for (const lexeme of lexemes.values()) {
    if (lexeme.pointedForms.includes(entry.normalizedHeadword) || lexeme.consonantalForms.includes(entry.consonants)) {
      candidates.push(candidateScore(entry, lexeme));
    }
  }
  return candidates.sort((a, b) => b.score - a.score || a.lexeme.lemma.localeCompare(b.lexeme.lemma, 'en', { numeric: true }));
}

function mapEntry(entry, lexemes) {
  const candidates = candidatesFor(entry, lexemes);
  if (!candidates.length) {
    return { status: 'MISSING_PP_ENTRY', vocabularyId: null, confidence: 0, reason: 'No PP lexical form shares the normalized Hebrew headword.', candidates: [] };
  }
  const top = candidates[0];
  const runnerUp = candidates[1];
  const tied = runnerUp && runnerUp.score === top.score;
  if (tied) {
    return {
      status: 'AMBIGUOUS_MAPPING', vocabularyId: null, confidence: top.score,
      reason: 'Multiple PP lexical identities have equal spelling, POS, and frequency evidence.',
      candidates: candidates.slice(0, 5).map(item => item.lexeme.vocabularyId)
    };
  }
  const margin = top.score - (runnerUp?.score || 0);
  const exactOnly = top.pointed && !candidates.slice(1).some(item => item.pointed && item.canonicalLexicalIdentity);
  const high = top.pointed && top.score >= 112 && margin >= 12;
  const consonantalHigh = !top.pointed && top.consonantal && top.posMatch && top.score >= 75 && margin >= 18;
  if (!exactOnly && !high && !consonantalHigh) {
    return {
      status: 'NEEDS_HUMAN_REVIEW', vocabularyId: top.lexeme.vocabularyId, confidence: top.score,
      reason: 'A leading candidate exists, but the homograph margin is insufficient for automatic acceptance.',
      candidates: candidates.slice(0, 5).map(item => item.lexeme.vocabularyId)
    };
  }
  return {
    status: exactOnly ? 'MATCHED_EXACT' : 'MATCHED_HIGH_CONFIDENCE',
    vocabularyId: top.lexeme.vocabularyId,
    confidence: top.score,
    reason: exactOnly
      ? 'Unique pointed-form match in PP; POS and frequency were used as corroborating evidence.'
      : 'Pointed form, POS, and frequency distinguish the selected PP lexical identity from homographs.',
    candidates: candidates.slice(0, 5).map(item => item.lexeme.vocabularyId)
  };
}

const STOP_WORDS = new Set(['a', 'an', 'the', 'to', 'be', 'of', 'or', 'and', 'also', 'someone', 'something', 'one', 'oneself', 'in', 'on']);
const SEMANTIC_EQUIVALENTS = [
  ['man', 'mankind', 'humankind', 'human', 'person'],
  ['say', 'speak', 'declare', 'utter'],
  ['land', 'earth', 'ground'],
  ['people', 'nation'],
  ['house', 'household'],
  ['slave', 'servant'],
  ['return', 'restore', 'turn'],
  ['see', 'perceive', 'look'],
  ['give', 'put', 'place', 'set'],
  ['come', 'enter'],
  ['go', 'walk'],
  ['hear', 'listen', 'obey'],
  ['family', 'clan'],
  ['with', 'beside', 'among']
];
const EQUIVALENT_KEY = new Map(SEMANTIC_EQUIVALENTS.flatMap((group, index) => group.map(word => [word, `eq${index}`])));

function semanticTokens(value) {
  return Array.from(new Set(String(value || '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z]+/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 1 && !STOP_WORDS.has(token))
    .map(token => token.replace(/(?:ing|ed|es|s)$/i, ''))
    .map(token => EQUIVALENT_KEY.get(token) || token)));
}

function splitGlosses(primary, alternates = []) {
  return [primary, ...alternates]
    .flatMap(value => String(value || '').split(/[,;|•]/))
    .map(value => value.trim())
    .filter(Boolean);
}

function definitionSenseSegments(definition) {
  return String(definition || '')
    .replace(/\([\d,]+(?:×)?\)/g, ' ')
    .replace(/\([^)]*\)/g, ' ')
    .split(/[;,]/)
    .map(value => value.replace(/\bcf\b.*$/i, '').trim())
    .filter(Boolean);
}

function overlaps(left, right) {
  const normalizedLeft = String(left || '').toLowerCase().replace(/[^a-z]+/g, ' ').trim();
  const normalizedRight = String(right || '').toLowerCase().replace(/[^a-z]+/g, ' ').trim();
  if (normalizedLeft && normalizedLeft === normalizedRight) return true;
  const b = new Set(semanticTokens(right));
  return semanticTokens(left).some(token => b.has(token));
}

function classifyGloss(entry, lexeme) {
  if (!lexeme) return { status: 'NEEDS_HUMAN_REVIEW', reason: 'No safe PP lexical mapping is available for gloss comparison.' };
  const pp = splitGlosses(lexeme.primaryGloss, lexeme.alternateGlosses);
  if (!pp.length) return { status: 'NEEDS_HUMAN_REVIEW', reason: 'The mapped PP lexical record has no standard gloss.' };
  const benchmark = definitionSenseSegments(entry.definition);
  const firstBenchmark = benchmark[0] || '';
  const primary = pp[0] || '';
  if (overlaps(primary, firstBenchmark)) {
    return { status: 'GOOD_MATCH', reason: 'The PP primary gloss expresses the benchmark entry’s leading lexical domain.' };
  }
  const matchingAdditional = pp.slice(1).find(value => overlaps(value, firstBenchmark));
  if (matchingAdditional) {
    return { status: 'PRIMARY_ORDER_PROBLEM', reason: 'A PP additional sense matches the benchmark’s leading lexical domain more closely than the current primary.' };
  }
  if (pp.some(value => benchmark.some(sense => overlaps(value, sense)))) {
    return { status: 'ACCEPTABLE_VARIATION', reason: 'PP and the benchmark share a lexical domain, but use different primary wording or sense order.' };
  }
  return { status: 'NEEDS_HUMAN_REVIEW', reason: 'No controlled lexical-domain overlap was found; semantic judgment is required before any correction.' };
}

function classifyFrequency(expected, actual) {
  if (!(expected > 0) || !(actual > 0)) return { status: 'LIKELY_IDENTITY_MISMATCH', difference: null, percent: null };
  const difference = actual - expected;
  const percent = Math.round((Math.abs(difference) / expected) * 1000) / 10;
  const ratio = Math.max(expected, actual) / Math.min(expected, actual);
  let status = 'CLOSE';
  if (ratio > 3 && Math.abs(difference) >= 25) status = 'LIKELY_IDENTITY_MISMATCH';
  else if (ratio > 1.75 && Math.abs(difference) >= 20) status = 'LARGE_VARIANCE';
  else if (ratio > 1.25 && Math.abs(difference) >= 10) status = 'MODERATE_VARIANCE';
  return { status, difference, percent };
}

function frequencyTier(frequency) {
  if (frequency >= 500) return 'Tier 1 (500+)';
  if (frequency >= 100) return 'Tier 2 (100-499)';
  if (frequency >= 50) return 'Tier 3 (50-99)';
  if (frequency >= 25) return 'Tier 4 (25-49)';
  return 'Tier 5 (10-24)';
}

function countBy(items, field) {
  return items.reduce((counts, item) => {
    const key = item[field] || 'UNSPECIFIED';
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function countStatuses(items, field, statuses) {
  const counts = Object.fromEntries(Array.from(statuses, status => [status, 0]));
  for (const item of items) counts[item[field]] = (counts[item[field]] || 0) + 1;
  return counts;
}

function buildAudit({ sourceText, vocab, glossSource, sourceSha256, corrections = {}, manualReview = {} }) {
  const parsed = parseVgbh(sourceText);
  if (parsed.length !== EXPECTED_ENTRY_COUNT) throw new Error(`Expected ${EXPECTED_ENTRY_COUNT} VGBH entries, parsed ${parsed.length}.`);
  parsed.forEach((entry, index) => {
    if (entry.number !== index + 1) throw new Error(`VGBH sequence breaks at entry ${index + 1}.`);
  });
  const lexemes = buildLexicalIndex(vocab, glossSource);
  const appliedCorrectionIds = applyCorrections(lexemes, corrections);
  const reviewedEntryNumbers = new Set(manualReview.reviewedEntryNumbers || []);
  for (const range of manualReview.reviewedEntryRanges || []) {
    const [start, end] = range;
    for (let number = Number(start); number <= Number(end); number += 1) reviewedEntryNumbers.add(number);
  }
  const manualOverrides = manualReview.overrides || {};
  const crossReferenced = new Set(parsed.flatMap(entry => entry.crossReferences).concat(parsed.filter(entry => entry.crossReferences.length).map(entry => entry.number)));
  const rows = parsed.map(entry => {
    const mapping = mapEntry(entry, lexemes);
    const lexeme = mapping.vocabularyId ? lexemes.get(mapping.vocabularyId.replace(/^lemma:hebrew:/, '')) : null;
    const sourceLexeme = lexeme?.sourceGloss ? {
      ...lexeme,
      primaryGloss: lexeme.sourcePrimaryGloss,
      alternateGlosses: lexeme.sourceAlternateGlosses
    } : lexeme;
    const automatedGloss = classifyGloss(entry, sourceLexeme);
    const effectiveGloss = classifyGloss(entry, lexeme);
    const override = manualOverrides[String(entry.number)] || {};
    const gloss = {
      status: GLOSS_STATUSES.has(override.glossStatus) ? override.glossStatus : automatedGloss.status,
      reason: override.reason || automatedGloss.reason
    };
    const frequency = classifyFrequency(entry.frequency, lexeme?.frequency);
    return {
      vgbhNumber: entry.number,
      hebrewLemma: entry.headword,
      normalizedHebrewLemma: entry.normalizedHeadword,
      vgbhFrequency: entry.frequency,
      frequencyTier: frequencyTier(entry.frequency),
      explicitPos: entry.pos || null,
      verbalStems: entry.stems,
      crossReferenceNumbers: entry.crossReferences,
      homographReview: crossReferenced.has(entry.number),
      mappingStatus: mapping.status,
      ppVocabularyId: mapping.vocabularyId,
      mappingConfidence: mapping.confidence,
      mappingReason: mapping.reason,
      mappingCandidates: mapping.status === 'MATCHED_EXACT' ? [] : mapping.candidates,
      ppPos: lexeme?.pos || [],
      ppFrequency: lexeme?.frequency || null,
      frequencyStatus: frequency.status,
      frequencyDifference: frequency.difference,
      frequencyPercentDifference: frequency.percent,
      ppSourceGloss: lexeme?.sourceGloss || null,
      ppCurrentGloss: lexeme ? splitGlosses(lexeme.primaryGloss, lexeme.alternateGlosses).join('; ') : null,
      correctionId: lexeme?.correctionId || null,
      glossStatus: gloss.status,
      glossReason: gloss.reason,
      effectiveGlossStatus: effectiveGloss.status,
      effectiveGlossReason: effectiveGloss.reason,
      proposedAction: gloss.status === 'PRIMARY_ORDER_PROBLEM'
        ? 'Review source-backed primary ordering; do not import benchmark wording.'
        : gloss.status === 'NEEDS_HUMAN_REVIEW' || mapping.status.includes('REVIEW') || mapping.status.includes('AMBIGUOUS')
          ? 'Human lexical review; retain current PP data pending approved-source support.'
          : 'No PP data change proposed.',
      manualReviewRequired: entry.number <= 100 || entry.frequency >= 100 && ['LIKELY_BAD_GLOSS', 'HOMONYM_CONTAMINATION', 'PRIMARY_ORDER_PROBLEM'].includes(gloss.status) || entry.frequency >= 25 && !mapping.vocabularyId,
      manualReviewCompleted: reviewedEntryNumbers.has(entry.number)
    };
  });
  const byNumber = new Map(rows.map(row => [row.vgbhNumber, row]));
  for (const row of rows) {
    for (const referenceNumber of row.crossReferenceNumbers) {
      const related = byNumber.get(referenceNumber);
      if (!related || row.normalizedHebrewLemma !== related.normalizedHebrewLemma) continue;
      if (row.ppVocabularyId && row.ppVocabularyId === related.ppVocabularyId) {
        row.mappingStatus = 'PP_HOMONYM_COLLISION';
        related.mappingStatus = 'PP_HOMONYM_COLLISION';
        row.mappingReason = related.mappingReason = 'Cross-referenced VGBH homographs resolve to one PP lexical identity and require source-level separation review.';
        row.glossStatus = related.glossStatus = 'HOMONYM_CONTAMINATION';
        row.glossReason = related.glossReason = 'Distinct benchmark homographs share one PP lexical identity; their senses may be contaminated.';
      }
    }
  }
  const byNormalizedHeadword = new Map();
  for (const row of rows) {
    const key = row.normalizedHebrewLemma;
    if (!byNormalizedHeadword.has(key)) byNormalizedHeadword.set(key, []);
    byNormalizedHeadword.get(key).push(row);
  }
  for (const group of byNormalizedHeadword.values()) {
    if (group.length < 2 || group.some(row => row.crossReferenceNumbers.length || row.mappingStatus === 'PP_HOMONYM_COLLISION')) continue;
    const mapped = group.filter(row => row.ppVocabularyId);
    if (mapped.length > 1 && new Set(mapped.map(row => row.ppVocabularyId)).size < mapped.length) {
      mapped.forEach(row => {
        row.mappingStatus = 'PP_POSSIBLE_DUPLICATE';
        row.mappingReason = 'Multiple independent VGBH entries with the same pointed headword resolve to one PP lexical identity; duplicate or homonym review is required.';
      });
    }
  }
  const tiers = {};
  for (const tier of ['Tier 1 (500+)', 'Tier 2 (100-499)', 'Tier 3 (50-99)', 'Tier 4 (25-49)', 'Tier 5 (10-24)']) {
    const items = rows.filter(row => row.frequencyTier === tier);
    tiers[tier] = {
      total: items.length,
      mapping: countStatuses(items, 'mappingStatus', MAPPING_STATUSES),
      gloss: countStatuses(items, 'glossStatus', GLOSS_STATUSES),
      frequency: countStatuses(items, 'frequencyStatus', new Set(['CLOSE', 'MODERATE_VARIANCE', 'LARGE_VARIANCE', 'LIKELY_IDENTITY_MISMATCH']))
    };
  }
  return {
    schemaVersion: 1,
    auditVersion: 'v1.9.1',
    generatedDeterministically: true,
    source: {
      title: 'The Vocabulary Guide to Biblical Hebrew and Aramaic',
      authors: 'Miles V. Van Pelt and Gary D. Pratico',
      edition: 'Second Edition',
      publicationYear: 2019,
      use: 'Private verification and audit only; definitions are not included in this output.',
      sha256: sourceSha256
    },
    summary: {
      totalEntries: rows.length,
      mapping: countStatuses(rows, 'mappingStatus', MAPPING_STATUSES),
      gloss: countStatuses(rows, 'glossStatus', GLOSS_STATUSES),
      frequency: countStatuses(rows, 'frequencyStatus', new Set(['CLOSE', 'MODERATE_VARIANCE', 'LARGE_VARIANCE', 'LIKELY_IDENTITY_MISMATCH'])),
      frequencyTiers: tiers,
      homographEntries: rows.filter(row => row.homographReview).length,
      manualReviewRequired: rows.filter(row => row.manualReviewRequired).length,
      manualReviewCompleted: rows.filter(row => row.manualReviewCompleted).length,
      correctionsApplied: appliedCorrectionIds.length
    },
    entries: rows
  };
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--source') args.source = argv[++index];
    else if (argv[index] === '--output') args.output = argv[++index];
    else throw new Error(`Unknown argument: ${argv[index]}`);
  }
  if (!args.source) throw new Error('Usage: node scripts/vgbh-vocabulary-audit.js --source /private/path/VGBH_1-1903_Cleaned_With_Metadata.txt [--output audit.json]');
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const sourceText = fs.readFileSync(path.resolve(args.source), 'utf8');
  const audit = buildAudit({
    sourceText,
    vocab: JSON.parse(fs.readFileSync(DEFAULT_VOCAB_PATH, 'utf8')),
    glossSource: JSON.parse(fs.readFileSync(DEFAULT_GLOSS_PATH, 'utf8')),
    sourceSha256: crypto.createHash('sha256').update(sourceText).digest('hex'),
    corrections: JSON.parse(fs.readFileSync(DEFAULT_CORRECTIONS_PATH, 'utf8')),
    manualReview: fs.existsSync(DEFAULT_MANUAL_REVIEW_PATH) ? JSON.parse(fs.readFileSync(DEFAULT_MANUAL_REVIEW_PATH, 'utf8')) : {}
  });
  const rendered = `${JSON.stringify(audit, null, 2)}\n`;
  if (args.output) {
    const output = path.resolve(args.output);
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, rendered);
    console.log(`Wrote ${audit.summary.totalEntries} sanitized audit entries to ${path.relative(ROOT, output) || output}.`);
  } else {
    process.stdout.write(rendered);
  }
}

if (require.main === module) main();

module.exports = {
  EXPECTED_ENTRY_COUNT,
  GLOSS_STATUSES,
  MAPPING_STATUSES,
  buildAudit,
  buildLexicalIndex,
  classifyFrequency,
  mapEntry,
  normalizeConsonants,
  normalizePointedHebrew,
  parseVgbh
};
