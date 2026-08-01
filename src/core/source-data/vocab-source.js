/* ---------- Vocabulary source data ---------- */
async function fetchSourceJson(path){
  try {
    const r = await fetch(path, {cache:'no-store'});
    if(!r.ok) throw new Error('not ok');
    const j = await r.json();
    if(!Array.isArray(j)) throw new Error('not array');
    return j;
  } catch(e){ return null; }
}
function normalizeSourceWord(item, lang){ return createWordEntry(Object.assign({}, item, { lang })); }
function yieldVocabularySource(){ return new Promise(resolve => setTimeout(resolve, 0)); }
async function normalizeVocabularySource(items, language){
  const normalized = []; let index = 0;
  while(index < items.length){
    const started = performance?.now?.() || Date.now();
    do { normalized.push(normalizeSourceWord(items[index++], language)); }
    while(index < items.length && (performance?.now?.() || Date.now()) - started < 10);
    if(index < items.length) await yieldVocabularySource();
  }
  return normalized;
}
async function splitVocabularySource(items){
  const sources = { greek: [], hebrew: [] }; let index = 0;
  while(index < items.length){
    const started = performance?.now?.() || Date.now();
    do {
      const item = items[index++];
      const language = (item.lang || 'greek').toLowerCase() === 'hebrew' ? 'hebrew' : 'greek';
      sources[language].push(normalizeSourceWord(item, language));
    } while(index < items.length && (performance?.now?.() || Date.now()) - started < 10);
    if(index < items.length) await yieldVocabularySource();
  }
  return sources;
}
async function loadVocabularySources(){
  const all = await fetchSourceJson(FILE_ALL);
  if(all && all.length) return splitVocabularySource(all);
  const gf = await fetchSourceJson(FILE_GREEK);
  const hf = await fetchSourceJson(FILE_HEBREW);
  return {
    greek: gf && gf.length ? await normalizeVocabularySource(gf, 'greek') : null,
    hebrew: hf && hf.length ? await normalizeVocabularySource(hf, 'hebrew') : null
  };
}
