const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

global.escHtml = value => String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
global.$ = () => null;
global.$$ = () => [];

const learn = require('../src/features/learn/index.js');

function renderedText(html){
  return String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function renderPage(page){
  learn.learnState.page = page;
  learn.learnState.history = [];
  return learn.renderLearnPage();
}

test('Learn home opens the three permanent study areas', () => {
  const html = renderPage('home');
  assert.match(html, /Vocabulary/);
  assert.match(html, /Build long-term vocabulary through flexible study paths/);
  assert.match(html, /Paradigms/);
  assert.match(html, /Strengthen recognition of Greek and Hebrew grammar/);
  assert.match(html, /Reading Readiness/);
  assert.match(html, /See how prepared you are to read books and chapters/);
  assert.match(html, /id="learnBackBtn"/);
  assert.doesNotMatch(html, /alert\(/);
});

test('Vocabulary shell opens each placeholder subpage', () => {
  const html = renderPage('vocabulary');
  ['Review', 'New Words', 'By Frequency', 'By Book'].forEach(label => assert.match(html, new RegExp(label)));

  assert.match(renderedText(renderPage('vocabulary:review')), /Eventually review words currently in Learning/);
  assert.match(renderedText(renderPage('vocabulary:new-words')), /Learn new vocabulary from your selected study path/);
  assert.match(renderedText(renderPage('vocabulary:by-frequency')), /Study vocabulary grouped by occurrence frequency/);
  assert.match(renderedText(renderPage('vocabulary:by-book')), /Prepare vocabulary for individual books and chapters/);
});

test('Paradigms shell is organized by language and emphasizes verbs', () => {
  const html = renderPage('paradigms');
  assert.match(html, /Greek/);
  assert.match(html, /Hebrew/);
  assert.equal((html.match(/learn-card-emphasis/g) || []).length, 2);
  assert.match(html, /data-learn-page="paradigms:greek-verbs"/);
  assert.match(html, /data-learn-page="paradigms:greek-nouns"/);
  assert.match(html, /data-learn-page="paradigms:hebrew-verbs"/);
  assert.match(html, /data-learn-page="paradigms:hebrew-nouns"/);

  assert.match(renderedText(renderPage('paradigms:greek-verbs')), /Greek verb recognition practice will be added in a future release/);
  assert.match(renderedText(renderPage('paradigms:hebrew-nouns')), /Hebrew noun recognition practice will be added in a future release/);
});

test('Reading Readiness shell opens Testament placeholder pages without calculations', () => {
  const html = renderPage('reading-readiness');
  assert.match(html, /Reading Readiness will show how prepared you are/);
  assert.match(html, /Old Testament/);
  assert.match(html, /New Testament/);
  assert.doesNotMatch(html, /percent|score|mastery|due/i);

  assert.match(renderedText(renderPage('reading-readiness:old-testament')), /Old Testament readiness views will be added in a future release/);
  assert.match(renderedText(renderPage('reading-readiness:new-testament')), /New Testament readiness views will be added in a future release/);
});

test('Learn back navigation returns through the Learn page stack and exits from home', () => {
  let shownView = '';
  global.showView = view => { shownView = view; };
  learn.learnState.page = 'home';
  learn.learnState.history = [];
  learn.setLearnPage('vocabulary');
  learn.setLearnPage('vocabulary:review');
  learn.backLearnPage();
  assert.equal(learn.learnState.page, 'vocabulary');
  learn.backLearnPage();
  assert.equal(learn.learnState.page, 'home');
  learn.backLearnPage();
  assert.equal(shownView, 'listView');
  delete global.showView;
});

test('Learn route and view navigation are wired into the app shell', () => {
  function makeElement(id){
    const classes = new Set(id === 'learnView' ? ['hidden'] : []);
    return {
      id,
      classList: {
        toggle(name, force){ force ? classes.add(name) : classes.delete(name); },
        contains(name){ return classes.has(name); }
      },
      textContent: ''
    };
  }

  const ids = ['listView','flashView','parsingView','dashboardView','settingsView','grammarView','readerView','wordPageView','learnView','profileView','sharedFilterBar','filterSearchGroup','filterSortGroup','filterEntriesCount','filterPosGroup','footerLang'];
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
    renderLearn: () => { context.renderLearnCalls += 1; },
    renderLearnCalls: 0,
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

  context.navigateTo('/learn');
  assert.equal(context.window.location.pathname, '/learn');
  assert.equal(context.state.currentView, 'learnView');
  assert.equal(elements.get('learnView').classList.contains('hidden'), false);
  assert.equal(elements.get('listView').classList.contains('hidden'), true);
  assert.equal(context.renderLearnCalls, 1);
});
