/* ---------- Vocabulary and progress storage ---------- */
const LS_IMPORTED_GREEK = 'pp_imported_vocab_greek';
const LS_IMPORTED_HEBREW = 'pp_imported_vocab_hebrew';
function vocabProgressKey(lang){ return lang==='greek'?LS_VOCAB_GREEK:LS_VOCAB_HEBREW; }
function importedVocabKey(lang){ return lang==='greek'?LS_IMPORTED_GREEK:LS_IMPORTED_HEBREW; }
function readJsonArray(key){
  try { const raw = localStorage.getItem(key); const parsed = raw ? JSON.parse(raw) : []; return Array.isArray(parsed) ? parsed : []; } catch(e){ return []; }
}
function getImportedVocabulary(lang){
  const imported = readJsonArray(importedVocabKey(lang));
  const legacyImported = readJsonArray(vocabProgressKey(lang)).filter(item => item?.source === 'Imported' && item.word && item.gloss);
  const map = new Map();
  imported.concat(legacyImported).forEach(item => {
    const entry = createWordEntry(Object.assign({ lang, source:'Imported' }, item));
    map.set(entry.id || `${entry.word}:${entry.lemma}`, entry);
  });
  return Array.from(map.values());
}
function getUserProgress(lang){
  const progress = readJsonArray(vocabProgressKey(lang));
  const map = new Map();
  progress.forEach(saved => {
    if(!saved || typeof saved !== 'object') return;
    const id = saved.id;
    if(!id) return;
    map.set(id, createUserProgress(saved));
  });
  return map;
}
function saveUserProgress(lang, list){
  const compact = (list||[]).filter(it=>hasUserProgress(it) || it.source==='Imported').map(it=>{
    const progress = createUserProgress(it);
    return {
      id: it.id,
      ease: progress.ease,
      interval: progress.interval,
      repetitions: progress.repetitions,
      due: progress.due,
      history: progress.history,
      parsing: progress.parsing,
      vocab: progress.vocab
    };
  });
  localStorage.setItem(vocabProgressKey(lang), JSON.stringify(compact));
}
function saveImportedVocabulary(lang, list){
  const imported = (list||[]).filter(it=>it.source==='Imported').map(it=>createWordEntry(it));
  localStorage.setItem(importedVocabKey(lang), JSON.stringify(imported));
}
function getVocabulary(lang){ return { imported: getImportedVocabulary(lang), progress: getUserProgress(lang) }; }
function saveVocabulary(lang, list){ saveImportedVocabulary(lang, list); saveUserProgress(lang, list); }
