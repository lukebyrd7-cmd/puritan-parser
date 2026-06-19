/* ---------- Theme & Accent ---------- */
function setAccent(hex){
  document.documentElement.style.setProperty('--accent', hex);
  document.documentElement.style.setProperty('--accent-dark', adjustBrightness(hex, -20));
  document.documentElement.style.setProperty('--accent-glow', hexToRgba(hex, 0.15));
  state.prefs.accent = hex; savePrefs(); renderAccentButtons();
}
function hexToRgba(hex, alpha){
  const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${alpha})`;
}
function adjustBrightness(hex, amt){
  let r=parseInt(hex.slice(1,3),16)+amt, g=parseInt(hex.slice(3,5),16)+amt, b=parseInt(hex.slice(5,7),16)+amt;
  const c=v=>clamp(v,0,255).toString(16).padStart(2,'0');
  return `#${c(r)}${c(g)}${c(b)}`;
}
function applyTheme(theme){
  state.prefs.theme = theme;
  document.documentElement.classList.remove('dark','light');
  if(theme==='dark') document.documentElement.classList.add('dark');
  else if(theme==='light') document.documentElement.classList.add('light');
  else {
    if(window.matchMedia?.('(prefers-color-scheme:dark)').matches) document.documentElement.classList.add('dark');
    else document.documentElement.classList.add('light');
  }
  $$('.theme-btn').forEach(b=>b.classList.toggle('active', b.dataset.theme===theme));
  savePrefs();
}
const ACCENTS = ['#4e8f6e','#246b9c','#2a9d8f','#8a2b2b','#d97706','#475569','#6b21a8','#b91c1c','#0ea5a4','#ef4444','#f97316','#06b6d4'];
function renderAccentButtons(){
  const el = $('#accentPicker'); if(!el) return;
  el.innerHTML='';
  ACCENTS.forEach(hex=>{
    const b = document.createElement('button');
    b.className = 'color-swatch' + (state.prefs.accent===hex?' active':'');
    b.style.background = hex; b.title = hex;
    b.setAttribute('aria-label', `Set accent to ${hex}`);
    b.addEventListener('click', ()=>setAccent(hex));
    el.appendChild(b);
  });
}
