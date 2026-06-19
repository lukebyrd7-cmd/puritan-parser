# The Puritan Parser Architecture

Phase 2 builds a clean data layer on top of the Phase 1 modular structure while preserving the local-first, static-app behavior.

## Current app structure

- `index.html` owns the page markup and loads one modular entry point, `src/main.js`.
- `src/main.js` loads the Phase 1 modules plus the Phase 2 data-layer modules in dependency order.
- `src/app-state.js` contains shared constants and application state only.
- `src/bootstrap.js` initializes preferences, data, events, language, and the default view.
- `src/models/` contains lightweight plain-object model helpers for source data, user progress, preferences, review history, parse metadata, and dashboard statistics.
- `src/core/storage/` contains the persistence abstraction. Current persistence is localStorage, but feature modules should only use storage APIs.
- `src/core/source-data/` contains helpers for static vocabulary and parser source data. Future Bible, grammar, and gloss expansion belongs in source-data modules rather than user-progress storage.
- `src/core/` contains app logic that is not tied to a single screen.
- `src/ui/` contains reusable DOM/UI helpers.
- `src/features/` contains screen- or workflow-specific behavior.
- Static vocabulary data remains in `vocab_all.json` and related generated data files.
- PWA/service-worker behavior remains in `sw.js` and is registered from the event wiring module.

## Data models

All models are intentionally lightweight factory helpers that return plain objects. They are easy to extend without forcing a class hierarchy into feature code.

- `WordEntry`: represents static/source vocabulary data such as word, lemma, gloss, part of speech, parse code, frequency, language, and source metadata.
- `UserProgress`: represents review state for a word, including due date, ease, interval, repetitions, review history, vocab performance, and parsing performance. It includes a `profileId` field so future multiple-profile support can be added without mixing profile data into source vocabulary.
- `ParseData`: represents parser metadata derived from a parse code, language, family, label, and detail list.
- `ReviewHistory`: represents an individual review event, including date, quality, review type, and parsing-specific flags.
- `Preferences`: represents user-configurable settings and is merged with defaults before use.
- `DashboardStats`: represents aggregate local study metrics such as streak, last studied date, recent review qualities, and heatmap counts.

## Static data vs. user data

Static/source data and user data must remain separate.

Static data includes:

- Vocabulary source JSON.
- Glosses.
- Parsing data.
- Future Bible data.
- Future grammar data.

User data includes:

- SRS progress.
- Review history.
- Parsing performance.
- Preferences.
- Dashboard stats.
- Future profile information.

`WordEntry` should describe source data. `UserProgress`, `ReviewHistory`, `Preferences`, and `DashboardStats` should describe local user state.

## Module responsibilities

### Models

- `src/models/word-entry.js`: `WordEntry` factory for source vocabulary records.
- `src/models/user-progress.js`: `UserProgress` factory for per-word review state.
- `src/models/parse-data.js`: `ParseData` factory for parser metadata.
- `src/models/review-history.js`: `ReviewHistory` factory for individual review events.
- `src/models/preferences.js`: `Preferences` factory that merges saved preferences with defaults.
- `src/models/dashboard-stats.js`: `DashboardStats` factory for aggregate study metrics.

### Core data layer

- `src/core/storage/storage.js`: storage adapter, storage keys, JSON helpers, last-language persistence, and full local user-data clearing.
- `src/core/storage/vocab-storage.js`: vocabulary progress APIs, including `getUserProgress()`, `saveUserProgress()`, `saveVocab()`, and `applyStoredVocab()`.
- `src/core/storage/prefs-storage.js`: preference APIs, including `getPreferences()`, `savePreferences()`, `loadPrefs()`, and `savePrefs()`.
- `src/core/storage/dashboard-storage.js`: dashboard APIs, including `getDashboard()`, `saveDashboardStats()`, `loadDashboard()`, and `saveDashboard()`.
- `src/core/source-data/vocab-source.js`: static vocabulary source loading and source-word normalization.
- `src/core/source-data/parser-source.js`: parser source helper for decoded parse metadata.

### Core app logic

- `src/core/parser-core.js`: parse decoding, imported payload normalization, and vocabulary-item validation. This is also the module used by Node tests.
- `src/core/srs.js`: SRS defaults applied to items and scheduling algorithms.
- `src/core/data-loader.js`: orchestration of source-data loading, fallback sample loading, and import/export handling.
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

- Future Grammar work belongs in `src/features/grammar/` and should build on `ParseData`, `WordEntry`, and source-data helpers rather than mixing grammar source data into user progress.
- Future Bible work belongs in `src/features/bible/` and should use source-data helpers for static text. Bible text should not be added until that feature is explicitly requested.
- Future Profile work belongs in `src/features/profile/` and should build on profile-aware user models such as `UserProgress`. Do not add account/backend behavior unless explicitly requested.

## Architecture rules

1. Static data must remain separate from user progress.
2. Feature modules should access persistence only through storage APIs; direct localStorage access belongs only inside the storage adapter.
3. Bible, Grammar, and Profile features should build on these models and data-layer boundaries.
4. Avoid giant state objects. Prefer small model helpers, focused storage APIs, and feature-local state where possible.
5. Preserve local-first behavior unless explicitly asked to add a backend. Import/export and localStorage remain the persistence model for this phase.
6. Avoid putting new features back into one giant `app.js`. Add feature code under `src/features/<feature>/` and shared behavior under `src/core/`, `src/models/`, or `src/ui/`.
7. Prefer incremental moves over rewrites. The modules intentionally retain the existing function names and browser-global loading pattern behind `src/main.js` to keep review simple and behavior stable.

## Smoke-test checklist

- [ ] App loads.
- [ ] Greek/Hebrew switch works.
- [ ] Word list renders.
- [ ] Filters work.
- [ ] Flashcards start and complete.
- [ ] Parsing starts and completes.
- [ ] Parsing filters display.
- [ ] Dashboard renders.
- [ ] Settings open and save.
- [ ] Import/export still works.
- [ ] Existing progress remains available through the storage layer.
