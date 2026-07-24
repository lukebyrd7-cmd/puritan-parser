(function(root, factory){
  const api = factory(root);
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
  if(root) root.PuritanReaderPreferences = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(root){
  const storageKey = 'pp_reader_location';
  const settingsStorageKey = 'pp_reader_adaptive_settings';
  const modes = ['chapter', 'continuous'];
  const hebrewDisplays = ['standard', 'interlinear'];

  function normalizeMode(value){
    return modes.includes(value) ? value : 'continuous';
  }

  function readLocation(){
    if(typeof root?.readStorageJson === 'function') return root.readStorageJson(storageKey, null);
    try {
      const raw = root?.localStorage?.getItem?.(storageKey);
      return raw ? JSON.parse(raw) : null;
    } catch(error){
      return null;
    }
  }

  function writeLocation(location){
    if(typeof root?.writeStorageJson === 'function') root.writeStorageJson(storageKey, location);
    else root?.localStorage?.setItem?.(storageKey, JSON.stringify(location));
    return location;
  }

  function readMode(){
    return normalizeMode(readLocation()?.mode);
  }

  function writeMode(value){
    const mode = normalizeMode(value);
    const stored = readLocation();
    const location = stored && typeof stored === 'object' && !Array.isArray(stored) ? { ...stored, mode } : { mode };
    writeLocation(location);
    return mode;
  }

  function normalizeHebrewDisplay(value){
    return hebrewDisplays.includes(value) ? value : 'standard';
  }

  function readSettings(){
    if(typeof root?.readStorageJson === 'function') return root.readStorageJson(settingsStorageKey, null);
    try {
      const raw = root?.localStorage?.getItem?.(settingsStorageKey);
      return raw ? JSON.parse(raw) : null;
    } catch(error){
      return null;
    }
  }

  function writeSettings(settings){
    if(typeof root?.writeStorageJson === 'function') root.writeStorageJson(settingsStorageKey, settings);
    else root?.localStorage?.setItem?.(settingsStorageKey, JSON.stringify(settings));
    return settings;
  }

  function readHebrewDisplay(){
    const settings = readSettings();
    return normalizeHebrewDisplay(settings?.hebrew?.hebrewDisplay);
  }

  function writeHebrewDisplay(value){
    const hebrewDisplay = normalizeHebrewDisplay(value);
    const stored = readSettings();
    const settings = stored && typeof stored === 'object' && !Array.isArray(stored) ? { ...stored } : {};
    settings.hebrew = {
      ...(settings.hebrew && typeof settings.hebrew === 'object' && !Array.isArray(settings.hebrew) ? settings.hebrew : {}),
      hebrewDisplay
    };
    writeSettings(settings);
    return hebrewDisplay;
  }

  return {
    storageKey,
    settingsStorageKey,
    modes,
    hebrewDisplays,
    normalizeMode,
    normalizeHebrewDisplay,
    readMode,
    writeMode,
    readHebrewDisplay,
    writeHebrewDisplay
  };
});
