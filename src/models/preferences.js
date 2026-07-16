/* ---------- Preferences model ---------- */
function createPreferences(attrs = {}){
  const preferences = Object.assign({}, DEFAULTS, attrs || {});
  // v1.2 studies vocabulary by lemma. Keeping every other stored preference and
  // all vocabulary records makes this a lossless migration from form mode.
  preferences.studyMode = 'lemma';
  return preferences;
}
if(typeof window !== 'undefined') window.createPreferences = createPreferences;
if(typeof module !== 'undefined') module.exports = { createPreferences };
