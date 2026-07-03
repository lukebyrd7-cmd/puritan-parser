/* ---------- Onboarding model ---------- */
(function(root, factory){
  const api = factory(root);
  if(typeof module === 'object' && module.exports) module.exports = api;
  root.PuritanOnboarding = api;
  Object.keys(api).forEach(key => { root[key] = root[key] || api[key]; });
})(typeof globalThis !== 'undefined' ? globalThis : this, function(root){
  const COMPLETED_KEY = 'pp_onboarding_completed';
  const PROFILE_KEY = 'pp_onboarding_profile';
  const START_HERE_KEY = 'pp_onboarding_start_here';
  const VERSION = 1;
  const LANGUAGES = ['greek', 'hebrew', 'both'];
  const GOALS = ['read-greek', 'read-hebrew', 'build-vocabulary', 'prepare-book', 'maintain', 'start-beginning'];
  const SURVEY_CHOICES = ['yes', 'no', 'skip'];
  const GREEK_GRAMMAR = ['noun-cases', 'verb-endings', 'participles', 'infinitives', 'subjunctives', 'imperatives', 'mi-verbs', 'basic-syntax'];
  const HEBREW_GRAMMAR = ['nouns-adjectives', 'pronominal-suffixes', 'construct-chains', 'qal-verbs', 'derived-stems', 'weak-verbs', 'wayyiqtol', 'basic-hebrew-syntax'];
  const VOCAB_BANDS = {
    greek: {
      none: { id: 'none', label: 'None', threshold: null },
      '50': { id: '50', label: 'Most words 50x+', threshold: 50 },
      '30': { id: '30', label: 'Most words 30x+', threshold: 30 },
      '10': { id: '10', label: 'Most words 10x+', threshold: 10 },
      common: { id: 'common', label: 'Most common GNT vocabulary', threshold: 1 }
    },
    hebrew: {
      none: { id: 'none', label: 'None', threshold: null },
      '100': { id: '100', label: 'Most words 100x+', threshold: 100 },
      '75': { id: '75', label: 'Most words 75x+', threshold: 75 },
      '50': { id: '50', label: 'Most words 50x+', threshold: 50 },
      common: { id: 'common', label: 'Most common Hebrew Bible vocabulary', threshold: 1 }
    }
  };
  const PROFICIENCY_LEVELS = {
    greek: ['new', 'alphabet-basics', 'first-year', 'gnt-with-help', 'comfortable-maintenance'],
    hebrew: ['new', 'alphabet-vowels', 'first-year', 'narrative-with-help', 'comfortable-maintenance']
  };
  const USER_DATA_KEYS = [
    'pp_vocab_greek',
    'pp_vocab_hebrew',
    'pp_vocab_learning',
    'pp_study_sets',
    'pp_prefs',
    'pp_dashboard',
    'pp_last_lang',
    'pp_learn_review_targets',
    'pp_learn_practice_srs_preference',
    'pp_reader_adaptive_settings',
    'pp_recognition_history'
  ];

  function clean(value){ return typeof value === 'string' ? value.trim() : ''; }
  function nowISO(){ return new Date().toISOString(); }
  function storage(){
    if(root.activeStorageAdapter) return root.activeStorageAdapter;
    if(root.localStorage) return {
      get: key => root.localStorage.getItem(key),
      set: (key, value) => root.localStorage.setItem(key, value),
      remove: key => root.localStorage.removeItem(key)
    };
    return null;
  }
  function safeJson(raw, fallback = null){
    try { return raw ? JSON.parse(raw) : fallback; } catch(e){ return fallback; }
  }
  function uniqueValid(values, allowed){
    const seen = new Set();
    return (Array.isArray(values) ? values : []).map(clean).filter(value => {
      if(!allowed.includes(value) || seen.has(value)) return false;
      seen.add(value);
      return true;
    });
  }
  function profileLanguages(selection){
    const language = LANGUAGES.includes(clean(selection)) ? clean(selection) : 'greek';
    return language === 'both' ? ['greek','hebrew'] : [language];
  }
  function normalizeLanguageProfile(language, profile = {}){
    const surveyChoice = SURVEY_CHOICES.includes(clean(profile.surveyChoice)) ? clean(profile.surveyChoice) : 'skip';
    const proficiency = PROFICIENCY_LEVELS[language].includes(clean(profile.proficiency)) ? clean(profile.proficiency) : 'new';
    const vocabBand = VOCAB_BANDS[language][clean(profile.vocabBand)] ? clean(profile.vocabBand) : 'none';
    const grammarAllowed = language === 'hebrew' ? HEBREW_GRAMMAR : GREEK_GRAMMAR;
    return {
      surveyChoice,
      proficiency,
      vocabBand,
      familiarGrammar: surveyChoice === 'yes' ? uniqueValid(profile.familiarGrammar, grammarAllowed) : []
    };
  }
  function normalizeProfile(payload = {}, existing = null){
    const source = payload && typeof payload === 'object' ? payload : {};
    const selectedLanguage = LANGUAGES.includes(clean(source.selectedLanguage)) ? clean(source.selectedLanguage) : 'greek';
    const goal = GOALS.includes(clean(source.goal)) ? clean(source.goal) : 'start-beginning';
    const createdAt = clean(source.createdAt) || clean(existing?.createdAt) || nowISO();
    return {
      schemaVersion: VERSION,
      selectedLanguage,
      languages: profileLanguages(selectedLanguage),
      goal,
      greek: normalizeLanguageProfile('greek', source.greek),
      hebrew: normalizeLanguageProfile('hebrew', source.hebrew),
      startHere: Array.isArray(source.startHere) ? source.startHere.filter(Boolean).map(item => ({ ...item })) : [],
      createdAt,
      updatedAt: clean(source.updatedAt) || nowISO()
    };
  }
  function loadProfile(){
    const adapter = storage();
    if(!adapter) return normalizeProfile();
    return normalizeProfile(safeJson(adapter.get(PROFILE_KEY), null));
  }
  function saveProfile(profile){
    const adapter = storage();
    const existing = loadProfile();
    const normalized = normalizeProfile({ ...profile, updatedAt: nowISO() }, existing);
    if(adapter) adapter.set(PROFILE_KEY, JSON.stringify(normalized));
    return normalized;
  }
  function onboardingCompleted(){
    const adapter = storage();
    if(!adapter) return false;
    return adapter.get(COMPLETED_KEY) === 'true';
  }
  function setOnboardingCompleted(value = true){
    const adapter = storage();
    if(adapter) adapter.set(COMPLETED_KEY, value ? 'true' : 'false');
    return value === true;
  }
  function hasStoredPayload(key){
    const adapter = storage();
    if(!adapter) return false;
    const raw = adapter.get(key);
    if(raw == null || raw === '') return false;
    const parsed = safeJson(raw, undefined);
    if(parsed === undefined) return true;
    if(Array.isArray(parsed)) return parsed.length > 0;
    if(parsed && typeof parsed === 'object'){
      if(parsed.records && typeof parsed.records === 'object') return Object.keys(parsed.records).length > 0;
      if(parsed.progress && Array.isArray(parsed.progress)) return parsed.progress.length > 0;
      if(parsed.preferences && typeof parsed.preferences === 'object') return Object.keys(parsed.preferences).length > 0;
      return Object.keys(parsed).length > 0;
    }
    return Boolean(parsed);
  }
  function hasExistingUserData(){
    return USER_DATA_KEYS.some(hasStoredPayload);
  }
  function shouldShowOnboarding(){
    if(onboardingCompleted()) return false;
    return !hasExistingUserData();
  }
  function restartOnboarding(){
    setOnboardingCompleted(false);
    return saveProfile(normalizeProfile());
  }
  function vocabularyThreshold(language, bandId){
    return VOCAB_BANDS[language]?.[bandId]?.threshold ?? null;
  }
  function seedSelfReportedVocabulary(entries = [], store, language, bandId, vocabModel, dateISO){
    if(!vocabModel || !Array.isArray(entries)) return { store, count: 0, ids: [] };
    const threshold = vocabularyThreshold(language, bandId);
    if(!Number.isFinite(threshold) || threshold <= 0) return { store: vocabModel.normalizeStore(store), count: 0, ids: [] };
    const normalized = vocabModel.normalizeStore(store);
    const targets = entries.filter(entry => {
      if(clean(entry?.lang).toLowerCase() !== language) return false;
      const freq = Number(entry.freq);
      if(!Number.isFinite(freq) || freq < threshold) return false;
      return vocabModel.learningStatus(normalized, entry, dateISO) === vocabModel.STATUS.NOT_LEARNED;
    });
    const next = targets.reduce((current, entry) => vocabModel.markEntryKnown(current, entry, {
      type: 'onboarding-self-report',
      language,
      threshold,
      knownSource: vocabModel.KNOWN_SOURCES.SELF_REPORTED
    }, dateISO), normalized);
    return { store: next, count: targets.length, ids: targets.map(vocabModel.lemmaId) };
  }
  function defaultStartHere(profile = {}, seedResult = {}){
    const normalized = normalizeProfile(profile);
    const languages = normalized.languages;
    const primary = languages[0] || 'greek';
    const first = [];
    if(seedResult[primary]?.band && seedResult[primary]?.band !== 'none'){
      first.push({ label: `Review ${primary === 'greek' ? 'Greek' : 'Hebrew'} ${VOCAB_BANDS[primary][seedResult[primary].band]?.label.replace('Most words ', '') || 'vocabulary'}`, action: 'review', language: primary });
    } else {
      first.push({ label: `Begin ${primary === 'greek' ? 'Greek' : 'Hebrew'} frequency vocabulary`, action: 'learn', page: `vocabulary:frequency:${primary}` });
    }
    if(primary === 'hebrew'){
      first.push({ label: 'Read Genesis 1 with Adaptive Reader', action: 'reader', language: 'hebrew', book: 'genesis', chapter: 1 });
      first.push({ label: 'Explore Hebrew noun and verb helps in Reference', action: 'reference', language: 'hebrew' });
    } else {
      first.push({ label: 'Read 1 John 1 with Adaptive Reader', action: 'reader', language: 'greek', book: '1john', chapter: 1 });
      first.push({ label: 'Explore Greek noun endings in Reference', action: 'reference', language: 'greek' });
    }
    return first.slice(0, 3);
  }
  function saveStartHere(items = []){
    const normalized = Array.isArray(items) ? items.filter(Boolean).map(item => ({ ...item })) : [];
    const adapter = storage();
    if(adapter) adapter.set(START_HERE_KEY, JSON.stringify(normalized));
    return normalized;
  }
  function loadStartHere(){
    const adapter = storage();
    if(!adapter) return [];
    const parsed = safeJson(adapter.get(START_HERE_KEY), []);
    return Array.isArray(parsed) ? parsed : [];
  }

  return {
    COMPLETED_KEY,
    PROFILE_KEY,
    START_HERE_KEY,
    LANGUAGES,
    GOALS,
    SURVEY_CHOICES,
    GREEK_GRAMMAR,
    HEBREW_GRAMMAR,
    VOCAB_BANDS,
    PROFICIENCY_LEVELS,
    USER_DATA_KEYS,
    profileLanguages,
    normalizeProfile,
    loadProfile,
    saveProfile,
    onboardingCompleted,
    setOnboardingCompleted,
    hasExistingUserData,
    shouldShowOnboarding,
    restartOnboarding,
    vocabularyThreshold,
    seedSelfReportedVocabulary,
    defaultStartHere,
    saveStartHere,
    loadStartHere
  };
});
