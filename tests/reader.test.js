const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

global.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
global.escHtml = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
global.$ = () => null;
global.$$ = () => [];

function storageHarness(){
  const store = new Map();
  global.readStorageJson = (key, fallback = null) => store.has(key) ? JSON.parse(store.get(key)) : fallback;
  global.writeStorageJson = (key, value) => store.set(key, JSON.stringify(value));
  return store;
}

global.fetch = async filePath => {
  const resolved = path.join(process.cwd(), filePath);
  delete require.cache[require.resolve(resolved)];
  const data = require(resolved);
  return { ok: true, json: async () => structuredClone(data) };
};

const reader = require('../src/features/reader/index.js');

test('reader loads a Greek chapter from the chapter-file structure', async () => {
  const chapter = await reader.loadReaderChapter('greek', 'matthew', 1);
  assert.equal(chapter.bookName, 'Matthew');
  assert.equal(chapter.chapter, 1);
  assert.match(reader.renderReaderChapter(chapter), /Βίβλος γενέσεως/);
});

test('book navigation crosses from Matthew to Mark', async () => {
  await reader.setReaderLocation({ language: 'greek', book: 'matthew', chapter: 2 });
  assert.deepEqual(reader.getAdjacentReaderLocation(1), { language: 'greek', book: 'mark', chapter: 1 });
});

test('chapter navigation moves previous and next within a book', async () => {
  await reader.setReaderLocation({ language: 'greek', book: 'matthew', chapter: 1 });
  assert.equal(reader.getAdjacentReaderLocation(1).chapter, 2);
  await reader.setReaderLocation({ language: 'greek', book: 'matthew', chapter: 2 });
  assert.equal(reader.getAdjacentReaderLocation(-1).chapter, 1);
});

test('last reader location persists', () => {
  storageHarness();
  reader.saveReaderLocation({ language: 'greek', book: 'mark', chapter: 1 });
  assert.deepEqual(reader.loadReaderLocation(), { language: 'greek', book: 'mark', chapter: 1 });
});

test('search supports lemma, surface text, and verse references', async () => {
  let html = '';
  const resultBox = { set innerHTML(value){ html = value; }, get innerHTML(){ return html; } };
  global.$ = selector => selector === '#readerSearchResults' ? resultBox : null;
  global.$$ = () => [];
  const lemmaResults = await reader.runReaderSearch('γεννάω');
  assert.ok(lemmaResults.some(item => item.book === 'matthew' && item.chapter === 1 && item.verse === 2));
  const surfaceResults = await reader.runReaderSearch('εὐαγγελίου');
  assert.ok(surfaceResults.some(item => item.book === 'mark' && item.chapter === 1));
  assert.deepEqual(reader.parseReaderReference('Matthew 1:18'), { language: 'greek', book: 'matthew', chapter: 1, verse: '18' });
});

test('chapter data lazy loads only requested chapters and uses cache', async () => {
  reader.readerChapterCache.clear();
  for(const key of Object.keys(reader.readerLoadCounts)) delete reader.readerLoadCounts[key];
  await reader.loadReaderChapter('greek', 'matthew', 1);
  await reader.loadReaderChapter('greek', 'matthew', 1);
  assert.equal(reader.readerLoadCounts['greek/matthew/1'], 1);
  assert.equal(reader.readerLoadCounts['greek/matthew/2'] || 0, 0);
});
