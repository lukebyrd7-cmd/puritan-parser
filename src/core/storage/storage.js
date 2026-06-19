/* ---------- Storage adapter ---------- */
const StorageKeys = {
  vocab: { greek: LS_VOCAB_GREEK, hebrew: LS_VOCAB_HEBREW },
  prefs: LS_PREFS,
  dashboard: LS_DASHBOARD,
  lastLang: 'pp_last_lang'
};
const LocalStorageAdapter = {
  get(key){ return localStorage.getItem(key); },
  set(key, value){ localStorage.setItem(key, value); },
  remove(key){ localStorage.removeItem(key); }
};
let activeStorageAdapter = LocalStorageAdapter;
function readStorageJson(key, fallback = null){
  try {
    const raw = activeStorageAdapter.get(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch(e){ return fallback; }
}
function writeStorageJson(key, value){ activeStorageAdapter.set(key, JSON.stringify(value)); }
function removeStorageKey(key){ activeStorageAdapter.remove(key); }
function clearUserStorage(){
  [StorageKeys.vocab.greek, StorageKeys.vocab.hebrew, StorageKeys.prefs, StorageKeys.dashboard, StorageKeys.lastLang].forEach(removeStorageKey);
}
function getLastLanguage(){ return activeStorageAdapter.get(StorageKeys.lastLang); }
function saveLastLanguage(lang){ activeStorageAdapter.set(StorageKeys.lastLang, lang); }
