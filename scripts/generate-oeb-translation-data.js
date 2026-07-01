#!/usr/bin/env node
const fs = require('node:fs');
const https = require('node:https');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_OUTPUT_ROOT = path.join(ROOT, 'data', 'translations', 'oeb');
const DEFAULT_SOURCE_API = 'https://api.github.com/repos/openenglishbible/Open-English-Bible/contents/artifacts/us/usfm?ref=master';
const DEFAULT_SOURCE_URL = 'https://github.com/openenglishbible/Open-English-Bible/tree/master/artifacts/us/usfm';
const BOOK_IDS = {
  Genesis: 'genesis', Exodus: 'exodus', Leviticus: 'leviticus', Numbers: 'numbers', Deuteronomy: 'deuteronomy',
  Joshua: 'joshua', Judges: 'judges', Ruth: 'ruth', '1 Samuel': '1samuel', '2 Samuel': '2samuel',
  '1 Kings': '1kings', '2 Kings': '2kings', '1 Chronicles': '1chronicles', '2 Chronicles': '2chronicles',
  Ezra: 'ezra', Nehemiah: 'nehemiah', Esther: 'esther', Job: 'job', Psalms: 'psalms', Proverbs: 'proverbs',
  Ecclesiastes: 'ecclesiastes', 'Song of Songs': 'songofsolomon', Isaiah: 'isaiah', Jeremiah: 'jeremiah',
  Lamentations: 'lamentations', Ezekiel: 'ezekiel', Daniel: 'daniel', Hosea: 'hosea', Joel: 'joel',
  Amos: 'amos', Obadiah: 'obadiah', Jonah: 'jonah', Micah: 'micah', Nahum: 'nahum', Habakkuk: 'habakkuk',
  Zephaniah: 'zephaniah', Haggai: 'haggai', Zechariah: 'zechariah', Malachi: 'malachi', Matthew: 'matthew',
  Mark: 'mark', Luke: 'luke', John: 'john', Acts: 'acts', Romans: 'romans', '1 Corinthians': '1corinthians',
  '2 Corinthians': '2corinthians', Galatians: 'galatians', Ephesians: 'ephesians', Philippians: 'philippians',
  Colossians: 'colossians', '1 Thessalonians': '1thessalonians', '2 Thessalonians': '2thessalonians',
  '1 Timothy': '1timothy', '2 Timothy': '2timothy', Titus: 'titus', Philemon: 'philemon', Hebrews: 'hebrews',
  James: 'james', '1 Peter': '1peter', '2 Peter': '2peter', '1 John': '1john', '2 John': '2john',
  '3 John': '3john', Jude: 'jude', Revelation: 'revelation'
};

function parseArgs(argv = process.argv.slice(2)) {
  const opts = { outputRoot: DEFAULT_OUTPUT_ROOT, sourceApi: DEFAULT_SOURCE_API, sourceDir: '', generated: new Date().toISOString().slice(0, 10) };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--output-root') opts.outputRoot = path.resolve(argv[++i]);
    else if (argv[i] === '--source-api') opts.sourceApi = argv[++i];
    else if (argv[i] === '--source-dir') opts.sourceDir = path.resolve(argv[++i]);
    else if (argv[i] === '--generated') opts.generated = argv[++i];
    else if (argv[i] === '--help') opts.help = true;
  }
  return opts;
}

function requestText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'puritan-parser-oeb-import' } }, response => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) return resolve(requestText(response.headers.location));
      if (response.statusCode !== 200) return reject(new Error(`Unable to download ${url}: HTTP ${response.statusCode}`));
      response.setEncoding('utf8');
      let body = '';
      response.on('data', chunk => { body += chunk; });
      response.on('end', () => resolve(body));
    }).on('error', reject);
  });
}

async function loadSourceFiles(options = {}) {
  if (options.sourceDir) {
    return fs.readdirSync(options.sourceDir)
      .filter(file => /\.usfm$/i.test(file) && !file.startsWith('00-'))
      .sort()
      .map(file => ({ name: file, content: fs.readFileSync(path.join(options.sourceDir, file), 'utf8') }));
  }
  const listing = JSON.parse(await requestText(options.sourceApi || DEFAULT_SOURCE_API));
  const files = listing.filter(item => item.type === 'file' && /\.usfm$/i.test(item.name) && !item.name.startsWith('00-')).sort((a, b) => a.name.localeCompare(b.name));
  const loaded = [];
  for (const file of files) loaded.push({ name: file.name, content: await requestText(file.download_url) });
  return loaded;
}

function bookNameFromFile(name) {
  return path.basename(name, '.usfm').replace(/^\d+-/, '').trim();
}

function stripUsfm(value) {
  return String(value || '')
    .replace(/\\f\b[\s\S]*?\\f\*/g, ' ')
    .replace(/\\x\b[\s\S]*?\\x\*/g, ' ')
    .replace(/\\w ([^|\\]+)(?:\|[^\\]*)?\\w\*/g, '$1')
    .replace(/\\\+?add\s+([^\\]+)\\\+?add\*/g, '$1')
    .replace(/\\\+?[a-z0-9]+\*?/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseUsfmBook(file) {
  const bookName = bookNameFromFile(file.name);
  const book = BOOK_IDS[bookName];
  if (!book) throw new Error(`Unsupported OEB book name: ${bookName}`);
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
    const raw = text.slice(token.index + token[0].length, next);
    const clean = stripUsfm(raw);
    if (chapter && verse && clean) {
      const verses = chapters.get(chapter);
      const existing = verses.find(item => item.verse === verse);
      if (existing) existing.text = `${existing.text} ${clean}`.replace(/\s+/g, ' ').trim();
      else verses.push({ verse, text: clean });
    }
  }
  return { id: book, name: bookName, chapters };
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

async function generateOebTranslationData(options = {}) {
  const files = await loadSourceFiles(options);
  const books = files.map(parseUsfmBook);
  const errors = books.flatMap(validateBook);
  if (errors.length) throw new Error(`OEB validation failed:\n${errors.join('\n')}`);
  const booksRoot = path.join(options.outputRoot || DEFAULT_OUTPUT_ROOT, 'books');
  const manifestBooks = [];
  for (const book of books) {
    const chapters = [...book.chapters.keys()].sort((a, b) => a - b);
    let verseCount = 0;
    for (const chapter of chapters) {
      const verses = book.chapters.get(chapter).sort((a, b) => a.verse - b.verse);
      verseCount += verses.length;
      writeJson(path.join(booksRoot, book.id, `${chapter}.json`), {
        translation: 'oeb',
        language: 'english',
        book: book.id,
        bookName: book.name,
        chapter,
        source: 'Open English Bible US development artifact',
        verses
      });
    }
    manifestBooks.push({ id: book.id, name: book.name, chapters, verseCount });
  }
  const manifest = {
    schemaVersion: 1,
    id: 'oeb',
    name: 'Open English Bible',
    abbreviation: 'OEB',
    language: 'english',
    default: true,
    source: 'Open English Bible US development USFM artifact',
    sourceUrl: DEFAULT_SOURCE_URL,
    license: 'CC0-1.0',
    attribution: 'Open English Bible contributors',
    generated: options.generated || new Date().toISOString().slice(0, 10),
    dataRoot: 'data/translations/oeb/books',
    books: manifestBooks
  };
  writeJson(path.join(options.outputRoot || DEFAULT_OUTPUT_ROOT, 'manifest.json'), manifest);
  return { manifest, files: files.length, books: books.length, chapters: manifestBooks.reduce((sum, book) => sum + book.chapters.length, 0), verses: manifestBooks.reduce((sum, book) => sum + book.verseCount, 0) };
}

async function main() {
  const opts = parseArgs();
  if (opts.help) {
    console.log('Usage: node scripts/generate-oeb-translation-data.js [--source-dir dir] [--output-root data/translations/oeb] [--generated YYYY-MM-DD]');
    return;
  }
  const report = await generateOebTranslationData(opts);
  console.log(`Generated OEB translation data: ${report.books} books, ${report.chapters} chapters, ${report.verses} verses`);
}

if (require.main === module) main().catch(error => {
  console.error(error.message || error);
  process.exit(1);
});

module.exports = { BOOK_IDS, parseArgs, stripUsfm, parseUsfmBook, validateBook, generateOebTranslationData };
