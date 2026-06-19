/* ---------- Preferences model ---------- */
function createPreferences(attrs = {}){
  return Object.assign({}, DEFAULTS, attrs || {});
}
