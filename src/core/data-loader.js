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
  try {
    const version = typeof PURITAN_PARSER_ASSET_VERSION === 'string' ? `?v=${PURITAN_PARSER_ASSET_VERSION}` : '';
    const response = await fetch(`/data/glosses/corrections.json${version}`);
    if(response.ok && typeof GlossModel !== 'undefined') GlossModel.setGlossCorrections(await response.json());
  } catch(error) { console.warn('Gloss correction manifest unavailable; source glosses remain active.', error); }
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
function buildExportData(exportedAt = new Date().toISOString()){
  return {
    schemaVersion: 4,
    greek: state.data.greek,
    hebrew: state.data.hebrew,
    vocabularyLearning: typeof VocabularyLearning !== 'undefined' ? VocabularyLearning.loadStore() : undefined,
    customDecks: typeof PuritanStudySets !== 'undefined' ? PuritanStudySets.loadStore() : undefined,
    studySets: typeof PuritanStudySets !== 'undefined' ? PuritanStudySets.loadStore() : undefined,
    learningPractice: typeof LearningPractice !== 'undefined' ? LearningPractice.exportState() : undefined,
    personalGlosses: typeof PuritanPersonalGlosses !== 'undefined' ? PuritanPersonalGlosses.exportState() : undefined,
    savedVocabulary: typeof PuritanSavedVocabulary !== 'undefined' ? PuritanSavedVocabulary.loadStore() : undefined,
    preferences: { ...state.prefs },
    dashboard: { ...state.dashboard },
    learnReviewTargets: typeof learnReviewTargets === 'function' ? learnReviewTargets() : undefined,
    practiceSrsPreference: typeof learnPracticeSrsPreference === 'function' ? learnPracticeSrsPreference() : undefined,
    readerLocation: typeof PuritanReaderPreferences !== 'undefined' ? PuritanReaderPreferences.readLocationRecord() : undefined,
    readerSettings: typeof readStorageJson === 'function' ? readStorageJson('pp_reader_adaptive_settings', null) : undefined,
    exported: exportedAt
  };
}
function exportData(){
  const data = buildExportData();
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
    const personalGlossesImported = payload?.personalGlosses && typeof PuritanPersonalGlosses !== 'undefined';
    const savedVocabularyImported = payload?.savedVocabulary && typeof PuritanSavedVocabulary !== 'undefined';
    const preferencesImported = payload?.preferences && typeof createPreferences === 'function';
    const dashboardImported = payload?.dashboard && typeof createDashboardStats === 'function';
    const decksImported = (payload?.customDecks || payload?.studySets) && typeof PuritanStudySets !== 'undefined';
    const readerLocationImported = (payload?.readerLocation || payload?.pp_reader_location) && typeof PuritanReaderPreferences !== 'undefined';
    if(!valid.length && !learningImported && !practiceImported && !decksImported && !readerLocationImported && !personalGlossesImported && !savedVocabularyImported && !preferencesImported && !dashboardImported){
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
    if(personalGlossesImported){
      const knownIds = new Set(['greek','hebrew'].flatMap(lang => (typeof getStudyEntries === 'function' ? getStudyEntries(state.data[lang] || [], 'lemma') : state.data[lang] || []).map(entry => PuritanPersonalGlosses.vocabularyId(entry))));
      PuritanPersonalGlosses.importState(payload.personalGlosses, { knownIds });
    }
    if(savedVocabularyImported) PuritanSavedVocabulary.saveStore(PuritanSavedVocabulary.normalizeStore(payload.savedVocabulary));
    if(preferencesImported){
      state.prefs = createPreferences(payload.preferences);
      savePrefs();
      if(typeof applyTheme === 'function') applyTheme(state.prefs.theme || 'light', { persist: false });
      if(typeof setAccent === 'function') setAccent(state.prefs.accent || DEFAULTS.accent, { persist: false });
      document.documentElement.style.setProperty('--fc-word-size', `${state.prefs.cardFontSize || 54}px`);
    }
    if(dashboardImported){ state.dashboard = createDashboardStats(payload.dashboard); saveDashboard(); }
    if(payload?.learnReviewTargets && typeof saveLearnReviewTargets === 'function') saveLearnReviewTargets(payload.learnReviewTargets);
    if(payload?.practiceSrsPreference && typeof setLearnPracticeSrsPreference === 'function') setLearnPracticeSrsPreference(payload.practiceSrsPreference);
    if(readerLocationImported) PuritanReaderPreferences.importLocation(payload.readerLocation || payload.pp_reader_location);
    if(payload?.readerSettings && typeof writeStorageJson === 'function') writeStorageJson('pp_reader_adaptive_settings', payload.readerSettings);
    updatePosOptions();
    updateParsingFilterOptions();
    renderList();
    updateDueBadge();
    if(preview){
      preview.textContent = `Imported ${valid.length} entr${valid.length===1?'y':'ies'}${learningImported ? ' and vocabulary learning history' : ''}${decksImported ? ' and Custom Decks' : ''}${practiceImported ? ' and practice settings' : ''}${personalGlossesImported ? ' and personal glosses' : ''}${savedVocabularyImported ? ' and saved words' : ''}${preferencesImported ? ' and display settings' : ''}${dashboardImported ? ' and dashboard history' : ''}${readerLocationImported ? ' and Reader locations' : ''}${invalid.length ? `; skipped ${invalid.length} invalid row${invalid.length===1?'':'s'}` : ''}.`;
      preview.classList.remove('hidden');
    }
    toast('Import complete.','success');
  } catch(e){
    console.error('Puritan Parser import failed.', e);
    if(preview){ preview.textContent = 'Could not read that JSON file.'; preview.classList.remove('hidden'); }
    toast('Import failed.','danger');
  }
}
