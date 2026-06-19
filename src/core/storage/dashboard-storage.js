/* ---------- Dashboard storage ---------- */
function getDashboard(){ return createDashboardStats(readStorageJson(StorageKeys.dashboard, {})); }
function saveDashboardStats(dashboard){ writeStorageJson(StorageKeys.dashboard, createDashboardStats(dashboard)); }
function loadDashboard(){ state.dashboard = getDashboard(); }
function saveDashboard(){ saveDashboardStats(state.dashboard); }
