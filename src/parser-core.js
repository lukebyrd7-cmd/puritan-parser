(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.PuritanParserCore = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const CASES = {
    n: 'nominative',
    g: 'genitive',
    d: 'dative',
    a: 'accusative',
    v: 'vocative'
  };

  const NUMBERS = {
    s: 'singular',
    p: 'plural',
    d: 'dual'
  };

  const GENDERS = {
    m: 'masculine',
    f: 'feminine',
    n: 'neuter',
    c: 'common'
  };

  const GREEK_TENSES = {
    pres: 'present',
    impf: 'imperfect',
    fut: 'future',
    aor: 'aorist',
    perf: 'perfect',
    plup: 'pluperfect'
  };

  const GREEK_VOICES = {
    act: 'active',
    mid: 'middle',
    pas: 'passive',
    mp: 'middle/passive'
  };

  const GREEK_MOODS = {
    ind: 'indicative',
    subj: 'subjunctive',
    opt: 'optative',
    imp: 'imperative',
    inf: 'infinitive',
    ptc: 'participle'
  };

  const GREEK_COMPACT_TENSES = {
    p: 'present',
    i: 'imperfect',
    f: 'future',
    a: 'aorist',
    r: 'perfect',
    l: 'pluperfect'
  };

  const GREEK_COMPACT_VOICES = {
    a: 'active',
    m: 'middle',
    p: 'passive',
    n: 'middle/passive'
  };

  const GREEK_COMPACT_MOODS = {
    i: 'indicative',
    s: 'subjunctive',
    o: 'optative',
    m: 'imperative',
    n: 'infinitive',
    p: 'participle'
  };

  const HEBREW_STEMS = {
    qal: 'Qal',
    nifal: 'Nifal',
    niphal: 'Niphal',
    piel: 'Piel',
    pual: 'Pual',
    hifil: 'Hifil',
    hiphil: 'Hiphil',
    hofal: 'Hofal',
    hophal: 'Hophal',
    hitpael: 'Hitpael',
    hishtafel: 'Hishtafel',
    poel: 'Poel',
    polal: 'Polal',
    hithpael: 'Hithpael'
  };

  const HEBREW_FORMS = {
    perf: 'perfect',
    impf: 'imperfect',
    wayyiqtol: 'wayyiqtol',
    imp: 'imperative',
    inf: 'infinitive',
    ptc: 'participle',
    abs: 'absolute',
    construct: 'construct'
  };

  function norm(value) {
    return String(value || '').trim();
  }

  function tokenList(parse) {
    return norm(parse).toLowerCase().split(/[-_\s]+/).filter(Boolean);
  }

  function expandPersonNumberGender(code) {
    const m = norm(code).toLowerCase().match(/^([123])?([mfc])?([spd])$/);
    if (!m) return null;
    const parts = [];
    if (m[1]) parts.push(`${m[1]}${m[1] === '1' ? 'st' : m[1] === '2' ? 'nd' : 'rd'} person`);
    if (m[2] && GENDERS[m[2]]) parts.push(GENDERS[m[2]]);
    if (m[3] && NUMBERS[m[3]]) parts.push(NUMBERS[m[3]]);
    return parts.join(' ');
  }

  function decodeNominal(parse, label) {
    const raw = norm(parse);
    const bits = raw.split('-');
    const form = bits[1] || '';
    const c = CASES[form[0]?.toLowerCase()];
    const n = NUMBERS[form[1]?.toLowerCase()];
    const g = GENDERS[form[2]?.toLowerCase()];
    return {
      family: 'nominal',
      label,
      details: [c, n, g].filter(Boolean),
      summary: [label, c, n, g].filter(Boolean).join(', ')
    };
  }

  function decodeGreekVerb(parse) {
    const bits = norm(parse).toLowerCase().split('-').filter(Boolean);
    const compact = bits[1]?.match(/^[a-z]{3}$/);
    const tense = compact ? GREEK_COMPACT_TENSES[bits[1][0]] : (GREEK_TENSES[bits[1]] || bits[1]);
    const voice = compact ? GREEK_COMPACT_VOICES[bits[1][1]] : (GREEK_VOICES[bits[2]] || bits[2]);
    const mood = compact ? GREEK_COMPACT_MOODS[bits[1][2]] : (GREEK_MOODS[bits[3]] || bits[3]);
    const png = compact ? (expandPersonNumberGender(bits[2]) || bits[2]) : (expandPersonNumberGender(bits[4]) || bits[4]);
    const details = [tense, voice, mood, png].filter(Boolean);
    return {
      family: 'verb',
      label: 'Verb',
      details,
      summary: ['Verb'].concat(details).join(', ')
    };
  }

  function decodeHebrewVerb(parse) {
    const bits = norm(parse).toLowerCase().split('-').filter(Boolean);
    const stem = HEBREW_STEMS[bits[1]] || bits[1];
    const form = HEBREW_FORMS[bits[2]] || bits[2];
    const png = expandPersonNumberGender(bits[3]) || bits[3];
    const details = [stem, form, png].filter(Boolean);
    return {
      family: 'verb',
      label: 'Verb',
      details,
      summary: ['Verb'].concat(details).join(', ')
    };
  }

  function decodeParse(parse, lang) {
    const raw = norm(parse);
    if (!raw) return { raw, family: 'unknown', label: 'Unknown', details: [], summary: 'No parse data' };
    const first = raw.split('-')[0].toLowerCase();
    const language = norm(lang).toLowerCase();
    if (first === 'n') return decodeNominal(raw, 'Noun');
    if (first === 'a' || first === 'adj') return decodeNominal(raw, 'Adjective');
    if (first === 't') return decodeNominal(raw, 'Article');
    if (first === 'p' || first === 'pron') return decodeNominal(raw, 'Pronoun');
    if (first === 'v') return language === 'hebrew' ? decodeHebrewVerb(raw) : decodeGreekVerb(raw);
    const labels = {
      conj: 'Conjunction',
      prep: 'Preposition',
      adv: 'Adverb',
      particle: 'Particle',
      rel: 'Relative marker'
    };
    const label = labels[first] || first.toUpperCase();
    return { raw, family: 'indeclinable', label, details: [], summary: label };
  }

  function grammarCategories(items, lang) {
    const counts = new Map();
    items.forEach(item => {
      const dec = decodeParse(item.parse, lang || item.lang);
      const tokens = tokenList(item.parse);
      const add = (id, label) => counts.set(id, { id, label, count: (counts.get(id)?.count || 0) + 1 });
      if (dec.family === 'nominal') {
        add('nominals', 'All nominals');
        dec.details.forEach(detail => add(`detail:${detail}`, detail));
      } else if (dec.family === 'verb') {
        add('verbs', 'All verbs');
        dec.details.forEach(detail => add(`detail:${detail}`, detail));
      } else if (item.pos) {
        add(`pos:${String(item.pos).toLowerCase()}`, item.pos);
      }
      tokens.forEach(token => add(`token:${token}`, token.toUpperCase()));
    });
    return Array.from(counts.values()).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }

  function matchesGrammarCategory(item, categoryId, lang) {
    if (!categoryId || categoryId === 'all') return true;
    const dec = decodeParse(item.parse, lang || item.lang);
    if (categoryId === 'nominals') return dec.family === 'nominal';
    if (categoryId === 'verbs') return dec.family === 'verb';
    if (categoryId.startsWith('detail:')) return dec.details.includes(categoryId.slice(7));
    if (categoryId.startsWith('token:')) return tokenList(item.parse).includes(categoryId.slice(6));
    if (categoryId.startsWith('pos:')) return String(item.pos || '').toLowerCase() === categoryId.slice(4);
    return true;
  }

  function isWeakCard(item) {
    const history = Array.isArray(item.history) ? item.history : [];
    const recent = history.slice(-5);
    const recentMiss = recent.some(h => Number(h.q) < 3);
    return recentMiss || Number(item.ease || 2.5) < 2.1 || Number(item.repetitions || 0) < 2;
  }

  function normalizeImportedPayload(payload) {
    if (Array.isArray(payload)) return payload;
    if (payload && typeof payload === 'object') {
      if (Array.isArray(payload.items)) return payload.items;
      return ['greek', 'hebrew'].flatMap(lang => Array.isArray(payload[lang]) ? payload[lang].map(item => Object.assign({ lang }, item)) : []);
    }
    return [];
  }

  function validateVocabItem(item, index) {
    const errors = [];
    if (!item || typeof item !== 'object') errors.push('must be an object');
    if (!norm(item?.word)) errors.push('word is required');
    if (!norm(item?.gloss)) errors.push('gloss is required');
    if (!['greek', 'hebrew'].includes(norm(item?.lang).toLowerCase())) errors.push('lang must be greek or hebrew');
    return { index, errors };
  }

  return {
    decodeParse,
    grammarCategories,
    matchesGrammarCategory,
    isWeakCard,
    normalizeImportedPayload,
    validateVocabItem
  };
}));
