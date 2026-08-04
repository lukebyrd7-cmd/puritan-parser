/* ---------- Storage adapter ---------- */
const StorageKeys = {
  vocab: { greek: LS_VOCAB_GREEK, hebrew: LS_VOCAB_HEBREW },
  vocabLearning: 'pp_vocab_learning',
  studySets: 'pp_study_sets',
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
function storageKindForKey(key){
  if(key === StorageKeys.prefs) return 'prefs';
  if(key === StorageKeys.dashboard) return 'dashboard';
  if(key === StorageKeys.vocab.greek || key === StorageKeys.vocab.hebrew) return 'vocab';
  return null;
}
function migrateStoredJson(key, fallback = null){
  const kind = storageKindForKey(key);
  const raw = readStorageJson(key, fallback);
  if(!kind || typeof PuritanParserMigrationRunner === 'undefined') return raw;
  const migrated = PuritanParserMigrationRunner.migratePayload(raw, kind);
  writeStorageJson(key, migrated);
  return PuritanParserMigrationRunner.unwrapPersistedData(migrated, kind);
}
function writeStorageJson(key, value){ activeStorageAdapter.set(key, JSON.stringify(value)); }
function writeVersionedStorageJson(key, value){
  const kind = storageKindForKey(key);
  if(!kind || typeof PuritanParserMigrationRunner === 'undefined') return writeStorageJson(key, value);
  writeStorageJson(key, PuritanParserMigrationRunner.migratePayload(value, kind));
}
function removeStorageKey(key){ activeStorageAdapter.remove(key); }
function clearUserStorage(){
  [
    StorageKeys.vocab.greek,
    StorageKeys.vocab.hebrew,
    StorageKeys.vocabLearning,
    StorageKeys.studySets,
    StorageKeys.prefs,
    StorageKeys.dashboard,
    StorageKeys.lastLang,
    'pp_onboarding_completed',
    'pp_onboarding_profile',
    'pp_onboarding_start_here',
    'pp_learn_review_targets',
    'pp_learn_practice_srs_preference',
    'pp_learn_active_paths',
    'pp_recognition_history',
    'pp_learning_practice_profiles',
    'pp_learning_practice_sessions',
    'pp_learning_attempts',
    'pp_needs_attention',
    'pp_learn_maintenance_srs',
    'pp_learning_data_revision',
    'pp_reader_location',
    'pp_reader_adaptive_settings'
  ].forEach(removeStorageKey);
}
function getLastLanguage(){ return activeStorageAdapter.get(StorageKeys.lastLang); }
function saveLastLanguage(lang){ activeStorageAdapter.set(StorageKeys.lastLang, lang); }
