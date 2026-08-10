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
async function fetchSourceObject(path){
  try {
    const r = await fetch(path, {cache:'no-store'});
    if(!r.ok) throw new Error('not ok');
    const value = await r.json();
    if(!value || Array.isArray(value) || typeof value !== 'object') throw new Error('not object');
    return value;
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
function applyGreekLexicalSource(items, source){
  if(!source) return items;
  for(const item of items || []){
    const record = source[item.lemma];
    if(!record) continue;
    item.gloss = [record.primaryGloss, ...(record.alternateGlosses || [])].filter(Boolean).join(', ');
    item.primaryGloss = record.primaryGloss || '';
    item.alternateGlosses = Array.isArray(record.alternateGlosses) ? record.alternateGlosses.slice() : [];
    for(const field of ['glossSource','glossSourceUrl','glossLicense','glossAttribution','glossSourceEntry','glossSourceStrong']) if(record[field]) item[field] = record[field];
    if(record.ordinaryPracticeEligible === false) item.ordinaryPracticeEligible = false;
  }
  return items;
}
async function loadVocabularySources(){
  const [all, greekLexicalSource] = await Promise.all([fetchSourceJson(FILE_ALL), fetchSourceObject('/data/glosses/greek-glosses.json')]);
  if(all && all.length){
    const sources = await splitVocabularySource(all);
    applyGreekLexicalSource(sources.greek, greekLexicalSource);
    return sources;
  }
  const gf = await fetchSourceJson(FILE_GREEK);
  const hf = await fetchSourceJson(FILE_HEBREW);
  return {
    greek: gf && gf.length ? applyGreekLexicalSource(await normalizeVocabularySource(gf, 'greek'), greekLexicalSource) : null,
    hebrew: hf && hf.length ? await normalizeVocabularySource(hf, 'hebrew') : null
  };
}
if(typeof module !== 'undefined') module.exports = { fetchSourceJson, fetchSourceObject, normalizeSourceWord, normalizeVocabularySource, splitVocabularySource, applyGreekLexicalSource, loadVocabularySources };
