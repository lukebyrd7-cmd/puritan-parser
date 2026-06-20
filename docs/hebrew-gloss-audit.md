# Hebrew gloss audit

This audit documents v3.3.1a Hebrew gloss source infrastructure. Hebrew source morphology, lemma grouping, lexical forms, parsing, and runtime search/flashcard architecture remain unchanged.

## v3.3.1a source approach

Hebrew glosses now live in `data/glosses/hebrew-glosses.json` as compact lemma-keyed records. Each record may provide:

- `primaryGloss`
- `alternateGlosses`
- `glossSource`
- `glossLicense`
- `glossAttribution`

During `npm run data:build`, `scripts/build-expanded-vocab.js` loads this source file and merges gloss fields into Hebrew vocabulary rows by exact `lang + lemma`. It does not normalize Hebrew lexical forms, alter lemma grouping, rewrite morphology, or add Hebrew-specific runtime systems.

## Why Hebrew uses a source file

Greek gloss expansion was small enough to review as direct vocabulary data. Hebrew vocabulary contains many more generated form rows, so directly populating `vocab_all.json` creates oversized generated diffs and makes source review difficult. The Hebrew source file keeps reviewed gloss decisions small, durable, and lemma-centered while allowing the build step to expand them into generated vocabulary data when needed.

## Pilot coverage

The initial pilot includes 60 high-frequency Hebrew lemmas, including exact OSHB lemma keys where the generated vocabulary currently emits numeric lemma identifiers. It is intentionally infrastructure-focused rather than coverage-focused.

Generated from the current checked-in `vocab_all.json` plus the pilot source with `node --test` and `npm run gloss:audit -- --no-fail`:

| Metric | Count |
| --- | ---: |
| Pilot source lemmas | 60 |
| Total Hebrew entries | 56,803 |
| Hebrew entries with checked-in `primaryGloss` | 253 |
| Hebrew entries covered after applying pilot source | 3,272 |
| Total Hebrew lemmas | 9,152 |
| Hebrew lemmas with checked-in glosses | 251 |
| Hebrew lemmas covered after applying pilot source | 281 |
| Checked-in Hebrew lemma coverage | 2.74% |
| Hebrew lemma coverage after applying pilot source | 3.07% |

> Note: `vocab_all.json` is intentionally not mass-edited in this PR. Coverage increases from the pilot source are realized when maintainers run `npm run data:build` and choose to commit generated vocabulary updates in a separate, reviewable data refresh.

## Future gloss additions

1. Add or edit Hebrew glosses in `data/glosses/hebrew-glosses.json`, keyed by the exact Hebrew lemma emitted by the source-data build.
2. Keep records compact: one `primaryGloss`, a short `alternateGlosses` array, and explicit source/license/attribution metadata.
3. Prefer the next high-frequency unglossed lemma band before lower-frequency additions.
4. Do not normalize Hebrew lexical forms, change Hebrew lemma grouping, rewrite morphology, or add runtime Hebrew gloss systems as part of gloss-source additions.
5. Use `npm run data:build` locally to verify merge behavior, but avoid committing broad `vocab_all.json` churn unless the task is explicitly a generated vocabulary refresh.

## Recommended next frequency band

Expand the remaining Hebrew lemmas with aggregate frequency `1000+`, then proceed to the `500-999` band. This keeps review effort focused on the forms students are most likely to encounter.
