/* ---------- Personal lexical glosses ---------- */
(function(root, factory){
  const api = factory(root);
  if(typeof module === 'object' && module.exports) module.exports = api;
  root.PuritanPersonalGlosses = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(root){
  const STORAGE_KEY = 'pp_personal_glosses';
  const VERSION = 1;
  const MODES = Object.freeze({ STANDARD: 'standard', ADD: 'add', REPLACE: 'replace' });

  function clean(value){ return typeof value === 'string' ? value.trim() : ''; }
  function senses(value){
    const values = Array.isArray(value) ? value : clean(value).split(';');
    const seen = new Set();
    return values.map(clean).filter(item => {
      const key = item.toLocaleLowerCase();
      if(!item || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  function language(value){ return clean(value).toLowerCase() === 'hebrew' ? 'hebrew' : 'greek'; }
  function vocabularyId(entry = {}){
    const explicit = clean(entry.vocabularyId || entry.id);
    if(explicit.startsWith('lemma:')) return explicit;
    const lang = language(entry.language || entry.lang);
    const lemma = clean(entry.lemma || entry.lexicalForm || entry.word);
    return lemma ? `lemma:${lang}:${lemma}` : explicit;
  }
  function emptyStore(){ return { schemaVersion: VERSION, revision: 0, records: {}, orphans: {} }; }
  function normalizeRecord(record = {}, id = ''){
    const normalizedId = clean(record.vocabularyId || id);
    const normalizedGlosses = senses(record.glosses);
    let mode = Object.values(MODES).includes(record.mode) ? record.mode : MODES.STANDARD;
    if(mode === MODES.REPLACE && !normalizedGlosses.length) mode = MODES.STANDARD;
    if(!normalizedId) return null;
    return {
      vocabularyId: normalizedId,
      language: language(record.language || normalizedId.split(':')[1]),
      mode,
      glosses: normalizedGlosses,
      updatedAt: clean(record.updatedAt),
      revision: Math.max(1, Number(record.revision) || 1)
    };
  }
  function normalizeStore(value = {}){
    const source = value && typeof value === 'object' ? value : {};
    const store = emptyStore();
    store.revision = Math.max(0, Number(source.revision) || 0);
    for(const area of ['records','orphans']){
      const records = source[area] && typeof source[area] === 'object' ? source[area] : {};
      Object.entries(records).forEach(([id, record]) => {
        const normalized = normalizeRecord(record, id);
        if(normalized) store[area][normalized.vocabularyId] = normalized;
      });
    }
    return store;
  }
  function adapter(custom){ return custom || root.localStorage; }
  function loadStore(custom){
    try { return normalizeStore(JSON.parse(adapter(custom)?.getItem?.(STORAGE_KEY) || 'null')); }
    catch(error){ return emptyStore(); }
  }
  function saveStore(store, custom){
    const normalized = normalizeStore(store);
    adapter(custom)?.setItem?.(STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
  }
  function recordFor(entry, store = loadStore()){
    const id = typeof entry === 'string' ? clean(entry) : vocabularyId(entry);
    return store.records[id] || store.orphans[id] || null;
  }
  function setRecord(entry, input = {}, custom){
    const id = vocabularyId(entry);
    if(!id) throw new Error('A stable vocabulary ID is required.');
    const store = loadStore(custom);
    const previous = store.records[id] || store.orphans[id];
    const glosses = senses(input.glosses);
    const mode = Object.values(MODES).includes(input.mode) ? input.mode : MODES.STANDARD;
    if(mode === MODES.REPLACE && !glosses.length) throw new Error('Use my glosses requires at least one gloss.');
    if(mode === MODES.STANDARD && !glosses.length){
      delete store.records[id]; delete store.orphans[id];
    } else {
      store.records[id] = normalizeRecord({
        vocabularyId: id,
        language: language(entry.language || entry.lang),
        mode,
        glosses,
        updatedAt: new Date().toISOString(),
        revision: (Number(previous?.revision) || 0) + 1
      }, id);
      delete store.orphans[id];
    }
    store.revision += 1;
    const saved = saveStore(store, custom);
    root.dispatchEvent?.(new CustomEvent('puritan-personal-glosses-changed', { detail: { vocabularyId: id } }));
    return saved.records[id] || null;
  }
  function restore(entry, custom){ return setRecord(entry, { mode: MODES.STANDARD, glosses: [] }, custom); }
  function resolve(entry, options = {}){
    const stored = options.personal === undefined ? recordFor(entry, options.store || loadStore(options.adapter)) : options.personal;
    const personal = stored || (clean(entry?.customGloss) ? { mode: MODES.REPLACE, glosses: [entry.customGloss] } : null);
    const resolver = root.GlossModel?.resolveLexicalGloss;
    return resolver ? resolver(entry, { ...options, personal }) : null;
  }
  function exportState(custom){ return loadStore(custom); }
  function importState(payload, options = {}, custom){
    const incoming = normalizeStore(payload);
    const current = options.replace ? emptyStore() : loadStore(custom);
    const knownIds = options.knownIds instanceof Set ? options.knownIds : null;
    for(const area of ['records','orphans']) Object.values(incoming[area]).forEach(record => {
      const target = knownIds && !knownIds.has(record.vocabularyId) ? 'orphans' : 'records';
      const existing = current.records[record.vocabularyId] || current.orphans[record.vocabularyId];
      if(!existing || record.revision >= existing.revision){
        delete current.records[record.vocabularyId]; delete current.orphans[record.vocabularyId];
        current[target][record.vocabularyId] = record;
      }
    });
    current.revision = Math.max(current.revision, incoming.revision) + 1;
    return saveStore(current, custom);
  }
  return { STORAGE_KEY, VERSION, MODES, senses, vocabularyId, normalizeRecord, normalizeStore, loadStore, saveStore, recordFor, setRecord, restore, resolve, exportState, importState };
});
