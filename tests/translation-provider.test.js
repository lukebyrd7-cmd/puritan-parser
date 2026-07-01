const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const providerApi = require('../src/core/translations/translation-provider');
const oebImport = require('../scripts/generate-oeb-translation-data');

global.fetch = async filePath => {
  const resolved = path.join(process.cwd(), filePath);
  const data = JSON.parse(fs.readFileSync(resolved, 'utf8'));
  return { ok: true, json: async () => structuredClone(data) };
};

test('OEB manifest validates generated chapter files and verse mapping', () => {
  const manifest = providerApi.normalizeTranslationManifest(JSON.parse(fs.readFileSync('data/translations/oeb/manifest.json', 'utf8')));
  assert.equal(manifest.id, 'oeb');
  assert.equal(manifest.default, true);
  assert.equal(manifest.license, 'CC0-1.0');
  assert.ok(manifest.books.length >= 59);

  for (const book of manifest.books) {
    for (const chapter of book.chapters) {
      const filePath = `data/translations/oeb/books/${book.id}/${chapter}.json`;
      assert.ok(fs.existsSync(filePath), `${filePath} exists`);
      const data = providerApi.normalizeTranslationChapter(JSON.parse(fs.readFileSync(filePath, 'utf8')));
      assert.equal(data.book, book.id);
      assert.equal(data.chapter, chapter);
      assert.ok(data.verses.length > 0, `${filePath} has verses`);
      const verseNumbers = data.verses.map(verse => verse.verse);
      assert.equal(new Set(verseNumbers).size, verseNumbers.length, `${filePath} has unique verse numbers`);
    }
  }
});

test('translation provider lazy-loads a single OEB chapter', async () => {
  const paths = [];
  const provider = providerApi.createTranslationProvider('oeb', {
    fetchJson: async filePath => {
      paths.push(filePath);
      return JSON.parse(fs.readFileSync(path.join(process.cwd(), filePath), 'utf8'));
    }
  });
  const chapter = await provider.loadChapter('john', 1, { force: true });
  assert.equal(chapter.book, 'john');
  assert.equal(chapter.chapter, 1);
  assert.match(providerApi.translationVerseText(chapter, 1), /In the beginning the Word was/);
  assert.deepEqual(paths, ['data/translations/oeb/manifest.json', 'data/translations/oeb/books/john/1.json']);
});

test('OEB importer merges repeated verse continuations and strips USFM markup', () => {
  const parsed = oebImport.parseUsfmBook({
    name: '43-John.usfm',
    content: String.raw`\id JHN
\c 1
\p
\v 1 In the \nd beginning\nd* was the Word.
\v 1 And the Word was with God.\f + \fr 1:1\ft note text\f*
\v 2 He was in the beginning with God.`
  });
  assert.equal(parsed.id, 'john');
  assert.deepEqual(parsed.chapters.get(1), [
    { verse: 1, text: 'In the beginning was the Word. And the Word was with God.' },
    { verse: 2, text: 'He was in the beginning with God.' }
  ]);
  assert.deepEqual(oebImport.validateBook(parsed), []);
});

test('service worker precaches translation provider and OEB manifest while JSON remains runtime cached', () => {
  const sw = fs.readFileSync('sw.js', 'utf8');
  assert.match(sw, /puritan-parser-v27-oeb-translation/);
  assert.match(sw, /\.\/src\/core\/translations\/translation-provider\.js/);
  assert.match(sw, /\.\/data\/translations\/oeb\/manifest\.json/);
  assert.match(sw, /url\.pathname\.endsWith\('\.json'\)/);
  assert.match(sw, /cache\.put\(evt\.request, copy\)/);
});
