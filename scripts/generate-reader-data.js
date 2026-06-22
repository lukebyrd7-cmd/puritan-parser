#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_SOURCE_ROOT = path.join(ROOT, 'data', 'source');
const DEFAULT_OUTPUT_ROOT = path.join(ROOT, 'data', 'greek');

const BOOKS = {
  '61-Mt': { id: 'matthew', name: 'Matthew' },
  '62-Mk': { id: 'mark', name: 'Mark' },
  '63-Lk': { id: 'luke', name: 'Luke' },
  '64-Jn': { id: 'john', name: 'John' },
  '65-Ac': { id: 'acts', name: 'Acts' },
  '66-Ro': { id: 'romans', name: 'Romans' },
  '67-1Co': { id: '1corinthians', name: '1 Corinthians' },
  '68-2Co': { id: '2corinthians', name: '2 Corinthians' },
  '69-Ga': { id: 'galatians', name: 'Galatians' },
  '70-Eph': { id: 'ephesians', name: 'Ephesians' },
  '71-Php': { id: 'philippians', name: 'Philippians' },
  '72-Col': { id: 'colossians', name: 'Colossians' },
  '73-1Th': { id: '1thessalonians', name: '1 Thessalonians' },
  '74-2Th': { id: '2thessalonians', name: '2 Thessalonians' },
  '75-1Ti': { id: '1timothy', name: '1 Timothy' },
  '76-2Ti': { id: '2timothy', name: '2 Timothy' },
  '77-Tit': { id: 'titus', name: 'Titus' },
  '78-Phm': { id: 'philemon', name: 'Philemon' },
  '79-Heb': { id: 'hebrews', name: 'Hebrews' },
  '80-Jas': { id: 'james', name: 'James' },
  '81-1Pe': { id: '1peter', name: '1 Peter' },
  '82-2Pe': { id: '2peter', name: '2 Peter' },
  '83-1Jn': { id: '1john', name: '1 John' },
  '84-2Jn': { id: '2john', name: '2 John' },
  '85-3Jn': { id: '3john', name: '3 John' },
  '86-Jud': { id: 'jude', name: 'Jude' },
  '87-Re': { id: 'revelation', name: 'Revelation' }
};

function parseArgs(argv = process.argv.slice(2)) {
  const opts = { sourceRoot: DEFAULT_SOURCE_ROOT, outputRoot: DEFAULT_OUTPUT_ROOT, books: [], searchIndex: true };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--source-root') opts.sourceRoot = path.resolve(argv[++i]);
    else if (arg === '--output-root') opts.outputRoot = path.resolve(argv[++i]);
    else if (arg === '--book') opts.books.push(argv[++i]);
    else if (arg === '--no-search-index') opts.searchIndex = false;
    else if (arg === '--help') opts.help = true;
  }
  return opts;
}

function findMorphGntFiles(sourceRoot = DEFAULT_SOURCE_ROOT) {
  const dir = path.join(sourceRoot, 'morphgnt-sblgnt');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(file => /-morphgnt\.txt$/.test(file))
    .map(file => path.join(dir, file))
    .sort();
}

function decodeReference(code) {
  const digits = String(code || '').replace(/\D/g, '').padStart(6, '0');
  return { chapter: Number(digits.slice(2, 4)), verse: Number(digits.slice(4, 6)) };
}

function parseMorphGntLine(line) {
  const parts = line.trim().split(/\s+/);
  if (parts.length < 4 || /^#/.test(parts[0])) return null;
  const { chapter, verse } = decodeReference(parts[0]);
  const surface = parts[3];
  const lemma = parts.at(-1) || parts[5] || parts[4] || '';
  const parse = [parts[1], parts[2]].filter(Boolean).join(' ');
  return { chapter, verse, surface, lemma, parse };
}

function bookInfoForFile(filePath) {
  const base = path.basename(filePath).replace('-morphgnt.txt', '');
  return BOOKS[base] ? { sourceCode: base, ...BOOKS[base] } : null;
}

function buildBookChapters(filePath) {
  const info = bookInfoForFile(filePath);
  if (!info) return [];
  const byVerse = new Map();
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const token = parseMorphGntLine(line);
    if (!token || !token.chapter || !token.verse) continue;
    const key = `${token.chapter}:${token.verse}`;
    if (!byVerse.has(key)) byVerse.set(key, { verse: token.verse, textParts: [], tokens: [] });
    const entry = byVerse.get(key);
    entry.textParts.push(token.surface);
    entry.tokens.push({ surface: token.surface, lemma: token.lemma, parse: token.parse });
  }
  const byChapter = new Map();
  for (const [key, verse] of byVerse) {
    const chapter = Number(key.split(':')[0]);
    if (!byChapter.has(chapter)) byChapter.set(chapter, []);
    byChapter.get(chapter).push({ verse: verse.verse, text: verse.textParts.join(' '), tokens: verse.tokens });
  }
  return [...byChapter.entries()].sort((a, b) => a[0] - b[0]).map(([chapter, verses]) => ({
    book: info.id,
    bookName: info.name,
    chapter,
    source: 'MorphGNT SBLGNT (data/source/morphgnt-sblgnt)',
    verses: verses.sort((a, b) => a.verse - b.verse)
  }));
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
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

function generateReaderData(options = {}) {
  const opts = { sourceRoot: DEFAULT_SOURCE_ROOT, outputRoot: DEFAULT_OUTPUT_ROOT, books: [], searchIndex: true, ...options };
  const wanted = new Set(opts.books.map(book => book.toLowerCase()));
  const files = findMorphGntFiles(opts.sourceRoot).filter(file => {
    const info = bookInfoForFile(file);
    return info && (!wanted.size || wanted.has(info.id) || wanted.has(info.name.toLowerCase()) || wanted.has(info.sourceCode.toLowerCase()));
  });
  const chapters = files.flatMap(buildBookChapters);
  for (const chapter of chapters) writeJson(path.join(opts.outputRoot, chapter.book, `${chapter.chapter}.json`), chapter);
  if (opts.searchIndex) writeJson(path.join(opts.outputRoot, 'search-index.json'), chapters.flatMap(searchEntriesFromChapter));
  return { source: 'MorphGNT SBLGNT', files: files.length, chapters: chapters.length, outputRoot: opts.outputRoot };
}

function main() {
  const opts = parseArgs();
  if (opts.help) {
    console.log('Usage: node scripts/generate-reader-data.js [--book matthew] [--source-root data/source] [--output-root data/greek] [--no-search-index]');
    return;
  }
  const result = generateReaderData(opts);
  if (!result.files) throw new Error('No MorphGNT SBLGNT files found. Run `npm run data:download` first or pass --source-root.');
  console.log(`Generated ${result.chapters} chapter file(s) from ${result.source} into ${path.relative(ROOT, result.outputRoot)}.`);
}

if (require.main === module) main();
module.exports = { BOOKS, parseArgs, findMorphGntFiles, parseMorphGntLine, buildBookChapters, searchEntriesFromChapter, generateReaderData };
