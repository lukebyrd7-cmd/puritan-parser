/* ---------- Init ---------- */
let appDataReady = false;
let appDataPromise = null;
let appDataScheduleTimer = null;
let appDataIdleHandle = null;
let appInitializationPromise = null;
let appEventsWired = false;

function isAppDataReady(){ return appDataReady; }
function refreshActiveViewAfterData(){
  const view = state.currentView;
  if(view === 'learnView' && typeof renderLearn === 'function') renderLearn();
  else if(view === 'listView' && typeof renderList === 'function') renderList();
  else if(view === 'globalSearchView' && typeof renderGlobalSearch === 'function') renderGlobalSearch();
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
function reportAppDataLoadError(error){
  console.error('Puritan Parser vocabulary data failed to load.', error);
}
function cancelScheduledAppDataLoad(){
  if(appDataScheduleTimer) clearTimeout(appDataScheduleTimer);
  appDataScheduleTimer = null;
  if(appDataIdleHandle && typeof window !== 'undefined' && typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(appDataIdleHandle);
  appDataIdleHandle = null;
}
function scheduleNoncriticalAppDataLoad(delay = 3000){
  if(appDataReady || appDataPromise || typeof window === 'undefined') return false;
  cancelScheduledAppDataLoad();
  appDataScheduleTimer = setTimeout(() => {
    appDataScheduleTimer = null;
    const begin = () => {
      appDataIdleHandle = null;
      startAppDataLoad().catch(reportAppDataLoadError);
    };
    if(typeof window.requestIdleCallback === 'function') appDataIdleHandle = window.requestIdleCallback(begin, { timeout: 5000 });
    else if(typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(() => setTimeout(begin, 0));
    else setTimeout(begin, 0);
  }, Math.max(0, Number(delay) || 0));
  return true;
}
function deferAppDataLoadForInteraction(delay = 2500){
  if(appDataReady || appDataPromise) return false;
  return scheduleNoncriticalAppDataLoad(delay);
}

async function init(){
  loadPrefs();
  loadDashboard();
  const lastLang = getLastLanguage();
  if(lastLang) state.lang = lastLang;
  applyTheme(state.prefs.theme||'light');
  setAccent(state.prefs.accent||DEFAULTS.accent);
  if(!appEventsWired){
    wireEvents();
    appEventsWired = true;
  }
  if(typeof syncSettingsUI === 'function') syncSettingsUI();
  if(typeof initOnboarding === 'function') initOnboarding();
  setLang(state.lang);
  if(typeof initRouter === 'function') initRouter(); else showView('listView');
  if(state.prefs.cardFontSize){
    document.documentElement.style.setProperty('--fc-word-size', state.prefs.cardFontSize+'px');
    $$('.fc-word-display').forEach(el=>el.style.fontSize=state.prefs.cardFontSize+'px');
  }
  const dataCriticalViews = ['learnView', 'listView', 'flashView', 'parsingView', 'dashboardView', 'progressView', 'globalSearchView'];
  if(typeof window !== 'undefined' && state.currentView === 'globalSearchView') {
    // The Search feature renders its interactive shell before beginning corpus hydration.
  } else if(typeof window !== 'undefined' && !dataCriticalViews.includes(state.currentView)) {
    scheduleNoncriticalAppDataLoad();
  } else if(typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    window.requestAnimationFrame(() => setTimeout(() => startAppDataLoad().catch(reportAppDataLoadError), 0));
  } else setTimeout(() => startAppDataLoad().catch(reportAppDataLoadError), 0);
}

function runPuritanBootstrap(){
  if(appInitializationPromise) return appInitializationPromise;
  appInitializationPromise = init().catch(error => {
    appInitializationPromise = null;
    throw error;
  });
  return appInitializationPromise;
}

if(typeof window !== 'undefined') window.runPuritanBootstrap = runPuritanBootstrap;
