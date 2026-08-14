const test = require('node:test');
const assert = require('node:assert/strict');
const dataset = require('../data/lexical/canonical-forms.json');
const audit = require('../audits/v1.9.5-canonical-vocabulary-forms.json');
const manualQa = require('../audits/v1.9.5-canonical-vocabulary-manual-qa.json');
const CanonicalForms = require('../src/models/canonical-forms');
const StudyEntries = require('../src/core/study-entries');
const LearningPractice = require('../src/core/learning-practice');
const VocabularyLearning = require('../src/models/vocabulary-learning');
const ParserCore = require('../src/core/parser-core');
const vocab = require('../vocab_all.json');
const glosses = {
  greek: require('../data/glosses/greek-glosses.json'),
  hebrew: require('../data/glosses/hebrew-glosses.json')
};

CanonicalForms.setMap(dataset);

function rows(language, lemma){ return vocab.filter(entry => entry.lang === language && entry.lemma === lemma); }
function study(language, lemma){ return StudyEntries.groupEntriesByLemma(rows(language, lemma))[0]; }
function validated(language, lemma){
  return LearningPractice.validateVocabularyCard(study(language, lemma), language, { model: VocabularyLearning, glossMap: glosses[language] });
}

test('exhaustive canonical-form data covers every stable bilingual identity', () => {
  assert.equal(Object.keys(dataset.forms.hebrew).length, 9152);
  assert.equal(Object.keys(dataset.forms.greek).length, 5478);
  assert.equal(audit.languages.hebrew.unresolvedAfter, 0);
  assert.equal(audit.languages.greek.unresolvedAfter, 0);
  assert.equal(audit.languages.hebrew.prefixAfter, 0);
  assert.equal(audit.languages.hebrew.suffixAfter, 0);
  assert.equal(audit.languages.hebrew.inflectedNominalAfter, 0);
  assert.equal(audit.languages.hebrew.noncanonicalVerbAfter, 0);
  assert.equal(audit.languages.greek.noncanonicalVerbAfter, 0);
});

test('deterministic manual-QA strata are complete and contain no failed resolution', () => {
  for(const language of ['hebrew', 'greek']){
    assert.equal(manualQa.languages[language].sampled, 400);
    assert.equal(manualQa.languages[language].failures, 0);
    assert.deepEqual(Object.fromEntries(Object.entries(manualQa.languages[language].samples).map(([name, values]) => [name, values.length])), { verbs:100, nouns:100, adjectives:50, functionWords:50, rareOrHapax:50, properNames:50 });
  }
});

test('all Hebrew verb identities have an explicit source-backed citation classification', () => {
  const citation = audit.hebrewVerbCitationAudit;
  assert.equal(citation.records.length, 1603);
  assert.deepEqual(citation.counts, {
    EXACT_QAL_PERFECT_3MS_CORPUS: 475,
    SOURCE_SUPPORTED_QAL_PERFECT_3MS: 548,
    LEGITIMATE_NON_QAL_EXCEPTION: 580,
    NEEDS_REVIEW: 0
  });
  assert.deepEqual(citation.previous719, {
    total: 719,
    SOURCE_SUPPORTED_QAL_PERFECT_3MS: 547,
    LEGITIMATE_NON_QAL_EXCEPTION: 172,
    NEEDS_REVIEW: 0
  });
  assert.equal(citation.records.filter(item => item.mechanicallyReconstructed).length, 0);
  assert.equal(citation.records.filter(item => item.category === 'NEEDS_REVIEW').length, 0);
  assert.ok(citation.records.every(item => item.displayedForm && item.provenance && item.scholarlyAssessment));
});

test('attested middle-weak verbs use corpus Qal perfect 3ms without changing stable IDs', () => {
  const cases = [
    ['935', 'בָּא'], ['6965', 'קָם'], ['4191', 'מֵת'], ['7760', 'שָׂם'], ['7725', 'שָׁב'], ['4135', 'מָל'],
    ['בּוֹא', 'בָּא'], ['קוּם', 'קָם'], ['מוּת', 'מֵת'], ['שִׂים', 'שָׂם'], ['שׁוּב', 'שָׁב'], ['שׁוּר', 'שָׁר']
  ];
  for(const [lemma, expected] of cases){
    assert.equal(dataset.forms.hebrew[lemma], expected, lemma);
    assert.equal(VocabularyLearning.lemmaId(study('hebrew', lemma)), `lemma:hebrew:${lemma}`, lemma);
  }
  assert.equal(dataset.sources.hebrewVerbCorpusOverrideCount, 43);
});

test('Hebrew canonical cards ignore prefixed, suffixed, construct, plural, and conjugated representatives', () => {
  const cases = [
    ['559', 'אָמַר'],       // waw-prefixed verb and ordinary Qal verb
    ['935', 'בָּא'],        // attested hollow Qal perfect 3ms, not lexicon ground form בּוֹא
    ['7760', 'שָׂם'],       // attested hollow Qal perfect 3ms, not lexicon ground form שׂוּם
    ['1961', 'הָיָה'],      // weak verb
    ['2388', 'חָזַק'],      // derived-stem occurrences
    ['1697', 'דָּבָר'],      // article/conjunction/preposition-bearing noun forms
    ['1004', 'בַּיִת'],     // construct and suffixed noun forms
    ['1', 'אָב'],           // pronominal suffixes and plural forms
    ['2896', 'טוֹב'],       // inflected adjective
    ['1732', 'דָּוִד'],     // proper name
    ['853', 'אֵת'],         // homonym identity remains stable
    ['854', 'אֵת']
  ];
  for(const [lemma, expected] of cases){
    const entry = study('hebrew', lemma);
    assert.equal(CanonicalForms.resolve(entry), expected, lemma);
    const result = validated('hebrew', lemma);
    if(result.valid) assert.equal(result.entry.studyForm, expected, lemma);
  }
  for(const [lemma, expected] of [['וְ','וְ'], ['הַ','הַ'], ['בְּ','בְּ'], ['לְ','לְ'], ['k','כְּ'], ['מִן','מִן']]){
    assert.equal(CanonicalForms.resolve(study('hebrew', lemma)), expected, lemma);
  }
});

test('Hebrew card fronts contain no accidental occurrence morphology after citation resolution', () => {
  assert.equal(audit.languages.hebrew.prefixAfter, 0);
  assert.equal(audit.languages.hebrew.suffixAfter, 0);
  assert.equal(audit.languages.hebrew.inflectedNominalAfter, 0);
  assert.equal(audit.languages.hebrew.noncanonicalVerbAfter, 0);
  assert.equal(audit.hebrewVerbCitationAudit.records.filter(item => item.category === 'NEEDS_REVIEW').length, 0);
  assert.deepEqual(audit.hebrewFlashcardContamination, {
    conjunctionPrefixes: 0,
    prepositionPrefixes: 0,
    articles: 0,
    pronominalSuffixes: 0,
    constructForms: 0,
    pluralOrDualInflections: 0,
    conjugatedOccurrenceVerbForms: 0
  });
  assert.equal(audit.languages.greek.unresolvedAfter, 0);
});

test('Greek canonical cards resolve regular, irregular, nominal, participial, and function-word occurrences to lemmas', () => {
  for(const lemma of ['λέγω', 'ἔρχομαι', 'λόγος', 'ἀγαθός', 'ἐν', 'καί', 'ὁ', 'δέ']){
    const entry = study('greek', lemma);
    assert.equal(CanonicalForms.resolve(entry), lemma);
    const result = validated('greek', lemma);
    if(result.valid) assert.equal(result.entry.studyForm, lemma);
  }
  const lego = study('greek', 'λέγω');
  assert.ok(lego.forms.some(form => form !== 'λέγω'));
  assert.equal(CanonicalForms.resolve({ ...lego, representativeForm: 'εἶπεν', word: 'εἶπεν' }), 'λέγω');
});

test('surface-only and numeric records cannot become vocabulary card fronts', () => {
  const numeric = LearningPractice.validateVocabularyCard({ lang:'hebrew', lemma:'99999', word:'וַיִּכְתֹּב', primaryGloss:'write' }, 'hebrew', { model: VocabularyLearning });
  const surface = LearningPractice.validateVocabularyCard({ lang:'greek', lemma:'', word:'εἶπεν', primaryGloss:'say' }, 'greek', { model: VocabularyLearning });
  assert.equal(numeric.valid, false);
  assert.equal(numeric.reason, 'missing-study-form');
  assert.equal(surface.valid, false);
  assert.equal(surface.reason, 'missing-study-form');
});

test('learner-facing OSHB stem codes use centralized full names', () => {
  const expected = { q:'Qal', N:'Niphal', p:'Piel', P:'Pual', h:'Hiphil', H:'Hophal', t:'Hithpael', o:'Polel', O:'Polal', r:'Hithpolel', m:'Poel', M:'Poal', k:'Palel', K:'Pulal', Q:'Qal passive', l:'Pilpel', L:'Polpal', f:'Hithpalpel', D:'Nithpael', j:'Pealal', i:'Pilel', u:'Hothpaal', c:'Tiphil', v:'Hishtaphel', w:'Nithpalel', y:'Nithpoel', z:'Hithpoel' };
  for(const [code, label] of Object.entries(expected)) assert.equal(ParserCore.hebrewStemLabel(code), label, code);
  assert.equal(ParserCore.decodeParse('HVNp3ms', 'hebrew').details[0], 'Niphal');
  assert.notEqual(ParserCore.decodeParse('HVNp3ms', 'hebrew').details[0], 'N');
});

test('canonical display corrections preserve stable learning IDs', () => {
  const contaminated = { ...study('hebrew', '559'), word:'וַיֹּאמֶר', representativeForm:'וַיֹּאמֶר' };
  assert.equal(VocabularyLearning.lemmaId(contaminated), 'lemma:hebrew:559');
  assert.equal(CanonicalForms.resolve(contaminated), 'אָמַר');
});
