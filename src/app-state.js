/* ============================================================
   THE PURITAN PARSER v3
   ============================================================ */

const FILE_ALL = '/vocab_all.json';
const FILE_GREEK = '/greek_25plus.json';
const FILE_HEBREW = '/hebrew_60plus.json';
const LS_VOCAB_GREEK = 'pp_vocab_greek';
const LS_VOCAB_HEBREW = 'pp_vocab_hebrew';
const LS_PREFS = 'pp_prefs';
const LS_DASHBOARD = 'pp_dashboard';
const ParserCore = window.PuritanParserCore || {};
const LIST_RENDER_LIMIT = 500;
const GREEK_NUMBER_OPTIONS = ['s','p'];
const HEBREW_NUMBER_OPTIONS = ['s','p','d'];
const HEBREW_STEM_ALIASES = { nifal:'niphal', niphal:'niphal', hifil:'hiphil', hiphil:'hiphil', hofal:'hophal', hophal:'hophal', hitpael:'hithpael', hithpael:'hithpael' };

const DEFAULTS = {
  accent: '#4e8f6e',
  theme: 'light',
  initialEase: 2.5,
  minEase: 1.3,
  useSM2: true,
  dailyCap: 200,
  newPerDay: 20,
  cardFontSize: 54,
  showPosHint: false,
  autoNextCard: false,
  studyMode: 'lemma'
};

/* ---------- State ---------- */
let state = {
  lang: 'greek',
  data: { greek: [], hebrew: [] },
  dataRevision: 0,
  filtered: [],
  prefs: { ...DEFAULTS },
  filters: { query: '', minFreq: 1, maxFreq: 9999, dueOnly: false, attentionOnly: false, pos: 'all', status: 'all' },
  listRenderLimit: LIST_RENDER_LIMIT,
  parsingFilters: { family: 'all', details: {} },
  session: { queue: [], idx: 0, mode: 'due', flipped: false, reviewed: 0, forgotten: 0, total: 0, missedWords: [] },
  dashboard: { streak: 0, lastStudied: '', recent: [], heatmap: {} },
  currentView: 'list'
};

let parsingSession = { questions: [], idx: 0, correct: 0, total: 0, results: [], wordformsLemma: '' };
let selectedLemma = null;
let autoAdvanceTimer = null;
let pendingParsingResult = null;
