# Architecture

Puritan Parser is a local-first, static Biblical Greek and Hebrew reading app. Its architecture should stay boring in the best sense: clear module boundaries, repeatable data generation, shared infrastructure, and minimal runtime magic.

This document records not only what exists, but why it exists.

For v5 product decisions, [Product Bible v5](product-bible-v5.md) is authoritative. This architecture document explains how the codebase should support that direction without implementing future behavior prematurely.

## Architectural Principles

### Reading-first architecture

Architecture exists to support reading Scripture in the original languages. New features should shorten the path from a user's question back to the biblical text.

### Local first

User progress, preferences, review history, and future personal data belong to the user. Browser storage and export remain the default persistence model unless a backend is explicitly requested.

### Static data and user data stay separate

Vocabulary source data, glosses, parsing data, grammar reference data, and Reader chapter files are source content. Review progress, preferences, custom glosses, and future notes are user data. Mixing these makes migrations, exports, and data refreshes brittle.

## v5 Storage Provider Direction

v5 remains local-first. Accounts and cloud sync are future possibilities, not current requirements, and should not be introduced by feature work unless explicitly requested.

The target direction is a small storage-provider boundary:

- `StorageProvider`: the interface feature code depends on.
- `LocalStorageProvider`: the current browser-backed implementation.
- `CloudProvider`: a future implementation that may sync the same user-data model.

The important architectural rule is that learning systems should not know whether data is local-only or synced. Vocabulary progress, review history, Reader preferences, onboarding choices, Study Sets, and future account-backed data should read and write through feature-specific storage APIs backed by the provider layer.

This protects the learning system from a future rewrite. If accounts arrive later, the work should be to add identity, conflict handling, migration, and a cloud-backed provider, not to redesign vocabulary learning, SRS history, Reader settings, or Progress calculations.

Current storage modules under `src/core/storage/` are already a useful starting boundary. v5 feature work should continue consolidating direct `localStorage` access behind these modules. Do not implement a full provider abstraction until a feature naturally touches enough storage code to justify the migration.

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

## Navigation Philosophy

The primary navigation is intentionally small:

- Learn is the center for study workflows.
- Reader is for reading the biblical text.
- Reference is for grammar and paradigm reference.
- Progress is for learning progress and next actions.

Older study surfaces such as the vocabulary list, flashcards, parsing drills, dashboard, and profile placeholder may remain as internal views or legacy routes, but they should not compete as duplicate top-level destinations. New study capability should normally enter through Learn unless it is clearly reading, reference, or progress oriented.

The root route (`/`) opens Learn. Legacy deep links such as `/list`, `/flashcards`, and `/parsing` remain available so existing tests, bookmarks, and internal workflows continue to function.

Static shell URLs and the sequential module loader use application-root paths. This is required because nested routes such as `/settings/sources` are served by the same `index.html`; document-relative startup URLs would otherwise resolve below the nested route and return the app shell in place of JavaScript. Service-worker registration likewise uses `/sw.js`.

Startup uses a route-aware module loader. Core scripts download as one ordered group, then only the active feature bundle loads before bootstrap; Reader, Learn, Reference, Progress, Search, and Onboarding bundles load on demand for later navigation. `/settings/sources` intentionally loads the Reference bundle because its bibliography is rendered from that library. Bootstrap reveals the shell and wires navigation before beginning large vocabulary hydration, which is scheduled after the first paint or during idle time when the active route does not require it. An inline pre-style preference read applies the stored theme and accent before the shell paints.

The application chrome should not include a global Greek/Hebrew toggle. Reader owns its reading-language flow, Reference owns its local language selector, and Learn presents language choices only inside study workflows where the choice is part of the task.

The header should also avoid progress counters, streak indicators, or other motivational widgets. Progress information belongs in the Progress section.

## Word Pages

Word Pages exist because routing-heavy implementations proved too fragile for the desired workflow. The successful model is view-first:

- the router shows the `wordPageView`;
- Reader or vocabulary interactions place the selected word information into app state;
- the Word Page renders from that state;
- "Read in Context" returns users to the Reader location.

This keeps Word Pages aligned with the rest of the app's screen model instead of creating a separate route-driven mini-application.

The purpose of a Word Page is not to detain the user. It should answer focused questions about a word and then help the user return to the passage.

The v4.2.8 Word Page philosophy is:

- Reader reads.
- Word Pages explain.
- Reference teaches.
- Learn practices.

Word Pages should be the best place to understand an individual word while reading Scripture. They consume existing Reader token metadata, gloss sources, vocabulary learning status, parser explanations, Reference grammar links, and Reader search indexes rather than duplicating those systems.

Every Word Page should expose Back to Reader near both the top and bottom of the page. Users should never need to scroll to resume reading.

The page organization should remain scannable and predictable across Greek and Hebrew: word, lemma, gloss, learning status, parsing, morphology, frequency, occurrences, related information, and links. Greek and Hebrew do not need identical fields, but they should share the same quiet visual grammar. Morphology must display only data already present in source tokens, parser output, or vocabulary entries; missing prefixes, suffixes, principal parts, or other details should be omitted rather than inferred.

Occurrences are the natural home for future Reader Examples. v4.2.8 prepares the page structure for that addition but does not implement example selection, advanced syntax, or weak-verb expansion.

v5.4 adds the Usage Examples foundation without introducing a separate generated occurrence database. Word Pages render first, then lazily ask the existing Reader search index for a small lemma preview. The search index is loaded through the same in-memory cache used by Reader search, current-reference/current-book examples are prioritized, and the UI renders only a bounded preview plus Load More. Future full occurrence-index work may improve grouping by corpus, author, or canon section, but it should preserve the same lazy/cached behavior and avoid storing large derived indexes in user storage.

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

### Hebrew lexical search

`src/core/hebrew-search.js` is the shared Hebrew lexical-search boundary used by Global Search and Hebrew Reader Search. It derives canonical and simplified Latin search forms from existing Hebrew headwords/surfaces without changing source strings. Exact Hebrew, canonical Latin, simplified aliases, and prefixes have separate deterministic relevance tiers; Global Search frequency is only a tie-breaker within a tier. Cantillation and ordinary user punctuation do not prevent matching.

The utility is loaded as small core code, but no derived Hebrew index is constructed during startup. Global Search derives terms when its existing lazy vocabulary index is first requested. Reader Search derives terms when the Hebrew verse index is first searched lexically and reuses the in-memory result. The 20 MB Reader search JSON remains network/runtime cached and is not added to the install precache. Derived forms are not persisted in localStorage and are never displayed in the Reader.

Reference Search and Grammar Handbook article search remain general content search. They deliberately do not use the Hebrew lexical transliteration rules.

### Hebrew interlinear source gate

The current generated OSHB/WLC tokens preserve pointed surface form, numeric lemma, morphology, source lemma expression, and verse-array order. They do not provide complete token-level contextual glosses, explicit stable token IDs, or a reliable combined gloss for orthographic tokens with attached morphemes. The lemma-keyed Hebrew gloss file is lexical and incomplete; WEB/OEB data is verse-level translation without token alignment.

Accordingly, Hebrew Interlinear remains unavailable and falls back to Original. The app must not turn numeric IDs, roots, morphology labels, base dictionary glosses, or English verse order into pseudo-alignment. `docs/hebrew-search-interlinear-audit.md` records the field-level audit and the minimum future aligned-data contract.

### Reader preferences and Adaptive Reader

Reading mode is owned by the existing `pp_reader_location.mode` field and normalized by `src/core/reader-preferences.js`. Settings → Reader and the Reader feature use that same helper rather than parallel preference state. `continuous` and `chapter` remain the stored values; missing or invalid values resolve to Continuous, valid values remain unchanged, and updating mode preserves the remaining location and verse-anchor fields. Reading mode is changed through normal navigation to Settings → Reader; the Reader has no dedicated shortcut.

Adaptive Reader settings live inside the Reader rather than global Settings because they shape the immediate reading experience. The settings are local-first user data under `pp_reader_adaptive_settings`, currently keyed by language so Greek and Hebrew can diverge without accounts or sync.

The Reader settings panel should stay open while settings are changed. It closes only through an explicit close button, Escape, or an outside click/tap. This lets readers tune several options in one pass without the panel fighting them.

Display, Translation, Assistance, and Indicators interact through one shared render path:

- Display controls the original-language presentation. `Original` renders inline Greek or Hebrew. `Interlinear` keeps each original token primary and adds a small gloss beneath the word when existing gloss or vocabulary data provides one.
- Translation controls whether the Reader shows an `Original` / `English` text toggle. When enabled, only one layer is visible and interactive at a time. English mode keeps the prepared Original layer hidden and inert so a one-click return to Original can reveal it without another chapter request or full continuous-window rerender. English uses the selected provider, currently OEB or WEB, and shows an unavailable state only when neither the selected provider nor the WEB fallback can serve the passage.
- Assistance determines which tokens may open the Reader popup and Word Page flow. `Everything` allows all tokenized words, numeric presets allow words with frequency at or below the selected threshold, `Custom` uses a validated positive whole-number threshold, and `None` disables word help.
- Hide Known Words composes with Assistance by consulting the shared `VocabularyLearning` model. A word qualifies only when it passes the frequency rule and is not Known. The Reader must not duplicate learning state.
- Indicator style is purely visual and applies only to currently assisted words. The default is `None`; tint, dotted underline, and footnote markers are intentionally quiet.
- Floating Reader Controls is optional and keeps the Reader controls/status sticky while scrolling. It should remain subtle and avoid covering the text aggressively.
- Floating Translation Toggle is optional and keeps the `Original` / `English` toggle sticky while translation is enabled. It should remain compact and centered so it stays available during scrolling without taking over the reading column.

The same assistance helper gates both rendering and tap behavior. Tokens hidden by Reader settings do not open the Word Page flow; at most they produce a throttled quiet toast. This keeps the biblical text central while letting users choose exactly how much help they want.

### Translation Providers

Reader translation is provider-based, not hardcoded to a single English text. The default provider is `oeb`, but Reader settings let users choose OEB or WEB. The Reader asks the translation layer for the current book/chapter and renders whatever chapter data the active provider returns.

The provider code lives in `src/core/translations/translation-provider.js`. Translation data lives under:

- `data/translations/<translation-id>/manifest.json`
- `data/translations/<translation-id>/books/<book>/<chapter>.json`

Each translation manifest records source, license, attribution, data root, and available books/chapters. Chapter files contain one English chapter at a time with stable canonical book ids and verse numbers. This keeps translation switching fast without loading a full Bible into memory.

OEB is generated by `scripts/generate-oeb-translation-data.js` from the Open English Bible US development USFM artifact. The importer validates one chapter file per available chapter, unique verse records after continuation merging, non-empty verse text, and a manifest that matches generated files. The public OEB artifact currently provides 59 books.

WEB is generated by `scripts/generate-web-translation-data.js` from the World English Bible Protestant USFM artifact published by eBible.org. WEB is complete for the 66-book Protestant canon and uses the same manifest/chapter-file contract as OEB.

If OEB is selected but does not include the current passage, the Reader automatically requests WEB and shows the quiet note `OEB unavailable here. Showing WEB.` If WEB is selected, the Reader uses WEB directly. If neither selected translation nor WEB fallback is available, English mode renders `English unavailable for this passage.` The Reader must not invent missing translation text.

The service worker precaches the provider plus OEB and WEB manifests, while chapter JSON uses the existing network-first runtime JSON cache. Once a translation chapter has been loaded, the same chapter remains available for offline Original / English switching.

## Learn

Learn is a permanent shell, not a temporary placeholder. It owns navigation homes for study workflows while keeping teaching content in Reference.

`src/features/learn/index.js` defines the Learn area structure:

- dashboard-first Learn home ordered as Review Queue, Continue Learning, Start Something New, Practice, and Study Sets;
- Greek and Hebrew Review Queue summaries that cap today's queue while still showing additional available backlog;
- Vocabulary study paths;
- Greek and Hebrew paradigm recognition categories;
- Parsing Drills as an additional paradigm study tool using the legacy parsing view;
- Reading Readiness entry points.

Language-specific review targets use a small local preference key, `pp_learn_review_targets`, with safe Standard defaults of 30/day for Greek and Hebrew. This preference limits the daily Review Queue display and session entry points without reshaping or wiping existing `pp_vocab_learning` records. The target shape preserves each language separately with a preset (`light`, `standard`, `heavy`, or `custom`) and validated daily target.

Vocabulary learning transparency lives in `src/models/vocabulary-learning.js`. The model normalizes older records and exposes user-facing status details for Not Learned, Learning, Reviewing, Known, and future Known by Self-Report records. New review metadata should be derived through this helper rather than by duplicating status logic in Learn, Reader, or Progress.

On-demand practice uses the local preference key `pp_learn_practice_srs_preference`, defaulting to `ask`. Practice flows should consult this preference before allowing optional practice to update SRS scheduling. Full Mixed Practice remains a later feature, but the storage hook is intentionally separate from review queue targets.

Study Sets use the local-first `pp_study_sets` key. The v5.8 shape is intentionally small: each set stores an id, title, language, type, timestamps, optional description, lightweight criteria, and optional item references. Vocabulary Study Sets resolve criteria against the current vocabulary source data and `VocabularyLearning` state instead of duplicating large source rows. Grammar and Mixed Study Sets can be saved as foundations, but full drill criteria are deferred until the grammar practice contract is stable enough to avoid an advanced query-builder UI.

Vocabulary paths may offer a confirmed Mark Path as Known action for users who already know the current path. This must only update Not Learned words in that path, record them as Known, and avoid creating due review cards.

The Learn shell uses a single `learnView` under the existing app navigation model. Its internal pages are feature-local state rather than separate routes, matching the view-first philosophy that worked for Reader-adjacent Word Pages. Future releases should plug capability into the existing Learn areas instead of replacing the shell.

Learn must not mix static source data with user progress. Vocabulary scheduling, recognition results, readiness calculations, and review state should stay behind their own storage or feature-local boundaries.

### Paradigm Recognition

`src/features/learn/recognition-engine.js` is the reusable recognition engine introduced in v4.2.6. It consumes the Reference API instead of maintaining separate grammar lessons in Learn.

The engine builds recognition items from Reference topics and paradigm sections:

- Greek verbs, including tense-form, voice, mood, finite forms, infinitives, and participles;
- Greek nouns where Reference already exposes verified forms;
- verified Hebrew strong-verb material for Qal, Niphal, Piel, Hiphil, and Hithpael;
- Hebrew noun material already present in Reference;
- limited sequence recognition for Wayyiqtol and Weqatal.

The engine deliberately excludes Hebrew Pual/Hophal drill material, weak-verb snapshots, and cells marked `Needs review`. Those remain Reference/audit material until separately verified.

Recognition sessions present one form at a time, reveal the answer on demand, and accept only `recognized` or `missed`. Learn tracks simple in-session counts and records completed session summaries for the Progress service. It does not implement typing exercises, parsing production, mastery scoring, streaks, or statistics redesign.

Every recognition item carries Reference navigation metadata (`referenceTopicId` and section id). Learn may show brief recognition clues, but Reference remains the authoritative teaching resource and owns full explanations.

## Progress

`src/core/progress-service.js` is the shared Progress service introduced in v4.2.7. It provides one underlying data shape for the Progress Overview and the quieter Statistics page.

The service consumes existing learning systems rather than creating duplicate tracking:

- `VocabularyLearning` supplies Known, Learning, Due Today, lifetime vocabulary review counts, correct recognitions, and missed recognitions.
- `BookProgress` supplies Reading Readiness calculations for books and chapters.
- `ParadigmRecognition` supplies available recognition targets, while completed recognition sessions are recorded as small local history entries under `pp_recognition_history`.
- Reader activity is reported only where the app already exposes tracked local data; missing reader statistics display `Not yet tracked`.

Progress and Statistics are intentionally distinct views of the same local data. Overview answers practical learning questions: what the user knows, what remains, and what should be studied next. Statistics documents lifetime totals only where those totals are actually tracked. The UI must not invent numbers, use achievements, add badges, require streaks, or show progress bars.

The Progress service remains local-first. Recognition history is user data and must stay separate from Reference source material and generated Reader data.

v5.6 reorganizes the Progress landing page around reader growth rather than activity totals. The page order is Reader Growth Summary, Reading Readiness, Vocabulary Growth, Grammar Growth, Reading History, Detailed Analytics, and Recommendations. The service derives expanded vocabulary buckets, frequency-coverage estimates, readiness percentages, grammar-growth states, and structured recommendations from existing data only. It does not add a new storage key or migrate existing `pp_vocab_learning`, `pp_recognition_history`, Reader preferences, or Learn review target data.

Reading History remains a foundation until the Reader records durable event data for word taps, assistance use, translation toggles, and repeat-chapter improvement. Missing Reader history must continue to render as `Not yet tracked` rather than inferred independence metrics.

## Reference

Reference lives in `src/features/grammar/` and is the source foundation for future Paradigm Recognition. `reference-data.js` owns static grammar topics, consolidated reference pages, paradigm charts, aliases from older topic ids, search flattening, and `referenceParadigmGroups()`. `index.js` renders the Reference UI from that data.

Reference organization follows the v5 consultation model rather than a course or wiki index. The landing is tiered by likely reading-time need:

- Primary: Quick Reference, Grammar Handbook, Paradigm Charts.
- Secondary: Morphology Guide, Reading Helps, Parsing Abbreviations.
- Supplemental: supporting implemented material such as prepositions, particles, pronouns, ambiguity help, and stem summaries.

The v5.5 overview topics are authored static Reference content that reuse existing charts and explanations. They do not replace canonical grammar topics such as `greek-verbs`, `greek-nouns`, `hebrew-verbs`, and `hebrew-nouns`; those IDs remain stable for Word Pages, Learn recognition navigation, old-topic aliases, and future deep links.

Reference owns a local Greek/Hebrew selector. It should continue showing one language at a time, independent of Reader and Learn language choices.

Paradigm Recognition consumes existing Reference topic sections and paradigm tabs through the reference API instead of duplicating charts in Learn. The `futureGrammarHooks` entry for `paradigm-recognition-source` records this dependency. Reference remains static source content; recognition progress remains separate from Reference data.

Reference Search is local to Reference. It searches static topic titles, summaries, charts, examples, abbreviations, morphology labels, handbook sections, and old alias terms through the Reference API. It must not become Global Search; app-wide lemma/gloss search remains a separate future feature.

Forms marked as needing scholarly review must stay visible as audit targets until specialist verification completes. Reference may explain that material is limited, but Learn/drill surfaces should not treat unresolved forms as verified practice data.

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
- `src/models/` contains lightweight plain-object model helpers for source data, user progress, preferences, review history, parse metadata, onboarding profile data, and dashboard statistics.
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
- `Onboarding`: represents local first-run setup data, including selected languages, primary goal, optional self-reported proficiency, known-vocabulary bands, familiar grammar concepts, Start Here recommendations, and completion status.

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
- `src/models/onboarding.js`: onboarding profile, completion, Start Here, existing-user detection, and safe self-reported vocabulary seeding helpers.

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
- `src/features/onboarding/index.js`: first-run onboarding flow, trust-based proficiency survey, recommended setup summary, Start Here actions, and Settings-driven onboarding restart.

### Onboarding

Onboarding is local-first setup, not a placement test. Its persistence is intentionally small:

- `pp_onboarding_completed`: whether automatic first-run onboarding should be skipped.
- `pp_onboarding_profile`: selected language(s), primary goal, optional per-language proficiency, known vocabulary band, familiar grammar concepts, and timestamps.
- `pp_onboarding_start_here`: the last personalized Start Here recommendation list.

Startup routes to `/onboarding` only when there is no completion flag and no existing local app data. Existing users with vocabulary learning, legacy vocabulary progress, preferences, dashboard data, Reader settings, recognition history, or Learn review preferences are preserved and continue to the normal app. Users can restart Onboarding from Settings; this resets only onboarding setup state and does not delete learning data.

Self-reported vocabulary seeding reuses `VocabularyLearning.markEntryKnown()` with `knownSource: "self_reported"` and `due: "9999-12-31"`. The seed uses existing frequency fields only, skips entries without usable frequency, and marks only Not Learned records so review-proven or in-progress vocabulary is not overwritten. Grammar familiarity is stored on the onboarding profile as foundation data for future Learn/Progress work rather than as a full grammar mastery system.

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

`src/core/router.js` registers all app routes in one `ROUTES` map. Navigation should call `navigateTo('/route')` or register a new route in that map rather than manually hiding and showing screens. The router maps browser paths to view IDs, supports `history.pushState`, responds to `popstate`, and normalizes unknown deep links back to `/learn`.

Current routes are:

- `/`
- `/onboarding`
- `/list`
- `/flashcards`
- `/parsing`
- `/dashboard`
- `/progress`
- `/settings`
- `/grammar`
- `/reader`
- `/word`
- `/learn`
- `/profile`

Legacy study routes remain functional, but the visible top navigation should stay focused on Learn, Reader, Reference, and Progress. Profile remains a placeholder only; it reserves view architecture for future work without adding login, cloud sync, or account behavior.

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

## v3.5 Reference Library

The Reference library is a modular, local content feature for concise Greek and Hebrew grammar pages. Topic data lives in `src/features/grammar/reference-data.js`, rendering lives in `src/features/grammar/index.js`, and the app shell provides the `grammarView` route. See `docs/reference-library.md` for the content model, scope boundaries, search behavior, and instructions for adding topics.
