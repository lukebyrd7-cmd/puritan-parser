# Roadmap

This roadmap is a living document. Update it whenever meaningful features are completed or project priorities change.

Avoid creating separate roadmap items for minor polish. Instead, incorporate polish naturally into related feature work.

For v5 product direction, treat [Product Bible v5](product-bible-v5.md) as the source of truth. For implementation sequencing, use [v5 Implementation Plan](v5-implementation-plan.md).

## Current Status

Puritan Parser is a local-first Biblical Greek and Hebrew reading and study app. Major completed milestones include:

- Vocabulary study for Greek and Hebrew
- Spaced-repetition flashcards
- Parsing drills and parser explanations
- Dashboard metrics for local study progress
- Grammar Handbook / Reference Library
- Greek Reader
- Complete Hebrew Bible Reader
- Reader word popups and Word Pages
- Word Page learning status and handoff into Vocabulary Learning
- Read in Context flows from word-level study back to the Reader
- Reader handoff into current-book Reading Readiness
- Adaptive Reader display, translation, assistance, known-word filtering, and indicators
- OEB and WEB Translation Integration with WEB fallback for OEB gaps
- Chapter and bounded continuous Reader modes with stable place restoration
- Sticky mobile original-language and English Reader controls
- Shared Reader infrastructure for Greek and Hebrew
- Generated data pipelines for vocabulary, glosses, and Reader chapter files
- Local import/export and versioned storage migrations

## Current Focus

v1.5 stabilization is implemented for review. It makes Original/English one exclusive choice, keeps prepared Original markup available for immediate English-to-Original switching, defaults new readers to Continuous while preserving valid saved modes, moves Reading mode to Settings → Reader, fixes continuous-Reader position loss, replaces the bottom mobile controls with a restrained top toolbar, prefetches and incrementally inserts adjacent chapters, phases Progress so core metrics paint before whole-Bible readiness work, defers inactive feature bundles and vocabulary hydration, and repairs nested-route startup asset resolution. Release validation remains the current focus; no feature expansion is included.

The v1.4.2 Reader milestone added bounded continuous reading alongside one-chapter mode. Continuous is now the default for readers without a valid saved preference; existing valid choices remain unchanged. It incrementally renders nearby chapters within the selected book, tracks the chapter in view, restores a verse-relative reading anchor, and exposes compact mobile text-visibility controls after the primary controls scroll away. Crossing books remains an explicit selection rather than an automatic continuous-reading transition.

### v1.5 Stabilization and release QA

- Preserve the nearest visible original or English verse through repeated visibility changes, including continuous-mode boundaries.
- Keep prepared Original markup available while English is active so returning to Original requires no chapter request or full window rerender.
- Keep Reading mode under Settings → Reader with one canonical `pp_reader_location.mode` value and a restrained Reader options link.
- Keep mobile secondary Reader controls fixed near the top, safe-area aware, and synchronized with primary controls.
- Reuse in-flight Reader requests, prefetch only the next adjacent chapters, and retain the five-chapter DOM bound.
- Paint Progress core metrics before readiness scans and invalidate readiness caches on learning changes.
- Defer inactive Reference rendering and keep direct Reference routes functional.
- Resolve all shell assets and service-worker registration from the application root so nested hard refreshes work.
- Keep persisted schemas, SRS behavior, and Greek/Hebrew language data unchanged.

#### Validation notes

Measurements used the local static development server and the Codex in-app browser and include browser-automation overhead, so they are directional local-development measurements rather than production benchmarks. Before the release-blocker startup work, a fresh Reader load made its shell visible at approximately 4.44 seconds and its route usable at 6.28 seconds; returning loads were usable in approximately 2.39–2.45 seconds. A second, deliberately cold instrumented comparison used fresh ports and the same injected readiness markers for the HEAD baseline and revised worktree. Under that heavily throttled browser session the baseline reached DOM content at 6.00 seconds but still had not exposed the application or Reader after 30 seconds; the revised worktree reached DOM content at 5.03 seconds, application readiness at 16.15 seconds, and the Reader at 21.82 seconds, then reached application readiness at 3.09 seconds and Reader usability at 3.11 seconds on a returning load. These large absolute times reflect the instrumentation/browser session and should not be treated as production latency, but the same-run comparison confirms that vocabulary parsing no longer gates first usable UI.

The blocking path loaded all 52 application scripts and awaited parsing `vocab_all.json` (18,940,385 bytes) before revealing the shell. The revised path loads the 42-script core plus only the active bundle (44 scripts including bootstrap for Reader), reveals navigation before vocabulary hydration, and defers the other feature registries until opened. Slow-response QA with a 700 ms JSON delay showed Original continuous startup requesting each needed original chapter once, requesting no English chapter, and beginning both adjacent chapter requests before the boundary; automated coverage verifies concurrent-request reuse, incremental insertion, retry, and the five-chapter bound.

Browser review covered the in-app browser at 320px, 390×844, 768px, and 1440px. Tested normal Reader, Progress, direct Handbook, and About & Sources flows had no current-origin console errors, duplicate IDs, or page-level horizontal overflow. Safari/WebKit and Firefox were not available. Returning-offline launch was attempted after service-worker installation, but the browser environment blocked the post-shutdown inspection; exact cache-busted startup assets are now precached and automated cache assertions pass, but a real installed/offline launch remains an important manual follow-up. The existing Hebrew gloss audit still reports incomplete source gloss coverage; v1.5 does not change or synthesize that linguistic data.

## v5 Roadmap

### v5.0.0: Product Bible + Architecture Alignment

- Create `docs/product-bible-v5.md` as the v5 source of truth.
- Align roadmap, architecture, changelog, and planning docs around the Product Bible.
- Document the future storage-provider target without implementing accounts or sync.
- Audit current app gaps against the Product Bible.

### v5.1: Reader UX + Adaptive Reader Completion

- Polish fixed Reader chrome and Scripture-pane scrolling.
- Keep Previous and Next chapter controls together.
- Collapse Reader search by default.
- Clarify Reader Settings / Adaptive Reader labeling.
- Preserve Reader location through Word Pages, Book Progress, translation changes, and settings changes.
- Move toward shared Greek/Hebrew Reader settings, with language-specific assistance thresholds.

### Future: Hebrew Interlinear Data Foundation

- Identify or build reliable token-level English gloss data for Hebrew Reader tokens.
- Define a gloss-first, RTL-aware Hebrew Interlinear contract before enabling the display mode.
- Gracefully keep Hebrew Interlinear disabled or falling back to Original until the data contract is met.
- Prevent raw IDs, numeric codes, dense morphology tags, undefined/null values, or debug-like data from serving as primary interlinear support text.

### v5.2: Learn Dashboard + Review Queue Redesign

- Make Learn open to a dashboard instead of the last subsection.
- Put Review Queue first, with Greek, Hebrew, and Mixed review entry points.
- Add Continue Learning, Start Something New, Practice, and Study Sets areas in v5 priority order.
- Keep Learn action-oriented and distinct from Progress.

### v5.3: SRS Transparency + Language-Specific Review Targets

- Add Greek and Hebrew daily review targets: Light, Standard, Heavy, and Custom.
- Show today's queue separately from additional available backlog.
- Explain SRS status, interval, next review, and review outcome movement.
- Prevent self-reported Known words from flooding the daily review queue.
- Add practice count-toward-SRS behavior with an explicit default prompt.

### v5.4: Word Page Upgrade + Usage Examples Index

- Upgrade Word Pages around Identity, This Occurrence, Learning, Reference, Usage Examples, and Navigation.
- Add richer SRS and review-status transparency to Word Pages.
- Improve Hebrew prefix/suffix/root/stem/form display using source data only.
- Build a lazy occurrence index for contextual usage examples.
- Prioritize current passage and current book examples before broader groupings.

### v5.5: Reference Reorganization + Grammar Handbook Expansion

- Complete: Reorganize Reference by consultation frequency.
- Complete: Establish Tier 1: Quick Reference, Grammar Handbook, Paradigm Charts.
- Complete: Establish Tier 2: Morphology Guide, Reading Helps, Parsing Abbreviations, Stem Summaries.
- Complete: Keep supplemental material available without crowding the first screen.
- Complete: Preserve Recognition engine compatibility with Reference-backed paradigm data.
- Complete in v1.3.6a: source-backed Hebrew weak-verb recognition charts for the major weak classes, with exact Gesenius page/section metadata and focused filters.
- Complete in PR #63 refinement: adopt Pratico–Van Pelt positional terminology for visible weak-class labels while preserving Gesenius as the form source and retaining stable internal IDs.
- Implemented for v1.3.6b review: source-backed Hebrew Construct State, pronominal suffixes on nouns and prepositions, limited object suffixes on verbs, Segolate Nouns, reducible-vowel, and selected Irregular Noun charts with exact Gesenius page-image metadata, Pratico–Van Pelt-guided display terminology, and focused filters.
- Implemented for v1.3.7 review: lean Grammar Handbook registries with 12 Greek and 13 Hebrew articles in six stable sections per language, Merkle-guided Greek organization, Pratico–Van Pelt-guided Hebrew organization and terminology, article-level source roles, direct article links, focused search/filtering, reading workflows, and stable-ID chart cross-links.
- Deferred: a separately sourced III-Aleph paradigm; the label is recognized but no v1.3.6a chart is inferred.
- Deferred beyond v1.3.7: automatic drills for v1.3.6b forms, exhaustive suffix systems and irregular nouns, advanced syntax taxonomies, fuller supplemental resources, exhaustive doubly weak coverage, discourse analysis, and rare constructions with little reading value.

### v5.6: Progress Redesign

- Redesign Progress around Reader Growth Summary, Reading Readiness, Vocabulary Growth, Grammar Growth, Reading History, Detailed Analytics, and Recommendations.
- Add richer readiness and growth summaries without inventing unavailable data.
- Keep recommendations pointing back to Learn or Reader.
- Keep Progress distinct from the Learn dashboard.

### v5.7: Onboarding + Self-Reported Proficiency

- Complete: Add goal-based onboarding.
- Complete: Let users choose Greek, Hebrew, or both.
- Complete: Support optional trust-based proficiency surveys for each language.
- Complete: Distinguish self-reported Known words from review-proven Known words.
- Complete: End onboarding with a personalized Start Here screen.
- Deferred: richer maintenance sampling for self-reported Known words beyond the current no-due-review foundation.

### v5.8: Study Sets + Practice Improvements

- Add Study Sets as quiet custom learning paths.
- Keep Study Sets under 30 seconds to create.
- Add Mixed Practice MVP that combines vocabulary and grammar around a reading scope.
- Improve practice routing across vocabulary, grammar, and mixed sessions.

### v5.9: Global Search MVP + Release Polish

- Add Global Search from the main app shell.
- Search lemmas and glosses across Greek and Hebrew.
- Show frequency and learning status.
- Open matching results in Word Pages.
- Keep Reference Search separate.
- Perform release polish against the Product Bible design tests.

## v4 Completion Context

- v4.3: Adaptive Reader — complete
- v4.3.1: OEB Translation Integration — complete
- v4.3.2: WEB Translation Option and Floating Translation Toggle — complete
- v4.4 through v4.7 planning has been superseded by the v5 roadmap above.
- v5.0 public-release readiness should be judged against the Product Bible, not the older v4 release-candidate list.

## Release Gates

- Completed for v4.2.6: Grammar Verified
  - Greek grammar audit complete
  - Hebrew grammar audit complete
  - Regression tests passing
  - `docs/grammar-audit.md` added
- Before v5.0: Content Verified
  - Grammar audit complete
  - Vocabulary audit complete
  - Reader audit complete
  - Known issues reviewed

## Future

- Accounts
- Sync
- Additional study tools
- Export improvements
- Additional language-learning tools

## Parking Lot

These ideas are worth remembering but intentionally postponed until they clearly serve the reading-first vision:

- Notes and highlights
- Custom reading plans
- More advanced search
- Additional source-text views
- Expanded grammar examples
- Teacher or classroom workflows
- Deeper statistics for long-term learning progress
- More flexible import/export formats

Items in the Parking Lot are not commitments. They should be reconsidered against the product philosophy before implementation.
