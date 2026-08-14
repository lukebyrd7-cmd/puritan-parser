/* ---------- Canonical vocabulary forms ---------- */
(function(root, factory){
  const api = factory();
  if(typeof module === 'object' && module.exports) module.exports = api;
  root.CanonicalVocabularyForms = api;
  root.getCanonicalVocabularyForm = api.resolve;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(){
  const maps = { greek: new Map(), hebrew: new Map() };

  function clean(value){ return typeof value === 'string' ? value.trim() : ''; }
  function languageOf(entry = {}){ return clean(entry.lang || entry.language).toLowerCase() === 'hebrew' ? 'hebrew' : 'greek'; }
  function identityOf(entry = {}, language = languageOf(entry)){
    const id = clean(entry.id);
    if(id.startsWith(`lemma:${language}:`)) return id.slice(`lemma:${language}:`.length);
    return clean(entry.lemma) || clean(entry.lexicalId);
  }
  function hasLanguageScript(value, language){
    return language === 'hebrew' ? /[\u0590-\u05ff]/.test(value) : /[\u0370-\u03ff\u1f00-\u1fff]/.test(value);
  }
  function normalizePayload(payload = {}){
    const source = payload.forms && typeof payload.forms === 'object' ? payload.forms : payload;
    return {
      greek: source.greek && typeof source.greek === 'object' ? source.greek : {},
      hebrew: source.hebrew && typeof source.hebrew === 'object' ? source.hebrew : {}
    };
  }
  function setMap(payload = {}){
    const normalized = normalizePayload(payload);
    for(const language of ['greek', 'hebrew']){
      maps[language] = new Map(Object.entries(normalized[language]).map(([id, form]) => [clean(id), clean(form)]).filter(([id, form]) => id && form));
    }
    return counts();
  }
  function counts(){ return { greek: maps.greek.size, hebrew: maps.hebrew.size }; }
  function resolve(entry = {}, options = {}){
    const language = options.language === 'hebrew' ? 'hebrew' : options.language === 'greek' ? 'greek' : languageOf(entry);
    const identity = clean(options.identity) || identityOf(entry, language);
    const mapped = maps[language].get(identity);
    if(mapped) return mapped;
    const explicit = clean(entry.canonicalForm);
    if(explicit && hasLanguageScript(explicit, language)) return explicit;
    const lexical = clean(entry.lexicalForm);
    if(lexical && hasLanguageScript(lexical, language)) return lexical;
    const lemma = clean(entry.lemma);
    if(lemma && hasLanguageScript(lemma, language)) return lemma;
    return '';
  }
  function apply(entry = {}){
    const canonicalForm = resolve(entry);
    return canonicalForm ? { ...entry, canonicalForm, lexicalForm: canonicalForm } : { ...entry };
  }
  return { setMap, counts, resolve, apply, identityOf };
});
