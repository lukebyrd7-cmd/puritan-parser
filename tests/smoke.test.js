const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');

test('smoke: app shell loads required views and controls', () => {
  ['app', 'listView', 'flashView', 'parsingView', 'dashboardView', 'settingsView', 'wordPageView'].forEach(id => {
    assert.match(html, new RegExp(`id="${id}"`));
  });
});

test('smoke: Greek/Hebrew switching and word list controls are present', () => {
  assert.match(html, /data-lang="greek"/);
  assert.match(html, /data-lang="hebrew"/);
  assert.match(html, /id="wordsTbody"/);
});

test('smoke: flashcards, parsing, dashboard, settings, and import/export controls are present', () => {
  ['startFlashBtn', 'fcFlipToBack', 'startParsing', 'parsingSubmit', 'statsGrid', 'openSettings', 'wordPageBackToReader', 'exportData', 'importData'].forEach(id => {
    assert.match(html, new RegExp(`id="${id}"`));
  });
});

test('smoke: static Word Page content is present', () => {
  assert.match(html, /λόγος/);
  assert.match(html, /word/);
  assert.match(html, /330×/);
  assert.match(html, /Back to Reader/);
});

test('smoke: service worker precaches every startup module from src/main.js', () => {
  const main = fs.readFileSync('src/main.js', 'utf8');
  const sw = fs.readFileSync('sw.js', 'utf8');
  const startupScripts = [...main.matchAll(/'([^']+\.js)'/g)].map(match => `./${match[1]}`);
  const missing = startupScripts.filter(script => !sw.includes(`'${script}'`));
  assert.deepEqual(missing, []);
});

test('smoke: service worker keeps large JSON out of the install precache', () => {
  const sw = fs.readFileSync('sw.js', 'utf8');
  assert.doesNotMatch(sw, /'\.\/vocab_all\.json'/);
  assert.match(sw, /url\.pathname\.endsWith\('\.json'\)/);
  assert.match(sw, /cache\.put\(evt\.request, copy\)/);
});

test('smoke: Vercel rewrites deep links to the app shell', () => {
  const vercel = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
  assert.deepEqual(vercel.rewrites, [{ source: '/(.*)', destination: '/index.html' }]);
});

test('smoke: local dev server uses app-shell fallback for routes', () => {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  assert.equal(pkg.scripts.dev, 'serve -s .');
});
