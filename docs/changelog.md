# Changelog

This changelog is a human-readable project history, not a Git log. Future entries should summarize meaningful releases rather than individual commits.

## v4.1.1

- Documented the educational philosophy behind Puritan Parser.
- Captured the conceptual design for the Learn system before v4.2 implementation.
- Recorded the recognition-first philosophy for paradigm practice.
- Captured the vocabulary study paths and Reading Readiness model.
- Clarified the distinction between progress as reading ability and statistics as app activity.

## v4.1

- Added project foundation documentation:
  - Product philosophy
  - Roadmap
  - Architecture guide
  - AI development guide
  - Human-readable changelog
- Established documentation as part of the product, not a separate afterthought.
- Clarified that future work should protect the quiet companion philosophy and update docs when meaningful features land.

## v4.0

- Completed the Hebrew Bible Reader.
- Consolidated Greek and Hebrew reading into shared Reader architecture.
- Added Word Pages for focused word-level study.
- Added Read in Context flows that return users from word study to the biblical text.
- Continued generated Reader data pipelines and audit tooling.

## v3.x

- Built the Grammar Handbook / Reference Library with Greek and Hebrew reference topics.
- Added Greek Reader foundations, chapter loading, Reader search, word popups, and generated Greek Reader data.
- Added expanded morphology-driven vocabulary and parsing data.
- Improved gloss architecture with primary glosses, alternate glosses, and custom user glosses.
- Added content pipeline conventions, manifests, attribution rules, lazy-loading boundaries, and service-worker caching rules.
- Added routing, schema migrations, and modular feature boundaries.

## v2.x

- Established the modular app structure under `src/`.
- Separated static/source data from local user progress.
- Added storage adapters, model helpers, and core data-loading boundaries.
- Expanded parser, filter, SRS, import/export, and dashboard test coverage.

## v1.x

- Established the original local-first vocabulary, flashcard, and parsing workflows.
- Stored study progress in the browser.
- Kept the app deployable as a static web app.
