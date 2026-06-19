const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const metadata = require('../src/core/content/content-metadata');
const loader = require('../src/core/content/content-loader');

const manifest = JSON.parse(fs.readFileSync('data/metadata/content-manifest.json', 'utf8'));

test('content manifest items are valid lightweight metadata records', () => {
  const normalized = metadata.normalizeContentManifest(manifest);
  assert.equal(normalized.schemaVersion, 1);
  assert.ok(normalized.items.length >= 6);
  for (const item of normalized.items) {
    const result = metadata.validateContentMetadata(item);
    assert.deepEqual(result.errors, [], `${item.id}: ${result.errors.join(', ')}`);
  }
});

test('content loader resolves safe paths and rejects traversal', () => {
  assert.equal(loader.resolveContentPath('data/bible/greek/books/{book}.json', { book: 'John' }), 'data/bible/greek/books/john.json');
  assert.throws(() => loader.resolveContentPath('../secret.json'), /Unsafe content path/);
  assert.throws(() => loader.resolveContentPath('/absolute.json'), /Unsafe content path/);
});

test('content metadata can be read by id from injected manifest fetcher', async () => {
  const item = await loader.getContentMetadata('future-greek-bible', { force: true, fetchJson: async () => manifest });
  assert.equal(item.language, 'greek');
  assert.equal(item.loadStrategy, 'lazy');
  assert.match(item.attribution, /copyrighted Bible text/);
});

test('missing content id returns null instead of throwing', async () => {
  const item = await loader.getContentMetadata('missing-content', { force: true, fetchJson: async () => manifest });
  assert.equal(item, null);
});
