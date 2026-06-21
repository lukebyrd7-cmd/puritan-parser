/* ---------- Lightweight Router ---------- */
const ROUTES = {
  '/list': { viewId: 'listView', nav: 'list' },
  '/flashcards': { viewId: 'flashView', nav: 'flashcards' },
  '/parsing': { viewId: 'parsingView', nav: 'parsing' },
  '/dashboard': { viewId: 'dashboardView', nav: 'dashboard' },
  '/settings': { viewId: 'settingsView', nav: 'settings' },
  '/grammar': { viewId: 'grammarView', nav: 'grammar' },
  '/reader': { viewId: 'readerView', nav: 'reader' },
  '/profile': { viewId: 'profileView', nav: 'profile' }
};

function routeForView(viewId){
  const found = Object.entries(ROUTES).find(([, route]) => route.viewId === viewId);
  return found ? found[0] : '/list';
}
function currentRoutePath(){ return window.location.pathname in ROUTES ? window.location.pathname : '/list'; }
function navigateTo(path, options = {}){
  const target = ROUTES[path] ? path : '/list';
  if(!options.replace && window.location.pathname !== target) history.pushState({}, '', target);
  else if(options.replace && window.location.pathname !== target) history.replaceState({}, '', target);
  showView(ROUTES[target].viewId, { skipHistory: true });
}
function initRouter(){
  window.addEventListener('popstate', () => navigateTo(currentRoutePath(), { replace: true }));
  if(!ROUTES[window.location.pathname]) history.replaceState({}, '', '/list');
  navigateTo(currentRoutePath(), { replace: true });
}
