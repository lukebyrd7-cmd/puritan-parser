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
async function loadVocabularySources(){
  const all = await fetchSourceJson(FILE_ALL);
  if(all && all.length){
    return {
      greek: all.filter(x=>(x.lang||'greek').toLowerCase()==='greek').map(it=>normalizeSourceWord(it, 'greek')),
      hebrew: all.filter(x=>(x.lang||'greek').toLowerCase()==='hebrew').map(it=>normalizeSourceWord(it, 'hebrew'))
    };
  }
  const gf = await fetchSourceJson(FILE_GREEK);
  const hf = await fetchSourceJson(FILE_HEBREW);
  return {
    greek: gf && gf.length ? gf.map(it=>normalizeSourceWord(it, 'greek')) : null,
    hebrew: hf && hf.length ? hf.map(it=>normalizeSourceWord(it, 'hebrew')) : null
  };
}
