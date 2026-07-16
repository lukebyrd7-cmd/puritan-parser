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
  document.documentElement.classList.add('app-ready');
}

init().catch(error => {
  console.error('Puritan Parser initialization failed.', error);
  document.documentElement.classList.add('app-load-failed');
  const status = document.getElementById('appLoadingStatus');
  if(status) status.innerHTML = '<strong>Puritan Parser could not start.</strong><br><button type="button" onclick="location.reload()">Try again</button>';
});
