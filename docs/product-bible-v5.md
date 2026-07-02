# Puritan Parser v5 Product Bible

This document is the source of truth for v5 product direction. Existing product, educational, architecture, and roadmap docs should be read through this lens unless they explicitly describe historical behavior.

## Mission

Puritan Parser exists to help Christians become increasingly independent readers of the Greek New Testament and Hebrew Bible through progressive learning, intelligent assistance, and thoughtful reading tools.

The app succeeds when users gradually need less help from the app.

The goal is not more taps, streaks, or app engagement. The goal is more confident reading of Scripture in the original languages.

## Product Identity

Puritan Parser is:

"An adaptive original-language Bible reader that teaches Greek and Hebrew while you read."

It is a Bible reader, language-learning tool, reference guide, and progress tracker.

It is not:

- Logos
- Accordance
- Anki
- Duolingo
- A commentary platform
- A social network
- AI-for-everything

## Core Pillars

The app has five major pillars:

1. Reader - Read Scripture
2. Learn - Practice and acquire knowledge
3. Reference - Understand and look things up
4. Progress - Measure growth
5. Onboarding - Begin well

Supporting systems:

- Word Pages
- Settings
- Review Queue / SRS
- Study Sets
- Usage Examples
- Global Search

## Design Tests

Every major feature should pass these tests:

1. Reading Test - Does this help someone read Scripture?
2. Independence Test - Does this help the user need the app less over time?
3. Simplicity Test - Can a new user understand it quickly?
4. Scholarship Test - Would we be comfortable showing this to a Greek or Hebrew professor?
5. Longevity Test - Will this still feel appropriate in ten years?

## Product Personality

Puritan Parser should feel like:

"A trusted study Bible, not a game."

Tone:

- Calm
- Encouraging
- Scholarly
- Humble
- Quietly confident

Avoid:

- XP
- Coins
- Leaderboards
- Manipulative streaks
- Excessive gamification
- Guilt-based notifications
- Loud celebration

Celebrate meaningful growth:

- "You are ready to read 1 John."
- "You read John 1 with fewer word taps than last time."
- "λόγος moved from Learning to Known."
- "Your participle recognition improved this week."

Do not make raw activity the main celebration.

## Reader

Purpose:
The Reader is the home base of the app. It should feel like Scripture first, tools second.

Primary rule:
Never make the user lose their place in Scripture.

Reader priorities:

- Greek New Testament
- Hebrew Bible
- Original-language text
- Translation toggle
- Adaptive Reader assistance
- Word tap / Word Page access
- Chapter navigation
- Book progress access
- Quiet reading environment

Adaptive Reader settings:

- Display: Original / Interlinear
- Translation: On / Off
- Preferred Translation: OEB / WEB
- Original / English toggle, visible when translation is enabled
- Assistance Threshold: Everything, 50+, 30+, 20+, 10+, 5+, 2+, 1+, None, Custom
- Hide Known Words: On / Off
- Indicator Style: None, Text Tint, Dotted Underline, Footnote Marker

Defaults:

- Display: Original
- Translation: On
- Preferred Translation: OEB with WEB fallback
- Assistance: Everything
- Indicator: None
- Show Translation Toggle: On

Reader UX rules:

- Header, navigation, and reader controls should remain fixed.
- Only the Scripture text pane should scroll.
- Previous and Next chapter buttons should be on the same row.
- Search should be collapsed.
- Book Progress should be quiet, not visually dominant.
- Adaptive Reader controls should be clearly labeled as Reader Settings or Adaptive Reader.
- Reader -> Book Progress -> Back should return to Reader, not Learn.

Language settings:
Most Reader settings should be shared across Greek and Hebrew.
The assistance threshold may differ by language.

## Word Pages

Purpose:
A Word Page is the hub for everything related to a lemma.

It should help the reader continue reading confidently.

It is not:

- A commentary
- A full lexicon replacement
- A grammar textbook

It should answer:

- What am I looking at?
- What does this word mean?
- How is it functioning here?
- Have I learned it?
- Where can I practice it?
- Where can I learn this grammar?
- Where else does it occur?

Balance:
Word Pages should be 80% quick reference and 20% exploration.

Sections:

1. Identity
2. This Occurrence
3. Learning
4. Reference
5. Usage Examples
6. Navigation

Identity:

- Lemma
- Glosses
- Frequency
- Part of speech
- Language
- Pronunciation, future

This Occurrence:

Greek should show:

- Surface form
- Lemma
- Parsing
- Morphology
- Meaning in context
- Relevant grammar links

Hebrew should show:

- Surface form
- Lemma/root
- Stem
- Parsing
- Prefixes
- Suffixes
- Meaning in context
- Relevant grammar links

Hebrew prefix/suffix display is important.

Example:

- וַיֹּאמֶר
- Prefix: וַ־
- Root: אמר
- Stem: Qal
- Form: wayyiqtol 3ms
- Meaning: and he said

Learning:

- Known / Learning / Not Learned
- SRS stage
- Next review
- Current interval
- Successful reviews
- Review history
- Practice links

The user should be able to understand where a card went after review.

Reference:
Word Pages should link directly into:

- Quick Reference
- Grammar Handbook
- Paradigm Charts
- Morphology Guide

Usage Examples:
Word Pages should include contextual examples of the lemma throughout Scripture.

Implementation rules:

- Use an occurrence index.
- Do not load every occurrence immediately.
- Lazy load examples.
- Show a small preview first.
- Provide Load More / View All.
- Group by corpus, author, or current book where useful.
- Prioritize current passage when applicable.

Example usage structure:

- Current Passage
- Current Book
- Gospels
- Paul
- General Epistles
- View All

## Learn

Purpose:
Learn is where the user practices and acquires knowledge.

Learn trains.
Progress measures.
Reference explains.
Reader applies.

Learn should always open to a dashboard, not the last subsection.

Dashboard priority order:

1. Review Queue
2. Continue Learning
3. Start Something New
4. Practice
5. Study Sets

Review Queue:
Review Queue is the daily driver and has the highest priority on the Learn screen.

It should answer:

- What should I maintain today?
- How long will it take?
- What is waiting beyond today's target?

Example:

Review Queue

Greek
18 due today
42 more available

Hebrew
12 due today
9 more available

[Review Greek]
[Review Hebrew]
[Review Mixed]

Review Queue should be sustainable, transparent, and non-punitive.

Daily Review Target:
Puritan Parser should have language-specific daily review targets.

Defaults:

- Greek: Standard - 30/day
- Hebrew: Standard - 30/day

Options:

- Light - 15/day
- Standard - 30/day
- Heavy - 50/day
- Custom

Important:
The review cap limits the main daily queue, but it must not hide the true backlog.

Good:
"30 in today's queue, 42 more available."

Bad:
"30 due" when 72 are actually waiting.

Self-Reported Known Words:
Onboarding may mark many words as known by self-report.

Those words should not flood the Review Queue.

Instead:

- Known by self-report
- Available for maintenance
- Gradually sampled into review

Continue Learning examples:

- Greek 30+ Frequency Path - 74%
- Romans Reading Path - 32%
- Greek Participles - 48%

Start Something New contains Vocabulary and Grammar.

Vocabulary paths:

- Frequency Paths
- Reading Paths
- Study Sets

Grammar paths:

- Greek nouns
- Greek verbs
- Greek participles
- Greek infinitives
- Greek subjunctive
- Greek imperatives
- Greek advanced syntax
- Hebrew basics
- Hebrew stems
- Hebrew weak verbs
- Hebrew construct chains
- Hebrew pronominal suffixes
- Hebrew wayyiqtol / waw consecutive
- Hebrew syntax

Practice hierarchy:

1. Vocabulary
2. Grammar
3. Mixed

Vocabulary Practice supports Frequency, Reading Paths, Known words, Learning words, Study Sets, and Custom selections.

Grammar Practice supports Recognition, Parsing, Weak verbs, Advanced grammar, and Paradigms.

Paradigm Recognition remains a core practice mode.

Mixed Practice is a supporting capstone option. It combines vocabulary and grammar in a way that resembles real reading. Mixed Practice should be smart, not purely random.

Practice and SRS:
At the end of an on-demand practice session, the app should ask whether the session should count toward SRS.

Default:
Ask whether to count practice toward SRS.

Study Sets:
Study Sets are custom learning paths. They are a quiet supplement, not a primary method.

Primary learning methods remain:

- Frequency
- Reading Paths
- Grammar Learning Paths

Study Sets exist for specific goals:

- Preparing to preach
- Studying for a quiz
- Reading a favorite book
- Personal review

Study Sets should reuse the same learning path architecture.

Rule:
A Study Set should take under 30 seconds to create.

Avoid turning Study Sets into an advanced query builder.

## Learning Paths

Every learning path should share the same basic shape:

- Title
- Progress
- Estimated Time Remaining
- Continue
- Practice
- Browse
- Mark All Known, vocabulary only

Use the same pattern, not necessarily identical buttons.

Vocabulary Paths include:

- Path Summary
- Continue Learning
- Practice This Path
- Browse Words
- Mark Path as Known

Grammar Paths include:

- Topic Summary
- Continue Practice
- Recognition Practice
- Parsing Practice where applicable
- View Reference
- Browse Forms / Examples

Grammar paths do not need Mark All Known.

## Reference

Purpose:
Reference helps the reader understand.

It is consulted, never completed.

It should feel like opening the appendix of a very good study Bible.

Reference explains.
Learn practices.

Organization principle:
Reference should be organized by frequency of consultation, not by theoretical completeness.

Primary question:
What is the reader most likely to need in the next 30 seconds?

Tier 1 - Primary:
Always visible.

- Quick Reference
- Grammar Handbook
- Paradigm Charts

Tier 2 - Secondary:
Available with one tap.

- Morphology Guide
- Reading Helps
- Parsing Abbreviations
- Stem Summaries

Tier 3 - Supplemental:
Useful, but tucked away.

- Greek Alphabet
- Hebrew Alphabet
- Pronunciation
- Common scholarly abbreviations
- Textual resources
- Reading guides

Reference Search should find Grammar topics, Paradigms, Abbreviations, Morphology, and Handbook articles.

Reference should not have completion percentage, achievements, streaks, or progress tracking.

You do not complete a dictionary. You consult it.

## Progress

Purpose:
Progress measures growth toward independent reading.

Progress diagnoses and encourages.
Learn trains.
Reader applies.

Progress structure:

- Reader Growth Summary
- Reading Readiness
- Vocabulary Growth
- Grammar Growth
- Reading History
- Detailed Analytics
- Recommendations

Reader Growth Summary examples:

- You know 412 Greek words.
- You can recognize about 68% of the Greek New Testament by word frequency.
- You are closest to being ready for 1 John, John, and Philippians.

Reading Readiness shows how prepared the user is to read biblical books.

Example:

- 1 John - 84% ready
- Philippians - 78% ready
- John - 72% ready
- Romans - 61% ready

Tap a book:

- Known words: 84%
- Unknown high-value words: 18
- Estimated study time: 12 minutes
- Open Reading Path
- Practice Unknown Words
- Read 1 John

Important distinction:
Progress shows readiness.
Learn contains the Reading Path.

Vocabulary Growth shows Known words, Learning words, Due today, Known by frequency band, Known by book, Known by part of speech, Review accuracy, and Retention trends.

Grammar Growth shows Topic familiarity, Recognition accuracy, Parsing accuracy, Recent practice history, and Weak areas.

Reading History tracks actual Scripture reading, such as chapters read in original languages, words tapped per chapter, assistance used, translation toggles, and repeated chapter improvement.

Best kind of stat:
"You read John 1 with 23 word taps. Last time: 41."

Detailed Analytics may include vocabulary by frequency, reading readiness by book, review accuracy over time, words learned this month, grammar practice accuracy, and Reader assistance trend.

Progress may recommend next steps, but should point back to Learn or Reader. Progress should not become a second Learn dashboard.

## Settings

Purpose:
Settings answers:

"How do I want Puritan Parser to behave?"

Settings should not contain study choices.
Study choices belong in Learn.
Reading choices belong in Reader.
Settings controls long-term behavior.

Sections:

- Appearance
- Reader Preferences
- Learning Preferences
- Data & Accounts
- About

Appearance:

- Theme
- Accent color
- Text size
- Reader font size
- Original language font size

Reader Preferences:
Long-term defaults for Adaptive Reader.

- Display
- Translation
- Preferred translation
- Show Translation Toggle
- Indicator Style
- Hide Known Words
- Greek Assistance Threshold
- Hebrew Assistance Threshold
- Restore Reader Defaults

Learning Preferences:

- Daily Review Target - Greek
- Daily Review Target - Hebrew
- SRS Settings - Default / Advanced
- Practice Sessions:
  - Ask whether to count toward SRS
  - Always practice only
  - Always count toward SRS
- Session Size:
  - 10
  - 20
  - 30
  - Custom
- Restore Learning Defaults

Data & Accounts:

- Local Data
- Export Data
- Import Data
- Reset Learning Data
- Backup Status
- Account, future

v5 should remain local-first but prepare for future sync through a storage provider abstraction.

About:

- About Puritan Parser
- Version
- Attributions
- Bible Text Licenses
- Changelog
- Content Accuracy Notes
- Report an Issue

Settings rule:
Common reading changes belong in the Reader.
Long-term defaults belong in Settings.

## Onboarding

Purpose:
Onboarding answers:

"How should I begin?"

It should be goal-based, not feature-based.

Do not overwhelm users by explaining every screen.

Basic flow:

- Welcome
- Choose Greek / Hebrew / Both
- Choose goal
- Optional proficiency survey
- Recommended setup
- Start Here

Goals:

- Read Greek
- Read Hebrew
- Build vocabulary
- Prepare for a book
- Maintain what I know
- Start from the beginning

Self-Reported Proficiency:
Onboarding should support users who already know Greek or Hebrew.

This should be a trust-based survey, not a quiz.

Example:
Do you already know some Greek or Hebrew?

- Yes - help me set my starting level
- No - start me from the beginning
- Skip for now

Ask separately for Greek and Hebrew.

Greek proficiency:

- New to Greek
- I know the alphabet and some basics
- I have completed first-year Greek
- I can read the Greek New Testament with help
- I can read comfortably and want maintenance

Greek vocabulary:

- None
- Most words 50x+
- Most words 30x+
- Most words 10x+
- Most common GNT vocabulary

Greek grammar:

- Noun cases
- Verb endings
- Participles
- Infinitives
- Subjunctives
- Imperatives
- μι verbs
- Basic syntax

Hebrew proficiency:

- New to Hebrew
- I know the alphabet and vowels
- I have completed first-year Hebrew
- I can read narrative Hebrew with help
- I can read comfortably and want maintenance

Hebrew vocabulary:

- None
- Most words 100x+
- Most words 75x+
- Most words 50x+
- Most common Hebrew Bible vocabulary

Hebrew grammar:

- Nouns and adjectives
- Pronominal suffixes
- Construct chains
- Qal verbs
- Derived stems
- Weak verbs
- Wayyiqtol / waw consecutive
- Basic Hebrew syntax

Start Here:
Onboarding should end with a personalized Start Here screen.

Example:

You're ready to begin.

Recommended first steps:

1. Review Greek 30x+ vocabulary
2. Read 1 John 1 with Adaptive Reader
3. Explore Greek noun endings in Reference

Buttons:

- Start Review
- Open Reader
- Go to Learn

## Storage and Future Accounts

v5 should remain local-first.

However, the codebase should prepare for future accounts and sync.

Architecture goal:

- StorageProvider
- LocalStorageProvider
- Future CloudProvider

The app should not hard-code localStorage everywhere.

Future user accounts should not require rewriting the learning system.

## Global Search

Global Search should be available from the main app shell.

It should not replace Reference Search.

Initial scope:

- Search lemmas
- Search glosses
- Filter Greek / Hebrew
- Show frequency
- Show learning status
- Open Word Page

Future scope:

- Grammar topics
- Reference articles
- Strong's numbers
- Occurrences
- Book-specific results

Global Search is a utility, not a pillar.

## v5 Priorities

Must Have:

- Reader UX polish
- Adaptive Reader completion
- Review Queue as Learn priority
- Language-specific review targets
- Transparent SRS status
- Word Page upgrade
- Usage examples with occurrence index
- Reference reorganization
- Grammar Handbook / Quick Reference structure
- Progress redesign
- Goal-based onboarding
- Self-reported proficiency setup
- Study Sets
- Settings reorganization
- Storage abstraction
- Global Search MVP
- Hebrew prefix/suffix display
- Weak verbs / advanced grammar foundation

Should Have:

- Mixed Practice MVP
- Detailed analytics
- Reference search
- Grammar learning paths
- Practice count-toward-SRS prompt
- Known/self-reported maintenance sampling

Later:

- Accounts
- Cloud sync
- Mobile app store release
- Notifications
- Audio pronunciation
- Full lexicon integration
- LXX integration
- Commentary integration, if ever
- Community/social features, probably not

## Non-Negotiable Rules

- Reader is sacred.
- Never make users lose their place in Scripture.
- Review Queue is the daily driver.
- Learn trains.
- Reference explains.
- Progress measures.
- Settings controls behavior.
- Word Pages connect the whole app.
- Study Sets are quiet supplements.
- SRS should be transparent.
- The app should become less necessary over time.
- Avoid feature creep disguised as scholarship.
- Do not overload new users.
- Do not punish users for honestly reporting what they know.
- Prioritize reading independence over app engagement.
