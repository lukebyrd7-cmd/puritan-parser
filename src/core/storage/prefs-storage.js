/* ---------- Preferences storage ---------- */
function getPreferences(){ return createPreferences(migrateStoredJson(StorageKeys.prefs, {})); }
function savePreferences(prefs){ writeVersionedStorageJson(StorageKeys.prefs, createPreferences(prefs)); }
function loadPrefs(){ state.prefs = getPreferences(); }
function savePrefs(){ savePreferences(state.prefs); }
