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
  function splitGlossValue(value){
    return nonEmpty(value).split(/[,;|\u2022]/).map(nonEmpty).filter(Boolean);
  }
  function presentLexicalGlosses(word = {}, options = {}){
    const missingLabel = nonEmpty(options.missingLabel) || 'Gloss unavailable';
    const values = [
      ...splitGlossValue(options.primaryGloss || word.customGloss || word.primaryGloss || word.gloss),
      ...normalizeAlternateGlosses(options.alternateGlosses ?? word.alternateGlosses).flatMap(splitGlossValue)
    ];
    const seen = new Set();
    const glosses = values.filter(value => {
      const key = value.toLowerCase();
      if(!value || /^(?:\(?missing gloss\)?|unknown|n\/a|none|null|undefined|\u2014|-)$/i.test(value) || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const primaryLimit = Math.max(1, Number(options.primaryLimit) || 3);
    return {
      available: glosses.length > 0,
      primary: glosses.slice(0, primaryLimit),
      additional: glosses.slice(primaryLimit),
      all: glosses,
      compact: glosses.length ? glosses.join('; ') : missingLabel,
      primaryText: glosses.length ? glosses.slice(0, primaryLimit).join('; ') : missingLabel,
      missingLabel
    };
  }
  function glossSearchText(word = {}){
    return [
      word.word, word.lemma, word.lexicalForm, word.transliteration, word.primaryGloss,
      ...normalizeAlternateGlosses(word.alternateGlosses), word.gloss, word.customGloss
    ].map(value => nonEmpty(value)).filter(Boolean).join(' ').toLowerCase();
  }
  function hasAnyGloss(word = {}){ return getDisplayGloss(word) !== '(missing gloss)'; }
  return { createGlossFields, getSourceGloss, getDisplayGloss, glossSearchText, normalizeAlternateGlosses, presentLexicalGlosses, hasAnyGloss };
});
