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
    updatePosOptions();
    updateParsingFilterOptions();
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
