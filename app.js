/* ============================================================
   THE PURITAN PARSER v3
   ============================================================ */

const FILE_ALL = 'vocab_all.json';
const FILE_GREEK = 'greek_25plus.json';
const FILE_HEBREW = 'hebrew_60plus.json';
const LS_VOCAB_GREEK = 'pp_vocab_greek';
const LS_VOCAB_HEBREW = 'pp_vocab_hebrew';
const LS_PREFS = 'pp_prefs';
const LS_DASHBOARD = 'pp_dashboard';
const ParserCore = window.PuritanParserCore || {};
const LIST_RENDER_LIMIT = 500;

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
  autoNextCard: false
};

/* ---------- State ---------- */
let state = {
  lang: 'greek',
  data: { greek: [], hebrew: [] },
  filtered: [],
  prefs: { ...DEFAULTS },
  filters: { query: '', minFreq: 1, maxFreq: 9999, dueOnly: false, grammar: 'all' },
  session: { queue: [], idx: 0, mode: 'due', flipped: false, reviewed: 0, forgotten: 0, total: 0, missedWords: [] },
  dashboard: { streak: 0, lastStudied: '', recent: [], heatmap: {} },
  currentView: 'list'
};

let parsingSession = { questions: [], idx: 0, correct: 0, total: 0, results: [], wordformsLemma: '' };
let selectedLemma = null;
let autoAdvanceTimer = null;

/* ---------- Utilities ---------- */
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const escHtml = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
function todayISO(offsetDays=0){
  const d = new Date(); d.setDate(d.getDate()+offsetDays); return d.toISOString().slice(0,10);
}
function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
function uid(){ return Math.random().toString(36).slice(2,12); }
function shuffle(a){ return a.slice().sort(()=>Math.random()-0.5); }
function debounce(fn,w=200){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a),w); }; }
function toast(msg, type='', duration=3000){
  const c = $('#toastContainer');
  const el = document.createElement('div');
  el.className = `toast${type?' '+type:''}`;
  el.textContent = msg;
  c.appendChild(el);
  setTimeout(()=>{ el.remove(); }, duration);
}

/* ---------- Storage ---------- */
function loadPrefs(){
  try {
    const raw = localStorage.getItem(LS_PREFS);
    state.prefs = Object.assign({}, DEFAULTS, raw ? JSON.parse(raw) : {});
  } catch(e){ state.prefs = {...DEFAULTS}; }
}
function savePrefs(){ localStorage.setItem(LS_PREFS, JSON.stringify(state.prefs)); }
function saveVocab(lang){
  try {
    const compact = (state.data[lang]||[]).filter(it=>{
      const hasProgress = (it.repetitions||0)>0 || (it.interval||0)>0 || (it.history||[]).length || it.due!==todayISO() || Math.abs((it.ease||state.prefs.initialEase||2.5)-(state.prefs.initialEase||2.5))>0.001;
      return hasProgress || it.source==='Imported';
    }).map(it=>{
      if(it.source==='Imported') return it;
      return {
        id: it.id,
        ease: it.ease,
        interval: it.interval,
        repetitions: it.repetitions,
        due: it.due,
        history: it.history
      };
    });
    localStorage.setItem(lang==='greek'?LS_VOCAB_GREEK:LS_VOCAB_HEBREW, JSON.stringify(compact));
  }
  catch(e){ console.warn('save vocab failed', e); }
}
function applyStoredVocab(lang){
  const lsKey = lang==='greek' ? LS_VOCAB_GREEK : LS_VOCAB_HEBREW;
  try {
    const raw = localStorage.getItem(lsKey);
    if(!raw) return;
    const stored = JSON.parse(raw);
    if(!Array.isArray(stored)) return;
    const byId = new Map(state.data[lang].map(item=>[item.id,item]));
    stored.forEach(saved=>{
      if(!saved || typeof saved!=='object') return;
      const target = saved.id ? byId.get(saved.id) : null;
      if(target){
        ['ease','interval','repetitions','due','history'].forEach(key=>{
          if(saved[key] !== undefined) target[key] = saved[key];
        });
      } else if(saved.source==='Imported' && saved.word && saved.gloss){
        state.data[lang].push(ensureSRS(Object.assign({lang, source:'Imported'}, saved)));
      }
    });
  } catch(e){ console.warn('load saved progress failed', e); }
}
function loadDashboard(){
  try { const r=localStorage.getItem(LS_DASHBOARD); if(r) state.dashboard=Object.assign({streak:0,lastStudied:'',recent:[],heatmap:{}}, JSON.parse(r)); } catch(e){}
}
function saveDashboard(){ localStorage.setItem(LS_DASHBOARD, JSON.stringify(state.dashboard)); }

/* ---------- SRS ---------- */
function ensureSRS(item){
  if(typeof item.ease !== 'number') item.ease = state.prefs.initialEase || 2.5;
  if(typeof item.interval !== 'number') item.interval = 0;
  if(typeof item.repetitions !== 'number') item.repetitions = 0;
  if(!item.due) item.due = todayISO();
  if(!Array.isArray(item.history)) item.history = [];
  if(!item.id) item.id = `${item.lang||'x'}-${uid()}`;
  return item;
}
function sm2Update(item, quality){
  item.history = item.history || [];
  item.history.push({ date: todayISO(), q: quality });
  if(quality < 3){
    item.repetitions = 0; item.interval = 1;
  } else {
    item.repetitions = (item.repetitions||0)+1;
    if(item.repetitions===1) item.interval=1;
    else if(item.repetitions===2) item.interval=6;
    else item.interval = Math.round((item.interval||1)*(item.ease||2.5));
  }
  item.ease = (item.ease||2.5)+0.1-(5-quality)*(0.08+(5-quality)*0.02);
  item.ease = clamp(item.ease, state.prefs.minEase||1.3, 10);
  const next = new Date(); next.setDate(next.getDate()+(item.interval||1));
  item.due = next.toISOString().slice(0,10);
  return item;
}
function leitnerUpdate(item, quality){
  const success = quality>=3;
  item.repetitions = success ? (item.repetitions||0)+1 : 0;
  item.interval = success ? Math.min(365, Math.max(1, Math.round((item.repetitions||1)*2))) : 1;
  const next = new Date(); next.setDate(next.getDate()+(item.interval||1));
  item.due = next.toISOString().slice(0,10);
  return item;
}
function scheduleUpdate(item, quality){
  if(state.prefs.useSM2) return sm2Update(item, quality);
  return leitnerUpdate(item, quality);
}

/* ---------- Data Loading ---------- */
async function tryFetchJson(path){
  try {
    const r = await fetch(path, {cache:'no-store'});
    if(!r.ok) throw new Error('not ok');
    const j = await r.json();
    if(!Array.isArray(j)) throw new Error('not array');
    return j;
  } catch(e){ return null; }
}
async function loadData(){
  const all = await tryFetchJson(FILE_ALL);
  if(all && all.length){
    const g = all.filter(x=>(x.lang||'greek').toLowerCase()==='greek');
    const h = all.filter(x=>(x.lang||'greek').toLowerCase()==='hebrew');
    state.data.greek = g.map(it=>{ it.lang='greek'; return ensureSRS(it); });
    state.data.hebrew = h.map(it=>{ it.lang='hebrew'; return ensureSRS(it); });
    applyStoredVocab('greek'); applyStoredVocab('hebrew');
    return;
  }
  const gf = await tryFetchJson(FILE_GREEK);
  const hf = await tryFetchJson(FILE_HEBREW);
  ['greek','hebrew'].forEach(lang=>{
    const file = lang==='greek' ? gf : hf;
    const lsKey = lang==='greek' ? LS_VOCAB_GREEK : LS_VOCAB_HEBREW;
    const sample = lang==='greek' ? SAMPLE_GREEK : SAMPLE_HEBREW;
    if(file && file.length){
      state.data[lang] = file.map(it=>{ it.lang=lang; return ensureSRS(it); });
      applyStoredVocab(lang);
    } else {
      try {
        const raw = localStorage.getItem(lsKey);
        state.data[lang] = raw ? JSON.parse(raw) : sample.map(it=>ensureSRS(Object.assign({lang},it)));
      } catch(e){
        state.data[lang] = sample.map(it=>ensureSRS(Object.assign({lang},it)));
      }
    }
  });
}

/* ---------- Theme & Accent ---------- */
function setAccent(hex){
  document.documentElement.style.setProperty('--accent', hex);
  document.documentElement.style.setProperty('--accent-dark', adjustBrightness(hex, -20));
  document.documentElement.style.setProperty('--accent-glow', hexToRgba(hex, 0.15));
  state.prefs.accent = hex; savePrefs(); renderAccentButtons();
}
function hexToRgba(hex, alpha){
  const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${alpha})`;
}
function adjustBrightness(hex, amt){
  let r=parseInt(hex.slice(1,3),16)+amt, g=parseInt(hex.slice(3,5),16)+amt, b=parseInt(hex.slice(5,7),16)+amt;
  const c=v=>clamp(v,0,255).toString(16).padStart(2,'0');
  return `#${c(r)}${c(g)}${c(b)}`;
}
function applyTheme(theme){
  state.prefs.theme = theme;
  document.documentElement.classList.remove('dark','light');
  if(theme==='dark') document.documentElement.classList.add('dark');
  else if(theme==='light') document.documentElement.classList.add('light');
  else {
    if(window.matchMedia?.('(prefers-color-scheme:dark)').matches) document.documentElement.classList.add('dark');
    else document.documentElement.classList.add('light');
  }
  $$('.theme-btn').forEach(b=>b.classList.toggle('active', b.dataset.theme===theme));
  savePrefs();
}
const ACCENTS = ['#4e8f6e','#246b9c','#2a9d8f','#8a2b2b','#d97706','#475569','#6b21a8','#b91c1c','#0ea5a4','#ef4444','#f97316','#06b6d4'];
function renderAccentButtons(){
  const el = $('#accentPicker'); if(!el) return;
  el.innerHTML='';
  ACCENTS.forEach(hex=>{
    const b = document.createElement('button');
    b.className = 'color-swatch' + (state.prefs.accent===hex?' active':'');
    b.style.background = hex; b.title = hex;
    b.setAttribute('aria-label', `Set accent to ${hex}`);
    b.addEventListener('click', ()=>setAccent(hex));
    el.appendChild(b);
  });
}

/* ---------- Filter helpers ---------- */
function readFiltersFromDOM(){
  state.filters.query = ($('#searchInput')?.value||'').toLowerCase().trim();
  state.filters.minFreq = Number($('#freqMin')?.value)||1;
  state.filters.maxFreq = Number($('#freqMax')?.value)||9999;
  state.filters.dueOnly = $('#dueOnlyToggle')?.checked||false;
  state.filters.grammar = $('#grammarSelect')?.value||'all';
}
function applyFreqFilter(list){
  const { minFreq, maxFreq, dueOnly, grammar } = state.filters;
  const today = todayISO();
  return list.filter(it=>{
    if(!it) return false;
    const freq = it.freq||0;
    if(freq < minFreq) return false;
    if(freq > maxFreq) return false;
    if(dueOnly && it.due > today) return false;
    if(ParserCore.matchesGrammarCategory && !ParserCore.matchesGrammarCategory(it, grammar, state.lang)) return false;
    return true;
  });
}
function updateGrammarOptions(){
  const sel = $('#grammarSelect'); if(!sel || !ParserCore.grammarCategories) return;
  const current = sel.value || 'all';
  const cats = ParserCore.grammarCategories(getCurrentList(), state.lang)
    .filter(cat => cat.count >= 2)
    .slice(0, 40);
  sel.innerHTML = '<option value="all">All grammar</option>' +
    cats.map(cat => `<option value="${escHtml(cat.id)}">${escHtml(cat.label)} (${cat.count})</option>`).join('');
  sel.value = cats.some(cat => cat.id===current) ? current : 'all';
  state.filters.grammar = sel.value;
}
function parseSummary(item){
  if(!ParserCore.decodeParse) return item.parse || '—';
  return ParserCore.decodeParse(item.parse, item.lang||state.lang).summary || item.parse || '—';
}
function isParseDrillable(item){
  if(!item?.parse || !ParserCore.decodeParse) return !!item?.parse;
  const family = ParserCore.decodeParse(item.parse, item.lang||state.lang).family;
  return family === 'nominal' || family === 'verb';
}
function hasGloss(item){
  return !!String(item?.gloss||'').trim();
}

/* ---------- View Controller ---------- */
function showView(viewId){
  const views = ['listView','flashView','parsingView','dashboardView','settingsView'];
  views.forEach(id=>{ const el=document.getElementById(id); if(el) el.classList.toggle('hidden', id!==viewId); });
  $$('.nav-tab').forEach(t=>t.classList.toggle('active', t.dataset.view===viewId.replace('View','')));
  state.currentView = viewId;

  // Show/hide filter bar and its sub-elements
  const filterBar = $('#sharedFilterBar');
  const noFilterViews = ['dashboardView','settingsView'];
  if(filterBar) filterBar.classList.toggle('hidden', noFilterViews.includes(viewId));
  // search only on list
  const sg = $('#filterSearchGroup'); if(sg) sg.classList.toggle('hidden', viewId!=='listView');
  // sort only on list
  const ssg = $('#filterSortGroup'); if(ssg) ssg.classList.toggle('hidden', viewId!=='listView');
  // entries count only on list
  const ec = $('#filterEntriesCount'); if(ec) ec.classList.toggle('hidden', viewId!=='listView');

  if(viewId==='dashboardView') renderDashboard();
  if(viewId==='listView') renderList();

  const fl = $('#footerLang');
  if(fl) fl.textContent = `${state.lang==='greek'?'Greek (GNT)':'Hebrew'} — ${getCurrentList().length} words loaded`;
}

/* ---------- Language ---------- */
function setLang(lang){
  state.lang = lang;
  $$('[data-lang]').forEach(b=>b.classList.toggle('active', b.dataset.lang===lang));
  updateGrammarOptions();
  renderList(); updateDueBadge();
  localStorage.setItem('pp_last_lang', lang);
}
function getCurrentList(){ return state.data[state.lang]||[]; }

/* ---------- Due badge ---------- */
function updateDueBadge(){
  const today = todayISO();
  const due = getCurrentList().filter(it=>it.due<=today).length;
  const db = $('#dueBadge'); if(db){ db.textContent = `Due: ${due}`; db.style.display=due?'':'none'; }
  const sb = $('#streakBadge'); if(sb) sb.textContent = `🔥 ${state.dashboard.streak||0}`;
}

/* ---------- Mastery ---------- */
function computeMastery(item){
  const reps = item.repetitions||0;
  const ease = item.ease||2.5;
  const raw = (reps*ease)/((state.prefs.initialEase||2.5));
  return Math.round(clamp(raw/5*100, 0, 100));
}

/* ---------- LIST VIEW ---------- */
function renderList(){
  readFiltersFromDOM();
  const { query, minFreq, maxFreq, dueOnly, grammar } = state.filters;
  const sort = $('#sortSelect')?.value||'freq-desc';
  const today = todayISO();
  let list = getCurrentList().filter(it=>{
    if(!it) return false;
    const freq = it.freq||0;
    if(freq < minFreq || freq > maxFreq) return false;
    if(dueOnly && it.due > today) return false;
    if(ParserCore.matchesGrammarCategory && !ParserCore.matchesGrammarCategory(it, grammar, state.lang)) return false;
    if(!query) return true;
    return `${it.word||''} ${it.lemma||''} ${it.gloss||''} ${it.pos||''} ${it.parse||''} ${parseSummary(it)}`.toLowerCase().includes(query);
  });
  list.sort((a,b)=>{
    if(sort==='freq-desc') return (b.freq||0)-(a.freq||0);
    if(sort==='freq-asc') return (a.freq||0)-(b.freq||0);
    if(sort==='due-asc') return (a.due||'9999').localeCompare(b.due||'9999');
    if(sort==='mastery-asc') return computeMastery(a)-computeMastery(b);
    if(sort==='word-az') return (a.word||'').localeCompare(b.word||'');
    return 0;
  });
  state.filtered = list;
  const ec = $('#filterEntriesCount');
  if(ec) ec.textContent = list.length > LIST_RENDER_LIMIT ? `${LIST_RENDER_LIMIT} of ${list.length} entries` : `${list.length} entries`;
  const due = list.filter(it=>it.due<=today).length;
  const db = $('#dueBadge'); if(db){ db.textContent=`Due: ${due}`; }
  const tbody = $('#wordsTbody'); if(!tbody) return;
  if(!list.length){
    tbody.innerHTML = `<tr><td colspan="7" class="empty-state"><div class="empty-icon">🔍</div><p>No entries found. Try expanding the frequency range or clearing the search.</p></td></tr>`;
    return;
  }
  const visible = list.slice(0, LIST_RENDER_LIMIT);
  tbody.innerHTML = visible.map((it,i)=>{
    const m = computeMastery(it);
    const cls = m>60?'high':m>25?'mid':'low';
    const isDue = it.due<=today;
    const posColor = {noun:'#246b9c',verb:'#8a2b2b',adj:'#d97706',prep:'#475569',adv:'#2a9d8f'}[(it.pos||'').toLowerCase().slice(0,4)]||'#6b7280';
    return `<tr data-idx="${i}" style="cursor:pointer">
      <td class="word-cell">${escHtml(it.word||'')}${isDue?'<span style="color:var(--accent);font-size:10px;margin-left:4px">●</span>':''}</td>
      <td class="gloss-cell">${escHtml(it.gloss||'')}</td>
      <td><span class="pos-tag" style="color:${posColor}">${escHtml(it.pos||'—')}</span></td>
      <td class="muted small">${escHtml(String(it.freq||0))}</td>
      <td class="muted small">${escHtml(it.due||'—')}</td>
      <td class="muted small">${typeof it.ease==='number'?it.ease.toFixed(1):'—'}</td>
      <td><div class="mastery-wrap"><div class="mastery-bar"><div class="mastery-fill ${cls}" style="width:${m}%"></div></div><span class="mastery-pct">${m}</span></div></td>
    </tr>`;
  }).join('');

  // Wire row clicks for modal
  $$('#wordsTbody tr').forEach((tr,i)=>{
    tr.addEventListener('click', ()=>openWordModal(state.filtered[i]));
  });
}

/* ---------- WORD DETAIL MODAL ---------- */
function openWordModal(item){
  if(!item) return;
  $('#modalWord').textContent = item.word||'—';
  $('#modalGloss').textContent = item.gloss||'—';
  const decoded = parseSummary(item);
  const rows = [
    ['POS', item.pos||'—'],
    ['Parse', item.parse||'—'],
    ['Frequency', item.freq||0],
    ['Due', item.due||'—'],
    ['Ease', typeof item.ease==='number'?item.ease.toFixed(2):'—'],
    ['Interval', item.interval ? `${item.interval} day${item.interval!==1?'s':''}` : '—'],
    ['Repetitions', item.repetitions||0],
    ['Mastery', computeMastery(item)+'%'],
  ];
  $('#modalRows').innerHTML = `<div class="parse-explain">${escHtml(decoded)}</div>`+
    rows.map(([l,v])=>`<div class="modal-row"><span class="modal-row-label">${l}</span><span>${escHtml(String(v))}</span></div>`).join('');

  // History
  const hist = (item.history||[]).slice(-10);
  const histEl = $('#modalHistory');
  if(hist.length){
    const qualityColor = q => q>=4?'#15803d':q>=3?'#4e8f6e':q>=2?'#c97c06':'#b91c1c';
    histEl.innerHTML = `<div class="modal-history-title">Review History (last ${hist.length})</div>
      <div class="history-dots">${hist.map(h=>`<div class="history-dot" style="background:${qualityColor(h.q)}" title="${h.date}: quality ${h.q}">${h.q}</div>`).join('')}</div>
      <div class="small muted" style="margin-top:4px">${hist[hist.length-1]?.date||''}</div>`;
  } else {
    histEl.innerHTML = `<div class="modal-history-title">Review History</div><div class="small muted">No reviews yet</div>`;
  }

  // Reset button
  $('#modalResetBtn').onclick = ()=>{
    if(!confirm(`Reset SRS data for "${item.word}"?`)) return;
    item.ease = state.prefs.initialEase||2.5;
    item.interval = 0; item.repetitions = 0;
    item.due = todayISO(); item.history = [];
    saveVocab(item.lang||state.lang);
    closeWordModal();
    renderList();
    toast('Word reset.','success');
  };

  $('#wordModal').classList.remove('hidden');
}
function closeWordModal(){
  $('#wordModal').classList.add('hidden');
}

/* ---------- FLASHCARD SESSION ---------- */
function startFlash(){
  readFiltersFromDOM();
  const mode = $('#studyMode')?.value||'due';
  const today = todayISO();
  let pool = applyFreqFilter(getCurrentList()).filter(hasGloss);
  if(mode==='due') pool = pool.filter(it=>it.due<=today);
  else if(mode==='new') pool = pool.filter(it=>!it.repetitions||it.repetitions===0);
  else if(mode==='weak' && ParserCore.isWeakCard) pool = pool.filter(ParserCore.isWeakCard);
  if(!pool.length){
    toast('No glossed cards available. Try "All filtered" or expand the frequency range.','danger'); return;
  }
  pool = shuffle(pool);
  const cap = Number(state.prefs.dailyCap||200);
  state.session.queue = pool.slice(0,cap);
  state.session.idx = 0;
  state.session.mode = mode;
  state.session.flipped = false;
  state.session.reviewed = 0;
  state.session.forgotten = 0;
  state.session.total = state.session.queue.length;
  state.session.missedWords = [];

  $('#flashIdle').classList.add('hidden');
  $('#flashSessionArea').classList.remove('hidden');
  $('#flashComplete').classList.add('hidden');
  $('#fcCard').parentElement.classList.remove('hidden');
  $('#endFlashBtn').classList.remove('hidden');
  renderFlashCard();
}
function endFlash(){
  if(autoAdvanceTimer){ clearTimeout(autoAdvanceTimer); autoAdvanceTimer=null; }
  $('#flashSessionArea').classList.add('hidden');
  $('#flashIdle').classList.remove('hidden');
  $('#flashComplete').classList.add('hidden');
  $('#endFlashBtn').classList.add('hidden');
  renderList();
}

function renderFlashCard(){
  const q = state.session.queue;
  const total = state.session.total;
  const done = total - q.length;
  const pct = total ? Math.round(done/total*100) : 0;
  const pt = $('#flashProgressText'); if(pt) pt.textContent = `${done} / ${total}`;
  const pp = $('#flashProgressPct'); if(pp) pp.textContent = `${pct}%`;
  const pf = $('#flashProgressFill'); if(pf) pf.style.width = `${pct}%`;

  setCardFlipped(false);
  if(!q.length){ showSessionComplete(); return; }
  const cur = q[0];
  const dir = $('#cardDirection')?.value||'word2gloss';

  if(dir==='word2gloss'){
    $('#fcWord').textContent = cur.word||'—';
    $('#fcWordBack').textContent = cur.word||'—';
    $('#fcGloss').textContent = cur.gloss||'—';
  } else {
    $('#fcWord').textContent = cur.gloss||'—';
    $('#fcWordBack').textContent = cur.gloss||'—';
    $('#fcGloss').textContent = cur.word||'—';
  }

  const ph = $('#fcPosHint');
  if(ph){ ph.textContent = cur.pos||''; ph.classList.toggle('hidden', !state.prefs.showPosHint); }

  const mr = $('#fcMetaRow'); if(mr){
    mr.innerHTML='';
    if(cur.pos){ const s=document.createElement('span'); s.className='fc-parse-tag'; s.textContent=cur.pos; mr.appendChild(s); }
    if(cur.parse){ const s=document.createElement('span'); s.className='fc-parse-tag'; s.textContent=cur.parse; mr.appendChild(s); }
    if(cur.freq){ const s=document.createElement('span'); s.className='fc-parse-tag'; s.textContent=`freq ${cur.freq}`; mr.appendChild(s); }
  }
  buildRatingButtons();
}

function buildRatingButtons(){
  const rr = $('#fcRating'); if(!rr) return;
  rr.innerHTML='';
  const ratings = [
    {q:0, label:'Again', cls:'forgot-btn', title:'Blackout — show again'},
    {q:1, label:'Hard', cls:'', title:'Remembered with difficulty'},
    {q:2, label:'Hmm', cls:'', title:'Slight hesitation'},
    {q:3, label:'Good', cls:'', title:'Recalled correctly'},
    {q:4, label:'Easy', cls:'easy-btn', title:'Perfect, easy recall'},
    {q:5, label:'Perfect', cls:'easy-btn', title:'Perfect, instant recall'}
  ];
  ratings.forEach(r=>{
    const b = document.createElement('button');
    b.className = `fc-rating-btn ${r.cls}`.trim();
    b.title = r.title;
    b.innerHTML = `${r.label}<span class="small muted" style="font-size:10px;display:block">${r.q}</span>`;
    b.addEventListener('click',()=>onRate(r.q));
    rr.appendChild(b);
  });
}

function setCardFlipped(flipped){
  state.session.flipped = flipped;
  $('#fcCard')?.classList.toggle('flipped', flipped);
}

function onRate(quality){
  if(autoAdvanceTimer){ clearTimeout(autoAdvanceTimer); autoAdvanceTimer=null; }
  const q = state.session.queue;
  if(!q.length) return;
  const cur = q[0];
  scheduleUpdate(cur, quality);
  saveVocab(cur.lang||state.lang);
  if(quality<3){
    state.session.forgotten++;
    state.session.missedWords.push(cur);
    q.shift();
    const reinsert = Math.min(4, q.length);
    q.splice(reinsert, 0, cur);
  } else {
    state.session.reviewed++;
    q.shift();
  }
  recordReview(quality);
  if(!q.length){ showSessionComplete(); return; }

  if(state.prefs.autoNextCard){
    autoAdvanceTimer = setTimeout(()=>{ renderFlashCard(); }, 600);
  } else {
    renderFlashCard();
  }
}

function showSessionComplete(){
  $('#flashComplete').classList.remove('hidden');
  const cardEl = $('#fcCard');
  if(cardEl && cardEl.parentElement) cardEl.parentElement.classList.add('hidden');
  const stats = $('#flashCompleteStats');
  if(stats){
    const pct = state.session.total ? Math.round(state.session.reviewed/state.session.total*100) : 0;
    stats.textContent = `${state.session.reviewed} correct · ${state.session.forgotten} again · ${pct}% recall`;
  }
  // Missed words breakdown
  const missed = state.session.missedWords;
  const ml = $('#flashMissedList');
  if(ml){
    if(missed.length){
      const unique = [...new Map(missed.map(w=>[w.id||w.word,w])).values()];
      ml.innerHTML = `<div class="session-missed-title">Words to focus on (${unique.length})</div>`+
        unique.map(w=>`<div class="session-missed-item"><span class="session-missed-word">${escHtml(w.word||'')}</span><span class="muted small">${escHtml(w.gloss||'')}</span></div>`).join('');
      ml.classList.remove('hidden');
    } else {
      ml.classList.add('hidden');
    }
  }
}

/* ---------- Swipe support ---------- */
function wireSwipe(){
  const scene = $('#fcScene'); if(!scene) return;
  let tx=0, ty=0, startX=0, startY=0, dragging=false;
  scene.addEventListener('touchstart', e=>{
    startX=e.touches[0].clientX; startY=e.touches[0].clientY; dragging=true;
    $('#swipeHint').style.display='block';
  }, {passive:true});
  scene.addEventListener('touchend', e=>{
    if(!dragging) return; dragging=false;
    const dx=e.changedTouches[0].clientX-startX;
    const dy=e.changedTouches[0].clientY-startY;
    const adx=Math.abs(dx), ady=Math.abs(dy);
    if(adx>40&&adx>ady*1.5){
      // horizontal swipe
      if(!state.session.flipped) setCardFlipped(dx>0);
      else setCardFlipped(dx<0);
    } else if(ady>40&&ady>adx*1.5){
      // vertical swipe (only on back)
      if(state.session.flipped){
        if(dy<-40) onRate(3); // swipe up = Good
        else if(dy>40) onRate(0); // swipe down = Again
      }
    }
  }, {passive:true});
}

/* ---------- Session tracking ---------- */
function recordReview(quality){
  const today = todayISO();
  state.dashboard.recent = state.dashboard.recent || [];
  state.dashboard.recent.push({ date: today, q: Number(quality) });
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate()-90);
  state.dashboard.recent = state.dashboard.recent.filter(r=>new Date(r.date)>=cutoff);
  state.dashboard.heatmap = state.dashboard.heatmap || {};
  state.dashboard.heatmap[today] = (state.dashboard.heatmap[today]||0)+1;
  const dates = Array.from(new Set(state.dashboard.recent.map(r=>r.date))).sort();
  let streak=0; const d=new Date();
  for(let i=0;i<365;i++){
    const iso=d.toISOString().slice(0,10);
    if(dates.includes(iso)){ streak++; d.setDate(d.getDate()-1); } else break;
  }
  state.dashboard.streak = streak;
  state.dashboard.lastStudied = today;
  saveDashboard();
  const sb=$('#streakBadge'); if(sb) sb.textContent=`🔥 ${streak}`;
}

/* ---------- PARSING PRACTICE ---------- */
function updateParsingModeUI(){
  const mode = $('#parsingMode')?.value||'mixed';
  const isWordForms = mode==='wordforms';
  $('#parsingCountWrap')?.classList.toggle('hidden', isWordForms);
  $('#lemmaPicker')?.classList.toggle('hidden', !isWordForms);
  if(isWordForms) renderLemmaPicker();
}

function renderLemmaPicker(){
  readFiltersFromDOM();
  const search = ($('#lemmaSearch')?.value||'').toLowerCase();
  const pool = applyFreqFilter(getCurrentList()).filter(isParseDrillable);
  // Group by lemma
  const lemmaMap = {};
  pool.forEach(it=>{
    const l = it.lemma||it.word||'';
    if(!lemmaMap[l]) lemmaMap[l]=0;
    lemmaMap[l]++;
  });
  const lemmas = Object.entries(lemmaMap)
    .filter(([l])=>!search||l.toLowerCase().includes(search))
    .sort((a,b)=>a[0].localeCompare(b[0]));

  const ll = $('#lemmaList'); if(!ll) return;
  if(!lemmas.length){
    ll.innerHTML = `<div class="lemma-item"><span class="muted small">No parseable lemmas found</span></div>`;
    return;
  }
  ll.innerHTML = lemmas.map(([l,cnt])=>
    `<div class="lemma-item${selectedLemma===l?' selected':''}" data-lemma="${escHtml(l)}">`+
    `<span>${escHtml(l)}</span><span class="lemma-count">${cnt} form${cnt!==1?'s':''}</span></div>`
  ).join('');
  $$('#lemmaList .lemma-item').forEach(el=>{
    el.addEventListener('click',()=>{
      selectedLemma = el.dataset.lemma;
      $$('#lemmaList .lemma-item').forEach(x=>x.classList.remove('selected'));
      el.classList.add('selected');
      const sd = $('#lemmaSelected'); if(sd) sd.textContent = `Selected: ${selectedLemma}`;
    });
  });
}

function startParsing(){
  readFiltersFromDOM();
  const mode = $('#parsingMode')?.value||'mixed';

  if(mode==='wordforms'){
    if(!selectedLemma){ toast('Please select a lemma first.','danger'); return; }
    const pool = applyFreqFilter(getCurrentList()).filter(it=>isParseDrillable(it) && (it.lemma||it.word||'')=== selectedLemma);
    if(!pool.length){
      toast(`No parseable forms found for "${selectedLemma}".`,'danger'); return;
    }
    parsingSession = { questions: shuffle(pool), idx:0, correct:0, total:pool.length, results:[], wordformsLemma: selectedLemma };
    if(pool.length===1) toast(`Only 1 form found for "${selectedLemma}".`);
    $('#parsingIdle').classList.add('hidden');
    $('#parsingSession').classList.remove('hidden');
    $('#endParsing').classList.remove('hidden');
    renderParsingQuestion();
    return;
  }

  const count = Number($('#parsingCount')?.value)||10;
  let pool = applyFreqFilter(getCurrentList()).filter(isParseDrillable);
  if(mode==='nouns') pool=pool.filter(it=>(it.pos||'').toLowerCase().includes('n'));
  else if(mode==='verbs') pool=pool.filter(it=>(it.pos||'').toLowerCase().includes('v'));
  if(!pool.length){
    toast('No parseable words found. Words need a "parse" field in your vocab JSON (e.g. "parse":"N-NSM").','danger'); return;
  }
  pool = shuffle(pool).slice(0, Math.min(count, pool.length));
  parsingSession = { questions: pool, idx:0, correct:0, total:pool.length, results:[], wordformsLemma: '' };
  $('#parsingIdle').classList.add('hidden');
  $('#parsingSession').classList.remove('hidden');
  $('#endParsing').classList.remove('hidden');
  renderParsingQuestion();
}

function endParsing(){
  $('#parsingSession').classList.add('hidden');
  $('#parsingIdle').classList.remove('hidden');
  $('#endParsing').classList.add('hidden');
}

function renderParsingQuestion(){
  const { idx, questions, total, results, wordformsLemma } = parsingSession;
  const dots = $('#parsingDots');
  if(dots){
    dots.innerHTML = questions.slice(0,total).map((_,i)=>{
      const r = results[i];
      return `<div class="ps-dot ${r===true?'correct-dot':r===false?'wrong-dot':''}"></div>`;
    }).join('');
  }

  const isLast = idx === total-1;
  const isDone = idx >= total;

  if(isDone){
    // Summary
    const pct = total?Math.round(parsingSession.correct/total*100):0;
    const summaryText = wordformsLemma
      ? `You identified ${parsingSession.correct}/${total} forms of ${wordformsLemma} correctly.`
      : `${parsingSession.correct}/${total} correct`;
    $('#parsingWord').innerHTML = `<span style="font-size:40px">${pct>=70?'🎉':'📖'}</span>`;
    $('#parsingForm').innerHTML='';
    $('#parsingMeta').innerHTML='';
    $('#parsingResult').classList.add('hidden');
    $('#parsingProgress').textContent = `Complete: ${parsingSession.correct}/${total} (${pct}%)`;
    $('#parsingSubmit').classList.add('hidden');
    $('#nextParsing').classList.add('hidden');
    $('#finishParsing').classList.add('hidden');
    $('#parsingReveal').classList.add('hidden');
    toast(summaryText, pct>=70?'success':'');
    return;
  }

  const qn = questions[idx];
  $('#parsingWord').textContent = qn.word||'—';
  if(wordformsLemma){
    $('#parsingProgress').textContent = `Training: ${wordformsLemma} — ${idx+1}/${total} forms`;
  } else {
    $('#parsingProgress').textContent = `${idx+1} / ${total}`;
  }
  const pm = $('#parsingMeta');
  if(pm){ pm.innerHTML=''; if(qn.freq){ const s=document.createElement('span'); s.className='fc-parse-tag'; s.textContent=`freq ${qn.freq}`; pm.appendChild(s); } }

  const res = $('#parsingResult'); if(res){ res.classList.add('hidden'); res.innerHTML=''; }
  $('#parsingSubmit').classList.remove('hidden');
  $('#nextParsing').classList.add('hidden');
  $('#finishParsing').classList.add('hidden');
  $('#parsingReveal').classList.remove('hidden');

  const form = $('#parsingForm'); if(!form) return;
  form.innerHTML='';
  const fields = getParsingFields(qn);
  fields.forEach(f=>{
    const div = document.createElement('div'); div.className='parsing-field';
    div.innerHTML = `<label>${escHtml(f.label)}</label>`;
    if(f.type==='select'){
      const s = document.createElement('select'); s.className='input'; s.id='par_'+f.id;
      f.opts.forEach(o=>{
        const opt = typeof o==='string' ? {value:o, label:o} : o;
        const op=document.createElement('option'); op.value=opt.value; op.textContent=opt.label; s.appendChild(op);
      });
      div.appendChild(s);
    } else {
      const inp = document.createElement('input'); inp.type='text'; inp.className='input'; inp.id='par_'+f.id;
      inp.placeholder='type lemma...'; inp.autocomplete='off'; div.appendChild(inp);
    }
    form.appendChild(div);
  });
}

function getParsingFields(qn){
  const p = (qn.parse||'').toLowerCase();
  const lang = (qn.lang||state.lang||'greek').toLowerCase();
  const bits = p.split('-').filter(Boolean);
  const compactGreekVerb = lang==='greek' && bits[0]==='v' && /^[a-z]{3}$/.test(bits[1]||'');
  const compactMoodCode = compactGreekVerb ? bits[1][2] : '';
  const isNoun = p.startsWith('n-') || (qn.pos||'').toLowerCase().startsWith('n');
  if(isNoun){
    const fields = [];
    if(lang==='greek'){
      fields.push({id:'case', label:'Case', type:'select', opts:[
        {value:'n', label:'nom'}, {value:'a', label:'acc'}, {value:'g', label:'gen'}, {value:'d', label:'dat'}, {value:'v', label:'voc'}
      ]});
      fields.push({id:'number', label:'Number', type:'select', opts:[{value:'s', label:'sg'}, {value:'p', label:'pl'}]});
      fields.push({id:'gender', label:'Gender', type:'select', opts:[{value:'m', label:'m'}, {value:'f', label:'f'}, {value:'n', label:'n'}]});
    } else {
      fields.push({id:'gender', label:'Gender', type:'select', opts:[{value:'m', label:'m'}, {value:'f', label:'f'}, {value:'c', label:'common'}]});
      fields.push({id:'number', label:'Number', type:'select', opts:[{value:'s', label:'sg'}, {value:'p', label:'pl'}, {value:'d', label:'dual'}]});
    }
    fields.push({id:'lemma', label:'Lemma', type:'text'});
    return fields;
  } else {
    if(lang==='hebrew'){
      return [
        {id:'stem', label:'Stem', type:'select', opts:['qal','nifal','piel','pual','hifil','hofal','hitpael']},
        {id:'form', label:'Form', type:'select', opts:['perf','impf','wayyiqtol','imp','inf','ptc']},
        {id:'person', label:'Person/Gender/Num', type:'select', opts:['1cs','2ms','2fs','3ms','3fs','1cp','2mp','2fp','3mp','3fp']},
        {id:'lemma', label:'Lemma', type:'text'}
      ];
    }
    const fields = [
      {id:'tense', label:'Tense', type:'select', opts:['pres','impf','fut','aor','perf','plup']},
      {id:'voice', label:'Voice', type:'select', opts:['act','mid','pas']}
    ];
    const hasMood = compactGreekVerb || bits.some(x=>['ind','subj','opt','imp','inf','ptc'].includes(x));
    if(hasMood) fields.push({id:'mood', label:'Mood', type:'select', opts:['ind','subj','opt','imp','inf','ptc']});
    if(compactMoodCode==='p'){
      fields.push({id:'case', label:'Case', type:'select', opts:[
        {value:'n', label:'nom'}, {value:'a', label:'acc'}, {value:'g', label:'gen'}, {value:'d', label:'dat'}, {value:'v', label:'voc'}
      ]});
      fields.push({id:'number', label:'Number', type:'select', opts:[{value:'s', label:'sg'}, {value:'p', label:'pl'}]});
      fields.push({id:'gender', label:'Gender', type:'select', opts:[{value:'m', label:'m'}, {value:'f', label:'f'}, {value:'n', label:'n'}]});
    } else if(compactMoodCode!=='n'){
      fields.push({id:'person', label:'Person/Num', type:'select', opts:['1s','2s','3s','1p','2p','3p']});
    }
    fields.push({id:'lemma', label:'Lemma', type:'text'});
    return fields;
  }
}

function parseHasSelection(qn, fieldId, val){
  const bits = (qn.parse||'').toLowerCase().split('-').filter(Boolean);
  const lang = (qn.lang||state.lang||'greek').toLowerCase();
  const compactGreekVerb = lang==='greek' && bits[0]==='v' && /^[a-z]{3}$/.test(bits[1]||'');
  if(compactGreekVerb && fieldId==='tense') return {pres:'p', impf:'i', fut:'f', aor:'a', perf:'r', plup:'l'}[val] === bits[1][0];
  if(compactGreekVerb && fieldId==='voice') return {act:'a', mid:'m', pas:'p'}[val] === bits[1][1];
  if(compactGreekVerb && fieldId==='mood') return {ind:'i', subj:'s', opt:'o', imp:'m', inf:'n', ptc:'p'}[val] === bits[1][2];
  if(compactGreekVerb && fieldId==='case') return bits[2]?.[0]===val;
  if(compactGreekVerb && fieldId==='number') return bits[2]?.[1]===val;
  if(compactGreekVerb && fieldId==='gender') return bits[2]?.[2]===val;
  if(fieldId==='case') return bits[1]?.[0]===val;
  if(fieldId==='number'){
    if(lang==='hebrew') return bits.some(bit => bit.includes(val));
    return bits[1]?.[1]===val;
  }
  if(fieldId==='gender'){
    if(lang==='hebrew') return bits.some(bit => bit.includes(val));
    return bits[1]?.[2]===val;
  }
  if(fieldId==='person') return bits.some(bit => bit===val);
  return bits.includes(val);
}

function checkParsingAnswer(reveal=false){
  const idx = parsingSession.idx;
  const qn = parsingSession.questions[idx];
  if(!qn) return;
  const p = (qn.parse||'').toLowerCase();
  const fields = getParsingFields(qn);
  let correct=0; let total=0; const lines=[];
  fields.forEach(f=>{
    if(f.type==='select'){
      const el = $(`#par_${f.id}`); if(!el) return;
      const val = el.value; total++;
      const ok = parseHasSelection(qn, f.id, val);
      if(ok) correct++;
      lines.push({ ok, text: ok ? `✓ ${f.label}: ${val}` : `✗ ${f.label}: you said "${val}" — ${parseSummary(qn)}` });
    } else {
      const el = $(`#par_${f.id}`); if(!el) return;
      const val = (el.value||'').trim().toLowerCase(); total++;
      const ok = val===(qn.lemma||'').toLowerCase();
      if(ok) correct++;
      lines.push({ ok, text: ok ? `✓ Lemma: ${val}` : `✗ Lemma: you said "${val||'—'}" — correct: "${qn.lemma}"` });
    }
  });
  if(correct===total) parsingSession.correct++;
  parsingSession.results[idx] = (correct===total);
  parsingSession.idx++;

  const res = $('#parsingResult'); if(!res) return;
  const allRight = correct===total;
  res.className = `parsing-result ${allRight?'correct':'wrong'}`;
  res.innerHTML = `<div style="font-weight:700;margin-bottom:6px">${allRight?'✅ Correct!':'❌ '+correct+'/'+total+' correct'}</div>`
    + `<div class="small muted" style="margin-bottom:6px">${escHtml(parseSummary(qn))}</div>`
    + lines.map(l=>`<div class="parsing-result-line ${l.ok?'ok':'err'}">${escHtml(l.text)}</div>`).join('');
  res.classList.remove('hidden');
  $('#parsingSubmit').classList.add('hidden');
  $('#parsingReveal').classList.add('hidden');

  const isLastQuestion = parsingSession.idx >= parsingSession.total;
  if(isLastQuestion){
    $('#nextParsing').classList.add('hidden');
    $('#finishParsing').classList.remove('hidden');
  } else {
    $('#nextParsing').classList.remove('hidden');
    $('#finishParsing').classList.add('hidden');
  }
  renderParsingDots();
}

function renderParsingDots(){
  const dots = $('#parsingDots'); if(!dots) return;
  dots.innerHTML = parsingSession.questions.map((_,i)=>{
    const r = parsingSession.results[i];
    return `<div class="ps-dot ${r===true?'correct-dot':r===false?'wrong-dot':''}"></div>`;
  }).join('');
}

function revealParsingAnswer(){
  const idx = parsingSession.idx;
  const qn = parsingSession.questions[idx];
  if(!qn) return;
  const res = $('#parsingResult'); if(!res) return;
  res.className = 'parsing-result';
  res.innerHTML = `<div style="font-weight:700;margin-bottom:6px">Answer: <span class="mono">${escHtml(qn.parse||'—')}</span></div>
    <div class="small muted" style="margin-bottom:6px">${escHtml(parseSummary(qn))}</div>
    <div>Lemma: <span class="serif" style="font-size:16px">${escHtml(qn.lemma||'—')}</span></div>
    <div>Gloss: ${escHtml(qn.gloss||'—')}</div>`;
  res.classList.remove('hidden');
  $('#parsingSubmit').classList.add('hidden');
  $('#parsingReveal').classList.add('hidden');
  parsingSession.results[idx] = false;
  parsingSession.idx++;

  const isLastQuestion = parsingSession.idx >= parsingSession.total;
  if(isLastQuestion){
    $('#nextParsing').classList.add('hidden');
    $('#finishParsing').classList.remove('hidden');
  } else {
    $('#nextParsing').classList.remove('hidden');
    $('#finishParsing').classList.add('hidden');
  }
  renderParsingDots();
}

/* ---------- DASHBOARD ---------- */
function renderDashboard(){
  const today = todayISO();
  const list = getCurrentList();
  const due = list.filter(it=>it.due<=today).length;
  const learned = list.filter(it=>(it.repetitions||0)>=3).length;
  const recent7 = (state.dashboard.recent||[]).filter(r=>{
    const d=new Date(r.date); const cutoff=new Date(); cutoff.setDate(cutoff.getDate()-7);
    return d>=cutoff;
  });

  const set = (id,v)=>{ const el=$(id); if(el) el.textContent=v; };
  set('#dashDue', due);
  set('#dashStreak', state.dashboard.streak||0);
  set('#dashTotal', list.length);
  set('#dashLearned', learned);
  set('#dashRevWeek', recent7.length);
  const avg = list.length ? (list.reduce((s,it)=>s+(it.ease||0),0)/list.length).toFixed(2) : '—';
  set('#dashAvgEase', avg);

  // Streak warning
  const sw = $('#streakWarning');
  if(sw){
    const studiedToday = state.dashboard.lastStudied===today;
    const hasStreak = (state.dashboard.streak||0) > 0;
    sw.classList.toggle('hidden', studiedToday||!hasStreak);
  }

  renderSparkline();
  renderHeatmap();
  renderUpcomingDue(list, today);
}

function renderSparkline(){
  const canvas = $('#perfSpark'); if(!canvas) return;
  const recent = (state.dashboard.recent||[]).slice(-30);
  const W = canvas.offsetWidth||300, H=70;
  canvas.width=W; canvas.height=H;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0,0,W,H);
  if(recent.length<2) return;
  const arr = recent.map(r=>r.q);
  ctx.beginPath();
  arr.forEach((v,i)=>{
    const x=(i/(arr.length-1))*W;
    const y=H-(v/5)*H*0.8-H*0.1;
    if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  });
  ctx.strokeStyle=state.prefs.accent||'#4e8f6e'; ctx.lineWidth=2.5;
  ctx.lineJoin='round'; ctx.stroke();
  ctx.lineTo(W,H); ctx.lineTo(0,H); ctx.closePath();
  ctx.fillStyle=hexToRgba(state.prefs.accent||'#4e8f6e',0.1); ctx.fill();
}

function renderHeatmap(){
  const el = $('#heatmapRow'); if(!el) return;
  el.innerHTML='';
  const hm = state.dashboard.heatmap||{};
  const max = Math.max(1,...Object.values(hm));
  for(let i=59;i>=0;i--){
    const iso = todayISO(-i);
    const v = hm[iso]||0;
    const level = v===0?0:v/max<0.25?1:v/max<0.5?2:v/max<0.75?3:4;
    const cell = document.createElement('div');
    cell.className='hm-cell'; cell.dataset.v=level;
    cell.title=`${iso}: ${v} review${v!==1?'s':''}`;
    el.appendChild(cell);
  }
}

function renderUpcomingDue(list, today){
  const el=$('#upcomingDue'); if(!el) return;
  const counts={};
  list.forEach(it=>{
    const d=it.due||today;
    if(d>=today) counts[d]=(counts[d]||0)+1;
  });
  const sorted = Object.entries(counts).sort((a,b)=>a[0].localeCompare(b[0])).slice(0,7);
  if(!sorted.length){ el.textContent='No upcoming cards.'; return; }
  el.innerHTML='<div style="display:flex;flex-wrap:wrap;gap:8px">'+
    sorted.map(([d,n])=>`<div class="stat-card" style="padding:8px 12px;min-width:0"><div style="font-weight:700;font-size:14px">${n}</div><div class="small muted">${d===today?'Today':d}</div></div>`).join('')+
    '</div>';

  // POS breakdown for today's due
  const pbd = $('#posDueBreakdown');
  if(pbd){
    const todayDue = list.filter(it=>(it.due||'9999')<=today);
    const byPos = {};
    todayDue.forEach(it=>{
      const p = (it.pos||'other').toLowerCase().slice(0,4);
      const label = p==='noun'?'Nouns':p==='verb'?'Verbs':p==='adj'?'Adj':'Other';
      byPos[label]=(byPos[label]||0)+1;
    });
    pbd.innerHTML = Object.entries(byPos).map(([l,n])=>`<span class="pos-pill">${l}: ${n}</span>`).join('');
  }
}

/* ---------- SETTINGS SYNC ---------- */
function syncSettingsUI(){
  const p = state.prefs;
  const sv = (id,v)=>{ const el=$(id); if(el) el.value=v; };
  const sc = (id,v)=>{ const el=$(id); if(el) el.checked=v; };
  sv('#initialEase', p.initialEase||2.5);
  sv('#minEase', p.minEase||1.3);
  sv('#dailyCap', p.dailyCap||200);
  sv('#newPerDay', p.newPerDay||20);
  sv('#fontSizeSlider', p.cardFontSize||54);
  sc('#useSM2', p.useSM2!==false);
  sc('#showPosHint', !!p.showPosHint);
  sc('#autoNextCard', !!p.autoNextCard);
  $('#fontSizeLabel').textContent = (p.cardFontSize||54)+'px';
  applyTheme(p.theme||'light');
  renderAccentButtons();
}

/* ---------- Export ---------- */
function exportData(){
  const data = { greek: state.data.greek, hebrew: state.data.hebrew, exported: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data,null,2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download='puritan-parser-export.json'; a.click();
  URL.revokeObjectURL(url);
  toast('Data exported!','success');
}
async function importDataFile(file){
  const preview = $('#importPreview');
  try {
    const payload = JSON.parse(await file.text());
    const items = ParserCore.normalizeImportedPayload ? ParserCore.normalizeImportedPayload(payload) : [];
    const checks = items.map((item, idx)=>ParserCore.validateVocabItem ? ParserCore.validateVocabItem(item, idx) : {index:idx, errors:[]});
    const invalid = checks.filter(x=>x.errors.length);
    const valid = items.filter((_, idx)=>!checks[idx].errors.length).map(item=>{
      const lang = String(item.lang||'greek').toLowerCase();
      return ensureSRS(Object.assign({}, item, { lang, source: item.source || 'Imported' }));
    });
    if(!valid.length){
      if(preview){ preview.textContent = invalid.length ? `No valid entries found. First error: row ${invalid[0].index+1} ${invalid[0].errors.join(', ')}` : 'No entries found.'; preview.classList.remove('hidden'); }
      toast('Import failed.','danger');
      return;
    }
    const byId = lang => new Map(state.data[lang].map(item=>[item.id||`${item.word}:${item.lemma}`, item]));
    ['greek','hebrew'].forEach(lang=>{
      const map = byId(lang);
      valid.filter(item=>item.lang===lang).forEach(item=>map.set(item.id||`${item.word}:${item.lemma}`, item));
      state.data[lang] = Array.from(map.values());
      saveVocab(lang);
    });
    updateGrammarOptions();
    renderList();
    updateDueBadge();
    if(preview){
      preview.textContent = `Imported ${valid.length} entr${valid.length===1?'y':'ies'}${invalid.length ? `; skipped ${invalid.length} invalid row${invalid.length===1?'':'s'}` : ''}.`;
      preview.classList.remove('hidden');
    }
    toast('Import complete.','success');
  } catch(e){
    if(preview){ preview.textContent = 'Could not read that JSON file.'; preview.classList.remove('hidden'); }
    toast('Import failed.','danger');
  }
}

/* ---------- Events ---------- */
let eventsWired = false;
function wireEvents(){
  if(eventsWired) return; eventsWired=true;

  // Language
  $$('[data-lang]').forEach(b=>b.addEventListener('click',()=>setLang(b.dataset.lang)));

  // View nav tabs
  $$('.nav-tab').forEach(t=>t.addEventListener('click',()=>{
    const v = t.dataset.view+'View';
    showView(v);
  }));

  // Shared filter bar inputs
  const debouncedRender = debounce(()=>renderList(),150);
  $('#searchInput')?.addEventListener('input', debouncedRender);
  $('#freqMin')?.addEventListener('input', ()=>{ readFiltersFromDOM(); renderList(); });
  $('#freqMax')?.addEventListener('input', ()=>{ readFiltersFromDOM(); renderList(); });
  $('#dueOnlyToggle')?.addEventListener('change', ()=>{ readFiltersFromDOM(); renderList(); });
  $('#grammarSelect')?.addEventListener('change', ()=>{ readFiltersFromDOM(); renderList(); renderLemmaPicker(); });
  $('#sortSelect')?.addEventListener('change', ()=>renderList());

  // Flashcard
  $('#startFlashBtn').addEventListener('click',startFlash);
  $('#endFlashBtn').addEventListener('click',endFlash);
  $('#fcFlipToBack').addEventListener('click',()=>setCardFlipped(true));
  $('#fcFlipToFront').addEventListener('click',()=>setCardFlipped(false));
  $('#flashCompleteBack').addEventListener('click',()=>{ endFlash(); showView('listView'); });

  // Swipe
  wireSwipe();

  // Parsing
  $('#parsingMode')?.addEventListener('change', updateParsingModeUI);
  $('#lemmaSearch')?.addEventListener('input', debounce(renderLemmaPicker, 150));
  $('#startParsing').addEventListener('click',startParsing);
  $('#endParsing').addEventListener('click',endParsing);
  $('#parsingSubmit').addEventListener('click',()=>checkParsingAnswer());
  $('#parsingReveal').addEventListener('click',revealParsingAnswer);
  $('#nextParsing').addEventListener('click',()=>renderParsingQuestion());
  $('#finishParsing').addEventListener('click',()=>{ parsingSession.idx=parsingSession.total; renderParsingQuestion(); });

  // Modal
  $('#closeModal')?.addEventListener('click', closeWordModal);
  $('#modalCloseBtn2')?.addEventListener('click', closeWordModal);
  $('#wordModal')?.addEventListener('click', e=>{ if(e.target===$('#wordModal')) closeWordModal(); });

  // Settings
  $('#openSettings').addEventListener('click',()=>showView('settingsView'));
  $('#closeSettingsBtn').addEventListener('click',()=>showView('listView'));
  $$('.theme-btn').forEach(b=>b.addEventListener('click',()=>applyTheme(b.dataset.theme)));
  $('#applyAccent').addEventListener('click',()=>{
    const v=($('#customAccent').value||'').trim();
    if(/^#[0-9a-f]{6}$/i.test(v)) setAccent(v); else toast('Enter valid hex #rrggbb','danger');
  });

  const srsFields=[['#useSM2','useSM2','bool'],['#initialEase','initialEase','num'],['#minEase','minEase','num'],
    ['#dailyCap','dailyCap','num'],['#newPerDay','newPerDay','num'],
    ['#showPosHint','showPosHint','bool'],['#autoNextCard','autoNextCard','bool']];
  srsFields.forEach(([sel,key,type])=>{
    const el=$(sel); if(!el) return;
    el.addEventListener('change',()=>{
      state.prefs[key] = type==='bool'?el.checked : Number(el.value);
      savePrefs();
    });
  });

  const fss=$('#fontSizeSlider');
  if(fss) fss.addEventListener('input',()=>{
    const v=Number(fss.value);
    state.prefs.cardFontSize=v; savePrefs();
    document.documentElement.style.setProperty('--fc-word-size', v+'px');
    $('#fontSizeLabel').textContent=v+'px';
    $$('.fc-word-display').forEach(el=>el.style.fontSize=v+'px');
  });

  $('#importData')?.addEventListener('click',()=>$('#importFile')?.click());
  $('#importFile')?.addEventListener('change', e=>{
    const file = e.target.files?.[0];
    if(file) importDataFile(file);
    e.target.value = '';
  });
  $('#exportData')?.addEventListener('click',exportData);
  $('#resetSRS').addEventListener('click',()=>{
    if(!confirm('Reset SRS data for current language?')) return;
    getCurrentList().forEach(it=>{ it.ease=state.prefs.initialEase; it.interval=0; it.repetitions=0; it.due=todayISO(); it.history=[]; });
    saveVocab(state.lang); renderList(); toast('SRS reset.','success');
  });
  $('#clearAll').addEventListener('click',()=>{
    if(!confirm('Delete ALL local data? This cannot be undone.')) return;
    [LS_VOCAB_GREEK,LS_VOCAB_HEBREW,LS_PREFS,LS_DASHBOARD].forEach(k=>localStorage.removeItem(k));
    location.reload();
  });

  // Keyboard shortcuts
  document.addEventListener('keydown',e=>{
    const tag = document.activeElement.tagName;
    const inInput = tag==='INPUT'||tag==='SELECT'||tag==='TEXTAREA';

    // Modal close
    if(e.key==='Escape'){ closeWordModal(); return; }

    // Global nav shortcuts (skip if in input)
    if(!inInput){
      const fv = document.getElementById('flashView');
      const inFlash = fv&&!fv.classList.contains('hidden');
      if(e.key==='f'||e.key==='F'){ e.preventDefault(); showView('flashView'); }
      else if(e.key==='p'||e.key==='P'){ e.preventDefault(); showView('parsingView'); }
      else if(e.key==='d'||e.key==='D'){ e.preventDefault(); showView('dashboardView'); }
      else if(e.key==='s'||e.key==='S'){ e.preventDefault(); showView('settingsView'); }
      else if(e.key==='l'||e.key==='L'){ e.preventDefault(); showView('listView'); }
      if(inFlash&&state.session.queue.length){
        if(e.key===' '){ e.preventDefault(); setCardFlipped(!state.session.flipped); }
        if(state.session.flipped){
          const k=Number(e.key);
          if(!isNaN(k)&&k>=0&&k<=5){ e.preventDefault(); onRate(k); }
        }
      }
    }

    // Parsing keyboard: Enter to submit/next
    const pv = document.getElementById('parsingView');
    const inParsing = pv&&!pv.classList.contains('hidden');
    if(inParsing){
      const submitBtn = $('#parsingSubmit');
      const nextBtn = $('#nextParsing');
      const finishBtn = $('#finishParsing');
      if(e.key==='Enter'){
        e.preventDefault();
        if(submitBtn&&!submitBtn.classList.contains('hidden')) checkParsingAnswer();
        else if(finishBtn&&!finishBtn.classList.contains('hidden')){ parsingSession.idx=parsingSession.total; renderParsingQuestion(); }
        else if(nextBtn&&!nextBtn.classList.contains('hidden')) renderParsingQuestion();
      }
      if((e.key==='ArrowRight'||e.key==='Tab')&&!e.shiftKey){
        if(nextBtn&&!nextBtn.classList.contains('hidden')){ e.preventDefault(); renderParsingQuestion(); }
      }
    }
  });

  window.addEventListener('beforeunload',()=>{ saveVocab('greek'); saveVocab('hebrew'); savePrefs(); });
  try { if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{}); } catch(e){}
}

/* ---------- Sample Data ---------- */
const SAMPLE_GREEK = [
  {word:"λόγος",lemma:"λόγος",gloss:"word, message",pos:"noun",freq:330,parse:"N-NSM"},
  {word:"λόγον",lemma:"λόγος",gloss:"word (acc)",pos:"noun",freq:120,parse:"N-ASM"},
  {word:"λόγῳ",lemma:"λόγος",gloss:"word (dat)",pos:"noun",freq:80,parse:"N-DSM"},
  {word:"ἀγαπάω",lemma:"ἀγαπάω",gloss:"to love",pos:"verb",freq:143,parse:"V-PRES-ACT-1S"},
  {word:"ἠγάπησεν",lemma:"ἀγαπάω",gloss:"he loved",pos:"verb",freq:58,parse:"V-AOR-ACT-3S"},
  {word:"θεός",lemma:"θεός",gloss:"God",pos:"noun",freq:1317,parse:"N-NSM"},
  {word:"θεοῦ",lemma:"θεός",gloss:"of God",pos:"noun",freq:620,parse:"N-GSM"},
  {word:"θεῷ",lemma:"θεός",gloss:"to God",pos:"noun",freq:190,parse:"N-DSM"},
  {word:"πιστός",lemma:"πιστός",gloss:"faithful",pos:"adj",freq:67},
  {word:"πνεῦμα",lemma:"πνεῦμα",gloss:"spirit, wind",pos:"noun",freq:379,parse:"N-NSN"},
  {word:"γράφω",lemma:"γράφω",gloss:"to write",pos:"verb",freq:191,parse:"V-PRES-ACT-1S"},
  {word:"ἄνθρωπος",lemma:"ἄνθρωπος",gloss:"man, person",pos:"noun",freq:550,parse:"N-NSM"},
  {word:"ἐν",lemma:"ἐν",gloss:"in, among",pos:"prep",freq:2752},
  {word:"κύριος",lemma:"κύριος",gloss:"Lord, master",pos:"noun",freq:717,parse:"N-NSM"},
  {word:"Ἰησοῦς",lemma:"Ἰησοῦς",gloss:"Jesus, Joshua",pos:"noun",freq:917,parse:"N-NSM"},
  {word:"Χριστός",lemma:"Χριστός",gloss:"Christ, Messiah",pos:"noun",freq:529,parse:"N-NSM"},
  {word:"πίστις",lemma:"πίστις",gloss:"faith, trust",pos:"noun",freq:243,parse:"N-NSF"},
  {word:"ἀγάπη",lemma:"ἀγάπη",gloss:"love",pos:"noun",freq:116,parse:"N-NSF"},
  {word:"ἔχω",lemma:"ἔχω",gloss:"to have, hold",pos:"verb",freq:708,parse:"V-PRES-ACT-1S"},
  {word:"εἰμί",lemma:"εἰμί",gloss:"to be, exist",pos:"verb",freq:2461,parse:"V-PRES-ACT-1S"},
  {word:"λέγω",lemma:"λέγω",gloss:"to say, speak",pos:"verb",freq:2354,parse:"V-PRES-ACT-1S"}
];
const SAMPLE_HEBREW = [
  {word:"דָּוִד",lemma:"דָּוִד",gloss:"David",pos:"noun",freq:1075},
  {word:"אֱלֹהִים",lemma:"אֱלֹהִים",gloss:"God, gods",pos:"noun",freq:2602,parse:"N-MPL"},
  {word:"אָמַר",lemma:"אָמַר",gloss:"to say",pos:"verb",freq:5317,parse:"V-QAL-PERF-3MS"},
  {word:"תּוֹרָה",lemma:"תּוֹרָה",gloss:"law, instruction",pos:"noun",freq:220,parse:"N-FSG"},
  {word:"טוֹב",lemma:"טוֹב",gloss:"good",pos:"adj",freq:559},
  {word:"יָד",lemma:"יָד",gloss:"hand",pos:"noun",freq:1627,parse:"N-FSG"},
  {word:"שָׁלוֹם",lemma:"שָׁלוֹם",gloss:"peace, wholeness",pos:"noun",freq:236},
  {word:"בֵּן",lemma:"בֵּן",gloss:"son",pos:"noun",freq:4941,parse:"N-MSG"},
  {word:"יְהוָה",lemma:"יְהוָה",gloss:"LORD, Yahweh",pos:"noun",freq:6828},
  {word:"בֵּית",lemma:"בַּיִת",gloss:"house, home",pos:"noun",freq:2047,parse:"N-MSG"},
  {word:"כֹּל",lemma:"כֹּל",gloss:"all, every",pos:"noun",freq:5415},
  {word:"עָשָׂה",lemma:"עָשָׂה",gloss:"to do, make",pos:"verb",freq:2632,parse:"V-QAL-PERF-3MS"}
];

/* ---------- Init ---------- */
async function init(){
  loadPrefs();
  loadDashboard();
  const lastLang = localStorage.getItem('pp_last_lang');
  if(lastLang) state.lang = lastLang;
  applyTheme(state.prefs.theme||'light');
  setAccent(state.prefs.accent||DEFAULTS.accent);
  await loadData();
  wireEvents();
  syncSettingsUI();
  setLang(state.lang);
  showView('listView');
  updateDueBadge();
  if(state.prefs.cardFontSize){
    document.documentElement.style.setProperty('--fc-word-size', state.prefs.cardFontSize+'px');
    $$('.fc-word-display').forEach(el=>el.style.fontSize=state.prefs.cardFontSize+'px');
  }
}

init();
