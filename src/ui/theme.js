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
const ACCENTS = [
  { name: 'Neutral Green', hex: '#4e8f6e' },
  { name: 'Slate', hex: '#475569' },
  { name: 'Ocean', hex: '#246b9c' },
  { name: 'Warm Sand', hex: '#b7791f' },
  { name: 'Deep Blue', hex: '#1e3a8a' },
  { name: 'Burgundy', hex: '#8a2b2b' }
];
function renderAccentButtons(){
  const el = $('#accentPicker'); if(!el) return;
  el.innerHTML='';
  ACCENTS.forEach(({ name, hex })=>{
    const b = document.createElement('button');
    b.className = 'color-swatch' + (state.prefs.accent===hex?' active':'');
    b.style.setProperty('--swatch-color', hex); b.title = name;
    b.innerHTML = `<span class="theme-preset-color" style="background:${hex}"></span><span>${name}</span>`;
    b.setAttribute('aria-label', `Use ${name} accent`);
    b.addEventListener('click', ()=>setAccent(hex));
    el.appendChild(b);
  });
}
