# The Puritan Parser

The Puritan Parser is a local-first Biblical Greek and Hebrew study app. It combines a searchable vocabulary list, spaced-repetition flashcards, parsing drills, grammar-aware filtering, and import/export tools in a static web app that can be deployed with GitHub Pages.

## Features

- Greek and Hebrew vocabulary from `vocab_all.json`
- Word list with search, frequency filters, grammar category filters, due-only filtering, and mastery indicators
- SM-2 or Leitner-style spaced repetition
- Flashcard sessions for due, all filtered, new, or weakest cards
- Parsing drills for nouns, verbs, mixed forms, and all forms of a selected lemma
- Human-readable parse-code explanations such as `N-NSM` -> noun, nominative, singular, masculine
- Dashboard with due counts, streaks, recent performance, heatmap, and upcoming reviews
- Local JSON import/export
- Offline-friendly PWA files and install icons

## Data Schema

Vocabulary entries are JSON objects. Required fields:

```json
{
  "word": "λόγος",
  "lemma": "λόγος",
  "gloss": "word, message",
  "pos": "noun",
  "freq": 330,
  "lang": "greek",
  "parse": "N-NSM",
  "id": "gk-0001"
}
```

`word`, `gloss`, and `lang` are required for imports. `lang` must be `greek` or `hebrew`. SRS fields such as `ease`, `interval`, `repetitions`, `due`, and `history` are added automatically when missing.

## Import Formats

The importer accepts any of these shapes:

```json
[{ "word": "καί", "gloss": "and", "lang": "greek" }]
```

```json
{ "items": [{ "word": "καί", "gloss": "and", "lang": "greek" }] }
```

```json
{
  "greek": [{ "word": "καί", "gloss": "and" }],
  "hebrew": [{ "word": "אָמַר", "gloss": "to say" }]
}
```

## Local Development

Run a simple static server from the repo root:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Tests

```sh
npm test
```

The tests cover parse-code decoding, grammar categories, weak-card detection, and import validation.

## Deployment

The included GitHub Actions workflow deploys the static app to GitHub Pages on pushes to `main`. Enable GitHub Pages for the repository and choose GitHub Actions as the source.

## Notes

Study progress is stored in the browser with `localStorage`; it is not synced to a server. Export your data before clearing browser storage or switching devices.
