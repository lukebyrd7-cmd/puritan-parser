/* ---------- SRS ---------- */
function ensureSRS(item){
  if(typeof item.ease !== 'number') item.ease = state.prefs.initialEase || 2.5;
  if(typeof item.interval !== 'number') item.interval = 0;
  if(typeof item.repetitions !== 'number') item.repetitions = 0;
  if(!item.due) item.due = todayISO();
  if(!Array.isArray(item.history)) item.history = [];
  if(!item.parsing) item.parsing = { attempts: 0, correct: 0, streak: 0, misses: {}, todayMisses: [] };
  if(!item.vocab) item.vocab = { attempts: 0, correct: 0 };
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
