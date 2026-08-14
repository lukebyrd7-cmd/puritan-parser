/* ---------- Progress service ---------- */
(function(root, factory){
  const api = factory(root);
  if(typeof module === 'object' && module.exports) module.exports = api;
  root.ProgressService = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(root){
  const VocabularyLearningModel = root.VocabularyLearning || (typeof require === 'function' ? require('../models/vocabulary-learning') : null);
  const VocabularyMasteryModel = root.VocabularyMastery || (typeof require === 'function' ? require('./vocabulary-mastery') : null);
  const BookProgressModel = root.BookProgress || (typeof require === 'function' ? require('./book-progress') : null);
  const RecognitionModel = root.ParadigmRecognition || (typeof require === 'function' ? require('../features/learn/recognition-engine') : null);
  const RECOGNITION_STORAGE_KEY = 'pp_recognition_history';
  const NOT_TRACKED = 'Not yet tracked';
  let statisticsCache = null;
  let statisticsCacheStore = null;

  function clean(value){ return typeof value === 'string' ? value.trim() : ''; }
  function todayISO(){
    if(typeof root.todayISO === 'function') return root.todayISO();
    return new Date().toISOString().slice(0, 10);
  }
  function dateDaysAgo(days, fromISO = todayISO()){
    const date = new Date(`${fromISO}T00:00:00`);
    date.setDate(date.getDate() - Number(days || 0));
    return date.toISOString().slice(0, 10);
  }
  function storage(){
    if(root.activeStorageAdapter) return root.activeStorageAdapter;
    if(root.localStorage) return {
      get: key => root.localStorage.getItem(key),
      set: (key, value) => root.localStorage.setItem(key, value),
      remove: key => root.localStorage.removeItem(key)
    };
    return null;
  }
  function readJson(key, fallback){
    const adapter = storage();
    if(!adapter) return fallback;
    try {
      const raw = adapter.get(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch(e){ return fallback; }
  }
  function writeJson(key, value){
    const adapter = storage();
    if(adapter) adapter.set(key, JSON.stringify(value));
    return value;
  }
  function normalizeRecognitionHistory(payload){
    const sessions = Array.isArray(payload?.sessions) ? payload.sessions : (Array.isArray(payload) ? payload : []);
    return {
      schemaVersion: 1,
      sessions: sessions.filter(Boolean).map(session => ({
        date: clean(session.date) || todayISO(),
        targetId: clean(session.targetId),
        targetTitle: clean(session.targetTitle),
        language: clean(session.language).toLowerCase(),
        kind: clean(session.kind).toLowerCase(),
        recognized: Math.max(0, Number(session.recognized) || 0),
        missed: Math.max(0, Number(session.missed) || 0),
        total: Math.max(0, Number(session.total) || 0)
      }))
    };
  }
  function loadRecognitionHistory(){
    return normalizeRecognitionHistory(readJson(RECOGNITION_STORAGE_KEY, { sessions: [] }));
  }
  function saveRecognitionHistory(history){
    return writeJson(RECOGNITION_STORAGE_KEY, normalizeRecognitionHistory(history));
  }
  function recordRecognitionSession(session = {}, dateISO = todayISO()){
    const history = loadRecognitionHistory();
    const target = RecognitionModel?.recognitionTarget?.(session.targetId) || {};
    history.sessions.push({
      date: dateISO,
      targetId: clean(session.targetId),
      targetTitle: clean(target.title),
      language: clean(session.language || target.language).toLowerCase(),
      kind: clean(session.kind || target.kind).toLowerCase(),
      recognized: Math.max(0, Number(session.recognized) || 0),
      missed: Math.max(0, Number(session.missed) || 0),
      total: Math.max(0, Number(session.total) || Number(session.recognized) + Number(session.missed) || 0)
    });
    const saved = saveRecognitionHistory(history);
    invalidateProgressCache();
    return saved;
  }
  function stateEntries(language){
    const entries = Array.isArray(root.state?.data?.[language]) ? root.state.data[language] : [];
    if(typeof root.getStudyEntries === 'function') return root.getStudyEntries(entries, 'lemma');
    return entries;
  }
  function entryIndex(entriesByLanguage = {}){
    const map = new Map();
    Object.entries(entriesByLanguage).forEach(([language, entries]) => {
      (entries || []).forEach(entry => {
        const id = VocabularyLearningModel?.lemmaId?.(entry) || entry?.id;
        if(id) map.set(id, { ...entry, lang: entry.lang || language });
      });
    });
    return map;
  }
  function loadVocabularyStore(){
    return VocabularyLearningModel?.loadStore ? VocabularyLearningModel.loadStore() : { records: {} };
  }
  function reviewTarget(language){
    if(typeof root.learnReviewTarget === 'function') return root.learnReviewTarget(language);
    const saved = readJson('pp_learn_review_targets', {});
    return Math.max(1, Number(saved?.[language]?.dailyTarget) || 30);
  }
  function vocabularyProgress(entriesByLanguage = { greek: stateEntries('greek'), hebrew: stateEntries('hebrew') }, store = loadVocabularyStore(), dateISO = todayISO()){
    const normalized = VocabularyLearningModel?.normalizeStore ? VocabularyLearningModel.normalizeStore(store) : { records: store?.records || {} };
    const indexed = entryIndex(entriesByLanguage);
    const records = Object.values(normalized.records || {});
    const baseLanguageStats = () => ({ known: 0, knownBySelfReport: 0, learning: 0, reviewing: 0, notLearned: 0, dueToday: 0, totalAvailable: 0, coveragePercent: NOT_TRACKED });
    const byLanguage = { greek: baseLanguageStats(), hebrew: baseLanguageStats() };
    const totals = { known: 0, knownBySelfReport: 0, learning: 0, reviewing: 0, notLearned: 0, dueToday: 0 };

    Object.entries(entriesByLanguage || {}).forEach(([language, entries]) => {
      const bucket = byLanguage[language] || (byLanguage[language] = baseLanguageStats());
      bucket.totalAvailable = Array.isArray(entries) ? entries.length : 0;
    });

    records.forEach(record => {
      const entry = indexed.get(record.id) || record;
      const language = clean(record.lang || entry.lang).toLowerCase() || 'greek';
      const status = VocabularyLearningModel?.learningStatusForRecord
        ? VocabularyLearningModel.learningStatusForRecord(record, dateISO)
        : (VocabularyLearningModel?.learningStatus ? VocabularyLearningModel.learningStatus(normalized, entry, dateISO) : record.status);
      const bucket = byLanguage[language] || (byLanguage[language] = baseLanguageStats());
      if(status === VocabularyLearningModel?.STATUS?.KNOWN || status === 'Known'){
        bucket.known += 1;
        totals.known += 1;
      } else if(status === VocabularyLearningModel?.STATUS?.KNOWN_SELF_REPORTED || status === 'Known by Self-Report'){
        bucket.knownBySelfReport += 1;
        totals.knownBySelfReport += 1;
      } else if(status === VocabularyLearningModel?.STATUS?.REVIEWING || status === 'Reviewing'){
        bucket.reviewing += 1;
        totals.reviewing += 1;
      } else {
        bucket.learning += 1;
        totals.learning += 1;
      }
      if(clean(record.due) && clean(record.due) <= dateISO){
        bucket.dueToday += 1;
        totals.dueToday += 1;
      }
    });

    Object.entries(byLanguage).forEach(([language, bucket]) => {
      const entries = entriesByLanguage?.[language] || [];
      bucket.notLearned = Math.max(0, bucket.totalAvailable - bucket.known - bucket.knownBySelfReport - bucket.learning - bucket.reviewing);
      totals.notLearned += bucket.notLearned;
      const totalFrequency = entries.reduce((sum, entry) => sum + Math.max(0, Number(entry.freq) || 0), 0);
      const knownFrequency = entries.reduce((sum, entry) => {
        const record = normalized.records?.[VocabularyLearningModel?.lemmaId?.(entry) || entry?.id];
        const status = VocabularyLearningModel?.learningStatusForRecord
          ? VocabularyLearningModel.learningStatusForRecord(record, dateISO)
          : (VocabularyLearningModel?.learningStatus ? VocabularyLearningModel.learningStatus(normalized, entry, dateISO) : '');
        const isKnown = status === VocabularyLearningModel?.STATUS?.KNOWN || status === VocabularyLearningModel?.STATUS?.KNOWN_SELF_REPORTED || status === 'Known' || status === 'Known by Self-Report';
        return isKnown ? sum + Math.max(0, Number(entry.freq) || 0) : sum;
      }, 0);
      bucket.coveragePercent = totalFrequency > 0 ? Math.round((knownFrequency / totalFrequency) * 100) : NOT_TRACKED;
      bucket.mastery = VocabularyMasteryModel?.gradeDistribution
        ? VocabularyMasteryModel.gradeDistribution(entries, normalized, VocabularyLearningModel, { dateISO })
        : { A: 0, B: 0, C: 0, D: 0, F: 0, total: 0 };
      bucket.dailyPractice = VocabularyMasteryModel?.dailyPracticeSummary
        ? VocabularyMasteryModel.dailyPracticeSummary(normalized, language, dateISO, reviewTarget(language))
        : { scheduled: 0, maintenance: 0, combined: 0, target: reviewTarget(language), remaining: reviewTarget(language), complete: false };
    });
    return { ...totals, byLanguage, records };
  }
  function vocabularyStatistics(store = loadVocabularyStore()){
    const normalized = VocabularyLearningModel?.normalizeStore ? VocabularyLearningModel.normalizeStore(store) : { records: store?.records || {} };
    const records = Object.values(normalized.records || {});
    const reviewStats = records.map(record => VocabularyLearningModel?.reviewStatistics
      ? VocabularyLearningModel.reviewStatistics(record)
      : { total: (record.history || []).filter(event => event.result === 'recognized' || event.result === 'missed').length, recognized: (record.history || []).filter(event => event.result === 'recognized').length, missed: (record.history || []).filter(event => event.result === 'missed').length });
    return {
      wordsLearned: records.filter(record => {
        const status = VocabularyLearningModel?.learningStatusForRecord?.(record);
        return status === VocabularyLearningModel?.STATUS?.KNOWN || status === VocabularyLearningModel?.STATUS?.KNOWN_SELF_REPORTED || status === 'Known' || status === 'Known by Self-Report';
      }).length,
      reviewsCompleted: reviewStats.reduce((sum, stats) => sum + stats.total, 0),
      correctRecognitions: reviewStats.reduce((sum, stats) => sum + stats.recognized, 0),
      missedRecognitions: reviewStats.reduce((sum, stats) => sum + stats.missed, 0)
    };
  }
  function recognitionProgress(history = loadRecognitionHistory()){
    const sessions = normalizeRecognitionHistory(history).sessions;
    const targets = RecognitionModel?.recognitionTargets ? RecognitionModel.recognitionTargets() : [];
    const completedTargetIds = new Set(sessions.map(session => session.targetId).filter(Boolean));
    const byLanguage = language => ({
      sessions: sessions.filter(session => session.language === language).length,
      practiced: sessions.filter(session => session.language === language).reduce((sum, session) => sum + (session.total || session.recognized + session.missed), 0),
      completedTargets: new Set(sessions.filter(session => session.language === language).map(session => session.targetId).filter(Boolean)).size,
      totalTargets: targets.filter(target => target.language === language).length
    });
    return {
      sessionsCompleted: sessions.length,
      totalParadigmsPracticed: sessions.reduce((sum, session) => sum + (session.total || session.recognized + session.missed), 0),
      greek: byLanguage('greek'),
      hebrew: byLanguage('hebrew'),
      completedTargets: completedTargetIds.size,
      totalTargets: targets.length,
      lastHebrewSession: sessions.filter(session => session.language === 'hebrew').map(session => session.date).sort().at(-1) || '',
      lastGreekSession: sessions.filter(session => session.language === 'greek').map(session => session.date).sort().at(-1) || ''
    };
  }
  function grammarGrowth(history = loadRecognitionHistory()){
    const sessions = normalizeRecognitionHistory(history).sessions;
    const targets = RecognitionModel?.recognitionTargets ? RecognitionModel.recognitionTargets() : [];
    const summarized = targets.slice(0, 12).map(target => {
      const targetSessions = sessions.filter(session => session.targetId === target.id);
      const recognized = targetSessions.reduce((sum, session) => sum + Number(session.recognized || 0), 0);
      const missed = targetSessions.reduce((sum, session) => sum + Number(session.missed || 0), 0);
      const total = recognized + missed;
      const accuracy = total ? Math.round((recognized / total) * 100) : null;
      let state = 'Not Started';
      if(total > 0 && accuracy < 60) state = 'Needs Review';
      else if(targetSessions.length >= 3 && accuracy >= 80) state = 'Strong';
      else if(total > 0) state = 'Developing';
      return {
        id: target.id,
        title: target.title,
        language: target.language,
        kind: target.kind,
        referenceTopicId: target.referenceTopicId,
        sessions: targetSessions.length,
        recognized,
        missed,
        total,
        accuracy,
        state
      };
    });
    return {
      topics: summarized,
      greek: summarized.filter(item => item.language === 'greek'),
      hebrew: summarized.filter(item => item.language === 'hebrew')
    };
  }
  function readerStatistics(){
    const loadCounts = root.readerLoadCounts && typeof root.readerLoadCounts === 'object' ? root.readerLoadCounts : null;
    const openedChapters = loadCounts ? Object.keys(loadCounts).length : NOT_TRACKED;
    return {
      wordLookups: NOT_TRACKED,
      chaptersOpened: openedChapters,
      readingSessions: NOT_TRACKED
    };
  }
  function learningStatistics(vocabStats, recognitionStats){
    const vocabSessions = vocabStats.reviewsCompleted ? 1 : 0;
    const recognitionSessions = Number(recognitionStats.sessionsCompleted) || 0;
    return { totalStudySessions: vocabSessions || recognitionSessions ? vocabSessions + recognitionSessions : NOT_TRACKED };
  }
  async function ensureReaderManifest(language){
    if(typeof root.loadReaderManifest === 'function'){
      try { await root.loadReaderManifest(language); } catch(e) {}
    }
  }
  function readerBooks(language){
    if(typeof root.getReaderBooks === 'function') return root.getReaderBooks(language);
    if(typeof require === 'function'){
      try {
        const manifest = require(`../../data/${language}/manifest.json`);
        return (manifest.books || []).map(book => ({ ...book, chapters: Array.isArray(book.chapters) ? book.chapters : [] }));
      } catch(e) {}
    }
    return language === 'hebrew' ? [{ id:'jonah', name:'Jonah', chapters:[1] }] : [{ id:'matthew', name:'Matthew', chapters:[1, 2] }];
  }
  async function readinessForLanguage(language, options = {}){
    if(!BookProgressModel?.bookProgress) return { books: [], chapters: [] };
    await ensureReaderManifest(language);
    const books = readerBooks(language).slice(0, options.limitBooks || undefined);
    const loaded = [];
    for(const book of books){
      const progress = await BookProgressModel.bookProgress(language, book.id, { force: options.force }).catch(error => ({ language, book, error: error.message }));
      loaded.push(progress);
    }
    const bookRows = loaded.filter(item => item?.overall).map(item => ({
      language,
      book: item.book,
      frequency: item.frequency || [],
      ...item.overall
    }));
    const chapterRows = loaded.flatMap(item => (item?.byChapter || []).map(chapter => ({ language, book: item.book, ...chapter })));
    return { books: bookRows, chapters: chapterRows };
  }
  function closestCompleted(items = [], limit = 3){
    return items
      .filter(item => Number(item.total) > 0)
      .sort((a, b) =>
        (Number(a.remaining) || 0) - (Number(b.remaining) || 0) ||
        (Number(a.total) || 0) - (Number(b.total) || 0) ||
        clean(a.book?.name).localeCompare(clean(b.book?.name))
      )
      .slice(0, limit);
  }
  function readinessSummary(items = []){
    const tracked = items.filter(item => Number(item.total) > 0);
    if(!tracked.length) return { ready: NOT_TRACKED, total: NOT_TRACKED };
    return {
      ready: tracked.filter(item => Number(item.remaining) === 0).length,
      total: tracked.length
    };
  }
  async function readingReadiness(options = {}){
    const [oldTestament, newTestament] = await Promise.all([
      readinessForLanguage('hebrew', options),
      readinessForLanguage('greek', options)
    ]);
    const books = [...oldTestament.books, ...newTestament.books];
    const chapters = [...oldTestament.chapters, ...newTestament.chapters];
    return {
      closestBooks: closestCompleted(books, 3),
      closestChapters: closestCompleted(chapters, 3),
      oldTestament: {
        books: readinessSummary(oldTestament.books),
        chapters: readinessSummary(oldTestament.chapters)
      },
      newTestament: {
        books: readinessSummary(newTestament.books),
        chapters: readinessSummary(newTestament.chapters)
      },
      allBooks: books,
      allChapters: chapters
    };
  }
  function readinessLabel(item = {}){
    const bookName = item.book?.name || item.bookName || 'Book';
    const chapter = item.chapter ? ` ${item.chapter}` : '';
    return `${bookName}${chapter}`;
  }
  function readinessPercent(item = {}){
    const total = Number(item.total) || 0;
    if(!total) return null;
    return Math.round(((Number(item.known) || 0) / total) * 100);
  }
  function recommendationCandidates(data = {}, dateISO = todayISO()){
    const recommendations = [];
    const vocabulary = data.vocabulary || {};
    if(vocabulary.byLanguage?.greek?.dueToday) recommendations.push({ text: `${vocabulary.byLanguage.greek.dueToday} Greek vocabulary reviews are ready when you want to strengthen recall.`, action: 'Review Greek', view: 'learn', learnPage: 'review:greek' });
    if(vocabulary.byLanguage?.hebrew?.dueToday) recommendations.push({ text: `${vocabulary.byLanguage.hebrew.dueToday} Hebrew vocabulary reviews are ready when you want to strengthen recall.`, action: 'Review Hebrew', view: 'learn', learnPage: 'review:hebrew' });

    const thresholdCandidate = (data.readiness?.allBooks || [])
      .flatMap(book => (book.frequency || []).map(item => ({ ...item, book: book.book, language: book.language })))
      .filter(item => item.threshold !== 'all' && Number(item.remaining) > 0)
      .sort((a, b) => a.remaining - b.remaining)[0];
    if(thresholdCandidate){
      recommendations.push({
        text: `${thresholdCandidate.remaining} ${thresholdCandidate.remaining === 1 ? 'word' : 'words'} would move you closer to ${readinessLabel(thresholdCandidate)} at ${BookProgressModel.frequencyLabel(thresholdCandidate.threshold)} readiness.`,
        action: 'Open Reading Path',
        view: 'learn',
        learnPage: `reading-readiness:${thresholdCandidate.language === 'hebrew' ? 'old-testament' : 'new-testament'}:${thresholdCandidate.book?.id || ''}`
      });
    }

    const closestMajorBook = (data.readiness?.allBooks || [])
      .filter(item => Number(item.remaining) > 0 && Number(item.book?.chapters?.length || item.book?.chapterCount || 0) >= 5)
      .sort((a, b) => a.remaining - b.remaining)[0];
    if(closestMajorBook) recommendations.push({
      text: `${readinessLabel(closestMajorBook)} is your closest larger book to readiness.`,
      action: 'Read Book',
      view: 'reader',
      language: closestMajorBook.language,
      bookId: closestMajorBook.book?.id,
      chapter: closestMajorBook.book?.chapters?.[0] || 1
    });

    const recognition = data.recognition || {};
    if(recognition.lastHebrewSession){
      const cutoff = dateDaysAgo(3, dateISO);
      if(recognition.lastHebrewSession < cutoff) recommendations.push({ text: `Hebrew paradigm recognition may be ready for a light refresh.`, action: 'Practice Hebrew Grammar', view: 'learn', learnPage: 'paradigms:recognition-practice' });
    }
    if(!recommendations.length) recommendations.push({ text: 'Open the closest Reading Readiness book or choose a high-frequency vocabulary path to decide what to study next.', action: 'Open Reading Readiness', view: 'learn', learnPage: 'reading-readiness' });
    return recommendations.slice(0, 5);
  }
  function overviewCore(options = {}){
    const dateISO = options.dateISO || todayISO();
    const entriesByLanguage = options.entriesByLanguage || { greek: stateEntries('greek'), hebrew: stateEntries('hebrew') };
    const store = options.store || loadVocabularyStore();
    const recognitionHistory = options.recognitionHistory || loadRecognitionHistory();
    const vocabulary = vocabularyProgress(entriesByLanguage, store, dateISO);
    const recognition = recognitionProgress(recognitionHistory);
    const grammar = grammarGrowth(recognitionHistory);
    return {
      dateISO,
      vocabulary,
      recognition,
      grammar,
      statistics: statistics({ store, recognitionHistory }),
      readiness: null,
      recommendations: recommendationCandidates({ vocabulary, readiness: {}, recognition }, dateISO)
    };
  }
  async function overview(options = {}){
    const core = options.core || overviewCore(options);
    const dateISO = core.dateISO;
    const vocabulary = core.vocabulary;
    const readiness = options.readiness || await readingReadiness(options.readinessOptions || {});
    const recognition = core.recognition;
    const grammar = core.grammar;
    return {
      ...core,
      readiness,
      recommendations: recommendationCandidates({ vocabulary, readiness, recognition }, dateISO)
    };
  }
  function statistics(options = {}){
    const sourceStore = options.store || loadVocabularyStore();
    if(!options.recognitionHistory && statisticsCache && statisticsCacheStore === sourceStore) return statisticsCache;
    const vocabulary = vocabularyStatistics(sourceStore);
    const recognition = recognitionProgress(options.recognitionHistory);
    const reader = readerStatistics();
    const grammar = {
      greekSessions: recognition.sessionsCompleted ? recognition.greek.sessions : NOT_TRACKED,
      hebrewSessions: recognition.sessionsCompleted ? recognition.hebrew.sessions : NOT_TRACKED,
      totalParadigmsPracticed: recognition.sessionsCompleted ? recognition.totalParadigmsPracticed : NOT_TRACKED
    };
    const result = {
      vocabulary,
      grammar,
      reader,
      learning: learningStatistics(vocabulary, recognition)
    };
    if(!options.recognitionHistory){ statisticsCache = result; statisticsCacheStore = sourceStore; }
    return result;
  }
  function invalidateProgressCache(){
    statisticsCache = null;
    statisticsCacheStore = null;
    BookProgressModel?.cache?.clear?.();
    root.invalidateProgressViewCache?.();
  }

  return {
    RECOGNITION_STORAGE_KEY,
    NOT_TRACKED,
    normalizeRecognitionHistory,
    loadRecognitionHistory,
    saveRecognitionHistory,
    recordRecognitionSession,
    vocabularyProgress,
    vocabularyStatistics,
    recognitionProgress,
    readerStatistics,
    learningStatistics,
    readingReadiness,
    readinessSummary,
    readinessPercent,
    grammarGrowth,
    recommendationCandidates,
    overviewCore,
    overview,
    statistics,
    invalidateProgressCache,
    readinessLabel
  };
});
