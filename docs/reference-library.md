# Reference Library / Grammar Handbook

The Grammar section is a static, language-aware handbook for Biblical Greek and Hebrew readers. It is not a morphology generator: paradigms, decoder entries, recognition clues, charts, and cross-links are authored as maintainable reference content.

## v5.5 design goal

v5.5 refines Reference toward fast consultation while reading. Reference helps the reader understand; it is consulted, not completed. The first screen is organized by likely reading-time need rather than theoretical completeness or course order.

## Language-aware behavior

Reference owns a local Greek/Hebrew selector. Greek users see Greek reference tiers; Hebrew users see Hebrew reference tiers. This selector is independent of Reader and Learn language choices.

## Consultation tiers

The landing page is organized as:

1. Primary: Quick Reference, Grammar Handbook, Paradigm Charts.
2. Secondary: Morphology Guide, Reading Helps, Parsing Abbreviations.
3. Supplemental: quieter supporting material such as prepositions, particles, pronouns, ambiguity help, and stem summaries where implemented.

Quick Reference is compact lookup material. Grammar Handbook explains concepts. Paradigm Charts expose forms. Morphology Guide helps decode Word Page and Reader popup labels. Reading Helps gives short practical guidance for Greek sentences and Hebrew clauses.

## Category-based paradigm design

Paradigm navigation is category-first, not example-first.

Greek paradigm cards are organized around:

- Verb Paradigms
- Noun Paradigms
- Adjective Paradigms
- Article Paradigms
- Pronoun Paradigms

Representative words such as `λύω`, `λόγος`, and `καλός` may still appear inside charts, examples, test fixtures, and stable topic IDs, but they should not dominate the user-facing navigation.

Hebrew paradigm cards are organized around the major stems:

- Qal Paradigms
- Niphal Paradigms
- Piel Paradigms
- Pual Paradigms
- Hiphil Paradigms
- Hophal Paradigms
- Hitpael Paradigms

Each Hebrew stem page keeps concise tabs for Perfect, Imperfect, Imperative, Infinitive Construct, Infinitive Absolute, Participles, and Recognition.

## Shared explanation philosophy

Common explanations should live once and be linked from chart-focused pages. Examples include:

- Greek Case Functions
- Greek Voice Explanations
- Greek Mood Explanations
- Greek Common Parsing Clues
- Hebrew Stem Markers
- Hebrew Prefixes
- Hebrew Suffixes / Pronominal Suffixes
- Hebrew Construct Chains

Paradigm tabs should primarily contain charts and quick recognition clues. Avoid copying the same explanatory paragraphs into every paradigm page.

## Navigation model

The home layout is tier-based and optimized for rapid lookup:

1. Primary material answers the question, “What am I most likely to need in the next 30 seconds?”
2. Secondary material is one tap away for morphology, parsing abbreviations, and reading guidance.
3. Supplemental material remains findable without turning the landing page into a long wiki index.

Canonical topic IDs remain stable. Word Pages and Learn recognition links continue to target consolidated topics such as `greek-verbs`, `greek-nouns`, `hebrew-verbs`, and `hebrew-nouns`; v5.5 overview topics sit above those pages and reuse their content.

## Greek reference coverage

Greek now includes dedicated lookup pages for:

- First Declension endings
- Second Declension endings
- Third Declension basics
- Article Endings
- Adjective Endings
- Pronoun Endings
- Personal, demonstrative, relative, and interrogative pronouns
- Participles
- Contract Verbs
- Case Functions
- Parsing Ambiguity Guide

The participle page covers present active, present middle/passive, aorist active, aorist middle, aorist passive, perfect active, and perfect middle/passive recognition patterns.

## Hebrew reference coverage

Hebrew now includes dedicated lookup pages for:

- Dual Forms
- Pronominal Suffixes
- Construct Chains
- Weak Verb Overview
- Stem Marker Cheat Sheet

Weak verbs are intentionally recognition-only in v3.5.4. I-נ, III-ה, hollow verbs, and geminate verbs are documented as patterns and future expansion targets, not as full paradigms.

## Search behavior

Search indexes topic IDs, titles, categories, summaries, recognition tips, principal parts, chart labels, chart cells, examples, related-topic labels, feature-link metadata, v5.5 overview topics, morphology labels, parsing abbreviations, and stem relationships. Greek search remains accent-insensitive, so unaccented queries such as `λυω` and `λογος` still find accented Greek content.

Search is expected to find high-value reader queries such as:

- case endings
- participles
- contract verbs
- dual forms
- construct chains
- pronominal suffixes
- weak verbs
- pronouns

## Future hooks

The reference data keeps lightweight internal future hooks for Greek `μι` verbs and irregular verbs, but unfinished topics are not exposed in navigation or search.

## Static-content boundaries

The handbook must remain static and maintainable. Do not use this area to add:

- Bible reader features
- AI explanations
- drills
- accounts or sync
- morphology generators
- parser changes
- vocabulary changes

Future additions should preserve the same model: small pages, authored charts, targeted recognition clues, concise examples, explicit cross-links, and no duplicated long explanations.
