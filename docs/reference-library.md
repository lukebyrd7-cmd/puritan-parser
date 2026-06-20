# Grammar & Reference Library (v3.5)

The v3.5 Reference / Grammar library adds concise, searchable grammar reference pages for Greek and Hebrew without changing the vocabulary, flashcard, parsing, settings, or source-data pipelines.

## Scope

This library is a first-pass reference aid, not a full grammar textbook. It intentionally does not add drills, Bible reader behavior, account/sync features, audio, AI explanations, new parsing engines, large external datasets, Hebrew headword normalization, or source-data rewrites.

## Content model

Reference topics live in `src/features/grammar/reference-data.js` as simple JavaScript data. Each topic supports:

- `id`: stable internal identifier used for links.
- `language`: `greek` or `hebrew`.
- `title`: display title.
- `category`: grouping label shown in the topic list.
- `summary`: short overview for the page header and search.
- `body`: concise explanatory paragraphs.
- `charts`: one or more tables with `label`, `columns`, and `rows`.
- `examples`: short examples with explanatory notes.
- `related`: topic ids for internal cross-links.

The same module exposes helper functions for the UI and tests:

- `referenceTopics`
- `getReferenceTopic(id)`
- `searchReferenceTopics(query, language)`
- `topicLabel(id)`

## UI location

The app shell contains the Reference / Grammar view in `index.html`. Rendering behavior lives in `src/features/grammar/index.js`, which reads the data module, renders a searchable topic list, renders the selected page, and wires related-topic buttons.

The library is loaded during startup through `src/main.js` and initialized from `src/bootstrap.js`. The service worker precache includes the reference modules so the feature remains available offline after app install.

## Search behavior

Reference search is intentionally local and lightweight. It searches across both languages by default, with an optional language filter. Searchable fields include titles, categories, summaries, body text, chart labels, chart cells, examples, and related-topic labels.

## Adding future topics

1. Add a new topic object to `referenceTopics` in `src/features/grammar/reference-data.js`.
2. Choose a stable `id` such as `greek-participles` or `hebrew-construct-chain`.
3. Keep `body` paragraphs concise and student-friendly.
4. Use `charts` for paradigms or summaries rather than embedding tables in UI code.
5. Add related topic ids only when the target topic exists.
6. Add or update tests in `tests/reference-library.test.js` for new required coverage.

## Future enhancements

Potential future work includes deeper syntax pages, vocabulary cross-links from word details into related reference pages, printable reference sheets, richer category grouping, and optional diagrams. These should remain modular and should not merge parsing logic with reference-study content.
