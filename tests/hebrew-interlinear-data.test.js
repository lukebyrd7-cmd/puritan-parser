const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const DATA_ROOT = path.join(ROOT, 'data', 'hebrew-interlinear');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function decode(fields, values) {
  assert.equal(values.length, fields.length);
  return Object.fromEntries(fields.map((field, index) => [field, values[index]]));
}

test('Hebrew interlinear source manifest records exact licensed provenance and generated hashes', () => {
  const source = readJson(path.join(DATA_ROOT, 'source-manifest.json'));
  assert.equal(source.schemaVersion, 1);
  assert.equal(source.sourceRepository, 'https://github.com/Clear-Bible/macula-hebrew');
  assert.equal(source.sourceCommit, '47db250bd55d0d8577f2a94fba114ef16c35b23c');
  assert.equal(source.retrievalDate, '2026-07-24');
  assert.equal(source.sourceFiles[0].path, 'WLC/tsv/macula-hebrew.tsv');
  assert.equal(source.sourceFiles[0].sha256, '965cb0599beed2fe31283b615bcc369178141c0e718a66d97518d94309cfc124');
  assert.equal(source.sourceFiles[0].rows, 475911);
  assert.equal(source.secondaryVerification.repository, 'https://github.com/STEPBible/STEPBible-Data');
  assert.equal(source.secondaryVerification.commit, 'b86d26cdb1f51729e73b5b4eb7f7ccadc5dfba39');
  assert.deepEqual(source.secondaryVerification.importedFields, []);
  assert.ok(source.licenses.every(item => item.license === 'CC BY 4.0'));
  assert.match(source.licenses.find(item => item.dataset.includes('MACULA')).attribution, /MACULA Hebrew Linguistic Datasets/);
  assert.match(source.licenses.find(item => item.dataset.includes('Cherith')).attribution, /Andi Wu/);
  assert.equal(source.alignmentSources.length, 39);
  source.alignmentSources.forEach(item => assert.equal(sha256(path.join(ROOT, item.path)), item.sha256, item.path));
  source.generatedFiles.forEach(item => {
    const filePath = path.join(ROOT, item.path);
    assert.equal(fs.statSync(filePath).size, item.bytes, item.path);
    assert.equal(sha256(filePath), item.sha256, item.path);
  });
});

test('whole Hebrew interlinear corpus preserves Reader identity and has no unresolved or wrongly glossed token', () => {
  const manifest = readJson(path.join(DATA_ROOT, 'manifest.json'));
  const readerManifest = readJson(path.join(ROOT, 'data', 'hebrew', 'manifest.json'));
  const audit = readJson(path.join(DATA_ROOT, 'alignment-audit.json'));
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.upstreamCommit, audit.upstreamCommit);
  assert.deepEqual(manifest.books.map(book => book.id), readerManifest.books.map(book => book.id));

  const tokenIds = new Set();
  const variantGroups = new Set();
  let chapters = 0;
  let verses = 0;
  let tokens = 0;
  let exact = 0;
  let qereKetivResolved = 0;
  let combined = 0;
  let combinedExact = 0;
  let qereKetiv = 0;
  let qereExact = 0;
  let missingGlosses = 0;
  let missingExact = 0;
  let maqqef = 0;
  let punctuation = 0;

  for (const book of manifest.books) {
    const readerBook = readerManifest.books.find(item => item.id === book.id);
    assert.deepEqual(book.chapters, readerBook.chapters, book.id);
    for (const chapterNumber of book.chapters) {
      chapters += 1;
      const chapter = readJson(path.join(DATA_ROOT, book.id, `${chapterNumber}.json`));
      const readerChapter = readJson(path.join(ROOT, 'data', 'hebrew', book.id, `${chapterNumber}.json`));
      assert.equal(chapter.schemaVersion, 1);
      assert.equal(chapter.upstreamCommit, manifest.upstreamCommit);
      assert.equal(chapter.book, book.id);
      assert.equal(chapter.chapter, chapterNumber);
      assert.ok(chapter.tokenFields.includes('sourceRowIds'));
      assert.ok(chapter.segmentFields.includes('sourceRowId'));
      assert.deepEqual(chapter.verses.map(verse => verse.verse), readerChapter.verses.map(verse => verse.verse));

      chapter.verses.forEach((verse, verseOffset) => {
        verses += 1;
        const readerVerse = readerChapter.verses[verseOffset];
        assert.equal(verse.tokens.length, readerVerse.tokens.length, `${book.id} ${chapterNumber}:${verse.verse}`);
        verse.tokens.forEach((values, tokenOffset) => {
          tokens += 1;
          const record = decode(chapter.tokenFields, values);
          const readerToken = readerVerse.tokens[tokenOffset];
          const expectedId = `${book.id}.${chapterNumber}.${verse.verse}.${tokenOffset + 1}`;
          assert.equal(record.tokenIndex, tokenOffset + 1);
          assert.equal(record.id, expectedId);
          assert.ok(!tokenIds.has(record.id), record.id);
          tokenIds.add(record.id);
          assert.equal(record.surface, readerToken.surface, expectedId);
          assert.equal(record.lemma, readerToken.sourceLemma || readerToken.lemma || '', expectedId);
          assert.equal(record.morphology, readerToken.parse || '', expectedId);
          assert.equal(record.unpointed, record.surface.normalize('NFD').replace(/[\u0591-\u05BD\u05BF-\u05C7]/g, '').normalize('NFC'));
          assert.ok(['exact', 'qere-ketiv-resolved'].includes(record.alignment));
          assert.ok(['none', 'qere', 'ketiv'].includes(record.qereKetiv));
          assert.ok(['source', 'missing'].includes(record.glossStatus));
          const segments = record.segments.map(segment => decode(chapter.segmentFields, segment));
          assert.equal(record.segmentation, segments.length > 1 ? 'combined' : 'single');
          if (record.alignment === 'exact') exact += 1;
          if (record.alignment === 'qere-ketiv-resolved') qereKetivResolved += 1;
          if (record.segmentation === 'combined') {
            combined += 1;
            if (record.alignment === 'exact') combinedExact += 1;
          }
          if (record.qereKetiv !== 'none') {
            qereKetiv += 1;
            if (record.alignment === 'exact') qereExact += 1;
          }
          if (record.variantGroup) variantGroups.add(`${book.id}.${chapterNumber}.${verse.verse}.${record.variantGroup}`);
          if (record.glossStatus === 'source') {
            assert.ok(record.gloss);
            assert.ok(record.sourceRowIds.length > 0);
            assert.ok(segments.some(segment => segment.gloss));
          } else {
            missingGlosses += 1;
            if (record.alignment === 'exact') missingExact += 1;
            assert.equal(record.gloss, '');
          }
          if (record.alignment === 'qere-ketiv-resolved') {
            assert.equal(record.qereKetiv, 'ketiv');
            assert.equal(record.glossStatus, 'missing');
            assert.equal(record.gloss, '');
            assert.ok(record.variantTokenIds.length > 0);
            assert.ok(record.sourceRowIds.length > 0);
          }
          segments.forEach(segment => {
            assert.ok(segment.sourceRowId);
            assert.ok(segment.surface || segment.class === 'art');
            assert.ok(segment.lemma);
            assert.ok(segment.morphology);
          });
          if (record.maqqefAfter) maqqef += 1;
          if (record.punctuationAfter) punctuation += 1;
        });
      });
    }
  }

  assert.equal(chapters, audit.canonicalChapters);
  assert.equal(verses, audit.canonicalVerses);
  assert.equal(tokens, audit.totalReaderTokens);
  assert.equal(tokenIds.size, audit.totalReaderTokens);
  assert.equal(exact, audit.exactAlignments);
  assert.equal(exact + qereKetivResolved, audit.totalReaderTokens);
  assert.equal(combined, audit.structurallyCombined);
  assert.equal(qereKetiv, audit.qereKetivTokens);
  assert.equal(variantGroups.size, audit.qereKetivVariants);
  assert.equal(missingGlosses, audit.missingGlosses);
  assert.equal(maqqef, audit.maqqefRelationships);
  assert.equal(punctuation, audit.punctuationRelationships);
  assert.equal(audit.normalizedAlignments, 0);
  assert.equal(audit.structurallySplit, 0);
  assert.equal(audit.unresolvedTokens, 0);
  assert.equal(audit.tokenCoveragePercent, 100);
  assert.equal(audit.verseCoveragePercent, 100);
  assert.ok(combinedExact > 0, 'structurally combined is an overlapping property of exact token alignments');
  assert.ok(qereExact > 0, 'qere/ketiv counts overlap exact token alignments');
  assert.ok(missingExact > 0, 'missing glosses overlap successful exact token alignments');
  assert.ok(audit.qereKetivTokens > qereKetivResolved, 'qere/ketiv counts include exact qere and resolved ketiv tokens');
  assert.notEqual(
    audit.totalReaderTokens,
    audit.exactAlignments + audit.structurallyCombined + audit.qereKetivTokens + audit.missingGlosses,
    'overlapping audit categories must not be treated as additive totals'
  );
  assert.ok(audit.books.every(book => book.coveragePercent === 100 && book.unresolvedTokens === 0));
  assert.deepEqual(
    [...new Set(audit.mismatchSamples.map(sample => sample.category))].sort(),
    ['missing-gloss', 'qere-ketiv', 'structurally-combined']
  );
  audit.mismatchSamples.forEach(sample => {
    assert.ok(tokenIds.has(sample.tokenId));
    assert.ok(sample.surface);
    assert.ok(sample.sourceRowIds.length > 0);
  });
  const documentation = fs.readFileSync(path.join(ROOT, 'docs', 'hebrew-search-interlinear-audit.md'), 'utf8');
  assert.match(documentation, /overlapping properties and must not be added together/i);
  assert.match(documentation, /one orthographic Reader token can contain several ordered MACULA morpheme rows/i);
  assert.match(documentation, /missing occurrence glosses.*successfully aligned or explicitly resolved tokens/is);
});

test('service worker leaves Hebrew interlinear chapters out of startup precache and runtime-caches JSON on demand', () => {
  const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  const filesBlock = sw.match(/const FILES = \[([\s\S]*?)\];/)?.[1] || '';
  assert.doesNotMatch(filesBlock, /['"]\.\/data\/hebrew-interlinear\//);
  assert.match(sw, /if \(url\.pathname\.endsWith\('\.json'\)\)/);
  assert.match(sw, /cache\.put\(evt\.request, copy\)/);
});

test('About & Sources discloses Hebrew interlinear provenance, gloss limits, and license', () => {
  const settings = fs.readFileSync(path.join(ROOT, 'src/features/settings/index.js'), 'utf8');
  assert.match(settings, /MACULA Hebrew Linguistic Datasets/);
  assert.match(settings, /47db250bd55d0d8577f2a94fba114ef16c35b23c/);
  assert.match(settings, /Cherith occurrence-level word or morpheme glosses/);
  assert.match(settings, /can be awkward or unavailable/);
  assert.match(settings, /CC BY 4\.0/);
  assert.match(settings, /does not alter the source Hebrew or claim the glosses as a continuous translation/);
});
