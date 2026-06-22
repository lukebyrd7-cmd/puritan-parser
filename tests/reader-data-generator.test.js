const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const generator = require('../scripts/generate-reader-data.js');
const audit = require('../scripts/audit-reader-data.js');

function tempDir() { return fs.mkdtempSync(path.join(os.tmpdir(), 'reader-data-')); }
function writeMorphGnt(root) {
  const dir = path.join(root, 'source', 'morphgnt-sblgnt');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, '61-Mt-morphgnt.txt'), [
    '010101 N- ----NSF- Βίβλος βίβλος βίβλος',
    '010101 N- ----GSF- γενέσεως γένεσις γένεσις',
    '010102 N- ----GSM- Ἀβραὰμ Ἀβραάμ Ἀβραάμ',
    '010201 N- ----GSM- Ἰησοῦ Ἰησοῦς Ἰησοῦς'
  ].join('\n'));
}

test('generator transforms MorphGNT source into reader chapter schema', () => {
  const root = tempDir();
  writeMorphGnt(root);
  const outputRoot = path.join(root, 'greek');
  const result = generator.generateReaderData({ sourceRoot: path.join(root, 'source'), outputRoot, books: ['matthew'] });
  assert.equal(result.source, 'MorphGNT SBLGNT');
  assert.equal(result.chapters, 2);
  const chapter = JSON.parse(fs.readFileSync(path.join(outputRoot, 'matthew', '1.json'), 'utf8'));
  assert.equal(chapter.book, 'matthew');
  assert.equal(chapter.chapter, 1);
  assert.deepEqual(Object.keys(chapter.verses[0]).sort(), ['text', 'tokens', 'verse']);
  const manifest = JSON.parse(fs.readFileSync(path.join(outputRoot, 'manifest.json'), 'utf8'));
  assert.deepEqual(manifest.books, [{ id: 'matthew', name: 'Matthew', chapters: [1, 2] }]);
  assert.equal(chapter.verses[0].text, 'Βίβλος γενέσεως');
  assert.deepEqual(chapter.verses[0].tokens[0], { surface: 'Βίβλος', lemma: 'βίβλος', parse: 'N- ----NSF-' });
});

test('generator writes search index entries with surface forms, lemmas, and references', () => {
  const root = tempDir();
  writeMorphGnt(root);
  const outputRoot = path.join(root, 'greek');
  generator.generateReaderData({ sourceRoot: path.join(root, 'source'), outputRoot, books: ['matthew'] });
  const index = JSON.parse(fs.readFileSync(path.join(outputRoot, 'search-index.json'), 'utf8'));
  assert.equal(index[0].book, 'matthew');
  assert.equal(index[0].chapter, 1);
  assert.equal(index[0].verse, 1);
  assert.deepEqual(index[0].surface, ['Βίβλος', 'γενέσεως']);
  assert.deepEqual(index[0].lemmas, ['βίβλος', 'γένεσις']);
});

test('audit reports books, chapters, verse counts, and missing verses', () => {
  const root = tempDir();
  fs.mkdirSync(path.join(root, 'greek', 'matthew'), { recursive: true });
  fs.writeFileSync(path.join(root, 'greek', 'matthew', '1.json'), JSON.stringify({ book: 'matthew', chapter: 1, verses: [
    { verse: 1, text: 'one' },
    { verse: 3, text: 'three' }
  ] }));
  const report = audit.auditReaderData({ dataRoot: path.join(root, 'greek'), expected: { matthew: { chapters: 2 } } });
  assert.deepEqual(report.books.map(b => b.book), ['matthew']);
  assert.equal(report.books[0].chapters[0].verseCount, 2);
  assert.deepEqual(report.missingChapters, [{ book: 'matthew', chapter: 2 }]);
  assert.deepEqual(report.missingVerses, [{ book: 'matthew', chapter: 1, verse: 2 }]);
  const output = audit.formatAuditReport(report);
  assert.match(output, /Books present: matthew/);
  assert.match(output, /Missing verses: matthew 1:2/);
});
