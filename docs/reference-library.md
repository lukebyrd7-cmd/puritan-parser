# Reference Library / Grammar Handbook

The Grammar section is a static, language-aware reference handbook for Biblical Greek and Hebrew. It is intentionally not a morphology generator: every paradigm, decoder entry, recognition clue, and cross-link is authored as durable reference data.

## Language-aware behavior

Grammar follows the global app language mode. If the learner is using Greek, Grammar opens on the Greek paradigm handbook; if the learner is using Hebrew, it opens on the Hebrew paradigm handbook. The Grammar sidebar still includes a compact manual Greek/Hebrew switch for comparison work, but users do not have to choose the language twice.

## Navigation model

The home layout is card-based and paradigm-first:

1. Paradigms
2. Cheat Sheets
3. Parsing Decoder
4. Favorites
5. Recent
6. Quick Jumps
7. Reference

Long article lists are avoided. Paradigm pages use tabs and breadcrumbs so users can jump directly to high-value lookups such as Greek aorist passive, Greek participles, Qal perfect, Niphal imperfect, or Hiphil participles.

## Greek paradigm structure

The Greek paradigm center prioritizes four anchor paradigms:

- `λύω` for regular omega-verb forms
- `λόγος` for second-declension masculine nouns
- `καλός` for 2-1-2 adjectives
- Greek articles

The `λύω` page is organized by tense-form tabs:

- Present
- Imperfect
- Future
- Aorist
- Perfect
- Pluperfect
- Non-finite

Within those tabs, charts are grouped by voice and mood. Finite forms use six-person charts where applicable, and non-finite forms provide static infinitive and participle reference charts.

## Hebrew paradigm structure

The Hebrew paradigm center provides dedicated cards for the seven major stems:

- Qal
- Niphal
- Piel
- Pual
- Hiphil
- Hophal
- Hitpael

Each stem page uses form-type tabs:

- Perfect
- Imperfect
- Imperative
- Infinitive Construct
- Infinitive Absolute
- Participles

Finite forms use the standard ten-person layout: 3ms, 3fs, 2ms, 2fs, 1cs, 3mp, 3fp, 2mp, 2fp, and 1cp. Imperatives show 2ms, 2fs, 2mp, and 2fp. Participles show masculine singular, feminine singular, masculine plural, and feminine plural.

## Cheat sheets and decoder

Greek cheat sheets focus on verb endings, noun endings, and common parsing clues. Hebrew cheat sheets focus on prefixes, suffixes, stem markers, and wayyiqtol recognition. The Parsing Decoder contains static mappings for common labels such as `V-PAI-3S`, `V-API-3S`, `N-GSM`, `A-NSF`, `Qal Perfect 3ms`, and `Hiphil Imperfect 2mp`, with breakdowns, recognition tips, examples, and related paradigm links.

## Search

Search indexes topic IDs, titles, categories, summaries, recognition tips, principal parts, chart labels, chart cells, examples, related-topic labels, and stem relationships. Greek search is accent-insensitive, so queries such as `λυω` and `λογος` find `λύω` and `λόγος`.

## Static content philosophy

The Grammar section deliberately stores static reference charts. It does not generate forms, alter parser logic, change vocabulary data, or add AI explanations. This keeps the handbook fast, predictable, testable, and easy to review.

## Future expansion

Future additions should preserve the same model: add authored charts, targeted recognition clues, concise examples, and explicit related links. New paradigms should be tabbed by the most useful lookup dimension and should avoid long scrolling pages.
