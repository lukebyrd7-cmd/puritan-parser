# Reader Architecture

Historical note: this file records the v3.6 Reader architecture snapshot. Current Reader direction is governed by [Product Bible v5](product-bible-v5.md), with current shared Reader architecture summarized in [Architecture](architecture.md). Do not treat the older scope boundaries below as current v5 product limits.

## v1.4.2 reading modes and place restoration

### v1.5 stabilization

Original and English are one exclusive two-state choice with radio-group semantics; exactly one mode is active. While English is visible, prepared original-language markup remains hidden and inert in the same rendered chapter. Switching back to Original updates both control groups synchronously, reveals that prepared layer without a chapter request or continuous-window rerender, and restores the canonical verse after the next layout frame. Visibility changes capture a genuinely visible original or English verse through a shared canonical chapter-and-verse identity, and request and restoration generations prevent stale location, translation, or scheduled scroll work from overwriting newer choices.

Chapter and translation loaders retain in-flight promises as well as completed data. Continuous mode schedules an idle prefetch for at most the immediately previous and next chapters outside the rendered window. Failed prefetches are removed from the in-flight cache so a later boundary load can retry. The rendered window remains limited to five chapters and does not cross books automatically.

At phone widths, the secondary visibility toolbar is fixed below the compact app header (`top`, not `bottom`), uses top/left/right safe-area insets, and appears only after the primary controls leave the viewport. It reserves no large bottom toolbar area and focus restoration cannot pull the primary controls back into view.

The shared Greek/Hebrew Reader supports two explicit modes: Continuous and One chapter at a time. Continuous is the default when no valid saved mode exists. Existing `chapter` and `continuous` values remain authoritative, so users who selected one-chapter reading retain it. The choice lives under Settings → Reader rather than in the always-visible Reader controls. The former Reader options shortcut was removed without a replacement, while the Settings page's Return to Reader action remains available. Continuous mode renders the selected chapter with nearby chapters from the same book, then incrementally loads another adjacent chapter near a scroll boundary. The rendered window is bounded to five chapters, uses the existing `language/book/chapter` memory cache, preserves canonical order, and rejects duplicates.

Continuous mode observes the small set of rendered chapter sections relative to the active scroll viewport. The chapter nearest the reading anchor becomes current, updating the chapter selector and status labels without pushing or replacing browser history. Observer callbacks do not rerender merely to change the current indicator. Scroll persistence remains debounced.

`pp_reader_location` remains the sole Reader location and reading-mode key. Its older `language`, `book`, `chapter`, and `scrollY` records remain readable. Records may also store `mode`, a stable verse anchor, the verse's viewport-relative offset, and the Scripture pane's scroll offset. Missing or invalid mode values resolve to Continuous; valid saved Chapter and Continuous values are preserved. Settings updates only the existing `mode` field and retains the rest of the location record, so no migration or storage-key rename is required.

Original and English visibility share one canonical `textMode` setting and cannot show both or neither. Older stored `showOriginal`/`showEnglish` combinations remain readable: an explicit legacy preference wins, otherwise both or neither resolve to the safe default Original mode. The same state drives the primary controls and the mobile toolbar, so the controls cannot drift apart. At widths up to 640px the primary controls participate in document scrolling; once they leave the viewport, an IntersectionObserver reveals a compact, safe-area-aware top toolbar with the current chapter and the exclusive language choice. The toolbar is absent on desktop.

Continuous mode starts adjacent work before the terminal boundary based on scroll direction and remaining distance. Original mode does not wait for English JSON; English mode requests the structural original chapter and translation concurrently. In-flight and completed chapter work is reused, prepared chapter markup is inserted without rerendering existing chapters, and trimming retains the bounded five-chapter window while restoring the canonical verse anchor.

Continuous reading deliberately omits automatic book transitions, unbounded DOM retention, interlinear realignment work, annotations, bookmarks, and reading-history analytics. Chapter JSON and translation JSON remain runtime-loaded and runtime-cached; none are added to the startup precache.

The Reader is a reading-first shell for the Greek New Testament. It intentionally avoids interlinear display, inline glosses, notes, highlighting, commentary, AI, accounts, sync, and Hebrew reading.

## Current UX note

v5.1.1 reduces stacked Reader controls and prioritizes visible Scripture space by keeping translation mode, chapter navigation, Reader Settings, Search, Book Progress, and chapter status in a more compact controls area.

v5.1.2 keeps Display: Interlinear available for Greek. Hebrew currently supports Original display only; Hebrew Interlinear is planned, but requires reliable token-level English gloss data and is intentionally gated until that data is available.

Current display mode behavior:

- Greek: Original and Interlinear.
- Hebrew: Original now; Interlinear planned and gated by reliable token-level gloss data.

v5.1.3 keeps the mobile Reader text-first: controls should stay compact, secondary actions should be quiet, and visible Scripture space should take priority over repeated chapter/status labels.

## UI placement

The top navigation includes `Vocabulary`, `Flashcards`, `Parsing`, `Grammar`, and `Reader`. The Reader route is `/reader` and renders `readerView`.

## Language-aware structure

Reader code is configured by language in `ReaderConfig` in `src/features/reader/index.js`. The current implementation enables only Greek, but the shape is intentionally language-aware:

```js
greek: {
  label: 'Greek New Testament',
  dataRoot: 'data/greek',
  books: [
    { id: 'matthew', name: 'Matthew', chapters: 28 },
    { id: 'mark', name: 'Mark', chapters: 16 }
  ]
}
```

Future Hebrew support should add a sibling `hebrew` config with its own `dataRoot`, book list, chapter counts, and search index.

## Generator architecture

Reader data is generated by `scripts/generate-reader-data.js`. The generator is reusable by book and writes one JSON file per chapter under `data/greek/<book>/<chapter>.json` plus an optional `data/greek/search-index.json`.

The generator detects existing source files under `data/source/morphgnt-sblgnt`, which is populated by `scripts/download-source-data.js`. That source is MorphGNT's morphology aligned with SBLGNT text, so generated files can include both surface text and token metadata when the source provides it. The generator does not download data itself and does not introduce new external dependencies.

Common commands:

```sh
npm run data:download
npm run reader:generate -- --book matthew
npm run reader:generate -- --book mark --no-search-index
node scripts/generate-reader-data.js --source-root data/source --output-root data/greek --book matthew
```

v3.6.1c populated Matthew completely by running `npm run reader:generate -- --book matthew` after placing MorphGNT SBLGNT source data at `data/source/morphgnt-sblgnt/61-Mt-morphgnt.txt`. v3.6.1d adds Mark by placing MorphGNT SBLGNT source data at `data/source/morphgnt-sblgnt/62-Mk-morphgnt.txt` and regenerating the Reader data for both currently supported books with `node scripts/generate-reader-data.js --book matthew --book mark`. Regenerating both books keeps `data/greek/manifest.json` and `data/greek/search-index.json` aligned with the complete Reader corpus. Future imports should run the generator for manageable book batches and review the resulting JSON separately.

## Chapter schema

The standard generated chapter shape is:

```json
{
  "book": "matthew",
  "bookName": "Matthew",
  "chapter": 1,
  "source": "MorphGNT SBLGNT (data/source/morphgnt-sblgnt)",
  "verses": [
    {
      "verse": 1,
      "text": "Βίβλος γενέσεως ...",
      "tokens": [
        {
          "surface": "Βίβλος",
          "lemma": "βίβλος",
          "parse": "N- ----NSF-"
        }
      ]
    }
  ]
}
```

Required chapter fields are `book`, `chapter`, and `verses`. Required verse fields are `verse` and `text`. The `tokens` array is included only when source data supplies token information; token metadata should not be invented by the Reader pipeline.

The Reader UI supports this canonical generated `verses` schema, while the audit script still accepts the older paragraph wrapper for compatibility with any remaining sample data.

## Word popup

When a verse includes token metadata, the Reader renders each Greek token as a focusable inline button. The buttons preserve the reading flow and do not display glosses or parsing inline. If a verse has no usable token metadata, the Reader renders the verse as plain Greek text.

Clicking or tapping a token opens a lightweight word popup. On small screens it behaves like a bottom sheet; on larger screens it appears as a compact dialog. The popup prioritizes quick reading help: surface form, primary gloss, student-friendly parsing meaning, frequency, reference, and related Grammar links. Alternate glosses are shown as a quiet supporting line when available.

Gloss lookup uses existing local data only:

- `data/glosses/greek-glosses.json` for lemma-level primary and alternate glosses;
- loaded Greek vocabulary entries from `vocab_all.json` via app state for legacy gloss fallback and frequency.

The lookup prefers exact Greek lemma matches, then falls back to accent-insensitive matching. Frequency is aggregated across matching vocabulary forms for the same lemma, which keeps lemma-mode totals such as λόγος at 330× without changing global vocabulary frequency calculations.

Parsing explanations use the shared parser helper (`ParserCore.decodeParse`). The helper accepts compact classroom codes such as `N-NSM` and `V-PAI-3S`, and the padded MorphGNT-style codes stored in Reader chapter files such as `N- ----NSM-` and `V- 3IAI-S--`. When decoded, the popup shows prose like `Noun — nominative singular masculine` and keeps the raw parse code as small muted text near the bottom. If a code cannot be decoded, the popup shows only the raw code.

The popup also includes lightweight links into existing Grammar Handbook topics where the parse kind supports it:

| Token kind | Links |
| --- | --- |
| Noun | Noun Paradigms, Case Endings |
| Adjective | Adjective Paradigms, Adjective Endings |
| Verb | Verb Paradigms, Parsing Guide |
| Participle | Participles, Verb Paradigms |
| Article | Article Paradigms, Article Endings |

The popup closes with its close button, outside click/tap, or Escape. Grammar links can navigate to the grammar reference, and `Open Word Page` closes the popup before opening the static Word Page view. The Reader location remains persisted separately under `pp_reader_location`.

## Search index structure

`data/greek/search-index.json` is generated from chapter files by the same generator. Each entry is verse-scoped and supports surface forms, lemmas, and references:

```json
{
  "book": "matthew",
  "bookName": "Matthew",
  "chapter": 1,
  "verse": 1,
  "text": "Βίβλος γενέσεως ...",
  "surface": ["Βίβλος", "γενέσεως"],
  "lemmas": ["βίβλος", "γένεσις"]
}
```

The index is intentionally simple. It is designed for surface text matching, lemma matching, and direct reference navigation. Morphology-aware search remains out of scope.

## Audit script

Reader data is audited by `scripts/audit-reader-data.js`. It reports:

- books present;
- chapters present;
- verse counts per chapter;
- missing chapters when an expected manifest is provided;
- missing verses by detecting gaps in verse numbering.

Common commands:

```sh
npm run reader:audit
node scripts/audit-reader-data.js --data-root data/greek
node scripts/audit-reader-data.js --data-root data/greek --expected expected-reader-books.json
```

The audit accepts both the generated `verses` schema and the older MVP paragraph sample shape so it can validate current sample data while future generated data is introduced.

## v3.6.1d Mark audit results

Mark is generated from MorphGNT SBLGNT into `data/greek/mark/1.json` through `data/greek/mark/16.json`. The v3.6.1d audit reports 16 Mark chapters with these verse counts:

| Book | Chapter count | Verse counts |
| --- | ---: | --- |
| Mark | 16 | 1:45, 2:28, 3:35, 4:41, 5:43, 6:56, 7:36, 8:38, 9:48, 10:52, 11:32, 12:44, 13:37, 14:72, 15:46, 16:20 |
| Matthew | 28 | 1:25, 2:23, 3:17, 4:25, 5:48, 6:34, 7:29, 8:34, 9:38, 10:42, 11:30, 12:50, 13:58, 14:36, 15:39, 16:28, 17:26, 18:34, 19:30, 20:34, 21:46, 22:46, 23:38, 24:51, 25:46, 26:75, 27:66, 28:20 |

Known limitation: the audit reports verse-number gaps where the SBLGNT/MorphGNT source omits verses present in some later verse traditions: Mark 7:16, Mark 9:44, Mark 9:46, Mark 11:26, Mark 15:28, Matthew 17:21, Matthew 18:11, and Matthew 23:14. These are source omissions, not generated empty verses; the Reader pipeline does not invent missing verse text or token metadata.

## Lazy loading philosophy

Chapter mode loads only the current chapter with `fetch()` through `loadReaderChapter(language, book, chapter)`. Continuous mode starts with the current and immediately adjacent chapters that exist in the selected book, then grows a bounded five-chapter window as the user approaches either edge. Loaded chapters are cached in memory by `language/book/chapter` so revisiting a chapter does not refetch it during the same session.

The service worker keeps JSON files out of the install precache. JSON is cached at runtime only after a feature requests it. This keeps the startup bundle small and avoids preloading the whole New Testament.

## State persistence

The Reader persists the last language, book, chapter, reading mode, verse anchor, anchor-relative offset, and scroll fallback under `pp_reader_location`. Reopening the Reader restores the relevant bounded content first and then restores the verse-relative place. Older location records without a valid mode open in Continuous mode and continue to restore safely; valid saved Chapter mode remains unchanged.

## Matthew v3.6.1c audit results

Matthew was generated from MorphGNT SBLGNT and contains 28 chapter files under `data/greek/matthew/`. The audit reports 28 Matthew chapters, with verse counts: 25, 23, 17, 25, 48, 34, 29, 34, 38, 42, 30, 50, 58, 36, 39, 28, 26, 34, 30, 34, 46, 46, 38, 51, 46, 75, 66, and 20. The SBLGNT source omits Matthew 17:21, 18:11, and 23:14, so the audit lists those as missing verse numbers rather than inventing text not present in the source. Mark 1 remains present as previously generated sample data, so `npm run reader:audit` reports both `mark` and `matthew`.

Known limitations: this data includes Greek surface text and MorphGNT token metadata where available. The Reader now has a compact word popup, but it still does not add morphology-aware search, interlinear mode, inline glosses, commentary, notes, highlights, Hebrew Reader support, or AI features.

## Search

Search is intentionally simple. Greek search supports:

- surface text matching;
- lemma text matching;
- direct verse references such as `Matthew 1:18`.

Search reads `data/greek/search-index.json`, shows concise verse results, and clicking a result jumps to the result's chapter and verse. Advanced morphology-aware search is out of scope for v3.6.1c.

## Scope boundaries

The Reader remains intentionally narrow. Do not add:

- interlinear mode;
- inline gloss display;
- full parsing panels;
- commentary;
- notes;
- highlights;
- AI features;
- accounts or sync;
- Hebrew reader UI.

## Future Hebrew compatibility

For future Hebrew Reader support, add `ReaderConfig.hebrew`, place data under `data/hebrew/<book>/<chapter>.json`, add a Hebrew search index, and reuse the same loader, route, state persistence, and navigation behavior. Hebrew generators should emit the same high-level chapter contract (`book`, `chapter`, `verses`) and may add token fields only when source data provides them. Hebrew-specific typography and RTL handling should be added in the UI layer without changing the Greek data generator contract.

## v1.4.1 word-details display modes

Reader word details now support three display preferences in the Reader settings panel:

- **Auto** (default): uses a side panel when the Reader has enough horizontal space, and uses the overlay on smaller screens.
- **Overlay**: always uses the established popup/overlay experience.
- **Side panel**: keeps the passage and word details visible together when space permits, with an overlay fallback when the passage would become too narrow.

Quick details continue to show the selected form, lemma/root, gloss, parsing, frequency, learning state, and Reference links when those data are available. On wide layouts, **Open full details** expands the side panel into the existing Word Page content while preserving the Reader passage and scroll position; **Back to quick details** returns to the compact view. **Open as full page** remains available for a standalone Word Page route with more horizontal space.

On phone-width and narrow tablet layouts, Auto and Side panel fall back to the overlay so the biblical text is not crushed. In overlay mode, full details open as the standalone Word Page rather than a cramped in-place panel.

This release does not implement continuous reading, adjacent chapter loading, or automatic URL updates while scrolling. Reader location, chapter, selected translation, and scroll restoration continue to use the existing Reader persistence flow.
