/* ---------- Study Sets model ---------- */
(function(root, factory){
  const api = factory(root);
  if(typeof module === 'object' && module.exports) module.exports = api;
  root.PuritanStudySets = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(root){
  const STORAGE_KEY = 'pp_study_sets';
  const VERSION = 2;
  const LANGUAGES = ['greek', 'hebrew', 'mixed'];
  const TYPES = ['vocabulary', 'grammar', 'mixed'];
  const VOCABULARY_SOURCE_KINDS = ['frequency', 'known', 'learning', 'not-learned', 'hand-picked', 'saved', 'overdue', 'book', 'chapter'];

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
    if(root.crypto?.randomUUID) return `study-set-${root.crypto.randomUUID()}`;
    const suffix = Math.random().toString(36).slice(2, 8);
    return `study-set-${Date.now().toString(36)}-${suffix}`;
  }
  function normalizeCriteria(criteria = {}, type = 'vocabulary'){
    const source = criteria && typeof criteria === 'object' ? criteria : {};
    if(type !== 'vocabulary') return { kind: 'placeholder' };
    const kind = VOCABULARY_SOURCE_KINDS.includes(clean(source.kind)) ? clean(source.kind) : 'frequency';
    if(kind === 'frequency'){
      const threshold = clean(source.threshold) === 'all' ? 'all' : String(Math.max(1, Math.floor(Number(source.minimum || source.threshold) || 25)));
      const maximumNumber = Number(source.maximum);
      const maximum = Number.isFinite(maximumNumber) && maximumNumber >= Number(threshold) ? String(Math.floor(maximumNumber)) : '';
      return Object.prototype.hasOwnProperty.call(source, 'minimum') || Object.prototype.hasOwnProperty.call(source, 'maximum')
        ? { kind, threshold, minimum: threshold, maximum }
        : { kind, threshold };
    }
    if(kind === 'book' || kind === 'chapter'){
      const threshold = clean(source.threshold) === 'all' ? 'all' : (clean(source.threshold) ? String(Math.max(1, Math.floor(Number(source.threshold) || 1))) : 'all');
      const status = ['all','known','learning','not-learned','overdue','saved'].includes(clean(source.status)) ? clean(source.status) : 'all';
      return {
        kind,
        bookId: clean(source.bookId || source.book),
        bookName: clean(source.bookName),
        chapter: kind === 'chapter' ? Math.max(1, Math.floor(Number(source.chapter) || 1)) : '',
        threshold,
        status,
        vocabularyIds: Array.isArray(source.vocabularyIds) ? source.vocabularyIds.map(clean).filter(Boolean) : []
      };
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
      title: clean(source.title) || 'Untitled Custom Deck',
      language,
      type,
      description: clean(source.description),
      criteria: normalizeCriteria(source.criteria, type),
      itemRefs: Array.isArray(source.itemRefs) ? source.itemRefs.map(clean).filter(Boolean) : [],
      excludedItemRefs: Array.isArray(source.excludedItemRefs) ? [...new Set(source.excludedItemRefs.map(clean).filter(Boolean))] : [],
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
    return { schemaVersion: VERSION, revision: Math.max(0, Number(source.revision) || 0), sets };
  }
  function loadStore(){
    const adapter = storage();
    if(!adapter) return normalizeStore();
    return normalizeStore(safeJson(adapter.get(STORAGE_KEY), null));
  }
  function saveStore(store){
    const normalized = normalizeStore(store);
    normalized.revision += 1;
    const adapter = storage();
    if(adapter) adapter.set(STORAGE_KEY, JSON.stringify(normalized));
    root.LearningPractice?.bumpRevision?.();
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
    const normalized = normalizeStore(store);
    const index = normalized.sets.findIndex(set => set.id === id);
    if(index < 0) return { store: normalized, set: null, added: false };
    const entryId = clean(entry.id) || `lemma:${lang}:${lemma}`;
    normalized.sets[index].excludedItemRefs = normalized.sets[index].excludedItemRefs.filter(value => value !== entryId);
    return addExplicitItemToStudySet(id, { type: 'vocabulary', lang, lemma, id: entryId }, normalized);
  }
  function removeVocabularyItemFromStudySet(id, entry = {}, store = loadStore()){
    const normalized = normalizeStore(store);
    const index = normalized.sets.findIndex(set => set.id === id);
    if(index < 0) return { store: normalized, set: null, removed: false };
    const set = normalizeSet(normalized.sets[index]);
    const lang = clean(entry.lang).toLowerCase();
    const lemma = clean(entry.lemma || entry.word);
    const entryId = clean(entry.id) || `lemma:${lang}:${lemma}`;
    const before = set.explicitItems.length;
    set.explicitItems = set.explicitItems.filter(item => !(item.type === 'vocabulary' && (item.id === entryId || (item.lang === lang && item.lemma === lemma))));
    if(set.criteria.kind !== 'hand-picked' && !set.excludedItemRefs.includes(entryId)) set.excludedItemRefs.push(entryId);
    set.updatedAt = nowISO();
    normalized.sets[index] = normalizeSet(set);
    return { store: saveStore(normalized), set: normalized.sets[index], removed: before !== set.explicitItems.length || set.criteria.kind !== 'hand-picked' };
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
    if(criteria.kind === 'frequency'){
      const legacy = !Object.prototype.hasOwnProperty.call(criteria, 'minimum') && !Object.prototype.hasOwnProperty.call(criteria, 'maximum');
      const range = criteria.threshold === 'all' ? 'all words' : criteria.maximum ? `${criteria.minimum || criteria.threshold}–${criteria.maximum} occurrences` : legacy ? `${criteria.threshold}x and higher` : `${criteria.minimum || criteria.threshold}+ occurrences`;
      return `${language} vocabulary, ${range}${explicitCount ? ` + ${explicitCount} hand-picked` : ''}`;
    }
    if(criteria.kind === 'known') return `${language} Known words`;
    if(criteria.kind === 'learning') return `${language} Learning words`;
    if(criteria.kind === 'not-learned') return `${language} Not Learned words`;
    if(criteria.kind === 'saved') return `Saved ${language} words`;
    if(criteria.kind === 'overdue') return `${language} review backlog`;
    if(criteria.kind === 'book') return `${criteria.status === 'all' ? '' : `${criteria.status.replace('-', ' ')} `}${language} words from ${criteria.bookName || criteria.bookId || 'a book'}`.trim();
    if(criteria.kind === 'chapter') return `${criteria.status === 'all' ? '' : `${criteria.status.replace('-', ' ')} `}${language} words from ${criteria.bookName || criteria.bookId || 'a book'} ${criteria.chapter || 1}`.trim();
    return `${language} vocabulary`;
  }
  function statusMatchesCriterion(entry = {}, status = 'all', vocabModel, store, savedModel){
    if(status === 'all') return true;
    if(status === 'saved') return Boolean(savedModel?.isSaved?.(entry));
    if(!vocabModel) return false;
    const value = vocabModel.learningStatus(store, entry);
    if(status === 'known') return value === vocabModel.STATUS.KNOWN || value === vocabModel.STATUS.KNOWN_SELF_REPORTED;
    if(status === 'learning') return value === vocabModel.STATUS.LEARNING || value === vocabModel.STATUS.REVIEWING;
    if(status === 'not-learned') return value === vocabModel.STATUS.NOT_LEARNED;
    if(status === 'overdue'){
      const details = vocabModel.learningStatusDetails?.(store, entry);
      return details?.dueState === 'overdue' || details?.dueState === 'due-today';
    }
    return false;
  }
  function thresholdMatchesEntry(entry = {}, threshold = 'all', maximum = ''){
    if(threshold === 'all' || !clean(threshold)) return true;
    const frequency = Number(entry.freq) || 0;
    return frequency >= (Number(threshold) || 0) && (!clean(maximum) || frequency <= Number(maximum));
  }
  function vocabularyMatchesCriteria(entry = {}, set = {}, vocabModel, store, savedModel){
    if(set.type !== 'vocabulary') return false;
    if(clean(entry.lang).toLowerCase() !== set.language) return false;
    const criteria = set.criteria || {};
    if(criteria.kind === 'hand-picked') return false;
    if(criteria.kind === 'frequency'){
      return thresholdMatchesEntry(entry, criteria.minimum || criteria.threshold, criteria.maximum);
    }
    if(criteria.kind === 'saved') return Boolean(savedModel?.isSaved?.(entry));
    if(criteria.kind === 'overdue') return statusMatchesCriterion(entry, 'overdue', vocabModel, store, savedModel);
    if(criteria.kind === 'known' || criteria.kind === 'learning' || criteria.kind === 'not-learned') return statusMatchesCriterion(entry, criteria.kind, vocabModel, store, savedModel);
    if(criteria.kind === 'book' || criteria.kind === 'chapter'){
      const id = vocabModel?.lemmaId ? vocabModel.lemmaId(entry) : clean(entry.id);
      const scoped = Array.isArray(criteria.vocabularyIds) && criteria.vocabularyIds.includes(id);
      return scoped && thresholdMatchesEntry(entry, criteria.threshold) && statusMatchesCriterion(entry, criteria.status, vocabModel, store, savedModel);
    }
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
  function resolveVocabularyEntries(set = {}, entries = [], vocabModel, store, savedModel){
    const sorted = vocabModel?.sortedFrequencyEntries
      ? vocabModel.sortedFrequencyEntries(entries)
      : entries.slice().sort((a, b) => (Number(b.freq) || 0) - (Number(a.freq) || 0));
    const seen = new Set();
    const excluded = new Set(Array.isArray(set.excludedItemRefs) ? set.excludedItemRefs : []);
    return [
      ...sorted.filter(entry => vocabularyMatchesCriteria(entry, set, vocabModel, store, savedModel)),
      ...resolveExplicitVocabularyEntries(set, sorted, vocabModel)
    ].filter(entry => {
      const key = vocabModel?.lemmaId ? vocabModel.lemmaId(entry) : clean(entry.id || entry.lemma || entry.word);
      if(excluded.has(key)) return false;
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
    removeVocabularyItemFromStudySet,
    explicitItemsOfType,
    sourceSummary,
    vocabularyMatchesCriteria,
    resolveExplicitVocabularyEntries,
    resolveVocabularyEntries
  };
});
