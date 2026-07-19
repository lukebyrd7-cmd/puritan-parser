# v1.3.1 Comprehensive Reference Audit

Reviewed: 2026-07-16. Baseline command `npm test` passed with 296/296 tests before edits. Remote confirmation of `origin/main` was unavailable because this checkout has no `origin` remote; the work began from the clean local `work` branch at `8ad7d16` and continued on `v1.3.1-reference-audit`.

## Scope and method

Audited static Reference data/rendering, Reference search/navigation, links from Reader/Word Pages/Learn/Paradigm Recognition, service-worker precache behavior, repository history/docs for provenance, and existing automated tests. Technical validation below means structural/rendering integrity only; it does not prove scholarly correctness.

## Reference inventory

Current visible resources: 10. Route set exercised or covered by tests: 60 total route identifiers (10 visible topics, 49 legacy aliases, and landing/default route). Current chart instances inventoried by visible topic: Greek Grammar Handbook 31, Greek Paradigm Charts 92, Greek Verbs 127, Greek Nouns 33, Greek Pronouns 7, Greek Adjectives 21, Hebrew Grammar Handbook 6, Hebrew Paradigm Charts 135, Hebrew Verbs 341, and Hebrew Nouns 23. Counts include the same normalized chart where a focused portal and category page both expose it.

| Resource | Language | Route/id | Current category | Source | Type/scope | Incoming links | Search/nav visibility | Render | Status | Provenance | Verification | Final location | Action |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Grammar Handbook | Greek | `greek-grammar-handbook` | Grammar | `src/features/grammar/reference-data.js` | Handbook overview linking major grammar topics | Landing, default Greek Reference, legacy aliases | Search yes; primary nav | Pass | Partial | Authored repo content | Structural only | Grammar Handbook | Split into focused topic pages in v1.3.2 |
| Paradigm Charts | Greek | `greek-paradigm-charts` | Paradigm Charts | same | Aggregated chart portal to verbs/nouns/adjectives/pronouns | Landing, search, Learn reference links | Search yes; primary featured | Pass | Partial and too scroll-heavy | Derived from current Reference topics | Structural only | Paradigm Charts | Make primary destination; focused chart selector |
| Morphology Guide | Greek | `greek-morphology-guide` | Language Resources | same | Explains app morphology terminology | Landing supplemental, old parsing decoder alias | Search yes; supplemental nav | Pass | Duplicated/overlapping | App-authored | Structural only | Grammar Handbook | Fold into Handbook topics |
| Verbs | Greek | `greek-verbs` | Verbs | same | Paradigms, concepts, reference material | Paradigm Charts, Handbook, Learn recognition, Reader/Word Page morphology | Search yes; not landing primary except via charts | Pass | Partial | Prior repo content; source undocumented | Structural only | Paradigm Charts + Grammar Handbook | Split forms from explanations |
| Nouns | Greek | `greek-nouns` | Nouns | same | Article, declensions, cases | Charts, Handbook, aliases | Search yes | Pass | Partial | Prior repo content | Structural only | Paradigm Charts + Grammar Handbook | Split declension charts from case explanations |
| Pronouns | Greek | `greek-pronouns` | Pronouns | same | Personal/demonstrative/relative/interrogative charts | Additional Tools, search | Search yes; additional nav | Pass | Partial | Unknown/undocumented | Structural only | Paradigm Charts | Move forms into chart selector; explanations to Handbook |
| Adjectives | Greek | `greek-adjectives` | Adjectives | same | Endings/agreement/comparison | Charts, search | Search yes; chart portal | Pass | Partial | Prior repo content | Structural only | Paradigm Charts + Grammar Handbook | Split forms/explanations |
| Prepositions | Greek | `greek-prepositions` | Prepositions | same | Common prepositions and cases | Additional Tools | Search yes; additional nav | Pass | Minimal | Unknown/undocumented | Structural only | Grammar Handbook | Fold into syntax topic |
| Parsing Ambiguity Guide | Greek/shared | `grammar-parsing-ambiguity` | Tools | same | Ambiguous form checklist | Additional Tools | Search yes; additional nav | Pass | Minimal/useful | App-authored | Structural only | Grammar Handbook | Fold into ambiguity topic |
| Grammar Handbook | Hebrew | `hebrew-grammar-handbook` | Grammar | same | Handbook overview linking major grammar topics | Landing/default Hebrew Reference/aliases | Search yes; primary nav | Pass | Partial | Authored repo content | Structural only | Grammar Handbook | Split into focused topic pages |
| Paradigm Charts | Hebrew | `hebrew-paradigm-charts` | Paradigm Charts | same | Source-backed strong verbs plus existing noun/suffix charts | Landing, search, Learn links | Search yes; primary featured | Pass | Strong verbs focused by stem and form; other categories remain partial | Gesenius 1910 Paradigm B for strong verbs; legacy sources elsewhere | Strong verbs row-verified; other Hebrew material structurally checked | Paradigm Charts | Preserve focused selectors and honest omissions |
| Morphology Guide | Hebrew | `hebrew-morphology-guide` | Language Resources | same | Roots, stems, prefixes/suffixes labels | Landing supplemental | Search yes; supplemental nav | Pass | Duplicated/overlapping | App-authored | Structural only | Grammar Handbook | Fold into Handbook |
| Verbs | Hebrew | `hebrew-verbs` | Verbs | same | Source-backed strong verbs, legacy weak snapshots, and concise concepts | Charts, Handbook, Learn recognition, Reader/Word Pages | Search yes; additional nav as Stem Summaries | Pass | Strong system verified; weak/syntax material remains partial | Gesenius 1910 for strong verbs; prior repository content elsewhere | Strong rows page-image verified; weak material structural only | Paradigm Charts + Grammar Handbook | Keep weak snapshots distinct from the verified registry |
| Nouns | Hebrew | `hebrew-nouns` | Nouns | same | Construct, suffixes, article, number | Charts, Handbook, aliases | Search yes | Pass | Partial | Unknown/undocumented | Structural only | Paradigm Charts + Grammar Handbook | Split suffix charts and explanations |
| Particles and Prepositions | Hebrew | `hebrew-particles` | Particles | same | Attached particles/prepositions | Additional Tools | Search yes; additional nav | Pass | Minimal | App-authored | Structural only | Grammar Handbook | Fold into syntax/particles topic |

### Cross-resource findings

- No duplicate visible topic ids were found after structural testing.
- Legacy removed routes redirect calmly through `oldTopicAliases` instead of dead-ending.
- The major misplaced resources are Morphology Guide, Prepositions/Particles, Pronouns, and Parsing Ambiguity as top-level/supporting destinations; all should become Handbook topics or Paradigm chart categories.
- The current Paradigm Charts pages visually aggregate many charts and can imply more completeness than the data supports.
- Hebrew passive-stem gaps previously used development-process wording. v1.3.1 changed visible cells to user-facing “Not supplied” wording without inventing forms.
- Orphan risk: old Reading Helps topics exist in source as alias targets/section material but are not visible as top-level resources; useful content should be intentionally placed in Handbook or removed in v1.3.2.

## Greek coverage matrix

| Area | Topic | Current coverage | Notes/recommended disposition |
|---|---|---|---|
| Writing system | Alphabet | Minimal | Present as handbook-level orientation only; expand Handbook. |
| Writing system | Pronunciation | Minimal | Add focused Handbook topic later. |
| Writing system | Breathings | Partial | Covered enough for recognition; expand examples. |
| Writing system | Accents | Minimal | Keep concise; defer advanced accentuation. |
| Writing system | Punctuation | Minimal | Add Handbook section. |
| Writing system | Elision | Absent | P1 Handbook topic. |
| Writing system | Contraction | Partial | Verb contract clues exist; fuller explanation needed. |
| Nominal | Case meanings/usage | Partial | Noun case chart exists; syntax depth missing. |
| Nominal | Number/gender | Partial | Explained across nouns/adjectives; consolidate. |
| Nominal | Definite article | Substantially complete for quick chart | Needs source note. |
| Nominal | First declension | Partial | Representative charts only. |
| Nominal | First and second declension | Verified within v1.3.4 scope | Machen pp. 225–226 supply feminine/masculine first-declension and masculine/neuter second-declension representatives. A distinct second-declension feminine chart remains deferred. |
| Nominal | Third declension patterns | Verified within v1.3.4 scope | Machen pp. 227–229 supply representative guttural, nasal, dental, t-, s-, liquid, and irregular/stem-alternating nouns. |
| Nominal | Adjectives/comparison | Verified within v1.3.4 scope | Machen pp. 230–231 supply ἀγαθός, two-termination ἀληθής, and comparative μείζων. Complete superlatives remain deferred. |
| Nominal | Personal/demonstrative/relative/interrogative pronouns | Verified within v1.3.4 scope | Machen pp. 170–173 and 235 supply complete included paradigms. |
| Nominal | Indefinite/reflexive/reciprocal/πᾶς | Verified within v1.3.4 scope | Machen pp. 150, 153–154, 171, and 231 supply the included forms; reciprocal coverage is limited to plural oblique forms. |
| Verbal grammar | Tense/aspect, voice, mood, person/number | Partial | Concepts exist; expand Handbook cautiously. |
| Verbal grammar | Principal parts, augment, reduplication | Partial | Present but concise. |
| Verbal grammar | Contract and major μι verbs | Verified within v1.3.4 scope | Machen pp. 239–249 supply τιμάω, φιλέω, δηλόω, δίδωμι, τίθημι, and ἵστημι paradigms. Liquid and other irregular verbs remain separate/deferred. |
| Verbal paradigms | Present, imperfect, future, first aorist, aorist passive, perfect, pluperfect indicative | Verified within v1.3.3 scope | Machen (1923) page-image-verified λύω charts; pluperfect is active only because that is the complete paradigm directly supplied. |
| Verbal paradigms | Second aorist | Verified within v1.3.3 scope | Machen's directly supplied λείπω / ἔλιπον active and middle paradigms are used. |
| Verbal paradigms | Future perfect, optative, verbal adjectives | Absent | Do not add without sourced paradigms. |
| Verbal paradigms | Subjunctive, imperative, infinitives, participles | Verified within v1.3.4 scope | Page-image-verified regular omega-verb systems include present/aorist subjunctives and imperatives, present/future/aorist/perfect infinitives, and present/aorist/perfect participles. |
| Syntax | Article, attributive/predicate, cases, prepositions, participles, infinitives, relative clauses, negation, particles, ambiguous forms | Minimal to partial | Grammar Handbook should own these explanations; current material is scattered. |
| Syntax | Conditions, purpose/result, indirect discourse, aspect cautions | Absent/minimal | P1/P2 Handbook roadmap. |

### Greek actual verbal chart audit

The v1.3.3 indicative charts and the v1.3.4 additional paradigms are row-verified from Machen's 1923 first edition through the CCEL page-image scan; exact printed pages are recorded in `docs/reference-sources.md`. The v1.3.4 normalized registry adds 73 charts for regular omega-verb non-indicatives, relevant εἰμί forms, contract verbs, major μι verbs, nouns, adjectives, determiners, and pronouns. Detailed participle charts use explicit case/number/gender rows rather than suffix generation. Contract charts stay limited to the present system, where Machen says contraction occurs. The ἵστημι charts preserve Machen's transitive present/intransitive second-aorist distinction.

### Greek missing core paradigms

Optative, future perfect, verbal adjectives, δείκνυμι as a full paradigm, liquid-verb expansion, numerals, a distinct second-declension feminine noun chart, a complete superlative chart, and exhaustive third-declension coverage remain deferred. Perfect subjunctive is omitted because Machen says it is too rare to learn and supplies no complete chart. Pluperfect middle/passive remains deferred because Machen does not directly supply a complete paradigm.

## Hebrew coverage matrix

| Area | Topic | Current coverage | Notes/recommended disposition |
|---|---|---|---|
| Writing system | Consonants/final forms/vowels/shewa/dagesh/matres/syllables/stress/pronunciation | Minimal to partial | Handbook overview exists; focused topic pages needed. |
| Writing system | Cantillation | Intentionally deferred | Not necessary for core reader reference. |
| Nominal | Gender/number/definiteness/construct/adjectives/pronouns/demonstratives/interrogatives | Minimal to partial | Nouns page has construct/number/article; pronoun depth limited. |
| Nominal | Pronominal suffixes/noun suffix patterns | Partial | Charts present but not comprehensive. |
| Nominal | Prepositions/particles/conjunctions | Minimal | Particles page should become Handbook topic. |
| Verbal grammar | Root/stem concepts, perfect, imperfect, imperative, infinitives, participles | Verified within v1.3.5 strong-root scope | Gesenius 1910 Paradigm B pp. 510–511 supplies the registered קטל forms. Participles remain masculine-singular recognition anchors. |
| Verbal grammar | Wayyiqtol/weqatal/cohortative/jussive | Wayyiqtol recognition verified narrowly; syntax remains minimal | Gesenius §49b–c, pp. 133–134 directly supplies the included Qal and Hiphil anchors; no complete paradigm is inferred. |
| Verbal grammar | Strong vs weak verbs | Source-backed recognition coverage | v1.3.6a adds concise strong-pattern comparisons for eleven weak-class navigation IDs without expanding Handbook explanation. |
| Stems | Qal | Verified within strong-model scope | Complete finite rows and directly supplied non-finite anchors for קטל; Qal wayyiqtol limited to two directly printed rows. |
| Stems | Niphal/Piel/Hiphil/Hitpael | Verified within strong-model scope | Paradigm B rows are source-tagged by chart; Hiphil includes its printed shortened imperfect and one directly printed wayyiqtol row. |
| Stems | Pual/Hophal | Verified with explicit omissions | Paradigm B supplies perfect, imperfect, infinitive absolute, and participle anchors, but marks infinitive construct and imperative “wanting”; omitted categories remain absent. |
| Weak verbs | I-Guttural; II-Guttural; III-ח/ע; Doubly Weak | Verified within focused recognition scope | Gesenius §§62–65, §76 and Paradigms D–F; Doubly Weak examples remain explicitly limited. III-Aleph is recognized as a distinct positional class but is not implemented. |
| Weak verbs | I-Nun; I-Yod; Biconsonantal; Geminate; III-He | Verified within focused recognition scope | Gesenius §§66–75 and Paradigms G–P; historical I-Waw/true I-Yod and Middle Waw/Middle Yod subtypes remain visible. Middle Yod uses directly printed §73 examples rather than an inferred full paradigm. |
| Syntax | Construct chains, definiteness, adjective agreement, suffixes, verbal/nominal clauses, word order, waw, negation, relatives, particles, discourse sequencing | Minimal to partial | Current explanations are scattered and concise. |

### Hebrew stem audit

The v1.3.5 registry contains 41 stable charts for Qal, Niphal, Piel, Pual, Hiphil, Hophal, and Hitpael using Gesenius' model strong root קטל. Perfect, imperfect, applicable imperatives, infinitives, and masculine-singular participial anchors were transcribed from Paradigm B on printed pp. 510–511 and checked against the Internet Archive/Wikisource page images. Pual and Hophal infinitive constructs and imperatives are absent because the table explicitly marks them “wanting.” Wayyiqtol is a separate recognition category containing only Qal 3ms/1cs and Hiphil 3ms forms directly printed in §49b–c, pp. 133–134. The app retains modern stem labels while About & Sources records Gesenius' older terminology.

The v1.3.6a registry adds 37 stable weak-verb comparison charts from Gesenius §§62–78 (printed pp. 164–219) and Paradigms D–P (printed pp. 514–529). Navigation filters by weak-root class, stem, and form category. Every chart records a source-supplied representative root, affected radical, expected strong pattern, directly printed weak form, visible change, recognition cue, exact section/page/table, alternate convention, and limitation. User-facing labels follow Pratico–Van Pelt positional terminology: I-Guttural, II-Guttural, III-ח/ע, I-Nun, I-Yod, Biconsonantal, Geminate, III-He, Doubly Weak, and Irregular. Historical I-Waw/true I-Yod and Middle Waw/Middle Yod remain distinct subtypes. Stable internal IDs retain the original v1.3.6a identifiers. III-Aleph is recognized but remains unimplemented pending a separately sourced paradigm. The registry does not claim exhaustive weak morphology.

## Route and UI audit

Automated route/data coverage now verifies landing entries, language-scoped Reference Search, deterministic search order, alias redirects, internal section anchors/jump chips, chart structure, form-script checks, and service-worker Reference assets. Existing tests cover Reader and Word Page links to Reference, Learn Paradigm Recognition links, removed routes, language selection independence, Reference Search display/clearing, and service-worker app-shell behavior.

Manual browser automation was not added because this repository has no configured Playwright/Puppeteer dependency. Desktop/mobile visual QA, browser Back, console inspection, fresh service-worker context, and screenshots are therefore listed as required manual QA for v1.3.2.

## v1.3.2 two-section architecture plan

Final Reference landing hierarchy:

1. **Paradigm Charts** — visually primary and first. Shows forms only, with compact selectors by language/category. Stable routes should support one chart or a small group, for example `/reference/greek/paradigms/verbs/present-active-indicative` and `/reference/hebrew/paradigms/verbs/qal-perfect`. Use meaningful collapsible groups only within a small category, not one continuous all-chart page. Each chart should include title, lemma/root, labels, table, and an optional Handbook link.
2. **Grammar Handbook** — explanations of terms, morphology, syntax, writing systems, pronunciation, usage, and ambiguous forms. Use focused topic pages or concise collapsible groups. Link back to relevant chart identifiers.

Mapping: current Paradigm Charts, form sections from Verbs/Nouns/Adjectives/Pronouns/Hebrew Nouns/Hebrew Verbs move to Paradigm Charts. Current Grammar Handbook, Morphology Guide, Prepositions/Particles, Parsing Ambiguity, reading-help content, and explanatory sections from grammar category pages move to Handbook. Word-specific explanations remain Word Pages; practice instructions remain Learn; passage help remains Reader; progress language remains Progress.

## Prioritized roadmap

| Release | Priority/scope | Likely files | Source requirements | Tests/QA | Risks | Explicit deferrals |
|---|---|---|---|---|---|---|
| v1.3.2 Two-section Reference architecture | P0/P1: landing, routes, selectors, stable ids, move Supplemental into Handbook | `reference-data.js`, `index.js`, `styles.css`, `tests/reference*.test.js`, docs | No new linguistic data; route map only | npm test, route tests, desktop/mobile visual QA, service-worker cache bump | Breaking legacy links; over-redesign | No new paradigms |
| v1.3.3 Greek core indicative paradigms | Complete: source-tagged core indicatives for λύω, λείπω second aorist, and εἰμί | `reference-data.js`, `docs/reference-sources.md` | Machen 1923 row-level page-image verification complete for included material | Structural + source-note tests; visual wide-table QA | Pluperfect convention narrowed to directly supplied active forms | Optative, verbal adjectives, pluperfect middle/passive |
| v1.3.4 Greek additional paradigms | Complete: moods/non-finites, contract and major μι verbs, high-value nouns/adjectives/pronouns | `reference-data.js`, Settings sources, tests, docs | Machen 1923 page-image verification complete for included material | Source/NFC/structure/category/UI tests; desktop/mobile visual QA | Large but focused chart registry | Optative, future perfect, δείκνυμι, complete superlatives, exhaustive third declension |
| v1.3.5 Hebrew strong-verb stems | Complete: 41 Gesenius-backed charts for Qal through Hitpael, with narrow wayyiqtol recognition and explicit Pual/Hophal omissions | `reference-data.js`, Settings sources, tests, docs | Gesenius-Kautzsch-Cowley 1910, Paradigm B pp. 510–511 and §49b–c pp. 133–134, page-image verified | Structure, provenance, NFC/pointing, RTL, source-link, omission, Greek-isolation, and browser QA | Participles intentionally limited to printed anchors | Weak verbs, suffixes, nominal morphology, Handbook depth |
| v1.3.6a Hebrew weak verbs | Complete: 37 Gesenius-backed recognition charts across eleven weak-class navigation IDs, with class/stem/form filters and explicit limited examples | `reference-data.js`, Reference renderer, Settings sources, recognition compatibility, tests, docs | Gesenius-Kautzsch-Cowley 1910, §§62–78 pp. 164–219 and Paradigms D–P pp. 514–529, page-image verified | Source/ID/class/root/comparison/NFC/pointing/RTL/filter/About/recognition/isolation tests; desktop/mobile visual QA | Starred/bracketed alternatives and doubly weak complexity | Suffix systems, nominal morphology, exhaustive doubly weak coverage, Handbook explanation |
| v1.3.6b Hebrew suffixes and nominal morphology | Implemented for review: 16 Gesenius-backed charts covering state/number, noun suffixes, preposition suffixes, limited verbal-object examples, segolates, reducible vowels, and selected peculiar nouns | `reference-data.js`, Reference renderer, Settings sources, recognition isolation, tests, docs | Gesenius-Kautzsch-Cowley 1910, §§58–59, 89, 91, 93, 95–96, 103, pp. 155–160, 247, 254–285, 300–305, page-image verified | Source/ID/metadata/PGN/NFC/pointing/RTL/filter/About/recognition/isolation tests; desktop/mobile visual QA | Wide comparison tables and multiple lexical noun classes | Handbook explanation, automatic drills, exhaustive suffix systems, full irregular-noun inventory |
| v1.3.7 Grammar Handbook expansion | P1/P2: syntax and usage topics for both languages, including fuller sequential-form explanation | same | Grammar source bibliography | Search/topic tests; browser QA | Duplicating chart explanations | Advanced/specialized debates |

## Questions requiring scholarly review

- The v1.3.3 pluperfect convention follows Machen's printed p. 238 active paradigm, including parenthesized augment; broader pluperfect alternatives remain a future sourcing question.
- Machen does not print a distinct second-declension feminine noun or complete superlative chart in the approved paradigm pages; another exact edition/page source would be needed before those are added.
- Which additional rare weak-root alternatives merit a second exact-edition source without making the reference look exhaustive?
- How much pronunciation/accent material belongs in a reading reference versus Learn?

## Areas where evidence was insufficient

The normalized v1.3.3/v1.3.4 Greek registries and v1.3.5/v1.3.6a/v1.3.6b Hebrew registries have exact row-level citations for their stated coverage. Legacy explanatory prose and older noun/suffix snapshots still lack equivalent row-level citations. The audit therefore continues to distinguish source-backed registries from structurally checked legacy material.
