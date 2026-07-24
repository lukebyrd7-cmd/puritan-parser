/* ---------- Shared Hebrew lexical-search normalization ---------- */
(function(root, factory){
  const api = factory();
  if(typeof module === 'object' && module.exports) module.exports = api;
  root.PuritanHebrewSearch = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(){
  const HEBREW_LETTER = /[\u05d0-\u05ea]/;
  const HEBREW_TEXT = /[\u0590-\u05ff]/;
  const LATIN_TEXT = /[a-z]/i;
  const CANTILLATION = /[\u0591-\u05af\u05bd\u05bf\u05c0\u05c3\u05c4\u05c5\u05c6]/g;
  const POINTING = /[\u05b0-\u05bc\u05c1\u05c2\u05c7]/g;
  const VOWELS = {
    '\u05b0': 'e',
    '\u05b1': 'e',
    '\u05b2': 'a',
    '\u05b3': 'o',
    '\u05b4': 'i',
    '\u05b5': 'e',
    '\u05b6': 'e',
    '\u05b7': 'a',
    '\u05b8': 'a',
    '\u05b9': 'o',
    '\u05ba': 'o',
    '\u05bb': 'u',
    '\u05c7': 'o'
  };
  const CONSONANTS = {
    א: '', ב: 'v', ג: 'g', ד: 'd', ה: 'h', ו: 'v', ז: 'z', ח: 'ch',
    ט: 't', י: 'y', כ: 'kh', ך: 'kh', ל: 'l', מ: 'm', ם: 'm', נ: 'n',
    ן: 'n', ס: 's', ע: '', פ: 'f', ף: 'f', צ: 'ts', ץ: 'ts', ק: 'q',
    ר: 'r', ש: 'sh', ת: 't'
  };
  let buildCount = 0;
  let recordIndexCache = new WeakMap();
  let valueTermsCache = new Map();

  function clean(value){ return typeof value === 'string' ? value.trim() : ''; }
  function hasHebrew(value){ return HEBREW_TEXT.test(clean(value)); }
  function hasLatin(value){ return LATIN_TEXT.test(clean(value)); }
  function stripCantillation(value){
    return clean(value).normalize('NFD').replace(CANTILLATION, '').normalize('NFC');
  }
  function normalizeHebrew(value){
    return stripCantillation(value)
      .normalize('NFD')
      .replace(POINTING, '')
      .replace(/[^\u05d0-\u05ea]/g, '')
      .normalize('NFC');
  }
  function normalizeLatin(value){
    return clean(value)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
  }
  function hebrewClusters(value){
    const clusters = [];
    for(const char of stripCantillation(value).normalize('NFD')){
      if(HEBREW_LETTER.test(char)) clusters.push({ letter: char, marks: [] });
      else if(clusters.length && /[\u05b0-\u05bc\u05c1\u05c2\u05c7]/.test(char)) clusters.at(-1).marks.push(char);
    }
    return clusters;
  }
  function clusterVowel(cluster, index, clusters){
    const mark = cluster.marks.find(item => VOWELS[item]);
    if(!mark) return '';
    if(mark === '\u05b0' && index === clusters.length - 1) return '';
    return VOWELS[mark] || '';
  }
  function transliterateClusters(clusters = []){
    let result = '';
    clusters.forEach((cluster, index) => {
      const marks = new Set(cluster.marks);
      let consonant = CONSONANTS[cluster.letter] ?? '';
      let vowel = clusterVowel(cluster, index, clusters);
      if(cluster.letter === 'ש') consonant = marks.has('\u05c2') ? 's' : 'sh';
      if(cluster.letter === 'ב') consonant = marks.has('\u05bc') ? 'b' : 'v';
      if(['כ', 'ך'].includes(cluster.letter)) consonant = marks.has('\u05bc') ? 'k' : 'kh';
      if(['פ', 'ף'].includes(cluster.letter)) consonant = marks.has('\u05bc') ? 'p' : 'f';
      if(cluster.letter === 'ו' && marks.has('\u05b9')) consonant = '';
      if(cluster.letter === 'ו' && marks.has('\u05bc') && !vowel){ consonant = ''; vowel = 'u'; }
      if(cluster.letter === 'י' && !vowel && /i$/.test(result)) consonant = '';
      result += consonant + vowel;
    });
    return normalizeLatin(result);
  }
  function transliterateHebrew(value){
    return transliterateClusters(hebrewClusters(value));
  }
  function addAlias(set, value){
    const normalized = normalizeLatin(value);
    if(normalized) set.add(normalized);
  }
  function aliasesForCanonical(canonical, finalLetter = ''){
    const aliases = new Set();
    addAlias(aliases, canonical);
    if(!canonical) return [];
    const substitutions = [
      [/kh/g, 'ch'],
      [/ch/g, 'kh'],
      [/kh/g, 'k'],
      [/ts/g, 'tz'],
      [/q/g, 'k'],
      [/v/g, 'w'],
      [/w/g, 'v']
    ];
    substitutions.forEach(([pattern, replacement]) => addAlias(aliases, canonical.replace(pattern, replacement)));
    addAlias(aliases, canonical.replace(/([bcdfghjklmnpqrstvwxyz])\1+/g, '$1'));
    if(finalLetter === 'ה' && canonical.endsWith('h')) addAlias(aliases, canonical.slice(0, -1));
    aliases.delete(canonical);
    return [...aliases];
  }
  function transliterationAliases(value){
    const canonical = transliterateHebrew(value);
    return aliasesForCanonical(canonical, hebrewClusters(value).at(-1)?.letter);
  }
  function termsForHebrewValue(value){
    const key = clean(value);
    if(valueTermsCache.has(key)) return valueTermsCache.get(key);
    const clusters = hebrewClusters(key);
    const canonical = transliterateClusters(clusters);
    const terms = {
      hebrew: normalizeHebrew(key),
      canonical,
      aliases: aliasesForCanonical(canonical, clusters.at(-1)?.letter)
    };
    valueTermsCache.set(key, terms);
    return terms;
  }
  function createHebrewSearchTerms(values = []){
    const sourceValues = (Array.isArray(values) ? values : [values]).map(clean).filter(hasHebrew);
    const hebrew = new Set();
    const canonical = new Set();
    const aliases = new Set();
    sourceValues.forEach(value => {
      const terms = termsForHebrewValue(value);
      if(terms.hebrew) hebrew.add(terms.hebrew);
      if(terms.canonical) canonical.add(terms.canonical);
      terms.aliases.forEach(alias => aliases.add(alias));
    });
    return { hebrew: [...hebrew], canonical: [...canonical], aliases: [...aliases] };
  }
  function scoreHebrewSearchTerms(terms = {}, query = ''){
    if(hasHebrew(query)){
      const q = normalizeHebrew(query);
      if(!q) return 0;
      if((terms.hebrew || []).includes(q)) return 1000;
      if((terms.hebrew || []).some(value => value.startsWith(q))) return 800;
      if(q.length >= 2 && (terms.hebrew || []).some(value => value.includes(q))) return 300;
      return 0;
    }
    const q = normalizeLatin(query);
    if(!q || !hasLatin(q)) return 0;
    if((terms.canonical || []).includes(q)) return 950;
    if((terms.aliases || []).includes(q)) return 900;
    if(q.length >= 2 && (terms.canonical || []).some(value => value.startsWith(q))) return 780;
    if(q.length >= 2 && (terms.aliases || []).some(value => value.startsWith(q))) return 740;
    if(q.length >= 3 && (terms.canonical || []).some(value => value.includes(q))) return 400;
    if(q.length >= 3 && (terms.aliases || []).some(value => value.includes(q))) return 350;
    return 0;
  }
  function buildHebrewSearchIndex(records = [], valuesForRecord = record => record){
    if(Array.isArray(records) && recordIndexCache.has(records)) return recordIndexCache.get(records);
    buildCount += 1;
    const index = (records || []).map((record, position) => ({
      record,
      position,
      terms: createHebrewSearchTerms(valuesForRecord(record))
    }));
    if(Array.isArray(records)) recordIndexCache.set(records, index);
    return index;
  }
  function searchHebrewRecords(records = [], query = '', valuesForRecord){
    return buildHebrewSearchIndex(records, valuesForRecord)
      .map(item => ({ ...item, score: scoreHebrewSearchTerms(item.terms, query) }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score || a.position - b.position);
  }
  function searchDebugState(){ return { buildCount }; }
  function resetSearchCache(){
    buildCount = 0;
    recordIndexCache = new WeakMap();
    valueTermsCache = new Map();
  }

  return {
    hasHebrew,
    hasLatin,
    stripCantillation,
    normalizeHebrew,
    normalizeLatin,
    transliterateHebrew,
    transliterationAliases,
    createHebrewSearchTerms,
    scoreHebrewSearchTerms,
    buildHebrewSearchIndex,
    searchHebrewRecords,
    searchDebugState,
    resetSearchCache
  };
});
