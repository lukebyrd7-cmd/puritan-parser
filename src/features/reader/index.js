/* ---------- Reader (Greek MVP) ---------- */
const ReaderStorageKey = 'pp_reader_location';
const ReaderConfig = {
  greek: {
    label: 'Greek New Testament',
    dataRoot: 'data/greek',
    books: [
      { id: 'matthew', name: 'Matthew', chapters: 2 },
      { id: 'mark', name: 'Mark', chapters: 1 }
    ]
  }
};

let readerState = {
  language: 'greek',
  book: 'matthew',
  chapter: 1,
  chapterData: null,
  loading: false,
  error: '',
  focusVerse: ''
};
const readerChapterCache = new Map();
const readerLoadCounts = {};

function getReaderConfig(language = readerState.language){ return ReaderConfig[language] || ReaderConfig.greek; }
function getReaderBooks(language = readerState.language){ return getReaderConfig(language).books; }
function getReaderBook(language, bookId){ return getReaderBooks(language).find(book => book.id === bookId) || getReaderBooks(language)[0]; }
function readerCacheKey(language, book, chapter){ return `${language}/${book}/${chapter}`; }
function getReaderChapterPath(language, book, chapter){ return `${getReaderConfig(language).dataRoot}/${book}/${chapter}.json`; }
function normalizeReaderText(value){ return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
function parseReaderReference(value){
  const match = String(value || '').trim().match(/^([1-3]?\s?[A-Za-z]+)\s+(\d+)(?::(\d+))?$/);
  if(!match) return null;
  const bookName = match[1].toLowerCase().replace(/\s+/g, '');
  const book = getReaderBooks('greek').find(item => item.id === bookName || item.name.toLowerCase().replace(/\s+/g, '') === bookName);
  if(!book) return null;
  return { language: 'greek', book: book.id, chapter: Number(match[2]), verse: match[3] || '' };
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
  const max = getReaderBook(language, book).chapters;
  return { language, book, chapter: clamp(Number(stored.chapter) || 1, 1, max) };
}
async function fetchReaderJson(path){
  if(typeof fetch !== 'function') throw new Error('Fetch is unavailable for reader data.');
  const response = await fetch(path);
  if(!response.ok) throw new Error(`Unable to load ${path}`);
  return response.json();
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
  const book = getReaderBook(language, location.book || readerState.book).id;
  const max = getReaderBook(language, book).chapters;
  const chapter = clamp(Number(location.chapter) || 1, 1, max);
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
  if(direction < 0 && readerState.chapter > 1) return { ...readerState, chapter: readerState.chapter - 1 };
  if(direction > 0 && readerState.chapter < current.chapters) return { ...readerState, chapter: readerState.chapter + 1 };
  const nextBook = books[idx + direction];
  if(!nextBook) return null;
  return { language: readerState.language, book: nextBook.id, chapter: direction > 0 ? 1 : nextBook.chapters };
}
function renderReader(){
  const root = $('#readerShell'); if(!root) return;
  const book = getReaderBook(readerState.language, readerState.book);
  const books = getReaderBooks(readerState.language);
  const chapters = Array.from({ length: book.chapters }, (_, i) => i + 1);
  const data = readerState.chapterData;
  root.innerHTML = `
    <section class="panel reader-controls" aria-label="Reader controls">
      <select id="readerBookSelect" class="input" aria-label="Book selector">${books.map(item => `<option value="${item.id}" ${item.id===readerState.book?'selected':''}>${escHtml(item.name)}</option>`).join('')}</select>
      <select id="readerChapterSelect" class="input" aria-label="Chapter selector">${chapters.map(ch => `<option value="${ch}" ${ch===readerState.chapter?'selected':''}>Chapter ${ch}</option>`).join('')}</select>
      <button class="btn btn-ghost btn-sm" id="readerPrevBtn" ${getAdjacentReaderLocation(-1)?'':'disabled'}>← Previous</button>
      <button class="btn btn-ghost btn-sm" id="readerNextBtn" ${getAdjacentReaderLocation(1)?'':'disabled'}>Next →</button>
      <div class="reader-reference" id="readerReference">${escHtml(book.name)} ${readerState.chapter}</div>
    </section>
    <section class="panel reader-search" aria-label="Greek reader search">
      <input id="readerSearchInput" class="input" placeholder="Search Greek text, lemma, or Matthew 1:1…" autocomplete="off" />
      <button class="btn btn-primary btn-sm" id="readerSearchBtn">Search</button>
      <div id="readerSearchResults" class="reader-search-results"></div>
    </section>
    <article class="panel reader-text" lang="grc" aria-live="polite">
      ${readerState.loading ? '<div class="empty-state">Loading chapter…</div>' : ''}
      ${readerState.error ? `<div class="empty-state danger">${escHtml(readerState.error)}</div>` : ''}
      ${!readerState.loading && !readerState.error && data ? renderReaderChapter(data) : ''}
    </article>`;
  wireReaderControls();
  if(readerState.focusVerse) setTimeout(() => document.getElementById(`readerVerse-${readerState.focusVerse}`)?.scrollIntoView({ block: 'center' }), 0);
}
function renderReaderChapter(data){
  return `<h2>${escHtml(data.bookName)} ${data.chapter}</h2>` + (data.paragraphs || []).map(paragraph => `<p class="reader-paragraph">${paragraph.verses.map(verse => `<span class="reader-verse" id="readerVerse-${verse.number}"><sup>${verse.number}</sup>${escHtml(verse.text)}</span>`).join(' ')}</p>`).join('');
}
function wireReaderControls(){
  $('#readerBookSelect')?.addEventListener('change', e => setReaderLocation({ language: readerState.language, book: e.target.value, chapter: 1 }));
  $('#readerChapterSelect')?.addEventListener('change', e => setReaderLocation({ language: readerState.language, book: readerState.book, chapter: Number(e.target.value) }));
  $('#readerPrevBtn')?.addEventListener('click', () => { const loc = getAdjacentReaderLocation(-1); if(loc) setReaderLocation(loc); });
  $('#readerNextBtn')?.addEventListener('click', () => { const loc = getAdjacentReaderLocation(1); if(loc) setReaderLocation(loc); });
  $('#readerSearchBtn')?.addEventListener('click', () => runReaderSearch($('#readerSearchInput')?.value || ''));
  $('#readerSearchInput')?.addEventListener('keydown', e => { if(e.key === 'Enter') runReaderSearch(e.target.value); });
}
async function runReaderSearch(query){
  const box = $('#readerSearchResults'); if(!box) return [];
  const direct = parseReaderReference(query);
  if(direct){ await setReaderLocation(direct); return [direct]; }
  const q = normalizeReaderText(query);
  if(q.length < 2){ box.innerHTML = '<div class="small muted">Enter at least 2 characters.</div>'; return []; }
  let index = [];
  try { index = await fetchReaderJson('data/greek/search-index.json'); } catch(e) { box.innerHTML = '<div class="small muted">Search index unavailable.</div>'; return []; }
  const results = index.filter(item => normalizeReaderText(`${item.text} ${item.lemmas?.join(' ')}`).includes(q)).slice(0, 20);
  box.innerHTML = results.length ? results.map(item => `<button class="reader-result" data-book="${item.book}" data-chapter="${item.chapter}" data-verse="${item.verse}"><strong>${escHtml(item.bookName)} ${item.chapter}:${item.verse}</strong> ${escHtml(item.text)}</button>`).join('') : '<div class="small muted">No verses found.</div>';
  $$('.reader-result', box).forEach(btn => btn.addEventListener('click', () => setReaderLocation({ language: 'greek', book: btn.dataset.book, chapter: Number(btn.dataset.chapter), verse: btn.dataset.verse })));
  return results;
}
async function initReader(){ const loc = loadReaderLocation(); readerState = { ...readerState, ...loc }; await setReaderLocation(loc); }
if(typeof window !== 'undefined') Object.assign(window, { ReaderConfig, readerState, readerChapterCache, readerLoadCounts, getReaderChapterPath, loadReaderChapter, setReaderLocation, getAdjacentReaderLocation, renderReader, initReader, runReaderSearch, loadReaderLocation, saveReaderLocation, parseReaderReference });
if(typeof module !== 'undefined') module.exports = { ReaderConfig, readerState: () => readerState, readerChapterCache, readerLoadCounts, getReaderChapterPath, loadReaderChapter, setReaderLocation, getAdjacentReaderLocation, renderReaderChapter, runReaderSearch, loadReaderLocation, saveReaderLocation, parseReaderReference, normalizeReaderText };
