/* ---------- FLASHCARD SESSION ---------- */
function startFlash(){
  readFiltersFromDOM();
  const mode = $('#studyMode')?.value||'due';
  const today = todayISO();
  const rawPool = applyFreqFilter(getCurrentList());
  let pool = (typeof getStudyEntries === 'function' ? getStudyEntries(rawPool, state.prefs.studyMode || 'lemma') : rawPool).filter(hasGloss);
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
  const displayGloss = typeof getDisplayGloss === 'function' ? getDisplayGloss(cur) : (cur.gloss||'—');

  if(dir==='word2gloss'){
    $('#fcWord').textContent = cur.word||'—';
    $('#fcWordBack').textContent = cur.word||'—';
    $('#fcGloss').textContent = displayGloss;
  } else {
    $('#fcWord').textContent = displayGloss;
    $('#fcWordBack').textContent = displayGloss;
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
  const reviewTargets = typeof getStudyEntryOriginals === 'function' ? getStudyEntryOriginals(cur) : [cur];
  reviewTargets.forEach(item => scheduleUpdate(item, quality));
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
        unique.map(w=>`<div class="session-missed-item"><span class="session-missed-word">${escHtml(w.word||w.lemma||'')}</span><span class="muted small">${escHtml(typeof getDisplayGloss === 'function' ? getDisplayGloss(w) : (w.gloss||''))}</span></div>`).join('');
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
