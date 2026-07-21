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
- The v1.3.6a weak-verb forms are checked directly against Gesenius §§62–78 (printed pp. 164–219) and Paradigms D–P (printed pp. 514–529). User-facing class labels follow Pratico–Van Pelt positional terminology while the stable internal IDs retain their original v1.3.6a values.
- Visible coverage is I-Guttural, II-Guttural, III-ח/ע, I-Nun, I-Yod, Biconsonantal, Geminate, III-He, Doubly Weak, and Irregular. Historical I-Waw/true I-Yod and Middle Waw/Middle Yod remain distinct subtypes. III-Aleph is recognized but not implemented in this milestone.
- Each weak chart records the affected radical and a concise expected-strong versus attested-weak comparison. The Reference UI filters the normalized registry by weak class, stem, and form category.
- Pointing, dagesh, reduced vowels, mater behavior, and furtive patah in included forms were checked against the printed page images. OCR was used only to locate candidate rows.
- The v1.3.6b noun and suffix registry is checked against Gesenius §§58–59, 89, 91, 93, 95–96, and 103 (printed pp. 155–160, 247, 254–285, and 300–305). Pratico–Van Pelt 2019 guides its visible classroom terminology and sequence: Construct State, pronominal suffixes on nouns, pronominal suffixes on prepositions, limited object suffixes on verbs, Segolate Nouns, and Irregular Nouns.
- Person, gender, and number remain separate in suffix data; first-person rows are common gender. Unprinted 2fp rows and neighboring preposition systems are omitted rather than inferred.
- Hebrew noun terminology is broadly appropriate: construct state, absolute state, dual, pronominal suffixes, article, suffix forms, and state-based reading.
- Hebrew verb terminology is broadly appropriate: stem/binyan, strong verb, perfect, imperfect, imperative, infinitive construct, infinitive absolute, participle, aspect, wayyiqtol/waw consecutive, weak roots, and stem relationships.

### ⚠ Needs Review

- Participles remain limited to the masculine-singular anchor forms printed in Paradigm B. Full gender/number/state declensions need a separate row-level source before expansion.
- Gesenius §49 explains the consecutive forms but does not print a complete person-by-person strong paradigm. Only its directly printed Qal and Hiphil examples are registered.
- Weak-verb coverage is reading-recognition focused rather than exhaustive. Biconsonantal Middle Yod, Doubly Weak, and Irregular charts are deliberately limited to directly printed examples; starred and bracketed variants are not silently reconciled.
- v1.3.6b nominal coverage is representative rather than exhaustive. The visible UI uses “Irregular Nouns”; Gesenius' “peculiar formation” terminology remains in technical source notes without implying a complete historical classification or lexical inventory.
- Recognition practice consumes the newly verified Qal/Niphal/Piel/Hiphil/Hitpael charts through the existing Reference-backed API. Pual and Hophal remain excluded from Learn recognition targets, and no SRS or persisted-state behavior changed.
- Some Hebrew examples are labeled representative rather than tied to a specific verse. That is acceptable for the current reference section, but future scholarly polish could prefer attested examples where possible.

### ✖ Corrected

- Replaced the legacy undocumented כתב strong-form dataset in focused Paradigm Charts with the source-backed קטל registry. The model root is identified as paradigmatic rather than presented as a normal vocabulary lemma.
- Replaced visible “Not supplied” chart rows for Pual/Hophal imperative and infinitive construct with honest category omission, matching Gesenius' printed “wanting.”
- Added separate navigation by stem and by form category, including a distinct wayyiqtol destination, without expanding the Grammar Handbook.
- Earlier work corrected non-Qal stem summary aliasing. v1.3.5 now rebuilds those summaries from the same source-backed `hebrewStrongVerbCharts` registry used by focused Paradigm Charts.
- Added regression coverage so non-Qal Hebrew summary rows cannot silently diverge from the stem-specific paradigm data.
- Replaced the undocumented weak snapshots in focused Paradigm Charts with the 37-chart source-backed v1.3.6a registry while keeping full explanatory prose out of Paradigm Charts and the Grammar Handbook.
- Replaced the focused noun/suffix placeholders with 16 source-backed v1.3.6b charts and separate noun, nominal-suffix, prepositional-suffix, and verbal-object-suffix navigation while leaving legacy explanation and Learn behavior intact.

## v1.3.7 Grammar Handbook audit and decisions

The pre-v1.3.7 Handbook was not an article registry. It assembled 23 visible sections from legacy topic fragments: thirteen Greek items and ten Hebrew items. Several were empty shells; several carried complete or near-complete charts that duplicated Paradigm Charts; most were too short to justify independent navigation. The rebuild keeps the stable top-level topic IDs `greek-grammar-handbook` and `hebrew-grammar-handbook` while replacing those fragments with 25 normalized articles in twelve stable sections.

### Original Greek inventory

| Old visible item | Decision | Destination and reason |
|---|---|---|
| Nouns and Cases | Substantially rewrite and merge | `greek-cases-agreement`; one case-system article is more useful than isolated definitions or five thin articles. |
| Article | Substantially rewrite and merge | `greek-article-adjectives`; article placement and adjective agreement belong together while reading. |
| Adjectives | Merge | `greek-article-adjectives`; the old ending chart remains in Paradigm Charts. |
| Pronouns | Substantially rewrite and merge | `greek-pronouns-prepositions`; full pronoun forms remain in Paradigm Charts. |
| What morphology describes | Remove as a separate item | Its useful form/function distinction is incorporated across articles; `Morphology Guide` remains an alias. |
| Parsing Abbreviations | Remove as a separate item | Parser-code lookup is not a substantial Handbook article; `Parsing Abbreviations`, `N-NSM`, and `V-AAI-3S` remain searchable aliases. |
| Prepositions and Particles | Substantially rewrite and split by reading purpose | Prepositions move to `greek-pronouns-prepositions`; clause particles move to `greek-clause-markers`. |
| Understanding Ambiguous Forms | Merge | Ambiguity checks now appear in each article's Common pitfalls and in `greek-reading-workflow`. |
| Voice | Substantially rewrite | `greek-voice`; adds middle/passive overlap and a cautious treatment of “deponent.” |
| Aspect | Substantially rewrite and merge | `greek-indicative-system`; the debate is summarized cautiously rather than isolated. |
| Mood | Substantially rewrite | `greek-moods`; visible markers and contextual function are treated together. |
| Participles | Move forms and rewrite explanation | Full declensions remain in Paradigm Charts; `greek-participles` explains agreement and high-value uses. |
| Infinitives | Move forms and rewrite explanation | Full form indexes remain in Paradigm Charts; `greek-infinitives` explains reading functions. |

New Greek articles add `greek-indicative-system`, `greek-principal-parts`, `greek-reading-workflow`, and `greek-selected-syntax` so that tense stems, lexical-form recovery, sentence reading, and a deliberately small set of recurring constructions have coherent destinations. Final Greek sections are Nouns, the Article, and Agreement; The Indicative Verb System; Voice and Mood; Infinitives and Participles; Pronouns, Prepositions, and Clause Markers; and Reading Greek Sentences. Final count: 12 articles.

### Original Hebrew inventory

| Old visible item | Decision | Destination and reason |
|---|---|---|
| Nouns and Adjectives | Substantially rewrite | `hebrew-nouns-adjectives`; full patterns remain in Paradigm Charts. |
| Construct Chain | Substantially rewrite | `hebrew-construct-forms`; adds definiteness and a repeatable chain-reading procedure. |
| Pronominal Suffixes | Substantially rewrite and split | `hebrew-pronominal-suffixes` and `hebrew-prepositions-article`; distinguishes host families and coverage limits. |
| Particles and Prepositions | Substantially rewrite and split | Attached prepositions/article behavior and clause markers now have separate reading purposes. |
| What morphology describes | Remove as a separate item | Useful morphology language is integrated; `Morphology Guide` remains searchable. |
| Person, Gender, Number | Merge | PGN is explained in noun, suffix, Qal, and workflow articles rather than duplicated. |
| Qal | Substantially rewrite and split | `hebrew-qal-finite` and `hebrew-qal-volitives-nonfinite`; forms remain in strong-verb charts. |
| Stem Meanings | Substantially rewrite | `hebrew-derived-stem-recognition`; simplified stem glosses are explicitly limited. |
| Weak Verbs | Substantially rewrite and split | `hebrew-weak-overview` and `hebrew-weak-classes`; preserves every visible v1.3.6a class label and ID. |
| Waw Consecutive | Substantially rewrite | `hebrew-sequential-forms`; distinguishes wayyiqtol from waw with other verbal forms. |

New Hebrew reading articles are `hebrew-clause-structure`, `hebrew-clause-markers`, and `hebrew-reading-workflow`. Final Hebrew sections are Nouns, Adjectives, and Construct Forms; Pronouns, Suffixes, and Prepositions; The Qal Stem and Hebrew Conjugations; Derived Stems; Weak Verbs; and Reading Hebrew Clauses. Final count: 13 articles.

### Architecture and scope result

- `src/features/grammar/handbook-data.js` is the immutable normalized registry. Article data stores stable IDs, section IDs, structured explanatory fields, aliases, search terms, source roles, related chart IDs, and related article IDs.
- One shared renderer provides section filtering, debounced article search, direct `?article=` navigation, related-article navigation, active-state semantics, and source-note links. Only the active article body is rendered.
- Articles link to existing chart IDs; charts acquire one small reverse Handbook link when a mapped article exists. No chart rows, chart IDs, recognition eligibility, or persisted data changed.
- Merkle and his coauthors guide Greek organization and forms-to-reading emphasis. Pratico and Van Pelt guide Hebrew terminology, strong-before-weak sequence, and noun/suffix/stem grouping. Machen and Gesenius remain the foundational content/form sources recorded at exact locations. App-authored workflows are labeled as editorial synthesis.
- Deliberate omissions remain exhaustive case taxonomies, comprehensive conditional or participial systems, discourse analysis, historical phonology, exhaustive object-suffix syntax, separate articles for every conjunction/stem/weak class, and unsupported rare paradigms.

## Future Improvements

- Before building paradigm drills, split representative reference forms from drill-validated forms so the app does not treat recognition summaries as complete paradigms.
- Add a small grammar-data audit script that checks for duplicated Qal forms inside non-Qal charts, unresolved `Needs review` cells, and malformed object cells in drill-eligible data.
- Add source notes in code comments or docs identifying which grammar family each paradigm convention follows when standard introductory grammars differ.
- Keep the v1.3.4 source-backed charts distinct from drill eligibility; structural and page-image verification do not by themselves define future recognition-item selection policy.
- Use a separately approved source map before adding rare weak-root variants, suffix families beyond the v1.3.6b map, exhaustive nominal classification, or full participle work.

## Regression Notes

- Added tests for Hebrew non-Qal summary charts to ensure imperative, infinitive, and participle rows use stem-specific source data or explicit `Needs review` cells.
- Added tests for Greek participle declension rows to ensure detail tables use verified forms rather than suffix guesses.
- Added v1.3.4 tests for unique IDs, source pages, NFC, imperative person restrictions, participle row structure, contract and μι representatives, nominal/pronoun categories, source-note links, Hebrew isolation, and Handbook scope.
- Added v1.3.5 tests for all seven stems, valid finite/non-finite structures, honest passive-stem omissions, distinct wayyiqtol rows, exact Gesenius metadata, NFC/pointing, RTL markup, About & Sources coverage, and Greek/Handbook isolation.
- Added v1.3.6a tests for required weak classes, stable IDs, representative roots, exact provenance, strong/weak comparisons, NFC and pointing, furtive patah/dagesh/reduced vowels, RTL markup, class/stem/form filtering, centralized source notes, recognition compatibility, and Greek/suffix/nominal/Handbook/persistence isolation.
- Added v1.3.6b tests for stable chart families and exact ID/form/source hashes, person/gender/number structure, classroom terminology, typography inheritance, exact source metadata, NFC and pointing, honest omissions, filters, RTL/source links, About & Sources disclosure, recognition isolation, and verb/Greek/Handbook/persistence boundaries.
- Focused reference-library tests pass after corrections.
