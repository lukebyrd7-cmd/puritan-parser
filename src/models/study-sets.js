/* ---------- Study Sets model ---------- */
(function(root, factory){
  const api = factory(root);
  if(typeof module === 'object' && module.exports) module.exports = api;
  root.PuritanStudySets = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(root){
  const STORAGE_KEY = 'pp_study_sets';
  const VERSION = 1;
  const LANGUAGES = ['greek', 'hebrew', 'mixed'];
  const TYPES = ['vocabulary', 'grammar', 'mixed'];
  const VOCABULARY_SOURCE_KINDS = ['frequency', 'known', 'learning', 'not-learned'];

  function clean(value){ return typeof value === 'string' ? value.trim() : ''; }
  function nowISO(){ return new Date().toISOString(); }
  function storage(){
    if(root.activeStorageAdapter) return root.activeStorageAdapter;
    if(root.localStorage) return {
      get: key => root.localStorage.getItem(key),
      set: (key, value) => root.localStorage.setItem(key, value),
      remove: key => root.localStorage.removeItem(key)
    };
    return null;
  }
  function safeJson(raw, fallback = null){
    try { return raw ? JSON.parse(raw) : fallback; } catch(e){ return fallback; }
  }
  function makeId(){
    const suffix = Math.random().toString(36).slice(2, 8);
    return `study-set-${Date.now().toString(36)}-${suffix}`;
  }
  function normalizeCriteria(criteria = {}, type = 'vocabulary'){
    const source = criteria && typeof criteria === 'object' ? criteria : {};
    if(type !== 'vocabulary') return { kind: 'placeholder' };
    const kind = VOCABULARY_SOURCE_KINDS.includes(clean(source.kind)) ? clean(source.kind) : 'frequency';
    if(kind === 'frequency'){
      const threshold = clean(source.threshold) === 'all' ? 'all' : String(Math.max(1, Math.floor(Number(source.threshold) || 25)));
      return { kind, threshold };
    }
    return { kind };
  }
  function normalizeSet(input = {}, existing = null){
    const source = input && typeof input === 'object' ? input : {};
    const type = TYPES.includes(clean(source.type)) ? clean(source.type) : 'vocabulary';
    const language = LANGUAGES.includes(clean(source.language)) ? clean(source.language) : 'greek';
    const createdAt = clean(source.createdAt) || clean(existing?.createdAt) || nowISO();
    const id = clean(source.id) || clean(existing?.id) || makeId();
    return {
      id,
      title: clean(source.title) || 'Untitled Study Set',
      language,
      type,
      description: clean(source.description),
      criteria: normalizeCriteria(source.criteria, type),
      itemRefs: Array.isArray(source.itemRefs) ? source.itemRefs.map(clean).filter(Boolean) : [],
      createdAt,
      updatedAt: clean(source.updatedAt) || nowISO()
    };
  }
  function normalizeStore(payload){
    const source = payload && typeof payload === 'object' ? payload : {};
    const rawSets = Array.isArray(source.sets) ? source.sets : (Array.isArray(payload) ? payload : []);
    const seen = new Set();
    const sets = rawSets.map(item => normalizeSet(item)).filter(item => {
      if(seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
    return { schemaVersion: VERSION, sets };
  }
  function loadStore(){
    const adapter = storage();
    if(!adapter) return normalizeStore();
    return normalizeStore(safeJson(adapter.get(STORAGE_KEY), null));
  }
  function saveStore(store){
    const normalized = normalizeStore(store);
    const adapter = storage();
    if(adapter) adapter.set(STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
  }
  function listStudySets(store = loadStore()){
    return normalizeStore(store).sets.slice().sort((a, b) => clean(b.updatedAt).localeCompare(clean(a.updatedAt)));
  }
  function findStudySet(id, store = loadStore()){
    return listStudySets(store).find(item => item.id === id) || null;
  }
  function createStudySet(input = {}, store = loadStore()){
    const normalized = normalizeStore(store);
    const set = normalizeSet(input);
    normalized.sets.unshift(set);
    return { store: saveStore(normalized), set };
  }
  function renameStudySet(id, title, store = loadStore()){
    const normalized = normalizeStore(store);
    const index = normalized.sets.findIndex(item => item.id === id);
    if(index < 0) return { store: normalized, set: null };
    normalized.sets[index] = normalizeSet({ ...normalized.sets[index], title, updatedAt: nowISO() }, normalized.sets[index]);
    return { store: saveStore(normalized), set: normalized.sets[index] };
  }
  function deleteStudySet(id, store = loadStore()){
    const normalized = normalizeStore(store);
    const before = normalized.sets.length;
    normalized.sets = normalized.sets.filter(item => item.id !== id);
    return { store: saveStore(normalized), deleted: normalized.sets.length !== before };
  }
  function sourceSummary(set = {}){
    const criteria = set.criteria || {};
    const language = set.language === 'hebrew' ? 'Hebrew' : set.language === 'mixed' ? 'Mixed' : 'Greek';
    if(set.type !== 'vocabulary') return `${language} ${set.type || 'study'} foundation`;
    if(criteria.kind === 'frequency') return `${language} vocabulary ${criteria.threshold === 'all' ? 'all words' : `${criteria.threshold}+`}`;
    if(criteria.kind === 'known') return `${language} Known words`;
    if(criteria.kind === 'learning') return `${language} Learning words`;
    if(criteria.kind === 'not-learned') return `${language} Not Learned words`;
    return `${language} vocabulary`;
  }
  function vocabularyMatchesCriteria(entry = {}, set = {}, vocabModel, store){
    if(set.type !== 'vocabulary') return false;
    if(clean(entry.lang).toLowerCase() !== set.language) return false;
    if(Array.isArray(set.itemRefs) && set.itemRefs.length){
      const id = vocabModel?.lemmaId ? vocabModel.lemmaId(entry) : clean(entry.id);
      return set.itemRefs.includes(id);
    }
    const criteria = set.criteria || {};
    if(criteria.kind === 'frequency'){
      if(criteria.threshold === 'all') return true;
      return (Number(entry.freq) || 0) >= (Number(criteria.threshold) || 0);
    }
    if(!vocabModel) return false;
    const status = vocabModel.learningStatus(store, entry);
    if(criteria.kind === 'known') return status === vocabModel.STATUS.KNOWN || status === vocabModel.STATUS.KNOWN_SELF_REPORTED;
    if(criteria.kind === 'learning') return status === vocabModel.STATUS.LEARNING || status === vocabModel.STATUS.REVIEWING;
    if(criteria.kind === 'not-learned') return status === vocabModel.STATUS.NOT_LEARNED;
    return false;
  }
  function resolveVocabularyEntries(set = {}, entries = [], vocabModel, store){
    const sorted = vocabModel?.sortedFrequencyEntries
      ? vocabModel.sortedFrequencyEntries(entries)
      : entries.slice().sort((a, b) => (Number(b.freq) || 0) - (Number(a.freq) || 0));
    return sorted.filter(entry => vocabularyMatchesCriteria(entry, set, vocabModel, store));
  }

  return {
    STORAGE_KEY,
    LANGUAGES,
    TYPES,
    VOCABULARY_SOURCE_KINDS,
    normalizeSet,
    normalizeStore,
    loadStore,
    saveStore,
    listStudySets,
    findStudySet,
    createStudySet,
    renameStudySet,
    deleteStudySet,
    sourceSummary,
    vocabularyMatchesCriteria,
    resolveVocabularyEntries
  };
});
