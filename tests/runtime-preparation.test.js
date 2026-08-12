const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('shared lexical gloss loading parses each language once and deduplicates concurrent consumers', async () => {
  const sourcePath = require.resolve('../src/core/source-data/vocab-source');
  delete require.cache[sourcePath];
  const originalFetch = global.fetch;
  let fetchCount = 0;
  global.fetch = async path => {
    fetchCount += 1;
    return { ok: true, json: async () => ({ sample: { primaryGloss: String(path) } }) };
  };
  try {
    const source = require(sourcePath);
    const [first, concurrent] = await Promise.all([
      source.loadLexicalGlossMap('hebrew'),
      source.loadLexicalGlossMap('hebrew')
    ]);
    const warm = await source.loadLexicalGlossMap('hebrew');
    assert.equal(first, concurrent);
    assert.equal(first, warm);
    assert.equal(fetchCount, 1);
    assert.equal(source.lexicalGlossPreparationDebug().loadCounts.hebrew, 1);
  } finally {
    global.fetch = originalFetch;
    delete require.cache[sourcePath];
  }
});

test('idle runtime preparation is single-flight and shares vocabulary work with Search and Learn', async () => {
  let idleCallback;
  let groupCalls = 0;
  let glossCalls = 0;
  let featureCalls = 0;
  let searchCalls = 0;
  const context = {
    console,
    Promise,
    Map,
    setTimeout,
    clearTimeout,
    state: { dataRevision: 4, lang: 'greek', data: { greek: [{ id: 'g' }], hebrew: [{ id: 'h' }] } },
    isAppDataReady: () => true,
    startAppDataLoad: async () => true,
    getStudyEntriesAsync: async entries => { groupCalls += 1; await new Promise(resolve => setTimeout(resolve, 2)); return entries; },
    loadLexicalGlossMap: async () => { glossCalls += 1; return {}; },
    requestAnimationFrame: callback => callback(),
    requestIdleCallback: callback => { idleCallback = callback; return 1; },
    PuritanModuleLoader: { ensureView: async () => { featureCalls += 1; } },
    PuritanGlobalSearch: { prepareGlobalSearchIndex: async () => { searchCalls += 1; return []; } }
  };
  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('src/core/runtime-preparation.js', 'utf8'), context, { filename: 'src/core/runtime-preparation.js' });

  const first = context.PuritanRuntimePreparation.prepareVocabulary('greek');
  const concurrent = context.PuritanRuntimePreparation.prepareVocabulary('greek');
  assert.equal(first, concurrent);
  await first;
  assert.equal(context.PuritanRuntimePreparation.scheduleWarmup(), true);
  assert.equal(context.PuritanRuntimePreparation.scheduleWarmup(), false);
  await new Promise(resolve => setTimeout(resolve, 2));
  idleCallback();
  await new Promise(resolve => setTimeout(resolve, 30));

  const debug = context.PuritanRuntimePreparation.debug();
  assert.equal(groupCalls, 2);
  assert.equal(glossCalls, 1);
  assert.equal(featureCalls, 1);
  assert.equal(searchCalls, 1);
  assert.equal(debug.counts['vocabulary:greek:4'], 1);
  assert.equal(debug.counts['vocabulary:hebrew:4'], 1);
  assert.equal(debug.counts['glosses:hebrew'], 1);
  assert.equal(debug.counts['search:4'], 1);
});
