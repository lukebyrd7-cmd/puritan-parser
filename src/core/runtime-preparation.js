/* ---------- Shared, idle runtime preparation ---------- */
(function(root){
  const jobs = new Map();
  const counts = {};
  let warmupScheduled = false;
  let warmupHandle = null;

  function runOnce(key, factory){
    if(jobs.has(key)) return jobs.get(key);
    counts[key] = (counts[key] || 0) + 1;
    const pending = Promise.resolve().then(factory).catch(error => {
      jobs.delete(key);
      throw error;
    });
    jobs.set(key, pending);
    return pending;
  }

  function dataRevision(){
    try { return Math.max(0, Number(state?.dataRevision) || 0); }
    catch(error) { return 0; }
  }

  function vocabularyEntries(language){
    try { return Array.isArray(state?.data?.[language]) ? state.data[language] : []; }
    catch(error) { return []; }
  }

  function prepareVocabulary(language = 'greek'){
    const normalized = language === 'hebrew' ? 'hebrew' : 'greek';
    const revision = dataRevision();
    return runOnce(`vocabulary:${normalized}:${revision}`, async () => {
      if(typeof startAppDataLoad === 'function' && typeof isAppDataReady === 'function' && !isAppDataReady()) await startAppDataLoad();
      const entries = vocabularyEntries(normalized);
      if(typeof getStudyEntriesAsync === 'function') return getStudyEntriesAsync(entries, 'lemma', { budgetMs: 8 });
      if(typeof getStudyEntries === 'function') return getStudyEntries(entries, 'lemma');
      return entries;
    });
  }

  function prepareGlosses(language = 'hebrew'){
    const normalized = language === 'hebrew' ? 'hebrew' : 'greek';
    return runOnce(`glosses:${normalized}`, () => typeof loadLexicalGlossMap === 'function' ? loadLexicalGlossMap(normalized) : null);
  }

  function prepareSearch(){
    const revision = dataRevision();
    return runOnce(`search:${revision}`, async () => {
      await Promise.all([prepareVocabulary('greek'), prepareVocabulary('hebrew'), prepareGlosses('hebrew')]);
      if(root.PuritanModuleLoader?.ensureView) await root.PuritanModuleLoader.ensureView('globalSearchView');
      return root.PuritanGlobalSearch?.prepareGlobalSearchIndex?.() || [];
    });
  }

  function beginWarmup(){
    warmupHandle = null;
    const activeLanguage = (() => { try { return state?.lang === 'hebrew' ? 'hebrew' : 'greek'; } catch(error) { return 'greek'; } })();
    const otherLanguage = activeLanguage === 'greek' ? 'hebrew' : 'greek';
    prepareVocabulary(activeLanguage)
      .then(() => prepareVocabulary(otherLanguage))
      .then(() => prepareGlosses('hebrew'))
      .then(() => prepareSearch())
      .catch(error => console.warn('Background vocabulary preparation did not complete.', error));
  }

  function scheduleWarmup(){
    if(warmupScheduled || typeof window === 'undefined') return false;
    warmupScheduled = true;
    const schedule = () => {
      if(typeof root.requestIdleCallback === 'function') warmupHandle = root.requestIdleCallback(beginWarmup, { timeout: 6000 });
      else warmupHandle = root.setTimeout(beginWarmup, 0);
    };
    if(typeof root.requestAnimationFrame === 'function') root.requestAnimationFrame(() => root.setTimeout(schedule, 0));
    else root.setTimeout(schedule, 0);
    return true;
  }

  function debug(){
    return { warmupScheduled, warmupPending: Boolean(warmupHandle), counts: { ...counts }, jobs: [...jobs.keys()] };
  }

  root.PuritanRuntimePreparation = { prepareVocabulary, prepareGlosses, prepareSearch, scheduleWarmup, debug };
})(typeof globalThis !== 'undefined' ? globalThis : this);
