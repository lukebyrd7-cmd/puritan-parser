const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function loadBuildHelpers() {
  const source = fs.readFileSync('scripts/build-expanded-vocab.js', 'utf8').replace(/\nmain\(\);\s*$/, '\nmodule.exports = { mergeWithExisting, createGlossFields };\n');
  const context = { require, module: { exports: {} }, exports: {}, __dirname: `${process.cwd()}/scripts`, console };
  vm.createContext(context);
  vm.runInContext(source, context);
  return context.module.exports;
}

test('Hebrew rebuild merge preserves primary, alternate, and source gloss fields', () => {
  const { mergeWithExisting } = loadBuildHelpers();
  const expanded = [{ word: 'דבר', lemma: 'דבר', gloss: '', pos: 'noun', freq: 1, lang: 'hebrew', parse: 'N-MSA', source: 'Open Scriptures Hebrew Bible' }];
  const existing = [{ word: 'דבר', lemma: 'דבר', gloss: 'word, matter, thing', primaryGloss: 'word', alternateGlosses: ['matter', 'thing'], lang: 'hebrew', parse: 'N-MSA', glossSource: 'Puritan Parser seed vocabulary', glossLicense: 'Project seed data', glossAttribution: 'Puritan Parser' }];
  const [merged] = mergeWithExisting(expanded, existing);
  assert.equal(merged.primaryGloss, 'word');
  assert.deepEqual(merged.alternateGlosses, ['matter', 'thing']);
  assert.equal(merged.glossSource, 'Puritan Parser seed vocabulary');
});
