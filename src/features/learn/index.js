/* ---------- Learn Shell ---------- */
const VocabularyLearningModel = (typeof VocabularyLearning !== 'undefined')
  ? VocabularyLearning
  : (typeof require === 'function' ? require('../../models/vocabulary-learning') : null);
const BookProgressModel = (typeof BookProgress !== 'undefined')
  ? BookProgress
  : (typeof require === 'function' ? require('../../core/book-progress') : null);
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
    groups: [
      {
        id: 'greek',
        title: 'Greek',
        children: [
          { id: 'greek-verbs', title: 'Verbs', emphasis: true, description: 'Greek verb recognition practice will be added in a future release.' },
          { id: 'greek-nouns', title: 'Nouns', description: 'Greek noun recognition practice will be added in a future release.' }
        ]
      },
      {
        id: 'hebrew',
        title: 'Hebrew',
        children: [
          { id: 'hebrew-verbs', title: 'Verbs', emphasis: true, description: 'Hebrew verb recognition practice will be added in a future release.' },
          { id: 'hebrew-nouns', title: 'Nouns', description: 'Hebrew noun recognition practice will be added in a future release.' }
        ]
      }
    ]
  },
  {
    id: 'reading-readiness',
    title: 'Reading Readiness',
    description: 'See how prepared you are to read books and chapters.',
    children: [
      { id: 'old-testament', title: 'Old Testament', description: 'Hebrew Bible books from the Reader.' },
      { id: 'new-testament', title: 'New Testament', description: 'Greek New Testament books from the Reader.' }
    ]
  }
];

const learnState = { page: 'home', history: [], customFrequencyErrors: {}, activeVocabularyPath: '', currentVocabularyWordId: '', focusedReviewWordId: '', reviewReveal: false, progressCache: {}, progressLoading: {} };
const LearnFrequencyThresholds = {
  greek: ['25', '10', '5', 'all'],
  hebrew: ['60', '30', '10', '5', 'all']
};
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
  if(options.render !== false) renderLearn();
}
function backLearnPage(){
  const previous = learnState.history.pop();
  if(previous){
    learnState.page = previous;
    renderLearn();
    return;
  }
  if(typeof showView === 'function') showView('listView');
  else renderLearn();
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
  return `
    <header class="learn-header">
      <button class="btn btn-ghost btn-sm" id="learnBackBtn" type="button">← Back</button>
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
function revealLearnReview(){
  learnState.reviewReveal = true;
  renderLearn();
}
function gradeLearnReview(language, id, result){
  if(!VocabularyLearningModel) return;
  const entry = findLearnVocabularyEntry(language, id);
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
  return `
    <section class="panel learn-panel" aria-labelledby="learnTitle">
      ${renderLearnHeader('Learn', 'Choose a study area.', 'learnTitle')}
      <div class="learn-card-grid">
        ${LearnAreas.map(area => learnCard(area, area.id)).join('')}
      </div>
    </section>`;
}
function renderReviewChooser(area){
  const item = learnChild(area, 'review');
  const store = learnVocabularyStore();
  const greekDue = VocabularyLearningModel ? VocabularyLearningModel.dueEntries(learnVocabularyEntries('greek'), store).length : 0;
  const hebrewDue = VocabularyLearningModel ? VocabularyLearningModel.dueEntries(learnVocabularyEntries('hebrew'), store).length : 0;
  return `
    <section class="panel learn-panel" aria-labelledby="learnReviewTitle">
      ${renderLearnHeader(item.title, 'Reviews Available', 'learnReviewTitle')}
      <div class="learn-card-grid">
        ${learnCard({ title: 'Greek Review', description: `${greekDue} ${greekDue === 1 ? 'review' : 'reviews'} available` }, 'vocabulary:review:greek')}
        ${learnCard({ title: 'Hebrew Review', description: `${hebrewDue} ${hebrewDue === 1 ? 'review' : 'reviews'} available` }, 'vocabulary:review:hebrew')}
      </div>
    </section>`;
}
function renderLanguageReviewPage(area, language){
  const item = learnChild(area, 'review');
  const title = `${learnLanguageTitle(language)} Review`;
  if(VocabularyLearningModel){
    const store = learnVocabularyStore();
    const due = VocabularyLearningModel.dueEntries(learnVocabularyEntries(language), store);
    const focused = learnState.focusedReviewWordId ? findLearnVocabularyEntry(language, learnState.focusedReviewWordId) : null;
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
            <p>${escHtml(learnLanguageTitle(language))} words you are learning will appear here when they are ready to review.</p>
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
            <button class="btn" type="button" data-learn-word-learned="true" data-lang="${escHtml(language)}" data-threshold="${escHtml(threshold)}" data-path-page="${escHtml(page)}">Learn Another Word</button>
          </div>`
        : `<section class="word-page-section learn-explainer">
            <h2>Path complete</h2>
            <p>There are no Not Learned words remaining in this frequency path.</p>
          </section>`)
        : `<section class="word-page-section learn-explainer">
            <h2>${escHtml(title)}</h2>
            <p>${escHtml(learnFrequencyDescription(language, threshold))}</p>
            <button class="btn btn-primary learn-start-learning-action" type="button" data-learn-start-path="${escHtml(page)}">Start Learning</button>
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
function renderLearnPage(){
  const [areaId, childId, thirdId, fourthId, fifthId, sixthId, seventhId] = learnState.page.split(':');
  const area = learnArea(areaId);
  if(!area) return renderLearnHome();
  if(area.id === 'vocabulary' && childId === 'review' && !thirdId) return renderReviewChooser(area);
  if(area.id === 'vocabulary' && childId === 'review' && (thirdId === 'greek' || thirdId === 'hebrew')) return renderLanguageReviewPage(area, thirdId);
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
  $('#learnRevealMeaningBtn', root)?.addEventListener('click', revealLearnReview);
  $$('[data-learn-review-grade]', root).forEach(button => button.addEventListener('click', () => gradeLearnReview(button.dataset.lang, button.dataset.wordId, button.dataset.learnReviewGrade)));
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

if(typeof window !== 'undefined') Object.assign(window, { LearnAreas, learnState, learnArea, learnChild, learnPageTitle, learnBreadcrumbs, parseLearnCustomFrequency, setLearnCustomFrequency, resetLearn, setLearnPage, backLearnPage, renderLearn, renderLearnPage, learnBookList, learnPathForPage, startLearnVocabularyPath, learnCurrentVocabularyWord, reviewLearnVocabularyWord, revealLearnReview, gradeLearnReview });
if(typeof module !== 'undefined') module.exports = { LearnAreas, LearnFrequencyThresholds, learnState, learnArea, learnChild, learnPageTitle, learnBreadcrumbs, parseLearnCustomFrequency, setLearnCustomFrequency, resetLearn, learnBookList, learnPathForPage, setLearnPage, backLearnPage, renderLearnPage, startLearnVocabularyPath, learnCurrentVocabularyWord, reviewLearnVocabularyWord, revealLearnReview, gradeLearnReview };
