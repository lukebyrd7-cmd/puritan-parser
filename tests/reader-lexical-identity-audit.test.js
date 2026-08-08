const test = require('node:test');
const assert = require('node:assert/strict');
const { auditHebrewLexicalIdentity, formatReport } = require('../scripts/audit-reader-lexical-identity');

test('Hebrew lexical identity audit classifies structural POS differences and reports source limitations', () => {
  const report = auditHebrewLexicalIdentity();
  assert.ok(report.files >= 900);
  assert.ok(report.segmentedTokens > 100000);
  assert.ok(report.structuralPosDifferences > 0);
  assert.ok(report.unresolved.length < report.segmentedTokens * .01);
  assert.ok(Object.keys(report.patterns).some(pattern => pattern.includes('preposition prefix + noun')));
  assert.ok(Object.keys(report.patterns).some(pattern => pattern.includes('conjunction prefix + verb')));
  assert.match(formatReport(report), /Greek equivalent: none/);
});
