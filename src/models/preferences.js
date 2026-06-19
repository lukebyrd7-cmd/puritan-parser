/* ---------- Preferences model ---------- */
function createPreferences(input = {}){
  return Object.assign({}, DEFAULTS, input || {});
}
