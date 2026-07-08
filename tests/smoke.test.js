const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');

test('smoke: app shell loads required views and controls', () => {
  ['app', 'listView', 'flashView', 'parsingView', 'dashboardView', 'progressView', 'progressShell', 'settingsView', 'globalSearchView', 'globalSearchShell', 'wordPageView', 'learnView', 'learnShell', 'onboardingView', 'onboardingShell'].forEach(id => {
    assert.match(html, new RegExp(`id="${id}"`));
  });
});

test('smoke: global language toggle is removed and word list controls are present', () => {
  assert.doesNotMatch(html, /class="lang-toggle"/);
  assert.doesNotMatch(html, /id="btnGreek"|id="btnHebrew"/);
  assert.doesNotMatch(html, /id="dueBadge"|id="streakBadge"/);
  assert.doesNotMatch(html, /class="topbar-right"/);
  assert.match(html, /id="wordsTbody"/);
});

test('smoke: flashcards, parsing, dashboard, settings, and import/export controls are present', () => {
  ['startFlashBtn', 'fcFlipToBack', 'startParsing', 'parsingSubmit', 'statsGrid', 'openSettings', 'openGlobalSearch', 'wordPageShell', 'exportData', 'importData', 'restartOnboarding'].forEach(id => {
    assert.match(html, new RegExp(`id="${id}"`));
  });
});

test('smoke: dynamic Word Page shell is present', () => {
  assert.match(html, /id="wordPageShell"/);
  assert.doesNotMatch(html, /<dt>Gloss<\/dt>\s*<dd>word<\/dd>/);
  assert.doesNotMatch(html, /<dt>Frequency<\/dt>\s*<dd>330×<\/dd>/);
});

test('smoke: Learn shell and primary navigation are present', () => {
  assert.match(html, /data-view="learn">Learn<\/button>/);
  assert.match(html, /id="learnView"/);
  assert.match(html, /id="learnShell"/);
});

test('smoke: Progress shell and primary navigation are present', () => {
  assert.match(html, /data-view="progress">Progress<\/button>/);
  assert.match(html, /id="progressView"/);
  assert.match(html, /id="progressShell"/);
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
