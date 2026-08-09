const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('styles.css', 'utf8');
const bootstrap = fs.readFileSync('src/bootstrap.js', 'utf8');

test('smoke: app shell loads required views and controls', () => {
  ['app', 'listView', 'flashView', 'parsingView', 'dashboardView', 'progressView', 'progressShell', 'settingsView', 'aboutSourcesView', 'aboutSourcesShell', 'globalSearchView', 'globalSearchShell', 'wordPageView', 'learnView', 'learnShell', 'onboardingView', 'onboardingShell'].forEach(id => {
    assert.match(html, new RegExp(`id="${id}"`));
  });
});

test('smoke: startup hides legacy views behind a neutral loading shell', () => {
  assert.match(html, /id="appLoadingStatus"[^>]*role="status"/);
  assert.match(css, /html:not\(\.app-ready\):not\(\.app-load-failed\) \.app \{ visibility: hidden; \}/);
  assert.match(fs.readFileSync('src/main.js', 'utf8'), /PuritanStartupUI\?\.ready\(\)/);
  assert.doesNotMatch(html, /<script[^>]+src="app\.js/);
});

test('smoke: startup exposes delayed, recoverable, accessible states without clearing user data', () => {
  const main = fs.readFileSync('src/main.js', 'utf8');
  assert.match(html, /id="appLoadingDetail" hidden>This is taking longer than expected\./);
  assert.match(html, /id="appStartupRetry">Try again<\/button>/);
  assert.match(html, /id="appStartupHome">Open home<\/button>/);
  assert.match(html, /status\?\.setAttribute\('role', 'alert'\)/);
  assert.match(html, /appStartupRetry'\)\?\.focus\(\)/);
  assert.match(html, /Your saved work is safe\./);
  assert.match(html, /addEventListener\('error'/);
  assert.match(html, /addEventListener\('unhandledrejection'/);
  assert.match(main, /setRetry\(\(\) => startPuritanParser\(\)\.catch\(reportPuritanStartupFailure\)\)/);
  assert.doesNotMatch(`${html}\n${main}`, /localStorage\.clear|removeItem\('pp_reader_location'/);
});

test('smoke: startup retry is generation controlled and bootstrap errors propagate', () => {
  const main = fs.readFileSync('src/main.js', 'utf8');
  assert.match(main, /const generation = \+\+puritanStartupGeneration/);
  assert.match(main, /assertCurrentStartupGeneration\(generation\)/);
  assert.match(main, /await window\.runPuritanBootstrap\(generation\)/);
  assert.match(bootstrap, /appInitializationPromise = init\(\)\.catch/);
  assert.match(bootstrap, /appInitializationPromise = null/);
});

test('smoke: service-worker failure and mobile lifecycle recovery stay noncritical', () => {
  const main = fs.readFileSync('src/main.js', 'utf8');
  assert.match(main, /register\('\/sw\.js'\)[\s\S]*catch\(error => \{[\s\S]*return null/);
  assert.match(main, /addEventListener\('pageshow'/);
  assert.match(main, /event\.persisted/);
  assert.match(main, /addEventListener\('online', registerPuritanServiceWorker\)/);
  assert.doesNotMatch(main, /controllerchange[\s\S]*location\.reload/);
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

test('smoke: narrow Settings review targets use a shrink-safe responsive grid', () => {
  assert.match(html, /class="settings-review-target-grid"/);
  assert.match(css, /\.settings-review-target-grid\s*\{[\s\S]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(css, /@media \(max-width:\s*420px\)\s*\{[\s\S]*\.settings-review-target-grid\s*\{\s*grid-template-columns:\s*1fr/);
  assert.doesNotMatch(css, /\.settings[^}]*overflow-x:\s*hidden/);
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

test('smoke: Reference rendering is deferred until the Reference route opens', () => {
  const views = fs.readFileSync('src/features/vocab/index.js', 'utf8');
  assert.doesNotMatch(bootstrap, /initReferenceLibrary\s*\(/);
  assert.match(views, /viewId==='grammarView'[\s\S]*initReferenceLibrary\(\)/);
  assert.doesNotMatch(views, /target\.innerHTML\s*=\s*'<section class="panel"><p class="progress-empty" role="status">Opening…/);
  assert.match(views, /loadFeatureView\(viewId, moduleLoader\)/);
  assert.match(views, /This section could not be opened\./);
  assert.match(views, /Try again/);
});

test('smoke: startup loads only the active feature and reveals navigation before vocabulary hydration', () => {
  const main = fs.readFileSync('src/main.js', 'utf8');
  const coreBlock = main.slice(main.indexOf('const PURITAN_PARSER_CORE_SCRIPTS'), main.indexOf('const PURITAN_PARSER_FEATURE_SCRIPTS'));
  assert.doesNotMatch(coreBlock, /features\/reader\/index\.js|features\/grammar\/reference-data\.js|features\/learn\/index\.js/);
  assert.match(main, /await loadScriptGroup\(PURITAN_PARSER_CORE_SCRIPTS\)/);
  assert.match(main, /await ensurePuritanFeature\(featureForPath\(\)\)/);
  assert.match(main, /script\.async = false/);
  assert.doesNotMatch(bootstrap, /await loadData\(\)/);
  assert.match(bootstrap, /initRouter\(\)[\s\S]*scheduleNoncriticalAppDataLoad\(\)/);
  assert.match(bootstrap, /function deferAppDataLoadForInteraction/);
});

test('smoke: direct routes map to their required lazy feature bundles', () => {
  const main = fs.readFileSync('src/main.js', 'utf8');
  const appState = fs.readFileSync('src/app-state.js', 'utf8');
  assert.match(main, /clean === '\/reader' \|\| clean === '\/word'\) return 'reader'/);
  assert.match(main, /clean === '\/grammar' \|\| clean === '\/settings\/sources'\) return 'grammar'/);
  assert.match(main, /\['grammar', 'reference', 'aboutSources'\]\.includes\(normalized\)/);
  assert.match(main, /clean === '\/progress'\) return 'progress'/);
  assert.match(main, /'src\/features\/settings\/index\.js'/);
  assert.match(appState, /const FILE_ALL = '\/vocab_all\.json'/);
  assert.match(appState, /const FILE_GREEK = '\/greek_25plus\.json'/);
  assert.match(appState, /const FILE_HEBREW = '\/hebrew_60plus\.json'/);
});

test('smoke: stored theme and accent are applied before the stylesheet and module loader', () => {
  const earlyTheme = html.indexOf("localStorage.getItem('pp_prefs')");
  assert.ok(earlyTheme > 0);
  assert.ok(earlyTheme < html.indexOf('<link rel="stylesheet"'));
  assert.match(html, /stored\?\.preferences \|\| stored \|\| \{\}/);
});

test('smoke: service worker precaches every startup module from src/main.js', () => {
  const main = fs.readFileSync('src/main.js', 'utf8');
  const sw = fs.readFileSync('sw.js', 'utf8');
  const startupScripts = [...main.matchAll(/'(src\/[^']+\.js)'/g)].map(match => `./${match[1]}`);
  const missing = startupScripts.filter(script => !sw.includes(`'${script}'`));
  assert.deepEqual(missing, []);
});

test('smoke: service worker keeps large JSON out of the install precache', () => {
  const sw = fs.readFileSync('sw.js', 'utf8');
  assert.doesNotMatch(sw, /'\.\/vocab_all\.json'/);
  assert.match(sw, /url\.pathname\.endsWith\('\.json'\)/);
  assert.match(sw, /cache\.put\(evt\.request, copy\)/);
});

test('smoke: versioned startup assets cannot match an older query version', () => {
  const sw = fs.readFileSync('sw.js', 'utf8');
  assert.match(sw, /const isVersionedStartupAsset = url\.searchParams\.has\('v'\)/);
  assert.match(sw, /ignoreSearch: !isVersionedStartupAsset/);
  assert.doesNotMatch(sw, /cache\.put\([^)]*(?:404|failed)/);
});

test('smoke: Vercel rewrites deep links to the app shell', () => {
  const vercel = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
  assert.deepEqual(vercel.rewrites, [{ source: '/(.*)', destination: '/index.html' }]);
});

test('smoke: local dev server uses app-shell fallback for routes', () => {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  assert.equal(pkg.scripts.dev, 'serve -s .');
});

test('smoke: nested hard refreshes resolve startup assets from the app root', () => {
  const main = fs.readFileSync('src/main.js', 'utf8');
  const events = fs.readFileSync('src/features/settings/events.js', 'utf8');
  const sw = fs.readFileSync('sw.js', 'utf8');
  assert.match(html, /href="\/styles\.css\?v=v1\.9\.2-greek-vocabulary-audit-9"/);
  assert.match(html, /src="\/src\/main\.js\?v=v1\.9\.2-greek-vocabulary-audit-9"/);
  assert.match(main, /const rootPath = src\.startsWith\('\/'\) \? src : `\/\$\{src\}`/);
  assert.match(main, /script\.src = `\$\{rootPath\}\?v=\$\{PURITAN_PARSER_ASSET_VERSION\}`/);
  assert.match(main, /PURITAN_PARSER_ASSET_VERSION = 'v1\.9\.2-greek-vocabulary-audit-9'/);
  assert.match(main, /PURITAN_SCRIPT_LOAD_TIMEOUT_MS = 9000/);
  assert.match(main, /puritanLoadedScripts\.delete\(src\)/);
  assert.match(main, /serviceWorker\.register\('\/sw\.js'\)/);
  assert.match(sw, /'\.\/styles\.css\?v=v1\.9\.2-greek-vocabulary-audit-9'/);
  assert.match(sw, /'\.\/src\/main\.js\?v=v1\.9\.2-greek-vocabulary-audit-9'/);
  assert.match(sw, /ignoreSearch: !isVersionedStartupAsset/);
});
