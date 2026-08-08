const test = require('node:test');
const assert = require('node:assert/strict');
const { validateSourceLedger } = require('../scripts/validate-source-ledger');

test('source ledger pins imported and verification-only gloss provenance', () => {
  assert.deepEqual(validateSourceLedger(), []);
});
