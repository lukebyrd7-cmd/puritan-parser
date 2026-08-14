/* ---------- Utilities ---------- */
const $ = s => document.querySelector(s);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
const escHtml = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
function todayISO(offsetDays=0){
  if(typeof PuritanCalendarDate !== 'undefined') return PuritanCalendarDate.todayISO(offsetDays);
  const date = new Date();
  date.setDate(date.getDate() + Number(offsetDays || 0));
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
function uid(){ return Math.random().toString(36).slice(2,12); }
function shuffle(a){ return a.slice().sort(()=>Math.random()-0.5); }
function debounce(fn,w=200){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a),w); }; }
function toast(msg, type='', duration=3000){
  const c = $('#toastContainer');
  const el = document.createElement('div');
  el.className = `toast${type?' '+type:''}`;
  el.textContent = msg;
  c.appendChild(el);
  setTimeout(()=>{ el.remove(); }, duration);
}
