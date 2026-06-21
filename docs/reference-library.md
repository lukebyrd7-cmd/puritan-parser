# Reference Library / Grammar Handbook

The Grammar section is a static, language-aware handbook for Biblical Greek and Hebrew readers. It is not a morphology generator: paradigms, decoder entries, recognition clues, charts, and cross-links are authored as maintainable reference content.

## v3.5.4 design goal

v3.5.4 refines the handbook toward fast consultation while reading. The priority is organization, navigation, and reduced repetition rather than large encyclopedic essays. Pages should feel closer to a compact grammar companion than a disconnected article collection.

## Language-aware behavior

Grammar follows the global app language mode. Greek users land on Greek reference cards; Hebrew users land on Hebrew reference cards. A local Greek/Hebrew segmented control remains available for comparison work.

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

The home layout is card-based and optimized for rapid lookup:

1. Favorites
2. Paradigms
3. Cheat Sheets
4. Parsing Guide
5. Recently Viewed
6. Quick Jumps
7. Reference

Every reference article has breadcrumbs, a star/unstar control, related fast links, and concise charts. Favorites are intended to be “my frequently consulted pages,” so the empty state explicitly tells users to star pages.

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

Search indexes topic IDs, titles, categories, summaries, recognition tips, principal parts, chart labels, chart cells, examples, related-topic labels, feature-link metadata, and stem relationships. Greek search remains accent-insensitive, so unaccented queries such as `λυω` and `λογος` still find accented Greek content.

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
