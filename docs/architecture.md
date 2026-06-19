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

## Phase 3/4 infrastructure

### Routing system

`src/core/router.js` registers all app routes in one `ROUTES` map. Navigation should call `navigateTo('/route')` or register a new route in that map rather than manually hiding and showing screens. The router maps browser paths to view IDs, supports `history.pushState`, responds to `popstate`, and normalizes unknown deep links back to `/list`.

Current routes are:

- `/list`
- `/flashcards`
- `/parsing`
- `/dashboard`
- `/settings`
- `/grammar`
- `/bible`
- `/profile`

Grammar, Bible, and Profile are placeholders only. They reserve routing and view architecture for future work without adding content, source text, login, cloud sync, or profile behavior.

### Schema versioning

All persisted user-data records are now versioned with `schemaVersion`. Versioned envelopes keep the actual payload under a named key:

```json
{ "schemaVersion": 1, "preferences": {} }
{ "schemaVersion": 1, "progress": [] }
```

The migration modules are:

- `src/core/migrations/migrations.js`: declares `CURRENT_SCHEMA_VERSION`, payload keys, and version-specific migration functions.
- `src/core/migrations/migration-runner.js`: wraps unversioned legacy payloads as schema version `0`, applies migrations in order, and unwraps migrated payloads for app code.

The storage layer runs migrations on reads and writes the migrated envelope back to localStorage. Missing schema versions must be treated as version `0`; old user data must never be wiped just because a migration exists.

### Migration process

When persisted data changes shape:

1. Increment `CURRENT_SCHEMA_VERSION`.
2. Add a new idempotent migration function keyed by the new version number.
3. Preserve unknown fields unless there is a deliberate, documented reason to transform them.
4. Keep migrations safe to run more than once.
5. Add tests that cover legacy input and the new versioned output.

Future profile data, achievements, notes, parsing statistics, and Bible-related settings should be introduced through migrations when they affect persisted user data.

### Testing structure

The Node test suite uses `node --test` and covers infrastructure and core behavior without requiring a browser build step:

- Parser tests validate Greek and Hebrew parse-code decoding plus import validation.
- Filter tests validate frequency, due, part-of-speech, and parsing-specific filters.
- Storage/migration tests validate load/save behavior and legacy-data migration.
- SRS tests validate interval and ease changes.
- Routing tests validate route-to-view selection and browser-history path changes.
- Import/export tests validate payload round trips through the normalizer.
- Parsing UI tests load browser modules in a VM and exercise parsing helpers.

Infrastructure changes should include tests in `tests/`, and smoke checks should continue to cover app load, Greek/Hebrew switching, word list rendering, flashcards, parsing, dashboard, settings save, and import/export behavior.

## Content/Data Pipeline

Phase 5 prepares the app for content-heavy features without shipping large datasets or new feature behavior.

### Content directories

Future static content has a stable home under `data/`:

- `data/vocab/` for expanded vocabulary source files when they outgrow the current seed file.
- `data/glosses/` for lexicon/gloss datasets.
- `data/grammar/` for grammar indexes and lesson payloads.
- `data/bible/` for licensed Greek and Hebrew Bible book files.
- `data/indexes/` for vocabulary, gloss, grammar, and Bible search indexes.
- `data/metadata/` for small manifests and attribution metadata that are safe to load with the app shell.

Shared helpers live in `src/core/content/`. `content-metadata.js` normalizes and validates source, license, attribution, version, notes, and load-strategy fields. `content-loader.js` resolves safe relative paths and exposes lazy helpers such as `contentLoader.loadById()`, `loadGlossData()`, `loadGrammarIndex()`, `loadBibleBook()`, `loadSearchIndex()`, and `getContentMetadata()`.

### Content manifest

`data/metadata/content-manifest.json` describes available or planned content files. It stores metadata only; it must not embed Bible text, grammar lessons, or large gloss records. Each item should include:

- `id`
- `language`
- `type`
- `path`
- `version`
- `source` and optional `sourceUrl`
- `license`
- `attribution`
- `loadStrategy`

The manifest may include placeholders for future imports, but a placeholder is not permission to add content. Before importing a real dataset, verify the source, license, attribution text, and version/date.

### Lazy-loading rule

Large content must not be loaded at startup and must not be added to `src/main.js` or the service-worker precache list. Bible books, grammar lessons, expanded glosses, and search indexes should be listed in the manifest and loaded only when a feature requests them through `contentLoader.loadById()` or one of the domain-specific helper methods.

### Attribution and copyright rules

Every imported content file should have a manifest record that identifies its source name, source URL when available, license, attribution text, version/date, and notes. Do not add copyrighted Bible text, lexicon data, or grammar material without permission or a compatible license. Source text and derived search indexes should carry enough IDs to trace results back to their manifest records.

### Search index plan

Search indexes belong in `data/indexes/` and should be split by domain when they become large:

- vocabulary search
- gloss search
- grammar search
- Bible search

The expected index shape is documented in `data/indexes/README.md`. Index entries should remain compact, reference source content IDs, and be lazy-loaded through the content loader instead of bundled into the app shell.

### Offline/PWA caching plan

`sw.js` precaches the application shell and small metadata such as the content manifest. It should not precache large Bible, grammar, gloss, or search-index files. JSON files use network-first runtime caching, so future large content is cached only after a user-facing feature requests it.

## Foundation Complete

The app shell cache in `sw.js` must include `index.html`, styling, icons, the small content manifest, and every browser startup module listed by `src/main.js`, including migrations, router, model helpers, content helpers, and storage modules. Large JSON content such as expanded vocabulary, future Bible books, grammar payloads, gloss datasets, and search indexes must stay out of the install precache.

Static hosts must rewrite deep links back to `index.html` so browser-history routes such as `/parsing`, `/grammar`, and `/profile` refresh without server 404s. Vercel uses `vercel.json` for this catch-all app-shell rewrite while the client router preserves `pushState`, `popstate`, and back-button behavior.

JSON content continues to use service-worker network-first runtime caching. This keeps startup metadata small, lets requested JSON work offline after it has been fetched once, and prevents future large content files from being cached during service-worker installation.

### Import/export future-proofing

Import/export currently focuses on vocabulary records. Future persisted exports should remain local-first and versioned through the storage/migration layer. The export envelope can grow to include user progress, preferences, notes, custom glosses, and profile data, but static source content should stay separate from user data and should not be duplicated into user backups unless explicitly required.

