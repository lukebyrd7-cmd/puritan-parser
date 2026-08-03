const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const GlossModel = require('../src/models/gloss');
const ParserCore = require('../src/parser-core');

function loadStorageContext() {
  const store = {};
  const context = {
    console,
    window: { PuritanParserCore: ParserCore },
    ParserCore,
    state: { prefs: { initialEase: 2.5 }, data: { greek: [{ id: 'g1', word: 'λόγος', gloss: 'word', primaryGloss: 'message' }], hebrew: [] } },
    StorageKeys: { vocab: { greek: 'pp_vocab_greek', hebrew: 'pp_vocab_hebrew' } },
    localStorage: { getItem: key => store[key] || null, setItem: (key, value) => { store[key] = value; } },
    todayISO: () => '2026-06-19'
  };
  vm.createContext(context);
  ['src/app-state.js', 'src/core/migrations/migrations.js', 'src/core/migrations/migration-runner.js', 'src/models/user-progress.js', 'src/core/storage/storage.js', 'src/core/storage/vocab-storage.js'].forEach(file => vm.runInContext(fs.readFileSync(file, 'utf8'), context));
  vm.runInContext("state.prefs = { initialEase: 2.5 }; state.data = { greek: [{ id: 'g1', word: 'λόγος', gloss: 'word', primaryGloss: 'message' }], hebrew: [] };", context);
  return { context, store };
}

test('getDisplayGloss uses custom, primary, legacy gloss, and missing fallback order', () => {
  assert.equal(GlossModel.getDisplayGloss({ customGloss: 'my reminder', primaryGloss: 'word', gloss: 'legacy' }), 'my reminder');
  assert.equal(GlossModel.getDisplayGloss({ primaryGloss: 'word', gloss: 'legacy' }), 'word');
  assert.equal(GlossModel.getDisplayGloss({ gloss: 'legacy' }), 'legacy');
  assert.equal(GlossModel.getDisplayGloss({}), '(missing gloss)');
});

test('customGloss overrides primaryGloss and clearing restores primary/app gloss', () => {
  const word = { lang: 'hebrew', primaryGloss: 'word', gloss: 'matter', customGloss: 'thing' };
  assert.equal(GlossModel.getDisplayGloss(word), 'thing');
  delete word.customGloss;
  assert.equal(GlossModel.getDisplayGloss(word), 'word');
  delete word.primaryGloss;
  assert.equal(GlossModel.getDisplayGloss(word), 'matter');
});

test('gloss search text includes primary, alternate, and custom glosses', () => {
  const word = { word: 'דָּבָר', lemma: 'דבר', lexicalForm: 'דָּבָר', primaryGloss: 'word', alternateGlosses: ['matter', 'thing'], gloss: 'legacy', customGloss: 'covenant speech' };
  const text = GlossModel.glossSearchText(word);
  assert.match(text, /דבר/);
  assert.match(text, /word/);
  assert.match(text, /thing/);
  assert.match(text, /covenant speech/);
});

test('export/import storage path preserves custom glosses as user progress', () => {
  const { context, store } = loadStorageContext();
  vm.runInContext("state.data.greek[0].customGloss = 'speech';", context);
  context.saveVocab('greek');
  assert.match(store.pp_vocab_greek, /speech/);
  vm.runInContext("state.data.greek[0].customGloss = '';", context);
  context.applyStoredVocab('greek');
  assert.equal(vm.runInContext("state.data.greek[0].customGloss", context), 'speech');
});

test('old data without primaryGloss still validates and displays legacy gloss', () => {
  const oldItem = { word: 'λόγος', gloss: 'word', lang: 'greek' };
  assert.equal(ParserCore.validateVocabItem(oldItem, 0).errors.length, 0);
  assert.equal(GlossModel.getDisplayGloss(oldItem), 'word');
});

test('lexical gloss presentation groups concise senses without rewriting source data', () => {
  const source = { primaryGloss: 'word, message', alternateGlosses: ['matter', 'message', 'account'] };
  const presented = GlossModel.presentLexicalGlosses(source, { primaryLimit: 3 });
  assert.equal(presented.primaryText, 'word; message; matter');
  assert.deepEqual(presented.additional, ['account']);
  assert.deepEqual(source.alternateGlosses, ['matter', 'message', 'account']);
  assert.equal(GlossModel.presentLexicalGlosses({}, { missingLabel: 'Gloss unavailable' }).primaryText, 'Gloss unavailable');
});
