/* ---------- Learn Shell ---------- */
const VocabularyLearningModel = (typeof VocabularyLearning !== 'undefined')
  ? VocabularyLearning
  : (typeof require === 'function' ? require('../../models/vocabulary-learning') : null);
const BookProgressModel = (typeof BookProgress !== 'undefined')
  ? BookProgress
  : (typeof require === 'function' ? require('../../core/book-progress') : null);
const ParadigmRecognitionModel = (typeof ParadigmRecognition !== 'undefined')
  ? ParadigmRecognition
  : (typeof require === 'function' ? require('./recognition-engine') : null);
const LearnProgressModel = (typeof ProgressService !== 'undefined')
  ? ProgressService
  : (typeof require === 'function' ? require('../../core/progress-service') : null);
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
      { id: 'parsing-drills', title: 'Parsing Drills', description: 'Use the legacy parsing drills as an additional study tool.' }
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

const learnState = { page: 'home', history: [], customFrequencyErrors: {}, activeVocabularyPath: '', currentVocabularyWordId: '', focusedReviewWordId: '', reviewReveal: false, progressCache: {}, progressLoading: {}, recognitionSession: null };
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
const LearnTestaments = {
  'old-testament': { title: 'Old Testament', language: 'hebrew' },
  'new-testament': { title: 'New Testament', language: 'greek' }
};
const learnManifestLoading = {};

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
function learnStorage(){
  if(typeof activeStorageAdapter !== 'undefined' && activeStorageAdapter) return activeStorageAdapter;
  if(typeof localStorage !== 'undefined') return {
    get: key => localStorage.getItem(key),
    set: (key, value) => localStorage.setItem(key, value),
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
    return [language, {
      preset,
      dailyTarget: Number.isFinite(target) && target > 0 ? Math.floor(target) : LearnReviewTargetDefaults[language].dailyTarget
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
  if(typeof loadReaderManifest !== 'function' || learnManifestLoading[language]) return;
  learnManifestLoading[language] = true;
  loadReaderManifest(language)
    .then(() => { if(learnState.page.includes(`:${language}`) || learnState.page.includes('old-testament') || learnState.page.includes('new-testament')) renderLearn(); })
    .catch(() => {})
    .finally(() => { learnManifestLoading[language] = false; });
}
function learnPageTitle(page = learnState.page){
  if(page === 'home') return 'Learn';
  const [areaId, childId] = page.split(':');
  const area = learnArea(areaId);
  if(!childId) return area?.title || 'Learn';
  return learnChild(area, childId)?.title || area?.title || 'Learn';
}
function setLearnPage(page, options = {}){
  const next = page || 'home';
  const changed = learnState.page !== next;
  if(!options.skipHistory && changed) learnState.history.push(learnState.page);
  learnState.page = next;
  if(changed) learnState.reviewReveal = false;
  if(changed && !next.includes(':session:')) learnState.recognitionSession = null;
  if(!options.preserveFocusedReview) learnState.focusedReviewWordId = '';
  renderLearn();
}
function resetLearn(options = {}){
  learnState.page = 'home';
  learnState.history = [];
  learnState.customFrequencyErrors = {};
  learnState.activeVocabularyPath = '';
  learnState.currentVocabularyWordId = '';
  learnState.focusedReviewWordId = '';
  learnState.reviewReveal = false;
  learnState.progressCache = {};
  learnState.progressLoading = {};
  learnState.recognitionSession = null;
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
function ensureBookProgress(language, bookId){
  const key = bookProgressKey(language, bookId);
  if(!BookProgressModel || learnState.progressCache[key] || learnState.progressLoading[key]) return;
  learnState.progressLoading[key] = true;
  BookProgressModel.bookProgress(language, bookId)
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
  if(typeof getStudyEntries === 'function') return getStudyEntries(list, 'lemma');
  return list;
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
function renderVocabularyLearningCard(entry, options = {}){
  const headword = typeof displayHeadwordForEntry === 'function'
    ? displayHeadwordForEntry(entry)
    : (entry.lexicalForm || entry.lemma || entry.word || '');
  return `
    <article class="learn-vocab-card">
      <h2>${escHtml(headword)}</h2>
      ${entry.lemma && entry.lemma !== headword ? `<p class="muted">${escHtml(entry.lemma)}</p>` : ''}
      ${renderVocabularyLearningDetails(entry, options.revealed !== false)}
    </article>`;
}
function startLearnVocabularyPath(pathPage){
  learnState.activeVocabularyPath = pathPage;
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
function revealLearnReview(){
  learnState.reviewReveal = true;
  renderLearn();
}
function gradeLearnReview(language, id, result){
  if(!VocabularyLearningModel) return;
  const entry = findLearnReviewEntry(language, id);
  if(entry) VocabularyLearningModel.persistReviewEntry(entry, result);
  if(learnState.focusedReviewWordId === id) learnState.focusedReviewWordId = '';
  learnState.reviewReveal = false;
  renderLearn();
}
function reviewLearnVocabularyWord(language, id){
  learnState.focusedReviewWordId = id || '';
  learnState.reviewReveal = false;
  setLearnPage(`vocabulary:review:${language || 'greek'}`, { preserveFocusedReview: true });
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
function renderLearnHome(){
  const summaries = ['greek','hebrew'].map(learnReviewQueueSummary);
  const totalToday = summaries.reduce((sum, item) => sum + item.todayCount, 0);
  const totalMore = summaries.reduce((sum, item) => sum + item.moreAvailable, 0);
  const estimated = summaries.reduce((sum, item) => sum + (item.todayCount ? item.estimatedMinutes : 0), 0);
  return `
    <section class="panel learn-panel learn-dashboard" aria-labelledby="learnTitle">
      ${renderLearnHeader('Learn', 'Practice and acquire knowledge.', 'learnTitle')}
      <section class="learn-dashboard-section learn-review-dashboard" aria-labelledby="learnReviewQueueTitle" data-learn-dashboard-section="review-queue">
        <div class="learn-section-heading">
          <h2 id="learnReviewQueueTitle">Review Queue</h2>
          <p>${totalToday ? `${totalToday} in today's queue. About ${Math.max(1, estimated)} minutes.` : 'You are caught up for today. You can practice more or continue a learning path.'}</p>
        </div>
        <div class="learn-review-summary-grid">
          ${summaries.map(summary => `
            <article class="learn-review-summary" data-learn-review-language="${escHtml(summary.language)}">
              <h3>${escHtml(summary.label)}</h3>
              <p class="learn-review-count">${escHtml(String(summary.todayCount))} in today's queue</p>
              <p>${escHtml(String(summary.moreAvailable))} more available</p>
              <p>Target ${escHtml(String(summary.target))}/day</p>
            </article>`).join('')}
        </div>
        <div class="learn-vocab-actions">
          <button class="btn btn-primary" type="button" data-learn-page="vocabulary:review:greek">Review Greek</button>
          <button class="btn btn-primary" type="button" data-learn-page="vocabulary:review:hebrew">Review Hebrew</button>
          <button class="btn btn-ghost btn-sm" type="button" data-learn-page="vocabulary:review:mixed">Review Mixed</button>
        </div>
        ${totalMore ? `<p class="muted small">The daily target limits today's queue without hiding the remaining backlog.</p>` : ''}
      </section>
      <section class="learn-dashboard-section" aria-labelledby="learnContinueTitle" data-learn-dashboard-section="continue-learning">
        <div class="learn-section-heading">
          <h2 id="learnContinueTitle">Continue Learning</h2>
          <p>Finish paths you have already begun.</p>
        </div>
        <div class="learn-card-grid">
          ${learnCard({ title: 'Greek Frequency Path', description: 'Continue global Greek vocabulary by frequency.' }, 'vocabulary:frequency:greek', 'learn-card-compact')}
          ${learnCard({ title: 'Hebrew Frequency Path', description: 'Continue global Hebrew vocabulary by frequency.' }, 'vocabulary:frequency:hebrew', 'learn-card-compact')}
          ${learnCard({ title: 'Reading Readiness', description: 'Continue a book or chapter preparation path.' }, 'reading-readiness', 'learn-card-compact')}
        </div>
      </section>
      <section class="learn-dashboard-section" aria-labelledby="learnStartTitle" data-learn-dashboard-section="start-new">
        <div class="learn-section-heading">
          <h2 id="learnStartTitle">Start Something New</h2>
          <p>Begin vocabulary or grammar learning from the established paths.</p>
        </div>
        <div class="learn-language-grid">
          <section class="learn-language-group">
            <h3>Vocabulary</h3>
            <div class="learn-card-grid learn-card-grid-compact">
              ${learnCard({ title: 'Frequency Paths', description: 'Core vocabulary by Greek or Hebrew frequency.' }, 'vocabulary:frequency', 'learn-card-compact')}
              ${learnCard({ title: 'Reading Paths', description: 'Prepare vocabulary for books and chapters.' }, 'vocabulary:book', 'learn-card-compact')}
              ${learnCard({ title: 'Study Sets', description: 'Quiet custom sets for focused goals.' }, 'study-sets', 'learn-card-compact')}
            </div>
          </section>
          <section class="learn-language-group">
            <h3>Grammar</h3>
            <div class="learn-card-grid learn-card-grid-compact">
              ${learnCard({ title: 'Greek Grammar Paths', description: 'Nouns, verbs, participles, infinitives, and syntax.' }, 'paradigms:recognition-practice', 'learn-card-compact')}
              ${learnCard({ title: 'Hebrew Grammar Paths', description: 'Basics, stems, weak verbs, construct chains, and syntax.' }, 'paradigms:recognition-practice', 'learn-card-compact')}
              ${learnCard({ title: 'Paradigm Recognition', description: 'Recognition remains the core grammar practice mode.' }, 'paradigms:recognition-practice', 'learn-card-compact')}
            </div>
          </section>
        </div>
      </section>
      <section class="learn-dashboard-section" aria-labelledby="learnPracticeTitle" data-learn-dashboard-section="practice">
        <div class="learn-section-heading">
          <h2 id="learnPracticeTitle">Practice</h2>
          <p>User-directed practice when you want more than the daily queue.</p>
        </div>
        <div class="learn-card-grid">
          ${learnCard({ title: 'Vocabulary Practice', description: 'Frequency, Reading Paths, Known words, Learning words, Study Sets, and custom selections.' }, 'vocabulary', 'learn-card-compact')}
          ${learnCard({ title: 'Grammar Practice', description: 'Recognition, parsing, weak verbs, advanced grammar, and paradigms.' }, 'paradigms', 'learn-card-compact')}
          ${learnCard({ title: 'Mixed Practice', description: 'A future capstone that combines vocabulary and grammar like real reading.' }, 'mixed-practice', 'learn-card-compact')}
        </div>
      </section>
      <section class="learn-dashboard-section learn-study-sets-supplement" aria-labelledby="learnStudySetsTitle" data-learn-dashboard-section="study-sets">
        <div class="learn-section-heading">
          <h2 id="learnStudySetsTitle">Study Sets</h2>
          <p>Create focused study sets for a book, exam, or personal review. Coming in a later v5 update.</p>
        </div>
        <button class="learn-card learn-card-compact" type="button" data-learn-page="study-sets">
          <span class="learn-card-title">Study Sets</span>
          <span class="learn-card-description">Quiet supplement to Frequency Paths, Reading Paths, and Grammar Learning Paths.</span>
        </button>
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
        ${learnCard({ title: 'Greek Review', description: `${greek.todayCount} in today's queue; ${greek.moreAvailable} more available` }, 'vocabulary:review:greek')}
        ${learnCard({ title: 'Hebrew Review', description: `${hebrew.todayCount} in today's queue; ${hebrew.moreAvailable} more available` }, 'vocabulary:review:hebrew')}
        ${learnCard({ title: 'Mixed Review', description: 'Review Greek and Hebrew together from today\'s queues.' }, 'vocabulary:review:mixed')}
      </div>
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
          ${renderVocabularyLearningCard(current, { revealed: learnState.reviewReveal })}
          <div class="learn-vocab-actions">
            ${learnState.reviewReveal
              ? `<button class="learn-review-action learn-review-recognized" type="button" data-learn-review-grade="recognized" data-lang="${escHtml(current.lang)}" data-word-id="${escHtml(learnWordId(current))}">Recognized</button>
                 <button class="learn-review-action learn-review-missed" type="button" data-learn-review-grade="missed" data-lang="${escHtml(current.lang)}" data-word-id="${escHtml(learnWordId(current))}">Missed</button>`
              : `<button class="btn btn-primary learn-review-action learn-review-reveal" type="button" id="learnRevealMeaningBtn">Reveal Meaning</button>`}
          </div>
          ${reviewCount > 1 ? `<p class="muted small">${reviewCount} reviews available</p>` : ''}`
        : `<section class="word-page-section learn-explainer">
            <h2>No reviews available</h2>
            <p>${mixed ? 'You are caught up for today. You can practice more or continue a learning path.' : `${escHtml(learnLanguageTitle(language))} words you are learning will appear here when they are ready to review.`}</p>
            <div class="learn-vocab-actions">
              <button class="btn btn-primary btn-sm" type="button" data-learn-page="vocabulary:new-words">Start New Words</button>
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
      ${renderLearnHeader(item.title, 'Choose Language', 'learnNewWordsTitle')}
      <div class="learn-card-grid learn-language-choice-grid">
        ${learnCard({ title: 'Greek', description: 'Study Greek words by overall frequency.' }, 'vocabulary:frequency:greek')}
        ${learnCard({ title: 'Hebrew', description: 'Study Hebrew words by overall frequency.' }, 'vocabulary:frequency:hebrew')}
      </div>
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
              <button class="btn btn-primary btn-sm" type="button" data-learn-page="vocabulary:review:${escHtml(language)}">Review Due Words</button>
              <button class="btn btn-ghost btn-sm" type="button" data-learn-page="home">Back to Learn</button>
            </div>
          </section>`)
        : `<section class="word-page-section learn-explainer">
            <h2>${escHtml(title)}</h2>
            <p>${escHtml(learnFrequencyDescription(language, threshold))}</p>
            <div class="learn-vocab-actions">
              <button class="btn btn-primary learn-start-learning-action" type="button" data-learn-start-path="${escHtml(page)}">Start Learning</button>
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
        ${renderQuietFrequencyChoices(language, `${basePage}:overall`)}
        ${learnCard({ title: 'By Chapter', description: 'Study vocabulary for individual chapters.' }, `${basePage}:chapter`, 'learn-card-compact')}
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
        ${progress ? renderQuietFrequencyChoices(language, basePage) : ''}
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
  return `
    <section class="panel learn-panel" aria-labelledby="learnParsingDrillsTitle">
      ${renderLearnHeader('Parsing Drills', 'Additional practice using the existing parsing drill tool.', 'learnParsingDrillsTitle')}
      <div class="learn-card-grid learn-language-choice-grid">
        <button class="learn-card" type="button" data-learn-open-view="parsing" data-learn-open-lang="greek">
          <span class="learn-card-title">Greek Parsing Drills</span>
          <span class="learn-card-description">Practice Greek forms with the existing drill interface.</span>
        </button>
        <button class="learn-card" type="button" data-learn-open-view="parsing" data-learn-open-lang="hebrew">
          <span class="learn-card-title">Hebrew Parsing Drills</span>
          <span class="learn-card-description">Practice Hebrew forms with the existing drill interface.</span>
        </button>
      </div>
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
function recognitionCategoryPageTitle(categoryId){
  const [language, kind] = String(categoryId || '').split('-');
  return `${learnLanguageTitle(language)} ${kind === 'nouns' ? 'Nouns' : 'Verbs'}`;
}
function startRecognitionSession(targetId, categoryId = ''){
  const session = ParadigmRecognitionModel?.createSession ? ParadigmRecognitionModel.createSession(targetId) : null;
  learnState.recognitionSession = session ? { targetId, index: 0, revealed: false, recognized: 0, missed: 0, total: session.total || session.items?.length || 0, recorded: false } : null;
  if(categoryId && learnState.page !== `paradigms:${categoryId}:session:${targetId}`){
    setLearnPage(`paradigms:${categoryId}:session:${targetId}`);
    return;
  }
  renderLearn();
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
  return `
    <section class="panel learn-panel learn-panel-wide" aria-labelledby="learnRecognitionCategoryTitle">
      ${renderLearnHeader(recognitionCategoryPageTitle(categoryId), 'Choose grouped practice or one paradigm.', 'learnRecognitionCategoryTitle')}
      ${groupedTarget ? `
        <section class="word-page-section learn-explainer">
          <h2>${escHtml(groupedTarget.title)}</h2>
          <p>${escHtml(groupedTarget.description)}</p>
          <button class="btn btn-primary learn-start-learning-action" type="button" data-learn-recognition-start="${escHtml(groupedTarget.id)}" data-learn-recognition-category="${escHtml(categoryId)}">Start Recognition</button>
        </section>` : ''}
      <section class="learn-language-group">
        <h2>Paradigms</h2>
        <div class="learn-card-grid">
          ${specificTargets.map(target => learnCard({ title: target.title, description: target.description }, `paradigms:${categoryId}:session:${target.id}`, 'learn-card-compact')).join('') || '<p class="muted">No verified recognition items are available for this category yet.</p>'}
        </div>
      </section>
    </section>`;
}
function renderRecognitionSessionPage(categoryId, targetId){
  const active = learnState.recognitionSession?.targetId === targetId ? learnState.recognitionSession : null;
  const built = ParadigmRecognitionModel?.createSession ? ParadigmRecognitionModel.createSession(targetId) : null;
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
  return `
    <section class="panel learn-panel learn-placeholder" aria-labelledby="learnStudySetsPageTitle">
      ${renderLearnHeader('Study Sets', 'Quiet supplement', 'learnStudySetsPageTitle')}
      <section class="word-page-section">
        <h2>Create focused study sets</h2>
        <p>Study Sets are planned as small custom learning paths for a book, exam, sermon preparation, or personal review. Full creation is deferred so the primary v5.2 Learn work can stay focused on Review Queue, Frequency Paths, Reading Paths, and Grammar Learning Paths.</p>
      </section>
    </section>`;
}
function renderMixedPracticePlaceholder(){
  return `
    <section class="panel learn-panel learn-placeholder" aria-labelledby="learnMixedPracticeTitle">
      ${renderLearnHeader('Mixed Practice', 'Supporting capstone', 'learnMixedPracticeTitle')}
      <section class="word-page-section">
        <h2>Vocabulary and grammar together</h2>
        <p>Mixed Practice will combine vocabulary and grammar in a reading-like session. The v5.2 dashboard keeps the entry point visible while leaving the SRS-counting prompt and deeper mixed engine for a later SRS/practice update.</p>
      </section>
    </section>`;
}
function renderLearnPage(){
  const [areaId, childId, thirdId, fourthId, fifthId, sixthId, seventhId] = learnState.page.split(':');
  const area = learnArea(areaId);
  if(areaId === 'study-sets') return renderStudySetsPlaceholder();
  if(areaId === 'mixed-practice') return renderMixedPracticePlaceholder();
  if(!area) return renderLearnHome();
  if(area.id === 'vocabulary' && childId === 'review' && !thirdId) return renderReviewChooser(area);
  if(area.id === 'vocabulary' && childId === 'review' && (thirdId === 'greek' || thirdId === 'hebrew' || thirdId === 'mixed')) return renderLanguageReviewPage(area, thirdId);
  if(area.id === 'vocabulary' && childId === 'new-words') return renderNewWordsPage(area);
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
  $$('.learn-card', root).forEach(card => card.addEventListener('click', () => setLearnPage(card.dataset.learnPage)));
  $$('.learn-breadcrumbs [data-learn-page]', root).forEach(crumb => crumb.addEventListener('click', () => setLearnPage(crumb.dataset.learnPage)));
  $$('[data-learn-start-path]', root).forEach(button => button.addEventListener('click', () => startLearnVocabularyPath(button.dataset.learnStartPath)));
  $$('[data-learn-word-learned]', root).forEach(button => button.addEventListener('click', () => learnCurrentVocabularyWord(button.dataset.lang, button.dataset.threshold, button.dataset.pathPage)));
  $$('[data-learn-mark-path-known]', root).forEach(button => button.addEventListener('click', () => markLearnPathKnown(button.dataset.lang, button.dataset.threshold, button.dataset.pathPage)));
  $('#learnRevealMeaningBtn', root)?.addEventListener('click', revealLearnReview);
  $$('[data-learn-review-grade]', root).forEach(button => button.addEventListener('click', () => gradeLearnReview(button.dataset.lang, button.dataset.wordId, button.dataset.learnReviewGrade)));
  $$('[data-learn-recognition-start]', root).forEach(button => button.addEventListener('click', () => startRecognitionSession(button.dataset.learnRecognitionStart, button.dataset.learnRecognitionCategory || '')));
  $$('[data-learn-recognition-reveal]', root).forEach(button => button.addEventListener('click', revealRecognitionAnswer));
  $$('[data-learn-recognition-grade]', root).forEach(button => button.addEventListener('click', () => gradeRecognitionAnswer(button.dataset.learnRecognitionGrade)));
  $$('[data-learn-reference-topic]', root).forEach(button => button.addEventListener('click', () => openLearnReference(button.dataset.learnReferenceTopic, button.dataset.learnReferenceSection || '')));
  $$('[data-learn-open-view]', root).forEach(button => button.addEventListener('click', () => {
    if(button.dataset.learnOpenLang && typeof setLang === 'function') setLang(button.dataset.learnOpenLang);
    const target = button.dataset.learnOpenView === 'parsing' ? '/parsing' : `/${button.dataset.learnOpenView}`;
    if(typeof navigateTo === 'function') navigateTo(target);
    else if(typeof showView === 'function') showView(button.dataset.learnOpenView === 'parsing' ? 'parsingView' : button.dataset.learnOpenView);
  }));
  $$('.learn-custom-frequency-form', root).forEach(form => form.addEventListener('submit', event => {
    event.preventDefault();
    setLearnCustomFrequency(form.dataset.learnCustomBase, form.querySelector('.learn-custom-frequency-input')?.value || '');
  }));
  $('#learnBackBtn', root)?.addEventListener('click', backLearnPage);
}
function renderLearn(){
  const root = $('#learnShell'); if(!root) return;
  root.innerHTML = renderLearnPage();
  wireLearn();
}

if(typeof window !== 'undefined') Object.assign(window, { LearnAreas, LearnReviewTargetDefaults, LearnReviewTargetPresets, LearnReviewTargetStorageKey, learnState, learnArea, learnChild, learnPageTitle, learnBreadcrumbs, learnReviewTargets, learnReviewTarget, learnReviewQueueSummary, parseLearnCustomFrequency, setLearnCustomFrequency, resetLearn, setLearnPage, backLearnPage, renderLearn, renderLearnPage, learnBookList, learnPathForPage, startLearnVocabularyPath, learnCurrentVocabularyWord, markLearnPathKnown, reviewLearnVocabularyWord, revealLearnReview, gradeLearnReview, recognitionTargetsForLearn, startRecognitionSession, revealRecognitionAnswer, gradeRecognitionAnswer, openLearnReference });
if(typeof module !== 'undefined') module.exports = { LearnAreas, LearnFrequencyThresholds, LearnReviewTargetDefaults, LearnReviewTargetPresets, LearnReviewTargetStorageKey, learnState, learnArea, learnChild, learnPageTitle, learnBreadcrumbs, learnReviewTargets, learnReviewTarget, learnReviewQueueSummary, parseLearnCustomFrequency, setLearnCustomFrequency, resetLearn, learnBookList, learnPathForPage, setLearnPage, backLearnPage, renderLearnPage, startLearnVocabularyPath, learnCurrentVocabularyWord, markLearnPathKnown, reviewLearnVocabularyWord, revealLearnReview, gradeLearnReview, recognitionTargetsForLearn, startRecognitionSession, revealRecognitionAnswer, gradeRecognitionAnswer, openLearnReference };
