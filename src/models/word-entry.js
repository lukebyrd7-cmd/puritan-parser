/* ---------- WordEntry model ---------- */
function createWordEntry(attrs = {}){
  return {
    id: attrs.id || '',
    lang: attrs.lang || 'greek',
    word: attrs.word || '',
    lemma: attrs.lemma || '',
    lexicalForm: attrs.lexicalForm || '',
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
  const clean = value => typeof value === 'string' ? value.trim() : '';
  return clean(entry.lexicalForm) || clean(entry.lemma) || clean(entry.word) || '';
}

if (typeof module === 'object' && module.exports) module.exports = { createWordEntry, getDisplayHeadword };
