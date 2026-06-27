/* ---------- Reader ---------- */
const ReaderStorageKey = 'pp_reader_location';
const ReaderConfig = {
  hebrew: {
    label: 'Hebrew Bible',
    shortLabel: 'Hebrew',
    htmlLang: 'he',
    dir: 'rtl',
    dataRoot: 'data/hebrew',
    manifestPath: 'data/hebrew/manifest.json',
    glossPath: 'data/glosses/hebrew-glosses.json',
    searchIndexPath: 'data/hebrew/search-index.json',
    searchPlaceholder: 'Search Hebrew text, lemma, or book reference...',
    useSurfaceForNumericLemmaHeadword: true,
    grammarLinks: {
      noun: [['Hebrew Nouns','hebrew-nouns']],
      adjective: [['Hebrew Nouns','hebrew-nouns']],
      verb: [['Hebrew Verbs','hebrew-verbs']],
      participle: [['Hebrew Verbs','hebrew-verbs']],
      article: [['Particles','hebrew-particles'], ['Hebrew Nouns','hebrew-nouns']]
    },
    books: []
  },
  greek: {
    label: 'Greek New Testament',
    shortLabel: 'Greek',
    htmlLang: 'grc',
    dir: 'ltr',
    dataRoot: 'data/greek',
    manifestPath: 'data/greek/manifest.json',
    glossPath: 'data/glosses/greek-glosses.json',
    searchIndexPath: 'data/greek/search-index.json',
    searchPlaceholder: 'Search Greek text, lemma, or Matthew 1:1...',
    grammarLinks: {
      noun: [['Greek Nouns','greek-nouns']],
      adjective: [['Greek Adjectives','greek-adjectives']],
      verb: [['Greek Verbs','greek-verbs']],
      participle: [['Greek Verbs','greek-verbs']],
      article: [['Greek Nouns','greek-nouns']]
    },
    books: []
  }
};
const FallbackReaderBooks = {
  greek: [{ id: 'matthew', name: 'Matthew', chapters: [1, 2] }],
  hebrew: [{ id: 'jonah', name: 'Jonah', chapters: [1] }]
};
const ReaderVocabularyLearningModel = (typeof VocabularyLearning !== 'undefined')
  ? VocabularyLearning
  : (typeof require === 'function' ? require('../../models/vocabulary-learning') : null);

let readerState = {
  language: 'greek',
  book: 'matthew',
  chapter: 1,
  chapterData: null,
  loading: false,
  error: '',
  focusVerse: '',
  activeToken: null,
  wordPageInfo: null
};
const readerChapterCache = new Map();
const readerManifestCache = new Map();
const readerLoadCounts = {};
const readerGlossSourceCache = new Map();
const readerSearchIndexCache = new Map();
let readerPopupLastTrigger = null;

function normalizeReaderBook(book){
  const chapters = Array.isArray(book.chapters) ? book.chapters.map(Number).filter(Boolean).sort((a, b) => a - b) : Array.from({ length: Number(book.chapters) || 0 }, (_, i) => i + 1);
  return { ...book, chapters, chapterCount: chapters.length };
}
function normalizeReaderManifest(manifest = {}){
  const books = (manifest.books || []).map(normalizeReaderBook).filter(book => book.id && book.chapters.length);
  return { ...manifest, books };
}
function getReaderConfig(language = readerState.language){ return ReaderConfig[language] || ReaderConfig.greek; }
function getReaderLanguageMeta(language = readerState.language){
  const config = getReaderConfig(language);
  return { language: ReaderConfig[language] ? language : 'greek', htmlLang: config.htmlLang || 'grc', dir: config.dir || 'ltr', label: config.label || 'Greek New Testament' };
}
function getReaderBooks(language = readerState.language){ return getReaderConfig(language).books.length ? getReaderConfig(language).books : FallbackReaderBooks[language] || FallbackReaderBooks.greek; }
function getReaderBook(language, bookId){ return getReaderBooks(language).find(book => book.id === bookId) || getReaderBooks(language)[0]; }
function readerCacheKey(language, book, chapter){ return `${language}/${book}/${chapter}`; }
function getReaderChapterPath(language, book, chapter){ return `${getReaderConfig(language).dataRoot}/${book}/${chapter}.json`; }
function normalizeReaderText(value){ return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
function cleanReaderTokenValue(value){ return String(value || '').trim(); }
function escReaderAttr(value){ return escHtml(value).replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
function readerReferenceLabel(reference = {}){
  const bookName = reference.bookName || getReaderBook(reference.language || readerState.language, reference.book || readerState.book)?.name || '';
  const chapter = reference.chapter || readerState.chapter;
  const verse = reference.verse || '';
  return `${bookName} ${chapter}${verse ? `:${verse}` : ''}`.trim();
}
function parseReaderReference(value, language = readerState.language){
  const match = String(value || '').trim().match(/^([1-3]?\s?[A-Za-z]+)\s+(\d+)(?::(\d+))?$/);
  if(!match) return null;
  const bookName = match[1].toLowerCase().replace(/\s+/g, '');
  const languages = [language, ...Object.keys(ReaderConfig).filter(item => item !== language)];
  for(const lang of languages){
    const book = getReaderBooks(lang).find(item => item.id === bookName || item.name.toLowerCase().replace(/\s+/g, '') === bookName);
    if(book) return { language: lang, book: book.id, chapter: Number(match[2]), verse: match[3] || '' };
  }
  return null;
}
function getReaderLocation(){ return { language: readerState.language, book: readerState.book, chapter: readerState.chapter }; }
function saveReaderLocation(location = getReaderLocation()){
  const clean = { language: location.language || 'greek', book: location.book || 'matthew', chapter: Number(location.chapter) || 1 };
  if(typeof writeStorageJson === 'function') writeStorageJson(ReaderStorageKey, clean);
  else if(typeof localStorage !== 'undefined') localStorage.setItem(ReaderStorageKey, JSON.stringify(clean));
}
function loadReaderLocation(){
  let stored = null;
  if(typeof readStorageJson === 'function') stored = readStorageJson(ReaderStorageKey, null);
  else if(typeof localStorage !== 'undefined') { try { stored = JSON.parse(localStorage.getItem(ReaderStorageKey) || 'null'); } catch(e) { stored = null; } }
  if(!stored) return getReaderLocation();
  const language = ReaderConfig[stored.language] ? stored.language : 'greek';
  const book = getReaderBook(language, stored.book).id;
  return { language, book, chapter: Number(stored.chapter) || 1 };
}
async function fetchReaderJson(path){
  if(typeof fetch !== 'function') throw new Error('Fetch is unavailable for reader data.');
  const response = await fetch(path);
  if(!response.ok) throw new Error(`Unable to load ${path}`);
  return response.json();
}
async function loadReaderGlossSource(language = 'greek'){
  const config = getReaderConfig(language);
  if(readerGlossSourceCache.has(language)) return readerGlossSourceCache.get(language);
  let glosses = {};
  try { glosses = await fetchReaderJson(config.glossPath); }
  catch(e) { glosses = {}; }
  readerGlossSourceCache.set(language, glosses);
  return glosses;
}
async function loadReaderSearchIndex(language = 'greek'){
  const config = getReaderConfig(language);
  if(readerSearchIndexCache.has(language)) return readerSearchIndexCache.get(language);
  const index = await fetchReaderJson(config.searchIndexPath);
  readerSearchIndexCache.set(language, index);
  return index;
}
function getReaderVocabulary(language = 'greek'){
  if(typeof state !== 'undefined' && Array.isArray(state.data?.[language])) return state.data[language];
  return [];
}
function getReaderStudyVocabulary(language = 'greek'){
  const entries = getReaderVocabulary(language);
  return typeof getStudyEntries === 'function' ? getStudyEntries(entries, 'lemma') : entries;
}
function bestReaderVocabMatches(lemma, language = 'greek'){
  const exact = cleanReaderTokenValue(lemma);
  const normalized = normalizeReaderText(exact);
  const vocab = getReaderVocabulary(language);
  const matches = vocab.filter(entry => String(entry?.lang || language).toLowerCase() === language && cleanReaderTokenValue(entry?.lemma || entry?.word) === exact);
  if(matches.length) return matches;
  return vocab.filter(entry => String(entry?.lang || language).toLowerCase() === language && normalizeReaderText(entry?.lemma || entry?.word) === normalized);
}
function readerVocabularyLearningEntry(info = {}){
  const language = info.language || readerState.language || 'greek';
  const lemma = cleanReaderTokenValue(info.lemma || info.surface);
  if(!lemma) return null;
  const normalized = normalizeReaderText(lemma);
  const studyEntries = getReaderStudyVocabulary(language);
  return studyEntries.find(entry =>
    String(entry?.lang || language).toLowerCase() === language &&
    (cleanReaderTokenValue(entry?.lemma || entry?.word) === lemma || normalizeReaderText(entry?.lemma || entry?.word) === normalized)
  ) || bestReaderVocabMatches(lemma, language)[0] || null;
}
function readerLearningStatusForInfo(info = {}){
  const entry = readerVocabularyLearningEntry(info);
  if(!entry || !ReaderVocabularyLearningModel) return ReaderVocabularyLearningModel?.STATUS?.NOT_LEARNED || 'Not Learned';
  return ReaderVocabularyLearningModel.learningStatus(ReaderVocabularyLearningModel.loadStore(), entry);
}
function readerLearningStatusMark(status){
  if(status === ReaderVocabularyLearningModel?.STATUS?.KNOWN || status === 'Known') return '●';
  if(status === ReaderVocabularyLearningModel?.STATUS?.LEARNING || status === 'Learning') return '◐';
  return '○';
}
function renderReaderWordLearning(info = {}){
  if(!info.lemma && !info.surface) return '';
  const entry = readerVocabularyLearningEntry(info);
  const status = readerLearningStatusForInfo(info);
  const label = `${readerLearningStatusMark(status)} ${status}`;
  const id = entry && ReaderVocabularyLearningModel ? ReaderVocabularyLearningModel.lemmaId(entry) : '';
  const language = info.language || readerState.language || 'greek';
  const action = status === ReaderVocabularyLearningModel?.STATUS?.NOT_LEARNED || status === 'Not Learned'
    ? `<button class="btn btn-ghost btn-sm" type="button" data-word-learn-action="learn" data-language="${escReaderAttr(language)}" data-word-id="${escReaderAttr(id)}">Learn This Word</button>`
    : status === ReaderVocabularyLearningModel?.STATUS?.LEARNING || status === 'Learning'
      ? `<button class="btn btn-ghost btn-sm" type="button" data-word-learn-action="review" data-language="${escReaderAttr(language)}" data-word-id="${escReaderAttr(id)}">Review This Word</button>`
      : `<span class="word-page-learning-known">Known</span><button class="btn btn-ghost btn-sm" type="button" data-word-learn-action="review" data-language="${escReaderAttr(language)}" data-word-id="${escReaderAttr(id)}">Review Again</button>`;
  return `
        <section class="word-page-section word-page-learning" aria-labelledby="wordPageLearningHeading">
          <h2 id="wordPageLearningHeading">Learning</h2>
          <div class="word-page-learning-row">
            <span class="word-page-learning-status">${escHtml(label)}</span>
            ${entry && ReaderVocabularyLearningModel ? action : '<span class="muted small">Not available in vocabulary learning.</span>'}
          </div>
        </section>`;
}
function introduceReaderWordFromPage(info = readerState.wordPageInfo || {}){
  const entry = readerVocabularyLearningEntry(info);
  if(!entry || !ReaderVocabularyLearningModel) return false;
  ReaderVocabularyLearningModel.persistIntroduceEntry(entry, { type: 'word-page', language: entry.lang || info.language || readerState.language });
  renderReaderWordPage();
  return true;
}
function reviewReaderWordFromPage(info = readerState.wordPageInfo || {}){
  const entry = readerVocabularyLearningEntry(info);
  if(!entry || !ReaderVocabularyLearningModel) return false;
  const language = entry.lang || info.language || readerState.language || 'greek';
  const id = ReaderVocabularyLearningModel.lemmaId(entry);
  if(typeof reviewLearnVocabularyWord === 'function') reviewLearnVocabularyWord(language, id);
  if(typeof showView === 'function') showView('learnView');
  else if(typeof navigateTo === 'function') navigateTo('/learn');
  return true;
}
function splitLegacyGloss(gloss){
  return String(gloss || '').split(/[,;]/).map(part => part.trim()).filter(Boolean);
}
function mergeUniqueGlosses(values){
  const seen = new Set();
  return values.map(cleanReaderTokenValue).filter(value => {
    const key = value.toLowerCase();
    if(!value || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
async function lookupReaderWordInfo(token = {}, reference = {}, language = readerState.language){
  const lemma = cleanReaderTokenValue(token.lemma || token.surface);
  const glossSource = await loadReaderGlossSource(language);
  const sourceGloss = glossSource[lemma] || glossSource[Object.keys(glossSource).find(key => normalizeReaderText(key) === normalizeReaderText(lemma))];
  const vocabMatches = bestReaderVocabMatches(lemma, language);
  const primaryGloss = cleanReaderTokenValue(sourceGloss?.primaryGloss)
    || cleanReaderTokenValue(vocabMatches.find(entry => entry.primaryGloss)?.primaryGloss)
    || splitLegacyGloss(vocabMatches.find(entry => entry.gloss)?.gloss)[0]
    || cleanReaderTokenValue(sourceGloss?.gloss);
  const alternateGlosses = mergeUniqueGlosses([
    ...(Array.isArray(sourceGloss?.alternateGlosses) ? sourceGloss.alternateGlosses : []),
    ...vocabMatches.flatMap(entry => Array.isArray(entry.alternateGlosses) ? entry.alternateGlosses : []),
    ...vocabMatches.flatMap(entry => splitLegacyGloss(entry.gloss)).filter(gloss => gloss !== primaryGloss)
  ]);
  const aggregateFrequency = vocabMatches.reduce((sum, entry) => sum + (Number(entry.freq) || 0), 0);
  const bestFrequency = aggregateFrequency || Math.max(0, ...vocabMatches.map(entry => Number(entry.freq) || 0));
  const indexFrequency = bestFrequency ? 0 : (await getReaderLemmaOccurrences(lemma, language, Number.MAX_SAFE_INTEGER)).length;
  const parse = cleanReaderTokenValue(token.parse);
  return {
    surface: cleanReaderTokenValue(token.surface),
    lemma,
    primaryGloss,
    alternateGlosses: alternateGlosses.filter(gloss => gloss !== primaryGloss),
    parse,
    parseExplanation: explainReaderParse(parse, language),
    frequency: bestFrequency || indexFrequency || '',
    reference: readerReferenceLabel(reference),
    language
  };
}
function formatReaderParseExplanation(decoded){
  if(!decoded || !decoded.details?.length) return '';
  const title = value => String(value || '').replace(/\b\w/g, char => char.toUpperCase());
  const details = decoded.details.filter(Boolean).map(value => String(value).toLowerCase()).join(' ');
  return [title(decoded.label), details].filter(Boolean).join(' — ');
}
function explainReaderParse(parse, language = 'greek'){
  if(!parse) return '';
  const parser = (typeof ParserCore !== 'undefined' && ParserCore) || (typeof require === 'function' ? require('../../parser-core') : null);
  const decoded = parser?.decodeParse ? parser.decodeParse(parse, language) : null;
  return formatReaderParseExplanation(decoded) || parse;
}
function readerParseKind(parse, explanation = ''){
  const raw = cleanReaderTokenValue(parse).toUpperCase();
  const text = `${raw} ${explanation}`.toLowerCase();
  if(/\b(qal|niphal|piel|pual|hiphil|hophal|hitpael)\b/.test(text)) return 'verb';
  if(text.includes('participle')) return 'participle';
  if(raw.startsWith('V') || raw.startsWith('HV') || raw.includes('/V') || text.includes('verb')) return 'verb';
  if(raw.startsWith('RA') || raw.startsWith('T') || text.includes('article')) return 'article';
  if(raw.startsWith('A') || text.includes('adjective')) return 'adjective';
  if(raw.startsWith('N') || raw.startsWith('HN') || text.includes('noun')) return 'noun';
  if(raw.startsWith('HR') || raw.startsWith('HC')) return 'article';
  return '';
}
function readerGrammarLinksForInfo(info = {}){
  const config = getReaderConfig(info.language);
  const api = typeof PuritanReferenceLibrary !== 'undefined' ? PuritanReferenceLibrary : null;
  return (config.grammarLinks?.[readerParseKind(info.parse, info.parseExplanation)] || [])
    .filter(([, id]) => !api?.getReferenceTopic || api.getReferenceTopic(id))
    .map(([label, topicId]) => ({ label, topicId }));
}
function readerPartOfSpeechForInfo(info = {}){
  const parseExplanation = cleanReaderTokenValue(info.parseExplanation);
  const rawParse = cleanReaderTokenValue(info.parse);
  if(parseExplanation && parseExplanation !== rawParse) return parseExplanation.split(/[—-]/)[0].trim();
  const labels = { noun: 'Noun', adjective: 'Adjective', verb: 'Verb', participle: 'Participle', article: 'Article' };
  return labels[readerParseKind(info.parse, info.parseExplanation)] || '';
}
function readerLemmaIndex(item = {}, lemma = ''){
  const target = normalizeReaderText(lemma);
  return (item.lemmas || []).findIndex(itemLemma => normalizeReaderText(itemLemma) === target);
}
function readerOccurrenceSnippet(item = {}, lemma = ''){
  const surface = Array.isArray(item.surface) && item.surface.length ? item.surface : String(item.text || '').split(/\s+/).filter(Boolean);
  if(!surface.length) return '';
  const foundIndex = readerLemmaIndex(item, lemma);
  const center = foundIndex >= 0 ? foundIndex : 0;
  let start = Math.max(0, center - 3);
  let end = Math.min(surface.length, center + 4);
  while(end - start < 6 && (start > 0 || end < surface.length)){
    if(start > 0) start -= 1;
    if(end - start >= 6) break;
    if(end < surface.length) end += 1;
  }
  const words = surface.slice(start, end).join(' ');
  return `...${words}...`;
}
function readerOccurrenceReference(item = {}){
  return `${item.bookName || ''} ${item.chapter}:${item.verse}`.trim();
}
function representativeReaderOccurrences(index = [], lemma = '', limit = 5, language = 'greek'){
  const seen = new Set();
  return index.filter(item => readerLemmaIndex(item, lemma) >= 0).reduce((items, item) => {
    if(items.length >= limit) return items;
    const key = `${item.book}:${item.chapter}:${item.verse}`;
    if(seen.has(key)) return items;
    seen.add(key);
    items.push({
      language,
      book: item.book,
      bookName: item.bookName,
      chapter: Number(item.chapter),
      verse: String(item.verse || ''),
      reference: readerOccurrenceReference(item),
      snippet: readerOccurrenceSnippet(item, lemma)
    });
    return items;
  }, []);
}
async function getReaderLemmaOccurrences(lemma, language = 'greek', limit = 5){
  const cleanLemma = cleanReaderTokenValue(lemma);
  if(!cleanLemma) return [];
  try {
    return representativeReaderOccurrences(await loadReaderSearchIndex(language), cleanLemma, limit, language);
  } catch(e) {
    return [];
  }
}
async function loadReaderManifest(language = readerState.language){
  const config = getReaderConfig(language);
  if(readerManifestCache.has(language)) return readerManifestCache.get(language);
  const manifest = normalizeReaderManifest(await fetchReaderJson(config.manifestPath));
  if(manifest.books.length) config.books = manifest.books;
  readerManifestCache.set(language, manifest);
  return manifest;
}
function getReaderBookChapters(language, bookId){ return getReaderBook(language, bookId)?.chapters || []; }
function clampReaderChapter(language, book, chapter){
  const chapters = getReaderBookChapters(language, book);
  const requested = Number(chapter) || chapters[0] || 1;
  if(chapters.includes(requested)) return requested;
  return chapters.reduce((closest, current) => Math.abs(current - requested) < Math.abs(closest - requested) ? current : closest, chapters[0] || 1);
}
async function loadReaderChapter(language = readerState.language, book = readerState.book, chapter = readerState.chapter){
  const key = readerCacheKey(language, book, chapter);
  if(readerChapterCache.has(key)) return readerChapterCache.get(key);
  const path = getReaderChapterPath(language, book, chapter);
  readerLoadCounts[key] = (readerLoadCounts[key] || 0) + 1;
  const data = await fetchReaderJson(path);
  readerChapterCache.set(key, data);
  return data;
}
async function setReaderLocation(location = {}){
  const language = ReaderConfig[location.language || readerState.language] ? (location.language || readerState.language) : 'greek';
  await loadReaderManifest(language);
  const book = getReaderBook(language, location.book || readerState.book).id;
  const chapter = clampReaderChapter(language, book, location.chapter || readerState.chapter);
  readerState = { ...readerState, language, book, chapter, loading: true, error: '', focusVerse: location.verse || '' };
  renderReader();
  try {
    readerState.chapterData = await loadReaderChapter(language, book, chapter);
    readerState.loading = false;
    saveReaderLocation(readerState);
  } catch(error) {
    readerState.loading = false;
    readerState.error = error.message || 'Reader chapter failed to load.';
  }
  renderReader();
}
function getAdjacentReaderLocation(direction){
  const books = getReaderBooks(readerState.language);
  const idx = books.findIndex(book => book.id === readerState.book);
  const current = books[idx];
  if(direction < 0){
    const previousChapter = current.chapters[current.chapters.indexOf(readerState.chapter) - 1];
    if(previousChapter) return { ...readerState, chapter: previousChapter };
  }
  if(direction > 0 && current.chapters.includes(readerState.chapter + 1)) return { ...readerState, chapter: readerState.chapter + 1 };
  const nextBook = books[idx + direction];
  if(!nextBook) return null;
  return { language: readerState.language, book: nextBook.id, chapter: direction > 0 ? nextBook.chapters[0] : nextBook.chapters.at(-1) };
}
function renderReader(){
  const root = $('#readerShell'); if(!root) return;
  const meta = getReaderLanguageMeta(readerState.language);
  const config = getReaderConfig(readerState.language);
  const book = getReaderBook(readerState.language, readerState.book);
  const books = getReaderBooks(readerState.language);
  const chapters = getReaderBookChapters(readerState.language, readerState.book);
  const data = readerState.chapterData;
  root.innerHTML = `
    <section class="panel reader-controls" aria-label="Reader controls">
      <select id="readerLanguageSelect" class="input" aria-label="Reader language selector">${Object.entries(ReaderConfig).map(([key, item]) => `<option value="${key}" ${key===readerState.language?'selected':''}>${escHtml(item.shortLabel || item.label)}</option>`).join('')}</select>
      <select id="readerBookSelect" class="input" aria-label="Book selector">${books.map(item => `<option value="${item.id}" ${item.id===readerState.book?'selected':''}>${escHtml(item.name)}</option>`).join('')}</select>
      <select id="readerChapterSelect" class="input" aria-label="Chapter selector">${chapters.map(ch => `<option value="${ch}" ${ch===readerState.chapter?'selected':''}>Chapter ${ch}</option>`).join('')}</select>
      <button class="btn btn-ghost btn-sm" id="readerPrevBtn" ${getAdjacentReaderLocation(-1)?'':'disabled'}>← Previous</button>
      <button class="btn btn-ghost btn-sm" id="readerNextBtn" ${getAdjacentReaderLocation(1)?'':'disabled'}>Next →</button>
      <button class="btn btn-ghost btn-sm" id="readerBookProgressBtn" type="button">View Book Progress</button>
      <div class="reader-reference" id="readerReference">${escHtml(book.name)} ${readerState.chapter}</div>
    </section>
    <section class="panel reader-search" aria-label="${escReaderAttr(config.shortLabel || meta.label)} reader search">
      <input id="readerSearchInput" class="input" placeholder="${escReaderAttr(config.searchPlaceholder)}" autocomplete="off" />
      <button class="btn btn-primary btn-sm" id="readerSearchBtn">Search</button>
      <div id="readerSearchResults" class="reader-search-results"></div>
    </section>
    <article class="reader-text reader-text-${escReaderAttr(meta.language)}" aria-live="polite">
      ${readerState.loading ? '<div class="empty-state">Loading chapter…</div>' : ''}
      ${readerState.error ? `<div class="empty-state danger">${escHtml(readerState.error)}</div>` : ''}
      ${!readerState.loading && !readerState.error && data ? renderReaderChapter(data) : ''}
    </article>
    <div id="readerWordPopupRoot"></div>`;
  wireReaderControls();
  renderReaderWordPopup();
  if(readerState.focusVerse && typeof document !== 'undefined') setTimeout(() => document.getElementById(`readerVerse-${readerState.focusVerse}`)?.scrollIntoView({ block: 'center' }), 0);
}
function renderReaderChapter(data){
  const paragraphs = data.paragraphs || [{ verses: data.verses || [] }];
  const meta = getReaderLanguageMeta(data.language || readerState.language);
  return `<h2 class="reader-chapter-heading" dir="ltr">${escHtml(data.bookName)} ${data.chapter}</h2>` + paragraphs.map(paragraph => `<p class="reader-paragraph" lang="${escReaderAttr(meta.htmlLang)}" dir="${escReaderAttr(meta.dir)}">${paragraph.verses.map(verse => renderReaderVerse(verse, data)).join(' ')}</p>`).join('');
}
function renderReaderVerse(verse, data = readerState.chapterData || {}){
  const number = verse.number || verse.verse;
  const tokens = Array.isArray(verse.tokens) ? verse.tokens.filter(token => token?.surface && (token.lemma || token.parse)) : [];
  const text = tokens.length ? renderReaderTokens(tokens, { book: data.book, bookName: data.bookName, chapter: data.chapter, verse: number }) : escHtml(verse.text);
  return `<span class="reader-verse" id="readerVerse-${number}"><sup>${number}</sup>${text}</span>`;
}
function renderReaderTokens(tokens, reference = {}){
  return tokens.map((token, index) => {
    return `<button class="reader-token" type="button" data-surface="${escReaderAttr(token.surface || '')}" data-lemma="${escReaderAttr(token.lemma || '')}" data-parse="${escReaderAttr(token.parse || '')}" data-book="${escReaderAttr(reference.book || '')}" data-book-name="${escReaderAttr(reference.bookName || '')}" data-chapter="${escReaderAttr(reference.chapter || '')}" data-verse="${escReaderAttr(reference.verse || '')}" aria-label="${escReaderAttr(`Show word info for ${token.surface || `token ${index + 1}`}`)}">${escHtml(token.surface)}</button>`;
  }).join(' ');
}
function wireReaderControls(){
  $('#readerLanguageSelect')?.addEventListener('change', e => {
    const language = ReaderConfig[e.target.value] ? e.target.value : 'greek';
    const book = getReaderBook(language)?.id;
    setReaderLocation({ language, book, chapter: 1 });
  });
  $('#readerBookSelect')?.addEventListener('change', e => setReaderLocation({ language: readerState.language, book: e.target.value, chapter: 1 }));
  $('#readerChapterSelect')?.addEventListener('change', e => setReaderLocation({ language: readerState.language, book: readerState.book, chapter: Number(e.target.value) }));
  $('#readerPrevBtn')?.addEventListener('click', () => { const loc = getAdjacentReaderLocation(-1); if(loc) setReaderLocation(loc); });
  $('#readerNextBtn')?.addEventListener('click', () => { const loc = getAdjacentReaderLocation(1); if(loc) setReaderLocation(loc); });
  $('#readerBookProgressBtn')?.addEventListener('click', openReaderBookProgress);
  $('#readerSearchBtn')?.addEventListener('click', () => runReaderSearch($('#readerSearchInput')?.value || ''));
  $('#readerSearchInput')?.addEventListener('keydown', e => { if(e.key === 'Enter') runReaderSearch(e.target.value); });
  $$('.reader-token').forEach(btn => btn.addEventListener('click', () => openReaderTokenPopup(btn)));
  if(typeof document !== 'undefined'){
    document.removeEventListener?.('keydown', handleReaderPopupKeydown);
    document.addEventListener?.('keydown', handleReaderPopupKeydown);
  }
}
function handleReaderPopupKeydown(event){ if(event.key === 'Escape') closeReaderWordPopup(); }
async function openReaderTokenPopup(button){
  const token = { surface: button.dataset.surface || '', lemma: button.dataset.lemma || '', parse: button.dataset.parse || '' };
  readerPopupLastTrigger = button;
  const reference = {
    language: readerState.language,
    book: button.dataset.book || readerState.book,
    bookName: button.dataset.bookName || getReaderBook(readerState.language, readerState.book)?.name,
    chapter: Number(button.dataset.chapter) || readerState.chapter,
    verse: button.dataset.verse || ''
  };
  readerState.activeToken = { loading: true, info: { surface: token.surface, lemma: token.lemma, parse: token.parse, reference: readerReferenceLabel(reference) } };
  renderReaderWordPopup();
  readerState.activeToken = { loading: false, info: await lookupReaderWordInfo(token, reference, readerState.language) };
  renderReaderWordPopup();
}
function closeReaderWordPopup(){
  if(!readerState.activeToken) return;
  readerState.activeToken = null;
  renderReaderWordPopup();
  readerPopupLastTrigger?.focus?.();
}
function navigateReaderGrammarLink(topicId){
  closeReaderWordPopup();
  if(typeof navigateTo === 'function') navigateTo('/grammar');
  else if(typeof showView === 'function') showView('grammarView');
  if(typeof renderReferenceLibrary === 'function') setTimeout(() => renderReferenceLibrary(topicId), 0);
}
function openReaderBookProgress(){
  const testamentId = readerState.language === 'hebrew' ? 'old-testament' : 'new-testament';
  if(typeof setLearnPage === 'function') setLearnPage(`reading-readiness:${testamentId}:${readerState.book}`, { skipHistory: true });
  if(typeof showView === 'function') showView('learnView');
  else if(typeof navigateTo === 'function') navigateTo('/learn');
}
function openReaderWordPage(){
  const info = readerState.activeToken?.info || readerState.wordPageInfo;
  if(info?.lemma || info?.surface) readerState.wordPageInfo = { ...info };
  closeReaderWordPopup();
  renderReaderWordPage();
  if(typeof showView === 'function') showView('wordPageView');
}
async function openReaderContextOccurrence(location = {}){
  const target = {
    language: location.language || 'greek',
    book: location.book,
    chapter: Number(location.chapter) || 1,
    verse: location.verse || ''
  };
  if(typeof showView === 'function') showView('readerView');
  await setReaderLocation(target);
}
function renderReaderWordPageContextContent(occurrences = [], loading = false){
  return loading
    ? '<p class="word-page-context-empty">Loading references...</p>'
    : occurrences.length
      ? `<div class="word-page-context-list">${occurrences.map(item => `
          <button class="word-page-context-link" type="button" data-language="${escReaderAttr(item.language || 'greek')}" data-book="${escReaderAttr(item.book || '')}" data-chapter="${escReaderAttr(item.chapter || '')}" data-verse="${escReaderAttr(item.verse || '')}">
            <span>${escHtml(item.reference)}</span>
            <q lang="${escReaderAttr(getReaderLanguageMeta(item.language).htmlLang)}" dir="${escReaderAttr(getReaderLanguageMeta(item.language).dir)}">${escHtml(item.snippet)}</q>
          </button>`).join('')}</div>`
      : '<p class="word-page-context-empty">No reader references found yet.</p>';
}
function renderReaderWordPageContext(occurrences = [], loading = false){
  return `
        <section class="word-page-section word-page-context" aria-labelledby="wordPageContextHeading">
          <h2 id="wordPageContextHeading">Read in Context</h2>
          <div id="wordPageContextList">${renderReaderWordPageContextContent(occurrences, loading)}</div>
        </section>`;
}
function attachReaderWordPageContextHandlers(root){
  $$('.word-page-context-link', root).forEach(btn => btn.addEventListener('click', () => openReaderContextOccurrence({
    language: btn.dataset.language || 'greek',
    book: btn.dataset.book,
    chapter: Number(btn.dataset.chapter),
    verse: btn.dataset.verse || ''
  })));
}
async function updateReaderWordPageContext(lemma, language = 'greek'){
  const root = $('#wordPageShell'); if(!root || !lemma) return [];
  const occurrences = await getReaderLemmaOccurrences(lemma, language, 5);
  const mount = $('#wordPageContextList', root);
  if(!mount) return occurrences;
  mount.innerHTML = renderReaderWordPageContextContent(occurrences);
  attachReaderWordPageContextHandlers(root);
  return occurrences;
}
function renderReaderWordPage(){
  const root = $('#wordPageShell'); if(!root) return;
  const info = readerState.wordPageInfo || {};
  const meta = getReaderLanguageMeta(info.language || readerState.language);
  const config = getReaderConfig(info.language || readerState.language);
  const headwordAttrs = meta.dir === 'rtl' ? ` lang="${escReaderAttr(meta.htmlLang)}" dir="${escReaderAttr(meta.dir)}"` : '';
  const lemma = cleanReaderTokenValue(info.lemma || info.surface);
  const headword = config.useSurfaceForNumericLemmaHeadword && /^\d+$/.test(lemma) ? cleanReaderTokenValue(info.surface) || lemma : lemma;
  const primaryGloss = cleanReaderTokenValue(info.primaryGloss);
  const alternateGlosses = Array.isArray(info.alternateGlosses) ? info.alternateGlosses.map(cleanReaderTokenValue).filter(Boolean) : [];
  const partOfSpeech = readerPartOfSpeechForInfo(info);
  const links = readerGrammarLinksForInfo(info);
  const grammarHtml = links.length ? `
        <section class="word-page-section" aria-labelledby="wordPageGrammarHeading">
          <h2 id="wordPageGrammarHeading">Grammar</h2>
          <div class="reader-word-links word-page-links" aria-label="Related grammar links">${links.map(link => `<button class="reader-word-link" type="button" data-topic-id="${escHtml(link.topicId)}">${escHtml(link.label)}</button>`).join('')}</div>
        </section>` : '';
  root.innerHTML = `
    <section class="panel word-page-panel" aria-labelledby="wordPageTitle">
      <header class="word-page-header">
        ${lemma ? `<h1 id="wordPageTitle" class="word-page-headword"${headwordAttrs}>${escHtml(headword)}</h1>` : `<h1 id="wordPageTitle" class="word-page-headword word-page-empty-title">Choose a word</h1>`}
        ${partOfSpeech ? `<div class="word-page-pos">${escHtml(partOfSpeech)}</div>` : ''}
      </header>
      ${lemma ? `
        <section class="word-page-section" aria-labelledby="wordPageMeaningHeading">
          <h2 id="wordPageMeaningHeading">Meaning</h2>
          <p class="word-page-primary-gloss">${escHtml(primaryGloss || '-')}</p>
          ${alternateGlosses.length ? `<div class="word-page-also"><div>Also translated as</div><p>${escHtml(alternateGlosses.join(' • '))}</p></div>` : ''}
        </section>
        <dl class="word-page-meta">
          ${readerWordPageMeta('Frequency', info.frequency ? `${info.frequency}×` : '')}
          ${readerWordPageMeta('Current Reference', info.reference)}
        </dl>
        ${grammarHtml}
        ${renderReaderWordPageContext([], true)}
        ${renderReaderWordLearning(info)}` : `<p class="word-page-empty">Open a word from the Reader to build this page.</p>`}
      <button class="btn btn-primary" id="wordPageBackToReader">Back to Reader</button>
    </section>`;
  $('#wordPageBackToReader', root)?.addEventListener('click', () => {
    if(typeof showView === 'function') showView('readerView');
  });
  $$('.reader-word-link', root).forEach(btn => btn.addEventListener('click', () => navigateReaderGrammarLink(btn.dataset.topicId)));
  $$('[data-word-learn-action]', root).forEach(btn => btn.addEventListener('click', () => {
    if(btn.dataset.wordLearnAction === 'learn') introduceReaderWordFromPage(info);
    if(btn.dataset.wordLearnAction === 'review') reviewReaderWordFromPage(info);
  }));
  attachReaderWordPageContextHandlers(root);
  if(lemma) updateReaderWordPageContext(lemma, info.language || readerState.language);
}
function readerWordPageMeta(label, value){
  const clean = cleanReaderTokenValue(value);
  if(!clean) return '';
  return `<div><dt>${escHtml(label)}</dt><dd>${escHtml(clean)}</dd></div>`;
}
function renderReaderWordPopup(){
  const root = $('#readerWordPopupRoot'); if(!root) return;
  const active = readerState.activeToken;
  if(!active){ root.innerHTML = ''; return; }
  const info = active.info || {};
  const meta = getReaderLanguageMeta(info.language || readerState.language);
  const links = readerGrammarLinksForInfo(info);
  const parseExplanation = cleanReaderTokenValue(info.parseExplanation);
  const rawParse = cleanReaderTokenValue(info.parse);
  const hasDecodedParse = parseExplanation && parseExplanation !== rawParse;
  const grammarHtml = links.length ? `
          <div class="reader-word-grammar">
            <div class="reader-word-label">Grammar</div>
            <div class="reader-word-links" aria-label="Related grammar links">${links.map(link => `<button class="reader-word-link" type="button" data-topic-id="${escHtml(link.topicId)}">${escHtml(link.label)}</button>`).join('')}</div>
          </div>` : '';
  root.innerHTML = `
    <div class="reader-word-overlay" data-reader-popup-overlay>
      <section class="reader-word-popup" role="dialog" aria-modal="true" aria-labelledby="readerWordPopupTitle">
        <button class="reader-word-close" type="button" aria-label="Close word popup">✕</button>
        <div class="reader-word-surface" id="readerWordPopupTitle" lang="${escReaderAttr(meta.htmlLang)}" dir="${escReaderAttr(meta.dir)}">${escHtml(info.surface || 'Word')}</div>
        <div class="reader-word-gloss">${escHtml(info.primaryGloss || (active.loading ? 'Loading...' : '-'))}</div>
        ${hasDecodedParse ? `<p class="reader-word-meaning">${escHtml(parseExplanation)}</p>` : ''}
        ${info.alternateGlosses?.length ? `<p class="reader-word-also">Also: ${escHtml(info.alternateGlosses.join(', '))}</p>` : ''}
        <div class="reader-word-meta">
          ${readerPopupMeta('Lemma', info.lemma && info.lemma !== info.surface ? info.lemma : '')}
          ${readerPopupMeta('Frequency', info.frequency ? `${info.frequency}×` : '')}
          ${readerPopupMeta('Reference', info.reference)}
        </div>
        ${grammarHtml}
        ${rawParse ? `<div class="reader-word-parse-code">${hasDecodedParse ? 'Parse: ' : ''}${escHtml(rawParse)}</div>` : ''}
        <button class="reader-word-page-action" type="button">Open Word Page</button>
      </section>
    </div>`;
  $('.reader-word-close', root)?.addEventListener('click', closeReaderWordPopup);
  $('[data-reader-popup-overlay]', root)?.addEventListener('click', event => { if(event.target?.dataset?.readerPopupOverlay !== undefined) closeReaderWordPopup(); });
  $$('.reader-word-link', root).forEach(btn => btn.addEventListener('click', () => navigateReaderGrammarLink(btn.dataset.topicId)));
  $('.reader-word-page-action', root)?.addEventListener('click', openReaderWordPage);
  $('.reader-word-close', root)?.focus?.();
}
function readerPopupMeta(label, value){
  const clean = Array.isArray(value) ? value.filter(Boolean).join(', ') : cleanReaderTokenValue(value);
  if(!clean) return '';
  return `<div class="reader-word-meta-item"><span>${escHtml(label)}</span><strong>${escHtml(clean)}</strong></div>`;
}
async function runReaderSearch(query){
  const box = $('#readerSearchResults'); if(!box) return [];
  const language = readerState.language;
  const meta = getReaderLanguageMeta(language);
  const direct = parseReaderReference(query, language);
  if(direct){ await setReaderLocation(direct); return [direct]; }
  const q = normalizeReaderText(query);
  if(q.length < 2){ box.innerHTML = '<div class="small muted">Enter at least 2 characters.</div>'; return []; }
  let index = [];
  try { index = await loadReaderSearchIndex(language); } catch(e) { box.innerHTML = '<div class="small muted">Search index unavailable.</div>'; return []; }
  const results = index.filter(item => normalizeReaderText(`${item.text} ${item.lemmas?.join(' ')}`).includes(q)).slice(0, 20);
  box.innerHTML = results.length ? results.map(item => `<button class="reader-result" data-language="${escReaderAttr(language)}" data-book="${escReaderAttr(item.book)}" data-chapter="${escReaderAttr(item.chapter)}" data-verse="${escReaderAttr(item.verse)}"><strong>${escHtml(item.bookName)} ${item.chapter}:${item.verse}</strong> <span lang="${escReaderAttr(meta.htmlLang)}" dir="${escReaderAttr(meta.dir)}">${escHtml(item.text)}</span></button>`).join('') : '<div class="small muted">No verses found.</div>';
  $$('.reader-result', box).forEach(btn => btn.addEventListener('click', () => setReaderLocation({ language: btn.dataset.language || language, book: btn.dataset.book, chapter: Number(btn.dataset.chapter), verse: btn.dataset.verse })));
  return results;
}
async function initReader(){ const loc = loadReaderLocation(); readerState = { ...readerState, ...loc }; await setReaderLocation(loc); }
if(typeof window !== 'undefined') Object.assign(window, { ReaderConfig, readerState, readerChapterCache, readerManifestCache, readerLoadCounts, getReaderChapterPath, getReaderLanguageMeta, loadReaderManifest, loadReaderChapter, setReaderLocation, getAdjacentReaderLocation, renderReader, renderReaderChapter, renderReaderVerse, renderReaderTokens, initReader, runReaderSearch, loadReaderLocation, saveReaderLocation, parseReaderReference, openReaderTokenPopup, closeReaderWordPopup, openReaderWordPage, renderReaderWordPage, lookupReaderWordInfo, explainReaderParse, readerGrammarLinksForInfo, readerPartOfSpeechForInfo, getReaderLemmaOccurrences, openReaderContextOccurrence, openReaderBookProgress, renderReaderWordLearning, readerLearningStatusForInfo, introduceReaderWordFromPage, reviewReaderWordFromPage });
if(typeof module !== 'undefined') module.exports = { ReaderConfig, readerState: () => readerState, readerChapterCache, readerManifestCache, readerLoadCounts, getReaderChapterPath, getReaderLanguageMeta, loadReaderManifest, normalizeReaderManifest, getReaderBookChapters, loadReaderChapter, setReaderLocation, getAdjacentReaderLocation, renderReaderChapter, renderReaderVerse, renderReaderTokens, runReaderSearch, loadReaderLocation, saveReaderLocation, parseReaderReference, normalizeReaderText, lookupReaderWordInfo, explainReaderParse, readerGrammarLinksForInfo, readerParseKind, readerPartOfSpeechForInfo, openReaderTokenPopup, closeReaderWordPopup, openReaderWordPage, renderReaderWordPage, loadReaderSearchIndex, representativeReaderOccurrences, getReaderLemmaOccurrences, readerOccurrenceSnippet, renderReaderWordPageContext, renderReaderWordPageContextContent, attachReaderWordPageContextHandlers, openReaderContextOccurrence, openReaderBookProgress, renderReaderWordLearning, readerLearningStatusForInfo, introduceReaderWordFromPage, reviewReaderWordFromPage };
