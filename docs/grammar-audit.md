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
- v1.3.4 adds a normalized registry of 73 page-image-verified Greek charts. Regular omega coverage includes present/aorist subjunctives and imperatives, present/future/aorist/perfect infinitives, and full recognition-oriented present/aorist/perfect participle declensions.
- Contract present systems use Machen's directly supplied τιμάω, φιλέω, and δηλόω tables (printed pp. 239–241). The charts do not extend contraction into non-present systems.
- Major μι-verb coverage uses Machen's δίδωμι, τίθημι, and ἵστημι tables (printed pp. 244–249), preserving reduplication, athematic endings, root-aorist behavior, and the transitive-present/intransitive-second-aorist distinction for ἵστημι.
- Source-backed nominal coverage now includes representative first/second/third declensions, common irregular nouns, first/second- and third-declension adjectives, μείζων, personal/demonstrative/relative/interrogative/indefinite/reflexive/reciprocal forms, and πᾶς. Exact pages and limits are recorded in `docs/reference-sources.md`.

### ⚠ Needs Review

- The Greek paradigms are representative rather than exhaustive. Future drill work should verify every generated drill form against a fuller paradigm source before reuse.
- Pluperfect middle/passive remains deferred: Machen describes the system but does not directly supply a complete paradigm. The active chart is limited to Machen's p. 238 appendix forms and parenthesized-augment convention.
- The μι-verb sections are recognition-oriented selections from complete supplied systems rather than attempts to enumerate every theoretical form. δείκνυμι remains omitted because Machen does not supply a complete chart in the approved passage.
- A distinct second-declension feminine noun chart, a complete superlative chart, optative, future perfect, and perfect subjunctive remain deferred rather than inferred.

### ✖ Corrected

- Corrected Greek participle detail tables. The previous helper guessed genitive singular and nominative plural forms by string replacement, which produced forms such as λυόμενοντος and left λύσας/λυθείς/λελυκώς unchanged in rows where declined forms were required. The tables now use explicit participle rows for present active, present middle/passive, aorist active, aorist middle, aorist passive, perfect active, and perfect middle/passive.
- Corrected the pluperfect active plural from unsourced shortened forms to Machen's printed (ἐ)λελύκειμεν, (ἐ)λελύκειτε, and (ἐ)λελύκεισαν, and removed the unsupported complete pluperfect middle/passive chart.
- Replaced the legacy partial Greek participle snapshots in Paradigm Charts with explicit eight-row case/number/gender tables tied to Machen's printed declensions.
- Replaced unsourced contract/μι and nominal snapshots in the focused Paradigm Charts paths with stable, source-tagged v1.3.4 charts while leaving Handbook explanation scope unchanged.

## Hebrew

### ✔ Verified

- The v1.3.5 strong-verb registry is checked row by row against the page-image scan of Gesenius-Kautzsch-Cowley, second English edition (Oxford: Clarendon Press, 1910), Paradigm B on printed pp. 510–511.
- All seven major stems—Qal, Niphal, Piel, Pual, Hiphil, Hophal, and Hitpael—use Gesenius' model strong root קטל with stable chart, stem, category, root, and source metadata.
- Perfect, imperfect, applicable imperatives, infinitive construct, infinitive absolute, and participial anchors follow the categories directly printed in Paradigm B. The table's explicit alternatives are retained without combining other pointing traditions.
- Wayyiqtol is structurally distinct from the ordinary imperfect and is limited to Qal 3ms/1cs and Hiphil 3ms forms directly printed in §49b–c, pp. 133–134.
- Pual and Hophal infinitive constructs and imperatives are omitted because Paradigm B explicitly marks them “wanting.” No empty or mathematically generated charts replace them.
- User-facing stem labels follow the app's modern convention; About & Sources records Gesenius' Niphʿal, Piʿel, Puʿal, Hiphʿil, Hophʿal, and Hithpaʿel terminology.
- Hebrew noun terminology is broadly appropriate: construct state, absolute state, dual, pronominal suffixes, article, suffix forms, and state-based reading.
- Hebrew verb terminology is broadly appropriate: stem/binyan, strong verb, perfect, imperfect, imperative, infinitive construct, infinitive absolute, participle, aspect, wayyiqtol/waw consecutive, weak roots, and stem relationships.

### ⚠ Needs Review

- Participles remain limited to the masculine-singular anchor forms printed in Paradigm B. Full gender/number/state declensions need a separate row-level source before expansion.
- Gesenius §49 explains the consecutive forms but does not print a complete person-by-person strong paradigm. Only its directly printed Qal and Hiphil examples are registered.
- Weak-verb sections are recognition snapshots, not full paradigms. They should not become drill sources without separate weak-root paradigm validation.
- Some Hebrew examples are labeled representative rather than tied to a specific verse. That is acceptable for the current reference section, but future scholarly polish could prefer attested examples where possible.

### ✖ Corrected

- Replaced the legacy undocumented כתב strong-form dataset in focused Paradigm Charts with the source-backed קטל registry. The model root is identified as paradigmatic rather than presented as a normal vocabulary lemma.
- Replaced visible “Not supplied” chart rows for Pual/Hophal imperative and infinitive construct with honest category omission, matching Gesenius' printed “wanting.”
- Added separate navigation by stem and by form category, including a distinct wayyiqtol destination, without expanding the Grammar Handbook.
- Earlier work corrected non-Qal stem summary aliasing. v1.3.5 now rebuilds those summaries from the same source-backed `hebrewStrongVerbCharts` registry used by focused Paradigm Charts.
- Added regression coverage so non-Qal Hebrew summary rows cannot silently diverge from the stem-specific paradigm data.

## Future Improvements

- Before building paradigm drills, split representative reference forms from drill-validated forms so the app does not treat recognition summaries as complete paradigms.
- Add a small grammar-data audit script that checks for duplicated Qal forms inside non-Qal charts, unresolved `Needs review` cells, and malformed object cells in drill-eligible data.
- Add source notes in code comments or docs identifying which grammar family each paradigm convention follows when standard introductory grammars differ.
- Keep the v1.3.4 source-backed charts distinct from drill eligibility; structural and page-image verification do not by themselves define future recognition-item selection policy.
- Expand Hebrew validation before future weak-root, suffix, nominal, or full participle work; v1.3.5 deliberately does not infer those forms.

## Regression Notes

- Added tests for Hebrew non-Qal summary charts to ensure imperative, infinitive, and participle rows use stem-specific source data or explicit `Needs review` cells.
- Added tests for Greek participle declension rows to ensure detail tables use verified forms rather than suffix guesses.
- Added v1.3.4 tests for unique IDs, source pages, NFC, imperative person restrictions, participle row structure, contract and μι representatives, nominal/pronoun categories, source-note links, Hebrew isolation, and Handbook scope.
- Added v1.3.5 tests for all seven stems, valid finite/non-finite structures, honest passive-stem omissions, distinct wayyiqtol rows, exact Gesenius metadata, NFC/pointing, RTL markup, About & Sources coverage, and Greek/Handbook isolation.
- Focused reference-library tests pass after corrections.
