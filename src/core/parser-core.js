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
    nifal: 'Niphal',
    niphal: 'Niphal',
    piel: 'Piel',
    pual: 'Pual',
    hifil: 'Hiphil',
    hiphil: 'Hiphil',
    hofal: 'Hophal',
    hophal: 'Hophal',
    hitpael: 'Hithpael',
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

  function decodeOshbHebrewNominal(parse, label) {
    const raw = norm(parse);
    const form = raw.match(/^H[NA]([a-z]+)/i)?.[1] || '';
    const gender = { m: 'masculine', f: 'feminine', c: 'common' }[form[1]?.toLowerCase() || form[0]?.toLowerCase()];
    const number = { s: 'singular', p: 'plural', d: 'dual' }[form[2]?.toLowerCase() || form[1]?.toLowerCase()];
    const state = { a: 'absolute', c: 'construct', d: 'determined' }[form[3]?.toLowerCase() || form[2]?.toLowerCase()];
    const details = [gender, number, state].filter(Boolean);
    return {
      family: 'nominal',
      label,
      details,
      summary: [label].concat(details).join(', ')
    };
  }

  function decodeOshbHebrewVerb(parse) {
    const code = norm(parse).match(/(?:^|\/)V([a-z0-9]+)/i)?.[1] || norm(parse).replace(/^HV/i, '');
    const stemCodes = {
      q: 'Qal',
      n: 'Niphal',
      p: 'Piel',
      P: 'Pual',
      h: 'Hiphil',
      H: 'Hophal',
      t: 'Hithpael'
    };
    const formCodes = {
      p: 'perfect',
      q: 'wayyiqtol',
      w: 'wayyiqtol',
      i: 'imperfect',
      v: 'imperative',
      r: 'participle',
      s: 'participle',
      a: 'infinitive absolute',
      c: 'infinitive construct'
    };
    const stem = stemCodes[code[0]] || stemCodes[code[0]?.toLowerCase()] || code[0];
    const form = formCodes[code[1]] || code[1];
    const png = expandPersonNumberGender(code.slice(2)) || code.slice(2);
    const details = [stem, form, png].filter(Boolean);
    return {
      family: 'verb',
      label: 'Verb',
      details,
      summary: ['Verb'].concat(details).join(', ')
    };
  }

  function decodeHebrewNominal(parse, label) {
    const raw = norm(parse);
    if (/^H[NA]/i.test(raw)) return decodeOshbHebrewNominal(raw, label);
    const form = raw.split('-')[1] || '';
    const gender = { m: 'masculine', f: 'feminine', c: 'common' }[form[0]?.toLowerCase()];
    const number = { s: 'singular', p: 'plural', d: 'dual' }[form[1]?.toLowerCase()];
    const state = { a: 'absolute', c: 'construct', d: 'determined' }[form[2]?.toLowerCase()];
    const details = [gender, number, state].filter(Boolean);
    return {
      family: 'nominal',
      label,
      details,
      summary: [label].concat(details).join(', ')
    };
  }

  function decodeNominal(parse, label, lang) {
    if (norm(lang).toLowerCase() === 'hebrew') return decodeHebrewNominal(parse, label);
    const raw = norm(parse);
    const bits = raw.split('-');
    const compactMorphGnt = raw.replace(/^[A-Z]+-?\s*/i, '').replace(/[-\s]/g, '');
    const form = bits[1]?.trim() || (compactMorphGnt.length >= 3 ? compactMorphGnt.slice(-3) : '');
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
    const raw = norm(parse);
    const paddedMorphGnt = raw.match(/^V-\s*([123-])([A-Z-])([A-Z-])([A-Z-])-?([SPD-])?/i);
    if (paddedMorphGnt) {
      const tense = GREEK_COMPACT_TENSES[paddedMorphGnt[2].toLowerCase()];
      const voice = GREEK_COMPACT_VOICES[paddedMorphGnt[3].toLowerCase()];
      const mood = GREEK_COMPACT_MOODS[paddedMorphGnt[4].toLowerCase()] || (paddedMorphGnt[4].toLowerCase() === 'd' ? 'imperative' : undefined);
      const png = paddedMorphGnt[1] && paddedMorphGnt[1] !== '-' && paddedMorphGnt[5] && paddedMorphGnt[5] !== '-' ? expandPersonNumberGender(`${paddedMorphGnt[1]}${paddedMorphGnt[5].toLowerCase()}`) : null;
      const participleCode = mood === 'participle'
        ? raw.replace(/^V-\s*[123-][A-Z-]{3}-?/i, '').replace(/-/g, '').slice(0, 3)
        : '';
      const participleForm = participleCode ? decodeNominal(`N-${participleCode}`, 'participle').details.join(', ') : null;
      const details = [tense, voice, mood, png || participleForm].filter(Boolean);
      return { family: 'verb', label: 'Verb', details, summary: ['Verb'].concat(details).join(', ') };
    }
    const bits = raw.toLowerCase().split('-').filter(Boolean);
    const compact = bits[1]?.match(/^[a-z]{3}$/);
    const morphGnt = bits[1]?.match(/^[123-][a-z-]{3}$/);
    if (morphGnt) {
      const code = bits[1];
      const tense = GREEK_COMPACT_TENSES[code[1]];
      const voice = GREEK_COMPACT_VOICES[code[2]];
      const mood = GREEK_COMPACT_MOODS[code[3]] || (code[3] === 'd' ? 'imperative' : undefined);
      const png = code[0] && code[0] !== '-' && bits[2] ? expandPersonNumberGender(`${code[0]}${bits[2][0]}`) : null;
      const participleForm = mood === 'participle' && bits[2] ? decodeNominal(`N-${bits[2]}`, 'participle').details.join(', ') : null;
      const details = [tense, voice, mood, png || participleForm].filter(Boolean);
      return { family: 'verb', label: 'Verb', details, summary: ['Verb'].concat(details).join(', ') };
    }
    const tense = compact ? GREEK_COMPACT_TENSES[bits[1][0]] : (GREEK_TENSES[bits[1]] || bits[1]);
    const voice = compact ? GREEK_COMPACT_VOICES[bits[1][1]] : (GREEK_VOICES[bits[2]] || bits[2]);
    const mood = compact ? GREEK_COMPACT_MOODS[bits[1][2]] : (GREEK_MOODS[bits[3]] || bits[3]);
    const compactMood = compact ? GREEK_COMPACT_MOODS[bits[1][2]] : null;
    const compactParticiple = compactMood === 'participle' && bits[2] ? decodeNominal(`N-${bits[2]}`, 'participle').details.join(', ') : null;
    const png = compact ? (compactParticiple || expandPersonNumberGender(bits[2]) || bits[2]) : (expandPersonNumberGender(bits[4]) || bits[4]);
    const details = [tense, voice, mood, png].filter(Boolean);
    return {
      family: 'verb',
      label: 'Verb',
      details,
      summary: ['Verb'].concat(details).join(', ')
    };
  }

  function decodeHebrewVerb(parse) {
    if (/^(H[VCA]|.*\/V)/i.test(norm(parse))) return decodeOshbHebrewVerb(parse);
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
    const first = raw.split('-')[0].trim().toLowerCase();
    const language = norm(lang).toLowerCase();
    if (language === 'hebrew' && /^H[NA]/i.test(raw)) return decodeHebrewNominal(raw, raw.startsWith('HA') ? 'Adjective' : 'Noun');
    if (language === 'hebrew' && /^(H[VCA]|.*\/V)/i.test(raw)) return decodeHebrewVerb(raw);
    if (language === 'hebrew' && /^HR/i.test(raw)) return { raw, family: 'indeclinable', label: 'Preposition', details: [], summary: 'Preposition' };
    if (language === 'hebrew' && /^HC/i.test(raw)) return { raw, family: 'indeclinable', label: 'Conjunction', details: [], summary: 'Conjunction' };
    if (first === 'n') return decodeNominal(raw, 'Noun', language);
    if (first === 'a' || first === 'adj') return decodeNominal(raw, 'Adjective', language);
    if (first === 't' || first === 'ra') return decodeNominal(raw, 'Article', language);
    if (first === 'p' || first === 'pron' || first.startsWith('r')) return decodeNominal(raw, 'Pronoun', language);
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

  const GRAMMAR_DETAIL_GROUPS = [
    { group: 'Case', prefix: 'Case', values: new Set(Object.values(CASES)) },
    { group: 'Number', prefix: 'Number', values: new Set(Object.values(NUMBERS)) },
    { group: 'Gender', prefix: 'Gender', values: new Set(Object.values(GENDERS)) },
    { group: 'State', prefix: 'State', values: new Set(['absolute', 'construct', 'determined']) },
    { group: 'Tense', prefix: 'Tense', values: new Set(Object.values(GREEK_TENSES).concat(Object.values(GREEK_COMPACT_TENSES))) },
    { group: 'Voice', prefix: 'Voice', values: new Set(Object.values(GREEK_VOICES).concat(Object.values(GREEK_COMPACT_VOICES))) },
    { group: 'Mood', prefix: 'Mood', values: new Set(Object.values(GREEK_MOODS).concat(Object.values(GREEK_COMPACT_MOODS))) },
    { group: 'Hebrew stem', prefix: 'Stem', values: new Set(Object.values(HEBREW_STEMS)) },
    { group: 'Hebrew form', prefix: 'Form', values: new Set(Object.values(HEBREW_FORMS)) }
  ];

  const GRAMMAR_GROUP_ORDER = {
    'Major categories': 0,
    'Case': 1,
    'Number': 2,
    'Gender': 3,
    'Tense': 4,
    'Voice': 5,
    'Mood': 6,
    'State': 7,
    'Hebrew stem': 8,
    'Hebrew form': 9,
    'Part of speech': 10,
    'Other': 11
  };

  function grammarDetailMeta(detail, lang) {
    const language = norm(lang).toLowerCase();
    const groups = language === 'hebrew'
      ? GRAMMAR_DETAIL_GROUPS.filter(group => ['Hebrew stem', 'Hebrew form', 'Gender', 'Number', 'State'].includes(group.group))
      : GRAMMAR_DETAIL_GROUPS.filter(group => !group.group.startsWith('Hebrew'));
    const match = groups.find(group => group.values.has(detail));
    if (!match) return { group: 'Other', label: detail };
    return { group: match.group, label: `${match.prefix}: ${detail}` };
  }

  function grammarCategories(items, lang) {
    const counts = new Map();
    const add = (id, label, group = 'Other') => {
      const prev = counts.get(id);
      counts.set(id, { id, label, group, count: (prev?.count || 0) + 1 });
    };
    items.forEach(item => {
      const dec = decodeParse(item.parse, lang || item.lang);
      if (item.pos) add(`pos:${String(item.pos).toLowerCase()}`, `Part of speech: ${item.pos}`, 'Part of speech');
      if (dec.family === 'nominal') {
        add('nominals', 'All nominals', 'Major categories');
        dec.details.forEach(detail => {
          const meta = grammarDetailMeta(detail, lang || item.lang);
          add(`detail:${detail}`, meta.label, meta.group);
        });
      } else if (dec.family === 'verb') {
        add('verbs', 'All verbs', 'Major categories');
        dec.details.forEach(detail => {
          const meta = grammarDetailMeta(detail, lang || item.lang);
          add(`detail:${detail}`, meta.label, meta.group);
        });
      }
    });
    return Array.from(counts.values()).sort((a, b) => {
      const groupDiff = (GRAMMAR_GROUP_ORDER[a.group] ?? 99) - (GRAMMAR_GROUP_ORDER[b.group] ?? 99);
      return groupDiff || b.count - a.count || a.label.localeCompare(b.label);
    });
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
    if (!norm(item?.gloss) && !norm(item?.primaryGloss)) errors.push('gloss is required');
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
