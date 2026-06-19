/* ---------- WordEntry model ---------- */
function createWordEntry(attrs = {}){
  return {
    id: attrs.id || '',
    lang: attrs.lang || 'greek',
    word: attrs.word || '',
    lemma: attrs.lemma || '',
    gloss: attrs.gloss || '',
    pos: attrs.pos || '',
    parse: attrs.parse || '',
    freq: Number(attrs.freq || 0),
    source: attrs.source || '',
    ...attrs
  };
}
