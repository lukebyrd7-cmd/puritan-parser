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
  const VOCABULARY_SOURCE_KINDS = ['frequency', 'known', 'learning', 'not-learned', 'hand-picked'];

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
  function normalizeExplicitItem(input = {}){
    const source = input && typeof input === 'object' ? input : {};
    const type = clean(source.type) || 'vocabulary';
    if(type === 'vocabulary'){
      const lang = LANGUAGES.includes(clean(source.lang)) && clean(source.lang) !== 'mixed' ? clean(source.lang) : '';
      const lemma = clean(source.lemma);
      if(!lang || !lemma) return null;
      return {
        type: 'vocabulary',
        lang,
        lemma,
        id: clean(source.id) || `lemma:${lang}:${lemma}`
      };
    }
    if(type === 'paradigm'){
      const lang = LANGUAGES.includes(clean(source.lang)) && clean(source.lang) !== 'mixed' ? clean(source.lang) : '';
      const category = clean(source.category);
      if(!lang || !category) return null;
      return { type: 'paradigm', lang, category, title: clean(source.title) };
    }
    return null;
  }
  function explicitItemKey(item = {}){
    if(item.type === 'vocabulary') return `vocabulary:${item.lang}:${item.lemma}`;
    if(item.type === 'paradigm') return `paradigm:${item.lang}:${item.category}`;
    return JSON.stringify(item);
  }
  function normalizeExplicitItems(items = []){
    const seen = new Set();
    return (Array.isArray(items) ? items : []).map(normalizeExplicitItem).filter(item => {
      if(!item) return false;
      const key = explicitItemKey(item);
      if(seen.has(key)) return false;
      seen.add(key);
      return true;
    });
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
      explicitItems: normalizeExplicitItems(source.explicitItems || source.items),
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
  function addExplicitItemToStudySet(id, item, store = loadStore()){
    const normalized = normalizeStore(store);
    const index = normalized.sets.findIndex(set => set.id === id);
    const explicitItem = normalizeExplicitItem(item);
    if(index < 0 || !explicitItem) return { store: normalized, set: null, added: false };
    const set = normalizeSet(normalized.sets[index]);
    const existing = new Set(set.explicitItems.map(explicitItemKey));
    const key = explicitItemKey(explicitItem);
    const added = !existing.has(key);
    if(added) set.explicitItems.push(explicitItem);
    set.updatedAt = nowISO();
    normalized.sets[index] = normalizeSet(set);
    return { store: saveStore(normalized), set: normalized.sets[index], added };
  }
  function addVocabularyItemToStudySet(id, entry = {}, store = loadStore()){
    const lang = clean(entry.lang).toLowerCase();
    const lemma = clean(entry.lemma || entry.word);
    return addExplicitItemToStudySet(id, { type: 'vocabulary', lang, lemma, id: clean(entry.id) || `lemma:${lang}:${lemma}` }, store);
  }
  function explicitItemsOfType(set = {}, type = ''){
    return normalizeExplicitItems(set.explicitItems).filter(item => !type || item.type === type);
  }
  function sourceSummary(set = {}){
    const criteria = set.criteria || {};
    const language = set.language === 'hebrew' ? 'Hebrew' : set.language === 'mixed' ? 'Mixed' : 'Greek';
    if(set.type !== 'vocabulary') return `${language} ${set.type || 'study'} foundation`;
    const explicitCount = explicitItemsOfType(set, 'vocabulary').length;
    if(criteria.kind === 'hand-picked') return `Hand-picked ${language} vocabulary collection`;
    if(criteria.kind === 'frequency') return `${language} vocabulary, ${criteria.threshold === 'all' ? 'all words' : `${criteria.threshold}x and higher`}${explicitCount ? ` + ${explicitCount} hand-picked` : ''}`;
    if(criteria.kind === 'known') return `${language} Known words`;
    if(criteria.kind === 'learning') return `${language} Learning words`;
    if(criteria.kind === 'not-learned') return `${language} Not Learned words`;
    return `${language} vocabulary`;
  }
  function vocabularyMatchesCriteria(entry = {}, set = {}, vocabModel, store){
    if(set.type !== 'vocabulary') return false;
    if(clean(entry.lang).toLowerCase() !== set.language) return false;
    const criteria = set.criteria || {};
    if(criteria.kind === 'hand-picked') return false;
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
  function vocabularyMatchesExplicitItem(entry = {}, item = {}, vocabModel){
    if(item.type !== 'vocabulary') return false;
    if(clean(entry.lang).toLowerCase() !== item.lang) return false;
    const id = vocabModel?.lemmaId ? vocabModel.lemmaId(entry) : clean(entry.id);
    return id === item.id || clean(entry.lemma || entry.word) === item.lemma;
  }
  function resolveExplicitVocabularyEntries(set = {}, entries = [], vocabModel){
    const items = explicitItemsOfType(set, 'vocabulary');
    if(!items.length && Array.isArray(set.itemRefs) && set.itemRefs.length){
      return entries.filter(entry => {
        const id = vocabModel?.lemmaId ? vocabModel.lemmaId(entry) : clean(entry.id);
        return set.itemRefs.includes(id);
      });
    }
    return entries.filter(entry => items.some(item => vocabularyMatchesExplicitItem(entry, item, vocabModel)));
  }
  function resolveVocabularyEntries(set = {}, entries = [], vocabModel, store){
    const sorted = vocabModel?.sortedFrequencyEntries
      ? vocabModel.sortedFrequencyEntries(entries)
      : entries.slice().sort((a, b) => (Number(b.freq) || 0) - (Number(a.freq) || 0));
    const seen = new Set();
    return [
      ...sorted.filter(entry => vocabularyMatchesCriteria(entry, set, vocabModel, store)),
      ...resolveExplicitVocabularyEntries(set, sorted, vocabModel)
    ].filter(entry => {
      const key = vocabModel?.lemmaId ? vocabModel.lemmaId(entry) : clean(entry.id || entry.lemma || entry.word);
      if(seen.has(key)) return false;
      seen.add(key);
      return true;
    });
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
    addExplicitItemToStudySet,
    addVocabularyItemToStudySet,
    explicitItemsOfType,
    sourceSummary,
    vocabularyMatchesCriteria,
    resolveExplicitVocabularyEntries,
    resolveVocabularyEntries
  };
});
