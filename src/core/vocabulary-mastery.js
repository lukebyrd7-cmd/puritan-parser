/* ---------- Vocabulary mastery and daily practice summaries ---------- */
(function(root, factory){
  const api = factory(root);
  if(typeof module === 'object' && module.exports) module.exports = api;
  root.VocabularyMastery = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(root){
  const GRADE_META = {
    A: { label: 'Strong', rank: 0 },
    B: { label: 'Familiar', rank: 1 },
    C: { label: 'Developing', rank: 2 },
    D: { label: 'Weak', rank: 3 },
    F: { label: 'Relearning', rank: 4 }
  };
  const GRADE_LETTERS = Object.freeze(Object.keys(GRADE_META));
  const DEFAULT_SELECTED_GRADES = Object.freeze(['C', 'D', 'F']);
  const DEFAULT_SOURCE = 'all';
  const DEFAULT_ORDER = 'reinforcement';
  const DEFAULT_GRADE_FILTER = 'c-f';
  const DEFAULT_FOCUS = DEFAULT_ORDER;
  const DEFAULT_SESSION_SIZE = 20;

  function clean(value){ return typeof value === 'string' ? value.trim() : ''; }
  function practiceEvents(record = {}){
    if(root.VocabularyLearning?.reviewEvents) return root.VocabularyLearning.reviewEvents(record);
    return (Array.isArray(record.history) ? record.history : []).filter(event =>
      event?.result === 'recognized' || event?.result === 'missed' || ['again','hard','good','easy'].includes(event?.confidence)
    ).map(event => {
      if(event.result === 'recognized' || event.result === 'missed') return event;
      return { ...event, result: event.confidence === 'again' ? 'missed' : 'recognized' };
    });
  }
  function masteryGrade(record = {}, dateISO = ''){
    const events = practiceEvents(record);
    const recognized = events.filter(event => event.result === 'recognized').length;
    const missed = events.length - recognized;
    const evidencePoints = events.reduce((sum, event) => sum + ({ again: 0, hard: .45, good: .8, easy: 1 }[event.confidence] ?? (event.result === 'recognized' ? 1 : 0)), 0);
    const recent = events.slice(-5);
    const recentMisses = recent.filter(event => event.result === 'missed').length;
    const last = events.at(-1);
    const interval = Math.max(0, Number(record.intervalDays) || 0);
    const accuracy = events.length ? evidencePoints / events.length : null;
    let letter = 'C';

    if((recent.slice(-3).length === 3 && recent.slice(-3).every(event => event.result === 'missed'))
      || (events.length >= 4 && accuracy < 0.35)) letter = 'F';
    else if(recentMisses >= 2 || (events.length >= 4 && accuracy < 0.6)) letter = 'D';
    else if(events.length >= 8 && accuracy >= 0.9 && interval >= 7 && recentMisses === 0) letter = 'A';
    else if(events.length >= 5 && accuracy >= 0.68 && recentMisses <= 1) letter = 'B';

    const maintenance = events.filter(event => event.practice === 'maintenance');
    const evidence = [];
    if(events.length) evidence.push(`Recalled correctly ${recognized} of ${events.length} times`);
    else evidence.push('Limited recorded recall history');
    if(last?.result === 'missed') evidence.push('the most recent attempt was missed');
    else if(recentMisses === 1) evidence.push('with one recent miss');
    else if(recentMisses > 1) evidence.push(`with ${recentMisses} misses in the last ${recent.length} attempts`);
    else if(events.length) evidence.push('with no recent misses');
    if(maintenance.length) {
      const correct = maintenance.filter(event => event.result === 'recognized').length;
      evidence.push(`${correct} of ${maintenance.length} maintenance attempts were recognized`);
    }
    if(interval > 0 && clean(record.due) !== '9999-12-31') evidence.push(`the current review interval is ${interval} ${interval === 1 ? 'day' : 'days'}`);
    if(!events.length && clean(record.introducedAt) === dateISO) evidence.push('the word was added recently');

    return {
      letter,
      label: GRADE_META[letter].label,
      rank: GRADE_META[letter].rank,
      attempts: events.length,
      recognized,
      missed,
      evidencePoints,
      recentMisses,
      maintenanceAttempts: maintenance.length,
      accuracy,
      explanation: `${evidence.join(', ')}.`
    };
  }
  function matchesGradeFilter(grade, filter = DEFAULT_GRADE_FILTER){
    const letter = typeof grade === 'string' ? grade : grade?.letter;
    if(filter === 'd-f') return letter === 'D' || letter === 'F';
    if(filter === 'all') return Boolean(GRADE_META[letter]);
    return letter === 'C' || letter === 'D' || letter === 'F';
  }
  function normalizeSelectedGrades(selectedGrades, gradeFilter){
    if(selectedGrades instanceof Set || Array.isArray(selectedGrades)){
      const supplied = selectedGrades instanceof Set ? [...selectedGrades] : selectedGrades;
      return GRADE_LETTERS.filter(letter => supplied.includes(letter));
    }
    if(gradeFilter === 'all') return GRADE_LETTERS.slice();
    if(gradeFilter === 'd-f') return ['D', 'F'];
    return DEFAULT_SELECTED_GRADES.slice();
  }
  function matchesSelectedGrades(grade, selectedGrades = DEFAULT_SELECTED_GRADES){
    const letter = typeof grade === 'string' ? grade : grade?.letter;
    return normalizeSelectedGrades(selectedGrades).includes(letter);
  }
  function latestEventDate(record = {}, result = ''){
    return practiceEvents(record).filter(event => !result || event.result === result).map(event => clean(event.date)).filter(Boolean).sort().at(-1) || '';
  }
  function reinforcementCompare(a, b){
    const gradeOrder = { F: 0, D: 1, C: 2, B: 3, A: 4 };
    return (gradeOrder[a.grade.letter] - gradeOrder[b.grade.letter])
      || clean(b.lastMiss).localeCompare(clean(a.lastMiss))
      || ((a.grade.accuracy ?? 1) - (b.grade.accuracy ?? 1))
      || clean(a.lastPractice).localeCompare(clean(b.lastPractice))
      || (a.grade.recognized - b.grade.recognized)
      || ((Number(b.entry.freq) || 0) - (Number(a.entry.freq) || 0))
      || clean(a.id).localeCompare(clean(b.id));
  }
  function knownCandidates(entries = [], store = {}, model, options = {}){
    const records = store?.records || {};
    const selectedGrades = normalizeSelectedGrades(options.selectedGrades, options.gradeFilter);
    const seen = new Set();
    return entries.map(entry => {
      const id = model.lemmaId(entry);
      if(!id || seen.has(id)) return null;
      seen.add(id);
      const record = records[id];
      const status = model.learningStatusForRecord
        ? model.learningStatusForRecord(record, options.dateISO)
        : model.learningStatus(store, entry, options.dateISO);
      if(status !== model.STATUS.KNOWN && status !== model.STATUS.KNOWN_SELF_REPORTED) return null;
      const safeRecord = record || {};
      const grade = masteryGrade(safeRecord, options.dateISO);
      return { id, entry, record: safeRecord, grade, lastMiss: latestEventDate(safeRecord, 'missed'), lastPractice: latestEventDate(safeRecord) };
    }).filter(Boolean).filter(item => matchesSelectedGrades(item.grade, selectedGrades));
  }
  function seededShuffle(items, random = Math.random){
    const copy = items.slice();
    for(let index = copy.length - 1; index > 0; index -= 1){
      const swap = Math.floor(Math.max(0, Math.min(0.999999, Number(random()) || 0)) * (index + 1));
      [copy[index], copy[swap]] = [copy[swap], copy[index]];
    }
    return copy;
  }
  function buildMaintenanceSession(entries = [], store = {}, model, options = {}){
    const source = options.source === 'book' || options.focus === 'book' ? 'book' : DEFAULT_SOURCE;
    const orderValue = options.order || options.focus;
    const order = orderValue === 'random' ? 'random' : DEFAULT_ORDER;
    const selectedGrades = normalizeSelectedGrades(options.selectedGrades, options.gradeFilter);
    const requested = options.size === 'unlimited' ? Infinity : Math.max(1, Number(options.size) || DEFAULT_SESSION_SIZE);
    let candidates = knownCandidates(entries, store, model, { ...options, selectedGrades });
    if(source === 'book' && options.bookIds instanceof Set) {
      candidates = candidates.filter(item => options.bookIds.has(item.id));
    }
    if(order === 'random') {
      candidates = seededShuffle(candidates, options.random);
    } else {
      candidates.sort(reinforcementCompare);
    }
    return {
      source,
      order,
      focus: order,
      selectedGrades: Object.freeze(selectedGrades.slice()),
      unlimited: requested === Infinity,
      entries: candidates.slice(0, requested === Infinity ? candidates.length : requested).map(item => item.entry),
      candidates,
      requestedSize: requested === Infinity ? 'unlimited' : requested,
      limitedByPool: requested !== Infinity && candidates.length < requested
    };
  }
  function dailyPracticeSummary(store = {}, language = 'greek', dateISO = '', target = 0){
    const scheduled = new Set();
    const maintenance = new Set();
    Object.values(store?.records || {}).forEach(record => {
      if(clean(record.lang).toLowerCase() !== language) return;
      practiceEvents(record).forEach(event => {
        if(clean(event.date) !== dateISO) return;
        if(event.recap === true || event.practice === 'recap' || event.countTowardDaily === false) return;
        const destination = event.practice === 'maintenance' ? maintenance : scheduled;
        destination.add(record.id);
      });
    });
    const combined = new Set([...scheduled, ...maintenance]);
    const safeTarget = Math.max(0, Number(target) || 0);
    return {
      language,
      date: dateISO,
      target: safeTarget,
      scheduled: scheduled.size,
      maintenance: maintenance.size,
      combined: combined.size,
      remaining: Math.max(0, safeTarget - combined.size),
      complete: safeTarget > 0 && combined.size >= safeTarget,
      scheduledIds: scheduled,
      maintenanceIds: maintenance,
      combinedIds: combined,
      hasCounted(id){ return combined.has(id); }
    };
  }
  function gradeDistribution(entries = [], store = {}, model, options = {}){
    const result = { A: 0, B: 0, C: 0, D: 0, F: 0, total: 0 };
    knownCandidates(entries, store, model, { ...options, selectedGrades: GRADE_LETTERS }).forEach(item => {
      result[item.grade.letter] += 1;
      result.total += 1;
    });
    return result;
  }

  return {
    GRADE_META,
    GRADE_LETTERS,
    DEFAULT_SELECTED_GRADES,
    DEFAULT_SOURCE,
    DEFAULT_ORDER,
    DEFAULT_GRADE_FILTER,
    DEFAULT_FOCUS,
    DEFAULT_SESSION_SIZE,
    practiceEvents,
    masteryGrade,
    matchesGradeFilter,
    normalizeSelectedGrades,
    matchesSelectedGrades,
    reinforcementCompare,
    knownCandidates,
    buildMaintenanceSession,
    dailyPracticeSummary,
    gradeDistribution
  };
});
