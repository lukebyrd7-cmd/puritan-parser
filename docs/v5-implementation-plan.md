# v5 Implementation Plan

This plan converts the [v5 Product Bible](product-bible-v5.md) into implementation epics. It is intentionally planning-only: no major behavior changes should be bundled with this alignment work.

## Gap Analysis

### Already Exists

- Shared Greek/Hebrew Reader infrastructure in `src/features/reader/index.js`, with generated chapter data under `data/greek/` and `data/hebrew/`.
- Adaptive Reader settings for display mode, translation toggle, assistance threshold, hide-known behavior, and indicator style.
- OEB and WEB translation providers in `src/core/translations/translation-provider.js`, with manifests under `data/translations/`.
- Word Pages connected to Reader token data, parser output, vocabulary learning status, Reference links, and Read in Context flow.
- Learn shell in `src/features/learn/index.js`, including vocabulary paths, paradigm recognition, parsing-drill handoff, and Reading Readiness.
- Vocabulary learning and SRS-like local progress in `src/models/vocabulary-learning.js` and `src/core/storage/vocab-storage.js`.
- Reference/Grammar Handbook in `src/features/grammar/`, including paradigm groups consumed by recognition practice.
- Progress service in `src/core/progress-service.js`, with Overview and Statistics surfaces.
- Local-first storage adapters under `src/core/storage/`, plus import/export and migrations.
- Grammar, gloss, lemma, source-data, and Reader audit documentation in `docs/`.

### Partially Exists

- Reader UX already supports core v5 controls, but fixed-header/text-pane-only scrolling, same-row chapter navigation, collapsed search, and Reader -> Book Progress -> Back behavior need focused QA.
- Adaptive Reader settings are currently keyed by language; v5 wants most settings shared across Greek and Hebrew with language-specific assistance thresholds.
- Greek Interlinear is supported, but Hebrew Interlinear is gated by data availability; current Hebrew Reader data must not be treated as reliable token-level English gloss data.
- Word Pages show important morphology and learning status, but SRS stage, next review, review history, richer Hebrew prefix/suffix presentation, and lazy usage examples need expansion.
- Learn has study areas, but v5 wants a dashboard-first structure with Review Queue as the highest-priority daily driver.
- Review logic exists, but transparent daily caps, true backlog display, language-specific targets, and practice-count-toward-SRS prompts are not yet complete.
- Reference has strong content and search, but v5 wants clearer Quick Reference / Grammar Handbook / Paradigm Charts / Morphology Guide tiers.
- Progress has practical summaries, but v5 wants richer reader-growth, reading-history, analytics, and recommendation sections.
- Settings exists, but long-term Reader defaults, learning preferences, Data & Accounts, and About content need reorganization.
- Storage is modular in places, but there is not yet an explicit `StorageProvider` / `LocalStorageProvider` contract.

### Missing

- Goal-based onboarding and self-reported proficiency setup.
- Study Sets as quiet custom learning paths.
- Usage Examples backed by a lazy occurrence index.
- Global Search MVP for lemmas and glosses with learning-status-aware Word Page handoff.
- Mixed Practice MVP that intelligently combines vocabulary and grammar from a reading scope.
- Maintenance sampling for words marked Known by self-report.
- Weak-verb and advanced-grammar foundations suitable for practice, beyond reference/audit snapshots.

## v5.0.0 Product Bible + Architecture Alignment

Goal:
Create a single v5 source of truth and align project planning around it.

Main files likely affected:

- `docs/product-bible-v5.md`
- `docs/v5-implementation-plan.md`
- `docs/roadmap.md`
- `docs/architecture.md`
- `docs/changelog.md`
- `docs/product-philosophy.md`
- `docs/educational-philosophy.md`
- `docs/ai-development.md`

Risks:

- Docs can drift if future feature work updates changelog only.
- Existing v3/v4 docs may describe historical behavior that conflicts with v5 unless marked as historical.

Suggested tests:

- `npm test`

Acceptance criteria:

- v5 Product Bible exists and is clearly named as the source of truth.
- Roadmap contains ordered v5 epics.
- Architecture documents the future storage-provider direction without implementing it.
- Changelog records the alignment work.

## v5.1 Reader UX + Adaptive Reader Completion

Goal:
Make the Reader feel like Scripture first, tools second, while preserving place across settings, translation, Word Pages, and Book Progress.

Main files likely affected:

- `src/features/reader/index.js`
- `src/core/translations/translation-provider.js`
- `src/core/storage/prefs-storage.js`
- `src/models/preferences.js`
- `styles.css`
- `tests/reader.test.js`
- `tests/translation-provider.test.js`

Risks:

- Sticky controls may cover Scripture text on small screens.
- Shared-vs-language-specific settings migration could surprise existing users.
- Translation fallback states can become noisy if surfaced too aggressively.
- Hebrew Interlinear can degrade into pseudo-interlinear output if raw IDs, numeric codes, dense morphology tags, undefined/null values, or debug-like token fields are shown as support text.

Suggested tests:

- Reader navigation, settings persistence, Original/English switching, focused-verse preservation, assistance gating, and mobile layout tests.

Acceptance criteria:

- Header, navigation, and Reader controls remain fixed while only the Scripture pane scrolls.
- Previous and Next chapter controls share a row.
- Search is collapsed by default.
- Most Reader settings are shared across Greek/Hebrew, with assistance threshold separable by language.
- Reader -> Book Progress -> Back returns to Reader.
- Hebrew Interlinear is gracefully disabled or falls back to Original until reliable token-level English gloss data exists.

## v5.2 Learn Dashboard + Review Queue Redesign

Goal:
Make Learn open to a dashboard where Review Queue is the daily driver, followed by Continue Learning, Start Something New, Practice, and Study Sets.

Status:
Implemented in the Learn shell with dashboard-first rendering, Review Queue summaries for Greek and Hebrew, capped today's queue counts, visible backlog counts, and Greek/Hebrew/Mixed review entry points. Continue Learning, Start Something New, Practice, and Study Sets are placed in v5 priority order. Full Study Set creation, the SRS-counting prompt for on-demand practice, and richer Mixed Practice remain later v5 follow-ups.

Main files likely affected:

- `src/features/learn/index.js`
- `src/models/vocabulary-learning.js`
- `src/core/progress-service.js`
- `src/core/book-progress.js`
- `styles.css`
- `tests/learn.test.js`
- `tests/vocabulary-learning.test.js`

Risks:

- Learn can become a second Progress page if it emphasizes metrics over action.
- Existing deep links and tests may rely on current Learn subpage behavior.

Suggested tests:

- Learn root routing, dashboard ordering, due review counts, empty states, language-specific review actions, and legacy subpage compatibility.

Acceptance criteria:

- Learn always opens to the dashboard.
- Review Queue appears first and separates Greek, Hebrew, and Mixed entry points.
- Review Queue shows today's capped queue separately from additional available backlog.
- Continue Learning resumes active vocabulary, reading, and grammar paths.
- Start Something New separates Vocabulary and Grammar.

## v5.3 SRS Transparency + Language-Specific Review Targets

Goal:
Make review status understandable and non-punitive with daily targets, true backlog visibility, and clear card destination after review.

Status:
Implemented as an incremental transparency pass. The vocabulary learning model now exposes lifecycle/status details, review history summaries, intervals, next-review labels, and a future-safe self-reported Known source. Learn review sessions show due/backlog counts separately, surface current SRS metadata, and leave compact post-review feedback. Greek and Hebrew review targets are configurable through Light, Standard, Heavy, and Custom controls using the existing local target preference. The practice-counts-toward-SRS preference is stored and ready for on-demand practice flows; the deeper Mixed Practice engine remains a later v5.8 follow-up.

Main files likely affected:

- `src/models/vocabulary-learning.js`
- `src/core/srs.js`
- `src/core/storage/vocab-storage.js`
- `src/features/learn/index.js`
- `src/features/settings/index.js`
- `tests/vocabulary-learning.test.js`
- `tests/learn.test.js`

Risks:

- Capped daily queues can accidentally hide backlog.
- Self-reported Known words can overload review if treated like ordinary due cards.

Suggested tests:

- Greek/Hebrew daily target preferences, due-vs-available counts, review outcome display, self-reported Known sampling, and practice-count preference.

Acceptance criteria:

- Greek and Hebrew support Light, Standard, Heavy, and Custom daily targets.
- Review Queue shows today's queue and additional available backlog separately.
- Review completion explains next review, interval, and status movement.
- Self-reported Known words are available for maintenance but do not flood the daily queue.

## v5.4 Word Page Upgrade + Usage Examples Index

Goal:
Upgrade Word Pages into lemma hubs that answer quick reading questions and provide lazy contextual examples.

Status:
Implemented as a foundation pass. Word Pages now render the v5 sections in order: Identity, This Occurrence, Learning, Reference, Usage Examples, and Navigation. Learning panels reuse the shared vocabulary learning details for status, next review, interval, successful reviews, total reviews, review history, and known-source metadata where available. This Occurrence presents Greek and Hebrew morphology from existing token/parser data only, including Hebrew prefix, suffix, stem, conjugation/form, and root/lemma fields when present. Usage Examples are loaded after the page shell renders from the existing cached Reader search indexes, prioritize the current reference and current book, show a small preview, and expose bounded Load More behavior rather than dumping every occurrence. Full standalone occurrence-index generation, richer corpus/author grouping, deeper Hebrew prefix/suffix parsing, and the full Reference reorganization remain deferred.

Main files likely affected:

- `src/features/reader/index.js`
- `src/models/word-entry.js`
- `src/models/vocabulary-learning.js`
- `src/core/content/content-loader.js`
- `src/core/source-data/`
- `scripts/generate-reader-data.js`
- `scripts/generate-hebrew-reader-data.js`
- `tests/reader.test.js`
- `tests/content-pipeline.test.js`

Risks:

- Occurrence indexes can become large if loaded eagerly.
- Hebrew prefix/suffix display must use source data rather than inference.
- Word Pages can become too deep and slow for reading flow.

Suggested tests:

- Word Page section rendering, Hebrew prefix/suffix display, SRS metadata, lazy usage-example loading, current-passage prioritization, and Back to Reader.

Acceptance criteria:

- Word Pages show Identity, This Occurrence, Learning, Reference, Usage Examples, and Navigation.
- Usage examples load lazily from the cached Reader search indexes with preview and Load More / View All.
- Hebrew pages clearly display prefix, root/lemma, stem, form, suffixes, and contextual meaning when source data provides them.

## v5.5 Reference Reorganization + Grammar Handbook Expansion

Goal:
Organize Reference by consultation frequency and expand Quick Reference, Grammar Handbook, Paradigm Charts, and Morphology Guide.

Main files likely affected:

- `src/features/grammar/reference-data.js`
- `src/features/grammar/index.js`
- `src/features/grammar/README.md`
- `docs/reference-library.md`
- `docs/grammar-audit.md`
- `tests/reference-library.test.js`
- `tests/recognition-engine.test.js`

Risks:

- Reorganization can break recognition-engine references.
- Weak-verb and advanced material may need scholarly verification before becoming practice data.

Suggested tests:

- Reference tier navigation, search, topic aliases, paradigm group stability, recognition-engine compatibility, and unresolved audit-marker visibility.

Acceptance criteria:

- Tier 1 shows Quick Reference, Grammar Handbook, and Paradigm Charts.
- Tier 2 includes Morphology Guide, Reading Helps, Parsing Abbreviations, and Stem Summaries.
- Reference Search finds topics, paradigms, abbreviations, morphology, and handbook articles.
- Reference remains progress-free.

## v5.6 Progress Redesign

Goal:
Measure growth toward independent reading without turning Progress into a second Learn dashboard.

Main files likely affected:

- `src/features/progress/index.js`
- `src/core/progress-service.js`
- `src/core/book-progress.js`
- `src/models/vocabulary-learning.js`
- `tests/progress-service.test.js`
- `tests/book-progress.test.js`

Risks:

- Reader history metrics require new tracking; the UI must not invent unavailable numbers.
- Recommendations can become too frequent or prescriptive.

Suggested tests:

- Reader Growth Summary, Reading Readiness, Vocabulary Growth, Grammar Growth, reading-history unavailable states, and recommendation routing.

Acceptance criteria:

- Progress shows reader-growth, readiness, vocabulary, grammar, reading-history, analytics, and recommendations sections.
- Recommendations point to Learn or Reader.
- Missing tracking remains explicit rather than fabricated.

## v5.7 Onboarding + Self-Reported Proficiency

Goal:
Help new and returning learners begin well with goal-based onboarding and trust-based proficiency setup.

Main files likely affected:

- `src/features/profile/` or a new `src/features/onboarding/`
- `src/features/settings/index.js`
- `src/models/vocabulary-learning.js`
- `src/core/storage/`
- `src/core/router.js`
- `tests/storage-migrations-router.test.js`
- New onboarding tests

Risks:

- Onboarding can overwhelm users if it explains the whole app.
- Self-reported proficiency must not create punitive review debt.
- Migration must be careful for existing local users.

Suggested tests:

- First-run routing, goal selection, Greek/Hebrew proficiency survey, self-reported Known persistence, Start Here recommendations, skip flow, and reset behavior.

Acceptance criteria:

- Onboarding asks language, goal, optional proficiency, and then shows personalized Start Here actions.
- Greek and Hebrew surveys are separate.
- Self-reported Known data is marked distinctly for maintenance sampling.

## v5.8 Study Sets + Practice Improvements

Goal:
Add quiet custom Study Sets and practice improvements without making Study Sets the primary learning model.

Main files likely affected:

- `src/features/learn/index.js`
- `src/core/study-entries.js`
- `src/models/vocabulary-learning.js`
- `src/core/storage/`
- `tests/study-entries.test.js`
- `tests/learn.test.js`

Risks:

- Study Sets can turn into an advanced query builder.
- Mixed Practice can feel random if it ignores reading scope.
- Counting on-demand practice toward SRS can surprise users without an explicit prompt.

Suggested tests:

- Study Set creation under 30-second flow, vocabulary/grammar practice routing, Mixed Practice scope selection, and count-toward-SRS prompt.

Acceptance criteria:

- Study Sets reuse learning-path architecture.
- Practice hierarchy remains Vocabulary, Grammar, Mixed.
- On-demand practice asks whether to count toward SRS by default.

## v5.9 Global Search MVP + Release Polish

Goal:
Add a small global search utility and complete release polish against the v5 Product Bible.

Main files likely affected:

- `src/core/router.js`
- `src/core/source-data/`
- `src/features/reader/index.js`
- `src/features/grammar/index.js`
- `src/ui/`
- `styles.css`
- New global search tests

Risks:

- Global Search can duplicate Reference Search or Reader Search.
- Large indexes can hurt startup if not lazy-loaded.

Suggested tests:

- Lemma/gloss search, Greek/Hebrew filters, frequency display, learning-status display, Word Page handoff, lazy loading, and empty states.

Acceptance criteria:

- Global Search is available from the app shell.
- Initial scope searches lemmas and glosses, filters Greek/Hebrew, shows frequency and learning status, and opens Word Pages.
- Reference Search remains separate.
- v5 release polish passes Product Bible design tests.
