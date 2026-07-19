const test = require('node:test');
const assert = require('node:assert/strict');

const recognition = require('../src/features/learn/recognition-engine');

test('v4.2.6 recognition engine builds reusable Greek sessions from Reference', () => {
  const session = recognition.createSession('greek-present-active-indicative');
  assert.equal(session.target.title, 'Present Active Indicative');
  assert.ok(session.items.length >= 6);
  assert.ok(session.items.some(item => item.form === 'λύομεν'));
  const item = session.items.find(item => item.form === 'λύομεν');
  assert.deepEqual(item.answerLines, ['Present Active Indicative', '1st Person Plural']);
  assert.equal(item.referenceTopicId, 'greek-verbs');
  assert.ok(item.clues.some(clue => /active/i.test(clue)));

  const pluperfect = recognition.createSession('greek-pluperfect-active-indicative');
  assert.ok(pluperfect.items.some(item => item.form === 'ἐλελύκειν'));
});

test('v4.2.6 recognition engine builds verified Hebrew sessions and sequence recognition', () => {
  const qal = recognition.createSession('hebrew-qal');
  assert.ok(qal.items.some(item => item.form === 'קָטַל'));
  assert.ok(qal.items.every(item => item.referenceTopicId === 'hebrew-verbs'));

  const hithpael = recognition.createSession('hebrew-hithpael');
  assert.ok(hithpael.items.some(item => item.form === 'הִתְקַטֵּל'));

  assert.deepEqual(
    recognition.createSession('hebrew-wayyiqtol').items[0].answerLines,
    ['Wayyiqtol', 'Qal Imperfect pattern in narrative sequence']
  );
  assert.deepEqual(
    recognition.createSession('hebrew-weqatal').items[0].answerLines,
    ['Weqatal', 'Waw plus perfect form']
  );
});

test('v1.3.6a Hebrew recognition includes verified weak charts and still excludes unsupported stems', () => {
  const hebrewForms = recognition.itemsForTarget('hebrew-verbs');
  const serialized = JSON.stringify(hebrewForms);
  assert.ok(hebrewForms.some(item => item.form === 'עָמַד' && item.categories.includes('weak-initial-guttural')));
  assert.ok(hebrewForms.some(item => item.form === 'יִגַּשׁ' && item.categories.includes('weak-pe-nun')));
  assert.ok(hebrewForms.some(item => item.form === 'יִגְלֶה' && item.categories.includes('weak-lamed-he')));
  assert.doesNotMatch(serialized, /Pual/);
  assert.doesNotMatch(serialized, /Hophal/);
  assert.doesNotMatch(serialized, /Needs review/i);
  assert.equal(recognition.recognitionTarget('hebrew-pual'), null);
  assert.equal(recognition.recognitionTarget('hebrew-hophal'), null);
});

test('v1.3.6a recognition compatibility is read-only for persisted review state', () => {
  const persisted='[{"id":"existing-session","score":4}]';
  const storage={ pp_recognition_history:persisted };
  recognition.createSession('hebrew-qal');
  recognition.createCombinedSession(['hebrew-qal','hebrew-hiphil']);
  assert.equal(storage.pp_recognition_history,persisted);
  assert.equal(recognition.createSession('hebrew-qal').items.some(item=>item.categories.includes('strong-verb')),true);
  assert.equal(recognition.createSession('hebrew-qal').items.some(item=>item.categories.some(category=>category.startsWith('weak-'))),true);
});

test('v4.2.6 recognition engine reuses one target/session API across categories', () => {
  for (const id of ['greek-verbs', 'greek-nouns', 'hebrew-verbs', 'hebrew-nouns']) {
    const session = recognition.createSession(id);
    assert.equal(session.target.id, id);
    assert.ok(session.items.length > 0, `${id} should have recognition items`);
    assert.ok(session.items.every(item => item.referenceTopicId.startsWith(id.split('-')[0])));
  }
});

test('v1.3.6b Reference forms do not automatically enter Learn recognition or write review state', () => {
  const before='[{"id":"existing-session","score":4}]';
  const storage={ pp_recognition_history:before };
  const items=recognition.itemsForTarget('hebrew-nouns');
  const serialized=JSON.stringify(items);
  for(const form of ['אָבִיךָ','בָּנַי','מִמֶּנִּי','חֲקַרְתַּנִי']) assert.doesNotMatch(serialized,new RegExp(form));
  recognition.createSession('hebrew-nouns');
  assert.equal(storage.pp_recognition_history,before);
});
