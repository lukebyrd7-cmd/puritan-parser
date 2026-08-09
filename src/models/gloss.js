/* ---------- Gloss model helpers ---------- */
(function(root, factory){
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GlossModel = api;
  Object.keys(api).forEach(key => { root[key] = root[key] || api[key]; });
})(typeof globalThis !== 'undefined' ? globalThis : this, function(root){
  let correctionMap = new Map();
  function nonEmpty(value){ return typeof value === 'string' && value.trim() ? value.trim() : ''; }
  function normalizeAlternateGlosses(value){
    if (Array.isArray(value)) return value.map(nonEmpty).filter(Boolean);
    const text = nonEmpty(value);
    return text ? text.split(/[,;|]/).map(nonEmpty).filter(Boolean) : [];
  }
  function createGlossFields(attrs = {}){
    return {
      primaryGloss: nonEmpty(attrs.primaryGloss),
      alternateGlosses: normalizeAlternateGlosses(attrs.alternateGlosses),
      glossSource: nonEmpty(attrs.glossSource),
      glossSourceUrl: nonEmpty(attrs.glossSourceUrl),
      glossLicense: nonEmpty(attrs.glossLicense),
      glossAttribution: nonEmpty(attrs.glossAttribution),
      customGloss: nonEmpty(attrs.customGloss)
    };
  }
  function getSourceGloss(word = {}){ return nonEmpty(word.primaryGloss) || nonEmpty(word.gloss) || ''; }
  function splitGlossValue(value){
    return nonEmpty(value).split(/[,;|\u2022]/).map(nonEmpty).filter(Boolean);
  }
  function containsGreekScript(value){ return /[\u0370-\u03ff\u1f00-\u1fff]/u.test(nonEmpty(value)); }
  function containsHebrewScript(value){ return /[\u0590-\u05ff]/u.test(nonEmpty(value)); }
  function isLearnerEnglishGloss(value){
    const clean = nonEmpty(value);
    if(!clean || containsGreekScript(clean) || containsHebrewScript(clean) || !/[A-Za-z]/.test(clean)) return false;
    if(/^(?:lemma:|gk-|hb-|strong(?:'|’)?s?\s*[gh]?\d+|[a-z]{1,3}-\s*[0-9a-z-]+)$/i.test(clean)) return false;
    return !/^[a-z]{1,3}-\s*(?:[-0-9a-z]+)$/i.test(clean);
  }
  function hasStrongHebrewNotationSource(word = {}, options = {}){
    if(options.sourceNotation === 'strongs-ie') return true;
    return /Strong(?:'|’)?s Hebrew Dictionary/i.test(nonEmpty(word.glossSource));
  }
  function stripStrongIeArtifact(value, word = {}, options = {}){
    const sense = nonEmpty(value);
    if(!sense || !hasStrongHebrewNotationSource(word, options) || !/\s+i$/.test(sense)) return sense;
    const stripped = sense.replace(/\s+i$/, '').trim();
    return /^[\s'"“”‘’()[\]{}.,:;!?-]*$/.test(stripped) ? '' : stripped;
  }
  function sourceNotationLeakage(values = [], word = {}, options = {}){
    if(!hasStrongHebrewNotationSource(word, options)) return [];
    return values.flatMap(splitGlossValue).filter(value => stripStrongIeArtifact(value, word, options) !== value);
  }
  function articleDuplicateSenses(values = []){
    const senses = values.flatMap(splitGlossValue);
    const keys = new Set(senses.map(value => value.toLocaleLowerCase()));
    return senses.filter(value => {
      const match = value.match(/^(?:a|an|the)\s+(.+)$/i);
      return Boolean(match && keys.has(match[1].toLocaleLowerCase()));
    });
  }
  function presentLexicalGlosses(word = {}, options = {}){
    const missingLabel = nonEmpty(options.missingLabel) || 'Gloss unavailable';
    const rawValues = [
      ...splitGlossValue(options.primaryGloss || word.customGloss || word.primaryGloss || word.gloss),
      ...normalizeAlternateGlosses(options.alternateGlosses ?? word.alternateGlosses).flatMap(splitGlossValue)
    ];
    const articleDuplicates = new Set(articleDuplicateSenses(rawValues).map(value => value.toLocaleLowerCase()));
    const values = rawValues
      .map(value => stripStrongIeArtifact(value, word, options))
      .filter(value => value && isLearnerEnglishGloss(value) && !articleDuplicates.has(value.toLocaleLowerCase()));
    const seen = new Set();
    const glosses = values.filter(value => {
      const key = value.toLowerCase();
      if(!value || /^(?:\(?missing gloss\)?|unknown|n\/a|none|null|undefined|\u2014|-)$/i.test(value) || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const primaryLimit = Math.max(1, Number(options.primaryLimit) || 3);
    return {
      available: glosses.length > 0,
      primary: glosses.slice(0, primaryLimit),
      additional: glosses.slice(primaryLimit),
      all: glosses,
      compact: glosses.length ? glosses.join('; ') : missingLabel,
      primaryText: glosses.length ? glosses.slice(0, primaryLimit).join('; ') : missingLabel,
      missingLabel
    };
  }
  function setGlossCorrections(manifest = {}){
    const next = new Map();
    (Array.isArray(manifest.corrections) ? manifest.corrections : []).forEach(item => {
      if(item?.vocabularyId && !next.has(item.vocabularyId)) next.set(item.vocabularyId, item);
    });
    correctionMap = next;
    return correctionMap;
  }
  function vocabularyId(word = {}){
    if(nonEmpty(word.vocabularyId || word.id).startsWith('lemma:')) return nonEmpty(word.vocabularyId || word.id);
    const lang = nonEmpty(word.language || word.lang).toLowerCase() === 'hebrew' ? 'hebrew' : 'greek';
    const lemma = nonEmpty(word.lemma || word.lexicalForm || word.word);
    return lemma ? `lemma:${lang}:${lemma}` : nonEmpty(word.vocabularyId || word.id);
  }
  function correctedStandard(word = {}, standard){
    const correction = correctionMap.get(vocabularyId(word));
    if(!correction) return { presentation: standard, correction: null };
    const expected = nonEmpty(correction.expectedSourceValue);
    if(expected && expected !== standard.compact) return { presentation: standard, correction: { ...correction, valid: false } };
    const presentation = presentLexicalGlosses({}, { primaryGloss: (correction.correctedPrimary || []).join('; '), alternateGlosses: correction.correctedAdditional || [], missingLabel: standard.missingLabel });
    return { presentation, correction: { ...correction, valid: presentation.available } };
  }
  function resolveLexicalGloss(word = {}, options = {}){
    const sourceStandard = presentLexicalGlosses({ ...word, customGloss: '' }, { ...options, primaryGloss: options.standardPrimary, alternateGlosses: options.standardAdditional });
    const corrected = correctedStandard(word, sourceStandard);
    const standard = corrected.presentation;
    const personal = options.personal && typeof options.personal === 'object' ? options.personal : null;
    const personalGlosses = presentLexicalGlosses({}, { primaryGloss: personal?.glosses?.join('; '), alternateGlosses: [], primaryLimit: Number.MAX_SAFE_INTEGER }).all;
    const mode = ['standard','add','replace'].includes(personal?.mode) ? personal.mode : 'standard';
    const values = mode === 'replace' && personalGlosses.length
      ? personalGlosses
      : mode === 'add' ? [...standard.all, ...personalGlosses] : standard.all;
    const effective = presentLexicalGlosses({}, { primaryGloss: values.join('; '), alternateGlosses: [], primaryLimit: options.primaryLimit || 3, missingLabel: standard.missingLabel });
    return { standard, sourceStandard, correction: corrected.correction, personal: { mode, glosses: personalGlosses, active: mode !== 'standard' && personalGlosses.length > 0 }, effective };
  }
  function getDisplayGloss(word = {}, options = {}){
    const legacyPersonal = nonEmpty(word.customGloss) ? { mode: 'replace', glosses: [word.customGloss] } : null;
    const storedPersonal = options.personal === undefined ? root.PuritanPersonalGlosses?.recordFor?.(word) : options.personal;
    return resolveLexicalGloss(word, { missingLabel: '(missing gloss)', ...options, personal: storedPersonal || legacyPersonal }).effective.compact || '(missing gloss)';
  }
  function glossSearchText(word = {}){
    const personal = root.PuritanPersonalGlosses?.recordFor?.(word)?.glosses || [];
    return [
      word.word, word.lemma, word.lexicalForm, word.transliteration, word.primaryGloss,
      ...normalizeAlternateGlosses(word.alternateGlosses), word.gloss, word.customGloss,
      getDisplayGloss(word), ...personal
    ].map(value => nonEmpty(value)).filter(Boolean).join(' ').toLowerCase();
  }
  function hasAnyGloss(word = {}){ return getDisplayGloss(word) !== '(missing gloss)'; }
  function normalizeComparableSense(value){
    return nonEmpty(value)
      .toLocaleLowerCase('en')
      .replace(/[’']/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/^(?:a|an|the)\s+/, '')
      .replace(/\b([a-z]{3,})ies\b/g, '$1y')
      .replace(/\b([a-z]{4,})(?:ches|shes|xes|zes)\b/g, '$1')
      .replace(/\b([a-z]{4,})s\b/g, '$1')
      .replace(/\s+/g, ' ')
      .trim();
  }
  function contextualGlossAddsMeaning(lexical, contextual){
    const contextualSenses = splitGlossValue(contextual).filter(isLearnerEnglishGloss);
    if(!contextualSenses.length) return false;
    const lexicalValues = Array.isArray(lexical)
      ? lexical
      : typeof lexical === 'object' && lexical
        ? presentLexicalGlosses(lexical).all
        : splitGlossValue(lexical);
    const lexicalKeys = new Set(lexicalValues.map(normalizeComparableSense).filter(Boolean));
    return contextualSenses.some(value => !lexicalKeys.has(normalizeComparableSense(value)));
  }
  return { createGlossFields, getSourceGloss, getDisplayGloss, glossSearchText, normalizeAlternateGlosses, presentLexicalGlosses, articleDuplicateSenses, stripStrongIeArtifact, sourceNotationLeakage, containsGreekScript, containsHebrewScript, isLearnerEnglishGloss, normalizeComparableSense, contextualGlossAddsMeaning, setGlossCorrections, vocabularyId, resolveLexicalGloss, hasAnyGloss };
});
