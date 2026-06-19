/* ---------- Vocabulary progress storage ---------- */
function compactProgressItem(it){
  if(it.source === 'Imported') return it;
  return createUserProgress({
    id: it.id,
    ease: it.ease,
    interval: it.interval,
    repetitions: it.repetitions,
    due: it.due,
    history: it.history,
    parsing: it.parsing,
    vocab: it.vocab,
    customGloss: it.customGloss
  });
}
function hasProgressData(it){
  const initialEase = state.prefs.initialEase || 2.5;
  return (it.repetitions||0)>0 || (it.interval||0)>0 || (it.history||[]).length || it.due!==todayISO() || Math.abs((it.ease||initialEase)-initialEase)>0.001 || !!String(it.customGloss||'').trim();
}
function getUserProgress(lang){
  const stored = migrateStoredJson(StorageKeys.vocab[lang], []);
  return Array.isArray(stored) ? stored : [];
}
function saveUserProgress(lang, items){ writeVersionedStorageJson(StorageKeys.vocab[lang], items); }
function saveVocab(lang){
  try {
    const compact = (state.data[lang]||[]).filter(it=>hasProgressData(it) || it.source==='Imported').map(compactProgressItem);
    saveUserProgress(lang, compact);
  } catch(e){ console.warn('save vocab failed', e); }
}
function applyStoredVocab(lang){
  try {
    const stored = getUserProgress(lang);
    const byId = new Map(state.data[lang].map(item=>[item.id,item]));
    stored.forEach(saved=>{
      if(!saved || typeof saved!=='object') return;
      const target = saved.id ? byId.get(saved.id) : null;
      if(target){
        ['ease','interval','repetitions','due','history','parsing','vocab','customGloss'].forEach(key=>{ if(saved[key] !== undefined) target[key] = saved[key]; });
      } else if(saved.source==='Imported' && saved.word && saved.gloss){
        state.data[lang].push(ensureSRS(createWordEntry(Object.assign({lang, source:'Imported'}, saved))));
      }
    });
  } catch(e){ console.warn('load saved progress failed', e); }
}
