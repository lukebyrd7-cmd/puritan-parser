# The Puritan Parser Architecture

Phase 1 split the previous monolithic `app.js` into small browser-loaded modules. Phase 2 adds a clearer data layer so static source data stays separate from user progress while preserving local-first behavior.

## Current app structure

- `index.html` owns the page markup and loads one modular entry point, `src/main.js`.
- `src/main.js` loads the Phase 1/2 modules in dependency order.
- `src/app-state.js` contains shared constants and application state only.
- `src/bootstrap.js` initializes preferences, data, events, language, and the default view.
- `src/models/` contains lightweight data-shape helpers.
- `src/core/storage/` is the only layer that should access `localStorage`.
- `src/core/source-data/` loads static source data such as vocabulary JSON and future source datasets.
- `src/core/` contains app logic that is not tied to a single screen.
- `src/ui/` contains reusable DOM/UI helpers.
- `src/features/` contains screen- or workflow-specific behavior.
- Static vocabulary data remains in `vocab_all.json` and related generated data files.
- PWA/service-worker behavior remains in `sw.js` and is registered from the event wiring module.

## Models

- `WordEntry` (`src/models/word-entry.js`): static vocabulary/source-data shape with `id`, `word`, `lemma`, `gloss`, `lang`/`language`, frequency, part of speech, parse data, and source metadata.
- `UserProgress` (`src/models/user-progress.js`): user-owned review state with repetitions, interval, ease, due date, history, parsing statistics, vocabulary statistics, and streak-ready fields.
- `ParseData` (`src/models/parse-data.js`): normalized morphology fields such as family, tense, voice, mood, case, number, gender, state, stem, and person.
- `ReviewHistory` (`src/models/review-history.js`): historical review entries with date, quality score, review type, and optional parsing result data.
- `Preferences` (`src/models/preferences.js`): app settings such as theme, accent color, flashcard size, and SRS options.
- `DashboardStats` (`src/models/dashboard-stats.js`): dashboard-owned stats such as streak, recent activity, and heatmap data.

`WordEntry + UserProgress = current user view`. Runtime screens may use composed view objects for compatibility, but persistence keeps static imported entries and progress records separate.

## Data layer responsibilities

### Source data

- `src/core/source-data/vocab-source.js`: loads static vocabulary JSON, falls back to sample data, and normalizes source entries into `WordEntry` objects.
- `src/core/source-data/parser-source.js`: reserved for parser/source-data helpers and future parser-source expansion.
- Future Bible text, grammar content, full glosses, or other static datasets belong in source-data modules or dedicated static files, not in user-progress storage.

### Storage

- `src/core/storage/storage.js`: storage facade used by the rest of the app.
- `src/core/storage/vocab-storage.js`: imported vocabulary persistence and user-progress persistence for vocabulary items.
- `src/core/storage/prefs-storage.js`: preferences and last-language persistence.
- `src/core/storage/dashboard-storage.js`: dashboard stats persistence.

The storage facade exposes APIs such as `getVocabulary()`, `saveVocabulary()`, `getUserProgress()`, `saveUserProgress()`, `getPreferences()`, `savePreferences()`, `getDashboard()`, and `saveDashboard()`. Today these APIs use `localStorage`; future backends should replace or extend this layer without requiring feature modules to know where data is stored.

## Module responsibilities

### Core

- `src/core/parser-core.js`: parse decoding, imported payload normalization, and vocabulary-item validation. This is also the module used by Node tests.
- `src/core/srs.js`: SRS defaults applied to composed item views and scheduling algorithms.
- `src/core/data-loader.js`: coordinates source-data loading with stored user progress and handles import/export workflows.
- `src/core/filters.js`: list filters, part-of-speech filters, parsing-filter option generation, parse summaries, and drillability checks.
- `src/core/sample-data.js`: fallback sample vocabulary used only when static JSON/local data is unavailable.

### UI

- `src/ui/dom.js`: shared DOM query helpers, HTML escaping, date/utility helpers, debounce, and basic toast DOM creation.
- `src/ui/toast.js`: reserved for future toast-specific expansion; current toast helper is still colocated with shared DOM utilities for minimal movement.
- `src/ui/theme.js`: theme selection, accent color computation, and accent picker rendering.
- `src/ui/modal.js`: word-detail modal rendering and close behavior.

### Features

- `src/features/vocab/index.js`: view switching, language switching, due badge, mastery display, and vocabulary-list rendering.
- `src/features/flashcards/index.js`: flashcard queue creation, card rendering, flip/rating behavior, swipe support, and review tracking.
- `src/features/parsing/index.js`: parsing pool creation, lemma picker, parsing sessions, answer checking, parsing explanations, and parsing-progress review updates.
- `src/features/dashboard/index.js`: dashboard metric rendering, sparkline, heatmap, upcoming due cards, and part-of-speech due breakdown.
- `src/features/settings/index.js`: settings UI synchronization.
- `src/features/settings/events.js`: event wiring for navigation, filters, flashcards, parsing, modal controls, settings, import/export, reset/clear, keyboard shortcuts, and service-worker registration.

## Planned feature areas

- Future Grammar work belongs in `src/features/grammar/` and should use the same model/source-data/storage boundaries.
- Future Bible work belongs in `src/features/bible/`. Bible text should not be added until that feature is explicitly requested and should be treated as static source data.
- Future Profile work belongs in `src/features/profile/`. Profile data should be user data behind the storage facade; do not add accounts/backends unless explicitly requested.

## Architecture rules

1. Static data must stay separate from user progress.
2. Features should use storage APIs instead of accessing `localStorage` directly.
3. Future Bible, Grammar, and Profile sections should use these same model/source-data/storage boundaries.
4. Avoid giant state objects and avoid putting new features back into one giant `app.js`.
5. Keep the app local-first unless explicitly asked to add accounts or a backend.
6. Prefer incremental moves over rewrites. Runtime composed item views are acceptable during this transition if persistence remains separated.

## Smoke-test checklist

- [ ] App loads.
- [ ] Word list renders.
- [ ] Greek/Hebrew switching works.
- [ ] Filters work.
- [ ] Flashcards start and complete.
- [ ] Parsing starts and completes.
- [ ] Parsing filters display.
- [ ] Dashboard renders.
- [ ] Settings open and save correctly.
- [ ] Import/export still works.
- [ ] No user progress is lost.
