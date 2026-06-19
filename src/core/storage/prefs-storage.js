/* ---------- Preferences storage ---------- */
function getPreferences(){ return createPreferences(readStorageJson(StorageKeys.prefs, {})); }
function savePreferences(prefs){ writeStorageJson(StorageKeys.prefs, createPreferences(prefs)); }
function loadPrefs(){ state.prefs = getPreferences(); }
function savePrefs(){ savePreferences(state.prefs); }
