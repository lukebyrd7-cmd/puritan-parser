/* ---------- Filter helpers ---------- */
function readFiltersFromDOM(){
  state.filters.query = ($('#searchInput')?.value||'').toLowerCase().trim();
  state.filters.minFreq = Number($('#freqMin')?.value)||1;
  state.filters.maxFreq = Number($('#freqMax')?.value)||9999;
  state.filters.dueOnly = $('#dueOnlyToggle')?.checked||false;
  state.filters.pos = readPosFilterFromDOM();
}
function applyRangeDueFilter(list){
  const { minFreq, maxFreq, dueOnly } = state.filters;
  const today = todayISO();
  return list.filter(it=>{
    if(!it) return false;
    const freq = it.freq||0;
    if(freq < minFreq) return false;
    if(freq > maxFreq) return false;
    if(dueOnly && it.due > today) return false;
    return true;
  });
}
function applyFreqFilter(list){
  const { pos } = state.filters;
  return applyRangeDueFilter(list).filter(it=>matchesPosFilter(it, pos));
}
function readPosFilterFromDOM(){
  return $('#posFilterSelect')?.value || 'all';
}

function matchesPosFilter(item, pos){
  if(!pos || pos === 'all') return true;
  return String(item?.pos || '').toLowerCase() === pos;
}

function updatePosOptions(){
  const posSelect = $('#posFilterSelect');
  if(!posSelect) return;
  const current = state.filters.pos || readPosFilterFromDOM();
  const counts = new Map();
  getCurrentList().forEach(item => {
    const pos = String(item.pos || '').trim().toLowerCase();
    if(pos) counts.set(pos, (counts.get(pos) || 0) + 1);
  });
  const entries = Array.from(counts.entries()).sort((a,b)=>b[1]-a[1] || a[0].localeCompare(b[0]));
  posSelect.innerHTML = '<option value="all">All parts of speech</option>' +
    entries.map(([pos, count]) => `<option value="${escHtml(pos)}">${escHtml(studentLabel(pos))} (${count})</option>`).join('');
  posSelect.value = entries.some(([pos]) => pos === current) ? current : 'all';
  state.filters.pos = posSelect.value;
}

function studentLabel(value){
  return String(value || '').replace(/[-_]+/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase());
}

function parsingFilterSpecs(lang, family){
  const language = (lang || state.lang || 'greek').toLowerCase();
  if(family === 'nominals'){
    return language === 'hebrew'
      ? [
        {id:'gender', label:'Gender', options:['m','f','c']},
        {id:'number', label:'Number', options:HEBREW_NUMBER_OPTIONS},
        {id:'state', label:'State', options:['a','c','d']}
      ]
      : [
        {id:'case', label:'Case', options:['n','a','g','d','v']},
        {id:'number', label:'Number', options:GREEK_NUMBER_OPTIONS},
        {id:'gender', label:'Gender', options:['m','f','n','c']}
      ];
  }
  if(family === 'verbs'){
    return language === 'hebrew'
      ? [
        {id:'stem', label:'Stem', options:['qal','niphal','piel','pual','hiphil','hophal','hithpael']},
        {id:'form', label:'Form', options:['perf','impf','wayyiqtol','imp','inf','ptc']},
        {id:'person', label:'Person/Gender/Number', options:['1cs','2ms','2fs','3ms','3fs','1cp','2mp','2fp','3mp','3fp']}
      ]
      : [
        {id:'tense', label:'Tense', options:['pres','impf','fut','aor','perf','plup']},
        {id:'voice', label:'Voice', options:['act','mid','pas','mp']},
        {id:'mood', label:'Mood', options:['ind','subj','opt','imp','inf','ptc']},
        {id:'person', label:'Person/Number', options:['1s','2s','3s','1p','2p','3p']}
      ];
  }
  return [];
}

function readParsingFiltersFromDOM(){
  const family = $('#parsingFamilySelect')?.value || 'all';
  const details = {};
  $$('.parsing-filter-select').forEach(sel => {
    if(sel.value && sel.value !== 'all') details[sel.dataset.field] = sel.value;
  });
  return { family, details };
}

function updateParsingFilterOptions(){
  const familySelect = $('#parsingFamilySelect');
  const detailWrap = $('#parsingDetailFilters');
  const title = $('.parsing-filters-title');
  if(title) title.textContent = `${state.lang === 'hebrew' ? 'Hebrew' : 'Greek'} Parsing Filters`;
  if(!familySelect || !detailWrap) return;
  const current = state.parsingFilters || readParsingFiltersFromDOM();
  familySelect.value = ['all','nominals','verbs'].includes(current.family) ? current.family : 'all';
  const specs = parsingFilterSpecs(state.lang, familySelect.value);
  const groupTitle = specs.length ? `${state.lang === 'hebrew' ? 'Hebrew' : 'Greek'} ${familySelect.value === 'verbs' ? 'Verb' : 'Nominal'} Filters` : '';
  const controls = specs.map(spec => {
    const selected = current.details?.[spec.id] || 'all';
    const options = [`<option value="all">Any ${escHtml(spec.label.toLowerCase())}</option>`]
      .concat(spec.options.map(value => `<option value="${escHtml(value)}"${value === selected ? ' selected' : ''}>${escHtml(studentLabel(formatParsingValue(spec.id, value)))}</option>`));
    return `<label class="parsing-filter-field"><span class="filter-label">${escHtml(spec.label)}</span><select class="input grammar-select parsing-filter-select" data-field="${escHtml(spec.id)}">${options.join('')}</select></label>`;
  }).join('');
  detailWrap.innerHTML = (groupTitle ? `<div class="parsing-filter-group-title">${escHtml(groupTitle)}</div>` : '') + controls;
  state.parsingFilters = readParsingFiltersFromDOM();
  updateParsingMatchCount();
  $$('.parsing-filter-select').forEach(sel => sel.addEventListener('change', () => { state.parsingFilters = readParsingFiltersFromDOM(); cleanParsingFiltersForMode(); updateParsingFilterOptions(); renderLemmaPicker(); updateParsingMatchCount(); }));
}

function parsingFamily(item){
  if(!item?.parse || !ParserCore.decodeParse) return '';
  return ParserCore.decodeParse(item.parse, item.lang || state.lang).family;
}

function matchesParsingFilters(item, filters = state.parsingFilters){
  const normalized = filters || { family:'all', details:{} };
  const family = parsingFamily(item);
  if(normalized.family === 'nominals' && family !== 'nominal') return false;
  if(normalized.family === 'verbs' && family !== 'verb') return false;
  const validDetailIds = new Set(parsingFilterSpecs(item?.lang || state.lang, normalized.family).map(spec => spec.id));
  return Object.entries(normalized.details || {})
    .filter(([fieldId]) => validDetailIds.has(fieldId))
    .every(([fieldId, value]) => parseHasSelection(item, fieldId, value));
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
  return typeof hasAnyGloss === 'function' ? hasAnyGloss(item) : !!String(item?.gloss||'').trim();
}
