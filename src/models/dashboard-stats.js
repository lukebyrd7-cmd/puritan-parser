/* ---------- DashboardStats model ---------- */
function createDashboardStats(input = {}){
  return Object.assign({ streak: 0, lastStudied: '', recent: [], heatmap: {} }, input || {});
}
