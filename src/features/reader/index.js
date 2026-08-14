/* ---------- Reader ---------- */
const ReaderStorageKey = 'pp_reader_location';
const ReaderSettingsStorageKey = 'pp_reader_adaptive_settings';
const ReaderModes = ['chapter', 'continuous'];
const ReaderContinuousWindowSize = 5;
const ReaderAssistancePresets = ['everything', '50', '30', '20', '10', '5', '2', '1', 'none'];
const ReaderTranslationOptions = [
  { id: 'oeb', label: 'OEB', name: 'Open English Bible' },
  { id: 'web', label: 'WEB', name: 'World English Bible' }
];
const ReaderStudySetsModel = (typeof PuritanStudySets !== 'undefined')
  ? PuritanStudySets
  : (typeof require === 'function' ? require('../../models/study-sets') : null);
const ReaderSavedVocabularyModel = (typeof PuritanSavedVocabulary !== 'undefined')
  ? PuritanSavedVocabulary
  : (typeof require === 'function' ? require('../../models/saved-vocabulary') : null);
const ReaderVocabularyMasteryModel = (typeof VocabularyMastery !== 'undefined')
  ? VocabularyMastery
  : (typeof require === 'function' ? require('../../core/vocabulary-mastery') : null);
const ReaderLearningPracticeModel = (typeof LearningPractice !== 'undefined')
  ? LearningPractice
  : (typeof require === 'function' ? require('../../core/learning-practice') : null);
const ReaderDefaultSettings = {
  display: 'original',
  hebrewDisplay: 'standard',
  translation: 'on',
  translationProvider: 'web',
  textMode: 'original',
  showOriginal: true,
  showEnglish: false,
  assistance: 'everything',
  customThreshold: '',
  hideKnown: false,
  indicator: 'none',
  floatingControls: false,
  floatingTranslationToggle: false,
  showTranslationToggle: true,
  wordDetailsDisplay: 'auto'
};
const ReaderSharedSettingKeys = ['display', 'translation', 'translationProvider', 'textMode', 'showOriginal', 'showEnglish', 'hideKnown', 'indicator', 'floatingControls', 'floatingTranslationToggle', 'showTranslationToggle', 'wordDetailsDisplay'];
const HebrewInterlinearUnavailableMessage = 'Interlinear glosses are unavailable for this chapter. Standard Hebrew remains available.';
const ReaderConfig = {
  hebrew: {
    label: 'Hebrew Bible',
    shortLabel: 'Hebrew',
    htmlLang: 'he',
    dir: 'rtl',
    dataRoot: 'data/hebrew',
    interlinearRoot: 'data/hebrew-interlinear',
    manifestPath: 'data/hebrew/manifest.json',
    glossPath: 'data/glosses/hebrew-glosses.json',
    searchIndexPath: 'data/hebrew/search-index.json',
    searchPlaceholder: 'Search Hebrew text, lemma, or book reference...',
    useSurfaceForNumericLemmaHeadword: true,
    grammarLinks: {
      noun: [['Hebrew Nouns','hebrew-nouns']],
      adjective: [['Hebrew Nouns','hebrew-nouns']],
      verb: [['Hebrew Verbs','hebrew-verbs']],
      participle: [['Hebrew Verbs','hebrew-verbs']],
      article: [['Particles','hebrew-particles'], ['Hebrew Nouns','hebrew-nouns']]
    },
    books: []
  },
  greek: {
    label: 'Greek New Testament',
    shortLabel: 'Greek',
    htmlLang: 'grc',
    dir: 'ltr',
    dataRoot: 'data/greek',
    manifestPath: 'data/greek/manifest.json',
    glossPath: 'data/glosses/greek-glosses.json',
    searchIndexPath: 'data/greek/search-index.json',
    searchPlaceholder: 'Search Greek text, lemma, or Matthew 1:1...',
    grammarLinks: {
      noun: [['Greek Nouns','greek-nouns']],
      adjective: [['Greek Adjectives','greek-adjectives']],
      verb: [['Greek Verbs','greek-verbs']],
      participle: [['Greek Verbs','greek-verbs']],
      article: [['Greek Nouns','greek-nouns']]
    },
    books: []
  }
};
const FallbackReaderBooks = {
  greek: [{ id: 'matthew', name: 'Matthew', chapters: [1, 2] }],
  hebrew: [{ id: 'jonah', name: 'Jonah', chapters: [1] }]
};
const ReaderVocabularyLearningModel = (typeof VocabularyLearning !== 'undefined')
  ? VocabularyLearning
  : (typeof require === 'function' ? require('../../models/vocabulary-learning') : null);
const ReaderTranslationApi = (typeof getTranslationProvider !== 'undefined')
  ? { getTranslationProvider, translationVerseText }
  : (typeof require === 'function' ? require('../../core/translations/translation-provider') : null);
const ReaderPreferenceApi = (typeof PuritanReaderPreferences !== 'undefined')
  ? PuritanReaderPreferences
  : (typeof require === 'function' ? require('../../core/reader-preferences') : null);
const ReaderHebrewSearchApi = (typeof PuritanHebrewSearch !== 'undefined')
  ? PuritanHebrewSearch
  : (typeof require === 'function' ? require('../../core/hebrew-search') : null);
const ReaderGlossModel = (typeof GlossModel !== 'undefined')
  ? GlossModel
  : (typeof require === 'function' ? require('../../models/gloss') : null);

let readerState = {
  language: 'greek',
  book: 'matthew',
  chapter: 1,
  mode: 'continuous',
  anchorVerse: '',
  anchorOffset: 0,
  scrollTop: 0,
  chapterData: null,
  continuousChapters: [],
  translationData: null,
  translationStatus: null,
  interlinearStatus: null,
  loading: false,
  error: '',
  focusVerse: '',
  activeToken: null,
  wordPageInfo: null,
  wordPageReturnLocation: null,
  wordDetailsView: 'quick',
  wordDetailsEffectiveMode: 'overlay'
};
const readerChapterCache = new Map();
const readerChapterPromises = new Map();
const readerInterlinearChapterCache = new Map();
const readerInterlinearPromises = new Map();
const readerInterlinearLoadCounts = {};
const readerTranslationLoadCounts = {};
const readerTranslationPromises = new Map();
const readerTranslationChapterCache = new Map();
const readerPassagePromises = new Map();
const readerPreparedPassageHtml = new Map();
const readerManifestCache = new Map();
const readerLoadCounts = {};
const readerGlossSourceCache = new Map();
const readerVocabularyIndexCache = new Map();
const readerLearningEntryIndexCache = new Map();
const readerSearchIndexCache = new Map();
const readerSearchIndexPromises = new Map();
let readerPopupLastTrigger = null;
let readerWordHistoryActive = false;
let readerWordPreviousHistoryState = null;
let readerHiddenToastAt = 0;
let readerSettingsPanelOpen = false;
let readerSearchOpen = false;
let readerTouchStart = null;
let readerInitialized = false;
let readerScrollTimer = null;
let readerWordLookupRequestId = 0;
let readerSearchRequestId = 0;
let readerChapterObserver = null;
let readerContinuousLoadPending = false;
let readerProgrammaticScroll = false;
let readerRestoreFrame = null;
let readerRestoreRequestId = 0;
let readerRestoreObserver = null;
let readerRestoreState = 'complete';
let readerRestoreCorrectionCount = 0;
let readerRestoreAnchor = null;
let readerRestoreScheduledAt = 0;
let readerPrefetchHandle = null;
let readerUserScrolledAt = 0;
let readerMomentumInputAt = 0;
let readerMomentumDirection = 0;
let readerLastRestoreAt = 0;
let readerLastScrollPosition = 0;
let readerLastScrollAt = 0;
let readerLocationRequestId = 0;
let readerVisibilityRequestId = 0;
let readerLanguageRenderFrame = null;
const ReaderWordDetailsLayout = { panelWidth: 400, minPassageWidth: 600, minSidePanelWidth: 1040 };

function normalizeReaderWordDetailsDisplay(value){
  return ['auto', 'overlay', 'side'].includes(value) ? value : 'auto';
}
function resolveReaderWordDetailsMode(requested = 'auto', availableWidth = 0){
  const mode = normalizeReaderWordDetailsDisplay(requested);
  const width = Math.max(0, Number(availableWidth) || 0);
  const canUseSide = width >= ReaderWordDetailsLayout.minSidePanelWidth && width - ReaderWordDetailsLayout.panelWidth >= ReaderWordDetailsLayout.minPassageWidth;
  if(mode === 'overlay') return 'overlay';
  if(mode === 'side') return canUseSide ? 'side' : 'overlay';
  return canUseSide ? 'side' : 'overlay';
}
function readerAvailableDetailsWidth(){
  if(typeof window === 'undefined') return 0;
  const shell = typeof document !== 'undefined' ? document.getElementById('readerShell') : null;
  return Number(shell?.clientWidth || window.innerWidth || 0);
}
function currentReaderWordDetailsMode(settings = getActiveReaderSettings()){
  return resolveReaderWordDetailsMode(settings.wordDetailsDisplay, readerAvailableDetailsWidth());
}


function syncReaderWordDetailsLayout(effectiveMode = readerState.wordDetailsEffectiveMode, hasActiveToken = Boolean(readerState.activeToken)){
  const sideActive = Boolean(hasActiveToken && effectiveMode === 'side');
  const shell = typeof document !== 'undefined' ? document.getElementById('readerShell') : $('#readerShell');
  const layout = typeof document !== 'undefined' ? document.querySelector?.('.reader-content-layout') : $('.reader-content-layout');
  const panelRoot = $('#readerWordPanelRoot');
  const overlayRoot = $('#readerWordPopupRoot');
  shell?.classList?.toggle?.('reader-shell-with-details', sideActive);
  layout?.classList?.toggle?.('reader-content-layout-side', sideActive);
  if(!sideActive && panelRoot) panelRoot.innerHTML = '';
  if((!hasActiveToken || effectiveMode === 'side') && overlayRoot) overlayRoot.innerHTML = '';
  if(!hasActiveToken && overlayRoot) overlayRoot.innerHTML = '';
  return sideActive;
}
function resetReaderWordDetailsState(options = {}){
  releaseReaderWordHistory({ goBack: false });
  const previousTrigger = readerPopupLastTrigger;
  readerWordLookupRequestId += 1;
  readerState.activeToken = null;
  readerState.wordDetailsView = 'quick';
  readerState.wordDetailsEffectiveMode = currentReaderWordDetailsMode();
  syncReaderWordDetailsLayout(readerState.wordDetailsEffectiveMode, false);
  if(options.restoreFocus !== false) previousTrigger?.focus?.({ preventScroll: true });
  if(options.clearTrigger !== false) readerPopupLastTrigger = null;
  return null;
}
function openReaderWordHistoryEntry(){
  if(readerWordHistoryActive || currentReaderWordDetailsMode() !== 'overlay' || typeof window === 'undefined' || !window.history?.pushState) return false;
  readerWordPreviousHistoryState = window.history.state;
  window.history.pushState({ ...(window.history.state || {}), readerWordDetails: true }, '', window.location?.href);
  readerWordHistoryActive = true;
  return true;
}
function releaseReaderWordHistory(options = {}){
  if(!readerWordHistoryActive || typeof window === 'undefined' || !window.history) return false;
  const marked = window.history.state?.readerWordDetails === true;
  readerWordHistoryActive = false;
  if(marked && options.goBack !== false && window.history.back){ window.history.back(); return true; }
  if(marked && window.history.replaceState) window.history.replaceState(readerWordPreviousHistoryState, '', window.location?.href);
  return true;
}
function handleReaderWordPopState(event){
  if(!readerWordHistoryActive || event?.state?.readerWordDetails) return false;
  readerWordHistoryActive = false;
  if(readerState.activeToken) resetReaderWordDetailsState();
  return true;
}
function readerTokenSelectionKey(info = {}){
  return [info.language || '', info.reference || '', info.surface || '', info.lemma || '', info.parse || ''].join('|');
}

function normalizeReaderBook(book){
  const chapters = Array.isArray(book.chapters) ? book.chapters.map(Number).filter(Boolean).sort((a, b) => a - b) : Array.from({ length: Number(book.chapters) || 0 }, (_, i) => i + 1);
  return { ...book, chapters, chapterCount: chapters.length };
}
function normalizeReaderManifest(manifest = {}){
  const books = (manifest.books || []).map(normalizeReaderBook).filter(book => book.id && book.chapters.length);
  return { ...manifest, books };
}
function getReaderConfig(language = readerState.language){ return ReaderConfig[language] || ReaderConfig.greek; }
function getReaderLanguageMeta(language = readerState.language){
  const config = getReaderConfig(language);
  return { language: ReaderConfig[language] ? language : 'greek', htmlLang: config.htmlLang || 'grc', dir: config.dir || 'ltr', label: config.label || 'Greek New Testament' };
}
function getReaderBooks(language = readerState.language){ return getReaderConfig(language).books.length ? getReaderConfig(language).books : FallbackReaderBooks[language] || FallbackReaderBooks.greek; }
function getReaderBook(language, bookId){ return getReaderBooks(language).find(book => book.id === bookId) || getReaderBooks(language)[0]; }
function readerCacheKey(language, book, chapter){ return `${language}/${book}/${chapter}`; }
function getReaderChapterPath(language, book, chapter){ return `${getReaderConfig(language).dataRoot}/${book}/${chapter}.json`; }
function getReaderTranslationOption(id = 'oeb'){ return ReaderTranslationOptions.find(option => option.id === id) || ReaderTranslationOptions[0]; }
function getReaderTranslationProvider(id = getActiveReaderSettings().translationProvider){ return ReaderTranslationApi?.getTranslationProvider?.(getReaderTranslationOption(id).id); }
function readerTranslationCacheKey(book = readerState.book, chapter = readerState.chapter, id = getActiveReaderSettings().translationProvider){ return `${getReaderTranslationOption(id).id}/${book}/${chapter}`; }
function normalizeReaderText(value){ return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
function cleanReaderTokenValue(value){ return String(value || '').trim(); }
function normalizeReaderQereKetiv(value){
  const clean = cleanReaderTokenValue(value);
  return /^(?:none|n\/a|—|-)$/i.test(clean) ? '' : clean;
}
function escReaderAttr(value){ return escHtml(value).replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
function readerReferenceLabel(reference = {}){
  const bookName = reference.bookName || getReaderBook(reference.language || readerState.language, reference.book || readerState.book)?.name || '';
  const chapter = reference.chapter || readerState.chapter;
  const verse = reference.verse || '';
  return `${bookName} ${chapter}${verse ? `:${verse}` : ''}`.trim();
}
function parseReaderReference(value, language = readerState.language){
  const match = String(value || '').trim().match(/^([1-3]?\s?[A-Za-z]+)\s+(\d+)(?::(\d+))?$/);
  if(!match) return null;
  const bookName = match[1].toLowerCase().replace(/\s+/g, '');
  const languages = [language, ...Object.keys(ReaderConfig).filter(item => item !== language)];
  for(const lang of languages){
    const book = getReaderBooks(lang).find(item => item.id === bookName || item.name.toLowerCase().replace(/\s+/g, '') === bookName);
    if(book) return { language: lang, book: book.id, chapter: Number(match[2]), verse: match[3] || '' };
  }
  return null;
}
function normalizeReaderMode(value){ return ReaderPreferenceApi?.normalizeMode?.(value) || (ReaderModes.includes(value) ? value : 'continuous'); }
function getReaderLocation(){
  return {
    language: readerState.language,
    book: readerState.book,
    chapter: readerState.chapter,
    mode: normalizeReaderMode(readerState.mode),
    verse: cleanReaderTokenValue(readerState.anchorVerse || readerState.focusVerse),
    anchorOffset: Number.isFinite(Number(readerState.anchorOffset)) ? Number(readerState.anchorOffset) : 0,
    scrollTop: Math.max(0, Number(readerState.scrollTop) || 0),
    scrollY: Math.max(0, Number(readerState.scrollY) || 0)
  };
}
function saveReaderLocation(location = getReaderLocation()){
  const clean = {
    language: ReaderConfig[location.language] ? location.language : 'greek',
    book: cleanReaderTokenValue(location.book) || 'matthew',
    chapter: Math.max(1, Number(location.chapter) || 1),
    mode: normalizeReaderMode(location.mode),
    verse: cleanReaderTokenValue(location.verse || location.anchorVerse),
    anchorOffset: Number.isFinite(Number(location.anchorOffset)) ? Number(location.anchorOffset) : 0,
    scrollTop: Math.max(0, Number(location.scrollTop) || 0),
    scrollY: Math.max(0, Number(location.scrollY) || 0)
  };
  if(ReaderPreferenceApi?.writeLanguageLocation){
    const { updatedAt, ...saved } = ReaderPreferenceApi.writeLanguageLocation(clean);
    return saved;
  }
  if(typeof writeStorageJson === 'function') writeStorageJson(ReaderStorageKey, clean);
  else if(typeof localStorage !== 'undefined') localStorage.setItem(ReaderStorageKey, JSON.stringify(clean));
  return clean;
}
function loadReaderLocation(){
  if(ReaderPreferenceApi?.readLanguageLocation){
    const record = ReaderPreferenceApi.readLocationRecord?.();
    const { updatedAt, ...location } = ReaderPreferenceApi.readLanguageLocation(record?.activeLanguage);
    return location;
  }
  let stored = null;
  if(typeof readStorageJson === 'function') stored = readStorageJson(ReaderStorageKey, null);
  else if(typeof localStorage !== 'undefined') { try { stored = JSON.parse(localStorage.getItem(ReaderStorageKey) || 'null'); } catch(e) { stored = null; } }
  if(!stored) return { ...getReaderLocation(), mode: ReaderPreferenceApi?.readMode?.() || 'continuous' };
  const language = ReaderConfig[stored.language] ? stored.language : 'greek';
  return {
    language,
    book: cleanReaderTokenValue(stored.book) || (language === 'hebrew' ? 'jonah' : 'matthew'),
    chapter: Math.max(1, Number(stored.chapter) || 1),
    mode: normalizeReaderMode(stored.mode),
    verse: cleanReaderTokenValue(stored.verse || stored.anchorVerse),
    anchorOffset: Number.isFinite(Number(stored.anchorOffset)) ? Number(stored.anchorOffset) : 0,
    scrollTop: Math.max(0, Number(stored.scrollTop) || 0),
    scrollY: Math.max(0, Number(stored.scrollY) || 0)
  };
}
function sanitizeReaderSettings(settings = {}, language = readerState.language){
  const supplied = settings && typeof settings === 'object' ? settings : {};
  const next = { ...ReaderDefaultSettings, ...(settings || {}) };
  next.display = next.display === 'interlinear' ? 'interlinear' : 'original';
  next.hebrewDisplay = next.hebrewDisplay === 'interlinear' ? 'interlinear' : 'standard';
  if(language === 'hebrew') next.display = next.hebrewDisplay === 'interlinear' ? 'interlinear' : 'original';
  next.translation = next.translation === 'on' ? 'on' : 'off';
  next.translationProvider = ReaderTranslationOptions.some(option => option.id === next.translationProvider) ? next.translationProvider : ReaderDefaultSettings.translationProvider;
  const preferredMode = supplied.textMode === 'english' ? 'english' : 'original';
  const hasVisibilityState = Object.prototype.hasOwnProperty.call(supplied, 'showOriginal') || Object.prototype.hasOwnProperty.call(supplied, 'showEnglish');
  const legacyOriginal = hasVisibilityState && supplied.showOriginal !== false;
  const legacyEnglish = hasVisibilityState && Boolean(supplied.showEnglish);
  const explicitEnglishPreferenceWithLegacyDefaults = supplied.textMode === 'english'
    && supplied.showOriginal === ReaderDefaultSettings.showOriginal
    && supplied.showEnglish === ReaderDefaultSettings.showEnglish;
  if(explicitEnglishPreferenceWithLegacyDefaults) next.textMode = 'english';
  else if(hasVisibilityState && legacyEnglish !== legacyOriginal) next.textMode = legacyEnglish ? 'english' : 'original';
  else next.textMode = preferredMode;
  if(next.translation === 'off') next.textMode = 'original';
  next.showOriginal = next.textMode === 'original';
  next.showEnglish = next.textMode === 'english';
  next.assistance = ReaderAssistancePresets.includes(String(next.assistance)) || next.assistance === 'custom' ? String(next.assistance) : ReaderDefaultSettings.assistance;
  next.customThreshold = String(next.customThreshold || '').trim();
  next.hideKnown = Boolean(next.hideKnown);
  next.indicator = ['none', 'tint', 'underline', 'footnote'].includes(next.indicator) ? next.indicator : ReaderDefaultSettings.indicator;
  next.floatingControls = Boolean(next.floatingControls);
  next.floatingTranslationToggle = Boolean(next.floatingTranslationToggle);
  next.showTranslationToggle = next.showTranslationToggle !== false;
  next.wordDetailsDisplay = ['auto', 'overlay', 'side'].includes(next.wordDetailsDisplay) ? next.wordDetailsDisplay : ReaderDefaultSettings.wordDetailsDisplay;
  return next;
}
function loadAllReaderSettings(){
  let stored = null;
  if(typeof readStorageJson === 'function') stored = readStorageJson(ReaderSettingsStorageKey, null);
  else if(typeof localStorage !== 'undefined') { try { stored = JSON.parse(localStorage.getItem(ReaderSettingsStorageKey) || 'null'); } catch(e) { stored = null; } }
  if(!stored || typeof stored !== 'object') return {};
  return stored;
}
function deriveSharedReaderSettings(all = {}, language = readerState.language){
  if(all.shared && typeof all.shared === 'object') return all.shared;
  const sources = [language, 'greek', 'hebrew']
    .filter((item, index, list) => item && list.indexOf(item) === index)
    .map(item => all[item])
    .filter(item => item && typeof item === 'object');
  const shared = {};
  sources.forEach(source => {
    ReaderSharedSettingKeys.forEach(key => {
      if(!Object.prototype.hasOwnProperty.call(shared, key) && Object.prototype.hasOwnProperty.call(source, key)) shared[key] = source[key];
    });
  });
  return shared;
}
function saveAllReaderSettings(settingsByLanguage = {}){
  if(typeof writeStorageJson === 'function') writeStorageJson(ReaderSettingsStorageKey, settingsByLanguage);
  else if(typeof localStorage !== 'undefined') localStorage.setItem(ReaderSettingsStorageKey, JSON.stringify(settingsByLanguage));
}
function loadReaderSettings(language = readerState.language){
  const all = loadAllReaderSettings();
  const legacyLanguage = all[language] && typeof all[language] === 'object' ? all[language] : {};
  const shared = deriveSharedReaderSettings(all, language);
  const hebrewDisplay = language === 'hebrew'
    ? (ReaderPreferenceApi?.readHebrewDisplay?.() || legacyLanguage.hebrewDisplay || 'standard')
    : 'standard';
  return sanitizeReaderSettings({ ...shared, hebrewDisplay, assistance: legacyLanguage.assistance, customThreshold: legacyLanguage.customThreshold }, language);
}
function saveReaderSettings(settings = loadReaderSettings(), language = readerState.language){
  const all = loadAllReaderSettings();
  const clean = sanitizeReaderSettings(settings, language);
  const existingLanguage = all[language] && typeof all[language] === 'object' ? all[language] : {};
  all.shared = { ...(all.shared || {}) };
  ReaderSharedSettingKeys.forEach(key => {
    if(key === 'display' && language === 'hebrew') return;
    all.shared[key] = clean[key];
  });
  all[language] = {
    assistance: clean.assistance,
    customThreshold: clean.customThreshold,
    ...(language === 'hebrew' ? { hebrewDisplay: clean.display === 'interlinear' ? 'interlinear' : 'standard' } : {}),
    ...(Object.prototype.hasOwnProperty.call(existingLanguage, 'legacy') ? { legacy: existingLanguage.legacy } : {})
  };
  saveAllReaderSettings(all);
  if(language === 'hebrew') ReaderPreferenceApi?.writeHebrewDisplay?.(clean.display === 'interlinear' ? 'interlinear' : 'standard');
  return clean;
}
function getActiveReaderSettings(){ return loadReaderSettings(readerState.language); }
function readerAssistanceThreshold(settings = getActiveReaderSettings()){
  if(settings.assistance === 'everything') return Number.POSITIVE_INFINITY;
  if(settings.assistance === 'none') return null;
  const value = Number(settings.assistance === 'custom' ? settings.customThreshold : settings.assistance);
  return Number.isInteger(value) && value > 0 ? value : null;
}
function readerAssistanceLabel(settings = getActiveReaderSettings()){
  if(settings.assistance === 'everything') return 'Everything';
  if(settings.assistance === 'none') return 'None';
  if(settings.assistance === 'custom') return `${settings.customThreshold || '?'}+`;
  return `${settings.assistance}+`;
}
function readerDisplayLabel(settings = getActiveReaderSettings()){
  if(settings.showEnglish) return 'English';
  return settings.display === 'interlinear' ? 'Interlinear' : 'Original';
}
function renderReaderStatus(settings = getActiveReaderSettings()){
  return [readerDisplayLabel(settings), settings.translation === 'on' ? getReaderTranslationOption(settings.translationProvider).label : '', readerAssistanceLabel(settings), settings.hideKnown ? 'Hide Known' : ''].filter(Boolean).join(' • ');
}
async function fetchReaderJson(path){
  if(typeof fetch !== 'function') throw new Error('Fetch is unavailable for reader data.');
  const response = await fetch(path);
  if(!response.ok) throw new Error(`Unable to load ${path}`);
  return response.json();
}
async function loadReaderGlossSource(language = 'greek'){
  const config = getReaderConfig(language);
  if(readerGlossSourceCache.has(language)) return readerGlossSourceCache.get(language);
  let glosses = {};
  try {
    glosses = typeof loadLexicalGlossMap === 'function'
      ? await loadLexicalGlossMap(language)
      : await fetchReaderJson(config.glossPath);
  }
  catch(e) { glosses = {}; }
  readerGlossSourceCache.set(language, glosses);
  return glosses;
}
async function loadReaderSearchIndex(language = 'greek'){
  const config = getReaderConfig(language);
  if(readerSearchIndexCache.has(language)) return readerSearchIndexCache.get(language);
  if(readerSearchIndexPromises.has(language)) return readerSearchIndexPromises.get(language);
  const pending = fetchReaderJson(config.searchIndexPath)
    .then(index => {
      readerSearchIndexCache.set(language, index);
      readerSearchIndexPromises.delete(language);
      return index;
    })
    .catch(error => {
      readerSearchIndexPromises.delete(language);
      throw error;
    });
  readerSearchIndexPromises.set(language, pending);
  return pending;
}
function getReaderVocabulary(language = 'greek'){
  if(typeof state !== 'undefined' && Array.isArray(state.data?.[language])) return state.data[language];
  return [];
}
function prepareReaderVocabularyIndex(language = 'greek'){
  const entries = getReaderVocabulary(language);
  const revision = typeof state !== 'undefined' ? Number(state.dataRevision) || 0 : 0;
  const cached = readerVocabularyIndexCache.get(language);
  if(cached && cached.entries === entries && cached.revision === revision) return cached;
  const exact = new Map();
  const normalized = new Map();
  entries.forEach(entry => {
    if(String(entry?.lang || language).toLowerCase() !== language) return;
    const lemma = cleanReaderTokenValue(entry?.lemma || entry?.word);
    if(!lemma) return;
    if(!exact.has(lemma)) exact.set(lemma, []);
    exact.get(lemma).push(entry);
    const key = normalizeReaderText(lemma);
    if(!normalized.has(key)) normalized.set(key, []);
    normalized.get(key).push(entry);
  });
  const index = { entries, revision, exact, normalized };
  readerVocabularyIndexCache.set(language, index);
  return index;
}
function getReaderStudyVocabulary(language = 'greek'){
  const entries = getReaderVocabulary(language);
  return typeof getStudyEntries === 'function' ? getStudyEntries(entries, 'lemma') : entries;
}
function prepareReaderLearningEntryIndex(language = 'greek'){
  const entries = getReaderStudyVocabulary(language);
  const revision = typeof state !== 'undefined' ? Number(state.dataRevision) || 0 : 0;
  const cached = readerLearningEntryIndexCache.get(language);
  if(cached && cached.entries === entries && cached.revision === revision) return cached.byId;
  const byId = new Map();
  entries.forEach(entry => {
    const id = ReaderVocabularyLearningModel?.lemmaId?.(entry) || cleanReaderTokenValue(entry?.id);
    if(id) byId.set(id, entry);
  });
  readerLearningEntryIndexCache.set(language, { entries, revision, byId });
  return byId;
}
function bestReaderVocabMatches(lemma, language = 'greek'){
  const exact = cleanReaderTokenValue(lemma);
  const normalized = normalizeReaderText(exact);
  const index = prepareReaderVocabularyIndex(language);
  return index.exact.get(exact) || index.normalized.get(normalized) || [];
}
function readerVocabularyLearningEntry(info = {}){
  const language = String(info.language || readerState.language || 'greek').toLowerCase() === 'hebrew' ? 'hebrew' : 'greek';
  const stableId = cleanReaderTokenValue(info.id);
  if(stableId){
    const exact = prepareReaderLearningEntryIndex(language).get(stableId);
    if(exact) return exact;
  }
  const lemma = cleanReaderTokenValue(info.lemma || info.surface);
  if(!lemma) return null;
  const normalized = normalizeReaderText(lemma);
  const studyEntries = getReaderStudyVocabulary(language);
  return studyEntries.find(entry =>
    String(entry?.lang || language).toLowerCase() === language &&
    (cleanReaderTokenValue(entry?.lemma || entry?.word) === lemma || normalizeReaderText(entry?.lemma || entry?.word) === normalized)
  ) || bestReaderVocabMatches(lemma, language)[0] || null;
}
function readerLearningStatusForInfo(info = {}){
  const entry = readerVocabularyLearningEntry(info);
  if(!entry || !ReaderVocabularyLearningModel) return ReaderVocabularyLearningModel?.STATUS?.NOT_LEARNED || 'Not Learned';
  return ReaderVocabularyLearningModel.learningStatus(ReaderVocabularyLearningModel.loadStore(), entry);
}
function readerLearningDetailsForInfo(info = {}){
  const entry = readerVocabularyLearningEntry(info);
  if(!entry || !ReaderVocabularyLearningModel?.learningStatusDetails) return null;
  return ReaderVocabularyLearningModel.learningStatusDetails(ReaderVocabularyLearningModel.loadStore(), entry);
}
function readerTokenFrequency(token = {}, language = readerState.language){
  const lemma = cleanReaderTokenValue(token.lemma || token.surface);
  if(!lemma) return 0;
  const matches = bestReaderVocabMatches(lemma, language);
  const aggregate = matches.reduce((sum, entry) => sum + (Number(entry.freq) || 0), 0);
  return aggregate || Math.max(0, ...matches.map(entry => Number(entry.freq) || 0));
}
function readerTokenGloss(token = {}, language = readerState.language){
  const normalized = normalizeReaderToken(token, language);
  const glossSource = readerGlossSourceCache.get(language) || {};
  const sourceGloss = glossSource[normalized.lemma] || glossSource[Object.keys(glossSource).find(key => normalizeReaderText(key) === normalizeReaderText(normalized.lemma))];
  const matches = bestReaderVocabMatches(normalized.lemma || normalized.surface, language);
  return cleanReaderTokenValue(normalized.primaryGloss || normalized.gloss)
    || cleanReaderTokenValue(sourceGloss?.primaryGloss)
    || cleanReaderTokenValue(matches.find(entry => entry.primaryGloss)?.primaryGloss)
    || splitLegacyGloss(matches.find(entry => entry.gloss)?.gloss)[0]
    || cleanReaderTokenValue(sourceGloss?.gloss)
    || '';
}
function readerTokenEnglishGlossFields(token = {}){
  return [
    token.primaryGloss,
    token.gloss,
    token.englishGloss,
    token.interlinearGloss,
    token.tokenGloss
  ].map(cleanReaderTokenValue).filter(Boolean);
}
function isReaderEnglishGloss(value){
  const clean = cleanReaderTokenValue(value);
  return Boolean(clean && /[A-Za-z]/.test(clean) && !hasHebrewText(clean) && !isNumericReaderLemma(clean));
}
function readerChapterTokens(data = {}){
  return (data.paragraphs || [{ verses: data.verses || [] }])
    .flatMap(paragraph => paragraph.verses || [])
    .flatMap(verse => Array.isArray(verse.tokens) ? verse.tokens : []);
}
function readerChapterHasReliableInterlinearGlossData(data = {}, language = readerState.language){
  if(language !== 'hebrew') return true;
  const tokens = readerChapterTokens(data);
  return tokens.length > 0 && tokens.every(token => cleanReaderTokenValue(token.tokenId) && ['source', 'missing'].includes(token.glossStatus));
}
function readerLanguageCanUseInterlinear(language = readerState.language, data = null){
  return language !== 'hebrew' || !data || readerChapterHasReliableInterlinearGlossData(data, language);
}
function readerInterlinearAvailable(data = readerState.chapterData, language = readerState.language){
  return readerLanguageCanUseInterlinear(language, data);
}
function readerEffectiveSettings(settings = getActiveReaderSettings(), language = readerState.language, data = readerState.chapterData){
  if(settings.display !== 'interlinear' || readerInterlinearAvailable(data, language)) return settings;
  return { ...settings, display: 'original' };
}
function readerSegmentPartOfSpeech(segment = {}){
  const sourceClass = cleanReaderTokenValue(segment.class).toLowerCase();
  const byClass = { noun: 'Noun', verb: 'Verb', adj: 'Adjective', pron: 'Pronoun', prep: 'Preposition', cj: 'Conjunction', art: 'Article', adv: 'Adverb', ij: 'Interjection' };
  if(byClass[sourceClass]) return byClass[sourceClass];
  const morphology = cleanReaderTokenValue(segment.morphology).replace(/^H/i, '');
  if(/^N/i.test(morphology)) return 'Noun';
  if(/^V/i.test(morphology)) return 'Verb';
  if(/^A/i.test(morphology)) return 'Adjective';
  if(/^P/i.test(morphology)) return 'Pronoun';
  if(/^R/i.test(morphology)) return 'Preposition';
  if(/^C/i.test(morphology)) return 'Conjunction';
  if(/^T[d]?/i.test(morphology)) return 'Article';
  return '';
}
function readerHebrewLexicalStructure(token = {}){
  const segments = Array.isArray(token.segments) ? token.segments.filter(segment => cleanReaderTokenValue(segment?.surface) || cleanReaderTokenValue(segment?.lemma)) : [];
  if(!segments.length) return { lexicalLemma: '', lexicalMorphology: '', lexicalPartOfSpeech: '', prefixSegments: [], suffixSegments: [] };
  const contentParts = new Set(['Noun', 'Verb', 'Adjective', 'Pronoun', 'Adverb', 'Interjection']);
  const contentIndexes = segments.map((segment, index) => ({ index, pos: readerSegmentPartOfSpeech(segment), morphology: cleanReaderTokenValue(segment?.morphology) })).filter(item => contentParts.has(item.pos) && !/^Sp/i.test(item.morphology));
  const nonSuffixIndexes = segments.map((segment, index) => ({ segment, index })).filter(item => !/^Sp/i.test(cleanReaderTokenValue(item.segment?.morphology)));
  const lexicalIndex = contentIndexes.at(-1)?.index ?? nonSuffixIndexes[0]?.index ?? 0;
  const lexicalSegment = segments[lexicalIndex] || {};
  return {
    lexicalLemma: cleanReaderTokenValue(lexicalSegment.lemma),
    lexicalMorphology: cleanReaderTokenValue(lexicalSegment.morphology),
    lexicalPartOfSpeech: readerSegmentPartOfSpeech(lexicalSegment),
    prefixSegments: segments.slice(0, lexicalIndex),
    suffixSegments: segments.slice(lexicalIndex + 1)
  };
}
function normalizeReaderToken(token = {}, language = readerState.language){
  const surface = cleanReaderTokenValue(token.surface || token.word || token.text || token.form);
  const lemma = cleanReaderTokenValue(token.lemma || token.strong || token.strongs || token.root || token.lexicalForm || surface);
  const segments = Array.isArray(token.segments) ? token.segments.map(segment => ({
    surface: cleanReaderTokenValue(segment?.surface),
    lemma: cleanReaderTokenValue(segment?.lemma),
    morphology: cleanReaderTokenValue(segment?.morphology),
    gloss: cleanReaderTokenValue(segment?.gloss),
    class: cleanReaderTokenValue(segment?.class),
    sourceRowId: cleanReaderTokenValue(segment?.sourceRowId)
  })) : [];
  const lexicalStructure = language === 'hebrew' ? readerHebrewLexicalStructure({ ...token, segments }) : {};
  return {
    ...token,
    language,
    surface,
    lemma,
    parse: cleanReaderTokenValue(token.parse || token.morph || token.morphology),
    sourceLemma: cleanReaderTokenValue(token.sourceLemma || token.source || token.oshbLemma),
    primaryGloss: cleanReaderTokenValue(token.primaryGloss),
    gloss: cleanReaderTokenValue(token.gloss),
    lexicalForm: cleanReaderTokenValue(token.lexicalForm || token.headword),
    hebrewLemma: cleanReaderTokenValue(token.hebrewLemma),
    root: cleanReaderTokenValue(token.root),
    stem: cleanReaderTokenValue(token.stem),
    tokenId: cleanReaderTokenValue(token.tokenId || token.id),
    interlinearGloss: cleanReaderTokenValue(token.interlinearGloss),
    glossStatus: cleanReaderTokenValue(token.glossStatus),
    sourceRowIds: Array.isArray(token.sourceRowIds) ? token.sourceRowIds.map(cleanReaderTokenValue).filter(Boolean) : [],
    qereKetiv: normalizeReaderQereKetiv(token.qereKetiv),
    maqqefAfter: Boolean(token.maqqefAfter),
    punctuationAfter: cleanReaderTokenValue(token.punctuationAfter),
    segments,
    lexicalLemma: cleanReaderTokenValue(token.lexicalLemma || lexicalStructure.lexicalLemma),
    lexicalMorphology: cleanReaderTokenValue(token.lexicalMorphology || lexicalStructure.lexicalMorphology),
    lexicalPartOfSpeech: cleanReaderTokenValue(token.lexicalPartOfSpeech || lexicalStructure.lexicalPartOfSpeech),
    prefixSegments: Array.isArray(token.prefixSegments) ? token.prefixSegments : (lexicalStructure.prefixSegments || []),
    suffixSegments: Array.isArray(token.suffixSegments) ? token.suffixSegments : (lexicalStructure.suffixSegments || [])
  };
}
function readerTokenInterlinearHint(token = {}, language = readerState.language){
  const normalized = normalizeReaderToken(token, language);
  if(language === 'hebrew') return normalized.glossStatus === 'source' ? normalized.interlinearGloss : '';
  const gloss = readerTokenGloss(normalized, language);
  const lemma = readerTokenLemmaSupport(normalized, language);
  const morphology = readerTokenShortMorphology(normalized, language);
  return gloss || lemma || morphology || '';
}
function readerTokenInterlinearDetails(token = {}, language = readerState.language){
  if(language === 'hebrew') return '';
  const normalized = normalizeReaderToken(token, language);
  const gloss = readerTokenGloss(normalized, language);
  const hint = readerTokenInterlinearHint(normalized, language);
  const lemma = readerTokenLemmaSupport(normalized, language);
  const morphology = readerTokenShortMorphology(normalized, language);
  return mergeUniqueGlosses([
    gloss && lemma !== hint ? lemma : '',
    morphology !== hint ? morphology : ''
  ]).join(' · ');
}
function readerTokenLemmaSupport(token = {}, language = readerState.language){
  const normalized = normalizeReaderToken(token, language);
  const direct = readerDisplayLemma(normalized);
  if(direct) return direct;
  if(language !== 'hebrew') return '';
  const matches = bestReaderVocabMatches(normalized.lemma || normalized.surface, language);
  const candidates = matches.flatMap(entry => [entry.lexicalForm, entry.hebrewLemma, entry.root, entry.word, entry.normalized]);
  return candidates.map(cleanReaderTokenValue).find(value => hasHebrewText(value) && !isNumericReaderLemma(value)) || '';
}
function readerTokenShortMorphology(token = {}, language = readerState.language){
  if(language !== 'hebrew') return '';
  const normalized = normalizeReaderToken(token, language);
  const fields = readerMorphologyFields(normalized);
  return cleanReaderTokenValue(normalized.stem || grammarFieldValue(fields, 'Stem'));
}
function readerTokenInfo(token = {}, language = readerState.language){
  const normalized = normalizeReaderToken(token, language);
  return {
    language,
    surface: normalized.surface,
    lemma: normalized.lemma,
    parse: normalized.parse,
    sourceLemma: normalized.sourceLemma,
    primaryGloss: normalized.primaryGloss,
    gloss: normalized.gloss,
    lexicalForm: normalized.lexicalForm,
    hebrewLemma: normalized.hebrewLemma,
    root: normalized.root,
    stem: normalized.stem,
    segments: normalized.segments,
    lexicalLemma: normalized.lexicalLemma,
    lexicalMorphology: normalized.lexicalMorphology,
    lexicalPartOfSpeech: normalized.lexicalPartOfSpeech,
    prefixSegments: normalized.prefixSegments,
    suffixSegments: normalized.suffixSegments
  };
}
function readerTokenQualifiesForAssistance(token = {}, settings = getActiveReaderSettings(), language = readerState.language){
  const threshold = readerAssistanceThreshold(settings);
  if(threshold == null) return false;
  const frequency = readerTokenFrequency(token, language);
  const frequencyQualifies = threshold === Number.POSITIVE_INFINITY || (frequency > 0 && frequency <= threshold);
  if(!frequencyQualifies) return false;
  if(!settings.hideKnown) return true;
  return readerLearningStatusForInfo(readerTokenInfo(token, language)) !== (ReaderVocabularyLearningModel?.STATUS?.KNOWN || 'Known');
}
function readerLearningStatusMark(status){
  if(status === ReaderVocabularyLearningModel?.STATUS?.KNOWN || status === 'Known') return '●';
  if(status === ReaderVocabularyLearningModel?.STATUS?.LEARNING || status === 'Learning') return '◐';
  return '○';
}
function readerLearningStatusLabel(info = {}){
  const status = readerLearningStatusForInfo(info);
  const publicStatus = status === ReaderVocabularyLearningModel?.STATUS?.NOT_LEARNED || status === 'Not Learned'
    ? 'New'
    : status === ReaderVocabularyLearningModel?.STATUS?.KNOWN || status === ReaderVocabularyLearningModel?.STATUS?.KNOWN_SELF_REPORTED || status === 'Known' || status === 'Known by Self-Report'
      ? 'Known'
      : 'Learning';
  return `${readerLearningStatusMark(status)} ${publicStatus}`;
}
function renderReaderWordLearning(info = {}, options = {}){
  if(!info.lemma && !info.surface) return '';
  const entry = readerVocabularyLearningEntry(info);
  const status = readerLearningStatusForInfo(info);
  const details = readerLearningDetailsForInfo(info);
  const mastery = entry && ReaderVocabularyMasteryModel && ReaderVocabularyLearningModel
    ? ReaderVocabularyMasteryModel.masteryGrade(ReaderVocabularyLearningModel.getRecord(ReaderVocabularyLearningModel.loadStore(), entry) || {})
    : null;
  const label = readerLearningStatusLabel(info);
  const id = entry && ReaderVocabularyLearningModel ? ReaderVocabularyLearningModel.lemmaId(entry) : '';
  const language = info.language || readerState.language || 'greek';
  const attention = id && ReaderLearningPracticeModel?.needsAttention?.(id, language);
  const maintenanceEnabled = ReaderLearningPracticeModel?.loadMaintenancePreference?.().enabled !== false;
  const action = status === ReaderVocabularyLearningModel?.STATUS?.NOT_LEARNED || status === 'Not Learned'
    ? `<button class="btn btn-primary btn-sm" type="button" data-word-learn-action="learn" data-language="${escReaderAttr(language)}" data-word-id="${escReaderAttr(id)}">Add to Learning</button><button class="btn btn-ghost btn-sm" type="button" data-word-learn-action="known" data-language="${escReaderAttr(language)}" data-word-id="${escReaderAttr(id)}">Mark as Known</button>`
    : status === ReaderVocabularyLearningModel?.STATUS?.LEARNING || status === ReaderVocabularyLearningModel?.STATUS?.REVIEWING || status === 'Learning' || status === 'Reviewing'
      ? `<button class="btn btn-primary btn-sm" type="button" data-word-learn-action="review" data-language="${escReaderAttr(language)}" data-word-id="${escReaderAttr(id)}">Review This Word</button><button class="btn btn-ghost btn-sm" type="button" data-word-learn-action="known" data-language="${escReaderAttr(language)}" data-word-id="${escReaderAttr(id)}">Mark as Known</button>`
      : `<button class="btn btn-primary btn-sm" type="button" data-word-learn-action="learning" data-language="${escReaderAttr(language)}" data-word-id="${escReaderAttr(id)}">Return to Learning</button>`;
  const record = entry && ReaderVocabularyLearningModel ? ReaderVocabularyLearningModel.getRecord(ReaderVocabularyLearningModel.loadStore(), entry) : null;
  const recentConfidence = (record?.history || []).slice().reverse().find(event => event?.confidence)?.confidence;
  const knownSourceLabel = details?.knownSource === 'manual' ? 'Manual' : details?.knownSource === 'self_reported' ? 'Self-reported' : details?.knownSource === 'review' ? 'Review progress' : '';
  const scheduleExplanation = details && !details.scheduled && (status === ReaderVocabularyLearningModel?.STATUS?.KNOWN || status === 'Known')
    ? (maintenanceEnabled ? 'Not scheduled yet. Maintenance SRS is on.' : 'Marked Known without a scheduled review. Maintenance SRS is off.')
    : details?.explanation;
  const detailsHtml = details && !options.compact ? `
          <dl class="word-page-meta word-page-learning-meta">
            ${readerWordPageMeta('Next Review', details.nextReviewLabel)}
            ${readerWordPageMeta('Interval', details.intervalLabel)}
            ${readerWordPageMeta('Recognized Reviews', String(details.successfulReviews))}
            ${readerWordPageMeta('All Reviews', String(details.totalReviews))}
            ${readerWordPageMeta('Review History', details.historySummary)}
            ${readerWordPageMeta('Last Review', details.lastReviewedLabel)}
            ${readerWordPageMeta('Last Rating', details.lastRating ? details.lastRating.replace(/^./, char => char.toUpperCase()) : '')}
            ${details.totalReviews ? readerWordPageMeta('Ratings', `Again ${details.ratingCounts.again} · Hard ${details.ratingCounts.hard} · Good ${details.ratingCounts.good} · Easy ${details.ratingCounts.easy}`) : ''}
            ${readerWordPageMeta('Known Source', knownSourceLabel)}
            ${mastery ? readerWordPageMeta('Mastery Grade', `${mastery.letter} — ${mastery.label}`) : ''}
          </dl>
          <p class="small muted">${escHtml(scheduleExplanation)}</p>` : '';
  return `
        <section class="word-page-section word-page-learning${options.compact ? ' reader-word-learning-compact' : ''}" aria-labelledby="wordPageLearningHeading${options.compact ? 'Quick' : ''}">
          <h2 id="wordPageLearningHeading${options.compact ? 'Quick' : ''}">Learning</h2>
          <div class="word-page-learning-row">
            <span class="word-page-learning-status">${escHtml(label)}</span>
            ${mastery ? `<span class="word-page-learning-status">${escHtml(mastery.letter)} — ${escHtml(mastery.label)}</span>` : ''}
            ${recentConfidence ? `<span class="word-page-learning-status">Recent recall: ${escHtml(recentConfidence.replace(/^./, char => char.toUpperCase()))}</span>` : ''}
            ${entry && ReaderVocabularyLearningModel ? action : '<span class="muted small">Not available in vocabulary learning.</span>'}
            ${id && ReaderLearningPracticeModel ? `<button class="btn btn-ghost btn-sm" type="button" data-word-attention-toggle="true" aria-pressed="${attention}">${attention ? 'Remove Needs attention' : 'Needs attention'}</button>` : ''}
          </div>
          ${detailsHtml}
          ${mastery ? `<details class="word-page-mastery"><summary>Why ${escHtml(mastery.letter)} — ${escHtml(mastery.label)}?</summary><p class="small muted">${escHtml(mastery.explanation)}</p></details>` : ''}
        </section>`;
}
function renderReaderWordStudySets(info = {}){
  const entry = readerVocabularyLearningEntry(info);
  if(!entry || !ReaderStudySetsModel) return '';
  const language = entry.lang || info.language || readerState.language || 'greek';
  const sets = ReaderStudySetsModel.listStudySets()
    .filter(set => set.type === 'vocabulary' && set.language === language);
  return `
        <section class="word-page-section word-page-study-sets" aria-labelledby="wordPageStudySetsHeading">
          <h2 id="wordPageStudySetsHeading">Custom Decks</h2>
          <p class="small muted">Add this word to a collection for practice. This does not change its SRS status.</p>
          ${sets.length ? `
            <form class="word-page-study-set-form" data-word-study-set-add="true">
              <input type="hidden" name="language" value="${escReaderAttr(language)}" />
              <label>Add to Custom Deck<select class="input" name="setId">${sets.map(set => `<option value="${escReaderAttr(set.id)}">${escHtml(set.title)}</option>`).join('')}</select></label>
              <button class="btn btn-primary btn-sm" type="submit">Add to Custom Deck</button>
            </form>` : '<p class="word-page-context-empty">No vocabulary Custom Decks for this language yet.</p>'}
          <form class="word-page-study-set-form" data-word-study-set-create="true">
            <input type="hidden" name="language" value="${escReaderAttr(language)}" />
            <label>New hand-picked collection<input class="input" name="title" placeholder="Quiz list" /></label>
            <button class="btn btn-ghost btn-sm" type="submit">Create and Add</button>
          </form>
        </section>`;
}
function renderReaderWordSaved(info = {}){
  const entry = readerVocabularyLearningEntry(info);
  if(!entry || !ReaderSavedVocabularyModel) return '';
  const saved = ReaderSavedVocabularyModel.isSaved(entry);
  return `
        <section class="word-page-section word-page-saved" aria-labelledby="wordPageSavedHeading">
          <h2 id="wordPageSavedHeading">Saved</h2>
          <p class="small muted">Save this word for later without choosing a Custom Deck. This does not change SRS status.</p>
          <button class="btn ${saved ? 'btn-ghost' : 'btn-primary'} btn-sm" type="button" data-word-save-toggle="true">${saved ? 'Unsave Word' : 'Save Word'}</button>
        </section>`;
}
function toggleReaderSavedWord(info = readerState.wordPageInfo || {}){
  const entry = readerVocabularyLearningEntry(info);
  if(!entry || !ReaderSavedVocabularyModel) return null;
  const result = ReaderSavedVocabularyModel.toggleEntry(entry);
  if(typeof toast === 'function') toast(result.removed ? 'Word unsaved.' : result.saved ? 'Word saved.' : 'Saved words updated.');
  renderReaderWordPage();
  return result;
}
function toggleReaderNeedsAttention(info = readerState.wordPageInfo || {}){
  const entry = readerVocabularyLearningEntry(info);
  if(!entry || !ReaderLearningPracticeModel || !ReaderVocabularyLearningModel) return null;
  const id = ReaderVocabularyLearningModel.lemmaId(entry);
  const language = entry.lang || info.language || readerState.language || 'greek';
  const active = !ReaderLearningPracticeModel.needsAttention(id, language);
  ReaderLearningPracticeModel.setNeedsAttention(id, language, active);
  if(typeof toast === 'function') toast(active ? 'Marked Needs attention.' : 'Needs attention removed.');
  renderReaderWordPage();
  return active;
}
function addReaderWordToStudySet(setId, info = readerState.wordPageInfo || {}){
  const entry = readerVocabularyLearningEntry(info);
  if(!entry || !setId || !ReaderStudySetsModel) return null;
  const result = ReaderStudySetsModel.addVocabularyItemToStudySet(setId, entry);
  if(typeof toast === 'function') toast(result.added ? 'Added to Custom Deck.' : 'Already in that Custom Deck.');
  renderReaderWordPage();
  return result;
}
function createReaderStudySetFromWord(title, info = readerState.wordPageInfo || {}){
  const entry = readerVocabularyLearningEntry(info);
  if(!entry || !ReaderStudySetsModel) return null;
  const cleanTitle = String(title || '').trim();
  if(!cleanTitle) return null;
  const created = ReaderStudySetsModel.createStudySet({
    title: cleanTitle,
    language: entry.lang || info.language || readerState.language || 'greek',
    type: 'vocabulary',
    criteria: { kind: 'hand-picked' }
  });
  ReaderStudySetsModel.addVocabularyItemToStudySet(created.set.id, entry);
  if(typeof toast === 'function') toast('Custom Deck created.');
  renderReaderWordPage();
  return created.set;
}
function introduceReaderWordFromPage(info = readerState.wordPageInfo || {}){
  const entry = readerVocabularyLearningEntry(info);
  if(!entry || !ReaderVocabularyLearningModel) return false;
  ReaderVocabularyLearningModel.persistIntroduceEntry(entry, { type: 'word-page', language: entry.lang || info.language || readerState.language });
  if(readerState.activeToken) renderReaderWordPopup(); else renderReaderWordPage();
  return true;
}
function setReaderWordLearningStatus(action, info = readerState.wordPageInfo || {}){
  const entry = readerVocabularyLearningEntry(info);
  if(!entry || !ReaderVocabularyLearningModel) return false;
  const source = { type: 'reader-word-details', language: entry.lang || info.language || readerState.language };
  const store = ReaderVocabularyLearningModel.loadStore();
  const next = action === 'known'
    ? ReaderVocabularyLearningModel.markEntryKnown(store, entry, source)
    : ReaderVocabularyLearningModel.introduceEntry(store, entry, source);
  ReaderVocabularyLearningModel.saveStore(next);
  if(typeof toast === 'function') toast(action === 'known' ? 'Marked as Known.' : 'Returned to Learning.');
  if(readerState.activeToken) renderReaderWordPopup(); else renderReaderWordPage();
  return true;
}
function reviewReaderWordFromPage(info = readerState.wordPageInfo || {}){
  const entry = readerVocabularyLearningEntry(info);
  if(!entry || !ReaderVocabularyLearningModel) return false;
  const language = entry.lang || info.language || readerState.language || 'greek';
  const id = ReaderVocabularyLearningModel.lemmaId(entry);
  if(typeof reviewLearnVocabularyWord === 'function') reviewLearnVocabularyWord(language, id);
  if(typeof showView === 'function') showView('learnView');
  else if(typeof navigateTo === 'function') navigateTo('/learn');
  return true;
}
function splitLegacyGloss(gloss){
  return String(gloss || '').split(/[,;]/).map(part => part.trim()).filter(Boolean);
}
function mergeUniqueGlosses(values){
  const seen = new Set();
  return values.map(cleanReaderTokenValue).filter(value => {
    const key = value.toLowerCase();
    if(!value || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
async function lookupReaderWordInfo(token = {}, reference = {}, language = readerState.language){
  const normalized = normalizeReaderToken(token, language);
  const lemma = cleanReaderTokenValue(normalized.lemma || normalized.surface);
  const glossSource = await loadReaderGlossSource(language);
  const sourceGloss = glossSource[lemma] || glossSource[Object.keys(glossSource).find(key => normalizeReaderText(key) === normalizeReaderText(lemma))];
  const vocabMatches = bestReaderVocabMatches(lemma, language);
  const primaryGloss = cleanReaderTokenValue(sourceGloss?.primaryGloss)
    || cleanReaderTokenValue(vocabMatches.find(entry => entry.primaryGloss)?.primaryGloss)
    || splitLegacyGloss(vocabMatches.find(entry => entry.gloss)?.gloss)[0]
    || cleanReaderTokenValue(sourceGloss?.gloss)
    || cleanReaderTokenValue(normalized.primaryGloss || normalized.gloss);
  const alternateGlosses = mergeUniqueGlosses([
    ...(Array.isArray(sourceGloss?.alternateGlosses) ? sourceGloss.alternateGlosses : []),
    ...vocabMatches.flatMap(entry => Array.isArray(entry.alternateGlosses) ? entry.alternateGlosses : []),
    ...(!sourceGloss?.primaryGloss && !vocabMatches.some(entry => entry.primaryGloss)
      ? vocabMatches.flatMap(entry => splitLegacyGloss(entry.gloss)).filter(gloss => gloss !== primaryGloss)
      : [])
  ]);
  const aggregateFrequency = vocabMatches.reduce((sum, entry) => sum + (Number(entry.freq) || 0), 0);
  const bestFrequency = aggregateFrequency || Math.max(0, ...vocabMatches.map(entry => Number(entry.freq) || 0));
  const indexFrequency = bestFrequency ? 0 : (await getReaderLemmaOccurrences(lemma, language, Number.MAX_SAFE_INTEGER)).length;
  const bestHebrewDisplay = language === 'hebrew'
    ? vocabMatches.flatMap(entry => [entry.lexicalForm, entry.hebrewLemma, entry.root, entry.word, entry.normalized]).map(cleanReaderTokenValue).find(value => hasHebrewText(value) && !isNumericReaderLemma(value))
    : '';
  return {
    surface: normalized.surface,
    lemma,
    sourceLemma: normalized.sourceLemma,
    lexicalForm: normalized.lexicalLemma || normalized.lexicalForm || bestHebrewDisplay,
    hebrewLemma: normalized.lexicalLemma || normalized.hebrewLemma || bestHebrewDisplay,
    root: normalized.root || bestHebrewDisplay,
    stem: normalized.stem,
    primaryGloss,
    alternateGlosses: alternateGlosses.filter(gloss => gloss !== primaryGloss),
    customGloss: cleanReaderTokenValue(vocabMatches.find(entry => entry.customGloss)?.customGloss),
    glossSource: cleanReaderTokenValue(sourceGloss?.glossSource || vocabMatches.find(entry => entry.glossSource)?.glossSource),
    glossSourceUrl: cleanReaderTokenValue(sourceGloss?.glossSourceUrl || vocabMatches.find(entry => entry.glossSourceUrl)?.glossSourceUrl),
    glossLicense: cleanReaderTokenValue(sourceGloss?.glossLicense || vocabMatches.find(entry => entry.glossLicense)?.glossLicense),
    glossAttribution: cleanReaderTokenValue(sourceGloss?.glossAttribution || vocabMatches.find(entry => entry.glossAttribution)?.glossAttribution),
    occurrenceGloss: language === 'hebrew' && normalized.glossStatus === 'source' ? cleanReaderTokenValue(normalized.interlinearGloss) : '',
    parse: normalized.parse,
    parseExplanation: explainReaderParse(normalized.parse, language),
    lexicalMorphology: normalized.lexicalMorphology,
    lexicalPartOfSpeech: normalized.lexicalPartOfSpeech,
    segments: normalized.segments,
    prefixSegments: normalized.prefixSegments,
    suffixSegments: normalized.suffixSegments,
    frequency: bestFrequency || indexFrequency || '',
    reference: readerReferenceLabel(reference),
    book: reference.book,
    chapter: reference.chapter,
    verse: reference.verse,
    qereKetiv: normalized.qereKetiv,
    language
  };
}
function formatReaderParseExplanation(decoded){
  if(!decoded || !decoded.details?.length) return '';
  const title = value => String(value || '').replace(/\b\w/g, char => char.toUpperCase());
  const details = decoded.details.filter(Boolean).map(value => String(value).toLowerCase()).join(' ');
  return [title(decoded.label), details].filter(Boolean).join(' — ');
}
function explainReaderParse(parse, language = 'greek'){
  if(!parse) return '';
  const parser = (typeof ParserCore !== 'undefined' && ParserCore) || (typeof require === 'function' ? require('../../parser-core') : null);
  const decoded = parser?.decodeParse ? parser.decodeParse(parse, language) : null;
  return formatReaderParseExplanation(decoded) || parse;
}
function readerParseKind(parse, explanation = ''){
  const raw = cleanReaderTokenValue(parse).toUpperCase();
  const text = `${raw} ${explanation}`.toLowerCase();
  if(/\b(qal|niphal|piel|pual|hiphil|hophal|hitpael)\b/.test(text)) return 'verb';
  if(text.includes('participle')) return 'participle';
  if(raw.startsWith('V') || raw.startsWith('HV') || raw.includes('/V') || text.includes('verb')) return 'verb';
  if(raw.startsWith('RA') || raw.startsWith('T') || text.includes('article')) return 'article';
  if(raw.startsWith('A') || text.includes('adjective')) return 'adjective';
  if(raw.startsWith('N') || raw.startsWith('HN') || text.includes('noun')) return 'noun';
  if(raw.startsWith('HR') || raw.startsWith('HC')) return 'article';
  return '';
}
function readerGrammarLinksForInfo(info = {}){
  const config = getReaderConfig(info.language);
  const api = typeof PuritanReferenceLibrary !== 'undefined' ? PuritanReferenceLibrary : null;
  return (config.grammarLinks?.[readerParseKind(info.parse, info.parseExplanation)] || [])
    .filter(([, id]) => !api?.getReferenceTopic || api.getReferenceTopic(id))
    .map(([label, topicId]) => ({ label, topicId }));
}
function readerPartOfSpeechForInfo(info = {}){
  const lexicalPartOfSpeech = cleanReaderTokenValue(info.lexicalPartOfSpeech);
  if(lexicalPartOfSpeech) return lexicalPartOfSpeech;
  const parseExplanation = cleanReaderTokenValue(info.parseExplanation);
  const rawParse = cleanReaderTokenValue(info.parse);
  if(parseExplanation && parseExplanation !== rawParse) return parseExplanation.split(/[—-]/)[0].trim();
  const raw = rawParse.toUpperCase();
  if((info.language || readerState.language) === 'hebrew'){
    if(/^H?N/.test(raw)) return 'Noun';
    if(/^H?A/.test(raw)) return 'Adjective';
    if(/^H?V|\/V/.test(raw)) return 'Verb';
    if(/^HR/.test(raw)) return 'Preposition';
    if(/^HC/.test(raw)) return 'Conjunction';
    if(/^HT/.test(raw)) return 'Article';
  } else {
    if(/^N/.test(raw)) return 'Noun';
    if(/^A/.test(raw)) return 'Adjective';
    if(/^V/.test(raw)) return 'Verb';
    if(/^RA|^T/.test(raw)) return 'Article';
    if(/^P/.test(raw)) return 'Preposition';
    if(/^C/.test(raw)) return 'Conjunction';
    if(/^D/.test(raw)) return 'Adverb';
  }
  const labels = { noun: 'Noun', adjective: 'Adjective', verb: 'Verb', participle: 'Participle', article: 'Article' };
  return labels[readerParseKind(info.parse, info.parseExplanation)] || '';
}
function ordinalPerson(value){
  const clean = cleanReaderTokenValue(value);
  if(clean === '1') return '1st person';
  if(clean === '2') return '2nd person';
  if(clean === '3') return '3rd person';
  return clean;
}
function readerPrefixLabel(code){
  return ({
    c: 'Conjunction',
    d: 'Definite article',
    h: 'Interrogative',
    i: 'Interjection',
    k: 'Preposition כ',
    l: 'Preposition ל',
    m: 'Preposition מ',
    b: 'Preposition ב',
    r: 'Relative marker',
    s: 'Subordination marker',
    w: 'Conjunction'
  })[cleanReaderTokenValue(code).toLowerCase()] || cleanReaderTokenValue(code);
}
function parseHebrewSourcePrefixes(sourceLemma = ''){
  const parts = cleanReaderTokenValue(sourceLemma).split('/').filter(Boolean);
  if(parts.length < 2) return [];
  return parts.slice(0, -1).map(readerPrefixLabel).filter(Boolean);
}
function parseHebrewSuffix(parse = ''){
  const suffix = cleanReaderTokenValue(parse).match(/(?:^|\/)S([a-z0-9]+)/i)?.[1];
  if(!suffix) return '';
  const match = suffix.toLowerCase().match(/^p?([123])?([mfc])?([spd])$/);
  if(!match) return suffix;
  return [ordinalPerson(match[1]), ({ m: 'masculine', f: 'feminine', c: 'common' })[match[2]], ({ s: 'singular', p: 'plural', d: 'dual' })[match[3]]].filter(Boolean).join(' ');
}
function hebrewSuffixPronoun(parse = ''){
  const suffix = cleanReaderTokenValue(parse).match(/(?:^|\/)S(?:p)?([123])?([mfc])?([spd])/i);
  if(!suffix) return '';
  const code = `${suffix[1] || ''}${suffix[2] || ''}${suffix[3] || ''}`.toLowerCase();
  return ({
    '1cs': 'my / me', '1cp': 'our / us',
    '2ms': 'your / you', '2fs': 'your / you', '2mp': 'your / you', '2fp': 'your / you',
    '3ms': 'his / him / its', '3fs': 'her / it', '3mp': 'their / them', '3fp': 'their / them'
  })[code] || '';
}
function readerMorphologyFields(info = {}){
  const language = info.language || readerState.language || 'greek';
  const parse = cleanReaderTokenValue(info.parse);
  if(!parse) return [];
  return language === 'hebrew' ? hebrewMorphologyFields(info) : greekMorphologyFields(info);
}
function isNumericReaderLemma(value){
  return /^\d+[+a-zA-Z]?$/.test(cleanReaderTokenValue(value));
}
function hasHebrewText(value){
  return /[\u0590-\u05ff]/.test(cleanReaderTokenValue(value));
}
function readerSourceLemmaBase(sourceLemma = ''){
  const parts = cleanReaderTokenValue(sourceLemma).split('/').filter(Boolean);
  return parts.length ? parts.at(-1).replace(/\s+[a-z]$/i, '') : '';
}
function readerDisplayLemma(info = {}){
  const language = info.language || readerState.language || 'greek';
  const candidates = [
    info.lexicalLemma,
    info.lexicalForm,
    info.hebrewLemma,
    info.lemma,
    info.root,
    readerSourceLemmaBase(info.sourceLemma)
  ].map(cleanReaderTokenValue).filter(Boolean);
  if(language === 'hebrew'){
    return candidates.find(value => hasHebrewText(value) && !isNumericReaderLemma(value)) || '';
  }
  return candidates.find(value => !isNumericReaderLemma(value)) || '';
}
function readerPrimaryHeadword(info = {}){
  const language = info.language || readerState.language || 'greek';
  const surface = cleanReaderTokenValue(info.surface);
  if(language === 'hebrew'){
    const candidates = [
      info.lemma,
      info.root || info.hebrewLemma,
      surface
    ].map(cleanReaderTokenValue).filter(Boolean);
    return candidates.find(value => !isNumericReaderLemma(value)) || 'Lemma unavailable';
  }
  return surface || readerDisplayLemma(info) || cleanReaderTokenValue(info.lemma) || 'Lemma unavailable';
}
function readerStrongId(info = {}){
  const language = info.language || readerState.language || 'greek';
  if(language !== 'hebrew') return '';
  const direct = cleanReaderTokenValue(info.lemma);
  const sourceBase = readerSourceLemmaBase(info.sourceLemma);
  return isNumericReaderLemma(direct) ? direct : (isNumericReaderLemma(sourceBase) ? sourceBase : '');
}
function greekMorphologyFields(info = {}){
  const raw = cleanReaderTokenValue(info.parse);
  const compact = raw.toLowerCase().split('-').filter(Boolean);
  const morphGnt = raw.match(/^V-\s*([123-])([A-Z-])([A-Z-])([A-Z-])-?([SPD-])?/i);
  const fields = [];
  const add = (label, value) => { if(cleanReaderTokenValue(value) && value !== '-') fields.push({ label, value }); };
  const cases = { n: 'nominative', g: 'genitive', d: 'dative', a: 'accusative', v: 'vocative' };
  const numbers = { s: 'singular', p: 'plural', d: 'dual' };
  const genders = { m: 'masculine', f: 'feminine', n: 'neuter', c: 'common' };
  const tenses = { p: 'present', i: 'imperfect', f: 'future', a: 'aorist', r: 'perfect', l: 'pluperfect', pres: 'present', impf: 'imperfect', fut: 'future', aor: 'aorist', perf: 'perfect', plup: 'pluperfect' };
  const voices = { a: 'active', m: 'middle', p: 'passive', n: 'middle/passive', act: 'active', mid: 'middle', pas: 'passive', mp: 'middle/passive' };
  const moods = { i: 'indicative', s: 'subjunctive', o: 'optative', m: 'imperative', n: 'infinitive', p: 'participle', d: 'imperative', ind: 'indicative', subj: 'subjunctive', opt: 'optative', imp: 'imperative', inf: 'infinitive', ptc: 'participle' };
  const nominal = raw.replace(/^[A-Z]+-?\s*/i, '').replace(/[-\s]/g, '').slice(-3).toLowerCase();
  const verbCode = morphGnt ? `${morphGnt[2]}${morphGnt[3]}${morphGnt[4]}`.toLowerCase() : (compact[0] === 'v' ? compact[1] || '' : '');
  if(compact[0] === 'v' || morphGnt){
    add('Tense', tenses[verbCode[0]] || tenses[compact[1]] || compact[1]);
    add('Voice', voices[verbCode[1]] || voices[compact[2]] || compact[2]);
    add('Mood', moods[verbCode[2]] || moods[compact[3]] || compact[3]);
    const person = morphGnt ? morphGnt[1] : (compact[2]?.match(/^[123]/) ? compact[2][0] : compact[4]?.match(/^[123]/)?.[0]);
    const numberCode = morphGnt ? morphGnt[5] : (compact[2]?.match(/[spd]$/i)?.[0] || compact[4]?.match(/[spd]$/i)?.[0]);
    const mood = moods[verbCode[2]] || moods[compact[3]];
    if(mood !== 'participle' && mood !== 'infinitive') add('Person', ordinalPerson(person));
    if(mood !== 'participle') add('Number', numbers[numberCode?.toLowerCase()]);
    if(mood === 'participle'){
      const form = nominal;
      add('Case', cases[form[0]?.toLowerCase()]);
      add('Number', numbers[form[1]?.toLowerCase()]);
      add('Gender', genders[form[2]?.toLowerCase()]);
    }
  } else {
    add('Case', cases[nominal[0]]);
    add('Number', numbers[nominal[1]]);
    add('Gender', genders[nominal[2]]);
  }
  add('Principal Part', info.principalPart || info.principalpart);
  return fields;
}
function hebrewMorphologyFields(info = {}){
  const raw = cleanReaderTokenValue(info.parse);
  const fields = [];
  const add = (label, value) => { if(cleanReaderTokenValue(value)) fields.push({ label, value }); };
  const prefixes = parseHebrewSourcePrefixes(info.sourceLemma);
  const suffix = parseHebrewSuffix(raw);
  const suffixPronoun = hebrewSuffixPronoun(raw);
  const verb = raw.match(/(?:^H?V|\/V)([a-z0-9]+)/i)?.[1] || (/^V-/i.test(raw) ? raw.split('-').slice(1) : null);
  const sourceNominal = raw.match(/(?:^H?|\/)([NA])([a-z]+)/i);
  const nominal = sourceNominal?.[2] || (/^[NA]-/i.test(raw) ? raw.split('-')[1] : '');
  const forms = { p: 'perfect', q: 'wayyiqtol', w: 'wayyiqtol', i: 'imperfect', v: 'imperative', r: 'participle', s: 'participle', a: 'infinitive absolute', c: 'infinitive construct' };
  const genders = { m: 'masculine', f: 'feminine', c: 'common' };
  const numbers = { s: 'singular', p: 'plural', d: 'dual' };
  const states = { a: 'absolute', c: 'construct', d: 'determined' };
  if(prefixes.length) add('Prefixes', prefixes.join(', '));
  if(suffix) add('Suffix', suffix);
  if(suffixPronoun) add('Suffix Pronoun', suffixPronoun);
  if(Array.isArray(verb)){
    add('Stem', verb[0]);
    add('Conjugation', verb[1]);
    const png = verb[2] || '';
    add('Person', ordinalPerson(png.match(/[123]/)?.[0]));
    add('Gender', genders[png.match(/[mfc]/)?.[0]]);
    add('Number', numbers[png.match(/[spd]/)?.[0]]);
  } else if(verb){
    const parser = (typeof ParserCore !== 'undefined' && ParserCore) || (typeof require === 'function' ? require('../../core/parser-core') : null);
    add('Stem', parser?.hebrewStemLabel ? parser.hebrewStemLabel(verb[0], { aramaic: /^A/.test(raw) }) : `Stem ${verb[0]}`);
    add('Conjugation', forms[verb[1]] || verb[1]);
    const png = verb.slice(2).toLowerCase();
    add('Person', ordinalPerson(png.match(/[123]/)?.[0]));
    add('Gender', genders[png.match(/[mfc]/)?.[0]]);
    add('Number', numbers[png.match(/[spd]/)?.[0]]);
  } else if(nominal){
    const lower = nominal.toLowerCase();
    const isOshb = Boolean(sourceNominal);
    add('Gender', genders[isOshb ? (lower[1] || lower[0]) : lower[0]]);
    add('Number', numbers[isOshb ? (lower[2] || lower[1]) : lower[1]]);
    add('State', states[isOshb ? lower[3] : lower[2]]);
  }
  return fields;
}
function renderReaderMorphology(info = {}){
  const language = info.language || readerState.language || 'greek';
  const fields = readerMorphologyFields(info).filter(field => !(language === 'hebrew' && field.label === 'Suffix'));
  if(!fields.length) return '';
  return `
        <section class="word-page-section" aria-labelledby="wordPageMorphologyHeading">
          <h2 id="wordPageMorphologyHeading">Morphology</h2>
          <dl class="word-page-morphology">${fields.map(field => readerWordPageMeta(field.label, field.value)).join('')}</dl>
        </section>`;
}
function grammarFieldValue(fields = [], label){
  return fields.find(field => field.label === label)?.value || '';
}
function sentenceJoin(values = []){
  return values.map(cleanReaderTokenValue).filter(Boolean).join(' ');
}
function readerGrammarSummary(info = {}, partOfSpeech = ''){
  const language = info.language || readerState.language || 'greek';
  const fields = readerMorphologyFields(info);
  const pos = partOfSpeech || readerPartOfSpeechForInfo(info) || cleanReaderTokenValue(info.parseExplanation).split(/[—-]/)[0].trim();
  if(!pos) return cleanReaderTokenValue(info.parseExplanation);
  const suffix = grammarFieldValue(fields, 'Suffix');
  const suffixPronoun = grammarFieldValue(fields, 'Suffix Pronoun');
  if(language === 'hebrew'){
    if(pos === 'Verb'){
      const primary = sentenceJoin([grammarFieldValue(fields, 'Stem'), grammarFieldValue(fields, 'Conjugation')]);
      const agreement = sentenceJoin([grammarFieldValue(fields, 'Person'), grammarFieldValue(fields, 'Gender'), grammarFieldValue(fields, 'Number')]);
      return [pos, [primary, agreement].filter(Boolean).join(', ')].filter(Boolean).join(' — ');
    }
    if(['Noun', 'Adjective', 'Pronoun', 'Article'].includes(pos)){
      const nominal = sentenceJoin([grammarFieldValue(fields, 'Gender'), grammarFieldValue(fields, 'Number'), grammarFieldValue(fields, 'State')]);
      const suffixLabel = suffixPronoun ? `${suffixPronoun} (${suffix})` : suffix;
      const withSuffix = suffix ? `${nominal ? `${nominal} ` : ''}with ${suffixLabel} suffix` : nominal;
      return [pos, withSuffix].filter(Boolean).join(' — ');
    }
    return suffix ? `${pos} — with ${suffixPronoun ? `${suffixPronoun} (${suffix})` : suffix} suffix` : pos;
  }
  if(pos === 'Verb' || pos === 'Participle'){
    const primary = sentenceJoin([grammarFieldValue(fields, 'Tense'), grammarFieldValue(fields, 'Voice'), grammarFieldValue(fields, 'Mood')]);
    const participle = grammarFieldValue(fields, 'Mood') === 'participle';
    const agreement = participle
      ? sentenceJoin([grammarFieldValue(fields, 'Case'), grammarFieldValue(fields, 'Gender'), grammarFieldValue(fields, 'Number')])
      : sentenceJoin([grammarFieldValue(fields, 'Person'), grammarFieldValue(fields, 'Number')]);
    return [pos, [primary, agreement].filter(Boolean).join(', ')].filter(Boolean).join(' — ');
  }
  if(['Noun', 'Adjective', 'Pronoun', 'Article', 'Participle'].includes(pos)){
    const nominal = sentenceJoin([grammarFieldValue(fields, 'Case'), grammarFieldValue(fields, 'Number'), grammarFieldValue(fields, 'Gender')]);
    return [pos, nominal].filter(Boolean).join(' — ');
  }
  return cleanReaderTokenValue(info.parseExplanation) && cleanReaderTokenValue(info.parseExplanation) !== cleanReaderTokenValue(info.parse)
    ? cleanReaderTokenValue(info.parseExplanation)
    : pos;
}
function renderReaderGrammar(info = {}, partOfSpeech = ''){
  const rawParse = cleanReaderTokenValue(info.parse);
  const language = info.language || readerState.language || 'greek';
  const fields = readerMorphologyFields(info)
    .filter(field => cleanReaderTokenValue(field.value))
    .map(field => ({ label: language === 'hebrew' && field.label === 'Prefixes' ? 'Prefix' : field.label, value: field.value }));
  const summary = readerGrammarSummary(info, partOfSpeech);
  if(!rawParse && !summary && !fields.length) return '';
  return `
        <section class="word-page-section" aria-labelledby="wordPageGrammarHeading">
          <h2 id="wordPageGrammarHeading">Grammar</h2>
          ${summary ? `<p class="word-page-grammar-summary">${escHtml(summary)}</p>` : ''}
          ${fields.length ? `<dl class="word-page-grammar-details">${fields.map(field => readerWordPageMeta(field.label, field.value)).join('')}</dl>` : ''}
          ${rawParse ? `<p class="word-page-parse-code">Parse code: ${escHtml(rawParse)}</p>` : ''}
        </section>`;
}
function renderReaderWordIdentity(info = {}, context = {}){
  const meta = getReaderLanguageMeta(info.language || readerState.language);
  const displayLemma = context.displayLemma || readerDisplayLemma(info);
  const lemma = cleanReaderTokenValue(displayLemma || context.headword || readerPrimaryHeadword(info));
  const language = info.language || readerState.language || 'greek';
  const lemmaLabel = language === 'hebrew' ? 'Lemma / Root' : 'Lemma';
  const standardGlosses = readerGlossResolution(info).standard?.all || [];
  return `
        <section class="word-page-section word-page-identity" aria-labelledby="wordPageIdentityHeading">
          <h2 id="wordPageIdentityHeading">Identity</h2>
          <dl class="word-page-meta">
            ${readerWordPageMeta(lemmaLabel, lemma)}
            ${readerWordPageMeta('Glosses', standardGlosses.join(', '))}
            ${readerWordPageMeta('Language', meta.label)}
            ${readerWordPageMeta('Frequency', info.frequency ? `${info.frequency}×` : '')}
            ${readerWordPageMeta('Part of Speech', context.partOfSpeech || readerPartOfSpeechForInfo(info))}
          </dl>
        </section>`;
}
function renderReaderWordOccurrence(info = {}, context = {}){
  const language = info.language || readerState.language || 'greek';
  const meta = getReaderLanguageMeta(language);
  const fields = readerMorphologyFields(info)
    .filter(field => cleanReaderTokenValue(field.value))
    .map(field => ({ label: language === 'hebrew' && field.label === 'Prefixes' ? 'Prefix' : field.label, value: field.value }));
  const strongId = context.strongId || readerStrongId(info);
  const summary = readerGrammarSummary(info, context.partOfSpeech);
  const surface = cleanReaderTokenValue(info.surface);
  const parse = cleanReaderTokenValue(info.parse);
  const resolution = readerGlossResolution(info);
  const contextualGloss = readerContextualGloss(info, resolution);
  if(!surface && !parse && !fields.length && !info.reference) {
    return `
        <section class="word-page-section word-page-occurrence" aria-labelledby="wordPageOccurrenceHeading">
          <h2 id="wordPageOccurrenceHeading">This Occurrence</h2>
          <p class="word-page-context-empty">Open this word from the Reader to see occurrence-specific details.</p>
        </section>`;
  }
  return `
        <section class="word-page-section word-page-occurrence" aria-labelledby="wordPageOccurrenceHeading">
          <h2 id="wordPageOccurrenceHeading">This Occurrence</h2>
          ${surface ? `<p class="word-page-occurrence-form" lang="${escReaderAttr(meta.htmlLang)}" dir="${escReaderAttr(meta.dir)}">${escHtml(surface)}</p>` : ''}
          ${summary ? `<p class="word-page-grammar-summary">${escHtml(summary)}</p>` : ''}
          ${contextualGloss ? `<div class="reader-contextual-gloss"><div class="reader-word-label">In this verse</div><p>${escHtml(contextualGloss)}</p></div>` : ''}
          <dl class="word-page-grammar-details">
            ${readerWordPageMeta('Current Reference', info.reference)}
            ${readerWordPageMeta('Strong’s ID', strongId)}
            ${language === 'hebrew' ? readerWordPageMeta('Contextual occurrence gloss', info.occurrenceGloss) : ''}
            ${fields.map(field => readerWordPageMeta(field.label, field.value)).join('')}
          </dl>
          ${parse && summary ? `<p class="word-page-parse-code">Parse code: ${escHtml(parse)}</p>` : ''}
        </section>`;
}
function readerGlossResolution(info = {}){
  const resolved = typeof PuritanPersonalGlosses !== 'undefined' ? PuritanPersonalGlosses.resolve(info, { primaryLimit: 3, missingLabel: 'Gloss unavailable' }) : null;
  return resolved || ReaderGlossModel?.resolveLexicalGloss?.(info, { primaryLimit: 3, missingLabel: 'Gloss unavailable' }) || {
    standard: { all: [], compact: 'Gloss unavailable' }, personal: { mode: 'standard', glosses: [], active: false },
    effective: ReaderGlossModel?.presentLexicalGlosses?.(info, { primaryLimit: 3 }) || { primaryText: 'Gloss unavailable', additional: [] }
  };
}
function readerContextualGloss(info = {}, resolution = readerGlossResolution(info)){
  if((info.language || readerState.language || 'greek') !== 'greek') return '';
  const value = cleanReaderTokenValue(info.occurrenceGloss);
  if(!value || !ReaderGlossModel?.isLearnerEnglishGloss?.(value)) return '';
  return ReaderGlossModel.contextualGlossAddsMeaning?.(resolution.standard?.all || [], value) ? value : '';
}
function renderPersonalGlossEditor(info = {}, suffix = ''){
  if(typeof PuritanPersonalGlosses === 'undefined') return '';
  const resolved = readerGlossResolution(info);
  const personal = PuritanPersonalGlosses.recordFor(info) || { mode: 'standard', glosses: [] };
  return `<section class="word-page-section word-page-personal-glosses" aria-labelledby="wordPagePersonalGlossHeading${suffix}"><h2 id="wordPagePersonalGlossHeading${suffix}">My glosses</h2><p class="small muted">Standard: ${escHtml(resolved.standard.compact)}</p><form data-personal-gloss-form="true"><fieldset><legend>Study answer</legend>${[['standard','Standard glosses'],['add','Add my glosses'],['replace','Use my glosses']].map(([value,label]) => `<label><input type="radio" name="mode" value="${value}" ${personal.mode === value ? 'checked' : ''}> ${label}</label>`).join('')}</fieldset><label>Personal glosses <input class="input" name="glosses" value="${escReaderAttr(personal.glosses.join('; '))}" placeholder="Separate concise senses with semicolons"></label><p class="small muted">Add my glosses keeps both. Use my glosses changes the study answer while preserving the standard glosses.</p><p class="small">Effective preview: <strong>${escHtml(resolved.effective.compact)}</strong></p><p class="learn-inline-validation" data-personal-gloss-error hidden></p><div class="word-page-inline-actions"><button class="btn btn-primary btn-sm" type="submit">Save</button><button class="btn btn-ghost btn-sm" type="reset">Cancel</button><button class="btn btn-ghost btn-sm" type="button" data-personal-gloss-restore>Restore standard glosses</button></div></form></section>`;
}
function issueReportForWord(info = {}, category = 'Other', note = ''){
  const resolved = readerGlossResolution(info);
  return { schemaVersion: 1, appVersion: typeof PURITAN_PARSER_ASSET_VERSION === 'string' ? PURITAN_PARSER_ASSET_VERSION : 'local', category, language: info.language || readerState.language, vocabularyId: typeof PuritanPersonalGlosses !== 'undefined' ? PuritanPersonalGlosses.vocabularyId(info) : '', lemma: info.lemma || '', occurrenceForm: info.surface || '', passageReference: info.reference || '', standardGloss: resolved.standard.compact, effectiveGloss: resolved.effective.compact, personalGlossMode: resolved.personal.mode, morphologyCode: info.parse || '', displayedParsing: info.parseExplanation || '', correctionManifestId: resolved.correction?.id || '', sourceReferences: [info.glossSource, info.glossLicense, resolved.correction?.sourceReference].filter(Boolean), userNote: cleanReaderTokenValue(note) };
}
function renderIssueReport(){
  return `<section class="word-page-section"><details><summary>Report a data issue</summary><form data-word-issue-form="true"><label>Issue type<select class="input" name="category">${['Gloss appears incorrect','Gloss is missing','Parsing appears incorrect','Lemma appears incorrect','Word structure appears incorrect','Other'].map(value => `<option>${value}</option>`).join('')}</select></label><label>Note<textarea class="input" name="note" rows="3" placeholder="Describe what you noticed"></textarea></label><p class="small muted">The report stays on this device unless you choose to copy or download it.</p><div class="word-page-inline-actions"><button class="btn btn-ghost btn-sm" type="button" data-word-issue-copy>Copy report</button><button class="btn btn-ghost btn-sm" type="button" data-word-issue-download>Download JSON</button></div></form></details></section>`;
}
function attachPersonalGlossAndIssueHandlers(root, info){
  const form = $('[data-personal-gloss-form]', root);
  form?.addEventListener('submit', event => { event.preventDefault(); const data = new FormData(form); const error = $('[data-personal-gloss-error]', form); try { PuritanPersonalGlosses.setRecord(info, { mode: data.get('mode'), glosses: data.get('glosses') }); renderReaderWordPage(); if(readerState.activeToken) renderReaderWordPopup(); } catch(problem){ if(error){ error.hidden = false; error.textContent = problem.message; } } });
  $('[data-personal-gloss-restore]', root)?.addEventListener('click', () => { PuritanPersonalGlosses.restore(info); renderReaderWordPage(); if(readerState.activeToken) renderReaderWordPopup(); });
  const issueForm = $('[data-word-issue-form]', root);
  const report = () => issueReportForWord(info, new FormData(issueForm).get('category'), new FormData(issueForm).get('note'));
  $('[data-word-issue-copy]', root)?.addEventListener('click', async () => { await navigator.clipboard?.writeText?.(JSON.stringify(report(), null, 2)); if(typeof toast === 'function') toast('Issue report copied.'); });
  $('[data-word-issue-download]', root)?.addEventListener('click', () => { const url = URL.createObjectURL(new Blob([JSON.stringify(report(), null, 2)], { type: 'application/json' })); const link = document.createElement('a'); link.href = url; link.download = 'puritan-parser-data-issue.json'; link.click(); URL.revokeObjectURL(url); });
}
function readerFormDetailFields(info = {}){
  const language = info.language || readerState.language || 'greek';
  return readerMorphologyFields(info)
    .filter(field => cleanReaderTokenValue(field.value))
    .map(field => ({ label: language === 'hebrew' && field.label === 'Prefixes' ? 'Prefix' : field.label, value: field.value }));
}
function renderReaderPopupFormDetails(info = {}){
  const language = info.language || readerState.language;
  const fields = readerFormDetailFields(info);
  const summary = readerGrammarSummary(info, readerPartOfSpeechForInfo(info));
  if(!fields.length && !summary) return '';
  const structuralLabels = new Set(['Prefix', 'Prefixes', 'Suffix', 'Suffix Pronoun']);
  const parsingFields = language === 'hebrew' ? fields.filter(field => !structuralLabels.has(field.label)) : fields;
  const structureFields = language === 'hebrew' ? [
    ...fields.filter(field => field.label === 'Prefix' || field.label === 'Prefixes'),
    { label: 'Lexical base', value: readerDisplayLemma(info) },
    ...fields.filter(field => field.label === 'Suffix' || field.label === 'Suffix Pronoun'),
    ...(info.qereKetiv ? [{ label: 'Qere / ketiv', value: info.qereKetiv }] : [])
  ].filter(field => cleanReaderTokenValue(field.value)) : [];
  return `
          <div class="reader-word-form-details">
            <div class="reader-word-label">Form Details</div>
            ${summary ? `<p>${escHtml(summary)}</p>` : ''}
            ${parsingFields.length ? `<dl>${parsingFields.map(field => readerWordPageMeta(field.label, field.value)).join('')}</dl>` : ''}
            ${structureFields.length ? `<div class="reader-word-label reader-word-structure-label">Word structure</div><dl>${structureFields.map(field => readerWordPageMeta(field.label, field.value)).join('')}</dl>` : ''}
          </div>`;
}
function readerLemmaIndex(item = {}, lemma = ''){
  const target = normalizeReaderText(lemma);
  return (item.lemmas || []).findIndex(itemLemma => normalizeReaderText(itemLemma) === target);
}
function readerOccurrenceSnippet(item = {}, lemma = ''){
  const surface = Array.isArray(item.surface) && item.surface.length ? item.surface : String(item.text || '').split(/\s+/).filter(Boolean);
  if(!surface.length) return '';
  const foundIndex = readerLemmaIndex(item, lemma);
  const center = foundIndex >= 0 ? foundIndex : 0;
  let start = Math.max(0, center - 3);
  let end = Math.min(surface.length, center + 4);
  while(end - start < 6 && (start > 0 || end < surface.length)){
    if(start > 0) start -= 1;
    if(end - start >= 6) break;
    if(end < surface.length) end += 1;
  }
  const words = surface.slice(start, end).join(' ');
  return `...${words}...`;
}
function readerOccurrenceReference(item = {}){
  return `${item.bookName || ''} ${item.chapter}:${item.verse}`.trim();
}
function readerOccurrenceKey(item = {}){
  return `${item.language || ''}/${item.book || ''}/${Number(item.chapter) || ''}/${String(item.verse || '')}`;
}
function readerOccurrenceFromIndexItem(item = {}, lemma = '', language = 'greek'){
  return {
    language,
    book: item.book,
    bookName: item.bookName,
    chapter: Number(item.chapter),
    verse: String(item.verse || ''),
    reference: readerOccurrenceReference(item),
    snippet: readerOccurrenceSnippet(item, lemma)
  };
}
function readerCurrentOccurrenceLocation(info = {}, language = readerState.language){
  const parsed = parseReaderReference(info.reference || '', language);
  return {
    language: parsed?.language || language,
    book: parsed?.book || readerState.book,
    chapter: Number(parsed?.chapter || readerState.chapter) || 1,
    verse: parsed?.verse || String((info.reference || '').match(/:(\d+)/)?.[1] || readerState.focusVerse || '')
  };
}
function readerOccurrenceMatchesLocation(item = {}, location = {}){
  return item.book === location.book && Number(item.chapter) === Number(location.chapter) && String(item.verse || '') === String(location.verse || '');
}
function representativeReaderOccurrences(index = [], lemma = '', limit = 5, language = 'greek', options = {}){
  const seen = new Set();
  const current = options.current ? readerCurrentOccurrenceLocation(options.current, language) : null;
  const candidates = index.filter(item => readerLemmaIndex(item, lemma) >= 0).sort((a, b) => {
    const aCurrent = current && readerOccurrenceMatchesLocation(a, current) ? -1 : 0;
    const bCurrent = current && readerOccurrenceMatchesLocation(b, current) ? -1 : 0;
    if(aCurrent !== bCurrent) return aCurrent - bCurrent;
    const aBook = current && a.book === current.book ? -1 : 0;
    const bBook = current && b.book === current.book ? -1 : 0;
    return aBook - bBook;
  });
  return candidates.reduce((items, item) => {
    if(items.length >= limit) return items;
    const key = readerOccurrenceKey({ ...item, language });
    if(seen.has(key)) return items;
    seen.add(key);
    items.push(readerOccurrenceFromIndexItem(item, lemma, language));
    return items;
  }, []);
}
async function getReaderLemmaOccurrences(lemma, language = 'greek', limit = 5, options = {}){
  const cleanLemma = cleanReaderTokenValue(lemma);
  if(!cleanLemma) return [];
  try {
    return representativeReaderOccurrences(await loadReaderSearchIndex(language), cleanLemma, limit, language, options);
  } catch(e) {
    return [];
  }
}
async function loadReaderManifest(language = readerState.language){
  const config = getReaderConfig(language);
  if(readerManifestCache.has(language)) return readerManifestCache.get(language);
  const manifest = normalizeReaderManifest(await fetchReaderJson(config.manifestPath));
  if(manifest.books.length) config.books = manifest.books;
  readerManifestCache.set(language, manifest);
  return manifest;
}
function getReaderBookChapters(language, bookId){ return getReaderBook(language, bookId)?.chapters || []; }
function clampReaderChapter(language, book, chapter){
  const chapters = getReaderBookChapters(language, book);
  const requested = Number(chapter) || chapters[0] || 1;
  if(chapters.includes(requested)) return requested;
  return chapters.reduce((closest, current) => Math.abs(current - requested) < Math.abs(closest - requested) ? current : closest, chapters[0] || 1);
}
function getReaderInterlinearChapterPath(book, chapter){
  return `${ReaderConfig.hebrew.interlinearRoot}/${book}/${chapter}.json`;
}
function decodeReaderInterlinearChapter(data = {}){
  const tokenFields = Array.isArray(data.tokenFields) ? data.tokenFields : [];
  const segmentFields = Array.isArray(data.segmentFields) ? data.segmentFields : [];
  if(data.schemaVersion !== 1 || !data.book || !Number(data.chapter) || !tokenFields.length || !segmentFields.length) {
    throw new Error('Hebrew interlinear chapter has an unsupported schema.');
  }
  const decode = (fields, values) => {
    if(!Array.isArray(values) || values.length !== fields.length) throw new Error('Hebrew interlinear record does not match its field schema.');
    return Object.fromEntries(fields.map((field, index) => [field, values[index]]));
  };
  const verses = (data.verses || []).map(verse => ({
    verse: Number(verse.verse),
    tokens: (verse.tokens || []).map(values => {
      const token = decode(tokenFields, values);
      token.segments = (token.segments || []).map(segment => decode(segmentFields, segment));
      return { ...token, book: data.book, chapter: Number(data.chapter), verse: Number(verse.verse) };
    })
  }));
  return { ...data, verses };
}
async function loadReaderInterlinearChapter(book = readerState.book, chapter = readerState.chapter){
  const key = readerCacheKey('hebrew-interlinear', book, chapter);
  if(readerInterlinearChapterCache.has(key)) return readerInterlinearChapterCache.get(key);
  if(readerInterlinearPromises.has(key)) return readerInterlinearPromises.get(key);
  readerInterlinearLoadCounts[key] = (readerInterlinearLoadCounts[key] || 0) + 1;
  const pending = fetchReaderJson(getReaderInterlinearChapterPath(book, chapter))
    .then(decodeReaderInterlinearChapter)
    .then(data => {
      readerInterlinearChapterCache.set(key, data);
      return data;
    })
    .finally(() => readerInterlinearPromises.delete(key));
  readerInterlinearPromises.set(key, pending);
  return pending;
}
async function resolveReaderTokenLexicalSegments(token = {}, reference = {}, language = readerState.language){
  if(language !== 'hebrew' || (Array.isArray(token.segments) && token.segments.length)) return token;
  const tokenId = cleanReaderTokenValue(token.tokenId || token.id);
  const book = cleanReaderTokenValue(reference.book);
  const chapter = Number(reference.chapter);
  if(!tokenId || !book || !chapter) return token;
  try {
    const interlinear = await loadReaderInterlinearChapter(book, chapter);
    const sourceToken = (interlinear.verses || [])
      .flatMap(verse => verse.tokens || [])
      .find(item => cleanReaderTokenValue(item.id || item.tokenId) === tokenId);
    if(!Array.isArray(sourceToken?.segments) || !sourceToken.segments.length) return token;
    return { ...token, segments: sourceToken.segments };
  } catch(error) {
    console.warn('Reader lexical segment lookup failed.', error);
    return token;
  }
}
function attachReaderInterlinearChapter(readerData = {}, interlinearData = {}){
  if(readerData.book !== interlinearData.book || Number(readerData.chapter) !== Number(interlinearData.chapter)) {
    throw new Error('Hebrew interlinear chapter identity does not match the Reader chapter.');
  }
  const sourceVerses = new Map((interlinearData.verses || []).map(verse => [Number(verse.verse), verse]));
  const attachVerse = verse => {
    const sourceVerse = sourceVerses.get(Number(verse.verse || verse.number));
    const tokens = Array.isArray(verse.tokens) ? verse.tokens : [];
    if(!sourceVerse || sourceVerse.tokens.length !== tokens.length) {
      throw new Error(`Hebrew interlinear token count does not match ${readerData.book} ${readerData.chapter}:${verse.verse || verse.number}.`);
    }
    return {
      ...verse,
      tokens: tokens.map((token, index) => {
        const record = sourceVerse.tokens[index];
        const expectedId = `${readerData.book}.${readerData.chapter}.${verse.verse || verse.number}.${index + 1}`;
        if(record.id !== expectedId || record.surface !== token.surface || Number(record.tokenIndex) !== index + 1) {
          throw new Error(`Hebrew interlinear token identity mismatch at ${expectedId}.`);
        }
        return {
          ...token,
          tokenId: record.id,
          interlinearGloss: record.gloss,
          glossStatus: record.glossStatus,
          sourceRowIds: record.sourceRowIds,
          qereKetiv: record.qereKetiv,
          variantTokenIds: record.variantTokenIds,
          segments: record.segments,
          maqqefAfter: record.maqqefAfter,
          punctuationAfter: record.punctuationAfter
        };
      })
    };
  };
  if(Array.isArray(readerData.paragraphs)) {
    return { ...readerData, paragraphs: readerData.paragraphs.map(paragraph => ({ ...paragraph, verses: (paragraph.verses || []).map(attachVerse) })) };
  }
  return { ...readerData, verses: (readerData.verses || []).map(attachVerse) };
}
async function loadReaderChapter(language = readerState.language, book = readerState.book, chapter = readerState.chapter){
  const key = readerCacheKey(language, book, chapter);
  if(readerChapterCache.has(key)) return readerChapterCache.get(key);
  if(readerChapterPromises.has(key)) return readerChapterPromises.get(key);
  const path = getReaderChapterPath(language, book, chapter);
  readerLoadCounts[key] = (readerLoadCounts[key] || 0) + 1;
  const pending = fetchReaderJson(path)
    .then(data => {
      readerChapterCache.set(key, data);
      return data;
    })
    .finally(() => readerChapterPromises.delete(key));
  readerChapterPromises.set(key, pending);
  return pending;
}
async function loadReaderTranslationChapter(book = readerState.book, chapter = readerState.chapter, translationId = getActiveReaderSettings().translationProvider){
  const provider = getReaderTranslationProvider(translationId);
  if(!provider) return null;
  const key = readerTranslationCacheKey(book, chapter, translationId);
  if(readerTranslationChapterCache.has(key)) return readerTranslationChapterCache.get(key);
  if(readerTranslationPromises.has(key)) return readerTranslationPromises.get(key);
  readerTranslationLoadCounts[key] = (readerTranslationLoadCounts[key] || 0) + 1;
  const pending = provider.manifest()
    .then(manifest => {
      if(!provider.hasChapter(manifest, book, chapter)) throw new Error(`${provider.id.toUpperCase()} unavailable for ${book} ${chapter}`);
      return provider.loadChapter(book, chapter);
    })
    .then(data => {
      readerTranslationChapterCache.set(key, data);
      return data;
    })
    .finally(() => readerTranslationPromises.delete(key));
  readerTranslationPromises.set(key, pending);
  return pending;
}
async function resolveReaderTranslationChapter(settings = getActiveReaderSettings(), book = readerState.book, chapter = readerState.chapter, chapterData = readerState.chapterData){
  const requested = getReaderTranslationOption(settings.translationProvider).id;
  const baseStatus = { requested, active: '', fallback: false, unavailable: false };
  try {
    const data = await loadReaderTranslationChapter(book, chapter, requested);
    if(requested === 'oeb' && chapterData && !readerChapterHasEnglish(chapterData, data)) throw new Error(`OEB unavailable for ${book} ${chapter}`);
    return { data, status: { ...baseStatus, active: requested } };
  } catch(error) {
    if(requested !== 'oeb') return { data: null, status: { ...baseStatus, unavailable: true } };
  }
  try {
    const data = await loadReaderTranslationChapter(book, chapter, 'web');
    return { data, status: { ...baseStatus, active: 'web', fallback: true } };
  } catch(error) {
    return { data: null, status: { ...baseStatus, unavailable: true } };
  }
}
async function ensureReaderTranslationLoaded(settings = getActiveReaderSettings()){
  if(settings.translation !== 'on' || !readerState.chapterData) {
    readerState.translationData = null;
    readerState.translationStatus = null;
    return null;
  }
  const resolved = await resolveReaderTranslationChapter(settings, readerState.book, readerState.chapter);
  readerState.translationData = resolved.data;
  readerState.translationStatus = resolved.status;
  return readerState.translationData;
}
function readerContinuousChapterNumbers(language, book, chapter, radius = 1){
  const chapters = getReaderBookChapters(language, book);
  const index = chapters.indexOf(Number(chapter));
  if(index < 0) return [clampReaderChapter(language, book, chapter)];
  return chapters.slice(Math.max(0, index - radius), Math.min(chapters.length, index + radius + 1));
}
function readerPassageRequestKey(language, book, chapter, settings = getActiveReaderSettings()){
  return [language, book, Number(chapter), settings.textMode, settings.display, settings.translationProvider, settings.translation].join('/');
}
async function loadReaderPassage(language, book, chapter, settings = getActiveReaderSettings()){
  const key = readerPassageRequestKey(language, book, chapter, settings);
  if(readerPassagePromises.has(key)) return readerPassagePromises.get(key);
  const pending = (async () => {
    const dataPromise = loadReaderChapter(language, book, chapter);
    const needsEnglish = settings.translation === 'on' && settings.textMode === 'english';
    const needsInterlinear = language === 'hebrew' && settings.display === 'interlinear' && settings.textMode === 'original';
    if(!needsEnglish && !needsInterlinear) {
      const data = await dataPromise;
      return { chapter: Number(chapter), data, translationData: null, translationStatus: null, interlinearStatus: null };
    }
    if(needsInterlinear) {
      const data = await dataPromise;
      try {
        const interlinear = await loadReaderInterlinearChapter(book, chapter);
        return {
          chapter: Number(chapter),
          data: attachReaderInterlinearChapter(data, interlinear),
          translationData: null,
          translationStatus: null,
          interlinearStatus: { available: true, unavailable: false }
        };
      } catch(error) {
        return {
          chapter: Number(chapter),
          data,
          translationData: null,
          translationStatus: null,
          interlinearStatus: { available: false, unavailable: true, message: error.message || HebrewInterlinearUnavailableMessage }
        };
      }
    }
    const [data, translated] = await Promise.all([dataPromise, resolveReaderTranslationChapter(settings, book, chapter)]);
    return { chapter: Number(chapter), data, translationData: translated.data, translationStatus: translated.status, interlinearStatus: null };
  })().finally(() => readerPassagePromises.delete(key));
  readerPassagePromises.set(key, pending);
  return pending;
}
async function loadReaderContinuousWindow(language, book, chapter, settings = getActiveReaderSettings()){
  const chapters = readerContinuousChapterNumbers(language, book, chapter, 1);
  const passages = await Promise.all(chapters.map(number => loadReaderPassage(language, book, number, settings)));
  return passages.sort((a, b) => a.chapter - b.chapter);
}
function readerContinuousPrefetchChapters(language = readerState.language, book = readerState.book, passages = readerState.continuousChapters){
  const chapters = getReaderBookChapters(language, book);
  const loaded = passages || [];
  if(!loaded.length) return [];
  const firstIndex = chapters.indexOf(Number(loaded[0]?.chapter));
  const lastIndex = chapters.indexOf(Number(loaded.at(-1)?.chapter));
  return [chapters[firstIndex - 1], chapters[lastIndex + 1]].filter((chapter, index, list) => chapter && list.indexOf(chapter) === index);
}
function scheduleReaderContinuousPrefetch(options = {}){
  if(typeof window === 'undefined' || readerState.mode !== 'continuous') return false;
  if(readerPrefetchHandle){
    if(typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(readerPrefetchHandle);
    else clearTimeout(readerPrefetchHandle);
  }
  const language = readerState.language;
  const book = readerState.book;
  const settings = getActiveReaderSettings();
  const visibilityRequestId = readerVisibilityRequestId;
  const chapters = readerContinuousPrefetchChapters(language, book);
  if(options.direction < 0) chapters.sort((a, b) => a - b);
  if(options.direction > 0) chapters.sort((a, b) => b - a);
  if(!chapters.length) return false;
  const prefetch = () => {
    readerPrefetchHandle = null;
    if(readerState.mode !== 'continuous' || readerState.language !== language || readerState.book !== book) return;
    chapters.forEach(chapter => {
      loadReaderPassage(language, book, chapter, settings)
        .then(passage => prepareReaderPassageHtml(passage, settings))
        .catch(() => {});
    });
  };
  if(options.immediate){ prefetch(); return true; }
  readerPrefetchHandle = typeof window.requestIdleCallback === 'function'
    ? window.requestIdleCallback(prefetch, { timeout: 800 })
    : setTimeout(prefetch, 120);
  return true;
}
function readerPassageForChapter(chapter = readerState.chapter){
  return readerState.continuousChapters.find(item => item.chapter === Number(chapter)) || null;
}
function syncReaderActivePassage(chapter = readerState.chapter){
  const passage = readerPassageForChapter(chapter);
  if(!passage) return null;
  readerState.chapterData = passage.data;
  readerState.translationData = passage.translationData;
  readerState.translationStatus = passage.translationStatus;
  readerState.interlinearStatus = passage.interlinearStatus;
  return passage;
}
async function setReaderLocation(location = {}){
  cancelReaderRestoration('location-change');
  const requestId = ++readerLocationRequestId;
  readerInitialized = true;
  const language = ReaderConfig[location.language || readerState.language] ? (location.language || readerState.language) : 'greek';
  await loadReaderManifest(language);
  const book = getReaderBook(language, location.book || readerState.book).id;
  const chapter = clampReaderChapter(language, book, location.chapter || readerState.chapter);
  const mode = normalizeReaderMode(location.mode || readerState.mode);
  let focusVerse = cleanReaderTokenValue(location.verse || location.anchorVerse);
  resetReaderWordDetailsState({ restoreFocus: false });
  readerState = {
    ...readerState,
    language,
    book,
    chapter,
    mode,
    anchorVerse: focusVerse,
    anchorOffset: Number.isFinite(Number(location.anchorOffset)) ? Number(location.anchorOffset) : 0,
    scrollTop: Math.max(0, Number(location.scrollTop) || 0),
    scrollY: Math.max(0, Number(location.scrollY) || 0),
    chapterData: null,
    continuousChapters: [],
    translationData: null,
    translationStatus: null,
    interlinearStatus: null,
    loading: true,
    error: '',
    focusVerse
  };
  renderReader();
  try {
    if(mode === 'continuous'){
      readerState.continuousChapters = await loadReaderContinuousWindow(language, book, chapter);
      if(requestId !== readerLocationRequestId) return false;
      syncReaderActivePassage(chapter);
      if(!focusVerse && !readerState.scrollTop && !readerState.scrollY){
        const verses = (readerState.chapterData?.paragraphs || [{ verses: readerState.chapterData?.verses || [] }]).flatMap(paragraph => paragraph.verses || []);
        focusVerse = cleanReaderTokenValue(verses[0]?.number || verses[0]?.verse);
        readerState.focusVerse = focusVerse;
        readerState.anchorVerse = focusVerse;
        readerState.anchorOffset = 72;
      }
    } else {
      const passage = await loadReaderPassage(language, book, chapter, getActiveReaderSettings());
      if(requestId !== readerLocationRequestId) return false;
      readerState.chapterData = passage.data;
      readerState.translationData = passage.translationData;
      readerState.translationStatus = passage.translationStatus;
      readerState.interlinearStatus = passage.interlinearStatus;
    }
    readerState.loading = false;
    saveReaderLocation(readerState);
  } catch(error) {
    if(requestId !== readerLocationRequestId) return false;
    readerState.loading = false;
    readerState.error = error.message || 'Reader chapter failed to load.';
  }
  if(typeof window !== 'undefined') readerProgrammaticScroll = true;
  renderReader({ skipPreserve: true });
  scheduleReaderPlaceRestore({
    chapter,
    verse: focusVerse,
    anchorOffset: readerState.anchorOffset,
    scrollTop: readerState.scrollTop,
    scrollY: readerState.scrollY
  }, { initial: true });
  if(mode === 'continuous') scheduleReaderContinuousPrefetch({ immediate: true });
  return true;
}
function getAdjacentReaderLocation(direction){
  const books = getReaderBooks(readerState.language);
  const idx = books.findIndex(book => book.id === readerState.book);
  const current = books[idx];
  const chapterIndex = current.chapters.indexOf(readerState.chapter);
  if(direction < 0){
    const previousChapter = current.chapters[chapterIndex - 1];
    if(previousChapter) return { ...readerState, chapter: previousChapter };
  }
  if(direction > 0 && current.chapters[chapterIndex + 1]) return { ...readerState, chapter: current.chapters[chapterIndex + 1] };
  if(readerState.mode === 'continuous') return null;
  const nextBook = books[idx + direction];
  if(!nextBook) return null;
  return { language: readerState.language, book: nextBook.id, chapter: direction > 0 ? nextBook.chapters[0] : nextBook.chapters.at(-1) };
}
function renderReaderPassages(settings = getActiveReaderSettings()){
  if(readerState.mode !== 'continuous'){
    return readerState.chapterData
      ? renderReaderChapter(readerState.chapterData, settings, {
          translationData: readerState.translationData
        })
      : '';
  }
  const passages = readerState.continuousChapters || [];
  const book = getReaderBook(readerState.language, readerState.book);
  const chapters = getReaderBookChapters(readerState.language, readerState.book);
  const firstLoaded = passages[0]?.chapter;
  const lastLoaded = passages.at(-1)?.chapter;
  const atBookStart = firstLoaded === chapters[0];
  const atBookEnd = lastLoaded === chapters.at(-1);
  return `${atBookStart ? `<p class="reader-book-boundary" role="note">Beginning of ${escHtml(book.name)}</p>` : ''}
    ${passages.map(passage => renderReaderPassageSection(passage, settings)).join('')}
    ${atBookEnd ? `<p class="reader-book-boundary" role="note">End of ${escHtml(book.name)}</p>` : ''}`;
}
function readerPreparedPassageKey(passage = {}, settings = getActiveReaderSettings()){
  return [readerState.language, readerState.book, passage.chapter, settings.textMode, settings.display, settings.translationProvider, settings.hideKnown, settings.indicator, settings.assistance].join('/');
}
function renderReaderPassageSection(passage, settings = getActiveReaderSettings()){
  return `<section class="reader-chapter-section" data-reader-chapter-section data-chapter="${passage.chapter}" aria-labelledby="readerChapterHeading-${escReaderAttr(readerState.book)}-${passage.chapter}">
      ${renderReaderChapter(passage.data, settings, {
        translationData: passage.translationData,
        idPrefix: `${readerState.book}-${passage.chapter}`,
        headingId: `readerChapterHeading-${readerState.book}-${passage.chapter}`
      })}
    </section>`;
}
function prepareReaderPassageHtml(passage, settings = getActiveReaderSettings()){
  const key = readerPreparedPassageKey(passage, settings);
  if(!readerPreparedPassageHtml.has(key)) readerPreparedPassageHtml.set(key, renderReaderPassageSection(passage, settings));
  return readerPreparedPassageHtml.get(key);
}
function renderReader(options = {}){
  const root = $('#readerShell'); if(!root) return;
  const preservedAnchor = options.preserveAnchor || (!options.skipPreserve && !readerState.loading ? captureReaderAnchor() : null);
  if(preservedAnchor && typeof window !== 'undefined') readerProgrammaticScroll = true;
  const meta = getReaderLanguageMeta(readerState.language);
  const config = getReaderConfig(readerState.language);
  const book = getReaderBook(readerState.language, readerState.book);
  const books = getReaderBooks(readerState.language);
  const chapters = getReaderBookChapters(readerState.language, readerState.book);
  const data = readerState.chapterData;
  const settings = getActiveReaderSettings();
  const effectiveSettings = readerEffectiveSettings(settings, readerState.language, data);
  const detailsMode = currentReaderWordDetailsMode(settings);
  readerState.wordDetailsEffectiveMode = detailsMode;
  root.classList?.toggle?.('reader-shell-with-details', Boolean(readerState.activeToken) && detailsMode === 'side');
  root.innerHTML = `
    <section class="panel reader-controls" id="readerPrimaryControls" aria-label="Reader controls">
      <div class="reader-control-row reader-control-selects">
        <select id="readerLanguageSelect" class="input" aria-label="Reader language selector">${Object.entries(ReaderConfig).map(([key, item]) => `<option value="${key}" ${key===readerState.language?'selected':''}>${escHtml(item.shortLabel || item.label)}</option>`).join('')}</select>
        <select id="readerBookSelect" class="input" aria-label="Book selector">${books.map(item => `<option value="${item.id}" ${item.id===readerState.book?'selected':''}>${escHtml(item.name)}</option>`).join('')}</select>
        <select id="readerChapterSelect" class="input" aria-label="Chapter selector">${chapters.map(ch => `<option value="${ch}" ${ch===readerState.chapter?'selected':''}>Chapter ${ch}</option>`).join('')}</select>
      </div>
      <div class="reader-control-row reader-control-actions">
        <button class="btn btn-ghost btn-sm reader-nav-btn" id="readerPrevBtn" aria-label="Previous chapter" ${getAdjacentReaderLocation(-1)?'':'disabled'}><span class="reader-nav-icon" aria-hidden="true">←</span><span class="reader-nav-label">Previous</span></button>
        <button class="btn btn-ghost btn-sm reader-nav-btn" id="readerNextBtn" aria-label="Next chapter" ${getAdjacentReaderLocation(1)?'':'disabled'}><span class="reader-nav-label">Next</span><span class="reader-nav-icon" aria-hidden="true">→</span></button>
        ${settings.translation === 'on' && settings.showTranslationToggle ? renderReaderTranslationToggle(settings, data) : ''}
        <details class="reader-settings" id="readerSettingsPanel" ${readerSettingsPanelOpen ? 'open' : ''}>
          <summary class="btn btn-ghost btn-sm">Display</summary>
          ${renderReaderSettingsPanel(settings, readerState.language, data)}
        </details>
        <button class="reader-search-toggle" id="readerSearchToggle" type="button" aria-expanded="${readerSearchOpen ? 'true' : 'false'}">Search</button>
        <button class="reader-progress-link" id="readerBookProgressBtn" type="button" aria-label="View Book Progress">Progress</button>
        <div class="reader-reference" id="readerReference"><span>${escHtml(book.name)} ${readerState.chapter}</span><small>${escHtml(renderReaderStatus(effectiveSettings))}</small></div>
      </div>
    </section>
    <section class="panel reader-search${readerSearchOpen ? '' : ' hidden'}" aria-label="${escReaderAttr(config.shortLabel || meta.label)} reader search">
      <input id="readerSearchInput" class="input" placeholder="${escReaderAttr(config.searchPlaceholder)}" autocomplete="off" />
      <button class="btn btn-primary btn-sm" id="readerSearchBtn">Search</button>
      <button class="btn btn-ghost btn-sm" id="readerSearchClose" type="button">Close</button>
      <div id="readerSearchResults" class="reader-search-results"></div>
    </section>
    <div class="reader-content-layout${readerState.activeToken && detailsMode === 'side' ? ' reader-content-layout-side' : ''}">
      <article class="reader-text reader-text-${escReaderAttr(meta.language)}" aria-live="polite" tabindex="0">
        ${readerState.loading ? '<div class="empty-state">Loading chapter…</div>' : ''}
        ${readerState.error ? `<div class="empty-state danger">${escHtml(readerState.error)}</div>` : ''}
        ${!readerState.loading && !readerState.error && data ? renderReaderPassages(effectiveSettings) : ''}
      </article>
      <aside id="readerWordPanelRoot" class="reader-word-panel-slot" aria-live="polite"></aside>
    </div>
    <div id="readerWordPopupRoot"></div>`;
  wireReaderControls();
  renderReaderWordPopup();
  initReaderObservers();
  if(preservedAnchor){
    if(options.preserveAnchor) restoreReaderPlace(preservedAnchor, { scheduledAt: Date.now() });
    scheduleReaderPlaceRestore(preservedAnchor);
  }
}
function navigateReaderAdjacent(direction){
  cancelReaderRestoration('navigation');
  const loc = getAdjacentReaderLocation(direction);
  if(loc) setReaderLocation(loc);
  return Boolean(loc);
}
function readerMomentumScrollDirection(measuredDirection, options = {}){
  const inputAt = Number(options.momentumInputAt ?? readerMomentumInputAt) || 0;
  const inputDirection = Math.sign(Number(options.momentumDirection ?? readerMomentumDirection) || 0);
  const now = Number(options.now ?? Date.now()) || 0;
  return inputDirection && inputAt && now - inputAt <= ReaderScrollMomentumGuardMs
    ? inputDirection
    : Math.sign(Number(measuredDirection) || 0);
}
function handleReaderMomentumInput(event = {}){
  cancelReaderRestoration(event.type || 'pointer-scroll');
  readerProgrammaticScroll = false;
  readerUserScrolledAt = Date.now();
  scheduleReaderLocationSave();
  readerMomentumInputAt = Date.now();
  const touch = event.touches?.[0] || event.changedTouches?.[0];
  const delta = event.type === 'wheel'
    ? Number(event.deltaY) || 0
    : (touch && readerTouchStart ? readerTouchStart.y - (Number(touch.clientY) || 0) : 0);
  const direction = Math.sign(delta);
  if(!direction) return false;
  readerMomentumDirection = direction;
  requestReaderContinuousBoundaryLoad(direction);
  return true;
}
function handleReaderTouchStart(event = {}){
  cancelReaderRestoration('touchstart');
  readerProgrammaticScroll = false;
  const touch = event.touches?.[0] || event.changedTouches?.[0];
  if(!touch) return false;
  readerTouchStart = { x: Number(touch.clientX) || 0, y: Number(touch.clientY) || 0 };
  return true;
}
function handleReaderPointerInput(event = {}){
  if(event.isPrimary === false) return false;
  readerProgrammaticScroll = false;
  return Boolean(cancelReaderRestoration('pointer-input'));
}
function handleReaderTouchEnd(event = {}){
  if(!readerTouchStart) return false;
  const touch = event.changedTouches?.[0] || event.touches?.[0];
  if(!touch) { readerTouchStart = null; return false; }
  const dx = (Number(touch.clientX) || 0) - readerTouchStart.x;
  const dy = (Number(touch.clientY) || 0) - readerTouchStart.y;
  readerTouchStart = null;
  const horizontal = Math.abs(dx);
  const vertical = Math.abs(dy);
  if(horizontal < 60 || vertical > 45 || horizontal < vertical * 1.4) return false;
  const handled = navigateReaderAdjacent(dx < 0 ? 1 : -1);
  if(handled) event.preventDefault?.();
  return handled;
}
function handleReaderChapterKeydown(event = {}){
  if(event.altKey || event.ctrlKey || event.metaKey) return false;
  const targetName = String(event.target?.tagName || '').toLowerCase();
  if(['input','select','textarea','button'].includes(targetName) || event.target?.isContentEditable) return false;
  const pane = event.currentTarget?.classList?.contains?.('reader-text')
    ? event.currentTarget
    : (typeof document !== 'undefined' ? document.querySelector?.('.reader-text') : null);
  const verticalKeys = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', ' ', 'Home', 'End'];
  if(verticalKeys.includes(event.key) && pane){
    cancelReaderRestoration('keyboard-scroll');
    readerProgrammaticScroll = false;
    if(event.shiftKey && event.key !== ' ') return false;
    const viewport = Math.max(1, Number(pane.clientHeight) || 1);
    const maximum = Math.max(0, Number(pane.scrollHeight) - viewport);
    const direction = event.key === 'ArrowUp' || event.key === 'PageUp' || (event.key === ' ' && event.shiftKey) || event.key === 'Home' ? -1 : 1;
    let next = Number(pane.scrollTop) || 0;
    if(event.key === 'ArrowUp' || event.key === 'ArrowDown') next += direction * 48;
    else if(event.key === 'PageUp' || event.key === 'PageDown' || event.key === ' ') next += direction * viewport * .82;
    else next = event.key === 'Home' ? 0 : maximum;
    pane.scrollTop = Math.min(maximum, Math.max(0, next));
    readerUserScrolledAt = Date.now();
    detectReaderCurrentChapter();
    scheduleReaderLocationSave();
    event.preventDefault?.();
    requestReaderContinuousBoundaryLoad(direction);
    return true;
  }
  if(event.shiftKey || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return false;
  const handled = navigateReaderAdjacent(event.key === 'ArrowLeft' ? -1 : 1);
  if(handled) event.preventDefault?.();
  return handled;
}
function renderReaderSettingsPanel(settings = getActiveReaderSettings(), language = readerState.language, data = readerState.chapterData){
  const customInvalid = settings.assistance === 'custom' && settings.customThreshold && !/^[1-9]\d*$/.test(settings.customThreshold);
  const interlinearAvailable = readerLanguageCanUseInterlinear(language);
  const effectiveSettings = settings;
  const standardLabel = language === 'hebrew' ? 'Standard' : 'Original';
  const button = (name, value, label, active, attrs = '') => `<button class="reader-setting-choice${active ? ' active' : ''}" type="button" data-reader-setting="${escReaderAttr(name)}" data-reader-value="${escReaderAttr(value)}" ${attrs}>${escHtml(label)}</button>`;
  return `
        <div class="reader-settings-panel" role="group" aria-label="Adaptive Reader settings">
          <button class="reader-settings-close" id="readerSettingsClose" type="button" aria-label="Close Adaptive Reader settings">✕</button>
          <div class="reader-setting-group">
            <div class="reader-setting-label">Display</div>
            <div class="reader-setting-row">${button('display', 'original', standardLabel, effectiveSettings.display === 'original')}${button('display', 'interlinear', 'Interlinear', effectiveSettings.display === 'interlinear', interlinearAvailable ? '' : 'disabled')}</div>
          </div>
          <div class="reader-setting-group">
            <div class="reader-setting-label">Translation</div>
            <div class="reader-setting-row">${button('translation', 'off', 'Off', settings.translation === 'off')}${button('translation', 'on', 'On', settings.translation === 'on')}</div>
          </div>
          <div class="reader-setting-group">
            <div class="reader-setting-label">English Translation</div>
            <div class="reader-setting-row">${ReaderTranslationOptions.map(option => button('translationProvider', option.id, option.label, settings.translationProvider === option.id)).join('')}</div>
          </div>
          <div class="reader-setting-group">
            <div class="reader-setting-label">Assistance</div>
            <div class="reader-setting-row reader-setting-row-wrap">
              ${ReaderAssistancePresets.map(value => button('assistance', value, value === 'everything' ? 'Everything' : value === 'none' ? 'None' : `${value}+`, settings.assistance === value)).join('')}
              ${button('assistance', 'custom', 'Custom', settings.assistance === 'custom')}
            </div>
            <input class="input reader-custom-threshold" id="readerCustomThreshold" inputmode="numeric" pattern="[0-9]*" placeholder="Exact threshold" value="${escReaderAttr(settings.customThreshold)}" ${settings.assistance === 'custom' ? '' : 'hidden'} aria-invalid="${customInvalid ? 'true' : 'false'}" />
          </div>
          <label class="reader-setting-check"><input type="checkbox" id="readerHideKnownToggle" ${settings.hideKnown ? 'checked' : ''} /> Hide Known Words</label>
          <label class="reader-setting-check"><input type="checkbox" id="readerShowTranslationToggle" ${settings.showTranslationToggle ? 'checked' : ''} /> Show Translation Toggle</label>
          <div class="reader-setting-group">
            <div class="reader-setting-label">Indicator</div>
            <div class="reader-setting-row reader-setting-row-wrap">
              ${button('indicator', 'none', 'None', settings.indicator === 'none')}
              ${button('indicator', 'tint', 'Text Tint', settings.indicator === 'tint')}
              ${button('indicator', 'underline', 'Dotted Underline', settings.indicator === 'underline')}
              ${button('indicator', 'footnote', 'Footnote Marker', settings.indicator === 'footnote')}
            </div>
          </div>
          <div class="reader-setting-group">
            <div class="reader-setting-label">Word details display</div>
            <div class="reader-setting-row reader-setting-row-wrap reader-word-display-settings">
              ${button('wordDetailsDisplay', 'auto', 'Auto', settings.wordDetailsDisplay === 'auto', 'aria-describedby="readerWordDetailsAuto"')}
              ${button('wordDetailsDisplay', 'overlay', 'Overlay', settings.wordDetailsDisplay === 'overlay', 'aria-describedby="readerWordDetailsOverlay"')}
              ${button('wordDetailsDisplay', 'side', 'Side panel', settings.wordDetailsDisplay === 'side', 'aria-describedby="readerWordDetailsSide"')}
            </div>
            <p class="reader-setting-note" id="readerWordDetailsAuto"><strong>Auto:</strong> Use a side panel when space allows and an overlay on smaller screens.</p>
            <p class="reader-setting-note" id="readerWordDetailsOverlay"><strong>Overlay:</strong> Show word details over the passage.</p>
            <p class="reader-setting-note" id="readerWordDetailsSide"><strong>Side panel:</strong> Keep the passage and word details visible together.</p>
          </div>
        </div>`;
}
function readerVerseEnglish(verse = {}, translationData = readerState.translationData){
  return cleanReaderTokenValue(verse.english || verse.translation || verse.kjv || verse.web || verse.asv || verse.textEnglish);
}
function readerTranslationVerseEnglish(verse = {}, translationData = readerState.translationData){
  const embedded = readerVerseEnglish(verse, translationData);
  if(embedded) return embedded;
  const number = verse.number || verse.verse;
  return cleanReaderTokenValue(ReaderTranslationApi?.translationVerseText?.(translationData, number));
}
function readerChapterHasEnglish(data = {}, translationData = readerState.translationData){
  const verses = (data.paragraphs || [{ verses: data.verses || [] }]).flatMap(paragraph => paragraph.verses || []);
  return verses.some(verse => readerTranslationVerseEnglish(verse, translationData));
}
function renderReaderTranslationToggle(settings = getActiveReaderSettings(), data = readerState.chapterData){
  const unavailable = Boolean(readerState.translationStatus?.unavailable);
  const fallback = readerState.translationStatus?.fallback;
  const note = fallback ? 'OEB unavailable here. Showing WEB.' : (unavailable ? 'English unavailable for this passage.' : '');
  return `<div class="reader-translation-bar${settings.floatingTranslationToggle ? ' reader-translation-bar-floating' : ''}" aria-label="Text visibility">
      <div class="reader-translation-toggle reader-primary-display-controls" role="radiogroup" aria-label="Reader language">
        <button class="${settings.textMode === 'original' ? 'active' : ''}" type="button" role="radio" data-reader-visibility="original" data-reader-text-mode="original" aria-label="Read original-language text" aria-checked="${settings.textMode === 'original'}">Original</button>
        <button class="${settings.textMode === 'english' ? 'active' : ''}" type="button" role="radio" data-reader-visibility="english" data-reader-text-mode="english" aria-label="Read English text" aria-checked="${settings.textMode === 'english'}" ${unavailable ? 'disabled aria-describedby="readerTranslationUnavailable"' : ''}>English</button>
      </div>
      ${note ? `<span class="reader-translation-unavailable" id="readerTranslationUnavailable">${escHtml(note)}</span>` : ''}
    </div>`;
}
function renderReaderChapter(data, settings = getActiveReaderSettings(), options = {}){
  const paragraphs = data.paragraphs || [{ verses: data.verses || [] }];
  const meta = getReaderLanguageMeta(data.language || readerState.language);
  const translationData = Object.prototype.hasOwnProperty.call(options, 'translationData') ? options.translationData : readerState.translationData;
  const idPrefix = cleanReaderTokenValue(options.idPrefix);
  const headingId = cleanReaderTokenValue(options.headingId);
  const heading = `<h2${headingId ? ` id="${escReaderAttr(headingId)}"` : ''} class="reader-chapter-heading${readerState.mode === 'chapter' ? ' reader-chapter-heading-quiet' : ''}" dir="ltr">${escHtml(data.bookName)} ${data.chapter}</h2>`;
  const showEnglish = settings.translation === 'on' && settings.textMode === 'english';
  const hasEnglish = readerChapterHasEnglish(data, translationData);
  const interlinearUnavailable = settings.display === 'interlinear' && !readerInterlinearAvailable(data, meta.language);
  const originalSettings = {
    ...settings,
    display: interlinearUnavailable ? 'original' : settings.display,
    textMode: 'original',
    showOriginal: true,
    showEnglish: false
  };
  const originalContent = `${interlinearUnavailable ? `<div class="empty-state reader-interlinear-unavailable" role="status">${escHtml(HebrewInterlinearUnavailableMessage)} <button class="btn btn-ghost btn-sm" type="button" data-reader-interlinear-retry>Retry glosses</button></div>` : ''}${paragraphs.map(paragraph => renderReaderParagraph(paragraph, data, originalSettings, { translationData, idPrefix, meta })).join('')}`;
  const englishContent = hasEnglish
    ? paragraphs.map(paragraph => `<p class="reader-paragraph reader-paragraph-english" lang="en" dir="ltr">${paragraph.verses.map(verse => renderReaderVerse(verse, data, settings, { translationData, idPrefix, kind: 'english', duplicateAnchor: true })).join(' ')}</p>`).join('')
    : '<div class="empty-state">English unavailable for this passage.</div>';
  return `${heading}
    <div class="reader-language-layer" data-reader-language-layer="original" aria-hidden="${showEnglish}"${showEnglish ? ' hidden inert' : ''}>${originalContent}</div>
    ${(hasEnglish || showEnglish) ? `<div class="reader-language-layer reader-language-layer-english" data-reader-language-layer="english" aria-hidden="${!showEnglish}"${showEnglish ? '' : ' hidden inert'}>${englishContent}</div>` : ''}`;
}
function renderReaderParagraph(paragraph, data, settings, options = {}){
  const meta = options.meta || getReaderLanguageMeta(data.language || readerState.language);
  const original = `<p class="reader-paragraph" lang="${escReaderAttr(meta.htmlLang)}" dir="${escReaderAttr(meta.dir)}">${(paragraph.verses || []).map(verse => renderReaderVerse(verse, data, settings, options)).join(' ')}</p>`;
  if(!options.showEnglish) return original;
  const english = `<p class="reader-paragraph reader-paragraph-english" lang="en" dir="ltr">${(paragraph.verses || []).map(verse => renderReaderVerse(verse, data, settings, { ...options, kind: 'english', duplicateAnchor: true })).join(' ')}</p>`;
  return `<div class="reader-parallel-paragraph">${original}${english}</div>`;
}
function renderReaderVerse(verse, data = readerState.chapterData || {}, settings = getActiveReaderSettings(), options = {}){
  const number = verse.number || verse.verse;
  const translationData = Object.prototype.hasOwnProperty.call(options, 'translationData') ? options.translationData : readerState.translationData;
  const idPrefix = cleanReaderTokenValue(options.idPrefix);
  const id = `readerVerse-${idPrefix ? `${idPrefix}-` : ''}${number}${options.duplicateAnchor ? '-english' : ''}`;
  const anchorName = options.duplicateAnchor ? 'data-reader-english-verse' : 'data-reader-verse';
  const anchorAttrs = ` ${anchorName}="${escReaderAttr(number)}" data-reader-chapter="${escReaderAttr(data.chapter)}" data-reader-book="${escReaderAttr(data.book || readerState.book)}"`;
  if(options.kind === 'english' || (settings.translation === 'on' && settings.showEnglish && !settings.showOriginal)) return `<span class="reader-verse reader-verse-english" id="${escReaderAttr(id)}"${anchorAttrs}><sup>${number}</sup>${escHtml(readerTranslationVerseEnglish(verse, translationData) || '')}</span>`;
  const language = data.language || readerState.language;
  const tokens = Array.isArray(verse.tokens) ? verse.tokens.map(token => normalizeReaderToken(token, language)).filter(token => token.surface && (token.lemma || token.parse || token.gloss || token.primaryGloss)) : [];
  const verseSettings = settings.display === 'interlinear' && !readerInterlinearAvailable({ language, verses: [{ ...verse, tokens }] }, language) ? { ...settings, display: 'original' } : settings;
  const text = tokens.length ? renderReaderTokens(tokens, { book: data.book, bookName: data.bookName, chapter: data.chapter, verse: number }, verseSettings, language) : escHtml(verse.text);
  return `<span class="reader-verse" id="${escReaderAttr(id)}"${anchorAttrs}><sup>${number}</sup>${text}</span>`;
}
function renderReaderTokens(tokens, reference = {}, settings = getActiveReaderSettings(), language = readerState.language){
  const meta = getReaderLanguageMeta(language);
  return tokens.map((token, index) => {
    const normalized = normalizeReaderToken(token, language);
    const assisted = readerTokenQualifiesForAssistance(normalized, settings, language);
    const indicatorClass = assisted && settings.indicator !== 'none' ? ` reader-token-${settings.indicator}` : '';
    const interlinear = settings.display === 'interlinear';
    const gloss = interlinear ? readerTokenInterlinearHint(normalized, language) : '';
    const details = interlinear ? readerTokenInterlinearDetails(normalized, language) : '';
    const classes = ['reader-token'];
    if(!assisted) classes.push('reader-token-unassisted');
    if(indicatorClass) classes.push(indicatorClass.trim());
    if(interlinear) classes.push('reader-token-interlinear');
    const tokenId = normalized.tokenId || `${reference.book}.${reference.chapter}.${reference.verse}.${index + 1}`;
    const missingGloss = interlinear && language === 'hebrew' && normalized.glossStatus !== 'source';
    const glossText = missingGloss ? '—' : gloss;
    const accessibleGloss = missingGloss ? 'Gloss unavailable' : glossText;
    const accessibleLabel = assisted
      ? `${normalized.surface || `token ${index + 1}`}${interlinear && accessibleGloss ? `: ${accessibleGloss}` : ''}. Show word details`
      : `${normalized.surface || `token ${index + 1}`} hidden by Reader settings`;
    const button = `<button class="${classes.join(' ')}" id="readerToken-${escReaderAttr(tokenId)}" type="button" lang="${escReaderAttr(meta.htmlLang)}" dir="${escReaderAttr(meta.dir)}" data-token-id="${escReaderAttr(tokenId)}" data-reader-assisted="${assisted ? 'true' : 'false'}" data-language="${escReaderAttr(meta.language)}" data-surface="${escReaderAttr(normalized.surface || '')}" data-lemma="${escReaderAttr(normalized.lemma || '')}" data-parse="${escReaderAttr(normalized.parse || '')}" data-source-lemma="${escReaderAttr(normalized.sourceLemma || '')}" data-primary-gloss="${escReaderAttr(normalized.primaryGloss || '')}" data-gloss="${escReaderAttr(normalized.gloss || '')}" data-occurrence-gloss="${escReaderAttr(normalized.interlinearGloss || '')}" data-gloss-status="${escReaderAttr(normalized.glossStatus || '')}" data-root="${escReaderAttr(normalized.root || '')}" data-hebrew-lemma="${escReaderAttr(normalized.hebrewLemma || '')}" data-stem="${escReaderAttr(normalized.stem || '')}" data-lexical-form="${escReaderAttr(normalized.lexicalForm || '')}" data-qere-ketiv="${escReaderAttr(normalized.qereKetiv || '')}" data-book="${escReaderAttr(reference.book || '')}" data-book-name="${escReaderAttr(reference.bookName || '')}" data-chapter="${escReaderAttr(reference.chapter || '')}" data-verse="${escReaderAttr(reference.verse || '')}" aria-label="${escReaderAttr(accessibleLabel)}"><span class="reader-token-surface" lang="${escReaderAttr(meta.htmlLang)}" dir="${escReaderAttr(meta.dir)}">${escHtml(normalized.surface)}</span>${interlinear ? `<span class="reader-token-gloss${missingGloss ? ' reader-token-gloss-missing' : ''}" lang="en" dir="ltr">${escHtml(glossText || ' ')}</span>${details ? `<span class="reader-token-details" lang="en" dir="ltr">${escHtml(details)}</span>` : ''}` : ''}${assisted && settings.indicator === 'footnote' ? '<sup class="reader-token-marker">•</sup>' : ''}</button>`;
    if(!interlinear || language !== 'hebrew') return button;
    const punctuation = `${normalized.maqqefAfter ? '־' : ''}${normalized.punctuationAfter || ''}`;
    return `<span class="reader-interlinear-unit" dir="rtl">${button}${punctuation ? `<span class="reader-token-punctuation" lang="he" dir="rtl" aria-hidden="true">${escHtml(punctuation)}</span>` : ''}</span>`;
  }).join(' ');
}
function setReaderBrowserScrollRestoration(active){
  if(typeof history === 'undefined' || !('scrollRestoration' in history)) return false;
  history.scrollRestoration = active ? 'manual' : 'auto';
  return true;
}
function captureReaderAnchor(){
  if(typeof document === 'undefined') return null;
  const pane = document.querySelector?.('.reader-text');
  if(!pane) return null;
  const verses = Array.from(pane.querySelectorAll?.('[data-reader-verse], [data-reader-english-verse]') || [])
    .filter(verse => !verse.closest?.('[data-reader-language-layer][hidden]'));
  const paneRect = pane.getBoundingClientRect?.() || { top: 0, height: Number(pane.clientHeight) || 0 };
  const viewportTop = Number(paneRect.top) || 0;
  const viewportHeight = Number(paneRect.height || pane.clientHeight) || 800;
  const viewportBottom = viewportTop + viewportHeight;
  const anchorLine = viewportTop + Math.min(120, Math.max(48, viewportHeight * .18));
  let chosen = null;
  let distance = Number.POSITIVE_INFINITY;
  verses.forEach(verse => {
    const rect = verse.getBoundingClientRect?.();
    if(!rect || Number(rect.bottom) < viewportTop || Number(rect.top) > viewportBottom) return;
    const nextDistance = Math.abs(Number(rect.top) - anchorLine);
    if(nextDistance < distance){ chosen = verse; distance = nextDistance; }
  });
  const chosenRect = chosen?.getBoundingClientRect?.();
  return {
    chapter: Number(chosen?.dataset?.readerChapter || readerState.chapter) || readerState.chapter,
    verse: cleanReaderTokenValue(chosen?.dataset?.readerVerse || chosen?.dataset?.readerEnglishVerse || readerState.anchorVerse),
    anchorOffset: chosenRect ? Number(chosenRect.top) - viewportTop : Number(readerState.anchorOffset) || 0,
    scrollTop: Math.max(0, Number(pane.scrollTop) || Number(readerState.scrollTop) || 0),
    scrollY: 0
  };
}
function captureReaderReflowAnchor(){
  const measured = captureReaderAnchor();
  if(readerLastRestoreAt <= readerUserScrolledAt || !readerState.anchorVerse) return measured;
  const target = findReaderAnchorElement({ chapter: readerState.chapter, verse: readerState.anchorVerse });
  const pane = typeof document !== 'undefined' ? document.querySelector?.('.reader-text') : null;
  const targetRect = target?.getBoundingClientRect?.();
  const paneRect = pane?.getBoundingClientRect?.();
  const viewportTop = Number(paneRect?.top) || 0;
  const viewportBottom = Number(paneRect?.bottom) || 0;
  if(!targetRect || targetRect.bottom < viewportTop || targetRect.top > viewportBottom) return measured;
  return {
    chapter: readerState.chapter,
    verse: readerState.anchorVerse,
    anchorOffset: Number(readerState.anchorOffset) || 0,
    scrollTop: measured?.scrollTop || readerState.scrollTop,
    scrollY: measured?.scrollY || readerState.scrollY
  };
}
function findReaderAnchorElement(anchor = {}){
  if(typeof document === 'undefined' || !anchor.verse) return null;
  const verses = Array.from(document.querySelectorAll?.('[data-reader-verse], [data-reader-english-verse]') || [])
    .filter(verse => !verse.closest?.('[data-reader-language-layer][hidden]'));
  return verses.find(verse =>
    Number(verse.dataset?.readerChapter) === Number(anchor.chapter || readerState.chapter)
    && String(verse.dataset?.readerVerse || verse.dataset?.readerEnglishVerse || '') === String(anchor.verse)
    && (!verse.dataset?.readerBook || verse.dataset.readerBook === readerState.book)
  ) || null;
}
function restoreReaderPlace(anchor = {}, options = {}){
  if(typeof document === 'undefined' || typeof window === 'undefined') return false;
  if(options.restoreRequestId && options.restoreRequestId !== readerRestoreRequestId) return false;
  if(options.visibilityRequestId && options.visibilityRequestId !== readerVisibilityRequestId) return false;
  const pane = document.querySelector?.('.reader-text');
  if(!pane || Number(pane.clientHeight) <= 0) return false;
  if(readerUserScrolledAt > Number(options.scheduledAt || 0)) return false;
  const target = findReaderAnchorElement(anchor);
  if(anchor.verse && !target) return false;
  const rawOffset = Number(anchor.anchorOffset);
  const maximumOffset = Math.max(2000, Number(pane.clientHeight) * 2);
  const anchorOffset = Number.isFinite(rawOffset) && Math.abs(rawOffset) <= maximumOffset ? rawOffset : 0;
  readerProgrammaticScroll = true;
  if(target?.getBoundingClientRect){
    const paneRect = pane.getBoundingClientRect?.() || { top: 0 };
    const viewportTop = Number(paneRect.top) || 0;
    const delta = Number(target.getBoundingClientRect().top) - viewportTop - anchorOffset;
    pane.scrollTop = Math.max(0, Number(pane.scrollTop) + delta);
  } else {
    pane.scrollTop = Math.max(0, Number(anchor.scrollTop) || Number(anchor.scrollY) || 0);
  }
  const restoredChapter = clampReaderChapter(readerState.language, readerState.book, anchor.chapter || readerState.chapter);
  if(restoredChapter !== readerState.chapter) updateReaderCurrentChapter(restoredChapter, { persist: false });
  else readerState.chapter = restoredChapter;
  readerState.anchorVerse = cleanReaderTokenValue(anchor.verse);
  readerState.anchorOffset = anchorOffset;
  readerState.scrollTop = Math.max(0, Number(pane.scrollTop) || 0);
  readerState.scrollY = 0;
  readerLastScrollPosition = readerState.scrollTop;
  readerLastRestoreAt = Date.now();
  saveReaderLocation(readerState);
  setTimeout(() => { readerProgrammaticScroll = false; }, 120);
  return true;
}
function readerRestorationReady(anchor = {}){
  if(typeof document === 'undefined') return false;
  const readerView = document.getElementById?.('readerView');
  if(readerView?.classList?.contains?.('hidden')) return false;
  const pane = document.querySelector?.('.reader-text');
  if(!pane || Number(pane.clientHeight) <= 0 || readerState.loading || readerState.error) return false;
  if(anchor.chapter && Number(anchor.chapter) !== Number(readerState.chapter)
    && !readerPassageForChapter(anchor.chapter)) return false;
  if(!anchor.verse || findReaderAnchorElement(anchor)) return true;
  const fallback = Array.from(pane.querySelectorAll?.('[data-reader-verse], [data-reader-english-verse]') || [])
    .find(verse => Number(verse.dataset?.readerChapter) === Number(anchor.chapter || readerState.chapter)
      && !verse.closest?.('[data-reader-language-layer][hidden]'));
  if(!fallback) return false;
  anchor.verse = cleanReaderTokenValue(fallback.dataset?.readerVerse || fallback.dataset?.readerEnglishVerse);
  anchor.anchorOffset = 0;
  return Boolean(anchor.verse);
}
function readerRestorationOffsetError(anchor = {}){
  if(typeof document === 'undefined') return Number.POSITIVE_INFINITY;
  const pane = document.querySelector?.('.reader-text');
  const target = findReaderAnchorElement(anchor);
  if(!pane || !target?.getBoundingClientRect) return Number.POSITIVE_INFINITY;
  const paneTop = Number(pane.getBoundingClientRect?.()?.top) || 0;
  return Number(target.getBoundingClientRect().top) - paneTop - (Number(anchor.anchorOffset) || 0);
}
function finishReaderRestoration(state = 'complete'){
  readerRestoreState = state;
  readerRestoreObserver?.disconnect?.();
  readerRestoreObserver = null;
  readerRestoreFrame = null;
  return state;
}
function cancelReaderRestoration(reason = 'user-input'){
  if(!['pending', 'waiting-for-route', 'waiting-for-data', 'waiting-for-layout', 'applying', 'verifying'].includes(readerRestoreState)) return false;
  readerRestoreRequestId += 1;
  if(readerRestoreFrame && typeof window !== 'undefined') window.cancelAnimationFrame?.(readerRestoreFrame);
  finishReaderRestoration('cancelled');
  readerProgrammaticScroll = false;
  return reason;
}
function verifyReaderRestoration(restoreRequestId){
  if(restoreRequestId !== readerRestoreRequestId || readerRestoreState === 'cancelled') return false;
  if(readerUserScrolledAt > readerRestoreScheduledAt) return Boolean(cancelReaderRestoration());
  readerRestoreState = 'verifying';
  const error = readerRestorationOffsetError(readerRestoreAnchor);
  if(Number.isFinite(error) && Math.abs(error) > 8 && readerRestoreCorrectionCount < 1){
    readerRestoreCorrectionCount += 1;
    restoreReaderPlace(readerRestoreAnchor, { scheduledAt: readerRestoreScheduledAt, restoreRequestId });
  }
  finishReaderRestoration('complete');
  return true;
}
function applyPendingReaderRestoration(restoreRequestId){
  if(restoreRequestId !== readerRestoreRequestId || readerRestoreState === 'cancelled') return false;
  if(!['pending', 'waiting-for-route', 'waiting-for-data', 'waiting-for-layout'].includes(readerRestoreState)) return false;
  if(readerUserScrolledAt > readerRestoreScheduledAt) return Boolean(cancelReaderRestoration());
  if(!readerRestorationReady(readerRestoreAnchor)){
    readerRestoreState = readerState.loading ? 'waiting-for-data' : 'waiting-for-layout';
    return false;
  }
  readerRestoreState = 'applying';
  if(!restoreReaderPlace(readerRestoreAnchor, { scheduledAt: readerRestoreScheduledAt, restoreRequestId })){
    readerRestoreState = 'waiting-for-layout';
    return false;
  }
  readerRestoreAnchor.anchorOffset = readerState.anchorOffset;
  readerRestoreState = 'verifying';
  readerRestoreFrame = window.requestAnimationFrame
    ? window.requestAnimationFrame(() => verifyReaderRestoration(restoreRequestId))
    : setTimeout(() => verifyReaderRestoration(restoreRequestId), 0);
  return true;
}
function scheduleReaderPlaceRestore(anchor = {}, options = {}){
  if(typeof window === 'undefined') return false;
  if(readerRestoreFrame) window.cancelAnimationFrame?.(readerRestoreFrame);
  const restoreRequestId = ++readerRestoreRequestId;
  readerRestoreAnchor = { ...anchor };
  readerRestoreScheduledAt = Date.now();
  readerRestoreCorrectionCount = 0;
  readerRestoreState = 'pending';
  readerRestoreObserver?.disconnect?.();
  readerRestoreObserver = null;
  const queueRestore = () => {
    if(restoreRequestId !== readerRestoreRequestId) return;
    readerRestoreState = 'waiting-for-layout';
    const apply = () => applyPendingReaderRestoration(restoreRequestId);
    readerRestoreFrame = window.requestAnimationFrame ? window.requestAnimationFrame(apply) : setTimeout(apply, 0);
    if(typeof ResizeObserver !== 'undefined' && typeof document !== 'undefined'){
      const pane = document.querySelector?.('.reader-text');
      if(pane){
        readerRestoreObserver = new ResizeObserver(() => {
          if(readerRestoreState === 'waiting-for-layout' || readerRestoreState === 'waiting-for-data') apply();
          else if(readerRestoreState === 'verifying') verifyReaderRestoration(restoreRequestId);
        });
        readerRestoreObserver.observe(pane);
      }
    }
  };
  queueRestore();
  if(options.initial && typeof document !== 'undefined' && document.fonts?.ready){
    document.fonts.ready.then(() => {
      if(restoreRequestId !== readerRestoreRequestId || readerUserScrolledAt > readerRestoreScheduledAt) return;
      if(readerRestoreState === 'waiting-for-layout' || readerRestoreState === 'waiting-for-data') applyPendingReaderRestoration(restoreRequestId);
      else if(readerRestoreState === 'complete') verifyReaderRestoration(restoreRequestId);
    }, () => {});
  }
  return true;
}
function persistReaderPlaceNow(){
  const anchor = captureReaderAnchor();
  if(anchor){
    readerState.chapter = clampReaderChapter(readerState.language, readerState.book, anchor.chapter);
    readerState.anchorVerse = anchor.verse;
    readerState.anchorOffset = anchor.anchorOffset;
    readerState.scrollTop = anchor.scrollTop;
    readerState.scrollY = anchor.scrollY;
    if(readerState.mode === 'continuous') syncReaderActivePassage(readerState.chapter);
  }
  return saveReaderLocation(readerState);
}
function scheduleReaderLocationSave(){
  if(readerScrollTimer) clearTimeout(readerScrollTimer);
  readerScrollTimer = setTimeout(persistReaderPlaceNow, 250);
}
function updateReaderCurrentChapter(chapter, options = {}){
  const next = clampReaderChapter(readerState.language, readerState.book, chapter);
  if(next === readerState.chapter) return false;
  readerState.chapter = next;
  if(readerState.mode === 'continuous') syncReaderActivePassage(next);
  const chapterSelect = $('#readerChapterSelect');
  if(chapterSelect) chapterSelect.value = String(next);
  const book = getReaderBook(readerState.language, readerState.book);
  const reference = $('#readerReference');
  if(reference){
    const label = reference.querySelector?.('span');
    if(label) label.textContent = `${book.name} ${next}`;
  }
  const stickyReference = $('#readerStickyReference');
  if(stickyReference) stickyReference.textContent = `${book.name} ${next}`;
  if(options.persist !== false) scheduleReaderLocationSave();
  return true;
}
function detectReaderCurrentChapter(){
  if(readerState.mode !== 'continuous' || typeof document === 'undefined') return readerState.chapter;
  if(['pending', 'waiting-for-route', 'waiting-for-data', 'waiting-for-layout', 'applying', 'verifying'].includes(readerRestoreState)) return readerState.chapter;
  const pane = document.querySelector?.('.reader-text');
  const sections = Array.from(pane?.querySelectorAll?.('[data-reader-chapter-section]') || []);
  if(!sections.length) return readerState.chapter;
  const paneRect = pane.getBoundingClientRect?.() || { top: 0, height: Number(pane.clientHeight) || 0 };
  const viewportTop = Number(paneRect.top) || 0;
  const viewportHeight = Number(paneRect.height || pane.clientHeight) || 800;
  const anchorLine = viewportTop + Math.min(160, Math.max(72, viewportHeight * .24));
  let candidate = sections[0];
  sections.forEach(section => {
    if(Number(section.getBoundingClientRect?.().top) <= anchorLine) candidate = section;
  });
  const chapter = Number(candidate.dataset?.chapter) || readerState.chapter;
  updateReaderCurrentChapter(chapter);
  return chapter;
}
async function loadReaderContinuousAdjacent(direction){
  if(readerState.mode !== 'continuous' || readerContinuousLoadPending) return false;
  const passages = readerState.continuousChapters || [];
  const edge = direction < 0 ? passages[0]?.chapter : passages.at(-1)?.chapter;
  const chapters = getReaderBookChapters(readerState.language, readerState.book);
  const edgeIndex = chapters.indexOf(Number(edge));
  const nextChapter = chapters[edgeIndex + direction];
  if(!nextChapter || passages.some(item => item.chapter === nextChapter)) return false;
  readerContinuousLoadPending = true;
  const language = readerState.language;
  const book = readerState.book;
  const settings = getActiveReaderSettings();
  const visibilityRequestId = readerVisibilityRequestId;
  if(typeof deferAppDataLoadForInteraction === 'function') deferAppDataLoadForInteraction();
  const preparedKey = [language, book, nextChapter, settings.textMode, settings.display, settings.translationProvider, settings.hideKnown, settings.indicator, settings.assistance].join('/');
  if(!readerPreparedPassageHtml.has(preparedKey)) setReaderBoundaryLoading(direction, true);
  try {
    const passage = await loadReaderPassage(language, book, nextChapter, settings);
    if(readerState.mode !== 'continuous' || readerState.language !== language || readerState.book !== book) return false;
    if(visibilityRequestId !== readerVisibilityRequestId || getActiveReaderSettings().textMode !== settings.textMode || getActiveReaderSettings().display !== settings.display) return false;
    const currentPassages = readerState.continuousChapters || [];
    if(currentPassages.some(item => item.chapter === nextChapter)) return false;
    const merged = [...currentPassages, passage].sort((a, b) => a.chapter - b.chapter);
    readerState.continuousChapters = direction > 0
      ? merged.slice(-ReaderContinuousWindowSize)
      : merged.slice(0, ReaderContinuousWindowSize);
    insertReaderContinuousPassage(passage, direction, settings);
    scheduleReaderContinuousPrefetch({ direction, immediate: true });
    return true;
  } catch(error) {
    return false;
  } finally {
    setReaderBoundaryLoading(direction, false);
    readerContinuousLoadPending = false;
  }
}
function setReaderBoundaryLoading(direction, loading, label = 'Loading next chapter…'){
  if(typeof document === 'undefined') return false;
  const pane = document.querySelector?.('.reader-text');
  if(!pane) return false;
  const selector = `.reader-loading-boundary[data-direction="${direction < 0 ? 'previous' : 'next'}"]`;
  pane.querySelector?.(selector)?.remove?.();
  if(!loading) return true;
  const position = direction < 0 ? 'afterbegin' : 'beforeend';
  pane.insertAdjacentHTML?.(position, `<p class="reader-loading-boundary" data-direction="${direction < 0 ? 'previous' : 'next'}" role="status">${escHtml(label)}</p>`);
  return true;
}
function syncReaderBookBoundaries(pane){
  if(!pane) return;
  pane.querySelectorAll?.('.reader-book-boundary')?.forEach?.(item => item.remove?.());
  const passages = readerState.continuousChapters || [];
  const chapters = getReaderBookChapters(readerState.language, readerState.book);
  const book = getReaderBook(readerState.language, readerState.book);
  if(passages[0]?.chapter === chapters[0]) pane.insertAdjacentHTML?.('afterbegin', `<p class="reader-book-boundary" role="note">Beginning of ${escHtml(book.name)}</p>`);
  if(passages.at(-1)?.chapter === chapters.at(-1)) pane.insertAdjacentHTML?.('beforeend', `<p class="reader-book-boundary" role="note">End of ${escHtml(book.name)}</p>`);
}
const ReaderScrollMomentumGuardMs = 240;
function readerContinuousInsertionNeedsAnchorRestore(direction, sectionCount, options = {}){
  // Appends below the viewport need no correction until trimming removes a chapter above it.
  const changesContentAbove = direction < 0 || (direction > 0 && sectionCount >= ReaderContinuousWindowSize);
  if(!changesContentAbove) return false;
  const momentumInputAt = Number(options.momentumInputAt ?? readerMomentumInputAt) || 0;
  const now = Number(options.now ?? Date.now()) || 0;
  return !momentumInputAt || now - momentumInputAt > ReaderScrollMomentumGuardMs;
}
function insertReaderContinuousPassage(passage, direction, settings = getActiveReaderSettings()){
  if(typeof document === 'undefined') { renderReader(); return false; }
  const pane = document.querySelector?.('.reader-text');
  const sections = Array.from(pane?.querySelectorAll?.('[data-reader-chapter-section]') || []);
  if(!pane || !sections.length || !sections[0]?.insertAdjacentHTML) { renderReader(); return false; }
  const anchor = readerContinuousInsertionNeedsAnchorRestore(direction, sections.length)
    ? captureReaderAnchor()
    : null;
  const html = prepareReaderPassageHtml(passage, settings);
  if(direction < 0) sections[0].insertAdjacentHTML('beforebegin', html);
  else sections.at(-1).insertAdjacentHTML('afterend', html);
  const kept = new Set((readerState.continuousChapters || []).map(item => Number(item.chapter)));
  Array.from(pane.querySelectorAll?.('[data-reader-chapter-section]') || []).forEach(section => {
    if(!kept.has(Number(section.dataset?.chapter))) section.remove?.();
  });
  syncReaderBookBoundaries(pane);
  const inserted = pane.querySelector?.(`[data-reader-chapter-section][data-chapter="${Number(passage.chapter)}"]`);
  $$('.reader-token', inserted).forEach(btn => btn.addEventListener('click', () => openReaderTokenPopup(btn)));
  initReaderObservers();
  if(anchor) restoreReaderPlace(anchor, { scheduledAt: Date.now() });
  return true;
}
function initReaderObservers(){
  readerChapterObserver?.disconnect?.();
  readerChapterObserver = null;
  if(typeof document === 'undefined' || typeof IntersectionObserver === 'undefined') return;
  const pane = document.querySelector?.('.reader-text');
  const sections = Array.from(pane?.querySelectorAll?.('[data-reader-chapter-section]') || []);
  if(readerState.mode === 'continuous' && sections.length){
    readerChapterObserver = new IntersectionObserver(() => detectReaderCurrentChapter(), {
      root: pane,
      rootMargin: '-18% 0px -62% 0px',
      threshold: [0, .01]
    });
    sections.forEach(section => readerChapterObserver.observe(section));
  }
}
async function setReaderMode(mode){
  const nextMode = normalizeReaderMode(mode);
  if(nextMode === readerState.mode) return false;
  const anchor = captureReaderAnchor() || {
    chapter: readerState.chapter,
    verse: readerState.anchorVerse,
    anchorOffset: readerState.anchorOffset
  };
  await setReaderLocation({
    language: readerState.language,
    book: readerState.book,
    chapter: anchor.chapter || readerState.chapter,
    mode: nextMode,
    verse: anchor.verse,
    anchorOffset: anchor.anchorOffset
  });
  return true;
}
function setReaderModePreference(mode){
  const nextMode = normalizeReaderMode(mode);
  const readerIsOpen = typeof state !== 'undefined' && state.currentView === 'readerView';
  if(readerIsOpen) return setReaderMode(nextMode);
  ReaderPreferenceApi?.writeMode?.(nextMode);
  readerState.mode = nextMode;
  readerInitialized = false;
  return Promise.resolve(true);
}
function toggleReaderTextVisibility(kind){
  const settings = getActiveReaderSettings();
  const selected = kind === 'english' && settings.translation === 'on' ? 'english' : 'original';
  if(settings.textMode === selected) {
    scheduleReaderVisibilityFocus(selected);
    return settings;
  }
  const anchor = captureReaderAnchor();
  const requestId = ++readerVisibilityRequestId;
  if(anchor){
    readerState.anchorVerse = anchor.verse;
    readerState.anchorOffset = anchor.anchorOffset;
  }
  const next = {
    ...settings,
    textMode: selected,
    showOriginal: selected === 'original',
    showEnglish: selected === 'english'
  };
  const saved = saveReaderSettings(next, readerState.language);
  syncReaderVisibilityControls(saved);
  setReaderLanguageLoading(false);
  if(typeof deferAppDataLoadForInteraction === 'function') deferAppDataLoadForInteraction();
  const passages = readerState.mode === 'continuous' ? readerState.continuousChapters : [{ translationData: readerState.translationData, translationStatus: readerState.translationStatus }];
  const needsTranslation = saved.translation === 'on' && saved.showEnglish && passages.some(passage => !passage.translationData && !passage.translationStatus);
  if(needsTranslation){
    setReaderLanguageLoading(true, 'Loading English…');
    refreshReaderTranslations(saved).then(() => {
      if(requestId !== readerVisibilityRequestId) return;
      setReaderLanguageLoading(false);
      renderReader({ preserveAnchor: anchor });
      scheduleReaderVisibilityFocus(selected);
    }).catch(() => {
      if(requestId !== readerVisibilityRequestId) return;
      setReaderLanguageLoading(false);
      renderReader({ preserveAnchor: anchor });
    });
    return saved;
  }
  const needsInterlinear = selected === 'original'
    && readerState.language === 'hebrew'
    && saved.display === 'interlinear'
    && !readerChapterHasReliableInterlinearGlossData(readerState.chapterData, 'hebrew');
  if(needsInterlinear){
    setReaderLanguageLoading(true, 'Loading interlinear glosses…');
    setReaderLocation({
      ...getReaderLocation(),
      chapter: anchor?.chapter || readerState.chapter,
      verse: anchor?.verse || readerState.anchorVerse,
      anchorOffset: anchor?.anchorOffset ?? readerState.anchorOffset
    });
    return saved;
  }
  if(applyReaderTextModeToRenderedPassages(saved)){
    if(anchor) scheduleReaderPlaceRestore(anchor, { visibilityRequestId: requestId });
    scheduleReaderVisibilityFocus(selected);
    return saved;
  }
  scheduleReaderLanguageRender({ requestId, selected, anchor });
  return saved;
}
function setReaderLanguageLoading(loading, label = 'Loading English…'){
  if(typeof document === 'undefined') return false;
  const pane = document.querySelector?.('.reader-text');
  if(!pane) return false;
  pane.querySelector?.('.reader-language-loading')?.remove?.();
  if(!loading) return true;
  pane.insertAdjacentHTML?.('afterbegin', `<p class="reader-language-loading" role="status">${escHtml(label)}</p>`);
  return true;
}
function scheduleReaderLanguageRender({ requestId, selected, anchor }){
  const render = () => {
    readerLanguageRenderFrame = null;
    if(requestId !== readerVisibilityRequestId) return;
    renderReader({ preserveAnchor: anchor });
    scheduleReaderVisibilityFocus(selected);
  };
  if(typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function'){
    if(readerLanguageRenderFrame && typeof window.cancelAnimationFrame === 'function') window.cancelAnimationFrame(readerLanguageRenderFrame);
    readerLanguageRenderFrame = window.requestAnimationFrame(render);
  } else Promise.resolve().then(render);
}
function syncReaderVisibilityControls(settings = getActiveReaderSettings()){
  if(typeof document === 'undefined') return false;
  document.querySelectorAll?.('[data-reader-visibility]')?.forEach?.(button => {
    const active = button.dataset?.readerVisibility === settings.textMode;
    button.classList?.toggle?.('active', active);
    button.setAttribute?.('aria-checked', String(active));
  });
  return true;
}
function applyReaderTextModeToRenderedPassages(settings = getActiveReaderSettings()){
  if(typeof document === 'undefined') return false;
  const selected = settings.textMode === 'english' ? 'english' : 'original';
  const layers = Array.from(document.querySelectorAll?.('[data-reader-language-layer]') || []);
  if(!layers.some(layer => layer.dataset?.readerLanguageLayer === selected)) return false;
  layers.forEach(layer => {
    const active = layer.dataset?.readerLanguageLayer === selected;
    layer.hidden = !active;
    layer.toggleAttribute?.('inert', !active);
    layer.setAttribute?.('aria-hidden', String(!active));
  });
  const pane = document.querySelector?.('.reader-text');
  if(pane?.dataset) pane.dataset.readerTextMode = selected;
  const status = document.querySelector?.('#readerReference small');
  if(status) status.textContent = renderReaderStatus(settings);
  return true;
}
function scheduleReaderVisibilityFocus(kind){
  if(typeof window === 'undefined' || typeof document === 'undefined') return false;
  const focus = () => {
    document.querySelector?.(`.reader-primary-display-controls [data-reader-visibility="${kind}"]`)?.focus?.({ preventScroll: true });
  };
  window.requestAnimationFrame ? window.requestAnimationFrame(() => setTimeout(focus, 0)) : setTimeout(focus, 0);
  return true;
}
async function refreshReaderTranslations(settings = getActiveReaderSettings()){
  if(readerState.mode !== 'continuous') return ensureReaderTranslationLoaded(settings);
  const language = readerState.language;
  const book = readerState.book;
  const sourcePassages = readerState.continuousChapters || [];
  const passages = await Promise.all(sourcePassages.map(async passage => {
    if(settings.translation !== 'on') return { ...passage, translationData: null, translationStatus: null };
    const resolved = await resolveReaderTranslationChapter(settings, book, passage.chapter, passage.data);
    return { ...passage, translationData: resolved.data, translationStatus: resolved.status };
  }));
  if(readerState.mode !== 'continuous' || readerState.language !== language || readerState.book !== book) return null;
  readerState.continuousChapters = passages;
  syncReaderActivePassage(readerState.chapter);
  return readerState.translationData;
}
function retryReaderInterlinear(){
  const anchor = captureReaderAnchor() || getReaderLocation();
  return setReaderLocation({
    ...getReaderLocation(),
    chapter: anchor.chapter || readerState.chapter,
    verse: anchor.verse || readerState.anchorVerse,
    anchorOffset: anchor.anchorOffset ?? readerState.anchorOffset
  });
}
function wireReaderControls(){
  $('#readerLanguageSelect')?.addEventListener('change', e => {
    cancelReaderRestoration('language-navigation');
    persistReaderPlaceNow();
    const language = ReaderConfig[e.target.value] ? e.target.value : 'greek';
    const saved = ReaderPreferenceApi?.readLanguageLocation?.(language) || { language, book: getReaderBook(language)?.id, chapter: 1 };
    setReaderLocation(saved);
  });
  $('#readerBookSelect')?.addEventListener('change', e => {
    cancelReaderRestoration('book-navigation');
    setReaderLocation({ language: readerState.language, book: e.target.value, chapter: 1 });
  });
  $('#readerChapterSelect')?.addEventListener('change', e => {
    cancelReaderRestoration('chapter-navigation');
    setReaderLocation({ language: readerState.language, book: readerState.book, chapter: Number(e.target.value) });
  });
  $('#readerPrevBtn')?.addEventListener('click', () => navigateReaderAdjacent(-1));
  $('#readerNextBtn')?.addEventListener('click', () => navigateReaderAdjacent(1));
  $('#readerBookProgressBtn')?.addEventListener('click', openReaderBookProgress);
  $('#readerSearchToggle')?.addEventListener('click', openReaderSearch);
  $('#readerSearchClose')?.addEventListener('click', closeReaderSearch);
  $('#readerSearchBtn')?.addEventListener('click', () => runReaderSearch($('#readerSearchInput')?.value || ''));
  $('#readerSearchInput')?.addEventListener('keydown', e => { if(e.key === 'Enter') runReaderSearch(e.target.value); });
  $('#readerSettingsPanel summary')?.addEventListener('click', event => {
    event.preventDefault();
    openReaderSettingsPanel();
  });
  $('#readerSettingsClose')?.addEventListener('click', closeReaderSettingsPanel);
  $$('[data-reader-setting]').forEach(btn => btn.addEventListener('click', () => updateReaderSetting(btn.dataset.readerSetting, btn.dataset.readerValue)));
  $('#readerHideKnownToggle')?.addEventListener('change', e => updateReaderSetting('hideKnown', e.target.checked));
  $('#readerShowTranslationToggle')?.addEventListener('change', e => updateReaderSetting('showTranslationToggle', e.target.checked));
  $('#readerCustomThreshold')?.addEventListener('change', e => updateReaderSetting('customThreshold', e.target.value));
  $$('[data-reader-visibility]').forEach(btn => btn.addEventListener('click', () => toggleReaderTextVisibility(btn.dataset.readerVisibility)));
  $$('[data-reader-interlinear-retry]').forEach(btn => btn.addEventListener('click', retryReaderInterlinear));
  $$('.reader-token').forEach(btn => btn.addEventListener('click', () => openReaderTokenPopup(btn)));
  const readerText = $('.reader-text');
  readerText?.removeEventListener?.('scroll', handleReaderScroll);
  readerText?.removeEventListener?.('wheel', handleReaderMomentumInput);
  readerText?.removeEventListener?.('touchmove', handleReaderMomentumInput);
  readerText?.removeEventListener?.('pointerdown', handleReaderPointerInput);
  readerText?.addEventListener('scroll', handleReaderScroll, { passive: true });
  readerText?.addEventListener('wheel', handleReaderMomentumInput, { passive: true });
  readerText?.addEventListener('touchmove', handleReaderMomentumInput, { passive: true });
  readerText?.addEventListener('pointerdown', handleReaderPointerInput, { passive: true });
  readerText?.addEventListener('keydown', handleReaderChapterKeydown);
  readerText?.addEventListener('touchstart', handleReaderTouchStart, { passive: true });
  readerText?.addEventListener('touchend', handleReaderTouchEnd, { passive: false });
  if(typeof document !== 'undefined'){
    document.removeEventListener?.('keydown', handleReaderPopupKeydown);
    document.addEventListener?.('keydown', handleReaderPopupKeydown);
    document.removeEventListener?.('click', handleReaderDocumentClick);
    document.addEventListener?.('click', handleReaderDocumentClick);
  }
  if(typeof window !== 'undefined'){
    window.removeEventListener?.('resize', handleReaderResize);
    window.addEventListener?.('resize', handleReaderResize, { passive: true });
    window.removeEventListener?.('popstate', handleReaderWordPopState);
    window.addEventListener?.('popstate', handleReaderWordPopState);
  }
}
function handleReaderResize(){
  if(readerState.mode === 'continuous' && readerState.anchorVerse && !readerState.loading){
    scheduleReaderPlaceRestore({
      chapter: readerState.chapter,
      verse: readerState.anchorVerse,
      anchorOffset: readerState.anchorOffset,
      scrollTop: readerState.scrollTop,
      scrollY: readerState.scrollY
    });
  }
  if(!readerState.activeToken) { syncReaderWordDetailsLayout(currentReaderWordDetailsMode(), false); return; }
  const next = currentReaderWordDetailsMode();
  if(next === readerState.wordDetailsEffectiveMode) return;
  renderReaderWordPopup();
}
function readerContinuousBoundaryState({ direction = 0, distance = Number.POSITIVE_INFINITY, viewport = 800, velocity = 0 } = {}){
  const size = Math.max(1, Number(viewport) || 800);
  const remaining = Math.max(0, Number(distance) || 0);
  const speed = Math.min(2, Math.max(0, Number(velocity) || 0));
  return {
    prefetch: direction !== 0 && remaining < size * (4 + speed),
    insert: direction !== 0 && remaining < Math.max(720, size * (2.25 + speed * .75))
  };
}
function readerContinuousBoundaryForPane(pane, direction, velocity = 0){
  if(!pane || !direction) return readerContinuousBoundaryState();
  const remaining = Number(pane.scrollHeight) - Number(pane.scrollTop) - Number(pane.clientHeight);
  const viewport = Number(pane.clientHeight) || 800;
  const distance = direction < 0 ? Number(pane.scrollTop) : remaining;
  return readerContinuousBoundaryState({ direction, distance, viewport, velocity });
}
function requestReaderContinuousBoundaryLoad(direction, velocity = 0){
  if(readerState.mode !== 'continuous' || readerContinuousLoadPending || typeof document === 'undefined') return false;
  const pane = document.querySelector?.('.reader-text');
  if(!pane) return false;
  const boundary = readerContinuousBoundaryForPane(pane, direction, velocity);
  if(boundary.prefetch) scheduleReaderContinuousPrefetch({ direction, immediate: true });
  if(!boundary.insert) return false;
  loadReaderContinuousAdjacent(direction);
  return true;
}
function handleReaderScroll(){
  if(typeof state !== 'undefined' && state.currentView !== 'readerView') return;
  if(readerProgrammaticScroll){
    detectReaderCurrentChapter();
    return;
  }
  readerUserScrolledAt = Date.now();
  detectReaderCurrentChapter();
  scheduleReaderLocationSave();
  if(readerState.mode !== 'continuous' || readerContinuousLoadPending || typeof document === 'undefined') return;
  const pane = document.querySelector?.('.reader-text');
  if(!pane) return;
  const scrollPosition = Math.max(0, Number(pane.scrollTop) || 0);
  const now = Date.now();
  const scrollDelta = scrollPosition - readerLastScrollPosition;
  const elapsed = readerLastScrollAt ? Math.max(1, now - readerLastScrollAt) : 16;
  const scrollDirection = readerMomentumScrollDirection(Math.sign(scrollDelta), { now });
  const scrollVelocity = Math.abs(scrollDelta) / elapsed;
  readerLastScrollPosition = scrollPosition;
  readerLastScrollAt = now;
  if(typeof deferAppDataLoadForInteraction === 'function') deferAppDataLoadForInteraction();
  requestReaderContinuousBoundaryLoad(scrollDirection, scrollVelocity);
}
function suspendReader(){
  cancelReaderRestoration('route-change');
  persistReaderPlaceNow();
  setReaderBrowserScrollRestoration(false);
  readerChapterObserver?.disconnect?.();
  readerChapterObserver = null;
  if(readerScrollTimer) clearTimeout(readerScrollTimer);
  readerScrollTimer = null;
  if(readerPrefetchHandle){
    if(typeof window !== 'undefined' && typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(readerPrefetchHandle);
    else clearTimeout(readerPrefetchHandle);
  }
  readerPrefetchHandle = null;
  if(readerLanguageRenderFrame && typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function') window.cancelAnimationFrame(readerLanguageRenderFrame);
  readerLanguageRenderFrame = null;
  if(typeof document !== 'undefined'){
    document.removeEventListener?.('keydown', handleReaderPopupKeydown);
    document.removeEventListener?.('click', handleReaderDocumentClick);
    const readerText = document.querySelector?.('.reader-text');
    readerText?.removeEventListener?.('scroll', handleReaderScroll);
    readerText?.removeEventListener?.('wheel', handleReaderMomentumInput);
    readerText?.removeEventListener?.('touchmove', handleReaderMomentumInput);
    readerText?.removeEventListener?.('pointerdown', handleReaderPointerInput);
  }
  if(typeof window !== 'undefined'){
    window.removeEventListener?.('resize', handleReaderResize);
    window.removeEventListener?.('popstate', handleReaderWordPopState);
  }
  readerSettingsPanelOpen = false;
  return true;
}
function openReaderSearch(){
  readerSearchOpen = true;
  renderReader();
  setTimeout(() => $('#readerSearchInput')?.focus?.(), 0);
}
function closeReaderSearch(){
  readerSearchOpen = false;
  renderReader();
}
function openReaderSettingsPanel(){
  if(readerSettingsPanelOpen) return;
  readerSettingsPanelOpen = true;
  renderReader();
}
function closeReaderSettingsPanel(){
  if(!readerSettingsPanelOpen) return;
  readerSettingsPanelOpen = false;
  renderReader();
}
function handleReaderDocumentClick(event){
  if(!readerSettingsPanelOpen) return;
  const panel = event.target?.closest?.('#readerSettingsPanel');
  if(panel) return;
  closeReaderSettingsPanel();
}
function updateReaderSetting(key, value){
  if(['translation', 'translationProvider', 'textMode', 'display'].includes(key)) cancelReaderRestoration('mode-change');
  const preservedAnchor = ['translation', 'translationProvider', 'textMode', 'display', 'hideKnown', 'indicator'].includes(key) ? captureReaderReflowAnchor() : null;
  const wasSettingsPanelOpen = readerSettingsPanelOpen;
  const updateLanguage = readerState.language;
  const settings = getActiveReaderSettings();
  const next = { ...settings };
  if(key === 'hideKnown') next.hideKnown = Boolean(value);
  else if(key === 'floatingControls') next.floatingControls = Boolean(value);
  else if(key === 'floatingTranslationToggle') next.floatingTranslationToggle = Boolean(value);
  else if(key === 'showTranslationToggle') next.showTranslationToggle = Boolean(value);
  else if(key === 'customThreshold'){
    const clean = String(value || '').trim();
    if(clean && !/^[1-9]\d*$/.test(clean)){
      if(typeof toast === 'function') toast('Enter a positive whole number.');
      readerSettingsPanelOpen = true;
      renderReader();
      return settings;
    }
    next.customThreshold = clean;
    next.assistance = 'custom';
  } else if(key === 'assistance') {
    next.assistance = value;
    if(value === 'custom' && next.customThreshold && !/^[1-9]\d*$/.test(next.customThreshold)) next.customThreshold = '';
  } else if(key === 'translation') {
    next.translation = value === 'on' ? 'on' : 'off';
    if(next.translation === 'off') { next.textMode = 'original'; next.showEnglish = false; next.showOriginal = true; }
  } else if(key === 'translationProvider') {
    next.translationProvider = ReaderTranslationOptions.some(option => option.id === value) ? value : 'oeb';
  } else if(key === 'textMode') {
    next.textMode = value === 'english' ? 'english' : 'original';
    next.showOriginal = next.textMode === 'original';
    next.showEnglish = next.textMode === 'english';
  } else if(key === 'display') {
    next.display = value === 'interlinear' ? 'interlinear' : 'original';
    if(updateLanguage === 'hebrew') next.hebrewDisplay = next.display === 'interlinear' ? 'interlinear' : 'standard';
  } else if(key === 'indicator') {
    next.indicator = ['none', 'tint', 'underline', 'footnote'].includes(value) ? value : 'none';
  } else if(key === 'wordDetailsDisplay') {
    next.wordDetailsDisplay = normalizeReaderWordDetailsDisplay(value);
  }
  const saved = saveReaderSettings(next, updateLanguage);
  readerSettingsPanelOpen = wasSettingsPanelOpen;
  if(key === 'display' && updateLanguage === 'hebrew'){
    const anchor = preservedAnchor || getReaderLocation();
    setReaderLocation({
      ...getReaderLocation(),
      chapter: anchor.chapter || readerState.chapter,
      verse: anchor.verse || readerState.anchorVerse,
      anchorOffset: anchor.anchorOffset ?? readerState.anchorOffset
    });
    return saved;
  }
  if(saved.translation === 'on' && saved.textMode === 'english' && (key === 'translation' || key === 'translationProvider' || key === 'textMode')){
    refreshReaderTranslations(saved).then(() => {
      renderReader();
      if(preservedAnchor) scheduleReaderPlaceRestore(preservedAnchor);
    });
  }
  renderReader();
  if(preservedAnchor) scheduleReaderPlaceRestore(preservedAnchor);
  return saved;
}
function handleReaderPopupKeydown(event){
  if(event.key !== 'Escape') return;
  if(readerSettingsPanelOpen){
    closeReaderSettingsPanel();
    return;
  }
  closeReaderWordPopup();
}
function handleReaderWordDetailsScrollKeydown(event = {}){
  if(event.altKey || event.ctrlKey || event.metaKey) return false;
  if(event.target?.closest?.('input, textarea, select, [contenteditable="true"]')) return false;
  const scroller = event.currentTarget?.matches?.('.reader-word-panel-body, .reader-word-popup-body')
    ? event.currentTarget
    : event.currentTarget?.querySelector?.('.reader-word-panel-body, .reader-word-popup-body');
  if(!scroller) return false;
  const maxScroll = Math.max(0, Number(scroller.scrollHeight) - Number(scroller.clientHeight));
  const pageStep = Math.max(40, Math.round(Number(scroller.clientHeight) * .85));
  const current = Number(scroller.scrollTop) || 0;
  const targets = {
    ArrowDown: current + 40,
    ArrowUp: current - 40,
    PageDown: current + pageStep,
    PageUp: current - pageStep,
    Home: 0,
    End: maxScroll
  };
  if(!Object.hasOwn(targets, event.key)) return false;
  event.preventDefault?.();
  event.stopPropagation?.();
  scroller.scrollTop = Math.max(0, Math.min(maxScroll, targets[event.key]));
  return true;
}
function showReaderHiddenBySettings(){
  const now = Date.now();
  if(now - readerHiddenToastAt < 2500) return;
  readerHiddenToastAt = now;
  if(typeof toast === 'function') toast('Hidden by Reader settings.');
}
async function openReaderTokenPopup(button){
  if(button?.dataset?.readerAssisted === 'false'){
    showReaderHiddenBySettings();
    return null;
  }
  const selectedLanguage = ReaderConfig[button?.dataset?.language] ? button.dataset.language : (ReaderConfig[readerState.language] ? readerState.language : 'greek');
  const sourceToken = readerChapterTokens(readerState.chapterData || {}).find(item => cleanReaderTokenValue(item.tokenId) === cleanReaderTokenValue(button.dataset.tokenId)) || {};
  const token = {
    ...sourceToken,
    tokenId: button.dataset.tokenId || sourceToken.tokenId || sourceToken.id || '',
    surface: button.dataset.surface || '',
    lemma: button.dataset.lemma || '',
    parse: button.dataset.parse || '',
    sourceLemma: button.dataset.sourceLemma || '',
    primaryGloss: button.dataset.primaryGloss || '',
    gloss: button.dataset.gloss || '',
    interlinearGloss: button.dataset.occurrenceGloss || '',
    glossStatus: button.dataset.glossStatus || '',
    root: button.dataset.root || '',
    hebrewLemma: button.dataset.hebrewLemma || '',
    stem: button.dataset.stem || '',
    lexicalForm: button.dataset.lexicalForm || '',
    qereKetiv: normalizeReaderQereKetiv(button.dataset.qereKetiv)
  };
  readerPopupLastTrigger = button;
  openReaderWordHistoryEntry();
  const reference = {
    language: selectedLanguage,
    book: button.dataset.book || (selectedLanguage === readerState.language ? readerState.book : getReaderBook(selectedLanguage)?.id),
    bookName: button.dataset.bookName || getReaderBook(selectedLanguage, button.dataset.book || readerState.book)?.name,
    chapter: Number(button.dataset.chapter) || (selectedLanguage === readerState.language ? readerState.chapter : 1),
    verse: button.dataset.verse || ''
  };
  const loadingInfo = { surface: token.surface, lemma: token.lemma, parse: token.parse, sourceLemma: token.sourceLemma, reference: readerReferenceLabel(reference), language: selectedLanguage };
  const requestId = ++readerWordLookupRequestId;
  const selectionKey = readerTokenSelectionKey(loadingInfo);
  readerState.wordDetailsView = 'quick';
  readerState.activeToken = { loading: true, requestId, selectionKey, info: loadingInfo };
  renderReaderWordPopup();
  const lexicalToken = await resolveReaderTokenLexicalSegments(token, reference, selectedLanguage);
  const info = await lookupReaderWordInfo(lexicalToken, reference, selectedLanguage);
  if(requestId !== readerWordLookupRequestId) return null;
  if(!readerState.activeToken || readerState.activeToken.selectionKey !== selectionKey) return null;
  readerState.activeToken = { loading: false, requestId, selectionKey, info: { ...info, language: selectedLanguage } };
  renderReaderWordPopup();
  return readerState.activeToken;
}
function closeReaderWordPopup(options = {}){
  if(!readerState.activeToken) { syncReaderWordDetailsLayout(currentReaderWordDetailsMode(), false); return; }
  releaseReaderWordHistory({ goBack: options.goBack !== false });
  resetReaderWordDetailsState();
}
function navigateReaderGrammarLink(topicId){
  resetReaderWordDetailsState({ restoreFocus: false });
  const topic = (typeof PuritanReferenceLibrary !== 'undefined') ? PuritanReferenceLibrary.getReferenceTopic?.(topicId) : null;
  if(topic?.language && typeof setReferenceLanguage === 'function') setReferenceLanguage(topic.language, { render: false });
  if(typeof navigateTo === 'function') navigateTo('/grammar');
  else if(typeof showView === 'function') showView('grammarView');
  if(typeof renderReferenceLibrary === 'function') setTimeout(() => renderReferenceLibrary(topicId), 0);
}
function openReaderBookProgress(){
  const testamentId = readerState.language === 'hebrew' ? 'old-testament' : 'new-testament';
  if(typeof learnState !== 'undefined' && Array.isArray(learnState.history)) learnState.history = ['__reader__'];
  if(typeof setLearnPage === 'function') setLearnPage(`reading-readiness:${testamentId}:${readerState.book}`, { skipHistory: true });
  if(typeof showView === 'function') showView('learnView');
  else if(typeof navigateTo === 'function') navigateTo('/learn');
}
function openReaderWordPage(){
  const info = readerState.activeToken?.info || readerState.wordPageInfo;
  if(info?.lemma || info?.surface){
    readerState.wordPageInfo = { ...info };
    readerState.wordPageReturnLocation = readerWordPageReturnLocation(info);
  }
  closeReaderWordPopup({ goBack: false });
  renderReaderWordPage();
  if(typeof showView === 'function') showView('wordPageView');
  return true;
}
function openReaderWordStandalonePage(){
  const info = readerState.activeToken?.info || readerState.wordPageInfo;
  if(info?.lemma || info?.surface){
    readerState.wordPageInfo = { ...info };
    readerState.wordPageReturnLocation = readerWordPageReturnLocation(info);
  }
  closeReaderWordPopup();
  renderReaderWordPage();
  if(typeof showView === 'function') showView('wordPageView');
  return Boolean(readerState.wordPageInfo);
}
function showReaderQuickDetails(){
  readerState.wordDetailsView = 'quick';
  renderReaderWordPopup();
}
function openReaderWordPageFromInfo(info = {}){
  if(info?.lemma || info?.surface || info?.lexicalForm || info?.root || info?.hebrewLemma) readerState.wordPageInfo = { ...info };
  renderReaderWordPage();
  if(typeof showView === 'function') showView('wordPageView');
  return Boolean(readerState.wordPageInfo);
}
function readerWordPageReturnLocation(info = {}){
  if(!info.book || !Number(info.chapter)) return null;
  return {
    language: info.language || readerState.language,
    book: info.book,
    chapter: Number(info.chapter),
    mode: readerState.mode,
    verse: cleanReaderTokenValue(info.verse),
    anchorVerse: cleanReaderTokenValue(info.verse),
    anchorOffset: 0,
    scrollTop: 0
  };
}
function applyReaderWordPageReturnLocation(){
  const location = readerState.wordPageReturnLocation;
  if(!location?.book || !Number(location.chapter)) return null;
  const passageChanged = readerState.language !== location.language
    || readerState.book !== location.book
    || Number(readerState.chapter) !== Number(location.chapter);
  readerState = {
    ...readerState,
    ...location,
    focusVerse: location.verse || location.anchorVerse || ''
  };
  if(passageChanged){
    readerState.chapterData = null;
    readerState.continuousChapters = [];
    readerState.translationData = null;
    readerState.interlinearStatus = null;
  }
  return location;
}
async function openReaderContextOccurrence(location = {}){
  const target = {
    language: location.language || 'greek',
    book: location.book,
    chapter: Number(location.chapter) || 1,
    verse: location.verse || ''
  };
  if(typeof showView === 'function') showView('readerView');
  await setReaderLocation(target);
}
function renderReaderWordPageContextContent(occurrences = [], loading = false, options = {}){
  const hasMore = Boolean(options.hasMore);
  const nextLimit = Number(options.nextLimit) || 10;
  const language = options.language || occurrences[0]?.language || 'greek';
  return loading
    ? '<p class="word-page-context-empty">Loading usage examples...</p>'
    : occurrences.length
      ? `<div class="word-page-context-list">${occurrences.map(item => `
          <button class="word-page-context-link" type="button" data-language="${escReaderAttr(item.language || 'greek')}" data-book="${escReaderAttr(item.book || '')}" data-chapter="${escReaderAttr(item.chapter || '')}" data-verse="${escReaderAttr(item.verse || '')}">
            <span>${escHtml(item.reference)}</span>
            <q lang="${escReaderAttr(getReaderLanguageMeta(item.language).htmlLang)}" dir="${escReaderAttr(getReaderLanguageMeta(item.language).dir)}">${escHtml(item.snippet)}</q>
          </button>`).join('')}</div>`
        + (hasMore ? `<button class="btn btn-ghost btn-sm word-page-load-more" type="button" data-word-page-load-more="${escReaderAttr(nextLimit)}" data-language="${escReaderAttr(language)}">Load More</button>` : '')
      : '<p class="word-page-context-empty">No usage examples found in the Reader index yet.</p>';
}
function renderReaderWordPageContext(occurrences = [], loading = false){
  return `
        <section class="word-page-section word-page-context" aria-labelledby="wordPageContextHeading">
          <h2 id="wordPageContextHeading">Usage Examples</h2>
          <p class="word-page-context-kicker">Small preview from the Reader index</p>
          <div id="wordPageContextList">${renderReaderWordPageContextContent(occurrences, loading)}</div>
          <div id="wordPageReaderExamplesSlot" class="word-page-reader-examples-slot" hidden></div>
        </section>`;
}
function attachReaderWordPageContextHandlers(root, info = readerState.wordPageInfo || {}){
  $$('.word-page-context-link', root).forEach(btn => btn.addEventListener('click', () => openReaderContextOccurrence({
    language: btn.dataset.language || 'greek',
    book: btn.dataset.book,
    chapter: Number(btn.dataset.chapter),
    verse: btn.dataset.verse || ''
  })));
  $$('[data-word-page-load-more]', root).forEach(btn => btn.addEventListener('click', () => {
    const limit = Number(btn.dataset.wordPageLoadMore) || 10;
    updateReaderWordPageContext(info.lemma || info.surface, info.language || btn.dataset.language || readerState.language, limit, info);
  }));
}
async function updateReaderWordPageContext(lemma, language = 'greek', limit = 6, info = readerState.wordPageInfo || {}){
  const root = $('#wordPageShell'); if(!root || !lemma) return [];
  const requestedLimit = Math.max(1, Number(limit) || 6);
  const occurrences = await getReaderLemmaOccurrences(lemma, language, requestedLimit + 1, { current: info });
  const visible = occurrences.slice(0, requestedLimit);
  const mount = $('#wordPageContextList', root);
  if(!mount) return occurrences;
  mount.innerHTML = renderReaderWordPageContextContent(visible, false, {
    hasMore: occurrences.length > requestedLimit,
    nextLimit: requestedLimit + 6,
    language
  });
  attachReaderWordPageContextHandlers(root, info);
  return visible;
}
function renderReaderWordPageContent(info = readerState.wordPageInfo || {}, options = {}) {
  const meta = getReaderLanguageMeta(info.language || readerState.language);
  const headwordAttrs = meta.dir === 'rtl' ? ` lang="${escReaderAttr(meta.htmlLang)}" dir="${escReaderAttr(meta.dir)}"` : '';
  const lookupLemma = cleanReaderTokenValue(info.lemma || info.surface);
  const hasWordInfo = Boolean(lookupLemma || info.lexicalForm || info.root || info.hebrewLemma || info.surface);
  const displayLemma = readerDisplayLemma(info);
  const headword = readerPrimaryHeadword(info);
  const strongId = readerStrongId(info);
  const partOfSpeech = readerPartOfSpeechForInfo(info);
  const resolution = readerGlossResolution(info);
  const glosses = resolution.effective;
  const suffix = options.panel ? 'Panel' : '';
  return `${hasWordInfo ? `<header class="word-page-header">
        <h1 id="wordPageTitle${suffix}" class="word-page-headword"${headwordAttrs}>${escHtml(headword)}</h1>
        ${partOfSpeech ? `<div class="word-page-pos">${escHtml(partOfSpeech)}</div>` : ''}
      </header>
      <section class="word-page-lexical-gloss" aria-label="Lexical gloss"><p>${escHtml(glosses.primaryText)}</p>${glosses.additional?.length ? `<details><summary>More glosses (${glosses.additional.length})</summary><p>${escHtml(glosses.additional.join('; '))}</p></details>` : ''}</section>
      ${resolution.correction?.valid ? '<p class="word-page-gloss-status">Puritan Parser correction applied</p>' : ''}
      ${resolution.personal.active ? `<p class="word-page-gloss-status">${resolution.personal.mode === 'replace' ? 'Using my glosses' : 'Includes my glosses'}</p>` : ''}
      ${renderReaderWordIdentity(info, { displayLemma, partOfSpeech, headword })}
      ${renderReaderWordOccurrence(info, { displayLemma, partOfSpeech, strongId })}
      ${renderReaderWordLearning(info)}
      ${renderReaderWordSaved(info)}
      ${renderReaderWordStudySets(info)}
      ${renderPersonalGlossEditor(info, suffix)}
      <section class="word-page-section"><details><summary>Sources and data</summary><dl class="word-page-meta">${readerWordPageMeta('Standard gloss source', info.glossSource || 'Puritan Parser lexical gloss data')}${readerWordPageMeta('License', info.glossLicense)}${readerWordPageMeta('Attribution', info.glossAttribution)}${readerWordPageMeta('Occurrence gloss source', info.occurrenceGloss ? 'MACULA Hebrew WLC / Cherith' : '')}${readerWordPageMeta('Puritan Parser correction', resolution.correction?.valid ? `${resolution.correction.reason} — ${resolution.correction.sourceReference}` : '')}${readerWordPageMeta('Personal gloss status', resolution.personal.active ? 'Stored locally' : '')}</dl></details></section>
      ${renderIssueReport(info, suffix)}` : `<p class="word-page-empty">Open a word from the Reader to build this page.</p>`}`;
}
function renderReaderWordPage(){
  const root = $('#wordPageShell'); if(!root) return;
  const info = readerState.wordPageInfo || {};
  const hasWordInfo = Boolean(cleanReaderTokenValue(info.lemma || info.surface) || info.lexicalForm || info.root || info.hebrewLemma);
  const fromPractice = info.returnToPractice && info.returnToPractice.sessionId;
  const fromSearch = info.returnToSearch === true;
  const backLabel = fromPractice ? 'Return to practice' : fromSearch ? 'Return to Vocabulary Search' : 'Back to Reader';
  root.innerHTML = `
    <section class="panel word-page-panel" aria-labelledby="wordPageTitle">
      <div class="word-page-top-actions">
        <button class="btn btn-primary" type="button" data-word-page-back-to-reader="true">${backLabel}</button>
      </div>
      ${hasWordInfo ? renderReaderWordPageContent(info) : `<header class="word-page-header"><h1 id="wordPageTitle" class="word-page-headword word-page-empty-title">Choose a word</h1></header><p class="word-page-empty">Open a word from the Reader to build this page.</p>`}
      ${hasWordInfo ? `<section class="word-page-section word-page-navigation" aria-labelledby="wordPageNavigationHeading"><h2 id="wordPageNavigationHeading">Navigation</h2><button class="btn btn-primary" id="wordPageBackToReader" data-word-page-back-to-reader="true">${backLabel}</button></section>` : ''}
    </section>`;
  $$('[data-word-page-back-to-reader]', root).forEach(button => button.addEventListener('click', async () => {
    if(fromPractice && typeof showView === 'function'){
      if(typeof learnState !== 'undefined') learnState.unifiedRevealed = true;
      showView('learnView');
    } else if(fromSearch && typeof showView === 'function') showView('globalSearchView');
    else if(typeof showView === 'function') {
      const returnLocation = applyReaderWordPageReturnLocation();
      if(returnLocation) saveReaderLocation();
      showView('readerView');
      if(returnLocation && typeof document !== 'undefined') await setReaderLocation(returnLocation);
    }
  }));
  $$('[data-word-learn-action]', root).forEach(btn => btn.addEventListener('click', () => {
    if(btn.dataset.wordLearnAction === 'learn') introduceReaderWordFromPage(info);
    if(btn.dataset.wordLearnAction === 'review') reviewReaderWordFromPage(info);
    if(btn.dataset.wordLearnAction === 'known' || btn.dataset.wordLearnAction === 'learning') setReaderWordLearningStatus(btn.dataset.wordLearnAction, info);
  }));
  $$('[data-word-save-toggle]', root).forEach(btn => btn.addEventListener('click', () => toggleReaderSavedWord(info)));
  $$('[data-word-attention-toggle]', root).forEach(btn => btn.addEventListener('click', () => toggleReaderNeedsAttention(info)));
  $$('[data-word-study-set-add]', root).forEach(form => form.addEventListener('submit', event => { event.preventDefault(); addReaderWordToStudySet(new FormData(form).get('setId'), info); }));
  $$('[data-word-study-set-create]', root).forEach(form => form.addEventListener('submit', event => { event.preventDefault(); createReaderStudySetFromWord(new FormData(form).get('title'), info); }));
  attachPersonalGlossAndIssueHandlers(root, info);
}
function readerWordPageMeta(label, value){
  const clean = cleanReaderTokenValue(value);
  if(!clean) return '';
  return `<div><dt>${escHtml(label)}</dt><dd>${escHtml(clean)}</dd></div>`;
}
function renderReaderQuickDetailsHtml(active, info, meta){
  const links = readerGrammarLinksForInfo(info);
  const parseExplanation = cleanReaderTokenValue(info.parseExplanation);
  const rawParse = cleanReaderTokenValue(info.parse);
  const hasDecodedParse = parseExplanation && parseExplanation !== rawParse;
  const displayLemma = readerDisplayLemma(info);
  const formDetailsHtml = renderReaderPopupFormDetails(info);
  const resolution = readerGlossResolution(info);
  const glosses = resolution.effective;
  const partOfSpeech = readerPartOfSpeechForInfo(info);
  const grammarSummary = readerGrammarSummary(info, partOfSpeech);
  const contextualGloss = readerContextualGloss(info, resolution);
  const learningHtml = renderReaderWordLearning(info, { compact: true });
  const grammarHtml = links.length ? `
          <div class="reader-word-grammar">
            <div class="reader-word-label">Grammar</div>
            <div class="reader-word-links" aria-label="Related grammar links">${links.map(link => `<button class="reader-word-link" type="button" data-topic-id="${escHtml(link.topicId)}">${escHtml(link.label)}</button>`).join('')}</div>
          </div>` : '';
  return `
        <div class="reader-word-surface" id="readerWordDetailsTitle" lang="${escReaderAttr(meta.htmlLang)}" dir="${escReaderAttr(meta.dir)}">${escHtml(info.surface || 'Word')}</div>
        <p class="reader-word-reference">${escHtml(info.reference || '')}${info.qereKetiv ? ` · ${escHtml(info.qereKetiv)}` : ''}</p>
        <div class="reader-word-gloss">${escHtml(active.loading ? 'Loading…' : glosses.primaryText)}</div>
        ${glosses.additional?.length ? `<details class="reader-word-more-glosses"><summary>More glosses (${glosses.additional.length})</summary><p>${escHtml(glosses.additional.join('; '))}</p></details>` : ''}
        ${!active.loading && contextualGloss ? `<div class="reader-contextual-gloss"><div class="reader-word-label">In this verse</div><p>${escHtml(contextualGloss)}</p></div>` : ''}
        ${resolution.personal.active ? `<span class="learn-personal-gloss-indicator">${resolution.personal.mode === 'replace' ? 'Using my glosses' : 'Includes my glosses'}</span>` : ''}
        <div class="reader-word-meta">
          ${readerPopupMeta('Lemma', displayLemma)}
          ${readerPopupMeta('Part of speech', partOfSpeech)}
          ${readerPopupMeta('Parsing', grammarSummary || (hasDecodedParse ? parseExplanation : ''))}
          ${readerPopupMeta('Frequency', info.frequency ? `${info.frequency}×` : '')}
          ${readerPopupMeta('Reference', info.reference)}
        </div>
        ${formDetailsHtml}
        ${learningHtml}
        ${grammarHtml}
        ${rawParse ? `<details class="reader-word-technical"><summary>Technical details</summary><div class="reader-word-parse-code">Parse: ${escHtml(rawParse)}</div></details>` : ''}`;
}
function renderReaderWordPopup(){
  const overlayRoot = $('#readerWordPopupRoot');
  const panelRoot = $('#readerWordPanelRoot');
  if(!overlayRoot && !panelRoot) return;
  const active = readerState.activeToken;
  if(!active){ syncReaderWordDetailsLayout(currentReaderWordDetailsMode(), false); return; }
  const info = active.info || {};
  const meta = getReaderLanguageMeta(info.language || readerState.language);
  let effectiveMode = currentReaderWordDetailsMode();
  if(effectiveMode === 'side' && !panelRoot) effectiveMode = 'overlay';
  readerState.wordDetailsEffectiveMode = effectiveMode;
  syncReaderWordDetailsLayout(effectiveMode, true);
  if(effectiveMode === 'side' && panelRoot){
    if(overlayRoot) overlayRoot.innerHTML = '';
    panelRoot.innerHTML = readerState.wordDetailsView === 'full'
      ? `<section class="reader-word-panel reader-word-panel-full" role="region" aria-labelledby="readerWordPanelTitle">
          <header class="reader-word-panel-header"><div><div class="reader-word-label">Full word details</div><h2 id="readerWordPanelTitle">Full word details</h2></div><button class="reader-word-close" type="button" aria-label="Close word details">Close</button></header>
          <div class="reader-word-panel-actions"><button class="btn btn-ghost btn-sm" type="button" data-reader-word-quick>Back to quick details</button><button class="btn btn-ghost btn-sm" type="button" data-reader-word-standalone>Open as full page</button></div>
          <div class="reader-word-panel-body" tabindex="0">${renderReaderWordPageContent(info, { panel: true })}</div>
        </section>`
      : `<section class="reader-word-panel" role="region" aria-labelledby="readerWordDetailsTitle">
          <header class="reader-word-panel-header"><div><div class="reader-word-label">Word details</div></div><button class="reader-word-close" type="button" aria-label="Close word details">Close</button></header>
          <div class="reader-word-panel-body" tabindex="0">${renderReaderQuickDetailsHtml(active, info, meta)}</div>
          <div class="reader-word-panel-actions"><button class="reader-word-page-action btn btn-primary" type="button">Open Word Page</button></div>
        </section>`;
  } else if(overlayRoot){
    if(panelRoot) panelRoot.innerHTML = '';
    readerState.wordDetailsView = 'quick';
    overlayRoot.innerHTML = `
    <div class="reader-word-overlay" data-reader-popup-overlay>
      <section class="reader-word-popup" role="dialog" aria-modal="true" aria-labelledby="readerWordDetailsTitle">
        <header class="reader-word-popup-header"><div class="reader-word-label">Word details</div><button class="reader-word-close" type="button" aria-label="Close word popup">Close</button></header>
        <div class="reader-word-popup-body" tabindex="0">${renderReaderQuickDetailsHtml(active, info, meta)}</div>
        <footer class="reader-word-popup-actions"><button class="reader-word-page-action btn btn-primary" type="button">Open Word Page</button></footer>
      </section>
    </div>`;
  }
  const root = effectiveMode === 'side' && panelRoot ? panelRoot : overlayRoot;
  syncReaderWordDetailsLayout(effectiveMode, true);
  $('.reader-word-panel, .reader-word-popup', root)?.addEventListener('keydown', handleReaderWordDetailsScrollKeydown);
  $('.reader-word-close', root)?.addEventListener('click', closeReaderWordPopup);
  $('[data-reader-popup-overlay]', root)?.addEventListener('click', event => { if(event.target?.dataset?.readerPopupOverlay !== undefined) closeReaderWordPopup(); });
  $$('.reader-word-link', root).forEach(btn => btn.addEventListener('click', () => navigateReaderGrammarLink(btn.dataset.topicId)));
  $('.reader-word-page-action', root)?.addEventListener('click', openReaderWordPage);
  $('[data-reader-word-standalone]', root)?.addEventListener('click', openReaderWordStandalonePage);
  $('[data-reader-word-quick]', root)?.addEventListener('click', showReaderQuickDetails);
  $$('[data-word-learn-action]', root).forEach(btn => btn.addEventListener('click', () => {
    if(btn.dataset.wordLearnAction === 'learn') introduceReaderWordFromPage(info);
    if(btn.dataset.wordLearnAction === 'review') reviewReaderWordFromPage(info);
    if(btn.dataset.wordLearnAction === 'known' || btn.dataset.wordLearnAction === 'learning') setReaderWordLearningStatus(btn.dataset.wordLearnAction, info);
  }));
  $$('[data-word-save-toggle]', root).forEach(btn => btn.addEventListener('click', () => toggleReaderSavedWord(info)));
  $$('[data-word-attention-toggle]', root).forEach(btn => btn.addEventListener('click', () => toggleReaderNeedsAttention(info)));
  $$('[data-word-study-set-add]', root).forEach(form => form.addEventListener('submit', event => { event.preventDefault(); addReaderWordToStudySet(new FormData(form).get('setId'), info); }));
  $$('[data-word-study-set-create]', root).forEach(form => form.addEventListener('submit', event => { event.preventDefault(); createReaderStudySetFromWord(new FormData(form).get('title'), info); }));
  attachReaderWordPageContextHandlers(root, info);
  attachPersonalGlossAndIssueHandlers(root, info);
  if(readerState.wordDetailsView === 'full') updateReaderWordPageContext(info.lemma || info.surface, info.language || readerState.language, 6, info);
  if(effectiveMode !== 'side') $('.reader-word-close', root)?.focus?.();
}
function readerPopupMeta(label, value){
  const clean = Array.isArray(value) ? value.filter(Boolean).join(', ') : cleanReaderTokenValue(value);
  if(!clean) return '';
  return `<div class="reader-word-meta-item"><span>${escHtml(label)}</span><strong>${escHtml(clean)}</strong></div>`;
}
async function runReaderSearch(query){
  const box = $('#readerSearchResults'); if(!box) return [];
  const requestId = ++readerSearchRequestId;
  const language = readerState.language;
  const meta = getReaderLanguageMeta(language);
  const direct = parseReaderReference(query, language);
  if(direct){ await setReaderLocation(direct); closeReaderSearch(); return [direct]; }
  const q = normalizeReaderText(query);
  if(q.length < 2){ box.innerHTML = '<div class="small muted">Enter at least 2 characters.</div>'; return []; }
  box.innerHTML = '<div class="small muted" role="status">Searching…</div>';
  let index = [];
  try { index = await loadReaderSearchIndex(language); } catch(e) { box.innerHTML = '<div class="small muted">Search index unavailable.</div>'; return []; }
  if(requestId !== readerSearchRequestId) return [];
  const useHebrewLexicalSearch = language === 'hebrew'
    && (ReaderHebrewSearchApi?.hasHebrew?.(query) || ReaderHebrewSearchApi?.hasLatin?.(query));
  const results = useHebrewLexicalSearch
    ? ReaderHebrewSearchApi.searchHebrewRecords(index, query, item => item.surface || [item.text]).slice(0, 20).map(item => item.record)
    : index.filter(item => normalizeReaderText(`${item.text} ${item.lemmas?.join(' ')}`).includes(q)).slice(0, 20);
  if(requestId !== readerSearchRequestId) return [];
  box.innerHTML = results.length ? results.map(item => `<button class="reader-result" data-language="${escReaderAttr(language)}" data-book="${escReaderAttr(item.book)}" data-chapter="${escReaderAttr(item.chapter)}" data-verse="${escReaderAttr(item.verse)}"><strong>${escHtml(item.bookName)} ${item.chapter}:${item.verse}</strong> <span lang="${escReaderAttr(meta.htmlLang)}" dir="${escReaderAttr(meta.dir)}">${escHtml(item.text)}</span></button>`).join('') : '<div class="small muted">No verses found.</div>';
  $$('.reader-result', box).forEach(btn => btn.addEventListener('click', async () => {
    await setReaderLocation({ language: btn.dataset.language || language, book: btn.dataset.book, chapter: Number(btn.dataset.chapter), verse: btn.dataset.verse });
    closeReaderSearch();
  }));
  return results;
}
async function initReader(){
  setReaderBrowserScrollRestoration(true);
  if(readerInitialized && readerState.chapterData){
    const settings = getActiveReaderSettings();
    const hasInterlinear = readerChapterHasReliableInterlinearGlossData(readerState.chapterData, readerState.language);
    const needsReload = readerState.language === 'hebrew'
      && settings.textMode === 'original'
      && ((settings.display === 'interlinear') !== hasInterlinear);
    if(!needsReload){ renderReader(); return; }
  }
  const loc = readerInitialized ? getReaderLocation() : loadReaderLocation();
  prepareReaderVocabularyIndex(loc.language);
  readerState = { ...readerState, ...loc };
  await setReaderLocation(loc);
}
if(typeof window !== 'undefined') Object.assign(window, { ReaderConfig, ReaderTranslationOptions, ReaderDefaultSettings, ReaderWordDetailsLayout, readerState, readerChapterCache, readerInterlinearChapterCache, readerTranslationLoadCounts, readerInterlinearLoadCounts, readerManifestCache, readerLoadCounts, getReaderChapterPath, getReaderInterlinearChapterPath, getReaderLanguageMeta, loadReaderManifest, loadReaderChapter, loadReaderInterlinearChapter, loadReaderTranslationChapter, ensureReaderTranslationLoaded, setReaderLocation, getAdjacentReaderLocation, navigateReaderAdjacent, handleReaderChapterKeydown, handleReaderTouchStart, handleReaderTouchEnd, handleReaderWordDetailsScrollKeydown, renderReader, renderReaderChapter, renderReaderVerse, renderReaderTokens, initReader, runReaderSearch, loadReaderLocation, saveReaderLocation, loadReaderSettings, saveReaderSettings, getActiveReaderSettings, updateReaderSetting, openReaderSettingsPanel, closeReaderSettingsPanel, openReaderSearch, closeReaderSearch, readerTokenQualifiesForAssistance, renderReaderSettingsPanel, renderReaderTranslationToggle, normalizeReaderWordDetailsDisplay, resolveReaderWordDetailsMode, currentReaderWordDetailsMode, syncReaderWordDetailsLayout, resetReaderWordDetailsState, parseReaderReference, openReaderTokenPopup, closeReaderWordPopup, openReaderWordPage, openReaderWordStandalonePage, openReaderWordPageFromInfo, readerWordPageReturnLocation, applyReaderWordPageReturnLocation, renderReaderWordPage, renderReaderWordPageContent, lookupReaderWordInfo, prepareReaderVocabularyIndex, explainReaderParse, readerDisplayLemma, readerPrimaryHeadword, readerGrammarLinksForInfo, readerPartOfSpeechForInfo, readerMorphologyFields, renderReaderMorphology, renderReaderGrammar, renderReaderWordIdentity, renderReaderWordOccurrence, readerContextualGloss, getReaderLemmaOccurrences, openReaderContextOccurrence, openReaderBookProgress, renderReaderWordLearning, renderReaderWordSaved, renderReaderWordStudySets, readerLearningStatusForInfo, readerLearningDetailsForInfo, introduceReaderWordFromPage, setReaderWordLearningStatus, reviewReaderWordFromPage, toggleReaderSavedWord, addReaderWordToStudySet, createReaderStudySetFromWord });
if(typeof module !== 'undefined') module.exports = { ReaderConfig, ReaderTranslationOptions, ReaderDefaultSettings, readerState: () => readerState, readerChapterCache, readerInterlinearChapterCache, readerInterlinearLoadCounts, readerTranslationChapterCache, readerTranslationLoadCounts, readerManifestCache, readerLoadCounts, getReaderChapterPath, getReaderInterlinearChapterPath, getReaderLanguageMeta, loadReaderManifest, normalizeReaderManifest, getReaderBookChapters, loadReaderChapter, decodeReaderInterlinearChapter, attachReaderInterlinearChapter, loadReaderInterlinearChapter, loadReaderTranslationChapter, ensureReaderTranslationLoaded, setReaderLocation, getAdjacentReaderLocation, navigateReaderAdjacent, handleReaderChapterKeydown, handleReaderTouchStart, handleReaderTouchEnd, handleReaderWordDetailsScrollKeydown, renderReader, renderReaderChapter, renderReaderVerse, renderReaderTokens, runReaderSearch, loadReaderLocation, saveReaderLocation, loadReaderSettings, saveReaderSettings, getActiveReaderSettings, sanitizeReaderSettings, updateReaderSetting, openReaderSettingsPanel, closeReaderSettingsPanel, openReaderSearch, closeReaderSearch, handleReaderPopupKeydown, handleReaderDocumentClick, readerAssistanceThreshold, readerTokenFrequency, readerTokenQualifiesForAssistance, renderReaderSettingsPanel, renderReaderTranslationToggle, normalizeReaderWordDetailsDisplay, resolveReaderWordDetailsMode, currentReaderWordDetailsMode, syncReaderWordDetailsLayout, resetReaderWordDetailsState, readerChapterHasEnglish, readerChapterHasReliableInterlinearGlossData, readerTranslationVerseEnglish, parseReaderReference, normalizeReaderText, lookupReaderWordInfo, prepareReaderVocabularyIndex, explainReaderParse, readerDisplayLemma, readerPrimaryHeadword, readerGrammarLinksForInfo, readerParseKind, readerPartOfSpeechForInfo, readerMorphologyFields, renderReaderMorphology, renderReaderGrammar, renderReaderWordIdentity, renderReaderWordOccurrence, readerContextualGloss, openReaderTokenPopup, closeReaderWordPopup, openReaderWordPage, openReaderWordStandalonePage, openReaderWordPageFromInfo, readerWordPageReturnLocation, applyReaderWordPageReturnLocation, renderReaderWordPage, loadReaderSearchIndex, representativeReaderOccurrences, getReaderLemmaOccurrences, readerOccurrenceSnippet, renderReaderWordPageContext, renderReaderWordPageContextContent, attachReaderWordPageContextHandlers, openReaderContextOccurrence, openReaderBookProgress, renderReaderWordLearning, renderReaderWordSaved, renderReaderWordStudySets, readerLearningStatusForInfo, readerLearningDetailsForInfo, introduceReaderWordFromPage, setReaderWordLearningStatus, reviewReaderWordFromPage, toggleReaderSavedWord, addReaderWordToStudySet, createReaderStudySetFromWord };
if(typeof module !== 'undefined') Object.assign(module.exports, { readerSegmentPartOfSpeech, readerHebrewLexicalStructure, resolveReaderTokenLexicalSegments, normalizeReaderToken, readerVocabularyLearningEntry, renderReaderPopupFormDetails });
if(typeof window !== 'undefined') Object.assign(window, { setReaderMode, setReaderModePreference, toggleReaderTextVisibility, loadReaderContinuousWindow, loadReaderContinuousAdjacent, captureReaderAnchor, restoreReaderPlace, persistReaderPlaceNow, suspendReader, updateReaderCurrentChapter, scheduleReaderContinuousPrefetch });
if(typeof module !== 'undefined') Object.assign(module.exports, { normalizeReaderMode, readerContinuousChapterNumbers, loadReaderPassage, loadReaderContinuousWindow, loadReaderContinuousAdjacent, readerContinuousPrefetchChapters, scheduleReaderContinuousPrefetch, readerContinuousBoundaryState, readerContinuousBoundaryForPane, readerContinuousInsertionNeedsAnchorRestore, readerMomentumScrollDirection, setReaderMode, setReaderModePreference, toggleReaderTextVisibility, applyReaderTextModeToRenderedPassages, captureReaderAnchor, restoreReaderPlace, scheduleReaderPlaceRestore, cancelReaderRestoration, readerRestorationState: () => ({ state: readerRestoreState, correctionCount: readerRestoreCorrectionCount, generation: readerRestoreRequestId }), handleReaderMomentumInput, handleReaderTouchStart, handleReaderPointerInput, handleReaderResize, persistReaderPlaceNow, suspendReader, updateReaderCurrentChapter, detectReaderCurrentChapter, refreshReaderTranslations, renderReaderPassages, setReaderBrowserScrollRestoration, prepareReaderPassageHtml, insertReaderContinuousPassage, setReaderBoundaryLoading });
