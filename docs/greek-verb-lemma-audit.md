# Greek verb lemma display audit

## Scope

This audit checks the current Greek vocabulary payload for verb entries whose `lemma`
value may not look like a normal first-person lexical/dictionary headword. It does
not change study-mode architecture or rewrite vocabulary data.

## Data inspected

- `vocab_all.json` is the active combined vocabulary payload.
- `scripts/build-expanded-vocab.js` is the generator for expanded Greek/Hebrew
  vocabulary data. For Greek MorphGNT rows it reads the source columns as
  `pos`, `morph`, `textForm`, `word`, `normalized`, and `lemma`, then stores the
  cleaned source `lemma` directly as the app `lemma`.
- The current checked-out repository does not include `data/source/`, so this
  audit could not inspect the original downloaded MorphGNT text files directly.

## Findings

The active payload has 19,049 Greek entries, including 10,239 Greek verb-form
entries and 1,858 unique Greek verb lemmas. A heuristic check for verb lemmas
that do not end like common Greek lexical verb headwords (`-ω`, `-ῶ`, `-μι`,
`-μαι`, with known exceptions such as `εἰμί`) found 16 unique lemmas.

Examples:

| lemma | example word | parse | note |
| --- | --- | --- | --- |
| `οἶδα` | `οἶδα` | `V-RAI-1S` | Perfect-form lexical lemma; common dictionary headword, but not a present `-ω` form. |
| `δεῖ` | `δεῖ` | `V-PAI-3S` | Impersonal verb; lemma is a finite third-singular display form. |
| `ἔξεστι(ν)` | `ἔξεστι(ν)` | `V-PAI-3S` | Impersonal verb; finite third-singular form with movable-n notation. |
| `μέλει` | `μέλει` | `V-PAI-3S` | Impersonal verb; finite third-singular form. |
| `ἔνι` | `ἔνι` | `V-PAI-3S` | Defective/impersonal-style finite form. |
| `εἴωθα` | `εἰωθός` | `V-XAP-ASN` | Perfect-form lexical lemma used with participial forms. |
| `ἔοικα` | `ἔοικε(ν)` | `V-XAI-3S` | Perfect-form lexical lemma. |
| `ἀπεῖπον` | `ἀπειπάμεθα` | `V-AMI-1P` | Aorist-form lexical lemma rather than a present `-ω` headword. |
| `ἐνδέχεται` | `ἐνδέχεται` | `V-PMI-3S` | Middle/passive finite form used as lemma. |
| `λυσιτελεῖ` | `λυσιτελεῖ` | `V-PAI-3S` | Contracted finite third-singular form used as lemma. |
| `χρή` | `χρή` | `V-PAI-3S` | Impersonal verb; finite form is also the conventional lexical citation. |

These entries are not necessarily corrupt. Several are valid defective,
impersonal, perfect-form, or Semitic/transliterated lexical citations. The UI
issue is that `lemma` currently has to serve two roles at once:

1. a stable grouping/review key, and
2. a student-facing lexical headword display.

When source lemmatization uses a finite, defective, or otherwise non-present
citation form, the display can look abnormal even if the grouping key is useful.

## Is another current field available for lexical display?

No. The current vocabulary objects only expose fields such as `word`, `lemma`,
`gloss`, `pos`, `freq`, `lang`, `parse`, `source`, `id`, `primaryGloss`, and
`alternateGlosses`. There is no existing `lexicalForm`, `headword`, or similar
separate display field in the active payload.

The Greek build code also does not map another source field into a lexical
headword. It chooses the display form from `normalized || word || textForm`,
then stores the source `lemma` as `lemma`.

## Recommendation

Do not rewrite broad Greek lemma data yet.

Instead, add an optional `lexicalForm` display field as a narrow vocabulary-data
extension:

- Preserve `lemma` as the existing grouping/review key so lemma-mode study,
  progress, and stored review data remain stable.
- Display `lexicalForm || lemma` wherever the user-facing dictionary headword is
  needed.
- Populate `lexicalForm` only for audited cases where a better pedagogical
  display headword is known and source-justified.
- Keep the original `lemma` visible or inspectable in debugging/audit contexts.

Suggested implementation path:

1. Add support in display helpers for `lexicalForm || lemma` without changing
   grouping keys.
2. Add a small audited override list for Greek verb display headwords, if needed.
3. Regenerate or patch only the specific entries whose display has been verified.
4. Add tests proving lemma grouping still uses `lemma`, while UI labels prefer
   `lexicalForm` when present.
