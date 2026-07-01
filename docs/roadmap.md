# Roadmap

This roadmap is a living document. Update it whenever meaningful features are completed or project priorities change.

Avoid creating separate roadmap items for minor polish. Instead, incorporate polish naturally into related feature work.

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

The v4.3 Adaptive Reader build, v4.3.1 OEB Translation Integration, and v4.3.2 WEB Translation Option are complete. The current focus is finishing grammar learning, improving learning-engine transparency, and polishing the Reader before release-candidate review.

## Upcoming

- v4.3: Adaptive Reader — complete
- v4.3.1: OEB Translation Integration — complete
- v4.3.2: WEB Translation Option and Floating Translation Toggle — complete
- v4.4: Complete Grammar Learning
- v4.5: Learning Engine / SRS Transparency
- v4.6: Reader Polish
- v4.7: Release Candidate Review
- v5.0: Public Release

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
