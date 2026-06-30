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
- Shared Reader infrastructure for Greek and Hebrew
- Generated data pipelines for vocabulary, glosses, and Reader chapter files
- Local import/export and versioned storage migrations

## Current Focus

The current product focus is v4.2: implementing the Learn section and the workflows that help users become more prepared readers.

The Learn system has been conceptually designed in `docs/educational-philosophy.md`. Implementation should preserve its reading-first model: focused vocabulary study paths, recognition-first paradigm practice, objective Reading Readiness, and progress that measures ability rather than app activity.

- Vocabulary review and New Words frequency study
- Reading Readiness for book and chapter preparation
- Reader ↔ Learn navigation
- Paradigm recognition practice
- Unified Progress overview and quieter Statistics page
- Flashcard improvements
- Multiple accepted glosses
- Reader polish, performed alongside Reader-related work
- Grammar polish, performed alongside Grammar-related work
- UI polish folded naturally into related feature work

## Upcoming

- v4.2.3: Book Progress & Reading Readiness — complete
- v4.2.4: Reader ↔ Learn Integration — complete
- v4.2.5: Reference Foundation
  - Phase A
    - Reference organization
    - UI consistency
    - Known Hebrew fix
    - New Words language selection
  - Phase B
    - Scholarly grammar audit
    - Grammar verification
    - Regression tests
    - `docs/grammar-audit.md`
- v4.2.6: Paradigm Recognition — complete
- v4.2.7: Progress & Statistics — complete
- v4.2.8: Word Page Excellence — complete
- v4.2.9: Learning Refinement
  - Navigation audit
  - UX audit
  - Terminology audit
  - Button audit
  - Session flow
  - Final polish
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
