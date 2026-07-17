# Grammar Audit v4.2.5B

Scope: existing Greek and Hebrew grammar/reference content only. This audit checked terminology, visible organization, paradigm labels, paradigm tables, explanations, and cross references against standard introductory grammar expectations without copying source wording.

Primary comparison anchors: Wallace and Mounce for Greek categories and regular omega-verb paradigms; Pratico & Van Pelt, Waltke & O'Connor, and Joüon-Muraoka for Hebrew stem terminology, strong-verb categories, infinitives, participles, weak verbs, and verbal aspect.

## Greek

### ✔ Verified

- Major visible categories are appropriate for an introductory reader reference: verbs, nouns, pronouns, adjectives, prepositions, parsing ambiguity, and parsing guide.
- Greek verb terminology is broadly sound: tense-form/aspect, voice, mood, finite forms, infinitives, participles, augment, reduplication, principal parts, contract verbs, mi verbs, historical present, and deponency.
- The main λύω principal parts are suitable for a regular omega-verb reference: λύω, λύσω, ἔλυσα, λέλυκα, λέλυμαι, ἐλύθην.
- Noun organization and terminology are appropriate: article as a parsing anchor, first/second/third declension, case endings, case functions, adjective agreement, and pronoun families.
- Cross references and old topic aliases route to consolidated pages rather than adding duplicate navigation paths.
- v1.3.3 core indicative rows are verified against the CCEL page-image scan of Machen's 1923 first edition: regular λύω systems, λείπω / ἔλιπον second aorist, and present/imperfect/future indicative forms of εἰμί. Exact printed pages and conventions are recorded in `docs/reference-sources.md`.
- The aorist passive chart is tied explicitly to the sixth principal part ἐλύθην rather than to active/middle aorist formation.
- Machen's explicitly printed perfect active third-plural alternative λέλυκαν and movable-ν conventions are retained.

### ⚠ Needs Review

- The Greek paradigms are representative rather than exhaustive. Future drill work should verify every generated drill form against a fuller paradigm source before reuse.
- Pluperfect middle/passive remains deferred: Machen describes the system but does not directly supply a complete paradigm. The active chart is limited to Machen's p. 238 appendix forms and parenthesized-augment convention.
- The mi-verb and irregular-verb sections are intentionally recognition-oriented snapshots, not full paradigms.

### ✖ Corrected

- Corrected Greek participle detail tables. The previous helper guessed genitive singular and nominative plural forms by string replacement, which produced forms such as λυόμενοντος and left λύσας/λυθείς/λελυκώς unchanged in rows where declined forms were required. The tables now use explicit participle rows for present active, present middle/passive, aorist active, aorist middle, aorist passive, perfect active, and perfect middle/passive.
- Corrected the pluperfect active plural from unsourced shortened forms to Machen's printed (ἐ)λελύκειμεν, (ἐ)λελύκειτε, and (ἐ)λελύκεισαν, and removed the unsupported complete pluperfect middle/passive chart.

## Hebrew

### ✔ Verified

- Hebrew verb paradigms were checked across Qal, Niphal, Piel, Pual, Hiphil, Hophal, and Hitpael in the consolidated Hebrew Verbs page and in the reusable paradigm source groups.
- The actual paradigm tabs for participles, infinitive construct, infinitive absolute, and imperatives are data-driven from `hebrewForms`; they are not rendered by falling back to Qal forms.
- Qal, Niphal, Piel, Hiphil, and Hitpael non-finite and imperative rows display stem-specific forms rather than Qal rows.
- Pual and Hophal passive-stem imperative and infinitive-construct entries are intentionally marked `Needs review` instead of forcing Qal-looking or invented forms.
- Hebrew noun terminology is broadly appropriate: construct state, absolute state, dual, pronominal suffixes, article, suffix forms, and state-based reading.
- Hebrew verb terminology is broadly appropriate: stem/binyan, strong verb, perfect, imperfect, imperative, infinitive construct, infinitive absolute, participle, aspect, wayyiqtol/waw consecutive, weak roots, and stem relationships.

### ⚠ Needs Review

- Pual and Hophal infinitive construct and imperative paradigms remain intentionally unresolved. Passive stems may not provide ordinary command paradigms, and any drill-facing treatment should be checked against a fuller Hebrew paradigm reference before being exposed as practice data.
- Pual and Hophal infinitive absolute rows remain supplied as representative strong forms but should receive a second specialist review before use in drills.
- Weak-verb sections are recognition snapshots, not full paradigms. They should not become drill sources without separate weak-root paradigm validation.
- Some Hebrew examples are labeled representative rather than tied to a specific verse. That is acceptable for the current reference section, but future scholarly polish could prefer attested examples where possible.

### ✖ Corrected

- Corrected Hebrew non-Qal stem summary charts. The visible per-stem sections contained a "representative paradigm: כתב" chart that mechanically substituted the stem pattern into every row. For example, Niphal showed נִכְתַב for perfect, imperfect, imperative, infinitive construct, infinitive absolute, and participle. These charts now read from the same stem-specific `hebrewForms` data used by the actual paradigm tabs.
- Added regression coverage so non-Qal Hebrew summary rows cannot silently diverge from the stem-specific paradigm data.

## Future Improvements

- Before building paradigm drills, split representative reference forms from drill-validated forms so the app does not treat recognition summaries as complete paradigms.
- Add a small grammar-data audit script that checks for duplicated Qal forms inside non-Qal charts, unresolved `Needs review` cells, and malformed object cells in drill-eligible data.
- Add source notes in code comments or docs identifying which grammar family each paradigm convention follows when standard introductory grammars differ.
- Expand Greek validation beyond spot checks before drill generation, especially participles, contract verbs, mi verbs, perfect/pluperfect alternates, and irregular principal parts.
- Expand Hebrew validation before drill generation, especially passive-stem non-finites, weak verbs, hollow/geminate roots, and stem-specific participles.

## Regression Notes

- Added tests for Hebrew non-Qal summary charts to ensure imperative, infinitive, and participle rows use stem-specific source data or explicit `Needs review` cells.
- Added tests for Greek participle declension rows to ensure detail tables use verified forms rather than suffix guesses.
- Focused reference-library tests pass after corrections.
