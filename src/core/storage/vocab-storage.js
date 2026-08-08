/* ---------- Vocabulary progress storage ---------- */
function compactProgressItem(it){
  if(it.source === 'Imported'){
    if(!hasSyntheticDefaultSchedule(it)) return it;
    const clean = { ...it };
    ['ease','interval','repetitions','due','history'].forEach(key => delete clean[key]);
    return clean;
  }
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
function hasLegacyNonSrsEvidence(it){
  const parsing = it?.parsing || {};
  const vocab = it?.vocab || {};
  return it?.source === 'Imported' || !!String(it?.customGloss || '').trim()
    || (Number(parsing.attempts) || 0) > 0 || (Number(parsing.correct) || 0) > 0
    || Object.keys(parsing.misses || {}).length > 0 || (parsing.todayMisses || []).length > 0
    || (Number(vocab.attempts) || 0) > 0 || (Number(vocab.correct) || 0) > 0;
}
function hasSyntheticDefaultSchedule(it){
  const initialEase = state.prefs.initialEase || 2.5;
  const exactFields = ['ease','interval','repetitions','due','history'].every(key => Object.prototype.hasOwnProperty.call(it || {}, key));
  return exactFields
    && (Number(it?.repetitions) || 0) === 0
    && (Number(it?.interval) || 0) === 0
    && (!Array.isArray(it?.history) || it.history.length === 0)
    && Math.abs((Number(it.ease) || initialEase) - initialEase) <= 0.001
    && /^\d{4}-\d{2}-\d{2}$/.test(String(it?.due || ''));
}
function repairSyntheticDefaultSchedules(items){
  let changed = false;
  const repaired = (Array.isArray(items) ? items : []).flatMap(item => {
    if(!item || typeof item !== 'object' || !hasSyntheticDefaultSchedule(item)) return [item];
    changed = true;
    const clean = { ...item };
    ['ease','interval','repetitions','due','history'].forEach(key => delete clean[key]);
    return hasLegacyNonSrsEvidence(clean) ? [clean] : [];
  });
  return { items: repaired, changed };
}
function hasProgressData(it){
  const initialEase = state.prefs.initialEase || 2.5;
  const scheduleEvidence = (it.repetitions||0)>0 || (it.interval||0)>0 || (it.history||[]).length || Math.abs((it.ease||initialEase)-initialEase)>0.001;
  const nonDefaultDue = it.due && it.due !== todayISO() && !hasSyntheticDefaultSchedule(it);
  return scheduleEvidence || nonDefaultDue || hasLegacyNonSrsEvidence(it);
}
function getUserProgress(lang){
  const stored = migrateStoredJson(StorageKeys.vocab[lang], []);
  const repaired = repairSyntheticDefaultSchedules(stored);
  if(repaired.changed) saveUserProgress(lang, repaired.items);
  return repaired.items;
}
function saveUserProgress(lang, items){ writeVersionedStorageJson(StorageKeys.vocab[lang], items); }
function saveVocab(lang){
  try {
    const compact = (state.data[lang]||[]).filter(it=>hasProgressData(it) || it.source==='Imported').map(compactProgressItem);
    saveUserProgress(lang, compact);
    if(typeof invalidateStudyEntriesCache === 'function') invalidateStudyEntriesCache(state.data[lang]);
  } catch(e){ console.warn('save vocab failed', e); }
}
function applyStoredVocab(lang){
  try {
    const stored = getUserProgress(lang);
    if(!stored.length) return;
    const byId = new Map(state.data[lang].map(item=>[item.id,item]));
    stored.forEach(saved=>{
      if(!saved || typeof saved!=='object') return;
      const target = saved.id ? byId.get(saved.id) : null;
      if(target){
        ['ease','interval','repetitions','due','history','parsing','vocab','customGloss'].forEach(key=>{ if(saved[key] !== undefined) target[key] = saved[key]; });
        if(saved.customGloss && typeof PuritanPersonalGlosses !== 'undefined' && !PuritanPersonalGlosses.recordFor(target)){
          PuritanPersonalGlosses.setRecord(target, { mode: 'replace', glosses: saved.customGloss });
        }
      } else if(saved.source==='Imported' && saved.word && saved.gloss){
        state.data[lang].push(ensureSRS(createWordEntry(Object.assign({lang, source:'Imported'}, saved))));
      }
    });
  } catch(e){ console.warn('load saved progress failed', e); }
}

if(typeof module !== 'undefined') module.exports = { compactProgressItem, hasLegacyNonSrsEvidence, hasSyntheticDefaultSchedule, repairSyntheticDefaultSchedules, hasProgressData };
