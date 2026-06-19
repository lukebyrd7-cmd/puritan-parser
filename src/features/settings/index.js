/* ---------- SETTINGS SYNC ---------- */
function syncSettingsUI(){
  const p = state.prefs;
  const sv = (id,v)=>{ const el=$(id); if(el) el.value=v; };
  const sc = (id,v)=>{ const el=$(id); if(el) el.checked=v; };
  sv('#initialEase', p.initialEase||2.5);
  sv('#minEase', p.minEase||1.3);
  sv('#dailyCap', p.dailyCap||200);
  sv('#newPerDay', p.newPerDay||20);
  sv('#fontSizeSlider', p.cardFontSize||54);
  sc('#useSM2', p.useSM2!==false);
  sc('#showPosHint', !!p.showPosHint);
  sc('#autoNextCard', !!p.autoNextCard);
  $('#fontSizeLabel').textContent = (p.cardFontSize||54)+'px';
  applyTheme(p.theme||'light');
  renderAccentButtons();
}
