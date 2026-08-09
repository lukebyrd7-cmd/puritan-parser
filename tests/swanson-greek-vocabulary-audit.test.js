const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const audit = require('../audits/v1.9.2-greek-vocabulary-audit.json');
const corrections = require('../data/glosses/corrections.json');
const greekGlosses = require('../data/glosses/greek-glosses.json');
const GlossModel = require('../src/models/gloss');
const StudyEntries = require('../src/core/study-entries');
const LearningPractice = require('../src/core/learning-practice');
const VocabularyLearning = require('../src/models/vocabulary-learning');
global.GlossModel = GlossModel;
global.escHtml = value => String(value || '').replace(/[&<>]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[character]));
const Reader = require('../src/features/reader/index');
const {
  EXPECTED_SWANSON_ENTRIES, MAPPING_STATUSES, GLOSS_STATUSES,
  parseSwanson, validateAudit
} = require('../scripts/swanson-greek-vocabulary-audit');

const sourcePath = process.env.SWANSON_AUDIT_SOURCE || path.join(os.homedir(), 'Downloads', 'James Swanson, Dictionary of Biblical Languages with Semantic Domains.txt');

test('local Swanson parser extracts identity metadata while keeping definitions audit-local', () => {
  const entries = parseSwanson('1 ἀγαπάω (agapaō): vb.; ≡ Str 25—1. love (Jn 1:1)\n2 Ἀαρών (Aarōn), ὁ (ho): n.pr.masc.; ≡ Str 2—Aaron\n');
  assert.equal(entries.length, 2);
  assert.equal(entries[0].lemma, 'ἀγαπάω');
  assert.deepEqual(entries[0].strong, [25]);
  assert.equal(entries[0].pos, 'verb');
  assert.equal(entries[1].properName, true);
});

test('the private source parses every numbered entry and the committed audit is structurally complete', { skip: !fs.existsSync(sourcePath) }, () => {
  assert.equal(parseSwanson(fs.readFileSync(sourcePath, 'utf8')).length, EXPECTED_SWANSON_ENTRIES);
  assert.deepEqual(validateAudit(audit), []);
});

test('every PP and Swanson record has an explicit mapping status without raw definitions', () => {
  assert.equal(audit.ppEntries.length, 5478);
  assert.equal(audit.swansonEntries.length, EXPECTED_SWANSON_ENTRIES);
  for(const entry of audit.ppEntries){
    assert.ok(MAPPING_STATUSES.has(entry.mappingStatus), entry.vocabularyId);
    assert.ok(GLOSS_STATUSES.has(entry.glossStatus), entry.vocabularyId);
    assert.equal(Object.hasOwn(entry, 'definition'), false);
  }
  for(const entry of audit.swansonEntries){
    assert.ok(MAPPING_STATUSES.has(entry.mappingStatus), String(entry.swansonEntryNumber));
    assert.equal(Object.hasOwn(entry, 'definition'), false);
  }
});

test('high-frequency manual review and Greek-in-English review gates are complete', () => {
  const top = audit.ppEntries.slice().sort((a, b) => b.frequency - a.frequency).slice(0, 100);
  assert.ok(top.every(entry => entry.manualReviewCompleted));
  assert.ok(audit.ppEntries.filter(entry => entry.glossStatus === 'GREEK_IN_ENGLISH_FIELD').every(entry => entry.manualReviewCompleted));
  assert.equal(audit.summary.gloss.GREEK_IN_ENGLISH_FIELD, 3699);
  assert.equal(audit.summary.reader.affectedEnglishGlossTokens, 7896);
});

test('English-gloss validation rejects Greek, Hebrew, identifiers, and morphology while accepting ordinary English', () => {
  for(const value of ['λόγος', 'דָּבָר', 'lemma:greek:λόγος', 'gk-01234', 'Strong G3056', 'N-NSM']) assert.equal(GlossModel.isLearnerEnglishGloss(value), false, value);
  for(const value of ['word', 'take away', 'Jesus', 'you (sg.)', 'non-Greek']) assert.equal(GlossModel.isLearnerEnglishGloss(value), true, value);
});

test('all contaminated Greek standard fields resolve to an explicit unavailable state with no Greek fallback', () => {
  const contaminated = Object.entries(greekGlosses).filter(([, record]) => GlossModel.containsGreekScript(record.primaryGloss));
  assert.equal(contaminated.length, 3699);
  for(const [lemma, record] of contaminated){
    const resolved = GlossModel.resolveLexicalGloss({ lang: 'greek', lemma, ...record }, { missingLabel: 'Gloss unavailable' });
    assert.equal(resolved.standard.available, false, lemma);
    assert.equal(resolved.standard.compact, 'Gloss unavailable', lemma);
    assert.equal(GlossModel.containsGreekScript(resolved.standard.compact), false, lemma);
  }
});

test('all contaminated Greek identities are excluded at the shared practice eligibility boundary', () => {
  const vocab = require('../vocab_all.json').filter(entry => entry.lang === 'greek');
  const grouped = StudyEntries.getStudyEntries(vocab, 'lemma');
  const result = LearningPractice.filterStudyableEntries(grouped, 'greek', { model: VocabularyLearning });
  assert.equal(result.entries.length, 1779);
  assert.equal(result.diagnostics.reasons['missing-gloss'], 3699);
  assert.equal(result.entries.some(entry => GlossModel.containsGreekScript(entry.primaryGloss)), false);
});

test('contextual comparison suppresses redundant senses and retains genuinely different help', () => {
  assert.equal(GlossModel.contextualGlossAddsMeaning('love; show love', 'love'), false);
  assert.equal(GlossModel.contextualGlossAddsMeaning('take away; remove', 'Remove.'), false);
  assert.equal(GlossModel.contextualGlossAddsMeaning('family; clan', 'the families'), false);
  assert.equal(GlossModel.contextualGlossAddsMeaning('hand', 'power'), true);
  assert.equal(GlossModel.contextualGlossAddsMeaning('world; age', 'world system'), true);
});

test('Reader labels retained contextual help In this verse and hides redundant or malformed values', () => {
  assert.equal(Reader.readerContextualGloss({ primaryGloss: 'family', alternateGlosses: ['clan'], occurrenceGloss: 'family' }), '');
  assert.equal(Reader.readerContextualGloss({ primaryGloss: 'hand', occurrenceGloss: 'power' }), 'power');
  assert.equal(Reader.readerContextualGloss({ primaryGloss: 'word', occurrenceGloss: 'λόγος' }), '');
  const html = Reader.renderReaderWordOccurrence({ language: 'greek', surface: 'χεῖρα', primaryGloss: 'hand', occurrenceGloss: 'power', reference: 'Mark 1:1' });
  assert.match(html, /In this verse/);
  assert.doesNotMatch(html, /Contextual occurrence gloss/);
});

test('the Greek correction is stable-ID keyed, source guarded, and shared by canonical/personal resolution', () => {
  const correction = corrections.corrections.find(item => item.id === 'greek-airo-primary-remove');
  assert.ok(correction);
  assert.equal(correction.vocabularyId, 'lemma:greek:αἴρω');
  assert.doesNotMatch(correction.sourceReference, /Swanson/i);
  GlossModel.setGlossCorrections(corrections);
  const word = { lang: 'greek', lemma: 'αἴρω', ...greekGlosses['αἴρω'] };
  assert.deepEqual(GlossModel.resolveLexicalGloss(word).standard.all, ['remove', 'take up', 'lift']);
  assert.deepEqual(GlossModel.resolveLexicalGloss(word, { personal: { mode: 'add', glosses: ['my reminder'] } }).effective.all, ['remove', 'take up', 'lift', 'my reminder']);
  assert.deepEqual(GlossModel.resolveLexicalGloss(word, { personal: { mode: 'replace', glosses: ['my gloss'] } }).effective.all, ['my gloss']);
});

test('Word Page identity uses the corrected shared standard instead of the raw source ordering', () => {
  GlossModel.setGlossCorrections(corrections);
  const word = { language: 'greek', lang: 'greek', lemma: 'αἴρω', ...greekGlosses['αἴρω'] };
  const html = Reader.renderReaderWordIdentity(word);
  assert.match(html, /remove, take up, lift/);
  assert.doesNotMatch(html, /take up, lift, remove/);
});

test('Reader does not append legacy generated wording to an authoritative standard gloss', () => {
  const readerSource = fs.readFileSync(path.join(ROOT, 'src/features/reader/index.js'), 'utf8');
  assert.match(readerSource, /!sourceGloss\?\.primaryGloss && !vocabMatches\.some\(entry => entry\.primaryGloss\)/);
});

test('the runtime correction manifest is cache-busted with the startup asset version', () => {
  const loader = fs.readFileSync(path.join(ROOT, 'src/core/data-loader.js'), 'utf8');
  const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  assert.match(loader, /corrections\.json\$\{version\}/);
  assert.match(sw, /corrections\.json\?v=v1\.9\.2-greek-vocabulary-audit-8/);
});

test('Search, Learn, flashcards, Reader, Word Page, Custom Deck, and Needs attention retain the shared resolver path', () => {
  const files = ['src/features/global-search/index.js','src/features/learn/index.js','src/features/flashcards/index.js','src/features/reader/index.js','src/core/learning-practice.js','src/models/study-sets.js'];
  const text = files.map(file => fs.readFileSync(path.join(ROOT, file), 'utf8')).join('\n');
  assert.match(text, /getDisplayGloss|resolveLexicalGloss/);
  assert.match(fs.readFileSync(path.join(ROOT, 'src/features/reader/index.js'), 'utf8'), /readerGlossResolution/);
});

test('the Swanson transcription is not tracked and no raw dictionary definition field is distributed', () => {
  const tracked = execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' }).split(/\r?\n/).filter(Boolean);
  assert.equal(tracked.some(file => /James Swanson.*Dictionary of Biblical Languages/i.test(file)), false);
  assert.doesNotMatch(JSON.stringify(audit), /"definition"\s*:/);
  assert.equal(audit.source.definitionsDistributed, false);
});
