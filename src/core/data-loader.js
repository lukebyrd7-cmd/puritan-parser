/* ---------- Data Loading ---------- */
async function tryFetchJson(path){ return fetchSourceJson(path); }
async function ensureSrsInChunks(items = []){
  const prepared = []; let index = 0;
  while(index < items.length){
    const started = performance?.now?.() || Date.now();
    do { prepared.push(ensureSRS(items[index++])); }
    while(index < items.length && (performance?.now?.() || Date.now()) - started < 10);
    if(index < items.length) await new Promise(resolve => setTimeout(resolve, 0));
  }
  return prepared;
}
async function loadData(){
  const sources = await loadVocabularySources();
  if(sources.greek && sources.hebrew){
    state.data.greek = await ensureSrsInChunks(sources.greek);
    state.data.hebrew = await ensureSrsInChunks(sources.hebrew);
    applyStoredVocab('greek'); applyStoredVocab('hebrew');
    state.dataRevision = Math.max(0, Number(state.dataRevision) || 0) + 1;
    return;
  }
  ['greek','hebrew'].forEach(lang=>{
    const sourceItems = sources[lang];
    const sample = lang==='greek' ? SAMPLE_GREEK : SAMPLE_HEBREW;
    if(sourceItems && sourceItems.length){
      state.data[lang] = sourceItems.map(ensureSRS);
      applyStoredVocab(lang);
    } else {
      const stored = getUserProgress(lang);
      state.data[lang] = stored.length ? stored.map(it=>ensureSRS(createWordEntry(Object.assign({lang}, it)))) : sample.map(it=>ensureSRS(createWordEntry(Object.assign({lang}, it))));
    }
  });
  state.dataRevision = Math.max(0, Number(state.dataRevision) || 0) + 1;
}

/* ---------- Export ---------- */
function exportData(){
  const data = {
    schemaVersion: 2,
    greek: state.data.greek,
    hebrew: state.data.hebrew,
    vocabularyLearning: typeof VocabularyLearning !== 'undefined' ? VocabularyLearning.loadStore() : undefined,
    customDecks: typeof PuritanStudySets !== 'undefined' ? PuritanStudySets.loadStore() : undefined,
    studySets: typeof PuritanStudySets !== 'undefined' ? PuritanStudySets.loadStore() : undefined,
    learningPractice: typeof LearningPractice !== 'undefined' ? LearningPractice.exportState() : undefined,
    learnReviewTargets: typeof learnReviewTargets === 'function' ? learnReviewTargets() : undefined,
    practiceSrsPreference: typeof learnPracticeSrsPreference === 'function' ? learnPracticeSrsPreference() : undefined,
    exported: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(data,null,2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download='puritan-parser-export.json'; a.click();
  URL.revokeObjectURL(url);
  toast('Data exported!','success');
}
async function importDataFile(file){
  const preview = $('#importPreview');
  try {
    const payload = JSON.parse(await file.text());
    const items = ParserCore.normalizeImportedPayload ? ParserCore.normalizeImportedPayload(payload) : [];
    const checks = items.map((item, idx)=>ParserCore.validateVocabItem ? ParserCore.validateVocabItem(item, idx) : {index:idx, errors:[]});
    const invalid = checks.filter(x=>x.errors.length);
    const valid = items.filter((_, idx)=>!checks[idx].errors.length).map(item=>{
      const lang = String(item.lang||'greek').toLowerCase();
      return ensureSRS(createWordEntry(Object.assign({}, item, { lang, source: item.source || 'Imported' })));
    });
    const learningImported = payload?.vocabularyLearning && typeof VocabularyLearning !== 'undefined';
    const practiceImported = payload?.learningPractice && typeof LearningPractice !== 'undefined';
    const decksImported = (payload?.customDecks || payload?.studySets) && typeof PuritanStudySets !== 'undefined';
    if(!valid.length && !learningImported && !practiceImported && !decksImported){
      if(preview){ preview.textContent = invalid.length ? `No valid entries found. First error: row ${invalid[0].index+1} ${invalid[0].errors.join(', ')}` : 'No entries found.'; preview.classList.remove('hidden'); }
      toast('Import failed.','danger');
      return;
    }
    const byId = lang => new Map(state.data[lang].map(item=>[item.id||`${item.word}:${item.lemma}`, item]));
    ['greek','hebrew'].forEach(lang=>{
      const map = byId(lang);
      valid.filter(item=>item.lang===lang).forEach(item=>map.set(item.id||`${item.word}:${item.lemma}`, item));
      state.data[lang] = Array.from(map.values());
      saveVocab(lang);
    });
    state.dataRevision = Math.max(0, Number(state.dataRevision) || 0) + 1;
    if(learningImported) VocabularyLearning.saveStore(VocabularyLearning.normalizeStore(payload.vocabularyLearning));
    if(decksImported) PuritanStudySets.saveStore(PuritanStudySets.normalizeStore(payload.customDecks || payload.studySets));
    if(practiceImported) LearningPractice.importState(payload.learningPractice);
    if(payload?.learnReviewTargets && typeof saveLearnReviewTargets === 'function') saveLearnReviewTargets(payload.learnReviewTargets);
    if(payload?.practiceSrsPreference && typeof setLearnPracticeSrsPreference === 'function') setLearnPracticeSrsPreference(payload.practiceSrsPreference);
    updatePosOptions();
    updateParsingFilterOptions();
    renderList();
    updateDueBadge();
    if(preview){
      preview.textContent = `Imported ${valid.length} entr${valid.length===1?'y':'ies'}${learningImported ? ' and vocabulary learning history' : ''}${decksImported ? ' and Custom Decks' : ''}${practiceImported ? ' and practice settings' : ''}${invalid.length ? `; skipped ${invalid.length} invalid row${invalid.length===1?'':'s'}` : ''}.`;
      preview.classList.remove('hidden');
    }
    toast('Import complete.','success');
  } catch(e){
    if(preview){ preview.textContent = 'Could not read that JSON file.'; preview.classList.remove('hidden'); }
    toast('Import failed.','danger');
  }
}
