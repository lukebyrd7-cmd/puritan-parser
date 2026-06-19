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
