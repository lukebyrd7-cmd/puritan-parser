function displayHeadwordForEntry(entry){
  if(typeof getDisplayHeadword === 'function') return getDisplayHeadword(entry);
  const clean = value => typeof value === 'string' ? value.trim() : '';
  return clean(entry?.lexicalForm) || clean(entry?.lemma) || clean(entry?.word) || '';
}

/* ---------- WORD DETAIL MODAL ---------- */
function openWordModal(item){
  if(!item) return;
  const storageItem = item.representativeEntry || item;
  const originalItems = typeof getStudyEntryOriginals === 'function' ? getStudyEntryOriginals(item) : [item];
  const displayHeadword = displayHeadwordForEntry(item) || '—';
  $('#modalWord').textContent = displayHeadword;
  const displayGloss = typeof getDisplayGloss === 'function' ? getDisplayGloss(item) : (item.gloss||'—');
  const personalRecord = typeof PuritanPersonalGlosses !== 'undefined' ? PuritanPersonalGlosses.recordFor(item) : null;
  $('#modalGloss').textContent = displayGloss;
  const decoded = parseSummary(item);
  const alternates = typeof normalizeAlternateGlosses === 'function' ? normalizeAlternateGlosses(item.alternateGlosses) : (Array.isArray(item.alternateGlosses) ? item.alternateGlosses : []);
  const glossRows = [
    ['Lexical form', item.lexicalForm || '—'],
    ['Lemma', item.lemma || '—'],
    ['Word form', item.word || '—'],
    ['Primary gloss', item.primaryGloss || item.gloss || '—'],
    ['Alternate glosses', alternates.length ? alternates.join('; ') : '—'],
    ['Personal glosses', personalRecord?.glosses?.join('; ') || item.customGloss || storageItem.customGloss || '—'],
    ['Gloss source', item.glossSource || '—'],
    ['Gloss license', item.glossLicense || '—'],
    ['Gloss attribution', item.glossAttribution || '—']
  ];
  if(item.glossSourceUrl) glossRows.push(['Gloss source URL', item.glossSourceUrl]);
  const rows = glossRows.concat([
    ['POS', item.pos||'—'],
    ['Parse', item.parse||'—'],
    ['Frequency', item.freq||0],
    ['Due', item.due||'—'],
    ['Ease', typeof item.ease==='number'?item.ease.toFixed(2):'—'],
    ['Interval', item.interval ? `${item.interval} day${item.interval!==1?'s':''}` : '—'],
    ['Repetitions', item.repetitions||0],
    ['Mastery', typeof vocabularyMasteryGrade === 'function' && vocabularyMasteryGrade(item)
      ? `${vocabularyMasteryGrade(item).letter} — ${vocabularyMasteryGrade(item).label}`
      : 'Not tracked'],
  ]);
  if(item.studyEntryType === 'lemma') rows.splice(glossRows.length, 0, ['Forms', (item.forms || []).join(', ') || '—'], ['Representative form', item.representativeForm || '—']);
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

  const customInput = $('#customGlossInput');
  if(customInput) customInput.value = personalRecord?.glosses?.join('; ') || item.customGloss || storageItem.customGloss || '';
  $('#saveCustomGlossBtn').onclick = ()=>{
    if(typeof PuritanPersonalGlosses !== 'undefined') {
      try { PuritanPersonalGlosses.setRecord(item, { mode: 'replace', glosses: customInput?.value || '' }); }
      catch(error){ toast(error.message, 'danger'); return; }
    }
    else { storageItem.customGloss = (customInput?.value || '').trim(); item.customGloss = storageItem.customGloss; saveVocab(item.lang||state.lang); }
    openWordModal(item);
    renderList();
    toast('Personal gloss saved.','success');
  };
  $('#clearCustomGlossBtn').onclick = ()=>{
    if(typeof PuritanPersonalGlosses !== 'undefined') PuritanPersonalGlosses.restore(item);
    else { delete storageItem.customGloss; delete item.customGloss; saveVocab(item.lang||state.lang); }
    openWordModal(item);
    renderList();
    toast('Standard glosses restored.','success');
  };

  // Reset button
  $('#modalResetBtn').onclick = ()=>{
    if(!confirm(`Reset SRS data for "${displayHeadword}"?`)) return;
    originalItems.forEach(original => {
      original.ease = state.prefs.initialEase||2.5;
      original.interval = 0; original.repetitions = 0;
      original.due = todayISO(); original.history = [];
    });
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
