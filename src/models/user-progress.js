/* ---------- UserProgress model ---------- */
function createUserProgress(attrs = {}){
  return {
    profileId: attrs.profileId || 'default',
    id: attrs.id || attrs.wordId || '',
    wordId: attrs.wordId || attrs.id || '',
    ease: attrs.ease,
    interval: attrs.interval || 0,
    repetitions: attrs.repetitions || 0,
    due: attrs.due || todayISO(),
    history: Array.isArray(attrs.history) ? attrs.history : [],
    parsing: attrs.parsing || undefined,
    vocab: attrs.vocab || undefined,
    customGloss: attrs.customGloss || undefined
  };
}
