const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function loadFlashcardHelpers(){
  const context = {
    console,
    window: { PuritanParserCore: require('../src/parser-core') },
    document: { querySelector: () => null, querySelectorAll: () => [] }
  };
  vm.createContext(context);
  ['src/app-state.js', 'src/features/flashcards/index.js'].forEach(file => {
    vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
  });
  return context;
}

test('flashcard parse metadata decodes compact Greek parse codes for students', () => {
  const app = loadFlashcardHelpers();
  assert.equal(
    app.formatFlashcardParseMeta({ parse: 'V-AMI-3P', lang: 'greek' }),
    'Verb: aorist middle indicative, 3rd person plural'
  );
  assert.notEqual(app.formatFlashcardParseMeta({ parse: 'V-AMI-3P', lang: 'greek' }), 'V-AMI-3P');
});
