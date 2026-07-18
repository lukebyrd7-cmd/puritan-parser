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
- Shared Reader infrastructure for Greek and Hebrew
- Generated data pipelines for vocabulary, glosses, and Reader chapter files
- Local import/export and versioned storage migrations

## Current Focus

The v5.7 Onboarding foundation is complete. Current v5 work can move toward Study Sets and practice improvements while preserving the distinction: Onboarding helps users begin, Learn trains, Reader applies, Progress measures, Reference explains, and Settings controls behavior.

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
- Deferred: deeper advanced syntax, fuller supplemental resources, exhaustive doubly weak coverage, suffix systems, nominal morphology, and weak-verb Handbook explanation.

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
