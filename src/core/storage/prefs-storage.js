/* ---------- Preferences storage ---------- */
function getPreferences(){
  try {
    const raw = localStorage.getItem(LS_PREFS);
    return createPreferences(raw ? JSON.parse(raw) : {});
  } catch(e){ return createPreferences(); }
}
function savePreferences(prefs){ localStorage.setItem(LS_PREFS, JSON.stringify(createPreferences(prefs))); }
function getLastLanguage(){ return localStorage.getItem('pp_last_lang'); }
function saveLastLanguage(lang){ localStorage.setItem('pp_last_lang', lang); }
