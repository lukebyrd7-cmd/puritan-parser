function displayHeadwordForEntry(entry){
  if(typeof getDisplayHeadword === 'function') return getDisplayHeadword(entry);
  const clean = value => typeof value === 'string' ? value.trim() : '';
  return clean(entry?.lexicalForm) || clean(entry?.lemma) || clean(entry?.word) || '';
}

/* ---------- View Controller ---------- */
function showView(viewId, options = {}){
  const views = Object.values(typeof ROUTES !== 'undefined' ? ROUTES : {}).map(route => route.viewId);
  if(!views.length) views.push('listView','flashView','parsingView','dashboardView','settingsView');
  views.forEach(id=>{ const el=document.getElementById(id); if(el) el.classList.toggle('hidden', id!==viewId); });
  $$('.nav-tab').forEach(t=>t.classList.toggle('active', t.dataset.view===viewId.replace('View','') || (typeof ROUTES !== 'undefined' && ROUTES[routeForView(viewId)]?.nav === t.dataset.view)));
  state.currentView = viewId;

  if(!options.skipHistory && typeof routeForView === 'function') navigateTo(routeForView(viewId));

  // Show/hide filter bar and its sub-elements
  const filterBar = $('#sharedFilterBar');
  const noFilterViews = ['dashboardView','settingsView','grammarView','bibleView','profileView'];
  if(filterBar) filterBar.classList.toggle('hidden', noFilterViews.includes(viewId));
  // search only on list
  const sg = $('#filterSearchGroup'); if(sg) sg.classList.toggle('hidden', viewId!=='listView');
  // sort only on list
  const ssg = $('#filterSortGroup'); if(ssg) ssg.classList.toggle('hidden', viewId!=='listView');
  // entries count only on list
  const ec = $('#filterEntriesCount'); if(ec) ec.classList.toggle('hidden', viewId!=='listView');
  const pg = $('#filterPosGroup'); if(pg) pg.classList.toggle('hidden', viewId==='parsingView');

  if(viewId==='dashboardView') renderDashboard();
  if(viewId==='listView') renderList();
  if(viewId==='parsingView') { updateParsingModeUI(); renderLemmaPicker(); }

  const fl = $('#footerLang');
  if(fl) fl.textContent = `${state.lang==='greek'?'Greek (GNT)':'Hebrew'} — ${getCurrentStudyList().length} study entries (${getCurrentList().length} forms) loaded`;
}

/* ---------- Language ---------- */
function setLang(lang){
  const previousLang = state.lang;
  state.lang = lang;
  if(previousLang !== lang) { selectedLemma = null; state.parsingFilters = { family: parsingModeFamily() || state.parsingFilters?.family || 'all', details: {} }; }
  $$('[data-lang]').forEach(b=>b.classList.toggle('active', b.dataset.lang===lang));
  updatePosOptions();
  updateParsingFilterOptions();
  renderList(); updateDueBadge();
  if(state.currentView==='grammarView' && typeof renderReferenceLibrary==='function'){ setReferenceLanguage(lang); renderReferenceLibrary(); }
  if(typeof saveLastLanguage === 'function') saveLastLanguage(lang);
}
function getCurrentList(){ return state.data[state.lang]||[]; }
function getCurrentStudyList(){ return typeof getStudyEntries === 'function' ? getStudyEntries(getCurrentList(), state.prefs.studyMode || 'lemma') : getCurrentList(); }

/* ---------- Due badge ---------- */
function updateDueBadge(){
  const today = todayISO();
  const due = getCurrentStudyList().filter(it=>it.due<=today).length;
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
  const { query, minFreq, maxFreq, dueOnly, pos } = state.filters;
  const sort = $('#sortSelect')?.value||'freq-desc';
  const today = todayISO();
  let list = getCurrentStudyList().filter(it=>{
    if(!it) return false;
    const freq = it.freq||0;
    if(freq < minFreq || freq > maxFreq) return false;
    if(dueOnly && it.due > today) return false;
    if(!matchesPosFilter(it, pos)) return false;
    if(!query) return true;
    const searchText = typeof getStudyEntrySearchText === 'function' ? getStudyEntrySearchText(it) : (typeof glossSearchText === 'function' ? glossSearchText(it) : `${it.word||''} ${it.lemma||''} ${it.gloss||''}`.toLowerCase());
    return `${searchText} ${it.pos||''} ${it.parse||''} ${parseSummary(it)}`.toLowerCase().includes(query);
  });
  list.sort((a,b)=>{
    if(sort==='freq-desc') return (b.freq||0)-(a.freq||0);
    if(sort==='freq-asc') return (a.freq||0)-(b.freq||0);
    if(sort==='due-asc') return (a.due||'9999').localeCompare(b.due||'9999');
    if(sort==='mastery-asc') return computeMastery(a)-computeMastery(b);
    if(sort==='word-az') return displayHeadwordForEntry(a).localeCompare(displayHeadwordForEntry(b));
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
      <td class="word-cell">${escHtml(displayHeadwordForEntry(it))}${isDue?'<span style="color:var(--accent);font-size:10px;margin-left:4px">●</span>':''}</td>
      <td class="gloss-cell">${escHtml(typeof getDisplayGloss === 'function' ? getDisplayGloss(it) : (it.gloss||''))}</td>
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
