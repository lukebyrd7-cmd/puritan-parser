/* ---------- Saved vocabulary model ---------- */
(function(root, factory){
  const api = factory(root);
  if(typeof module === 'object' && module.exports) module.exports = api;
  root.PuritanSavedVocabulary = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(root){
  const STORAGE_KEY = 'pp_saved_vocabulary';
  const VERSION = 1;

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
  function lemmaId(entry = {}){
    const lang = clean(entry.lang).toLowerCase() || 'unknown';
    const lemma = clean(entry.lemma) || clean(entry.word) || clean(entry.lexicalForm) || clean(entry.id);
    return clean(entry.id).startsWith(`lemma:${lang}:`) ? clean(entry.id) : `lemma:${lang}:${lemma}`;
  }
  function normalizeItem(item = {}){
    const source = item && typeof item === 'object' ? item : {};
    const lang = clean(source.lang).toLowerCase();
    const lemma = clean(source.lemma || source.word);
    const id = clean(source.id) || (lang && lemma ? `lemma:${lang}:${lemma}` : '');
    if(!lang || !lemma || !id) return null;
    return {
      id,
      lang,
      lemma,
      savedAt: clean(source.savedAt) || nowISO()
    };
  }
  function normalizeStore(payload){
    const source = payload && typeof payload === 'object' ? payload : {};
    const rawItems = Array.isArray(source.items) ? source.items : (Array.isArray(payload) ? payload : Object.values(source.items || source.saved || {}));
    const items = {};
    rawItems.map(normalizeItem).filter(Boolean).forEach(item => { items[item.id] = item; });
    return { schemaVersion: VERSION, items };
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
  function isSaved(entry = {}, store = loadStore()){
    const id = typeof entry === 'string' ? entry : lemmaId(entry);
    return Boolean(normalizeStore(store).items[id]);
  }
  function saveEntry(entry = {}, store = loadStore()){
    const item = normalizeItem({ ...entry, id: lemmaId(entry) });
    const normalized = normalizeStore(store);
    if(!item) return { store: normalized, item: null, saved: false };
    const saved = !normalized.items[item.id];
    normalized.items[item.id] = normalized.items[item.id] || item;
    return { store: saveStore(normalized), item: normalized.items[item.id], saved };
  }
  function unsaveEntry(entry = {}, store = loadStore()){
    const id = typeof entry === 'string' ? entry : lemmaId(entry);
    const normalized = normalizeStore(store);
    const removed = Boolean(normalized.items[id]);
    delete normalized.items[id];
    return { store: saveStore(normalized), removed };
  }
  function toggleEntry(entry = {}, store = loadStore()){
    return isSaved(entry, store) ? unsaveEntry(entry, store) : saveEntry(entry, store);
  }
  function savedIds(store = loadStore()){
    return Object.keys(normalizeStore(store).items);
  }

  return { STORAGE_KEY, normalizeStore, loadStore, saveStore, lemmaId, isSaved, saveEntry, unsaveEntry, toggleEntry, savedIds };
});
