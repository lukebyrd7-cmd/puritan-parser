/* ---------- Dashboard storage ---------- */
function getDashboard(){
  try { const r=localStorage.getItem(LS_DASHBOARD); return createDashboardStats(r ? JSON.parse(r) : {}); } catch(e){ return createDashboardStats(); }
}
function saveDashboardStats(dashboard){ localStorage.setItem(LS_DASHBOARD, JSON.stringify(createDashboardStats(dashboard))); }
