# Reader Architecture (v3.6.1 Greek Reader MVP)

The Reader is a reading-first shell for the Greek New Testament. It intentionally avoids interlinear display, word popups, glosses, parsing panels, notes, highlighting, commentary, AI, accounts, sync, and Hebrew reading.

## UI placement

The top navigation includes `Vocabulary`, `Flashcards`, `Parsing`, `Grammar`, and `Reader`. The Reader route is `/reader` and renders `readerView`.

## Language-aware structure

Reader code is configured by language in `ReaderConfig` in `src/features/reader/index.js`. The v3.6.1 implementation enables only Greek, but the shape is intentionally language-aware:

```js
greek: {
  label: 'Greek New Testament',
  dataRoot: 'data/greek',
  books: [
    { id: 'matthew', name: 'Matthew', chapters: 2 },
    { id: 'mark', name: 'Mark', chapters: 1 }
  ]
}
```

Future Hebrew support should add a sibling `hebrew` config with its own `dataRoot`, book list, chapter counts, and search index.

## Chapter file structure

Bible text is separate from vocabulary and parser data. Each chapter lives in its own file:

```text
data/
  greek/
    search-index.json
    matthew/
      1.json
      2.json
    mark/
      1.json
```

Chapter files use this shape:

```json
{
  "language": "greek",
  "book": "matthew",
  "bookName": "Matthew",
  "chapter": 1,
  "paragraphs": [
    {
      "verses": [
        {
          "number": 1,
          "text": "Βίβλος γενέσεως ...",
          "lemmas": ["βίβλος", "γένεσις"]
        }
      ]
    }
  ]
}
```

Paragraphs are rendered as paragraphs. Verses render inline with verse numbers.

## Lazy loading philosophy

The Reader loads only the current chapter with `fetch()` through `loadReaderChapter(language, book, chapter)`. Loaded chapters are cached in memory by `language/book/chapter` so revisiting a chapter does not refetch it during the same session.

The service worker keeps JSON files out of the install precache. JSON is cached at runtime only after a feature requests it. This keeps the startup bundle small and avoids preloading the whole New Testament.

## State persistence

The Reader persists the last language, book, and chapter under `pp_reader_location`. Reopening the Reader restores that location and then lazy-loads only that chapter.

## Search

Search is intentionally simple. Greek search supports:

- surface text matching;
- lemma text matching;
- direct verse references such as `Matthew 1:18`.

Search reads `data/greek/search-index.json`, shows concise verse results, and clicking a result jumps to the result's chapter and verse. Advanced morphology-aware search is out of scope for v3.6.1.

## Scope boundaries

This milestone is the reading shell only. Do not add:

- interlinear mode;
- word popups;
- gloss display;
- parsing display;
- commentary;
- notes;
- highlights;
- AI features;
- accounts or sync;
- Hebrew reader UI.

## Future Hebrew support

For v3.6.4, add `ReaderConfig.hebrew`, place data under `data/hebrew/<book>/<chapter>.json`, add a Hebrew search index, and reuse the same loader, route, state persistence, and navigation behavior. Hebrew-specific typography and RTL handling should be added at that time without changing the Greek data shape.
