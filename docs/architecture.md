# Architecture

Puritan Parser is a local-first, static Biblical Greek and Hebrew reading app. Its architecture should stay boring in the best sense: clear module boundaries, repeatable data generation, shared infrastructure, and minimal runtime magic.

This document records not only what exists, but why it exists.

## Architectural Principles

### Reading-first architecture

Architecture exists to support reading Scripture in the original languages. New features should shorten the path from a user's question back to the biblical text.

### Local first

User progress, preferences, review history, and future personal data belong to the user. Browser storage and export remain the default persistence model unless a backend is explicitly requested.

### Static data and user data stay separate

Vocabulary source data, glosses, parsing data, grammar reference data, and Reader chapter files are source content. Review progress, preferences, custom glosses, and future notes are user data. Mixing these makes migrations, exports, and data refreshes brittle.

### Shared before separate

Whenever possible, prefer:

- One Reader
- One Word Page model
- One popup pattern
- One navigation model
- One search philosophy
- One generated-data pipeline shape

Introduce language-specific implementations only when Greek and Hebrew genuinely need different behavior.

### Incremental over sweeping

Prefer incremental improvements that preserve behavior. Large rewrites should be rare and justified by a clear architectural simplification.

## Word Pages

Word Pages exist because routing-heavy implementations proved too fragile for the desired workflow. The successful model is view-first:

- the router shows the `wordPageView`;
- Reader or vocabulary interactions place the selected word information into app state;
- the Word Page renders from that state;
- "Read in Context" returns users to the Reader location.

This keeps Word Pages aligned with the rest of the app's screen model instead of creating a separate route-driven mini-application.

The purpose of a Word Page is not to detain the user. It should answer focused questions about a word and then help the user return to the passage.

## Reader

The Reader is shared infrastructure for both Greek and Hebrew.

`src/features/reader/index.js` contains language-aware configuration for:

- labels and HTML language direction;
- data roots;
- manifests;
- gloss files;
- search indexes;
- grammar-link mapping;
- fallback book behavior.

The Reader should remain one Reader unless separate implementations become unavoidable. Greek and Hebrew need different data roots, typography, and parsing conventions, but they should share loading, navigation, caching, search flow, word popup behavior, and Word Page integration.

Reader data is lazy-loaded one chapter at a time. Large JSON content must stay out of startup modules and service-worker install precaches.

## Learn

Learn is a permanent shell, not a temporary placeholder. It owns navigation homes for future study workflows while avoiding premature engines or user-data models.

`src/features/learn/index.js` defines the Learn area structure:

- Vocabulary study paths;
- Greek and Hebrew paradigm recognition categories;
- Reading Readiness entry points.

The Learn shell uses a single `learnView` under the existing app navigation model. Its internal pages are feature-local state rather than separate routes, matching the view-first philosophy that worked for Reader-adjacent Word Pages. Future releases should plug capability into the existing Learn areas instead of replacing the shell.

Learn must not mix static source data with user progress. Vocabulary scheduling, paradigm recognition results, readiness calculations, and review state should be introduced only when their release explicitly adds the required models and storage boundaries.

## Generated Data

Generated data is a core part of the project.

The app relies on repeatable scripts for source downloads, vocabulary generation, gloss merging, Reader chapter generation, Hebrew Reader generation, and Reader audits. Important scripts include:

- `scripts/download-source-data.js`
- `scripts/build-expanded-vocab.js`
- `scripts/generate-reader-data.js`
- `scripts/generate-hebrew-reader-data.js`
- `scripts/audit-reader-data.js`
- `scripts/gloss-audit.js`

Generated outputs should be reproducible, auditable, and traceable to source files and attribution notes. Do not hand-edit large generated datasets when a script should own them.

## Development Philosophy

Prove the architecture before adding complexity.

When a feature repeatedly needs special cases, reconsider the shape of the feature instead of layering more conditionals on top. Prefer a smaller shared model that works over a clever abstraction that hides duplication.

Release meaningful work incrementally. Keep behavior stable, add tests around risky boundaries, and document architectural decisions when they will matter to future contributors.

## Lessons Learned

- Routing-heavy Word Page implementations were brittle. A view-first architecture works better with the existing app shell.
- Greek and Hebrew Reader work should share one shell. Language-specific configuration is cheaper and clearer than duplicate Readers.
- Generated data pipelines are safer than manual data maintenance.
- Lazy loading protects startup performance and keeps future content growth manageable.
- Static source data and user progress must remain separate so refreshes do not destroy user work.
- Documentation should move with the product. Important product and architecture decisions should not live only in chat history.

---

## Current App Structure

Phase 2 builds a clean data layer on top of the Phase 1 modular structure while preserving the local-first, static-app behavior.

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


### Gloss Architecture

Gloss data now has two layers:

- **Source glosses** live on vocabulary/content records. `primaryGloss` is the preferred application gloss, `alternateGlosses` stores optional extra English glosses for search/detail views, and the legacy `gloss` field remains for backward compatibility.
- **User custom glosses** live with migration-safe vocabulary progress data as `customGloss`. They are not stored in the main vocabulary source files because they are user memory aids, not source content.

Display code uses this fallback order: `customGloss`, then `primaryGloss`, then the legacy `gloss`, then `"(missing gloss)"`. Search indexes the word, lemma, transliteration when present, primary gloss, alternate glosses, legacy gloss, and custom gloss so that English searches continue to work across old and new data.

Greek and Hebrew source glosses are maintained as build-time lemma-keyed files in `data/glosses/greek-glosses.json` and `data/glosses/hebrew-glosses.json`; runtime code consumes the merged `vocab_all.json` output rather than loading language-specific gloss modules. Large future gloss datasets should remain out of startup modules and the service-worker precache unless their source, license, attribution, and version/date are verified.

Gloss attribution fields are optional source metadata: `glossSource`, `glossSourceUrl`, `glossLicense`, and `glossAttribution`. Cards and list rows should keep attribution quiet; the word detail modal or an about/data note is the right place to show source and license details.

## Gloss audit process

Run `npm run gloss:audit` before opening a vocabulary gloss update PR. The audit reads `vocab_all.json` and prints separate Greek and Hebrew summaries for total entries, missing `gloss`, missing `primaryGloss`, entries with `alternateGlosses`, duplicate IDs, malformed `alternateGlosses`, suspiciously long `primaryGloss` values, unusually large alternate gloss arrays, and suspicious formatting.

The audit exits with a non-zero status for validation errors that should block gloss data changes: blank IDs, duplicate IDs, blank `gloss`, blank `primaryGloss`, and `alternateGlosses` values that are not arrays. Warnings such as `primaryGloss` values longer than 40 characters, unusually large alternate gloss arrays, and suspicious spacing or trailing separators are reported for manual review but do not add validation errors. For incremental data work, keep gloss updates small, run the audit, and review the report before committing.

## Vocabulary and gloss build pipeline

Greek and Hebrew vocabulary now use the same source-data architecture:

```text
source morphology
+
lemma-keyed gloss source
↓
build merge
↓
vocab_all.json
↓
runtime
```

The morphology sources remain language-specific because MorphGNT and MorphHB use different file formats and parse-code conventions. Gloss metadata is language-agnostic after morphology parsing: `scripts/build-expanded-vocab.js` loads compact lemma-keyed JSON records from `data/glosses/greek-glosses.json` and `data/glosses/hebrew-glosses.json`, keys each record by `lang + lemma`, and applies those fields to generated vocabulary rows during the build merge.

Gloss source records may provide `primaryGloss`, `alternateGlosses`, `glossSource`, `glossSourceUrl`, `glossLicense`, and `glossAttribution`. The build preserves vocabulary morphology and runtime fields such as `word`, `lemma`, `parse`, `freq`, `lang`, `lexicalForm`, and `customGloss`; only source gloss metadata is supplied from the lemma-keyed gloss files. At runtime, flashcards, search, vocabulary lists, study mode, and custom gloss overrides continue to read the merged `vocab_all.json` records rather than loading a Greek- or Hebrew-specific gloss system.

Future languages should follow the same pattern: add a morphology parser that produces normalized vocabulary rows, add a compact `data/glosses/<language>-glosses.json` file keyed by lemma, register that file in the shared gloss-source map, and let the existing `lang + lemma` merge apply source gloss metadata.

## v3.5 Grammar & Reference Library

The Reference / Grammar library is a modular, local content feature for concise Greek and Hebrew grammar pages. Topic data lives in `src/features/grammar/reference-data.js`, rendering lives in `src/features/grammar/index.js`, and the app shell provides the `grammarView` route. See `docs/reference-library.md` for the content model, scope boundaries, search behavior, and instructions for adding topics.
