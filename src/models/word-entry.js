/* ---------- WordEntry model ---------- */
function createWordEntry(attrs = {}){
  return {
    id: attrs.id || '',
    lang: attrs.lang || 'greek',
    word: attrs.word || '',
    lemma: attrs.lemma || '',
    lexicalForm: attrs.lexicalForm || '',
    canonicalForm: attrs.canonicalForm || '',
    gloss: attrs.gloss || '',
    primaryGloss: attrs.primaryGloss || '',
    alternateGlosses: Array.isArray(attrs.alternateGlosses) ? attrs.alternateGlosses : [],
    glossSource: attrs.glossSource || '',
    glossSourceUrl: attrs.glossSourceUrl || '',
    glossLicense: attrs.glossLicense || '',
    glossAttribution: attrs.glossAttribution || '',
    customGloss: attrs.customGloss || '',
    pos: attrs.pos || '',
    parse: attrs.parse || '',
    freq: Number(attrs.freq || 0),
    source: attrs.source || '',
    ...attrs
  };
}

function getDisplayHeadword(entry = {}){
  if(typeof CanonicalVocabularyForms !== 'undefined') return CanonicalVocabularyForms.resolve(entry);
  if(typeof require === 'function'){
    const resolved = require('./canonical-forms').resolve(entry);
    if(resolved) return resolved;
  }
  const clean = value => typeof value === 'string' ? value.trim() : '';
  return clean(entry.canonicalForm) || clean(entry.lexicalForm) || clean(entry.lemma) || '';
}

if (typeof module === 'object' && module.exports) module.exports = { createWordEntry, getDisplayHeadword };
