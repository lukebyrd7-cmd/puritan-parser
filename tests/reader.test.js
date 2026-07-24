const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

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
const VocabularyLearning = require('../src/models/vocabulary-learning');
const StudySets = require('../src/models/study-sets');

function renderedText(html){
  return String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

const expectedHebrewBooks = [
  'genesis', 'exodus', 'leviticus', 'numbers', 'deuteronomy',
  'joshua', 'judges', '1samuel', '2samuel', '1kings',
  '2kings', 'isaiah', 'jeremiah', 'ezekiel', 'hosea',
  'joel', 'amos',
  'obadiah', 'jonah', 'micah', 'nahum', 'habakkuk',
  'zephaniah', 'haggai', 'zechariah', 'malachi', 'psalms',
  'proverbs', 'job', 'songofsolomon', 'ruth', 'lamentations',
  'ecclesiastes', 'esther', 'daniel', 'ezra', 'nehemiah',
  '1chronicles', '2chronicles'
];

test('reader loads a Greek chapter from the chapter-file structure', async () => {
  const chapter = await reader.loadReaderChapter('greek', 'matthew', 1);
  assert.equal(chapter.bookName, 'Matthew');
  assert.equal(chapter.chapter, 1);
  assert.match(renderedText(reader.renderReaderChapter(chapter)), /Βίβλος γενέσεως/);
});

test('Reader language configuration lists Hebrew before Greek', () => {
  assert.deepEqual(Object.keys(reader.ReaderConfig), ['hebrew', 'greek']);
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

test('Adaptive Reader settings render from the Reader and persist locally', () => {
  const storage = storageHarness();
  let html = '';
  const shell = { set innerHTML(value){ html = value; }, get innerHTML(){ return html; } };
  global.$ = selector => selector === '#readerShell' ? shell : null;
  global.$$ = () => [];

  reader.saveReaderSettings({ display: 'interlinear', assistance: '30', hideKnown: true }, 'greek');
  assert.deepEqual(reader.loadReaderSettings('greek'), {
    ...reader.ReaderDefaultSettings,
    display: 'interlinear',
    assistance: '30',
    hideKnown: true
  });

  reader.renderReader();
  assert.match(html, /id="readerSettingsPanel"/);
  assert.match(html, /Adaptive Reader settings/);
  assert.match(html, /Display/);
  assert.match(html, /Translation/);
  assert.match(html, /English Translation/);
  assert.match(html, /WEB/);
  assert.match(html, /Assistance/);
  assert.match(html, /Hide Known Words/);
  assert.match(html, /<summary class="btn btn-ghost btn-sm">Display<\/summary>/);
  assert.match(html, /id="readerOptionsBtn"[^>]*>Reader options<\/button>/);
  assert.match(html, /Show Translation Toggle/);
  assert.match(html, /Indicator/);
  assert.match(html, /Interlinear • WEB • 30\+ • Hide Known/);
  assert.match(html, /id="readerSearchToggle"[\s\S]*>Search<\/button>/);
  assert.match(html, /reader-search hidden/);
  assert.match(html, /aria-label="View Book Progress"[\s\S]*>Progress<\/button>/);
  assert.ok(storage.has('pp_reader_adaptive_settings'));
});

test('Adaptive Reader panel stays open after setting changes and closes intentionally', () => {
  storageHarness();
  let html = '';
  const shell = { set innerHTML(value){ html = value; }, get innerHTML(){ return html; } };
  global.$ = selector => selector === '#readerShell' ? shell : null;
  global.$$ = () => [];

  reader.openReaderSettingsPanel();
  assert.match(html, /id="readerSettingsPanel" open/);

  reader.updateReaderSetting('display', 'interlinear');
  assert.match(html, /id="readerSettingsPanel" open/);
  assert.equal(reader.loadReaderSettings('greek').display, 'interlinear');

  reader.handleReaderPopupKeydown({ key: 'Escape' });
  assert.doesNotMatch(html, /id="readerSettingsPanel" open/);

  reader.openReaderSettingsPanel();
  reader.handleReaderDocumentClick({ target: { closest: () => null } });
  assert.doesNotMatch(html, /id="readerSettingsPanel" open/);

  reader.openReaderSettingsPanel();
  reader.closeReaderSettingsPanel();
  assert.doesNotMatch(html, /id="readerSettingsPanel" open/);
});

test('Reader controls stay fixed in the reader shell and search expands only when requested', async () => {
  storageHarness();
  let html = '';
  const shell = { set innerHTML(value){ html = value; }, get innerHTML(){ return html; } };
  global.$ = selector => selector === '#readerShell' ? shell : null;
  global.$$ = () => [];

  await reader.setReaderLocation({ language: 'greek', book: 'matthew', chapter: 1 });
  assert.match(html, /class="panel reader-controls"/);
  assert.match(html, /id="readerPrevBtn"[\s\S]*id="readerNextBtn"/);
  assert.ok(html.indexOf('class="reader-translation-bar"') > html.indexOf('id="readerNextBtn"'));
  assert.ok(html.indexOf('class="reader-translation-bar"') < html.indexOf('id="readerSettingsPanel"'));
  assert.ok(html.indexOf('class="reader-translation-bar"') < html.indexOf('class="panel reader-search hidden"'));
  assert.match(html, /id="readerSearchToggle" type="button" aria-expanded="false"/);
  assert.match(html, /reader-search hidden/);

  reader.openReaderSearch();
  assert.match(html, /id="readerSearchToggle" type="button" aria-expanded="true"/);
  assert.match(html, /class="panel reader-search"/);
  assert.doesNotMatch(html, /reader-search hidden/);

  reader.closeReaderSearch();
  assert.match(html, /reader-search hidden/);
});

test('Mobile Reader compact layout keeps all core controls accessible and quiets duplicate heading', async () => {
  storageHarness();
  reader.saveReaderSettings({ ...reader.ReaderDefaultSettings, translation: 'on', showTranslationToggle: true }, 'greek');
  let html = '';
  const shell = { set innerHTML(value){ html = value; }, get innerHTML(){ return html; } };
  global.$ = selector => selector === '#readerShell' ? shell : null;
  global.$$ = () => [];

  await reader.setReaderLocation({ language: 'greek', book: 'john', chapter: 1, mode: 'chapter' });

  assert.match(html, /class="reader-control-row reader-control-selects"/);
  assert.match(html, /id="readerLanguageSelect"/);
  assert.match(html, /id="readerBookSelect"/);
  assert.match(html, /id="readerChapterSelect"/);
  assert.match(html, /id="readerPrevBtn"[\s\S]*id="readerNextBtn"/);
  assert.match(html, /id="readerPrevBtn"[^>]*aria-label="Previous chapter"[\s\S]*class="reader-nav-label">Previous/);
  assert.match(html, /id="readerNextBtn"[^>]*aria-label="Next chapter"[\s\S]*class="reader-nav-label">Next/);
  assert.match(html, /data-reader-text-mode="original"[\s\S]*data-reader-text-mode="english"/);
  assert.match(html, /id="readerSettingsPanel"/);
  assert.match(html, /id="readerSearchToggle"/);
  assert.match(html, /id="readerBookProgressBtn"/);
  assert.match(html, /id="readerReference"[\s\S]*John 1/);
  assert.match(html, /reader-chapter-heading reader-chapter-heading-quiet/);

  const css = fs.readFileSync(path.join(process.cwd(), 'styles.css'), 'utf8');
  const mobileReaderCss = css.match(/@media \(max-width: 640px\) \{[\s\S]*?\.reader-word-overlay/)?.[0] || '';
  assert.match(mobileReaderCss, /\.reader-control-actions\s*\{[\s\S]*display: flex/);
  assert.match(mobileReaderCss, /\.app:has\(#readerView:not\(\.hidden\)\) footer\s*\{[\s\S]*display: none/);
  assert.match(mobileReaderCss, /\.reader-nav-btn\s*\{[\s\S]*width: 32px/);
  assert.match(mobileReaderCss, /\.reader-nav-label\s*\{[\s\S]*display: none/);
  assert.match(mobileReaderCss, /\.reader-reference\s*\{[\s\S]*display: none/);
  assert.match(mobileReaderCss, /\.reader-settings summary,[\s\S]*\.reader-options-link,[\s\S]*\.reader-search-toggle,[\s\S]*\.reader-progress-link\s*\{[\s\S]*min-height: 30px/);
  assert.match(mobileReaderCss, /\.reader-chapter-heading-quiet\s*\{[\s\S]*position: absolute/);
});

test('Show Translation Toggle is optional and persists with Adaptive Reader settings', async () => {
  storageHarness();
  let html = '';
  const shell = { set innerHTML(value){ html = value; }, get innerHTML(){ return html; } };
  global.$ = selector => selector === '#readerShell' ? shell : null;
  global.$$ = () => [];

  reader.saveReaderSettings({ ...reader.ReaderDefaultSettings, translation: 'on', showTranslationToggle: true }, 'greek');
  await reader.setReaderLocation({ language: 'greek', book: 'john', chapter: 1 });
  assert.match(html, /class="reader-translation-bar"/);
  assert.match(html, /Show Translation Toggle/);

  reader.openReaderSettingsPanel();
  reader.updateReaderSetting('showTranslationToggle', false);
  assert.equal(reader.loadReaderSettings('greek').showTranslationToggle, false);
  assert.doesNotMatch(html, /data-reader-text-mode="english"/);
  assert.match(html, /id="readerSettingsPanel" open/);
  reader.closeReaderSettingsPanel();
});

test('Adaptive Reader display modes render original and clean interlinear text', () => {
  global.state = { data: { greek: [
    { lang: 'greek', lemma: 'λόγος', word: 'λόγος', primaryGloss: 'word', gloss: 'word', freq: 3 }
  ] } };
  const verse = { verse: 1, text: 'λόγος', tokens: [{ surface: 'λόγος', lemma: 'λόγος', parse: 'N-NSM' }] };
  const original = reader.renderReaderVerse(verse, { book: 'john', bookName: 'John', chapter: 1 }, { ...reader.ReaderDefaultSettings, display: 'original' });
  assert.match(original, /class="reader-token"/);
  assert.doesNotMatch(original, /reader-token-gloss/);

  const interlinear = reader.renderReaderVerse(verse, { book: 'john', bookName: 'John', chapter: 1 }, { ...reader.ReaderDefaultSettings, display: 'interlinear' });
  assert.match(interlinear, /reader-token-interlinear/);
  assert.match(interlinear, /reader-token-surface" lang="grc" dir="ltr">λόγος/);
  assert.match(interlinear, /reader-token-gloss" lang="en" dir="ltr">word/);
  delete global.state;
});

test('Hebrew Interlinear is unavailable without reliable token-level gloss data', () => {
  const verse = {
    verse: 1,
    text: 'וַֽיְהִי֙',
    tokens: [{ surface: 'וַֽיְהִי֙', lemma: '1961', parse: 'HC/Vqw3ms', sourceLemma: 'c/1961' }]
  };
  const chapter = { language: 'hebrew', book: 'jonah', bookName: 'Jonah', chapter: 1, verses: [verse] };
  const html = reader.renderReaderChapter(chapter, { ...reader.ReaderDefaultSettings, display: 'interlinear' });

  assert.match(html, /Hebrew interlinear is not available yet because token-level gloss data is still being prepared\./);
  assert.match(html, /<p class="reader-paragraph" lang="he" dir="rtl">/);
  assert.match(html, /lang="he" dir="rtl" data-reader-assisted="true"/);
  assert.match(html, /reader-token-surface" lang="he" dir="rtl">וַֽיְהִי֙/);
  assert.match(html, /data-lemma="1961"/);
  assert.match(html, /data-parse="HC\/Vqw3ms"/);
  assert.match(html, /data-source-lemma="c\/1961"/);
  assert.doesNotMatch(html, /reader-token-interlinear/);
  assert.doesNotMatch(html, /reader-token-gloss/);
  assert.doesNotMatch(html, /reader-token-details/);
  assert.doesNotMatch(html, />1961</);
  assert.doesNotMatch(html, /HC\/Vqw3ms<\/span>/);
  assert.doesNotMatch(html, /undefined|null/);
});

test('Hebrew Interlinear does not use lemma or root fields as pseudo-glosses', () => {
  const html = reader.renderReaderVerse({
    verse: 1,
    text: 'אָב',
    tokens: [{ surface: 'אָב', lemma: '999', root: 'אב' }]
  }, { language: 'hebrew', book: 'genesis', bookName: 'Genesis', chapter: 1 }, { ...reader.ReaderDefaultSettings, display: 'interlinear' });

  assert.match(html, /reader-token-surface" lang="he" dir="rtl">אָב/);
  assert.doesNotMatch(html, /reader-token-interlinear/);
  assert.doesNotMatch(html, /reader-token-gloss/);
  assert.doesNotMatch(html, /reader-token-details/);
  assert.doesNotMatch(html, />999</);
  assert.doesNotMatch(html, />אב</);
  assert.doesNotMatch(html, /undefined|null/);
});

test('Hebrew Interlinear fallback does not expose numeric-only support fields', () => {
  const html = reader.renderReaderVerse({
    verse: 1,
    text: 'אָב',
    tokens: [{ surface: 'אָב', lemma: '999' }]
  }, { language: 'hebrew', book: 'genesis', bookName: 'Genesis', chapter: 1 }, { ...reader.ReaderDefaultSettings, display: 'interlinear' });

  assert.match(html, /reader-token-surface" lang="he" dir="rtl">אָב/);
  assert.doesNotMatch(html, /reader-token-interlinear/);
  assert.doesNotMatch(html, /reader-token-gloss/);
  assert.doesNotMatch(html, /reader-token-details/);
  assert.doesNotMatch(html, />999</);
  assert.doesNotMatch(html, /undefined|null/);
});

test('Hebrew Original mode remains tokenized without interlinear lines', () => {
  const verse = {
    verse: 1,
    text: 'וַֽיְהִי֙',
    tokens: [{ surface: 'וַֽיְהִי֙', lemma: '1961', parse: 'HC/Vqw3ms', sourceLemma: 'c/1961' }]
  };
  const html = reader.renderReaderVerse(verse, { language: 'hebrew', book: 'jonah', bookName: 'Jonah', chapter: 1 }, { ...reader.ReaderDefaultSettings, display: 'original' });
  assert.match(html, /class="reader-token"/);
  assert.match(html, /reader-token-surface" lang="he" dir="rtl">וַֽיְהִי֙/);
  assert.doesNotMatch(html, /reader-token-interlinear/);
  assert.doesNotMatch(html, /reader-token-gloss/);
  assert.doesNotMatch(html, /reader-token-details/);
});

test('Hebrew Reader Settings disable Interlinear with a quiet note', async () => {
  storageHarness();
  let html = '';
  const shell = { set innerHTML(value){ html = value; }, get innerHTML(){ return html; } };
  global.$ = selector => selector === '#readerShell' ? shell : null;
  global.$$ = () => [];
  reader.saveReaderSettings({ ...reader.ReaderDefaultSettings, display: 'interlinear', translation: 'off' }, 'greek');
  assert.equal(reader.loadReaderSettings('greek').display, 'interlinear');
  assert.equal(reader.loadReaderSettings('hebrew').display, 'original');

  await reader.setReaderLocation({ language: 'hebrew', book: 'jonah', chapter: 1 });

  assert.match(html, /data-reader-setting="display" data-reader-value="original" [^>]*>Original/);
  assert.match(html, /data-reader-setting="display" data-reader-value="interlinear" disabled aria-describedby="readerInterlinearUnavailable">Interlinear/);
  assert.match(html, /Hebrew interlinear is not available yet because token-level gloss data is still being prepared\./);
  assert.doesNotMatch(html, /reader-token-interlinear/);
  assert.doesNotMatch(html, /reader-token-gloss/);
  assert.doesNotMatch(html, /reader-token-details/);
  assert.doesNotMatch(html, /undefined|null/);
});

test('Adaptive Reader translation mode shows the Original English toggle and displays one text', () => {
  const chapter = {
    language: 'greek',
    book: 'john',
    bookName: 'John',
    chapter: 1,
    verses: [{
      verse: 1,
      text: 'Ἐν ἀρχῇ ἦν ὁ λόγος.',
      english: 'In the beginning was the Word.',
      tokens: [{ surface: 'Ἐν', lemma: 'ἐν', parse: 'P' }]
    }]
  };
  assert.match(reader.renderReaderTranslationToggle({ ...reader.ReaderDefaultSettings, translation: 'on' }, chapter), /data-reader-text-mode="english"/);
  const original = reader.renderReaderChapter(chapter, { ...reader.ReaderDefaultSettings, translation: 'on', textMode: 'original' });
  assert.match(original, /data-reader-language-layer="original" aria-hidden="false"/);
  assert.match(original, /data-reader-language-layer="english" aria-hidden="true" hidden inert/);
  const english = reader.renderReaderChapter(chapter, { ...reader.ReaderDefaultSettings, translation: 'on', textMode: 'english' });
  assert.match(english, /data-reader-language-layer="original" aria-hidden="true" hidden inert/);
  assert.match(english, /data-reader-language-layer="english" aria-hidden="false"/);
  assert.match(english, /In the beginning was the Word/);
  assert.match(english, /data-reader-language-layer="original"[\s\S]*data-surface="Ἐν"/);

  const unavailable = reader.renderReaderChapter({ ...chapter, verses: [{ verse: 99, text: 'λόγος' }] }, { ...reader.ReaderDefaultSettings, translation: 'on', textMode: 'english' });
  assert.match(unavailable, /English unavailable for this passage/);
});

test('Reader visibility is always one exclusive Original or English choice', () => {
  const chapter = {
    language: 'greek', book: 'john', bookName: 'John', chapter: 1,
    verses: [{ verse: 1, text: 'Ἐν ἀρχῇ.', english: 'In the beginning.', tokens: [{ surface: 'Ἐν', lemma: 'ἐν', parse: 'P' }] }]
  };
  const legacyBoth = reader.sanitizeReaderSettings({
    ...reader.ReaderDefaultSettings,
    translation: 'on',
    showOriginal: true,
    showEnglish: true
  });
  assert.equal(legacyBoth.textMode, 'original');
  assert.equal(legacyBoth.showOriginal, true);
  assert.equal(legacyBoth.showEnglish, false);

  const legacyBothPrefersEnglish = reader.sanitizeReaderSettings({
    ...reader.ReaderDefaultSettings,
    translation: 'on',
    textMode: 'english',
    showOriginal: true,
    showEnglish: true
  });
  assert.equal(legacyBothPrefersEnglish.textMode, 'english');
  assert.equal(legacyBothPrefersEnglish.showOriginal, false);
  assert.equal(legacyBothPrefersEnglish.showEnglish, true);

  const legacyNeither = reader.sanitizeReaderSettings({
    ...reader.ReaderDefaultSettings,
    translation: 'on',
    showOriginal: false,
    showEnglish: false
  });
  assert.equal(legacyNeither.showOriginal, true);
  assert.equal(legacyNeither.showEnglish, false);

  const originalHtml = reader.renderReaderChapter(chapter, legacyBoth);
  assert.match(originalHtml, /data-reader-language-layer="original" aria-hidden="false"/);
  assert.match(originalHtml, /data-reader-language-layer="english" aria-hidden="true" hidden inert/);
  const englishHtml = reader.renderReaderChapter(chapter, legacyBothPrefersEnglish);
  assert.match(englishHtml, /data-reader-language-layer="original" aria-hidden="true" hidden inert/);
  assert.match(englishHtml, /data-reader-language-layer="english" aria-hidden="false"/);
});

test('Reader restores a logical anchor from an English-only verse', () => {
  const previousDocument = global.document;
  const previousWindow = global.window;
  const previousDollar = global.$;
  let scrollTop = 400;
  const currentBook = reader.readerState().book;
  const englishVerse = {
    dataset: { readerBook: currentBook, readerChapter: '1', readerEnglishVerse: '8' },
    getBoundingClientRect: () => ({ top: 210, bottom: 248 })
  };
  const pane = {
    clientHeight: 700,
    get scrollTop(){ return scrollTop; },
    set scrollTop(value){ scrollTop = value; },
    getBoundingClientRect: () => ({ top: 50, bottom: 750, height: 700 })
  };
  global.document = {
    documentElement: { style: {} },
    querySelector: selector => selector === '.reader-text' ? pane : null,
    querySelectorAll: selector => selector.includes('data-reader-english-verse') ? [englishVerse] : []
  };
  global.window = { matchMedia: () => ({ matches: false }), scrollY: 0 };
  global.$ = selector => selector === '.reader-text' ? pane : null;

  const restored = reader.restoreReaderPlace({ chapter: 1, verse: '8', anchorOffset: 80 }, { scheduledAt: Date.now() });

  global.document = previousDocument;
  global.window = previousWindow;
  global.$ = previousDollar;
  assert.equal(restored, true);
  assert.equal(scrollTop, 480);
});

test('stale scheduled restoration cannot overwrite the latest canonical verse', () => {
  storageHarness();
  const previousDocument = global.document;
  const previousWindow = global.window;
  const previousDollar = global.$;
  const frames = [];
  const pane = {
    scrollTop: 300,
    clientHeight: 700,
    getBoundingClientRect: () => ({ top: 0, bottom: 700, height: 700 })
  };
  const verses = ['1', '2'].map((verse, index) => ({
    dataset: { readerBook: reader.readerState().book, readerChapter: String(reader.readerState().chapter), readerVerse: verse },
    getBoundingClientRect: () => ({ top: 100 + index * 80, bottom: 130 + index * 80 })
  }));
  global.document = {
    documentElement: { style: {} },
    querySelector: selector => selector === '.reader-text' ? pane : null,
    querySelectorAll: () => verses
  };
  global.window = {
    scrollY: 0,
    matchMedia: () => ({ matches: false }),
    requestAnimationFrame(callback){ frames.push(callback); return frames.length; },
    cancelAnimationFrame(){}
  };
  global.$ = selector => selector === '.reader-text' ? pane : null;
  reader.readerState().anchorVerse = 'baseline';

  reader.scheduleReaderPlaceRestore({ chapter: reader.readerState().chapter, verse: '1', anchorOffset: 60 });
  reader.scheduleReaderPlaceRestore({ chapter: reader.readerState().chapter, verse: '2', anchorOffset: 60 });
  frames[0]();
  assert.notEqual(reader.readerState().anchorVerse, '1');
  frames[1]();
  assert.equal(reader.readerState().anchorVerse, '2');

  global.document = previousDocument;
  global.window = previousWindow;
  global.$ = previousDollar;
});

test('Reader render hides the translation toggle when Translation is Off', async () => {
  storageHarness();
  reader.saveReaderSettings({ ...reader.ReaderDefaultSettings, translation: 'off' }, 'greek');
  let html = '';
  const shell = { set innerHTML(value){ html = value; }, get innerHTML(){ return html; } };
  global.$ = selector => selector === '#readerShell' ? shell : null;
  global.$$ = () => [];
  await reader.setReaderLocation({ language: 'greek', book: 'matthew', chapter: 1 });
  assert.doesNotMatch(html, /data-reader-text-mode="english"/);
});

test('Reader loads OEB English through the translation provider and preserves location', async () => {
  storageHarness();
  reader.saveReaderSettings({ ...reader.ReaderDefaultSettings, translation: 'on', translationProvider: 'oeb', textMode: 'english' }, 'greek');
  let html = '';
  const shell = { set innerHTML(value){ html = value; }, get innerHTML(){ return html; } };
  global.$ = selector => selector === '#readerShell' ? shell : null;
  global.$$ = () => [];

  const beforeLoads = reader.readerTranslationLoadCounts['oeb/john/1'] || 0;
  await reader.setReaderLocation({ language: 'greek', book: 'john', chapter: 1, verse: '1' });
  assert.equal(reader.readerState().language, 'greek');
  assert.equal(reader.readerState().book, 'john');
  assert.equal(reader.readerState().chapter, 1);
  assert.equal(reader.readerState().focusVerse, '1');
  assert.match(html, /data-reader-text-mode="original"/);
  assert.match(html, /In the beginning the Word was/);
  assert.match(html, /data-reader-language-layer="original" aria-hidden="true" hidden inert/);

  reader.updateReaderSetting('textMode', 'original');
  assert.equal(reader.readerState().book, 'john');
  assert.equal(reader.readerState().chapter, 1);
  assert.doesNotMatch(html, /id="readerSettingsPanel" open/);
  assert.match(html, /data-reader-language-layer="original" aria-hidden="false"/);
  assert.match(html, /data-reader-language-layer="english" aria-hidden="true" hidden inert/);
  assert.equal(reader.readerTranslationLoadCounts['oeb/john/1'], beforeLoads + 1);
});

test('Reader uses WEB directly when selected', async () => {
  storageHarness();
  reader.saveReaderSettings({ ...reader.ReaderDefaultSettings, translation: 'on', translationProvider: 'web', textMode: 'english' }, 'greek');
  let html = '';
  const shell = { set innerHTML(value){ html = value; }, get innerHTML(){ return html; } };
  global.$ = selector => selector === '#readerShell' ? shell : null;
  global.$$ = () => [];

  const beforeLoads = reader.readerTranslationLoadCounts['web/john/1'] || 0;
  await reader.setReaderLocation({ language: 'greek', book: 'john', chapter: 1 });
  assert.match(html, /In the beginning was the Word, and the Word was with God/);
  assert.doesNotMatch(html, /OEB unavailable here/);
  assert.equal(reader.readerState().translationData.translation, 'web');
  assert.equal(reader.readerState().translationStatus.active, 'web');
  assert.equal(reader.readerState().translationStatus.fallback, false);
  assert.equal(reader.readerTranslationLoadCounts['web/john/1'], beforeLoads + 1);
  reader.updateReaderSetting('textMode', 'original');
});

test('Reader defaults new users to WEB and preserves an existing OEB preference', () => {
  storageHarness();
  assert.equal(reader.loadReaderSettings('greek').translationProvider, 'web');
  reader.saveReaderSettings({ ...reader.ReaderDefaultSettings, translationProvider: 'oeb' }, 'greek');
  assert.equal(reader.loadReaderSettings('greek').translationProvider, 'oeb');
});

test('Reader falls back to WEB when OEB is selected but unavailable', async () => {
  storageHarness();
  reader.saveReaderSettings({ ...reader.ReaderDefaultSettings, translation: 'on', translationProvider: 'oeb', textMode: 'english' }, 'hebrew');
  let html = '';
  const shell = { set innerHTML(value){ html = value; }, get innerHTML(){ return html; } };
  global.$ = selector => selector === '#readerShell' ? shell : null;
  global.$$ = () => [];

  await reader.setReaderLocation({ language: 'hebrew', book: 'exodus', chapter: 1 });
  assert.match(html, /OEB unavailable here\. Showing WEB\./);
  assert.match(html, /Now these are the names of the sons of Israel/);
  assert.equal(reader.readerState().translationData.translation, 'web');
  assert.equal(reader.readerState().translationStatus.requested, 'oeb');
  assert.equal(reader.readerState().translationStatus.active, 'web');
  assert.equal(reader.readerState().translationStatus.fallback, true);
  assert.ok(reader.readerTranslationLoadCounts['oeb/exodus/1'] >= 1);
  assert.ok(reader.readerTranslationLoadCounts['web/exodus/1'] >= 1);
  reader.updateReaderSetting('textMode', 'original');
  await reader.setReaderLocation({ language: 'greek', book: 'john', chapter: 1 });
});

test('Reader shares settings across languages except assistance threshold', () => {
  storageHarness();
  reader.saveReaderSettings({ ...reader.ReaderDefaultSettings, translationProvider: 'web', display: 'interlinear', assistance: 'everything', showTranslationToggle: false }, 'greek');
  reader.saveReaderSettings({ ...reader.ReaderDefaultSettings, translationProvider: 'web', display: 'interlinear', assistance: '20', showTranslationToggle: false }, 'hebrew');
  assert.equal(reader.loadReaderSettings('hebrew').translationProvider, 'web');
  assert.equal(reader.loadReaderSettings('hebrew').display, 'original');
  assert.equal(reader.loadReaderSettings('hebrew').assistance, '20');
  assert.equal(reader.loadReaderSettings('hebrew').showTranslationToggle, false);
  assert.equal(reader.loadReaderSettings('greek').translationProvider, 'web');
  assert.equal(reader.loadReaderSettings('greek').display, 'interlinear');
  assert.equal(reader.loadReaderSettings('greek').assistance, 'everything');
  assert.equal(reader.loadReaderSettings('greek').showTranslationToggle, false);
});

test('Reader migrates legacy language settings into shared settings without merging thresholds', () => {
  const storage = storageHarness();
  storage.set('pp_reader_adaptive_settings', JSON.stringify({
    greek: {
      display: 'interlinear',
      translation: 'off',
      translationProvider: 'web',
      textMode: 'english',
      hideKnown: true,
      indicator: 'underline',
      showTranslationToggle: false,
      assistance: '30'
    },
    hebrew: {
      assistance: 'everything'
    }
  }));

  const greekSettings = reader.loadReaderSettings('greek');
  const hebrewSettings = reader.loadReaderSettings('hebrew');
  assert.equal(greekSettings.display, 'interlinear');
  assert.equal(greekSettings.translation, 'off');
  assert.equal(greekSettings.textMode, 'original');
  assert.equal(greekSettings.translationProvider, 'web');
  assert.equal(greekSettings.hideKnown, true);
  assert.equal(greekSettings.indicator, 'underline');
  assert.equal(greekSettings.showTranslationToggle, false);
  assert.equal(greekSettings.assistance, '30');
  assert.equal(hebrewSettings.display, 'original');
  assert.equal(hebrewSettings.translationProvider, 'web');
  assert.equal(hebrewSettings.assistance, 'everything');
});

test('Reader Book Progress records Reader as the return context', () => {
  let learnPage = '';
  let shownView = '';
  global.learnState = { history: ['home'] };
  global.setLearnPage = (page, options = {}) => {
    learnPage = page;
    assert.equal(options.skipHistory, true);
  };
  global.showView = viewId => { shownView = viewId; };

  reader.openReaderBookProgress();
  assert.match(learnPage, /^reading-readiness:new-testament:/);
  assert.equal(shownView, 'learnView');
  assert.deepEqual(global.learnState.history, ['__reader__']);

  delete global.learnState;
  delete global.setLearnPage;
  delete global.showView;
});

test('Adaptive Reader assistance thresholds, custom validation, and indicators work together', () => {
  const storage = storageHarness();
  let toastMessage = '';
  global.toast = message => { toastMessage = message; };
  global.$ = () => null;
  global.$$ = () => [];
  global.state = { data: { greek: [
    { lang: 'greek', lemma: 'λόγος', word: 'λόγος', primaryGloss: 'word', freq: 3 },
    { lang: 'greek', lemma: 'πολύς', word: 'πολύς', primaryGloss: 'many', freq: 9 }
  ] } };
  const token = { surface: 'λόγος', lemma: 'λόγος', parse: 'N-NSM' };
  assert.equal(reader.readerTokenQualifiesForAssistance(token, { ...reader.ReaderDefaultSettings, assistance: 'everything' }, 'greek'), true);
  assert.equal(reader.readerTokenQualifiesForAssistance(token, { ...reader.ReaderDefaultSettings, assistance: 'none' }, 'greek'), false);
  assert.equal(reader.readerTokenQualifiesForAssistance(token, { ...reader.ReaderDefaultSettings, assistance: '5' }, 'greek'), true);
  assert.equal(reader.readerTokenQualifiesForAssistance({ lemma: 'πολύς' }, { ...reader.ReaderDefaultSettings, assistance: '5' }, 'greek'), false);
  assert.equal(reader.readerTokenQualifiesForAssistance(token, { ...reader.ReaderDefaultSettings, assistance: 'custom', customThreshold: '3' }, 'greek'), true);

  reader.saveReaderSettings({ ...reader.ReaderDefaultSettings, assistance: 'everything' }, 'greek');
  reader.updateReaderSetting('customThreshold', '0');
  assert.equal(toastMessage, 'Enter a positive whole number.');
  assert.equal(reader.loadReaderSettings('greek').assistance, 'everything');
  reader.updateReaderSetting('customThreshold', '8');
  assert.equal(reader.loadReaderSettings('greek').assistance, 'custom');
  assert.equal(reader.loadReaderSettings('greek').customThreshold, '8');
  assert.ok(storage.has('pp_reader_adaptive_settings'));

  const tinted = reader.renderReaderTokens([token], {}, { ...reader.ReaderDefaultSettings, indicator: 'tint' }, 'greek');
  assert.match(tinted, /reader-token-tint/);
  const underlined = reader.renderReaderTokens([token], {}, { ...reader.ReaderDefaultSettings, indicator: 'underline' }, 'greek');
  assert.match(underlined, /reader-token-underline/);
  const footnoted = reader.renderReaderTokens([token], {}, { ...reader.ReaderDefaultSettings, indicator: 'footnote' }, 'greek');
  assert.match(footnoted, /reader-token-marker/);
  delete global.toast;
  delete global.state;
});

test('Hide Known Words uses vocabulary learning state and token taps respect assistance', async () => {
  const storage = new Map();
  global.localStorage = {
    getItem: key => storage.get(key) || null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: key => storage.delete(key)
  };
  global.todayISO = () => '2026-06-30';
  global.state = { data: { greek: [
    { id: 'lemma:greek:λόγος', lang: 'greek', lemma: 'λόγος', word: 'λόγος', primaryGloss: 'word', freq: 3 }
  ] } };
  global.getStudyEntries = entries => entries;
  VocabularyLearning.saveStore(VocabularyLearning.markEntryKnown(VocabularyLearning.loadStore(), global.state.data.greek[0]));
  const settings = { ...reader.ReaderDefaultSettings, assistance: '5', hideKnown: true };
  assert.equal(reader.readerTokenQualifiesForAssistance({ lemma: 'λόγος' }, settings, 'greek'), false);
  assert.equal(reader.readerTokenQualifiesForAssistance({ lemma: 'λόγος' }, { ...settings, hideKnown: false }, 'greek'), true);

  let popupHtml = '';
  let toastMessage = '';
  const root = {
    set innerHTML(value){ popupHtml = value; },
    get innerHTML(){ return popupHtml; },
    querySelector: selector => selector === '.reader-word-close' ? { addEventListener(){}, focus(){} } : null,
    querySelectorAll: () => []
  };
  global.$ = selector => selector === '#readerWordPopupRoot' ? root : null;
  global.$$ = () => [];
  global.toast = message => { toastMessage = message; };
  await reader.openReaderTokenPopup({ dataset: { readerAssisted: 'false', surface: 'λόγος', lemma: 'λόγος' }, focus(){} });
  assert.equal(popupHtml, '');
  assert.equal(toastMessage, 'Hidden by Reader settings.');

  await reader.openReaderTokenPopup({ dataset: { readerAssisted: 'true', surface: 'λόγος', lemma: 'λόγος', parse: 'N-NSM', bookName: 'John', chapter: '1', verse: '1' }, focus(){} });
  assert.match(popupHtml, /reader-word-popup/);
  reader.closeReaderWordPopup();
  delete global.localStorage;
  delete global.todayISO;
  delete global.state;
  delete global.getStudyEntries;
  delete global.toast;
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

test('Greek morphology display expands parsing details without dense abbreviations', () => {
  const fields = reader.readerMorphologyFields({ language: 'greek', parse: 'V- 3IAI-S--' });
  assert.deepEqual(fields, [
    { label: 'Tense', value: 'imperfect' },
    { label: 'Voice', value: 'active' },
    { label: 'Mood', value: 'indicative' },
    { label: 'Person', value: '3rd person' },
    { label: 'Number', value: 'singular' }
  ]);

  const html = reader.renderReaderMorphology({ language: 'greek', parse: 'N- ----DSF-' });
  assert.match(renderedText(html), /Morphology Case dative Number singular Gender feminine/);
});

test('Word Page grammar display summarizes Greek nouns and verbs with secondary parse codes', () => {
  const nounHtml = reader.renderReaderGrammar({
    language: 'greek',
    parse: 'N- ----GSM-',
    parseExplanation: 'Noun — genitive singular masculine'
  }, 'Noun');
  assert.match(renderedText(nounHtml), /Grammar Noun — genitive singular masculine Case genitive Number singular Gender masculine Parse code: N- ----GSM-/);
  assert.doesNotMatch(nounHtml, /wordPageParsingHeading/);
  assert.doesNotMatch(nounHtml, /wordPageMorphologyHeading/);

  const verbHtml = reader.renderReaderGrammar({
    language: 'greek',
    parse: 'V-PAI-3S',
    parseExplanation: 'Verb — present active indicative 3rd singular'
  }, 'Verb');
  assert.match(renderedText(verbHtml), /Grammar Verb — present active indicative, 3rd person singular Tense present Voice active Mood indicative Person 3rd person Number singular Parse code: V-PAI-3S/);
});

test('Hebrew morphology display uses existing prefix, suffix, stem, and conjugation data', () => {
  const prefixedVerb = reader.readerMorphologyFields({ language: 'hebrew', parse: 'HC/Vqw3ms', sourceLemma: 'c/1961' });
  assert.deepEqual(prefixedVerb, [
    { label: 'Prefixes', value: 'Conjunction' },
    { label: 'Stem', value: 'Qal' },
    { label: 'Conjugation', value: 'wayyiqtol' },
    { label: 'Person', value: '3rd person' },
    { label: 'Gender', value: 'masculine' },
    { label: 'Number', value: 'singular' }
  ]);

  const suffixHtml = reader.renderReaderGrammar({ language: 'hebrew', parse: 'HR/Sp3fs', parseExplanation: 'Preposition' }, 'Preposition');
  assert.match(renderedText(suffixHtml), /Grammar Preposition — with her \/ it \(3rd person feminine singular\) suffix Suffix 3rd person feminine singular Suffix Pronoun her \/ it Parse code: HR\/Sp3fs/);

  const hiphil = reader.readerMorphologyFields({ language: 'hebrew', parse: 'HVhp1cp' });
  assert.deepEqual(hiphil, [
    { label: 'Stem', value: 'Hiphil' },
    { label: 'Conjugation', value: 'perfect' },
    { label: 'Person', value: '1st person' },
    { label: 'Gender', value: 'common' },
    { label: 'Number', value: 'plural' }
  ]);
});

test('Word Page grammar display summarizes Hebrew nouns and verbs without duplicate suffix rows', () => {
  const nounHtml = reader.renderReaderGrammar({
    language: 'hebrew',
    parse: 'HNcmpa',
    parseExplanation: 'Noun — masculine plural absolute'
  }, 'Noun');
  assert.match(renderedText(nounHtml), /Grammar Noun — masculine plural absolute Gender masculine Number plural State absolute Parse code: HNcmpa/);

  const nounSuffixHtml = reader.renderReaderGrammar({
    language: 'hebrew',
    parse: 'HNcmpa/Sp2ms',
    parseExplanation: 'Noun'
  }, 'Noun');
  assert.match(renderedText(nounSuffixHtml), /Grammar Noun — masculine plural absolute with your \/ you \(2nd person masculine singular\) suffix/);
  assert.match(renderedText(nounSuffixHtml), /Suffix 2nd person masculine singular Suffix Pronoun your \/ you/);
  assert.doesNotMatch(nounSuffixHtml, /wordPageMorphologyHeading/);

  const verbHtml = reader.renderReaderGrammar({
    language: 'hebrew',
    parse: 'HVhp1cp',
    parseExplanation: 'Verb'
  }, 'Verb');
  assert.match(renderedText(verbHtml), /Grammar Verb — Hiphil perfect, 1st person common plural Stem Hiphil Conjugation perfect Person 1st person Gender common Number plural Parse code: HVhp1cp/);
});

test('This Occurrence renders Hebrew prefix and suffix fields without undefined fallbacks', () => {
  const html = reader.renderReaderWordOccurrence({
    language: 'hebrew',
    surface: 'וַיֹּאמֶר',
    lemma: '559',
    sourceLemma: 'c/559',
    parse: 'HC/Vqw3ms/Sp3ms',
    primaryGloss: 'and he said',
    reference: 'Genesis 1:3'
  }, { partOfSpeech: 'Verb' });
  assert.match(renderedText(html), /This Occurrence וַיֹּאמֶר Verb — Qal wayyiqtol, 3rd person masculine singular/);
  assert.match(renderedText(html), /Prefix Conjunction/);
  assert.match(renderedText(html), /Suffix 3rd person masculine singular/);
  assert.match(renderedText(html), /Suffix Pronoun his \/ him \/ its/);
  assert.doesNotMatch(html, /undefined|null/);

  const emptyHtml = reader.renderReaderWordOccurrence({ language: 'hebrew', lemma: '559' });
  assert.match(emptyHtml, /occurrence-specific details/);
  assert.doesNotMatch(emptyHtml, /undefined|null/);
});

test('Hebrew Reader popup shows readable form details without numeric lemma headwords', async () => {
  storageHarness();
  let shellHtml = '';
  let popupHtml = '';
  const popupRoot = {
    set innerHTML(value){ popupHtml = value; },
    get innerHTML(){ return popupHtml; },
    querySelector: selector => selector === '.reader-word-close' || selector === '.reader-word-page-action' ? { addEventListener(){}, focus(){} } : null,
    querySelectorAll: () => []
  };
  const shell = { set innerHTML(value){ shellHtml = value; }, get innerHTML(){ return shellHtml; } };
  global.$ = (selector, scope) => scope?.querySelector ? scope.querySelector(selector) : ({ '#readerShell': shell, '#readerWordPopupRoot': popupRoot }[selector] || null);
  global.$$ = () => [];
  global.state = { data: { hebrew: [
    { lang: 'hebrew', lemma: '1697', word: '1697', lexicalForm: 'דָּבָר', primaryGloss: 'word', alternateGlosses: ['matter'], freq: 1440 }
  ] } };

  await reader.setReaderLocation({ language: 'hebrew', book: 'jonah', chapter: 1 });
  await reader.openReaderTokenPopup({
    dataset: {
      readerAssisted: 'true',
      surface: 'דְּבָרֶיךָ',
      lemma: '1697',
      parse: 'HNcmpc/Sp2ms',
      sourceLemma: '1697',
      book: 'jonah',
      bookName: 'Jonah',
      chapter: '1',
      verse: '1'
    },
    focus(){}
  });

  assert.match(popupHtml, /Form Details/);
  assert.match(renderedText(popupHtml), /Lemma \/ Root דָּבָר/);
  assert.match(renderedText(popupHtml), /Noun — masculine plural construct with your \/ you \(2nd person masculine singular\) suffix/);
  assert.match(renderedText(popupHtml), /Suffix Pronoun your \/ you/);
  assert.doesNotMatch(popupHtml, /<strong>1697<\/strong>/);
  assert.doesNotMatch(popupHtml, /undefined|null/);
  reader.closeReaderWordPopup();
  delete global.state;
});

test('Mobile Reader swipe navigation uses horizontal threshold and ignores vertical scroll', async () => {
  storageHarness();
  let html = '';
  let prevented = 0;
  const shell = { set innerHTML(value){ html = value; }, get innerHTML(){ return html; } };
  global.$ = selector => selector === '#readerShell' ? shell : null;
  global.$$ = () => [];
  await reader.setReaderLocation({ language: 'greek', book: 'matthew', chapter: 1 });

  reader.handleReaderTouchStart({ touches: [{ clientX: 180, clientY: 100 }] });
  assert.equal(reader.handleReaderTouchEnd({ changedTouches: [{ clientX: 150, clientY: 105 }], preventDefault(){ prevented += 1; } }), false);
  assert.equal(reader.readerState().chapter, 1);

  reader.handleReaderTouchStart({ touches: [{ clientX: 180, clientY: 100 }] });
  assert.equal(reader.handleReaderTouchEnd({ changedTouches: [{ clientX: 120, clientY: 170 }], preventDefault(){ prevented += 1; } }), false);
  assert.equal(reader.readerState().chapter, 1);

  reader.handleReaderTouchStart({ touches: [{ clientX: 180, clientY: 100 }] });
  assert.equal(reader.handleReaderTouchEnd({ changedTouches: [{ clientX: 90, clientY: 112 }], preventDefault(){ prevented += 1; } }), true);
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(reader.readerState().chapter, 2);
  assert.equal(prevented, 1);
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

function readerLayoutHarness(){
  const makeElement = () => {
    const classes = new Set();
    return {
      classes,
      innerHTML: '',
      classList: {
        toggle(name, enabled){ enabled ? classes.add(name) : classes.delete(name); },
        contains(name){ return classes.has(name); }
      },
      querySelector(){ return null; },
      querySelectorAll(){ return []; }
    };
  };
  const shell = makeElement();
  const layout = makeElement();
  const panel = makeElement();
  const overlay = makeElement();
  global.document = {
    getElementById: id => id === 'readerShell' ? shell : null,
    querySelector: selector => selector === '.reader-content-layout' ? layout : null
  };
  global.window = { innerWidth: 1280 };
  global.$ = (selector, scope) => {
    if(scope?.querySelector) return scope.querySelector(selector);
    if(selector === '#readerShell') return shell;
    if(selector === '#readerWordPanelRoot') return panel;
    if(selector === '#readerWordPopupRoot') return overlay;
    return null;
  };
  global.$$ = (selector, scope) => scope?.querySelectorAll ? scope.querySelectorAll(selector) : [];
  return { shell, layout, panel, overlay };
}

test('reader tokens carry explicit Greek and Hebrew language metadata', () => {
  const greekHtml = reader.renderReaderTokens(
    [{ surface: 'λόγος', lemma: 'λόγος', parse: 'N-NSM' }],
    { book: 'john', bookName: 'John', chapter: 1, verse: 1 },
    reader.ReaderDefaultSettings,
    'greek'
  );
  const hebrewHtml = reader.renderReaderTokens(
    [{ surface: 'יְהוָה', lemma: 'יהוה', root: 'יהוה' }],
    { book: 'jonah', bookName: 'Jonah', chapter: 1, verse: 1 },
    reader.ReaderDefaultSettings,
    'hebrew'
  );
  assert.match(greekHtml, /data-language="greek"/);
  assert.match(greekHtml, /lang="grc" dir="ltr"/);
  assert.match(hebrewHtml, /data-language="hebrew"/);
  assert.match(hebrewHtml, /lang="he" dir="rtl"/);
});

test('Greek and Hebrew token selections keep the clicked token language', async () => {
  storageHarness();
  reader.saveReaderSettings({ ...reader.ReaderDefaultSettings, wordDetailsDisplay: 'overlay' });
  const { overlay } = readerLayoutHarness();
  global.state = {
    data: {
      greek: [{ lang: 'greek', word: 'λόγος', lemma: 'λόγος', primaryGloss: 'word', gloss: 'word', freq: 1 }],
      hebrew: [{ lang: 'hebrew', word: 'יְהוָה', lemma: 'יהוה', primaryGloss: 'LORD', gloss: 'LORD', freq: 7 }]
    }
  };
  await reader.openReaderTokenPopup({
    dataset: { language: 'greek', surface: 'λόγος', lemma: 'λόγος', parse: 'N-NSM', book: 'john', bookName: 'John', chapter: '1', verse: '1' },
    focus(){}
  });
  assert.equal(reader.readerState().activeToken.info.language, 'greek');
  assert.match(overlay.innerHTML, /lang="grc" dir="ltr"/);
  assert.doesNotMatch(overlay.innerHTML, /Root<\/span>/);
  await reader.openReaderTokenPopup({
    dataset: { language: 'hebrew', surface: 'יְהוָה', lemma: 'יהוה', root: 'יהוה', book: 'jonah', bookName: 'Jonah', chapter: '1', verse: '1' },
    focus(){}
  });
  assert.equal(reader.readerState().activeToken.info.language, 'hebrew');
  assert.match(overlay.innerHTML, /lang="he" dir="rtl"/);
  assert.match(overlay.innerHTML, /Jonah 1:1/);
  reader.closeReaderWordPopup();
  delete global.state;
});

test('Reader context changes clear selected word details across languages', async () => {
  storageHarness();
  reader.saveReaderSettings({ ...reader.ReaderDefaultSettings, wordDetailsDisplay: 'overlay' });
  readerLayoutHarness();
  global.state = { data: { greek: [{ lang: 'greek', word: 'λόγος', lemma: 'λόγος', primaryGloss: 'word', gloss: 'word', freq: 1 }] } };
  await reader.openReaderTokenPopup({
    dataset: { language: 'greek', surface: 'λόγος', lemma: 'λόγος', parse: 'N-NSM', book: 'john', bookName: 'John', chapter: '1', verse: '1' },
    focus(){}
  });
  assert.equal(reader.readerState().activeToken.info.language, 'greek');
  await reader.setReaderLocation({ language: 'hebrew', book: 'jonah', chapter: 1 });
  assert.equal(reader.readerState().activeToken, null);
  await reader.openReaderTokenPopup({
    dataset: { language: 'hebrew', surface: 'יְהוָה', lemma: 'יהוה', root: 'יהוה', book: 'jonah', bookName: 'Jonah', chapter: '1', verse: '1' },
    focus(){}
  });
  assert.equal(reader.readerState().activeToken.info.language, 'hebrew');
  await reader.setReaderLocation({ language: 'greek', book: 'john', chapter: 1 });
  assert.equal(reader.readerState().activeToken, null);
  delete global.state;
});

test('stale cross-language lookup results cannot overwrite newer selections', async () => {
  storageHarness();
  reader.saveReaderSettings({ ...reader.ReaderDefaultSettings, wordDetailsDisplay: 'overlay' });
  readerLayoutHarness();
  global.state = {
    data: {
      greek: [{ lang: 'greek', word: 'λόγος', lemma: 'λόγος', primaryGloss: 'word', gloss: 'word', freq: 1 }],
      hebrew: [{ lang: 'hebrew', word: 'יְהוָה', lemma: 'יהוה', primaryGloss: 'LORD', gloss: 'LORD', freq: 7 }]
    }
  };
  const greek = reader.openReaderTokenPopup({
    dataset: { language: 'greek', surface: 'λόγος', lemma: 'λόγος', parse: 'N-NSM', book: 'john', bookName: 'John', chapter: '1', verse: '1' },
    focus(){}
  });
  await reader.openReaderTokenPopup({
    dataset: { language: 'hebrew', surface: 'יְהוָה', lemma: 'יהוה', root: 'יהוה', book: 'jonah', bookName: 'Jonah', chapter: '1', verse: '1' },
    focus(){}
  });
  await greek;
  assert.equal(reader.readerState().activeToken.info.language, 'hebrew');
  const hebrew = reader.openReaderTokenPopup({
    dataset: { language: 'hebrew', surface: 'יְהוָה', lemma: 'יהוה', root: 'יהוה', book: 'jonah', bookName: 'Jonah', chapter: '1', verse: '1' },
    focus(){}
  });
  await reader.openReaderTokenPopup({
    dataset: { language: 'greek', surface: 'λόγος', lemma: 'λόγος', parse: 'N-NSM', book: 'john', bookName: 'John', chapter: '1', verse: '1' },
    focus(){}
  });
  await hebrew;
  assert.equal(reader.readerState().activeToken.info.language, 'greek');
  reader.closeReaderWordPopup();
  delete global.state;
});

test('side-panel layout classes and mounts are fully synchronized on close and mode changes', async () => {
  const { shell, layout, panel, overlay } = readerLayoutHarness();
  const storage = storageHarness();
  reader.saveReaderSettings({ ...reader.ReaderDefaultSettings, wordDetailsDisplay: 'side' });
  global.state = { data: { greek: [{ lang: 'greek', word: 'λόγος', lemma: 'λόγος', primaryGloss: 'word', gloss: 'word', freq: 1 }] } };
  await reader.openReaderTokenPopup({
    dataset: { language: 'greek', surface: 'λόγος', lemma: 'λόγος', parse: 'N-NSM', book: 'john', bookName: 'John', chapter: '1', verse: '1' },
    focus(){}
  });
  assert.equal(shell.classList.contains('reader-shell-with-details'), true);
  assert.equal(layout.classList.contains('reader-content-layout-side'), true);
  assert.match(panel.innerHTML, /reader-word-panel/);
  assert.equal(overlay.innerHTML, '');
  reader.closeReaderWordPopup();
  assert.equal(reader.readerState().activeToken, null);
  assert.equal(shell.classList.contains('reader-shell-with-details'), false);
  assert.equal(layout.classList.contains('reader-content-layout-side'), false);
  assert.equal(panel.innerHTML, '');
  assert.equal(overlay.innerHTML, '');
  overlay.innerHTML = '<div data-reader-popup-overlay></div>';
  reader.syncReaderWordDetailsLayout('overlay', true);
  assert.equal(shell.classList.contains('reader-shell-with-details'), false);
  assert.equal(layout.classList.contains('reader-content-layout-side'), false);
  assert.equal(panel.innerHTML, '');
  reader.syncReaderWordDetailsLayout('side', true);
  assert.equal(overlay.innerHTML, '');
  reader.syncReaderWordDetailsLayout('side', false);
  assert.equal(shell.classList.contains('reader-shell-with-details'), false);
  assert.equal(layout.classList.contains('reader-content-layout-side'), false);
  assert.equal(panel.innerHTML, '');
  assert.equal(overlay.innerHTML, '');
  assert.ok(storage.has('pp_reader_adaptive_settings'));
  reader.saveReaderSettings({ ...reader.ReaderDefaultSettings, wordDetailsDisplay: 'overlay' });
  delete global.state;
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
    querySelectorAll: selector => {
      if(selector === '.reader-word-link') return [{ dataset: { topicId: 'greek-nouns' }, addEventListener(){} }];
      if(selector === '[data-word-page-back-to-reader]') return [
        { addEventListener(type, handler){ if(type === 'click') backHandler = handler; } },
        { addEventListener(type, handler){ if(type === 'click') backHandler = handler; } }
      ];
      return [];
    }
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
  assert.ok(wordPageHtml.indexOf('data-word-page-back-to-reader="true"') < wordPageHtml.indexOf('word-page-header'));
  assert.equal((wordPageHtml.match(/Back to Reader/g) || []).length, 2);
  assert.match(wordPageHtml, /word-page-pos">Noun<\/div>/);
  assert.match(wordPageHtml, /<h2 id="wordPageIdentityHeading">Identity<\/h2>[\s\S]*<dt>Lemma<\/dt><dd>λόγος<\/dd>/);
  assert.match(wordPageHtml, /<dt>Glosses<\/dt><dd>word, message, reason, account, matter<\/dd>/);
  assert.match(wordPageHtml, /<h2 id="wordPageOccurrenceHeading">This Occurrence<\/h2>/);
  assert.match(wordPageHtml, /<h2 id="wordPageLearningHeading">Learning<\/h2>/);
  assert.match(wordPageHtml, /<h2 id="wordPageReferenceHeading">Reference<\/h2>/);
  assert.match(wordPageHtml, /<h2 id="wordPageContextHeading">Usage Examples<\/h2>/);
  assert.match(wordPageHtml, /<h2 id="wordPageNavigationHeading">Navigation<\/h2>/);
  assert.doesNotMatch(wordPageHtml, /wordPageParsingHeading/);
  assert.doesNotMatch(wordPageHtml, /wordPageMorphologyHeading/);
  assert.ok(wordPageHtml.indexOf('wordPageIdentityHeading') < wordPageHtml.indexOf('wordPageOccurrenceHeading'));
  assert.ok(wordPageHtml.indexOf('wordPageOccurrenceHeading') < wordPageHtml.indexOf('wordPageLearningHeading'));
  assert.ok(wordPageHtml.indexOf('wordPageLearningHeading') < wordPageHtml.indexOf('wordPageReferenceHeading'));
  assert.ok(wordPageHtml.indexOf('wordPageReferenceHeading') < wordPageHtml.indexOf('wordPageContextHeading'));
  assert.ok(wordPageHtml.indexOf('wordPageContextHeading') < wordPageHtml.indexOf('wordPageNavigationHeading'));
  assert.match(wordPageHtml, /id="wordPageReaderExamplesSlot"[\s\S]*hidden/);
  assert.doesNotMatch(wordPageHtml, /Also translated as/);
  assert.match(wordPageHtml, /<dt>Frequency<\/dt><dd>68×<\/dd>/);
  assert.match(wordPageHtml, /<dt>Current Reference<\/dt><dd>John 1:1<\/dd>/);
  assert.doesNotMatch(wordPageHtml, /<dt>Meaning in Context<\/dt>/);
  assert.match(wordPageHtml, /data-topic-id="greek-nouns"/);
  assert.match(wordPageHtml, />Greek Nouns<\/button>/);
  assert.match(wordPageHtml, /Usage Examples/);
  assert.doesNotMatch(wordPageHtml, /Word Page/);
  assert.equal(typeof backHandler, 'function');
  backHandler();
  assert.equal(shownView, 'readerView');

  await reader.openReaderTokenPopup({
    dataset: { surface: 'ἀρχῇ', lemma: 'ἀρχή', parse: 'N-DSF', bookName: 'John', chapter: '1', verse: '1' },
    focus(){}
  });
  actionHandler();
  assert.match(wordPageHtml, /<h1 id="wordPageTitle" class="word-page-headword">ἀρχῇ<\/h1>/);
  assert.match(wordPageHtml, /<dt>Lemma<\/dt><dd>ἀρχή<\/dd>/);
  assert.match(wordPageHtml, /<dt>Glosses<\/dt><dd>beginning, rule, origin<\/dd>/);
  assert.match(wordPageHtml, /<dt>Frequency<\/dt><dd>55×<\/dd>/);

  await reader.openReaderTokenPopup({
    dataset: { surface: 'μονόγλωσσον', lemma: 'μονόγλωσσον', parse: 'N-ASN', bookName: 'Matthew', chapter: '9', verse: '13' },
    focus(){}
  });
  actionHandler();
  assert.match(wordPageHtml, /<dt>Glosses<\/dt><dd>single gloss<\/dd>/);
  assert.doesNotMatch(wordPageHtml, /Also translated as/);
  delete global.state;
  delete global.toast;
  delete global.showView;
});

test('Hebrew Word Page primary headword never falls back to a raw numeric lemma', () => {
  assert.equal(reader.readerPrimaryHeadword({ language: 'hebrew', lemma: '1961', root: 'היה', surface: 'וַֽיְהִי֙' }), 'היה');
  assert.equal(reader.readerPrimaryHeadword({ language: 'hebrew', lemma: '1961', surface: 'וַֽיְהִי֙' }), 'וַֽיְהִי֙');
  assert.equal(reader.readerPrimaryHeadword({ language: 'hebrew', lemma: '1961' }), 'Lemma unavailable');
  assert.equal(reader.readerPrimaryHeadword({ language: 'greek', lemma: 'λόγος', surface: 'λόγον' }), 'λόγον');
});

test('Word Page learning section reflects shared vocabulary learning state', () => {
  const storage = new Map();
  global.localStorage = {
    getItem: key => storage.get(key) || null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: key => storage.delete(key)
  };
  global.todayISO = () => '2026-06-26';
  global.state = { data: { greek: [
    { id: 'lemma:greek:λόγος', studyEntryType: 'lemma', lang: 'greek', lemma: 'λόγος', word: 'λόγος', primaryGloss: 'word', freq: 68 }
  ] } };
  global.getStudyEntries = entries => entries;

  const info = { language: 'greek', lemma: 'λόγος', surface: 'λόγος' };
  let html = reader.renderReaderWordLearning(info);
  assert.match(renderedText(html), /Learning ○ Not Learned Learn This Word/);
  assert.match(html, /data-word-learn-action="learn"/);

  assert.equal(reader.introduceReaderWordFromPage(info), true);
  html = reader.renderReaderWordLearning(info);
  assert.match(renderedText(html), /Learning ◐ Learning Review This Word/);
  assert.match(html, /data-word-learn-action="review"/);

  let store = VocabularyLearning.loadStore();
  store = VocabularyLearning.reviewEntry(store, global.state.data.greek[0], 'recognized', '2026-06-26');
  store = VocabularyLearning.reviewEntry(store, global.state.data.greek[0], 'recognized', '2026-06-27');
  store = VocabularyLearning.reviewEntry(store, global.state.data.greek[0], 'recognized', '2026-06-30');
  VocabularyLearning.saveStore(store);
  html = reader.renderReaderWordLearning(info);
  assert.match(renderedText(html), /Learning ● Known Known Review Again/);

  delete global.localStorage;
  delete global.todayISO;
  delete global.state;
  delete global.getStudyEntries;
});

test('Word Page adds vocabulary to Study Sets without changing SRS status', () => {
  const storage = new Map();
  global.localStorage = {
    getItem: key => storage.get(key) || null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: key => storage.delete(key)
  };
  global.todayISO = () => '2026-06-26';
  global.state = { data: { greek: [
    { id: 'lemma:greek:λόγος', studyEntryType: 'lemma', lang: 'greek', lemma: 'λόγος', word: 'λόγος', primaryGloss: 'word', freq: 68 }
  ] } };
  global.getStudyEntries = entries => entries;

  const existing = StudySets.createStudySet({ title: 'Sermon words', language: 'greek', type: 'vocabulary', criteria: { kind: 'hand-picked' } }).set;
  const info = { language: 'greek', lemma: 'λόγος', surface: 'λόγος' };
  let html = reader.renderReaderWordStudySets(info);
  assert.match(renderedText(html), /Study Sets Add this word to a collection/);
  assert.match(html, /data-word-study-set-add="true"/);
  assert.match(html, /data-word-study-set-create="true"/);

  let result = reader.addReaderWordToStudySet(existing.id, info);
  assert.equal(result.added, true);
  result = reader.addReaderWordToStudySet(existing.id, info);
  assert.equal(result.added, false);
  assert.equal(StudySets.loadStore().sets.find(set => set.id === existing.id).explicitItems.length, 1);
  assert.deepEqual(VocabularyLearning.loadStore(), VocabularyLearning.normalizeStore());

  const created = reader.createReaderStudySetFromWord('Quiz list', info);
  assert.equal(created.title, 'Quiz list');
  assert.equal(StudySets.loadStore().sets.find(set => set.id === created.id).explicitItems[0].lemma, 'λόγος');

  delete global.localStorage;
  delete global.todayISO;
  delete global.state;
  delete global.getStudyEntries;
});

test('Review This Word opens the focused Learn review page through the shared review engine', () => {
  const storage = new Map();
  global.localStorage = {
    getItem: key => storage.get(key) || null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: key => storage.delete(key)
  };
  global.todayISO = () => '2026-06-26';
  global.state = { data: { greek: [
    { id: 'lemma:greek:λόγος', studyEntryType: 'lemma', lang: 'greek', lemma: 'λόγος', word: 'λόγος', primaryGloss: 'word', freq: 68 }
  ] } };
  global.getStudyEntries = entries => entries;
  let reviewRequest = null;
  let shownView = '';
  global.reviewLearnVocabularyWord = (language, id) => { reviewRequest = { language, id }; };
  global.showView = view => { shownView = view; };

  VocabularyLearning.persistIntroduceEntry(global.state.data.greek[0], { type: 'word-page' }, '2026-06-26');
  assert.equal(reader.reviewReaderWordFromPage({ language: 'greek', lemma: 'λόγος' }), true);
  assert.deepEqual(reviewRequest, { language: 'greek', id: 'lemma:greek:λόγος' });
  assert.equal(shownView, 'learnView');

  delete global.localStorage;
  delete global.todayISO;
  delete global.state;
  delete global.getStudyEntries;
  delete global.reviewLearnVocabularyWord;
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
  assert.match(html, /Usage Examples/);
  assert.match(html, /Small preview from the Reader index/);
  assert.equal((html.match(/class="word-page-context-link"/g) || []).length, occurrences.length);
  assert.doesNotMatch(html, /View All|pagination|filter|translation/i);
});

test('word page usage examples prioritize current occurrence and support a bounded Load More preview', async () => {
  const occurrences = await reader.getReaderLemmaOccurrences('λόγος', 'greek', 6, { current: { reference: 'John 1:1', language: 'greek' } });
  assert.equal(occurrences[0].reference, 'John 1:1');
  const html = reader.renderReaderWordPageContextContent(occurrences.slice(0, 5), false, { hasMore: true, nextLimit: 11, language: 'greek' });
  assert.equal((html.match(/class="word-page-context-link"/g) || []).length, 5);
  assert.match(html, /data-word-page-load-more="11"/);
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
  assert.match(readerHtml, /readerVerse-(?:john-1-)?1/);
  delete global.showView;
});

test('Reader View Book Progress opens Reading Readiness for the current book', async () => {
  let learnPage = '';
  let shownView = '';
  global.setLearnPage = (page, options) => { learnPage = page; assert.equal(options.skipHistory, true); };
  global.showView = view => { shownView = view; };
  global.$ = () => null;
  global.$$ = () => [];

  await reader.setReaderLocation({ language: 'greek', book: 'john', chapter: 1 });
  reader.openReaderBookProgress();
  assert.equal(learnPage, 'reading-readiness:new-testament:john');
  assert.equal(shownView, 'learnView');

  await reader.setReaderLocation({ language: 'hebrew', book: 'jonah', chapter: 1 });
  reader.openReaderBookProgress();
  assert.equal(learnPage, 'reading-readiness:old-testament:jonah');
  assert.equal(shownView, 'learnView');

  delete global.setLearnPage;
  delete global.showView;
});

test('book navigation crosses from Matthew to Mark', async () => {
  await reader.setReaderLocation({ language: 'greek', book: 'matthew', chapter: 28, mode: 'chapter' });
  assert.deepEqual(reader.getAdjacentReaderLocation(1), { language: 'greek', book: 'mark', chapter: 1 });
});

test('book navigation crosses from Mark to Luke and Luke to John', async () => {
  await reader.setReaderLocation({ language: 'greek', book: 'mark', chapter: 16, mode: 'chapter' });
  assert.deepEqual(reader.getAdjacentReaderLocation(1), { language: 'greek', book: 'luke', chapter: 1 });
  await reader.setReaderLocation({ language: 'greek', book: 'luke', chapter: 1, mode: 'chapter' });
  assert.deepEqual(reader.getAdjacentReaderLocation(-1), { language: 'greek', book: 'mark', chapter: 16 });
  await reader.setReaderLocation({ language: 'greek', book: 'luke', chapter: 24, mode: 'chapter' });
  assert.deepEqual(reader.getAdjacentReaderLocation(1), { language: 'greek', book: 'john', chapter: 1 });
  await reader.setReaderLocation({ language: 'greek', book: 'john', chapter: 1, mode: 'chapter' });
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

test('Reader text supports keyboard chapter navigation without stealing input arrows', async () => {
  let prevented = false;
  await reader.setReaderLocation({ language: 'greek', book: 'matthew', chapter: 2 });
  assert.equal(reader.handleReaderChapterKeydown({ key: 'ArrowLeft', target: { tagName: 'ARTICLE' }, preventDefault(){ prevented = true; } }), true);
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(reader.readerState().chapter, 1);
  assert.equal(prevented, true);

  prevented = false;
  assert.equal(reader.handleReaderChapterKeydown({ key: 'ArrowRight', target: { tagName: 'INPUT' }, preventDefault(){ prevented = true; } }), false);
  assert.equal(reader.readerState().chapter, 1);
  assert.equal(prevented, false);
});

test('last reader location persists', () => {
  storageHarness();
  reader.saveReaderLocation({ language: 'greek', book: 'mark', chapter: 1, scrollY: 420 });
  assert.deepEqual(reader.loadReaderLocation(), {
    language: 'greek',
    book: 'mark',
    chapter: 1,
    mode: 'continuous',
    verse: '',
    anchorOffset: 0,
    scrollTop: 0,
    scrollY: 420
  });
});

test('new and legacy Reader locations default to Continuous while valid saved modes remain compatible', () => {
  const storage = storageHarness();
  assert.equal(reader.loadReaderLocation().mode, 'continuous');
  storage.set('pp_reader_location', JSON.stringify({ language: 'greek', book: 'john', chapter: 3, scrollY: 90 }));
  assert.deepEqual(reader.loadReaderLocation(), {
    language: 'greek', book: 'john', chapter: 3, mode: 'continuous', verse: '', anchorOffset: 0, scrollTop: 0, scrollY: 90
  });
  storage.set('pp_reader_location', JSON.stringify({ language: 'greek', book: 'john', chapter: 3, mode: 'invalid', verse: '7' }));
  assert.equal(reader.loadReaderLocation().mode, 'continuous');
  assert.equal(reader.loadReaderLocation().verse, '7');
  storage.set('pp_reader_location', JSON.stringify({ language: 'greek', book: 'john', chapter: 3, mode: 'chapter', verse: '7' }));
  assert.equal(reader.loadReaderLocation().mode, 'chapter');
  storage.set('pp_reader_location', JSON.stringify({ language: 'greek', book: 'john', chapter: 3, mode: 'continuous', verse: '7' }));
  assert.equal(reader.loadReaderLocation().mode, 'continuous');

  reader.saveReaderLocation({
    language: 'hebrew', book: 'psalms', chapter: 23, mode: 'continuous', verse: '4', anchorOffset: 76, scrollTop: 940
  });
  assert.deepEqual(reader.loadReaderLocation(), {
    language: 'hebrew', book: 'psalms', chapter: 23, mode: 'continuous', verse: '4', anchorOffset: 76, scrollTop: 940, scrollY: 0
  });
});

test('continuous Reader window loads adjacent chapters once in canonical bounded order', async () => {
  await reader.loadReaderManifest('greek');
  reader.readerChapterCache.clear();
  for(const key of Object.keys(reader.readerLoadCounts)) delete reader.readerLoadCounts[key];
  const passages = await reader.loadReaderContinuousWindow('greek', 'john', 3, { ...reader.ReaderDefaultSettings, translation: 'off' });
  assert.deepEqual(passages.map(item => item.chapter), [2, 3, 4]);
  assert.equal(new Set(passages.map(item => item.chapter)).size, passages.length);
  assert.equal(reader.readerLoadCounts['greek/john/2'], 1);
  assert.equal(reader.readerLoadCounts['greek/john/3'], 1);
  assert.equal(reader.readerLoadCounts['greek/john/4'], 1);
  assert.equal(passages.length <= 5, true);
});

test('continuous Reader inserts prepared adjacent chapters and keeps a five-chapter window', async () => {
  storageHarness();
  reader.saveReaderSettings({ ...reader.ReaderDefaultSettings, translation: 'off', textMode: 'original' }, 'greek');
  await reader.setReaderLocation({ language: 'greek', book: 'john', chapter: 5, mode: 'continuous' });
  assert.deepEqual(reader.readerState().continuousChapters.map(item => item.chapter), [4, 5, 6]);
  assert.equal(await reader.loadReaderContinuousAdjacent(1), true);
  assert.deepEqual(reader.readerState().continuousChapters.map(item => item.chapter), [4, 5, 6, 7]);
  assert.equal(await reader.loadReaderContinuousAdjacent(1), true);
  assert.deepEqual(reader.readerState().continuousChapters.map(item => item.chapter), [4, 5, 6, 7, 8]);
  assert.equal(await reader.loadReaderContinuousAdjacent(1), true);
  assert.deepEqual(reader.readerState().continuousChapters.map(item => item.chapter), [5, 6, 7, 8, 9]);
  assert.equal(new Set(reader.readerState().continuousChapters.map(item => item.chapter)).size, 5);
});

test('continuous Reader handles book boundaries without crossing books', async () => {
  await reader.setReaderLocation({ language: 'greek', book: 'john', chapter: 1, mode: 'continuous' });
  assert.equal(reader.getAdjacentReaderLocation(-1), null);
  assert.match(reader.renderReaderPassages(), /Beginning of John/);
  assert.deepEqual(reader.readerState().continuousChapters.map(item => item.chapter), [1, 2]);

  await reader.setReaderLocation({ language: 'greek', book: 'john', chapter: 21, mode: 'continuous' });
  assert.equal(reader.getAdjacentReaderLocation(1), null);
  assert.match(reader.renderReaderPassages(), /End of John/);
  assert.deepEqual(reader.readerState().continuousChapters.map(item => item.chapter), [20, 21]);
});

test('Reader omits always-visible mode controls and preserves unique verse ids', async () => {
  let html = '';
  const shell = { set innerHTML(value){ html = value; }, get innerHTML(){ return html; } };
  global.$ = selector => selector === '#readerShell' ? shell : null;
  global.$$ = () => [];
  await reader.setReaderLocation({ language: 'greek', book: 'john', chapter: 2, mode: 'continuous' });
  assert.doesNotMatch(html, /aria-label="Reading mode"/);
  assert.doesNotMatch(html, /data-reader-mode=/);
  assert.match(html, /id="readerOptionsBtn"[^>]*>Reader options<\/button>/);
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(reader.readerState().continuousChapters.map(item => item.chapter), [1, 2, 3]);
});

test('switching Reader modes preserves the logical verse and chapter', async () => {
  await reader.setReaderLocation({ language: 'greek', book: 'john', chapter: 2, mode: 'chapter', verse: '5', anchorOffset: 88 });
  await reader.setReaderMode('continuous');
  assert.equal(reader.readerState().mode, 'continuous');
  assert.equal(reader.readerState().chapter, 2);
  assert.equal(reader.readerState().focusVerse, '5');
  assert.equal(reader.readerState().anchorVerse, '5');
  assert.equal(reader.readerState().anchorOffset, 88);
  await reader.setReaderMode('chapter');
  assert.equal(reader.readerState().mode, 'chapter');
  assert.equal(reader.readerState().chapter, 2);
  assert.equal(reader.readerState().anchorVerse, '5');
});

test('current-chapter tracking updates controls without browser-history writes', async () => {
  await reader.setReaderLocation({ language: 'greek', book: 'john', chapter: 2, mode: 'continuous' });
  let historyWrites = 0;
  const previousHistory = global.history;
  global.history = { pushState(){ historyWrites += 1; }, replaceState(){ historyWrites += 1; } };
  const changed = reader.updateReaderCurrentChapter(3, { persist: false });
  assert.equal(changed, true);
  assert.equal(reader.readerState().chapter, 3);
  assert.equal(reader.readerState().chapterData.chapter, 3);
  assert.equal(historyWrites, 0);
  global.history = previousHistory;
});

test('invalid Reader location fields fail safely', async () => {
  assert.equal(reader.normalizeReaderMode('endless'), 'continuous');
  await reader.setReaderLocation({ language: 'unknown', book: 'missing', chapter: -50, mode: 'endless' });
  assert.equal(reader.readerState().language, 'greek');
  assert.equal(reader.readerState().book, 'matthew');
  assert.equal(reader.readerState().chapter, 1);
  assert.equal(reader.readerState().mode, 'continuous');
});

test('primary and sticky text controls expose synchronized exclusive radio state and mobile safe-area styling', () => {
  const settings = reader.sanitizeReaderSettings({ ...reader.ReaderDefaultSettings, textMode: 'english', showOriginal: false, showEnglish: true });
  const primary = reader.renderReaderTranslationToggle(settings, reader.readerState().chapterData);
  const sticky = reader.renderReaderStickyToolbar(settings);
  assert.match(primary, /role="radiogroup" aria-label="Reader language"/);
  assert.match(primary, /data-reader-visibility="original"[^>]*aria-checked="false"/);
  assert.match(primary, /data-reader-visibility="english"[^>]*aria-checked="true"/);
  assert.doesNotMatch(primary, /aria-pressed/);
  assert.match(sticky, /role="radiogroup"/);
  assert.match(sticky, /data-reader-visibility="original"[^>]*aria-checked="false"/);
  assert.match(sticky, /data-reader-visibility="english"[^>]*aria-checked="true"/);
  assert.doesNotMatch(sticky, /aria-pressed/);
  const css = fs.readFileSync(path.join(process.cwd(), 'styles.css'), 'utf8');
  const mobileToolbar = css.match(/@media \(max-width: 640px\)[\s\S]*?\.reader-sticky-toolbar \{([\s\S]*?)\n  \}/)?.[1] || '';
  assert.match(mobileToolbar, /top: calc\(58px \+ env\(safe-area-inset-top\)\)/);
  assert.doesNotMatch(mobileToolbar, /bottom:/);
  assert.match(css, /\.reader-sticky-toolbar\s*\{\s*display: none/);
  const source = fs.readFileSync(path.join(process.cwd(), 'src/features/reader/index.js'), 'utf8');
  assert.match(source, /syncReaderStickyToolbarVisibility\(primaryBottom <= 0\)/);
});

test('continuous visibility toggles use the nearest measured verse instead of stale restored state', async () => {
  storageHarness();
  await reader.setReaderLocation({ language: 'greek', book: 'john', chapter: 2, mode: 'continuous', verse: '15', anchorOffset: 70 });
  const previousDocument = global.document;
  const previousWindow = global.window;
  const previousDollar = global.$;
  const visibleVerse = {
    dataset: { readerBook: 'john', readerChapter: '2', readerVerse: '16' },
    getBoundingClientRect: () => ({ top: 152, bottom: 190 })
  };
  const pane = {
    scrollTop: 900,
    clientHeight: 844,
    querySelectorAll: selector => selector.includes('[data-reader-verse]') ? [visibleVerse] : [],
    getBoundingClientRect: () => ({ top: 0, bottom: 844, height: 844 })
  };
  const visibilityControls = ['original', 'english'].flatMap(kind => [0, 1].map(() => {
    const classes = new Set();
    return {
      dataset: { readerVisibility: kind },
      attributes: {},
      classList: { toggle(name, active){ if(active) classes.add(name); else classes.delete(name); } },
      setAttribute(name, value){ this.attributes[name] = value; }
    };
  }));
  global.document = {
    activeElement: { closest: () => null },
    querySelector: selector => selector === '.reader-text' ? pane : null,
    querySelectorAll: selector => selector === '[data-reader-visibility]' ? visibilityControls : []
  };
  global.window = {
    innerHeight: 844,
    scrollY: 900,
    matchMedia: () => ({ matches: true }),
    requestAnimationFrame: () => 1
  };
  global.$ = () => null;

  reader.toggleReaderTextVisibility('english');
  assert.deepEqual(visibilityControls.map(control => control.attributes['aria-checked']), ['false', 'false', 'true', 'true']);
  assert.equal(reader.readerState().anchorVerse, '16');
  assert.equal(reader.readerState().chapter, 2);
  assert.equal(reader.loadReaderSettings('greek').showEnglish, true);
  assert.equal(reader.loadReaderSettings('greek').showOriginal, false);

  reader.toggleReaderTextVisibility('original');
  assert.deepEqual(visibilityControls.map(control => control.attributes['aria-checked']), ['true', 'true', 'false', 'false']);
  assert.equal(reader.loadReaderSettings('greek').textMode, 'original');
  assert.equal(reader.loadReaderSettings('greek').showOriginal, true);
  assert.equal(reader.loadReaderSettings('greek').showEnglish, false);

  reader.toggleReaderTextVisibility('english');
  reader.toggleReaderTextVisibility('original');
  reader.toggleReaderTextVisibility('english');
  assert.deepEqual(visibilityControls.map(control => control.attributes['aria-checked']), ['false', 'false', 'true', 'true']);
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal(reader.loadReaderSettings('greek').textMode, 'english');
  assert.equal(reader.loadReaderSettings('greek').showOriginal, false);
  assert.equal(reader.loadReaderSettings('greek').showEnglish, true);

  global.document = previousDocument;
  global.window = previousWindow;
  global.$ = previousDollar;
});

test('English to Original is synchronous, reuses prepared markup, and makes no request or full rerender', async () => {
  storageHarness();
  reader.saveReaderSettings({ ...reader.ReaderDefaultSettings, translation: 'on', translationProvider: 'web', textMode: 'english', showOriginal: false, showEnglish: true }, 'greek');
  await reader.setReaderLocation({ language: 'greek', book: 'john', chapter: 1, mode: 'chapter', verse: '1', anchorOffset: 72 });
  const previousDocument = global.document;
  const previousWindow = global.window;
  const previousDollar = global.$;
  const previousState = global.state;
  let shellWrites = 0;
  const shell = { classList: { toggle(){} }, set innerHTML(value){ shellWrites += 1; }, get innerHTML(){ return ''; } };
  const controls = ['original', 'english'].flatMap(kind => [0, 1].map(() => ({
    dataset: { readerVisibility: kind },
    classList: { toggle(){} },
    setAttribute(name, value){ this[name] = value; }
  })));
  const layers = ['original', 'english'].map(kind => ({
    dataset: { readerLanguageLayer: kind },
    hidden: kind === 'original',
    attributes: {},
    setAttribute(name, value){ this.attributes[name] = value; },
    toggleAttribute(name, active){ this.attributes[name] = active; }
  }));
  const frames = [];
  global.document = {
    activeElement: { closest: () => null },
    getElementById: () => null,
    querySelector: selector => selector === '.reader-text' ? null : null,
    querySelectorAll: selector => selector === '[data-reader-visibility]' ? controls : (selector === '[data-reader-language-layer]' ? layers : [])
  };
  global.window = {
    requestAnimationFrame(callback){ frames.push(callback); return frames.length; },
    cancelAnimationFrame(){},
    matchMedia: () => ({ matches: false })
  };
  global.state = { currentView: 'readerView' };
  global.$ = selector => selector === '#readerShell' ? shell : null;

  const beforeLoads = reader.readerTranslationLoadCounts['web/john/1'] || 0;
  const result = reader.toggleReaderTextVisibility('original');

  assert.equal(result.textMode, 'original');
  assert.equal(reader.loadReaderSettings('greek').textMode, 'original');
  assert.deepEqual(controls.map(control => control['aria-checked']), ['true', 'true', 'false', 'false']);
  assert.equal(layers[0].hidden, false);
  assert.equal(layers[1].hidden, true);
  assert.equal(reader.readerTranslationLoadCounts['web/john/1'] || 0, beforeLoads);
  frames.splice(0).forEach(frame => frame());
  assert.equal(shellWrites, 0);
  assert.equal(reader.readerState().chapter, 1);

  global.document = previousDocument;
  global.window = previousWindow;
  global.$ = previousDollar;
  if(previousState === undefined) delete global.state;
  else global.state = previousState;
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

test('concurrent chapter requests share one in-flight fetch', async () => {
  const previousFetch = global.fetch;
  let requests = 0;
  reader.readerChapterCache.clear();
  global.fetch = async filePath => {
    if(String(filePath).endsWith('/john/7.json')) requests += 1;
    await new Promise(resolve => setTimeout(resolve, 10));
    return previousFetch(filePath);
  };
  const [first, second] = await Promise.all([
    reader.loadReaderChapter('greek', 'john', 7),
    reader.loadReaderChapter('greek', 'john', 7)
  ]);
  global.fetch = previousFetch;
  assert.equal(requests, 1);
  assert.equal(first.chapter, 7);
  assert.equal(second.chapter, 7);
});

test('concurrent translation requests share one in-flight load and completed result', async () => {
  reader.readerTranslationChapterCache.clear();
  const before = reader.readerTranslationLoadCounts['web/john/10'] || 0;
  const [first, second] = await Promise.all([
    reader.loadReaderTranslationChapter('john', 10, 'web'),
    reader.loadReaderTranslationChapter('john', 10, 'web')
  ]);
  const third = await reader.loadReaderTranslationChapter('john', 10, 'web');
  assert.equal(reader.readerTranslationLoadCounts['web/john/10'], before + 1);
  assert.equal(first.chapter, 10);
  assert.equal(second, first);
  assert.equal(third, first);
});

test('continuous prefetch targets only the next chapters outside the rendered window', async () => {
  await reader.loadReaderManifest('greek');
  assert.deepEqual(reader.readerContinuousPrefetchChapters('greek', 'john', [
    { chapter: 4 }, { chapter: 5 }, { chapter: 6 }
  ]), [3, 7]);
  assert.deepEqual(reader.readerContinuousPrefetchChapters('greek', 'john', [
    { chapter: 1 }, { chapter: 2 }
  ]), [3]);
});

test('continuous prefetch begins before chapter insertion is required', () => {
  const approaching = reader.readerContinuousBoundaryState({ direction: 1, distance: 1500, viewport: 500 });
  assert.equal(approaching.prefetch, true);
  assert.equal(approaching.insert, false);
  const boundary = reader.readerContinuousBoundaryState({ direction: 1, distance: 1000, viewport: 500 });
  assert.equal(boundary.prefetch, true);
  assert.equal(boundary.insert, true);
  const fastScroll = reader.readerContinuousBoundaryState({ direction: 1, distance: 1400, viewport: 500, velocity: 1 });
  assert.equal(fastScroll.insert, true);
});

test('Original display does not request English before first chapter render', async () => {
  storageHarness();
  reader.readerTranslationChapterCache.clear();
  reader.saveReaderSettings({ ...reader.ReaderDefaultSettings, textMode: 'original', showOriginal: true, showEnglish: false }, 'greek');
  const before = reader.readerTranslationLoadCounts['web/john/9'] || 0;
  await reader.setReaderLocation({ language: 'greek', book: 'john', chapter: 9, mode: 'chapter' });
  assert.equal(reader.readerState().chapterData.chapter, 9);
  assert.equal(reader.readerTranslationLoadCounts['web/john/9'] || 0, before);
});

test('failed chapter prefetch remains retryable and deduplicated', async () => {
  const previousFetch = global.fetch;
  let requests = 0;
  reader.readerChapterCache.delete('greek/john/8');
  global.fetch = async filePath => {
    if(String(filePath).endsWith('/john/8.json')){
      requests += 1;
      if(requests === 1) throw new Error('simulated slow-network failure');
    }
    return previousFetch(filePath);
  };
  await assert.rejects(reader.loadReaderPassage('greek', 'john', 8, { ...reader.ReaderDefaultSettings, translation: 'off' }));
  const passage = await reader.loadReaderPassage('greek', 'john', 8, { ...reader.ReaderDefaultSettings, translation: 'off' });
  global.fetch = previousFetch;
  assert.equal(passage.chapter, 8);
  assert.equal(requests, 2);
});

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
  const ids = ['listView','flashView','parsingView','dashboardView','progressView','settingsView','globalSearchView','grammarView','readerView','profileView','sharedFilterBar','filterSearchGroup','filterSortGroup','filterEntriesCount','filterPosGroup','footerLang'];
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
  assert.deepEqual(reader.getReaderBookChapters('hebrew', 'jonah'), [1, 2, 3, 4]);
  assert.deepEqual(reader.getAdjacentReaderLocation(1), { ...reader.readerState(), chapter: 2 });
});

test('Hebrew Reader manifest contains the complete Hebrew Bible in Tanakh canonical order', async () => {
  reader.readerManifestCache.clear();
  reader.ReaderConfig.hebrew.books = [];
  const manifest = await reader.loadReaderManifest('hebrew');
  assert.equal(manifest.language, 'hebrew');
  assert.deepEqual(manifest.books.map(book => book.id), expectedHebrewBooks);
  assert.deepEqual(reader.getReaderBookChapters('hebrew', 'genesis'), Array.from({ length: 50 }, (_, i) => i + 1));
  assert.deepEqual(reader.getReaderBookChapters('hebrew', 'psalms'), Array.from({ length: 150 }, (_, i) => i + 1));
  assert.deepEqual(reader.getReaderBookChapters('hebrew', 'malachi'), [1, 2, 3]);
});

test('representative Hebrew Bible chapters load through the shared manifest/dataRoot path', async () => {
  const samples = [
    ['genesis', 1, 'Genesis', 31, /בְּרֵאשִׁ֖ית בָּרָ֣א/],
    ['exodus', 1, 'Exodus', 22, /וְאֵ֗לֶּה שְׁמוֹת֙/],
    ['psalms', 1, 'Psalms', 6, /אַ֥שְֽׁרֵי הָאִ֗ישׁ/],
    ['isaiah', 1, 'Isaiah', 31, /חֲזוֹן֙ יְשַֽׁעְיָ֣הוּ/],
    ['ruth', 1, 'Ruth', 22, /וַיְהִ֗י בִּימֵי֙/],
    ['jonah', 1, 'Jonah', 16, /וַֽיְהִי֙ דְּבַר/],
    ['malachi', 3, 'Malachi', 24, /הִנְנִ֤י שֹׁלֵחַ֙/]
  ];
  for (const [book, chapterNumber, bookName, verseCount, pattern] of samples) {
    const chapter = await reader.loadReaderChapter('hebrew', book, chapterNumber);
    assert.equal(chapter.language, 'hebrew');
    assert.equal(chapter.bookName, bookName);
    assert.equal(chapter.chapter, chapterNumber);
    assert.equal(chapter.verses.length, verseCount);
    assert.match(renderedText(reader.renderReaderChapter(chapter)), pattern);
    assert.ok(chapter.verses[0].tokens.length > 0);
  }
});

test('Hebrew search uses the Hebrew index and keeps RTL attributes on result text only', async () => {
  let html = '';
  const resultBox = { set innerHTML(value){ html = value; }, get innerHTML(){ return html; } };
  global.$ = selector => selector === '#readerSearchResults' ? resultBox : null;
  global.$$ = () => [];
  await reader.setReaderLocation({ language: 'hebrew', book: 'jonah', chapter: 1 });
  const lemmaResults = await reader.runReaderSearch('3124');
  assert.ok(lemmaResults.some(item => item.book === 'jonah' && item.chapter === 1 && item.verse === 1));
  assert.match(html, /data-language="hebrew"/);
  assert.match(html, /<span lang="he" dir="rtl">/);
  assert.deepEqual(reader.parseReaderReference('Jonah 1:1', 'hebrew'), { language: 'hebrew', book: 'jonah', chapter: 1, verse: '1' });
});

test('Hebrew search index returns complete-corpus results from multiple books', async () => {
  let html = '';
  const resultBox = { set innerHTML(value){ html = value; }, get innerHTML(){ return html; } };
  global.$ = selector => selector === '#readerSearchResults' ? resultBox : null;
  global.$$ = () => [];
  await reader.setReaderLocation({ language: 'hebrew', book: 'genesis', chapter: 1 });
  const results = await reader.runReaderSearch('7225');
  const resultBooks = new Set(results.map(item => item.book));
  assert.ok(resultBooks.has('genesis'));
  assert.ok(resultBooks.has('exodus'));
  assert.ok(resultBooks.has('deuteronomy'));
  assert.match(html, /Genesis/);
  assert.match(html, /Exodus/);
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
  assert.doesNotMatch(popupHtml, /<strong>1961<\/strong>/);
  assert.match(popupHtml, /Frequency[\s\S]*\d+×/);
  assert.match(popupHtml, /Reference[\s\S]*Jonah 1:1/);
  assert.match(popupHtml, /Verb — qal wayyiqtol 3rd person masculine singular/);
  assert.match(popupHtml, /Form Details/);
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
  assert.match(wordPageHtml, /<h2 id="wordPageIdentityHeading">Identity<\/h2>/);
  assert.match(wordPageHtml, /<dt>Glosses<\/dt><dd>word, matter, thing<\/dd>/);
  assert.match(wordPageHtml, /<dt>Strong’s ID<\/dt><dd>1697<\/dd>/);
  assert.match(wordPageHtml, /<dt>Current Reference<\/dt><dd>Jonah 1:1<\/dd>/);
  assert.match(wordPageHtml, /data-topic-id="hebrew-nouns"/);

  const occurrences = await reader.getReaderLemmaOccurrences('3124', 'hebrew', 5);
  assert.ok(occurrences.some(item => item.reference === 'Jonah 1:1'));
  const contextHtml = reader.renderReaderWordPageContext(occurrences);
  assert.match(contextHtml, /data-language="hebrew"/);
  assert.match(contextHtml, /<q lang="he" dir="rtl">/);
  delete global.showView;
  delete global.PuritanReferenceLibrary;
});

test('Hebrew Word Pages and Read in Context work for expanded-corpus books', async () => {
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
    querySelectorAll: selector => selector === '.reader-word-link' ? [{ dataset: { topicId: 'hebrew-verbs' }, addEventListener(){} }] : []
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
  await reader.setReaderLocation({ language: 'hebrew', book: 'genesis', chapter: 1 });
  await reader.openReaderTokenPopup({
    dataset: { surface: 'בָּרָ֣א', lemma: '1254', parse: 'HVqp3ms', book: 'genesis', bookName: 'Genesis', chapter: '1', verse: '1' },
    focus(){}
  });
  assert.match(popupHtml, /Genesis 1:1/);
  assert.match(popupHtml, /Verb — qal perfect 3rd person masculine singular/);
  actionHandler();
  assert.equal(shownView, 'wordPageView');
  assert.match(wordPageHtml, /<dt>Current Reference<\/dt><dd>Genesis 1:1<\/dd>/);
  assert.match(wordPageHtml, /<h2 id="wordPageOccurrenceHeading">This Occurrence<\/h2>[\s\S]*word-page-grammar-summary">Verb — Qal perfect, 3rd person masculine singular<\/p>/);
  assert.match(wordPageHtml, /<dt>Stem<\/dt><dd>Qal<\/dd>/);
  assert.match(wordPageHtml, /<dt>Conjugation<\/dt><dd>perfect<\/dd>/);
  assert.match(wordPageHtml, /<dt>Person<\/dt><dd>3rd person<\/dd>/);
  assert.match(wordPageHtml, /<dt>Gender<\/dt><dd>masculine<\/dd>/);
  assert.match(wordPageHtml, /<dt>Number<\/dt><dd>singular<\/dd>/);
  assert.match(wordPageHtml, /Parse code: HVqp3ms/);
  assert.doesNotMatch(wordPageHtml, /wordPageParsingHeading/);
  assert.doesNotMatch(wordPageHtml, /wordPageMorphologyHeading/);
  const occurrences = await reader.getReaderLemmaOccurrences('1254', 'hebrew', 5);
  assert.ok(occurrences.some(item => item.reference === 'Genesis 1:1'));
  assert.ok(occurrences.some(item => expectedHebrewBooks.includes(item.book)));
  assert.match(reader.renderReaderWordPageContext(occurrences), /data-language="hebrew"/);
  delete global.showView;
  delete global.PuritanReferenceLibrary;
});

test('Ruth appears in the Hebrew Reader manifest and Ruth 1 loads through the shared path', async () => {
  let html = '';
  const shell = { set innerHTML(value){ html = value; }, get innerHTML(){ return html; } };
  global.$ = selector => selector === '#readerShell' ? shell : null;
  global.$$ = () => [];
  reader.readerManifestCache.clear();
  reader.readerChapterCache.clear();
  reader.ReaderConfig.hebrew.books = [];
  await reader.setReaderLocation({ language: 'hebrew', book: 'ruth', chapter: 1 });
  assert.deepEqual(reader.getReaderBookChapters('hebrew', 'ruth'), [1, 2, 3, 4]);
  assert.equal(reader.readerState().language, 'hebrew');
  assert.equal(reader.readerState().book, 'ruth');
  assert.equal(reader.readerState().chapter, 1);
  assert.match(html, /<option value="ruth" selected>Ruth<\/option>/);
  assert.match(html, /Ruth 1/);
  assert.match(renderedText(html), /וַיְהִ֗י בִּימֵי֙/);
  assert.match(html, /class="reader-token"/);
  assert.match(html, /data-lemma="7327"/);
  assert.match(html, /data-parse="HNp"/);
});

test('Ruth Hebrew popup, Word Page, search, and Read in Context use shared reader flows', async () => {
  let popupHtml = '';
  let wordPageHtml = '';
  let searchHtml = '';
  let readerHtml = '';
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
    querySelectorAll: selector => selector === '.reader-word-link' ? [{ dataset: { topicId: 'hebrew-nouns' }, addEventListener(){} }] : []
  };
  const wordRoot = {
    set innerHTML(value){ wordPageHtml = value; },
    get innerHTML(){ return wordPageHtml; },
    querySelector: selector => {
      if(selector === '#wordPageBackToReader') return { addEventListener(){} };
      if(selector === '#wordPageContextList') return { set innerHTML(value){ wordPageHtml += value; }, get innerHTML(){ return ''; } };
      return null;
    },
    querySelectorAll: selector => selector === '.reader-word-link' ? [{ dataset: { topicId: 'hebrew-nouns' }, addEventListener(){} }] : []
  };
  const searchRoot = {
    set innerHTML(value){ searchHtml = value; },
    get innerHTML(){ return searchHtml; },
    querySelectorAll: selector => selector === '.reader-result' ? [{ dataset: { language: 'hebrew', book: 'ruth', chapter: '1', verse: '16' }, addEventListener(){} }] : []
  };
  const readerRoot = { set innerHTML(value){ readerHtml = value; }, get innerHTML(){ return readerHtml; } };
  global.PuritanReferenceLibrary = { getReferenceTopic: id => ({ id }) };
  global.$ = (selector, scope) => {
    if(scope?.querySelector) return scope.querySelector(selector);
    if(selector === '#readerWordPopupRoot') return popupRoot;
    if(selector === '#wordPageShell') return wordRoot;
    if(selector === '#readerSearchResults') return searchRoot;
    if(selector === '#readerShell') return readerRoot;
    return null;
  };
  global.$$ = (selector, scope) => scope?.querySelectorAll ? scope.querySelectorAll(selector) : [];
  global.showView = view => { shownView = view; };
  await reader.setReaderLocation({ language: 'hebrew', book: 'ruth', chapter: 1 });
  await reader.openReaderTokenPopup({
    dataset: { surface: 'רוּת֙', lemma: '7327', parse: 'HNp', book: 'ruth', bookName: 'Ruth', chapter: '1', verse: '16' },
    focus(){}
  });
  assert.match(popupHtml, /reader-word-popup/);
  assert.match(popupHtml, /lang="he" dir="rtl">רוּת֙/);
  assert.match(popupHtml, /ruth/);
  assert.match(popupHtml, /Reference[\s\S]*Ruth 1:16/);
  assert.match(popupHtml, /Noun/);
  assert.match(popupHtml, /data-topic-id="hebrew-nouns"/);

  actionHandler();
  assert.equal(shownView, 'wordPageView');
  assert.match(wordPageHtml, /<h1 id="wordPageTitle" class="word-page-headword" lang="he" dir="rtl">רוּת֙<\/h1>/);
  assert.match(wordPageHtml, /<dt>Glosses<\/dt><dd>ruth<\/dd>/);
  assert.match(wordPageHtml, /<dt>Current Reference<\/dt><dd>Ruth 1:16<\/dd>/);

  const searchResults = await reader.runReaderSearch('7327');
  assert.ok(searchResults.some(item => item.book === 'ruth' && item.chapter === 1 && item.verse === 16));
  assert.match(searchHtml, /Ruth 1:16/);
  assert.deepEqual(reader.parseReaderReference('Ruth 1:16', 'hebrew'), { language: 'hebrew', book: 'ruth', chapter: 1, verse: '16' });

  const occurrences = await reader.getReaderLemmaOccurrences('7327', 'hebrew', 5);
  assert.ok(occurrences.some(item => item.reference === 'Ruth 1:16'));
  await reader.openReaderContextOccurrence({ language: 'hebrew', book: 'ruth', chapter: 1, verse: '16' });
  assert.equal(shownView, 'readerView');
  assert.equal(reader.readerState().book, 'ruth');
  assert.equal(reader.readerState().focusVerse, '16');
  assert.match(readerHtml, /Ruth 1/);
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
