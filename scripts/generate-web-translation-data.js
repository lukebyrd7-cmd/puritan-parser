#!/usr/bin/env node
const fs = require('node:fs');
const https = require('node:https');
const path = require('node:path');
const childProcess = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_OUTPUT_ROOT = path.join(ROOT, 'data', 'translations', 'web');
const DEFAULT_SOURCE_ZIP = 'https://ebible.org/Scriptures/engwebp_usfm.zip';
const DEFAULT_SOURCE_URL = 'https://ebible.org/Scriptures/engwebp_usfm.zip';
const BOOK_CODES = {
  GEN: ['genesis', 'Genesis'], EXO: ['exodus', 'Exodus'], LEV: ['leviticus', 'Leviticus'], NUM: ['numbers', 'Numbers'], DEU: ['deuteronomy', 'Deuteronomy'],
  JOS: ['joshua', 'Joshua'], JDG: ['judges', 'Judges'], RUT: ['ruth', 'Ruth'], '1SA': ['1samuel', '1 Samuel'], '2SA': ['2samuel', '2 Samuel'],
  '1KI': ['1kings', '1 Kings'], '2KI': ['2kings', '2 Kings'], '1CH': ['1chronicles', '1 Chronicles'], '2CH': ['2chronicles', '2 Chronicles'],
  EZR: ['ezra', 'Ezra'], NEH: ['nehemiah', 'Nehemiah'], EST: ['esther', 'Esther'], JOB: ['job', 'Job'], PSA: ['psalms', 'Psalms'], PRO: ['proverbs', 'Proverbs'],
  ECC: ['ecclesiastes', 'Ecclesiastes'], SNG: ['songofsolomon', 'Song of Songs'], ISA: ['isaiah', 'Isaiah'], JER: ['jeremiah', 'Jeremiah'],
  LAM: ['lamentations', 'Lamentations'], EZK: ['ezekiel', 'Ezekiel'], DAN: ['daniel', 'Daniel'], HOS: ['hosea', 'Hosea'], JOL: ['joel', 'Joel'],
  AMO: ['amos', 'Amos'], OBA: ['obadiah', 'Obadiah'], JON: ['jonah', 'Jonah'], MIC: ['micah', 'Micah'], NAM: ['nahum', 'Nahum'], HAB: ['habakkuk', 'Habakkuk'],
  ZEP: ['zephaniah', 'Zephaniah'], HAG: ['haggai', 'Haggai'], ZEC: ['zechariah', 'Zechariah'], MAL: ['malachi', 'Malachi'], MAT: ['matthew', 'Matthew'],
  MRK: ['mark', 'Mark'], LUK: ['luke', 'Luke'], JHN: ['john', 'John'], ACT: ['acts', 'Acts'], ROM: ['romans', 'Romans'], '1CO': ['1corinthians', '1 Corinthians'],
  '2CO': ['2corinthians', '2 Corinthians'], GAL: ['galatians', 'Galatians'], EPH: ['ephesians', 'Ephesians'], PHP: ['philippians', 'Philippians'],
  COL: ['colossians', 'Colossians'], '1TH': ['1thessalonians', '1 Thessalonians'], '2TH': ['2thessalonians', '2 Thessalonians'],
  '1TI': ['1timothy', '1 Timothy'], '2TI': ['2timothy', '2 Timothy'], TIT: ['titus', 'Titus'], PHM: ['philemon', 'Philemon'], HEB: ['hebrews', 'Hebrews'],
  JAS: ['james', 'James'], '1PE': ['1peter', '1 Peter'], '2PE': ['2peter', '2 Peter'], '1JN': ['1john', '1 John'], '2JN': ['2john', '2 John'],
  '3JN': ['3john', '3 John'], JUD: ['jude', 'Jude'], REV: ['revelation', 'Revelation']
};

function parseArgs(argv = process.argv.slice(2)) {
  const opts = { outputRoot: DEFAULT_OUTPUT_ROOT, sourceZip: DEFAULT_SOURCE_ZIP, sourceDir: '', generated: new Date().toISOString().slice(0, 10) };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--output-root') opts.outputRoot = path.resolve(argv[++i]);
    else if (argv[i] === '--source-zip') opts.sourceZip = argv[++i];
    else if (argv[i] === '--source-dir') opts.sourceDir = path.resolve(argv[++i]);
    else if (argv[i] === '--generated') opts.generated = argv[++i];
    else if (argv[i] === '--help') opts.help = true;
  }
  return opts;
}

function requestBuffer(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'puritan-parser-web-import' } }, response => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) return resolve(requestBuffer(response.headers.location));
      if (response.statusCode !== 200) return reject(new Error(`Unable to download ${url}: HTTP ${response.statusCode}`));
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

async function ensureSourceDir(options = {}) {
  if (options.sourceDir) return options.sourceDir;
  const tmp = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'pp-web-usfm-'));
  const zipPath = path.join(tmp, 'engwebp_usfm.zip');
  const sourceZip = options.sourceZip || DEFAULT_SOURCE_ZIP;
  if (/^https?:\/\//i.test(sourceZip)) fs.writeFileSync(zipPath, await requestBuffer(sourceZip));
  else fs.copyFileSync(path.resolve(sourceZip), zipPath);
  childProcess.execFileSync('unzip', ['-oq', zipPath, '-d', tmp]);
  return tmp;
}

async function loadSourceFiles(options = {}) {
  const sourceDir = await ensureSourceDir(options);
  return fs.readdirSync(sourceDir)
    .filter(file => /\.usfm$/i.test(file))
    .sort()
    .map(file => ({ name: file, content: fs.readFileSync(path.join(sourceDir, file), 'utf8') }));
}

function bookCodeFromUsfm(content = '', name = '') {
  const id = String(content || '').match(/^\\id\s+([1-3]?[A-Z0-9]{2,3})\b/m)?.[1];
  if (id) return id;
  return path.basename(name, '.usfm').replace(/^\d+-/, '').replace(/engwebp$/i, '').toUpperCase();
}

function stripUsfm(value) {
  return String(value || '')
    .replace(/\\f\b[\s\S]*?\\f\*/g, ' ')
    .replace(/\\x\b[\s\S]*?\\x\*/g, ' ')
    .replace(/\\fig\b[\s\S]*?\\fig\*/g, ' ')
    .replace(/\\\+?w\s+([^|\\]+)(?:\|[^\\]*)?\\\+?w\*/g, '$1')
    .replace(/\\wj\s+([\s\S]*?)\\wj\*/g, '$1')
    .replace(/\\\+?add\s+([^\\]+)\\\+?add\*/g, '$1')
    .replace(/\\\+?[a-z0-9-]+\*?/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseUsfmBook(file) {
  const code = bookCodeFromUsfm(file.content, file.name);
  const bookInfo = BOOK_CODES[code];
  if (!bookInfo) return null;
  const text = file.content
    .replace(/\r\n?/g, '\n')
    .replace(/\\f\b[\s\S]*?\\f\*/g, ' ')
    .replace(/\\x\b[\s\S]*?\\x\*/g, ' ');
  const tokens = [...text.matchAll(/\\c\s+(\d+)|\\v\s+(\d+)\s*/g)];
  const chapters = new Map();
  let chapter = 0;
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token[1]) {
      chapter = Number(token[1]);
      if (!chapters.has(chapter)) chapters.set(chapter, []);
      continue;
    }
    const verse = Number(token[2]);
    const next = tokens[i + 1]?.index ?? text.length;
    const clean = stripUsfm(text.slice(token.index + token[0].length, next));
    if (chapter && verse && clean) {
      const verses = chapters.get(chapter);
      const existing = verses.find(item => item.verse === verse);
      if (existing) existing.text = `${existing.text} ${clean}`.replace(/\s+/g, ' ').trim();
      else verses.push({ verse, text: clean });
    }
  }
  return { id: bookInfo[0], name: bookInfo[1], chapters };
}

function validateBook(book) {
  const errors = [];
  for (const [chapter, verses] of book.chapters) {
    if (!verses.length) errors.push(`${book.id} ${chapter}: no verses`);
    const seen = new Set();
    for (const verse of verses) {
      if (seen.has(verse.verse)) errors.push(`${book.id} ${chapter}:${verse.verse}: duplicate verse`);
      seen.add(verse.verse);
      if (!verse.text) errors.push(`${book.id} ${chapter}:${verse.verse}: empty text`);
    }
  }
  return errors;
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

async function generateWebTranslationData(options = {}) {
  const files = await loadSourceFiles(options);
  const books = files.map(parseUsfmBook).filter(Boolean);
  const errors = books.flatMap(validateBook);
  if (books.length !== Object.keys(BOOK_CODES).length) errors.push(`Expected ${Object.keys(BOOK_CODES).length} WEB books, found ${books.length}`);
  if (errors.length) throw new Error(`WEB validation failed:\n${errors.join('\n')}`);
  const booksRoot = path.join(options.outputRoot || DEFAULT_OUTPUT_ROOT, 'books');
  fs.rmSync(booksRoot, { recursive: true, force: true });
  const manifestBooks = [];
  for (const book of books) {
    const chapters = [...book.chapters.keys()].sort((a, b) => a - b);
    let verseCount = 0;
    for (const chapter of chapters) {
      const verses = book.chapters.get(chapter).sort((a, b) => a.verse - b.verse);
      verseCount += verses.length;
      writeJson(path.join(booksRoot, book.id, `${chapter}.json`), {
        translation: 'web',
        language: 'english',
        book: book.id,
        bookName: book.name,
        chapter,
        source: 'World English Bible Protestant USFM artifact',
        verses
      });
    }
    manifestBooks.push({ id: book.id, name: book.name, chapters, verseCount });
  }
  const manifest = {
    schemaVersion: 1,
    id: 'web',
    name: 'World English Bible',
    abbreviation: 'WEB',
    language: 'english',
    default: false,
    source: 'World English Bible Protestant USFM artifact',
    sourceUrl: DEFAULT_SOURCE_URL,
    license: 'Public Domain',
    attribution: 'World English Bible contributors via eBible.org',
    generated: options.generated || new Date().toISOString().slice(0, 10),
    dataRoot: 'data/translations/web/books',
    books: manifestBooks
  };
  writeJson(path.join(options.outputRoot || DEFAULT_OUTPUT_ROOT, 'manifest.json'), manifest);
  return { manifest, files: files.length, books: books.length, chapters: manifestBooks.reduce((sum, book) => sum + book.chapters.length, 0), verses: manifestBooks.reduce((sum, book) => sum + book.verseCount, 0) };
}

async function main() {
  const opts = parseArgs();
  if (opts.help) {
    console.log('Usage: node scripts/generate-web-translation-data.js [--source-dir dir] [--source-zip url-or-path] [--output-root data/translations/web] [--generated YYYY-MM-DD]');
    return;
  }
  const report = await generateWebTranslationData(opts);
  console.log(`Generated WEB translation data: ${report.books} books, ${report.chapters} chapters, ${report.verses} verses`);
}

if (require.main === module) main().catch(error => {
  console.error(error.message || error);
  process.exit(1);
});

module.exports = { BOOK_CODES, parseArgs, bookCodeFromUsfm, stripUsfm, parseUsfmBook, validateBook, generateWebTranslationData };
