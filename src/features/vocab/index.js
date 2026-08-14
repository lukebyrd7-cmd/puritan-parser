function displayHeadwordForEntry(entry){
  if(typeof getDisplayHeadword === 'function') return getDisplayHeadword(entry);
  const clean = value => typeof value === 'string' ? value.trim() : '';
  return clean(entry?.lexicalForm) || clean(entry?.lemma) || clean(entry?.word) || '';
}

/* ---------- View Controller ---------- */
const featureViewLoadPromises = new Map();
const FeatureViewLoadTimeoutMs = 10000;
const lifecycleDiagnostics = (() => {
  const enabled = typeof window !== 'undefined' && typeof performance !== 'undefined' && ['localhost','127.0.0.1'].includes(location.hostname);
  const state = { route: '', mounts: 0, unmounts: 0, renders: {}, listenerBindings: {}, activeObservers: {}, activeTimers: 0, activeJobs: {}, storageWrites: 0, longTasks: [], clickResponses: [], practiceInteractions: [] };
  const snapshot = () => ({ ...state, renders: { ...state.renders }, listenerBindings: { ...state.listenerBindings }, activeObservers: { ...state.activeObservers }, activeJobs: { ...state.activeJobs }, longTasks: state.longTasks.slice(), clickResponses: state.clickResponses.slice(), memory: performance.memory ? { usedJSHeapSize: performance.memory.usedJSHeapSize, totalJSHeapSize: performance.memory.totalJSHeapSize } : null });
  const publish = () => { if(enabled && document?.documentElement) document.documentElement.dataset.puritanLifecycle = JSON.stringify(snapshot()); };
  if(enabled && typeof PerformanceObserver === 'function' && PerformanceObserver.supportedEntryTypes?.includes('longtask')){
    const observer = new PerformanceObserver(list => {
      state.longTasks.push(...list.getEntries().map(entry => ({ route: state.route, duration: entry.duration, startTime: entry.startTime })).slice(-100));
      state.longTasks = state.longTasks.slice(-100);
      publish();
    });
    observer.observe({ type: 'longtask', buffered: false });
    state.activeObservers.lifecycle = 1;
  }
  if(enabled && typeof document !== 'undefined') document.addEventListener('click', () => {
    const route = state.route; const started = performance.now(); state.activeTimers += 1;
    requestAnimationFrame(() => {
      state.activeTimers = Math.max(0, state.activeTimers - 1);
      state.clickResponses.push({ route, duration: performance.now() - started });
      state.clickResponses = state.clickResponses.slice(-100);
      publish();
    });
  }, true);
  const api = {
    enabled,
    route(next){ if(!enabled || state.route === next) return; if(state.route) state.unmounts += 1; state.route = next; state.mounts += 1; publish(); },
    render(name, listenerCount){ if(!enabled) return; state.renders[name] = (state.renders[name] || 0) + 1; if(Number.isFinite(listenerCount)) state.listenerBindings[name] = listenerCount; publish(); },
    observer(name, active){ if(enabled){ state.activeObservers[name] = active ? 1 : 0; publish(); } },
    job(name, delta){ if(enabled){ state.activeJobs[name] = Math.max(0, (state.activeJobs[name] || 0) + delta); publish(); } },
    write(){ if(enabled){ state.storageWrites += 1; publish(); } },
    interaction(duration){ if(enabled){ state.practiceInteractions.push({ duration, domNodes: document.querySelectorAll('*').length, listenerBindings: state.listenerBindings.learn || 0, memory: performance.memory?.usedJSHeapSize || null }); state.practiceInteractions = state.practiceInteractions.slice(-200); publish(); } },
    snapshot,
    reset(){ if(!enabled) return; state.mounts = 0; state.unmounts = 0; state.renders = {}; state.listenerBindings = {}; state.storageWrites = 0; state.longTasks = []; state.clickResponses = []; state.practiceInteractions = []; publish(); }
  };
  if(typeof window !== 'undefined') window.PuritanLifecycleDiagnostics = api;
  return api;
})();

function featureViewStatus(target){
  return target?.querySelector?.(':scope > .feature-load-status') || null;
}
function clearFeatureViewStatus(target){
  featureViewStatus(target)?.remove?.();
  target?.classList?.remove?.('feature-loading');
}
function renderFeatureViewStatus(target, message = 'Opening…', options = {}){
  if(!target || typeof document === 'undefined') return null;
  clearFeatureViewStatus(target);
  const status = document.createElement('section');
  status.className = 'panel feature-load-status';
  const text = document.createElement('p');
  text.className = 'progress-empty';
  text.setAttribute('role', 'status');
  text.textContent = message;
  status.appendChild(text);
  if(typeof options.retry === 'function'){
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.className = 'btn secondary';
    retry.textContent = 'Try again';
    retry.addEventListener('click', options.retry);
    status.appendChild(retry);
  }
  target.insertAdjacentElement?.('afterbegin', status);
  target.classList?.add?.('feature-loading');
  return status;
}
function loadFeatureView(viewId, moduleLoader, timeoutMs = FeatureViewLoadTimeoutMs){
  if(featureViewLoadPromises.has(viewId)) return featureViewLoadPromises.get(viewId);
  let timeoutHandle = null;
  const timeout = new Promise((resolve, reject) => {
    timeoutHandle = setTimeout(() => reject(new Error(`Opening ${viewId} timed out.`)), timeoutMs);
  });
  const pending = Promise.race([moduleLoader.ensureView(viewId), timeout])
    .finally(() => {
      clearTimeout(timeoutHandle);
      featureViewLoadPromises.delete(viewId);
    });
  featureViewLoadPromises.set(viewId, pending);
  return pending;
}
function normalizeViewId(viewId){
  if(typeof viewId !== 'string') return 'listView';
  if(document.getElementById(viewId)) return viewId;
  if(typeof ROUTES !== 'undefined'){
    const byNav = Object.values(ROUTES).find(route => route.nav === viewId);
    if(byNav) return byNav.viewId;
  }
  const candidate = (viewId === 'flashcards' ? 'flash' : viewId) + 'View';
  return document.getElementById(candidate) ? candidate : 'listView';
}
function showView(viewId, options = {}){
  viewId = normalizeViewId(viewId);
  if(viewId === 'globalSearchView' && typeof performance !== 'undefined' && typeof window !== 'undefined') window.__puritanSearchNavigationStart = performance.now();
  const previousView = state.currentView;
  lifecycleDiagnostics.route(viewId);
  if(previousView === 'learnView' && viewId !== 'learnView' && typeof prepareLearnPerformanceMeasurement === 'function') prepareLearnPerformanceMeasurement({ invalidateDashboard: true });
  if(previousView === 'globalSearchView' && viewId !== 'globalSearchView' && typeof disposeGlobalSearch === 'function') disposeGlobalSearch();
  const moduleLoader = typeof window !== 'undefined' ? window.PuritanModuleLoader : null;
  if(!options.featureReady && moduleLoader && !moduleLoader.isViewReady(viewId)){
    const target = document.getElementById(viewId);
    const views = [...new Set([...Object.values(typeof ROUTES !== 'undefined' ? ROUTES : {}).map(route => route.viewId), 'listView'])];
    views.forEach(id=>{ const el=document.getElementById(id); if(el) el.classList.toggle('hidden', id!==viewId); });
    renderFeatureViewStatus(target);
    state.currentView = viewId;
    if(typeof deferAppDataLoadForInteraction === 'function') deferAppDataLoadForInteraction();
    loadFeatureView(viewId, moduleLoader)
      .then(() => {
        clearFeatureViewStatus(target);
        if(state.currentView === viewId) showView(viewId, { ...options, featureReady: true, skipHistory: true });
      })
      .catch(error => {
        console.error('Puritan Parser feature failed to load.', error);
        renderFeatureViewStatus(target, 'This section could not be opened.', {
          retry: () => {
            clearFeatureViewStatus(target);
            showView(viewId, { ...options, skipHistory: true });
          }
        });
      });
    return viewId;
  }
  const searchNeedsData = viewId === 'globalSearchView' && typeof isAppDataReady === 'function' && !isAppDataReady() && typeof startAppDataLoad === 'function';
  if(!searchNeedsData && ['learnView','listView','flashView','parsingView','dashboardView','progressView','globalSearchView'].includes(viewId)
    && typeof isAppDataReady === 'function' && !isAppDataReady() && typeof startAppDataLoad === 'function') startAppDataLoad();
  if(state.currentView === 'readerView' && viewId !== 'readerView'){
    if(typeof suspendReader === 'function') suspendReader();
    else if(typeof persistReaderPlaceNow === 'function') persistReaderPlaceNow();
  }
  const views = [...new Set([...Object.values(typeof ROUTES !== 'undefined' ? ROUTES : {}).map(route => route.viewId), 'listView'])];
  if(!views.length) views.push('listView','flashView','parsingView','dashboardView','progressView','settingsView','aboutSourcesView','globalSearchView','grammarView','readerView','wordPageView','learnView','onboardingView','profileView');
  views.forEach(id=>{ const el=document.getElementById(id); if(el) el.classList.toggle('hidden', id!==viewId); });
  $$('.nav-tab').forEach(t=>t.classList.toggle('active', t.dataset.view===viewId.replace('View','') || (typeof ROUTES !== 'undefined' && ROUTES[routeForView(viewId)]?.nav === t.dataset.view)));
  if(viewId === 'learnView' && previousView !== 'learnView' && typeof beginLearnPerformanceNavigation === 'function') beginLearnPerformanceNavigation(previousView || 'internal');
  state.currentView = viewId;

  if(!options.skipHistory && typeof routeForView === 'function') navigateTo(routeForView(viewId));

  // Show/hide filter bar and its sub-elements
  const filterBar = $('#sharedFilterBar');
  const noFilterViews = ['dashboardView','progressView','settingsView','aboutSourcesView','globalSearchView','grammarView','readerView','wordPageView','learnView','onboardingView','profileView'];
  if(filterBar) filterBar.classList.toggle('hidden', noFilterViews.includes(viewId));
  // search only on list
  const sg = $('#filterSearchGroup'); if(sg) sg.classList.toggle('hidden', viewId!=='listView');
  // sort only on list
  const ssg = $('#filterSortGroup'); if(ssg) ssg.classList.toggle('hidden', viewId!=='listView');
  // entries count only on list
  const ec = $('#filterEntriesCount'); if(ec) ec.classList.toggle('hidden', viewId!=='listView');
  const pg = $('#filterPosGroup'); if(pg) pg.classList.toggle('hidden', viewId==='parsingView');

  if(viewId==='dashboardView') renderDashboard();
  if(viewId==='progressView' && typeof renderProgress === 'function') renderProgress();
  if(viewId==='globalSearchView' && typeof renderGlobalSearch === 'function') renderGlobalSearch();
  if(viewId==='aboutSourcesView' && typeof renderAboutSources === 'function') renderAboutSources();
  if(viewId==='grammarView' && typeof initReferenceLibrary === 'function') initReferenceLibrary();
  if(viewId==='listView') renderList();
  if(viewId==='parsingView') { updateParsingModeUI(); renderLemmaPicker(); }
  if(viewId==='readerView' && typeof initReader === 'function') initReader();
  if(viewId==='wordPageView' && typeof renderReaderWordPage === 'function') renderReaderWordPage();
  if(viewId==='learnView' && typeof renderLearn === 'function') renderLearn();
  if(viewId==='onboardingView' && typeof renderOnboarding === 'function') renderOnboarding();
  if(searchNeedsData){
    const beginSearchData = () => setTimeout(() => startAppDataLoad().catch(error => console.error('Puritan Parser vocabulary data failed to load.', error)), 0);
    if(typeof requestAnimationFrame === 'function') requestAnimationFrame(beginSearchData); else beginSearchData();
  }

  const fl = $('#footerLang');
  if(fl) fl.textContent = `${state.lang==='greek'?'Greek (GNT)':'Hebrew'} — ${getCurrentStudyList().length} study entries (${getCurrentList().length} forms) loaded`;
}

/* ---------- Language ---------- */
function setLang(lang){
  const previousLang = state.lang;
  state.lang = lang;
  if(previousLang !== lang) { selectedLemma = null; state.parsingFilters = { family: parsingModeFamily() || state.parsingFilters?.family || 'all', details: {} }; }
  $$('[data-lang]').forEach(b=>b.classList.toggle('active', b.dataset.lang===lang));
  if(typeof updatePosOptions === 'function') updatePosOptions();
  if(typeof updateParsingFilterOptions === 'function') updateParsingFilterOptions();
  renderList(); updateDueBadge();
  if(typeof saveLastLanguage === 'function') saveLastLanguage(lang);
}
function getCurrentList(){ return state.data[state.lang]||[]; }
function getCurrentStudyList(){ return typeof getStudyEntries === 'function' ? getStudyEntries(getCurrentList(), state.prefs.studyMode || 'lemma') : getCurrentList(); }

/* ---------- Header progress hook (kept for legacy callers) ---------- */
function updateDueBadge(){}

/* ---------- Mastery ---------- */
function computeMastery(item){
  const reps = item.repetitions||0;
  const ease = item.ease||2.5;
  const raw = (reps*ease)/((state.prefs.initialEase||2.5));
  return Math.round(clamp(raw/5*100, 0, 100));
}
function vocabularyMasteryGrade(item, store){
  if(typeof VocabularyLearning === 'undefined' || typeof VocabularyMastery === 'undefined') return null;
  const activeStore = store || VocabularyLearning.loadStore();
  const status = VocabularyLearning.learningStatus(activeStore, item);
  if(status !== VocabularyLearning.STATUS.KNOWN && status !== VocabularyLearning.STATUS.KNOWN_SELF_REPORTED) return null;
  return VocabularyMastery.masteryGrade(VocabularyLearning.getRecord(activeStore, item) || {});
}

function vocabularyBrowseState(item, store, dateISO){
  if(typeof VocabularyLearning === 'undefined'){
    return { key:'new', label:'New', due:'', dueState:'not-scheduled', tracked:false };
  }
  const record = VocabularyLearning.getRecord(store, item);
  const details = VocabularyLearning.learningStatusDetails(store, item, dateISO);
  const status = details.status;
  const known = status === VocabularyLearning.STATUS.KNOWN || status === VocabularyLearning.STATUS.KNOWN_SELF_REPORTED;
  const learning = status === VocabularyLearning.STATUS.LEARNING || status === VocabularyLearning.STATUS.REVIEWING;
  return {
    key: known ? 'known' : learning ? 'learning' : 'new',
    label: known ? 'Known' : learning ? 'Learning' : 'New',
    due: record && details.nextReview !== '9999-12-31' ? details.nextReview : '',
    dueState: details.dueState,
    tracked: Boolean(record)
  };
}

/* ---------- LIST VIEW ---------- */
function renderList(){
  readFiltersFromDOM();
  const { query, minFreq, maxFreq, dueOnly, attentionOnly, pos, status } = state.filters;
  const sort = $('#sortSelect')?.value||'freq-desc';
  const today = todayISO();
  const masteryStore = typeof VocabularyLearning !== 'undefined' ? VocabularyLearning.loadStore() : null;
  const masteryCache = new Map();
  const browseCache = new Map();
  const browseFor = item => {
    const id = typeof VocabularyLearning !== 'undefined' ? VocabularyLearning.lemmaId(item) : item.id;
    if(!browseCache.has(id)) browseCache.set(id, vocabularyBrowseState(item, masteryStore, today));
    return browseCache.get(id);
  };
  const masteryFor = item => {
    const id = typeof VocabularyLearning !== 'undefined' ? VocabularyLearning.lemmaId(item) : item.id;
    if(!masteryCache.has(id)) masteryCache.set(id, vocabularyMasteryGrade(item, masteryStore));
    return masteryCache.get(id);
  };
  let list = getCurrentStudyList().filter(it=>{
    if(!it) return false;
    const freq = it.freq||0;
    if(freq < minFreq || freq > maxFreq) return false;
    const browse = browseFor(it);
    if(dueOnly && browse.dueState !== 'overdue' && browse.dueState !== 'due-today') return false;
    if(status && status !== 'all' && browse.key !== status) return false;
    if(attentionOnly && (typeof LearningPractice === 'undefined' || !LearningPractice.needsAttention(typeof VocabularyLearning !== 'undefined' ? VocabularyLearning.lemmaId(it) : it.id, it.lang || state.lang))) return false;
    if(!matchesPosFilter(it, pos)) return false;
    if(!query) return true;
    const searchText = typeof getStudyEntrySearchText === 'function' ? getStudyEntrySearchText(it) : (typeof glossSearchText === 'function' ? glossSearchText(it) : `${it.word||''} ${it.lemma||''} ${it.gloss||''}`.toLowerCase());
    return `${searchText} ${it.pos||''} ${it.parse||''} ${parseSummary(it)}`.toLowerCase().includes(query);
  });
  list.sort((a,b)=>{
    if(sort==='freq-desc') return (b.freq||0)-(a.freq||0);
    if(sort==='freq-asc') return (a.freq||0)-(b.freq||0);
    if(sort==='due-asc') return (browseFor(a).due||'9999').localeCompare(browseFor(b).due||'9999');
    if(sort==='mastery-asc') return (masteryFor(b)?.rank ?? -1) - (masteryFor(a)?.rank ?? -1);
    if(sort==='word-az') return displayHeadwordForEntry(a).localeCompare(displayHeadwordForEntry(b));
    return 0;
  });
  state.filtered = list;
  const renderLimit = Math.max(LIST_RENDER_LIMIT, Number(state.listRenderLimit) || LIST_RENDER_LIMIT);
  const ec = $('#filterEntriesCount');
  if(ec) ec.textContent = list.length > renderLimit ? `Showing ${renderLimit} of ${list.length} entries` : `${list.length} entries`;
  const loadMore = $('#listLoadMore');
  if(loadMore){
    loadMore.classList.toggle('hidden', list.length <= renderLimit);
    loadMore.textContent = `Load ${Math.min(LIST_RENDER_LIMIT, list.length - renderLimit)} more`;
  }
  const tbody = $('#wordsTbody'); if(!tbody) return;
  if(!list.length){
    tbody.innerHTML = `<tr><td colspan="7" class="empty-state"><p>No entries found. Try expanding the frequency range or clearing a filter.</p></td></tr>`;
    return;
  }
  const visible = list.slice(0, renderLimit);
  tbody.innerHTML = visible.map((it,i)=>{
    const mastery = masteryFor(it);
    const browse = browseFor(it);
    const posColor = {noun:'#246b9c',verb:'#8a2b2b',adj:'#d97706',prep:'#475569',adv:'#2a9d8f'}[(it.pos||'').toLowerCase().slice(0,4)]||'#6b7280';
    return `<tr data-idx="${i}" style="cursor:pointer">
      <td class="word-cell">${escHtml(displayHeadwordForEntry(it))}</td>
      <td class="gloss-cell">${escHtml(typeof getDisplayGloss === 'function' ? getDisplayGloss(it) : (it.gloss||''))}</td>
      <td><span class="pos-tag" style="color:${posColor}">${escHtml(it.pos||'—')}</span></td>
      <td class="muted small">${escHtml(String(it.freq||0))}</td>
      <td class="muted small">${escHtml(browse.due||'—')}</td>
      <td><span class="vocabulary-status vocabulary-status-${browse.key}">${escHtml(browse.label)}</span></td>
      <td>${mastery ? `<span class="mastery-grade" title="${escHtml(mastery.explanation)}">${escHtml(mastery.letter)} — ${escHtml(mastery.label)}</span>` : '<span class="muted small">Not tracked</span>'}</td>
    </tr>`;
  }).join('');

  // Wire row clicks for modal
  $$('#wordsTbody tr').forEach((tr,i)=>{
    tr.addEventListener('click', ()=>openWordModal(state.filtered[i]));
  });
}

if(typeof module !== 'undefined') module.exports = { vocabularyBrowseState };
