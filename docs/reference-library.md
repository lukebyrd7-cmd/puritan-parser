# Grammar & Reference Library (v3.5.1)

The Reference / Grammar library is a data-driven study companion for Greek and Hebrew. It remains a static reference system: it does not add drills, Bible reader behavior, AI explanations, audio, new parsing engines, lexical normalization, accounts, sync, or external APIs.

## Content model

Reference topics live in `src/features/grammar/reference-data.js` as plain JavaScript objects. Core fields are:

- `id`, `language`, `title`, `category`, `summary`, and `body` for stable routing, grouping, and readable article content.
- `charts`: table data with `label`, `columns`, `rows`, optional `heading`, optional `note`, and optional `color`.
- `recognitionTips`: student-focused pattern-recognition bullets.
- `examples`: biblical or representative examples with `word`, `reference`, `translation`, and optional `note`.
- `related`: topic ids for internal cross-links.
- `principalParts`: Greek verb principal parts when relevant.
- `stemRelationships`: Hebrew root/stem comparison data with `root`, `stems`, and explanatory bullets.
- `frequency`: simple educational labels such as “Indicative mood ≈ most finite verbs.”
- `featureLinks`: lightweight hook objects with `label`, `type`, and `target` for future “See words with this feature” or vocabulary integrations.

## Chart structure

Charts are static tables. Keep each chart small enough to scan on mobile, prefer concise labels, and place qualifications in `note` rather than in oversized cells. Color categories use the existing reference UI classes:

- Greek tense: blue; voice: green; mood: purple.
- Hebrew Qal: blue; Niphal: green; Piel: orange; Pual: amber; Hiphil: red; Hophal: gray; Hitpael: teal.

## Paradigm pages

Paradigm pages are reference articles, not morphology generators. Greek includes representative pages for `λύω`, `λόγος`, and `καλός`. Hebrew includes static pages for Qal, Niphal, Piel, Pual, Hiphil, Hophal, and Hitpael, with perfect, imperfect, imperative, infinitive construct, infinitive absolute, and participle rows.

## Cross-links and feature hooks

Use `related` for internal grammar navigation. Use `featureLinks` only as lightweight future-facing hooks; they should not require a drill engine, Bible reader, or vocabulary integration to exist.

## Search behavior

Search is local and fast. It indexes titles, ids, categories, summaries, body text, examples, recognition tips, chart labels and cells, principal parts, references, frequency metadata, feature links, stem relationships, and related-topic labels.

## Adding future topics

1. Add a topic object to `referenceTopics` in `src/features/grammar/reference-data.js`.
2. Choose a stable id such as `greek-participles` or `hebrew-construct-chain`.
3. Keep paragraphs concise and student-friendly.
4. Put paradigms and summaries in `charts`; avoid hard-coded UI tables.
5. Add `recognitionTips` for practical pattern recognition.
6. Add examples as `{ word, reference, translation }`.
7. Add `related` ids only when targets exist.
8. Add tests in `tests/reference-library.test.js` for new required coverage.
