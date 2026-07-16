/* ---------- SETTINGS SYNC ---------- */
function syncSettingsUI(){
  const p = state.prefs;
  const sv = (id,v)=>{ const el=$(id); if(el) el.value=v; };
  const sc = (id,v)=>{ const el=$(id); if(el) el.checked=v; };
  sv('#srsPreset', p.srsPreset || inferSrsPreset(p));
  if(typeof learnReviewTargets === 'function'){
    const targets = learnReviewTargets();
    ['greek','hebrew'].forEach(language => {
      sv(`#${language}ReviewTargetPreset`, targets[language]?.preset || 'standard');
      sv(`#${language}ReviewTargetCustom`, targets[language]?.dailyTarget || 30);
    });
  }
  if(typeof learnPracticeSrsPreference === 'function') sv('#practiceSrsPreference', learnPracticeSrsPreference());
  sv('#fontSizeSlider', p.cardFontSize||54);
  sc('#showPosHint', !!p.showPosHint);
  sc('#autoNextCard', !!p.autoNextCard);
  const customAccent = $('#customAccent');
  if(customAccent && /^#[0-9a-f]{6}$/i.test(p.accent || '')) customAccent.value = p.accent;
  $('#fontSizeLabel').textContent = (p.cardFontSize||54)+'px';
  applyTheme(p.theme||'light');
  renderAccentButtons();
}
const SRS_PRESETS = {
  gentle: { initialEase: 2.6, minEase: 1.4, dailyCap: 100, newPerDay: 10, useSM2: true },
  balanced: { initialEase: 2.5, minEase: 1.3, dailyCap: 200, newPerDay: 20, useSM2: true },
  intensive: { initialEase: 2.4, minEase: 1.3, dailyCap: 300, newPerDay: 30, useSM2: true }
};
function inferSrsPreset(prefs = {}){
  if(SRS_PRESETS[prefs.srsPreset]) return prefs.srsPreset;
  const score = preset => Math.abs((Number(prefs.dailyCap) || 200) - SRS_PRESETS[preset].dailyCap) + Math.abs((Number(prefs.newPerDay) || 20) - SRS_PRESETS[preset].newPerDay) * 5;
  return Object.keys(SRS_PRESETS).sort((a, b) => score(a) - score(b))[0];
}
function applySrsPreset(preset){
  const name = SRS_PRESETS[preset] ? preset : 'balanced';
  Object.assign(state.prefs, SRS_PRESETS[name], { srsPreset: name, studyMode: 'lemma' });
  savePrefs();
  return state.prefs;
}
if(typeof window !== 'undefined') Object.assign(window, { SRS_PRESETS, inferSrsPreset, applySrsPreset });
if(typeof module !== 'undefined') module.exports = { SRS_PRESETS, inferSrsPreset, applySrsPreset };
