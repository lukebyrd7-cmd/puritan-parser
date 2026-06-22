#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_DATA_ROOT = path.join(ROOT, 'data', 'greek');

function parseArgs(argv = process.argv.slice(2)) {
  const opts = { dataRoot: DEFAULT_DATA_ROOT, expected: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--data-root') opts.dataRoot = path.resolve(argv[++i]);
    else if (argv[i] === '--expected') opts.expected = JSON.parse(fs.readFileSync(path.resolve(argv[++i]), 'utf8'));
    else if (argv[i] === '--help') opts.help = true;
  }
  return opts;
}

function readJson(filePath) { return JSON.parse(fs.readFileSync(filePath, 'utf8')); }
function versesForChapter(chapter) {
  if (Array.isArray(chapter.verses)) return chapter.verses.map(v => Number(v.verse));
  return (chapter.paragraphs || []).flatMap(p => p.verses || []).map(v => Number(v.verse ?? v.number));
}
function auditReaderData(options = {}) {
  const dataRoot = options.dataRoot || DEFAULT_DATA_ROOT;
  const expected = options.expected || null;
  const books = fs.existsSync(dataRoot) ? fs.readdirSync(dataRoot, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name).sort() : [];
  const report = { dataRoot, books: [], missingChapters: [], missingVerses: [] };
  for (const book of books) {
    const dir = path.join(dataRoot, book);
    const files = fs.readdirSync(dir).filter(file => /^\d+\.json$/.test(file)).sort((a, b) => Number(path.basename(a, '.json')) - Number(path.basename(b, '.json')));
    const chapters = [];
    for (const file of files) {
      const chapterNo = Number(path.basename(file, '.json'));
      const data = readJson(path.join(dir, file));
      const verses = versesForChapter(data).sort((a, b) => a - b);
      chapters.push({ chapter: chapterNo, verseCount: verses.length, verses });
      for (let i = 1; i <= (verses.at(-1) || 0); i++) if (!verses.includes(i)) report.missingVerses.push({ book, chapter: chapterNo, verse: i });
    }
    report.books.push({ book, chapters });
    const expectedChapters = expected?.[book]?.chapters;
    if (expectedChapters) for (let i = 1; i <= expectedChapters; i++) if (!chapters.some(ch => ch.chapter === i)) report.missingChapters.push({ book, chapter: i });
  }
  return report;
}
function formatAuditReport(report) {
  const lines = [`Reader data audit: ${path.relative(ROOT, report.dataRoot) || report.dataRoot}`, `Books present: ${report.books.length ? report.books.map(b => b.book).join(', ') : '(none)'}`];
  for (const book of report.books) {
    lines.push(`- ${book.book}: ${book.chapters.length} chapter(s)`);
    for (const ch of book.chapters) lines.push(`  - chapter ${ch.chapter}: ${ch.verseCount} verse(s)`);
  }
  lines.push(`Missing chapters: ${report.missingChapters.length ? report.missingChapters.map(m => `${m.book} ${m.chapter}`).join(', ') : 'none'}`);
  lines.push(`Missing verses: ${report.missingVerses.length ? report.missingVerses.map(m => `${m.book} ${m.chapter}:${m.verse}`).join(', ') : 'none'}`);
  return lines.join('\n');
}
function main() {
  const opts = parseArgs();
  if (opts.help) { console.log('Usage: node scripts/audit-reader-data.js [--data-root data/greek] [--expected expected.json]'); return; }
  console.log(formatAuditReport(auditReaderData(opts)));
}
if (require.main === module) main();
module.exports = { parseArgs, versesForChapter, auditReaderData, formatAuditReport };
