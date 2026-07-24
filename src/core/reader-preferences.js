(function(root, factory){
  const api = factory(root);
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
  if(root) root.PuritanReaderPreferences = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(root){
  const storageKey = 'pp_reader_location';
  const modes = ['chapter', 'continuous'];

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

  return { storageKey, modes, normalizeMode, readMode, writeMode };
});
