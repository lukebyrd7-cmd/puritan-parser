/* ---------- Lightweight Router ---------- */
const ROUTES = {
  '/': { viewId: 'learnView', nav: 'learn' },
  '/onboarding': { viewId: 'onboardingView', nav: 'onboarding' },
  '/list': { viewId: 'listView', nav: 'list' },
  '/flashcards': { viewId: 'flashView', nav: 'flashcards' },
  '/parsing': { viewId: 'parsingView', nav: 'parsing' },
  '/dashboard': { viewId: 'dashboardView', nav: 'dashboard' },
  '/progress': { viewId: 'progressView', nav: 'progress' },
  '/settings': { viewId: 'settingsView', nav: 'settings' },
  '/grammar': { viewId: 'grammarView', nav: 'grammar' },
  '/reader': { viewId: 'readerView', nav: 'reader' },
  '/learn': { viewId: 'learnView', nav: 'learn' },
  '/word': { viewId: 'wordPageView', nav: 'word' },
  '/profile': { viewId: 'profileView', nav: 'profile' }
};

function routeForView(viewId){
  const found = Object.entries(ROUTES).find(([path, route]) => path !== '/' && (route.viewId === viewId || route.nav === viewId));
  return found ? found[0] : '/list';
}
function currentRoutePath(){ return window.location.pathname in ROUTES ? window.location.pathname : '/learn'; }
function navigateTo(path, options = {}){
  const target = ROUTES[path] ? path : '/learn';
  if(!options.replace && window.location.pathname !== target) history.pushState({}, '', target);
  else if(options.replace && window.location.pathname !== target) history.replaceState({}, '', target);
  showView(ROUTES[target].viewId, { skipHistory: true });
}
function initRouter(){
  window.addEventListener('popstate', () => navigateTo(currentRoutePath(), { replace: true }));
  if(typeof shouldShowOnboarding === 'function' && shouldShowOnboarding() && window.location.pathname !== '/onboarding') history.replaceState({}, '', '/onboarding');
  if(!ROUTES[window.location.pathname]) history.replaceState({}, '', '/learn');
  navigateTo(currentRoutePath(), { replace: true });
}
