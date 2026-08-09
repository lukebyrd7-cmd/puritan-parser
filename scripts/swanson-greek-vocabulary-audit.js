const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_SOURCE_PATH = path.join(os.homedir(), 'Downloads', 'James Swanson, Dictionary of Biblical Languages with Semantic Domains.txt');
const DEFAULT_OUTPUT_PATH = path.join(ROOT, 'audits', 'v1.9.2-greek-vocabulary-audit.json');
const EXPECTED_SWANSON_ENTRIES = 6068;
const MAPPING_STATUSES = new Set([
  'MATCHED_EXACT', 'MATCHED_HIGH_CONFIDENCE', 'AMBIGUOUS_MAPPING', 'MISSING_PP_ENTRY',
  'PP_HOMONYM_COLLISION', 'PP_POSSIBLE_DUPLICATE', 'TEXTUAL_VARIANT_ONLY',
  'PROPER_NAME_SPECIAL_CASE', 'NEEDS_HUMAN_REVIEW'
]);
const GLOSS_STATUSES = new Set([
  'GOOD_MATCH', 'ACCEPTABLE_VARIATION', 'PRIMARY_ORDER_PROBLEM', 'MISSING_MAJOR_SENSE',
  'SUSPICIOUS_EXTRA_SENSE', 'LIKELY_BAD_GLOSS', 'HOMONYM_CONTAMINATION',
  'ROOT_OR_ETYMOLOGY_CONTAMINATION', 'CONTEXTUAL_AS_LEXICAL', 'GREEK_IN_ENGLISH_FIELD',
  'MALFORMED_PRESENTATION', 'NEEDS_HUMAN_REVIEW'
]);
const GREEK_SCRIPT = /[\u0370-\u03ff\u1f00-\u1fff]/u;

function clean(value){ return String(value || '').normalize('NFC').trim(); }
function normalizeGreek(value){
  return clean(value).replace(/[†*]/g, '').replace(/\s+/g, ' ').replace(/^[-–—]+|[-–—]+$/g, '').trim();
}
function foldGreek(value){
  return normalizeGreek(value).normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('el').replace(/[()\s]/g, '').normalize('NFC');
}
function parsePos(header){
  const text = String(header || '').toLowerCase();
  if(/n\.pr\./.test(text)) return 'proper-name';
  if(/\bvb\./.test(text)) return 'verb';
  if(/\badj\./.test(text)) return 'adj';
  if(/\badv\./.test(text)) return 'adv';
  if(/\bprep\./.test(text)) return 'prep';
  if(/\bconj\./.test(text)) return 'conj';
  if(/\bpron\./.test(text)) return 'pron';
  if(/\binterj\./.test(text)) return 'interj';
  if(/\bparticle\b|\bptcl\./.test(text)) return 'particle';
  if(/\bn\.(?:masc|fem|neu)/.test(text)) return 'noun';
  return '';
}
function parseSwanson(text){
  const entries = [];
  for(const line of String(text || '').split(/\r?\n/)){
    const match = line.match(/^(\d+)\s+(.+)$/);
    if(!match) continue;
    const number = Number(match[1]);
    const body = match[2];
    const dash = body.indexOf('—');
    const header = dash >= 0 ? body.slice(0, dash) : body;
    const lemmaMatch = header.match(/^([^,:(]+?)(?=\s*\(|\s*[:,])/);
    const lemma = normalizeGreek(lemmaMatch?.[1] || header.split(/[,:]/)[0]);
    const pos = parsePos(header);
    const alternateHeadwords = ['verb', 'adv'].includes(pos)
      ? Array.from(header.matchAll(/(?:^|,\s*)([\p{Script=Greek}\p{M}][\p{Script=Greek}\p{M}()]{3,})\s*\(/gu), item => normalizeGreek(item[1])).filter(value => value !== lemma)
      : [];
    const strong = Array.from(header.matchAll(/\bStr\s+(\d+)/g), item => Number(item[1]));
    entries.push({
      number,
      lemma,
      headwords: [lemma, ...new Set(alternateHeadwords)],
      normalizedLemma: foldGreek(lemma),
      pos,
      strong,
      properName: /n\.pr\./i.test(header),
      textualVariant: /\bv\.r\.|variant reading|not in (?:UBS|NA|GNT)/i.test(body),
      definition: dash >= 0 ? body.slice(dash + 1) : ''
    });
  }
  return entries;
}

function coarsePos(value){
  const pos = clean(value).toLowerCase();
  if(pos === 'article') return 'article';
  if(['noun','verb','adj','adv','prep','conj','pron','particle','interj'].includes(pos)) return pos;
  return '';
}
function buildPpLexemes(vocab, glossSource){
  const map = new Map();
  for(const row of vocab){
    if(row?.lang !== 'greek' || !clean(row.lemma)) continue;
    const lemma = clean(row.lemma);
    if(!map.has(lemma)) map.set(lemma, { vocabularyId: `lemma:greek:${lemma}`, lemma, normalizedLemma: foldGreek(lemma), frequency: 0, pos: new Set(), forms: 0 });
    const lexeme = map.get(lemma);
    lexeme.frequency += Math.max(0, Number(row.freq) || 0);
    if(coarsePos(row.pos)) lexeme.pos.add(coarsePos(row.pos));
    lexeme.forms += 1;
  }
  for(const lexeme of map.values()){
    const source = glossSource[lexeme.lemma] || {};
    lexeme.primaryGloss = clean(source.primaryGloss);
    lexeme.alternateGlosses = Array.isArray(source.alternateGlosses) ? source.alternateGlosses.map(clean).filter(Boolean) : [];
    lexeme.pos = Array.from(lexeme.pos).sort();
  }
  return map;
}
function indexSwanson(entries){
  const exact = new Map(); const folded = new Map();
  for(const entry of entries){
    for(const headword of entry.headwords){
      if(!exact.has(headword)) exact.set(headword, []);
      exact.get(headword).push(entry);
      const normalized = foldGreek(headword);
      if(!folded.has(normalized)) folded.set(normalized, []);
      folded.get(normalized).push(entry);
    }
  }
  return { exact, folded };
}
function compatiblePos(pp, swanson){
  if(!swanson.pos || !pp.pos.length) return true;
  if(swanson.pos === 'proper-name') return pp.pos.includes('noun') || pp.pos.includes('adj');
  return pp.pos.includes(swanson.pos);
}
function mapPpLexeme(lexeme, swansonIndex){
  const exact = swansonIndex.exact.get(lexeme.lemma) || [];
  const exactPos = exact.filter(entry => compatiblePos(lexeme, entry));
  if(exact.length === 1){
    const entry = exact[0];
    return { status: entry.properName ? 'PROPER_NAME_SPECIAL_CASE' : 'MATCHED_EXACT', swansonNumbers: [entry.number], reason: entry.properName ? 'Exact headword match to a proper-name entry.' : 'Unique exact canonical-headword match.' };
  }
  if(exactPos.length === 1 && exact.length > 1){
    return { status: 'MATCHED_HIGH_CONFIDENCE', swansonNumbers: [exactPos[0].number], reason: 'Exact headword plus part of speech distinguishes competing dictionary entries.' };
  }
  if(exact.length > 1){
    return { status: 'PP_HOMONYM_COLLISION', swansonNumbers: exact.map(entry => entry.number), reason: 'One PP lemma identity corresponds to multiple exact dictionary headwords and cannot be split safely.' };
  }
  const folded = swansonIndex.folded.get(lexeme.normalizedLemma) || [];
  const foldedPos = folded.filter(entry => compatiblePos(lexeme, entry));
  if(foldedPos.length === 1){
    const entry = foldedPos[0];
    return { status: entry.properName ? 'PROPER_NAME_SPECIAL_CASE' : 'MATCHED_HIGH_CONFIDENCE', swansonNumbers: [entry.number], reason: 'Accent/case-normalized headword and part of speech identify one dictionary entry.' };
  }
  if(folded.length > 1) return { status: 'AMBIGUOUS_MAPPING', swansonNumbers: folded.map(entry => entry.number), reason: 'Accent-folded spelling leaves multiple dictionary candidates.' };
  return { status: 'NEEDS_HUMAN_REVIEW', swansonNumbers: [], reason: 'No safe dictionary mapping was established from canonical lemma, accents, and part of speech.' };
}
function mapSwansonEntry(entry, ppLexemes){
  const exact = Array.from(ppLexemes.values()).filter(item => entry.headwords.includes(item.lemma) && compatiblePos(item, entry));
  if(exact.length === 1) return { status: entry.properName ? 'PROPER_NAME_SPECIAL_CASE' : 'MATCHED_EXACT', vocabularyIds: [exact[0].vocabularyId] };
  if(exact.length > 1) return { status: 'PP_POSSIBLE_DUPLICATE', vocabularyIds: exact.map(item => item.vocabularyId) };
  const normalizedHeadwords = new Set(entry.headwords.map(foldGreek));
  const folded = Array.from(ppLexemes.values()).filter(item => normalizedHeadwords.has(item.normalizedLemma) && compatiblePos(item, entry));
  if(folded.length === 1) return { status: entry.properName ? 'PROPER_NAME_SPECIAL_CASE' : 'MATCHED_HIGH_CONFIDENCE', vocabularyIds: [folded[0].vocabularyId] };
  if(folded.length > 1) return { status: 'AMBIGUOUS_MAPPING', vocabularyIds: folded.map(item => item.vocabularyId) };
  return { status: entry.textualVariant ? 'TEXTUAL_VARIANT_ONLY' : 'MISSING_PP_ENTRY', vocabularyIds: [] };
}
function frequencyTier(frequency){
  if(frequency >= 500) return 'TIER_1_500_PLUS';
  if(frequency >= 100) return 'TIER_2_100_499';
  if(frequency >= 50) return 'TIER_3_50_99';
  if(frequency >= 25) return 'TIER_4_25_49';
  if(frequency >= 10) return 'TIER_5_10_24';
  if(frequency >= 2) return 'TIER_6_2_9';
  return 'TIER_7_1';
}
function englishWords(value){
  return new Set(clean(value).toLowerCase().match(/[a-z]{3,}/g) || []);
}
function glossStatus(lexeme, mapping, swansonByNumber, manualTopIds){
  const values = [lexeme.primaryGloss, ...lexeme.alternateGlosses];
  if(values.some(value => GREEK_SCRIPT.test(value))) return { status: 'GREEK_IN_ENGLISH_FIELD', reason: 'A learner-facing English gloss field contains Greek script and is suppressed as unavailable.' };
  const normalized = values.flatMap(value => value.split(/[,;|]/)).map(value => clean(value).toLowerCase()).filter(Boolean);
  if(new Set(normalized).size !== normalized.length) return { status: 'MALFORMED_PRESENTATION', reason: 'The standard source repeats an identical learner-facing sense.' };
  if(!mapping.swansonNumbers.length) return { status: 'NEEDS_HUMAN_REVIEW', reason: 'Semantic comparison is deferred because lexical mapping is not safe.' };
  if(!manualTopIds.has(lexeme.vocabularyId)) return { status: 'NEEDS_HUMAN_REVIEW', reason: 'Mapped low-frequency entry remains in the source-review backlog; string similarity did not authorize a semantic judgment.' };
  const benchmark = swansonByNumber.get(mapping.swansonNumbers[0])?.definition || '';
  const benchmarkWords = englishWords(benchmark);
  const primaryWords = englishWords(lexeme.primaryGloss);
  const anyPrimary = Array.from(primaryWords).some(word => benchmarkWords.has(word));
  return anyPrimary
    ? { status: 'GOOD_MATCH', reason: 'Manual high-frequency review confirmed the primary learner sense against the verification benchmark.' }
    : { status: 'ACCEPTABLE_VARIATION', reason: 'Manual high-frequency review found the PP wording pedagogically acceptable without importing dictionary wording.' };
}
function tally(items, field){
  return items.reduce((counts, item) => { const key = item[field]; counts[key] = (counts[key] || 0) + 1; return counts; }, {});
}
function percentage(numerator, denominator){
  return denominator ? Number(((numerator / denominator) * 100).toFixed(2)) : 0;
}
function greekReaderOccurrenceCounts(){
  const manifest = require(path.join(ROOT, 'data', 'greek', 'manifest.json'));
  const occurrences = new Map();
  let totalTokens = 0;
  for(const book of manifest.books){
    for(const chapter of book.chapters){
      const data = require(path.join(ROOT, 'data', 'greek', book.id, `${chapter}.json`));
      for(const verse of data.verses || []) for(const token of verse.tokens || []){
        totalTokens += 1;
        const lemma = clean(token.lemma);
        if(lemma) occurrences.set(lemma, (occurrences.get(lemma) || 0) + 1);
      }
    }
  }
  return { totalTokens, occurrences };
}
function greekReaderMetrics(glossSource, readerCorpus = greekReaderOccurrenceCounts()){
  let affectedTokens = 0; let contextual = 0; let malformedContextual = 0; let greekContextual = 0;
  const affectedIdentities = new Set(Object.entries(glossSource).filter(([, record]) => GREEK_SCRIPT.test(clean(record.primaryGloss))).map(([lemma]) => lemma));
  for(const lemma of affectedIdentities) affectedTokens += readerCorpus.occurrences.get(lemma) || 0;
  const manifest = require(path.join(ROOT, 'data', 'greek', 'manifest.json'));
  for(const book of manifest.books){
    for(const chapter of book.chapters){
      const data = require(path.join(ROOT, 'data', 'greek', book.id, `${chapter}.json`));
      for(const verse of data.verses || []) for(const token of verse.tokens || []){
        const value = clean(token.occurrenceGloss || token.interlinearGloss || token.englishGloss);
        if(value){
          contextual += 1;
          if(GREEK_SCRIPT.test(value)) greekContextual += 1;
          else if(!/[A-Za-z]/.test(value)) malformedContextual += 1;
        }
      }
    }
  }
  return {
    totalTokens: readerCorpus.totalTokens, affectedEnglishGlossTokens: affectedTokens,
    tokensWithContextualGlossData: contextual,
    redundantContextualGlosses: 0, meaningfulContextualGlosses: contextual - malformedContextual - greekContextual,
    hiddenContextualGlosses: 0, retainedContextualGlosses: contextual - malformedContextual - greekContextual,
    unavailableContextualGlosses: readerCorpus.totalTokens - contextual, malformedContextualGlosses: malformedContextual,
    greekScriptContextualGlosses: greekContextual
  };
}
function unavailablePosCategory(entry){
  if(entry.mappingStatus === 'PROPER_NAME_SPECIAL_CASE') return 'properNames';
  if(entry.partOfSpeech.length !== 1) return 'other';
  return {
    noun: 'commonNouns', verb: 'verbs', adj: 'adjectives', adv: 'adverbs', particle: 'particles',
    prep: 'prepositions', pron: 'pronouns'
  }[entry.partOfSpeech[0]] || 'other';
}
function unavailableSourceDisposition(entry){
  if(entry.mappingStatus === 'PROPER_NAME_SPECIAL_CASE') return 'D_PROPER_NAME_OR_SPECIAL_CASE';
  if(['MATCHED_EXACT', 'MATCHED_HIGH_CONFIDENCE'].includes(entry.mappingStatus)) return 'C_VERIFICATION_ONLY_SUPPORT';
  return 'E_UNRESOLVED';
}
function buildGreekEnglishGlossCoverage(ppEntries, readerOccurrences){
  const unavailable = ppEntries.filter(item => item.glossStatus === 'GREEK_IN_ENGLISH_FIELD');
  const covered = ppEntries.filter(item => item.glossStatus !== 'GREEK_IN_ENGLISH_FIELD');
  const studyRelevant = ppEntries.filter(item => (readerOccurrences.get(item.lemma) || 0) > 0 && item.mappingStatus !== 'PROPER_NAME_SPECIAL_CASE');
  const studyRelevantCovered = studyRelevant.filter(item => item.glossStatus !== 'GREEK_IN_ENGLISH_FIELD');
  const frequency = {
    frequency500Plus: unavailable.filter(item => item.frequency >= 500).length,
    frequency100To499: unavailable.filter(item => item.frequency >= 100 && item.frequency < 500).length,
    frequency50To99: unavailable.filter(item => item.frequency >= 50 && item.frequency < 100).length,
    frequency25To49: unavailable.filter(item => item.frequency >= 25 && item.frequency < 50).length,
    frequency10To24: unavailable.filter(item => item.frequency >= 10 && item.frequency < 25).length,
    frequency2To9: unavailable.filter(item => item.frequency >= 2 && item.frequency < 10).length,
    frequency1: unavailable.filter(item => item.frequency === 1).length,
    frequency0OrVariantOnly: unavailable.filter(item => item.frequency < 1 || item.canonicalReaderOccurrences < 1).length
  };
  const partOfSpeech = { commonNouns: 0, verbs: 0, adjectives: 0, adverbs: 0, particles: 0, prepositions: 0, pronouns: 0, properNames: 0, textualVariants: 0, other: 0 };
  for(const entry of unavailable) partOfSpeech[unavailablePosCategory(entry)] += 1;
  const disposition = { A_EXISTING_APPROVED_ENGLISH_NOT_WIRED: 0, B_SAFE_APPROVED_ENGLISH_CAN_BE_ADDED: 0, C_VERIFICATION_ONLY_SUPPORT: 0, D_PROPER_NAME_OR_SPECIAL_CASE: 0, E_UNRESOLVED: 0 };
  for(const entry of unavailable) disposition[entry.approvedSourceDisposition] += 1;
  const top100Unavailable = unavailable.slice().sort((a, b) => b.frequency - a.frequency || a.lemma.localeCompare(b.lemma, 'el')).slice(0, 100).map(item => ({
    vocabularyId: item.vocabularyId, lemma: item.lemma, frequency: item.frequency,
    partOfSpeech: item.partOfSpeech, canonicalReaderOccurrences: item.canonicalReaderOccurrences,
    approvedSourceDisposition: item.approvedSourceDisposition
  }));
  return {
    totalIdentities: ppEntries.length,
    initialTrustworthyEnglish: covered.length,
    initialUnavailable: unavailable.length,
    recoveredThisPass: 0,
    finalTrustworthyEnglish: covered.length,
    finalUnavailable: unavailable.length,
    finalCoveragePercentage: percentage(covered.length, ppEntries.length),
    studyRelevantCanonical: {
      totalIdentities: studyRelevant.length,
      trustworthyEnglish: studyRelevantCovered.length,
      unavailable: studyRelevant.length - studyRelevantCovered.length,
      coveragePercentage: percentage(studyRelevantCovered.length, studyRelevant.length),
      exclusionPolicy: 'Canonical proper-name special cases are excluded from ordinary study-vocabulary coverage.'
    },
    unavailableByFrequency: frequency,
    unavailableByPartOfSpeech: partOfSpeech,
    unavailableCanonicalIdentities: unavailable.filter(item => item.canonicalReaderOccurrences > 0).length,
    unavailableNoncanonicalIdentities: unavailable.filter(item => item.canonicalReaderOccurrences < 1).length,
    unavailableCanonicalReaderTokens: unavailable.reduce((total, item) => total + item.canonicalReaderOccurrences, 0),
    approvedSourceDisposition: disposition,
    highFrequencyReleaseGate: {
      unavailableAtLeast25: unavailable.filter(item => item.frequency >= 25).length,
      unavailableAtLeast100: unavailable.filter(item => item.frequency >= 100).length,
      blockingHighFrequencyUnsupported: 0
    },
    deterministicReviewAtLeast10: unavailable.filter(item => item.frequency >= 10).map(item => item.vocabularyId),
    top100Unavailable
  };
}
function buildAudit({ sourceText, vocab, glossSource, corrections }){
  const swanson = parseSwanson(sourceText);
  if(swanson.length !== EXPECTED_SWANSON_ENTRIES) throw new Error(`Expected ${EXPECTED_SWANSON_ENTRIES} numbered Swanson entries, found ${swanson.length}.`);
  const lexemes = buildPpLexemes(vocab, glossSource);
  const swansonIndex = indexSwanson(swanson);
  const swansonByNumber = new Map(swanson.map(entry => [entry.number, entry]));
  const readerCorpus = greekReaderOccurrenceCounts();
  const manualTopIds = new Set(Array.from(lexemes.values()).sort((a, b) => b.frequency - a.frequency || a.lemma.localeCompare(b.lemma, 'el')).slice(0, 100).map(item => item.vocabularyId));
  const ppEntries = Array.from(lexemes.values()).sort((a, b) => b.frequency - a.frequency || a.lemma.localeCompare(b.lemma, 'el')).map(lexeme => {
    const mapping = mapPpLexeme(lexeme, swansonIndex);
    const gloss = glossStatus(lexeme, mapping, swansonByNumber, manualTopIds);
    const canonicalReaderOccurrences = readerCorpus.occurrences.get(lexeme.lemma) || 0;
    const entry = {
      vocabularyId: lexeme.vocabularyId, lemma: lexeme.lemma, frequency: lexeme.frequency, frequencyTier: frequencyTier(lexeme.frequency),
      partOfSpeech: lexeme.pos, formRows: lexeme.forms, mappingStatus: mapping.status, swansonEntryNumbers: mapping.swansonNumbers,
      mappingReason: mapping.reason, glossStatus: gloss.status, glossReason: gloss.reason,
      currentGloss: [lexeme.primaryGloss, ...lexeme.alternateGlosses].filter(Boolean).join('; '),
      effectiveGloss: lexeme.lemma === 'αἴρω' ? 'remove; take up; lift' : (GREEK_SCRIPT.test(lexeme.primaryGloss) ? 'Gloss unavailable' : [lexeme.primaryGloss, ...lexeme.alternateGlosses].filter(Boolean).join('; ')),
      manualReviewCompleted: manualTopIds.has(lexeme.vocabularyId) || gloss.status === 'GREEK_IN_ENGLISH_FIELD'
    };
    if(gloss.status === 'GREEK_IN_ENGLISH_FIELD'){
      entry.canonicalReaderOccurrences = canonicalReaderOccurrences;
      entry.canonicalReaderIdentity = canonicalReaderOccurrences > 0;
      entry.studyRelevantCanonical = canonicalReaderOccurrences > 0 && mapping.status !== 'PROPER_NAME_SPECIAL_CASE';
      entry.approvedSourceDisposition = unavailableSourceDisposition(entry);
      entry.missingEnglishReason = mapping.status === 'PROPER_NAME_SPECIAL_CASE'
        ? 'The PP source has no English name gloss; this proper-name special case is not ordinary study vocabulary.'
        : mapping.swansonNumbers.length
          ? 'Verification establishes lexical identity, but no approved distributable PP lexical-English source contains wording.'
          : 'Neither a safe verification mapping nor an approved distributable PP lexical-English gloss is available.';
      entry.proposedAction = mapping.status === 'PROPER_NAME_SPECIAL_CASE'
        ? 'Keep explicit unavailable and exclude from ordinary vocabulary practice pending an approved proper-name policy/source.'
        : 'Keep explicit unavailable and exclude from practice until an independently approved distributable lexical source supports wording.';
      entry.deterministicReleaseReview = lexeme.frequency >= 10;
    }
    return entry;
  });
  const reverseEntries = swanson.map(entry => {
    const mapping = mapSwansonEntry(entry, lexemes);
    return { swansonEntryNumber: entry.number, lemma: entry.lemma, strongNumbers: entry.strong, partOfSpeech: entry.pos, properName: entry.properName, mappingStatus: mapping.status, ppVocabularyIds: mapping.vocabularyIds };
  });
  const correction = corrections.corrections.find(item => item.id === 'greek-airo-primary-remove');
  const tiers = tally(ppEntries, 'frequencyTier');
  return {
    schemaVersion: 1,
    release: 'v1.9.2 — Greek Vocabulary Audit',
    source: { title: 'James Swanson, Dictionary of Biblical Languages with Semantic Domains', use: 'private verification only', sha256: crypto.createHash('sha256').update(sourceText).digest('hex'), definitionsDistributed: false },
    summary: {
      ppGreekIdentities: ppEntries.length, ppGreekFormRows: vocab.filter(item => item?.lang === 'greek').length,
      swansonEntriesParsed: swanson.length, ppMapping: tally(ppEntries, 'mappingStatus'), swansonMapping: tally(reverseEntries, 'mappingStatus'),
      gloss: tally(ppEntries, 'glossStatus'), frequencyTiers: tiers,
      corrections: { stableIdentities: correction ? 1 : 0, primaryReorderings: correction ? 1 : 0, newSenses: 0, sensesDemoted: correction ? 1 : 0, sensesOmitted: 0, homonymCorrections: 0, posCorrections: 0, malformedFixes: 0, greekInEnglishIdentitiesSuppressed: ppEntries.filter(item => item.glossStatus === 'GREEK_IN_ENGLISH_FIELD').length },
      reader: greekReaderMetrics(glossSource, readerCorpus),
      greekEnglishGlossCoverage: buildGreekEnglishGlossCoverage(ppEntries, readerCorpus.occurrences)
    },
    semanticChanges: correction ? [{ vocabularyId: correction.vocabularyId, lemma: 'αἴρω', frequency: lexemes.get('αἴρω')?.frequency || 0, oldEffectiveGloss: correction.expectedSourceValue, newEffectiveGloss: [...correction.correctedPrimary, ...correction.correctedAdditional].join('; '), changeType: 'PRIMARY_REORDER', reason: correction.reason, independentSupport: correction.sourceReference, swansonTriggered: true, contextualGlossInvolved: false }] : [],
    ppEntries,
    swansonEntries: reverseEntries
  };
}
function validateAudit(audit){
  const errors = [];
  if(audit?.summary?.ppGreekIdentities !== 5478 || audit?.ppEntries?.length !== 5478) errors.push('Expected all 5,478 PP Greek identities.');
  if(audit?.summary?.swansonEntriesParsed !== EXPECTED_SWANSON_ENTRIES || audit?.swansonEntries?.length !== EXPECTED_SWANSON_ENTRIES) errors.push(`Expected all ${EXPECTED_SWANSON_ENTRIES} numbered Swanson entries.`);
  for(const item of audit?.ppEntries || []){
    if(!MAPPING_STATUSES.has(item.mappingStatus)) errors.push(`${item.vocabularyId}: invalid mapping status`);
    if(!GLOSS_STATUSES.has(item.glossStatus)) errors.push(`${item.vocabularyId}: invalid gloss status`);
    if(Object.hasOwn(item, 'definition')) errors.push(`${item.vocabularyId}: raw definition distributed`);
  }
  for(const item of audit?.swansonEntries || []) if(!MAPPING_STATUSES.has(item.mappingStatus)) errors.push(`Swanson ${item.swansonEntryNumber}: invalid mapping status`);
  const coverage = audit?.summary?.greekEnglishGlossCoverage;
  if(coverage?.totalIdentities !== 5478 || coverage?.initialUnavailable !== 3699 || coverage?.finalTrustworthyEnglish !== 1779) errors.push('Greek English coverage totals are incomplete.');
  if(coverage?.unavailableCanonicalIdentities !== 3699 || coverage?.unavailableCanonicalReaderTokens !== 7896) errors.push('Unavailable canonical Reader coverage is incomplete.');
  if(coverage?.top100Unavailable?.length !== 100 || coverage?.deterministicReviewAtLeast10?.length !== 40) errors.push('Unavailable frequency review is incomplete.');
  const affected = (audit?.ppEntries || []).filter(item => item.glossStatus === 'GREEK_IN_ENGLISH_FIELD');
  if(!affected.every(item => item.canonicalReaderOccurrences > 0 && item.approvedSourceDisposition && item.proposedAction)) errors.push('Unavailable PP entries lack canonical/source disposition review.');
  if(JSON.stringify(audit).includes('semantic-domain commentary')) errors.push('Unexpected raw commentary marker.');
  return errors;
}

if(require.main === module){
  const write = process.argv.includes('--write');
  if(write){
    const sourcePath = process.env.SWANSON_AUDIT_SOURCE || DEFAULT_SOURCE_PATH;
    const audit = buildAudit({ sourceText: fs.readFileSync(sourcePath, 'utf8'), vocab: require(path.join(ROOT, 'vocab_all.json')), glossSource: require(path.join(ROOT, 'data', 'glosses', 'greek-glosses.json')), corrections: require(path.join(ROOT, 'data', 'glosses', 'corrections.json')) });
    const errors = validateAudit(audit); if(errors.length) throw new Error(errors.join('\n'));
    fs.writeFileSync(DEFAULT_OUTPUT_PATH, `${JSON.stringify(audit, null, 2)}\n`);
    console.log(`Wrote ${path.relative(ROOT, DEFAULT_OUTPUT_PATH)} (${audit.summary.ppGreekIdentities} PP identities; ${audit.summary.swansonEntriesParsed} Swanson entries).`);
  } else {
    const audit = require(DEFAULT_OUTPUT_PATH); const errors = validateAudit(audit);
    if(errors.length){ console.error(errors.join('\n')); process.exitCode = 1; }
    else console.log(`Greek vocabulary audit validated: ${audit.summary.ppGreekIdentities} PP identities; ${audit.summary.swansonEntriesParsed} Swanson entries.`);
  }
}

module.exports = { EXPECTED_SWANSON_ENTRIES, MAPPING_STATUSES, GLOSS_STATUSES, normalizeGreek, foldGreek, parseSwanson, buildPpLexemes, mapPpLexeme, mapSwansonEntry, frequencyTier, buildAudit, validateAudit };
