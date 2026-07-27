/* ---------- Vocabulary learning model ---------- */
(function(root, factory){
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.VocabularyLearning = api;
  Object.keys(api).forEach(key => { root[key] = root[key] || api[key]; });
})(typeof globalThis !== 'undefined' ? globalThis : this, function(root){
  const STORAGE_KEY = 'pp_vocab_learning';
  const STATUS = {
    NOT_LEARNED: 'Not Learned',
    LEARNING: 'Learning',
    REVIEWING: 'Reviewing',
    KNOWN: 'Known',
    KNOWN_SELF_REPORTED: 'Known by Self-Report'
  };
  const RECOGNIZED_INTERVALS = [1, 3, 7];
  const MAX_MAINTENANCE_HISTORY = 20;
  const KNOWN_SOURCES = { REVIEW: 'review', MANUAL: 'manual', SELF_REPORTED: 'self_reported' };
  let cachedRaw = null;
  let cachedStore = null;

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
  function normalizeKnownSource(value, status){
    const cleanValue = clean(value).toLowerCase();
    if(cleanValue === KNOWN_SOURCES.MANUAL || cleanValue === KNOWN_SOURCES.SELF_REPORTED) return cleanValue;
    if(status === STATUS.KNOWN && cleanValue) return cleanValue;
    if(status === STATUS.KNOWN) return KNOWN_SOURCES.MANUAL;
    if(status === STATUS.KNOWN_SELF_REPORTED) return KNOWN_SOURCES.SELF_REPORTED;
    return KNOWN_SOURCES.REVIEW;
  }
  function normalizeRecord(record = {}){
    const rawStatus = clean(record.status);
    const status = Object.values(STATUS).includes(rawStatus) && rawStatus !== STATUS.NOT_LEARNED ? rawStatus : STATUS.LEARNING;
    const next = {
      id: clean(record.id),
      lemma: clean(record.lemma),
      lang: clean(record.lang).toLowerCase(),
      status,
      successCount: Math.max(0, Number(record.successCount) || 0),
      intervalDays: Math.max(0, Number(record.intervalDays) || 0),
      due: clean(record.due) || todayISO(),
      lastReviewed: clean(record.lastReviewed),
      knownSource: normalizeKnownSource(record.knownSource, status),
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
      if(raw === cachedRaw && cachedStore) return cachedStore;
      cachedRaw = raw;
      cachedStore = normalizeStore(raw ? JSON.parse(raw) : null);
      return cachedStore;
    } catch(e){ return createStore(); }
  }
  function saveStore(store){
    const adapter = storage();
    const normalized = normalizeStore(store);
    const raw = JSON.stringify(normalized);
    if(adapter) adapter.set(STORAGE_KEY, raw);
    cachedRaw = raw;
    cachedStore = normalized;
    root.ProgressService?.invalidateProgressCache?.();
    return normalized;
  }
  function getRecord(store, entry){
    const id = typeof entry === 'string' ? entry : lemmaId(entry);
    return normalizeStore(store).records[id] || null;
  }
  function learningStatusForRecord(record, dateISO = todayISO()){
    if(!record) return STATUS.NOT_LEARNED;
    if(record.knownSource === KNOWN_SOURCES.SELF_REPORTED || record.status === STATUS.KNOWN_SELF_REPORTED) return STATUS.KNOWN_SELF_REPORTED;
    if(record.status === STATUS.KNOWN && record.knownSource === KNOWN_SOURCES.MANUAL) return STATUS.KNOWN;
    if(record.successCount >= 3 && clean(record.due) > dateISO) return STATUS.KNOWN;
    if(record.successCount > 0 || record.intervalDays > 1) return STATUS.REVIEWING;
    return STATUS.LEARNING;
  }
  function learningStatus(store, entry, dateISO = todayISO()){
    return learningStatusForRecord(getRecord(store, entry), dateISO);
  }
  function formatDateLabel(dateISO, today = todayISO()){
    const date = clean(dateISO);
    if(!date) return 'Not scheduled';
    if(date === '9999-12-31') return 'No scheduled review';
    if(date < today) return `Overdue since ${date}`;
    if(date === today) return 'Due today';
    return date;
  }
  function formatInterval(days){
    const value = Number(days) || 0;
    if(value <= 0) return 'Not scheduled';
    if(value === 1) return '1 day';
    return `${value} days`;
  }
  function reviewHistorySummary(record = {}){
    const history = Array.isArray(record.history) ? record.history : [];
    const reviews = history.filter(item => item?.result === 'recognized' || item?.result === 'missed');
    const recognized = reviews.filter(item => item.result === 'recognized').length;
    const missed = reviews.filter(item => item.result === 'missed').length;
    if(!reviews.length) return 'No reviews yet.';
    return `${reviews.length} reviews: ${recognized} recognized, ${missed} missed.`;
  }
  function statusExplanation(status, record = {}, dateISO = todayISO()){
    if(status === STATUS.NOT_LEARNED) return 'New word. Not in review yet.';
    if(status === STATUS.KNOWN_SELF_REPORTED) return 'Known by self-report. Will be sampled gradually for maintenance.';
    if(status === STATUS.KNOWN) return record.due === '9999-12-31'
      ? 'Known. No maintenance review scheduled.'
      : `Known. Next maintenance review ${formatDateLabel(record.due, dateISO).toLowerCase()}.`;
    if(status === STATUS.REVIEWING) return `Reviewing every ${formatInterval(record.intervalDays)}.`;
    const due = clean(record.due) <= dateISO ? 'Due today.' : `Next review ${formatDateLabel(record.due, dateISO)}.`;
    return `Still being learned. ${due}`;
  }
  function learningStatusDetails(store, entry, dateISO = todayISO()){
    const record = getRecord(store, entry);
    const status = learningStatus(store, entry, dateISO);
    const safeRecord = record || {};
    const history = Array.isArray(safeRecord.history) ? safeRecord.history : [];
    const totalReviews = history.filter(item => item?.result === 'recognized' || item?.result === 'missed').length;
    const due = clean(safeRecord.due);
    const dueState = !record ? 'not-scheduled' : due <= dateISO ? (due < dateISO ? 'overdue' : 'due-today') : 'due-later';
    return {
      status,
      label: status,
      dueState,
      nextReview: due || '',
      nextReviewLabel: formatDateLabel(due, dateISO),
      intervalDays: Number(safeRecord.intervalDays) || 0,
      intervalLabel: formatInterval(safeRecord.intervalDays),
      successfulReviews: Number(safeRecord.successCount) || 0,
      totalReviews,
      lastReviewed: clean(safeRecord.lastReviewed),
      lastReviewedLabel: safeRecord.lastReviewed ? formatDateLabel(safeRecord.lastReviewed, dateISO) : 'Not reviewed yet',
      historySummary: reviewHistorySummary(safeRecord),
      knownSource: safeRecord.knownSource || '',
      explanation: statusExplanation(status, safeRecord, dateISO)
    };
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
    record.knownSource = KNOWN_SOURCES.REVIEW;
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
    base.status = base.successCount >= 3 && base.due > dateISO ? STATUS.KNOWN : (base.successCount > 0 ? STATUS.REVIEWING : STATUS.LEARNING);
    base.knownSource = KNOWN_SOURCES.REVIEW;
    base.lastReviewed = dateISO;
    base.history.push({ date: dateISO, result: recognized ? 'recognized' : 'missed', successCount: base.successCount, intervalDays: base.intervalDays, due: base.due, status: base.status });
    next.records[id] = normalizeRecord(base);
    return next;
  }
  function trimMaintenanceHistory(history = []){
    let remaining = MAX_MAINTENANCE_HISTORY;
    return history.slice().reverse().filter(event => {
      if(event?.practice !== 'maintenance') return true;
      if(remaining <= 0) return false;
      remaining -= 1;
      return true;
    }).reverse();
  }
  function maintenancePracticeEntry(store, entry, result, options = {}, dateISO = todayISO()){
    const adjustSchedule = options.adjustSchedule === true;
    const normalizedResult = result === 'missed' ? 'missed' : 'recognized';
    const next = adjustSchedule ? reviewEntry(store, entry, normalizedResult, dateISO) : normalizeStore(store);
    const id = lemmaId(entry);
    const record = normalizeRecord(next.records[id] || {
      id,
      lemma: clean(entry.lemma) || clean(entry.word),
      lang: clean(entry.lang).toLowerCase(),
      status: STATUS.KNOWN,
      successCount: 3,
      intervalDays: 0,
      due: '9999-12-31',
      introducedAt: dateISO,
      history: []
    });
    if(adjustSchedule && record.history.length){
      record.history[record.history.length - 1] = {
        ...record.history[record.history.length - 1],
        practice: 'maintenance',
        scheduleAdjusted: true
      };
    } else {
      record.history.push({
        date: dateISO,
        result: normalizedResult,
        practice: 'maintenance',
        scheduleAdjusted: false
      });
    }
    record.history = trimMaintenanceHistory(record.history);
    next.records[id] = normalizeRecord(record);
    return next;
  }
  function markEntryKnown(store, entry, source = {}, dateISO = todayISO()){
    const next = normalizeStore(store);
    const id = lemmaId(entry);
    const existing = next.records[id] ? normalizeRecord(next.records[id]) : null;
    const record = existing || {
      id,
      lemma: clean(entry.lemma) || clean(entry.word),
      lang: clean(entry.lang).toLowerCase(),
      introducedAt: dateISO,
      introducedBy: { ...source },
      history: []
    };
    record.status = STATUS.KNOWN;
    record.successCount = Math.max(3, Number(record.successCount) || 0);
    record.intervalDays = Math.max(0, Number(record.intervalDays) || 0);
    record.due = '9999-12-31';
    record.knownSource = source?.knownSource || KNOWN_SOURCES.MANUAL;
    record.introducedAt = clean(record.introducedAt) || dateISO;
    record.introducedBy = record.introducedBy || { ...source };
    record.history = Array.isArray(record.history) ? record.history : [];
    record.history.push({ date: dateISO, result: 'marked-known', source: source?.type || '', knownSource: record.knownSource, due: record.due });
    next.records[id] = normalizeRecord(record);
    return next;
  }
  function markPathKnown(entries = [], store, path = {}, dateISO = todayISO()){
    const normalized = normalizeStore(store);
    const targets = notLearnedEntries(entries, normalized, path);
    const next = targets.reduce((current, entry) => markEntryKnown(current, entry, path, dateISO), normalized);
    return { store: next, count: targets.length, ids: targets.map(lemmaId) };
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
  function persistMaintenancePracticeEntry(entry, result, options = {}, dateISO = todayISO()){
    return saveStore(maintenancePracticeEntry(loadStore(), entry, result, options, dateISO));
  }

  return {
    STORAGE_KEY,
    STATUS,
    KNOWN_SOURCES,
    RECOGNIZED_INTERVALS,
    addDaysISO,
    lemmaId,
    normalizeStore,
    loadStore,
    saveStore,
    getRecord,
    learningStatusForRecord,
    learningStatus,
    learningStatusDetails,
    formatDateLabel,
    formatInterval,
    reviewHistorySummary,
    pathThreshold,
    matchesFrequencyPath,
    matchesStudyPath,
    notLearnedEntries,
    nextNotLearnedEntry,
    remainingNotLearnedCount,
    introduceEntry,
    reviewEntry,
    MAX_MAINTENANCE_HISTORY,
    maintenancePracticeEntry,
    markEntryKnown,
    markPathKnown,
    dueEntries,
    persistIntroduceEntry,
    persistReviewEntry,
    persistMaintenancePracticeEntry
  };
});
