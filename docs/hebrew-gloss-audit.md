# Hebrew gloss audit

This audit documents v3.3 Hebrew gloss completion using the existing shared gloss model. Hebrew source morphology, lemma grouping, and lexical-form/headword structure were not normalized or rewritten.

## Coverage summary

Generated from `vocab_all.json` with `npm run gloss:audit -- --no-fail` after populating Hebrew `primaryGloss` and `alternateGlosses` from existing seed `gloss` values.

| Metric | Count |
| --- | ---: |
| Total Hebrew entries | 56,803 |
| Entries with `primaryGloss` | 253 |
| Entries with `alternateGlosses` | 134 |
| Entries missing glosses | 56,550 |
| Hebrew gloss coverage | 0.45% |

## Source information

Current Hebrew glosses come from the existing Puritan Parser seed vocabulary rows already present in `vocab_all.json`. The v3.3 work splits those legacy comma/semicolon/pipe-delimited `gloss` strings into shared gloss fields:

- `primaryGloss`
- `alternateGlosses`
- `glossSource`
- `glossLicense`
- `glossAttribution`

The Hebrew morphology rows remain attributed to Open Scriptures Hebrew Bible where produced by the source-data build; seed-only rows keep their seed vocabulary source metadata.

## Remaining gaps

56,550 Hebrew entries still have no available English gloss in repository data. This milestone intentionally does not add a new Hebrew lexicon, normalize Hebrew lexical forms, change lemma grouping, or rewrite morphology source data.

## Future recommendations

1. Add a separately licensed Hebrew lexicon/gloss source with explicit attribution and version/date metadata.
2. Implement the new lexicon as a language-agnostic merge input, not a Hebrew-specific runtime subsystem.
3. Keep future Hebrew lexical-form normalization as a separate audited milestone.
