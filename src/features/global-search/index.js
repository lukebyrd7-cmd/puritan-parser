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
  const SEARCH_STATE = { query: '', language: 'all', status: STATUS_ALL, mastery: 'all', attentionOnly: false, partOfSpeech: 'all', frequencyMinimum: 0, frequencyMaximum: 0, bookId: '', passageScope: 'book', chapter: 0, deckId: 'all', sort: 'relevance', visible: RESULT_LIMIT };
  const HebrewSearchApi = root.PuritanHebrewSearch
    || (typeof require === 'function' ? require('../../core/hebrew-search') : null);
  let cachedCorpusSignature = '';
  let cachedDecorationSignature = '';
  let cachedCorpusEntries = [];
  let cachedEntries = [];
  let cachedCorpusById = new Map();
  let cachedDecoratedById = new Map();
  let cachedLatinTokens = new Map();
  let indexPreparationPromise = null;
  let indexPreparationKey = '';
  let indexPreparationCount = 0;
  let corpusBuildCount = 0;
  let decorationBuildCount = 0;
  let mutableRefreshCount = 0;
  let lastPreparationPhases = {};
  let searchRenderGeneration = 0;
  let scopeRequestGeneration = 0;
  let hebrewGlosses = null;
  let hebrewGlossPromise = null;
  let searchLongTaskObserver = null;
  const searchBooks = { greek: [], hebrew: [] };
  let scopedVocabulary = null;
  let scopedLabel = '';

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
  function normalizeSearchQuery(value){
    const normalized = normalizeText(value);
    return /[a-z]/.test(normalized) && !hasGreekText(normalized) && !hasHebrewText(normalized)
      ? normalized.replace(/[-'’]+/g, '')
      : normalized;
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
  function appFunction(name){
    if(typeof root[name] === 'function') return root[name];
    try {
      if(name === 'showView' && typeof showView === 'function') return showView;
      if(name === 'openReaderWordPageFromInfo' && typeof openReaderWordPageFromInfo === 'function') return openReaderWordPageFromInfo;
      if(name === 'renderReaderWordPage' && typeof renderReaderWordPage === 'function') return renderReaderWordPage;
    } catch(e) {}
    return null;
  }
  function alternateGlosses(entry = {}){
    const values = typeof root.normalizeAlternateGlosses === 'function' ? root.normalizeAlternateGlosses(entry.alternateGlosses) : (Array.isArray(entry.alternateGlosses) ? entry.alternateGlosses.map(clean).filter(Boolean) : []);
    return values.filter(usableGloss);
  }
  function usableGloss(value){
    const normalized = clean(value).toLowerCase();
    return Boolean(normalized && !['missing gloss','(missing gloss)','gloss unavailable','unknown','n/a'].includes(normalized));
  }
  function displayGloss(entry = {}){
    const mapped = hebrewGlosses?.[clean(entry.lemma)];
    const lexicalEntry = { ...entry, primaryGloss: entry.primaryGloss || mapped?.primaryGloss || '', alternateGlosses: [...alternateGlosses(entry), ...(mapped?.alternateGlosses || [])], glossSource: entry.glossSource || mapped?.glossSource || '' };
    const candidates = [entry.customGloss, lexicalEntry.primaryGloss, entry.gloss];
    if(typeof root.getDisplayGloss === 'function') candidates.push(root.getDisplayGloss(entry));
    const resolved = root.PuritanPersonalGlosses?.resolve?.(lexicalEntry, { primaryLimit: 3 });
    return clean(resolved?.effective?.compact || candidates.find(usableGloss));
  }
  function headwordCandidates(entry = {}){
    return [entry.studyForm, entry.lexicalForm, entry.hebrewLemma, entry.root, entry.representativeForm, entry.word, entry.lemma, entry.normalized, ...(Array.isArray(entry.forms) ? entry.forms : [])].map(clean).filter(Boolean);
  }
  function displayHeadword(entry = {}){
    const language = clean(entry.lang).toLowerCase() || 'greek';
    const candidates = headwordCandidates(entry);
    if(language === 'hebrew'){
      return candidates.find(value => hasHebrewText(value) && !isNumericLemma(value)) || 'Lemma unavailable';
    }
    return [entry.lemma, ...candidates].map(clean).find(value => value && !isNumericLemma(value)) || 'Lemma unavailable';
  }
  function lemmaForWordPage(entry = {}){
    const language = clean(entry.lang).toLowerCase() || 'greek';
    const display = displayHeadword(entry);
    if(display && display !== 'Lemma unavailable') return display;
    const candidate = headwordCandidates(entry).find(value => language !== 'hebrew' && !isNumericLemma(value));
    return candidate || '';
  }
  function corpusSignature(){
    const state = appState();
    const vocabulary = ['greek', 'hebrew'].map(language => {
      const list = Array.isArray(state.data?.[language]) ? state.data[language] : [];
      return `${language}:${list.length}:${list[0]?.id || list[0]?.lemma || ''}:${list.at?.(-1)?.id || list[list.length - 1]?.lemma || ''}`;
    }).join('|');
    return `data:${Math.max(0, Number(state.dataRevision) || 0)}|${vocabulary}|hebrewGlosses:${hebrewGlosses ? 1 : 0}|personal:${storedValue(root.PuritanPersonalGlosses?.STORAGE_KEY || 'pp_personal_glosses')}`;
  }
  function storedValue(key){ try { return root.localStorage?.getItem?.(key) || ''; } catch(e) { return ''; } }
  function decorationSignature(){
    const learningRevision = root.VocabularyLearning?.loadStore?.().revision || 0;
    const deckRevision = root.PuritanStudySets?.loadStore?.().revision || 0;
    const attentionRevision = root.LearningPractice?.loadAttention?.().revision || 0;
    return `learning:${learningRevision}|decks:${deckRevision}|attention:${attentionRevision}`;
  }
  function vocabularyForLanguage(language){
    const state = appState();
    const list = Array.isArray(state.data?.[language]) ? state.data[language] : [];
    return typeof root.getStudyEntries === 'function' ? root.getStudyEntries(list, state.prefs?.studyMode || 'lemma') : list;
  }
  async function vocabularyForLanguageAsync(language){
    const state = appState();
    const list = Array.isArray(state.data?.[language]) ? state.data[language] : [];
    if(typeof root.getStudyEntriesAsync === 'function') return root.getStudyEntriesAsync(list, state.prefs?.studyMode || 'lemma', { budgetMs: 10 });
    return vocabularyForLanguage(language);
  }
  function now(){ return root.performance?.now?.() || Date.now(); }
  function yieldToBrowser(){ return new Promise(resolve => (typeof root.setTimeout === 'function' ? root.setTimeout(resolve, 0) : setTimeout(resolve, 0))); }
  async function mapInChunks(items, mapper, options = {}){
    const output = []; const budgetMs = Math.max(4, Number(options.budgetMs) || 10); let index = 0;
    while(index < items.length){
      const started = now();
      do { output.push(mapper(items[index], index)); index += 1; }
      while(index < items.length && now() - started < budgetMs);
      if(index < items.length) await yieldToBrowser();
    }
    return output;
  }
  function learningDetails(entry = {}, store){
    const model = root.VocabularyLearning;
    if(!model?.learningStatusDetails || !model?.loadStore) return { status: 'Not Learned', label: 'Not Learned' };
    return model.learningStatusDetails(store || model.loadStore(), entry);
  }
  function attentionDetails(id, language){ return Boolean(root.LearningPractice?.needsAttention?.(id, language)); }
  function deckMembership(id, language){
    const sets = root.PuritanStudySets?.listStudySets?.() || [];
    return sets.filter(set => set.type === 'vocabulary' && set.language === language && (set.vocabularyIds || []).includes(id));
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
  function corpusEntry(entry, language){
    const lang = clean(entry.lang).toLowerCase() || language;
    const headword = displayHeadword({ ...entry, lang });
    const gloss = displayGloss(entry);
    const id = clean(entry.id) || `${lang}:${clean(entry.lemma || entry.word || headword)}`;
    const hebrewCanonical = lang === 'hebrew'
      ? headwordCandidates({ ...entry, lang }).map(value => HebrewSearchApi?.transliterateHebrew?.(value) || '').filter(Boolean)
      : [];
    const hebrewNormalized = lang === 'hebrew'
      ? headwordCandidates({ ...entry, lang }).map(value => HebrewSearchApi?.normalizeHebrew?.(value) || '').filter(Boolean).join(' ')
      : '';
    const hebrewLatin = [...new Set(hebrewCanonical.flatMap(value => [value, value.replace(/kh/g, 'ch'), value.replace(/kh/g, 'k'), value.replace(/\bv/g, 'w')]))].join(' ');
    const transliterationText = lang === 'greek' ? [headword, entry.lemma, entry.lexicalForm, entry.word, entry.normalized].map(transliterateGreek).filter(Boolean).join(' ') : hebrewLatin;
    const lemma = lemmaForWordPage({ ...entry, lang });
    const mapped = hebrewGlosses?.[clean(entry.lemma)];
    const lexicalEntry = { ...entry, primaryGloss: entry.primaryGloss || mapped?.primaryGloss || '', alternateGlosses: [...alternateGlosses(entry), ...(mapped?.alternateGlosses || [])], glossSource: entry.glossSource || mapped?.glossSource || '' };
    const resolution = root.PuritanPersonalGlosses?.resolve?.(lexicalEntry, { primaryLimit: 3 });
    const personalGlosses = root.PuritanPersonalGlosses?.recordFor?.(entry)?.glosses || [];
    return {
      id, entry: lexicalEntry, language: lang, headword, lemma, gloss,
      alternateGlosses: alternateGlosses(entry),
      standardGlosses: resolution?.standard?.all || [lexicalEntry.primaryGloss, ...lexicalEntry.alternateGlosses].filter(Boolean),
      personalGlosses,
      frequency: Number(entry.freq) || 0,
      partOfSpeech: partOfSpeech({ ...entry, lang }),
      searchText: `${searchTextForEntry({ ...entry, lang }, headword, gloss)} ${hebrewNormalized} ${hebrewLatin}`.trim(),
      normalizedHeadword: normalizeText(headword),
      normalizedLemma: normalizeText(lemma),
      normalizedGloss: normalizeText(gloss),
      latinSearchText: [gloss, entry.primaryGloss, entry.gloss, entry.customGloss, ...personalGlosses, ...alternateGlosses(entry), transliterationText].map(normalizeText).filter(Boolean).join(' '),
      transliterationText,
      transliterationWords: ` ${transliterationText} `,
      hebrewSearchTerms: null
    };
  }
  function decorationContext(){
    const learningStore = root.VocabularyLearning?.loadStore?.() || { records: {} };
    const attention = root.LearningPractice?.loadAttention?.() || { items: {} };
    const sets = root.PuritanStudySets?.listStudySets?.() || [];
    const decksByVocabularyId = new Map();
    sets.filter(set => set.type === 'vocabulary').forEach(set => (set.vocabularyIds || []).forEach(id => {
      if(!decksByVocabularyId.has(id)) decksByVocabularyId.set(id, []);
      decksByVocabularyId.get(id).push(set.id);
    }));
    return { learningStore, attention, decksByVocabularyId };
  }
  function decorateCorpusItem(item, context){
    const details = learningDetails(item.entry, context.learningStore);
    const learningRecord = context.learningStore.records?.[item.id];
    const mastery = learningRecord ? root.VocabularyMastery?.masteryGrade?.(learningRecord) || null : null;
    const deckIds = context.decksByVocabularyId.get(item.id) || [];
    return { ...item,
      learningStatus: details.label || details.status || 'Not Learned',
      masteryGrade: mastery?.letter || '',
      needsAttention: Boolean(context.attention.items?.[item.id] && context.attention.items[item.id].language === item.language),
      deckIds,
      deckCount: deckIds.length
    };
  }
  function mutableDecorationToken(item, context){
    const record = context.learningStore.records?.[item.id];
    const lastEvent = record?.history?.at?.(-1);
    const attention = context.attention.items?.[item.id];
    const deckIds = context.decksByVocabularyId.get(item.id) || [];
    return `${record?.revision || 0}:${record?.updatedAt || ''}:${lastEvent?.eventId || ''}|${attention?.updatedAt || ''}|${deckIds.join(',')}`;
  }
  function currentDecoratedItem(item, context){
    const token = mutableDecorationToken(item, context);
    const cached = cachedDecoratedById.get(item.id);
    if(cached?.token === token) return cached.item;
    const decorated = decorateCorpusItem(item, context);
    cachedDecoratedById.set(item.id, { token, item: decorated });
    mutableRefreshCount += 1;
    return decorated;
  }
  function buildLatinTokenIndex(entries){
    cachedLatinTokens = new Map();
    entries.forEach(item => new Set(item.latinSearchText.split(/[^a-z0-9]+/).filter(Boolean)).forEach(token => {
      if(!cachedLatinTokens.has(token)) cachedLatinTokens.set(token, []);
      cachedLatinTokens.get(token).push(item.id);
    }));
  }
  async function buildLatinTokenIndexAsync(entries){
    cachedLatinTokens = new Map(); let index = 0;
    while(index < entries.length){
      const started = now();
      do {
        const item = entries[index++];
        new Set(item.latinSearchText.split(/[^a-z0-9]+/).filter(Boolean)).forEach(token => {
          if(!cachedLatinTokens.has(token)) cachedLatinTokens.set(token, []);
          cachedLatinTokens.get(token).push(item.id);
        });
      } while(index < entries.length && now() - started < 10);
      if(index < entries.length) await yieldToBrowser();
    }
  }
  function buildGlobalSearchIndex(){
    const corpusKey = corpusSignature();
    if(corpusKey !== cachedCorpusSignature){
      corpusBuildCount += 1;
      cachedCorpusEntries = ['greek','hebrew'].flatMap(language => vocabularyForLanguage(language).filter(Boolean).map(entry => corpusEntry(entry, language)));
      cachedCorpusEntries.sort((a, b) => b.frequency - a.frequency || a.headword.localeCompare(b.headword));
      cachedCorpusById = new Map(cachedCorpusEntries.map(item => [item.id, item]));
      cachedDecoratedById = new Map();
      cachedEntries = [];
      cachedCorpusSignature = corpusKey;
      cachedDecorationSignature = '';
      buildLatinTokenIndex(cachedCorpusEntries);
    }
    const userKey = decorationSignature();
    if(!cachedEntries.length || cachedEntries.length !== cachedCorpusEntries.length){
      decorationBuildCount += 1;
      const context = decorationContext();
      cachedEntries = cachedCorpusEntries.map(item => currentDecoratedItem(item, context));
    }
    cachedDecorationSignature = userKey;
    return cachedEntries;
  }
  async function prepareGlobalSearchIndex(){
    const phaseStarted = now();
    if(typeof root.isAppDataReady === 'function' && !root.isAppDataReady()){
      if(typeof root.startAppDataLoad !== 'function') return [];
      await root.startAppDataLoad();
    }
    const dataReadyAt = now();
    await ensureSearchGlosses();
    const glossReadyAt = now();
    const corpusKey = corpusSignature();
    if(corpusKey === cachedCorpusSignature) return cachedEntries;
    const preparationKey = corpusKey;
    if(indexPreparationPromise && indexPreparationKey === preparationKey) return indexPreparationPromise;
    indexPreparationKey = preparationKey; indexPreparationCount += 1;
    root.PuritanLifecycleDiagnostics?.job?.('search:index', 1);
    indexPreparationPromise = (async () => {
      let groupedAt = glossReadyAt;
      let corpusMappedAt = glossReadyAt;
      let sortedAt = glossReadyAt;
      let tokenIndexAt = glossReadyAt;
      if(corpusKey !== cachedCorpusSignature){
        corpusBuildCount += 1;
        const grouped = [];
        for(const language of ['greek','hebrew']) grouped.push(...(await vocabularyForLanguageAsync(language)).filter(Boolean).map(entry => ({ entry, language })));
        groupedAt = now();
        cachedCorpusEntries = await mapInChunks(grouped, item => corpusEntry(item.entry, item.language));
        corpusMappedAt = now();
        cachedCorpusEntries.sort((a, b) => b.frequency - a.frequency || a.headword.localeCompare(b.headword));
        sortedAt = now();
        await buildLatinTokenIndexAsync(cachedCorpusEntries);
        tokenIndexAt = now();
        cachedCorpusById = new Map(cachedCorpusEntries.map(item => [item.id, item]));
        cachedDecoratedById = new Map();
        cachedCorpusSignature = corpusKey;
        cachedDecorationSignature = '';
      }
      decorationBuildCount += 1;
      const context = decorationContext();
      cachedEntries = await mapInChunks(cachedCorpusEntries, item => currentDecoratedItem(item, context));
      cachedDecorationSignature = decorationSignature();
      const completedAt = now();
      lastPreparationPhases = {
        vocabularyData: dataReadyAt - phaseStarted,
        lexicalGlosses: glossReadyAt - dataReadyAt,
        lemmaGrouping: groupedAt - glossReadyAt,
        searchableFields: corpusMappedAt - groupedAt,
        corpusSort: sortedAt - corpusMappedAt,
        tokenIndex: tokenIndexAt - sortedAt,
        userDecoration: completedAt - tokenIndexAt,
        total: completedAt - phaseStarted
      };
      return cachedEntries;
    })().finally(() => { indexPreparationPromise = null; indexPreparationKey = ''; root.PuritanLifecycleDiagnostics?.job?.('search:index', -1); });
    return indexPreparationPromise;
  }
  function globalSearchIndexDebug(){ return { preparationCount: indexPreparationCount, corpusBuildCount, decorationBuildCount, mutableRefreshCount, corpusSignature: cachedCorpusSignature, decorationSignature: cachedDecorationSignature, preparing: Boolean(indexPreparationPromise), entries: cachedEntries.length, phases: { ...lastPreparationPhases } }; }
  function scoreResult(item, query){
    const q = normalizeText(query);
    const transliterationQuery = normalizeSearchQuery(query);
    const headword = item.normalizedHeadword;
    const lemma = item.normalizedLemma;
    const gloss = item.normalizedGloss;
    const transliteration = item.transliterationText;
    const frequency = Math.min(999999, Math.max(0, Number(item.frequency) || 0));
    const ranked = tier => tier * 1000000 + frequency;
    const hebrewScore = item.language === 'hebrew' && item.hebrewSearchTerms && hasHebrewText(query)
      ? HebrewSearchApi?.scoreHebrewSearchTerms?.(item.hebrewSearchTerms, query) || 0
      : 0;
    if(headword === q || lemma === q) return ranked(1000);
    if(item.transliterationWords.includes(` ${transliterationQuery} `)) return ranked(950);
    if(headword.startsWith(q) || lemma.startsWith(q)) return ranked(800);
    if(transliteration.includes(transliterationQuery)) return ranked(750);
    if(gloss === q) return ranked(700);
    if(gloss.startsWith(q)) return ranked(600);
    if((/[a-z]/.test(q) && !hasGreekText(query) && !hasHebrewText(query) ? item.latinSearchText : item.searchText).includes(q)) return ranked(300);
    if(hebrewScore) return ranked(hebrewScore);
    return 0;
  }
  function searchGlobalVocabulary(options = {}){
    const query = clean(options.query);
    const language = options.language || 'all';
    const status = options.status || STATUS_ALL;
    const sort = options.sort || 'relevance';
    const q = normalizeText(query);
    const scopedCount = item => !options.bookId ? 0 : Number(scopedVocabulary?.get(`id:${item.id}`) || scopedVocabulary?.get(`word:${item.language === 'hebrew' ? HebrewSearchApi?.normalizeHebrew?.(item.headword) : normalizeText(item.headword)}`)) || 0;
    const index = buildGlobalSearchIndex();
    const context = decorationContext();
    cachedDecorationSignature = decorationSignature();
    const exactLatinIds = /^[a-z0-9]+$/.test(normalizeSearchQuery(query)) ? cachedLatinTokens.get(normalizeSearchQuery(query)) : null;
    const exactLatinCandidates = exactLatinIds?.map(id => cachedCorpusById.get(id)).filter(Boolean);
    const results = [];
    for(const corpusItem of (q && exactLatinCandidates ? exactLatinCandidates : index)){
      if((language !== 'all' && corpusItem.language !== language)
        || (options.partOfSpeech && options.partOfSpeech !== 'all' && corpusItem.partOfSpeech !== options.partOfSpeech)
        || (Number(options.frequencyMinimum) && corpusItem.frequency < Number(options.frequencyMinimum))
        || (Number(options.frequencyMaximum) && corpusItem.frequency > Number(options.frequencyMaximum))) continue;
      const scopeFrequency = scopedCount(corpusItem);
      if(options.bookId && !scopeFrequency) continue;
      const score = q ? scoreResult(corpusItem, query) : (options.bookId ? scopeFrequency : corpusItem.frequency);
      if(q && !score) continue;
      const item = currentDecoratedItem(corpusItem, context);
      if((status !== STATUS_ALL && !(status === 'New' ? item.learningStatus === 'Not Learned' : status === 'Known' ? item.learningStatus.startsWith('Known') : status === 'Learning' ? ['Learning','Reviewing'].includes(item.learningStatus) : item.learningStatus === status))
        || (options.attentionOnly && !item.needsAttention)
        || (options.mastery && options.mastery !== 'all' && item.masteryGrade !== options.mastery)
        || (options.deckId && options.deckId !== 'all' && !item.deckIds.includes(options.deckId))) continue;
      const personalMatch = Boolean(q && item.personalGlosses?.some(gloss => normalizeText(gloss).includes(q)));
      results.push(q || options.bookId ? { ...item, scopeFrequency, score, personalMatch } : item);
    }
    if(q || options.bookId || sort === 'frequency') results.sort((a, b) => sort === 'frequency'
      ? (b.frequency - a.frequency) || (b.score || 0) - (a.score || 0) || a.headword.localeCompare(b.headword)
      : (b.score || 0) - (a.score || 0) || b.frequency - a.frequency || a.headword.localeCompare(b.headword));
    return { query, total: results.length, results };
  }
  function resultLanguageLabel(language){ return language === 'hebrew' ? 'Hebrew' : 'Greek'; }
  function renderGlobalSearchResult(item = {}){
    const rtl = item.language === 'hebrew';
    const headwordAttrs = rtl ? ' lang="he" dir="rtl"' : ' lang="grc"';
    const decks = (root.PuritanStudySets?.listStudySets?.() || []).filter(set => set.type === 'vocabulary' && set.language === item.language);
    return `<article class="global-search-result" data-global-search-result-row="${escapeAttr(item.id)}">
      <span class="global-search-headword"${headwordAttrs}>${escapeHtml(item.headword || 'Lemma unavailable')}</span>
      <span class="global-search-gloss">${escapeHtml(item.gloss || 'Gloss unavailable')}</span>
      <span class="global-search-meta">
        <span>${escapeHtml(resultLanguageLabel(item.language))}</span>
        ${item.frequency ? `<span>${escapeHtml(item.frequency)}× total corpus</span>` : ''}
        ${item.scopeFrequency ? `<span>${escapeHtml(item.scopeFrequency)}× in ${escapeHtml(scopedLabel)}</span>` : ''}
        ${item.partOfSpeech ? `<span>${escapeHtml(item.partOfSpeech)}</span>` : ''}
        <span>${escapeHtml(item.learningStatus || 'Not Learned')}</span>
        ${item.masteryGrade ? `<span>Mastery ${escapeHtml(item.masteryGrade)}</span>` : ''}
        ${item.needsAttention ? '<span>Needs attention</span>' : ''}
        ${item.deckCount ? `<span>${item.deckCount} Custom ${item.deckCount === 1 ? 'Deck' : 'Decks'}</span>` : ''}
        ${item.personalMatch ? '<span>Matched personal gloss</span>' : item.personalGlosses?.length ? '<span>Personal gloss active</span>' : ''}
      </span>
      <span class="global-search-result-actions"><button class="btn btn-ghost btn-sm" type="button" data-global-search-open="${escapeAttr(item.id)}">Open Word Page</button><button class="btn btn-ghost btn-sm" type="button" data-global-search-practice="${escapeAttr(item.id)}">Practice this word</button><button class="btn btn-ghost btn-sm" type="button" data-global-search-attention="${escapeAttr(item.id)}" aria-pressed="${item.needsAttention}">${item.needsAttention ? 'Remove Needs attention' : 'Needs attention'}</button>${decks.length ? `<label class="global-search-deck-action"><span class="visually-hidden">Custom Deck</span><select class="input" data-global-search-deck="${escapeAttr(item.id)}"><option value="">Add to Custom Deck…</option>${decks.map(deck => `<option value="${escapeAttr(deck.id)}">${escapeHtml(deck.title)}${item.deckIds.includes(deck.id) ? ' (already added)' : ''}</option>`).join('')}</select></label>` : ''}</span>
    </article>`;
  }
  function globalSearchSummary(search, visible, prompt){
    const totalEntries = cachedEntries.length;
    if(prompt && !totalEntries) return 'Preparing vocabulary search…';
    if(prompt) return `${Math.min(visible.length, search.total)} of ${search.total} vocabulary entries`;
    if(search.total) return `${Math.min(visible.length, search.total)} of ${search.total} results`;
    return 'No matching words found.';
  }
  function globalSearchResultsHtml(search, visible, prompt){
    const totalEntries = cachedEntries.length;
    if(prompt && !totalEntries) return '<div class="empty-state">Preparing vocabulary search…</div>';
    if(visible.length) return visible.map(renderGlobalSearchResult).join('');
    if(scopedLabel){
      const subject = SEARCH_STATE.status !== STATUS_ALL
        ? `${SEARCH_STATE.status} words`
        : SEARCH_STATE.language === 'hebrew' ? 'Hebrew vocabulary' : SEARCH_STATE.language === 'greek' ? 'Greek vocabulary' : 'vocabulary';
      const hasAdditionalFilters = Boolean(clean(SEARCH_STATE.query) || SEARCH_STATE.status !== STATUS_ALL || SEARCH_STATE.mastery !== 'all' || SEARCH_STATE.attentionOnly || SEARCH_STATE.partOfSpeech !== 'all' || SEARCH_STATE.frequencyMinimum || SEARCH_STATE.frequencyMaximum || SEARCH_STATE.deckId !== 'all');
      const frequencyNote = SEARCH_STATE.status !== STATUS_ALL && (SEARCH_STATE.frequencyMinimum || SEARCH_STATE.frequencyMaximum) ? ' matched the selected frequency range' : '';
      return `<div class="empty-state">No ${escapeHtml(subject)} in ${escapeHtml(scopedLabel)}${frequencyNote || (hasAdditionalFilters ? ' matched the current filters' : '')}.</div>`;
    }
    return '<div class="empty-state">No vocabulary matched the current filters.</div>';
  }
  function currentGlobalSearchResults(){
    const search = searchGlobalVocabulary(SEARCH_STATE);
    const visible = search.results.slice(0, SEARCH_STATE.visible);
    const prompt = !clean(SEARCH_STATE.query);
    return { search, visible, prompt };
  }
  function renderGlobalSearchResults(rootEl = query('#globalSearchShell')){
    if(!rootEl) return '';
    if(!searchIndexReady()){
      const summaryEl = query('#globalSearchSummary', rootEl); const resultsEl = query('#globalSearchResults', rootEl); const actionsEl = query('#globalSearchActions', rootEl);
      if(summaryEl){ summaryEl.textContent = 'Preparing search…'; summaryEl.setAttribute?.('role', 'status'); summaryEl.setAttribute?.('aria-live', 'polite'); }
      if(resultsEl) resultsEl.innerHTML = '';
      if(actionsEl) actionsEl.innerHTML = '';
      return rootEl.innerHTML;
    }
    const { search, visible, prompt } = currentGlobalSearchResults();
    const summaryEl = query('#globalSearchSummary', rootEl);
    const resultsEl = query('#globalSearchResults', rootEl);
    const actionsEl = query('#globalSearchActions', rootEl);
    if(summaryEl) summaryEl.innerHTML = globalSearchSummary(search, visible, prompt);
    if(resultsEl) resultsEl.innerHTML = globalSearchResultsHtml(search, visible, prompt);
    if(actionsEl) actionsEl.innerHTML = `${search.total > visible.length ? '<button class="btn btn-ghost btn-sm" id="globalSearchShowMore" type="button">Load more</button>' : ''}${search.total ? `<button class="btn btn-ghost btn-sm" id="globalSearchCreateDeck" type="button">Create Custom Deck from ${search.total} filtered ${search.total === 1 ? 'word' : 'words'}</button>` : ''}`;
    query('#globalSearchShowMore', rootEl)?.addEventListener('click', () => {
      const started = now();
      SEARCH_STATE.visible += RESULT_LIMIT;
      renderGlobalSearchResults(rootEl);
      const snapshot = JSON.parse(rootEl.dataset.searchPerformance || '{}');
      snapshot.loadMoreDuration = now() - started;
      rootEl.dataset.searchPerformance = JSON.stringify(snapshot);
    });
    queryAll('[data-global-search-open]', rootEl).forEach(button => button.addEventListener('click', () => {
      const item = search.results.find(result => result.id === button.dataset.globalSearchOpen);
      openGlobalSearchResult(item);
    }));
    queryAll('[data-global-search-attention]', rootEl).forEach(button => button.addEventListener('click', () => {
      const item = search.results.find(result => result.id === button.dataset.globalSearchAttention);
      if(!item) return;
      root.LearningPractice?.setNeedsAttention?.(item.id, item.language, !item.needsAttention);
      cachedDecorationSignature = ''; startSearchPreparation(rootEl, searchRenderGeneration);
    }));
    queryAll('[data-global-search-practice]', rootEl).forEach(button => button.addEventListener('click', () => {
      const item = search.results.find(result => result.id === button.dataset.globalSearchPractice);
      practiceGlobalSearchItem(item);
    }));
    queryAll('[data-global-search-deck]', rootEl).forEach(select => select.addEventListener('change', () => {
      const item = search.results.find(result => result.id === select.dataset.globalSearchDeck);
      if(item && select.value) root.PuritanStudySets?.addVocabularyItemToStudySet?.(select.value, item.entry);
      cachedDecorationSignature = ''; startSearchPreparation(rootEl, searchRenderGeneration);
    }));
    query('#globalSearchCreateDeck', rootEl)?.addEventListener('click', () => createDeckFromSearch(search.results));
    return rootEl.innerHTML;
  }
  function searchIndexReady(){ return !indexPreparationPromise && cachedCorpusSignature === corpusSignature(); }
  function searchViewActive(rootEl, generation){
    if(generation !== searchRenderGeneration || !query('#globalSearchPanel', rootEl)) return false;
    const view = rootEl.closest?.('#globalSearchView');
    return !view || !view.classList?.contains('hidden');
  }
  function startSearchPreparation(rootEl, generation = searchRenderGeneration, navigationStart = Number(root.__puritanSearchNavigationStart) || now()){
    renderGlobalSearchResults(rootEl);
    const start = now();
    const run = async () => {
      await prepareGlobalSearchIndex();
      if(!searchViewActive(rootEl, generation)) return;
      populateSearchDerivedFilters(rootEl, cachedEntries);
      const renderStart = now(); renderGlobalSearchResults(rootEl); const rendered = now();
      const snapshot = JSON.parse(rootEl.dataset.searchPerformance || '{}');
      Object.assign(snapshot, { indexReady: rendered - navigationStart, indexDuration: rendered - start, renderDuration: rendered - renderStart, firstResultRender: rendered - navigationStart });
      rootEl.dataset.searchPerformance = JSON.stringify(snapshot);
    };
    if(typeof root.requestAnimationFrame === 'function') root.requestAnimationFrame(() => (typeof root.setTimeout === 'function' ? root.setTimeout(run, 0) : run()));
    else run();
    return indexPreparationPromise;
  }
  function renderGlobalSearch(){
    const rootEl = query('#globalSearchShell');
    if(!rootEl) return '';
    rootEl.dataset = rootEl.dataset || {};
    const generation = ++searchRenderGeneration;
    const navigationStart = Number(root.__puritanSearchNavigationStart) || now();
    if(query('#globalSearchPanel', rootEl)){
      const start = now();
      rootEl.dataset.searchPerformance = JSON.stringify({ shellInteractive: start - navigationStart, controlsInteractive: start - navigationStart, indexReady: 0, indexDuration: 0, queryDuration: 0, renderDuration: 0, loadMoreDuration: 0, firstResultRender: 0, longTasks: [] });
      observeSearchLongTasks(rootEl, navigationStart);
      startSearchPreparation(rootEl, generation, navigationStart);
      root.PuritanLifecycleDiagnostics?.render?.('search', rootEl.querySelectorAll?.('button, input, select, textarea, form')?.length || 0);
      return rootEl.innerHTML;
    }
    const partsOfSpeech = [...new Set(cachedEntries.map(item => item.partOfSpeech).filter(Boolean))].sort();
    const decks = root.PuritanStudySets?.listStudySets?.().filter(set => set.type === 'vocabulary') || [];
    rootEl.innerHTML = `<section class="panel global-search-panel" id="globalSearchPanel" aria-labelledby="globalSearchTitle">
      <div class="global-search-header">
        <div>
          <h1 id="globalSearchTitle">Vocabulary Search</h1>
          <p>Search or browse Greek and Hebrew vocabulary by original text, English gloss, or transliteration.</p>
        </div>
        <button class="btn btn-ghost btn-sm" id="closeGlobalSearch" type="button">Return to Learn</button>
      </div>
      <form class="global-search-controls" id="globalSearchForm">
        <input class="input" id="globalSearchInput" name="query" placeholder="Greek, Hebrew, English gloss, or transliteration" autocomplete="off" value="${escapeAttr(SEARCH_STATE.query)}" />
        <button class="btn btn-primary" type="submit">Search</button>
        <label class="global-search-field"><span>Language</span><select class="input" id="globalSearchLanguage" aria-label="Language">
          <option value="all" ${SEARCH_STATE.language === 'all' ? 'selected' : ''}>All languages</option>
          <option value="greek" ${SEARCH_STATE.language === 'greek' ? 'selected' : ''}>Greek</option>
          <option value="hebrew" ${SEARCH_STATE.language === 'hebrew' ? 'selected' : ''}>Hebrew</option>
        </select></label>
        <select class="input" id="globalSearchStatus" aria-label="Learning status filter">
          ${['all', 'New', 'Learning', 'Known'].map(status => `<option value="${escapeAttr(status)}" ${SEARCH_STATE.status === status ? 'selected' : ''}>${escapeHtml(status === 'all' ? 'All word statuses' : status)}</option>`).join('')}
        </select>
        <select class="input" id="globalSearchMastery" aria-label="Mastery grade filter"><option value="all">All mastery grades</option>${['A','B','C','D','F'].map(grade => `<option value="${grade}" ${SEARCH_STATE.mastery === grade ? 'selected' : ''}>${grade}</option>`).join('')}</select>
        <select class="input" id="globalSearchPartOfSpeech" aria-label="Part of speech filter"><option value="all">All parts of speech</option>${partsOfSpeech.map(value => `<option value="${escapeAttr(value)}" ${SEARCH_STATE.partOfSpeech === value ? 'selected' : ''}>${escapeHtml(value)}</option>`).join('')}</select>
        <label class="global-search-field"><span>Book</span><select class="input" id="globalSearchBook" aria-label="Book" ${SEARCH_STATE.language === 'all' ? 'disabled' : ''}><option value="">All books</option>${(searchBooks[SEARCH_STATE.language] || []).map(book => `<option value="${escapeAttr(book.id)}" ${SEARCH_STATE.bookId === book.id ? 'selected' : ''}>${escapeHtml(book.name)}</option>`).join('')}</select></label>
        <label class="global-search-field ${SEARCH_STATE.bookId ? '' : 'hidden'}" id="globalSearchPassageScopeField"><span>Passage scope</span><select class="input" id="globalSearchPassageScope" aria-label="Passage scope"><option value="book" ${SEARCH_STATE.passageScope !== 'chapter' ? 'selected' : ''}>Entire book</option><option value="chapter" ${SEARCH_STATE.passageScope === 'chapter' ? 'selected' : ''}>One chapter</option></select></label>
        <label class="global-search-field ${SEARCH_STATE.bookId && SEARCH_STATE.passageScope === 'chapter' ? '' : 'hidden'}" id="globalSearchChapterField"><span>Chapter</span><select class="input" id="globalSearchChapter" aria-label="Chapter"><option value="0">Choose a chapter</option>${((searchBooks[SEARCH_STATE.language] || []).find(book => book.id === SEARCH_STATE.bookId)?.chapters || []).map(chapter => `<option value="${chapter}" ${Number(SEARCH_STATE.chapter) === Number(chapter) ? 'selected' : ''}>${chapter}</option>`).join('')}</select></label>
        <select class="input" id="globalSearchDeck" aria-label="Custom Deck membership filter"><option value="all">All Custom Decks</option>${decks.map(deck => `<option value="${escapeAttr(deck.id)}" ${SEARCH_STATE.deckId === deck.id ? 'selected' : ''}>${escapeHtml(deck.title)}</option>`).join('')}</select>
        <label class="global-search-check"><input id="globalSearchAttention" type="checkbox" ${SEARCH_STATE.attentionOnly ? 'checked' : ''}> Needs attention only</label>
        <input class="input" id="globalSearchFrequencyMinimum" type="number" min="0" placeholder="Min corpus frequency" value="${SEARCH_STATE.frequencyMinimum || ''}">
        <input class="input" id="globalSearchFrequencyMaximum" type="number" min="0" placeholder="Max corpus frequency" value="${SEARCH_STATE.frequencyMaximum || ''}">
        <select class="input" id="globalSearchSort" aria-label="Sort results">
          <option value="relevance" ${SEARCH_STATE.sort === 'relevance' ? 'selected' : ''}>Relevance</option>
          <option value="frequency" ${SEARCH_STATE.sort === 'frequency' ? 'selected' : ''}>Frequency</option>
        </select>
      </form>
      <div class="global-search-summary" id="globalSearchSummary"></div>
      <div class="global-search-results" id="globalSearchResults"></div>
      <div id="globalSearchActions"></div>
    </section>`;
    wireGlobalSearch(rootEl);
    root.PuritanLifecycleDiagnostics?.render?.('search', rootEl.querySelectorAll?.('button, input, select, textarea, form')?.length || 0);
    const shellInteractive = now() - navigationStart;
    rootEl.dataset.searchPerformance = JSON.stringify({ shellInteractive, controlsInteractive: shellInteractive, indexReady: 0, indexDuration: 0, queryDuration: 0, renderDuration: 0, loadMoreDuration: 0, firstResultRender: 0, longTasks: [] });
    observeSearchLongTasks(rootEl, navigationStart);
    startSearchPreparation(rootEl, generation, navigationStart);
    if(SEARCH_STATE.language !== 'all') loadSearchBooks(SEARCH_STATE.language, rootEl);
    return rootEl.innerHTML;
  }
  async function loadSearchBooks(language, rootEl){
    const select = query('#globalSearchBook', rootEl);
    if(!['greek','hebrew'].includes(language) || !root.BookProgress?.listBooks){
      if(select){ select.disabled = true; select.innerHTML = '<option value="">All books</option>'; }
      return [];
    }
    if(!searchBooks[language].length) searchBooks[language] = await root.BookProgress.listBooks(language);
    if(select){
      select.disabled = false;
      select.innerHTML = `<option value="">All books</option>${searchBooks[language].map(book => `<option value="${escapeAttr(book.id)}" ${SEARCH_STATE.bookId === book.id ? 'selected' : ''}>${escapeHtml(book.name)}</option>`).join('')}`;
    }
    return searchBooks[language];
  }
  function setSearchLanguage(language){
    SEARCH_STATE.language = ['greek','hebrew'].includes(language) ? language : 'all';
    SEARCH_STATE.bookId = ''; SEARCH_STATE.passageScope = 'book'; SEARCH_STATE.chapter = 0;
    scopedVocabulary = null; scopedLabel = ''; SEARCH_STATE.visible = RESULT_LIMIT;
    return SEARCH_STATE;
  }
  function setSearchBook(bookId){
    SEARCH_STATE.bookId = clean(bookId); SEARCH_STATE.passageScope = 'book'; SEARCH_STATE.chapter = 0;
    scopedVocabulary = null; scopedLabel = ''; SEARCH_STATE.visible = RESULT_LIMIT;
    return SEARCH_STATE;
  }
  function syncSearchPassageControls(rootEl, book){
    const scopeField = query('#globalSearchPassageScopeField', rootEl);
    const scopeSelect = query('#globalSearchPassageScope', rootEl);
    const chapterField = query('#globalSearchChapterField', rootEl);
    const chapterSelect = query('#globalSearchChapter', rootEl);
    scopeField?.classList?.toggle('hidden', !book);
    if(scopeSelect) scopeSelect.value = SEARCH_STATE.passageScope;
    const showChapter = Boolean(book && SEARCH_STATE.passageScope === 'chapter');
    chapterField?.classList?.toggle('hidden', !showChapter);
    if(chapterSelect){
      chapterSelect.disabled = !showChapter;
      chapterSelect.innerHTML = `<option value="0">Choose a chapter</option>${(book?.chapters || []).map(chapter => `<option value="${chapter}" ${Number(SEARCH_STATE.chapter) === Number(chapter) ? 'selected' : ''}>${chapter}</option>`).join('')}`;
    }
  }
  async function applySearchPassageScope(rootEl){
    const requestGeneration = ++scopeRequestGeneration;
    scopedVocabulary = null; scopedLabel = '';
    if(!SEARCH_STATE.bookId){
      SEARCH_STATE.passageScope = 'book'; SEARCH_STATE.chapter = 0;
      syncSearchPassageControls(rootEl, null);
      return;
    }
    const books = await loadSearchBooks(SEARCH_STATE.language, rootEl);
    const book = books.find(item => item.id === SEARCH_STATE.bookId);
    if(requestGeneration !== scopeRequestGeneration) return;
    if(!book){ SEARCH_STATE.bookId = ''; SEARCH_STATE.passageScope = 'book'; SEARCH_STATE.chapter = 0; syncSearchPassageControls(rootEl, null); return; }
    if(SEARCH_STATE.passageScope !== 'chapter') SEARCH_STATE.chapter = 0;
    if(SEARCH_STATE.passageScope === 'chapter' && !book.chapters.some(value => Number(value) === Number(SEARCH_STATE.chapter))) SEARCH_STATE.chapter = 0;
    syncSearchPassageControls(rootEl, book);
    if(SEARCH_STATE.passageScope === 'chapter' && !SEARCH_STATE.chapter) return;
    const progress = SEARCH_STATE.passageScope === 'chapter'
      ? await root.BookProgress.chapterProgress(SEARCH_STATE.language, book.id, SEARCH_STATE.chapter)
      : await root.BookProgress.bookProgress(SEARCH_STATE.language, book.id);
    if(requestGeneration !== scopeRequestGeneration) return;
    const vocabulary = progress?.overall?.vocabulary || [];
    scopedVocabulary = new Map();
    vocabulary.forEach(item => {
      const count = Number(item.count) || 0;
      const id = root.VocabularyLearning?.lemmaId?.(item.entry) || item.entry?.id;
      const word = displayHeadword({ ...item.entry, lang: SEARCH_STATE.language });
      if(id) scopedVocabulary.set(`id:${id}`, count);
      if(word && word !== 'Lemma unavailable') scopedVocabulary.set(`word:${SEARCH_STATE.language === 'hebrew' ? HebrewSearchApi?.normalizeHebrew?.(word) : normalizeText(word)}`, count);
    });
    scopedLabel = `${book.name}${SEARCH_STATE.passageScope === 'chapter' ? ` ${SEARCH_STATE.chapter}` : ''}`;
    if(rootEl?.dataset) rootEl.dataset.searchScope = JSON.stringify({ language: SEARCH_STATE.language, bookId: book.id, passageScope: SEARCH_STATE.passageScope, chapter: SEARCH_STATE.chapter, vocabularyCount: vocabulary.length, lookupCount: scopedVocabulary.size, label: scopedLabel });
  }
  function observeSearchLongTasks(rootEl, navigationStart){
    if(!root.PerformanceObserver?.supportedEntryTypes?.includes('longtask')) return;
    searchLongTaskObserver?.disconnect?.();
    searchLongTaskObserver = new root.PerformanceObserver(list => {
      const snapshot = JSON.parse(rootEl.dataset.searchPerformance || '{}');
      snapshot.longTasks = [...(snapshot.longTasks || []), ...list.getEntries().filter(entry => entry.startTime >= navigationStart).map(entry => ({ startTime: entry.startTime - navigationStart, duration: entry.duration }))];
      rootEl.dataset.searchPerformance = JSON.stringify(snapshot);
    });
    searchLongTaskObserver.observe({ type: 'longtask', buffered: false });
    root.PuritanLifecycleDiagnostics?.observer?.('search', true);
  }
  function disposeGlobalSearch(){
    searchRenderGeneration += 1;
    scopeRequestGeneration += 1;
    searchLongTaskObserver?.disconnect?.();
    searchLongTaskObserver = null;
    root.PuritanLifecycleDiagnostics?.observer?.('search', false);
  }
  function populateSearchDerivedFilters(rootEl, index){
    const select = query('#globalSearchPartOfSpeech', rootEl);
    if(!select) return;
    const parts = [...new Set(index.map(item => item.partOfSpeech).filter(Boolean))].sort();
    select.innerHTML = `<option value="all">All parts of speech</option>${parts.map(value => `<option value="${escapeAttr(value)}" ${SEARCH_STATE.partOfSpeech === value ? 'selected' : ''}>${escapeHtml(value)}</option>`).join('')}`;
  }
  function wireGlobalSearch(rootEl){
    const update = () => {
      const start = root.performance?.now?.() || 0;
      if(searchIndexReady()) renderGlobalSearchResults(rootEl);
      else startSearchPreparation(rootEl, searchRenderGeneration);
      const end = root.performance?.now?.() || start;
      const snapshot = JSON.parse(rootEl.dataset.searchPerformance || '{}');
      snapshot.queryDuration = end - start;
      snapshot.renderDuration = end - start;
      rootEl.dataset.searchPerformance = JSON.stringify(snapshot);
    };
    query('#globalSearchForm', rootEl)?.addEventListener('submit', event => { event.preventDefault(); SEARCH_STATE.query = query('#globalSearchInput', rootEl)?.value || ''; SEARCH_STATE.visible = RESULT_LIMIT; update(); });
    query('#globalSearchLanguage', rootEl)?.addEventListener('change', async event => { setSearchLanguage(event.target.value); await loadSearchBooks(SEARCH_STATE.language, rootEl); await applySearchPassageScope(rootEl); update(); });
    query('#globalSearchStatus', rootEl)?.addEventListener('change', event => { SEARCH_STATE.status = event.target.value; SEARCH_STATE.visible = RESULT_LIMIT; update(); });
    query('#globalSearchMastery', rootEl)?.addEventListener('change', event => { SEARCH_STATE.mastery = event.target.value; SEARCH_STATE.visible = RESULT_LIMIT; update(); });
    query('#globalSearchPartOfSpeech', rootEl)?.addEventListener('change', event => { SEARCH_STATE.partOfSpeech = event.target.value; SEARCH_STATE.visible = RESULT_LIMIT; update(); });
    query('#globalSearchBook', rootEl)?.addEventListener('change', async event => { setSearchBook(event.target.value); await applySearchPassageScope(rootEl); update(); });
    query('#globalSearchPassageScope', rootEl)?.addEventListener('change', async event => { SEARCH_STATE.passageScope = event.target.value === 'chapter' ? 'chapter' : 'book'; SEARCH_STATE.chapter = 0; SEARCH_STATE.visible = RESULT_LIMIT; await applySearchPassageScope(rootEl); update(); });
    query('#globalSearchChapter', rootEl)?.addEventListener('change', async event => { SEARCH_STATE.chapter = Number(event.target.value) || 0; SEARCH_STATE.visible = RESULT_LIMIT; await applySearchPassageScope(rootEl); update(); });
    query('#globalSearchDeck', rootEl)?.addEventListener('change', event => { SEARCH_STATE.deckId = event.target.value; SEARCH_STATE.visible = RESULT_LIMIT; update(); });
    query('#globalSearchAttention', rootEl)?.addEventListener('change', event => { SEARCH_STATE.attentionOnly = event.target.checked; SEARCH_STATE.visible = RESULT_LIMIT; update(); });
    query('#globalSearchFrequencyMinimum', rootEl)?.addEventListener('change', event => { SEARCH_STATE.frequencyMinimum = Number(event.target.value) || 0; SEARCH_STATE.visible = RESULT_LIMIT; update(); });
    query('#globalSearchFrequencyMaximum', rootEl)?.addEventListener('change', event => { SEARCH_STATE.frequencyMaximum = Number(event.target.value) || 0; SEARCH_STATE.visible = RESULT_LIMIT; update(); });
    query('#globalSearchSort', rootEl)?.addEventListener('change', event => { SEARCH_STATE.sort = event.target.value; SEARCH_STATE.visible = RESULT_LIMIT; update(); });
    query('#closeGlobalSearch')?.addEventListener('click', () => {
      searchRenderGeneration += 1;
      appFunction('showView')?.('learnView');
    });
  }
  function practiceGlobalSearchItem(item){
    if(!item || !root.LearningPractice || !root.VocabularyLearning) return false;
    const status = item.learningStatus === 'Not Learned' ? 'new' : item.learningStatus.startsWith('Known') ? 'known' : 'learning';
    const profile = root.LearningPractice.normalizeProfile({ language: item.language, source: 'all-known', size: 1, statusFilters: [status], promptDirection: 'reading' }, item.language);
    const session = root.LearningPractice.assembleFocusedSession({ language: item.language, profile, entries: [item.entry], store: root.VocabularyLearning.loadStore(), model: root.VocabularyLearning, attention: root.LearningPractice.loadAttention?.(), returnPage: 'home', contextTitle: `${resultLanguageLabel(item.language)} word practice` });
    root.LearningPractice.saveSession(session);
    if(root.learnState){ root.learnState.unifiedRevealed = false; root.learnState.page = `vocabulary:daily:${item.language}`; }
    appFunction('showView')?.('learnView');
    return true;
  }
  function createDeckFromSearch(items){
    const entries = Array.isArray(items) ? items : [];
    if(!entries.length || !root.confirm?.(`Create a Custom Deck containing ${entries.length} filtered ${entries.length === 1 ? 'word' : 'words'}?`)) return false;
    const language = entries.every(item => item.language === entries[0].language) ? entries[0].language : SEARCH_STATE.language;
    if(!['greek','hebrew'].includes(language)){ root.alert?.('Choose one language before creating a Custom Deck.'); return false; }
    const title = clean(root.prompt?.('Custom Deck name', SEARCH_STATE.attentionOnly ? `${resultLanguageLabel(language)} Needs attention` : `${resultLanguageLabel(language)} search results`));
    if(!title) return false;
    if(typeof root.createStudySetWithVocabulary === 'function') root.createStudySetWithVocabulary(title, language, entries.map(item => item.entry));
    return true;
  }
  async function ensureSearchGlosses(){
    if(hebrewGlosses || typeof root.fetch !== 'function' || !root.document || !root.location) return false;
    if(!hebrewGlossPromise) hebrewGlossPromise = (typeof root.loadLexicalGlossMap === 'function'
      ? root.loadLexicalGlossMap('hebrew')
      : root.fetch('/data/glosses/hebrew-glosses.json').then(response => response.ok ? response.json() : null))
      .then(data => (hebrewGlosses = data));
    await hebrewGlossPromise;
    return Boolean(hebrewGlosses);
  }
  function openGlobalSearchResult(item = {}){
    if(!item) return false;
    const info = {
      language: item.language,
      id: item.id,
      surface: '',
      lemma: item.lemma,
      lexicalForm: item.entry?.lexicalForm || item.lemma,
      hebrewLemma: item.entry?.hebrewLemma,
      root: item.entry?.root,
      parse: item.entry?.parse || '',
      primaryGloss: item.standardGlosses?.[0] || item.gloss,
      alternateGlosses: item.standardGlosses?.slice(1) || item.alternateGlosses,
      frequency: item.frequency,
      globalSearchResult: true,
      returnToSearch: true
    };
    const openPreparedWordPage = () => {
      const openWordPage = appFunction('openReaderWordPageFromInfo');
      if(openWordPage){ openWordPage(info); return true; }
      try { if(typeof readerState !== 'undefined') readerState.wordPageInfo = info; } catch(e) {}
      appFunction('renderReaderWordPage')?.();
      appFunction('showView')?.('wordPageView');
      return true;
    };
    if(appFunction('openReaderWordPageFromInfo')) return openPreparedWordPage();
    const loader = root.PuritanModuleLoader;
    if(loader?.ensureView) return loader.ensureView('wordPageView').then(openPreparedWordPage).catch(error => {
      console.error('Unable to open the vocabulary Word Page.', error);
      return false;
    });
    return openPreparedWordPage();
  }
  return {
    SEARCH_STATE,
    RESULT_LIMIT,
    MAX_RESULTS,
    buildGlobalSearchIndex,
    prepareGlobalSearchIndex,
    globalSearchIndexDebug,
    searchGlobalVocabulary,
    renderGlobalSearchResult,
    renderGlobalSearch,
    renderGlobalSearchResults,
    loadSearchBooks,
    setSearchLanguage,
    setSearchBook,
    applySearchPassageScope,
    openGlobalSearchResult,
    displayHeadword,
    normalizeText,
    transliterateGreek,
    isNumericLemma,
    disposeGlobalSearch
  };
});
