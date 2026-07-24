const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

function loadPreferences(store = new Map()){
  global.readStorageJson = (key, fallback = null) => store.has(key) ? JSON.parse(store.get(key)) : fallback;
  global.writeStorageJson = (key, value) => store.set(key, JSON.stringify(value));
  const path = require.resolve('../src/core/reader-preferences');
  delete require.cache[path];
  return require(path);
}

test('Reader mode defaults to Continuous and preserves valid stored values', () => {
  const store = new Map();
  const preferences = loadPreferences(store);
  assert.equal(preferences.readMode(), 'continuous');

  store.set('pp_reader_location', JSON.stringify({ language: 'greek', book: 'john', chapter: 3, mode: 'continuous' }));
  assert.equal(preferences.readMode(), 'continuous');

  store.set('pp_reader_location', JSON.stringify({ language: 'greek', book: 'john', chapter: 3, mode: 'chapter' }));
  assert.equal(preferences.readMode(), 'chapter');

  store.set('pp_reader_location', JSON.stringify({ language: 'greek', book: 'john', chapter: 3, mode: 'legacy-invalid' }));
  assert.equal(preferences.readMode(), 'continuous');
});

test('Reader mode writes reuse pp_reader_location without losing the saved place', () => {
  const store = new Map([[
    'pp_reader_location',
    JSON.stringify({ language: 'hebrew', book: 'psalms', chapter: 23, mode: 'chapter', verse: '4', anchorOffset: 72, scrollTop: 900 })
  ]]);
  const preferences = loadPreferences(store);
  assert.equal(preferences.writeMode('continuous'), 'continuous');
  assert.deepEqual(JSON.parse(store.get('pp_reader_location')), {
    language: 'hebrew',
    book: 'psalms',
    chapter: 23,
    mode: 'continuous',
    verse: '4',
    anchorOffset: 72,
    scrollTop: 900
  });
  assert.equal(store.size, 1);
});

test('Settings exposes one canonical accessible Reader mode choice and Reader links to it', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  const reader = fs.readFileSync('src/features/reader/index.js', 'utf8');
  const settings = fs.readFileSync('src/features/settings/events.js', 'utf8');
  assert.match(html, /id="reader-settings"[\s\S]*<legend class="settings-label">Reading mode<\/legend>/);
  assert.match(html, /type="radio" name="readerReadingMode" value="continuous"/);
  assert.match(html, /type="radio" name="readerReadingMode" value="chapter"/);
  assert.match(html, /One chapter at a time/);
  assert.match(reader, /id="readerOptionsBtn"[^>]*>Reader options<\/button>/);
  assert.doesNotMatch(reader, /data-reader-mode=/);
  assert.match(settings, /PuritanReaderPreferences\.writeMode\(mode\)/);
});
