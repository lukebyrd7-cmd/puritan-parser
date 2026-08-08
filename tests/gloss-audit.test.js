const test = require('node:test');
const assert = require('node:assert/strict');
const { auditGlosses, formatReport, validationErrors, materializeCanonicalGlosses, readUnavailable } = require('../scripts/gloss-audit');

test('gloss audit reports Greek and Hebrew counts', () => {
  const reports = auditGlosses([
    { lang: 'greek', id: 'gk-1', gloss: 'word', primaryGloss: 'word', alternateGlosses: ['speech'] },
    { lang: 'hebrew', id: 'hb-1', lemma: 'ראשית', gloss: 'beginning', primaryGloss: 'beginning', freq: 1000 },
    { lang: 'hebrew', id: 'hb-2', lemma: 'ברא', gloss: 'created', primaryGloss: 'created', alternateGlosses: [], freq: 50 },
    { lang: 'hebrew', id: 'hb-3', lemma: 'ארץ', gloss: '', primaryGloss: '', alternateGlosses: [], freq: 500 }
  ]);

  assert.equal(reports.greek.totalEntries, 1);
  assert.equal(reports.greek.withAlternateGlosses.length, 1);
  assert.equal(reports.hebrew.totalEntries, 3);
  assert.equal(reports.hebrew.missingGloss.length, 1);
  assert.equal(reports.hebrew.entriesWithGlosses, 2);
  assert.deepEqual(reports.hebrew.lemmaCoverage, { totalLemmas: 3, lemmasWithGlosses: 2, coveragePercent: 66.67 });
  assert.equal(reports.hebrew.frequencyBands.find(band => band.band === '1000+').lemmasWithGlosses, 1);
  assert.equal(reports.hebrew.frequencyBands.find(band => band.band === '500-999').totalLemmas, 1);

  const text = formatReport(reports);
  assert.match(text, /Greek:/);
  assert.match(text, /\* total entries: 1/);
  assert.match(text, /Hebrew:/);
  assert.match(text, /\* lemma coverage: 2\/3 \(66\.67%\)/);
  assert.match(text, /\* coverage by frequency band:/);
  assert.match(text, /\* duplicate IDs: 0/);
});

test('canonical audit merges compact sources and reports the supported unavailable Hebrew record', () => {
  const canonical = materializeCanonicalGlosses(require('../vocab_all.json'));
  const reports = auditGlosses(canonical, { unavailable: readUnavailable() });
  assert.equal(reports.greek.missingPrimaryGloss.length, 0);
  assert.equal(reports.hebrew.missingPrimaryGloss.length, 0);
  assert.deepEqual(reports.hebrew.unavailableGlosses, ['hb-28058']);
  assert.equal(reports.hebrew.lemmaCoverage.lemmasWithGlosses, 9151);
  assert.deepEqual(validationErrors(reports), []);
});

test('gloss audit fails validation errors and keeps warnings non-fatal', () => {
  const reports = auditGlosses([
    { lang: 'greek', id: '', gloss: 'ok', primaryGloss: 'ok' },
    { lang: 'greek', id: 'dup', gloss: '', primaryGloss: 'ok' },
    { lang: 'greek', id: 'dup', gloss: 'ok', primaryGloss: '' },
    { lang: 'greek', id: 'bad-alt', gloss: 'ok', primaryGloss: 'ok', alternateGlosses: 'not an array' },
    { lang: 'hebrew', id: 'warn-only', gloss: 'ok ', primaryGloss: 'this primary gloss is intentionally longer than forty characters', alternateGlosses: Array(13).fill('alt') }
  ]);

  assert.deepEqual(validationErrors(reports), [
    'greek: blank IDs (1)',
    'greek: duplicate IDs (1)',
    'greek: blank gloss (1)',
    'greek: blank primaryGloss (1)',
    'greek: alternateGlosses not arrays (1)'
  ]);
  assert.equal(reports.hebrew.suspiciouslyLongPrimaryGlosses.length, 1);
  assert.equal(reports.hebrew.unusuallyLargeAlternateGlosses.length, 1);
  assert.equal(reports.hebrew.suspiciousFormatting.length, 1);
});
