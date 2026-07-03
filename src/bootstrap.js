/* ---------- Init ---------- */
async function init(){
  loadPrefs();
  loadDashboard();
  const lastLang = getLastLanguage();
  if(lastLang) state.lang = lastLang;
  applyTheme(state.prefs.theme||'light');
  setAccent(state.prefs.accent||DEFAULTS.accent);
  await loadData();
  wireEvents();
  syncSettingsUI();
  if(typeof initOnboarding === 'function') initOnboarding();
  if(typeof initReferenceLibrary === 'function') initReferenceLibrary();
  setLang(state.lang);
  if(typeof initRouter === 'function') initRouter(); else showView('listView');
  updateDueBadge();
  if(state.prefs.cardFontSize){
    document.documentElement.style.setProperty('--fc-word-size', state.prefs.cardFontSize+'px');
    $$('.fc-word-display').forEach(el=>el.style.fontSize=state.prefs.cardFontSize+'px');
  }
}

init();
