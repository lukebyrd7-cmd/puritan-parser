(function(root, factory){
  const api = factory(root);
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
  if(root) root.PuritanReaderPreferences = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(root){
  const storageKey = 'pp_reader_location';
  const settingsStorageKey = 'pp_reader_adaptive_settings';
  const modes = ['chapter', 'continuous'];
  const hebrewDisplays = ['standard', 'interlinear'];
  const locationSchemaVersion = 2;
  const languages = ['greek', 'hebrew'];
  const locationDefaults = {
    greek: { language: 'greek', book: 'matthew', chapter: 1, verse: '', mode: 'continuous', anchorOffset: 0, scrollTop: 0, scrollY: 0, updatedAt: '' },
    hebrew: { language: 'hebrew', book: 'jonah', chapter: 1, verse: '', mode: 'continuous', anchorOffset: 0, scrollTop: 0, scrollY: 0, updatedAt: '' }
  };

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

  function normalizeLanguage(value){ return value === 'hebrew' ? 'hebrew' : 'greek'; }
  function normalizeLocation(value = {}, language = value?.language){
    const lang = normalizeLanguage(language);
    const fallback = locationDefaults[lang];
    const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    return {
      language: lang,
      book: String(source.book || fallback.book).trim() || fallback.book,
      chapter: Math.max(1, Number(source.chapter) || 1),
      verse: String(source.verse || source.anchorVerse || '').trim(),
      mode: normalizeMode(source.mode),
      anchorOffset: Number.isFinite(Number(source.anchorOffset)) ? Number(source.anchorOffset) : 0,
      scrollTop: Math.max(0, Number(source.scrollTop) || 0),
      scrollY: Math.max(0, Number(source.scrollY) || 0),
      updatedAt: String(source.updatedAt || '').trim()
    };
  }
  function normalizeLocationRecord(value){
    const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    const activeLanguage = normalizeLanguage(source.activeLanguage || source.language);
    const legacy = source.locations ? null : source;
    return {
      schemaVersion: locationSchemaVersion,
      activeLanguage,
      locations: Object.fromEntries(languages.map(language => [language, normalizeLocation(source.locations?.[language] || (legacy && activeLanguage === language ? legacy : {}), language)]))
    };
  }
  function readLocationRecord(){ return normalizeLocationRecord(readLocation()); }
  function readLanguageLocation(language){
    const record = readLocationRecord();
    const lang = normalizeLanguage(language || record.activeLanguage);
    return { ...record.locations[lang] };
  }
  function writeLanguageLocation(location, options = {}){
    const current = readLocationRecord();
    const language = normalizeLanguage(location?.language || options.language || current.activeLanguage);
    const normalized = normalizeLocation({ ...current.locations[language], ...location, updatedAt: location?.updatedAt || new Date().toISOString() }, language);
    const record = { ...current, activeLanguage: options.activate === false ? current.activeLanguage : language, locations: { ...current.locations, [language]: normalized } };
    writeLocation(record);
    return normalized;
  }
  function importLocation(value, options = {}){
    const current = readLocationRecord();
    const incoming = normalizeLocationRecord(value);
    const hasLocations = Boolean(value?.locations);
    const merged = { ...current, activeLanguage: incoming.activeLanguage, locations: { ...current.locations } };
    if(hasLocations) languages.forEach(language => { merged.locations[language] = incoming.locations[language]; });
    else {
      const language = normalizeLanguage(value?.language || incoming.activeLanguage);
      merged.locations[language] = incoming.locations[language];
      if(options.replaceAll === true) merged.locations[languages.find(item => item !== language)] = normalizeLocation({}, languages.find(item => item !== language));
    }
    writeLocation(merged);
    return merged;
  }

  function readMode(){
    return readLanguageLocation().mode;
  }

  function writeMode(value){
    const mode = normalizeMode(value);
    writeLanguageLocation({ ...readLanguageLocation(), mode });
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
    locationSchemaVersion,
    locationDefaults,
    normalizeMode,
    normalizeLocation,
    normalizeLocationRecord,
    readLocationRecord,
    readLanguageLocation,
    writeLanguageLocation,
    importLocation,
    normalizeHebrewDisplay,
    readMode,
    writeMode,
    readHebrewDisplay,
    writeHebrewDisplay
  };
});
