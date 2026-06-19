/* ---------- UserProgress model ---------- */
function createUserProgress(input = {}){
  return {
    id: input.id,
    ease: typeof input.ease === 'number' ? input.ease : state.prefs.initialEase || 2.5,
    interval: typeof input.interval === 'number' ? input.interval : 0,
    repetitions: typeof input.repetitions === 'number' ? input.repetitions : 0,
    due: input.due || todayISO(),
    history: Array.isArray(input.history) ? input.history : [],
    parsing: input.parsing || { attempts: 0, correct: 0, streak: 0, misses: {}, todayMisses: [] },
    vocab: input.vocab || { attempts: 0, correct: 0 },
    streak: input.streak || 0
  };
}

function hasUserProgress(item){
  const baselineEase = state.prefs.initialEase || 2.5;
  return (item.repetitions||0)>0 || (item.interval||0)>0 || (item.history||[]).length || item.due!==todayISO() || Math.abs((item.ease||baselineEase)-baselineEase)>0.001;
}
