# Hebrew gloss audit

This audit documents v3.3.1f Hebrew high-frequency gloss coverage. Hebrew source morphology, lemma grouping, lexical forms, parsing, and runtime search/flashcard architecture remain unchanged.

## Source approach

Hebrew glosses live in `data/glosses/hebrew-glosses.json` as compact lemma-keyed records. Each record may provide:

- `primaryGloss`
- `alternateGlosses`
- `glossSource`
- `glossLicense`
- `glossAttribution`

During `npm run data:build`, `scripts/build-expanded-vocab.js` loads this source file and merges gloss fields into Hebrew vocabulary rows by exact `lang + lemma`. It does not normalize Hebrew lexical forms, alter lemma grouping, rewrite morphology, or add Hebrew-specific runtime systems.

## Why Hebrew uses a source file

Greek gloss expansion was small enough to review as direct vocabulary data. Hebrew vocabulary contains many more generated form rows, so directly populating `vocab_all.json` creates oversized generated diffs and makes source review difficult. The Hebrew source file keeps reviewed gloss decisions small, durable, and lemma-centered while allowing the build step to expand them into generated vocabulary data when needed.

## v3.3.1f frequency 5-9 coverage

v3.3.1f expands the source file from the v3.3.1e high-frequency set to every Hebrew lemma whose aggregate frequency in the checked-in vocabulary is between 5 and 9 inclusive. The frequency ≥10 bands remain fully covered. The checked-in generated rows are intentionally not mass-edited; coverage below reports the result after applying the lemma source map in the same way the build process applies it.

Generated from the current checked-in `vocab_all.json` plus `data/glosses/hebrew-glosses.json` after applying Hebrew source glosses by exact lemma:

| Metric | Count |
| --- | ---: |
| Hebrew source lemmas | 3,946 |
| Total Hebrew entries | 56,803 |
| Hebrew entries affected by source glosses | 49,265 |
| Total Hebrew lemmas | 9,152 |
| Hebrew lemmas with glosses after source merge | 3,946 |
| Overall Hebrew entry coverage after source merge | 86.73% |
| Overall Hebrew lemma coverage after source merge | 43.12% |

## Coverage by frequency band

| Frequency band | Lemmas with glosses | Total lemmas | Coverage |
| --- | ---: | ---: | ---: |
| 1000+ | 89 | 89 | 100.00% |
| 500-999 | 99 | 99 | 100.00% |
| 100-499 | 446 | 446 | 100.00% |
| 50-99 | 348 | 348 | 100.00% |
| 25-49 | 587 | 587 | 100.00% |
| 10-24 | 1,161 | 1,161 | 100.00% |
| 5-9 | 1,216 | 1,216 | 100.00% |
| 1-4 | 0 | 5,206 | 0.00% |

## Maintenance notes

1. Add or edit Hebrew glosses in `data/glosses/hebrew-glosses.json`, keyed by the exact Hebrew lemma emitted by the source-data build.
2. Keep records compact: one `primaryGloss`, a short `alternateGlosses` array, and explicit source/license/attribution metadata.
3. Prefer the next high-frequency unglossed lemma band before lower-frequency additions.
4. Do not normalize Hebrew lexical forms, change Hebrew lemma grouping, rewrite morphology, or add runtime Hebrew gloss systems as part of gloss-source additions.
5. Use `npm run data:build` locally to verify merge behavior, but avoid committing broad `vocab_all.json` churn unless the task is explicitly a generated vocabulary refresh.

## Recommended next frequency band

The remaining maintainable expansion target is the 1-4 band: 5,206 of 5,206 lemmas in that band remain without glosses after v3.3.1f.
