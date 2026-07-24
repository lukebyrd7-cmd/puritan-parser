# Hebrew Search and Interlinear Data Audit

## Scope and decision

This audit covers the v1.6 Hebrew transliteration-search work and the source gate for a Hebrew word-gloss interlinear. The current repository supports transliteration-aware search without changing source records. It does **not** yet support a trustworthy Hebrew interlinear, so the interlinear remains disabled.

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

## Hebrew Reader token-data audit

The generated Hebrew chapter contract provides:

- book, chapter, and verse from the containing chapter/verse record;
- stable token order from each verse’s `tokens` array;
- a pointed surface form, including cantillation;
- a normalized numeric lexical identifier in `lemma`;
- OSHB morphology in `parse`;
- the original segmented OSHB lemma expression in `sourceLemma` when it differs from the normalized identifier;
- an optional OSHB `n` attribute.

The current contract does **not** provide:

- an explicit canonical token index or stable token ID;
- a token-level English contextual gloss;
- a source-supplied combined gloss for orthographic tokens containing prefixes or suffixes;
- a documented qere/ketiv display-and-alignment contract;
- punctuation tokens (sof pasuq is retained in verse text, not as a selectable token);
- complete gloss coverage for every displayed token.

The generator preserves each `<w>` element as one displayed orthographic token. Prefix and suffix analysis may be encoded with slash-separated morphology or `sourceLemma` values while the visible word remains unsplit. Maqqef and other source orthography are not converted into independently gloss-aligned lexical units. The optional `n` value is not present on every token and is not an application-level stable identity.

## Gloss-source assessment

`data/glosses/hebrew-glosses.json` is keyed by numeric lexical identifiers and provides concise **lexical** glosses where covered. It is not a contextual word-alignment source. Applying a base-lemma gloss to every orthographic token would omit or blur attached conjunctions, articles, prepositions, pronominal suffixes, and multi-unit analyses. Coverage is also incomplete. The WEB and OEB chapter files are verse translations and contain no Hebrew-token alignment.

Consequently, none of the available sources can reliably supply one honest combined gloss for every displayed Hebrew token. Even when a lexical gloss exists, it must not be presented as though it were a contextual translation.

## Source-gate decision

The v1.6 interlinear source gate fails. No Hebrew display preference or interlinear UI is enabled by this work. The existing disabled/fallback behavior remains in place, and Hebrew Original mode continues to render pointed, selectable tokens without transliteration.

A safe future implementation needs a licensed token-alignment source or generated dataset that records, at minimum:

- canonical book/chapter/verse/token index;
- the exact displayed orthographic token;
- all analyzed lexical units and attached morphemes;
- a source-supplied concise combined word gloss or an explicit unsupported state;
- qere/ketiv and maqqef policy;
- provenance, license, coverage, and version metadata.

That dataset must be audited against the Reader’s canonical token order before UI work resumes. Verse-level English word order, evenly divided translation text, inferred segmentation, and fabricated gloss combinations are not acceptable substitutes.
