/* ---------- Vocabulary source data ---------- */
async function tryFetchJson(path){
  try {
    const r = await fetch(path, {cache:'no-store'});
    if(!r.ok) throw new Error('not ok');
    const j = await r.json();
    if(!Array.isArray(j)) throw new Error('not array');
    return j;
  } catch(e){ return null; }
}
function normalizeSourceEntry(item, lang){
  return createWordEntry(Object.assign({}, item, { lang: String(item.lang || lang || 'greek').toLowerCase() }));
}
async function loadVocabularySource(){
  const all = await tryFetchJson(FILE_ALL);
  if(all && all.length){
    return {
      greek: all.filter(x=>(x.lang||'greek').toLowerCase()==='greek').map(it=>normalizeSourceEntry(it, 'greek')),
      hebrew: all.filter(x=>(x.lang||'greek').toLowerCase()==='hebrew').map(it=>normalizeSourceEntry(it, 'hebrew'))
    };
  }
  const gf = await tryFetchJson(FILE_GREEK);
  const hf = await tryFetchJson(FILE_HEBREW);
  return {
    greek: (gf && gf.length ? gf : SAMPLE_GREEK).map(it=>normalizeSourceEntry(it, 'greek')),
    hebrew: (hf && hf.length ? hf : SAMPLE_HEBREW).map(it=>normalizeSourceEntry(it, 'hebrew'))
  };
}
