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
