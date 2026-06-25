const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

global.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
global.escHtml = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
global.$ = () => null;
global.$$ = () => [];

function storageHarness(){
  const store = new Map();
  global.readStorageJson = (key, fallback = null) => store.has(key) ? JSON.parse(store.get(key)) : fallback;
  global.writeStorageJson = (key, value) => store.set(key, JSON.stringify(value));
  return store;
}

global.fetch = async filePath => {
  const resolved = path.join(process.cwd(), filePath);
  delete require.cache[require.resolve(resolved)];
  const data = require(resolved);
  return { ok: true, json: async () => structuredClone(data) };
};

const reader = require('../src/features/reader/index.js');

function renderedText(html){
  return String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

test('reader loads a Greek chapter from the chapter-file structure', async () => {
  const chapter = await reader.loadReaderChapter('greek', 'matthew', 1);
  assert.equal(chapter.bookName, 'Matthew');
  assert.equal(chapter.chapter, 1);
  assert.match(renderedText(reader.renderReaderChapter(chapter)), /Βίβλος γενέσεως/);
});

test('reader renders clickable tokens when token metadata exists', () => {
  const html = reader.renderReaderVerse({
    verse: 1,
    text: 'λόγος',
    tokens: [{ surface: 'λόγος', lemma: 'λόγος', parse: 'N-NSM' }]
  }, { book: 'john', bookName: 'John', chapter: 1 });
  assert.match(html, /class="reader-token"/);
  assert.match(html, /data-lemma="λόγος"/);
  assert.match(html, /data-parse="N-NSM"/);
  assert.doesNotMatch(html, /word<\/button>\s*<span/);
});

test('reader falls back to plain verse text when token metadata is unavailable', () => {
  const html = reader.renderReaderVerse({ verse: 1, text: 'plain Greek text' }, { bookName: 'Sample', chapter: 1 });
  assert.match(html, /plain Greek text/);
  assert.doesNotMatch(html, /reader-token/);
});

test('reader word lookup shows gloss, parsing explanation, aggregate frequency, and reference', async () => {
  global.state = {
    data: {
      greek: [
        { lang: 'greek', word: 'λόγος', lemma: 'λόγος', primaryGloss: 'word', alternateGlosses: ['message'], gloss: 'word, message, account', freq: 68 },
        { lang: 'greek', word: 'λόγον', lemma: 'λόγος', primaryGloss: 'word', alternateGlosses: ['account'], gloss: 'word, message, account', freq: 130 }
      ]
    }
  };
  const info = await reader.lookupReaderWordInfo(
    { surface: 'λόγος', lemma: 'λόγος', parse: 'N-NSM' },
    { bookName: 'John', chapter: 1, verse: 1 },
    'greek'
  );
  assert.equal(info.surface, 'λόγος');
  assert.equal(info.lemma, 'λόγος');
  assert.equal(info.primaryGloss, 'word');
  assert.ok(info.alternateGlosses.includes('message'));
  assert.ok(info.alternateGlosses.includes('account'));
  assert.equal(info.parse, 'N-NSM');
  assert.equal(info.parseExplanation, 'Noun — nominative singular masculine');
  assert.equal(info.frequency, 198);
  assert.equal(info.reference, 'John 1:1');
  delete global.state;
});

test('reader word lookup falls back gracefully when data is missing', async () => {
  global.state = { data: { greek: [] } };
  const info = await reader.lookupReaderWordInfo(
    { surface: 'ἀγνωστον', lemma: 'ἀγνωστον', parse: 'X- ---' },
    { bookName: 'John', chapter: 1, verse: 2 },
    'greek'
  );
  assert.equal(info.primaryGloss, '');
  assert.deepEqual(info.alternateGlosses, []);
  assert.equal(info.parseExplanation, 'X- ---');
  assert.equal(info.frequency, '');
  assert.equal(info.reference, 'John 1:2');
  delete global.state;
});

test('reader grammar links resolve to existing Greek topics by parse kind', () => {
  global.PuritanReferenceLibrary = { getReferenceTopic: id => ({ id }) };
  assert.deepEqual(reader.readerGrammarLinksForInfo({ parse: 'N-NSM', parseExplanation: 'Noun — nominative singular masculine' }).map(link => link.topicId), ['greek-nouns']);
  assert.deepEqual(reader.readerGrammarLinksForInfo({ parse: 'N-NSM', parseExplanation: 'Noun — nominative singular masculine' }).map(link => link.label), ['Greek Nouns']);
  assert.deepEqual(reader.readerGrammarLinksForInfo({ parse: 'A-NSF', parseExplanation: 'Adjective — nominative singular feminine' }).map(link => link.topicId), ['greek-adjectives']);
  assert.deepEqual(reader.readerGrammarLinksForInfo({ parse: 'A-NSF', parseExplanation: 'Adjective — nominative singular feminine' }).map(link => link.label), ['Greek Adjectives']);
  assert.deepEqual(reader.readerGrammarLinksForInfo({ parse: 'V-PAI-3S', parseExplanation: 'Verb — present active indicative 3rd singular' }).map(link => link.topicId), ['greek-verbs']);
  assert.deepEqual(reader.readerGrammarLinksForInfo({ parse: 'V-PAI-3S', parseExplanation: 'Verb — present active indicative 3rd singular' }).map(link => link.label), ['Greek Verbs']);
  assert.deepEqual(reader.readerGrammarLinksForInfo({ parse: 'V-PAP-NSM', parseExplanation: 'Verb — present active participle nominative singular masculine' }).map(link => link.topicId), ['greek-verbs']);
  assert.deepEqual(reader.readerGrammarLinksForInfo({ parse: 'RA ----NSM-', parseExplanation: 'Article — nominative singular masculine' }).map(link => link.topicId), ['greek-nouns']);
  assert.deepEqual(reader.readerGrammarLinksForInfo({ language: 'hebrew', parse: 'Qal Perfect 3ms', parseExplanation: 'QAL PERFECT 3MS' }).map(link => link.topicId), ['hebrew-verbs']);
  delete global.PuritanReferenceLibrary;
});

test('clicking a reader token opens and closes the popup', async () => {
  let popupHtml = '';
  const root = {
    set innerHTML(value){ popupHtml = value; },
    get innerHTML(){ return popupHtml; },
    querySelector: selector => selector === '.reader-word-close' ? { addEventListener(){}, focus(){} } : null,
    querySelectorAll: () => []
  };
  global.$ = (selector, scope) => scope?.querySelector ? scope.querySelector(selector) : (selector === '#readerWordPopupRoot' ? root : null);
  global.$$ = () => [];
  global.state = { data: { greek: [{ lang: 'greek', word: 'λόγος', lemma: 'λόγος', primaryGloss: 'word', alternateGlosses: [], gloss: 'word', freq: 1 }] } };
  await reader.openReaderTokenPopup({
    dataset: { surface: 'λόγος', lemma: 'λόγος', parse: 'N-NSM', book: 'john', bookName: 'John', chapter: '1', verse: '1' },
    focus(){}
  });
  assert.match(popupHtml, /reader-word-popup/);
  assert.match(popupHtml, /λόγος/);
  assert.match(popupHtml, /word/);
  assert.match(popupHtml, /Noun — nominative singular masculine/);
  assert.match(popupHtml, /Parse: N-NSM/);
  assert.match(popupHtml, /Open Word Page/);
  assert.doesNotMatch(popupHtml, /<dt>Parsing<\/dt>/);
  assert.doesNotMatch(popupHtml, /<dt>Meaning<\/dt>/);
  reader.closeReaderWordPopup();
  assert.equal(popupHtml, '');
  delete global.state;
});

test('clicking Open Word Page closes the popup and opens a dynamic Word Page view', async () => {
  let popupHtml = '';
  let wordPageHtml = '';
  let actionHandler;
  let backHandler;
  let shownView = '';
  let toastMessage = '';
  const popupRoot = {
    set innerHTML(value){ popupHtml = value; },
    get innerHTML(){ return popupHtml; },
    querySelector: selector => {
      if(selector === '.reader-word-close') return { addEventListener(){}, focus(){} };
      if(selector === '.reader-word-page-action') return { addEventListener(type, handler){ if(type === 'click') actionHandler = handler; } };
      return null;
    },
    querySelectorAll: () => []
  };
  const wordRoot = {
    set innerHTML(value){ wordPageHtml = value; },
    get innerHTML(){ return wordPageHtml; },
    querySelector: selector => {
      if(selector === '#wordPageBackToReader') return { addEventListener(type, handler){ if(type === 'click') backHandler = handler; } };
      return null;
    },
    querySelectorAll: selector => selector === '.reader-word-link' ? [{ dataset: { topicId: 'greek-nouns' }, addEventListener(){} }] : []
  };
  global.$ = (selector, scope) => {
    if(scope?.querySelector) return scope.querySelector(selector);
    if(selector === '#readerWordPopupRoot') return popupRoot;
    if(selector === '#wordPageShell') return wordRoot;
    return null;
  };
  global.$$ = (selector, scope) => scope?.querySelectorAll ? scope.querySelectorAll(selector) : [];
  global.toast = message => { toastMessage = message; };
  global.showView = viewId => { shownView = viewId; };
  global.state = { data: { greek: [
    { lang: 'greek', word: 'λόγος', lemma: 'λόγος', primaryGloss: 'word', alternateGlosses: ['message', 'account', 'matter'], gloss: 'word, message, account, matter', freq: 68 },
    { lang: 'greek', word: 'ἀρχή', lemma: 'ἀρχή', primaryGloss: 'beginning', alternateGlosses: ['origin'], gloss: 'beginning, origin', freq: 55 },
    { lang: 'greek', word: 'μονόγλωσσον', lemma: 'μονόγλωσσον', primaryGloss: 'single gloss', alternateGlosses: [], gloss: 'single gloss', freq: 27 }
  ] } };
  await reader.openReaderTokenPopup({
    dataset: { surface: 'λόγος', lemma: 'λόγος', parse: 'N-NSM', bookName: 'John', chapter: '1', verse: '1' },
    focus(){}
  });
  assert.match(popupHtml, /Open Word Page/);
  assert.equal(typeof actionHandler, 'function');
  actionHandler();
  assert.equal(popupHtml, '');
  assert.equal(shownView, 'wordPageView');
  assert.equal(toastMessage, '');
  assert.match(wordPageHtml, /<h1 id="wordPageTitle" class="word-page-headword">λόγος<\/h1>/);
  assert.match(wordPageHtml, /word-page-pos">Noun<\/div>/);
  assert.match(wordPageHtml, /word-page-primary-gloss">word<\/p>/);
  assert.match(wordPageHtml, /Also translated as/);
  assert.match(wordPageHtml, /message[\s\S]*account[\s\S]*matter/);
  assert.match(wordPageHtml, /<dt>Frequency<\/dt><dd>68×<\/dd>/);
  assert.match(wordPageHtml, /<dt>Current Reference<\/dt><dd>John 1:1<\/dd>/);
  assert.match(wordPageHtml, /data-topic-id="greek-nouns"/);
  assert.match(wordPageHtml, />Greek Nouns<\/button>/);
  assert.match(wordPageHtml, /Read in Context/);
  assert.doesNotMatch(wordPageHtml, /Word Page/);
  assert.equal(typeof backHandler, 'function');
  backHandler();
  assert.equal(shownView, 'readerView');

  await reader.openReaderTokenPopup({
    dataset: { surface: 'ἀρχῇ', lemma: 'ἀρχή', parse: 'N-DSF', bookName: 'John', chapter: '1', verse: '1' },
    focus(){}
  });
  actionHandler();
  assert.match(wordPageHtml, /<h1 id="wordPageTitle" class="word-page-headword">ἀρχή<\/h1>/);
  assert.match(wordPageHtml, /word-page-primary-gloss">beginning<\/p>/);
  assert.match(wordPageHtml, /origin/);
  assert.match(wordPageHtml, /<dt>Frequency<\/dt><dd>55×<\/dd>/);

  await reader.openReaderTokenPopup({
    dataset: { surface: 'μονόγλωσσον', lemma: 'μονόγλωσσον', parse: 'N-ASN', bookName: 'Matthew', chapter: '9', verse: '13' },
    focus(){}
  });
  actionHandler();
  assert.match(wordPageHtml, /word-page-primary-gloss">single gloss<\/p>/);
  assert.doesNotMatch(wordPageHtml, /Also translated as/);
  delete global.state;
  delete global.toast;
  delete global.showView;
});

test('word page read in context selects up to five lemma occurrences with short snippets', async () => {
  const occurrences = await reader.getReaderLemmaOccurrences('λόγος', 'greek', 5);
  assert.ok(occurrences.length > 0);
  assert.ok(occurrences.length <= 5);
  assert.equal(new Set(occurrences.map(item => item.reference)).size, occurrences.length);
  assert.ok(occurrences.every(item => item.reference.match(/^[1-3]?\s?[A-Za-z]+ \d+:\d+$/)));
  assert.ok(occurrences.every(item => item.snippet.startsWith('...') && item.snippet.endsWith('...')));
  assert.ok(occurrences.every(item => item.snippet.split(/\s+/).length <= 12));

  const html = reader.renderReaderWordPageContext(occurrences);
  assert.match(html, /Read in Context/);
  assert.equal((html.match(/class="word-page-context-link"/g) || []).length, occurrences.length);
  assert.doesNotMatch(html, /View All|pagination|filter|translation/i);
});

test('clicking a read in context occurrence opens Reader at that reference', async () => {
  let shownView = '';
  let readerHtml = '';
  const button = {
    dataset: { language: 'greek', book: 'john', chapter: '1', verse: '1' },
    addEventListener(type, handler){ if(type === 'click') this.clickHandler = handler; }
  };
  const shell = {
    set innerHTML(value){ readerHtml = value; },
    get innerHTML(){ return readerHtml; }
  };
  global.showView = view => { shownView = view; };
  global.$ = selector => selector === '#readerShell' ? shell : null;
  global.$$ = (selector, root) => root && selector === '.word-page-context-link' ? [button] : [];

  reader.attachReaderWordPageContextHandlers({});
  assert.equal(typeof button.clickHandler, 'function');
  await button.clickHandler();

  assert.equal(shownView, 'readerView');
  assert.equal(reader.readerState().book, 'john');
  assert.equal(reader.readerState().chapter, 1);
  assert.equal(reader.readerState().focusVerse, '1');
  assert.match(readerHtml, /John 1/);
  assert.match(readerHtml, /readerVerse-1/);
  delete global.showView;
});

test('book navigation crosses from Matthew to Mark', async () => {
  await reader.setReaderLocation({ language: 'greek', book: 'matthew', chapter: 28 });
  assert.deepEqual(reader.getAdjacentReaderLocation(1), { language: 'greek', book: 'mark', chapter: 1 });
});

test('book navigation crosses from Mark to Luke and Luke to John', async () => {
  await reader.setReaderLocation({ language: 'greek', book: 'mark', chapter: 16 });
  assert.deepEqual(reader.getAdjacentReaderLocation(1), { language: 'greek', book: 'luke', chapter: 1 });
  await reader.setReaderLocation({ language: 'greek', book: 'luke', chapter: 1 });
  assert.deepEqual(reader.getAdjacentReaderLocation(-1), { language: 'greek', book: 'mark', chapter: 16 });
  await reader.setReaderLocation({ language: 'greek', book: 'luke', chapter: 24 });
  assert.deepEqual(reader.getAdjacentReaderLocation(1), { language: 'greek', book: 'john', chapter: 1 });
  await reader.setReaderLocation({ language: 'greek', book: 'john', chapter: 1 });
  assert.deepEqual(reader.getAdjacentReaderLocation(-1), { language: 'greek', book: 'luke', chapter: 24 });
});

test('Mark appears in the book selector with all 16 chapters', async () => {
  let html = '';
  const shell = { set innerHTML(value){ html = value; }, get innerHTML(){ return html; } };
  global.$ = selector => selector === '#readerShell' ? shell : null;
  global.$$ = () => [];
  await reader.setReaderLocation({ language: 'greek', book: 'mark', chapter: 1 });
  assert.match(html, /<option value="mark" selected>Mark<\/option>/);
  const chapterOptions = [...html.matchAll(/<option value="(\d+)"/g)].map(match => Number(match[1]));
  assert.deepEqual(chapterOptions, Array.from({ length: 16 }, (_, i) => i + 1));
});

test('Mark 1 and Mark 16 load from generated chapter data', async () => {
  const mark1 = await reader.loadReaderChapter('greek', 'mark', 1);
  assert.equal(mark1.bookName, 'Mark');
  assert.equal(mark1.chapter, 1);
  assert.equal(mark1.verses[0].verse, 1);
  assert.match(renderedText(reader.renderReaderChapter(mark1)), /Ἀρχὴ τοῦ εὐαγγελίου/);

  const mark16 = await reader.loadReaderChapter('greek', 'mark', 16);
  assert.equal(mark16.bookName, 'Mark');
  assert.equal(mark16.chapter, 16);
  assert.equal(mark16.verses.at(-1).verse, 20);
  assert.match(renderedText(reader.renderReaderChapter(mark16)), /ἐκήρυξαν πανταχοῦ/);
});

test('Luke appears in the book selector with all 24 chapters', async () => {
  let html = '';
  const shell = { set innerHTML(value){ html = value; }, get innerHTML(){ return html; } };
  global.$ = selector => selector === '#readerShell' ? shell : null;
  global.$$ = () => [];
  await reader.setReaderLocation({ language: 'greek', book: 'luke', chapter: 1 });
  assert.match(html, /<option value="luke" selected>Luke<\/option>/);
  const chapterOptions = [...html.matchAll(/<option value="(\d+)"/g)].map(match => Number(match[1]));
  assert.deepEqual(chapterOptions, Array.from({ length: 24 }, (_, i) => i + 1));
});

test('Luke 1 and Luke 24 load from generated chapter data', async () => {
  const luke1 = await reader.loadReaderChapter('greek', 'luke', 1);
  assert.equal(luke1.bookName, 'Luke');
  assert.equal(luke1.chapter, 1);
  assert.equal(luke1.verses.length, 80);
  assert.match(renderedText(reader.renderReaderChapter(luke1)), /Ἐπειδήπερ πολλοὶ/);

  const luke24 = await reader.loadReaderChapter('greek', 'luke', 24);
  assert.equal(luke24.bookName, 'Luke');
  assert.equal(luke24.chapter, 24);
  assert.equal(luke24.verses.length, 53);
  assert.equal(luke24.verses.at(-1).verse, 53);
  assert.match(renderedText(reader.renderReaderChapter(luke24)), /εὐλογοῦντες τὸν ⸀θεόν/);
});


test('John appears in the book selector with all 21 chapters', async () => {
  let html = '';
  const shell = { set innerHTML(value){ html = value; }, get innerHTML(){ return html; } };
  global.$ = selector => selector === '#readerShell' ? shell : null;
  global.$$ = () => [];
  await reader.setReaderLocation({ language: 'greek', book: 'john', chapter: 1 });
  assert.match(html, /<option value="john" selected>John<\/option>/);
  const chapterOptions = [...html.matchAll(/<option value="(\d+)"/g)].map(match => Number(match[1]));
  assert.deepEqual(chapterOptions, Array.from({ length: 21 }, (_, i) => i + 1));
});

test('John 1 and John 21 load from generated chapter data', async () => {
  const john1 = await reader.loadReaderChapter('greek', 'john', 1);
  assert.equal(john1.bookName, 'John');
  assert.equal(john1.chapter, 1);
  assert.equal(john1.verses.length, 51);
  assert.match(renderedText(reader.renderReaderChapter(john1)), /Ἐν ἀρχῇ ἦν ὁ λόγος/);

  const john21 = await reader.loadReaderChapter('greek', 'john', 21);
  assert.equal(john21.bookName, 'John');
  assert.equal(john21.chapter, 21);
  assert.equal(john21.verses.length, 25);
  assert.equal(john21.verses.at(-1).verse, 25);
  assert.match(renderedText(reader.renderReaderChapter(john21)), /ἔστιν δὲ καὶ ἄλλα πολλὰ/);
});

test('rendering John 1 creates clickable token elements and clicking λόγος opens the popup', async () => {
  const elements = new Map();
  let tokenButtons = [];
  let popupHtml = '';
  const makeControl = () => ({ addEventListener(){} });
  const attr = (html, name) => html.match(new RegExp(`${name}="([^"]*)"`))?.[1] || '';
  const toDataset = html => ({
    surface: attr(html, 'data-surface'),
    lemma: attr(html, 'data-lemma'),
    parse: attr(html, 'data-parse'),
    book: attr(html, 'data-book'),
    bookName: attr(html, 'data-book-name'),
    chapter: attr(html, 'data-chapter'),
    verse: attr(html, 'data-verse')
  });
  const shell = {
    set innerHTML(value){
      this.html = value;
      tokenButtons = [...value.matchAll(/<button class="reader-token"[\s\S]*?<\/button>/g)].map(match => {
        const handlers = {};
        const text = match[0].replace(/[\s\S]*?>/, '').replace(/<\/button>$/, '');
        return {
          dataset: toDataset(match[0]),
          textContent: text,
          handlers,
          addEventListener(type, handler){ handlers[type] = handler; },
          focus(){}
        };
      });
    },
    get innerHTML(){ return this.html || ''; }
  };
  const popupRoot = {
    set innerHTML(value){ popupHtml = value; },
    get innerHTML(){ return popupHtml; },
    querySelector(selector){ return selector === '.reader-word-close' ? makeControl() : null; },
    querySelectorAll(){ return []; }
  };
  elements.set('#readerShell', shell);
  elements.set('#readerWordPopupRoot', popupRoot);
  ['#readerBookSelect', '#readerChapterSelect', '#readerPrevBtn', '#readerNextBtn', '#readerSearchBtn', '#readerSearchInput'].forEach(selector => elements.set(selector, makeControl()));
  global.$ = (selector, root) => root?.querySelector ? root.querySelector(selector) : elements.get(selector) || null;
  global.$$ = (selector, root) => {
    if(root?.querySelectorAll) return root.querySelectorAll(selector);
    return selector === '.reader-token' ? tokenButtons : [];
  };
  global.state = { data: { greek: [{ lang: 'greek', word: 'λόγος', lemma: 'λόγος', primaryGloss: 'word', gloss: 'word', freq: 1 }] } };

  await reader.setReaderLocation({ language: 'greek', book: 'john', chapter: 1 });
  assert.ok(tokenButtons.length > 0);
  const logosButton = tokenButtons.find(button => button.dataset.surface === 'λόγος' && button.dataset.lemma === 'λόγος');
  assert.ok(logosButton);
  assert.equal(typeof logosButton.handlers.click, 'function');

  await logosButton.handlers.click();
  assert.match(popupHtml, /reader-word-popup/);
  assert.match(popupHtml, /λόγος/);
  assert.match(popupHtml, /word/);

  reader.closeReaderWordPopup();
  delete global.state;
});

test('chapter navigation moves previous and next within a book', async () => {
  await reader.setReaderLocation({ language: 'greek', book: 'matthew', chapter: 1 });
  assert.equal(reader.getAdjacentReaderLocation(1).chapter, 2);
  await reader.setReaderLocation({ language: 'greek', book: 'matthew', chapter: 28 });
  assert.equal(reader.getAdjacentReaderLocation(-1).chapter, 27);
});

test('last reader location persists', () => {
  storageHarness();
  reader.saveReaderLocation({ language: 'greek', book: 'mark', chapter: 1 });
  assert.deepEqual(reader.loadReaderLocation(), { language: 'greek', book: 'mark', chapter: 1 });
});

test('search supports lemma, surface text, and verse references', async () => {
  let html = '';
  const resultBox = { set innerHTML(value){ html = value; }, get innerHTML(){ return html; } };
  global.$ = selector => selector === '#readerSearchResults' ? resultBox : null;
  global.$$ = () => [];
  const lemmaResults = await reader.runReaderSearch('γεννάω');
  assert.ok(lemmaResults.some(item => item.book === 'matthew' && item.chapter === 1 && item.verse === 2));
  const surfaceResults = await reader.runReaderSearch('βίβλος');
  assert.ok(surfaceResults.some(item => item.book === 'matthew' && item.chapter === 1));
  assert.deepEqual(reader.parseReaderReference('Matthew 1:18'), { language: 'greek', book: 'matthew', chapter: 1, verse: '18' });
  assert.deepEqual(reader.parseReaderReference('Matthew 5'), { language: 'greek', book: 'matthew', chapter: 5, verse: '' });
});

test('search finds Mark surface forms, lemmas, and references', async () => {
  let html = '';
  const resultBox = { set innerHTML(value){ html = value; }, get innerHTML(){ return html; } };
  global.$ = selector => selector === '#readerSearchResults' ? resultBox : null;
  global.$$ = () => [];
  await reader.loadReaderManifest('greek');
  const surfaceResults = await reader.runReaderSearch('εὐαγγέλιον');
  assert.ok(surfaceResults.some(item => item.book === 'mark' && item.chapter === 1 && item.verse === 1));
  const lemmaResults = await reader.runReaderSearch('βαπτίζω');
  assert.ok(lemmaResults.some(item => item.book === 'mark'));
  assert.deepEqual(reader.parseReaderReference('Mark 1:1'), { language: 'greek', book: 'mark', chapter: 1, verse: '1' });
  assert.deepEqual(reader.parseReaderReference('Mark 16'), { language: 'greek', book: 'mark', chapter: 16, verse: '' });
  assert.match(html, /Mark/);
});

test('search finds Luke surface forms, lemmas, and references', async () => {
  let html = '';
  const resultBox = { set innerHTML(value){ html = value; }, get innerHTML(){ return html; } };
  global.$ = selector => selector === '#readerSearchResults' ? resultBox : null;
  global.$$ = () => [];
  await reader.loadReaderManifest('greek');
  const surfaceResults = await reader.runReaderSearch('Ἐπειδήπερ');
  assert.ok(surfaceResults.some(item => item.book === 'luke' && item.chapter === 1 && item.verse === 1));
  const lemmaResults = await reader.runReaderSearch('ἀπογράφω');
  assert.ok(lemmaResults.some(item => item.book === 'luke' && item.chapter === 2));
  assert.deepEqual(reader.parseReaderReference('Luke 1:1'), { language: 'greek', book: 'luke', chapter: 1, verse: '1' });
  assert.deepEqual(reader.parseReaderReference('Luke 24'), { language: 'greek', book: 'luke', chapter: 24, verse: '' });
  assert.match(html, /Luke/);
});

test('search finds John surface forms, lemmas, and references', async () => {
  let html = '';
  const resultBox = { set innerHTML(value){ html = value; }, get innerHTML(){ return html; } };
  global.$ = selector => selector === '#readerSearchResults' ? resultBox : null;
  global.$$ = () => [];
  await reader.loadReaderManifest('greek');
  const surfaceResults = await reader.runReaderSearch('ὁ λόγος ἦν πρὸς');
  assert.ok(surfaceResults.some(item => item.book === 'john' && item.chapter === 1 && item.verse === 1));
  const lemmaResults = await reader.runReaderSearch('Ἰησοῦς ὅστις');
  assert.ok(lemmaResults.some(item => item.book === 'john' && item.chapter === 21));
  assert.deepEqual(reader.parseReaderReference('John 1:1'), { language: 'greek', book: 'john', chapter: 1, verse: '1' });
  assert.deepEqual(reader.parseReaderReference('John 21'), { language: 'greek', book: 'john', chapter: 21, verse: '' });
  assert.match(html, /John/);
});

test('chapter data lazy loads only requested chapters and uses cache', async () => {
  reader.readerChapterCache.clear();
  for(const key of Object.keys(reader.readerLoadCounts)) delete reader.readerLoadCounts[key];
  await reader.loadReaderChapter('greek', 'matthew', 1);
  await reader.loadReaderChapter('greek', 'matthew', 1);
  assert.equal(reader.readerLoadCounts['greek/matthew/1'], 1);
  assert.equal(reader.readerLoadCounts['greek/matthew/28'] || 0, 0);
  assert.equal(reader.readerLoadCounts['greek/luke/24'] || 0, 0);
  assert.equal(reader.readerLoadCounts['greek/john/21'] || 0, 0);
});

const fs = require('node:fs');
const vm = require('node:vm');

function makeElement(id = ''){
  const classes = new Set();
  return {
    id,
    dataset: {},
    innerHTML: '',
    textContent: '',
    value: '',
    disabled: false,
    listeners: {},
    classList: {
      add: cls => classes.add(cls),
      remove: cls => classes.delete(cls),
      contains: cls => classes.has(cls),
      toggle: (cls, force) => {
        const shouldAdd = force === undefined ? !classes.has(cls) : Boolean(force);
        if(shouldAdd) classes.add(cls); else classes.delete(cls);
        return shouldAdd;
      }
    },
    addEventListener(type, fn){ this.listeners[type] = fn; },
    click(){ this.listeners.click?.({ target: this }); }
  };
}

function createReaderStartupHarness(){
  const ids = ['listView','flashView','parsingView','dashboardView','settingsView','grammarView','readerView','profileView','sharedFilterBar','filterSearchGroup','filterSortGroup','filterEntriesCount','filterPosGroup','footerLang'];
  const elements = new Map(ids.map(id => [id, makeElement(id)]));
  elements.get('readerView').classList.add('hidden');
  const readerTab = makeElement('readerTab');
  readerTab.dataset.view = 'reader';
  const navTabs = [readerTab];
  const document = {
    getElementById: id => elements.get(id) || null,
    querySelector: selector => selector.startsWith('#') ? (elements.get(selector.slice(1)) || null) : null,
    querySelectorAll: selector => selector === '.nav-tab' ? navTabs : []
  };
  const context = {
    console,
    document,
    window: { location: { pathname: '/list' }, addEventListener() {} },
    history: {
      pushState: (s, t, url) => { context.window.location.pathname = url; },
      replaceState: (s, t, url) => { context.window.location.pathname = url; }
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
    initReaderCalls: 0,
    module: undefined
  };
  context.$ = selector => document.querySelector(selector);
  context.$$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  context.initReader = () => { context.initReaderCalls += 1; return Promise.resolve(); };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('src/core/router.js', 'utf8'), context, { filename: 'src/core/router.js' });
  const vocabSource = fs.readFileSync('src/features/vocab/index.js', 'utf8');
  vm.runInContext(vocabSource.slice(0, vocabSource.indexOf('/* ---------- Language ---------- */')), context, { filename: 'src/features/vocab/index.js' });
  return { context, elements, readerTab };
}

test('Reader button opens Reader view and initializes successfully', () => {
  const { context, elements, readerTab } = createReaderStartupHarness();
  readerTab.addEventListener('click', () => context.navigateTo('/reader'));
  readerTab.click();
  assert.equal(context.window.location.pathname, '/reader');
  assert.equal(context.state.currentView, 'readerView');
  assert.equal(elements.get('readerView').classList.contains('hidden'), false);
  assert.equal(elements.get('listView').classList.contains('hidden'), true);
  assert.equal(context.initReaderCalls, 1);
});

test('Reader route can be entered directly and showView accepts reader nav id', () => {
  const { context, elements } = createReaderStartupHarness();
  context.window.location.pathname = '/reader';
  context.initRouter();
  assert.equal(context.state.currentView, 'readerView');
  assert.equal(elements.get('readerView').classList.contains('hidden'), false);

  context.showView('reader');
  assert.equal(context.state.currentView, 'readerView');
  assert.equal(context.routeForView('reader'), '/reader');
});

test('Reader render creates visible chapter controls and loaded chapter text', async () => {
  let html = '';
  const shell = { set innerHTML(value){ html = value; }, get innerHTML(){ return html; } };
  global.$ = selector => selector === '#readerShell' ? shell : null;
  global.$$ = () => [];
  await reader.setReaderLocation({ language: 'greek', book: 'matthew', chapter: 1 });
  assert.match(html, /id="readerBookSelect"/);
  assert.match(html, /id="readerChapterSelect"/);
  assert.match(html, /Matthew 1/);
  assert.match(renderedText(html), /Βίβλος γενέσεως/);
  assert.equal(reader.readerState().error, '');
});

test('Reader loads Jonah 1 through the shared Hebrew reader path with RTL text', async () => {
  let html = '';
  const shell = { set innerHTML(value){ html = value; }, get innerHTML(){ return html; } };
  global.$ = selector => selector === '#readerShell' ? shell : null;
  global.$$ = () => [];
  await reader.setReaderLocation({ language: 'hebrew', book: 'jonah', chapter: 1 });
  assert.equal(reader.readerState().language, 'hebrew');
  assert.equal(reader.readerState().book, 'jonah');
  assert.match(html, /id="readerLanguageSelect"/);
  assert.match(html, /<option value="hebrew" selected>Hebrew<\/option>/);
  assert.match(html, /<article class="reader-text reader-text-hebrew" aria-live="polite"/);
  assert.doesNotMatch(html, /<article class="reader-text reader-text-hebrew"[^>]*(lang|dir)=/);
  assert.match(html, /<p class="reader-paragraph" lang="he" dir="rtl">/);
  assert.match(html, /Jonah 1/);
  assert.match(renderedText(html), /וַֽיְהִי֙ דְּבַר יְהוָ֔ה/);
  assert.match(html, /class="reader-token"/);
  assert.match(html, /data-lemma="1961"/);
  assert.match(html, /data-parse="HC\/Vqw3ms"/);
  assert.equal(reader.getAdjacentReaderLocation(1), null);
});

test('Hebrew search uses the Hebrew index and keeps RTL attributes on result text only', async () => {
  let html = '';
  const resultBox = { set innerHTML(value){ html = value; }, get innerHTML(){ return html; } };
  global.$ = selector => selector === '#readerSearchResults' ? resultBox : null;
  global.$$ = () => [];
  await reader.setReaderLocation({ language: 'hebrew', book: 'jonah', chapter: 1 });
  const lemmaResults = await reader.runReaderSearch('3068');
  assert.ok(lemmaResults.some(item => item.book === 'jonah' && item.chapter === 1 && item.verse === 1));
  assert.match(html, /data-language="hebrew"/);
  assert.match(html, /<span lang="he" dir="rtl">/);
  assert.deepEqual(reader.parseReaderReference('Jonah 1:1', 'hebrew'), { language: 'hebrew', book: 'jonah', chapter: 1, verse: '1' });
});

test('Hebrew token lookup and popup display Jonah gloss, lemma, frequency, reference, and grammar links', async () => {
  let popupHtml = '';
  const root = {
    set innerHTML(value){ popupHtml = value; },
    get innerHTML(){ return popupHtml; },
    querySelector: selector => selector === '.reader-word-close' ? { addEventListener(){}, focus(){} } : null,
    querySelectorAll: selector => selector === '.reader-word-link' ? [{ dataset: { topicId: 'hebrew-verbs' }, addEventListener(){} }] : []
  };
  global.PuritanReferenceLibrary = { getReferenceTopic: id => ({ id }) };
  global.$ = (selector, scope) => scope?.querySelector ? scope.querySelector(selector) : (selector === '#readerWordPopupRoot' ? root : null);
  global.$$ = (selector, scope) => scope?.querySelectorAll ? scope.querySelectorAll(selector) : [];
  await reader.setReaderLocation({ language: 'hebrew', book: 'jonah', chapter: 1 });
  await reader.openReaderTokenPopup({
    dataset: { surface: 'וַֽיְהִי֙', lemma: '1961', parse: 'HC/Vqw3ms', book: 'jonah', bookName: 'Jonah', chapter: '1', verse: '1' },
    focus(){}
  });
  assert.match(popupHtml, /reader-word-popup/);
  assert.match(popupHtml, /lang="he" dir="rtl">וַֽיְהִי֙/);
  assert.match(popupHtml, /be/);
  assert.match(popupHtml, /Lemma[\s\S]*1961/);
  assert.match(popupHtml, /Frequency[\s\S]*2×/);
  assert.match(popupHtml, /Reference[\s\S]*Jonah 1:1/);
  assert.match(popupHtml, /Verb — qal wayyiqtol 3rd person masculine singular/);
  assert.match(popupHtml, /data-topic-id="hebrew-verbs"/);
  assert.match(popupHtml, /Parse: HC\/Vqw3ms/);
  reader.closeReaderWordPopup();
  delete global.PuritanReferenceLibrary;
});

test('Hebrew Word Page opens from the shared popup and Read in Context uses the Hebrew index', async () => {
  let popupHtml = '';
  let wordPageHtml = '';
  let actionHandler;
  let shownView = '';
  const popupRoot = {
    set innerHTML(value){ popupHtml = value; },
    get innerHTML(){ return popupHtml; },
    querySelector: selector => {
      if(selector === '.reader-word-close') return { addEventListener(){}, focus(){} };
      if(selector === '.reader-word-page-action') return { addEventListener(type, handler){ if(type === 'click') actionHandler = handler; } };
      return null;
    },
    querySelectorAll: () => []
  };
  const wordRoot = {
    set innerHTML(value){ wordPageHtml = value; },
    get innerHTML(){ return wordPageHtml; },
    querySelector: selector => selector === '#wordPageBackToReader' ? { addEventListener(){} } : null,
    querySelectorAll: selector => selector === '.reader-word-link' ? [{ dataset: { topicId: 'hebrew-nouns' }, addEventListener(){} }] : []
  };
  global.PuritanReferenceLibrary = { getReferenceTopic: id => ({ id }) };
  global.$ = (selector, scope) => {
    if(scope?.querySelector) return scope.querySelector(selector);
    if(selector === '#readerWordPopupRoot') return popupRoot;
    if(selector === '#wordPageShell') return wordRoot;
    return null;
  };
  global.$$ = (selector, scope) => scope?.querySelectorAll ? scope.querySelectorAll(selector) : [];
  global.showView = view => { shownView = view; };
  await reader.setReaderLocation({ language: 'hebrew', book: 'jonah', chapter: 1 });
  await reader.openReaderTokenPopup({
    dataset: { surface: 'דְּבַר', lemma: '1697', parse: 'HNcmsc', book: 'jonah', bookName: 'Jonah', chapter: '1', verse: '1' },
    focus(){}
  });
  actionHandler();
  assert.equal(shownView, 'wordPageView');
  assert.equal(popupHtml, '');
  assert.match(wordPageHtml, /<h1 id="wordPageTitle" class="word-page-headword" lang="he" dir="rtl">דְּבַר<\/h1>/);
  assert.match(wordPageHtml, /word-page-pos">Noun<\/div>/);
  assert.match(wordPageHtml, /word-page-primary-gloss">word<\/p>/);
  assert.match(wordPageHtml, /matter[\s\S]*thing/);
  assert.match(wordPageHtml, /<dt>Current Reference<\/dt><dd>Jonah 1:1<\/dd>/);
  assert.match(wordPageHtml, /data-topic-id="hebrew-nouns"/);

  const occurrences = await reader.getReaderLemmaOccurrences('1697', 'hebrew', 5);
  assert.ok(occurrences.some(item => item.reference === 'Jonah 1:1'));
  const contextHtml = reader.renderReaderWordPageContext(occurrences);
  assert.match(contextHtml, /data-language="hebrew"/);
  assert.match(contextHtml, /<q lang="he" dir="rtl">/);
  delete global.showView;
  delete global.PuritanReferenceLibrary;
});

test('Matthew 28 loads from generated chapter data', async () => {
  const chapter = await reader.loadReaderChapter('greek', 'matthew', 28);
  assert.equal(chapter.bookName, 'Matthew');
  assert.equal(chapter.chapter, 28);
  assert.equal(chapter.verses.at(-1).verse, 20);
  assert.match(renderedText(reader.renderReaderChapter(chapter)), /πάντα τὰ ἔθνη/);
});

test('Matthew chapter selector contains all 28 chapters', async () => {
  let html = '';
  const shell = { set innerHTML(value){ html = value; }, get innerHTML(){ return html; } };
  global.$ = selector => selector === '#readerShell' ? shell : null;
  global.$$ = () => [];
  await reader.setReaderLocation({ language: 'greek', book: 'matthew', chapter: 1 });
  const chapterOptions = [...html.matchAll(/<option value="(\d+)"/g)].map(match => Number(match[1]));
  assert.deepEqual(chapterOptions, Array.from({ length: 28 }, (_, i) => i + 1));
});

test('Reader loads generated manifest and exposes Matthew 1-28 dynamically', async () => {
  reader.readerManifestCache.clear();
  reader.ReaderConfig.greek.books = [];
  await reader.loadReaderManifest('greek');
  assert.deepEqual(reader.getReaderBookChapters('greek', 'matthew'), Array.from({ length: 28 }, (_, i) => i + 1));
  assert.deepEqual(reader.getReaderBookChapters('greek', 'mark'), Array.from({ length: 16 }, (_, i) => i + 1));
  assert.deepEqual(reader.getReaderBookChapters('greek', 'luke'), Array.from({ length: 24 }, (_, i) => i + 1));
  assert.deepEqual(reader.getReaderBookChapters('greek', 'john'), Array.from({ length: 21 }, (_, i) => i + 1));
});

test('Reader runtime schema accepts generated chapter verse objects', async () => {
  const chapter = await reader.loadReaderChapter('greek', 'matthew', 1);
  assert.ok(Array.isArray(chapter.verses));
  assert.deepEqual(Object.keys(chapter.verses[0]).sort(), ['text', 'tokens', 'verse']);
  const html = reader.renderReaderChapter(chapter);
  assert.match(html, /reader-chapter-heading/);
  assert.match(html, /class="reader-token"/);
  assert.match(renderedText(html), /1 Βίβλος γενέσεως/);
});

test('Reader fetches generated data paths and not sample reader data', async () => {
  const paths = [];
  const previousFetch = global.fetch;
  global.fetch = async filePath => {
    paths.push(filePath);
    return previousFetch(filePath);
  };
  reader.readerManifestCache.clear();
  reader.readerChapterCache.clear();
  reader.ReaderConfig.greek.books = [];
  await reader.setReaderLocation({ language: 'greek', book: 'matthew', chapter: 1 });
  global.fetch = previousFetch;
  assert.ok(paths.includes('data/greek/manifest.json'));
  assert.ok(paths.includes('data/greek/matthew/1.json'));
  assert.ok(paths.every(item => !String(item).includes('sample')));
});
