/* ---------- Local calendar-date helpers ---------- */
(function(root, factory){
  const api = factory();
  if(typeof module === 'object' && module.exports) module.exports = api;
  root.PuritanCalendarDate = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(){
  function pad(value){ return String(value).padStart(2, '0'); }
  function localDateISO(date = new Date()){
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }
  function parseDateISO(value){
    const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if(!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    if(date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
    return { year, month, day };
  }
  function shiftISODate(value, days = 0){
    const parsed = parseDateISO(value) || parseDateISO(localDateISO());
    const date = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day + Number(days || 0)));
    return date.toISOString().slice(0, 10);
  }
  function todayISO(offsetDays = 0, date = new Date()){
    return shiftISODate(localDateISO(date), offsetDays);
  }
  return { localDateISO, parseDateISO, shiftISODate, todayISO };
});
