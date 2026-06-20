const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function loadFlashcardHelpers() {
  const context = {
    console,
    setTimeout,
    clearTimeout,
    ParserCore: require('../src/parser-core'),
    state: { lang: 'greek' },
    document: { querySelector: () => null, querySelectorAll: () => [] },
    window: {}
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('src/features/flashcards/index.js', 'utf8'), context);
  return context;
}

test('flashcard parse metadata uses decoded parsing summary instead of raw parse code', () => {
  const app = loadFlashcardHelpers();
  const label = vm.runInContext(`formatFlashcardParseMeta({ parse: 'V-AMI-3P', lang: 'greek' })`, app);

  assert.equal(label, 'Verb: aorist middle indicative, 3rd person plural');
  assert.notEqual(label, 'V-AMI-3P');
});
