const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DIR = path.join(ROOT, 'data', 'source');
const GREEK_DIR = path.join(SOURCE_DIR, 'morphgnt-sblgnt');
const HEBREW_DIR = path.join(SOURCE_DIR, 'morphhb-wlc');
const VOCAB_PATH = path.join(ROOT, 'vocab_all.json');
const GLOSS_DIR = path.join(ROOT, 'data', 'glosses');
const GLOSS_SOURCE_PATHS = {
  greek: path.join(GLOSS_DIR, 'greek-glosses.json'),
  hebrew: path.join(GLOSS_DIR, 'hebrew-glosses.json')
};
const HEBREW_GLOSS_PATH = GLOSS_SOURCE_PATHS.hebrew;

const GREEK_POS = {
  'A-': 'adj',
  'C-': 'conj',
  'D-': 'adv',
  'I-': 'interj',
  'N-': 'noun',
  'P-': 'prep',
  RA: 'article',
  RD: 'pron',
  RI: 'pron',
  RP: 'pron',
  RR: 'pron',
  'V-': 'verb',
  'X-': 'particle'
};

const HEBREW_STEMS = {
  q: 'QAL',
  N: 'NIFAL',
  n: 'NIFAL',
  p: 'PIEL',
  P: 'PUAL',
  h: 'HIFIL',
  H: 'HOFAL',
  t: 'HITPAEL',
  o: 'POEL',
  O: 'POLAL'
};

const HEBREW_FORMS = {
  p: 'PERF',
  q: 'PERF',
  i: 'IMPF',
  w: 'WAYYIQTOL',
  j: 'IMPF',
  v: 'IMP',
  r: 'PTC',
  s: 'PTC',
  a: 'INFABS',
  c: 'INF'
};

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function nonEmpty(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function normalizeAlternateGlosses(value) {
  if (Array.isArray(value)) return value.map(nonEmpty).filter(Boolean);
  const text = nonEmpty(value);
  return text ? text.split(/[,;|]/).map(nonEmpty).filter(Boolean) : [];
}

function createGlossFields(item = {}) {
  const legacyParts = normalizeAlternateGlosses(item.gloss);
  const primaryGloss = nonEmpty(item.primaryGloss) || legacyParts[0] || nonEmpty(item.gloss);
  const alternateGlosses = normalizeAlternateGlosses(item.alternateGlosses).length
    ? normalizeAlternateGlosses(item.alternateGlosses)
    : legacyParts.slice(1);
  return {
    gloss: nonEmpty(item.gloss) || [primaryGloss, ...alternateGlosses].filter(Boolean).join(', '),
    primaryGloss,
    alternateGlosses,
    glossSource: nonEmpty(item.glossSource),
    glossSourceUrl: nonEmpty(item.glossSourceUrl),
    glossLicense: nonEmpty(item.glossLicense),
    glossAttribution: nonEmpty(item.glossAttribution)
  };
}

function loadGlossSource(lang, file = GLOSS_SOURCE_PATHS[lang]) {
  if (!file || !fs.existsSync(file)) return new Map();
  const source = readJson(file);
  return new Map(Object.entries(source).map(([lemma, fields]) => [
    `${lang}\u0001${lemma}`,
    createGlossFields(fields)
  ]).filter(([, fields]) => fields.primaryGloss || fields.gloss));
}

function loadGlossSources(sources = GLOSS_SOURCE_PATHS) {
  const merged = new Map();
  for (const [lang, file] of Object.entries(sources)) {
    for (const [key, fields] of loadGlossSource(lang, file)) merged.set(key, fields);
  }
  return merged;
}

function loadHebrewGlossSource(file = HEBREW_GLOSS_PATH) {
  return loadGlossSource('hebrew', file);
}

function cleanGreekText(value) {
  return String(value || '').replace(/[.,;··⸂⸃⸀]/g, '').trim();
}

function stripHebrewMarks(value) {
  return String(value || '')
    .replace(/[\u0591-\u05AF\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7]/g, '')
    .replace(/[\/־׃]/g, '')
    .trim();
}

function normalizeLemma(raw) {
  return String(raw || '').split('/').pop().replace(/\s+[a-z]$/i, '').trim();
}

function toGreekParse(pos, morph) {
  const p = String(pos || '').trim();
  const m = String(morph || '').trim();
  if (p === 'N-') return `N-${m[4] || ''}${m[5] || ''}${m[6] || ''}`.replace(/-+$/, '');
  if (p === 'A-') return `A-${m[4] || ''}${m[5] || ''}${m[6] || ''}`.replace(/-+$/, '');
  if (p === 'RA') return `T-${m[4] || ''}${m[5] || ''}${m[6] || ''}`.replace(/-+$/, '');
  if (p === 'RD' || p === 'RI' || p === 'RP' || p === 'RR') return `P-${m[4] || ''}${m[5] || ''}${m[6] || ''}`.replace(/-+$/, '');
  if (p === 'V-') {
    const tvm = `${m[1] || '-'}${m[2] || '-'}${m[3] || '-'}`.replace(/-/g, '');
    const person = m[0] && m[0] !== '-' ? m[0] : '';
    const number = m[5] && m[5] !== '-' ? m[5] : '';
    const nominal = `${m[4] || ''}${m[5] || ''}${m[6] || ''}`.replace(/-/g, '');
    const suffix = person ? `${person}${number}` : nominal;
    return `V-${tvm}${suffix ? `-${suffix}` : ''}`;
  }
  const simple = { 'C-': 'CONJ', 'D-': 'ADV', 'I-': 'INTERJ', 'P-': 'PREP', 'X-': 'PARTICLE' }[p];
  return simple || p.replace(/-$/, '');
}

function parseGreekFiles() {
  if (!fs.existsSync(GREEK_DIR)) return [];
  const counts = new Map();
  for (const file of fs.readdirSync(GREEK_DIR).filter(name => name.endsWith('.txt'))) {
    const text = fs.readFileSync(path.join(GREEK_DIR, file), 'utf8');
    const re = /(\d{6})\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)/g;
    for (const match of text.matchAll(re)) {
      const [, , pos, morph, textForm, word, normalized, lemma] = match;
      const cleanWord = cleanGreekText(normalized || word || textForm);
      const cleanLemma = cleanGreekText(lemma);
      if (!cleanWord || !cleanLemma) continue;
      const parse = toGreekParse(pos, morph);
      const key = ['greek', cleanWord, cleanLemma, parse].join('\u0001');
      const current = counts.get(key) || {
        word: cleanWord,
        lemma: cleanLemma,
        gloss: '',
        pos: GREEK_POS[pos] || 'other',
        freq: 0,
        lang: 'greek',
        parse,
        source: 'MorphGNT SBLGNT'
      };
      current.freq++;
      counts.set(key, current);
    }
  }
  return Array.from(counts.values());
}

function mainHebrewPart(morph) {
  const pieces = String(morph || '').replace(/^H/, '').split('/');
  return pieces.find(piece => piece && !['C', 'R', 'Rd', 'Td'].includes(piece)) || pieces[pieces.length - 1] || '';
}

function hebrewPos(part) {
  const first = part[0];
  return { N: 'noun', V: 'verb', A: 'adj', R: 'prep', C: 'conj', P: 'pron', T: 'particle', D: 'adv' }[first] || 'other';
}

function toHebrewParse(morph) {
  const part = mainHebrewPart(morph);
  if (!part) return '';
  if (part[0] === 'N' || part[0] === 'A') {
    const gender = part.includes('f') ? 'F' : part.includes('m') ? 'M' : 'C';
    const number = part.includes('d') ? 'D' : part.includes('p') ? 'P' : part.includes('s') ? 'S' : '';
    const state = part.includes('c') ? 'C' : part.includes('a') ? 'A' : '';
    return `${part[0]}-${gender}${number}${state}`;
  }
  if (part[0] === 'V') {
    const stem = HEBREW_STEMS[part[1]] || part[1]?.toUpperCase() || '';
    const form = HEBREW_FORMS[part[2]] || part[2]?.toUpperCase() || '';
    const png = (part.match(/[123][mfc]?[spd]/i) || [''])[0].toUpperCase();
    return `V-${stem}${form ? `-${form}` : ''}${png ? `-${png}` : ''}`;
  }
  const simple = { R: 'PREP', C: 'CONJ', P: 'PRON', T: 'PARTICLE', D: 'ADV' }[part[0]];
  return simple || part;
}

function parseHebrewFiles() {
  if (!fs.existsSync(HEBREW_DIR)) return [];
  const counts = new Map();
  const re = /<w\b([^>]*)>([\s\S]*?)<\/w>/g;
  for (const file of fs.readdirSync(HEBREW_DIR).filter(name => name.endsWith('.xml'))) {
    const xml = fs.readFileSync(path.join(HEBREW_DIR, file), 'utf8');
    for (const match of xml.matchAll(re)) {
      const attrs = match[1];
      const text = match[2].replace(/<[^>]+>/g, '');
      const lemma = normalizeLemma((attrs.match(/\blemma="([^"]+)"/) || [])[1]);
      const morph = (attrs.match(/\bmorph="([^"]+)"/) || [])[1] || '';
      const word = stripHebrewMarks(text);
      if (!word || !lemma || !morph) continue;
      const parse = toHebrewParse(morph);
      if (!parse) continue;
      const key = ['hebrew', word, lemma, parse].join('\u0001');
      const current = counts.get(key) || {
        word,
        lemma,
        gloss: '',
        pos: hebrewPos(mainHebrewPart(morph)),
        freq: 0,
        lang: 'hebrew',
        parse,
        source: 'Open Scriptures Hebrew Bible'
      };
      current.freq++;
      counts.set(key, current);
    }
  }
  return Array.from(counts.values());
}

function mergeWithExisting(expanded, existing, lemmaGlosses = loadGlossSources()) {
  const glossByLangLemma = new Map();
  const exact = new Map();
  for (const item of existing) {
    const fields = createGlossFields(item);
    if (!fields.primaryGloss && !fields.gloss) continue;
    glossByLangLemma.set(`${item.lang}\u0001${item.lemma}`, fields);
    exact.set(`${item.lang}\u0001${item.word}\u0001${item.lemma}\u0001${item.parse}`, fields);
  }

  const byKey = new Map();
  for (const item of expanded) {
    const key = `${item.lang}\u0001${item.word}\u0001${item.lemma}\u0001${item.parse}`;
    const langLemmaKey = `${item.lang}\u0001${item.lemma}`;
    const fields = lemmaGlosses.has(langLemmaKey)
      ? lemmaGlosses.get(langLemmaKey)
      : exact.get(key) || glossByLangLemma.get(langLemmaKey) || createGlossFields(item);
    Object.assign(item, fields);
    byKey.set(key, item);
  }
  for (const item of existing) {
    const key = `${item.lang}\u0001${item.word}\u0001${item.lemma}\u0001${item.parse}`;
    if (!byKey.has(key)) byKey.set(key, Object.assign({ source: 'Seed vocabulary' }, item, createGlossFields(item)));
  }

  const rows = Array.from(byKey.values()).sort((a, b) =>
    a.lang.localeCompare(b.lang) || (b.freq || 0) - (a.freq || 0) || a.word.localeCompare(b.word)
  );
  const counters = { greek: 1, hebrew: 1 };
  for (const row of rows) {
    row.id = `${row.lang === 'greek' ? 'gk' : 'hb'}-${String(counters[row.lang]++).padStart(5, '0')}`;
  }
  return rows;
}

function main() {
  const existing = readJson(VOCAB_PATH);
  const expanded = parseGreekFiles().concat(parseHebrewFiles());
  if (!expanded.length) {
    throw new Error('No source rows found. Run npm run data:download first.');
  }
  const merged = mergeWithExisting(expanded, existing);
  fs.writeFileSync(VOCAB_PATH, JSON.stringify(merged, null, 2) + '\n');
  const byLang = merged.reduce((acc, row) => {
    acc[row.lang] = (acc[row.lang] || 0) + 1;
    return acc;
  }, {});
  console.log(`Wrote ${merged.length} entries to vocab_all.json`, byLang);
}

if (require.main === module) {
  main();
}

module.exports = {
  createGlossFields,
  loadGlossSource,
  loadGlossSources,
  loadHebrewGlossSource,
  mergeWithExisting,
  normalizeAlternateGlosses
};
