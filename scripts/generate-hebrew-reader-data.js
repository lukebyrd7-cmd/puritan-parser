#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_SOURCE_ROOT = path.join(ROOT, 'data', 'source');
const DEFAULT_OUTPUT_ROOT = path.join(ROOT, 'data', 'hebrew');
const SOURCE_LABEL = 'Open Scriptures Hebrew Bible (data/source/morphhb-wlc)';
const BOOKS = {
  Gen: { id: 'genesis', name: 'Genesis', sourceFile: 'Gen.xml' },
  Exod: { id: 'exodus', name: 'Exodus', sourceFile: 'Exod.xml' },
  Lev: { id: 'leviticus', name: 'Leviticus', sourceFile: 'Lev.xml' },
  Num: { id: 'numbers', name: 'Numbers', sourceFile: 'Num.xml' },
  Deut: { id: 'deuteronomy', name: 'Deuteronomy', sourceFile: 'Deut.xml' },
  Josh: { id: 'joshua', name: 'Joshua', sourceFile: 'Josh.xml' },
  Judg: { id: 'judges', name: 'Judges', sourceFile: 'Judg.xml' },
  Ruth: { id: 'ruth', name: 'Ruth', sourceFile: 'Ruth.xml' },
  '1Sam': { id: '1samuel', name: '1 Samuel', sourceFile: '1Sam.xml' },
  '2Sam': { id: '2samuel', name: '2 Samuel', sourceFile: '2Sam.xml' },
  '1Kgs': { id: '1kings', name: '1 Kings', sourceFile: '1Kgs.xml' },
  '2Kgs': { id: '2kings', name: '2 Kings', sourceFile: '2Kgs.xml' },
  '1Chr': { id: '1chronicles', name: '1 Chronicles', sourceFile: '1Chr.xml' },
  '2Chr': { id: '2chronicles', name: '2 Chronicles', sourceFile: '2Chr.xml' },
  Ezra: { id: 'ezra', name: 'Ezra', sourceFile: 'Ezra.xml' },
  Neh: { id: 'nehemiah', name: 'Nehemiah', sourceFile: 'Neh.xml' },
  Esth: { id: 'esther', name: 'Esther', sourceFile: 'Esth.xml' },
  Job: { id: 'job', name: 'Job', sourceFile: 'Job.xml' },
  Ps: { id: 'psalms', name: 'Psalms', sourceFile: 'Ps.xml' },
  Prov: { id: 'proverbs', name: 'Proverbs', sourceFile: 'Prov.xml' },
  Eccl: { id: 'ecclesiastes', name: 'Ecclesiastes', sourceFile: 'Eccl.xml' },
  Song: { id: 'songofsolomon', name: 'Song of Solomon', sourceFile: 'Song.xml' },
  Isa: { id: 'isaiah', name: 'Isaiah', sourceFile: 'Isa.xml' },
  Jer: { id: 'jeremiah', name: 'Jeremiah', sourceFile: 'Jer.xml' },
  Lam: { id: 'lamentations', name: 'Lamentations', sourceFile: 'Lam.xml' },
  Ezek: { id: 'ezekiel', name: 'Ezekiel', sourceFile: 'Ezek.xml' },
  Dan: { id: 'daniel', name: 'Daniel', sourceFile: 'Dan.xml' },
  Hos: { id: 'hosea', name: 'Hosea', sourceFile: 'Hos.xml' },
  Joel: { id: 'joel', name: 'Joel', sourceFile: 'Joel.xml' },
  Amos: { id: 'amos', name: 'Amos', sourceFile: 'Amos.xml' },
  Obad: { id: 'obadiah', name: 'Obadiah', sourceFile: 'Obad.xml' },
  Jonah: { id: 'jonah', name: 'Jonah', sourceFile: 'Jonah.xml' },
  Mic: { id: 'micah', name: 'Micah', sourceFile: 'Mic.xml' },
  Nah: { id: 'nahum', name: 'Nahum', sourceFile: 'Nah.xml' },
  Hab: { id: 'habakkuk', name: 'Habakkuk', sourceFile: 'Hab.xml' },
  Zeph: { id: 'zephaniah', name: 'Zephaniah', sourceFile: 'Zeph.xml' },
  Hag: { id: 'haggai', name: 'Haggai', sourceFile: 'Hag.xml' },
  Zech: { id: 'zechariah', name: 'Zechariah', sourceFile: 'Zech.xml' },
  Mal: { id: 'malachi', name: 'Malachi', sourceFile: 'Mal.xml' }
};

const DEFAULT_BOOKS = [
  'genesis', 'exodus', 'leviticus', 'numbers', 'deuteronomy',
  'joshua', 'judges', '1samuel', '2samuel', '1kings', '2kings',
  'isaiah', 'jeremiah', 'ezekiel',
  'hosea', 'joel', 'amos', 'obadiah', 'jonah', 'micah', 'nahum', 'habakkuk', 'zephaniah', 'haggai', 'zechariah', 'malachi',
  'psalms', 'proverbs', 'job', 'songofsolomon', 'ruth', 'lamentations', 'ecclesiastes', 'esther', 'daniel', 'ezra', 'nehemiah', '1chronicles', '2chronicles'
];
const DEFAULT_CHAPTERS_BY_BOOK = {};

function parseArgs(argv = process.argv.slice(2)) {
  const opts = {
    sourceRoot: DEFAULT_SOURCE_ROOT,
    outputRoot: DEFAULT_OUTPUT_ROOT,
    books: [...DEFAULT_BOOKS],
    chapters: [],
    chaptersByBook: { ...DEFAULT_CHAPTERS_BY_BOOK },
    searchIndex: true
  };
  let customSelection = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--source-root') opts.sourceRoot = path.resolve(argv[++i]);
    else if (arg === '--output-root') opts.outputRoot = path.resolve(argv[++i]);
    else if (arg === '--book') {
      if (!customSelection) {
        opts.books = [];
        opts.chaptersByBook = null;
        customSelection = true;
      }
      opts.books.push(argv[++i]);
    } else if (arg === '--chapter') {
      if (!customSelection) {
        opts.books = [];
        opts.chaptersByBook = null;
        customSelection = true;
      }
      opts.chapters.push(Number(argv[++i]));
    } else if (arg === '--all-chapters') opts.chapters = [];
    else if (arg === '--no-search-index') opts.searchIndex = false;
    else if (arg === '--help') opts.help = true;
  }
  return opts;
}

function normalizeKey(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function bookMatches(info, wanted) {
  const keys = [info.id, info.name, info.sourceCode, info.sourceFile.replace(/\.xml$/i, '')].map(normalizeKey);
  return keys.includes(normalizeKey(wanted));
}

function selectedBooks(wantedBooks = DEFAULT_BOOKS) {
  const wanted = wantedBooks.length ? wantedBooks : DEFAULT_BOOKS;
  const available = Object.entries(BOOKS).map(([sourceCode, info]) => ({ sourceCode, ...info }));
  const seen = new Set();
  return wanted.reduce((selected, book) => {
    const match = available.find(info => !seen.has(info.id) && bookMatches(info, book));
    if (match) {
      seen.add(match.id);
      selected.push(match);
    }
    return selected;
  }, []);
}

function findOshbFiles(sourceRoot = DEFAULT_SOURCE_ROOT, wantedBooks = DEFAULT_BOOKS) {
  const dir = path.join(sourceRoot, 'morphhb-wlc');
  if (!fs.existsSync(dir)) return [];
  return selectedBooks(wantedBooks)
    .map(info => ({ info, filePath: path.join(dir, info.sourceFile) }))
    .filter(entry => fs.existsSync(entry.filePath));
}

function decodeXmlEntities(value) {
  return String(value || '')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function attrValue(attrs, name) {
  const match = String(attrs || '').match(new RegExp(`\\b${name}="([^"]*)"`));
  return match ? decodeXmlEntities(match[1]) : '';
}

function cleanSurface(value) {
  return decodeXmlEntities(String(value || '').replace(/<[^>]+>/g, '')).replace(/\//g, '').trim();
}

function normalizeLemma(raw) {
  return String(raw || '').split('/').pop().replace(/\s+[a-z]$/i, '').trim();
}

function parseToken(tag) {
  const match = String(tag || '').match(/<w\b([^>]*)>([\s\S]*?)<\/w>/);
  if (!match) return null;
  const attrs = match[1];
  const sourceLemma = attrValue(attrs, 'lemma');
  const token = {
    surface: cleanSurface(match[2]),
    lemma: normalizeLemma(sourceLemma),
    parse: attrValue(attrs, 'morph')
  };
  const n = attrValue(attrs, 'n');
  if (sourceLemma && sourceLemma !== token.lemma) token.sourceLemma = sourceLemma;
  if (n) token.n = n;
  return token.surface ? token : null;
}

function parseVerseContent(content) {
  const tokens = [];
  const textParts = [];
  const re = /<w\b[^>]*>[\s\S]*?<\/w>|<seg\b([^>]*)>([\s\S]*?)<\/seg>/g;
  for (const match of content.matchAll(re)) {
    if (match[0].startsWith('<w')) {
      const token = parseToken(match[0]);
      if (!token) continue;
      tokens.push(token);
      textParts.push(token.surface);
    } else {
      const type = attrValue(match[1], 'type');
      if (type === 'x-sof-pasuq') textParts.push(cleanSurface(match[2]));
    }
  }
  return { text: textParts.join(' ').replace(/\s+([׃.,;:!?])/g, '$1').trim(), tokens };
}

function buildBookChapters(filePath, info, chapterFilter = []) {
  const xml = fs.readFileSync(filePath, 'utf8');
  const wantedChapters = new Set((chapterFilter || []).filter(Boolean).map(Number));
  const chapters = [];
  const chapterRe = /<chapter\b[^>]*osisID="[^"]+\.(\d+)"[^>]*>([\s\S]*?)<\/chapter>/g;
  for (const chapterMatch of xml.matchAll(chapterRe)) {
    const chapter = Number(chapterMatch[1]);
    if (wantedChapters.size && !wantedChapters.has(chapter)) continue;
    const verses = [];
    const verseRe = /<verse\b[^>]*osisID="[^"]+\.(\d+)\.(\d+)"[^>]*>([\s\S]*?)<\/verse>/g;
    for (const verseMatch of chapterMatch[2].matchAll(verseRe)) {
      const verse = Number(verseMatch[2]);
      const parsed = parseVerseContent(verseMatch[3]);
      if (!parsed.text && !parsed.tokens.length) continue;
      verses.push({ verse, text: parsed.text, tokens: parsed.tokens });
    }
    chapters.push({
      language: 'hebrew',
      book: info.id,
      bookName: info.name,
      chapter,
      source: SOURCE_LABEL,
      verses
    });
  }
  return chapters;
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function manifestFromChapters(chapters) {
  const byBook = new Map();
  for (const chapter of chapters) {
    if (!byBook.has(chapter.book)) byBook.set(chapter.book, { id: chapter.book, name: chapter.bookName, chapters: [] });
    byBook.get(chapter.book).chapters.push(chapter.chapter);
  }
  return {
    schemaVersion: 1,
    language: 'hebrew',
    source: SOURCE_LABEL,
    books: [...byBook.values()].map(book => ({ ...book, chapters: [...new Set(book.chapters)].sort((a, b) => a - b) }))
  };
}

function searchEntriesFromChapter(chapter) {
  return chapter.verses.map(verse => ({
    book: chapter.book,
    bookName: chapter.bookName,
    chapter: chapter.chapter,
    verse: verse.verse,
    text: verse.text,
    surface: verse.tokens?.map(t => t.surface).filter(Boolean) || verse.text.split(/\s+/).filter(Boolean),
    lemmas: [...new Set((verse.tokens || []).map(t => t.lemma).filter(Boolean))]
  }));
}

function missingSourceMessage(sourceRoot, books = DEFAULT_BOOKS) {
  const sourceDir = path.join(sourceRoot, 'morphhb-wlc');
  const expected = selectedBooks(books).map(info => path.join('data', 'source', 'morphhb-wlc', info.sourceFile));
  const fileList = expected.length ? expected.join(', ') : path.join('data', 'source', 'morphhb-wlc', 'Jonah.xml');
  return `No OSHB source XML files found. Expected ${fileList}. Run \`npm run data:download\` first or pass --source-root pointing to a folder containing morphhb-wlc/*.xml. Looked in ${sourceDir}.`;
}

function chaptersForBook(info, opts = {}) {
  const byBook = opts.chaptersByBook || {};
  const keys = [info.id, info.name, info.sourceCode, info.sourceFile?.replace(/\.xml$/i, '')].map(normalizeKey);
  const match = Object.entries(byBook).find(([book]) => keys.includes(normalizeKey(book)));
  return match ? match[1] : opts.chapters;
}

function generateHebrewReaderData(options = {}) {
  const hasExplicitSelection = Object.prototype.hasOwnProperty.call(options, 'books')
    || Object.prototype.hasOwnProperty.call(options, 'chapters')
    || Object.prototype.hasOwnProperty.call(options, 'chaptersByBook');
  const opts = {
    sourceRoot: DEFAULT_SOURCE_ROOT,
    outputRoot: DEFAULT_OUTPUT_ROOT,
    books: [...DEFAULT_BOOKS],
    chapters: [],
    chaptersByBook: { ...DEFAULT_CHAPTERS_BY_BOOK },
    searchIndex: true,
    ...options
  };
  if (hasExplicitSelection && !Object.prototype.hasOwnProperty.call(options, 'chaptersByBook')) opts.chaptersByBook = null;
  const files = findOshbFiles(opts.sourceRoot, opts.books);
  const chapters = files.flatMap(({ filePath, info }) => buildBookChapters(filePath, info, chaptersForBook(info, opts)));
  for (const chapter of chapters) writeJson(path.join(opts.outputRoot, chapter.book, `${chapter.chapter}.json`), chapter);
  writeJson(path.join(opts.outputRoot, 'manifest.json'), manifestFromChapters(chapters));
  if (opts.searchIndex) writeJson(path.join(opts.outputRoot, 'search-index.json'), chapters.flatMap(searchEntriesFromChapter));
  return { source: 'Open Scriptures Hebrew Bible', files: files.length, chapters: chapters.length, outputRoot: opts.outputRoot };
}

function main() {
  const opts = parseArgs();
  if (opts.help) {
    console.log('Usage: node scripts/generate-hebrew-reader-data.js [--book genesis] [--chapter 1] [--all-chapters] [--source-root data/source] [--output-root data/hebrew] [--no-search-index]');
    return;
  }
  const result = generateHebrewReaderData(opts);
  if (!result.files) throw new Error(missingSourceMessage(opts.sourceRoot, opts.books));
  console.log(`Generated ${result.chapters} Hebrew chapter file(s) from ${result.source} into ${path.relative(ROOT, result.outputRoot)}.`);
}

if (require.main === module) main();

module.exports = {
  BOOKS,
  parseArgs,
  findOshbFiles,
  parseToken,
  parseVerseContent,
  buildBookChapters,
  manifestFromChapters,
  searchEntriesFromChapter,
  chaptersForBook,
  missingSourceMessage,
  generateHebrewReaderData
};
