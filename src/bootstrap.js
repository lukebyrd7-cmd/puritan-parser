/* ---------- Init ---------- */
let appDataReady = false;
let appDataPromise = null;

function isAppDataReady(){ return appDataReady; }
function refreshActiveViewAfterData(){
  const view = state.currentView;
  if(view === 'learnView' && typeof renderLearn === 'function') renderLearn();
  else if(view === 'listView' && typeof renderList === 'function') renderList();
  else if(view === 'progressView' && typeof renderProgress === 'function') {
    if(typeof invalidateProgressViewCache === 'function') invalidateProgressViewCache();
    renderProgress();
  }
  if(typeof updateDueBadge === 'function') updateDueBadge();
  const footer = $('#footerLang');
  if(footer) footer.textContent = `${state.lang==='greek'?'Greek (GNT)':'Hebrew'} — ${getCurrentStudyList().length} study entries (${getCurrentList().length} forms) loaded`;
}
function startAppDataLoad(){
  if(appDataPromise) return appDataPromise;
  appDataPromise = loadData().then(() => {
    appDataReady = true;
    refreshActiveViewAfterData();
    return state.data;
  });
  return appDataPromise;
}

async function init(){
  loadPrefs();
  loadDashboard();
  const lastLang = getLastLanguage();
  if(lastLang) state.lang = lastLang;
  applyTheme(state.prefs.theme||'light');
  setAccent(state.prefs.accent||DEFAULTS.accent);
  wireEvents();
  if(typeof syncSettingsUI === 'function') syncSettingsUI();
  if(typeof initOnboarding === 'function') initOnboarding();
  setLang(state.lang);
  if(typeof initRouter === 'function') initRouter(); else showView('listView');
  if(state.prefs.cardFontSize){
    document.documentElement.style.setProperty('--fc-word-size', state.prefs.cardFontSize+'px');
    $$('.fc-word-display').forEach(el=>el.style.fontSize=state.prefs.cardFontSize+'px');
  }
  document.documentElement.classList.add('app-ready');
  const beginDataLoad = () => startAppDataLoad().catch(error => {
    console.error('Puritan Parser vocabulary data failed to load.', error);
  });
  const dataCriticalViews = ['learnView', 'listView', 'flashView', 'parsingView', 'dashboardView', 'progressView', 'globalSearchView'];
  if(typeof window !== 'undefined' && !dataCriticalViews.includes(state.currentView) && typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(beginDataLoad, { timeout: 1500 });
  } else if(typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    window.requestAnimationFrame(() => setTimeout(beginDataLoad, 0));
  } else setTimeout(beginDataLoad, 0);
}

init().catch(error => {
  console.error('Puritan Parser initialization failed.', error);
  document.documentElement.classList.add('app-load-failed');
  const status = document.getElementById('appLoadingStatus');
  if(status) status.innerHTML = '<strong>Puritan Parser could not start.</strong><br><button type="button" onclick="location.reload()">Try again</button>';
});
