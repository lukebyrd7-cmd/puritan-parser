/* ---------- Lightweight Router ---------- */
const ROUTES = {
  '/': { viewId: 'learnView', nav: 'learn' },
  '/onboarding': { viewId: 'onboardingView', nav: 'onboarding' },
  '/list': { viewId: 'globalSearchView', nav: 'learn' },
  '/flashcards': { viewId: 'learnView', nav: 'learn' },
  '/parsing': { viewId: 'learnView', nav: 'learn', learnPage: 'parsing' },
  '/parsing/greek': { viewId: 'learnView', nav: 'learn', learnPage: 'parsing:setup:greek' },
  '/parsing/hebrew': { viewId: 'learnView', nav: 'learn', learnPage: 'parsing:setup:hebrew' },
  '/dashboard': { viewId: 'dashboardView', nav: 'dashboard' },
  '/progress': { viewId: 'progressView', nav: 'progress' },
  '/settings': { viewId: 'settingsView', nav: 'settings' },
  '/settings/sources': { viewId: 'aboutSourcesView', nav: 'settings' },
  '/search': { viewId: 'globalSearchView', nav: 'search' },
  '/grammar': { viewId: 'grammarView', nav: 'grammar' },
  '/reader': { viewId: 'readerView', nav: 'reader' },
  '/learn': { viewId: 'learnView', nav: 'learn' },
  '/word': { viewId: 'wordPageView', nav: 'word' },
  '/profile': { viewId: 'profileView', nav: 'profile' }
};
let routerInitialized = false;

function routeForView(viewId){
  if(viewId === 'learnView' || viewId === 'learn') return '/learn';
  if(viewId === 'globalSearchView' || viewId === 'search') return '/search';
  const found = Object.entries(ROUTES).find(([path, route]) => path !== '/' && (route.viewId === viewId || route.nav === viewId));
  return found ? found[0] : '/list';
}
function currentRoutePath(){ return window.location.pathname in ROUTES ? window.location.pathname : '/learn'; }
function navigateTo(path, options = {}){
  const target = ROUTES[path] ? path : '/learn';
  if(!options.replace && window.location.pathname !== target) history.pushState({}, '', target);
  else if(options.replace && window.location.pathname !== target) history.replaceState({}, '', target);
  const route = ROUTES[target];
  showView(route.viewId, { skipHistory: true });
  if(route.learnPage){
    const applyLearnPage = () => {
      if(typeof setLearnPage === 'function') setLearnPage(route.learnPage, { skipHistory: options.replace === true, skipBrowserHistory: true });
    };
    if(typeof setLearnPage === 'function') applyLearnPage();
    else window.PuritanModuleLoader?.ensureView?.(route.viewId)?.then(applyLearnPage);
  }
}
function initRouter(){
  if(!routerInitialized){
    window.addEventListener('popstate', event => {
      if(currentRoutePath() === '/learn' && typeof setLearnPage === 'function'){
        showView('learnView', { skipHistory: true });
        setLearnPage(event.state?.learnPage || 'home', { skipHistory: true, skipBrowserHistory: true });
        return;
      }
      navigateTo(currentRoutePath(), { replace: true });
    });
    routerInitialized = true;
  }
  if(typeof shouldShowOnboarding === 'function' && shouldShowOnboarding() && window.location.pathname !== '/onboarding') history.replaceState({}, '', '/onboarding');
  if(!ROUTES[window.location.pathname]) history.replaceState({}, '', '/learn');
  navigateTo(currentRoutePath(), { replace: true });
}
