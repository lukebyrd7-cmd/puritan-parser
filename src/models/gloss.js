/* ---------- Gloss model helpers ---------- */
(function(root, factory){
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GlossModel = api;
  Object.keys(api).forEach(key => { root[key] = root[key] || api[key]; });
})(typeof globalThis !== 'undefined' ? globalThis : this, function(){
  function nonEmpty(value){ return typeof value === 'string' && value.trim() ? value.trim() : ''; }
  function normalizeAlternateGlosses(value){
    if (Array.isArray(value)) return value.map(nonEmpty).filter(Boolean);
    const text = nonEmpty(value);
    return text ? text.split(/[,;|]/).map(nonEmpty).filter(Boolean) : [];
  }
  function createGlossFields(attrs = {}){
    return {
      primaryGloss: nonEmpty(attrs.primaryGloss),
      alternateGlosses: normalizeAlternateGlosses(attrs.alternateGlosses),
      glossSource: nonEmpty(attrs.glossSource),
      glossSourceUrl: nonEmpty(attrs.glossSourceUrl),
      glossLicense: nonEmpty(attrs.glossLicense),
      glossAttribution: nonEmpty(attrs.glossAttribution),
      customGloss: nonEmpty(attrs.customGloss)
    };
  }
  function getSourceGloss(word = {}){ return nonEmpty(word.primaryGloss) || nonEmpty(word.gloss) || ''; }
  function getDisplayGloss(word = {}){ return nonEmpty(word.customGloss) || getSourceGloss(word) || '(missing gloss)'; }
  function glossSearchText(word = {}){
    return [
      word.word, word.lemma, word.lexicalForm, word.transliteration, word.primaryGloss,
      ...normalizeAlternateGlosses(word.alternateGlosses), word.gloss, word.customGloss
    ].map(value => nonEmpty(value)).filter(Boolean).join(' ').toLowerCase();
  }
  function hasAnyGloss(word = {}){ return getDisplayGloss(word) !== '(missing gloss)'; }
  return { createGlossFields, getSourceGloss, getDisplayGloss, glossSearchText, normalizeAlternateGlosses, hasAnyGloss };
});
