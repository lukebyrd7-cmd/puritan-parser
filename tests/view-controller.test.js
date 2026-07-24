const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function controllerHarness(){
  const context = {
    console,
    document: {},
    setTimeout,
    clearTimeout,
    Map,
    Promise
  };
  vm.createContext(context);
  const source = fs.readFileSync('src/features/vocab/index.js', 'utf8');
  vm.runInContext(source.slice(0, source.indexOf('function normalizeViewId')), context, {
    filename: 'src/features/vocab/index.js'
  });
  return context;
}

function moduleLoaderHarness(timeoutMs = 9000){
  const scripts = [];
  const context = {
    console,
    window: { location: { pathname: '/' } },
    document: {
      createElement(){
        return { remove(){ this.removed = true; } };
      },
      head: {
        appendChild(script){ scripts.push(script); }
      }
    },
    setTimeout,
    clearTimeout,
    Map,
    Set,
    Promise
  };
  vm.createContext(context);
  let source = fs.readFileSync('src/main.js', 'utf8');
  source = source.slice(0, source.indexOf('window.PuritanModuleLoader ='));
  source = source.replace('const PURITAN_SCRIPT_LOAD_TIMEOUT_MS = 9000;', `const PURITAN_SCRIPT_LOAD_TIMEOUT_MS = ${timeoutMs};`);
  vm.runInContext(source, context, { filename: 'src/main.js' });
  return { context, scripts };
}

function viewNavigationHarness(){
  function element(id){
    const classes = new Set();
    return {
      id,
      status: null,
      classList: {
        add: value => classes.add(value),
        remove: value => classes.delete(value),
        toggle(value, active){ if(active) classes.add(value); else classes.delete(value); }
      },
      querySelector(selector){ return selector === ':scope > .feature-load-status' ? this.status : null; },
      insertAdjacentElement(position, child){ this.status = child; child.parent = this; }
    };
  }
  const elements = new Map(['grammarView', 'readerView', 'listView'].map(id => [id, element(id)]));
  const document = {
    getElementById: id => elements.get(id) || null,
    querySelector: selector => selector.startsWith('#') ? (elements.get(selector.slice(1)) || null) : null,
    querySelectorAll: () => [],
    createElement(){
      return {
        children: [],
        className: '',
        appendChild(child){ this.children.push(child); },
        setAttribute(){},
        addEventListener(){},
        remove(){ if(this.parent) this.parent.status = null; }
      };
    }
  };
  let ready = false;
  let finish;
  const moduleLoader = {
    isViewReady: () => ready,
    ensureView: () => new Promise(resolve => {
      finish = () => {
        ready = true;
        resolve();
      };
    })
  };
  const context = {
    console,
    document,
    window: { PuritanModuleLoader: moduleLoader },
    state: { currentView: 'listView', lang: 'greek', prefs: {}, data: { greek: [], hebrew: [] } },
    ROUTES: {
      list: { viewId: 'listView', nav: 'list' },
      reader: { viewId: 'readerView', nav: 'reader' },
      grammar: { viewId: 'grammarView', nav: 'grammar' }
    },
    routeForView: viewId => `/${String(viewId).replace(/View$/, '')}`,
    getCurrentStudyList: () => [],
    getCurrentList: () => [],
    setTimeout,
    clearTimeout,
    Map,
    Promise,
    initReferenceCalls: 0
  };
  context.$ = selector => document.querySelector(selector);
  context.$$ = selector => document.querySelectorAll(selector);
  context.initReferenceLibrary = () => { context.initReferenceCalls += 1; };
  vm.createContext(context);
  const source = fs.readFileSync('src/features/vocab/index.js', 'utf8');
  vm.runInContext(source.slice(0, source.indexOf('/* ---------- Language ---------- */')), context, {
    filename: 'src/features/vocab/index.js'
  });
  return { context, elements, finish: () => finish() };
}

test('script loading shares one request and clears failed entries for retry', async () => {
  const { context, scripts } = moduleLoaderHarness();
  const first = context.loadScriptSequentially('src/features/grammar/index.js');
  const concurrent = context.loadScriptSequentially('src/features/grammar/index.js');
  assert.equal(first, concurrent);
  assert.equal(scripts.length, 1);
  scripts[0].onerror();
  await assert.rejects(first, /Unable to load/);
  const retry = context.loadScriptSequentially('src/features/grammar/index.js');
  assert.equal(scripts.length, 2);
  scripts[1].onload();
  await retry;
});

test('script loading timeout removes the stalled script and remains retryable', async () => {
  const { context, scripts } = moduleLoaderHarness(5);
  await assert.rejects(context.loadScriptSequentially('src/features/grammar/reference-data.js'), /timed out/);
  assert.equal(scripts[0].removed, true);
  const retry = context.loadScriptSequentially('src/features/grammar/reference-data.js');
  assert.equal(scripts.length, 2);
  scripts[1].onload();
  await retry;
});

test('lazy feature initialization shares one in-flight request', async () => {
  const context = controllerHarness();
  let calls = 0;
  let finish;
  const loader = {
    ensureView(){
      calls += 1;
      return new Promise(resolve => { finish = resolve; });
    }
  };
  const first = context.loadFeatureView('grammarView', loader, 100);
  const second = context.loadFeatureView('grammarView', loader, 100);
  assert.equal(first, second);
  assert.equal(calls, 1);
  finish();
  await first;
});

test('failed lazy feature initialization clears its promise and remains retryable', async () => {
  const context = controllerHarness();
  let calls = 0;
  const loader = {
    ensureView(){
      calls += 1;
      return calls === 1 ? Promise.reject(new Error('missing registry')) : Promise.resolve();
    }
  };
  await assert.rejects(context.loadFeatureView('grammarView', loader, 100), /missing registry/);
  await context.loadFeatureView('grammarView', loader, 100);
  assert.equal(calls, 2);
});

test('lazy feature initialization times out instead of remaining permanently loading', async () => {
  const context = controllerHarness();
  const loader = { ensureView: () => new Promise(() => {}) };
  await assert.rejects(context.loadFeatureView('grammarView', loader, 5), /timed out/);
});

test('navigating away during lazy initialization does not reactivate the stale view', async () => {
  const { context, elements, finish } = viewNavigationHarness();
  context.showView('grammarView', { skipHistory: true });
  assert.ok(elements.get('grammarView').status);
  context.showView('readerView', { featureReady: true, skipHistory: true });
  assert.equal(context.state.currentView, 'readerView');
  finish();
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(context.state.currentView, 'readerView');
  assert.equal(elements.get('grammarView').status, null);
  context.showView('grammarView', { skipHistory: true });
  assert.equal(context.state.currentView, 'grammarView');
  assert.equal(context.initReferenceCalls, 1);
});
