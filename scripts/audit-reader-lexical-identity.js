#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_ROOT = path.join(ROOT, 'data', 'hebrew-interlinear');
const Reader = require('../src/features/reader/index.js');

function readJson(file){ return JSON.parse(fs.readFileSync(file, 'utf8')); }
function decode(fields, values){ return Object.fromEntries(fields.map((field, index) => [field, values[index]])); }
function patternFor(segments = [], lexicalIndex = 0){
  const labels = segments.map((segment, index) => {
    const pos = Reader.readerSegmentPartOfSpeech(segment) || segment.class || segment.morphology || 'unknown';
    if(index < lexicalIndex) return `${pos.toLowerCase()} prefix`;
    if(index > lexicalIndex) return `${pos.toLowerCase()} suffix`;
    return pos.toLowerCase();
  });
  return labels.join(' + ');
}
function auditHebrewLexicalIdentity(options = {}){
  const dataRoot = options.dataRoot || DEFAULT_ROOT;
  const files = fs.readdirSync(dataRoot, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .flatMap(entry => fs.readdirSync(path.join(dataRoot, entry.name)).filter(file => /^\d+\.json$/.test(file)).map(file => path.join(dataRoot, entry.name, file)))
    .sort();
  const report = { files: files.length, tokens: 0, segmentedTokens: 0, structuralPosDifferences: 0, unresolved: [], patterns: {}, examples: [] };
  for(const file of files){
    const chapter = readJson(file);
    for(const verse of chapter.verses || []) for(const values of verse.tokens || []){
      report.tokens += 1;
      const token = decode(chapter.tokenFields, values);
      const segments = (token.segments || []).map(values => decode(chapter.segmentFields, values));
      if(segments.length < 2) continue;
      report.segmentedTokens += 1;
      const resolved = Reader.readerHebrewLexicalStructure({ segments });
      const lexicalIndex = Math.max(0, segments.findIndex(segment => segment.lemma === resolved.lexicalLemma && segment.morphology === resolved.lexicalMorphology));
      const firstPos = Reader.readerSegmentPartOfSpeech(segments[0]);
      const pattern = patternFor(segments, lexicalIndex);
      report.patterns[pattern] = (report.patterns[pattern] || 0) + 1;
      if(firstPos && resolved.lexicalPartOfSpeech && firstPos !== resolved.lexicalPartOfSpeech){
        report.structuralPosDifferences += 1;
        if(report.examples.length < 12) report.examples.push({ reference: `${chapter.book} ${chapter.chapter}:${verse.verse}`, surface: token.surface, stableLemma: token.lemma, firstPos, lexicalLemma: resolved.lexicalLemma, lexicalPos: resolved.lexicalPartOfSpeech, pattern });
      }
      if(!token.lemma || !resolved.lexicalLemma || !resolved.lexicalPartOfSpeech) report.unresolved.push({ reference: `${chapter.book} ${chapter.chapter}:${verse.verse}`, surface: token.surface, stableLemma: token.lemma || '', pattern });
    }
  }
  report.patterns = Object.fromEntries(Object.entries(report.patterns).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
  return report;
}
function formatReport(report){
  const patternEntries = Object.entries(report.patterns);
  const patterns = patternEntries.slice(0, 20).map(([pattern, count]) => `${pattern}: ${count}`).join('; ');
  const examples = report.examples.map(item => `${item.reference} ${item.surface} (${item.firstPos} → ${item.lexicalPos} ${item.lexicalLemma})`).join('; ');
  return [
    'Hebrew Reader lexical identity audit:',
    `* files: ${report.files}`,
    `* tokens: ${report.tokens}`,
    `* multi-segment tokens: ${report.segmentedTokens}`,
    `* structural segment POS != lexical POS: ${report.structuralPosDifferences}`,
    `* unresolved trusted lexical segments: ${report.unresolved.length}`,
    `* structural patterns: ${patternEntries.length} total; top ${Math.min(20, patternEntries.length)}: ${patterns || 'none'}`,
    `* representative differences: ${examples || 'none'}`,
    '* Greek equivalent: none; Greek Reader tokens do not use the Hebrew segmented morphology pipeline.'
  ].join('\n');
}
function main(){
  const report = auditHebrewLexicalIdentity();
  console.log(formatReport(report));
  if(!report.files) process.exitCode = 1;
}
if(require.main === module) main();
module.exports = { auditHebrewLexicalIdentity, formatReport, patternFor };
