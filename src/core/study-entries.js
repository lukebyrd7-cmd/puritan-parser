/* ---------- Study entry grouping ---------- */
(function(root, factory){
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.StudyEntries = api;
  Object.keys(api).forEach(key => { root[key] = root[key] || api[key]; });
})(typeof globalThis !== 'undefined' ? globalThis : this, function(root){
  const groupedCache = new WeakMap();
  let groupedAsyncCache = new WeakMap();
  let asyncBuildCount = 0;
  function clean(value){ return typeof value === 'string' ? value.trim() : ''; }
  function normalizeGlosses(value){
    if(typeof root.normalizeAlternateGlosses === 'function') return root.normalizeAlternateGlosses(value);
    if(Array.isArray(value)) return value.map(clean).filter(Boolean);
    const text = clean(value);
    return text ? text.split(/[,;|]/).map(clean).filter(Boolean) : [];
  }
  function displayGloss(entry){
    if(typeof root.getDisplayGloss === 'function') return root.getDisplayGloss(entry);
    return clean(entry?.customGloss) || clean(entry?.primaryGloss) || clean(entry?.gloss) || '(missing gloss)';
  }
  function sourceGloss(entry){
    if(typeof root.getSourceGloss === 'function') return root.getSourceGloss(entry);
    return clean(entry?.primaryGloss) || clean(entry?.gloss);
  }
  function displayHeadword(entry){
    if(typeof root.getDisplayHeadword === 'function') return root.getDisplayHeadword(entry);
    return clean(entry?.lexicalForm) || clean(entry?.lemma) || clean(entry?.word);
  }
  function groupKey(entry){
    const lang = clean(entry?.lang).toLowerCase() || 'unknown';
    const lemma = clean(entry?.lemma) || clean(entry?.word) || '(unlemmatized)';
    return `${lang}\u0000${lemma}`;
  }
  function unique(values){ return Array.from(new Set(values.map(clean).filter(Boolean))); }
  function bestRepresentative(entries){
    return entries.slice().sort((a,b)=>
      (Number(b?.freq)||0) - (Number(a?.freq)||0) ||
      clean(a?.word).localeCompare(clean(b?.word))
    )[0] || entries[0];
  }
  function aggregateDue(entries){
    return entries.map(e => clean(e?.due)).filter(Boolean).sort()[0] || '';
  }
  function aggregateEase(entries){
    const vals = entries.map(e => typeof e?.ease === 'number' ? e.ease : null).filter(v => v !== null);
    return vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : undefined;
  }
  function aggregateRepetitions(entries){
    const vals = entries.map(e => Number(e?.repetitions)||0);
    return vals.length ? Math.min(...vals) : 0;
  }
  function explicitLemmaFrequency(entry){
    return [entry?.lemmaFreq, entry?.lemmaFrequency, entry?.frequencyLemma]
      .map(value => Number(value))
      .find(value => Number.isFinite(value) && value > 0);
  }
  function aggregateLemmaFrequency(entries){
    const explicit = entries.map(explicitLemmaFrequency).filter(value => value !== undefined);
    if(explicit.length) return Math.max(...explicit);
    const representative = bestRepresentative(entries);
    // Form rows may represent multiple inflections of one lemma, so summing them can overcount the lemma's actual corpus frequency.
    return Number(representative?.freq) || 0;
  }
  function createLemmaStudyEntry(entries){
    const originals = entries.slice();
    const representative = bestRepresentative(originals);
    const lang = clean(representative?.lang).toLowerCase() || clean(originals[0]?.lang).toLowerCase();
    const lemma = clean(representative?.lemma) || clean(originals[0]?.lemma) || clean(representative?.word);
    const primaryGloss = clean(representative?.customGloss) || sourceGloss(representative) || originals.map(sourceGloss).find(Boolean) || '';
    const alternateGlosses = unique(originals.flatMap(entry => [
      sourceGloss(entry), clean(entry?.gloss), clean(entry?.customGloss), ...normalizeGlosses(entry?.alternateGlosses)
    ])).filter(gloss => gloss !== primaryGloss);
    const lexicalForm = clean(representative?.lexicalForm) || originals.map(entry => clean(entry?.lexicalForm)).find(Boolean) || '';
    const forms = unique(originals.map(entry => entry?.word));
    const freq = aggregateLemmaFrequency(originals);
    return {
      id: `lemma:${lang}:${lemma}`,
      studyEntryType: 'lemma',
      lang,
      lemma,
      word: lemma,
      lexicalForm,
      representativeForm: clean(representative?.word) || lemma,
      primaryGloss,
      alternateGlosses,
      gloss: primaryGloss,
      ordinaryPracticeEligible: !originals.some(entry => entry?.ordinaryPracticeEligible === false),
      customGloss: clean(representative?.customGloss),
      freq,
      forms,
      originalEntries: originals,
      representativeEntry: representative,
      pos: clean(representative?.pos),
      parse: clean(representative?.parse),
      due: aggregateDue(originals),
      ease: aggregateEase(originals),
      repetitions: aggregateRepetitions(originals),
      history: representative?.history || [],
      vocab: representative?.vocab || { attempts: 0, correct: 0 }
    };
  }
  function groupEntriesByLemma(entries = []){
    const groups = new Map();
    entries.filter(Boolean).forEach(entry => {
      const key = groupKey(entry);
      if(!groups.has(key)) groups.set(key, []);
      groups.get(key).push(entry);
    });
    return Array.from(groups.values()).map(createLemmaStudyEntry);
  }
  function getStudyEntries(entries = [], studyMode = 'lemma'){
    if(studyMode === 'form' || !Array.isArray(entries)) return entries;
    if(groupedCache.has(entries)) return groupedCache.get(entries);
    const grouped = groupEntriesByLemma(entries);
    groupedCache.set(entries, grouped);
    return grouped;
  }
  function yieldToBrowser(){
    return new Promise(resolve => {
      const schedule = typeof root.setTimeout === 'function' ? root.setTimeout.bind(root) : setTimeout;
      schedule(resolve, 0);
    });
  }
  function now(){ return root.performance?.now?.() || Date.now(); }
  async function groupEntriesByLemmaAsync(entries = [], options = {}){
    if(!Array.isArray(entries)) return entries;
    if(groupedCache.has(entries)) return groupedCache.get(entries);
    if(groupedAsyncCache.has(entries)) return groupedAsyncCache.get(entries);
    const budgetMs = Math.max(4, Math.min(24, Number(options.budgetMs) || 10));
    asyncBuildCount += 1;
    const pending = (async () => {
      const groups = new Map();
      let index = 0;
      while(index < entries.length){
        const started = now();
        do {
          const entry = entries[index++];
          if(entry){
            const key = groupKey(entry);
            if(!groups.has(key)) groups.set(key, []);
            groups.get(key).push(entry);
          }
        } while(index < entries.length && now() - started < budgetMs);
        if(index < entries.length) await yieldToBrowser();
      }
      const groupedValues = Array.from(groups.values());
      const grouped = [];
      index = 0;
      while(index < groupedValues.length){
        const started = now();
        do { grouped.push(createLemmaStudyEntry(groupedValues[index++])); }
        while(index < groupedValues.length && now() - started < budgetMs);
        if(index < groupedValues.length) await yieldToBrowser();
      }
      groupedCache.set(entries, grouped);
      return grouped;
    })().catch(error => { groupedAsyncCache.delete(entries); throw error; });
    groupedAsyncCache.set(entries, pending);
    return pending;
  }
  async function getStudyEntriesAsync(entries = [], studyMode = 'lemma', options = {}){
    if(studyMode === 'form' || !Array.isArray(entries)) return entries;
    return groupEntriesByLemmaAsync(entries, options);
  }
  function invalidateStudyEntriesCache(entries){
    if(Array.isArray(entries)){ groupedCache.delete(entries); groupedAsyncCache.delete(entries); }
  }
  function studyEntriesAsyncDebug(){ return { buildCount: asyncBuildCount }; }
  function isLemmaStudyEntry(entry){ return entry?.studyEntryType === 'lemma'; }
  function getStudyEntryOriginals(entry){ return isLemmaStudyEntry(entry) ? (entry.originalEntries || []) : [entry].filter(Boolean); }
  function getStudyEntrySearchText(entry = {}){
    if(isLemmaStudyEntry(entry)){
      return [displayHeadword(entry), entry.lemma, entry.lexicalForm, displayGloss(entry), entry.primaryGloss, ...(entry.alternateGlosses||[]), ...(entry.forms||[]), entry.representativeForm, entry.pos]
        .map(clean).filter(Boolean).join(' ').toLowerCase();
    }
    if(typeof root.glossSearchText === 'function') return root.glossSearchText(entry);
    return [displayHeadword(entry), entry.word, entry.lemma, entry.lexicalForm, entry.gloss, entry.primaryGloss, ...(normalizeGlosses(entry.alternateGlosses))].map(clean).filter(Boolean).join(' ').toLowerCase();
  }
  return { groupEntriesByLemma, groupEntriesByLemmaAsync, getStudyEntries, getStudyEntriesAsync, invalidateStudyEntriesCache, studyEntriesAsyncDebug, isLemmaStudyEntry, getStudyEntryOriginals, getStudyEntrySearchText, aggregateLemmaFrequency };
});
