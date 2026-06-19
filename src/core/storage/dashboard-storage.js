/* ---------- Dashboard storage ---------- */
function getDashboard(){ return createDashboardStats(migrateStoredJson(StorageKeys.dashboard, {})); }
function saveDashboardStats(dashboard){ writeVersionedStorageJson(StorageKeys.dashboard, createDashboardStats(dashboard)); }
function loadDashboard(){ state.dashboard = getDashboard(); }
function saveDashboard(){ saveDashboardStats(state.dashboard); }
