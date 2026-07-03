/* ---------- Reader ---------- */
const ReaderStorageKey = 'pp_reader_location';
const ReaderSettingsStorageKey = 'pp_reader_adaptive_settings';
const ReaderAssistancePresets = ['everything', '50', '30', '20', '10', '5', '2', '1', 'none'];
const ReaderTranslationOptions = [
  { id: 'oeb', label: 'OEB', name: 'Open English Bible' },
  { id: 'web', label: 'WEB', name: 'World English Bible' }
];
const ReaderDefaultSettings = {
  display: 'original',
  translation: 'on',
  translationProvider: 'oeb',
  textMode: 'original',
  assistance: 'everything',
  customThreshold: '',
  hideKnown: false,
  indicator: 'none',
  floatingControls: false,
  floatingTranslationToggle: false,
  showTranslationToggle: true
};
const ReaderSharedSettingKeys = ['display', 'translation', 'translationProvider', 'textMode', 'hideKnown', 'indicator', 'floatingControls', 'floatingTranslationToggle', 'showTranslationToggle'];
const HebrewInterlinearUnavailableMessage = 'Hebrew interlinear is not available yet because token-level gloss data is still being prepared.';
const ReaderConfig = {
  hebrew: {
    label: 'Hebrew Bible',
    shortLabel: 'Hebrew',
    htmlLang: 'he',
    dir: 'rtl',
    dataRoot: 'data/hebrew',
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

let readerState = {
  language: 'greek',
  book: 'matthew',
  chapter: 1,
  chapterData: null,
  translationData: null,
  translationStatus: null,
  loading: false,
  error: '',
  focusVerse: '',
  activeToken: null,
  wordPageInfo: null
};
const readerChapterCache = new Map();
const readerTranslationLoadCounts = {};
const readerManifestCache = new Map();
const readerLoadCounts = {};
const readerGlossSourceCache = new Map();
const readerSearchIndexCache = new Map();
let readerPopupLastTrigger = null;
let readerHiddenToastAt = 0;
let readerSettingsPanelOpen = false;
let readerSearchOpen = false;

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
function getReaderLocation(){ return { language: readerState.language, book: readerState.book, chapter: readerState.chapter }; }
function saveReaderLocation(location = getReaderLocation()){
  const clean = { language: location.language || 'greek', book: location.book || 'matthew', chapter: Number(location.chapter) || 1 };
  if(typeof writeStorageJson === 'function') writeStorageJson(ReaderStorageKey, clean);
  else if(typeof localStorage !== 'undefined') localStorage.setItem(ReaderStorageKey, JSON.stringify(clean));
}
function loadReaderLocation(){
  let stored = null;
  if(typeof readStorageJson === 'function') stored = readStorageJson(ReaderStorageKey, null);
  else if(typeof localStorage !== 'undefined') { try { stored = JSON.parse(localStorage.getItem(ReaderStorageKey) || 'null'); } catch(e) { stored = null; } }
  if(!stored) return getReaderLocation();
  const language = ReaderConfig[stored.language] ? stored.language : 'greek';
  const book = getReaderBook(language, stored.book).id;
  return { language, book, chapter: Number(stored.chapter) || 1 };
}
function sanitizeReaderSettings(settings = {}, language = readerState.language){
  const next = { ...ReaderDefaultSettings, ...(settings || {}) };
  next.display = next.display === 'interlinear' ? 'interlinear' : 'original';
  if(language === 'hebrew' && !readerLanguageCanUseInterlinear(language)) next.display = 'original';
  next.translation = next.translation === 'on' ? 'on' : 'off';
  next.translationProvider = ReaderTranslationOptions.some(option => option.id === next.translationProvider) ? next.translationProvider : ReaderDefaultSettings.translationProvider;
  next.textMode = next.textMode === 'english' ? 'english' : 'original';
  next.assistance = ReaderAssistancePresets.includes(String(next.assistance)) || next.assistance === 'custom' ? String(next.assistance) : ReaderDefaultSettings.assistance;
  next.customThreshold = String(next.customThreshold || '').trim();
  next.hideKnown = Boolean(next.hideKnown);
  next.indicator = ['none', 'tint', 'underline', 'footnote'].includes(next.indicator) ? next.indicator : ReaderDefaultSettings.indicator;
  next.floatingControls = Boolean(next.floatingControls);
  next.floatingTranslationToggle = Boolean(next.floatingTranslationToggle);
  next.showTranslationToggle = next.showTranslationToggle !== false;
  if(next.translation === 'off') next.textMode = 'original';
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
  return sanitizeReaderSettings({ ...shared, assistance: legacyLanguage.assistance, customThreshold: legacyLanguage.customThreshold }, language);
}
function saveReaderSettings(settings = loadReaderSettings(), language = readerState.language){
  const all = loadAllReaderSettings();
  const clean = sanitizeReaderSettings(settings, language);
  const existingLanguage = all[language] && typeof all[language] === 'object' ? all[language] : {};
  all.shared = { ...(all.shared || {}) };
  ReaderSharedSettingKeys.forEach(key => {
    if(key === 'display' && language === 'hebrew' && !readerLanguageCanUseInterlinear(language) && all.shared.display) return;
    all.shared[key] = clean[key];
  });
  all[language] = {
    assistance: clean.assistance,
    customThreshold: clean.customThreshold,
    ...(Object.prototype.hasOwnProperty.call(existingLanguage, 'legacy') ? { legacy: existingLanguage.legacy } : {})
  };
  saveAllReaderSettings(all);
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
  return settings.textMode === 'english' ? 'English' : (settings.display === 'interlinear' ? 'Interlinear' : 'Original');
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
  try { glosses = await fetchReaderJson(config.glossPath); }
  catch(e) { glosses = {}; }
  readerGlossSourceCache.set(language, glosses);
  return glosses;
}
async function loadReaderSearchIndex(language = 'greek'){
  const config = getReaderConfig(language);
  if(readerSearchIndexCache.has(language)) return readerSearchIndexCache.get(language);
  const index = await fetchReaderJson(config.searchIndexPath);
  readerSearchIndexCache.set(language, index);
  return index;
}
function getReaderVocabulary(language = 'greek'){
  if(typeof state !== 'undefined' && Array.isArray(state.data?.[language])) return state.data[language];
  return [];
}
function getReaderStudyVocabulary(language = 'greek'){
  const entries = getReaderVocabulary(language);
  return typeof getStudyEntries === 'function' ? getStudyEntries(entries, 'lemma') : entries;
}
function bestReaderVocabMatches(lemma, language = 'greek'){
  const exact = cleanReaderTokenValue(lemma);
  const normalized = normalizeReaderText(exact);
  const vocab = getReaderVocabulary(language);
  const matches = vocab.filter(entry => String(entry?.lang || language).toLowerCase() === language && cleanReaderTokenValue(entry?.lemma || entry?.word) === exact);
  if(matches.length) return matches;
  return vocab.filter(entry => String(entry?.lang || language).toLowerCase() === language && normalizeReaderText(entry?.lemma || entry?.word) === normalized);
}
function readerVocabularyLearningEntry(info = {}){
  const language = info.language || readerState.language || 'greek';
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
  return tokens.length > 0 && tokens.every(token => readerTokenEnglishGlossFields(token).some(isReaderEnglishGloss));
}
function readerLanguageCanUseInterlinear(language = readerState.language, data = null){
  return language !== 'hebrew' || (data ? readerChapterHasReliableInterlinearGlossData(data, language) : false);
}
function readerInterlinearAvailable(data = readerState.chapterData, language = readerState.language){
  return readerLanguageCanUseInterlinear(language, data);
}
function readerEffectiveSettings(settings = getActiveReaderSettings(), language = readerState.language, data = readerState.chapterData){
  if(settings.display !== 'interlinear' || readerInterlinearAvailable(data, language)) return settings;
  return { ...settings, display: 'original' };
}
function normalizeReaderToken(token = {}, language = readerState.language){
  const surface = cleanReaderTokenValue(token.surface || token.word || token.text || token.form);
  const lemma = cleanReaderTokenValue(token.lemma || token.strong || token.strongs || token.root || token.lexicalForm || surface);
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
    stem: cleanReaderTokenValue(token.stem)
  };
}
function readerTokenInterlinearHint(token = {}, language = readerState.language){
  const normalized = normalizeReaderToken(token, language);
  const gloss = readerTokenGloss(normalized, language);
  const lemma = readerTokenLemmaSupport(normalized, language);
  const morphology = readerTokenShortMorphology(normalized, language);
  return gloss || lemma || morphology || '';
}
function readerTokenInterlinearDetails(token = {}, language = readerState.language){
  if(language !== 'hebrew') return '';
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
    stem: normalized.stem
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
  return `${readerLearningStatusMark(readerLearningStatusForInfo(info))} ${readerLearningStatusForInfo(info)}`;
}
function renderReaderWordLearning(info = {}){
  if(!info.lemma && !info.surface) return '';
  const entry = readerVocabularyLearningEntry(info);
  const status = readerLearningStatusForInfo(info);
  const details = readerLearningDetailsForInfo(info);
  const label = readerLearningStatusLabel(info);
  const id = entry && ReaderVocabularyLearningModel ? ReaderVocabularyLearningModel.lemmaId(entry) : '';
  const language = info.language || readerState.language || 'greek';
  const action = status === ReaderVocabularyLearningModel?.STATUS?.NOT_LEARNED || status === 'Not Learned'
    ? `<button class="btn btn-ghost btn-sm" type="button" data-word-learn-action="learn" data-language="${escReaderAttr(language)}" data-word-id="${escReaderAttr(id)}">Learn This Word</button>`
    : status === ReaderVocabularyLearningModel?.STATUS?.LEARNING || status === ReaderVocabularyLearningModel?.STATUS?.REVIEWING || status === 'Learning' || status === 'Reviewing'
      ? `<button class="btn btn-ghost btn-sm" type="button" data-word-learn-action="review" data-language="${escReaderAttr(language)}" data-word-id="${escReaderAttr(id)}">Review This Word</button>`
      : `<span class="word-page-learning-known">Known</span><button class="btn btn-ghost btn-sm" type="button" data-word-learn-action="review" data-language="${escReaderAttr(language)}" data-word-id="${escReaderAttr(id)}">Review Again</button>`;
  const detailsHtml = details ? `
          <dl class="word-page-meta word-page-learning-meta">
            ${readerWordPageMeta('Next Review', details.nextReviewLabel)}
            ${readerWordPageMeta('Interval', details.intervalLabel)}
            ${readerWordPageMeta('Successful Reviews', String(details.successfulReviews))}
            ${readerWordPageMeta('Total Reviews', String(details.totalReviews))}
            ${readerWordPageMeta('Review History', details.historySummary)}
            ${readerWordPageMeta('Known Source', details.knownSource ? details.knownSource.replace(/_/g, ' ') : '')}
          </dl>
          <p class="small muted">${escHtml(details.explanation)}</p>` : '';
  return `
        <section class="word-page-section word-page-learning" aria-labelledby="wordPageLearningHeading">
          <h2 id="wordPageLearningHeading">Learning</h2>
          <div class="word-page-learning-row">
            <span class="word-page-learning-status">${escHtml(label)}</span>
            ${entry && ReaderVocabularyLearningModel ? action : '<span class="muted small">Not available in vocabulary learning.</span>'}
          </div>
          ${detailsHtml}
        </section>`;
}
function introduceReaderWordFromPage(info = readerState.wordPageInfo || {}){
  const entry = readerVocabularyLearningEntry(info);
  if(!entry || !ReaderVocabularyLearningModel) return false;
  ReaderVocabularyLearningModel.persistIntroduceEntry(entry, { type: 'word-page', language: entry.lang || info.language || readerState.language });
  renderReaderWordPage();
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
  const primaryGloss = cleanReaderTokenValue(normalized.primaryGloss || normalized.gloss)
    || cleanReaderTokenValue(sourceGloss?.primaryGloss)
    || cleanReaderTokenValue(vocabMatches.find(entry => entry.primaryGloss)?.primaryGloss)
    || splitLegacyGloss(vocabMatches.find(entry => entry.gloss)?.gloss)[0]
    || cleanReaderTokenValue(sourceGloss?.gloss);
  const alternateGlosses = mergeUniqueGlosses([
    ...(Array.isArray(sourceGloss?.alternateGlosses) ? sourceGloss.alternateGlosses : []),
    ...vocabMatches.flatMap(entry => Array.isArray(entry.alternateGlosses) ? entry.alternateGlosses : []),
    ...vocabMatches.flatMap(entry => splitLegacyGloss(entry.gloss)).filter(gloss => gloss !== primaryGloss)
  ]);
  const aggregateFrequency = vocabMatches.reduce((sum, entry) => sum + (Number(entry.freq) || 0), 0);
  const bestFrequency = aggregateFrequency || Math.max(0, ...vocabMatches.map(entry => Number(entry.freq) || 0));
  const indexFrequency = bestFrequency ? 0 : (await getReaderLemmaOccurrences(lemma, language, Number.MAX_SAFE_INTEGER)).length;
  return {
    surface: normalized.surface,
    lemma,
    sourceLemma: normalized.sourceLemma,
    lexicalForm: normalized.lexicalForm,
    hebrewLemma: normalized.hebrewLemma,
    root: normalized.root,
    stem: normalized.stem,
    primaryGloss,
    alternateGlosses: alternateGlosses.filter(gloss => gloss !== primaryGloss),
    parse: normalized.parse,
    parseExplanation: explainReaderParse(normalized.parse, language),
    frequency: bestFrequency || indexFrequency || '',
    reference: readerReferenceLabel(reference),
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
    info.lexicalForm,
    info.hebrewLemma,
    info.root,
    readerSourceLemmaBase(info.sourceLemma),
    info.lemma
  ].map(cleanReaderTokenValue).filter(Boolean);
  if(language === 'hebrew'){
    return candidates.find(value => hasHebrewText(value) && !isNumericReaderLemma(value)) || '';
  }
  return candidates.find(value => !isNumericReaderLemma(value)) || '';
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
    add('Person', ordinalPerson(person));
    add('Number', numbers[numberCode?.toLowerCase()]);
    if((moods[verbCode[2]] || moods[compact[3]]) === 'participle'){
      const form = compact[2] || raw.replace(/^V-\s*[123-]?[A-Z-]{3}-?/i, '').replace(/-/g, '').slice(0, 3);
      add('Case', cases[form[0]?.toLowerCase()]);
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
  const verb = raw.match(/(?:^H?V|\/V)([a-z0-9]+)/i)?.[1] || (/^V-/i.test(raw) ? raw.split('-').slice(1) : null);
  const nominal = raw.match(/^H[NA]([a-z]+)/i)?.[1] || (/^[NA]-/i.test(raw) ? raw.split('-')[1] : '');
  const stems = { q: 'Qal', n: 'Niphal', p: 'Piel', h: 'Hiphil', t: 'Hithpael' };
  const forms = { p: 'perfect', q: 'wayyiqtol', w: 'wayyiqtol', i: 'imperfect', v: 'imperative', r: 'participle', s: 'participle', a: 'infinitive absolute', c: 'infinitive construct' };
  const genders = { m: 'masculine', f: 'feminine', c: 'common' };
  const numbers = { s: 'singular', p: 'plural', d: 'dual' };
  const states = { a: 'absolute', c: 'construct', d: 'determined' };
  if(prefixes.length) add('Prefixes', prefixes.join(', '));
  if(suffix) add('Suffix', suffix);
  if(Array.isArray(verb)){
    add('Stem', verb[0]);
    add('Conjugation', verb[1]);
    const png = verb[2] || '';
    add('Person', ordinalPerson(png.match(/[123]/)?.[0]));
    add('Gender', genders[png.match(/[mfc]/)?.[0]]);
    add('Number', numbers[png.match(/[spd]/)?.[0]]);
  } else if(verb){
    add('Stem', stems[verb[0]] || verb[0]);
    add('Conjugation', forms[verb[1]] || verb[1]);
    const png = verb.slice(2).toLowerCase();
    add('Person', ordinalPerson(png.match(/[123]/)?.[0]));
    add('Gender', genders[png.match(/[mfc]/)?.[0]]);
    add('Number', numbers[png.match(/[spd]/)?.[0]]);
  } else if(nominal){
    const lower = nominal.toLowerCase();
    const isOshb = /^H[NA]/i.test(raw);
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
  if(language === 'hebrew'){
    if(pos === 'Verb'){
      const primary = sentenceJoin([grammarFieldValue(fields, 'Stem'), grammarFieldValue(fields, 'Conjugation')]);
      const agreement = sentenceJoin([grammarFieldValue(fields, 'Person'), grammarFieldValue(fields, 'Gender'), grammarFieldValue(fields, 'Number')]);
      return [pos, [primary, agreement].filter(Boolean).join(', ')].filter(Boolean).join(' — ');
    }
    if(['Noun', 'Adjective', 'Pronoun', 'Article'].includes(pos)){
      const nominal = sentenceJoin([grammarFieldValue(fields, 'Gender'), grammarFieldValue(fields, 'Number'), grammarFieldValue(fields, 'State')]);
      const withSuffix = suffix ? `${nominal ? `${nominal} ` : ''}with ${suffix} suffix` : nominal;
      return [pos, withSuffix].filter(Boolean).join(' — ');
    }
    return suffix ? `${pos} — with ${suffix} suffix` : pos;
  }
  if(pos === 'Verb'){
    const primary = sentenceJoin([grammarFieldValue(fields, 'Tense'), grammarFieldValue(fields, 'Voice'), grammarFieldValue(fields, 'Mood')]);
    const agreement = sentenceJoin([grammarFieldValue(fields, 'Person'), grammarFieldValue(fields, 'Number')]);
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
  const lemma = cleanReaderTokenValue(displayLemma || info.lemma || info.surface);
  const glosses = mergeUniqueGlosses([
    info.primaryGloss,
    ...(Array.isArray(info.alternateGlosses) ? info.alternateGlosses : [])
  ]);
  return `
        <section class="word-page-section word-page-identity" aria-labelledby="wordPageIdentityHeading">
          <h2 id="wordPageIdentityHeading">Identity</h2>
          <dl class="word-page-meta">
            ${readerWordPageMeta('Lemma', lemma)}
            ${readerWordPageMeta('Glosses', glosses.join(', '))}
            ${readerWordPageMeta('Frequency', info.frequency ? `${info.frequency}×` : '')}
            ${readerWordPageMeta('Part of Speech', context.partOfSpeech || readerPartOfSpeechForInfo(info))}
            ${readerWordPageMeta('Language', meta.label)}
          </dl>
        </section>`;
}
function renderReaderWordOccurrence(info = {}, context = {}){
  const language = info.language || readerState.language || 'greek';
  const meta = getReaderLanguageMeta(language);
  const fields = readerMorphologyFields(info)
    .filter(field => cleanReaderTokenValue(field.value))
    .map(field => ({ label: language === 'hebrew' && field.label === 'Prefixes' ? 'Prefix' : field.label, value: field.value }));
  const displayLemma = context.displayLemma || readerDisplayLemma(info);
  const strongId = context.strongId || readerStrongId(info);
  const root = cleanReaderTokenValue(info.root || info.hebrewLemma || displayLemma);
  const summary = readerGrammarSummary(info, context.partOfSpeech);
  const surface = cleanReaderTokenValue(info.surface);
  const parse = cleanReaderTokenValue(info.parse);
  if(!surface && !displayLemma && !parse && !fields.length && !info.reference) {
    return `
        <section class="word-page-section word-page-occurrence" aria-labelledby="wordPageOccurrenceHeading">
          <h2 id="wordPageOccurrenceHeading">This Occurrence</h2>
          <p class="word-page-context-empty">Open this word from the Reader to see occurrence-specific details.</p>
        </section>`;
  }
  const lemmaLabel = language === 'hebrew' ? 'Lemma / Root' : 'Lemma';
  return `
        <section class="word-page-section word-page-occurrence" aria-labelledby="wordPageOccurrenceHeading">
          <h2 id="wordPageOccurrenceHeading">This Occurrence</h2>
          ${surface ? `<p class="word-page-occurrence-form" lang="${escReaderAttr(meta.htmlLang)}" dir="${escReaderAttr(meta.dir)}">${escHtml(surface)}</p>` : ''}
          ${summary ? `<p class="word-page-grammar-summary">${escHtml(summary)}</p>` : ''}
          <dl class="word-page-grammar-details">
            ${readerWordPageMeta('Current Reference', info.reference)}
            ${readerWordPageMeta(lemmaLabel, displayLemma || root || strongId)}
            ${readerWordPageMeta('Strong’s ID', strongId)}
            ${readerWordPageMeta('Meaning in Context', info.primaryGloss)}
            ${fields.map(field => readerWordPageMeta(field.label, field.value)).join('')}
          </dl>
          ${parse ? `<p class="word-page-parse-code">Parse code: ${escHtml(parse)}</p>` : ''}
        </section>`;
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
async function loadReaderChapter(language = readerState.language, book = readerState.book, chapter = readerState.chapter){
  const key = readerCacheKey(language, book, chapter);
  if(readerChapterCache.has(key)) return readerChapterCache.get(key);
  const path = getReaderChapterPath(language, book, chapter);
  readerLoadCounts[key] = (readerLoadCounts[key] || 0) + 1;
  const data = await fetchReaderJson(path);
  readerChapterCache.set(key, data);
  return data;
}
async function loadReaderTranslationChapter(book = readerState.book, chapter = readerState.chapter, translationId = getActiveReaderSettings().translationProvider){
  const provider = getReaderTranslationProvider(translationId);
  if(!provider) return null;
  const key = readerTranslationCacheKey(book, chapter, translationId);
  readerTranslationLoadCounts[key] = (readerTranslationLoadCounts[key] || 0) + 1;
  const manifest = await provider.manifest();
  if(!provider.hasChapter(manifest, book, chapter)) throw new Error(`${provider.id.toUpperCase()} unavailable for ${book} ${chapter}`);
  return provider.loadChapter(book, chapter);
}
async function resolveReaderTranslationChapter(settings = getActiveReaderSettings(), book = readerState.book, chapter = readerState.chapter){
  const requested = getReaderTranslationOption(settings.translationProvider).id;
  const baseStatus = { requested, active: '', fallback: false, unavailable: false };
  try {
    const data = await loadReaderTranslationChapter(book, chapter, requested);
    if(requested === 'oeb' && readerState.chapterData && !readerChapterHasEnglish(readerState.chapterData, data)) throw new Error(`OEB unavailable for ${book} ${chapter}`);
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
async function setReaderLocation(location = {}){
  const language = ReaderConfig[location.language || readerState.language] ? (location.language || readerState.language) : 'greek';
  await loadReaderManifest(language);
  const book = getReaderBook(language, location.book || readerState.book).id;
  const chapter = clampReaderChapter(language, book, location.chapter || readerState.chapter);
  readerState = { ...readerState, language, book, chapter, chapterData: null, translationData: null, translationStatus: null, loading: true, error: '', focusVerse: location.verse || '' };
  renderReader();
  try {
    readerState.chapterData = await loadReaderChapter(language, book, chapter);
    await ensureReaderTranslationLoaded();
    readerState.loading = false;
    saveReaderLocation(readerState);
  } catch(error) {
    readerState.loading = false;
    readerState.error = error.message || 'Reader chapter failed to load.';
  }
  renderReader();
}
function getAdjacentReaderLocation(direction){
  const books = getReaderBooks(readerState.language);
  const idx = books.findIndex(book => book.id === readerState.book);
  const current = books[idx];
  if(direction < 0){
    const previousChapter = current.chapters[current.chapters.indexOf(readerState.chapter) - 1];
    if(previousChapter) return { ...readerState, chapter: previousChapter };
  }
  if(direction > 0 && current.chapters.includes(readerState.chapter + 1)) return { ...readerState, chapter: readerState.chapter + 1 };
  const nextBook = books[idx + direction];
  if(!nextBook) return null;
  return { language: readerState.language, book: nextBook.id, chapter: direction > 0 ? nextBook.chapters[0] : nextBook.chapters.at(-1) };
}
function renderReader(){
  const root = $('#readerShell'); if(!root) return;
  const meta = getReaderLanguageMeta(readerState.language);
  const config = getReaderConfig(readerState.language);
  const book = getReaderBook(readerState.language, readerState.book);
  const books = getReaderBooks(readerState.language);
  const chapters = getReaderBookChapters(readerState.language, readerState.book);
  const data = readerState.chapterData;
  const settings = getActiveReaderSettings();
  const effectiveSettings = readerEffectiveSettings(settings, readerState.language, data);
  root.innerHTML = `
    <section class="panel reader-controls" aria-label="Reader controls">
      <div class="reader-control-row reader-control-selects">
        <select id="readerLanguageSelect" class="input" aria-label="Reader language selector">${Object.entries(ReaderConfig).map(([key, item]) => `<option value="${key}" ${key===readerState.language?'selected':''}>${escHtml(item.shortLabel || item.label)}</option>`).join('')}</select>
        <select id="readerBookSelect" class="input" aria-label="Book selector">${books.map(item => `<option value="${item.id}" ${item.id===readerState.book?'selected':''}>${escHtml(item.name)}</option>`).join('')}</select>
        <select id="readerChapterSelect" class="input" aria-label="Chapter selector">${chapters.map(ch => `<option value="${ch}" ${ch===readerState.chapter?'selected':''}>Chapter ${ch}</option>`).join('')}</select>
      </div>
      <div class="reader-control-row reader-control-actions">
        <button class="btn btn-ghost btn-sm" id="readerPrevBtn" ${getAdjacentReaderLocation(-1)?'':'disabled'}>← Previous</button>
        <button class="btn btn-ghost btn-sm" id="readerNextBtn" ${getAdjacentReaderLocation(1)?'':'disabled'}>Next →</button>
        ${settings.translation === 'on' && settings.showTranslationToggle ? renderReaderTranslationToggle(settings, data) : ''}
        <details class="reader-settings" id="readerSettingsPanel" ${readerSettingsPanelOpen ? 'open' : ''}>
          <summary class="btn btn-ghost btn-sm">Reader Settings</summary>
          ${renderReaderSettingsPanel(settings, readerState.language, data)}
        </details>
        <button class="reader-search-toggle" id="readerSearchToggle" type="button" aria-expanded="${readerSearchOpen ? 'true' : 'false'}">Search</button>
        <button class="reader-progress-link" id="readerBookProgressBtn" type="button">Book Progress</button>
        <div class="reader-reference" id="readerReference"><span>${escHtml(book.name)} ${readerState.chapter}</span><small>${escHtml(renderReaderStatus(effectiveSettings))}</small></div>
      </div>
    </section>
    <section class="panel reader-search${readerSearchOpen ? '' : ' hidden'}" aria-label="${escReaderAttr(config.shortLabel || meta.label)} reader search">
      <input id="readerSearchInput" class="input" placeholder="${escReaderAttr(config.searchPlaceholder)}" autocomplete="off" />
      <button class="btn btn-primary btn-sm" id="readerSearchBtn">Search</button>
      <button class="btn btn-ghost btn-sm" id="readerSearchClose" type="button">Close</button>
      <div id="readerSearchResults" class="reader-search-results"></div>
    </section>
    <article class="reader-text reader-text-${escReaderAttr(meta.language)}" aria-live="polite" tabindex="0">
      ${readerState.loading ? '<div class="empty-state">Loading chapter…</div>' : ''}
      ${readerState.error ? `<div class="empty-state danger">${escHtml(readerState.error)}</div>` : ''}
      ${!readerState.loading && !readerState.error && data ? renderReaderChapter(data, effectiveSettings) : ''}
    </article>
    <div id="readerWordPopupRoot"></div>`;
  wireReaderControls();
  renderReaderWordPopup();
  if(readerState.focusVerse && typeof document !== 'undefined') setTimeout(() => document.getElementById(`readerVerse-${readerState.focusVerse}`)?.scrollIntoView({ block: 'center' }), 0);
}
function renderReaderSettingsPanel(settings = getActiveReaderSettings(), language = readerState.language, data = readerState.chapterData){
  const customInvalid = settings.assistance === 'custom' && settings.customThreshold && !/^[1-9]\d*$/.test(settings.customThreshold);
  const interlinearAvailable = readerLanguageCanUseInterlinear(language, data);
  const effectiveSettings = readerEffectiveSettings(settings, language, data);
  const button = (name, value, label, active, attrs = '') => `<button class="reader-setting-choice${active ? ' active' : ''}" type="button" data-reader-setting="${escReaderAttr(name)}" data-reader-value="${escReaderAttr(value)}" ${attrs}>${escHtml(label)}</button>`;
  return `
        <div class="reader-settings-panel" role="group" aria-label="Adaptive Reader settings">
          <button class="reader-settings-close" id="readerSettingsClose" type="button" aria-label="Close Adaptive Reader settings">✕</button>
          <div class="reader-setting-group">
            <div class="reader-setting-label">Display</div>
            <div class="reader-setting-row">${button('display', 'original', 'Original', effectiveSettings.display === 'original')}${button('display', 'interlinear', 'Interlinear', effectiveSettings.display === 'interlinear', interlinearAvailable ? '' : 'disabled aria-describedby="readerInterlinearUnavailable"')}</div>
            ${!interlinearAvailable && language === 'hebrew' ? `<p class="reader-setting-note" id="readerInterlinearUnavailable">${escHtml(HebrewInterlinearUnavailableMessage)}</p>` : ''}
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
  const unavailable = data && !readerChapterHasEnglish(data, readerState.translationData);
  const fallback = readerState.translationStatus?.fallback;
  const note = fallback ? 'OEB unavailable here. Showing WEB.' : (unavailable ? 'English unavailable for this passage.' : '');
  return `<div class="reader-translation-bar${settings.floatingTranslationToggle ? ' reader-translation-bar-floating' : ''}" aria-label="Translation">
      <div class="reader-translation-toggle" role="group" aria-label="Translation">
        <button class="${settings.textMode === 'original' ? 'active' : ''}" type="button" data-reader-text-mode="original">Original</button>
        <button class="${settings.textMode === 'english' ? 'active' : ''}" type="button" data-reader-text-mode="english" ${unavailable ? 'aria-describedby="readerTranslationUnavailable"' : ''}>English</button>
      </div>
      ${note ? `<span class="reader-translation-unavailable" id="readerTranslationUnavailable">${escHtml(note)}</span>` : ''}
    </div>`;
}
function renderReaderChapter(data, settings = getActiveReaderSettings()){
  const paragraphs = data.paragraphs || [{ verses: data.verses || [] }];
  const meta = getReaderLanguageMeta(data.language || readerState.language);
  const heading = `<h2 class="reader-chapter-heading reader-chapter-heading-quiet" dir="ltr">${escHtml(data.bookName)} ${data.chapter}</h2>`;
  if(settings.translation === 'on' && settings.textMode === 'english'){
    if(!readerChapterHasEnglish(data, readerState.translationData)) return `${heading}<div class="empty-state">English unavailable for this passage.</div>`;
    return heading + paragraphs.map(paragraph => `<p class="reader-paragraph reader-paragraph-english" lang="en" dir="ltr">${paragraph.verses.map(verse => renderReaderVerse(verse, data, settings)).join(' ')}</p>`).join('');
  }
  if(settings.display === 'interlinear' && !readerInterlinearAvailable(data, meta.language)){
    const originalSettings = { ...settings, display: 'original' };
    return `${heading}<div class="empty-state">${escHtml(HebrewInterlinearUnavailableMessage)}</div>` + paragraphs.map(paragraph => `<p class="reader-paragraph" lang="${escReaderAttr(meta.htmlLang)}" dir="${escReaderAttr(meta.dir)}">${paragraph.verses.map(verse => renderReaderVerse(verse, data, originalSettings)).join(' ')}</p>`).join('');
  }
  return heading + paragraphs.map(paragraph => `<p class="reader-paragraph" lang="${escReaderAttr(meta.htmlLang)}" dir="${escReaderAttr(meta.dir)}">${paragraph.verses.map(verse => renderReaderVerse(verse, data, settings)).join(' ')}</p>`).join('');
}
function renderReaderVerse(verse, data = readerState.chapterData || {}, settings = getActiveReaderSettings()){
  const number = verse.number || verse.verse;
  if(settings.translation === 'on' && settings.textMode === 'english') return `<span class="reader-verse reader-verse-english" id="readerVerse-${number}"><sup>${number}</sup>${escHtml(readerTranslationVerseEnglish(verse, readerState.translationData) || '')}</span>`;
  const language = data.language || readerState.language;
  const tokens = Array.isArray(verse.tokens) ? verse.tokens.map(token => normalizeReaderToken(token, language)).filter(token => token.surface && (token.lemma || token.parse || token.gloss || token.primaryGloss)) : [];
  const verseSettings = settings.display === 'interlinear' && !readerInterlinearAvailable({ language, verses: [{ ...verse, tokens }] }, language) ? { ...settings, display: 'original' } : settings;
  const text = tokens.length ? renderReaderTokens(tokens, { book: data.book, bookName: data.bookName, chapter: data.chapter, verse: number }, verseSettings, language) : escHtml(verse.text);
  return `<span class="reader-verse" id="readerVerse-${number}"><sup>${number}</sup>${text}</span>`;
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
    return `<button class="${classes.join(' ')}" type="button" lang="${escReaderAttr(meta.htmlLang)}" dir="${escReaderAttr(meta.dir)}" data-reader-assisted="${assisted ? 'true' : 'false'}" data-surface="${escReaderAttr(normalized.surface || '')}" data-lemma="${escReaderAttr(normalized.lemma || '')}" data-parse="${escReaderAttr(normalized.parse || '')}" data-source-lemma="${escReaderAttr(normalized.sourceLemma || '')}" data-primary-gloss="${escReaderAttr(normalized.primaryGloss || '')}" data-gloss="${escReaderAttr(normalized.gloss || '')}" data-root="${escReaderAttr(normalized.root || '')}" data-stem="${escReaderAttr(normalized.stem || '')}" data-lexical-form="${escReaderAttr(normalized.lexicalForm || '')}" data-book="${escReaderAttr(reference.book || '')}" data-book-name="${escReaderAttr(reference.bookName || '')}" data-chapter="${escReaderAttr(reference.chapter || '')}" data-verse="${escReaderAttr(reference.verse || '')}" aria-label="${escReaderAttr(assisted ? `Show word info for ${normalized.surface || `token ${index + 1}`}` : `${normalized.surface || `token ${index + 1}`} hidden by Reader settings`)}"><span class="reader-token-surface" lang="${escReaderAttr(meta.htmlLang)}" dir="${escReaderAttr(meta.dir)}">${escHtml(normalized.surface)}</span>${interlinear ? `<span class="reader-token-gloss" lang="en" dir="ltr">${escHtml(gloss || ' ')}</span>${details ? `<span class="reader-token-details" lang="en" dir="ltr">${escHtml(details)}</span>` : ''}` : ''}${assisted && settings.indicator === 'footnote' ? '<sup class="reader-token-marker">•</sup>' : ''}</button>`;
  }).join(' ');
}
function wireReaderControls(){
  $('#readerLanguageSelect')?.addEventListener('change', e => {
    const language = ReaderConfig[e.target.value] ? e.target.value : 'greek';
    const book = getReaderBook(language)?.id;
    setReaderLocation({ language, book, chapter: 1 });
  });
  $('#readerBookSelect')?.addEventListener('change', e => setReaderLocation({ language: readerState.language, book: e.target.value, chapter: 1 }));
  $('#readerChapterSelect')?.addEventListener('change', e => setReaderLocation({ language: readerState.language, book: readerState.book, chapter: Number(e.target.value) }));
  $('#readerPrevBtn')?.addEventListener('click', () => { const loc = getAdjacentReaderLocation(-1); if(loc) setReaderLocation(loc); });
  $('#readerNextBtn')?.addEventListener('click', () => { const loc = getAdjacentReaderLocation(1); if(loc) setReaderLocation(loc); });
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
  $$('[data-reader-text-mode]').forEach(btn => btn.addEventListener('click', () => updateReaderSetting('textMode', btn.dataset.readerTextMode)));
  $$('.reader-token').forEach(btn => btn.addEventListener('click', () => openReaderTokenPopup(btn)));
  if(typeof document !== 'undefined'){
    document.removeEventListener?.('keydown', handleReaderPopupKeydown);
    document.addEventListener?.('keydown', handleReaderPopupKeydown);
    document.removeEventListener?.('click', handleReaderDocumentClick);
    document.addEventListener?.('click', handleReaderDocumentClick);
  }
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
  const wasSettingsPanelOpen = readerSettingsPanelOpen;
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
    if(next.translation === 'off') next.textMode = 'original';
  } else if(key === 'translationProvider') {
    next.translationProvider = ReaderTranslationOptions.some(option => option.id === value) ? value : 'oeb';
  } else if(key === 'textMode') {
    next.textMode = value === 'english' ? 'english' : 'original';
  } else if(key === 'display') {
    if(value === 'interlinear' && !readerLanguageCanUseInterlinear(readerState.language, readerState.chapterData)){
      if(typeof toast === 'function') toast(HebrewInterlinearUnavailableMessage);
      next.display = 'original';
    } else {
      next.display = value === 'interlinear' ? 'interlinear' : 'original';
    }
  } else if(key === 'indicator') {
    next.indicator = ['none', 'tint', 'underline', 'footnote'].includes(value) ? value : 'none';
  }
  const saved = saveReaderSettings(next, readerState.language);
  readerSettingsPanelOpen = wasSettingsPanelOpen;
  if(saved.translation === 'on' && (key === 'translation' || key === 'translationProvider' || (key === 'textMode' && saved.textMode === 'english'))){
    ensureReaderTranslationLoaded(saved).then(() => renderReader());
  }
  renderReader();
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
  const token = {
    surface: button.dataset.surface || '',
    lemma: button.dataset.lemma || '',
    parse: button.dataset.parse || '',
    sourceLemma: button.dataset.sourceLemma || '',
    primaryGloss: button.dataset.primaryGloss || '',
    gloss: button.dataset.gloss || '',
    root: button.dataset.root || '',
    stem: button.dataset.stem || '',
    lexicalForm: button.dataset.lexicalForm || ''
  };
  readerPopupLastTrigger = button;
  const reference = {
    language: readerState.language,
    book: button.dataset.book || readerState.book,
    bookName: button.dataset.bookName || getReaderBook(readerState.language, readerState.book)?.name,
    chapter: Number(button.dataset.chapter) || readerState.chapter,
    verse: button.dataset.verse || ''
  };
  readerState.activeToken = { loading: true, info: { surface: token.surface, lemma: token.lemma, parse: token.parse, sourceLemma: token.sourceLemma, reference: readerReferenceLabel(reference), language: readerState.language } };
  renderReaderWordPopup();
  readerState.activeToken = { loading: false, info: await lookupReaderWordInfo(token, reference, readerState.language) };
  renderReaderWordPopup();
}
function closeReaderWordPopup(){
  if(!readerState.activeToken) return;
  readerState.activeToken = null;
  renderReaderWordPopup();
  readerPopupLastTrigger?.focus?.();
}
function navigateReaderGrammarLink(topicId){
  closeReaderWordPopup();
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
  if(info?.lemma || info?.surface) readerState.wordPageInfo = { ...info };
  closeReaderWordPopup();
  renderReaderWordPage();
  if(typeof showView === 'function') showView('wordPageView');
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
function renderReaderWordPage(){
  const root = $('#wordPageShell'); if(!root) return;
  const info = readerState.wordPageInfo || {};
  const meta = getReaderLanguageMeta(info.language || readerState.language);
  const headwordAttrs = meta.dir === 'rtl' ? ` lang="${escReaderAttr(meta.htmlLang)}" dir="${escReaderAttr(meta.dir)}"` : '';
  const lemma = cleanReaderTokenValue(info.lemma || info.surface);
  const surface = cleanReaderTokenValue(info.surface);
  const displayLemma = readerDisplayLemma(info);
  const headword = surface || displayLemma || lemma;
  const strongId = readerStrongId(info);
  const primaryGloss = cleanReaderTokenValue(info.primaryGloss);
  const alternateGlosses = Array.isArray(info.alternateGlosses) ? info.alternateGlosses.map(cleanReaderTokenValue).filter(Boolean) : [];
  const partOfSpeech = readerPartOfSpeechForInfo(info);
  const links = readerGrammarLinksForInfo(info);
  const referenceItems = [
    ['Quick Reference', partOfSpeech ? `${partOfSpeech} quick reference` : ''],
    ['Grammar Handbook', links.map(link => link.label).join(', ')],
    ['Paradigm Charts', readerParseKind(info.parse, info.parseExplanation) ? partOfSpeech : ''],
    ['Morphology Guide', cleanReaderTokenValue(info.parse) ? 'Parsing and morphology' : '']
  ].filter(([, value]) => cleanReaderTokenValue(value));
  const referenceHtml = `
        <section class="word-page-section" aria-labelledby="wordPageReferenceHeading">
          <h2 id="wordPageReferenceHeading">Reference</h2>
          ${links.length ? `<div class="reader-word-links word-page-links" aria-label="Related grammar links">${links.map(link => `<button class="reader-word-link" type="button" data-topic-id="${escHtml(link.topicId)}">${escHtml(link.label)}</button>`).join('')}</div>` : '<p class="word-page-context-empty">No direct Reference links are available for this word yet.</p>'}
          ${referenceItems.length ? `<dl class="word-page-meta word-page-meta-secondary">${referenceItems.map(([label, value]) => readerWordPageMeta(label, value)).join('')}</dl>` : ''}
        </section>`;
  root.innerHTML = `
    <section class="panel word-page-panel" aria-labelledby="wordPageTitle">
      <div class="word-page-top-actions">
        <button class="btn btn-primary" type="button" data-word-page-back-to-reader="true">Back to Reader</button>
      </div>
      <header class="word-page-header">
        ${lemma ? `<h1 id="wordPageTitle" class="word-page-headword"${headwordAttrs}>${escHtml(headword)}</h1>` : `<h1 id="wordPageTitle" class="word-page-headword word-page-empty-title">Choose a word</h1>`}
        ${partOfSpeech ? `<div class="word-page-pos">${escHtml(partOfSpeech)}</div>` : ''}
      </header>
      ${lemma ? `
        ${renderReaderWordIdentity(info, { displayLemma, partOfSpeech })}
        ${renderReaderWordOccurrence(info, { displayLemma, partOfSpeech, strongId })}
        ${primaryGloss || alternateGlosses.length ? `<section class="word-page-section" aria-labelledby="wordPageMeaningHeading">
          <h2 id="wordPageMeaningHeading">Glosses</h2>
          ${primaryGloss ? `<p class="word-page-primary-gloss">${escHtml(primaryGloss)}</p>` : ''}
          ${alternateGlosses.length ? `<div class="word-page-also"><div>Also translated as</div><p>${escHtml(alternateGlosses.join(' • '))}</p></div>` : ''}
        </section>` : ''}
        ${renderReaderWordLearning(info)}
        ${referenceHtml}
        ${renderReaderWordPageContext([], true)}
        <section class="word-page-section word-page-navigation" aria-labelledby="wordPageNavigationHeading">
          <h2 id="wordPageNavigationHeading">Navigation</h2>
          <button class="btn btn-primary" id="wordPageBackToReader" data-word-page-back-to-reader="true">Back to Reader</button>
        </section>` : `<p class="word-page-empty">Open a word from the Reader to build this page.</p>`}
    </section>`;
  $$('[data-word-page-back-to-reader]', root).forEach(button => button.addEventListener('click', () => {
    if(typeof showView === 'function') showView('readerView');
  }));
  $$('.reader-word-link', root).forEach(btn => btn.addEventListener('click', () => navigateReaderGrammarLink(btn.dataset.topicId)));
  $$('[data-word-learn-action]', root).forEach(btn => btn.addEventListener('click', () => {
    if(btn.dataset.wordLearnAction === 'learn') introduceReaderWordFromPage(info);
    if(btn.dataset.wordLearnAction === 'review') reviewReaderWordFromPage(info);
  }));
  attachReaderWordPageContextHandlers(root, info);
  if(lemma) updateReaderWordPageContext(lemma, info.language || readerState.language, 6, info);
}
function readerWordPageMeta(label, value){
  const clean = cleanReaderTokenValue(value);
  if(!clean) return '';
  return `<div><dt>${escHtml(label)}</dt><dd>${escHtml(clean)}</dd></div>`;
}
function renderReaderWordPopup(){
  const root = $('#readerWordPopupRoot'); if(!root) return;
  const active = readerState.activeToken;
  if(!active){ root.innerHTML = ''; return; }
  const info = active.info || {};
  const meta = getReaderLanguageMeta(info.language || readerState.language);
  const links = readerGrammarLinksForInfo(info);
  const parseExplanation = cleanReaderTokenValue(info.parseExplanation);
  const rawParse = cleanReaderTokenValue(info.parse);
  const hasDecodedParse = parseExplanation && parseExplanation !== rawParse;
  const grammarHtml = links.length ? `
          <div class="reader-word-grammar">
            <div class="reader-word-label">Grammar</div>
            <div class="reader-word-links" aria-label="Related grammar links">${links.map(link => `<button class="reader-word-link" type="button" data-topic-id="${escHtml(link.topicId)}">${escHtml(link.label)}</button>`).join('')}</div>
          </div>` : '';
  root.innerHTML = `
    <div class="reader-word-overlay" data-reader-popup-overlay>
      <section class="reader-word-popup" role="dialog" aria-modal="true" aria-labelledby="readerWordPopupTitle">
        <button class="reader-word-close" type="button" aria-label="Close word popup">✕</button>
        <div class="reader-word-surface" id="readerWordPopupTitle" lang="${escReaderAttr(meta.htmlLang)}" dir="${escReaderAttr(meta.dir)}">${escHtml(info.surface || 'Word')}</div>
        <div class="reader-word-gloss">${escHtml(info.primaryGloss || (active.loading ? 'Loading...' : '-'))}</div>
        ${hasDecodedParse ? `<p class="reader-word-meaning">${escHtml(parseExplanation)}</p>` : ''}
        ${info.alternateGlosses?.length ? `<p class="reader-word-also">Also: ${escHtml(info.alternateGlosses.join(', '))}</p>` : ''}
        <div class="reader-word-meta">
          ${readerPopupMeta('Lemma', info.lemma && info.lemma !== info.surface ? info.lemma : '')}
          ${readerPopupMeta('Frequency', info.frequency ? `${info.frequency}×` : '')}
          ${readerPopupMeta('Reference', info.reference)}
        </div>
        ${grammarHtml}
        ${rawParse ? `<div class="reader-word-parse-code">${hasDecodedParse ? 'Parse: ' : ''}${escHtml(rawParse)}</div>` : ''}
        <button class="reader-word-page-action btn btn-primary" type="button">Open Word Page</button>
      </section>
    </div>`;
  $('.reader-word-close', root)?.addEventListener('click', closeReaderWordPopup);
  $('[data-reader-popup-overlay]', root)?.addEventListener('click', event => { if(event.target?.dataset?.readerPopupOverlay !== undefined) closeReaderWordPopup(); });
  $$('.reader-word-link', root).forEach(btn => btn.addEventListener('click', () => navigateReaderGrammarLink(btn.dataset.topicId)));
  $('.reader-word-page-action', root)?.addEventListener('click', openReaderWordPage);
  $('.reader-word-close', root)?.focus?.();
}
function readerPopupMeta(label, value){
  const clean = Array.isArray(value) ? value.filter(Boolean).join(', ') : cleanReaderTokenValue(value);
  if(!clean) return '';
  return `<div class="reader-word-meta-item"><span>${escHtml(label)}</span><strong>${escHtml(clean)}</strong></div>`;
}
async function runReaderSearch(query){
  const box = $('#readerSearchResults'); if(!box) return [];
  const language = readerState.language;
  const meta = getReaderLanguageMeta(language);
  const direct = parseReaderReference(query, language);
  if(direct){ await setReaderLocation(direct); closeReaderSearch(); return [direct]; }
  const q = normalizeReaderText(query);
  if(q.length < 2){ box.innerHTML = '<div class="small muted">Enter at least 2 characters.</div>'; return []; }
  let index = [];
  try { index = await loadReaderSearchIndex(language); } catch(e) { box.innerHTML = '<div class="small muted">Search index unavailable.</div>'; return []; }
  const results = index.filter(item => normalizeReaderText(`${item.text} ${item.lemmas?.join(' ')}`).includes(q)).slice(0, 20);
  box.innerHTML = results.length ? results.map(item => `<button class="reader-result" data-language="${escReaderAttr(language)}" data-book="${escReaderAttr(item.book)}" data-chapter="${escReaderAttr(item.chapter)}" data-verse="${escReaderAttr(item.verse)}"><strong>${escHtml(item.bookName)} ${item.chapter}:${item.verse}</strong> <span lang="${escReaderAttr(meta.htmlLang)}" dir="${escReaderAttr(meta.dir)}">${escHtml(item.text)}</span></button>`).join('') : '<div class="small muted">No verses found.</div>';
  $$('.reader-result', box).forEach(btn => btn.addEventListener('click', async () => {
    await setReaderLocation({ language: btn.dataset.language || language, book: btn.dataset.book, chapter: Number(btn.dataset.chapter), verse: btn.dataset.verse });
    closeReaderSearch();
  }));
  return results;
}
async function initReader(){ const loc = loadReaderLocation(); readerState = { ...readerState, ...loc }; await setReaderLocation(loc); }
if(typeof window !== 'undefined') Object.assign(window, { ReaderConfig, ReaderTranslationOptions, ReaderDefaultSettings, readerState, readerChapterCache, readerTranslationLoadCounts, readerManifestCache, readerLoadCounts, getReaderChapterPath, getReaderLanguageMeta, loadReaderManifest, loadReaderChapter, loadReaderTranslationChapter, ensureReaderTranslationLoaded, setReaderLocation, getAdjacentReaderLocation, renderReader, renderReaderChapter, renderReaderVerse, renderReaderTokens, initReader, runReaderSearch, loadReaderLocation, saveReaderLocation, loadReaderSettings, saveReaderSettings, getActiveReaderSettings, updateReaderSetting, openReaderSettingsPanel, closeReaderSettingsPanel, openReaderSearch, closeReaderSearch, readerTokenQualifiesForAssistance, renderReaderSettingsPanel, renderReaderTranslationToggle, parseReaderReference, openReaderTokenPopup, closeReaderWordPopup, openReaderWordPage, renderReaderWordPage, lookupReaderWordInfo, explainReaderParse, readerGrammarLinksForInfo, readerPartOfSpeechForInfo, readerMorphologyFields, renderReaderMorphology, renderReaderGrammar, renderReaderWordIdentity, renderReaderWordOccurrence, getReaderLemmaOccurrences, openReaderContextOccurrence, openReaderBookProgress, renderReaderWordLearning, readerLearningStatusForInfo, readerLearningDetailsForInfo, introduceReaderWordFromPage, reviewReaderWordFromPage });
if(typeof module !== 'undefined') module.exports = { ReaderConfig, ReaderTranslationOptions, ReaderDefaultSettings, readerState: () => readerState, readerChapterCache, readerTranslationLoadCounts, readerManifestCache, readerLoadCounts, getReaderChapterPath, getReaderLanguageMeta, loadReaderManifest, normalizeReaderManifest, getReaderBookChapters, loadReaderChapter, loadReaderTranslationChapter, ensureReaderTranslationLoaded, setReaderLocation, getAdjacentReaderLocation, renderReader, renderReaderChapter, renderReaderVerse, renderReaderTokens, runReaderSearch, loadReaderLocation, saveReaderLocation, loadReaderSettings, saveReaderSettings, getActiveReaderSettings, updateReaderSetting, openReaderSettingsPanel, closeReaderSettingsPanel, openReaderSearch, closeReaderSearch, handleReaderPopupKeydown, handleReaderDocumentClick, readerAssistanceThreshold, readerTokenFrequency, readerTokenQualifiesForAssistance, renderReaderSettingsPanel, renderReaderTranslationToggle, readerChapterHasEnglish, readerTranslationVerseEnglish, parseReaderReference, normalizeReaderText, lookupReaderWordInfo, explainReaderParse, readerGrammarLinksForInfo, readerParseKind, readerPartOfSpeechForInfo, readerMorphologyFields, renderReaderMorphology, renderReaderGrammar, renderReaderWordIdentity, renderReaderWordOccurrence, openReaderTokenPopup, closeReaderWordPopup, openReaderWordPage, renderReaderWordPage, loadReaderSearchIndex, representativeReaderOccurrences, getReaderLemmaOccurrences, readerOccurrenceSnippet, renderReaderWordPageContext, renderReaderWordPageContextContent, attachReaderWordPageContextHandlers, openReaderContextOccurrence, openReaderBookProgress, renderReaderWordLearning, readerLearningStatusForInfo, readerLearningDetailsForInfo, introduceReaderWordFromPage, reviewReaderWordFromPage };
