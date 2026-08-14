/* ---------- Vocabulary source data ---------- */
const lexicalGlossMapCache = new Map();
const lexicalGlossMapPromises = new Map();
const lexicalGlossMapLoadCounts = { greek: 0, hebrew: 0 };

async function fetchSourceJson(path){
  try {
    const r = await fetch(path, {cache:'no-store'});
    if(!r.ok) throw new Error('not ok');
    const j = await r.json();
    if(!Array.isArray(j)) throw new Error('not array');
    return j;
  } catch(e){ return null; }
}
function lexicalGlossPath(language){
  const normalized = language === 'hebrew' ? 'hebrew' : 'greek';
  return `/data/glosses/${normalized}-glosses.json`;
}
async function loadLexicalGlossMap(language = 'greek'){
  const normalized = language === 'hebrew' ? 'hebrew' : 'greek';
  if(lexicalGlossMapCache.has(normalized)) return lexicalGlossMapCache.get(normalized);
  if(lexicalGlossMapPromises.has(normalized)) return lexicalGlossMapPromises.get(normalized);
  lexicalGlossMapLoadCounts[normalized] += 1;
  const pending = (async () => {
    const response = await fetch(lexicalGlossPath(normalized), { cache: 'no-store' });
    if(!response.ok) throw new Error(`${normalized === 'hebrew' ? 'Hebrew' : 'Greek'} lexical glosses could not be loaded (${response.status}).`);
    const value = await response.json();
    if(!value || Array.isArray(value) || typeof value !== 'object') throw new Error(`${normalized === 'hebrew' ? 'Hebrew' : 'Greek'} lexical glosses are malformed.`);
    lexicalGlossMapCache.set(normalized, value);
    return value;
  })().catch(error => {
    lexicalGlossMapPromises.delete(normalized);
    throw error;
  });
  lexicalGlossMapPromises.set(normalized, pending);
  return pending;
}
function lexicalGlossPreparationDebug(){
  return {
    loadCounts: { ...lexicalGlossMapLoadCounts },
    ready: { greek: lexicalGlossMapCache.has('greek'), hebrew: lexicalGlossMapCache.has('hebrew') },
    preparing: { greek: lexicalGlossMapPromises.has('greek') && !lexicalGlossMapCache.has('greek'), hebrew: lexicalGlossMapPromises.has('hebrew') && !lexicalGlossMapCache.has('hebrew') }
  };
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
function applyCanonicalForms(items, language){
  if(typeof CanonicalVocabularyForms === 'undefined') return items;
  for(const item of items || []){
    const canonicalForm = CanonicalVocabularyForms.resolve(item, { language });
    if(canonicalForm){ item.canonicalForm = canonicalForm; item.lexicalForm = canonicalForm; }
  }
  return items;
}
async function loadVocabularySources(){
  const [all, greekLexicalSource, canonicalForms] = await Promise.all([
    fetchSourceJson(FILE_ALL),
    loadLexicalGlossMap('greek').catch(error => {
      console.warn('Greek lexical gloss overlay unavailable; embedded vocabulary glosses remain active.', error);
      return null;
    }),
    fetchSourceObject('/data/lexical/canonical-forms.json')
  ]);
  if(!canonicalForms) throw new Error('Canonical vocabulary forms could not be loaded.');
  if(typeof CanonicalVocabularyForms !== 'undefined') CanonicalVocabularyForms.setMap(canonicalForms);
  if(all && all.length){
    const sources = await splitVocabularySource(all);
    applyGreekLexicalSource(sources.greek, greekLexicalSource);
    applyCanonicalForms(sources.greek, 'greek');
    applyCanonicalForms(sources.hebrew, 'hebrew');
    return sources;
  }
  const gf = await fetchSourceJson(FILE_GREEK);
  const hf = await fetchSourceJson(FILE_HEBREW);
  return {
    greek: gf && gf.length ? applyCanonicalForms(applyGreekLexicalSource(await normalizeVocabularySource(gf, 'greek'), greekLexicalSource), 'greek') : null,
    hebrew: hf && hf.length ? applyCanonicalForms(await normalizeVocabularySource(hf, 'hebrew'), 'hebrew') : null
  };
}
if(typeof window !== 'undefined') Object.assign(window, { loadLexicalGlossMap, lexicalGlossPreparationDebug });
if(typeof module !== 'undefined') module.exports = { fetchSourceJson, fetchSourceObject, lexicalGlossPath, loadLexicalGlossMap, lexicalGlossPreparationDebug, normalizeSourceWord, normalizeVocabularySource, splitVocabularySource, applyGreekLexicalSource, applyCanonicalForms, loadVocabularySources };
