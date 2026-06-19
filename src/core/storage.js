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
        history: it.history,
        parsing: it.parsing,
        vocab: it.vocab
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
        ['ease','interval','repetitions','due','history','parsing','vocab'].forEach(key=>{
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
