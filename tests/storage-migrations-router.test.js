const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const migrations = require('../src/core/migrations/migration-runner');

function loadBrowserScripts(files, extra = {}) {
  const context = Object.assign({ console, require, module: undefined, window: { PuritanParserCore: require('../src/parser-core') } }, extra);
  vm.createContext(context);
  files.forEach(file => vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file }));
  return context;
}

test('migration runner wraps legacy preferences and progress without data loss', () => {
  const prefs = migrations.migratePayload({ theme: 'dark' }, 'prefs');
  assert.equal(prefs.schemaVersion, migrations.CURRENT_SCHEMA_VERSION);
  assert.deepEqual(prefs.preferences, { theme: 'dark' });

  const progress = migrations.migratePayload([{ id: 'g-1', repetitions: 2 }], 'vocab');
  assert.equal(progress.schemaVersion, migrations.CURRENT_SCHEMA_VERSION);
  assert.deepEqual(progress.progress, [{ id: 'g-1', repetitions: 2 }]);
});

test('storage reads legacy data, migrates it in place, and saves versioned data', () => {
  const store = new Map([
    ['pp_prefs', JSON.stringify({ theme: 'dark' })],
    ['pp_vocab_greek', JSON.stringify([{ id: 'g-1', due: '2026-01-01' }])]
  ]);
  const app = loadBrowserScripts([
    'src/core/migrations/migrations.js',
    'src/core/migrations/migration-runner.js',
    'src/app-state.js',
    'src/models/preferences.js',
    'src/models/user-progress.js',
    'src/core/storage/storage.js',
    'src/core/storage/prefs-storage.js',
    'src/core/storage/vocab-storage.js'
  ], {
    localStorage: { getItem: key => store.get(key) || null, setItem: (key, value) => store.set(key, value), removeItem: key => store.delete(key) },
    state: { prefs: { initialEase: 2.5 } },
    todayISO: () => '2026-06-19'
  });

  assert.equal(app.getPreferences().theme, 'dark');
  assert.deepEqual(JSON.parse(JSON.stringify(app.getUserProgress('greek'))), [{ id: 'g-1', due: '2026-01-01' }]);
  assert.equal(JSON.parse(store.get('pp_prefs')).schemaVersion, 1);
  app.saveUserProgress('greek', [{ id: 'g-2' }]);
  assert.deepEqual(JSON.parse(store.get('pp_vocab_greek')).progress, [{ id: 'g-2' }]);
});

test('router changes routes and selects views', () => {
  const shown = [];
  const app = loadBrowserScripts(['src/core/router.js'], {
    window: { location: { pathname: '/parsing' }, addEventListener() {} },
    history: { pushState: (s, t, path) => { app.window.location.pathname = path; }, replaceState: (s, t, path) => { app.window.location.pathname = path; } },
    showView: (viewId) => shown.push(viewId)
  });

  app.navigateTo('/flashcards');
  assert.equal(app.window.location.pathname, '/flashcards');
  assert.equal(shown.at(-1), 'flashView');
  assert.equal(app.routeForView('dashboardView'), '/dashboard');
  assert.equal(app.routeForView('wordPageView'), '/word');
});

test('router treats root as the list view', () => {
  const shown = [];
  const app = loadBrowserScripts(['src/core/router.js'], {
    window: { location: { pathname: '/' }, addEventListener() {} },
    history: { pushState: (s, t, path) => { app.window.location.pathname = path; }, replaceState: (s, t, path) => { app.window.location.pathname = path; } },
    showView: (viewId) => shown.push(viewId)
  });

  app.initRouter();
  assert.equal(app.window.location.pathname, '/');
  assert.equal(shown.at(-1), 'listView');
});

test('showView can display the static Word Page view', () => {
  function makeElement(id){
    const classes = new Set(id === 'wordPageView' ? ['hidden'] : []);
    return {
      id,
      classList: {
        toggle(name, force){ force ? classes.add(name) : classes.delete(name); },
        contains(name){ return classes.has(name); }
      },
      textContent: ''
    };
  }

  const ids = ['listView','flashView','parsingView','dashboardView','settingsView','grammarView','readerView','wordPageView','profileView','sharedFilterBar','filterSearchGroup','filterSortGroup','filterEntriesCount','filterPosGroup','footerLang'];
  const elements = new Map(ids.map(id => [id, makeElement(id)]));
  const context = {
    console,
    document: {
      getElementById: id => elements.get(id) || null,
      querySelector: selector => selector.startsWith('#') ? (elements.get(selector.slice(1)) || null) : null,
      querySelectorAll: () => []
    },
    window: { location: { pathname: '/list' }, addEventListener() {} },
    history: {
      pushState: (s, t, path) => { context.window.location.pathname = path; },
      replaceState: (s, t, path) => { context.window.location.pathname = path; }
    },
    state: { currentView: 'listView', lang: 'greek', dashboard: {}, prefs: {}, data: { greek: [], hebrew: [] }, filters: {} },
    selectedLemma: null,
    parsingModeFamily: () => 'all',
    readFiltersFromDOM: () => {},
    renderDashboard: () => {},
    renderList: () => {},
    updateParsingModeUI: () => {},
    renderLemmaPicker: () => {},
    getCurrentStudyList: () => [],
    getCurrentList: () => [],
    module: undefined
  };
  context.$ = selector => context.document.querySelector(selector);
  context.$$ = selector => Array.from(context.document.querySelectorAll(selector));
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('src/core/router.js', 'utf8'), context, { filename: 'src/core/router.js' });
  const vocabSource = fs.readFileSync('src/features/vocab/index.js', 'utf8');
  vm.runInContext(vocabSource.slice(0, vocabSource.indexOf('/* ---------- Language ---------- */')), context, { filename: 'src/features/vocab/index.js' });

  assert.doesNotThrow(() => context.showView('wordPageView'));
  assert.equal(context.window.location.pathname, '/word');
  assert.equal(context.state.currentView, 'wordPageView');
  assert.equal(elements.get('wordPageView').classList.contains('hidden'), false);
  assert.equal(elements.get('listView').classList.contains('hidden'), true);
});
