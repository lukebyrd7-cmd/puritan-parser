# Hebrew Search and Interlinear Data Audit

## Scope and v1.7 decision

The v1.6 search model remains unchanged. v1.7 closes the former interlinear source gate with a separately generated, licensed, full-corpus alignment layer. The existing OSHB/WLC Reader tokens remain canonical for display and selection; MACULA Hebrew supplies aligned linguistic rows and Cherith occurrence-level English word or morpheme glosses. Standard Hebrew remains the default and no transliteration line is introduced.

## Existing Hebrew search entry points

| Entry point | Classification | v1.6 behavior |
| --- | --- | --- |
| Global Search (`src/features/global-search/index.js`) | Hebrew lexical search | Exact Hebrew, English gloss, and simplified Latin transliteration use the shared Hebrew search utility. |
| Reader Search (`src/features/reader/index.js`) | Hebrew biblical-text and lexical search | Direct references and numeric lemmas retain their existing behavior; Hebrew surface forms also match simplified Latin transliteration. |
| Vocabulary list filter (`src/features/vocab/index.js`) | Legacy list filtering, not a stable Hebrew lemma-search destination | Unchanged. It searches already-rendered study-entry text and is not given a parallel transliteration implementation. |
| Word Page “Read in Context” | Lemma occurrence lookup, not user-entered lexical search | Unchanged; it resolves the selected lemma through the Reader index. |
| Reference Search and Grammar Handbook article search | General grammar/article search | Unchanged. Hebrew transliteration is not applied to prose, topic, chart, or article search. |
| Reader token selection and word details | Direct token lookup, not text search | Unchanged. Selecting pointed Hebrew still opens the existing word-details flow. |

## Transliteration-search model

`src/core/hebrew-search.js` derives search-only forms from existing Hebrew strings. It strips cantillation, preserves the source Unicode strings, normalizes user punctuation/spacing and Latin diacritics, and creates a conservative internal consonant-and-vowel rendering. The internal form is a practical search convention, not a complete pronunciation or scholarly transliteration system.

Canonical search forms distinguish shin/sin, qoph/kaph, and the major consonant families. Simplified aliases accept common variations including `ch`/`kh`, `ts`/`tz`, a cautious `q`/`k` alternative, `v`/`w`, final `-h` omission when the Hebrew word actually ends in he, and undoubled consonants. They do not make all gutturals, sibilants, or stop consonants interchangeable.

Ranking is deterministic:

1. exact Hebrew;
2. exact canonical Latin form;
3. exact simplified Latin alias;
4. Hebrew or Latin prefix;
5. a bounded substring match of at least three Latin characters.

Global Search uses frequency only to break ties inside the same relevance tier. Exact Hebrew therefore cannot be displaced by a more frequent loose alias. The derived Global Search terms are built with the already-lazy vocabulary index. The Reader derives and caches its verse-level Hebrew terms only on the first Hebrew lexical search. Neither derived index is written to localStorage or added to the service-worker install precache.

Local performance measurements on the complete 20 MB Hebrew Reader search index were 0.82 seconds for first derivation and about 22–25 ms for subsequent searches in Node. In the in-app browser, a cold transliteration search including index fetch, JSON parsing, and derivation rendered in about 2.4 seconds; a cached search rendered in about 0.29 seconds. These are local-development measurements with automation overhead, not production guarantees. The UI shows a quiet searching status during the cold path, concurrent index requests share one in-flight load, and stale query results cannot replace a newer query.

Exact Hebrew remains the most precise input. Search transliteration is never rendered as a Reader line or result field.

## Source selection and license

Primary enrichment source: MACULA Hebrew Linguistic Datasets, <https://github.com/Clear-Bible/macula-hebrew>, exact commit `47db250bd55d0d8577f2a94fba114ef16c35b23c`, retrieved 2026-07-24. The imported `WLC/tsv/macula-hebrew.tsv` has SHA-256 `965cb0599beed2fe31283b615bcc369178141c0e718a66d97518d94309cfc124` and 475,911 data rows.

MACULA’s combined linguistic data and the incorporated Cherith Glosses for the Hebrew Old Testament are CC BY 4.0. Required attribution is: “MACULA Hebrew Linguistic Datasets, available at https://github.com/Clear-Bible/macula-hebrew/”. The repository-local `data/hebrew-interlinear/LICENSE.md` preserves the upstream license notice; `ATTRIBUTION.md` identifies the adaptations and Cherith credit.

STEPBible Data, <https://github.com/STEPBible/STEPBible-Data>, commit `b86d26cdb1f51729e73b5b4eb7f7ccadc5dfba39`, was reviewed as a secondary check on token schemas, qere policy, and licensing. No STEPBible field is imported. Its TAHOT stream intentionally follows qere and contains textual additions that make it unsuitable as the canonical alignment source for the existing Reader stream.

## Imported fields and transformations

`scripts/generate-hebrew-interlinear-data.js` imports MACULA `xml:id`, `ref`, `class`, `text`, `after`, `english`, `morph`, and `lemma`. It also parses the repository’s exact OSHB XML to distinguish qere and ketiv and to verify each Reader surface against its source.

Transformations are deliberately narrow:

- collapse whitespace in an English occurrence gloss;
- retain multiple MACULA rows as ordered segment records and join their nonempty glosses for one concise display line;
- derive unpointed Hebrew by removing combining marks from the unchanged Reader surface;
- copy Reader surface, source lemma expression, and morphology without linguistic alteration;
- assign stable IDs as `<book>.<chapter>.<verse>.<tokenIndex>`;
- record empty source glosses as `missing`, never replacing them with lexical glosses or verse-translation words.

The chapter format is compact: token and segment arrays use the ordered field maps in `source-manifest.json`. Location is supplied by the chapter and verse containers. Each expanded token can record surface, unpointed form, lemma, morphology, gloss and status, MACULA row IDs, OSHB ID, alignment class, qere/ketiv status and variant links, ordered segments, maqqef, and following punctuation.

## Reproducible generation

The generator never downloads a source and the app never needs an upstream network connection. Generation requires a currently supported Node.js release with `node:test` and npm; the publication audit used Node.js 24.18.0. Clone the upstream repository separately from Puritan Parser, check out the pinned revision, and resolve the Git LFS TSV:

```sh
git clone https://github.com/Clear-Bible/macula-hebrew.git
cd macula-hebrew
git checkout 47db250bd55d0d8577f2a94fba114ef16c35b23c
git lfs pull --include WLC/tsv/macula-hebrew.tsv
```

The required input is `WLC/tsv/macula-hebrew.tsv` at that revision. Its expected SHA-256 is `965cb0599beed2fe31283b615bcc369178141c0e718a66d97518d94309cfc124`. From the Puritan Parser repository, run:

```sh
npm run hebrew:interlinear:generate -- --macula-tsv <path-to-macula-hebrew>/WLC/tsv/macula-hebrew.tsv
```

The script reads the existing `data/hebrew` chapters and `data/source/morphhb-wlc` XML, then writes the machine-generated chapters and manifests under `data/hebrew-interlinear`; the committed license and attribution notices remain alongside them. A clean repository checkout therefore contains 934 files in that directory after generation. The MACULA repository must remain a separate checkout and its 84 MB source TSV is not copied into Puritan Parser.

A missing `--macula-tsv` path, malformed TSV width, missing required column, changed source hash or schema, incomplete verse set, OSHB/Reader surface difference, duplicate ID, source-only word, or unexplained Reader token fails generation. Upstream changes require an intentional commit/hash update, regeneration, review of audit deltas, and corresponding attribution/modification disclosure.

Run the command twice from the same clean checkout and verify `npm test` after each run. For the aggregate digest, sort every relative filename under `data/hebrew-interlinear`, then update one SHA-256 stream with each relative filename immediately followed by that file’s bytes. Both complete v1.7 runs produced the same 934-file aggregate SHA-256: `dab7552afccf0b9916cd3bd77b83843462bdb20f9eb58f1cfa1a67fbb6a4ee39`.

## Alignment method and qere/ketiv policy

The importer groups MACULA morpheme rows by orthographic `ref`, verifies the complete Reader sequence against OSHB, and uses exact-surface longest-common-subsequence alignment within each verse. A Reader-only token is accepted only when OSHB explicitly marks it as ketiv; it receives no qere gloss. Qere and ketiv remain separate selectable Reader tokens with separate stable IDs and a shared variant relationship. Any unexplained Reader token, source-only word, malformed row, source-hash change, or surface mismatch aborts generation.

Maqqef and punctuation remain relationships around the orthographic Reader unit rather than fabricated lexical tokens. Attached analyzed morphemes remain ordered segment metadata. This gives the display one compact gloss line while retaining the source analysis for audit.

## Complete-corpus audit

| Measure | Result |
| --- | ---: |
| Canonical books | 39 |
| Chapters | 929 |
| Verses | 23,213 |
| Reader tokens | 306,785 |
| Exact MACULA alignments | 305,517 |
| Accepted qere/ketiv tokens | 2,598 |
| Qere/ketiv variant groups | 1,251 |
| Structurally combined words | 145,993 |
| Maqqef relationships | 42,569 |
| Punctuation relationships | 25,535 |
| Missing occurrence glosses | 10,262 |
| Unresolved tokens | 0 |
| Token and verse identity coverage | 100% |

These measures describe overlapping properties and must not be added together. `Reader tokens`, `exact alignments`, and `unresolved tokens` are token-level alignment measures: all 306,785 Reader tokens are either one of the 305,517 exact alignments or one of the 1,268 explicitly resolved ketiv-only alignment exceptions. `Structurally combined` is a segmentation property of a successfully aligned Reader token, not an additional token: one orthographic Reader token can contain several ordered MACULA morpheme rows, whose nonempty occurrence glosses are joined into one display line. `Qere/ketiv tokens` counts both members of 1,251 variant groups where present; qere tokens can also be exact alignments, while the ketiv-only exceptions receive no qere gloss. `Missing occurrence glosses` likewise counts successfully aligned or explicitly resolved tokens whose source rows supply no display gloss. Thus the 145,993 structural cases, 2,598 qere/ketiv tokens, and 10,262 missing-gloss tokens overlap the alignment totals rather than extending them.

The difference between total Reader tokens and exact MACULA alignments is confined to the 1,268 explicit OSHB ketiv-only exceptions. `data/hebrew-interlinear/alignment-audit.json` also records these measures by book. Tests traverse every generated chapter and compare every token’s stable ID, surface, lemma expression, morphology, segmentation, gloss status, variant relationship, and source identity with the canonical Reader and manifest.

## Display, loading, and failure behavior

Settings → Reader offers Standard and Interlinear only for Hebrew display. The value is stored language-specifically inside the existing `pp_reader_adaptive_settings` record; invalid or missing values normalize to Standard. Greek display settings and the `pp_reader_location` schema are unchanged.

The Reader loads the enrichment only for Hebrew Original text in Interlinear mode. Standard Hebrew, Hebrew English mode, and Greek make no interlinear request. Chapter and continuous modes share the same loader and renderer; the existing continuous five-chapter bound remains in force. Concurrent loads deduplicate, completed loads remain in memory, failed loads may retry, and a failed enrichment request leaves Standard Hebrew readable with a retry action.

Generated chapter JSON is not installed with the app shell. It uses the existing network-first service-worker JSON path and becomes available offline only after that chapter has been requested and cached.

Installed shell availability is distinct from content availability: the shell can open offline after installation; an interlinear chapter can open offline only after that exact chapter asset has been runtime-cached; an uncached chapter cannot be acquired offline and must fall back to Standard Hebrew with retry available after connectivity returns.

## Performance and browser validation

Local Node medians for Genesis 1 string preparation were 4.980 ms for the v1.6 Standard renderer and 5.379 ms for the v1.7 Standard renderer, a 0.399 ms absolute increase. The first v1.7 interlinear file read/parse/decode/attach/render measured 21.663 ms, a cached interlinear render measured 6.556 ms, and preparation of three adjacent interlinear chapters measured 15.319 ms. These isolate application work and do not include network or browser automation.

The modified startup files grew by 14,792 uncompressed bytes compared with the v1.6 baseline. No interlinear JSON is requested by Standard Hebrew, English Hebrew, Greek, or initial app startup. The generated directory is 82,707,977 bytes (78.9 MiB) across 934 files, but remains chapter-addressable and outside the app-shell precache.

Actual browser checks covered 320×844, 390×844, 768×1024, 1440×900, and 1728×1000. No tested width produced page- or Reader-level horizontal overflow. Resizing and continuous insertion grew the live window from three chapters/946 interlinear tokens to the enforced maximum of five chapters/1,652 tokens; browser heap figures were unavailable, so DOM bounds are reported rather than speculative memory numbers. Light and dark themes, Chapter and Continuous modes, Genesis prose, Psalm 119 poetry, the final canonical chapter, missing glosses, qere/ketiv, word-details selection, and Original/English restoration were exercised. Console inspection reported no warnings or errors.

The in-app browser did not preserve a service-worker-controlled localhost page after the development server was stopped, so a genuine cached-offline reload could not be confirmed in that environment. Network-first JSON caching, exclusion from startup precache, failed-load retry, and Standard fallback are covered by automated tests; a production-origin offline pass remains a release QA item.

Accessibility inspection confirmed canonical DOM order, unique IDs, Hebrew `lang="he"`/RTL buttons, English `lang="en"`/LTR glosses, Hebrew-plus-gloss accessible names, and “Gloss unavailable” for the em dash state. Native Settings radios, 44 px minimum interlinear token height, visible focus styling, and unchanged reduced-motion behavior remain in the CSS/DOM contract.

## Gloss classification and limitations

The English line is an occurrence-level word or morpheme gloss, not a smooth translation and not a complete semantic analysis. Joined segment glosses can read awkwardly. 10,262 Reader tokens have no source occurrence gloss and intentionally display an em dash. The project has not corrected, harmonized, or filled individual source glosses, and structural alignment tests do not establish the scholarly correctness of every gloss.

The generated layer is pinned to one upstream commit. A future source revision requires an explicit commit/hash update, regeneration, review of all audit deltas, and disclosure of changes. The v1.7 display intentionally excludes transliteration, Strong numbers, morphology lines, parsing panels, and inferred English word order.
