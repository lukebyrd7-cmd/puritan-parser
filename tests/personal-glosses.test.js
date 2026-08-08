const test = require('node:test');
const assert = require('node:assert/strict');

global.GlossModel = require('../src/models/gloss');
const PersonalGlosses = require('../src/models/personal-glosses');

function memory(){
  const values = new Map();
  return { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key), values };
}
const greek = { id: 'lemma:greek:λόγος', lang: 'greek', lemma: 'λόγος', primaryGloss: 'word', alternateGlosses: ['message'] };
const hebrew = { id: 'lemma:hebrew:1697', lang: 'hebrew', lemma: '1697', primaryGloss: 'word', alternateGlosses: ['matter'] };

test('personal gloss modes resolve without mutating standard data', () => {
  const standard = GlossModel.resolveLexicalGloss(greek, { personal: null });
  const additive = GlossModel.resolveLexicalGloss(greek, { personal: { mode: 'add', glosses: ['speech', 'Word'] } });
  const replacement = GlossModel.resolveLexicalGloss(greek, { personal: { mode: 'replace', glosses: ['speech'] } });
  assert.deepEqual(standard.effective.all, ['word', 'message']);
  assert.deepEqual(additive.effective.all, ['word', 'message', 'speech']);
  assert.deepEqual(replacement.effective.all, ['speech']);
  assert.equal(greek.primaryGloss, 'word');
});

test('source-controlled corrections apply centrally only when the expected source matches', () => {
  GlossModel.setGlossCorrections({ corrections: [{ id: 'test', vocabularyId: greek.id, expectedSourceValue: 'word; message', correctedPrimary: ['word'], correctedAdditional: ['account'] }] });
  const corrected = GlossModel.resolveLexicalGloss(greek);
  assert.deepEqual(corrected.standard.all, ['word', 'account']);
  assert.equal(corrected.correction.valid, true);
  GlossModel.setGlossCorrections({ corrections: [{ id: 'bad', vocabularyId: greek.id, expectedSourceValue: 'changed upstream', correctedPrimary: ['speech'] }] });
  const rejected = GlossModel.resolveLexicalGloss(greek);
  assert.deepEqual(rejected.standard.all, ['word', 'message']);
  assert.equal(rejected.correction.valid, false);
  GlossModel.setGlossCorrections({ corrections: [] });
});

test('personal records are versioned, language-specific, removable, and reject empty replacement', () => {
  const adapter = memory();
  const saved = PersonalGlosses.setRecord(greek, { mode: 'add', glosses: 'speech; Speech; discourse' }, adapter);
  assert.deepEqual(saved.glosses, ['speech', 'discourse']);
  assert.equal(saved.revision, 1);
  PersonalGlosses.setRecord(hebrew, { mode: 'replace', glosses: 'utterance' }, adapter);
  assert.equal(Object.keys(PersonalGlosses.loadStore(adapter).records).length, 2);
  assert.throws(() => PersonalGlosses.setRecord(greek, { mode: 'replace', glosses: ' ; ' }, adapter), /requires at least one gloss/);
  PersonalGlosses.restore(greek, adapter);
  assert.equal(PersonalGlosses.recordFor(greek, PersonalGlosses.loadStore(adapter)), null);
  assert.ok(PersonalGlosses.recordFor(hebrew, PersonalGlosses.loadStore(adapter)));
});

test('personal gloss export/import preserves unknown stable IDs as orphans', () => {
  const source = memory(); const target = memory();
  PersonalGlosses.setRecord(greek, { mode: 'add', glosses: 'speech' }, source);
  PersonalGlosses.setRecord(hebrew, { mode: 'replace', glosses: 'utterance' }, source);
  const imported = PersonalGlosses.importState(PersonalGlosses.exportState(source), { knownIds: new Set([greek.id]) }, target);
  assert.ok(imported.records[greek.id]);
  assert.ok(imported.orphans[hebrew.id]);
  assert.equal(imported.schemaVersion, 1);
});

test('normalizing old or malformed personal payloads is idempotent', () => {
  const once = PersonalGlosses.normalizeStore({ records: { [greek.id]: { language: 'greek', mode: 'replace', glosses: [] } } });
  const twice = PersonalGlosses.normalizeStore(once);
  assert.deepEqual(twice, once);
  assert.equal(twice.records[greek.id].mode, 'standard');
});
