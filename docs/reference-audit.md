# v1.3.1 Comprehensive Reference Audit

Reviewed: 2026-07-16. Baseline command `npm test` passed with 296/296 tests before edits. Remote confirmation of `origin/main` was unavailable because this checkout has no `origin` remote; the work began from the clean local `work` branch at `8ad7d16` and continued on `v1.3.1-reference-audit`.

## Scope and method

Audited static Reference data/rendering, Reference search/navigation, links from Reader/Word Pages/Learn/Paradigm Recognition, service-worker precache behavior, repository history/docs for provenance, and existing automated tests. Technical validation below means structural/rendering integrity only; it does not prove scholarly correctness.

## Reference inventory

Current visible resources: 15. Route set exercised or covered by tests: 60 total route identifiers (15 visible topics, 44 legacy aliases, and landing/default route). Chart resources inventoried by topic: Greek Grammar Handbook 10, Greek Paradigm Charts 30, Greek Morphology Guide 3, Greek Verbs 101, Greek Nouns 19, Greek Pronouns 4, Greek Adjectives 19, Greek Prepositions 1, Parsing Ambiguity 1, Hebrew Grammar Handbook 16, Hebrew Paradigm Charts 87, Hebrew Morphology Guide 4, Hebrew Verbs 323, Hebrew Nouns 18, Hebrew Particles 2.

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
| Paradigm Charts | Hebrew | `hebrew-paradigm-charts` | Paradigm Charts | same | Aggregated strong verb/stem/noun portal | Landing, search, Learn links | Search yes; primary featured | Pass | Partial and scroll-heavy | Derived from Reference topics | Structural only | Paradigm Charts | Make primary selector; keep unsupplied cells honest |
| Morphology Guide | Hebrew | `hebrew-morphology-guide` | Language Resources | same | Roots, stems, prefixes/suffixes labels | Landing supplemental | Search yes; supplemental nav | Pass | Duplicated/overlapping | App-authored | Structural only | Grammar Handbook | Fold into Handbook |
| Verbs | Hebrew | `hebrew-verbs` | Verbs | same | Strong verbs, stems, weak snapshots, syntax concepts | Charts, Handbook, Learn recognition, Reader/Word Pages | Search yes; additional nav as Stem Summaries | Pass | Partial/questionable | Prior repo content; row sources undocumented | Structural only; unsupplied cells marked | Paradigm Charts + Grammar Handbook | Source-verify before expanding; split forms/explanations |
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
| Verbal grammar | Root/stem concepts, perfect, imperfect, imperative, infinitives, participles | Partial | Strong-root representative material present. |
| Verbal grammar | Wayyiqtol/weqatal/cohortative/jussive | Minimal to partial | Wayyiqtol and volitives present; more syntax needed. |
| Verbal grammar | Strong vs weak verbs | Minimal | Weak verbs are recognition snapshots only. |
| Stems | Qal | Partial/substantially complete for strong representative forms | Perfect/imperfect/imperative/infinitives/participle supplied for כתב. |
| Stems | Niphal/Piel/Hiphil/Hitpael | Partial | Representative strong forms supplied; source not row-tagged. |
| Stems | Pual/Hophal | Questionable/partial | Passive-stem imperative and infinitive construct are intentionally unsupplied. |
| Weak verbs | I-guttural/III-guttural/doubly weak | Absent/minimal | Defer until sourced. |
| Weak verbs | I-nun/I-yod or Pe-yod/hollow/geminate/III-he | Minimal | Recognition snapshots only. |
| Syntax | Construct chains, definiteness, adjective agreement, suffixes, verbal/nominal clauses, word order, waw, negation, relatives, particles, discourse sequencing | Minimal to partial | Current explanations are scattered and concise. |

### Hebrew stem audit

For Qal, Niphal, Piel, Pual, Hiphil, Hophal, and Hitpael the app contains a function summary, recognition markers, representative strong root כתב, perfect, imperfect, infinitive absolute, participles, and stem summary rows. Qal/Niphal/Piel/Hiphil/Hitpael also supply imperative and infinitive construct. Pual/Hophal imperative and infinitive construct are not supplied and are marked as such. Pointing is present but not source-verified; provenance is derived/undocumented.

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
| v1.3.6 Hebrew strong-verb stems | P0/P1: verify Qal through Hitpael strong-root rows; resolve/passively document Pual/Hophal gaps | same | Scholarly Hebrew paradigm source, edition, convention | Structural + provenance tests; Learn exclusion tests | Passive-stem overclaiming | Weak verbs |
| v1.3.7 Hebrew suffix/nominal paradigms | P1/P2: pronominal suffixes, nouns, construct patterns | same | Source-tag suffix tables | Route/chart tests | Many allomorphs | Rare suffix variants |
| v1.3.8 Weak-verb foundations | P2/P3: sourced recognition and limited paradigms for I-nun, III-he, hollow, geminate | same | Specialist-reviewed source | Drill exclusion tests until verified | High error risk | Doubly weak full coverage |
| v1.3.9 Grammar Handbook depth | P1/P2: syntax and usage topics for both languages | same | Grammar source bibliography | Search/topic tests; browser QA | Duplicating chart explanations | Advanced/specialized debates |

## Questions requiring scholarly review

- The v1.3.3 pluperfect convention follows Machen's printed p. 238 active paradigm, including parenthesized augment; broader pluperfect alternatives remain a future sourcing question.
- Machen does not print a distinct second-declension feminine noun or complete superlative chart in the approved paradigm pages; another exact edition/page source would be needed before those are added.
- Which source/edition should be authoritative for Hebrew strong-verb pointing and passive-stem non-finite treatment?
- Which weak-verb categories should be included first for reader value without implying completeness?
- How much pronunciation/accent material belongs in a reading reference versus Learn?

## Areas where evidence was insufficient

The normalized v1.3.3 and v1.3.4 Greek registries have exact row-level citations. Legacy Greek explanatory snapshots and most Hebrew forms still lack row-level citations. The audit therefore continues to distinguish source-backed registries from structurally checked legacy material.
