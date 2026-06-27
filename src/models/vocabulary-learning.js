/* ---------- Vocabulary learning model ---------- */
(function(root, factory){
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.VocabularyLearning = api;
  Object.keys(api).forEach(key => { root[key] = root[key] || api[key]; });
})(typeof globalThis !== 'undefined' ? globalThis : this, function(root){
  const STORAGE_KEY = 'pp_vocab_learning';
  const STATUS = { NOT_LEARNED: 'Not Learned', LEARNING: 'Learning', KNOWN: 'Known' };
  const RECOGNIZED_INTERVALS = [1, 3, 7];

  function clean(value){ return typeof value === 'string' ? value.trim() : ''; }
  function todayISO(){
    if(typeof root.todayISO === 'function') return root.todayISO();
    return new Date().toISOString().slice(0, 10);
  }
  function addDaysISO(dateISO, days){
    const date = dateISO ? new Date(`${dateISO}T00:00:00`) : new Date();
    date.setDate(date.getDate() + Number(days || 0));
    return date.toISOString().slice(0, 10);
  }
  function storage(){
    if(root.activeStorageAdapter) return root.activeStorageAdapter;
    if(root.localStorage) return {
      get: key => root.localStorage.getItem(key),
      set: (key, value) => root.localStorage.setItem(key, value),
      remove: key => root.localStorage.removeItem(key)
    };
    return null;
  }
  function lemmaId(entry = {}){
    const lang = clean(entry.lang).toLowerCase() || 'unknown';
    const lemma = clean(entry.lemma) || clean(entry.word) || clean(entry.lexicalForm) || clean(entry.id);
    return clean(entry.id).startsWith(`lemma:${lang}:`) ? clean(entry.id) : `lemma:${lang}:${lemma}`;
  }
  function normalizeRecord(record = {}){
    const next = {
      id: clean(record.id),
      lemma: clean(record.lemma),
      lang: clean(record.lang).toLowerCase(),
      status: record.status === STATUS.KNOWN ? STATUS.KNOWN : STATUS.LEARNING,
      successCount: Math.max(0, Number(record.successCount) || 0),
      intervalDays: Math.max(0, Number(record.intervalDays) || 0),
      due: clean(record.due) || todayISO(),
      introducedAt: clean(record.introducedAt),
      introducedBy: record.introducedBy && typeof record.introducedBy === 'object' ? { ...record.introducedBy } : null,
      history: Array.isArray(record.history) ? record.history.filter(Boolean).map(item => ({ ...item })) : []
    };
    if(!next.status) next.status = STATUS.LEARNING;
    return next;
  }
  function createStore(records = {}){
    const byLemma = {};
    Object.values(records || {}).forEach(record => {
      const normalized = normalizeRecord(record);
      if(normalized.id) byLemma[normalized.id] = normalized;
    });
    return { schemaVersion: 1, records: byLemma };
  }
  function normalizeStore(payload){
    if(!payload || typeof payload !== 'object') return createStore();
    if(payload.records && typeof payload.records === 'object') return createStore(payload.records);
    if(payload.lemmas && typeof payload.lemmas === 'object') return createStore(payload.lemmas);
    return createStore(payload);
  }
  function loadStore(){
    const adapter = storage();
    if(!adapter) return createStore();
    try {
      const raw = adapter.get(STORAGE_KEY);
      return normalizeStore(raw ? JSON.parse(raw) : null);
    } catch(e){ return createStore(); }
  }
  function saveStore(store){
    const adapter = storage();
    if(adapter) adapter.set(STORAGE_KEY, JSON.stringify(normalizeStore(store)));
    return normalizeStore(store);
  }
  function getRecord(store, entry){
    const id = typeof entry === 'string' ? entry : lemmaId(entry);
    return normalizeStore(store).records[id] || null;
  }
  function learningStatus(store, entry, dateISO = todayISO()){
    const record = getRecord(store, entry);
    if(!record) return STATUS.NOT_LEARNED;
    if(record.successCount >= 3 && clean(record.due) > dateISO) return STATUS.KNOWN;
    return STATUS.LEARNING;
  }
  function pathThreshold(path = {}){
    if(path.threshold === 'all') return null;
    const custom = clean(path.threshold).match(/^custom-(\d+)$/);
    const value = Number(custom ? custom[1] : path.threshold);
    return Number.isFinite(value) && value > 0 ? value : null;
  }
  function matchesFrequencyPath(entry = {}, path = {}){
    if(path.type !== 'frequency') return false;
    if(clean(entry.lang).toLowerCase() !== clean(path.language).toLowerCase()) return false;
    const threshold = pathThreshold(path);
    return threshold == null || (Number(entry.freq) || 0) >= threshold;
  }
  function matchesStudyPath(entry = {}, path = {}){
    if(matchesFrequencyPath(entry, path)) return true;
    if(Array.isArray(path.vocabularyIds)) return path.vocabularyIds.includes(lemmaId(entry));
    if(path.vocabularyIdSet && typeof path.vocabularyIdSet.has === 'function') return path.vocabularyIdSet.has(lemmaId(entry));
    return false;
  }
  function sortedFrequencyEntries(entries = []){
    return entries.slice().sort((a,b)=>
      (Number(b.freq) || 0) - (Number(a.freq) || 0) ||
      clean(a.lemma || a.word).localeCompare(clean(b.lemma || b.word))
    );
  }
  function notLearnedEntries(entries = [], store, path){
    return sortedFrequencyEntries(entries).filter(entry =>
      matchesStudyPath(entry, path) && learningStatus(store, entry) === STATUS.NOT_LEARNED
    );
  }
  function nextNotLearnedEntry(entries = [], store, path){
    return notLearnedEntries(entries, store, path)[0] || null;
  }
  function remainingNotLearnedCount(entries = [], store, path){
    return notLearnedEntries(entries, store, path).length;
  }
  function introduceEntry(store, entry, introducedBy = {}, dateISO = todayISO()){
    const next = normalizeStore(store);
    const id = lemmaId(entry);
    const existing = next.records[id] ? normalizeRecord(next.records[id]) : null;
    const record = existing || {
      id,
      lemma: clean(entry.lemma) || clean(entry.word),
      lang: clean(entry.lang).toLowerCase(),
      status: STATUS.LEARNING,
      successCount: 0,
      intervalDays: 0,
      due: dateISO,
      introducedAt: dateISO,
      introducedBy: { ...introducedBy },
      history: []
    };
    record.status = STATUS.LEARNING;
    record.due = clean(record.due) || dateISO;
    record.introducedAt = clean(record.introducedAt) || dateISO;
    record.introducedBy = record.introducedBy || { ...introducedBy };
    record.history = Array.isArray(record.history) ? record.history : [];
    record.history.push({ date: dateISO, result: 'introduced', source: introducedBy?.type || '' });
    next.records[id] = normalizeRecord(record);
    return next;
  }
  function recognizedInterval(successCount){
    return RECOGNIZED_INTERVALS[Math.min(Math.max(successCount, 1), RECOGNIZED_INTERVALS.length) - 1] || 14;
  }
  function reviewEntry(store, entry, result, dateISO = todayISO()){
    const next = normalizeStore(store);
    const id = lemmaId(entry);
    const base = normalizeRecord(next.records[id] || {
      id,
      lemma: clean(entry.lemma) || clean(entry.word),
      lang: clean(entry.lang).toLowerCase(),
      due: dateISO,
      introducedAt: dateISO,
      history: []
    });
    const recognized = result === 'recognized';
    if(recognized){
      base.successCount += 1;
      base.intervalDays = recognizedInterval(base.successCount);
      base.due = addDaysISO(dateISO, base.intervalDays);
    } else {
      base.successCount = 0;
      base.intervalDays = 1;
      base.due = addDaysISO(dateISO, 1);
    }
    base.status = base.successCount >= 3 && base.due > dateISO ? STATUS.KNOWN : STATUS.LEARNING;
    base.history.push({ date: dateISO, result: recognized ? 'recognized' : 'missed', successCount: base.successCount, due: base.due });
    next.records[id] = normalizeRecord(base);
    return next;
  }
  function dueEntries(entries = [], store, dateISO = todayISO()){
    const normalized = normalizeStore(store);
    return sortedFrequencyEntries(entries).filter(entry => {
      const record = getRecord(normalized, entry);
      return record && clean(record.due) <= dateISO;
    });
  }
  function persistIntroduceEntry(entry, introducedBy = {}, dateISO = todayISO()){
    return saveStore(introduceEntry(loadStore(), entry, introducedBy, dateISO));
  }
  function persistReviewEntry(entry, result, dateISO = todayISO()){
    return saveStore(reviewEntry(loadStore(), entry, result, dateISO));
  }

  return {
    STORAGE_KEY,
    STATUS,
    RECOGNIZED_INTERVALS,
    addDaysISO,
    lemmaId,
    normalizeStore,
    loadStore,
    saveStore,
    getRecord,
    learningStatus,
    pathThreshold,
    matchesFrequencyPath,
    matchesStudyPath,
    notLearnedEntries,
    nextNotLearnedEntry,
    remainingNotLearnedCount,
    introduceEntry,
    reviewEntry,
    dueEntries,
    persistIntroduceEntry,
    persistReviewEntry
  };
});
