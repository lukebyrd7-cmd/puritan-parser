/* ---------- Unified vocabulary learning and practice ---------- */
(function(root, factory){
  const api = factory(root);
  if(typeof module === 'object' && module.exports) module.exports = api;
  root.LearningPractice = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(root){
  const VERSION = 3;
  const PROFILE_KEY = 'pp_learning_practice_profiles';
  const SESSION_KEY = 'pp_learning_practice_sessions';
  const ATTEMPT_KEY = 'pp_learning_attempts';
  const ATTENTION_KEY = 'pp_needs_attention';
  const MAINTENANCE_SRS_KEY = 'pp_learn_maintenance_srs';
  const LEGACY_SRS_KEY = 'pp_learn_practice_srs_preference';
  const REVISION_KEY = 'pp_learning_data_revision';
  const LANGUAGES = ['greek', 'hebrew'];
  const CONFIDENCES = ['again', 'hard', 'good', 'easy'];
  const DIRECTIONS = ['reading', 'reverse', 'mixed'];
  const STRATEGIES = ['balanced', 'reinforcement', 'random'];
  const GRADES = ['A', 'B', 'C', 'D', 'F'];
  const MAX_ATTEMPTS = 1000;
  const MAX_RECORD_HISTORY = 200;
  const SESSION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;
  const STATUS_FILTERS = ['known', 'learning', 'new'];
  const PASSAGE_SCOPES = ['book', 'chapter'];
  const DAILY_AMOUNT_MODES = ['goal', 'set', 'unlimited'];
  const GlossApi = root.GlossModel || (typeof require === 'function' ? require('../models/gloss') : null);

  function clean(value){ return typeof value === 'string' ? value.trim() : ''; }
  function nowISO(){ return new Date().toISOString(); }
  function todayISO(){ return typeof root.todayISO === 'function' ? root.todayISO() : new Date().toISOString().slice(0, 10); }
  function clone(value){ return value == null ? value : JSON.parse(JSON.stringify(value)); }
  function storage(adapter){
    if(adapter) return adapter;
    if(root.activeStorageAdapter) return root.activeStorageAdapter;
    if(root.localStorage) return { get: key => root.localStorage.getItem(key), set: (key, value) => root.localStorage.setItem(key, value), remove: key => root.localStorage.removeItem(key) };
    return null;
  }
  function readJson(key, fallback, adapter){
    try { const raw = storage(adapter)?.get(key); return raw ? JSON.parse(raw) : clone(fallback); }
    catch(e){ return clone(fallback); }
  }
  function writeJson(key, value, adapter){ storage(adapter)?.set(key, JSON.stringify(value)); return value; }
  function uuid(){
    if(root.crypto?.randomUUID) return root.crypto.randomUUID();
    const random = Math.random().toString(36).slice(2);
    return `${Date.now().toString(36)}-${random}-${Math.random().toString(36).slice(2)}`;
  }
  function stableHash(value = ''){
    let hash = 2166136261;
    for(const character of String(value)){ hash ^= character.charCodeAt(0); hash = Math.imul(hash, 16777619); }
    return hash >>> 0;
  }
  function addDays(dateISO, days){
    const date = new Date(`${dateISO || todayISO()}T12:00:00`);
    date.setDate(date.getDate() + Math.max(1, Number(days) || 1));
    return date.toISOString().slice(0, 10);
  }
  function shiftDays(dateISO, days){
    const date = new Date(`${dateISO || todayISO()}T12:00:00`);
    date.setDate(date.getDate() + Number(days || 0));
    return date.toISOString().slice(0, 10);
  }
  function bumpRevision(adapter){
    const current = Math.max(0, Number(storage(adapter)?.get(REVISION_KEY)) || 0) + 1;
    storage(adapter)?.set(REVISION_KEY, String(current));
    root.ProgressService?.invalidateProgressCache?.();
    return current;
  }
  function revision(adapter){ return Math.max(0, Number(storage(adapter)?.get(REVISION_KEY)) || 0); }

  function defaultProfile(language = 'greek'){
    return {
      schemaVersion: VERSION,
      language: language === 'hebrew' ? 'hebrew' : 'greek',
      source: 'all-known',
      sourceId: '',
      strategy: 'balanced',
      selectedGrades: GRADES.slice(),
      size: 20,
      unlimited: false,
      dailyAmountMode: 'goal',
      dailyAmount: 20,
      promptDirection: 'reading',
      passageScope: 'book',
      chapter: 0,
      statusFilters: ['known', 'learning'],
      scopeFrequencyId: '',
      introduceNewCount: 0,
      newWordSource: 'daily',
      createdAt: '',
      updatedAt: ''
    };
  }
  function normalizeProfile(input = {}, language = input.language){
    const fallback = defaultProfile(language);
    const selected = Array.isArray(input.selectedGrades) ? GRADES.filter(grade => input.selectedGrades.includes(grade)) : fallback.selectedGrades;
    const rawSize = Number(input.size);
    return {
      schemaVersion: VERSION,
      language: language === 'hebrew' ? 'hebrew' : 'greek',
      source: ['all-known','book','frequency','weak','needs-attention','custom-deck'].includes(clean(input.source)) ? clean(input.source) : fallback.source,
      sourceId: clean(input.sourceId),
      strategy: STRATEGIES.includes(input.strategy) ? input.strategy : fallback.strategy,
      selectedGrades: selected.length ? selected : fallback.selectedGrades,
      size: Number.isFinite(rawSize) ? Math.min(200, Math.max(1, Math.floor(rawSize))) : fallback.size,
      unlimited: input.unlimited === true,
      dailyAmountMode: DAILY_AMOUNT_MODES.includes(input.dailyAmountMode) ? input.dailyAmountMode : fallback.dailyAmountMode,
      dailyAmount: Number.isFinite(Number(input.dailyAmount)) ? Math.min(200, Math.max(1, Math.floor(Number(input.dailyAmount)))) : fallback.dailyAmount,
      promptDirection: DIRECTIONS.includes(input.promptDirection) ? input.promptDirection : fallback.promptDirection,
      passageScope: PASSAGE_SCOPES.includes(input.passageScope) ? input.passageScope : fallback.passageScope,
      chapter: input.passageScope === 'chapter' && Number.isInteger(Number(input.chapter)) && Number(input.chapter) > 0 ? Number(input.chapter) : 0,
      statusFilters: Array.isArray(input.statusFilters) && input.statusFilters.length ? STATUS_FILTERS.filter(status => input.statusFilters.includes(status)) : fallback.statusFilters,
      scopeFrequencyId: clean(input.scopeFrequencyId),
      introduceNewCount: Math.min(50, Math.max(0, Math.floor(Number(input.introduceNewCount) || 0))),
      newWordSource: input.newWordSource === 'all' ? 'all' : 'daily',
      createdAt: clean(input.createdAt),
      updatedAt: clean(input.updatedAt)
    };
  }
  function normalizeProfiles(payload){
    const source = payload && typeof payload === 'object' ? payload : {};
    return { schemaVersion: VERSION, revision: Math.max(0, Number(source.revision) || 0), profiles: Object.fromEntries(LANGUAGES.map(language => [language, normalizeProfile(source.profiles?.[language] || {}, language)])) };
  }
  function loadProfiles(adapter){
    const source = readJson(PROFILE_KEY, null, adapter);
    const normalized = normalizeProfiles(source);
    if(source && source.schemaVersion !== VERSION) writeJson(PROFILE_KEY, normalized, adapter);
    return normalized;
  }
  function saveProfile(profile, adapter){
    const store = loadProfiles(adapter);
    const normalized = normalizeProfile(profile, profile.language);
    const existing = store.profiles[normalized.language];
    const timestamp = nowISO();
    store.profiles[normalized.language] = { ...normalized, createdAt: existing?.createdAt || timestamp, updatedAt: timestamp };
    store.revision += 1;
    writeJson(PROFILE_KEY, store, adapter); bumpRevision(adapter);
    return store.profiles[normalized.language];
  }
  function profileSummary(profile){
    const value = normalizeProfile(profile, profile?.language);
    const source = { 'all-known': 'All vocabulary', book: `${value.passageScope === 'chapter' ? 'Chapter' : 'Book'}: ${value.sourceId || 'not selected'}${value.chapter ? ` ${value.chapter}` : ''}`, frequency: `Frequency: ${value.sourceId || 'not selected'}`, weak: 'Weak words', 'needs-attention': 'Words marked Needs attention', 'custom-deck': `Custom Deck: ${value.sourceId || 'not selected'}` }[value.source];
    const strategy = { balanced: 'Balanced rotation', reinforcement: 'Words needing reinforcement', random: 'Random order' }[value.strategy];
    const language = value.language === 'hebrew' ? 'Hebrew' : 'Greek';
    const direction = { reading: `${language} first`, reverse: 'English first', mixed: 'Mixed directions' }[value.promptDirection];
    const amount = value.dailyAmountMode === 'unlimited' ? 'Continue until stopped' : value.dailyAmountMode === 'set' ? `${value.dailyAmount} words plus due reviews` : 'Finish today’s goal';
    return `${source} · ${strategy} · ${direction} · ${amount}`;
  }

  function usableGloss(value){
    const gloss = clean(value);
    if(!gloss || /^(?:\(?missing gloss\)?|unknown|n\/a|none|null|undefined|—|-)$/i.test(gloss)) return false;
    return GlossApi?.isLearnerEnglishGloss ? GlossApi.isLearnerEnglishGloss(gloss) : /[A-Za-z]/.test(gloss);
  }
  function scriptForm(entry, language){
    const candidates = language === 'hebrew'
      ? [entry?.studyForm, entry?.lexicalForm, entry?.hebrewLemma, entry?.root, entry?.representativeForm, entry?.word, entry?.lemma, ...(Array.isArray(entry?.forms) ? entry.forms : [])]
      : [entry?.studyForm, entry?.lemma, entry?.lexicalForm, entry?.representativeForm, entry?.word, ...(Array.isArray(entry?.forms) ? entry.forms : [])];
    const pattern = language === 'hebrew' ? /[\u0590-\u05ff]/ : /[\u0370-\u03ff\u1f00-\u1fff]/;
    return candidates.map(clean).find(value => pattern.test(value) && !/^\d+$/.test(value))
      || candidates.map(clean).find(value => /[A-Za-z]/.test(value) && !/^\d+[+a-z]?$/i.test(value))
      || '';
  }
  function glossData(entry, glossMap){
    const mapped = glossMap && (glossMap[clean(entry?.lemma)] || glossMap[clean(entry?.id)]);
    const primary = [entry?.customGloss, entry?.primaryGloss, entry?.gloss, mapped?.primaryGloss, typeof mapped === 'string' ? mapped : ''].map(clean).find(usableGloss) || '';
    const alternates = [...(Array.isArray(entry?.alternateGlosses) ? entry.alternateGlosses : []), ...(Array.isArray(mapped?.alternateGlosses) ? mapped.alternateGlosses : [])].map(clean).filter(value => usableGloss(value) && value !== primary);
    return {
      primary,
      alternates: [...new Set(alternates)],
      source: clean(entry?.glossSource || mapped?.glossSource),
      license: clean(entry?.glossLicense || mapped?.glossLicense),
      attribution: clean(entry?.glossAttribution || mapped?.glossAttribution)
    };
  }
  function validateVocabularyCard(entry, expectedLanguage, options = {}){
    const language = expectedLanguage === 'hebrew' ? 'hebrew' : 'greek';
    if(!entry || typeof entry !== 'object') return { valid: false, reason: 'malformed' };
    if(clean(entry.lang).toLowerCase() !== language) return { valid: false, reason: 'wrong-language' };
    if(entry.ordinaryPracticeEligible === false) return { valid: false, reason: 'practice-excluded' };
    const model = options.model;
    const id = clean(model?.lemmaId?.(entry) || entry.id);
    if(!id) return { valid: false, reason: 'missing-id' };
    if(options.expectedId && id !== options.expectedId) return { valid: false, reason: 'canonical-mismatch' };
    const studyForm = scriptForm(entry, language);
    if(!studyForm) return { valid: false, reason: 'missing-study-form', id };
    const glosses = glossData(entry, options.glossMap);
    if(!glosses.primary) return { valid: false, reason: 'missing-gloss', id };
    return { valid: true, id, entry: { ...entry, studyForm, primaryGloss: glosses.primary, gloss: glosses.primary, alternateGlosses: glosses.alternates, glossSource: glosses.source || entry.glossSource, glossLicense: glosses.license || entry.glossLicense, glossAttribution: glosses.attribution || entry.glossAttribution } };
  }
  function filterStudyableEntries(entries, language, options = {}){
    const diagnostics = { total: 0, studyable: 0, skipped: 0, reasons: {} };
    const seen = new Set(); const studyable = [];
    for(const entry of Array.isArray(entries) ? entries : []){
      diagnostics.total += 1;
      const result = validateVocabularyCard(entry, language, options);
      if(!result.valid || seen.has(result.id)){
        const reason = result.valid ? 'duplicate-id' : result.reason;
        diagnostics.skipped += 1; diagnostics.reasons[reason] = (diagnostics.reasons[reason] || 0) + 1; continue;
      }
      seen.add(result.id); diagnostics.studyable += 1; studyable.push(result.entry);
    }
    return { entries: studyable, diagnostics };
  }

  function normalizeMaintenancePreference(input, legacyValue){
    if(input && typeof input === 'object' && input.schemaVersion === VERSION && typeof input.enabled === 'boolean') return { schemaVersion: VERSION, enabled: input.enabled, userChosen: input.userChosen === true, updatedAt: clean(input.updatedAt) };
    const storedChoice = typeof input === 'string' ? clean(input) : legacyValue;
    if(storedChoice === 'count-srs') return { schemaVersion: VERSION, enabled: true, userChosen: true, updatedAt: nowISO() };
    if(storedChoice === 'ask') return { schemaVersion: VERSION, enabled: false, userChosen: true, updatedAt: nowISO() };
    // v1.8 wrote practice-only automatically, so it cannot prove an explicit choice.
    return { schemaVersion: VERSION, enabled: true, userChosen: false, updatedAt: nowISO() };
  }
  function loadMaintenancePreference(adapter){
    const target = storage(adapter);
    const currentRaw = target?.get(MAINTENANCE_SRS_KEY);
    const current = readJson(MAINTENANCE_SRS_KEY, null, adapter);
    const legacy = target?.get(LEGACY_SRS_KEY);
    const normalized = normalizeMaintenancePreference(current ?? currentRaw, legacy);
    if(!current || JSON.stringify(current) !== JSON.stringify(normalized)) writeJson(MAINTENANCE_SRS_KEY, normalized, adapter);
    return normalized;
  }
  function setMaintenancePreference(enabled, adapter){
    const value = { schemaVersion: VERSION, enabled: enabled !== false, userChosen: true, updatedAt: nowISO() };
    writeJson(MAINTENANCE_SRS_KEY, value, adapter); bumpRevision(adapter);
    return value;
  }

  function normalizeAttention(payload){
    const source = payload && typeof payload === 'object' ? payload : {};
    const items = source.items && typeof source.items === 'object' ? source.items : {};
    return { schemaVersion: VERSION, revision: Math.max(0, Number(source.revision) || 0), items: Object.fromEntries(Object.entries(items).filter(([, item]) => item?.active !== false).map(([id, item]) => [id, { id, language: item.language === 'hebrew' ? 'hebrew' : 'greek', active: true, createdAt: clean(item.createdAt), updatedAt: clean(item.updatedAt) }])) };
  }
  function loadAttention(adapter){ return normalizeAttention(readJson(ATTENTION_KEY, null, adapter)); }
  function needsAttention(id, language, adapter){ const item = loadAttention(adapter).items[id]; return Boolean(item && (!language || item.language === language)); }
  function setNeedsAttention(id, language, active, adapter){
    if(!clean(id)) return false;
    const store = loadAttention(adapter); const timestamp = nowISO();
    if(active) store.items[id] = { id, language: language === 'hebrew' ? 'hebrew' : 'greek', active: true, createdAt: store.items[id]?.createdAt || timestamp, updatedAt: timestamp };
    else delete store.items[id];
    store.revision += 1; writeJson(ATTENTION_KEY, store, adapter); bumpRevision(adapter);
    return Boolean(active);
  }

  function confidenceOf(value){
    const normalized = clean(value).toLowerCase();
    if(CONFIDENCES.includes(normalized)) return normalized;
    if(['recognized','known','correct'].includes(normalized)) return 'good';
    if(['missed','incorrect'].includes(normalized)) return 'again';
    return 'good';
  }
  function confidenceResult(confidence){ return confidenceOf(confidence) === 'again' ? 'missed' : 'recognized'; }
  function nextInterval(record = {}, confidence){
    const value = confidenceOf(confidence);
    const current = Math.max(0, Number(record.intervalDays) || 0);
    const successes = Math.max(0, Number(record.successCount) || 0);
    const normal = successes <= 0 ? 3 : successes === 1 ? 7 : Math.max(14, Math.round(Math.max(1, current) * 2));
    if(value === 'again') return 1;
    if(value === 'hard') return Math.min(3650, Math.max(2, Math.round(Math.max(1, current) * 1.2)));
    if(value === 'easy') return Math.min(3650, Math.max(normal + 1, Math.round(normal * 1.5)));
    return Math.min(3650, normal);
  }
  function applyConfidence(record = {}, confidence, context = {}){
    const value = confidenceOf(confidence);
    const date = clean(context.date) || todayISO();
    const next = clone(record) || {};
    next.history = Array.isArray(next.history) ? next.history.slice() : [];
    const intervalDays = nextInterval(next, value);
    if(value === 'again') next.successCount = 0;
    else if(value === 'hard') next.successCount = Math.max(1, Number(next.successCount) || 0);
    else next.successCount = Math.max(0, Number(next.successCount) || 0) + 1;
    next.intervalDays = intervalDays;
    next.due = addDays(date, intervalDays);
    next.lastReviewed = date;
    next.status = next.successCount >= 3 ? 'Known' : (next.successCount > 0 ? 'Reviewing' : 'Learning');
    next.knownSource = 'review';
    const event = {
      schemaVersion: VERSION,
      eventId: clean(context.eventId) || uuid(),
      vocabularyId: clean(context.vocabularyId || next.id),
      language: context.language === 'hebrew' ? 'hebrew' : 'greek',
      timestamp: clean(context.timestamp) || nowISO(),
      date,
      practice: clean(context.practiceType) || 'maintenance',
      sessionId: clean(context.sessionId),
      phase: clean(context.phase),
      confidence: value,
      result: confidenceResult(value),
      promptDirection: DIRECTIONS.includes(context.promptDirection) ? context.promptDirection : 'reading',
      scheduleUpdated: context.scheduleUpdated !== false,
      recap: context.recap === true,
      countTowardDaily: context.countTowardDaily !== false,
      successCount: next.successCount,
      intervalDays: next.intervalDays,
      due: next.due,
      status: next.status
    };
    next.history.push(event);
    next.history = next.history.slice(-MAX_RECORD_HISTORY);
    return { record: next, event };
  }
  function appendEvidenceOnly(record = {}, confidence, context = {}){
    const next = clone(record) || {}; next.history = Array.isArray(next.history) ? next.history.slice() : [];
    const event = { schemaVersion: VERSION, eventId: clean(context.eventId) || uuid(), vocabularyId: clean(context.vocabularyId || next.id), language: context.language === 'hebrew' ? 'hebrew' : 'greek', timestamp: clean(context.timestamp) || nowISO(), date: clean(context.date) || todayISO(), practice: clean(context.practiceType) || 'maintenance', sessionId: clean(context.sessionId), phase: clean(context.phase), confidence: confidenceOf(confidence), result: confidenceResult(confidence), promptDirection: DIRECTIONS.includes(context.promptDirection) ? context.promptDirection : 'reading', scheduleUpdated: false, recap: context.recap === true, countTowardDaily: context.countTowardDaily !== false };
    next.history.push(event); next.history = next.history.slice(-MAX_RECORD_HISTORY);
    return { record: next, event };
  }
  function eventAlreadyRecorded(record = {}, eventId){ return Boolean(eventId && (record.history || []).some(event => event?.eventId === eventId)); }
  function appendAttempt(event, adapter){
    const store = readJson(ATTEMPT_KEY, { schemaVersion: VERSION, revision: 0, events: [] }, adapter);
    const events = Array.isArray(store?.events) ? store.events : [];
    if(!events.some(item => item.eventId === event.eventId)) events.push(event);
    const next = { schemaVersion: VERSION, revision: Math.max(0, Number(store?.revision) || 0) + 1, events: events.slice(-MAX_ATTEMPTS), updatedAt: nowISO() };
    writeJson(ATTEMPT_KEY, next, adapter); bumpRevision(adapter); return next;
  }

  function eventTime(event = {}){ return clean(event.timestamp || event.date); }
  function candidateFor(entry, store, model, attentionStore, date = todayISO()){
    const id = model.lemmaId(entry);
    const storedRecord = store?.records?.[id];
    const flagged = Boolean(attentionStore?.items?.[id]);
    if(!storedRecord){
      const grade = { letter: 'C', recentMisses: 0 };
      return { id, entry, record: {}, grade, last: '', category: flagged ? 'reinforcement' : 'developing', boost: flagged ? 2 : 1, newlyKnown: true };
    }
    const record = storedRecord;
    const grade = root.VocabularyMastery?.masteryGrade?.(record, date) || { letter: 'C', recentMisses: 0 };
    const events = (record.history || []).filter(event => event?.result === 'recognized' || event?.result === 'missed');
    const last = events.reduce((latest, event) => {
      const timestamp = eventTime(event);
      return timestamp > latest ? timestamp : latest;
    }, '');
    const recent = events.slice(-5);
    const hard = recent.filter(event => confidenceOf(event.confidence || event.result) === 'hard').length;
    const again = recent.filter(event => confidenceOf(event.confidence || event.result) === 'again').length;
    const introducedAt = clean(record.introducedAt);
    const newlyKnown = (introducedAt ? introducedAt >= shiftDays(date, -14) : false) || (Number(record.successCount) || 0) <= 3;
    const category = grade.letter === 'F' || grade.letter === 'D' || again || hard >= 2 || flagged ? 'reinforcement' : (grade.letter === 'C' || newlyKnown ? 'developing' : 'established');
    const boost = Math.min(6, (grade.letter === 'F' ? 4 : grade.letter === 'D' ? 3 : grade.letter === 'C' ? 1 : 0) + Math.min(2, again) + Math.min(1, hard) + (flagged ? 1 : 0));
    return { id, entry, record, grade, last, category, boost, newlyKnown };
  }
  function candidateCompare(a, b){
    // Oldest practice remains the primary key. Difficulty is bounded and only
    // breaks ties within a date, so strong vocabulary cannot be starved.
    return clean(a.last).localeCompare(clean(b.last)) || (b.boost - a.boost) || clean(a.id).localeCompare(clean(b.id));
  }
  function buildBalancedSession(entries = [], store = {}, model, options = {}){
    const selectedGrades = Array.isArray(options.selectedGrades) && options.selectedGrades.length ? options.selectedGrades : GRADES;
    const attention = options.attention || normalizeAttention();
    const seen = new Set();
    let candidates = entries.map(entry => candidateFor(entry, store, model, attention, options.dateISO)).filter(item => {
      if(seen.has(item.id) || !selectedGrades.includes(item.grade.letter)) return false;
      seen.add(item.id); return options.eligibleIds instanceof Set ? options.eligibleIds.has(item.id) : true;
    });
    candidates.sort(candidateCompare);
    const requested = options.size === 'unlimited' ? Math.min(100, candidates.length) : Math.min(candidates.length, Math.max(1, Number(options.size) || 20));
    const quotas = { reinforcement: Math.round(requested * .3), developing: Math.round(requested * .4) };
    quotas.established = Math.max(0, requested - quotas.reinforcement - quotas.developing);
    const groups = Object.fromEntries(['reinforcement','developing','established'].map(category => [category, candidates.filter(item => item.category === category)]));
    const selected = [];
    for(const category of ['reinforcement','developing','established']) selected.push(...groups[category].splice(0, quotas[category]));
    const selectedIds = new Set(selected.map(item => item.id));
    const remainder = candidates.filter(item => !selectedIds.has(item.id)).sort(candidateCompare);
    // Newly known words are capped near 25% whenever older alternatives exist.
    const newCap = Math.ceil(requested * .25);
    while(selected.filter(item => item.newlyKnown).length > newCap){
      const replacementIndex = remainder.findIndex(item => !item.newlyKnown);
      const selectedIndex = selected.map(item => item.newlyKnown).lastIndexOf(true);
      if(replacementIndex < 0 || selectedIndex < 0) break;
      remainder.push(selected[selectedIndex]);
      selected[selectedIndex] = remainder.splice(replacementIndex, 1)[0];
      remainder.sort(candidateCompare);
    }
    while(selected.length < requested && remainder.length){
      const newCount = selected.filter(item => item.newlyKnown).length;
      let index = newCount >= newCap ? remainder.findIndex(item => !item.newlyKnown) : 0;
      if(index < 0) index = 0;
      selected.push(remainder.splice(index, 1)[0]);
    }
    selected.sort(candidateCompare);
    return { strategy: 'balanced', requestedSize: options.size === 'unlimited' ? 'unlimited' : Math.max(1, Number(options.size) || 20), entries: selected.map(item => item.entry), candidates, limitedByPool: requested < Math.max(1, Number(options.size) || 20), lazy: options.size === 'unlimited', queueLimit: options.size === 'unlimited' ? 100 : requested };
  }
  function buildSelectedSession(entries = [], store = {}, model, options = {}){
    if(options.strategy === 'balanced') return buildBalancedSession(entries, store, model, options);
    const attention = options.attention || normalizeAttention();
    const selectedGrades = options.selectedGrades || GRADES;
    let candidates = entries.map(entry => candidateFor(entry, store, model, attention, options.dateISO)).filter(item => selectedGrades.includes(item.grade.letter));
    if(options.eligibleIds instanceof Set) candidates = candidates.filter(item => options.eligibleIds.has(item.id));
    if(options.strategy === 'random') candidates.sort((a,b) => (stableHash(`${options.seed || ''}:${a.id}`) - stableHash(`${options.seed || ''}:${b.id}`)) || a.id.localeCompare(b.id));
    else candidates.sort((a,b) => (b.boost - a.boost) || candidateCompare(a,b));
    const size = options.size === 'unlimited' ? Math.min(100, candidates.length) : Math.min(candidates.length, Math.max(1, Number(options.size) || 20));
    return { strategy: options.strategy === 'random' ? 'random' : 'reinforcement', entries: candidates.slice(0, size).map(item => item.entry), candidates, lazy: options.size === 'unlimited', queueLimit: size, limitedByPool: size < Math.max(1, Number(options.size) || 20) };
  }
  function directionFor(promptDirection, sessionId, id, index){
    if(promptDirection !== 'mixed') return promptDirection === 'reverse' ? 'reverse' : 'reading';
    return stableHash(`${sessionId}:${id}:${index}`) % 2 ? 'reverse' : 'reading';
  }
  function makeCard(id, direction, phase, index){ return { cardId: uuid(), eventId: uuid(), vocabularyId: id, direction, phase, index, answered: false }; }

  function normalizeSession(input = {}){
    const language = input.language === 'hebrew' ? 'hebrew' : 'greek';
    const cards = Array.isArray(input.cards) ? input.cards.filter(card => clean(card.vocabularyId)).map((card,index) => ({ cardId: clean(card.cardId) || uuid(), eventId: clean(card.eventId) || uuid(), vocabularyId: clean(card.vocabularyId), direction: card.direction === 'reverse' ? 'reverse' : 'reading', phase: ['scheduled','learning','new','maintenance','recap'].includes(card.phase) ? card.phase : 'maintenance', index, answered: card.answered === true })) : [];
    const phase = ['scheduled','learning','new','maintenance','recap','complete'].includes(input.phase) ? input.phase : (cards[0]?.phase || 'maintenance');
    const position = Math.min(cards.length, Math.max(0, Number(input.position) || 0));
    const inferredComplete = (phase === 'complete' || cards.length === 0) && !cards.slice(position).some(card => !card.answered);
    return { schemaVersion: VERSION, sessionId: clean(input.sessionId) || uuid(), language, sessionType: input.sessionType === 'focused' ? 'focused' : 'daily', source: clean(input.source) || 'all-known', sourceId: clean(input.sourceId), strategy: STRATEGIES.includes(input.strategy) ? input.strategy : 'balanced', selectedGrades: Array.isArray(input.selectedGrades) ? GRADES.filter(grade => input.selectedGrades.includes(grade)) : GRADES.slice(), promptDirection: DIRECTIONS.includes(input.promptDirection) ? input.promptDirection : 'reading', dailyAmountMode: DAILY_AMOUNT_MODES.includes(input.dailyAmountMode) ? input.dailyAmountMode : 'goal', dailyAmount: Math.min(200, Math.max(1, Math.floor(Number(input.dailyAmount) || 20))), phase, cards, position, submittedEventIds: Array.isArray(input.submittedEventIds) ? [...new Set(input.submittedEventIds.map(clean).filter(Boolean))] : [], difficultIds: Array.isArray(input.difficultIds) ? [...new Set(input.difficultIds.map(clean).filter(Boolean))] : [], introducedWordIds: Array.isArray(input.introducedWordIds) ? [...new Set(input.introducedWordIds.map(clean).filter(Boolean))] : [], requestedNewCount: Math.max(0, Number(input.requestedNewCount) || 0), diagnostics: input.diagnostics && typeof input.diagnostics === 'object' ? clone(input.diagnostics) : { total: cards.length, studyable: cards.length, skipped: 0, reasons: {} }, revealedCardId: clean(input.revealedCardId), counts: { scheduled: Math.max(0, Number(input.counts?.scheduled) || 0), learning: Math.max(0, Number(input.counts?.learning) || 0), new: Math.max(0, Number(input.counts?.new) || 0), maintenance: Math.max(0, Number(input.counts?.maintenance) || 0), recap: Math.max(0, Number(input.counts?.recap) || 0) }, startingDailyCount: Math.max(0, Number(input.startingDailyCount) || 0), target: Math.max(0, Number(input.target) || 0), unlimited: input.unlimited === true, remainingCandidateIds: Array.isArray(input.remainingCandidateIds) ? [...new Set(input.remainingCandidateIds.map(clean).filter(Boolean))] : [], returnPage: clean(input.returnPage), contextTitle: clean(input.contextTitle), contextDetail: clean(input.contextDetail), limitedByPool: input.limitedByPool === true, recapStarted: input.recapStarted === true, createdAt: clean(input.createdAt) || nowISO(), updatedAt: clean(input.updatedAt) || nowISO(), completedAt: clean(input.completedAt) || (inferredComplete ? clean(input.updatedAt) || nowISO() : '') };
  }
  function loadSessions(adapter){
    const source = readJson(SESSION_KEY, null, adapter); const sessions = source?.sessions || {};
    return { schemaVersion: VERSION, revision: Math.max(0, Number(source?.revision) || 0), sessions: Object.fromEntries(LANGUAGES.map(language => [language, sessions[language] ? normalizeSession(sessions[language]) : null])) };
  }
  function sessionExpired(session, now = Date.now()){ return Boolean(session && now - new Date(session.updatedAt || session.createdAt).getTime() > SESSION_EXPIRY_MS); }
  function activeSession(language, adapter){ const session = loadSessions(adapter).sessions[language]; return session && !session.completedAt ? session : null; }
  function saveSession(session, adapter){ const store = loadSessions(adapter); const normalized = normalizeSession({ ...session, updatedAt: nowISO() }); store.sessions[normalized.language] = normalized; store.revision += 1; writeJson(SESSION_KEY, store, adapter); bumpRevision(adapter); return normalized; }
  function discardSession(language, adapter){ const store = loadSessions(adapter); store.sessions[language === 'hebrew' ? 'hebrew' : 'greek'] = null; store.revision += 1; writeJson(SESSION_KEY, store, adapter); bumpRevision(adapter); return true; }

  function assembleSession(options = {}){
    const language = options.language === 'hebrew' ? 'hebrew' : 'greek';
    const profile = normalizeProfile(options.profile || {}, language); const model = options.model;
    const store = options.store || { records: {} }; const date = options.dateISO || todayISO();
    const canUseSuppliedPools = Array.isArray(options.dueEntries) && Array.isArray(options.maintenanceEntries);
    const validatedAll = canUseSuppliedPools ? { entries: [], diagnostics: { total: 0, studyable: 0, skipped: 0, reasons: {} } } : filterStudyableEntries(options.entries, language, { model, glossMap: options.glossMap });
    const allEntries = validatedAll.entries;
    const suppliedDue = options.dueEntries ? filterStudyableEntries(options.dueEntries, language, { model, glossMap: options.glossMap }).entries : null;
    const ready = (suppliedDue || model.dueEntries(allEntries, store, date)).filter(entry => entry.lang === language);
    const learning = ready.filter(entry => {
      const record = store.records?.[model.lemmaId(entry)] || {};
      return (Number(record.successCount) || 0) === 0 && model.learningStatusForRecord(record, date) === model.STATUS.LEARNING;
    });
    const learningIds = new Set(learning.map(model.lemmaId));
    const due = ready.filter(entry => !learningIds.has(model.lemmaId(entry)));
    const dueIds = new Set(ready.map(model.lemmaId));
    const todayIds = options.todayIds instanceof Set ? options.todayIds : new Set(options.todayIds || []);
    const scheduledUnique = new Set([...dueIds, ...learning.map(model.lemmaId)]);
    const amountMode = DAILY_AMOUNT_MODES.includes(options.dailyAmountMode) ? options.dailyAmountMode : profile.dailyAmountMode;
    const dailyAmount = Math.min(200, Math.max(1, Math.floor(Number(options.dailyAmount) || profile.dailyAmount)));
    const goalRemaining = Math.max(0, Math.max(0, Number(options.target) || profile.size) - new Set([...todayIds, ...scheduledUnique]).size);
    const remaining = amountMode === 'unlimited' ? 'unlimited' : amountMode === 'set' ? dailyAmount : goalRemaining;
    let eligible = Array.isArray(options.maintenanceEntries)
      ? filterStudyableEntries(options.maintenanceEntries, language, { model, glossMap: options.glossMap }).entries
      : allEntries;
    const newScopeEntries = profile.introduceNewCount > 0 && options.newEntries
      ? filterStudyableEntries(options.newEntries, language, { model, glossMap: options.glossMap }).entries
      : profile.introduceNewCount > 0 ? eligible.slice() : [];
    eligible = eligible.filter(entry => !scheduledUnique.has(model.lemmaId(entry)) && !todayIds.has(model.lemmaId(entry)));
    const built = buildSelectedSession(eligible, store, model, { strategy: profile.strategy, selectedGrades: profile.selectedGrades, size: remaining === 'unlimited' ? 'unlimited' : (remaining || 1), dateISO: date, attention: options.attention, eligibleIds: options.eligibleIds, seed: options.seed });
    const finiteRemaining = remaining === 'unlimited' ? 0 : remaining;
    const newLimit = Math.min(profile.introduceNewCount, Math.floor((amountMode === 'set' ? dailyAmount : Math.max(0, Number(options.target) || profile.size)) * .25), finiteRemaining);
    const newCandidates = newScopeEntries.filter(entry => model.learningStatusForRecord(store.records?.[model.lemmaId(entry)] || null, date) === model.STATUS.NOT_LEARNED && !scheduledUnique.has(model.lemmaId(entry)) && !todayIds.has(model.lemmaId(entry)))
      .sort((a,b) => (Number(b.scopeFrequency) || Number(b.freq) || 0) - (Number(a.scopeFrequency) || Number(a.freq) || 0) || clean(model.lemmaId(a)).localeCompare(clean(model.lemmaId(b))));
    const introduced = newCandidates.slice(0, newLimit);
    const introducedIds = new Set(introduced.map(model.lemmaId));
    const maintenance = remaining ? built.entries.filter(entry => !introducedIds.has(model.lemmaId(entry))).slice(0, remaining === 'unlimited' ? undefined : Math.max(0, remaining - introduced.length)) : [];
    const sessionId = uuid();
    const ordered = [...due.map(entry => ({ entry, phase: 'scheduled' })), ...learning.map(entry => ({ entry, phase: 'learning' })), ...introduced.map(entry => ({ entry, phase: 'new' })), ...maintenance.map(entry => ({ entry, phase: 'maintenance' }))];
    const cards = ordered.map(({entry, phase}, index) => { const id = model.lemmaId(entry); return makeCard(id, directionFor(profile.promptDirection, sessionId, id, index), phase, index); });
    const selectedIds = new Set(ordered.map(({ entry }) => model.lemmaId(entry)));
    const remainingCandidateIds = amountMode === 'unlimited' ? built.candidates.map(candidate => candidate.id).filter(id => !selectedIds.has(id)) : [];
    const target = amountMode === 'goal' ? Number(options.target) || profile.size : amountMode === 'set' ? scheduledUnique.size + dailyAmount : 0;
    return normalizeSession({ sessionId, language, sessionType: 'daily', source: profile.source, sourceId: profile.sourceId, strategy: profile.strategy, selectedGrades: profile.selectedGrades, promptDirection: profile.promptDirection, dailyAmountMode: amountMode, dailyAmount, phase: cards[0]?.phase || 'complete', cards, position: 0, startingDailyCount: todayIds.size, target, unlimited: amountMode === 'unlimited', remainingCandidateIds, introducedWordIds: introduced.map(model.lemmaId), requestedNewCount: profile.introduceNewCount, diagnostics: validatedAll.diagnostics, returnPage: options.returnPage, contextTitle: options.contextTitle, contextDetail: options.contextDetail, limitedByPool: amountMode !== 'unlimited' && finiteRemaining > maintenance.length + introduced.length, createdAt: nowISO() });
  }
  function assembleFocusedSession(options = {}){
    const language = options.language === 'hebrew' ? 'hebrew' : 'greek';
    const profile = normalizeProfile(options.profile || {}, language);
    const model = options.model;
    const store = options.store || { records: {} };
    const validated = filterStudyableEntries(options.entries, language, { model, glossMap: options.glossMap });
    const entries = validated.entries;
    const statusFilters = new Set(profile.statusFilters);
    const statusKey = entry => { const status = model.learningStatusForRecord(store.records?.[model.lemmaId(entry)] || null); return status === model.STATUS.NOT_LEARNED ? 'new' : (status === model.STATUS.LEARNING || status === model.STATUS.REVIEWING ? 'learning' : 'known'); };
    const newSource = options.newEntries ? filterStudyableEntries(options.newEntries, language, { model, glossMap: options.glossMap }).entries : entries;
    const newPool = newSource.filter(entry => statusKey(entry) === 'new').sort((a,b) => (Number(b.scopeFrequency) || Number(b.freq) || 0) - (Number(a.scopeFrequency) || Number(a.freq) || 0) || clean(model.lemmaId(a)).localeCompare(clean(model.lemmaId(b))));
    const size = profile.unlimited ? 'unlimited' : profile.size;
    const introducedCount = profile.unlimited ? profile.introduceNewCount : Math.min(profile.introduceNewCount, Math.floor(profile.size * .25));
    const introduced = newPool.slice(0, introducedCount);
    const introducedIdSet = new Set(introduced.map(model.lemmaId));
    const mainEntries = entries.filter(entry => statusFilters.has(statusKey(entry)) && !introducedIdSet.has(model.lemmaId(entry)));
    const reviewSize = profile.unlimited ? 'unlimited' : Math.max(0, profile.size - introduced.length);
    const built = buildSelectedSession(mainEntries, store, model, { strategy: profile.strategy, selectedGrades: profile.selectedGrades, size: reviewSize || 1, dateISO: options.dateISO || todayISO(), attention: options.attention, seed: options.seed });
    const sessionId = uuid();
    const selectedIds = [...introduced.map(model.lemmaId), ...built.entries.slice(0, reviewSize === 'unlimited' ? undefined : reviewSize).map(model.lemmaId)];
    const remainingCandidateIds = profile.unlimited
      ? built.candidates.map(candidate => candidate.id).filter(id => !selectedIds.includes(id))
      : [];
    const introducedIds = new Set(introduced.map(model.lemmaId));
    const selectedEntryById = new Map([...introduced, ...built.entries].map(entry => [model.lemmaId(entry), entry]));
    const cards = selectedIds.map((id, index) => makeCard(id, directionFor(profile.promptDirection, sessionId, id, index), introducedIds.has(id) || statusKey(selectedEntryById.get(id)) === 'new' ? 'new' : 'maintenance', index));
    return normalizeSession({ sessionId, language, sessionType: 'focused', source: profile.source, sourceId: profile.sourceId, strategy: profile.strategy, selectedGrades: profile.selectedGrades, promptDirection: profile.promptDirection, phase: cards[0]?.phase || 'complete', cards, position: 0, target: profile.unlimited ? 0 : cards.length, unlimited: profile.unlimited, remainingCandidateIds, introducedWordIds: [...introducedIds], requestedNewCount: profile.introduceNewCount, diagnostics: validated.diagnostics, returnPage: options.returnPage, contextTitle: options.contextTitle, contextDetail: options.contextDetail, limitedByPool: !profile.unlimited && cards.length < profile.size, createdAt: nowISO() });
  }
  function currentCard(session){ const normalized = normalizeSession(session); return normalized.cards.slice(normalized.position).find(card => !card.answered) || null; }
  function advanceSession(session, event){
    const next = normalizeSession(session); const card = currentCard(next); if(!card) return next;
    next.revealedCardId = '';
    const target = next.cards.find(item => item.cardId === card.cardId); target.answered = true;
    next.submittedEventIds = [...new Set([...next.submittedEventIds, event.eventId])];
    if(event.confidence === 'again' || event.confidence === 'hard') next.difficultIds = [...new Set([...next.difficultIds, card.vocabularyId])];
    next.counts[card.phase] = (next.counts[card.phase] || 0) + 1;
    next.position = target.index + 1;
    let upcoming = currentCard(next);
    if(!upcoming && next.unlimited && next.remainingCandidateIds.length){
      const batch = next.remainingCandidateIds.splice(0, 100);
      const startIndex = next.cards.length;
      next.cards.push(...batch.map((id, offset) => makeCard(id, directionFor(next.promptDirection, next.sessionId, id, startIndex + offset), 'maintenance', startIndex + offset)));
      upcoming = currentCard(next);
    }
    next.phase = upcoming?.phase || 'complete';
    if(!upcoming) next.completedAt = nowISO();
    next.updatedAt = nowISO();
    return next;
  }
  function buildRecap(session){
    const next = normalizeSession(session); const ids = [...new Set(next.difficultIds)];
    const baseIndex = next.cards.length;
    next.cards.push(...ids.map((id,index) => {
      const original = next.cards.find(card => card.vocabularyId === id);
      return makeCard(id, original?.direction || 'reading', 'recap', baseIndex + index);
    }));
    next.position = baseIndex; next.phase = ids.length ? 'recap' : 'complete'; next.completedAt = ids.length ? '' : next.completedAt; next.recapStarted = true; next.updatedAt = nowISO();
    return next;
  }
  function recordAnswer(options = {}){
    const model = options.model; const session = normalizeSession(options.session); const card = currentCard(session);
    if(!card || card.cardId !== options.cardId) return { accepted: false, reason: 'stale-card', session };
    const store = model.normalizeStore(options.store); const entry = options.entry; const id = model.lemmaId(entry);
    if(id !== card.vocabularyId) return { accepted: false, reason: 'wrong-card', session };
    const existing = store.records[id] || { id, lemma: entry.lemma || entry.word, lang: session.language, status: 'Learning', successCount: 0, intervalDays: 0, due: todayISO(), history: [] };
    if(session.submittedEventIds.includes(card.eventId) || eventAlreadyRecorded(existing, card.eventId)){
      const replayEvent = (existing.history || []).find(event => event.eventId === card.eventId) || { eventId: card.eventId, confidence: confidenceOf(options.confidence) };
      return { accepted: false, reason: 'duplicate', session: advanceSession(session, replayEvent), store };
    }
    const scheduled = card.phase === 'scheduled' || card.phase === 'learning' || card.phase === 'new';
    const recap = card.phase === 'recap';
    const scheduleUpdated = scheduled || (!recap && options.maintenanceSrs !== false);
    const context = { eventId: card.eventId, vocabularyId: id, language: session.language, sessionId: session.sessionId, phase: card.phase, practiceType: recap ? 'recap' : scheduled ? 'scheduled' : 'maintenance', promptDirection: card.direction, scheduleUpdated, recap, countTowardDaily: !recap, date: options.dateISO || todayISO() };
    const transition = scheduleUpdated ? applyConfidence(existing, options.confidence, context) : appendEvidenceOnly(existing, options.confidence, context);
    store.records[id] = model.normalizeRecord ? model.normalizeRecord(transition.record) : transition.record;
    appendAttempt(transition.event, options.adapter);
    return { accepted: true, event: transition.event, store, session: advanceSession(session, transition.event) };
  }

  function exportState(adapter){ return { schemaVersion: VERSION, profiles: loadProfiles(adapter), sessions: loadSessions(adapter), attempts: readJson(ATTEMPT_KEY, { schemaVersion: VERSION, revision: 0, events: [] }, adapter), needsAttention: loadAttention(adapter), maintenanceSrsPreference: loadMaintenancePreference(adapter), revision: revision(adapter) }; }
  function importState(payload = {}, adapter){
    const source = payload.learningPractice || payload;
    if(source.profiles) writeJson(PROFILE_KEY, normalizeProfiles(source.profiles), adapter);
    if(source.sessions) writeJson(SESSION_KEY, { schemaVersion: VERSION, revision: Number(source.sessions.revision) || 0, sessions: { greek: source.sessions.sessions?.greek ? normalizeSession(source.sessions.sessions.greek) : null, hebrew: source.sessions.sessions?.hebrew ? normalizeSession(source.sessions.sessions.hebrew) : null } }, adapter);
    if(source.attempts) writeJson(ATTEMPT_KEY, { schemaVersion: VERSION, revision: Number(source.attempts.revision) || 0, events: (source.attempts.events || []).slice(-MAX_ATTEMPTS) }, adapter);
    if(source.needsAttention) writeJson(ATTENTION_KEY, normalizeAttention(source.needsAttention), adapter);
    if(source.maintenanceSrsPreference) writeJson(MAINTENANCE_SRS_KEY, normalizeMaintenancePreference(source.maintenanceSrsPreference), adapter);
    bumpRevision(adapter); return exportState(adapter);
  }

  return { VERSION, PROFILE_KEY, SESSION_KEY, ATTEMPT_KEY, ATTENTION_KEY, MAINTENANCE_SRS_KEY, LEGACY_SRS_KEY, REVISION_KEY, LANGUAGES, CONFIDENCES, DIRECTIONS, STRATEGIES, GRADES, STATUS_FILTERS, PASSAGE_SCOPES, DAILY_AMOUNT_MODES, MAX_ATTEMPTS, SESSION_EXPIRY_MS, uuid, stableHash, bumpRevision, revision, defaultProfile, normalizeProfile, normalizeProfiles, loadProfiles, saveProfile, profileSummary, validateVocabularyCard, filterStudyableEntries, normalizeMaintenancePreference, loadMaintenancePreference, setMaintenancePreference, normalizeAttention, loadAttention, needsAttention, setNeedsAttention, confidenceOf, confidenceResult, nextInterval, applyConfidence, appendEvidenceOnly, eventAlreadyRecorded, appendAttempt, candidateCompare, buildBalancedSession, buildSelectedSession, directionFor, normalizeSession, loadSessions, activeSession, saveSession, discardSession, sessionExpired, assembleSession, assembleFocusedSession, currentCard, advanceSession, buildRecap, recordAnswer, exportState, importState };
});
