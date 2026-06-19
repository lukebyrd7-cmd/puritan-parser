/* ---------- WordEntry model ---------- */
function createWordEntry(input = {}){
  const lang = String(input.lang || input.language || 'greek').toLowerCase();
  return {
    id: input.id || `${lang}-${uid()}`,
    word: input.word || '',
    lemma: input.lemma || input.word || '',
    gloss: input.gloss || '',
    lang,
    language: lang,
    freq: Number(input.freq ?? input.frequency ?? 0),
    frequency: Number(input.freq ?? input.frequency ?? 0),
    pos: input.pos || input.partOfSpeech || '',
    partOfSpeech: input.pos || input.partOfSpeech || '',
    parse: input.parse || input.parsingData || '',
    parsingData: input.parsingData || input.parse || '',
    source: input.source || 'Source',
    sourceInfo: input.sourceInfo || null
  };
}

function composeWordView(entry, progress){
  return Object.assign({}, entry, progress || createUserProgress(entry));
}

function splitWordView(item){
  return {
    entry: createWordEntry(item),
    progress: createUserProgress(item)
  };
}
