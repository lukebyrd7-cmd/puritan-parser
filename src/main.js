/* ============================================================
   THE PURITAN PARSER v3 MODULAR ENTRY POINT
   ============================================================ */

const PURITAN_PARSER_CORE_SCRIPTS = [
  'src/core/parser-core.js',
  'src/core/migrations/migrations.js',
  'src/core/migrations/migration-runner.js',
  'src/app-state.js',
  'src/ui/dom.js',
  'src/ui/toast.js',
  'src/models/word-entry.js',
  'src/models/gloss.js',
  'src/models/user-progress.js',
  'src/models/parse-data.js',
  'src/models/review-history.js',
  'src/models/preferences.js',
  'src/models/dashboard-stats.js',
  'src/models/vocabulary-learning.js',
  'src/models/saved-vocabulary.js',
  'src/models/study-sets.js',
  'src/models/onboarding.js',
  'src/core/storage/storage.js',
  'src/core/storage/vocab-storage.js',
  'src/core/storage/prefs-storage.js',
  'src/core/storage/dashboard-storage.js',
  'src/core/srs.js',
  'src/core/sample-data.js',
  'src/core/source-data/vocab-source.js',
  'src/core/source-data/parser-source.js',
  'src/core/content/content-metadata.js',
  'src/core/content/content-loader.js',
  'src/core/translations/translation-provider.js',
  'src/core/data-loader.js',
  'src/ui/theme.js',
  'src/core/filters.js',
  'src/core/study-entries.js',
  'src/core/book-progress.js',
  'src/core/progress-service.js',
  'src/core/router.js',
  'src/features/vocab/index.js',
  'src/ui/modal.js',
  'src/features/flashcards/index.js',
  'src/features/parsing/index.js',
  'src/features/dashboard/index.js',
  'src/features/settings/index.js',
  'src/features/settings/events.js'
];

const PURITAN_PARSER_FEATURE_SCRIPTS = {
  learn: [
    'src/features/learn/recognition-engine.js',
    'src/features/learn/index.js'
  ],
  reader: ['src/features/reader/index.js'],
  grammar: [
    'src/features/grammar/handbook-data.js',
    'src/features/grammar/reference-data.js',
    'src/features/grammar/index.js'
  ],
  progress: ['src/features/progress/index.js'],
  search: ['src/features/global-search/index.js'],
  onboarding: ['src/features/onboarding/index.js']
};

const PURITAN_PARSER_SCRIPTS = [
  ...PURITAN_PARSER_CORE_SCRIPTS,
  ...Object.values(PURITAN_PARSER_FEATURE_SCRIPTS).flat(),
  'src/bootstrap.js'
];
const PURITAN_PARSER_ASSET_VERSION = 'v1.5-interaction-stability-4';
const PURITAN_SCRIPT_LOAD_TIMEOUT_MS = 9000;

const puritanLoadedScripts = new Map();
const puritanFeaturePromises = new Map();
const puritanReadyFeatures = new Set();

function loadScriptSequentially(src) {
  if(puritanLoadedScripts.has(src)) return puritanLoadedScripts.get(src);
  const pending = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    let timeoutHandle = null;
    const finish = callback => {
      clearTimeout(timeoutHandle);
      callback();
    };
    script.async = false;
    const rootPath = src.startsWith('/') ? src : `/${src}`;
    script.src = `${rootPath}?v=${PURITAN_PARSER_ASSET_VERSION}`;
    script.onload = () => finish(resolve);
    script.onerror = () => finish(() => reject(new Error(`Unable to load ${src}`)));
    timeoutHandle = setTimeout(() => {
      script.remove();
      reject(new Error(`Loading ${src} timed out.`));
    }, PURITAN_SCRIPT_LOAD_TIMEOUT_MS);
    document.head.appendChild(script);
  }).catch(error => {
    puritanLoadedScripts.delete(src);
    throw error;
  });
  puritanLoadedScripts.set(src, pending);
  return pending;
}

function loadScriptGroup(scripts = []) {
  return Promise.all(scripts.map(loadScriptSequentially));
}

function featureForView(viewId = '') {
  const normalized = String(viewId || '').replace(/View$/, '');
  if(normalized === 'learn') return 'learn';
  if(['reader', 'wordPage', 'word'].includes(normalized)) return 'reader';
  if(['grammar', 'reference', 'aboutSources'].includes(normalized)) return 'grammar';
  if(normalized === 'progress') return 'progress';
  if(['globalSearch', 'search'].includes(normalized)) return 'search';
  if(['onboarding', 'profile'].includes(normalized)) return 'onboarding';
  return '';
}

function featureForPath(path = window.location.pathname) {
  const clean = String(path || '/').split('?')[0];
  if(clean === '/' || clean === '/learn') return 'learn';
  if(clean === '/reader' || clean === '/word') return 'reader';
  if(clean === '/grammar' || clean === '/settings/sources') return 'grammar';
  if(clean === '/progress') return 'progress';
  if(clean === '/search') return 'search';
  if(clean === '/onboarding' || clean === '/profile') return 'onboarding';
  return '';
}

function ensurePuritanFeature(feature = '') {
  if(!feature || !PURITAN_PARSER_FEATURE_SCRIPTS[feature]) return Promise.resolve();
  if(puritanReadyFeatures.has(feature)) return Promise.resolve();
  if(puritanFeaturePromises.has(feature)) return puritanFeaturePromises.get(feature);
  const pending = loadScriptGroup(PURITAN_PARSER_FEATURE_SCRIPTS[feature])
    .then(() => { puritanReadyFeatures.add(feature); })
    .catch(error => {
      puritanFeaturePromises.delete(feature);
      throw error;
    });
  puritanFeaturePromises.set(feature, pending);
  return pending;
}

function puritanFeatureReadyForView(viewId = '') {
  const feature = featureForView(viewId);
  return !feature || puritanReadyFeatures.has(feature);
}

window.PuritanModuleLoader = {
  ensureView(viewId) { return ensurePuritanFeature(featureForView(viewId)); },
  isViewReady: puritanFeatureReadyForView,
  featureForPath
};

async function startPuritanParser() {
  await loadScriptGroup(PURITAN_PARSER_CORE_SCRIPTS);
  await ensurePuritanFeature(featureForPath());
  await loadScriptSequentially('src/bootstrap.js');
}

startPuritanParser().catch(error => {
  console.error('The Puritan Parser failed to load.', error);
  document.documentElement.classList.add('app-load-failed');
  const status = document.getElementById('appLoadingStatus');
  if(status) status.innerHTML = '<strong>Puritan Parser could not start.</strong><br><button type="button" onclick="location.reload()">Try again</button>';
});
