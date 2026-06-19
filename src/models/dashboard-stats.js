/* ---------- DashboardStats model ---------- */
function createDashboardStats(attrs = {}){
  return {
    profileId: attrs.profileId || 'default',
    streak: Number(attrs.streak || 0),
    lastStudied: attrs.lastStudied || '',
    recent: Array.isArray(attrs.recent) ? attrs.recent : [],
    heatmap: attrs.heatmap || {}
  };
}
