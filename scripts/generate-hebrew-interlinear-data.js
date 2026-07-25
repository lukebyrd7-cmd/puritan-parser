#!/usr/bin/env node
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');
const { BOOKS } = require('./generate-hebrew-reader-data');

const ROOT = path.resolve(__dirname, '..');
const SCHEMA_VERSION = 1;
const UPSTREAM = {
  repository: 'https://github.com/Clear-Bible/macula-hebrew',
  commit: '47db250bd55d0d8577f2a94fba114ef16c35b23c',
  retrievalDate: '2026-07-24',
  tsvPath: 'WLC/tsv/macula-hebrew.tsv',
  tsvSha256: '965cb0599beed2fe31283b615bcc369178141c0e718a66d97518d94309cfc124',
  license: 'CC BY 4.0',
  attribution: 'MACULA Hebrew Linguistic Datasets, available at https://github.com/Clear-Bible/macula-hebrew/',
  cherithAttribution: 'Cherith Glosses for the Hebrew Old Testament, by Andi Wu, Copyright (C) 2022 by Cherith Analytics.',
  stepBibleRepository: 'https://github.com/STEPBible/STEPBible-Data',
  stepBibleCommit: 'b86d26cdb1f51729e73b5b4eb7f7ccadc5dfba39'
};
const BOOK_CODE_BY_ID = {
  genesis: 'GEN', exodus: 'EXO', leviticus: 'LEV', numbers: 'NUM', deuteronomy: 'DEU',
  joshua: 'JOS', judges: 'JDG', ruth: 'RUT', '1samuel': '1SA', '2samuel': '2SA',
  '1kings': '1KI', '2kings': '2KI', '1chronicles': '1CH', '2chronicles': '2CH',
  ezra: 'EZR', nehemiah: 'NEH', esther: 'EST', job: 'JOB', psalms: 'PSA',
  proverbs: 'PRO', ecclesiastes: 'ECC', songofsolomon: 'SNG', isaiah: 'ISA',
  jeremiah: 'JER', lamentations: 'LAM', ezekiel: 'EZK', daniel: 'DAN', hosea: 'HOS',
  joel: 'JOL', amos: 'AMO', obadiah: 'OBA', jonah: 'JON', micah: 'MIC',
  nahum: 'NAM', habakkuk: 'HAB', zephaniah: 'ZEP', haggai: 'HAG',
  zechariah: 'ZEC', malachi: 'MAL'
};
const BOOK_ID_BY_CODE = Object.fromEntries(Object.entries(BOOK_CODE_BY_ID).map(([id, code]) => [code, id]));
const SOURCE_FILE_BY_ID = Object.fromEntries(Object.values(BOOKS).map(book => [book.id, book.sourceFile]));
const REQUIRED_TSV_COLUMNS = ['xml:id', 'ref', 'class', 'text', 'after', 'english', 'morph', 'lemma'];
const TOKEN_FIELDS = [
  'tokenIndex', 'id', 'surface', 'unpointed', 'lemma', 'morphology', 'gloss', 'glossStatus',
  'sourceRowIds', 'readerSourceId', 'alignment', 'qereKetiv', 'variantGroup', 'variantTokenIds',
  'segmentation', 'segments', 'maqqefAfter', 'punctuationAfter'
];
const SEGMENT_FIELDS = ['sourceRowId', 'surface', 'lemma', 'morphology', 'gloss', 'class'];

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    maculaTsv: '',
    readerRoot: path.join(ROOT, 'data', 'hebrew'),
    oshbRoot: path.join(ROOT, 'data', 'source', 'morphhb-wlc'),
    outputRoot: path.join(ROOT, 'data', 'hebrew-interlinear')
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--macula-tsv') options.maculaTsv = path.resolve(argv[++index]);
    else if (arg === '--reader-root') options.readerRoot = path.resolve(argv[++index]);
    else if (arg === '--oshb-root') options.oshbRoot = path.resolve(argv[++index]);
    else if (arg === '--output-root') options.outputRoot = path.resolve(argv[++index]);
    else if (arg === '--help') options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function sha256File(filePath) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
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

function unpointedHebrew(value) {
  return String(value || '').normalize('NFD').replace(/[\u0591-\u05BD\u05BF-\u05C7]/g, '').normalize('NFC');
}

function compactWhitespace(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function stableTokenId(book, chapter, verse, tokenIndex) {
  return `${book}.${chapter}.${verse}.${tokenIndex}`;
}

function writeJson(filePath, value, pretty = false) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const json = pretty ? JSON.stringify(value, null, 2) : JSON.stringify(value);
  fs.writeFileSync(filePath, `${json}\n`);
}

function parseMaculaReference(reference) {
  const match = String(reference || '').match(/^(\S+) (\d+):(\d+)!(\d+)$/);
  if (!match || !BOOK_ID_BY_CODE[match[1]]) throw new Error(`Malformed or unsupported MACULA reference: ${reference}`);
  return {
    bookCode: match[1],
    book: BOOK_ID_BY_CODE[match[1]],
    chapter: Number(match[2]),
    verse: Number(match[3]),
    word: Number(match[4])
  };
}

async function loadMaculaGroups(tsvPath) {
  if (!tsvPath || !fs.existsSync(tsvPath)) {
    throw new Error('Pass --macula-tsv pointing to the exact MACULA WLC/tsv/macula-hebrew.tsv source file.');
  }
  const actualHash = sha256File(tsvPath);
  if (actualHash !== UPSTREAM.tsvSha256) {
    throw new Error(`MACULA TSV hash mismatch. Expected ${UPSTREAM.tsvSha256}; received ${actualHash}.`);
  }
  const groupsByVerse = new Map();
  let headers = null;
  let rowCount = 0;
  const lines = readline.createInterface({ input: fs.createReadStream(tsvPath), crlfDelay: Infinity });
  for await (const line of lines) {
    if (!headers) {
      headers = line.split('\t');
      const missing = REQUIRED_TSV_COLUMNS.filter(column => !headers.includes(column));
      if (missing.length) throw new Error(`MACULA TSV is missing required columns: ${missing.join(', ')}`);
      continue;
    }
    if (!line) continue;
    const values = line.split('\t');
    if (values.length !== headers.length) {
      throw new Error(`Malformed MACULA row ${rowCount + 2}: expected ${headers.length} columns; received ${values.length}.`);
    }
    const source = Object.fromEntries(headers.map((header, index) => [header, values[index]]));
    const reference = parseMaculaReference(source.ref);
    const verseKey = `${reference.book}.${reference.chapter}.${reference.verse}`;
    if (!groupsByVerse.has(verseKey)) groupsByVerse.set(verseKey, []);
    const groups = groupsByVerse.get(verseKey);
    let group = groups.at(-1);
    if (!group || group.ref !== source.ref) {
      group = { ref: source.ref, word: reference.word, rows: [] };
      groups.push(group);
    }
    group.rows.push({
      sourceRowId: source['xml:id'],
      surface: source.text,
      lemma: source.lemma,
      morphology: source.morph,
      gloss: compactWhitespace(source.english),
      class: source.class,
      after: source.after
    });
    rowCount += 1;
  }
  if (!headers || !rowCount) throw new Error('MACULA TSV contains no data rows.');
  return { groupsByVerse, rowCount, sha256: actualHash };
}

function parseOshbVerseWords(content) {
  const words = [];
  let qereGroup = '';
  let pendingVariantGroup = '';
  let variantNumber = 0;
  const readingStack = [];
  const events = /<rdg\b([^>]*)>|<\/rdg>|<w\b([^>]*)>([\s\S]*?)<\/w>/g;
  for (const match of content.matchAll(events)) {
    if (match[0].startsWith('<rdg')) {
      const isQere = attrValue(match[1], 'type') === 'x-qere';
      readingStack.push(isQere);
      if (isQere) qereGroup = pendingVariantGroup;
      continue;
    }
    if (match[0] === '</rdg>') {
      if (readingStack.pop()) {
        qereGroup = '';
        pendingVariantGroup = '';
      }
      continue;
    }
    const attrs = match[2];
    const type = attrValue(attrs, 'type');
    if (type === 'x-ketiv') {
      if (!pendingVariantGroup) {
        variantNumber += 1;
        pendingVariantGroup = `variant-${variantNumber}`;
      }
    }
    words.push({
      surface: cleanSurface(match[3]),
      sourceId: attrValue(attrs, 'id'),
      status: type === 'x-ketiv' ? 'ketiv' : (qereGroup ? 'qere' : 'none'),
      variantGroup: type === 'x-ketiv' ? pendingVariantGroup : qereGroup
    });
  }
  return words;
}

function loadOshbWordsByVerse(oshbRoot, book) {
  const sourceFile = SOURCE_FILE_BY_ID[book];
  if (!sourceFile) throw new Error(`No OSHB source file is configured for ${book}.`);
  const filePath = path.join(oshbRoot, sourceFile);
  if (!fs.existsSync(filePath)) throw new Error(`Missing OSHB alignment source: ${filePath}`);
  const xml = fs.readFileSync(filePath, 'utf8');
  const wordsByVerse = new Map();
  const verseRe = /<verse\b[^>]*osisID="[^"]+\.(\d+)\.(\d+)"[^>]*>([\s\S]*?)<\/verse>/g;
  for (const match of xml.matchAll(verseRe)) {
    wordsByVerse.set(`${Number(match[1])}.${Number(match[2])}`, parseOshbVerseWords(match[3]));
  }
  return { filePath, wordsByVerse };
}

function alignReaderAndMacula(readerTokens, groups) {
  const matrix = Array.from({ length: readerTokens.length + 1 }, () => Array(groups.length + 1).fill(0));
  for (let readerIndex = readerTokens.length - 1; readerIndex >= 0; readerIndex -= 1) {
    for (let sourceIndex = groups.length - 1; sourceIndex >= 0; sourceIndex -= 1) {
      const sourceSurface = groups[sourceIndex].rows.map(row => row.surface).join('');
      matrix[readerIndex][sourceIndex] = readerTokens[readerIndex].surface === sourceSurface
        ? 1 + matrix[readerIndex + 1][sourceIndex + 1]
        : Math.max(matrix[readerIndex + 1][sourceIndex], matrix[readerIndex][sourceIndex + 1]);
    }
  }
  const aligned = [];
  let readerIndex = 0;
  let sourceIndex = 0;
  while (readerIndex < readerTokens.length && sourceIndex < groups.length) {
    const sourceSurface = groups[sourceIndex].rows.map(row => row.surface).join('');
    if (readerTokens[readerIndex].surface === sourceSurface) {
      aligned.push({ readerIndex, sourceIndex, status: 'exact' });
      readerIndex += 1;
      sourceIndex += 1;
    } else if (matrix[readerIndex + 1][sourceIndex] >= matrix[readerIndex][sourceIndex + 1]) {
      aligned.push({ readerIndex, sourceIndex: null, status: 'reader-only' });
      readerIndex += 1;
    } else {
      aligned.push({ readerIndex: null, sourceIndex, status: 'source-only' });
      sourceIndex += 1;
    }
  }
  while (readerIndex < readerTokens.length) aligned.push({ readerIndex: readerIndex++, sourceIndex: null, status: 'reader-only' });
  while (sourceIndex < groups.length) aligned.push({ readerIndex: null, sourceIndex: sourceIndex++, status: 'source-only' });
  return aligned;
}

function punctuationMetadata(after) {
  const supplied = String(after || '');
  return {
    maqqefAfter: supplied.includes('־'),
    punctuationAfter: supplied.replace(/[\s־]/g, '')
  };
}

function segmentRecord(row) {
  return {
    sourceRowId: row.sourceRowId,
    surface: row.surface,
    lemma: row.lemma,
    morphology: row.morphology,
    gloss: row.gloss,
    class: row.class
  };
}

function encodeSegment(segment) {
  return SEGMENT_FIELDS.map(field => segment[field] ?? '');
}

function encodeToken(record) {
  return TOKEN_FIELDS.map(field => {
    if (field === 'segments') return record.segments.map(encodeSegment);
    if (field === 'variantTokenIds') return record.variantTokenIds || [];
    return record[field] ?? '';
  });
}

function buildTokenRecord({ book, chapter, verse, readerToken, readerIndex, oshbWord, group }) {
  const tokenIndex = readerIndex + 1;
  const id = stableTokenId(book, chapter, verse, tokenIndex);
  const segments = group ? group.rows.map(segmentRecord) : [];
  const gloss = compactWhitespace(segments.map(segment => segment.gloss).filter(Boolean).join(' '));
  const sourceAfter = group?.rows.at(-1)?.after || '';
  const punctuation = punctuationMetadata(sourceAfter);
  return {
    book,
    chapter,
    verse,
    tokenIndex,
    id,
    surface: readerToken.surface,
    unpointed: unpointedHebrew(readerToken.surface),
    lemma: readerToken.sourceLemma || readerToken.lemma || '',
    morphology: readerToken.parse || '',
    gloss,
    glossStatus: gloss && oshbWord.status !== 'ketiv' ? 'source' : 'missing',
    sourceRowIds: group ? group.rows.map(row => row.sourceRowId) : [],
    readerSourceId: oshbWord.sourceId,
    alignment: group ? 'exact' : 'qere-ketiv-resolved',
    qereKetiv: oshbWord.status,
    variantGroup: oshbWord.variantGroup,
    segmentation: segments.length > 1 ? 'combined' : 'single',
    segments,
    maqqefAfter: punctuation.maqqefAfter,
    punctuationAfter: punctuation.punctuationAfter
  };
}

function connectVariantRecords(records) {
  const groups = new Map();
  records.forEach(record => {
    if (!record.variantGroup) return;
    if (!groups.has(record.variantGroup)) groups.set(record.variantGroup, []);
    groups.get(record.variantGroup).push(record);
  });
  for (const variants of groups.values()) {
    const sourceRowIds = [...new Set(variants.flatMap(record => record.sourceRowIds))];
    variants.forEach(record => {
      record.variantTokenIds = variants.filter(other => other.id !== record.id).map(other => other.id);
      if (record.qereKetiv === 'ketiv') record.sourceRowIds = sourceRowIds;
    });
  }
}

function blankBookAudit(book) {
  return {
    book,
    verses: 0,
    readerTokens: 0,
    exactAlignments: 0,
    normalizedAlignments: 0,
    structurallyCombined: 0,
    structurallySplit: 0,
    qereKetivTokens: 0,
    punctuationOnly: 0,
    missingGlosses: 0,
    unresolvedTokens: 0,
    alignedVerses: 0,
    coveragePercent: 0
  };
}

function addAuditRecord(audit, bookAudit, record) {
  audit.totalReaderTokens += 1;
  bookAudit.readerTokens += 1;
  if (record.alignment === 'exact') {
    audit.exactAlignments += 1;
    bookAudit.exactAlignments += 1;
  }
  if (record.segmentation === 'combined') {
    audit.structurallyCombined += 1;
    bookAudit.structurallyCombined += 1;
  }
  if (record.qereKetiv !== 'none') {
    audit.qereKetivTokens += 1;
    bookAudit.qereKetivTokens += 1;
  }
  if (record.glossStatus === 'missing') {
    audit.missingGlosses += 1;
    bookAudit.missingGlosses += 1;
  }
  if (record.maqqefAfter) audit.maqqefRelationships += 1;
  if (record.punctuationAfter) audit.punctuationRelationships += 1;
}

function addMismatchSamples(audit, record) {
  const categories = [];
  if (record.segmentation === 'combined') categories.push('structurally-combined');
  if (record.qereKetiv !== 'none') categories.push('qere-ketiv');
  if (record.glossStatus === 'missing') categories.push('missing-gloss');
  categories.forEach(category => {
    if (audit.mismatchSamples.filter(sample => sample.category === category).length >= 3) return;
    audit.mismatchSamples.push({
      category,
      tokenId: record.id,
      surface: record.surface,
      alignment: record.alignment,
      qereKetiv: record.qereKetiv,
      segmentation: record.segmentation,
      glossStatus: record.glossStatus,
      sourceRowIds: record.sourceRowIds
    });
  });
}

function initialAudit(rowCount) {
  return {
    schemaVersion: SCHEMA_VERSION,
    upstreamCommit: UPSTREAM.commit,
    sourceRows: rowCount,
    canonicalBooks: 0,
    canonicalChapters: 0,
    canonicalVerses: 0,
    totalReaderTokens: 0,
    exactAlignments: 0,
    normalizedAlignments: 0,
    structurallyCombined: 0,
    structurallySplit: 0,
    qereKetivTokens: 0,
    qereKetivVariants: 0,
    punctuationOnly: 0,
    missingGlosses: 0,
    unresolvedTokens: 0,
    maqqefRelationships: 0,
    punctuationRelationships: 0,
    tokenCoveragePercent: 0,
    verseCoveragePercent: 0,
    books: [],
    mismatchSamples: []
  };
}

async function generate(options) {
  const readerManifestPath = path.join(options.readerRoot, 'manifest.json');
  if (!fs.existsSync(readerManifestPath)) throw new Error(`Missing Hebrew Reader manifest: ${readerManifestPath}`);
  const readerManifest = JSON.parse(fs.readFileSync(readerManifestPath, 'utf8'));
  const macula = await loadMaculaGroups(options.maculaTsv);
  const audit = initialAudit(macula.rowCount);
  const oshbSources = [];
  const generatedFiles = [];
  const seenTokenIds = new Set();
  const seenVerses = new Set();
  const outputBooks = [];

  for (const bookInfo of readerManifest.books || []) {
    const book = bookInfo.id;
    const code = BOOK_CODE_BY_ID[book];
    if (!code) throw new Error(`No MACULA book code is configured for Reader book ${book}.`);
    const oshb = loadOshbWordsByVerse(options.oshbRoot, book);
    oshbSources.push({
      path: path.relative(ROOT, oshb.filePath),
      sha256: sha256File(oshb.filePath)
    });
    const bookAudit = blankBookAudit(book);
    const outputBook = { id: book, name: bookInfo.name, chapters: [] };

    for (const chapter of bookInfo.chapters || []) {
      const readerPath = path.join(options.readerRoot, book, `${chapter}.json`);
      if (!fs.existsSync(readerPath)) throw new Error(`Missing Hebrew Reader chapter: ${readerPath}`);
      const readerChapter = JSON.parse(fs.readFileSync(readerPath, 'utf8'));
      const outputChapter = {
        schemaVersion: SCHEMA_VERSION,
        upstreamCommit: UPSTREAM.commit,
        book,
        chapter: Number(chapter),
        tokenFields: TOKEN_FIELDS,
        segmentFields: SEGMENT_FIELDS,
        verses: []
      };

      for (const readerVerse of readerChapter.verses || []) {
        const verse = Number(readerVerse.verse);
        const verseKey = `${book}.${chapter}.${verse}`;
        const groups = macula.groupsByVerse.get(verseKey);
        const oshbWords = oshb.wordsByVerse.get(`${chapter}.${verse}`);
        if (!groups) throw new Error(`MACULA is missing canonical Reader verse ${verseKey}.`);
        if (!oshbWords) throw new Error(`OSHB alignment source is missing canonical Reader verse ${verseKey}.`);
        if (oshbWords.length !== readerVerse.tokens.length) {
          throw new Error(`OSHB/Reader token-count mismatch at ${verseKey}: ${oshbWords.length} versus ${readerVerse.tokens.length}.`);
        }
        readerVerse.tokens.forEach((token, index) => {
          if (token.surface !== oshbWords[index].surface) {
            throw new Error(`OSHB/Reader surface mismatch at ${verseKey}.${index + 1}: ${token.surface} versus ${oshbWords[index].surface}.`);
          }
        });
        const aligned = alignReaderAndMacula(readerVerse.tokens, groups);
        const sourceOnly = aligned.filter(item => item.status === 'source-only');
        if (sourceOnly.length) {
          throw new Error(`MACULA contains ${sourceOnly.length} unaligned lexical token(s) at ${verseKey}.`);
        }
        const records = [];
        for (const item of aligned) {
          if (item.readerIndex === null) continue;
          const oshbWord = oshbWords[item.readerIndex];
          if (item.status === 'reader-only' && oshbWord.status !== 'ketiv') {
            throw new Error(`Unresolved non-ketiv Reader token at ${verseKey}.${item.readerIndex + 1}: ${readerVerse.tokens[item.readerIndex].surface}`);
          }
          const record = buildTokenRecord({
            book,
            chapter: Number(chapter),
            verse,
            readerToken: readerVerse.tokens[item.readerIndex],
            readerIndex: item.readerIndex,
            oshbWord,
            group: item.sourceIndex === null ? null : groups[item.sourceIndex]
          });
          if (seenTokenIds.has(record.id)) throw new Error(`Duplicate stable token ID: ${record.id}`);
          seenTokenIds.add(record.id);
          records.push(record);
        }
        connectVariantRecords(records);
        records.forEach(record => {
          addAuditRecord(audit, bookAudit, record);
          addMismatchSamples(audit, record);
        });
        const variantGroups = new Set(records.filter(record => record.variantGroup).map(record => record.variantGroup));
        audit.qereKetivVariants += variantGroups.size;
        outputChapter.verses.push({ verse, tokens: records.map(encodeToken) });
        seenVerses.add(verseKey);
        audit.canonicalVerses += 1;
        bookAudit.verses += 1;
        bookAudit.alignedVerses += 1;
      }

      const outputPath = path.join(options.outputRoot, book, `${chapter}.json`);
      writeJson(outputPath, outputChapter);
      generatedFiles.push(outputPath);
      outputBook.chapters.push(Number(chapter));
      audit.canonicalChapters += 1;
    }

    bookAudit.coveragePercent = bookAudit.readerTokens
      ? Number((((bookAudit.exactAlignments + bookAudit.qereKetivTokens - bookAudit.qereKetivTokens / 2) / bookAudit.readerTokens) * 100).toFixed(6))
      : 0;
    audit.books.push(bookAudit);
    outputBooks.push(outputBook);
    audit.canonicalBooks += 1;
  }

  const extraVerses = [...macula.groupsByVerse.keys()].filter(key => !seenVerses.has(key));
  if (extraVerses.length) throw new Error(`MACULA contains ${extraVerses.length} canonical verses not found in the Reader; first: ${extraVerses[0]}.`);
  const resolvedTokens = audit.totalReaderTokens - audit.unresolvedTokens;
  audit.tokenCoveragePercent = Number(((resolvedTokens / audit.totalReaderTokens) * 100).toFixed(6));
  audit.verseCoveragePercent = Number(((audit.canonicalVerses / macula.groupsByVerse.size) * 100).toFixed(6));
  audit.books.forEach(bookAudit => {
    bookAudit.coveragePercent = Number((((bookAudit.readerTokens - bookAudit.unresolvedTokens) / bookAudit.readerTokens) * 100).toFixed(6));
  });

  const manifestPath = path.join(options.outputRoot, 'manifest.json');
  const auditPath = path.join(options.outputRoot, 'alignment-audit.json');
  writeJson(manifestPath, {
    schemaVersion: SCHEMA_VERSION,
    language: 'hebrew',
    source: 'MACULA Hebrew WLC word data with Cherith occurrence glosses',
    upstreamCommit: UPSTREAM.commit,
    books: outputBooks
  }, true);
  writeJson(auditPath, audit, true);
  generatedFiles.push(manifestPath, auditPath);

  const generatedHashes = generatedFiles
    .map(filePath => ({ path: path.relative(ROOT, filePath), sha256: sha256File(filePath), bytes: fs.statSync(filePath).size }))
    .sort((left, right) => left.path.localeCompare(right.path));
  const sourceManifestPath = path.join(options.outputRoot, 'source-manifest.json');
  writeJson(sourceManifestPath, {
    schemaVersion: SCHEMA_VERSION,
    sourceRepository: UPSTREAM.repository,
    sourceCommit: UPSTREAM.commit,
    retrievalDate: UPSTREAM.retrievalDate,
    sourceFiles: [{
      path: UPSTREAM.tsvPath,
      sha256: macula.sha256,
      rows: macula.rowCount
    }],
    alignmentSources: oshbSources.sort((left, right) => left.path.localeCompare(right.path)),
    licenses: [{
      dataset: 'MACULA Hebrew Linguistic Datasets',
      license: UPSTREAM.license,
      attribution: UPSTREAM.attribution
    }, {
      dataset: 'Cherith Glosses for the Hebrew Old Testament',
      license: UPSTREAM.license,
      attribution: UPSTREAM.cherithAttribution
    }],
    secondaryVerification: {
      repository: UPSTREAM.stepBibleRepository,
      commit: UPSTREAM.stepBibleCommit,
      importedFields: []
    },
    importedFields: ['xml:id', 'ref', 'class', 'text', 'after', 'english', 'morph', 'lemma'],
    normalization: [
      'TSV field whitespace in the English occurrence gloss is collapsed to single spaces.',
      'MACULA morph rows sharing one ref are retained as ordered segments and joined only for the concise display gloss.',
      'Unpointed Hebrew is derived by removing Hebrew combining marks from the unchanged Reader surface.',
      'Reader surface, lemma expression, and morphology are copied without linguistic alteration.'
    ],
    chapterEncoding: {
      tokenFields: TOKEN_FIELDS,
      segmentFields: SEGMENT_FIELDS,
      note: 'Chapter token and segment arrays use these ordered field maps; the chapter and verse containers supply canonical location fields.'
    },
    generatedFiles: generatedHashes
  }, true);

  return { audit, outputRoot: options.outputRoot, sourceManifestPath };
}

async function main() {
  const options = parseArgs();
  if (options.help) {
    console.log('Usage: node scripts/generate-hebrew-interlinear-data.js --macula-tsv /path/to/macula-hebrew.tsv [--reader-root data/hebrew] [--oshb-root data/source/morphhb-wlc] [--output-root data/hebrew-interlinear]');
    return;
  }
  const result = await generate(options);
  console.log(`Generated Hebrew interlinear data for ${result.audit.totalReaderTokens} Reader tokens.`);
  console.log(`Exact MACULA alignments: ${result.audit.exactAlignments}; qere/ketiv tokens: ${result.audit.qereKetivTokens}; unresolved: ${result.audit.unresolvedTokens}.`);
}

if (require.main === module) {
  main().catch(error => {
    console.error(error.message || error);
    process.exitCode = 1;
  });
}

module.exports = {
  SCHEMA_VERSION,
  UPSTREAM,
  BOOK_CODE_BY_ID,
  parseArgs,
  parseMaculaReference,
  parseOshbVerseWords,
  unpointedHebrew,
  stableTokenId,
  alignReaderAndMacula,
  punctuationMetadata,
  TOKEN_FIELDS,
  SEGMENT_FIELDS,
  encodeToken,
  generate
};
