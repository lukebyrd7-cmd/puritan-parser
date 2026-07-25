/* ---------- Events ---------- */
let eventsWired = false;
function wireEvents(){
  if(eventsWired) return; eventsWired=true;

  // Language
  $$('[data-lang]').forEach(b=>b.addEventListener('click',()=>setLang(b.dataset.lang)));

  // View nav tabs
  $$('.nav-tab').forEach(t=>t.addEventListener('click',()=>{
    if(t.dataset.view === 'learn' && typeof resetLearn === 'function') resetLearn({ render: false });
    const path = '/' + (t.dataset.view === 'flashcards' ? 'flashcards' : t.dataset.view);
    if(typeof navigateTo === 'function') navigateTo(path);
    else showView((t.dataset.view === 'flashcards' ? 'flash' : t.dataset.view)+'View');
  }));

  // Shared filter bar inputs
  const debouncedRender = debounce(()=>renderList(),150);
  $('#searchInput')?.addEventListener('input', debouncedRender);
  $('#freqMin')?.addEventListener('input', ()=>{ readFiltersFromDOM(); renderList(); if(state.currentView==='parsingView'){ renderLemmaPicker(); updateParsingMatchCount(); } });
  $('#freqMax')?.addEventListener('input', ()=>{ readFiltersFromDOM(); renderList(); if(state.currentView==='parsingView'){ renderLemmaPicker(); updateParsingMatchCount(); } });
  $('#dueOnlyToggle')?.addEventListener('change', ()=>{ readFiltersFromDOM(); renderList(); if(state.currentView==='parsingView'){ renderLemmaPicker(); updateParsingMatchCount(); } });
  $('#posFilterSelect')?.addEventListener('change', ()=>{ readFiltersFromDOM(); renderList(); });
  $('#parsingFamilySelect')?.addEventListener('change', ()=>{ state.parsingFilters = readParsingFiltersFromDOM(); cleanParsingFiltersForMode(); updateParsingFilterOptions(); renderLemmaPicker(); updateParsingMatchCount(); });
  $('#sortSelect')?.addEventListener('change', ()=>renderList());

  // Flashcard
  $('#startFlashBtn').addEventListener('click',startFlash);
  $('#endFlashBtn').addEventListener('click',endFlash);
  $('#fcFlipToBack').addEventListener('click',()=>setCardFlipped(true));
  $('#fcFlipToFront').addEventListener('click',()=>setCardFlipped(false));
  $('#flashCompleteBack').addEventListener('click',()=>{ endFlash(); showView('learnView'); });

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
  $('#openSettings').addEventListener('click',()=>{
    syncSettingsUI();
    showView('settingsView');
  });
  $('#openAboutSourcesBtn')?.addEventListener('click',()=>openAboutSources());
  $('#openGlobalSearch')?.addEventListener('click',()=>showView('globalSearchView'));
  $('#closeSettingsBtn').addEventListener('click',()=>showView('listView'));
  $('#readerSettingsReturn')?.addEventListener('click',()=>typeof navigateTo === 'function' ? navigateTo('/reader') : showView('readerView'));
  $('#wordPageBackToReader')?.addEventListener('click',()=>showView('readerView'));
  $$('.theme-btn').forEach(b=>b.addEventListener('click',()=>applyTheme(b.dataset.theme)));
  $('#applyAccent').addEventListener('click',()=>{
    const v=($('#customAccent').value||'').trim();
    if(/^#[0-9a-f]{6}$/i.test(v)) setAccent(v);
  });

  const srsFields=[['#showPosHint','showPosHint','bool'],['#autoNextCard','autoNextCard','bool']];
  srsFields.forEach(([sel,key,type])=>{
    const el=$(sel); if(!el) return;
    el.addEventListener('change',()=>{
      state.prefs[key] = type==='bool'?el.checked : Number(el.value);
      savePrefs();
    });
  });


  $('#srsPreset')?.addEventListener('change', e=>applySrsPreset(e.target.value));

  ['greek','hebrew'].forEach(language => {
    const preset = $(`#${language}ReviewTargetPreset`);
    const custom = $(`#${language}ReviewTargetCustom`);
    const saveTarget = selectedPreset => {
      if(typeof setLearnReviewTarget !== 'function') return;
      setLearnReviewTarget(language, selectedPreset || preset?.value || 'standard', custom?.value || '');
      syncSettingsUI();
      if(typeof renderLearn === 'function') renderLearn();
    };
    preset?.addEventListener('change', () => saveTarget(preset.value));
    custom?.addEventListener('change', () => saveTarget('custom'));
  });

  $('#practiceSrsPreference')?.addEventListener('change', e=>{
    if(typeof setLearnPracticeSrsPreference === 'function') setLearnPracticeSrsPreference(e.target.value);
    if(typeof renderLearn === 'function') renderLearn();
  });

  $$('input[name="readerReadingMode"]').forEach(input => input.addEventListener('change', event => {
    if(!event.target.checked) return;
    const mode = event.target.value;
    if(typeof setReaderModePreference === 'function') setReaderModePreference(mode);
    else if(typeof PuritanReaderPreferences !== 'undefined') PuritanReaderPreferences.writeMode(mode);
    syncSettingsUI();
  }));

  $$('input[name="readerHebrewDisplay"]').forEach(input => input.addEventListener('change', event => {
    if(!event.target.checked) return;
    if(typeof PuritanReaderPreferences !== 'undefined') PuritanReaderPreferences.writeHebrewDisplay(event.target.value);
    syncSettingsUI();
  }));

  $('#restartOnboarding')?.addEventListener('click', () => {
    if(typeof restartOnboardingFromSettings === 'function') restartOnboardingFromSettings();
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
    clearUserStorage();
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
      if(e.key==='l'||e.key==='L'){ e.preventDefault(); showView('learnView'); }
      else if(e.key==='r'||e.key==='R'){ e.preventDefault(); showView('readerView'); }
      else if(e.key==='p'||e.key==='P'){ e.preventDefault(); showView('progressView'); }
      else if(e.key==='s'||e.key==='S'){ e.preventDefault(); syncSettingsUI(); showView('settingsView'); }
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
  try { if('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(()=>{}); } catch(e){}
}
