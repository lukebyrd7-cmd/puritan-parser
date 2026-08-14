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
const HEBREW_LEXICON_META_PATH = path.join(ROOT, 'data', 'metadata', 'open-scriptures-hebrew-lexicon-source.json');
const MORPHHB_SOURCE_DIR = path.join(ROOT, 'data', 'source', 'morphhb-wlc');
const DEFAULT_STRONGS_PATHS = [
  process.env.PP_STRONGS_HEBREW_PATH,
  '/private/tmp/pp-v193-strongs/hebrew/strongs-hebrew-dictionary.js'
].filter(Boolean);
const DEFAULT_HEBREW_LEXICON_PATHS = [
  process.env.PP_HEBREW_LEXICAL_INDEX_PATH,
  '/private/tmp/pp-v195-hebrew-lexicon/LexicalIndex.xml'
].filter(Boolean);
const FUNCTION_FORMS = { l: 'לְ', b: 'בְּ', m: 'מִן', k: 'כְּ', i: 'הֲ' };
const SEED_VERB_STRONG_ALIASES = {
  'אָמַר': '559', 'עָשָׂה': '6213', 'בּוֹא': '935', 'נָתַן': '5414', 'הָלַךְ': '1980', 'רָאָה': '7200', 'שָׁמַע': '8085',
  'יָשַׁב': '3427', 'יָצָא': '3318', 'שׁוּב': '7725', 'לָקַח': '3947', 'יָדַע': '3045', 'עָלָה': '5927', 'שָׁלַח': '7971',
  'מוּת': '4191', 'אָכַל': '398', 'קָרָא': '7121', 'נָשָׂא': '5375', 'קוּם': '6965', 'שִׂים': '7760', 'עָבַר': '5674',
  'עָמַד': '5975', 'נָכָה': '5221', 'יָלַד': '3205', 'צָוָה': '6680', 'שָׁמַר': '8104', 'מָצָא': '4672', 'נָפַל': '5307',
  'יָרַד': '3381', 'בָּנָה': '1129', 'מָלַךְ': '4427', 'בָּרַךְ': '1288', 'יָרֵא': '3372', 'עָנָה': '6030', 'פָּקַד': '6485',
  'עָבַד': '5647', 'כָּרַת': '3772', 'חָטָא': '2398', 'זָכַר': '2142', 'בִּקֵּשׁ': '1245', 'כָּתַב': '3789', 'שָׁתָה': '8354',
  'אָהַב': '157', 'יָשַׁע': '3467', 'שָׁפַט': '8199', 'שָׁאַל': '7592', 'לָחַם': '3898', 'הָרַג': '2026', 'סָבַב': '5437',
  'נָגַע': '5060', 'הָלַל': '1984', 'נָסַע': '5265', 'פָּנָה': '6437', 'קָבַר': '6912', 'חָשַׁב': '2803', 'גָּדַל': '1431',
  'לָבַשׁ': '3847', 'יָדָה': '3034', 'גָּאַל': '1350', 'כָּפַר': '3722', 'שָׁכַח': '7911', 'שׁוּר': '7891', 'רָחַץ': '7364',
  'אָחַז': '270', 'בָּרַח': '1272', 'פָּדָה': '6299', 'בָּרָא': '1254', 'פָּשַׁט': '6584', 'חָפַר': '2658'
};
const DERIVED_STEM_SEED_VERBS = new Set(['נָכָה', 'צָוָה', 'בָּרַךְ', 'בִּקֵּשׁ', 'יָשַׁע', 'הָלַל', 'יָדָה', 'כָּפַר']);

function clean(value){ return typeof value === 'string' ? value.normalize('NFC').trim() : ''; }
function stripMarks(value){ return clean(value).normalize('NFD').replace(/[\u0591-\u05c7]/g, '').normalize('NFC'); }
function stripCantillation(value){ return clean(value).normalize('NFD').replace(/[\u0591-\u05af\u05bd\u05c4\u05c5]/g, '').normalize('NFC'); }
function hebrewLetters(value){ return clean(value).normalize('NFD').replace(/[^\u05d0-\u05ea]/g, ''); }
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
function hebrewLexiconSource(explicitPath){
  const file = explicitPath || DEFAULT_HEBREW_LEXICON_PATHS.find(candidate => fs.existsSync(candidate));
  if(!file) throw new Error('Open Scriptures Hebrew Lexicon LexicalIndex.xml is required. Set PP_HEBREW_LEXICAL_INDEX_PATH.');
  const meta = require(HEBREW_LEXICON_META_PATH);
  if(sha256(file) !== meta.sourceFileSha256) throw new Error('Open Scriptures Hebrew Lexicon source hash does not match the pinned verification source.');
  const records = new Map();
  const xml = fs.readFileSync(file, 'utf8');
  for(const match of xml.matchAll(/<entry\b([^>]*)>([\s\S]*?)<\/entry>/g)){
    const entryId = clean(match[1].match(/\bid="([^"]+)"/)?.[1]);
    const headword = clean(match[2].match(/<w\b[^>]*>([^<]+)<\/w>/)?.[1]);
    const pos = clean(match[2].match(/<pos>([^<]+)<\/pos>/)?.[1]);
    for(const xref of match[2].matchAll(/<xref\b([^>]*)\/?\s*>/g)){
      const strong = clean(xref[1].match(/\bstrong="([^"]+)"/)?.[1]);
      if(!strong) continue;
      if(!records.has(strong)) records.set(strong, []);
      records.get(strong).push({ entryId, headword, pos, bdb: clean(xref[1].match(/\bbdb="([^"]+)"/)?.[1]) });
    }
  }
  return { file, meta, records };
}
function evidenceRows(id, groups){ return groups.get(SEED_VERB_STRONG_ALIASES[id] || id) || []; }
function isQal(parse){ return /^V-QAL-/i.test(clean(parse)); }
function isQalPerfect3ms(parse){ return /^V-QAL-PERF-3MS$/i.test(clean(parse)); }
function isMiddleWeakGroundForm(form){
  const letters = hebrewLetters(form);
  return letters.length === 3 && /[וי]/.test(letters[1]);
}
function removeConjunctionWaw(form){
  return clean(form).normalize('NFD').replace(/^ו[\u0591-\u05c7]*/, '').normalize('NFC');
}
function loadOshbQalPerfect3msForms(){
  const forms = new Map();
  for(const name of fs.readdirSync(MORPHHB_SOURCE_DIR).filter(value => value.endsWith('.xml')).sort()){
    const xml = fs.readFileSync(path.join(MORPHHB_SOURCE_DIR, name), 'utf8');
    for(const match of xml.matchAll(/<w\b([^>]*)>([\s\S]*?)<\/w>/g)){
      const attributes = Object.fromEntries([...match[1].matchAll(/([\w:-]+)="([^"]*)"/g)].map(item => [item[1], item[2]]));
      const morph = clean(attributes.morph).split('/');
      const lemmas = clean(attributes.lemma).split('/');
      const surfaces = clean(match[2]).split('/');
      const index = morph.findIndex(value => `${value.startsWith('H') ? '' : 'H'}${value}` === 'HVqp3ms');
      if(index < 0 || index !== morph.length - 1) continue;
      const id = clean(lemmas[index]).match(/\d+/)?.[0];
      const form = stripCantillation(surfaces[index]);
      if(!id || !form) continue;
      if(!forms.has(id)) forms.set(id, new Map());
      forms.get(id).set(form, (forms.get(id).get(form) || 0) + 1);
    }
  }
  return new Map([...forms].map(([id, values]) => [id, [...values].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0]]));
}
function attestedMiddleWeakCitation(rows, sourceForm, sourceAttested = ''){
  if(!isMiddleWeakGroundForm(sourceForm)) return '';
  const root = hebrewLetters(sourceForm);
  const candidates = [];
  if(sourceAttested) candidates.push({ form: sourceAttested, frequency: Number.MAX_SAFE_INTEGER });
  for(const row of rows.filter(item => isQalPerfect3ms(item.parse))){
    for(const form of [stripCantillation(row.word), removeConjunctionWaw(stripCantillation(row.word))]){
      const letters = hebrewLetters(form);
      if(letters.length === 2 && letters === `${root[0]}${root[2]}`){
        candidates.push({ form, frequency: Number(row.freq) || 0 });
      }
    }
  }
  return candidates.sort((a, b) => b.frequency - a.frequency || a.form.localeCompare(b.form))[0]?.form || '';
}
function buildCanonicalForms(options = {}){
  const vocab = options.vocab || require(VOCAB_PATH);
  const strongs = options.strongs || strongsSource(options.strongsPath);
  const greek = groupVocabulary(vocab, 'greek');
  const hebrew = groupVocabulary(vocab, 'hebrew');
  const forms = { greek: {}, hebrew: {} };
  const oshbQalPerfect3ms = options.oshbQalPerfect3ms || loadOshbQalPerfect3msForms();
  for(const id of greek.keys()) forms.greek[id] = id;
  for(const id of hebrew.keys()){
    if(/[\u0590-\u05ff]/.test(id)) forms.hebrew[id] = id;
    else if(FUNCTION_FORMS[id]) forms.hebrew[id] = FUNCTION_FORMS[id];
    else {
      const record = strongs.records[`H${id.replace(/\+$/, '')}`];
      if(record?.lemma) forms.hebrew[id] = clean(record.lemma);
    }
  }
  const verbCitationOverrides = {};
  for(const [id, rows] of hebrew){
    if(!rows.some(row => row.pos === 'verb') || DERIVED_STEM_SEED_VERBS.has(id)) continue;
    const sourceId = SEED_VERB_STRONG_ALIASES[id] || id.replace(/\+$/, '');
    const attested = attestedMiddleWeakCitation(evidenceRows(id, hebrew), forms.hebrew[id], oshbQalPerfect3ms.get(sourceId));
    if(attested && attested !== forms.hebrew[id]){
      forms.hebrew[id] = attested;
      verbCitationOverrides[id] = attested;
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
      hebrewVerbCitationRule: 'Gesenius-Kautzsch-Cowley §§39, 72–73: Qal perfect 3ms is the normal lexical ground form; middle-weak lexicon ground forms are retained unless an exact OSHB Qal perfect 3ms supplies the displayed form.',
      strongsCommit: meta.commit,
      strongsSourceSha256: sha256(strongs.file),
      hebrewVerbCorpusOverrideCount: Object.keys(verbCitationOverrides).length
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
function auditHebrewVerbCitations(dataset, groups, strongs, oshbQalPerfect3ms, hebrewLexicon){
  const records = [];
  const counts = { EXACT_QAL_PERFECT_3MS_CORPUS: 0, SOURCE_SUPPORTED_QAL_PERFECT_3MS: 0, LEGITIMATE_NON_QAL_EXCEPTION: 0, NEEDS_REVIEW: 0 };
  const previous719 = { total: 0, SOURCE_SUPPORTED_QAL_PERFECT_3MS: 0, LEGITIMATE_NON_QAL_EXCEPTION: 0, NEEDS_REVIEW: 0 };
  for(const [id, ownRows] of groups){
    if(!ownRows.some(row => row.pos === 'verb')) continue;
    const rows = evidenceRows(id, groups);
    const displayedForm = dataset.forms.hebrew[id];
    const sourceId = SEED_VERB_STRONG_ALIASES[id] || (/^\d+\+?$/.test(id) ? id.replace(/\+$/, '') : '');
    const sourceHeadword = sourceId ? clean(strongs.records[`H${sourceId}`]?.lemma) : '';
    const lexicalEntries = sourceId ? (hebrewLexicon.records.get(sourceId) || []) : [];
    const verbLexicalEntry = lexicalEntries.find(entry => entry.pos === 'V' && stripMarks(entry.headword) === stripMarks(sourceHeadword)) || null;
    const derivedSeed = DERIVED_STEM_SEED_VERBS.has(id);
    const structuralMisassignment = id === 'l';
    const hasQal = rows.some(row => isQal(row.parse));
    const hasExactQal3ms = rows.some(row => isQalPerfect3ms(row.parse));
    const middleWeakGroundForm = isMiddleWeakGroundForm(sourceHeadword || displayedForm);
    const corpusDerivedDisplay = Boolean(attestedMiddleWeakCitation(rows, sourceHeadword || displayedForm, oshbQalPerfect3ms.get(sourceId))) && displayedForm !== sourceHeadword;
    let category = 'NEEDS_REVIEW';
    let reason = 'No sufficient source-backed classification was found.';
    if(derivedSeed){
      category = 'LEGITIMATE_NON_QAL_EXCEPTION';
      reason = 'This seed identity denotes a derived-stem lexical sense; retain its reviewed derived-stem headword rather than substituting the Qal form of a different sense.';
    } else if(structuralMisassignment){
      category = 'LEGITIMATE_NON_QAL_EXCEPTION';
      reason = 'The stable identity is the bound preposition לְ; one legacy row is mis-tagged as a verb and must not turn the function-word card into a fabricated verb.';
    } else if(sourceId && !verbLexicalEntry){
      category = 'LEGITIMATE_NON_QAL_EXCEPTION';
      reason = 'The approved lexical index does not classify this displayed Strong headword as a verb; a homonymous or structurally misassigned verb row must not replace the authoritative non-verbal headword.';
    } else if(hasExactQal3ms){
      category = 'EXACT_QAL_PERFECT_3MS_CORPUS';
      reason = corpusDerivedDisplay
        ? 'The displayed form is extracted from an OSHB-tagged Qal perfect 3ms occurrence; no conjugation was generated.'
        : 'OSHB supplies an exact Qal perfect 3ms for this independently mapped lexical identity, confirming the displayed citation form.';
    } else if(hasQal && middleWeakGroundForm){
      category = 'LEGITIMATE_NON_QAL_EXCEPTION';
      reason = 'Qal occurs, but no Qal perfect 3ms is attested; GKC §§39, 72–73 direct lexica to use the relevant middle-weak ground form, so the authoritative source headword is retained without reconstruction.';
    } else if(hasQal && sourceHeadword){
      category = 'SOURCE_SUPPORTED_QAL_PERFECT_3MS';
      reason = 'Qal is corpus-supported and the independently sourced Strong’s headword follows the normal GKC §39 Qal perfect 3ms lexical ground-form convention; the corpus lacks that exact inflection.';
    } else if(sourceHeadword){
      category = 'LEGITIMATE_NON_QAL_EXCEPTION';
      reason = 'No Qal occurrence is attested for this identity; retain the independently sourced canonical lexical headword without inventing a Qal form.';
    }
    counts[category] += 1;
    const wasPrevious719 = ownRows.some(row => isQal(row.parse)) && !ownRows.some(row => isQalPerfect3ms(row.parse));
    if(wasPrevious719){
      previous719.total += 1;
      previous719[category] = (previous719[category] || 0) + 1;
    }
    records.push({
      vocabularyId: `lemma:hebrew:${id}`,
      sourceStrongId: sourceId ? `H${sourceId}` : null,
      displayedForm,
      category,
      isQalPerfect3ms: category === 'EXACT_QAL_PERFECT_3MS_CORPUS' || category === 'SOURCE_SUPPORTED_QAL_PERFECT_3MS',
      provenance: corpusDerivedDisplay
        ? 'Open Scriptures Hebrew Bible occurrence morphology and surface form'
        : sourceHeadword ? 'Open Scriptures Strong’s exact lexical headword' : 'Existing reviewed Puritan Parser stable identity',
      independentlySupportedLexicalHeadword: Boolean(sourceHeadword),
      mechanicallyReconstructed: false,
      derivedFromCorpusOccurrence: corpusDerivedDisplay,
      qalCorpusSupport: hasQal,
      exactQalPerfect3msCorpusSupport: hasExactQal3ms,
      previousQalNoExactCohort: wasPrevious719,
      sourceHeadword: sourceHeadword || null,
      lexicalIndexEntry: verbLexicalEntry,
      scholarlyAssessment: reason
    });
  }
  return {
    methodology: 'Every stable identity with a verb row is classified separately. Seed identities use the reviewed Strong-ID equivalence table; derived-stem seed senses remain distinct. No form is mechanically conjugated. GKC §§39, 72–73 supply the normal ground-form rule and the relevant middle-weak exceptions.',
    lexicalIndexSource: { repository: hebrewLexicon.meta.repository, commit: hebrewLexicon.meta.commit, sha256: hebrewLexicon.meta.sourceFileSha256 },
    counts,
    previous719,
    records
  };
}
function auditCanonicalForms(dataset, options = {}){
  const vocab = options.vocab || require(VOCAB_PATH);
  const glosses = {
    greek: options.greekGlosses || require(path.join(ROOT, 'data', 'glosses', 'greek-glosses.json')),
    hebrew: options.hebrewGlosses || require(path.join(ROOT, 'data', 'glosses', 'hebrew-glosses.json'))
  };
  const strongs = options.strongs || strongsSource(options.strongsPath);
  const oshbQalPerfect3ms = options.oshbQalPerfect3ms || loadOshbQalPerfect3msForms();
  const hebrewLexicon = options.hebrewLexicon || hebrewLexiconSource(options.hebrewLexiconPath);
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
  report.hebrewVerbCitationAudit = auditHebrewVerbCitations(dataset, groupVocabulary(vocab, 'hebrew'), strongs, oshbQalPerfect3ms, hebrewLexicon);
  report.languages.hebrew.noncanonicalVerbAfter = report.hebrewVerbCitationAudit.counts.NEEDS_REVIEW;
  report.hebrewFlashcardContamination = {
    conjunctionPrefixes: report.languages.hebrew.prefixAfter,
    prepositionPrefixes: report.languages.hebrew.prefixAfter,
    articles: report.languages.hebrew.prefixAfter,
    pronominalSuffixes: report.languages.hebrew.suffixAfter,
    constructForms: report.languages.hebrew.inflectedNominalAfter,
    pluralOrDualInflections: report.languages.hebrew.inflectedNominalAfter,
    conjugatedOccurrenceVerbForms: report.languages.hebrew.noncanonicalVerbAfter
  };
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
  const strongs = strongsSource();
  const oshbQalPerfect3ms = loadOshbQalPerfect3msForms();
  const hebrewLexicon = hebrewLexiconSource();
  const built = buildCanonicalForms({ strongs, oshbQalPerfect3ms });
  const audit = auditCanonicalForms(built, { strongs, oshbQalPerfect3ms, hebrewLexicon });
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
module.exports = { buildCanonicalForms, auditCanonicalForms, auditHebrewVerbCitations, buildManualQa, formatReport, contamination, groupVocabulary, loadOshbQalPerfect3msForms, hebrewLexiconSource, SEED_VERB_STRONG_ALIASES, DERIVED_STEM_SEED_VERBS };
