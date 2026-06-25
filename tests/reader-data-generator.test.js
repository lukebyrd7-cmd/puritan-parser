const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const generator = require('../scripts/generate-reader-data.js');
const hebrewGenerator = require('../scripts/generate-hebrew-reader-data.js');
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

function writeOshbJonah(root) {
  const dir = path.join(root, 'source', 'morphhb-wlc');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'Jonah.xml'), [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<osis>',
    '  <osisText xml:lang="he" osisIDWork="OSHB">',
    '    <div type="book" osisID="Jonah">',
    '      <chapter osisID="Jonah.1">',
    '        <verse osisID="Jonah.1.1">',
    '          <w lemma="c/1961" n="0.1.0" morph="HC/Vqw3ms" id="j1">וַֽ/יְהִי֙</w>',
    '          <w lemma="1697" morph="HNcmsc" id="j2">דְּבַר</w><seg type="x-maqqef">־</seg><w lemma="3068" n="0.1" morph="HNp" id="j3">יְהוָ֔ה</w>',
    '          <w lemma="413" morph="HR" id="j4">אֶל</w><seg type="x-maqqef">־</seg><w lemma="3124" morph="HNp" id="j5">יוֹנָ֥ה</w>',
    '          <w lemma="l/559" n="0" morph="HR/Vqc" id="j6">לֵ/אמֹֽר</w><seg type="x-sof-pasuq">׃</seg>',
    '        </verse>',
    '        <verse osisID="Jonah.1.2">',
    '          <w lemma="6965 b" morph="HVqv2ms" id="j7">ק֠וּם</w>',
    '          <w lemma="3212" morph="HVqv2ms" id="j8">לֵ֧ךְ</w>',
    '          <w lemma="413" morph="HR" id="j9">אֶל</w><seg type="x-maqqef">־</seg><w lemma="5210" morph="HNp" id="j10">נִֽינְוֵ֛ה</w><seg type="x-sof-pasuq">׃</seg>',
    '        </verse>',
    '      </chapter>',
    '      <chapter osisID="Jonah.2">',
    '        <verse osisID="Jonah.2.1"><w lemma="4487" morph="HVtw3ms" id="j11">וַיְמַ֤ן</w></verse>',
    '      </chapter>',
    '    </div>',
    '  </osisText>',
    '</osis>'
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

test('Hebrew generator transforms OSHB Jonah fixture into reader chapter schema', () => {
  const root = tempDir();
  writeOshbJonah(root);
  const outputRoot = path.join(root, 'hebrew');
  const result = hebrewGenerator.generateHebrewReaderData({
    sourceRoot: path.join(root, 'source'),
    outputRoot,
    books: ['jonah'],
    chapters: [1]
  });
  assert.equal(result.source, 'Open Scriptures Hebrew Bible');
  assert.equal(result.chapters, 1);
  const chapter = JSON.parse(fs.readFileSync(path.join(outputRoot, 'jonah', '1.json'), 'utf8'));
  assert.equal(chapter.language, 'hebrew');
  assert.equal(chapter.book, 'jonah');
  assert.equal(chapter.bookName, 'Jonah');
  assert.equal(chapter.chapter, 1);
  assert.equal(chapter.verses.length, 2);
  assert.match(chapter.verses[0].text, /יְהוָ֔ה/);
  assert.deepEqual(chapter.verses[0].tokens[0], {
    surface: 'וַֽיְהִי֙',
    lemma: '1961',
    parse: 'HC/Vqw3ms',
    sourceLemma: 'c/1961',
    n: '0.1.0'
  });
});

test('Hebrew generator writes manifest and search index for Jonah 1', () => {
  const root = tempDir();
  writeOshbJonah(root);
  const outputRoot = path.join(root, 'hebrew');
  hebrewGenerator.generateHebrewReaderData({
    sourceRoot: path.join(root, 'source'),
    outputRoot,
    books: ['jonah'],
    chapters: [1]
  });
  const manifest = JSON.parse(fs.readFileSync(path.join(outputRoot, 'manifest.json'), 'utf8'));
  assert.equal(manifest.language, 'hebrew');
  assert.deepEqual(manifest.books, [{ id: 'jonah', name: 'Jonah', chapters: [1] }]);
  const index = JSON.parse(fs.readFileSync(path.join(outputRoot, 'search-index.json'), 'utf8'));
  assert.equal(index[0].book, 'jonah');
  assert.equal(index[0].bookName, 'Jonah');
  assert.equal(index[0].chapter, 1);
  assert.equal(index[0].verse, 1);
  assert.match(index[0].text, /דְּבַר/);
  assert.ok(index[0].surface.includes('יוֹנָ֥ה'));
  assert.ok(index[0].lemmas.includes('3124'));
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
