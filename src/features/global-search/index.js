/* ---------- Global Search ---------- */
(function(root, factory){
  const api = factory(root);
  if(typeof module === 'object' && module.exports) module.exports = api;
  root.PuritanGlobalSearch = api;
  Object.keys(api).forEach(key => { root[key] = root[key] || api[key]; });
})(typeof globalThis !== 'undefined' ? globalThis : this, function(root){
  const RESULT_LIMIT = 25;
  const MAX_RESULTS = 100;
  const STATUS_ALL = 'all';
  const SEARCH_STATE = { query: '', language: 'all', status: STATUS_ALL, sort: 'relevance', visible: RESULT_LIMIT };
  const HebrewSearchApi = root.PuritanHebrewSearch
    || (typeof require === 'function' ? require('../../core/hebrew-search') : null);
  let cachedSignature = '';
  let cachedEntries = [];

  function clean(value){ return typeof value === 'string' ? value.trim() : ''; }
  function appState(){
    /* In browser classic scripts, `state` is a shared lexical binding, not window.state. */
    if(root.state) return root.state;
    try { if(typeof state !== 'undefined') return state; } catch(e) {}
    return {};
  }
  function normalizeText(value){
    return clean(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }
  function hasGreekText(value){ return /[\u0370-\u03ff]/.test(clean(value)); }
  function transliterateGreek(value){
    const text = normalizeText(value);
    if(!hasGreekText(text)) return '';
    const multi = { θ: 'th', φ: 'ph', χ: 'ch', ψ: 'ps' };
    const single = {
      α: 'a', β: 'b', γ: 'g', δ: 'd', ε: 'e', ζ: 'z', η: 'e',
      ι: 'i', κ: 'k', λ: 'l', μ: 'm', ν: 'n', ξ: 'x', ο: 'o',
      π: 'p', ρ: 'r', σ: 's', ς: 's', τ: 't', υ: 'u', ω: 'o'
    };
    return Array.from(text).map(char => multi[char] || single[char] || char).join('').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function hasHebrewText(value){ return /[\u0590-\u05ff]/.test(clean(value)); }
  function isNumericLemma(value){ return /^\d+[+a-zA-Z]?$/.test(clean(value)); }
  function escapeHtml(value){
    return typeof root.escHtml === 'function'
      ? root.escHtml(value)
      : String(value || '').replace(/[&<>]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ch]));
  }
  function escapeAttr(value){ return escapeHtml(value).replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function query(selector, scope){
    if(!scope && typeof root.$ === 'function') return root.$(selector);
    const base = scope?.querySelector ? scope : root.document;
    return base?.querySelector?.(selector) || null;
  }
  function queryAll(selector, scope){
    if(typeof root.$$ === 'function') return root.$$(selector, scope);
    const base = scope?.querySelectorAll ? scope : root.document;
    return Array.from(base?.querySelectorAll?.(selector) || []);
  }
  function alternateGlosses(entry = {}){
    if(typeof root.normalizeAlternateGlosses === 'function') return root.normalizeAlternateGlosses(entry.alternateGlosses);
    return Array.isArray(entry.alternateGlosses) ? entry.alternateGlosses.map(clean).filter(Boolean) : [];
  }
  function displayGloss(entry = {}){
    if(typeof root.getDisplayGloss === 'function') return root.getDisplayGloss(entry);
    return clean(entry.customGloss) || clean(entry.primaryGloss) || clean(entry.gloss) || '';
  }
  function headwordCandidates(entry = {}){
    return [entry.lexicalForm, entry.hebrewLemma, entry.root, entry.lemma, entry.word, entry.normalized].map(clean).filter(Boolean);
  }
  function displayHeadword(entry = {}){
    const language = clean(entry.lang).toLowerCase() || 'greek';
    const candidates = headwordCandidates(entry);
    if(language === 'hebrew'){
      return candidates.find(value => hasHebrewText(value) && !isNumericLemma(value)) || 'Lemma unavailable';
    }
    return candidates.find(value => !isNumericLemma(value)) || 'Lemma unavailable';
  }
  function lemmaForWordPage(entry = {}){
    const language = clean(entry.lang).toLowerCase() || 'greek';
    const display = displayHeadword(entry);
    if(display && display !== 'Lemma unavailable') return display;
    const candidate = headwordCandidates(entry).find(value => language !== 'hebrew' && !isNumericLemma(value));
    return candidate || '';
  }
  function sourceSignature(){
    const state = appState();
    const vocabulary = ['greek', 'hebrew'].map(language => {
      const list = Array.isArray(state.data?.[language]) ? state.data[language] : [];
      return `${language}:${list.length}:${list[0]?.id || list[0]?.lemma || ''}:${list.at?.(-1)?.id || list[list.length - 1]?.lemma || ''}`;
    }).join('|');
    const learningKey = root.VocabularyLearning?.STORAGE_KEY || 'pp_vocab_learning';
    let learning = '';
    try { learning = root.localStorage?.getItem?.(learningKey) || ''; } catch(e) { learning = ''; }
    return `${vocabulary}|learning:${learning.length}:${learning.slice(0, 80)}`;
  }
  function vocabularyForLanguage(language){
    const state = appState();
    const list = Array.isArray(state.data?.[language]) ? state.data[language] : [];
    return typeof root.getStudyEntries === 'function' ? root.getStudyEntries(list, state.prefs?.studyMode || 'lemma') : list;
  }
  function learningDetails(entry = {}){
    const model = root.VocabularyLearning;
    if(!model?.learningStatusDetails || !model?.loadStore) return { status: 'Not Learned', label: 'Not Learned' };
    return model.learningStatusDetails(model.loadStore(), entry);
  }
  function partOfSpeech(entry = {}){
    const value = clean(entry.pos || entry.partOfSpeech);
    if(value) return value;
    if(typeof root.explainReaderParse === 'function' && typeof root.readerPartOfSpeechForInfo === 'function'){
      return root.readerPartOfSpeechForInfo({ parse: entry.parse, language: entry.lang });
    }
    return '';
  }
  function searchTextForEntry(entry = {}, display = displayHeadword(entry), gloss = displayGloss(entry)){
    const values = [
      display,
      entry.lemma,
      entry.lexicalForm,
      entry.word,
      entry.hebrewLemma,
      entry.root,
      entry.normalized,
      entry.transliteration,
      gloss,
      entry.primaryGloss,
      entry.gloss,
      entry.customGloss,
      ...alternateGlosses(entry)
    ];
    if((clean(entry.lang).toLowerCase() || 'greek') === 'greek'){
      values.push(...[display, entry.lemma, entry.lexicalForm, entry.word, entry.normalized].map(transliterateGreek));
    }
    return values.map(normalizeText).filter(Boolean).join(' ');
  }
  function buildGlobalSearchIndex(){
    const signature = sourceSignature();
    if(signature === cachedSignature) return cachedEntries;
    cachedSignature = signature;
    cachedEntries = ['greek', 'hebrew'].flatMap(language => vocabularyForLanguage(language)
      .filter(Boolean)
      .map(entry => {
        const lang = clean(entry.lang).toLowerCase() || language;
        const headword = displayHeadword({ ...entry, lang });
        const gloss = displayGloss(entry);
        const details = learningDetails({ ...entry, lang });
        return {
          id: clean(entry.id) || `${lang}:${clean(entry.lemma || entry.word || headword)}`,
          entry,
          language: lang,
          headword,
          lemma: lemmaForWordPage({ ...entry, lang }),
          gloss,
          alternateGlosses: alternateGlosses(entry),
          frequency: Number(entry.freq) || 0,
          partOfSpeech: partOfSpeech({ ...entry, lang }),
          learningStatus: details.label || details.status || 'Not Learned',
          searchText: searchTextForEntry({ ...entry, lang }, headword, gloss),
          transliterationText: lang === 'greek' ? [headword, entry.lemma, entry.lexicalForm, entry.word, entry.normalized].map(transliterateGreek).filter(Boolean).join(' ') : '',
          hebrewSearchTerms: lang === 'hebrew'
            ? HebrewSearchApi?.createHebrewSearchTerms?.(headwordCandidates({ ...entry, lang }))
            : null
        };
      }));
    return cachedEntries;
  }
  function scoreResult(item, query){
    const q = normalizeText(query);
    const headword = normalizeText(item.headword);
    const lemma = normalizeText(item.lemma);
    const gloss = normalizeText(item.gloss);
    const transliteration = normalizeText(item.transliterationText);
    const frequency = Math.min(999999, Math.max(0, Number(item.frequency) || 0));
    const ranked = tier => tier * 1000000 + frequency;
    const hebrewScore = item.language === 'hebrew'
      ? HebrewSearchApi?.scoreHebrewSearchTerms?.(item.hebrewSearchTerms, query) || 0
      : 0;
    if(hebrewScore) return ranked(hebrewScore);
    if(headword === q || lemma === q) return ranked(1000);
    if(transliteration.split(/\s+/).includes(q)) return ranked(950);
    if(headword.startsWith(q) || lemma.startsWith(q)) return ranked(800);
    if(transliteration.includes(q)) return ranked(750);
    if(gloss === q) return ranked(700);
    if(gloss.startsWith(q)) return ranked(600);
    if(item.searchText.includes(q)) return ranked(300);
    return 0;
  }
  function searchGlobalVocabulary(options = {}){
    const query = clean(options.query);
    const language = options.language || 'all';
    const status = options.status || STATUS_ALL;
    const sort = options.sort || 'relevance';
    const q = normalizeText(query);
    if(!q) return { query, total: 0, results: [] };
    let results = buildGlobalSearchIndex()
      .filter(item => (language === 'all' || item.language === language) && (status === STATUS_ALL || item.learningStatus === status))
      .map(item => ({ ...item, score: scoreResult(item, query) }))
      .filter(item => item.score > 0);
    results.sort((a, b) => sort === 'frequency'
      ? (b.frequency - a.frequency) || b.score - a.score || a.headword.localeCompare(b.headword)
      : b.score - a.score || b.frequency - a.frequency || a.headword.localeCompare(b.headword));
    return { query, total: results.length, results: results.slice(0, MAX_RESULTS) };
  }
  function resultLanguageLabel(language){ return language === 'hebrew' ? 'Hebrew' : 'Greek'; }
  function renderGlobalSearchResult(item = {}){
    const rtl = item.language === 'hebrew';
    const headwordAttrs = rtl ? ' lang="he" dir="rtl"' : ' lang="grc"';
    return `<button class="global-search-result" type="button" data-global-search-result="${escapeAttr(item.id)}">
      <span class="global-search-headword"${headwordAttrs}>${escapeHtml(item.headword || 'Lemma unavailable')}</span>
      <span class="global-search-gloss">${escapeHtml(item.gloss || 'Gloss unavailable')}</span>
      <span class="global-search-meta">
        <span>${escapeHtml(resultLanguageLabel(item.language))}</span>
        ${item.frequency ? `<span>${escapeHtml(item.frequency)}×</span>` : ''}
        ${item.partOfSpeech ? `<span>${escapeHtml(item.partOfSpeech)}</span>` : ''}
        <span>${escapeHtml(item.learningStatus || 'Not Learned')}</span>
      </span>
    </button>`;
  }
  function globalSearchSummary(search, visible, prompt){
    const totalEntries = buildGlobalSearchIndex().length;
    if(prompt && !totalEntries) return 'Vocabulary is still loading. Try again in a moment.';
    if(prompt) return 'Enter a lemma or English gloss to search Greek and Hebrew vocabulary.';
    if(search.total) return `${Math.min(visible.length, search.total)} of ${search.total} results`;
    return 'No matching words found.';
  }
  function globalSearchResultsHtml(search, visible, prompt){
    const totalEntries = buildGlobalSearchIndex().length;
    if(prompt && !totalEntries) return '<div class="empty-state">Vocabulary is still loading. Try again in a moment.</div>';
    if(prompt) return '<div class="empty-state">Search words by lemma or gloss.</div>';
    return visible.map(renderGlobalSearchResult).join('') || '<div class="empty-state">No word results. Try a broader gloss or switch the language filter.</div>';
  }
  function currentGlobalSearchResults(){
    const search = searchGlobalVocabulary(SEARCH_STATE);
    const visible = search.results.slice(0, SEARCH_STATE.visible);
    const prompt = !clean(SEARCH_STATE.query);
    return { search, visible, prompt };
  }
  function renderGlobalSearchResults(rootEl = query('#globalSearchShell')){
    if(!rootEl) return '';
    const { search, visible, prompt } = currentGlobalSearchResults();
    const summaryEl = query('#globalSearchSummary', rootEl);
    const resultsEl = query('#globalSearchResults', rootEl);
    const actionsEl = query('#globalSearchActions', rootEl);
    if(summaryEl) summaryEl.innerHTML = globalSearchSummary(search, visible, prompt);
    if(resultsEl) resultsEl.innerHTML = globalSearchResultsHtml(search, visible, prompt);
    if(actionsEl) actionsEl.innerHTML = search.total > visible.length ? '<button class="btn btn-ghost btn-sm" id="globalSearchShowMore" type="button">Show More</button>' : '';
    query('#globalSearchShowMore', rootEl)?.addEventListener('click', () => {
      SEARCH_STATE.visible += RESULT_LIMIT;
      renderGlobalSearchResults(rootEl);
    });
    queryAll('[data-global-search-result]', rootEl).forEach(button => button.addEventListener('click', () => {
      const item = search.results.find(result => result.id === button.dataset.globalSearchResult);
      openGlobalSearchResult(item);
    }));
    return rootEl.innerHTML;
  }
  function renderGlobalSearch(){
    const rootEl = query('#globalSearchShell');
    if(!rootEl) return '';
    if(query('#globalSearchPanel', rootEl)){
      renderGlobalSearchResults(rootEl);
      return rootEl.innerHTML;
    }
    rootEl.innerHTML = `<section class="panel global-search-panel" id="globalSearchPanel" aria-labelledby="globalSearchTitle">
      <div class="global-search-header">
        <div>
          <h1 id="globalSearchTitle">Search Words</h1>
          <p>Global Search finds lemmas and glosses. Reference Search remains inside Reference.</p>
        </div>
        <button class="btn btn-ghost btn-sm" id="closeGlobalSearch" type="button">Close</button>
      </div>
      <div class="global-search-controls">
        <input class="input" id="globalSearchInput" placeholder="Search lemmas or glosses..." autocomplete="off" value="${escapeAttr(SEARCH_STATE.query)}" />
        <select class="input" id="globalSearchLanguage" aria-label="Language filter">
          <option value="all" ${SEARCH_STATE.language === 'all' ? 'selected' : ''}>All</option>
          <option value="greek" ${SEARCH_STATE.language === 'greek' ? 'selected' : ''}>Greek</option>
          <option value="hebrew" ${SEARCH_STATE.language === 'hebrew' ? 'selected' : ''}>Hebrew</option>
        </select>
        <select class="input" id="globalSearchStatus" aria-label="Learning status filter">
          ${['all', 'Not Learned', 'Learning', 'Reviewing', 'Known', 'Known by Self-Report'].map(status => `<option value="${escapeAttr(status)}" ${SEARCH_STATE.status === status ? 'selected' : ''}>${escapeHtml(status === 'all' ? 'All Statuses' : status)}</option>`).join('')}
        </select>
        <select class="input" id="globalSearchSort" aria-label="Sort results">
          <option value="relevance" ${SEARCH_STATE.sort === 'relevance' ? 'selected' : ''}>Relevance</option>
          <option value="frequency" ${SEARCH_STATE.sort === 'frequency' ? 'selected' : ''}>Frequency</option>
        </select>
      </div>
      <div class="global-search-summary" id="globalSearchSummary"></div>
      <div class="global-search-results" id="globalSearchResults"></div>
      <div id="globalSearchActions"></div>
    </section>`;
    wireGlobalSearch(rootEl);
    renderGlobalSearchResults(rootEl);
    return rootEl.innerHTML;
  }
  function wireGlobalSearch(rootEl){
    const update = () => renderGlobalSearchResults(rootEl);
    query('#globalSearchInput', rootEl)?.addEventListener('input', event => { SEARCH_STATE.query = event.target.value; SEARCH_STATE.visible = RESULT_LIMIT; update(); });
    query('#globalSearchLanguage', rootEl)?.addEventListener('change', event => { SEARCH_STATE.language = event.target.value; SEARCH_STATE.visible = RESULT_LIMIT; update(); });
    query('#globalSearchStatus', rootEl)?.addEventListener('change', event => { SEARCH_STATE.status = event.target.value; SEARCH_STATE.visible = RESULT_LIMIT; update(); });
    query('#globalSearchSort', rootEl)?.addEventListener('change', event => { SEARCH_STATE.sort = event.target.value; SEARCH_STATE.visible = RESULT_LIMIT; update(); });
    query('#closeGlobalSearch')?.addEventListener('click', () => {
      if(typeof root.showView === 'function') root.showView('learnView');
    });
  }
  function openGlobalSearchResult(item = {}){
    if(!item) return false;
    const info = {
      language: item.language,
      surface: '',
      lemma: item.lemma,
      lexicalForm: item.entry?.lexicalForm || item.lemma,
      hebrewLemma: item.entry?.hebrewLemma,
      root: item.entry?.root,
      parse: item.entry?.parse || '',
      primaryGloss: item.gloss,
      alternateGlosses: item.alternateGlosses,
      frequency: item.frequency,
      globalSearchResult: true
    };
    if(typeof root.openReaderWordPageFromInfo === 'function'){
      root.openReaderWordPageFromInfo(info);
      return true;
    }
    if(root.readerState) root.readerState.wordPageInfo = info;
    if(typeof root.renderReaderWordPage === 'function') root.renderReaderWordPage();
    if(typeof root.showView === 'function') root.showView('wordPageView');
    return true;
  }
  return {
    SEARCH_STATE,
    RESULT_LIMIT,
    MAX_RESULTS,
    buildGlobalSearchIndex,
    searchGlobalVocabulary,
    renderGlobalSearchResult,
    renderGlobalSearch,
    renderGlobalSearchResults,
    openGlobalSearchResult,
    displayHeadword,
    normalizeText,
    transliterateGreek,
    isNumericLemma
  };
});
