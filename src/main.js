/* ============================================================
   THE PURITAN PARSER v3 MODULAR ENTRY POINT
   ============================================================ */

const PURITAN_PARSER_SCRIPTS = [
  'src/core/parser-core.js',
  'src/core/migrations/migrations.js',
  'src/core/migrations/migration-runner.js',
  'src/app-state.js',
  'src/ui/dom.js',
  'src/ui/toast.js',
  'src/models/word-entry.js',
  'src/models/gloss.js',
  'src/models/user-progress.js',
  'src/models/parse-data.js',
  'src/models/review-history.js',
  'src/models/preferences.js',
  'src/models/dashboard-stats.js',
  'src/core/storage/storage.js',
  'src/core/storage/vocab-storage.js',
  'src/core/storage/prefs-storage.js',
  'src/core/storage/dashboard-storage.js',
  'src/core/srs.js',
  'src/core/sample-data.js',
  'src/core/source-data/vocab-source.js',
  'src/core/source-data/parser-source.js',
  'src/core/content/content-metadata.js',
  'src/core/content/content-loader.js',
  'src/core/data-loader.js',
  'src/ui/theme.js',
  'src/core/filters.js',
  'src/core/study-entries.js',
  'src/core/router.js',
  'src/features/grammar/reference-data.js',
  'src/features/grammar/index.js',
  'src/features/vocab/index.js',
  'src/ui/modal.js',
  'src/features/flashcards/index.js',
  'src/features/parsing/index.js',
  'src/features/dashboard/index.js',
  'src/features/settings/index.js',
  'src/features/settings/events.js',
  'src/bootstrap.js'
];

function loadScriptSequentially(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Unable to load ${src}`));
    document.head.appendChild(script);
  });
}

PURITAN_PARSER_SCRIPTS.reduce(
  (chain, src) => chain.then(() => loadScriptSequentially(src)),
  Promise.resolve()
).catch(error => {
  console.error('The Puritan Parser failed to load.', error);
});
