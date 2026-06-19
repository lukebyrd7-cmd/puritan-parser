/* ---------- Storage facade ---------- */
const storage = {
  getVocabulary,
  saveVocabulary,
  getUserProgress,
  saveUserProgress,
  getImportedVocabulary,
  saveImportedVocabulary,
  getPreferences,
  savePreferences,
  getDashboard,
  saveDashboard: saveDashboardStats,
  getLastLanguage,
  saveLastLanguage,
  clearAllUserData(){
    [LS_VOCAB_GREEK,LS_VOCAB_HEBREW,LS_IMPORTED_GREEK,LS_IMPORTED_HEBREW,LS_PREFS,LS_DASHBOARD,'pp_last_lang'].forEach(k=>localStorage.removeItem(k));
  }
};
function loadPrefs(){ state.prefs = storage.getPreferences(); }
function savePrefs(){ storage.savePreferences(state.prefs); }
function saveVocab(lang){ try { storage.saveVocabulary(lang, state.data[lang]||[]); } catch(e){ console.warn('save vocab failed', e); } }
function applyStoredVocab(lang){
  try {
    const { imported, progress } = storage.getVocabulary(lang);
    const byId = new Map(state.data[lang].map(item=>[item.id,item]));
    progress.forEach((saved, id)=>{
      const target = byId.get(id);
      if(target) Object.assign(target, saved);
    });
    imported.forEach(entry=>{
      const id = entry.id || `${entry.word}:${entry.lemma}`;
      const existing = byId.get(id);
      const progressForEntry = progress.get(id);
      if(existing) Object.assign(existing, progressForEntry || {});
      else state.data[lang].push(ensureSRS(composeWordView(entry, progressForEntry)));
    });
  } catch(e){ console.warn('load saved progress failed', e); }
}
function loadDashboard(){ state.dashboard = storage.getDashboard(); }
function saveDashboard(){ storage.saveDashboard(state.dashboard); }
