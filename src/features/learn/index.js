/* ---------- Learn Shell ---------- */
const VocabularyLearningModel = (typeof VocabularyLearning !== 'undefined')
  ? VocabularyLearning
  : (typeof require === 'function' ? require('../../models/vocabulary-learning') : null);
const VocabularyMasteryModel = (typeof VocabularyMastery !== 'undefined')
  ? VocabularyMastery
  : (typeof require === 'function' ? require('../../core/vocabulary-mastery') : null);
const LearningPracticeModel = (typeof LearningPractice !== 'undefined')
  ? LearningPractice
  : (typeof require === 'function' ? require('../../core/learning-practice') : null);
const BookProgressModel = (typeof BookProgress !== 'undefined')
  ? BookProgress
  : (typeof require === 'function' ? require('../../core/book-progress') : null);
const ParadigmRecognitionModel = (typeof ParadigmRecognition !== 'undefined')
  ? ParadigmRecognition
  : (typeof require === 'function' ? require('./recognition-engine') : null);
const LearnProgressModel = (typeof ProgressService !== 'undefined')
  ? ProgressService
  : (typeof require === 'function' ? require('../../core/progress-service') : null);
const StudySetsModel = (typeof PuritanStudySets !== 'undefined')
  ? PuritanStudySets
  : (typeof require === 'function' ? require('../../models/study-sets') : null);
const SavedVocabularyModel = (typeof PuritanSavedVocabulary !== 'undefined')
  ? PuritanSavedVocabulary
  : (typeof require === 'function' ? require('../../models/saved-vocabulary') : null);
const LearnAreas = [
  {
    id: 'vocabulary',
    title: 'Vocabulary',
    description: 'Build long-term vocabulary through flexible study paths.',
    children: [
      { id: 'review', title: 'Review', description: 'Review words currently in Learning and strengthen long-term retention.' },
      { id: 'new-words', title: 'New Words', description: 'Choose how you want to prepare for reading.' }
    ]
  },
  {
    id: 'paradigms',
    title: 'Paradigms',
    description: 'Strengthen recognition of Greek and Hebrew grammar.',
    children: [
      { id: 'recognition-practice', title: 'Recognition Practice', emphasis: true, description: 'Practice recognizing Greek and Hebrew paradigms from Reference.' },
      { id: 'parsing-drills', title: 'Parsing Practice', description: 'Practice recognizing Greek and Hebrew grammatical forms.' }
    ],
    groups: [
      {
        id: 'greek',
        title: 'Greek',
        children: [
          { id: 'greek-verbs', title: 'Verbs', emphasis: true, description: 'Practice recognizing Greek verb paradigms from Reference.' },
          { id: 'greek-nouns', title: 'Nouns', description: 'Practice recognizing verified Greek noun and article forms.' }
        ]
      },
      {
        id: 'hebrew',
        title: 'Hebrew',
        children: [
          { id: 'hebrew-verbs', title: 'Verbs', emphasis: true, description: 'Practice recognizing verified Hebrew strong-verb paradigms.' },
          { id: 'hebrew-nouns', title: 'Nouns', description: 'Practice recognizing verified Hebrew noun forms.' }
        ]
      }
    ]
  },
  {
    id: 'reading-readiness',
    title: 'Reading Readiness',
    description: 'Track your reading readiness and study book or chapter vocabulary paths.',
    children: [
      { id: 'old-testament', title: 'Old Testament', description: 'Hebrew Bible books from the Reader.' },
      { id: 'new-testament', title: 'New Testament', description: 'Greek New Testament books from the Reader.' }
    ]
  }
];

const learnState = { page: 'home', history: [], customFrequencyErrors: {}, activeVocabularyPath: '', activeReviewPage: '', currentVocabularyWordId: '', focusedReviewWordId: '', reviewReveal: false, lastReviewResult: null, progressCache: {}, progressLoading: {}, recognitionSession: null, parsingRecognitionSession: null, parsingDrafts: {}, practiceSession: null, maintenanceSession: null, maintenanceError: '', studySetFormError: '', studySetWordPickerQuery: '', studySetDraft: null, selectedRecognitionTargets: {}, unifiedRevealed: false, unifiedSubmitting: false, practicePreparing: {}, practicePreparationGeneration: 0, vocabularyEntryCache: {}, vocabularyEntryPromises: {}, profileDrafts: {}, profileError: '', dashboardRevision: -1, dashboardSummary: null, dashboardPending: false, dashboardVocabularyStore: null, glossMaps: { greek: null, hebrew: null }, glossMapPromises: {} };
const learnPerformanceState = { active: false, navigationStart: 0, milestones: {}, syncFunctions: [], longTasks: [], observer: null };
function learnPerformanceEnabled(){
  return typeof window !== 'undefined' && typeof performance !== 'undefined' && typeof location !== 'undefined' && ['localhost','127.0.0.1'].includes(location.hostname);
}
function clearLearnPerformanceEntries(){
  if(!learnPerformanceEnabled()) return;
  [...performance.getEntriesByType('mark'), ...performance.getEntriesByType('measure')]
    .filter(entry => entry.name.startsWith('puritan-learn-'))
    .forEach(entry => entry.entryType === 'mark' ? performance.clearMarks(entry.name) : performance.clearMeasures(entry.name));
}
function publishLearnPerformanceSnapshot(){
  if(!learnPerformanceEnabled()) return;
  const root = document.getElementById('learnShell');
  if(root) root.dataset.learnPerformance = JSON.stringify(learnPerformanceSnapshot());
}
function beginLearnPerformanceNavigation(source = 'internal'){
  if(!learnPerformanceEnabled()) return false;
  learnPerformanceState.observer?.disconnect?.();
  clearLearnPerformanceEntries();
  Object.assign(learnPerformanceState, { active: true, navigationStart: performance.now(), source, milestones: {}, syncFunctions: [], longTasks: [], observer: null });
  performance.mark('puritan-learn-navigation-start');
  if(typeof PerformanceObserver === 'function' && PerformanceObserver.supportedEntryTypes?.includes('longtask')){
    learnPerformanceState.observer = new PerformanceObserver(list => {
      list.getEntries().forEach(entry => {
        if(entry.startTime >= learnPerformanceState.navigationStart) learnPerformanceState.longTasks.push({ startTime: entry.startTime - learnPerformanceState.navigationStart, duration: entry.duration, attribution: (entry.attribution || []).map(item => item.name || item.containerName || 'unknown') });
      });
      publishLearnPerformanceSnapshot();
    });
    learnPerformanceState.observer.observe({ type: 'longtask', buffered: false });
    window.PuritanLifecycleDiagnostics?.observer?.('learn', true);
  }
  return true;
}
function markLearnPerformanceMilestone(name){
  if(!learnPerformanceEnabled() || !learnPerformanceState.active || learnPerformanceState.milestones[name] !== undefined) return;
  learnPerformanceState.milestones[name] = performance.now() - learnPerformanceState.navigationStart;
  performance.mark(`puritan-learn-${name}`);
  performance.measure(`puritan-learn-navigation-to-${name}`, 'puritan-learn-navigation-start', `puritan-learn-${name}`);
  publishLearnPerformanceSnapshot();
}
function measureLearnSynchronous(name, callback){
  if(!learnPerformanceEnabled() || !learnPerformanceState.active) return callback();
  const start = performance.now();
  try { return callback(); }
  finally {
    learnPerformanceState.syncFunctions.push({ name, duration: performance.now() - start });
    publishLearnPerformanceSnapshot();
  }
}
function learnPerformanceSnapshot(){
  return {
    source: learnPerformanceState.source || '',
    milestones: { ...learnPerformanceState.milestones },
    syncFunctions: learnPerformanceState.syncFunctions.slice().sort((a,b) => b.duration - a.duration),
    longTasks: learnPerformanceState.longTasks.slice(),
    deferredSummaryPending: learnState.dashboardPending,
    primaryButtons: typeof document === 'undefined' ? 0 : document.querySelectorAll('#learnShell [data-learn-start-daily]:not([disabled])').length
  };
}
function prepareLearnPerformanceMeasurement(options = {}){
  if(!learnPerformanceEnabled()) return false;
  learnPerformanceState.observer?.disconnect?.();
  learnPerformanceState.observer = null;
  learnPerformanceState.active = false;
  window.PuritanLifecycleDiagnostics?.observer?.('learn', false);
  if(options.invalidateDashboard){
    learnState.dashboardRevision = -1;
    learnState.dashboardSummary = null;
    learnState.dashboardVocabularyStore = null;
  }
  return true;
}
const LearnFrequencyThresholds = {
  greek: ['25', '10', '5', 'all'],
  hebrew: ['60', '30', '10', '5', 'all']
};
const LearnReviewTargetDefaults = {
  greek: { preset: 'standard', dailyTarget: 30 },
  hebrew: { preset: 'standard', dailyTarget: 30 }
};
const LearnReviewTargetPresets = {
  light: 15,
  standard: 30,
  heavy: 50
};
const LearnReviewTargetStorageKey = 'pp_learn_review_targets';
const LearnPracticeSrsPreferenceStorageKey = 'pp_learn_practice_srs_preference';
const LearnActivePathsStorageKey = 'pp_learn_active_paths';
const LearnPracticeSrsPreferenceDefault = 'practice-only';
const LearnPracticeSrsPreferenceOptions = ['practice-only', 'count-srs'];
const LearnReviewTargetCustomMin = 1;
const LearnMaintenanceSessionSizeMax = 200;
const LearnMaintenanceGradeLetters = ['A', 'B', 'C', 'D', 'F'];
const LearnMaintenanceDefaultGrades = ['C', 'D', 'F'];
const LearnReviewTargetCustomMax = 200;
const LearnFrequencyRanges = [
  { id: '50:', label: '50+ occurrences' },
  { id: '25:49', label: '25–49 occurrences' },
  { id: '10:24', label: '10–24 occurrences' },
  { id: '5:9', label: '5–9 occurrences' },
  { id: '2:4', label: '2–4 occurrences' },
  { id: '1:1', label: '1 occurrence' }
];
const LearnTestaments = {
  'old-testament': { title: 'Old Testament', language: 'hebrew' },
  'new-testament': { title: 'New Testament', language: 'greek' }
};
const learnManifestLoading = {};
const learnManifestBooks = {};

function learnArea(id){ return LearnAreas.find(area => area.id === id); }
function learnChild(area, id){
  const children = [
    ...(area?.children || []),
    ...(area?.groups || []).flatMap(group => group.children || [])
  ];
  return children.find(item => item.id === id);
}
function learnFrequencyNumber(value){
  const custom = String(value || '').match(/^custom-(\d+)$/);
  return custom ? custom[1] : value;
}
function learnFrequencyLabel(value){
  const threshold = learnFrequencyNumber(value);
  return threshold === 'all' ? 'All Words' : `${threshold}+`;
}
function learnLanguageTitle(language){
  if(typeof getReaderConfig === 'function') return getReaderConfig(language)?.shortLabel || getReaderConfig(language)?.label || language;
  return language === 'hebrew' ? 'Hebrew' : 'Greek';
}
function learnFrequencyRange(sourceId = ''){
  const value = String(sourceId || '').trim();
  const custom = value.match(/^custom:(\d+):(\d+)$/);
  if(custom){
    const minimum = Number(custom[1]);
    const maximum = Number(custom[2]);
    return { valid: minimum >= 1 && maximum >= 1 && minimum <= maximum, minimum, maximum, custom: true, id: value };
  }
  const preset = LearnFrequencyRanges.find(item => item.id === value);
  if(!preset) return { valid: false, minimum: 0, maximum: 0, custom: false, id: '' };
  const [minimum, maximum] = preset.id.split(':');
  return { valid: true, minimum: Number(minimum), maximum: maximum ? Number(maximum) : null, custom: false, id: preset.id, label: preset.label };
}
function learnFrequencyRangeLabel(sourceId = ''){
  const range = learnFrequencyRange(sourceId);
  if(!range.valid) return 'Frequency range';
  return range.custom ? `${range.minimum}–${range.maximum} occurrences` : range.label;
}
function makeCustomFrequencyRange(minimum, maximum){
  const min = Number(minimum);
  const max = Number(maximum);
  if(!Number.isInteger(min) || min < 1) return { valid: false, error: 'Enter a positive whole-number minimum.' };
  if(!Number.isInteger(max) || max < 1) return { valid: false, error: 'Enter a positive whole-number maximum.' };
  if(min > max) return { valid: false, error: 'Minimum frequency cannot exceed maximum frequency.' };
  return { valid: true, id: `custom:${min}:${max}`, minimum: min, maximum: max };
}
function learnStorage(){
  if(typeof activeStorageAdapter !== 'undefined' && activeStorageAdapter) return activeStorageAdapter;
  if(typeof localStorage !== 'undefined') return {
    get: key => localStorage.getItem(key),
    set: (key, value) => { if(typeof window !== 'undefined') window.PuritanLifecycleDiagnostics?.write?.(); localStorage.setItem(key, value); },
    remove: key => localStorage.removeItem(key)
  };
  return null;
}
function normalizeLearnReviewTargets(payload){
  const source = payload && typeof payload === 'object' ? payload : {};
  return Object.fromEntries(['greek','hebrew'].map(language => {
    const candidate = source[language] && typeof source[language] === 'object' ? source[language] : {};
    const preset = LearnReviewTargetPresets[candidate.preset] ? candidate.preset : (candidate.preset === 'custom' ? 'custom' : LearnReviewTargetDefaults[language].preset);
    const target = Number(candidate.dailyTarget);
    const fallback = LearnReviewTargetPresets[preset] || LearnReviewTargetDefaults[language].dailyTarget;
    const clamped = Number.isFinite(target)
      ? Math.min(LearnReviewTargetCustomMax, Math.max(LearnReviewTargetCustomMin, Math.floor(target)))
      : fallback;
    return [language, {
      preset,
      dailyTarget: clamped
    }];
  }));
}
function learnReviewTargets(){
  const adapter = learnStorage();
  if(!adapter) return normalizeLearnReviewTargets();
  try {
    const raw = adapter.get(LearnReviewTargetStorageKey);
    return normalizeLearnReviewTargets(raw ? JSON.parse(raw) : null);
  } catch(e){
    return normalizeLearnReviewTargets();
  }
}
function learnReviewTarget(language){
  return learnReviewTargets()[language]?.dailyTarget || LearnReviewTargetDefaults[language]?.dailyTarget || 30;
}
function saveLearnReviewTargets(targets){
  const normalized = normalizeLearnReviewTargets(targets);
  const adapter = learnStorage();
  if(adapter) adapter.set(LearnReviewTargetStorageKey, JSON.stringify(normalized));
  return normalized;
}
function setLearnReviewTarget(language, preset, customValue = ''){
  const targets = learnReviewTargets();
  if(!targets[language]) return targets;
  const nextPreset = preset === 'custom' ? 'custom' : (LearnReviewTargetPresets[preset] ? preset : LearnReviewTargetDefaults[language].preset);
  const current = targets[language].dailyTarget;
  const custom = Number(customValue);
  const dailyTarget = nextPreset === 'custom'
    ? (Number.isFinite(custom) ? Math.min(LearnReviewTargetCustomMax, Math.max(LearnReviewTargetCustomMin, Math.floor(custom))) : current)
    : LearnReviewTargetPresets[nextPreset];
  targets[language] = { preset: nextPreset, dailyTarget };
  return saveLearnReviewTargets(targets);
}
function learnPracticeSrsPreference(){
  return LearningPracticeModel?.loadMaintenancePreference(learnStorage()).enabled ? 'count-srs' : 'practice-only';
}
function setLearnPracticeSrsPreference(value){
  const enabled = value === 'count-srs';
  LearningPracticeModel?.setMaintenancePreference(enabled, learnStorage());
  return enabled ? 'count-srs' : 'practice-only';
}
function learnFrequencyDescription(language, threshold){
  const value = learnFrequencyNumber(threshold);
  return value === 'all'
    ? `Study every ${learnLanguageTitle(language)} lemma.`
    : `Study every ${learnLanguageTitle(language)} lemma occurring ${value} times or more.`;
}
function learnThresholds(language){
  return BookProgressModel?.languageThresholds ? BookProgressModel.languageThresholds(language) : (LearnFrequencyThresholds[language] || LearnFrequencyThresholds.greek);
}
function learnBookList(language){
  if(Array.isArray(learnManifestBooks[language]) && learnManifestBooks[language].length) return learnManifestBooks[language];
  if(typeof getReaderBooks === 'function') return getReaderBooks(language);
  if(typeof require === 'function'){
    try {
      const manifest = require(`../../../data/${language}/manifest.json`);
      if(Array.isArray(manifest.books)) return manifest.books.map(book => ({ ...book, chapters: Array.isArray(book.chapters) ? book.chapters : [] }));
    } catch(e) {}
  }
  return language === 'hebrew'
    ? [{ id: 'jonah', name: 'Jonah', chapters: [1] }]
    : [{ id: 'matthew', name: 'Matthew', chapters: [1, 2] }];
}
function learnBook(language, bookId){ return learnBookList(language).find(book => book.id === bookId) || learnBookList(language)[0]; }
function ensureLearnManifest(language){
  if(learnManifestBooks[language]?.length) return Promise.resolve(learnManifestBooks[language]);
  if(learnManifestLoading[language]) return learnManifestLoading[language];
  const load = typeof loadReaderManifest === 'function'
    ? loadReaderManifest(language)
    : fetch(`/data/${language}/manifest.json`).then(response => {
        if(!response.ok) throw new Error(`Unable to load the ${language} book list.`);
        return response.json();
      });
  learnManifestLoading[language] = Promise.resolve(load)
    .then(manifest => {
      const books = Array.isArray(manifest?.books) ? manifest.books : [];
      if(books.length) learnManifestBooks[language] = books.map(book => ({ ...book, chapters: Array.isArray(book.chapters) ? book.chapters : [] }));
      if(learnState.page.includes(`:${language}`) || learnState.page.includes('old-testament') || learnState.page.includes('new-testament')) renderLearn();
      return learnManifestBooks[language] || [];
    })
    .catch(() => {})
    .finally(() => { delete learnManifestLoading[language]; });
  return learnManifestLoading[language];
}
function learnPageTitle(page = learnState.page){
  if(page === 'home') return 'Learn';
  const [areaId, childId] = page.split(':');
  const area = learnArea(areaId);
  if(!childId) return area?.title || 'Learn';
  return learnChild(area, childId)?.title || area?.title || 'Learn';
}
function normalizeLegacyLearnPracticePage(page){
  const value = String(page || 'home');
  if(value === 'paradigms:parsing-drills' || value === 'parsing-drills') return 'parsing';
  const parts = value.split(':');
  if(parts[0] !== 'vocabulary') return value;
  if(parts[1] === 'review'){
    return parts[2] === 'greek' || parts[2] === 'hebrew' ? `vocabulary:daily:${parts[2]}` : 'home';
  }
  if(parts[1] === 'maintenance'){
    return parts[2] === 'greek' || parts[2] === 'hebrew'
      ? `vocabulary:customize:${parts[2]}:all-known`
      : 'vocabulary:customize-source:all-known';
  }
  if(parts[1] !== 'practice') return value;
  const source = parts[2];
  const language = parts[3] === 'hebrew' ? 'hebrew' : (parts[3] === 'greek' ? 'greek' : '');
  if(source === 'study-sets') return 'study-sets';
  if(source === 'frequency'){
    if(!language) return 'vocabulary:customize-source:frequency';
    const threshold = learnFrequencyNumber(parts[4]);
    const sourceId = threshold && threshold !== 'all' ? `${threshold}:` : '';
    return `vocabulary:customize:${language}:frequency${sourceId ? `:${sourceId}` : ''}`;
  }
  if(source === 'book' || source === 'chapter'){
    if(!language) return 'vocabulary:customize-source:book';
    const bookId = parts[4] || '';
    return `vocabulary:customize:${language}:book${bookId ? `:${bookId}` : ''}`;
  }
  if(source === 'status' && language){
    const profileSource = ['learning','overdue'].includes(parts[4]) ? 'weak' : 'all-known';
    return `vocabulary:customize:${language}:${profileSource}`;
  }
  if(source === 'saved') return 'study-sets';
  if(source === 'backlog') return 'home';
  return 'vocabulary:customize-source:all-known';
}
function learnPageNeedsRecognitionData(page = learnState.page){
  return String(page).startsWith('parsing') || String(page).startsWith('paradigms');
}
function ensureLearnRecognitionData(){
  if(typeof PuritanReferenceLibrary !== 'undefined') return Promise.resolve(true);
  const loader = typeof window !== 'undefined' ? window.PuritanModuleLoader : null;
  return loader?.ensureRecognitionData ? loader.ensureRecognitionData().then(() => true) : Promise.resolve(false);
}
function setLearnPage(page, options = {}){
  const next = normalizeLegacyLearnPracticePage(page || 'home');
  const changed = learnState.page !== next;
  if(changed) learnState.practicePreparationGeneration += 1;
  if(!options.skipHistory && changed) learnState.history.push(learnState.page);
  learnState.page = next;
  if(changed && options.skipBrowserHistory !== true && typeof window !== 'undefined' && window.location?.pathname === '/learn') window.history?.pushState?.({ learnPage: next }, '', '/learn');
  if(/^vocabulary:review:(greek|hebrew|mixed)$/.test(next)) learnState.activeReviewPage = next;
  if(changed) learnState.reviewReveal = false;
  if(changed) learnState.lastReviewResult = null;
  if(changed && !next.includes(':session:')) learnState.recognitionSession = null;
  if(changed && !next.startsWith('parsing')) learnState.parsingRecognitionSession = null;
  if(changed && !next.includes(':practice')) learnState.practiceSession = null;
  if(changed && !next.includes(':maintenance')) learnState.maintenanceSession = null;
  if(changed) learnState.studySetFormError = '';
  if(changed) learnState.studySetWordPickerQuery = '';
  if(changed && next !== 'study-sets:create') learnState.studySetDraft = null;
  if(!options.preserveFocusedReview) learnState.focusedReviewWordId = '';
  renderLearn();
  if(changed && typeof window !== 'undefined') window.requestAnimationFrame?.(() => window.scrollTo?.(0, 0));
  if(learnPageNeedsRecognitionData(next) && typeof PuritanReferenceLibrary === 'undefined'){
    ensureLearnRecognitionData().then(loaded => { if(loaded && learnState.page === next) renderLearn(); });
  }
}
function resetLearn(options = {}){
  learnState.page = 'home';
  learnState.history = [];
  learnState.customFrequencyErrors = {};
  learnState.activeVocabularyPath = '';
  learnState.currentVocabularyWordId = '';
  learnState.focusedReviewWordId = '';
  learnState.reviewReveal = false;
  learnState.lastReviewResult = null;
  learnState.progressCache = {};
  learnState.progressLoading = {};
  learnState.recognitionSession = null;
  learnState.parsingRecognitionSession = null;
  learnState.parsingDrafts = {};
  learnState.practiceSession = null;
  learnState.maintenanceSession = null;
  learnState.maintenanceError = '';
  learnState.studySetFormError = '';
  learnState.studySetWordPickerQuery = '';
  learnState.studySetDraft = null;
  if(options.render !== false) renderLearn();
}
function backLearnPage(){
  const previous = learnState.history.pop();
  if(previous){
    if(previous === '__reader__'){
      if(typeof showView === 'function') showView('readerView');
      else if(typeof navigateTo === 'function') navigateTo('/reader');
      return;
    }
    learnState.page = previous;
    renderLearn();
    return;
  }
  learnState.page = 'home';
  renderLearn();
}
function learnCard(item, page, extraClass = ''){
  return `
    <button class="learn-card ${extraClass}" type="button" data-learn-page="${escHtml(page)}">
      <span class="learn-card-title">${escHtml(item.title)}</span>
      <span class="learn-card-description">${escHtml(item.description || '')}</span>
    </button>`;
}
function parseLearnCustomFrequency(value){
  const clean = String(value || '').trim();
  if(!/^[1-9]\d*$/.test(clean)) return { valid: false, error: 'Enter a positive whole number.' };
  return { valid: true, threshold: Number(clean), pageToken: `custom-${Number(clean)}` };
}
function setLearnCustomFrequency(basePage, value){
  const parsed = parseLearnCustomFrequency(value);
  learnState.customFrequencyErrors = { ...(learnState.customFrequencyErrors || {}) };
  if(!parsed.valid){
    learnState.customFrequencyErrors[basePage] = parsed.error;
    renderLearn();
    return false;
  }
  delete learnState.customFrequencyErrors[basePage];
  setLearnPage(`${basePage}:${parsed.pageToken}`);
  return true;
}
function learnBreadcrumbs(page = learnState.page){
  if(page === 'home') return [{ label: 'Learn', page: 'home' }];
  const [areaId, childId, thirdId, fourthId, fifthId, sixthId, seventhId] = page.split(':');
  const area = learnArea(areaId);
  const crumbs = [{ label: 'Learn', page: 'home' }];
  if(areaId === 'parsing'){
    crumbs.push({ label: 'Parsing Practice', page: 'parsing' });
    if(childId === 'setup' && thirdId) crumbs.push({ label: `${learnLanguageTitle(thirdId)} setup`, page });
    if(childId === 'session') crumbs.push({ label: 'Active session', page });
    return crumbs;
  }
  if(areaId === 'study-sets'){
    crumbs.push({ label: 'Custom Decks', page: 'study-sets' });
    if(childId === 'create') crumbs.push({ label: 'Create Custom Deck', page });
    if((childId === 'detail' || childId === 'browse') && thirdId) crumbs.push({ label: learnStudySet(thirdId)?.title || 'Custom Deck', page });
    return crumbs;
  }
  if(areaId === 'vocabulary' && childId === 'customize-source'){
    const label = thirdId === 'book' ? 'Practice by book' : thirdId === 'frequency' ? 'Practice by frequency' : thirdId === 'weak' ? 'Practice weak words' : thirdId === 'custom-deck' ? 'Custom Deck practice' : 'Maintenance practice';
    crumbs.push({ label, page });
    return crumbs;
  }
  if(areaId === 'vocabulary' && childId === 'customize'){
    const source = fourthId;
    const label = source === 'book' ? 'Practice by book' : source === 'frequency' ? 'Practice by frequency' : source === 'weak' ? 'Practice weak words' : source === 'custom-deck' ? 'Custom Deck practice' : `Customize ${learnLanguageTitle(thirdId)} daily practice`;
    crumbs.push({ label, page });
    return crumbs;
  }
  if(areaId === 'vocabulary' && childId === 'daily'){
    crumbs.push({ label: `${learnLanguageTitle(thirdId)} practice`, page });
    return crumbs;
  }
  if(!area) return crumbs;
  crumbs.push({ label: area.title, page: area.id });

  if(area.id === 'vocabulary'){
    if(childId === 'review'){
      crumbs.push({ label: 'Review', page: 'vocabulary:review' });
      if(thirdId) crumbs.push({ label: `${learnLanguageTitle(thirdId)} Review`, page });
      return crumbs;
    }
    if(childId === 'new-words') crumbs.push({ label: 'New Words', page: 'vocabulary:new-words' });
    if(childId === 'frequency'){
      crumbs.push({ label: 'New Words', page: 'vocabulary:new-words' });
      if(thirdId) crumbs.push({ label: learnLanguageTitle(thirdId), page: `vocabulary:frequency:${thirdId}` });
      if(fourthId) crumbs.push({ label: learnFrequencyLabel(fourthId), page });
      return crumbs;
    }
    if(childId === 'book'){
      crumbs.push({ label: 'By Book', page: 'vocabulary:book' });
      if(LearnTestaments[thirdId]){
        crumbs.push({ label: LearnTestaments[thirdId].title, page });
        return crumbs;
      }
      if(thirdId){
        const testamentId = thirdId === 'hebrew' ? 'old-testament' : 'new-testament';
        crumbs.push({ label: LearnTestaments[testamentId].title, page: `vocabulary:book:${testamentId}` });
      }
      if(thirdId && fourthId){
        const book = learnBook(thirdId, fourthId);
        crumbs.push({ label: book.name, page: `vocabulary:book:${thirdId}:${book.id}` });
      }
      if(fifthId === 'overall'){
        crumbs.push({ label: 'Overall Frequency', page: `vocabulary:book:${thirdId}:${fourthId}:overall` });
        if(sixthId) crumbs.push({ label: learnFrequencyLabel(sixthId), page });
      }
      if(fifthId === 'chapter'){
        crumbs.push({ label: 'By Chapter', page: `vocabulary:book:${thirdId}:${fourthId}:chapter` });
        if(sixthId) crumbs.push({ label: `${learnBook(thirdId, fourthId).name} ${Number(sixthId) || 1}`, page: `vocabulary:book:${thirdId}:${fourthId}:chapter:${Number(sixthId) || 1}` });
        if(seventhId) crumbs.push({ label: learnFrequencyLabel(seventhId), page });
      }
      return crumbs;
    }
    return crumbs;
  }

  if(area.id === 'reading-readiness'){
    const testament = LearnTestaments[childId];
    if(!testament) return crumbs;
    crumbs.push({ label: testament.title, page: `reading-readiness:${childId}` });
    if(thirdId){
      const book = learnBook(testament.language, thirdId);
      crumbs.push({ label: book.name, page: `reading-readiness:${childId}:${book.id}` });
    }
    if(fourthId === 'overall'){
      if(fifthId) crumbs.push({ label: learnFrequencyLabel(fifthId), page });
    }
    if(fourthId === 'chapter'){
      crumbs.push({ label: 'By Chapter', page: `reading-readiness:${childId}:${thirdId}:chapter` });
      if(fifthId) crumbs.push({ label: `${learnBook(testament.language, thirdId).name} ${Number(fifthId) || 1}`, page: `reading-readiness:${childId}:${thirdId}:chapter:${Number(fifthId) || 1}` });
      if(sixthId) crumbs.push({ label: learnFrequencyLabel(sixthId), page });
    }
    return crumbs;
  }

  if(area.id === 'paradigms'){
    if(childId){
      const child = learnChild(area, childId);
      crumbs.push({ label: child?.title || learnPageTitle(page), page: `paradigms:${childId}` });
    }
    if(thirdId === 'session' && fourthId){
      const target = recognitionTargetForLearn(fourthId);
      if(target) crumbs.push({ label: target.title, page });
    }
    if(thirdId && thirdId !== 'session'){
      const target = recognitionTargetForLearn(thirdId);
      if(target) crumbs.push({ label: target.title, page });
    }
    return crumbs;
  }

  if(childId){
    const child = learnChild(area, childId);
    crumbs.push({ label: child?.title || learnPageTitle(page), page });
  }
  return crumbs;
}
function renderLearnBreadcrumbs(page = learnState.page){
  const crumbs = learnBreadcrumbs(page);
  if(page === 'home' || crumbs.length <= 1) return '';
  return `
    <nav class="learn-breadcrumbs" aria-label="Learn path">
      ${crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1;
        const label = escHtml(crumb.label);
        const control = isLast
          ? `<span aria-current="page">${label}</span>`
          : `<button type="button" data-learn-page="${escHtml(crumb.page)}">${label}</button>`;
        return `${control}${isLast ? '' : '<span class="learn-breadcrumb-separator">›</span>'}`;
      }).join('')}
    </nav>`;
}
function renderLearnHeader(title, subtitle = '', headingId = 'learnPageTitle'){
  const showBack = learnState.page !== 'home';
  return `
    <header class="learn-header">
      ${showBack ? '<button class="btn btn-ghost btn-sm" id="learnBackBtn" type="button">Back</button>' : ''}
      <div>
        <h1 id="${escHtml(headingId)}">${escHtml(title)}</h1>
        ${subtitle ? `<p>${escHtml(subtitle)}</p>` : ''}
      </div>
    </header>
    ${renderLearnBreadcrumbs()}`;
}
function renderLearnCustomFrequency(basePage){
  const error = learnState.customFrequencyErrors?.[basePage] || '';
  return `
    <form class="learn-custom-frequency-form" data-learn-custom-base="${escHtml(basePage)}" novalidate>
      <label for="learnCustomFrequency-${escHtml(basePage).replace(/[^a-z0-9-]/gi, '-')}">Custom Frequency</label>
      <div class="learn-custom-frequency-row">
        <input class="input learn-custom-frequency-input" id="learnCustomFrequency-${escHtml(basePage).replace(/[^a-z0-9-]/gi, '-')}" type="number" min="1" step="1" inputmode="numeric" placeholder="3" aria-label="Minimum occurrence threshold" />
        <button class="btn btn-ghost btn-sm" type="submit">Open</button>
      </div>
      ${error ? `<p class="learn-custom-frequency-error">${escHtml(error)}</p>` : ''}
    </form>`;
}
function renderLearnMetricPlaceholders(){
  return `
    <div class="learn-study-stats">
      <section class="word-page-section">
        <h2>Known Vocabulary</h2>
        <p>Placeholder</p>
      </section>
      <section class="word-page-section">
        <h2>Remaining Words</h2>
        <p>Placeholder</p>
      </section>
    </div>`;
}
function bookProgressKey(language, bookId){ return `book:${language}:${bookId}`; }
function chapterProgressKey(language, bookId, chapter){ return `chapter:${language}:${bookId}:${Number(chapter) || 1}`; }
async function loadLearnBookProgress(language, bookId){
  await ensureLearnManifest(language);
  const progress = await BookProgressModel.bookProgress(language, bookId, { force: true });
  learnState.progressCache[bookProgressKey(language, bookId)] = progress;
  return progress;
}
function ensureBookProgress(language, bookId){
  const key = bookProgressKey(language, bookId);
  if(!BookProgressModel || learnState.progressCache[key] || learnState.progressLoading[key]) return;
  learnState.progressLoading[key] = true;
  loadLearnBookProgress(language, bookId)
    .then(progress => { learnState.progressCache[key] = progress; })
    .catch(error => { learnState.progressCache[key] = { error: error.message || 'Book progress failed to load.' }; })
    .finally(() => { learnState.progressLoading[key] = false; renderLearn(); });
}
function ensureChapterProgress(language, bookId, chapter){
  const key = chapterProgressKey(language, bookId, chapter);
  if(!BookProgressModel || learnState.progressCache[key] || learnState.progressLoading[key]) return;
  learnState.progressLoading[key] = true;
  BookProgressModel.chapterProgress(language, bookId, chapter)
    .then(progress => { learnState.progressCache[key] = progress; })
    .catch(error => { learnState.progressCache[key] = { error: error.message || 'Chapter progress failed to load.' }; })
    .finally(() => { learnState.progressLoading[key] = false; renderLearn(); });
}
function renderProgressStats(stats = {}){
  const known = Number(stats.known) || 0;
  const total = Number(stats.total) || 0;
  const remaining = Math.max(0, Number(stats.remaining) || 0);
  return `
    <div class="learn-study-stats">
      <section class="word-page-section">
        <h2>Known Vocabulary</h2>
        <p class="learn-progress-count">${known} of ${total}</p>
      </section>
      <section class="word-page-section">
        <h2>Remaining Words</h2>
        <p class="learn-progress-count">${remaining}</p>
      </section>
    </div>`;
}
function renderProgressLoading(label = 'Book Progress'){
  return `<section class="word-page-section learn-explainer"><h2>${escHtml(label)}</h2><p>Loading vocabulary progress...</p></section>`;
}
function renderProgressError(message){
  return `<section class="word-page-section learn-explainer"><h2>Book Progress</h2><p>${escHtml(message || 'Progress is unavailable.')}</p></section>`;
}
function renderFrequencyProgressList(items = [], basePage, actionLabel = 'Study'){
  return `
    <div class="learn-progress-list">
      ${items.map(item => `
        <article class="learn-progress-row">
          <div>
            <h3>${escHtml(item.label || learnFrequencyLabel(item.threshold))}</h3>
            ${renderProgressStats(item)}
          </div>
          <button class="btn btn-primary btn-sm" type="button" data-learn-page="${escHtml(`${basePage}:${item.threshold}`)}">${escHtml(actionLabel)} ${escHtml(item.label || learnFrequencyLabel(item.threshold))}</button>
        </article>`).join('')}
    </div>`;
}
function renderQuietFrequencyChoices(language, basePage){
  const choices = learnThresholds(language).map(threshold => `
    <button class="btn btn-ghost btn-sm" type="button" data-learn-page="${escHtml(`${basePage}:${threshold}`)}">${escHtml(learnFrequencyLabel(threshold))}</button>
  `).join('');
  return `
    <div class="learn-quiet-study-options">
      <div class="learn-quiet-frequency-row">${choices}</div>
      ${renderLearnCustomFrequency(basePage)}
    </div>`;
}
function learnVocabularyEntries(language){
  const list = (typeof state !== 'undefined' && state.data?.[language]) ? state.data[language] : [];
  const cached = learnState.vocabularyEntryCache[language];
  if(cached?.source === list) return cached.entries;
  if(typeof getStudyEntries === 'function') return getStudyEntries(list, 'lemma');
  return list;
}
async function prepareLearnVocabularyEntries(language){
  const normalized = language === 'hebrew' ? 'hebrew' : 'greek';
  const list = (typeof state !== 'undefined' && state.data?.[normalized]) ? state.data[normalized] : [];
  const cached = learnState.vocabularyEntryCache[normalized];
  if(cached?.source === list) return cached.entries;
  const pending = learnState.vocabularyEntryPromises[normalized];
  if(pending?.source === list) return pending.promise;
  const promise = (typeof getStudyEntriesAsync === 'function' ? getStudyEntriesAsync(list, 'lemma', { budgetMs: 8 }) : Promise.resolve(learnVocabularyEntries(normalized)))
    .then(entries => {
      if(((typeof state !== 'undefined' && state.data?.[normalized]) || []) === list) learnState.vocabularyEntryCache[normalized] = { source: list, entries };
      return entries;
    })
    .finally(() => {
      if(learnState.vocabularyEntryPromises[normalized]?.promise === promise) delete learnState.vocabularyEntryPromises[normalized];
    });
  learnState.vocabularyEntryPromises[normalized] = { source: list, promise };
  return promise;
}
async function ensureLearnVocabularyGlossMap(language){
  const normalized = language === 'hebrew' ? 'hebrew' : 'greek';
  if(normalized === 'greek') return null;
  if(learnState.glossMaps[normalized]) return learnState.glossMaps[normalized];
  if(!learnState.glossMapPromises[normalized]){
    learnState.glossMapPromises[normalized] = fetch('/data/glosses/hebrew-glosses.json')
      .then(response => { if(!response.ok) throw new Error(`Hebrew vocabulary glosses could not be loaded (${response.status}).`); return response.json(); })
      .then(data => (learnState.glossMaps[normalized] = data));
  }
  return learnState.glossMapPromises[normalized];
}
function learnVocabularyStore(){
  return VocabularyLearningModel ? VocabularyLearningModel.loadStore() : { records: {} };
}
function learnReviewEntries(language){
  if(!VocabularyLearningModel) return [];
  return VocabularyLearningModel.dueEntries(learnVocabularyEntries(language), learnVocabularyStore());
}
function learnReviewQueueSummary(language){
  const due = learnReviewEntries(language);
  const target = learnReviewTarget(language);
  return {
    language,
    label: learnLanguageTitle(language),
    target,
    available: due.length,
    todayCount: Math.min(due.length, target),
    moreAvailable: Math.max(0, due.length - target),
    estimatedMinutes: Math.max(1, Math.ceil(Math.min(due.length, target) * 0.5))
  };
}
function learnDailyPracticeSummary(language, dateISO = todayISO()){
  if(!VocabularyMasteryModel) return { language, target: learnReviewTarget(language), scheduled: 0, maintenance: 0, combined: 0, remaining: learnReviewTarget(language), complete: false };
  return VocabularyMasteryModel.dailyPracticeSummary(learnVocabularyStore(), language, dateISO, learnReviewTarget(language));
}
function learnMixedReviewEntries(){
  const greek = learnReviewEntries('greek').slice(0, learnReviewTarget('greek'));
  const hebrew = learnReviewEntries('hebrew').slice(0, learnReviewTarget('hebrew'));
  const mixed = [];
  const max = Math.max(greek.length, hebrew.length);
  for(let index = 0; index < max; index += 1){
    if(greek[index]) mixed.push(greek[index]);
    if(hebrew[index]) mixed.push(hebrew[index]);
  }
  return mixed;
}
function findLearnReviewEntry(language, id){
  if(language === 'mixed'){
    return ['greek','hebrew'].map(lang => findLearnVocabularyEntry(lang, id)).find(Boolean) || null;
  }
  return findLearnVocabularyEntry(language, id);
}
function learnFrequencyPath(language, threshold){
  return {
    type: 'frequency',
    language,
    threshold: learnFrequencyNumber(threshold),
    page: `vocabulary:frequency:${language}:${threshold}`
  };
}
function learnScopedProgressForPage(page){
  const route = learnScopedRoute(page);
  if(!route) return null;
  const { language, bookId, mode, chapter, threshold } = route;
  if(mode === 'overall'){
    const progress = learnState.progressCache[bookProgressKey(language, bookId)];
    const standard = progress?.frequency?.find(item => String(item.threshold) === String(threshold));
    if(standard) return standard;
    if(progress?.chapters?.length && threshold && BookProgressModel?.calculateProgress){
      return BookProgressModel.calculateProgress({ language, book: progress.book, chapters: progress.chapters, threshold });
    }
    return null;
  }
  if(mode === 'chapter'){
    const progress = learnState.progressCache[chapterProgressKey(language, bookId, chapter)] || learnState.progressCache[bookProgressKey(language, bookId)]?.byChapter?.find(item => Number(item.chapter) === chapter);
    if(!threshold) return progress || null;
    const chapterProgress = learnState.progressCache[chapterProgressKey(language, bookId, chapter)];
    const standard = chapterProgress?.frequency?.find(item => String(item.threshold) === String(threshold));
    if(standard) return standard;
    if(chapterProgress?.chapterData && threshold && BookProgressModel?.calculateProgress){
      return BookProgressModel.calculateProgress({ language, book: chapterProgress.book, chapters: [chapterProgress.chapterData], chapter: chapterProgress.chapter, threshold });
    }
    return null;
  }
  return null;
}
function learnScopedRoute(page){
  const parts = String(page || '').split(':');
  const [areaId, childId] = parts;
  if(areaId === 'vocabulary' && childId === 'book'){
    const [, , language, bookId, mode, chapterOrThreshold, maybeThreshold] = parts;
    if(!language || !bookId) return null;
    if(mode === 'overall') return { areaId, language, bookId, mode, threshold: chapterOrThreshold || '' };
    if(mode === 'chapter') return { areaId, language, bookId, mode, chapter: Number(chapterOrThreshold) || 1, threshold: maybeThreshold || '' };
  }
  if(areaId === 'reading-readiness'){
    const testament = LearnTestaments[childId];
    const [, , bookId, mode, chapterOrThreshold, maybeThreshold] = parts;
    if(!testament || !bookId) return null;
    if(mode === 'overall') return { areaId, language: testament.language, bookId, mode, threshold: chapterOrThreshold || '' };
    if(mode === 'chapter') return { areaId, language: testament.language, bookId, mode, chapter: Number(chapterOrThreshold) || 1, threshold: maybeThreshold || '' };
  }
  return null;
}
function learnPathForPage(page, language, threshold){
  const scoped = learnScopedProgressForPage(page);
  if(scoped) return {
    type: 'scoped-vocabulary',
    language,
    threshold: learnFrequencyNumber(threshold),
    page,
    vocabularyIds: scoped.vocabularyIds || []
  };
  return learnFrequencyPath(language, threshold);
}
function learnEntriesForPath(path){
  const scoped = learnScopedProgressForPage(path.page);
  if(scoped?.vocabulary?.length) return scoped.vocabulary.map(item => item.entry);
  return learnVocabularyEntries(path.language);
}
function learnWordId(entry){
  return VocabularyLearningModel ? VocabularyLearningModel.lemmaId(entry) : entry?.id;
}
function findLearnVocabularyEntry(language, id){
  return learnVocabularyEntries(language).find(entry => learnWordId(entry) === id) || null;
}
function getLearnCurrentPathWord(path){
  const entries = learnEntriesForPath(path);
  const store = learnVocabularyStore();
  const current = learnState.currentVocabularyWordId ? findLearnVocabularyEntry(path.language, learnState.currentVocabularyWordId) : null;
  if(current && VocabularyLearningModel.learningStatus(store, current) === VocabularyLearningModel.STATUS.NOT_LEARNED && VocabularyLearningModel.matchesStudyPath(current, path)) return current;
  const next = VocabularyLearningModel.nextNotLearnedEntry(entries, store, path);
  learnState.currentVocabularyWordId = next ? learnWordId(next) : '';
  return next;
}
function learnNormalizedGlosses(entry = {}){
  const rawPrimary = typeof getDisplayGloss === 'function' ? getDisplayGloss(entry) : (entry.customGloss || entry.primaryGloss || entry.gloss || '');
  const values = typeof normalizeAlternateGlosses === 'function'
    ? normalizeAlternateGlosses(entry.alternateGlosses)
    : (Array.isArray(entry.alternateGlosses) ? entry.alternateGlosses : []);
  const unique = [];
  const seen = new Set();
  [rawPrimary, ...values].forEach(value => {
    String(value || '').split(/[,;•]/).forEach(part => {
      const gloss = part.trim();
      const key = gloss.toLowerCase();
      if(gloss && gloss !== '(missing gloss)' && !seen.has(key)){
        seen.add(key);
        unique.push(gloss);
      }
    });
  });
  return {
    primary: unique[0] || '(missing gloss)',
    alternates: unique.slice(1)
  };
}
function renderVocabularyLearningDetails(entry, revealed = true){
  const glosses = learnNormalizedGlosses(entry);
  return `
    ${revealed ? `
      <div class="learn-vocab-details">
        <p class="learn-vocab-meaning">${escHtml(glosses.primary)}</p>
        ${glosses.alternates.length ? `
          <div class="learn-vocab-alternates">
            <p>Other translations</p>
            <p>${glosses.alternates.map(gloss => `<span>${escHtml(gloss)}</span>`).join('<span class="learn-vocab-gloss-separator">•</span>')}</p>
          </div>` : ''}
        <p class="learn-vocab-meta">${escHtml(learnLanguageTitle(entry.lang))} · freq ${escHtml(String(entry.freq || 0))}×</p>
      </div>` : ''}`;
}
function renderLearningStatusSummary(entry, options = {}){
  if(!VocabularyLearningModel || !entry) return '';
  const details = VocabularyLearningModel.learningStatusDetails(learnVocabularyStore(), entry);
  return `
    <div class="learn-srs-status${options.compact ? ' learn-srs-status-compact' : ''}">
      <p><strong>${escHtml(details.label)}</strong> · ${escHtml(details.explanation)}</p>
      <dl>
        <div><dt>Next review</dt><dd>${escHtml(details.nextReviewLabel)}</dd></div>
        <div><dt>Interval</dt><dd>${escHtml(details.intervalLabel)}</dd></div>
        <div><dt>Reviews</dt><dd>${escHtml(String(details.successfulReviews))} successful · ${escHtml(String(details.totalReviews))} total</dd></div>
      </dl>
    </div>`;
}
function learnMasteryGrade(entry){
  if(!VocabularyMasteryModel || !VocabularyLearningModel || !entry) return null;
  const record = VocabularyLearningModel.getRecord(learnVocabularyStore(), entry) || {};
  return VocabularyMasteryModel.masteryGrade(record, todayISO());
}
function renderMasteryGrade(entry, options = {}){
  const grade = learnMasteryGrade(entry);
  if(!grade) return '';
  return `
    <details class="learn-mastery-grade${options.compact ? ' learn-mastery-grade-compact' : ''}">
      <summary aria-label="Mastery grade ${escHtml(grade.letter)}, ${escHtml(grade.label)}">
        <span class="learn-grade-letter">${escHtml(grade.letter)}</span>
        <span>${escHtml(grade.label)}</span>
      </summary>
      <p>${escHtml(grade.explanation)}</p>
    </details>`;
}
function renderVocabularyLearningCard(entry, options = {}){
  const headword = typeof displayHeadwordForEntry === 'function'
    ? displayHeadwordForEntry(entry)
    : (entry.lexicalForm || entry.lemma || entry.word || '');
  return `
    <article class="learn-vocab-card">
      <h2>${escHtml(headword)}</h2>
      ${entry.lemma && entry.lemma !== headword ? `<p class="muted">${escHtml(entry.lemma)}</p>` : ''}
      ${renderVocabularyLearningDetails(entry, options.revealed !== false)}
      ${options.showMastery ? renderMasteryGrade(entry, { compact: true }) : ''}
    </article>`;
}
function startLearnVocabularyPath(pathPage){
  learnState.activeVocabularyPath = pathPage;
  saveLearnActivePath(pathPage);
  learnState.currentVocabularyWordId = '';
  renderLearn();
}
function learnCurrentVocabularyWord(language, threshold, pathPage = ''){
  if(!VocabularyLearningModel) return;
  const path = learnPathForPage(pathPage || learnState.page, language, threshold);
  const entry = getLearnCurrentPathWord(path);
  if(!entry) return;
  VocabularyLearningModel.persistIntroduceEntry(entry, path);
  learnState.currentVocabularyWordId = '';
  renderLearn();
}
function markLearnPathKnown(language, threshold, pathPage = ''){
  if(!VocabularyLearningModel) return null;
  const page = pathPage || learnState.page;
  const path = learnPathForPage(page, language, threshold);
  const entries = learnEntriesForPath(path);
  const message = 'Mark all words in this path as Known? This will update Reading Readiness and Progress.';
  if(typeof confirm === 'function' && !confirm(message)) return null;
  const result = VocabularyLearningModel.markPathKnown(entries, learnVocabularyStore(), path);
  VocabularyLearningModel.saveStore(result.store);
  learnState.currentVocabularyWordId = '';
  learnState.focusedReviewWordId = '';
  learnState.reviewReveal = false;
  learnState.progressCache = {};
  learnState.progressLoading = {};
  renderLearn();
  return result;
}
function learnStudySetsStore(){
  return StudySetsModel ? StudySetsModel.loadStore() : { sets: [] };
}
function learnStudySets(){
  return StudySetsModel ? StudySetsModel.listStudySets(learnStudySetsStore()) : [];
}
function learnStudySet(id){
  return StudySetsModel ? StudySetsModel.findStudySet(id, learnStudySetsStore()) : null;
}
function learnStudySetEntries(set){
  if(!set || set.type !== 'vocabulary' || !StudySetsModel || !VocabularyLearningModel) return [];
  return StudySetsModel.resolveVocabularyEntries(set, learnVocabularyEntries(set.language), VocabularyLearningModel, learnVocabularyStore(), SavedVocabularyModel);
}
function learnSavedVocabularyStore(){
  return SavedVocabularyModel ? SavedVocabularyModel.loadStore() : { items: {} };
}
function learnSavedEntries(language){
  if(!SavedVocabularyModel) return [];
  return learnVocabularyEntries(language).filter(entry => SavedVocabularyModel.isSaved(entry, learnSavedVocabularyStore()));
}
function learnScopedCriteriaFromPage(page = learnState.page, status = 'all'){
  const route = learnScopedRoute(page);
  if(!route) return null;
  const scoped = learnScopedProgressForPage(page);
  if(!scoped?.vocabularyIds?.length) return null;
  const book = learnBook(route.language, route.bookId);
  return {
    kind: route.mode === 'chapter' ? 'chapter' : 'book',
    bookId: route.bookId,
    bookName: book.name,
    chapter: route.mode === 'chapter' ? route.chapter : '',
    threshold: route.threshold ? learnFrequencyNumber(route.threshold) : 'all',
    status,
    vocabularyIds: scoped.vocabularyIds
  };
}
function createStudySetFromCurrentScope(page = learnState.page, status = 'all'){
  if(!StudySetsModel) return null;
  const criteria = learnScopedCriteriaFromPage(page, status);
  const route = learnScopedRoute(page);
  if(!criteria || !route){
    if(typeof toast === 'function') toast('Book vocabulary is still loading.');
    return null;
  }
  const book = learnBook(route.language, route.bookId);
  const statusPrefix = status && status !== 'all' ? `${status.replace('-', ' ')} ` : '';
  const title = route.mode === 'chapter'
    ? `${statusPrefix}${learnLanguageTitle(route.language)} words from ${book.name} ${route.chapter}`.trim()
    : `${statusPrefix}${learnLanguageTitle(route.language)} words from ${book.name}`.trim();
  const result = StudySetsModel.createStudySet({ title, type: 'vocabulary', language: route.language, description: title, criteria });
  setLearnPage(`study-sets:detail:${result.set.id}`);
  return result.set;
}
function addVocabularyItemsToLearnStudySet(setId, entries = []){
  if(!StudySetsModel || !Array.isArray(entries)) return null;
  return entries.reduce((last, entry) => StudySetsModel.addVocabularyItemToStudySet(setId, entry), null);
}
function addSelectedVocabularyToLearnStudySet(setId, ids = []){
  const set = learnStudySet(setId);
  if(!set) return null;
  const selected = new Set(ids.map(String));
  const entries = learnVocabularyEntries(set.language).filter(entry => selected.has(learnWordId(entry)));
  const result = addVocabularyItemsToLearnStudySet(setId, entries);
  learnState.studySetWordPickerQuery = '';
  renderLearn();
  return result;
}
function createLearnStudySet(form = {}){
  if(!StudySetsModel) return null;
  const title = String(form.title || '').trim();
  if(!title){
    learnState.studySetFormError = 'Enter a deck name.';
    renderLearn();
    return null;
  }
  const type = ['vocabulary','grammar','mixed'].includes(form.type) ? form.type : 'vocabulary';
  const language = ['greek','hebrew','mixed'].includes(form.language) ? form.language : 'greek';
  if(type !== 'vocabulary'){
    learnState.studySetFormError = '';
    const result = StudySetsModel.createStudySet({ title, type, language, description: form.description || '', criteria: { kind: 'placeholder' } });
    setLearnPage(`study-sets:detail:${result.set.id}`);
    return result.set;
  }
  const source = ['frequency','book','known','learning','not-learned','hand-picked','saved','overdue'].includes(form.source) ? form.source : 'hand-picked';
  let criteria = { kind: source };
  if(source === 'frequency'){
    const legacyMinimum = Number(form.threshold);
    const legacyThreshold = !form.sourceId && Number.isInteger(legacyMinimum) && legacyMinimum > 0
      ? { valid: true, minimum: legacyMinimum, maximum: null }
      : null;
    const range = legacyThreshold || learnFrequencyRange(form.sourceId);
    if(!range.valid){ learnState.studySetFormError = 'Choose a valid frequency range.'; renderLearn(); return null; }
    criteria = { kind: 'frequency', threshold: String(range.minimum), minimum: String(range.minimum), maximum: range.maximum ? String(range.maximum) : '' };
  }
  if(source === 'book'){
    const book = learnBookList(language).find(item => item.id === form.sourceId);
    const progress = learnState.progressCache[bookProgressKey(language, form.sourceId)];
    if(!book){ learnState.studySetFormError = 'Choose a book.'; renderLearn(); return null; }
    if(!Array.isArray(progress?.overall?.vocabulary)){
      ensureBookProgress(language, form.sourceId);
      learnState.studySetFormError = progress?.error || 'Book vocabulary is loading.';
      renderLearn();
      return null;
    }
    const chapter = form.passageScope === 'chapter' && book.chapters.some(item => Number(item) === Number(form.chapter)) ? Number(form.chapter) : 0;
    const scoped = chapter ? progress.byChapter?.find(item => Number(item.chapter) === chapter) : progress.overall;
    if(chapter && !scoped){ learnState.studySetFormError = 'Choose a valid chapter.'; renderLearn(); return null; }
    criteria = { kind: chapter ? 'chapter' : 'book', bookId: book.id, bookName: book.name, chapter: chapter || undefined, threshold: 'all', status: 'all', vocabularyIds: scoped?.vocabulary?.map(item => learnWordId(item.entry)) || [] };
  }
  const result = StudySetsModel.createStudySet({ title, type, language: language === 'mixed' ? 'greek' : language, description: form.description || '', criteria });
  learnState.studySetFormError = '';
  setLearnPage(`study-sets:detail:${result.set.id}`);
  return result.set;
}
function renameLearnStudySet(id, title){
  const cleanTitle = String(title || '').trim();
  if(!cleanTitle){ learnState.studySetFormError = 'Enter a deck name.'; renderLearn(); return null; }
  const result = StudySetsModel?.renameStudySet?.(id, cleanTitle);
  learnState.studySetFormError = '';
  renderLearn();
  return result?.set || null;
}
function removeVocabularyFromLearnStudySet(setId, entryId){
  const set = learnStudySet(setId);
  const entry = set ? learnVocabularyEntries(set.language).find(item => learnWordId(item) === entryId) : null;
  if(!set || !entry || !StudySetsModel?.removeVocabularyItemFromStudySet) return null;
  const result = StudySetsModel.removeVocabularyItemFromStudySet(setId, entry);
  renderLearn();
  return result;
}
function addVocabularyToLearnStudySet(setId, entry = {}){
  if(!StudySetsModel || !entry) return null;
  const result = StudySetsModel.addVocabularyItemToStudySet(setId, entry);
  if(result.set) renderLearn();
  return result;
}
function createStudySetWithVocabulary(form = {}, entry = {}){
  const created = createLearnStudySet({ ...form, type: 'vocabulary', source: form.source || 'hand-picked', language: form.language || entry.lang || 'greek' });
  if(created) addVocabularyToLearnStudySet(created.id, entry);
  return created;
}
function deleteLearnStudySet(id){
  if(!StudySetsModel) return null;
  const set = learnStudySet(id);
  if(!set) return null;
  const message = `Delete "${set.title}"? This removes the Custom Deck, not your vocabulary learning data.`;
  if(typeof confirm === 'function' && !confirm(message)) return null;
  const result = StudySetsModel.deleteStudySet(id);
  setLearnPage('study-sets');
  return result;
}
function markLearnStudySetKnown(id){
  const set = learnStudySet(id);
  if(!set || set.type !== 'vocabulary' || !VocabularyLearningModel) return null;
  const entries = learnStudySetEntries(set);
  const message = `Mark all vocabulary in "${set.title}" as Known? This updates Reading Readiness and Progress.`;
  if(typeof confirm === 'function' && !confirm(message)) return null;
  const path = { type: 'study-set', language: set.language, vocabularyIds: entries.map(learnWordId), page: `study-sets:detail:${set.id}` };
  const result = VocabularyLearningModel.markPathKnown(entries, learnVocabularyStore(), path);
  VocabularyLearningModel.saveStore(result.store);
  renderLearn();
  return result;
}
function learnPracticeTitleForPage(page = learnState.page){
  const parts = String(page || '').split(':');
  if(parts[0] === 'vocabulary' && parts[1] === 'practice'){
    if(parts[2] === 'frequency') return `${learnLanguageTitle(parts[3])} ${learnFrequencyLabel(parts[4] || '25')} Practice`;
    if(parts[2] === 'status') return `${learnLanguageTitle(parts[3])} ${parts[4] === 'known' ? 'Known' : parts[4] === 'learning' ? 'Learning' : parts[4] === 'saved' ? 'Saved Words' : parts[4] === 'overdue' ? 'Review Backlog' : 'Not Learned'} Practice`;
    if(parts[2] === 'book'){
      const book = learnBook(parts[3], parts[4]);
      return `${book.name} Vocabulary Practice`;
    }
    if(parts[2] === 'chapter'){
      const book = learnBook(parts[3], parts[4]);
      return `${book.name} ${Number(parts[5]) || 1} Vocabulary Practice`;
    }
    if(parts[2] === 'study-set'){
      const set = learnStudySet(parts.slice(3).join(':'));
      return set?.title || 'Custom Deck Practice';
    }
  }
  return 'Vocabulary Practice';
}
function learnVocabularyPracticeEntriesForPage(page = learnState.page){
  const parts = String(page || '').split(':');
  if(parts[0] !== 'vocabulary' || parts[1] !== 'practice') return [];
  if(parts[2] === 'frequency'){
    const language = parts[3] || 'greek';
    const threshold = parts[4] || '25';
    const path = learnFrequencyPath(language, threshold);
    return learnVocabularyEntries(language).filter(entry => VocabularyLearningModel.matchesStudyPath(entry, path));
  }
  if(parts[2] === 'status'){
    const language = parts[3] || 'greek';
    const status = parts[4] || 'learning';
    const languages = language === 'mixed' ? ['greek','hebrew'] : [language];
    const store = learnVocabularyStore();
    return languages.flatMap(learnVocabularyEntries).filter(entry => {
      const value = VocabularyLearningModel.learningStatus(store, entry);
      if(status === 'known') return value === VocabularyLearningModel.STATUS.KNOWN || value === VocabularyLearningModel.STATUS.KNOWN_SELF_REPORTED;
      if(status === 'learning') return value === VocabularyLearningModel.STATUS.LEARNING || value === VocabularyLearningModel.STATUS.REVIEWING;
      if(status === 'saved') return SavedVocabularyModel?.isSaved?.(entry, learnSavedVocabularyStore());
      if(status === 'overdue') return VocabularyLearningModel.learningStatusDetails(store, entry).dueState === 'overdue' || VocabularyLearningModel.learningStatusDetails(store, entry).dueState === 'due-today';
      return value === VocabularyLearningModel.STATUS.NOT_LEARNED;
    });
  }
  if(parts[2] === 'book' && parts[3] && parts[4]){
    const progress = learnState.progressCache[bookProgressKey(parts[3], parts[4])];
    return progress?.overall?.vocabulary?.map(item => item.entry) || [];
  }
  if(parts[2] === 'chapter' && parts[3] && parts[4] && parts[5]){
    const progress = learnState.progressCache[chapterProgressKey(parts[3], parts[4], parts[5])];
    return progress?.overall?.vocabulary?.map(item => item.entry) || [];
  }
  if(parts[2] === 'study-set') return learnStudySetEntries(learnStudySet(parts.slice(3).join(':')));
  return [];
}
function ensureLearnPracticeSession(page = learnState.page){
  const entries = learnVocabularyPracticeEntriesForPage(page).slice(0, 20);
  const existing = learnState.practiceSession;
  if(existing?.page === page && (existing.entries.length || !entries.length)) return existing;
  learnState.practiceSession = {
    page,
    entries,
    index: 0,
    revealed: false,
    recognized: 0,
    missed: 0,
    results: [],
    counted: false
  };
  return learnState.practiceSession;
}
function revealLearnPractice(){
  const session = ensureLearnPracticeSession();
  session.revealed = true;
  renderLearn();
}
function countPracticeResultsTowardSrs(session = learnState.practiceSession){
  if(!session || session.counted || !VocabularyLearningModel) return false;
  session.results.forEach(item => {
    const entry = findLearnVocabularyEntry(item.language, item.id);
    if(entry) VocabularyLearningModel.persistReviewEntry(entry, item.result);
  });
  session.counted = true;
  return true;
}
function gradeLearnPractice(result){
  const session = ensureLearnPracticeSession();
  const current = session.entries[session.index];
  if(!current) return;
  const confidence = LearningPracticeModel.confidenceOf(result);
  const normalizedResult = LearningPracticeModel.confidenceResult(confidence);
  session.results.push({ id: learnWordId(current), language: current.lang, result: normalizedResult, confidence });
  if(normalizedResult === 'recognized') session.recognized += 1;
  else session.missed += 1;
  if(LearningPracticeModel.loadMaintenancePreference(learnStorage()).enabled && VocabularyLearningModel){
    persistStandaloneConfidence(current, confidence, { practiceType: 'maintenance', phase: 'focused-practice', promptDirection: 'reading', scheduleUpdated: true });
    session.counted = true;
  } else if(VocabularyLearningModel){
    persistStandaloneConfidence(current, confidence, { practiceType: 'maintenance', phase: 'focused-practice', promptDirection: 'reading', scheduleUpdated: false });
  }
  session.index += 1;
  session.revealed = false;
  renderLearn();
}
function countLearnPracticeTowardSrs(){
  countPracticeResultsTowardSrs();
  renderLearn();
}
function revealLearnReview(){
  learnState.reviewReveal = true;
  renderLearn();
}
function gradeLearnReview(language, id, result){
  if(!VocabularyLearningModel) return;
  const entry = findLearnReviewEntry(language, id);
  if(entry) {
    persistStandaloneConfidence(entry, result, { practiceType: 'scheduled', phase: 'scheduled', promptDirection: 'reading', scheduleUpdated: true });
    const details = VocabularyLearningModel.learningStatusDetails(VocabularyLearningModel.loadStore(), entry);
    learnState.lastReviewResult = {
      lemma: entry.lemma || entry.word || id,
      status: details.label,
      nextReview: details.nextReviewLabel,
      interval: details.intervalLabel,
      successfulReviews: details.successfulReviews
    };
  }
  if(learnState.focusedReviewWordId === id) learnState.focusedReviewWordId = '';
  learnState.reviewReveal = false;
  renderLearn();
}
function reviewLearnVocabularyWord(language, id){
  const normalizedLanguage = language === 'hebrew' ? 'hebrew' : 'greek';
  const entry = findLearnVocabularyEntry(normalizedLanguage, id);
  if(!entry) return null;
  const focused = LearningPracticeModel.assembleSession({
    language: normalizedLanguage,
    profile: { ...learnProfile(normalizedLanguage), source: 'all-known', size: 1 },
    entries: [entry],
    dueEntries: [entry],
    maintenanceEntries: [],
    store: learnVocabularyStore(),
    model: VocabularyLearningModel,
    target: 1,
    todayIds: new Set()
  });
  const active = learnActivePracticeSession(normalizedLanguage);
  let session = focused;
  if(active && !LearningPracticeModel.sessionExpired(active)){
    const focusedCard = focused.cards[0];
    const alreadyQueued = active.cards.slice(active.position).some(card => !card.answered && card.vocabularyId === id);
    session = LearningPracticeModel.normalizeSession(active);
    if(focusedCard && !alreadyQueued){
      session.cards.splice(session.position, 0, focusedCard);
      session.cards.forEach((card, index) => { card.index = index; });
      session.completedAt = '';
      session.phase = session.cards[session.position]?.phase || session.phase;
    }
  }
  LearningPracticeModel.saveSession(session, learnStorage());
  learnState.unifiedRevealed = false;
  setLearnPage(`vocabulary:daily:${normalizedLanguage}`);
  return session;
}
function renderLearnFrequencyCards(language, basePage){
  const cards = learnThresholds(language).map(threshold => learnCard({
    title: learnFrequencyLabel(threshold),
    description: learnFrequencyDescription(language, threshold)
  }, `${basePage}:${threshold}`));
  return `<div class="learn-card-grid">${cards.join('')}</div>${renderLearnCustomFrequency(basePage)}`;
}
function renderLearnBookGrid(language, basePage){
  ensureLearnManifest(language);
  const books = learnBookList(language);
  return `
    <div class="learn-book-grid">
      ${books.map(book => learnCard({
        title: book.name,
        description: `${book.chapters.length} ${book.chapters.length === 1 ? 'chapter' : 'chapters'}`
      }, `${basePage}:${book.id}`, 'learn-card-compact')).join('')}
    </div>`;
}
function learnActiveItems(vocabularyStore){
  const adapter = learnStorage();
  let records = [];
  try { records = JSON.parse(adapter?.get(LearnActivePathsStorageKey) || '[]'); } catch(e) {}
  return (Array.isArray(records) ? records : []).map(record => learnPathDashboardItem(record, vocabularyStore)).filter(Boolean);
}
function learnPathTitle(page){
  const frequency = String(page).match(/^vocabulary:frequency:(greek|hebrew):(.+)$/);
  if(frequency) return `${learnLanguageTitle(frequency[1])} ${learnFrequencyLabel(frequency[2])} Vocabulary`;
  const scoped = learnScopedRoute(page);
  if(scoped){
    const book = learnBook(scoped.language, scoped.bookId);
    return scoped.mode === 'chapter' ? `${book.name} ${scoped.chapter} Vocabulary` : `${book.name} Vocabulary`;
  }
  if(String(page).startsWith('paradigms:')) return 'Paradigm Practice';
  return '';
}
function learnPathDashboardItem(record, vocabularyStore){
  if(!record?.page) return null;
  const path = learnPathForPage(record.page, record.language, record.threshold);
  const entries = learnEntriesForPath(path);
  const matching = entries.filter(entry => VocabularyLearningModel?.matchesStudyPath(entry, path));
  const total = matching.length;
  const remaining = VocabularyLearningModel ? VocabularyLearningModel.remainingNotLearnedCount(entries, vocabularyStore || learnVocabularyStore(), path) : total;
  return { ...record, title: record.title || learnPathTitle(record.page), total, remaining, complete: total ? Math.round(((total - remaining) / total) * 100) : 0 };
}

function learnProfile(language){
  return LearningPracticeModel?.loadProfiles?.(learnStorage()).profiles[language] || LearningPracticeModel?.defaultProfile?.(language);
}
function learnActivePracticeSession(language){
  return LearningPracticeModel?.activeSession?.(language, learnStorage()) || null;
}
function learnProfileEntries(profile, options = {}){
  const language = profile.language;
  const entries = options.entries || learnVocabularyEntries(language);
  const store = options.store || learnVocabularyStore();
  if(profile.source === 'custom-deck') return learnStudySetEntries(learnStudySet(profile.sourceId));
  if(profile.source === 'frequency'){
    const range = learnFrequencyRange(profile.sourceId);
    if(!range.valid) return [];
    return entries.filter(entry => (Number(entry.freq) || 0) >= range.minimum && (!range.maximum || (Number(entry.freq) || 0) <= range.maximum));
  }
  if(profile.source === 'book'){
    const progress = learnState.progressCache[bookProgressKey(language, profile.sourceId)];
    const scoped = profile.passageScope === 'chapter'
      ? progress?.byChapter?.find(item => Number(item.chapter) === Number(profile.chapter))
      : progress?.overall;
    let result = scoped?.vocabulary?.map(item => ({ ...item.entry, scopeFrequency: Number(item.count) || 0 })) || [];
    const range = learnFrequencyRange(profile.scopeFrequencyId);
    if(range.valid) result = result.filter(entry => entry.scopeFrequency >= range.minimum && (!range.maximum || entry.scopeFrequency <= range.maximum));
    return result;
  }
  if(profile.source === 'weak'){
    const attention = LearningPracticeModel.loadAttention(learnStorage());
    return entries.filter(entry => {
      const id = learnWordId(entry);
      const grade = VocabularyMasteryModel.masteryGrade(store.records?.[id] || {});
      return grade.letter === 'D' || grade.letter === 'F' || attention.items[id] || grade.recentMisses > 0;
    });
  }
  if(profile.source === 'needs-attention'){
    const attention = LearningPracticeModel.loadAttention(learnStorage());
    return entries.filter(entry => attention.items[learnWordId(entry)]);
  }
  return entries.filter(entry => {
    const status = VocabularyLearningModel.learningStatus(store, entry);
    return status === VocabularyLearningModel.STATUS.KNOWN || status === VocabularyLearningModel.STATUS.KNOWN_SELF_REPORTED;
  });
}
function learnProfileValid(profile, options = {}){
  if(!profile || !['greek','hebrew'].includes(profile.language)) return { valid: false, error: 'Choose a language.' };
  if(!Array.isArray(profile.selectedGrades) || !profile.selectedGrades.length) return { valid: false, error: 'Choose at least one mastery grade.' };
  if(profile.source === 'custom-deck' && !profile.sourceId) return { valid: false, error: 'Choose a Custom Deck.' };
  if(profile.source === 'custom-deck' && !learnStudySet(profile.sourceId)) return { valid: false, error: 'The saved Custom Deck is no longer available.' };
  if(profile.source === 'book' && !learnBookList(profile.language).some(book => book.id === profile.sourceId)) return { valid: false, error: 'Choose a book.' };
  if(profile.source === 'book' && profile.passageScope === 'chapter'){
    const book = learnBook(profile.language, profile.sourceId);
    if(!book?.chapters?.some(chapter => Number(chapter) === Number(profile.chapter))) return { valid: false, error: 'Choose a valid chapter.' };
  }
  if(profile.source === 'frequency' && !learnFrequencyRange(profile.sourceId).valid) return { valid: false, error: 'Choose a valid frequency range.' };
  if(profile.unlimited && profile.introduceNewCount > 0) return { valid: false, error: 'Choose a finite session size when introducing New words.' };
  if(!profile.unlimited && profile.introduceNewCount > Math.floor(profile.size * .25)) return { valid: false, error: `New words may be at most 25% of this session (${Math.floor(profile.size * .25)}).` };
  if(options.daily && profile.dailyAmountMode === 'unlimited' && profile.introduceNewCount > 0) return { valid: false, error: 'Choose a finite daily amount when introducing New words.' };
  if(options.daily && profile.dailyAmountMode === 'set' && profile.introduceNewCount > Math.floor(profile.dailyAmount * .25)) return { valid: false, error: `New words may be at most 25% of this daily amount (${Math.floor(profile.dailyAmount * .25)}).` };
  return { valid: true, error: '' };
}
function dailyPracticeDashboardSummary(language, snapshot = {}){
  const store = snapshot.store || learnVocabularyStore();
  const profile = snapshot.profiles?.profiles?.[language] || learnProfile(language);
  const vocabularyEntries = measureLearnSynchronous(`learnVocabularyEntries:${language}`, () => learnVocabularyEntries(language));
  const due = measureLearnSynchronous(`dueEntries:${language}`, () => VocabularyLearningModel?.dueEntries?.(vocabularyEntries, store) || []);
  const readyLearning = due.filter(entry => {
    const status = VocabularyLearningModel.learningStatus(store, entry);
    return status === VocabularyLearningModel.STATUS.LEARNING || status === VocabularyLearningModel.STATUS.REVIEWING;
  }).length;
  const target = learnReviewTarget(language);
  const daily = measureLearnSynchronous(`dailyPracticeSummary:${language}`, () => VocabularyMasteryModel
    ? VocabularyMasteryModel.dailyPracticeSummary(store, language, todayISO(), target)
    : { language, target, scheduled: 0, maintenance: 0, combined: 0, remaining: target, complete: false });
  const savedSession = snapshot.sessions?.sessions?.[language];
  const active = savedSession && !LearningPracticeModel.sessionExpired(savedSession) && !savedSession.completedAt ? savedSession : null;
  const remaining = active ? active.cards.filter(card => !card.answered).length : 0;
  return { language, profile, due: due.length, readyLearning, daily, active, remaining };
}
function dailyPracticeDashboardSummaries(){
  const revision = `${LearningPracticeModel.revision(learnStorage())}:${todayISO()}`;
  if(learnState.dashboardSummary && learnState.dashboardRevision === revision) return learnState.dashboardSummary;
  const snapshot = {
    store: learnVocabularyStore(),
    profiles: LearningPracticeModel.loadProfiles(learnStorage()),
    sessions: LearningPracticeModel.loadSessions(learnStorage())
  };
  const summaries = ['greek','hebrew'].map(language => dailyPracticeDashboardSummary(language, snapshot));
  learnState.dashboardRevision = revision;
  learnState.dashboardSummary = summaries;
  learnState.dashboardVocabularyStore = snapshot.store;
  return summaries;
}
function dashboardSummariesForRender(){
  const revision = `${LearningPracticeModel.revision(learnStorage())}:${todayISO()}`;
  if(learnState.dashboardSummary && learnState.dashboardRevision === revision) return learnState.dashboardSummary;
  if(typeof window === 'undefined' || typeof document === 'undefined') return dailyPracticeDashboardSummaries();
  const profiles = LearningPracticeModel.loadProfiles(learnStorage());
  const sessions = LearningPracticeModel.loadSessions(learnStorage());
  if(!learnState.dashboardPending){
    learnState.dashboardPending = true;
    const compute = () => setTimeout(async () => {
      markLearnPerformanceMilestone('deferred-summary-start');
      try {
        await Promise.all(['greek','hebrew'].map(prepareLearnVocabularyEntries));
        measureLearnSynchronous('dailyPracticeDashboardSummaries', dailyPracticeDashboardSummaries);
      }
      finally {
        markLearnPerformanceMilestone('deferred-summary-complete');
        learnState.dashboardPending = false;
        if(learnState.page === 'home') renderLearn();
      }
    }, 0);
    if(typeof requestAnimationFrame === 'function') requestAnimationFrame(compute);
    else compute();
  }
  return ['greek','hebrew'].map(language => {
    const target = learnReviewTarget(language);
    const savedSession = sessions.sessions[language];
    const active = savedSession && !LearningPracticeModel.sessionExpired(savedSession) && !savedSession.completedAt ? savedSession : null;
    return { language, profile: profiles.profiles[language], due: 0, readyLearning: 0, daily: { language, target, scheduled: 0, maintenance: 0, combined: 0, remaining: target, complete: false }, active, remaining: active ? active.cards.filter(card => !card.answered).length : 0, loading: true };
  });
}
function learnDailyPreview(summary){
  if(summary.loading) return 'Preparing today’s scheduled work and balanced maintenance.';
  const parts = [];
  if(summary.due) parts.push(`${summary.due} scheduled ${summary.due === 1 ? 'review' : 'reviews'}`);
  if(summary.readyLearning) parts.push(`${summary.readyLearning} ready Learning ${summary.readyLearning === 1 ? 'word' : 'words'}`);
  const prefix = parts.length ? `${parts.join(' and ')}, then ` : '';
  const amount = summary.profile.dailyAmountMode === 'unlimited'
    ? 'Continue with a bounded queue until you stop.'
    : summary.profile.dailyAmountMode === 'set'
      ? `Practice ${summary.profile.dailyAmount} additional ${summary.profile.dailyAmount === 1 ? 'word' : 'words'}.`
      : `Balanced rotation toward your ${summary.daily.target}-word goal.`;
  return `${prefix}${amount}`;
}
function activePracticeLabel(summary){
  if(summary.active) return summary.active.position ? `Resume ${learnLanguageTitle(summary.language)} practice` : `Continue ${learnLanguageTitle(summary.language)} practice`;
  if(summary.daily.complete && !summary.due) return `Practice more ${learnLanguageTitle(summary.language)}`;
  return `Start ${learnLanguageTitle(summary.language)} practice`;
}
function startDailyPractice(language, options = {}){
  const active = learnActivePracticeSession(language);
  if(active && !options.extra){
    if(LearningPracticeModel.sessionExpired(active)){
      learnState.profileError = 'This session is more than seven days old. Discard it or start again from Customize.';
      setLearnPage(`vocabulary:customize:${language}`);
      return null;
    }
    learnState.unifiedRevealed = active.revealedCardId === LearningPracticeModel.currentCard(active)?.cardId;
    setLearnPage(`vocabulary:daily:${language}`);
    return active;
  }
  const profile = LearningPracticeModel.normalizeProfile(options.profile || learnProfile(language), language);
  const focused = options.focused === true;
  const validity = learnProfileValid(profile, { daily: !focused });
  if(!validity.valid){
    learnState.profileError = validity.error;
    learnState.profileDrafts[language] = profile;
    setLearnPage(`vocabulary:customize:${language}`);
    return null;
  }
  const daily = learnDailyPracticeSummary(language);
  const returnPage = options.returnPage || (learnState.page.startsWith('vocabulary:daily:') ? 'home' : learnState.page);
  const allEntries = options.entries || learnVocabularyEntries(language);
  const vocabularyStore = options.store || learnVocabularyStore();
  const profileEntries = learnProfileEntries(profile, { entries: allEntries, store: vocabularyStore });
  const dueEntries = VocabularyLearningModel.dueEntries(allEntries, vocabularyStore);
  const focusedNewEntries = ['weak','needs-attention'].includes(profile.source)
    ? (profile.newWordSource === 'all' ? allEntries : learnProfileEntries(learnProfile(language), { entries: allEntries, store: vocabularyStore }))
    : profileEntries;
  const session = focused
    ? LearningPracticeModel.assembleFocusedSession({
        language,
        profile,
        entries: profileEntries,
        newEntries: focusedNewEntries,
        store: vocabularyStore,
        model: VocabularyLearningModel,
        glossMap: learnState.glossMaps[language],
        attention: LearningPracticeModel.loadAttention(learnStorage()),
        returnPage,
        contextTitle: options.contextTitle,
        contextDetail: options.contextDetail
      })
    : LearningPracticeModel.assembleSession({
        language,
        profile,
        entries: allEntries,
        dueEntries,
        maintenanceEntries: profileEntries,
        newEntries: ['all-known','weak','needs-attention'].includes(profile.source) ? allEntries : profileEntries,
        store: vocabularyStore,
        model: VocabularyLearningModel,
        glossMap: learnState.glossMaps[language],
        target: options.extra ? daily.combined + profile.size : learnReviewTarget(language),
        dailyAmountMode: options.extra ? 'set' : profile.dailyAmountMode,
        dailyAmount: options.extra ? profile.size : profile.dailyAmount,
        todayIds: daily.combinedIds,
        attention: LearningPracticeModel.loadAttention(learnStorage()),
        returnPage,
        contextTitle: options.contextTitle,
        contextDetail: options.contextDetail
      });
  if(options.saveProfile) LearningPracticeModel.saveProfile(profile, learnStorage());
  LearningPracticeModel.saveSession(session, learnStorage());
  learnState.profileError = '';
  learnState.unifiedRevealed = false;
  setLearnPage(`vocabulary:daily:${language}`);
  return session;
}
async function prepareDailyPractice(button, language, options = {}){
  const normalized = language === 'hebrew' ? 'hebrew' : 'greek';
  if(learnState.practicePreparing[normalized]) return learnState.practicePreparing[normalized];
  const generation = ++learnState.practicePreparationGeneration;
  const startingPage = learnState.page;
  const original = button?.textContent || '';
  if(button){ button.disabled = true; button.textContent = `Preparing ${learnLanguageTitle(normalized)} practice…`; }
  beginLearnPerformanceNavigation('continue-practice');
  if(typeof window !== 'undefined') window.PuritanLifecycleDiagnostics?.job?.(`practice:${normalized}`, 1);
  const pending = (async () => {
    await new Promise(resolve => typeof requestAnimationFrame === 'function' ? requestAnimationFrame(() => resolve()) : setTimeout(resolve, 0));
    markLearnPerformanceMilestone('visible-acknowledgment');
    const root = $('#learnShell');
    if(root && learnState.page === startingPage){
      root.innerHTML = `<section class="panel learn-panel"><h1>${escHtml(learnLanguageTitle(normalized))} daily practice</h1><p class="progress-empty" role="status">Preparing ${escHtml(learnLanguageTitle(normalized))} practice…</p></section>`;
      markLearnPerformanceMilestone('preparation-shell');
    }
    if(learnActivePracticeSession(normalized)){
      if(generation !== learnState.practicePreparationGeneration || learnState.page !== startingPage) return null;
      const resumed = startDailyPractice(normalized, options);
      markLearnPerformanceMilestone('session-shell');
      requestAnimationFrame?.(() => markLearnPerformanceMilestone('first-card'));
      return resumed;
    }
    const [entries] = await Promise.all([prepareLearnVocabularyEntries(normalized), ensureLearnVocabularyGlossMap(normalized)]);
    if(generation !== learnState.practicePreparationGeneration || learnState.page !== startingPage || (typeof state !== 'undefined' && state.currentView && state.currentView !== 'learnView')) return null;
    const store = learnVocabularyStore();
    const session = measureLearnSynchronous(`assemblePractice:${normalized}`, () => startDailyPractice(normalized, { ...options, entries, store }));
    markLearnPerformanceMilestone('session-shell');
    requestAnimationFrame?.(() => markLearnPerformanceMilestone('first-card'));
    return session;
  })().finally(() => {
    if(typeof window !== 'undefined') window.PuritanLifecycleDiagnostics?.job?.(`practice:${normalized}`, -1);
    if(learnState.practicePreparing[normalized] === pending) delete learnState.practicePreparing[normalized];
    if(button?.isConnected){ button.disabled = false; button.textContent = original; }
  });
  learnState.practicePreparing[normalized] = pending;
  return pending;
}
function saveAndExitDailyPractice(language){
  const session = learnActivePracticeSession(language) || LearningPracticeModel.loadSessions(learnStorage()).sessions[language];
  if(session && !session.completedAt) LearningPracticeModel.saveSession(session, learnStorage());
  const fallback = session?.returnPage && !session.returnPage.startsWith('vocabulary:daily:') ? session.returnPage : 'home';
  setLearnPage(fallback);
  return fallback;
}
function discardDailyPractice(language){
  LearningPracticeModel.discardSession(language, learnStorage());
  learnState.profileError = '';
  setLearnPage('home');
}
function revealUnifiedPractice(){
  const language = learnState.page.split(':')[2] === 'hebrew' ? 'hebrew' : 'greek';
  const session = learnActivePracticeSession(language);
  const card = LearningPracticeModel.currentCard(session);
  if(session && card) LearningPracticeModel.saveSession({ ...session, revealedCardId: card.cardId }, learnStorage());
  learnState.unifiedRevealed = true; renderLearn();
}
function unifiedEntryForCard(language, card){
  if(!card) return null;
  const raw = findLearnVocabularyEntry(language, card.vocabularyId);
  return LearningPracticeModel.validateVocabularyCard(raw, language, { model: VocabularyLearningModel, glossMap: learnState.glossMaps[language], expectedId: card.vocabularyId }).entry || null;
}
async function openUnifiedPracticeWordPage(language, cardId){
  const session = learnActivePracticeSession(language);
  const card = LearningPracticeModel.currentCard(session);
  const entry = unifiedEntryForCard(language, card);
  if(!session || !card || card.cardId !== cardId || !entry || !learnState.unifiedRevealed) return false;
  LearningPracticeModel.saveSession({ ...session, revealedCardId: card.cardId }, learnStorage());
  if(typeof openReaderWordPageFromInfo !== 'function' && typeof loadFeatureView === 'function' && typeof window !== 'undefined' && window.PuritanModuleLoader){
    await loadFeatureView('wordPageView', window.PuritanModuleLoader);
  }
  return typeof openReaderWordPageFromInfo === 'function' && openReaderWordPageFromInfo({
    ...entry,
    surface: entry.studyForm,
    lexicalForm: entry.studyForm,
    language,
    stableVocabularyId: card.vocabularyId,
    returnToPractice: { language, sessionId: session.sessionId, cardId: card.cardId }
  });
}
function persistStandaloneConfidence(entry, confidence, context = {}){
  const store = learnVocabularyStore();
  const id = learnWordId(entry);
  const existing = store.records?.[id] || { id, lemma: entry.lemma || entry.word, lang: entry.lang, status: 'Learning', successCount: 0, intervalDays: 0, due: todayISO(), history: [] };
  const scheduleUpdated = context.scheduleUpdated !== false;
  const transition = scheduleUpdated
    ? LearningPracticeModel.applyConfidence(existing, confidence, { ...context, vocabularyId: id, language: entry.lang, scheduleUpdated })
    : LearningPracticeModel.appendEvidenceOnly(existing, confidence, { ...context, vocabularyId: id, language: entry.lang, scheduleUpdated: false });
  store.records[id] = transition.record;
  VocabularyLearningModel.saveStore(store);
  LearningPracticeModel.appendAttempt(transition.event, learnStorage());
  return transition.event;
}
function gradeUnifiedPractice(confidence){
  if(learnState.unifiedSubmitting) return false;
  const language = learnState.page.split(':')[2] === 'hebrew' ? 'hebrew' : 'greek';
  const session = learnActivePracticeSession(language);
  const card = LearningPracticeModel.currentCard(session);
  const entry = unifiedEntryForCard(language, card);
  if(card && session.revealedCardId === card.cardId) learnState.unifiedRevealed = true;
  if(!session || !card || !entry || !learnState.unifiedRevealed) return false;
  learnState.unifiedSubmitting = true;
  try {
    const result = LearningPracticeModel.recordAnswer({ session, cardId: card.cardId, entry, confidence, model: VocabularyLearningModel, store: learnVocabularyStore(), maintenanceSrs: LearningPracticeModel.loadMaintenancePreference(learnStorage()).enabled, adapter: learnStorage() });
    if(result.accepted) VocabularyLearningModel.saveStore(result.store);
    LearningPracticeModel.saveSession(result.session, learnStorage());
    learnState.unifiedRevealed = false;
    renderLearn();
    return result.accepted;
  } finally { learnState.unifiedSubmitting = false; }
}
function startDifficultRecap(language){
  const session = learnActivePracticeSession(language) || LearningPracticeModel.loadSessions(learnStorage()).sessions[language];
  if(!session) return null;
  const recap = LearningPracticeModel.buildRecap(session);
  LearningPracticeModel.saveSession(recap, learnStorage());
  learnState.unifiedRevealed = false;
  renderLearn();
  return recap;
}
function toggleUnifiedAttention(language, id){
  const active = !LearningPracticeModel.needsAttention(id, language, learnStorage());
  LearningPracticeModel.setNeedsAttention(id, language, active, learnStorage());
  renderLearn();
  return active;
}
function renderUnifiedVocabularyCard(entry, card, revealed){
  const glosses = learnNormalizedGlosses(entry);
  const reverse = card.direction === 'reverse';
  const prompt = reverse ? glosses.primary : entry.studyForm;
  const answer = reverse ? entry.studyForm : glosses.primary;
  const language = entry.lang === 'hebrew' ? 'he' : 'grc';
  const direction = entry.lang === 'hebrew' ? 'rtl' : 'ltr';
  const languageName = entry.lang === 'hebrew' ? 'Hebrew' : 'Greek';
  const flagged = LearningPracticeModel.needsAttention(learnWordId(entry), entry.lang, learnStorage());
  return `<article class="learn-unified-card ${revealed ? 'is-revealed' : ''}" data-prompt-direction="${escHtml(card.direction)}">
    <div class="learn-unified-prompt">
      <span class="small muted">${reverse ? `English → ${languageName}` : `${languageName} → English`}</span>
      <div class="learn-unified-word" ${reverse ? '' : `lang="${language}" dir="${direction}"`}>${escHtml(prompt)}</div>
      ${reverse && entry.pos ? `<p class="small muted">${escHtml(entry.pos)}</p>` : ''}
    </div>
    <div class="learn-unified-answer" ${revealed ? '' : 'aria-hidden="true"'}>
      ${revealed ? `<span class="small muted">Answer</span><div class="learn-unified-word learn-unified-answer-text" ${reverse ? `lang="${language}" dir="${direction}"` : ''}>${escHtml(answer)}</div>${glosses.alternates.length ? `<details><summary>More glosses</summary><p>${glosses.alternates.map(escHtml).join(' · ')}</p></details>` : ''}<button class="btn btn-ghost btn-sm" type="button" data-learn-open-word-page="${escHtml(card.cardId)}">Open Word Page</button>` : ''}
    </div>
    <button class="btn btn-ghost btn-sm learn-attention-toggle" type="button" data-learn-attention-id="${escHtml(learnWordId(entry))}" data-language="${escHtml(entry.lang)}" aria-pressed="${flagged}">${flagged ? 'Remove Needs attention' : 'Needs attention'}</button>
  </article>`;
}
function renderConfidenceControls(attribute){
  return `<div class="learn-confidence-grid" role="group" aria-label="Rate recall confidence">
    ${[['again','Again','1'],['hard','Hard','2'],['good','Good','3'],['easy','Easy','4']].map(([value,label,key]) => `<button class="learn-confidence learn-confidence-${value}" type="button" ${attribute}="${value}" aria-label="${label}, keyboard ${key}"><span>${label}</span><kbd>${key}</kbd></button>`).join('')}
  </div>`;
}
function renderDailyPracticePage(language){
  const session = learnActivePracticeSession(language) || LearningPracticeModel.loadSessions(learnStorage()).sessions[language];
  if(!session) return `<section class="panel learn-panel"><h1>${escHtml(learnLanguageTitle(language))} practice</h1><p>No resumable session is available.</p><button class="btn btn-primary" type="button" data-learn-start-daily="${escHtml(language)}">Start practice</button></section>`;
  const card = LearningPracticeModel.currentCard(session);
  if(language === 'hebrew' && !learnState.glossMaps.hebrew){
    ensureLearnVocabularyGlossMap('hebrew').then(() => renderLearn()).catch(error => { learnState.profileError = error.message; renderLearn(); });
    return `<section class="panel learn-panel"><h1>Hebrew practice</h1><p role="status">Preparing studyable Hebrew vocabulary…</p></section>`;
  }
  const entry = unifiedEntryForCard(language, card);
  if(card && session.revealedCardId === card.cardId) learnState.unifiedRevealed = true;
  const completed = !card;
  const daily = learnDailyPracticeSummary(language);
  const focused = session.sessionType === 'focused';
  if(completed){
    const difficult = session.difficultIds.length;
    return `<section class="panel learn-panel learn-session-complete" aria-labelledby="learnDailyCompleteTitle">
      ${renderLearnHeader(`${session.contextTitle || `${learnLanguageTitle(language)} practice`} complete`, session.contextDetail || (focused ? 'Focused vocabulary practice' : 'Daily vocabulary practice'), 'learnDailyCompleteTitle')}
      <section class="word-page-section"><h2>${focused ? 'Session results' : 'Today’s work'}</h2>
        ${focused
          ? `<dl class="learn-completion-summary"><div><dt>Words practiced</dt><dd>${session.counts.maintenance + session.counts.new}</dd></div><div><dt>New words introduced</dt><dd>${session.counts.new}</dd></div><div><dt>Again or Hard</dt><dd>${session.difficultIds.length}</dd></div></dl>`
          : `<dl class="learn-completion-summary"><div><dt>Scheduled reviews</dt><dd>${session.counts.scheduled}</dd></div><div><dt>Ready Learning words</dt><dd>${session.counts.learning}</dd></div><div><dt>New words introduced</dt><dd>${session.counts.new}</dd></div><div><dt>Maintenance words</dt><dd>${session.counts.maintenance}</dd></div><div><dt>Unique vocabulary today</dt><dd>${daily.combined}</dd></div></dl>`}
        ${session.requestedNewCount && !session.introducedWordIds.length ? '<p>Scheduled work filled today’s goal, so no New words were introduced.</p>' : ''}
        ${session.limitedByPool ? `<p>Only ${session.cards.filter(item => item.phase !== 'recap').length} studyable words matched these settings.</p>` : ''}
        <div class="learn-vocab-actions">${difficult && !session.recapStarted ? `<button class="btn btn-primary" type="button" data-learn-start-recap="${escHtml(language)}">Review difficult words again</button>` : ''}${focused ? '' : `<button class="btn btn-ghost" type="button" data-learn-continue-extra="${escHtml(language)}">Continue practicing</button>`}<button class="btn btn-ghost" type="button" data-learn-save-exit="${escHtml(language)}">${session.returnPage && session.returnPage !== 'home' ? 'Return' : 'Return to Learn'}</button></div>
      </section></section>`;
  }
  const answered = session.cards.filter(item => item.answered && item.phase !== 'recap').length;
  const total = session.cards.filter(item => item.phase !== 'recap').length;
  const phaseLabel = { scheduled: 'Scheduled reviews', learning: 'Ready Learning words', new: 'Introduced New words', maintenance: 'Balanced maintenance', recap: 'Difficult-word recap' }[card.phase];
  const title = session.contextTitle || `${learnLanguageTitle(language)} daily practice`;
  const contextDetail = session.contextDetail || '';
  const detail = contextDetail && contextDetail !== phaseLabel ? `${contextDetail} · ${phaseLabel}` : phaseLabel;
  const progress = focused
    ? (session.unlimited ? `Word ${answered + 1}` : `${Math.min(answered + 1, total)} of ${total}`)
    : `${Math.min(session.startingDailyCount + answered + 1, session.target)} of ${session.target} words today`;
  const announcesTransition = !focused && card.phase === 'maintenance' && session.cards.some(item => item.phase === 'scheduled') && session.cards[session.position - 1]?.phase !== 'maintenance';
  return `<section class="panel learn-panel learn-active-practice" aria-labelledby="learnDailySessionTitle">
    <header class="learn-session-header"><div><h1 id="learnDailySessionTitle">${escHtml(title)}</h1><span class="small muted">${escHtml(detail)}</span></div><span>${escHtml(progress)}</span></header>
    ${announcesTransition ? '<p class="learn-phase-transition" role="status">Scheduled reviews complete. Continuing with balanced vocabulary maintenance.</p>' : ''}
    ${renderUnifiedVocabularyCard(entry, card, learnState.unifiedRevealed)}
    <div class="learn-unified-controls">${learnState.unifiedRevealed ? renderConfidenceControls('data-learn-unified-confidence') : '<button class="btn btn-primary learn-unified-reveal" type="button" data-learn-unified-reveal="true">Reveal</button>'}</div>
    <button class="btn btn-ghost btn-sm learn-save-exit" type="button" data-learn-save-exit="${escHtml(language)}">Save and exit</button>
  </section>`;
}
function renderFrequencyRangeField(draft, prefix = 'practice'){
  const range = learnFrequencyRange(draft.sourceId);
  const selected = range.custom ? 'custom' : range.id;
  return `<div class="learn-dependent-field" data-dependent-field="frequency">
    <label>Frequency range<select class="input" name="frequencyChoice"><option value="">Choose a frequency range</option>${LearnFrequencyRanges.map(item => `<option value="${item.id}" ${selected === item.id ? 'selected' : ''}>${item.label}</option>`).join('')}<option value="custom" ${selected === 'custom' ? 'selected' : ''}>Custom range</option></select></label>
    ${selected === 'custom' ? `<div class="learn-frequency-bounds"><label>Minimum<input class="input" name="frequencyMinimum" type="number" min="1" step="1" inputmode="numeric" value="${range.minimum || ''}"></label><label>Maximum<input class="input" name="frequencyMaximum" type="number" min="1" step="1" inputmode="numeric" value="${range.maximum || ''}"></label></div>` : ''}
  </div>`;
}
function practiceContext(profile){
  if(profile.source === 'book') return { title: `${learnLanguageTitle(profile.language)} practice by ${profile.passageScope === 'chapter' ? 'chapter' : 'book'}`, detail: `${learnBook(profile.language, profile.sourceId)?.name || ''}${profile.chapter ? ` ${profile.chapter}` : ''}` };
  if(profile.source === 'frequency') return { title: `${learnLanguageTitle(profile.language)} frequency practice`, detail: learnFrequencyRangeLabel(profile.sourceId) };
  if(profile.source === 'weak') return { title: `${learnLanguageTitle(profile.language)} weak-word practice`, detail: 'Words needing reinforcement' };
  if(profile.source === 'needs-attention') return { title: `${learnLanguageTitle(profile.language)} Needs attention practice`, detail: 'Words marked Needs attention' };
  if(profile.source === 'custom-deck') return { title: `${learnLanguageTitle(profile.language)} Custom Deck practice`, detail: learnStudySet(profile.sourceId)?.title || '' };
  return { title: `${learnLanguageTitle(profile.language)} daily practice`, detail: profile.strategy === 'reinforcement' ? 'Words needing reinforcement' : profile.strategy === 'random' ? 'Random order' : 'Balanced maintenance' };
}
function renderPracticeCustomize(language){
  const saved = learnProfile(language);
  const savedSession = LearningPracticeModel.loadSessions(learnStorage()).sessions[language];
  const expiredSession = savedSession && LearningPracticeModel.sessionExpired(savedSession);
  const pageParts = learnState.page.split(':');
  const requestedSource = pageParts[3];
  const focused = ['weak','needs-attention','book','frequency','custom-deck'].includes(requestedSource);
  const requestedSourceId = ['custom-deck','book','frequency'].includes(requestedSource) ? pageParts.slice(4).join(':') : '';
  if(focused && (learnState.profileDrafts[language]?.source !== requestedSource || (requestedSourceId && learnState.profileDrafts[language]?.sourceId !== requestedSourceId))){
    learnState.profileDrafts[language] = { ...saved, source: requestedSource, sourceId: requestedSourceId, introduceNewCount: 0, strategy: requestedSource === 'weak' ? 'reinforcement' : saved.strategy, selectedGrades: requestedSource === 'weak' ? LearningPracticeModel.GRADES.slice() : saved.selectedGrades };
  }
  let draft = LearningPracticeModel.normalizeProfile(learnState.profileDrafts[language] || saved, language);
  if(!focused && draft.source === 'weak') draft = LearningPracticeModel.normalizeProfile({ ...draft, source: 'all-known', sourceId: '' }, language);
  if(focused && draft.source !== requestedSource) draft = LearningPracticeModel.normalizeProfile({ ...draft, source: requestedSource, sourceId: requestedSourceId }, language);
  learnState.profileDrafts[language] = draft;
  const decks = learnStudySets().filter(set => set.type === 'vocabulary' && set.language === language);
  const books = learnBookList(language);
  if(draft.source === 'book'){
    ensureLearnManifest(language);
    if(draft.sourceId) ensureBookProgress(language, draft.sourceId);
  }
  const validity = learnProfileValid(draft, { daily: !focused });
  const sourceControl = focused ? '' : `<label>Vocabulary scope<select class="input" name="source"><option value="all-known" ${draft.source === 'all-known' ? 'selected' : ''}>All vocabulary</option><option value="book" ${draft.source === 'book' ? 'selected' : ''}>One biblical book</option><option value="frequency" ${draft.source === 'frequency' ? 'selected' : ''}>Frequency range</option><option value="needs-attention" ${draft.source === 'needs-attention' ? 'selected' : ''}>Needs attention</option><option value="custom-deck" ${draft.source === 'custom-deck' ? 'selected' : ''}>Custom Deck</option></select></label>`;
  const chosenBook = draft.sourceId ? learnBook(language, draft.sourceId) : null;
  const detailControl = draft.source === 'book'
    ? `<div class="learn-dependent-field" data-dependent-field="book"><label>Book<select class="input" name="sourceId"><option value="">Choose a book</option>${books.map(book => `<option value="${escHtml(book.id)}" ${draft.sourceId === book.id ? 'selected' : ''}>${escHtml(book.name)}</option>`).join('')}</select></label><label>Passage scope<select class="input" name="passageScope"><option value="book" ${draft.passageScope === 'book' ? 'selected' : ''}>Entire book</option><option value="chapter" ${draft.passageScope === 'chapter' ? 'selected' : ''}>One chapter</option></select></label>${draft.passageScope === 'chapter' ? `<label>Chapter<select class="input" name="chapter"><option value="">Choose a chapter</option>${(chosenBook?.chapters || []).map(chapter => `<option value="${chapter}" ${Number(draft.chapter) === Number(chapter) ? 'selected' : ''}>${chapter}</option>`).join('')}</select></label>` : ''}<label>Frequency in selected ${draft.passageScope === 'chapter' ? 'chapter' : 'book'}<select class="input" name="scopeFrequencyId"><option value="">All frequencies</option>${LearnFrequencyRanges.map(item => `<option value="${item.id}" ${draft.scopeFrequencyId === item.id ? 'selected' : ''}>${item.label}</option>`).join('')}</select></label></div>`
    : draft.source === 'frequency'
      ? renderFrequencyRangeField(draft)
      : draft.source === 'custom-deck'
        ? (decks.length ? `<div class="learn-dependent-field" data-dependent-field="custom-deck"><label>Custom Deck<select class="input" name="sourceId"><option value="">Choose a Custom Deck</option>${decks.map(deck => `<option value="${escHtml(deck.id)}" ${draft.sourceId === deck.id ? 'selected' : ''}>${escHtml(deck.title)}</option>`).join('')}</select></label></div>` : '<section class="learn-inline-validation"><p>No Custom Decks are available for this language.</p><button class="btn btn-ghost btn-sm" type="button" data-learn-page="study-sets:create">Create Custom Deck</button></section>')
        : '';
  const strategyControl = draft.source === 'weak' ? '<p class="small muted">Draws from low mastery, recent difficulty, Hard or Again answers, and words marked Needs attention.</p>' : `<label>Selection order<select class="input" name="strategy"><option value="balanced" ${draft.strategy === 'balanced' ? 'selected' : ''}>Balanced rotation</option><option value="reinforcement" ${draft.strategy === 'reinforcement' ? 'selected' : ''}>Words needing reinforcement</option><option value="random" ${draft.strategy === 'random' ? 'selected' : ''}>Random order</option></select></label>`;
  const gradesControl = draft.source === 'weak' ? '' : `<fieldset><legend>Mastery grades</legend><div class="learn-maintenance-grade-options">${LearningPracticeModel.GRADES.map(grade => `<label><input type="checkbox" name="selectedGrades" value="${grade}" ${draft.selectedGrades.includes(grade) ? 'checked' : ''}> ${grade} — ${escHtml(VocabularyMasteryModel.GRADE_META[grade].label)}</label>`).join('')}</div></fieldset>`;
  const sizeControl = focused ? `<fieldset class="learn-session-size"><legend>Session size</legend><label><input type="radio" name="sizeMode" value="finite" ${draft.unlimited ? '' : 'checked'}> Number of words</label><input class="input" type="number" name="size" min="1" max="200" value="${draft.size}" ${draft.unlimited ? 'disabled' : ''}><label><input type="radio" name="sizeMode" value="unlimited" ${draft.unlimited ? 'checked' : ''}> Continue until I stop</label></fieldset>` : `<fieldset class="learn-session-size"><legend>Daily practice amount</legend><label><input type="radio" name="dailyAmountMode" value="goal" ${draft.dailyAmountMode === 'goal' ? 'checked' : ''}> Finish today’s goal <span class="small muted">(recommended)</span></label><label><input type="radio" name="dailyAmountMode" value="set" ${draft.dailyAmountMode === 'set' ? 'checked' : ''}> Practice a set number</label><input class="input" type="number" name="dailyAmount" min="1" max="200" value="${draft.dailyAmount}" ${draft.dailyAmountMode === 'set' ? '' : 'disabled'}><p class="small muted">Scheduled reviews are always included in addition to this number.</p><label><input type="radio" name="dailyAmountMode" value="unlimited" ${draft.dailyAmountMode === 'unlimited' ? 'checked' : ''}> Continue until I stop</label></fieldset>`;
  const statusControl = focused ? `<fieldset><legend>Word status</legend><div class="learn-maintenance-grade-options">${[['known','Known'],['learning','Learning'],['new','New']].map(([value,label]) => `<label><input type="checkbox" name="statusFilters" value="${value}" ${draft.statusFilters.includes(value) ? 'checked' : ''}> ${label}</label>`).join('')}</div></fieldset>` : '';
  const customNew = ![0,1,2,3,5].includes(draft.introduceNewCount);
  const dailyNewScope = practiceContext(learnProfile(language));
  const newWordSourceNote = ['weak','needs-attention'].includes(draft.source) ? `<label>New-word source<select class="input" name="newWordSource"><option value="daily" ${draft.newWordSource !== 'all' ? 'selected' : ''}>Saved daily scope — ${escHtml(dailyNewScope.detail || dailyNewScope.title)}</option><option value="all" ${draft.newWordSource === 'all' ? 'selected' : ''}>All ${escHtml(learnLanguageTitle(language))} vocabulary</option></select></label><p class="small muted">Introduced words come from this source, not from the weak or marked pool.</p>` : '';
  const newWordControl = `<label>Introduce new words<select class="input" name="introduceNewChoice">${[[0,'None'],[1,'1 new word'],[2,'2 new words'],[3,'3 new words'],[5,'5 new words']].map(([value,label]) => `<option value="${value}" ${draft.introduceNewCount === value ? 'selected' : ''}>${label}</option>`).join('')}<option value="custom" ${customNew ? 'selected' : ''}>Custom number</option></select></label>${customNew ? `<label>Custom number<input class="input" name="introduceNewCustom" type="number" min="0" max="50" value="${draft.introduceNewCount}"></label>` : ''}<p class="small muted">Adds the highest-frequency New words that match this session’s scope. A word becomes Learning after your first rating.</p>${newWordSourceNote}`;
  const context = practiceContext(draft);
  const heading = focused ? context.title : `Customize ${learnLanguageTitle(language)} daily practice`;
  return `<section class="panel learn-panel" aria-labelledby="learnCustomizeTitle">${renderLearnHeader(heading, focused ? 'Choose how this focused session should work.' : 'Choose how much daily practice to prepare.', 'learnCustomizeTitle')}
    <form class="word-page-section learn-profile-form" data-learn-save-profile="${escHtml(language)}" data-practice-mode="${focused ? 'focused' : 'daily'}" novalidate>
      ${sourceControl}${detailControl}${strategyControl}
      <label>Card direction<select class="input" name="promptDirection"><option value="reading" ${draft.promptDirection === 'reading' ? 'selected' : ''}>${escHtml(learnLanguageTitle(language))} first</option><option value="reverse" ${draft.promptDirection === 'reverse' ? 'selected' : ''}>English first</option><option value="mixed" ${draft.promptDirection === 'mixed' ? 'selected' : ''}>Mixed directions</option></select></label><p class="small muted">${draft.promptDirection === 'reading' ? `See the ${escHtml(learnLanguageTitle(language))} word and recall its English meaning.` : draft.promptDirection === 'reverse' ? `See the English gloss and recall the ${escHtml(learnLanguageTitle(language))} word.` : 'Practice both directions in the same session.'}</p>
      ${statusControl}${newWordControl}${gradesControl}${sizeControl}
      <p class="learn-inline-validation" role="alert" ${!validity.valid || learnState.profileError ? '' : 'hidden'}>${escHtml(learnState.profileError || validity.error || '')}</p>
      ${expiredSession ? '<p class="small muted">Your previous saved session has expired. Discard it to start with a fresh queue.</p>' : ''}
      <div class="learn-vocab-actions"><button class="btn btn-primary" type="submit" ${validity.valid ? '' : 'disabled aria-disabled="true"'}>${focused ? 'Start practice' : 'Save and start daily practice'}</button>${expiredSession ? `<button class="btn btn-ghost" type="button" data-learn-discard-daily="${escHtml(language)}">Discard expired session</button>` : ''}<button class="btn btn-ghost" type="button" data-learn-cancel-profile="${escHtml(language)}">Cancel</button></div>
    </form></section>`;
}
function practiceProfileFromForm(form, options = {}){
  const data = new FormData(form);
  const language = form.dataset.learnSaveProfile === 'hebrew' ? 'hebrew' : 'greek';
  const previous = learnState.profileDrafts[language] || learnProfile(language);
  const source = data.get('source') || previous.source || 'all-known';
  let sourceId = data.get('sourceId') || '';
  let error = '';
  if(source === 'frequency'){
    const choice = data.get('frequencyChoice') || '';
    if(choice === 'custom'){
      const custom = makeCustomFrequencyRange(data.get('frequencyMinimum'), data.get('frequencyMaximum'));
      sourceId = custom.valid ? custom.id : `custom:${data.get('frequencyMinimum') || 0}:${data.get('frequencyMaximum') || 0}`;
      error = custom.valid ? '' : custom.error;
    } else sourceId = choice;
  }
  if(options.clearScopeDetail) sourceId = '';
  const focused = form.dataset.practiceMode === 'focused';
  const unlimited = focused && data.get('sizeMode') === 'unlimited';
  const dailyAmountMode = focused ? previous.dailyAmountMode : (data.get('dailyAmountMode') || previous.dailyAmountMode || 'goal');
  const dailyAmountRaw = String(data.get('dailyAmount') || previous.dailyAmount || '').trim();
  const sizeRaw = String(data.get('size') || '').trim();
  if(focused && !unlimited && (!/^\d+$/.test(sizeRaw) || Number(sizeRaw) < 1 || Number(sizeRaw) > 200)) error = error || 'Enter a session size from 1 to 200.';
  if(!focused && dailyAmountMode === 'set' && (!/^\d+$/.test(dailyAmountRaw) || Number(dailyAmountRaw) < 1 || Number(dailyAmountRaw) > 200)) error = error || 'Enter a daily practice amount from 1 to 200.';
  const introduceChoice = data.get('introduceNewChoice') || '0';
  const introduceNewCount = introduceChoice === 'custom' ? Number(data.get('introduceNewCustom')) : Number(introduceChoice);
  const dailyAmountLimit = dailyAmountMode === 'set' ? Number(dailyAmountRaw) : learnReviewTarget(language);
  if(!focused && dailyAmountMode === 'unlimited' && introduceNewCount > 0) error = error || 'Choose a finite daily amount when introducing New words.';
  if(!focused && dailyAmountMode !== 'unlimited' && introduceNewCount > Math.floor(dailyAmountLimit * .25)) error = error || `New words may be at most 25% of this daily amount (${Math.floor(dailyAmountLimit * .25)}).`;
  const passageScope = data.get('passageScope') || previous.passageScope || 'book';
  const bookChanged = source === 'book' && sourceId !== previous.sourceId;
  const profile = LearningPracticeModel.normalizeProfile({
    ...previous,
    language,
    source,
    sourceId,
    strategy: source === 'weak' ? 'reinforcement' : (data.get('strategy') || previous.strategy),
    selectedGrades: source === 'weak' ? LearningPracticeModel.GRADES.slice() : data.getAll('selectedGrades'),
    size: sizeRaw || previous.size,
    unlimited,
    dailyAmountMode,
    dailyAmount: dailyAmountRaw || previous.dailyAmount,
    promptDirection: data.get('promptDirection') || previous.promptDirection
    ,passageScope
    ,chapter: passageScope === 'chapter' && !bookChanged ? Number(data.get('chapter') || previous.chapter) : 0
    ,scopeFrequencyId: data.get('scopeFrequencyId') || ''
    ,statusFilters: focused ? data.getAll('statusFilters') : previous.statusFilters
    ,introduceNewCount
    ,newWordSource: data.get('newWordSource') || previous.newWordSource
  }, language);
  return { profile, error, focused };
}
function renderCustomizeLanguageChoices(source){
  const labels = { 'all-known': 'Maintenance practice', book: 'Practice by book', frequency: 'Practice by frequency', weak: 'Practice weak words', 'needs-attention': 'Practice Needs attention words', 'custom-deck': 'Custom Deck practice' };
  const title = labels[source] || 'Customize practice';
  return renderPracticeLanguageChoices(title, 'Choose a language for this focused vocabulary session.', `vocabulary:customize-source:${source}`)
    .replaceAll(`vocabulary:customize-source:${source}:greek`, `vocabulary:customize:greek:${source}`)
    .replaceAll(`vocabulary:customize-source:${source}:hebrew`, `vocabulary:customize:hebrew:${source}`);
}
function saveLearnActivePath(pathPage){
  const route = learnScopedRoute(pathPage);
  const parts = String(pathPage).split(':');
  const language = route?.language || parts[2] || 'greek';
  const threshold = route?.threshold || parts.at(-1);
  const adapter = learnStorage();
  let records = [];
  try { records = JSON.parse(adapter?.get(LearnActivePathsStorageKey) || '[]'); } catch(e) {}
  records = (Array.isArray(records) ? records : []).filter(record => record?.page !== pathPage);
  records.unshift({ page: pathPage, title: learnPathTitle(pathPage), language, threshold });
  adapter?.set(LearnActivePathsStorageKey, JSON.stringify(records.slice(0, 20)));
  return records[0];
}
function renderLegacyLearnHome(){
  const summaries = ['greek','hebrew'].map(learnReviewQueueSummary);
  const daily = ['greek','hebrew'].map(language => learnDailyPracticeSummary(language));
  const totalToday = summaries.reduce((sum, item) => sum + item.todayCount, 0);
  const dailyGoalsComplete = daily.every(item => item.complete);
  const estimated = summaries.reduce((sum, item) => sum + (item.todayCount ? item.estimatedMinutes : 0), 0);
  const allPathItems = learnActiveItems();
  const activeItems = allPathItems.filter(item => item.remaining > 0);
  const completedItems = allPathItems.filter(item => item.total > 0 && item.remaining === 0);
  const studySets = typeof PuritanStudySets !== 'undefined' && typeof PuritanStudySets.listStudySets === 'function' ? PuritanStudySets.listStudySets() : [];
  const activePathsHtml = activeItems.length ? `
        <div class="learn-path-list">
          ${activeItems.map(item => `<article class="learn-progress-row learn-progress-row-compact" data-learn-active-path="${escHtml(item.page)}"><div><h3>${escHtml(item.title)}</h3><p class="learn-path-remaining">${item.remaining} ${item.remaining === 1 ? 'word' : 'words'} remaining</p><p class="learn-path-meta">${escHtml(learnLanguageTitle(item.language))} · ${item.complete}% complete</p></div><button class="btn btn-primary btn-sm" type="button" data-learn-page="${escHtml(item.page)}">Continue</button></article>`).join('')}
        </div>` : `
        <section class="word-page-section learn-explainer">
          <h3>No active learning paths.</h3>
          <button class="btn btn-primary" type="button" data-learn-page="vocabulary:new-words">Start a Learning Path</button>
        </section>`;
  return `
    <section class="panel learn-panel learn-dashboard" aria-labelledby="learnTitle">
      ${renderLearnHeader('Learn', 'Practice and acquire knowledge.', 'learnTitle')}
      <section class="learn-dashboard-section learn-review-dashboard" aria-labelledby="learnReviewQueueTitle" data-learn-dashboard-section="review-queue">
        <div class="learn-section-heading">
          <h2 id="learnReviewQueueTitle">Scheduled reviews</h2>
          <p>${totalToday ? 'Review what is due, or practice known words voluntarily.' : 'Scheduled reviews complete'}</p>
        </div>
        <div class="learn-review-overview"><strong>${totalToday ? `${totalToday} due today` : 'Scheduled reviews complete'}</strong>${totalToday ? `<span>About ${Math.max(1, estimated)} ${Math.max(1, estimated) === 1 ? 'minute' : 'minutes'}</span>` : `<span>${dailyGoalsComplete ? 'Scheduled reviews and today’s goals are complete.' : 'Practice known words to continue toward today’s goal.'}</span>`}</div>
        <div class="learn-review-summary-grid">
          ${summaries.map(summary => `
            <article class="learn-review-summary" data-learn-review-language="${escHtml(summary.language)}">
              <h3>${escHtml(summary.label)}</h3>
              <p class="learn-review-count">${escHtml(String(summary.todayCount))} due</p>
              <p class="learn-review-meta">${summary.moreAvailable ? `${escHtml(String(summary.moreAvailable))} beyond daily target · ` : ''}Target ${escHtml(String(summary.target))}/day</p>
            </article>`).join('')}
        </div>
        <section class="learn-daily-practice" aria-labelledby="learnDailyPracticeTitle">
          <h3 id="learnDailyPracticeTitle">Daily practice</h3>
          <div class="learn-daily-grid">
            ${daily.map(item => `
              <div>
                <strong>${escHtml(learnLanguageTitle(item.language))}: ${escHtml(String(item.combined))} of ${escHtml(String(item.target))}</strong>
                <span>${escHtml(String(item.scheduled))} scheduled reviews · ${escHtml(String(item.maintenance))} maintenance words</span>
                <span>${item.complete ? 'Daily goal complete' : `${escHtml(String(item.remaining))} unique ${item.remaining === 1 ? 'word' : 'words'} remaining`}</span>
              </div>`).join('')}
          </div>
        </section>
        <div class="learn-review-actions">
          ${learnState.activeReviewPage && totalToday ? `<button class="btn btn-primary" type="button" data-learn-page="${escHtml(learnState.activeReviewPage)}">Resume Review</button>` : ''}
          ${totalToday
            ? `<button class="btn btn-primary" type="button" data-learn-page="vocabulary:review:mixed">Review scheduled words</button>
               <button class="btn btn-ghost" type="button" data-learn-page="vocabulary:maintenance">Practice known words</button>
               ${learnState.activeReviewPage === 'vocabulary:review:greek' || !summaries[0].todayCount ? '' : '<button class="btn btn-ghost btn-sm" type="button" data-learn-page="vocabulary:review:greek">Review Greek</button>'}
               ${learnState.activeReviewPage === 'vocabulary:review:hebrew' || !summaries[1].todayCount ? '' : '<button class="btn btn-ghost btn-sm" type="button" data-learn-page="vocabulary:review:hebrew">Review Hebrew</button>'}
               ${learnState.activeReviewPage === 'vocabulary:review:mixed' ? '' : '<button class="btn btn-ghost btn-sm" type="button" data-learn-page="vocabulary:review:mixed">Review Mixed</button>'}`
            : `<button class="btn btn-primary" type="button" data-learn-page="vocabulary:maintenance">${dailyGoalsComplete ? 'Continue practicing' : 'Continue daily practice'}</button>`}
          <button class="learn-settings-action" type="button" data-learn-page="learning-preferences" aria-label="Learning settings" title="Learning settings">⚙</button>
        </div>
      </section>
      <section class="learn-dashboard-section" aria-labelledby="learnPathsTitle" data-learn-dashboard-section="learning-paths">
        <div class="learn-section-heading">
          <h2 id="learnPathsTitle">Learning Paths</h2>
          <p>What you are actively learning.</p>
        </div>
        <h3>Active Paths</h3>
        ${activePathsHtml}
        ${completedItems.length ? `<details class="learn-completed-paths"><summary>Completed Paths (${completedItems.length})</summary><div class="learn-path-list">${completedItems.map(item => `<article class="learn-progress-row learn-progress-row-compact"><div><h3>${escHtml(item.title)}</h3><p class="muted small">${escHtml(learnLanguageTitle(item.language))} · 100% complete</p></div><button class="btn btn-ghost btn-sm" type="button" data-learn-page="${escHtml(item.page)}">Review</button></article>`).join('')}</div></details>` : ''}
        <div class="learn-vocab-actions">
          <button class="btn btn-primary" type="button" data-learn-page="vocabulary:new-words">Start Learning Path</button>
        </div>
      </section>
      <section class="learn-dashboard-section learn-secondary-section" aria-labelledby="learnStudySetsTitle" data-learn-dashboard-section="study-sets">
        <div class="learn-inline-section"><h2 id="learnStudySetsTitle">Custom Decks <span>(${studySets.length})</span></h2><div class="learn-compact-actions"><button class="btn btn-ghost btn-sm" type="button" data-learn-page="study-sets">Browse</button><button class="btn btn-ghost btn-sm" type="button" data-learn-page="study-sets:create">Create</button></div></div>
      </section>
      <section class="learn-dashboard-section learn-secondary-section" aria-labelledby="learnMorePracticeTitle" data-learn-dashboard-section="more-practice">
        <div class="learn-inline-section"><h2 id="learnMorePracticeTitle">More Practice</h2><div class="learn-compact-actions"><button class="btn btn-ghost btn-sm" type="button" data-learn-page="vocabulary:practice">Practice Vocabulary</button><button class="btn btn-ghost learn-practice-featured" type="button" data-learn-page="paradigms:recognition-practice">Paradigm Practice</button></div></div>
      </section>
    </section>`;
}
function renderLearnHome(){
  const summaries = dashboardSummariesForRender();
  const customDecks = learnStudySets().filter(set => set.type === 'vocabulary');
  const pathItems = summaries.some(summary => summary.loading) ? [] : learnActiveItems(learnState.dashboardVocabularyStore);
  const activePaths = pathItems.filter(item => item.remaining > 0);
  const completedPaths = pathItems.filter(item => item.total > 0 && item.remaining === 0);
  const card = summary => {
    const title = learnLanguageTitle(summary.language);
    const narrowed = summary.profile.source !== 'all-known';
    const percent = Math.min(100, Math.round((summary.daily.combined / Math.max(1, summary.daily.target)) * 100));
    return `<article class="learn-today-card" data-learn-today-language="${escHtml(summary.language)}">
      <div class="learn-today-card-heading"><div><span class="small muted">Today’s ${escHtml(title)}</span><h2>${escHtml(title)} practice</h2></div><strong>${summary.daily.combined} of ${summary.daily.target}</strong></div>
      <div class="learn-today-progress" role="progressbar" aria-label="${escHtml(title)} daily vocabulary progress" aria-valuemin="0" aria-valuemax="${summary.daily.target}" aria-valuenow="${summary.daily.combined}"><span style="width:${percent}%"></span></div>
      <dl class="learn-today-counts"><div><dt>Scheduled</dt><dd>${summary.loading ? '…' : summary.due}</dd></div><div><dt>Ready Learning</dt><dd>${summary.loading ? '…' : summary.readyLearning}</dd></div>${summary.active ? `<div><dt>Resumable</dt><dd>${summary.remaining} left</dd></div>` : ''}</dl>
      <p class="learn-daily-preview">${escHtml(learnDailyPreview(summary))}</p>
      <p class="small muted${narrowed ? ' learn-narrowed-profile' : ''}">${escHtml(LearningPracticeModel.profileSummary(summary.profile))}</p>
      <div class="learn-today-actions"><button class="btn btn-primary" type="button" data-learn-start-daily="${escHtml(summary.language)}">${escHtml(activePracticeLabel(summary))}</button><button class="btn btn-ghost btn-sm" type="button" data-learn-page="vocabulary:customize:${escHtml(summary.language)}">Customize</button></div>
    </article>`;
  };
  return `<section class="panel learn-panel learn-dashboard learn-dashboard-unified" aria-labelledby="learnTitle">
    ${renderLearnHeader('Learn', 'Today’s vocabulary practice, with focused tools when you need them.', 'learnTitle')}
    <section class="learn-today-section" aria-labelledby="learnTodayTitle"><div class="learn-section-heading"><h2 id="learnTodayTitle">Today’s Practice</h2><p>Scheduled work first, then balanced maintenance.</p></div><div class="learn-today-grid">${summaries.map(card).join('')}</div></section>
    <section class="learn-dashboard-section learn-parsing-practice" aria-labelledby="learnParsingTitle"><div class="learn-parsing-heading"><h2 id="learnParsingTitle">Parsing Practice</h2><p>Recognize Greek and Hebrew forms through focused paradigm drills.</p></div><div class="learn-parsing-choice-grid"><button class="learn-parsing-choice" type="button" data-learn-page="parsing:setup:greek"><strong>Greek</strong><span>Choose paradigms and practice recognizing forms.</span></button><button class="learn-parsing-choice" type="button" data-learn-page="parsing:setup:hebrew"><strong>Hebrew</strong><span>Choose stems and forms for recognition practice.</span></button></div></section>
    <section class="learn-dashboard-section" aria-labelledby="learnFocusedTitle"><div class="learn-section-heading"><h2 id="learnFocusedTitle">Focused vocabulary practice</h2><p>Use a narrower source when today’s normal routine is not what you need.</p></div><div class="learn-card-grid learn-card-grid-compact">
      ${learnCard({ title: 'Practice by book', description: 'Choose a biblical book and use the shared vocabulary practice engine.' }, 'vocabulary:customize-source:book', 'learn-card-compact')}
      ${learnCard({ title: 'Practice by frequency', description: 'Choose a corpus frequency range, including one-occurrence words.' }, 'vocabulary:customize-source:frequency', 'learn-card-compact')}
      ${learnCard({ title: 'Practice weak words', description: 'Prioritize low mastery, recent difficulty, and Needs attention.' }, 'vocabulary:customize-source:weak', 'learn-card-compact')}
      ${learnCard({ title: 'Words marked Needs attention', description: 'Practice only vocabulary you deliberately marked for attention.' }, 'vocabulary:customize-source:needs-attention', 'learn-card-compact')}
      ${learnCard({ title: `Custom Decks${customDecks.length ? ` (${customDecks.length})` : ''}`, description: 'Practice a saved membership collection with shared scheduling and mastery.' }, 'study-sets', 'learn-card-compact')}
    </div></section>
    <section class="learn-dashboard-section learn-secondary-section" aria-labelledby="learnToolsTitle"><div class="learn-inline-section"><div><h2 id="learnToolsTitle">Vocabulary tools</h2><p class="small muted">Search vocabulary, manage collections, and continue acquisition paths.</p></div><div class="learn-compact-actions"><button class="btn btn-primary btn-sm" type="button" data-learn-page="vocabulary:new-words">Start Learning Path</button><button class="btn btn-ghost btn-sm" type="button" data-learn-open-view="globalSearchView">Vocabulary Search</button><button class="btn btn-ghost btn-sm" type="button" data-learn-page="study-sets">Manage Custom Decks</button></div></div>
      ${activePaths.length ? `<details><summary>Active Learning Paths (${activePaths.length})</summary><div class="learn-path-list">${activePaths.map(item => `<article class="learn-progress-row learn-progress-row-compact" data-learn-active-path="${escHtml(item.page)}"><div><h3>${escHtml(item.title)}</h3><p>${item.remaining} words remaining · ${item.complete}% complete</p></div><button class="btn btn-ghost btn-sm" type="button" data-learn-page="${escHtml(item.page)}">Continue</button></article>`).join('')}</div></details>` : ''}
      ${completedPaths.length ? `<details><summary>Completed Paths (${completedPaths.length})</summary><div class="learn-path-list">${completedPaths.map(item => `<article class="learn-progress-row learn-progress-row-compact"><div><h3>${escHtml(item.title)}</h3><p>100% complete</p></div><button class="btn btn-ghost btn-sm" type="button" data-learn-page="${escHtml(item.page)}">Review</button></article>`).join('')}</div></details>` : ''}
    </section>
  </section>`;
}
function renderReviewChooser(area){
  const item = learnChild(area, 'review');
  const greek = learnReviewQueueSummary('greek');
  const hebrew = learnReviewQueueSummary('hebrew');
  return `
    <section class="panel learn-panel" aria-labelledby="learnReviewTitle">
      ${renderLearnHeader(item.title, 'Reviews Available', 'learnReviewTitle')}
      <div class="learn-card-grid">
        ${learnCard({ title: 'Greek Review', description: `${greek.todayCount} due today${greek.moreAvailable ? `; ${greek.moreAvailable} beyond daily target` : ''}` }, 'vocabulary:review:greek')}
        ${learnCard({ title: 'Hebrew Review', description: `${hebrew.todayCount} due today${hebrew.moreAvailable ? `; ${hebrew.moreAvailable} beyond daily target` : ''}` }, 'vocabulary:review:hebrew')}
        ${learnCard({ title: 'Mixed Review', description: 'Review Greek and Hebrew together from today\'s queues.' }, 'vocabulary:review:mixed')}
      </div>
    </section>`;
}
function renderReviewResultFeedback(){
  const result = learnState.lastReviewResult;
  if(!result) return '';
  return `
    <section class="word-page-section learn-review-result" aria-labelledby="learnReviewResultTitle">
      <h2 id="learnReviewResultTitle">Last Review</h2>
      <p>${escHtml(result.lemma)}: ${escHtml(result.status)}. Next review: ${escHtml(result.nextReview)}. Interval: ${escHtml(result.interval)}.</p>
    </section>`;
}
function renderLanguageReviewPage(area, language){
  const item = learnChild(area, 'review');
  const mixed = language === 'mixed';
  const title = mixed ? 'Mixed Review' : `${learnLanguageTitle(language)} Review`;
  if(VocabularyLearningModel){
    const due = mixed ? learnMixedReviewEntries() : learnReviewEntries(language).slice(0, learnReviewTarget(language));
    const focused = learnState.focusedReviewWordId ? findLearnReviewEntry(language, learnState.focusedReviewWordId) : null;
    const current = focused || due[0];
    const reviewCount = focused ? due.filter(entry => learnWordId(entry) !== learnState.focusedReviewWordId).length : due.length;
    return `
      <section class="panel learn-panel" aria-labelledby="learnReviewTitle">
        ${renderLearnHeader(title, focused ? 'Word Review' : 'Reviews Available', 'learnReviewTitle')}
        ${current ? `
          ${renderReviewResultFeedback()}
          ${renderVocabularyLearningCard(current, { revealed: learnState.reviewReveal })}
          ${renderLearningStatusSummary(current)}
          <div class="learn-vocab-actions">
            ${learnState.reviewReveal
              ? renderConfidenceControls('data-learn-review-grade').replaceAll('<button ', `<button data-lang="${escHtml(current.lang)}" data-word-id="${escHtml(learnWordId(current))}" `)
              : `<button class="btn btn-primary learn-review-action learn-review-reveal" type="button" id="learnRevealMeaningBtn">Reveal Meaning</button>`}
          </div>
          ${reviewCount > 1 ? `<p class="muted small">${reviewCount} reviews available</p>` : ''}`
        : `${renderReviewResultFeedback()}<section class="word-page-section learn-explainer">
            <h2>Scheduled reviews complete</h2>
            <p>Practice known words to continue toward today’s goal. Maintenance scheduling follows the single global preference.</p>
            <div class="learn-vocab-actions">
              <button class="btn btn-primary" type="button" data-learn-page="vocabulary:maintenance${mixed ? '' : `:${language}`}">Continue daily practice</button>
              <button class="btn btn-ghost btn-sm" type="button" data-learn-page="vocabulary:new-words">Start New Words</button>
              <button class="btn btn-ghost btn-sm" type="button" data-learn-page="home">Back to Learn</button>
            </div>
          </section>`}
      </section>`;
  }
  return `
    <section class="panel learn-panel learn-placeholder" aria-labelledby="learnReviewTitle">
      ${renderLearnHeader(title, area.title, 'learnReviewTitle')}
      <section class="word-page-section">
        <h2>Planned Work</h2>
        <p>${escHtml(item.description)}</p>
      </section>
    </section>`;
}
function renderNewWordsPage(area){
  const item = learnChild(area, 'new-words');
  return `
    <section class="panel learn-panel" aria-labelledby="learnNewWordsTitle">
      ${renderLearnHeader('Start Learning Path', 'Choose a structured vocabulary goal.', 'learnNewWordsTitle')}
      <div class="learn-card-grid">
        ${learnCard({ title: 'Frequency Vocabulary', description: 'Build Greek or Hebrew vocabulary by frequency milestone.' }, 'vocabulary:frequency')}
        ${learnCard({ title: 'Book Vocabulary', description: 'Persist progress toward all vocabulary in a selected book.' }, 'vocabulary:book')}
        ${learnCard({ title: 'Chapter Vocabulary', description: 'Persist progress toward vocabulary in a selected chapter.' }, 'vocabulary:chapter')}
      </div>
    </section>`;
}
function renderChapterShell(){
  return `
    <section class="panel learn-panel" aria-labelledby="learnChapterPathTitle">
      ${renderLearnHeader('Chapter Vocabulary', 'Choose a testament.', 'learnChapterPathTitle')}
      <div class="learn-card-grid">
        ${learnCard({ title: 'Old Testament', description: 'Prepare Hebrew vocabulary by chapter.' }, 'vocabulary:chapter:old-testament')}
        ${learnCard({ title: 'New Testament', description: 'Prepare Greek vocabulary by chapter.' }, 'vocabulary:chapter:new-testament')}
      </div>
    </section>`;
}
function renderChapterTestamentBooks(testamentId){
  const testament = LearnTestaments[testamentId] || LearnTestaments['new-testament'];
  return `
    <section class="panel learn-panel learn-panel-wide" aria-labelledby="learnChapterBooksTitle">
      ${renderLearnHeader(testament.title, 'Choose a book, then a chapter.', 'learnChapterBooksTitle')}
      ${renderLearnBookGrid(testament.language, `vocabulary:chapter:${testament.language}`)}
    </section>`;
}
function renderFrequencyShell(){
  return `
    <section class="panel learn-panel" aria-labelledby="learnFrequencyTitle">
      ${renderLearnHeader('By Frequency', 'Choose a language.', 'learnFrequencyTitle')}
      <div class="learn-card-grid">
        ${learnCard({ title: 'Greek', description: 'Study Greek words by overall frequency.' }, 'vocabulary:frequency:greek')}
        ${learnCard({ title: 'Hebrew', description: 'Study Hebrew words by overall frequency.' }, 'vocabulary:frequency:hebrew')}
      </div>
    </section>`;
}
function renderLanguageFrequencyPage(language){
  const title = `${learnLanguageTitle(language)} Frequency`;
  return `
    <section class="panel learn-panel" aria-labelledby="learnLanguageFrequencyTitle">
      ${renderLearnHeader(title, 'Choose a frequency milestone.', 'learnLanguageFrequencyTitle')}
      ${renderLearnFrequencyCards(language, `vocabulary:frequency:${language}`)}
    </section>`;
}
function renderFrequencyPlaceholder(language, threshold, contextTitle = ''){
  const title = [learnLanguageTitle(language), learnFrequencyLabel(threshold)].join(' ');
  const page = contextTitle ? learnState.page : `vocabulary:frequency:${language}:${threshold}`;
  const scoped = contextTitle ? learnScopedProgressForPage(page) : null;
  if(contextTitle && !scoped){
    const route = learnScopedRoute(page);
    if(route?.mode === 'overall') ensureBookProgress(route.language, route.bookId);
    if(route?.mode === 'chapter') ensureChapterProgress(route.language, route.bookId, route.chapter);
    return `
      <section class="panel learn-panel" aria-labelledby="learnFrequencyLoadingTitle">
        ${renderLearnHeader(contextTitle || title, 'Study path', 'learnFrequencyLoadingTitle')}
        ${renderProgressLoading(contextTitle || title)}
      </section>`;
  }
  if(VocabularyLearningModel && (!contextTitle || scoped)){
    const path = learnPathForPage(page, language, threshold);
    const entries = learnEntriesForPath(path);
    const store = learnVocabularyStore();
    const remaining = VocabularyLearningModel.remainingNotLearnedCount(entries, store, path);
    const started = learnState.activeVocabularyPath === page;
    const current = started ? getLearnCurrentPathWord(path) : null;
    return `
      <section class="panel learn-panel" aria-labelledby="learnFrequencyLearningTitle">
        ${renderLearnHeader(title, learnFrequencyDescription(language, threshold), 'learnFrequencyLearningTitle')}
        <p class="muted small">${remaining} words remaining in this path</p>
        ${started ? (current ? `
          ${renderVocabularyLearningCard(current)}
          <div class="learn-vocab-actions">
            <button class="btn btn-primary" type="button" data-learn-word-learned="true" data-lang="${escHtml(language)}" data-threshold="${escHtml(threshold)}" data-path-page="${escHtml(page)}">Learn Another Word</button>
          </div>`
        : `<section class="word-page-section learn-explainer">
            <h2>Path complete</h2>
            <p>There are no Not Learned words remaining in this frequency path.</p>
            <div class="learn-vocab-actions">
              <button class="btn btn-primary btn-sm" type="button" data-learn-start-daily="${escHtml(language)}">Review Due Words</button>
              <button class="btn btn-ghost btn-sm" type="button" data-learn-page="home">Back to Learn</button>
            </div>
          </section>`)
        : `<section class="word-page-section learn-explainer">
            <h2>${escHtml(title)}</h2>
            <p>${escHtml(learnFrequencyDescription(language, threshold))}</p>
            <div class="learn-vocab-actions">
              <button class="btn btn-primary learn-start-learning-action" type="button" data-learn-start-path="${escHtml(page)}">Start Learning</button>
              ${contextTitle ? `<button class="btn btn-ghost btn-sm" type="button" data-learn-create-scope-set="${escHtml(page)}" data-scope-status="all">Create Custom Deck</button><button class="btn btn-ghost btn-sm" type="button" data-learn-create-scope-set="${escHtml(page)}" data-scope-status="not-learned">Unknown Words Deck</button>` : ''}
              <button class="btn btn-ghost btn-sm" type="button" data-learn-mark-path-known="true" data-lang="${escHtml(language)}" data-threshold="${escHtml(threshold)}" data-path-page="${escHtml(page)}">Mark Path as Known</button>
            </div>
          </section>`}
      </section>`;
  }
  return `
    <section class="panel learn-panel learn-placeholder" aria-labelledby="learnFrequencyPlaceholderTitle">
      ${renderLearnHeader(contextTitle || title, 'Future study path', 'learnFrequencyPlaceholderTitle')}
      <section class="word-page-section">
        <h2>${escHtml(title)}</h2>
        <p>${escHtml(learnFrequencyDescription(language, threshold))}</p>
        <p>This book or chapter path will be connected to vocabulary learning in a future release.</p>
      </section>
    </section>`;
}
function renderBookShell(){
  return `
    <section class="panel learn-panel" aria-labelledby="learnBookTitle">
      ${renderLearnHeader('By Book', 'Choose a testament.', 'learnBookTitle')}
      <div class="learn-card-grid">
        ${learnCard({ title: 'Old Testament', description: 'Prepare Hebrew vocabulary by book.' }, 'vocabulary:book:old-testament')}
        ${learnCard({ title: 'New Testament', description: 'Prepare Greek vocabulary by book.' }, 'vocabulary:book:new-testament')}
      </div>
    </section>`;
}
function renderTestamentBooks(testamentId){
  const testament = LearnTestaments[testamentId] || LearnTestaments['new-testament'];
  return `
    <section class="panel learn-panel learn-panel-wide" aria-labelledby="learnTestamentTitle">
      ${renderLearnHeader(testament.title, 'Choose a book.', 'learnTestamentTitle')}
      ${renderLearnBookGrid(testament.language, `vocabulary:book:${testament.language}`)}
    </section>`;
}
function renderBookStudyPage(language, bookId, options = {}){
  const book = learnBook(language, bookId);
  const basePage = options.basePage || `vocabulary:book:${language}:${book.id}`;
  const key = bookProgressKey(language, book.id);
  ensureBookProgress(language, book.id);
  const progress = learnState.progressCache[key];
  return `
    <section class="panel learn-panel" aria-labelledby="learnBookStudyTitle">
      ${renderLearnHeader(book.name, 'Book Progress', 'learnBookStudyTitle')}
      ${progress?.error ? renderProgressError(progress.error) : progress ? renderProgressStats(progress.overall) : renderProgressLoading('Book Progress')}
      <section class="learn-language-group" aria-labelledby="learnStudyTitle">
        <h2 id="learnStudyTitle">Study</h2>
        ${progress ? learnCard({ title: `${book.name} Vocabulary`, description: 'Study all vocabulary in this book as one persisted path.' }, `${basePage}:overall:all`, 'learn-card-compact') : ''}
        ${renderQuietFrequencyChoices(language, `${basePage}:overall`)}
        ${learnCard({ title: 'By Chapter', description: 'Study vocabulary for individual chapters.' }, `${basePage}:chapter`, 'learn-card-compact')}
        ${progress ? `<div class="learn-vocab-actions"><button class="btn btn-ghost btn-sm" type="button" data-learn-create-scope-set="${escHtml(`${basePage}:overall:all`)}" data-scope-status="all">Create Book Custom Deck</button><button class="btn btn-ghost btn-sm" type="button" data-learn-create-scope-set="${escHtml(`${basePage}:overall:all`)}" data-scope-status="not-learned">Unknown Words Deck</button></div>` : ''}
      </section>
    </section>`;
}
function renderBookOverallFrequencyPage(language, bookId, options = {}){
  const book = learnBook(language, bookId);
  const basePage = options.basePage || `vocabulary:book:${language}:${book.id}:overall`;
  const key = bookProgressKey(language, book.id);
  ensureBookProgress(language, book.id);
  const progress = learnState.progressCache[key];
  return `
    <section class="panel learn-panel" aria-labelledby="learnBookOverallTitle">
      ${renderLearnHeader('Overall Frequency', book.name, 'learnBookOverallTitle')}
      ${progress?.error ? renderProgressError(progress.error) : progress ? renderFrequencyProgressList(progress.frequency, basePage) : renderProgressLoading('Overall Frequency')}
    </section>`;
}
function renderChapterListPage(language, bookId, options = {}){
  const book = learnBook(language, bookId);
  const basePage = options.basePage || `vocabulary:book:${language}:${book.id}:chapter`;
  const key = bookProgressKey(language, book.id);
  ensureBookProgress(language, book.id);
  const progress = learnState.progressCache[key];
  return `
    <section class="panel learn-panel learn-panel-wide" aria-labelledby="learnChapterListTitle">
      ${renderLearnHeader('By Chapter', book.name, 'learnChapterListTitle')}
      ${progress?.error ? renderProgressError(progress.error) : progress ? `
        <div class="learn-chapter-grid learn-chapter-progress-grid">
          ${progress.byChapter.map(item => `
            <button class="learn-card learn-card-compact" type="button" data-learn-page="${escHtml(`${basePage}:${item.chapter}`)}">
              <span class="learn-card-title">${escHtml(String(item.chapter))}</span>
              <span class="learn-card-description">Known Vocabulary ${escHtml(String(item.known))} of ${escHtml(String(item.total))}</span>
              <span class="learn-card-description">Remaining Words ${escHtml(String(item.remaining))}</span>
            </button>`).join('')}
        </div>` : renderProgressLoading('Chapter Progress')}
    </section>`;
}
function renderChapterStudyPage(language, bookId, chapter, options = {}){
  const book = learnBook(language, bookId);
  const reference = `${book.name} ${Number(chapter) || 1}`;
  const basePage = options.basePage || `vocabulary:book:${language}:${book.id}:chapter:${Number(chapter) || 1}`;
  const key = chapterProgressKey(language, book.id, chapter);
  ensureChapterProgress(language, book.id, chapter);
  const progress = learnState.progressCache[key];
  return `
    <section class="panel learn-panel" aria-labelledby="learnChapterStudyTitle">
      ${renderLearnHeader(reference, 'Chapter Progress', 'learnChapterStudyTitle')}
      ${progress?.error ? renderProgressError(progress.error) : progress ? renderProgressStats(progress.overall) : renderProgressLoading('Chapter Progress')}
      <section class="learn-language-group" aria-labelledby="learnChapterStudyOptionsTitle">
        <h2 id="learnChapterStudyOptionsTitle">Study</h2>
        ${progress ? `${learnCard({ title: `${reference} Vocabulary`, description: 'Study all vocabulary in this chapter as one persisted path.' }, `${basePage}:all`, 'learn-card-compact')}${renderQuietFrequencyChoices(language, basePage)}` : ''}
      </section>
    </section>`;
}
function renderVocabularyPage(area){
  return `
    <section class="panel learn-panel" aria-labelledby="learnVocabularyTitle">
      ${renderLearnHeader(area.title, area.description, 'learnVocabularyTitle')}
      <div class="learn-card-grid">
        ${area.children.map(item => learnCard(item, `${area.id}:${item.id}`)).join('')}
      </div>
    </section>`;
}
function renderParadigmsPage(area){
  return `
    <section class="panel learn-panel" aria-labelledby="learnParadigmsTitle">
      ${renderLearnHeader(area.title, area.description, 'learnParadigmsTitle')}
      <div class="learn-card-grid">
        ${learnCard(area.children[0], 'paradigms:recognition-practice', 'learn-card-emphasis')}
        ${learnCard(area.children[1], 'paradigms:parsing-drills')}
      </div>
    </section>`;
}
function renderRecognitionPracticePage(area){
  return `
    <section class="panel learn-panel" aria-labelledby="learnRecognitionPracticeTitle">
      ${renderLearnHeader('Recognition Practice', 'Recognition Practice is the primary paradigm study path.', 'learnRecognitionPracticeTitle')}
      <div class="learn-language-grid">
        ${area.groups.map(group => `
          <section class="learn-language-group" aria-labelledby="learn-${escHtml(group.id)}">
            <h2 id="learn-${escHtml(group.id)}">${escHtml(group.title)}</h2>
            <div class="learn-card-grid learn-card-grid-compact">
              ${group.children.map(item => learnCard(item, `${area.id}:${item.id}`, item.emphasis ? 'learn-card-emphasis' : '')).join('')}
            </div>
          </section>`).join('')}
      </div>
    </section>`;
}
function renderParsingDrillsPage(){
  return renderParsingPracticeHome();
}
function parsingPracticeDraft(language){
  const normalized = language === 'hebrew' ? 'hebrew' : 'greek';
  return learnState.parsingDrafts[normalized] || { language: normalized, targetIds: [`${normalized}-verbs`, `${normalized}-nouns`], count: 10 };
}
function renderParsingPracticeHome(){
  return `<section class="panel learn-panel" aria-labelledby="learnParsingPracticeTitle">
    ${renderLearnHeader('Parsing Practice', 'Recognize grammatical forms without changing vocabulary progress.', 'learnParsingPracticeTitle')}
    <div class="learn-card-grid learn-language-choice-grid">
      ${learnCard({ title: 'Greek parsing', description: 'Recognize Greek verb and noun forms.' }, 'parsing:setup:greek')}
      ${learnCard({ title: 'Hebrew parsing', description: 'Recognize Hebrew verb and noun forms.' }, 'parsing:setup:hebrew')}
    </div>
  </section>`;
}
function renderParsingPracticeSetup(language){
  const draft = parsingPracticeDraft(language);
  const targets = ParadigmRecognitionModel?.recognitionTargets?.().filter(target => target.language === language) || [];
  const groups = [
    ['Broad recognition', targets.filter(target => target.id === `${language}-verbs` || target.id === `${language}-nouns`)],
    ['Specific supported paradigms', targets.filter(target => target.id !== `${language}-verbs` && target.id !== `${language}-nouns`)]
  ].filter(([,items]) => items.length);
  return `<section class="panel learn-panel" aria-labelledby="learnParsingSetupTitle">
    ${renderLearnHeader(`${learnLanguageTitle(language)} parsing practice`, 'Choose the forms and number of questions.', 'learnParsingSetupTitle')}
    <form class="word-page-section learn-profile-form" data-learn-parsing-start="${escHtml(language)}">
      <p class="small muted">Mixed recognition is selected by choosing both Verbs and Nouns; add or replace them with any specific supported paradigms below.</p>
      ${groups.map(([label,items]) => `<fieldset><legend>${escHtml(label)}</legend><div class="learn-paradigm-checklist">${items.map(target => `<label><input type="checkbox" name="targetIds" value="${escHtml(target.id)}" ${draft.targetIds.includes(target.id) ? 'checked' : ''}> <span><strong>${escHtml(target.title)}</strong><small>${escHtml(target.description)}</small></span></label>`).join('')}</div></fieldset>`).join('')}
      <label>Questions<select class="input" name="count">${[5,10,20,30].map(count => `<option value="${count}" ${draft.count === count ? 'selected' : ''}>${count}</option>`).join('')}</select></label>
      <div class="learn-vocab-actions"><button class="btn btn-primary" type="submit">Start parsing practice</button><button class="btn btn-ghost" type="button" data-learn-page="home">Return to Learn</button></div>
    </form>
  </section>`;
}
function startParsingRecognitionPractice(language, targetIds = [], count = 10){
  const normalizedLanguage = language === 'hebrew' ? 'hebrew' : 'greek';
  const normalizedCount = [5,10,20,30].includes(Number(count)) ? Number(count) : 10;
  const supported = new Set((ParadigmRecognitionModel?.recognitionTargets?.() || []).filter(target => target.language === normalizedLanguage).map(target => target.id));
  const selectedTargetIds = [...new Set((Array.isArray(targetIds) ? targetIds : []).filter(id => supported.has(id)))];
  if(!selectedTargetIds.length) selectedTargetIds.push(`${normalizedLanguage}-verbs`, `${normalizedLanguage}-nouns`);
  const built = ParadigmRecognitionModel?.createCombinedSession?.(selectedTargetIds, { id: `parsing-${normalizedLanguage}-selected`, title: `${learnLanguageTitle(normalizedLanguage)} parsing practice` });
  const items = (built?.items || []).slice().sort((a,b) => (LearningPracticeModel.stableHash(`${todayISO()}:${a.id}`) - LearningPracticeModel.stableHash(`${todayISO()}:${b.id}`)) || a.id.localeCompare(b.id)).slice(0, normalizedCount);
  learnState.parsingDrafts[normalizedLanguage] = { language: normalizedLanguage, targetIds: selectedTargetIds, count: normalizedCount };
  learnState.parsingRecognitionSession = { language: normalizedLanguage, targetIds: selectedTargetIds, count: normalizedCount, items, index: 0, revealed: false, recognized: 0, missed: 0, recorded: false };
  setLearnPage('parsing:session');
  return learnState.parsingRecognitionSession;
}
function revealParsingRecognition(){
  if(learnState.parsingRecognitionSession) learnState.parsingRecognitionSession.revealed = true;
  renderLearn();
}
function gradeParsingRecognition(result){
  const session = learnState.parsingRecognitionSession;
  if(!session || !session.revealed) return false;
  if(result === 'recognized') session.recognized += 1;
  else session.missed += 1;
  session.index += 1;
  session.revealed = false;
  if(!session.recorded && session.index >= session.items.length && LearnProgressModel?.recordRecognitionSession){
    LearnProgressModel.recordRecognitionSession({ ...session, total: session.items.length, targetId: `parsing-${session.language}-selected` });
    session.recorded = true;
  }
  renderLearn();
  return true;
}
function renderParsingRecognitionSession(){
  const session = learnState.parsingRecognitionSession;
  if(!session) return `<section class="panel learn-panel">${renderLearnHeader('Parsing Practice', 'No active parsing session.', 'learnParsingSessionTitle')}<button class="btn btn-primary" type="button" data-learn-page="parsing">Return to parsing setup</button></section>`;
  const current = session.items[session.index];
  const done = !current;
  const familyLabel = session.family === 'mixed' ? 'Mixed recognition' : session.family === 'nouns' ? 'Nouns' : 'Verbs';
  const activeControls = done ? '' : session.revealed
    ? `<section class="word-page-section learn-recognition-answer"><h2>${current.answerLines.map(escHtml).join('<br>')}</h2><div class="learn-recognition-clues"><p>Recognition clues</p><ul>${(current.clues || []).slice(0,3).map(clue => `<li>${escHtml(clue)}</li>`).join('')}</ul></div><div class="learn-vocab-actions"><button class="learn-review-action learn-review-recognized" type="button" data-learn-parsing-grade="recognized">I recognized it</button><button class="learn-review-action learn-review-missed" type="button" data-learn-parsing-grade="missed">I missed it</button></div></section>`
    : `<div class="learn-vocab-actions"><button class="btn btn-primary learn-review-action learn-review-reveal" type="button" data-learn-parsing-reveal="true">Reveal parsing</button><button class="btn btn-ghost" type="button" data-learn-page="parsing:setup:${escHtml(session.language)}">Return to setup</button></div>`;
  const content = done
    ? `<section class="word-page-section learn-explainer"><h2>Parsing practice complete</h2><p>Recognized ${session.recognized}; missed ${session.missed}.</p><div class="learn-vocab-actions"><button class="btn btn-primary" type="button" data-learn-restart-parsing="true">Practice again</button><button class="btn btn-ghost" type="button" data-learn-page="home">Return to Learn</button></div></section>`
    : `<article class="learn-vocab-card learn-recognition-card" dir="${session.language === 'hebrew' ? 'rtl' : 'ltr'}"><p class="learn-recognition-prompt">Recognize this form.</p><h2>${escHtml(current.form)}</h2></article>${activeControls}`;
  return `<section class="panel learn-panel learn-parsing-session" aria-labelledby="learnParsingSessionTitle">
    ${renderLearnHeader(`${learnLanguageTitle(session.language)} parsing practice`, familyLabel, 'learnParsingSessionTitle')}
    <div class="learn-recognition-progress"><span>${Math.min(session.index + (done ? 0 : 1), session.items.length)} of ${session.items.length}</span><span>Recognized ${session.recognized}</span><span>Missed ${session.missed}</span></div>
    ${content}
  </section>`;
}
function recognitionTargetsForLearn(categoryId = ''){
  const targets = ParadigmRecognitionModel?.recognitionTargets ? ParadigmRecognitionModel.recognitionTargets() : [];
  if(!categoryId) return targets;
  if(['greek-verbs','greek-nouns','hebrew-verbs','hebrew-nouns'].includes(categoryId)){
    return targets.filter(target => target.language === categoryId.split('-')[0] && target.kind === categoryId.split('-')[1]);
  }
  return targets.filter(target => target.id === categoryId);
}
function recognitionTargetForLearn(targetId){
  return ParadigmRecognitionModel?.recognitionTarget ? ParadigmRecognitionModel.recognitionTarget(targetId) : null;
}
function selectedRecognitionTargetIds(categoryId = ''){
  return Array.from(learnState.selectedRecognitionTargets?.[categoryId] || []);
}
function toggleRecognitionSelection(categoryId, targetId){
  if(!categoryId || !targetId) return [];
  if(!learnState.selectedRecognitionTargets) learnState.selectedRecognitionTargets = {};
  const selected = new Set(learnState.selectedRecognitionTargets[categoryId] || []);
  if(selected.has(targetId)) selected.delete(targetId);
  else selected.add(targetId);
  learnState.selectedRecognitionTargets[categoryId] = selected;
  renderLearn();
  return Array.from(selected);
}
function clearRecognitionSelection(categoryId){
  if(learnState.selectedRecognitionTargets) learnState.selectedRecognitionTargets[categoryId] = new Set();
  renderLearn();
}
function recognitionCategoryPageTitle(categoryId){
  const [language, kind] = String(categoryId || '').split('-');
  return `${learnLanguageTitle(language)} ${kind === 'nouns' ? 'Nouns' : 'Verbs'}`;
}
function startRecognitionSession(targetId, categoryId = ''){
  const session = ParadigmRecognitionModel?.createSession ? ParadigmRecognitionModel.createSession(targetId) : null;
  learnState.recognitionSession = session ? { targetId, selectedTargetIds: session.selectedTargetIds || [targetId], index: 0, revealed: false, recognized: 0, missed: 0, total: session.total || session.items?.length || 0, recorded: false } : null;
  if(categoryId && learnState.page !== `paradigms:${categoryId}:session:${targetId}`){
    setLearnPage(`paradigms:${categoryId}:session:${targetId}`);
    return;
  }
  renderLearn();
}
function startSelectedRecognitionSession(categoryId){
  const ids = selectedRecognitionTargetIds(categoryId);
  if(!ids.length) return null;
  const targetId = `selected-${categoryId}`;
  const session = ParadigmRecognitionModel?.createCombinedSession ? ParadigmRecognitionModel.createCombinedSession(ids, { id: targetId, title: 'Selected Paradigms', categoryId }) : null;
  learnState.recognitionSession = session ? { targetId, selectedTargetIds: ids, index: 0, revealed: false, recognized: 0, missed: 0, total: session.total || session.items?.length || 0, recorded: false } : null;
  setLearnPage(`paradigms:${categoryId}:session:${targetId}`);
  return learnState.recognitionSession;
}
function revealRecognitionAnswer(){
  if(learnState.recognitionSession) learnState.recognitionSession.revealed = true;
  renderLearn();
}
function gradeRecognitionAnswer(result){
  const session = learnState.recognitionSession;
  if(!session) return;
  if(result === 'recognized') session.recognized += 1;
  else session.missed += 1;
  session.index += 1;
  session.revealed = false;
  if(!session.recorded && session.index >= (session.total || 0) && LearnProgressModel?.recordRecognitionSession){
    LearnProgressModel.recordRecognitionSession(session);
    session.recorded = true;
  }
  renderLearn();
}
function openLearnReference(topicId, sectionId = ''){
  const api = (typeof PuritanReferenceLibrary !== 'undefined')
    ? PuritanReferenceLibrary
    : (typeof require === 'function' ? require('../grammar/reference-data') : null);
  if(typeof state !== 'undefined' && topicId){
    const topic = api?.getReferenceTopic?.(topicId);
    if(topic?.language === 'greek' || topic?.language === 'hebrew') state.lang = topic.language;
    if(topic?.language && typeof setReferenceLanguage === 'function') setReferenceLanguage(topic.language, { render: false });
  }
  if(typeof showView === 'function') showView('grammarView');
  if(typeof navigateTo === 'function') navigateTo('/grammar');
  if(typeof renderReferenceLibrary === 'function') renderReferenceLibrary(topicId);
  if(sectionId && typeof document !== 'undefined'){
    setTimeout(() => {
      const target = document.getElementById(sectionId);
      if(target){
        if(target.tagName === 'DETAILS') target.open = true;
        target.scrollIntoView({ behavior:'smooth', block:'start' });
      }
    }, 0);
  }
}
function renderRecognitionCategoryPage(categoryId){
  const targets = recognitionTargetsForLearn(categoryId);
  const groupedTarget = targets.find(target => target.id === categoryId);
  const specificTargets = targets.filter(target => target.id !== categoryId);
  const selected = selectedRecognitionTargetIds(categoryId);
  return `
    <section class="panel learn-panel learn-panel-wide" aria-labelledby="learnRecognitionCategoryTitle">
      ${renderLearnHeader(recognitionCategoryPageTitle(categoryId), 'Choose grouped practice or one paradigm.', 'learnRecognitionCategoryTitle')}
      ${groupedTarget ? `
        <section class="word-page-section learn-explainer">
          <h2>${escHtml(groupedTarget.title)}</h2>
          <p>${escHtml(groupedTarget.description)}</p>
          <div class="learn-vocab-actions">
            <button class="btn btn-primary learn-start-learning-action" type="button" data-learn-recognition-start="${escHtml(groupedTarget.id)}" data-learn-recognition-category="${escHtml(categoryId)}">Start All</button>
            <button class="btn btn-ghost btn-sm" type="button" data-learn-recognition-start-selected="${escHtml(categoryId)}"${selected.length ? '' : ' disabled'}>Start Selected</button>
            <button class="btn btn-ghost btn-sm" type="button" data-learn-recognition-clear="${escHtml(categoryId)}">Clear Selection</button>
          </div>
          ${selected.length ? `<p class="small muted">${escHtml(String(selected.length))} selected.</p>` : '<p class="small muted">Select one or more paradigms below to build a focused session.</p>'}
        </section>` : ''}
      <section class="learn-language-group">
        <h2>Paradigms</h2>
        <div class="learn-card-grid">
          ${specificTargets.map(target => `
            <article class="learn-card learn-card-compact${selected.includes(target.id) ? ' active' : ''}">
              <span class="learn-card-title">${escHtml(target.title)}</span>
              <span class="learn-card-description">${escHtml(target.description)}</span>
              <div class="learn-vocab-actions">
                <button class="btn btn-ghost btn-sm" type="button" data-learn-recognition-select="${escHtml(target.id)}" data-learn-recognition-category="${escHtml(categoryId)}">${selected.includes(target.id) ? 'Selected' : 'Select'}</button>
                <button class="btn btn-primary btn-sm" type="button" data-learn-page="paradigms:${escHtml(categoryId)}:session:${escHtml(target.id)}">Practice</button>
              </div>
            </article>`).join('') || '<p class="muted">No verified recognition items are available for this category yet.</p>'}
        </div>
      </section>
    </section>`;
}
function renderRecognitionSessionPage(categoryId, targetId){
  const active = learnState.recognitionSession?.targetId === targetId ? learnState.recognitionSession : null;
  const built = targetId.startsWith('selected-') && active?.selectedTargetIds?.length && ParadigmRecognitionModel?.createCombinedSession
    ? ParadigmRecognitionModel.createCombinedSession(active.selectedTargetIds, { id: targetId, title: 'Selected Paradigms', categoryId })
    : (ParadigmRecognitionModel?.createSession ? ParadigmRecognitionModel.createSession(targetId) : null);
  const target = built?.target || recognitionTargetForLearn(targetId);
  const items = built?.items || [];
  const sessionState = active || { targetId, index: 0, revealed: false, recognized: 0, missed: 0, total: built?.total || items.length, recorded: false };
  if(!active) learnState.recognitionSession = sessionState;
  const current = items[sessionState.index];
  const done = !current;
  return `
    <section class="panel learn-panel" aria-labelledby="learnRecognitionSessionTitle">
      ${renderLearnHeader(target?.title || 'Recognition Practice', target?.description || 'Recognize one form at a time.', 'learnRecognitionSessionTitle')}
      <div class="learn-recognition-progress">
        <span>${escHtml(String(Math.min(sessionState.index + (done ? 0 : 1), items.length)))} of ${escHtml(String(items.length))}</span>
        <span>Recognized ${escHtml(String(sessionState.recognized))}</span>
        <span>Missed ${escHtml(String(sessionState.missed))}</span>
      </div>
      ${done ? `
        <section class="word-page-section learn-explainer">
          <h2>Session complete</h2>
          <p>Recognized ${escHtml(String(sessionState.recognized))}; missed ${escHtml(String(sessionState.missed))}.</p>
          <div class="learn-vocab-actions">
            <button class="btn btn-primary learn-start-learning-action" type="button" data-learn-recognition-start="${escHtml(targetId)}" data-learn-recognition-category="${escHtml(categoryId)}">Restart Recognition</button>
            <button class="btn btn-ghost btn-sm" type="button" data-learn-page="paradigms:${escHtml(categoryId)}">Choose Another Paradigm</button>
          </div>
        </section>` : `
        <article class="learn-vocab-card learn-recognition-card" dir="${target?.language === 'hebrew' ? 'rtl' : 'ltr'}">
          <p class="learn-recognition-prompt">${escHtml(current.prompt)}</p>
          <h2>${escHtml(current.form)}</h2>
        </article>
        ${sessionState.revealed ? `
          <section class="word-page-section learn-recognition-answer">
            <h2>${current.answerLines.map(escHtml).join('<br>')}</h2>
            <div class="learn-recognition-clues">
              <p>Recognition clues</p>
              <ul>${(current.clues || []).slice(0, 3).map(clue => `<li>${escHtml(clue)}</li>`).join('')}</ul>
            </div>
            <div class="learn-vocab-actions">
              <button class="learn-review-action learn-review-recognized" type="button" data-learn-recognition-grade="recognized">I recognized it</button>
              <button class="learn-review-action learn-review-missed" type="button" data-learn-recognition-grade="missed">I missed it</button>
              <button class="btn btn-ghost btn-sm" type="button" data-learn-reference-topic="${escHtml(current.referenceTopicId)}" data-learn-reference-section="${escHtml(current.referenceSectionId || '')}">View Reference</button>
            </div>
          </section>` : `
          <div class="learn-vocab-actions">
            <button class="btn btn-primary learn-review-action learn-review-reveal" type="button" data-learn-recognition-reveal="true">Reveal Answer</button>
            <button class="btn btn-ghost btn-sm" type="button" data-learn-reference-topic="${escHtml(current.referenceTopicId)}" data-learn-reference-section="${escHtml(current.referenceSectionId || '')}">View Reference</button>
          </div>`}`}
    </section>`;
}
function renderReadingReadinessPage(area){
  return `
    <section class="panel learn-panel" aria-labelledby="learnReadinessTitle">
      ${renderLearnHeader(area.title, area.description, 'learnReadinessTitle')}
      <div class="learn-card-grid">
        ${area.children.map(item => learnCard(item, `${area.id}:${item.id}`)).join('')}
      </div>
    </section>`;
}
function renderReadingReadinessBooks(testamentId){
  const testament = LearnTestaments[testamentId] || LearnTestaments['new-testament'];
  return `
    <section class="panel learn-panel learn-panel-wide" aria-labelledby="learnReadinessBooksTitle">
      ${renderLearnHeader(testament.title, 'Choose a book.', 'learnReadinessBooksTitle')}
      ${renderLearnBookGrid(testament.language, `reading-readiness:${testamentId}`)}
    </section>`;
}
function maintenanceConfig(language = 'greek'){
  const current = learnState.maintenanceConfig || {};
  const books = learnBookList(language);
  const selectedGrades = Array.isArray(current.selectedGrades)
    ? LearnMaintenanceGradeLetters.filter(letter => current.selectedGrades.includes(letter))
    : LearnMaintenanceDefaultGrades.slice();
  const sameLanguage = current.language === language;
  const savedBookId = sameLanguage ? current.bookId : '';
  return {
    language,
    source: current.source === 'book' ? 'book' : 'all',
    order: current.order === 'random' ? 'random' : 'reinforcement',
    selectedGrades,
    size: current.size === undefined ? '20' : String(current.size),
    unlimited: current.unlimited === true,
    bookId: books.some(book => book.id === savedBookId) ? savedBookId : books[0]?.id || ''
  };
}
function maintenanceBookIds(language, bookId){
  const progress = learnState.progressCache[bookProgressKey(language, bookId)];
  const words = progress?.overall?.vocabulary || progress?.vocabulary || [];
  return new Set(words.map(item => learnWordId(item.entry || item)).filter(Boolean));
}
function parseMaintenanceSessionSize(value, unlimited = false){
  if(unlimited) return { valid: true, value: 'unlimited' };
  const raw = String(value ?? '').trim();
  if(!raw) return { valid: false, error: 'Enter a session size from 1 to 200.' };
  if(!/^\d+$/.test(raw)) return { valid: false, error: 'Session size must be a whole number from 1 to 200.' };
  const number = Number(raw);
  if(number < 1 || number > LearnMaintenanceSessionSizeMax) return { valid: false, error: 'Session size must be from 1 to 200.' };
  return { valid: true, value: number };
}
function maintenanceScopedCandidates(config, selectedGrades = config.selectedGrades){
  const options = { selectedGrades };
  if(config.source === 'book') options.bookIds = maintenanceBookIds(config.language, config.bookId);
  let candidates = VocabularyMasteryModel?.knownCandidates(
    learnVocabularyEntries(config.language),
    learnVocabularyStore(),
    VocabularyLearningModel,
    options
  ) || [];
  if(config.source === 'book') candidates = candidates.filter(item => options.bookIds.has(item.id));
  return candidates;
}
function maintenanceSetupState(config){
  const size = parseMaintenanceSessionSize(config.size, config.unlimited);
  const books = learnBookList(config.language);
  const validBook = config.source !== 'book' || books.some(book => book.id === config.bookId);
  const bookKey = bookProgressKey(config.language, config.bookId);
  const bookLoading = config.source === 'book' && !learnState.progressCache[bookKey];
  const selectedGrades = LearnMaintenanceGradeLetters.filter(letter => config.selectedGrades.includes(letter));
  const allKnown = bookLoading || !validBook ? [] : maintenanceScopedCandidates(config, LearnMaintenanceGradeLetters);
  const eligible = bookLoading || !validBook || !selectedGrades.length ? [] : maintenanceScopedCandidates(config, selectedGrades);
  let error = '';
  if(!selectedGrades.length) error = 'Select at least one mastery grade.';
  else if(!size.valid) error = size.error;
  else if(!validBook) error = 'Choose a valid book for this language.';
  else if(bookLoading) error = 'Book vocabulary is loading.';
  else if(!allKnown.length) error = config.source === 'book'
    ? 'No known words are available in this book. Choose another book or vocabulary scope.'
    : `No known ${config.language} words are available yet.`;
  else if(!eligible.length) error = 'No known words match the selected mastery grades.';
  return { size, selectedGrades, allKnown, eligible, error, valid: !error };
}
function startLearnMaintenanceSession(values = {}){
  if(!VocabularyMasteryModel || !VocabularyLearningModel) return null;
  const language = values.language === 'hebrew' ? 'hebrew' : 'greek';
  const books = learnBookList(language);
  const requestedGrades = Array.isArray(values.selectedGrades) ? values.selectedGrades : LearnMaintenanceDefaultGrades;
  const selectedGrades = LearnMaintenanceGradeLetters.filter(letter => requestedGrades.includes(letter));
  const config = {
    language,
    source: values.source === 'book' ? 'book' : 'all',
    order: values.order === 'random' ? 'random' : 'reinforcement',
    selectedGrades,
    size: String(values.size ?? ''),
    unlimited: values.unlimited === true,
    bookId: books.some(book => book.id === values.bookId) ? values.bookId : books[0]?.id || ''
  };
  learnState.maintenanceConfig = config;
  let bookIds;
  if(config.source === 'book'){
    ensureBookProgress(language, config.bookId);
    const key = bookProgressKey(language, config.bookId);
    if(!learnState.progressCache[key]){
      learnState.maintenanceError = 'Book vocabulary is loading.';
      renderLearn();
      return null;
    }
    bookIds = maintenanceBookIds(language, config.bookId);
  }
  const setup = maintenanceSetupState(config);
  if(!setup.valid){
    learnState.maintenanceError = setup.error;
    renderLearn();
    return null;
  }
  const immutableConfig = Object.freeze({
    language,
    source: config.source,
    bookId: config.source === 'book' ? config.bookId : null,
    order: config.order,
    selectedGrades: Object.freeze(selectedGrades.slice()),
    size: setup.size.value,
    unlimited: config.unlimited
  });
  const store = learnVocabularyStore();
  const built = VocabularyMasteryModel.buildMaintenanceSession(
    learnVocabularyEntries(language),
    store,
    VocabularyLearningModel,
    { ...immutableConfig, bookIds, random: values.random }
  );
  const daily = learnDailyPracticeSummary(language);
  learnState.maintenanceError = '';
  learnState.maintenanceSession = {
    ...immutableConfig,
    configuration: immutableConfig,
    entries: built.entries.slice(),
    index: 0,
    revealed: false,
    recognized: 0,
    missed: 0,
    results: [],
    stopped: false,
    limitedByPool: built.limitedByPool,
    startingGoalCount: daily.combined
  };
  renderLearn();
  return learnState.maintenanceSession;
}
function revealLearnMaintenance(){
  if(!learnState.maintenanceSession) return;
  learnState.maintenanceSession.revealed = true;
  renderLearn();
}
function gradeLearnMaintenance(result){
  const session = learnState.maintenanceSession;
  const currentIndex = session?.size === 'unlimited' && session.entries?.length
    ? session.index % session.entries.length
    : session?.index;
  const current = session?.entries?.[currentIndex];
  if(!session || !current || !VocabularyLearningModel) return;
  const confidence = LearningPracticeModel.confidenceOf(result);
  const normalizedResult = LearningPracticeModel.confidenceResult(confidence);
  const before = learnMasteryGrade(current);
  const scheduleUpdated = LearningPracticeModel.loadMaintenancePreference(learnStorage()).enabled;
  persistStandaloneConfidence(current, confidence, { practiceType: 'maintenance', phase: 'maintenance', promptDirection: 'reading', scheduleUpdated });
  const after = learnMasteryGrade(current);
  session.results.push({
    id: learnWordId(current),
    result: normalizedResult,
    confidence,
    before: before?.letter || 'C',
    after: after?.letter || 'C'
  });
  if(normalizedResult === 'recognized') session.recognized += 1;
  else session.missed += 1;
  session.index += 1;
  session.revealed = false;
  renderLearn();
}
function stopLearnMaintenance(){
  if(!learnState.maintenanceSession) return;
  learnState.maintenanceSession.stopped = true;
  renderLearn();
}
function resetLearnMaintenance(){
  learnState.maintenanceSession = null;
  learnState.maintenanceError = '';
  const language = learnState.page.split(':')[2] === 'hebrew' ? 'hebrew' : 'greek';
  learnState.maintenanceConfig = {
    language,
    source: 'all',
    order: 'reinforcement',
    selectedGrades: LearnMaintenanceDefaultGrades.slice(),
    size: '20',
    unlimited: false,
    bookId: learnBookList(language)[0]?.id || ''
  };
  renderLearn();
}
function chooseLearnMaintenanceFocus(){
  learnState.maintenanceSession = null;
  learnState.maintenanceError = '';
  renderLearn();
}
function selectAllLearnMaintenanceGrades(language){
  learnState.maintenanceConfig = {
    ...maintenanceConfig(language === 'hebrew' ? 'hebrew' : 'greek'),
    selectedGrades: LearnMaintenanceGradeLetters.slice()
  };
  learnState.maintenanceError = '';
  renderLearn();
  return learnState.maintenanceConfig.selectedGrades.slice();
}
function renderMaintenanceLanguageChoices(){
  return `
    <section class="panel learn-panel" aria-labelledby="learnMaintenanceLanguageTitle">
      ${renderLearnHeader('Maintenance practice', 'Practice known words without waiting for a due date.', 'learnMaintenanceLanguageTitle')}
      <div class="learn-card-grid">
        ${learnCard({ title: 'Greek', description: 'Practice known Greek words.' }, 'vocabulary:maintenance:greek')}
        ${learnCard({ title: 'Hebrew', description: 'Practice known Hebrew words.' }, 'vocabulary:maintenance:hebrew')}
      </div>
      <p class="small muted">Maintenance scheduling follows the single global On/Off preference.</p>
    </section>`;
}
function renderMaintenanceSetup(language){
  ensureLearnManifest(language);
  const config = maintenanceConfig(language);
  learnState.maintenanceConfig = config;
  if(config.source === 'book') ensureBookProgress(language, config.bookId);
  const setup = maintenanceSetupState(config);
  const distribution = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  setup.allKnown.forEach(item => { distribution[item.grade.letter] += 1; });
  const book = learnBookList(language).find(item => item.id === config.bookId);
  const gradeText = setup.selectedGrades.length === 1
    ? setup.selectedGrades[0]
    : `${setup.selectedGrades.slice(0, -1).join(', ')}${setup.selectedGrades.length > 1 ? `, and ${setup.selectedGrades.at(-1)}` : ''}`;
  const finiteCount = setup.size.valid && setup.size.value !== 'unlimited'
    ? Math.min(setup.size.value, setup.eligible.length)
    : setup.eligible.length;
  const sizeSummary = config.unlimited ? 'Continue until stopped' : `${finiteCount} ${finiteCount === 1 ? 'word' : 'words'}`;
  const poolNote = setup.valid && !config.unlimited && setup.eligible.length < setup.size.value
    ? `${setup.eligible.length} eligible ${setup.eligible.length === 1 ? 'word is' : 'words are'} available, so this session will contain ${setup.eligible.length} ${setup.eligible.length === 1 ? 'word' : 'words'}.`
    : '';
  const setupError = learnState.maintenanceError || setup.error;
  return `
    <section class="panel learn-panel" aria-labelledby="learnMaintenanceSetupTitle">
      ${renderLearnHeader(`${learnLanguageTitle(language)} maintenance practice`, 'Choose what to practice, then begin.', 'learnMaintenanceSetupTitle')}
      <form class="learn-maintenance-setup word-page-section" data-learn-maintenance-start="true">
        <input type="hidden" name="language" value="${escHtml(language)}" />
        <label>Vocabulary scope
          <select class="input" name="source">
            <option value="all" ${config.source === 'all' ? 'selected' : ''}>All known vocabulary</option>
            <option value="book" ${config.source === 'book' ? 'selected' : ''}>One selected book</option>
          </select>
          <small>Uses known words from the active language within the selected mastery grades.</small>
        </label>
        ${config.source === 'book' ? `<label>Book
          <select class="input" name="bookId">
            ${learnBookList(language).map(book => `<option value="${escHtml(book.id)}" ${config.bookId === book.id ? 'selected' : ''}>${escHtml(book.name)}</option>`).join('')}
          </select>
        </label>` : ''}
        <label>Practice order
          <select class="input" name="order">
            <option value="reinforcement" ${config.order === 'reinforcement' ? 'selected' : ''}>Words needing reinforcement</option>
            <option value="random" ${config.order === 'random' ? 'selected' : ''}>Random order</option>
          </select>
        </label>
        <fieldset class="learn-maintenance-grades">
          <legend>Mastery grades</legend>
          <div class="learn-maintenance-grade-options">
            ${LearnMaintenanceGradeLetters.map(letter => `<label><input type="checkbox" name="selectedGrades" value="${letter}" ${config.selectedGrades.includes(letter) ? 'checked' : ''} /><span>${letter} — ${escHtml(VocabularyMasteryModel.GRADE_META[letter].label)} (${distribution[letter]})</span></label>`).join('')}
          </div>
          <button class="btn btn-ghost btn-sm" type="button" data-learn-maintenance-select-all="true">Select all grades</button>
          <small>Counts reflect the selected vocabulary scope.</small>
        </fieldset>
        <fieldset class="learn-maintenance-size">
          <legend>Session size</legend>
          <label>Number of words
            <input class="input" type="number" name="size" value="${escHtml(config.size)}" min="1" max="${LearnMaintenanceSessionSizeMax}" step="1" inputmode="numeric" ${config.unlimited ? 'disabled aria-disabled="true"' : ''} aria-describedby="learnMaintenanceSizeHelp" />
          </label>
          <small id="learnMaintenanceSizeHelp">Choose a whole number from 1 to ${LearnMaintenanceSessionSizeMax}.</small>
          <label class="learn-maintenance-toggle">
            <input type="checkbox" name="unlimited" ${config.unlimited ? 'checked' : ''} />
            <span><strong>Continue until stopped</strong><small>Uses a bounded word pool and does not create an unbounded queue.</small></span>
          </label>
        </fieldset>
        <p class="small muted">Maintenance scheduling follows Settings → Learn → Maintenance Practice.</p>
        <section class="learn-maintenance-summary" aria-labelledby="learnMaintenanceSummaryTitle">
          <h2 id="learnMaintenanceSummaryTitle">Session summary</h2>
          <ul>
            <li>${escHtml(sizeSummary)}</li>
            <li>${config.source === 'book' ? `${escHtml(book?.name || 'Selected book')} known ${escHtml(learnLanguageTitle(language))} vocabulary` : `All known ${escHtml(learnLanguageTitle(language))} vocabulary`}</li>
            <li>${setup.selectedGrades.length ? `Grades ${escHtml(gradeText)}` : 'No mastery grades selected'}</li>
            <li>${config.order === 'random' ? 'Random order' : 'Words needing reinforcement'}</li>
            <li>${LearningPracticeModel.loadMaintenancePreference(learnStorage()).enabled ? 'Review schedule will be updated' : 'Review schedule unchanged'}</li>
          </ul>
          ${poolNote ? `<p class="small muted">${escHtml(poolNote)}</p>` : ''}
        </section>
        ${setupError ? `<p id="learnMaintenanceError" class="learn-custom-frequency-error" role="status" aria-live="polite">${escHtml(setupError)}</p>` : ''}
        <button class="btn btn-primary" type="submit" ${setup.valid ? '' : 'disabled aria-disabled="true" aria-describedby="learnMaintenanceError"'}>Start maintenance practice</button>
      </form>
    </section>`;
}
function renderMaintenanceCompletion(session){
  const daily = learnDailyPracticeSummary(session.language);
  const gradeChanges = session.results.filter(item => item.before !== item.after);
  const distribution = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  session.results.forEach(item => { distribution[item.before] = (distribution[item.before] || 0) + 1; });
  return `
    <section class="word-page-section learn-explainer" aria-labelledby="learnMaintenanceCompleteTitle">
      <h2 id="learnMaintenanceCompleteTitle">${session.stopped ? 'Maintenance practice stopped' : 'Maintenance practice complete'}</h2>
      <dl class="learn-session-summary">
        <div><dt>Words practiced</dt><dd>${escHtml(String(new Set(session.results.map(item => item.id)).size))}</dd></div>
        <div><dt>Added to today’s goal</dt><dd>${escHtml(String(Math.max(0, daily.combined - session.startingGoalCount)))}</dd></div>
        <div><dt>Recognized</dt><dd>${escHtml(String(session.recognized))}</dd></div>
        <div><dt>Missed</dt><dd>${escHtml(String(session.missed))}</dd></div>
        <div><dt>Schedule adjusted</dt><dd>${LearningPracticeModel.loadMaintenancePreference(learnStorage()).enabled ? 'Yes' : 'No'}</dd></div>
        <div><dt>Daily goal</dt><dd>${escHtml(String(daily.combined))} of ${escHtml(String(daily.target))}</dd></div>
      </dl>
      <p class="small muted">Grades practiced: A ${distribution.A}, B ${distribution.B}, C ${distribution.C}, D ${distribution.D}, F ${distribution.F}. ${gradeChanges.length ? `${gradeChanges.length} ${gradeChanges.length === 1 ? 'word has' : 'words have'} updated mastery evidence.` : 'No mastery grade changed in this session.'}</p>
      <div class="learn-vocab-actions">
        <button class="btn btn-primary" type="button" data-learn-maintenance-reset="true">Practice more weak words</button>
        <button class="btn btn-ghost btn-sm" type="button" data-learn-maintenance-choose="true">Choose another focus</button>
        <button class="btn btn-ghost btn-sm" type="button" data-learn-page="home">Return to Learn</button>
      </div>
    </section>`;
}
function renderMaintenancePracticePage(language){
  const session = learnState.maintenanceSession;
  if(!session || session.language !== language) return renderMaintenanceSetup(language);
  const currentIndex = session.size === 'unlimited' && session.entries.length
    ? session.index % session.entries.length
    : session.index;
  const current = session.entries[currentIndex];
  if(session.stopped || !current) return `
    <section class="panel learn-panel" aria-labelledby="learnMaintenanceTitle">
      ${renderLearnHeader('Maintenance practice', 'Session summary', 'learnMaintenanceTitle')}
      ${renderMaintenanceCompletion(session)}
    </section>`;
  const grade = learnMasteryGrade(current);
  return `
    <section class="panel learn-panel" aria-labelledby="learnMaintenanceTitle">
      ${renderLearnHeader('Maintenance practice', LearningPracticeModel.loadMaintenancePreference(learnStorage()).enabled ? 'Schedule updates On' : 'Schedule updates Off', 'learnMaintenanceTitle')}
      <div class="learn-recognition-progress" role="status">
        <span>${session.size === 'unlimited' ? `${session.index + 1} practiced` : `${session.index + 1} of ${session.entries.length}`}</span>
        <span>Recognized ${session.recognized}</span>
        <span>Missed ${session.missed}</span>
      </div>
      ${renderVocabularyLearningCard(current, { revealed: session.revealed, showMastery: true })}
      <p class="small muted">Current mastery: ${escHtml(grade?.letter || 'C')} — ${escHtml(grade?.label || 'Developing')}.</p>
      <div class="learn-vocab-actions">
        ${session.revealed
          ? renderConfidenceControls('data-learn-maintenance-grade')
          : '<button class="btn btn-primary learn-review-action learn-review-reveal" type="button" data-learn-maintenance-reveal="true">Reveal meaning</button>'}
        <button class="btn btn-ghost btn-sm" type="button" data-learn-maintenance-stop="true">Stop</button>
      </div>
      <p class="small muted">${LearningPracticeModel.loadMaintenancePreference(learnStorage()).enabled ? 'Answers in this session update the normal review schedule.' : 'This session preserves all review scheduling fields.'}</p>
    </section>`;
}
function renderVocabularyPracticeHome(){
  return `
    <section class="panel learn-panel" aria-labelledby="learnVocabularyPracticeTitle">
      ${renderLearnHeader('Vocabulary Practice', 'Drill on demand without waiting for words to be due.', 'learnVocabularyPracticeTitle')}
      <section class="learn-language-group" aria-labelledby="learnVocabularyPracticeFrequencyTitle">
        <h2 id="learnVocabularyPracticeFrequencyTitle">Choose a Source</h2>
        <div class="learn-card-grid learn-card-grid-compact">
          ${learnCard({ title: 'Frequency', description: 'Practice Greek or Hebrew words by frequency.' }, 'vocabulary:practice:frequency', 'learn-card-compact')}
          ${learnCard({ title: 'Learning Status', description: 'Choose Known, Learning, or Not Learned words.' }, 'vocabulary:practice:status', 'learn-card-compact')}
          ${learnCard({ title: 'Saved Words', description: 'Practice starred vocabulary.' }, 'vocabulary:practice:saved', 'learn-card-compact')}
          ${learnCard({ title: 'Custom Deck', description: 'Practice one of your focused vocabulary collections.' }, 'vocabulary:practice:study-sets', 'learn-card-compact')}
          ${learnCard({ title: 'Book', description: 'Practice vocabulary from a selected book.' }, 'vocabulary:practice:book', 'learn-card-compact')}
          ${learnCard({ title: 'Chapter', description: 'Practice vocabulary from a selected chapter.' }, 'vocabulary:practice:chapter', 'learn-card-compact')}
          ${learnCard({ title: 'Overdue / Backlog', description: 'Practice due and overdue words without requiring a path.' }, 'vocabulary:practice:backlog', 'learn-card-compact')}
        </div>
      </section>
      <p class="small muted">On-demand practice follows your Practice and SRS preference. Review Queue sessions always count as reviews.</p>
    </section>`;
}
function renderPracticeLanguageChoices(title, description, basePage, mixed = false){
  return `
    <section class="panel learn-panel" aria-labelledby="learnPracticeLanguageTitle">
      ${renderLearnHeader(title, description, 'learnPracticeLanguageTitle')}
      <div class="learn-card-grid">
        ${learnCard({ title: 'Greek', description }, `${basePage}:greek`)}
        ${learnCard({ title: 'Hebrew', description }, `${basePage}:hebrew`)}
        ${mixed ? learnCard({ title: 'Mixed', description: 'Combine Greek and Hebrew in one temporary session.' }, `${basePage}:mixed`) : ''}
      </div>
    </section>`;
}
function renderPracticeFrequencyLanguage(language){
  return `
    <section class="panel learn-panel" aria-labelledby="learnPracticeFrequencyTitle">
      ${renderLearnHeader(`${learnLanguageTitle(language)} Frequency Practice`, 'Choose a frequency range.', 'learnPracticeFrequencyTitle')}
      ${renderLearnFrequencyCards(language, `vocabulary:practice:frequency:${language}`)}
    </section>`;
}
function renderPracticeStatusChoices(language){
  return `
    <section class="panel learn-panel" aria-labelledby="learnPracticeStatusTitle">
      ${renderLearnHeader(`${learnLanguageTitle(language)} Status Practice`, 'Choose the learning status to practice.', 'learnPracticeStatusTitle')}
      <div class="learn-card-grid learn-card-grid-compact">
        ${learnCard({ title: 'Known Words', description: 'Practice words already marked Known.' }, `vocabulary:practice:status:${language}:known`, 'learn-card-compact')}
        ${learnCard({ title: 'Learning Words', description: 'Practice words currently being learned or reviewed.' }, `vocabulary:practice:status:${language}:learning`, 'learn-card-compact')}
        ${learnCard({ title: 'Not Learned Words', description: 'Practice words not yet introduced into SRS.' }, `vocabulary:practice:status:${language}:not-learned`, 'learn-card-compact')}
      </div>
    </section>`;
}
function renderPracticeStatusLanguageChoices(title, description, status){
  return `
    <section class="panel learn-panel" aria-labelledby="learnPracticeStatusLanguageTitle">
      ${renderLearnHeader(title, description, 'learnPracticeStatusLanguageTitle')}
      <div class="learn-card-grid">
        ${['greek','hebrew','mixed'].map(language => learnCard({
          title: language === 'mixed' ? 'Mixed' : learnLanguageTitle(language),
          description: language === 'mixed' ? 'Combine Greek and Hebrew in one temporary session.' : description
        }, `vocabulary:practice:status:${language}:${status}`)).join('')}
      </div>
    </section>`;
}
function renderPracticeStudySets(){
  const sets = learnStudySets().filter(set => set.type === 'vocabulary');
  return `
    <section class="panel learn-panel" aria-labelledby="learnPracticeSetsTitle">
      ${renderLearnHeader('Custom Deck Practice', 'Choose a focused vocabulary collection.', 'learnPracticeSetsTitle')}
      <div class="learn-card-grid learn-card-grid-compact">
        ${sets.length ? sets.map(set => learnCard({ title: set.title, description: StudySetsModel.sourceSummary(set) }, `vocabulary:customize:${set.language}:custom-deck:${set.id}`, 'learn-card-compact')).join('') : learnCard({ title: 'Create a Custom Deck', description: 'Make a focused collection in under a minute.' }, 'study-sets:create', 'learn-card-compact')}
      </div>
    </section>`;
}
function renderPracticeBooks(language, mode){
  return `
    <section class="panel learn-panel learn-panel-wide" aria-labelledby="learnPracticeBooksTitle">
      ${renderLearnHeader(`${learnLanguageTitle(language)} ${mode === 'chapter' ? 'Chapter' : 'Book'} Practice`, 'Choose a book.', 'learnPracticeBooksTitle')}
      ${renderLearnBookGrid(language, `vocabulary:practice:${mode}:${language}`)}
    </section>`;
}
function renderPracticeChapters(language, bookId){
  const book = learnBook(language, bookId);
  return `
    <section class="panel learn-panel learn-panel-wide" aria-labelledby="learnPracticeChaptersTitle">
      ${renderLearnHeader(`${book.name} Chapter Practice`, 'Choose a chapter.', 'learnPracticeChaptersTitle')}
      <div class="learn-chapter-grid">
        ${book.chapters.map(chapter => learnCard({ title: `Chapter ${chapter}`, description: `Practice words from ${book.name} ${chapter}.` }, `vocabulary:practice:chapter:${language}:${book.id}:${chapter}`, 'learn-card-compact')).join('')}
      </div>
    </section>`;
}
function renderVocabularyPracticeSessionPage(){
  const parts = learnState.page.split(':');
  if(parts[2] === 'book') ensureBookProgress(parts[3], parts[4]);
  if(parts[2] === 'chapter') ensureChapterProgress(parts[3], parts[4], parts[5]);
  const session = ensureLearnPracticeSession();
  const current = session.entries[session.index];
  const done = !current;
  const pref = learnPracticeSrsPreference();
  return `
    <section class="panel learn-panel" aria-labelledby="learnVocabularyPracticeSessionTitle">
      ${renderLearnHeader(learnPracticeTitleForPage(), 'On-demand practice', 'learnVocabularyPracticeSessionTitle')}
      <div class="learn-recognition-progress">
        <span>${escHtml(String(Math.min(session.index + (done ? 0 : 1), session.entries.length)))} of ${escHtml(String(session.entries.length))}</span>
        <span>Recognized ${escHtml(String(session.recognized))}</span>
        <span>Missed ${escHtml(String(session.missed))}</span>
      </div>
      ${current ? `
        ${renderVocabularyLearningCard(current, { revealed: session.revealed })}
        ${renderLearningStatusSummary(current, { compact: true })}
        <div class="learn-vocab-actions">
          ${session.revealed
            ? renderConfidenceControls('data-learn-practice-grade')
            : `<button class="btn btn-primary learn-review-action learn-review-reveal" type="button" data-learn-practice-reveal="true">Reveal Meaning</button>`}
        </div>
        <p class="small muted">${pref === 'count-srs' ? 'This practice is counting toward SRS by preference.' : 'This practice will not change SRS scheduling.'}</p>`
      : `<section class="word-page-section learn-explainer">
          <h2>${session.entries.length ? 'Practice complete' : 'No practice items available'}</h2>
          <p>${session.entries.length ? `Recognized ${escHtml(String(session.recognized))}; missed ${escHtml(String(session.missed))}.` : 'This source does not have available vocabulary items yet.'}</p>
          <div class="learn-vocab-actions">
            <button class="btn btn-ghost btn-sm" type="button" data-learn-page="vocabulary:practice">Back to Vocabulary Practice</button>
          </div>
          ${session.counted ? '<p class="small muted">This session has been counted toward SRS.</p>' : ''}
        </section>`}
    </section>`;
}
function renderStudySetsPage(){
  const sets = learnStudySets();
  return `
    <section class="panel learn-panel learn-study-sets-page" aria-labelledby="learnStudySetsPageTitle">
      ${renderLearnHeader('Custom Decks', 'Focused custom collections for specific goals.', 'learnStudySetsPageTitle')}
      <section class="word-page-section learn-explainer">
        <h2>Create a Custom Deck</h2>
        <p>Collect words by frequency or status, or keep a hand-picked vocabulary folder for targeted practice.</p>
        <button class="btn btn-primary btn-sm" type="button" data-learn-page="study-sets:create">Create Custom Deck</button>
      </section>
      <section class="learn-language-group" aria-labelledby="learnStudySetsListTitle">
        <h2 id="learnStudySetsListTitle">Your Custom Decks</h2>
        ${sets.length ? `<div class="learn-card-grid">${sets.map(set => {
          const count = set.type === 'vocabulary' ? learnStudySetEntries(set).length : 0;
          return `
            <article class="learn-study-set-row">
              <div>
                <h3>${escHtml(set.title)}</h3>
                <p>${escHtml(StudySetsModel.sourceSummary(set))}${set.type === 'vocabulary' ? ` · ${escHtml(String(count))} items` : ''}</p>
              </div>
              <div class="learn-vocab-actions">
                <button class="btn btn-primary btn-sm" type="button" data-learn-page="vocabulary:customize:${escHtml(set.language)}:custom-deck:${escHtml(set.id)}">Practice</button>
                <button class="btn btn-ghost btn-sm" type="button" data-learn-page="study-sets:browse:${escHtml(set.id)}">Browse</button>
                <button class="btn btn-ghost btn-sm" type="button" data-learn-page="study-sets:detail:${escHtml(set.id)}">Open</button>
              </div>
            </article>`;
        }).join('')}</div>` : `<section class="word-page-section learn-explainer"><h2>No Custom Decks yet</h2><p>Create one for a sermon text, quiz list, favorite book, or personal review.</p></section>`}
      </section>
    </section>`;
}
function renderStudySetCreatePage(){
  const error = learnState.studySetFormError || '';
  const draft = learnState.studySetDraft || { title: '', language: 'greek', source: 'hand-picked', sourceId: '' };
  learnState.studySetDraft = draft;
  const books = learnBookList(draft.language);
  if(draft.source === 'book'){
    ensureLearnManifest(draft.language);
    if(draft.sourceId) ensureBookProgress(draft.language, draft.sourceId);
  }
  const frequency = learnFrequencyRange(draft.sourceId);
  const chosenBook = books.find(book => book.id === draft.sourceId);
  const valid = Boolean(String(draft.title || '').trim())
    && (draft.source === 'hand-picked'
      || (draft.source === 'book' && books.some(book => book.id === draft.sourceId))
      || (draft.source === 'frequency' && frequency.valid));
  return `
    <section class="panel learn-panel" aria-labelledby="learnStudySetCreateTitle">
      ${renderLearnHeader('Create Custom Deck', 'Create an empty deck or begin with a focused vocabulary range.', 'learnStudySetCreateTitle')}
      <form class="word-page-section learn-study-set-form" data-learn-study-set-create="true" novalidate>
        <label>Deck name<input class="input" name="title" value="${escHtml(draft.title || '')}" placeholder="e.g., Romans quiz review" /></label>
        <label>Language<select class="input" name="language"><option value="greek" ${draft.language === 'greek' ? 'selected' : ''}>Greek</option><option value="hebrew" ${draft.language === 'hebrew' ? 'selected' : ''}>Hebrew</option></select></label>
        <label>Add words<select class="input" name="source"><option value="hand-picked" ${draft.source === 'hand-picked' ? 'selected' : ''}>Start empty / hand-pick words</option><option value="book" ${draft.source === 'book' ? 'selected' : ''}>Add from a biblical book</option><option value="frequency" ${draft.source === 'frequency' ? 'selected' : ''}>Add from a frequency range</option></select></label>
        ${draft.source === 'book' ? `<div class="learn-dependent-field"><label>Book<select class="input" name="sourceId"><option value="">Choose a book</option>${books.map(book => `<option value="${escHtml(book.id)}" ${draft.sourceId === book.id ? 'selected' : ''}>${escHtml(book.name)}</option>`).join('')}</select></label><label>Passage scope<select class="input" name="passageScope"><option value="book" ${draft.passageScope !== 'chapter' ? 'selected' : ''}>Entire book</option><option value="chapter" ${draft.passageScope === 'chapter' ? 'selected' : ''}>One chapter</option></select></label>${draft.passageScope === 'chapter' ? `<label>Chapter<select class="input" name="chapter"><option value="">Choose a chapter</option>${(chosenBook?.chapters || []).map(chapter => `<option value="${chapter}" ${Number(draft.chapter) === Number(chapter) ? 'selected' : ''}>${chapter}</option>`).join('')}</select></label>` : ''}</div>` : ''}
        ${draft.source === 'frequency' ? renderFrequencyRangeField(draft, 'deck') : ''}
        ${error || !String(draft.title || '').trim() ? `<p class="learn-inline-validation" role="alert">${escHtml(error || 'Enter a deck name.')}</p>` : ''}
        <div class="learn-vocab-actions">
          <button class="btn btn-primary" type="submit" ${valid ? '' : 'disabled aria-disabled="true"'}>Create Custom Deck</button>
          <button class="btn btn-ghost btn-sm" type="button" data-learn-page="study-sets">Cancel</button>
        </div>
      </form>
    </section>`;
}
function studySetDraftFromForm(form, options = {}){
  const data = new FormData(form);
  const previous = learnState.studySetDraft || {};
  const language = data.get('language') === 'hebrew' ? 'hebrew' : 'greek';
  const source = ['book','frequency'].includes(data.get('source')) ? data.get('source') : 'hand-picked';
  let sourceId = data.get('sourceId') || '';
  let error = '';
  if(source === 'frequency'){
    const choice = data.get('frequencyChoice') || '';
    if(choice === 'custom'){
      const custom = makeCustomFrequencyRange(data.get('frequencyMinimum'), data.get('frequencyMaximum'));
      sourceId = custom.valid ? custom.id : `custom:${data.get('frequencyMinimum') || 0}:${data.get('frequencyMaximum') || 0}`;
      error = custom.valid ? '' : custom.error;
    } else sourceId = choice;
  }
  if(options.clearDetail) sourceId = '';
  const passageScope = data.get('passageScope') || previous.passageScope || 'book';
  const bookChanged = source === 'book' && sourceId !== previous.sourceId;
  return { draft: { title: String(data.get('title') || previous.title || ''), language, source, sourceId, passageScope, chapter: passageScope === 'chapter' && !bookChanged ? Number(data.get('chapter') || previous.chapter) : 0 }, error };
}
function learnStudySetWordPickerEntries(set){
  if(!set || set.type !== 'vocabulary') return [];
  const query = String(learnState.studySetWordPickerQuery || '').trim().toLowerCase();
  const existing = new Set(learnStudySetEntries(set).map(learnWordId));
  return learnVocabularyEntries(set.language).filter(entry => {
    if(existing.has(learnWordId(entry))) return false;
    if(!query) return true;
    return [entry.lemma, entry.word, entry.lexicalForm, learnNormalizedGlosses(entry).primary, String(entry.freq || '')]
      .join(' ').toLowerCase().includes(query);
  }).slice(0, 20);
}
function renderStudySetWordPicker(set){
  if(!set || set.type !== 'vocabulary') return '';
  const entries = learnStudySetWordPickerEntries(set);
  return `
      <section class="word-page-section learn-study-set-word-picker" aria-labelledby="learnStudySetWordPickerTitle">
        <h2 id="learnStudySetWordPickerTitle">Add words</h2>
        <p class="small muted">Search by headword, gloss, or frequency. Adding words does not change SRS status.</p>
        <form data-learn-study-set-word-search="${escHtml(set.id)}" class="learn-custom-frequency-form">
          <div class="learn-custom-frequency-row">
            <input class="input" name="query" value="${escHtml(learnState.studySetWordPickerQuery || '')}" placeholder="logos, love, 25" />
            <button class="btn btn-ghost btn-sm" type="submit">Search</button>
          </div>
        </form>
        <form data-learn-study-set-add-words="${escHtml(set.id)}">
          ${entries.length ? `<div class="learn-progress-list">${entries.map(entry => `
            <label class="learn-study-set-row">
              <input type="checkbox" name="wordId" value="${escHtml(learnWordId(entry))}" />
              <span>
                <strong>${escHtml(entry.lemma || entry.word || '')}</strong>
                <span>${escHtml(learnNormalizedGlosses(entry).primary)} · freq ${escHtml(String(entry.freq || 0))}×</span>
              </span>
            </label>`).join('')}</div>` : '<p class="word-page-context-empty">No matching words to add.</p>'}
          <div class="learn-vocab-actions">
            <button class="btn btn-primary btn-sm" type="submit" ${entries.length ? '' : 'disabled'}>Add selected words</button>
          </div>
        </form>
      </section>`;
}
function renderStudySetDetailPage(id){
  const set = learnStudySet(id);
  if(!set) return `<section class="panel learn-panel">${renderLearnHeader('Custom Deck', 'Not found')}<section class="word-page-section"><h2>Custom Deck unavailable</h2><p>This Custom Deck may have been deleted.</p></section></section>`;
  const entries = learnStudySetEntries(set);
  const criteriaSummary = StudySetsModel.sourceSummary(set);
  return `
    <section class="panel learn-panel" aria-labelledby="learnStudySetDetailTitle">
      ${renderLearnHeader(set.title, criteriaSummary, 'learnStudySetDetailTitle')}
      <section class="word-page-section learn-explainer">
        <h2>${escHtml(set.type === 'vocabulary' ? `${entries.length} ${entries.length === 1 ? 'word' : 'words'}` : 'Custom Deck')}</h2>
        <p>${entries.length ? 'Practice this deck or manage its vocabulary below.' : 'This deck is empty. Search vocabulary below to add its first words.'}</p>
        <dl class="word-page-meta word-page-meta-secondary">
          <dt>Language</dt><dd>${escHtml(learnLanguageTitle(set.language))}</dd>
          <dt>Word count</dt><dd>${escHtml(String(entries.length))}</dd>
          <dt>Started from</dt><dd>${escHtml(criteriaSummary)}</dd>
        </dl>
        <div class="learn-vocab-actions">
          ${set.type === 'vocabulary' ? `<button class="btn btn-primary btn-sm" type="button" data-learn-page="vocabulary:customize:${escHtml(set.language)}:custom-deck:${escHtml(set.id)}">Practice</button>` : ''}
          <button class="btn btn-ghost btn-sm" type="button" data-learn-delete-study-set="${escHtml(set.id)}">Delete</button>
        </div>
      </section>
      <section class="word-page-section"><h2>Rename</h2><form class="learn-custom-frequency-row" data-learn-study-set-rename="${escHtml(set.id)}"><input class="input" name="title" value="${escHtml(set.title)}" aria-label="Deck name"><button class="btn btn-ghost btn-sm" type="submit">Rename</button></form>${learnState.studySetFormError ? `<p class="learn-inline-validation" role="alert">${escHtml(learnState.studySetFormError)}</p>` : ''}</section>
      ${renderStudySetWordPicker(set)}
      <section class="word-page-section" aria-labelledby="learnDeckWordsTitle"><h2 id="learnDeckWordsTitle">Manage words</h2>${entries.length ? `<div class="learn-progress-list">${entries.slice(0,100).map(entry => `<div class="learn-study-set-row"><span><strong>${escHtml(entry.lemma || entry.word || '')}</strong><span>${escHtml(learnNormalizedGlosses(entry).primary)}</span></span><button class="btn btn-ghost btn-sm" type="button" data-learn-study-set-remove="${escHtml(set.id)}" data-word-id="${escHtml(learnWordId(entry))}">Remove</button></div>`).join('')}</div>${entries.length > 100 ? `<p class="small muted">Showing the first 100 of ${entries.length} words.</p>` : ''}` : '<p class="small muted">No words have been added.</p>'}</section>
      <button class="btn btn-ghost btn-sm" type="button" data-learn-page="study-sets">Back to Custom Decks</button>
    </section>`;
}
function renderStudySetBrowsePage(id){
  const set = learnStudySet(id);
  const entries = learnStudySetEntries(set);
  return `
    <section class="panel learn-panel learn-panel-wide" aria-labelledby="learnStudySetBrowseTitle">
      ${renderLearnHeader(set?.title || 'Custom Deck', 'Browse items', 'learnStudySetBrowseTitle')}
      ${entries.length ? `<div class="learn-progress-list">${entries.slice(0, 100).map(entry => `
        <article class="learn-study-set-row">
          <div>
            <h3>${escHtml(entry.lemma || entry.word || '')}</h3>
            <p>${escHtml(learnNormalizedGlosses(entry).primary)} · ${escHtml(learnLanguageTitle(entry.lang))} · freq ${escHtml(String(entry.freq || 0))}×</p>
          </div>
        </article>`).join('')}</div>` : `<section class="word-page-section learn-explainer"><h2>No items available</h2><p>This Custom Deck has no matching vocabulary items right now.</p></section>`}
    </section>`;
}
function renderLearnPlaceholder(area, item){
  return `
    <section class="panel learn-panel learn-placeholder" aria-labelledby="learnPlaceholderTitle">
      ${renderLearnHeader(item.title, area.title)}
      <section class="word-page-section">
        <h2 id="learnPlaceholderTitle">Planned Work</h2>
        <p>${escHtml(item.description)}</p>
      </section>
    </section>`;
}
function renderStudySetsPlaceholder(){
  return renderStudySetsPage();
}
function renderMixedPracticePlaceholder(){
  return `
    <section class="panel learn-panel learn-placeholder" aria-labelledby="learnMixedPracticeTitle">
      ${renderLearnHeader('Mixed Practice', 'Supporting capstone', 'learnMixedPracticeTitle')}
      <section class="word-page-section">
        <h2>Vocabulary and grammar together</h2>
        <p>Mixed Practice will combine vocabulary and grammar in a reading-like session. For v5.8, Vocabulary Practice and Grammar Practice are ready first, while the deeper adaptive mixed engine remains a follow-up.</p>
        <div class="learn-vocab-actions">
          <button class="btn btn-primary btn-sm" type="button" data-learn-page="vocabulary:practice">Vocabulary Practice</button>
          <button class="btn btn-ghost btn-sm" type="button" data-learn-page="paradigms:recognition-practice">Grammar Practice</button>
        </div>
      </section>
    </section>`;
}
function renderLearningPreferencesPage(){
  const targets = learnReviewTargets();
  const maintenancePref = LearningPracticeModel.loadMaintenancePreference(learnStorage());
  const targetControl = language => {
    const target = targets[language] || LearnReviewTargetDefaults[language];
    const customId = `learn-${language}-custom-target`;
    return `
      <section class="word-page-section learn-preference-group" data-learn-target-language="${escHtml(language)}">
        <h2>${escHtml(learnLanguageTitle(language))} Review Target</h2>
        <div class="learn-setting-row" role="group" aria-label="${escHtml(learnLanguageTitle(language))} review target">
          ${Object.entries(LearnReviewTargetPresets).map(([preset, value]) => `
            <button class="btn btn-ghost btn-sm${target.preset === preset ? ' active' : ''}" type="button" data-learn-review-target-preset="${escHtml(preset)}" data-language="${escHtml(language)}">${escHtml(preset[0].toUpperCase() + preset.slice(1))} - ${value}/day</button>`).join('')}
          <button class="btn btn-ghost btn-sm${target.preset === 'custom' ? ' active' : ''}" type="button" data-learn-review-target-preset="custom" data-language="${escHtml(language)}">Custom</button>
        </div>
        <div class="learn-custom-frequency-row">
          <label class="small muted" for="${escHtml(customId)}">Custom daily target</label>
          <input class="input learn-review-target-custom" id="${escHtml(customId)}" type="number" min="${LearnReviewTargetCustomMin}" max="${LearnReviewTargetCustomMax}" step="1" value="${escHtml(String(target.dailyTarget))}" data-language="${escHtml(language)}" />
        </div>
        <p class="small muted">Current target: ${escHtml(String(target.dailyTarget))}/day. Extra due words remain visible as more available.</p>
      </section>`;
  };
  return `
    <section class="panel learn-panel" aria-labelledby="learnPreferencesTitle">
      ${renderLearnHeader('Learning Preferences', 'Review settings', 'learnPreferencesTitle')}
      ${targetControl('greek')}
      ${targetControl('hebrew')}
      <section class="word-page-section learn-preference-group">
        <h2>Maintenance Practice</h2>
        <label class="learn-maintenance-toggle"><input id="learnMaintenanceSrsPreference" type="checkbox" ${maintenancePref.enabled ? 'checked' : ''}><span><strong>Practice updates review schedule</strong><small>Scheduled reviews always update the schedule. When Off, maintenance still updates confidence, mastery, rotation priority, and daily progress.</small></span></label>
      </section>
    </section>`;
}
function renderLearnPage(){
  const [areaId, childId, thirdId, fourthId, fifthId, sixthId, seventhId] = learnState.page.split(':');
  const area = learnArea(areaId);
  if(areaId === 'parsing' && childId === 'session') return renderParsingRecognitionSession();
  if(areaId === 'parsing' && childId === 'setup' && (thirdId === 'greek' || thirdId === 'hebrew')) return renderParsingPracticeSetup(thirdId);
  if(areaId === 'parsing') return renderParsingPracticeHome();
  if(areaId === 'vocabulary' && childId === 'daily' && (thirdId === 'greek' || thirdId === 'hebrew')) return renderDailyPracticePage(thirdId);
  if(areaId === 'vocabulary' && childId === 'customize-source' && ['all-known','weak','needs-attention','book','frequency','custom-deck'].includes(thirdId)) return renderCustomizeLanguageChoices(thirdId);
  if(areaId === 'vocabulary' && childId === 'customize' && (thirdId === 'greek' || thirdId === 'hebrew')) return renderPracticeCustomize(thirdId);
  if(areaId === 'learning-preferences') return renderLearningPreferencesPage();
  if(areaId === 'study-sets' && childId === 'create') return renderStudySetCreatePage();
  if(areaId === 'study-sets' && childId === 'detail') return renderStudySetDetailPage(thirdId);
  if(areaId === 'study-sets' && childId === 'browse') return renderStudySetBrowsePage(thirdId);
  if(areaId === 'study-sets') return renderStudySetsPlaceholder();
  if(areaId === 'mixed-practice') return renderMixedPracticePlaceholder();
  if(!area) return renderLearnHome();
  if(area.id === 'vocabulary' && childId === 'maintenance' && !thirdId) return renderMaintenanceLanguageChoices();
  if(area.id === 'vocabulary' && childId === 'maintenance' && (thirdId === 'greek' || thirdId === 'hebrew')) return renderMaintenancePracticePage(thirdId);
  if(area.id === 'vocabulary' && childId === 'practice' && !thirdId) return renderVocabularyPracticeHome();
  if(area.id === 'vocabulary' && childId === 'practice' && thirdId === 'frequency' && !fourthId) return renderPracticeLanguageChoices('Frequency Practice', 'Practice vocabulary by frequency.', 'vocabulary:practice:frequency');
  if(area.id === 'vocabulary' && childId === 'practice' && thirdId === 'frequency' && fourthId && !fifthId) return renderPracticeFrequencyLanguage(fourthId);
  if(area.id === 'vocabulary' && childId === 'practice' && thirdId === 'status' && !fourthId) return renderPracticeLanguageChoices('Learning Status Practice', 'Practice by current learning status.', 'vocabulary:practice:status', true);
  if(area.id === 'vocabulary' && childId === 'practice' && thirdId === 'status' && fourthId && !fifthId) return renderPracticeStatusChoices(fourthId);
  if(area.id === 'vocabulary' && childId === 'practice' && thirdId === 'saved' && !fourthId) return renderPracticeStatusLanguageChoices('Saved Words Practice', 'Practice saved or starred vocabulary.', 'saved');
  if(area.id === 'vocabulary' && childId === 'practice' && thirdId === 'study-sets') return renderPracticeStudySets();
  if(area.id === 'vocabulary' && childId === 'practice' && thirdId === 'backlog' && !fourthId) return renderPracticeStatusLanguageChoices('Overdue / Backlog Practice', 'Practice due and overdue vocabulary.', 'overdue');
  if(area.id === 'vocabulary' && childId === 'practice' && (thirdId === 'book' || thirdId === 'chapter') && !fourthId) return renderPracticeLanguageChoices(`${thirdId === 'chapter' ? 'Chapter' : 'Book'} Practice`, 'Practice vocabulary from a reading scope.', `vocabulary:practice:${thirdId}`);
  if(area.id === 'vocabulary' && childId === 'practice' && thirdId === 'book' && fourthId && !fifthId) return renderPracticeBooks(fourthId, 'book');
  if(area.id === 'vocabulary' && childId === 'practice' && thirdId === 'chapter' && fourthId && !fifthId) return renderPracticeBooks(fourthId, 'chapter');
  if(area.id === 'vocabulary' && childId === 'practice' && thirdId === 'chapter' && fourthId && fifthId && !sixthId) return renderPracticeChapters(fourthId, fifthId);
  if(area.id === 'vocabulary' && childId === 'practice' && thirdId) return renderVocabularyPracticeSessionPage();
  if(area.id === 'vocabulary' && childId === 'review' && !thirdId) return renderReviewChooser(area);
  if(area.id === 'vocabulary' && childId === 'review' && (thirdId === 'greek' || thirdId === 'hebrew' || thirdId === 'mixed')) return renderLanguageReviewPage(area, thirdId);
  if(area.id === 'vocabulary' && childId === 'new-words') return renderNewWordsPage(area);
  if(area.id === 'vocabulary' && childId === 'chapter' && !thirdId) return renderChapterShell();
  if(area.id === 'vocabulary' && childId === 'chapter' && LearnTestaments[thirdId]) return renderChapterTestamentBooks(thirdId);
  if(area.id === 'vocabulary' && childId === 'chapter' && thirdId && fourthId && !fifthId) return renderChapterListPage(thirdId, fourthId, { basePage: `vocabulary:book:${thirdId}:${fourthId}:chapter` });
  if(area.id === 'vocabulary' && childId === 'frequency' && !thirdId) return renderFrequencyShell();
  if(area.id === 'vocabulary' && childId === 'frequency' && thirdId && !fourthId) return renderLanguageFrequencyPage(thirdId);
  if(area.id === 'vocabulary' && childId === 'frequency' && thirdId && fourthId) return renderFrequencyPlaceholder(thirdId, fourthId);
  if(area.id === 'vocabulary' && childId === 'book' && !thirdId) return renderBookShell();
  if(area.id === 'vocabulary' && childId === 'book' && LearnTestaments[thirdId]) return renderTestamentBooks(thirdId);
  if(area.id === 'vocabulary' && childId === 'book' && thirdId && fourthId && !fifthId) return renderBookStudyPage(thirdId, fourthId);
  if(area.id === 'vocabulary' && childId === 'book' && thirdId && fourthId && fifthId === 'overall' && !sixthId) return renderBookOverallFrequencyPage(thirdId, fourthId);
  if(area.id === 'vocabulary' && childId === 'book' && thirdId && fourthId && fifthId === 'overall' && sixthId) return renderFrequencyPlaceholder(thirdId, sixthId, `${learnBook(thirdId, fourthId).name} Overall Frequency`);
  if(area.id === 'vocabulary' && childId === 'book' && thirdId && fourthId && fifthId === 'chapter' && !sixthId) return renderChapterListPage(thirdId, fourthId);
  if(area.id === 'vocabulary' && childId === 'book' && thirdId && fourthId && fifthId === 'chapter' && sixthId && !seventhId) return renderChapterStudyPage(thirdId, fourthId, sixthId);
  if(area.id === 'vocabulary' && childId === 'book' && thirdId && fourthId && fifthId === 'chapter' && sixthId && seventhId) return renderFrequencyPlaceholder(thirdId, seventhId, `${learnBook(thirdId, fourthId).name} ${Number(sixthId) || 1}`);
  if(area.id === 'reading-readiness' && LearnTestaments[childId] && !thirdId) return renderReadingReadinessBooks(childId);
  if(area.id === 'reading-readiness' && LearnTestaments[childId] && thirdId && !fourthId){
    const language = LearnTestaments[childId].language;
    return renderBookStudyPage(language, thirdId, { basePage: `reading-readiness:${childId}:${thirdId}` });
  }
  if(area.id === 'reading-readiness' && LearnTestaments[childId] && thirdId && fourthId === 'overall' && fifthId){
    const language = LearnTestaments[childId].language;
    return renderFrequencyPlaceholder(language, fifthId, `${learnBook(language, thirdId).name} ${learnFrequencyLabel(fifthId)}`);
  }
  if(area.id === 'reading-readiness' && LearnTestaments[childId] && thirdId && fourthId === 'chapter' && !fifthId){
    const language = LearnTestaments[childId].language;
    return renderChapterListPage(language, thirdId, { basePage: `reading-readiness:${childId}:${thirdId}:chapter` });
  }
  if(area.id === 'reading-readiness' && LearnTestaments[childId] && thirdId && fourthId === 'chapter' && fifthId && !sixthId){
    const language = LearnTestaments[childId].language;
    return renderChapterStudyPage(language, thirdId, fifthId, { basePage: `reading-readiness:${childId}:${thirdId}:chapter:${Number(fifthId) || 1}` });
  }
  if(area.id === 'reading-readiness' && LearnTestaments[childId] && thirdId && fourthId === 'chapter' && fifthId && sixthId){
    const language = LearnTestaments[childId].language;
    return renderFrequencyPlaceholder(language, sixthId, `${learnBook(language, thirdId).name} ${Number(fifthId) || 1} ${learnFrequencyLabel(sixthId)}`);
  }
  if(area.id === 'paradigms' && childId && thirdId === 'session' && fourthId) return renderRecognitionSessionPage(childId, fourthId);
  if(area.id === 'paradigms' && childId && ['greek-verbs','greek-nouns','hebrew-verbs','hebrew-nouns'].includes(childId)) return renderRecognitionCategoryPage(childId);
  if(area.id === 'paradigms' && childId === 'recognition-practice') return renderRecognitionPracticePage(area);
  if(area.id === 'paradigms' && childId === 'parsing-drills') return renderParsingDrillsPage();
  if(childId) return renderLearnPlaceholder(area, learnChild(area, childId) || area);
  if(area.id === 'vocabulary') return renderVocabularyPage(area);
  if(area.id === 'paradigms') return renderParadigmsPage(area);
  if(area.id === 'reading-readiness') return renderReadingReadinessPage(area);
  return renderLearnHome();
}
function wireLearn(){
  const root = $('#learnShell'); if(!root) return;
  $$('[data-learn-page]', root).forEach(control => control.addEventListener('click', () => setLearnPage(control.dataset.learnPage)));
  $$('[data-learn-start-daily]', root).forEach(button => button.addEventListener('click', () => prepareDailyPractice(button, button.dataset.learnStartDaily)));
  $$('[data-learn-discard-daily]', root).forEach(button => button.addEventListener('click', () => discardDailyPractice(button.dataset.learnDiscardDaily)));
  $$('[data-learn-cancel-profile]', root).forEach(button => button.addEventListener('click', () => {
    delete learnState.profileDrafts[button.dataset.learnCancelProfile];
    learnState.profileError = '';
    setLearnPage('home');
  }));
  $$('[data-learn-save-exit]', root).forEach(button => button.addEventListener('click', () => saveAndExitDailyPractice(button.dataset.learnSaveExit)));
  $$('[data-learn-continue-extra]', root).forEach(button => button.addEventListener('click', () => { const language = button.dataset.learnContinueExtra; discardDailyPractice(language); prepareDailyPractice(button, language, { extra: true }); }));
  $$('[data-learn-start-recap]', root).forEach(button => button.addEventListener('click', () => startDifficultRecap(button.dataset.learnStartRecap)));
  $$('[data-learn-unified-reveal]', root).forEach(button => button.addEventListener('click', revealUnifiedPractice));
  $$('[data-learn-unified-confidence]', root).forEach(button => button.addEventListener('click', () => gradeUnifiedPractice(button.dataset.learnUnifiedConfidence)));
  $$('[data-learn-attention-id]', root).forEach(button => button.addEventListener('click', () => toggleUnifiedAttention(button.dataset.language, button.dataset.learnAttentionId)));
  $$('[data-learn-open-word-page]', root).forEach(button => button.addEventListener('click', () => openUnifiedPracticeWordPage(learnState.page.split(':')[2], button.dataset.learnOpenWordPage)));
  $$('[data-learn-save-profile]', root).forEach(form => {
    form.addEventListener('submit', event => {
      event.preventDefault();
      const language = form.dataset.learnSaveProfile;
      const { profile, error, focused } = practiceProfileFromForm(form);
      learnState.profileDrafts[language] = profile;
      const validity = error ? { valid: false, error } : learnProfileValid(profile, { daily: !focused });
      if(!validity.valid){ learnState.profileError = validity.error; renderLearn(); return; }
      if(profile.source === 'book' && !learnState.progressCache[bookProgressKey(language, profile.sourceId)]){
        ensureBookProgress(language, profile.sourceId);
        learnState.profileError = 'Book vocabulary is loading. Start when it is ready.';
        renderLearn();
        return;
      }
      const context = practiceContext(profile);
      prepareDailyPractice(form.querySelector('button[type="submit"]'), language, { profile, saveProfile: !focused, focused, returnPage: learnState.page, contextTitle: context.title, contextDetail: context.detail });
    });
    form.addEventListener('change', event => {
      const language = form.dataset.learnSaveProfile;
      const sourceChanged = event.target?.name === 'source';
      const { profile, error } = practiceProfileFromForm(form, { clearScopeDetail: sourceChanged });
      learnState.profileDrafts[language] = profile;
      learnState.profileError = error;
      renderLearn();
    });
    form.addEventListener('input', event => {
      if(!['frequencyMinimum','frequencyMaximum','size','dailyAmount'].includes(event.target?.name)) return;
      const language = form.dataset.learnSaveProfile;
      const { profile, error } = practiceProfileFromForm(form);
      learnState.profileDrafts[language] = profile;
      learnState.profileError = error;
      const validity = error ? { valid: false, error } : learnProfileValid(profile, { daily: form.dataset.practiceMode !== 'focused' });
      const submit = form.querySelector('button[type="submit"]');
      if(submit){ submit.disabled = !validity.valid; submit.setAttribute('aria-disabled', String(!validity.valid)); }
      const message = form.querySelector('.learn-inline-validation');
      if(message){ message.textContent = validity.error; message.hidden = validity.valid; }
    });
  });
  $$('[data-learn-start-path]', root).forEach(button => button.addEventListener('click', () => startLearnVocabularyPath(button.dataset.learnStartPath)));
  $$('[data-learn-word-learned]', root).forEach(button => button.addEventListener('click', () => learnCurrentVocabularyWord(button.dataset.lang, button.dataset.threshold, button.dataset.pathPage)));
  $$('[data-learn-mark-path-known]', root).forEach(button => button.addEventListener('click', () => markLearnPathKnown(button.dataset.lang, button.dataset.threshold, button.dataset.pathPage)));
  $$('[data-learn-create-scope-set]', root).forEach(button => button.addEventListener('click', () => createStudySetFromCurrentScope(button.dataset.learnCreateScopeSet, button.dataset.scopeStatus || 'all')));
  $$('[data-learn-delete-study-set]', root).forEach(button => button.addEventListener('click', () => deleteLearnStudySet(button.dataset.learnDeleteStudySet)));
  $$('[data-learn-mark-study-set-known]', root).forEach(button => button.addEventListener('click', () => markLearnStudySetKnown(button.dataset.learnMarkStudySetKnown)));
  $('#learnRevealMeaningBtn', root)?.addEventListener('click', revealLearnReview);
  $$('[data-learn-review-grade]', root).forEach(button => button.addEventListener('click', () => gradeLearnReview(button.dataset.lang, button.dataset.wordId, button.dataset.learnReviewGrade)));
  $$('[data-learn-practice-reveal]', root).forEach(button => button.addEventListener('click', revealLearnPractice));
  $$('[data-learn-practice-grade]', root).forEach(button => button.addEventListener('click', () => gradeLearnPractice(button.dataset.learnPracticeGrade)));
  function maintenanceValuesFromForm(form){
    const data = new FormData(form);
    const language = data.get('language') === 'hebrew' ? 'hebrew' : 'greek';
    return {
      language: data.get('language'),
      source: data.get('source'),
      bookId: data.get('bookId') || maintenanceConfig(language).bookId,
      order: data.get('order'),
      selectedGrades: data.getAll('selectedGrades'),
      size: data.get('size') ?? maintenanceConfig(language).size,
      unlimited: data.get('unlimited') === 'on'
    };
  }
  $$('[data-learn-maintenance-start]', root).forEach(form => {
    form.addEventListener('submit', event => {
      event.preventDefault();
      startLearnMaintenanceSession(maintenanceValuesFromForm(form));
    });
    form.addEventListener('change', () => {
      learnState.maintenanceConfig = maintenanceValuesFromForm(form);
      learnState.maintenanceError = '';
      renderLearn();
    });
  });
  $$('[data-learn-maintenance-select-all]', root).forEach(button => button.addEventListener('click', () => {
    const form = button.closest?.('[data-learn-maintenance-start]');
    const language = form ? new FormData(form).get('language') : learnState.page.split(':')[2];
    selectAllLearnMaintenanceGrades(language);
  }));
  $$('[data-learn-maintenance-reveal]', root).forEach(button => button.addEventListener('click', revealLearnMaintenance));
  $$('[data-learn-maintenance-grade]', root).forEach(button => button.addEventListener('click', () => gradeLearnMaintenance(button.dataset.learnMaintenanceGrade)));
  $$('[data-learn-maintenance-stop]', root).forEach(button => button.addEventListener('click', stopLearnMaintenance));
  $$('[data-learn-maintenance-reset]', root).forEach(button => button.addEventListener('click', resetLearnMaintenance));
  $$('[data-learn-maintenance-choose]', root).forEach(button => button.addEventListener('click', chooseLearnMaintenanceFocus));
  $$('[data-learn-recognition-start]', root).forEach(button => button.addEventListener('click', () => startRecognitionSession(button.dataset.learnRecognitionStart, button.dataset.learnRecognitionCategory || '')));
  $$('[data-learn-recognition-select]', root).forEach(button => button.addEventListener('click', () => toggleRecognitionSelection(button.dataset.learnRecognitionCategory || '', button.dataset.learnRecognitionSelect)));
  $$('[data-learn-recognition-clear]', root).forEach(button => button.addEventListener('click', () => clearRecognitionSelection(button.dataset.learnRecognitionClear)));
  $$('[data-learn-recognition-start-selected]', root).forEach(button => button.addEventListener('click', () => startSelectedRecognitionSession(button.dataset.learnRecognitionStartSelected)));
  $$('[data-learn-recognition-reveal]', root).forEach(button => button.addEventListener('click', revealRecognitionAnswer));
  $$('[data-learn-recognition-grade]', root).forEach(button => button.addEventListener('click', () => gradeRecognitionAnswer(button.dataset.learnRecognitionGrade)));
  $$('[data-learn-parsing-start]', root).forEach(form => form.addEventListener('submit', async event => {
    event.preventDefault();
    const data = new FormData(form);
    await ensureLearnRecognitionData();
    startParsingRecognitionPractice(form.dataset.learnParsingStart, data.getAll('targetIds'), data.get('count'));
  }));
  $$('[data-learn-parsing-reveal]', root).forEach(button => button.addEventListener('click', revealParsingRecognition));
  $$('[data-learn-parsing-grade]', root).forEach(button => button.addEventListener('click', () => gradeParsingRecognition(button.dataset.learnParsingGrade)));
  $$('[data-learn-restart-parsing]', root).forEach(button => button.addEventListener('click', () => {
    const session = learnState.parsingRecognitionSession;
    if(session) startParsingRecognitionPractice(session.language, session.targetIds, session.count);
  }));
  $$('[data-learn-reference-topic]', root).forEach(button => button.addEventListener('click', () => openLearnReference(button.dataset.learnReferenceTopic, button.dataset.learnReferenceSection || '')));
  $$('[data-learn-open-view]', root).forEach(button => button.addEventListener('click', () => {
    if(button.dataset.learnOpenLang && typeof setLang === 'function') setLang(button.dataset.learnOpenLang);
    const target = button.dataset.learnOpenView === 'parsing'
      ? '/parsing'
      : (typeof routeForView === 'function' ? routeForView(button.dataset.learnOpenView) : `/${button.dataset.learnOpenView}`);
    if(typeof navigateTo === 'function') navigateTo(target);
    else if(typeof showView === 'function') showView(button.dataset.learnOpenView === 'parsing' ? 'parsingView' : button.dataset.learnOpenView);
  }));
  $$('.learn-custom-frequency-form', root).forEach(form => form.addEventListener('submit', event => {
    event.preventDefault();
    setLearnCustomFrequency(form.dataset.learnCustomBase, form.querySelector('.learn-custom-frequency-input')?.value || '');
  }));
  $$('[data-learn-study-set-create]', root).forEach(form => {
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const { draft, error } = studySetDraftFromForm(form);
      learnState.studySetDraft = draft;
      if(error){ learnState.studySetFormError = error; renderLearn(); return; }
      if(draft.source === 'book' && !Array.isArray(learnState.progressCache[bookProgressKey(draft.language, draft.sourceId)]?.overall?.vocabulary)){
        try { await loadLearnBookProgress(draft.language, draft.sourceId); }
        catch(loadError){ learnState.studySetFormError = loadError.message || 'Book vocabulary could not be loaded.'; renderLearn(); return; }
      }
      createLearnStudySet({ title: draft.title, language: draft.language, type: 'vocabulary', source: draft.source, sourceId: draft.sourceId, passageScope: draft.passageScope, chapter: draft.chapter });
    });
    form.addEventListener('change', event => {
      const clearDetail = event.target?.name === 'source' || event.target?.name === 'language';
      const { draft, error } = studySetDraftFromForm(form, { clearDetail });
      learnState.studySetDraft = draft;
      learnState.studySetFormError = error;
      renderLearn();
    });
    form.querySelector('[name="title"]')?.addEventListener('input', event => {
      learnState.studySetDraft = { ...(learnState.studySetDraft || {}), title: event.target.value };
      const button = form.querySelector('[type="submit"]');
      if(button){
        const { draft, error } = studySetDraftFromForm(form);
        const detailValid = draft.source === 'hand-picked' || (draft.source === 'book' && Boolean(draft.sourceId)) || (draft.source === 'frequency' && learnFrequencyRange(draft.sourceId).valid);
        button.disabled = Boolean(error) || !String(draft.title).trim() || !detailValid;
        button.setAttribute('aria-disabled', String(button.disabled));
      }
    });
  });
  $$('[data-learn-study-set-rename]', root).forEach(form => form.addEventListener('submit', event => {
    event.preventDefault();
    renameLearnStudySet(form.dataset.learnStudySetRename, new FormData(form).get('title'));
  }));
  $$('[data-learn-study-set-remove]', root).forEach(button => button.addEventListener('click', () => removeVocabularyFromLearnStudySet(button.dataset.learnStudySetRemove, button.dataset.wordId)));
  $$('[data-learn-study-set-word-search]', root).forEach(form => form.addEventListener('submit', event => {
    event.preventDefault();
    const data = new FormData(form);
    learnState.studySetWordPickerQuery = String(data.get('query') || '').trim();
    renderLearn();
  }));
  $$('[data-learn-study-set-add-words]', root).forEach(form => form.addEventListener('submit', event => {
    event.preventDefault();
    const data = new FormData(form);
    addSelectedVocabularyToLearnStudySet(form.dataset.learnStudySetAddWords, data.getAll('wordId'));
  }));
  $$('[data-learn-review-target-preset]', root).forEach(button => button.addEventListener('click', () => {
    const language = button.dataset.language;
    const custom = root.querySelector(`.learn-review-target-custom[data-language="${language}"]`)?.value || '';
    setLearnReviewTarget(language, button.dataset.learnReviewTargetPreset, custom);
    renderLearn();
  }));
  $$('.learn-review-target-custom', root).forEach(input => input.addEventListener('change', () => {
    setLearnReviewTarget(input.dataset.language, 'custom', input.value);
    renderLearn();
  }));
  $('#learnMaintenanceSrsPreference', root)?.addEventListener('change', event => {
    LearningPracticeModel.setMaintenancePreference(event.target.checked, learnStorage());
    renderLearn();
  });
  $('#learnBackBtn', root)?.addEventListener('click', backLearnPage);
  root.onkeydown = event => {
    if(!learnState.page.startsWith('vocabulary:daily:') || !learnState.unifiedRevealed) return;
    if(event.target?.closest?.('input, select, textarea, button, details, dialog, [contenteditable="true"]')) return;
    const confidence = { '1': 'again', '2': 'hard', '3': 'good', '4': 'easy' }[event.key];
    if(confidence){ event.preventDefault(); gradeUnifiedPractice(confidence); }
  };
}
function renderLearn(){
  const root = $('#learnShell'); if(!root) return;
  if(typeof isAppDataReady === 'function' && !isAppDataReady()){
    root.innerHTML = '<section class="panel learn-panel"><h1>Learn</h1><p class="progress-empty" role="status">Preparing your learning library…</p></section>';
    return;
  }
  root.innerHTML = measureLearnSynchronous('renderLearnPage', renderLearnPage);
  measureLearnSynchronous('wireLearn', wireLearn);
  if(typeof window !== 'undefined') window.PuritanLifecycleDiagnostics?.render?.('learn', root.querySelectorAll('button, input, select, textarea, form').length + (root.onkeydown ? 1 : 0));
  if(root.querySelector('[data-learn-start-daily]:not([disabled])')) markLearnPerformanceMilestone('primary-buttons-interactive');
  if(typeof requestAnimationFrame === 'function') requestAnimationFrame(() => markLearnPerformanceMilestone('shell-visible'));
  else markLearnPerformanceMilestone('shell-visible');
}

if(typeof window !== 'undefined') Object.assign(window, { LearnAreas, LearnReviewTargetDefaults, LearnReviewTargetPresets, LearnReviewTargetStorageKey, LearnPracticeSrsPreferenceStorageKey, learnState, learnArea, learnChild, learnPageTitle, learnBreadcrumbs, learnReviewTargets, learnReviewTarget, saveLearnReviewTargets, setLearnReviewTarget, learnPracticeSrsPreference, setLearnPracticeSrsPreference, learnReviewQueueSummary, parseLearnCustomFrequency, setLearnCustomFrequency, resetLearn, setLearnPage, backLearnPage, wireLearn, renderLearn, renderLearnPage, learnBookList, learnPathForPage, startLearnVocabularyPath, learnCurrentVocabularyWord, markLearnPathKnown, learnStudySets, learnStudySet, createLearnStudySet, createStudySetFromCurrentScope, addVocabularyToLearnStudySet, addSelectedVocabularyToLearnStudySet, createStudySetWithVocabulary, deleteLearnStudySet, markLearnStudySetKnown, reviewLearnVocabularyWord, revealLearnReview, gradeLearnReview, ensureLearnPracticeSession, revealLearnPractice, gradeLearnPractice, recognitionTargetsForLearn, selectedRecognitionTargetIds, toggleRecognitionSelection, clearRecognitionSelection, startRecognitionSession, startSelectedRecognitionSession, revealRecognitionAnswer, gradeRecognitionAnswer, openLearnReference });
if(typeof module !== 'undefined') module.exports = { LearnAreas, LearnFrequencyThresholds, LearnReviewTargetDefaults, LearnReviewTargetPresets, LearnReviewTargetStorageKey, LearnPracticeSrsPreferenceStorageKey, learnState, learnArea, learnChild, learnPageTitle, learnBreadcrumbs, learnReviewTargets, learnReviewTarget, saveLearnReviewTargets, setLearnReviewTarget, learnPracticeSrsPreference, setLearnPracticeSrsPreference, learnReviewQueueSummary, parseLearnCustomFrequency, setLearnCustomFrequency, resetLearn, learnBookList, learnPathForPage, setLearnPage, backLearnPage, wireLearn, renderLearnPage, startLearnVocabularyPath, learnCurrentVocabularyWord, markLearnPathKnown, learnStudySets, learnStudySet, createLearnStudySet, createStudySetFromCurrentScope, addVocabularyToLearnStudySet, addSelectedVocabularyToLearnStudySet, createStudySetWithVocabulary, deleteLearnStudySet, markLearnStudySetKnown, reviewLearnVocabularyWord, revealLearnReview, gradeLearnReview, ensureLearnPracticeSession, revealLearnPractice, gradeLearnPractice, recognitionTargetsForLearn, selectedRecognitionTargetIds, toggleRecognitionSelection, clearRecognitionSelection, startRecognitionSession, startSelectedRecognitionSession, revealRecognitionAnswer, gradeRecognitionAnswer, openLearnReference };
if(typeof window !== 'undefined') Object.assign(window, { LearnMaintenanceSessionSizeMax, learnDailyPracticeSummary, parseMaintenanceSessionSize, startLearnMaintenanceSession, revealLearnMaintenance, gradeLearnMaintenance, stopLearnMaintenance, resetLearnMaintenance, chooseLearnMaintenanceFocus, selectAllLearnMaintenanceGrades, renderMaintenancePracticePage });
if(typeof module !== 'undefined') Object.assign(module.exports, { LearnMaintenanceSessionSizeMax, learnDailyPracticeSummary, parseMaintenanceSessionSize, startLearnMaintenanceSession, revealLearnMaintenance, gradeLearnMaintenance, stopLearnMaintenance, resetLearnMaintenance, chooseLearnMaintenanceFocus, selectAllLearnMaintenanceGrades, renderMaintenancePracticePage });
if(typeof window !== 'undefined') Object.assign(window, { learnProfile, dailyPracticeDashboardSummary, startDailyPractice, prepareDailyPractice, prepareLearnVocabularyEntries, discardDailyPractice, revealUnifiedPractice, gradeUnifiedPractice, startDifficultRecap, toggleUnifiedAttention, renderDailyPracticePage, renderPracticeCustomize });
if(typeof module !== 'undefined') Object.assign(module.exports, { learnProfile, dailyPracticeDashboardSummary, startDailyPractice, prepareDailyPractice, prepareLearnVocabularyEntries, discardDailyPractice, revealUnifiedPractice, gradeUnifiedPractice, startDifficultRecap, toggleUnifiedAttention, renderDailyPracticePage, renderPracticeCustomize, renderConfidenceControls });
if(typeof window !== 'undefined' && learnPerformanceEnabled()) window.PuritanLearnPerformance = { begin: beginLearnPerformanceNavigation, prepare: prepareLearnPerformanceMeasurement, snapshot: learnPerformanceSnapshot };
if(typeof window !== 'undefined') Object.assign(window, { beginLearnPerformanceNavigation, prepareLearnPerformanceMeasurement });
if(typeof module !== 'undefined') Object.assign(module.exports, { normalizeLegacyLearnPracticePage, beginLearnPerformanceNavigation, learnPerformanceSnapshot });
