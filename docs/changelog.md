# Changelog

This changelog is a human-readable project history, not a Git log. Future entries should summarize meaningful releases rather than individual commits.

## Unreleased

### v5.4 Word Page Upgrade + Usage Examples Foundation

- Reorganized Word Pages around Identity, This Occurrence, Learning, Reference, Usage Examples, and Navigation.
- Surfaced Word Page SRS details more clearly, including next review, current interval, successful reviews, total reviews, review history, and known-source metadata where available.
- Improved This Occurrence display for Greek and Hebrew, including Hebrew prefix, suffix, stem, form, and root/lemma fields when the Reader token data provides them.
- Added a lazy Usage Examples foundation backed by the existing cached Reader search indexes, with current-reference prioritization, a compact preview, and bounded Load More behavior.
- Kept Reference links limited to existing safe destinations while presenting Quick Reference, Grammar Handbook, Paradigm Charts, and Morphology Guide labels as related-reference guidance.

### v5.3.1 Review Queue Actions Hotfix

- Fixed Review Queue buttons so Greek, Hebrew, and Mixed review actions start sessions or show empty states.

### v5.3 SRS Transparency + Review Settings

- Added user-facing vocabulary lifecycle labels and metadata for Not Learned, Learning, Reviewing, Known, and Known by Self-Report.
- Surfaced SRS explanations, next review, interval, successful review count, and review history summaries in Learn review cards and Word Page Learning panels.
- Added compact review-result feedback so completed cards report their next review, interval, and resulting status.
- Polished Greek and Hebrew daily review targets with Light, Standard, Heavy, and Custom options while preserving the `pp_learn_review_targets` storage key and 30/day defaults.
- Added the `pp_learn_practice_srs_preference` hook for on-demand practice, defaulting to asking whether practice should count toward SRS before scheduling changes.
- Prepared Known by self-report records through `knownSource: "self_reported"` without dumping them into the daily review queue.

### v5.2 Learn Dashboard + Review Queue Redesign

- Reorganized Learn so the root opens to a dashboard ordered around Review Queue, Continue Learning, Start Something New, Practice, and Study Sets.
- Added separate Greek and Hebrew Review Queue summaries with today's capped queue, additional available backlog, estimated time, and Greek/Hebrew/Mixed review entry points.
- Added the safe local preference foundation for language-specific daily review targets, defaulting Greek and Hebrew to Standard 30/day without changing existing vocabulary learning records.
- Clarified the Learn practice hierarchy as Vocabulary, Grammar, then Mixed while keeping Paradigm Recognition and parsing practice accessible.
- Positioned Study Sets as a quiet supplement with a polished placeholder, leaving full Study Set creation for a later v5 update.

### Docs / Planning

- Clarified that Greek Interlinear is supported while Hebrew Interlinear remains planned and gated by reliable token-level gloss data.
- Added a future Hebrew Interlinear Data Foundation roadmap item and fallback requirements.
- Documented that Hebrew Interlinear must be gloss-first, RTL-aware, and must not show raw IDs, numeric codes, dense morphology tags, undefined/null values, or debug-like data as primary support text.

### v5.1.3 Mobile Reader Compactness Polish

- Made mobile Reader controls more compact so Scripture receives more vertical space above the fold.
- Kept Previous/Next, Original/English, Reader Settings, Search, and Book Progress available while making secondary controls quieter on small screens.
- Quieted the duplicate chapter heading on mobile because the compact Reader control status already identifies the current chapter.

### v5.1.2 Hebrew Interlinear Reader Fix

- Hebrew Interlinear is now gracefully gated until proper token-level gloss data is available.
- Preserved Greek Interlinear and Hebrew Original mode while preventing Hebrew lemma, numeric ID, and morphology fields from rendering as pseudo-interlinear support text.
- Kept Hebrew Reader settings from presenting Interlinear as a finished mode when the loaded Reader data does not include reliable token glosses.

### v5.1.1 Reader Spaciousness Polish

- Consolidated the Reader Original / English toggle into the main Reader controls row so Scripture begins sooner.
- Reduced Reader-only vertical spacing, quieted Book Progress, and widened the Scripture pane while preserving comfortable original-language text.
- Kept Previous/Next, Reader Settings, Search, Book Progress, translation toggling, and Reader state behavior intact.
- Updated Reader layout coverage for the consolidated translation toggle.

### v5.0.0 Product Bible + Architecture Alignment

- Added `docs/product-bible-v5.md` as the source of truth for v5 product direction.
- Added `docs/v5-implementation-plan.md` to convert the Product Bible into actionable implementation epics and gap analysis.
- Updated the roadmap with v5 epics from Product Bible alignment through Global Search MVP and release polish.
- Updated architecture documentation with the v5 local-first storage-provider direction for future accounts and sync.
- Aligned product, educational, and AI development documentation around the v5 Product Bible.

## v4.3.2

- Added World English Bible as a complete built-in translation provider under `data/translations/web/`, generated by `scripts/generate-web-translation-data.js`.
- Added Reader translation selection between OEB and WEB while keeping OEB as the default.
- Added automatic WEB fallback when OEB is selected but unavailable for the current passage, with a quiet note in the translation toggle.
- Added an optional Floating Translation Toggle setting so the Original / English toggle can remain accessible while scrolling.
- Kept Translation Off hiding the Original / English toggle, and kept only one text visible at a time.
- Updated translation manifests, content metadata, attribution, service worker manifest precaching, and documentation for OEB, WEB, fallback behavior, and provider architecture.
- Added tests for WEB provider loading, verse lookup, translation selection, OEB-to-WEB fallback, unavailable English state, floating toggle rendering, settings persistence, and runtime-cache hooks.
- Left parallel display, comparison tools, AI translation, accounts, sync, and new learning systems out of scope.

## v4.3.1

- Added the Open English Bible as the first built-in English translation provider.
- Added reusable translation provider infrastructure under `src/core/translations/`.
- Generated offline OEB chapter JSON under `data/translations/oeb/books/`, with a manifest for source, license, attribution, books, chapters, and verse counts.
- Updated the Reader so English mode loads the current translation chapter through the provider instead of relying on embedded verse fields.
- Preserved current book, chapter, and focused verse when switching Original / English.
- Kept only one text visible at a time and kept Translation Off hiding the Original / English toggle.
- Updated the service worker cache version and precached the provider plus OEB manifest; translation chapter JSON continues through the runtime JSON cache.
- Added tests for OEB import validation, translation provider loading, verse mapping, Reader Original / English switching, position preservation, translation loading, and offline caching hooks.
- Left translation selection UI, parallel text, split screen, comparison tools, accounts, sync, and new learning systems out of scope.

## v4.3

- Added Adaptive Reader controls inside the Reader for display, translation, assistance, known-word filtering, and indicator style.
- Added Original and Interlinear display modes, with interlinear glosses drawn from existing gloss and vocabulary data.
- Added Translation settings that show an Original / English toggle only when enabled and render a quiet unavailable state when no English passage data exists.
- Added assistance presets for Everything, 50+, 30+, 20+, 10+, 5+, 2+, 1+, None, plus validated custom thresholds.
- Connected Hide Known Words to the shared Vocabulary Learning state instead of duplicating learning records.
- Added quiet assisted-word indicators: none, text tint, dotted underline, and footnote marker.
- Made Reader token taps respect assistance settings, including a throttled quiet message when help is hidden.
- Persisted Adaptive Reader settings locally by language and added a subtle Reader status label.
- Refined the Adaptive Reader panel so it stays open while changing settings and closes only by explicit close, Escape, or outside click.
- Added an optional Floating Reader Controls setting so Reader controls/status can stay accessible while scrolling.
- Added tests for settings access, display modes, translation toggling, thresholds, custom validation, Hide Known Words, indicator rendering, tap behavior, persistence, and existing Reader behavior.
- Left accounts, sync, saved reader profiles, AI translation, new vocabulary data, new grammar data, Reader Examples, and gamification out of scope.

## v4.2.9

- Refined top-level navigation around four clear centers: Learn, Reader, Reference, and Progress.
- Made Learn the root destination and the central home for study workflows while keeping legacy study routes available.
- Moved Parsing Drills under Learn → Paradigms as an additional study tool while preserving the existing parsing route.
- Removed the global Greek/Hebrew toggle from the application chrome.
- Added a local Greek/Hebrew selector to Reference so Reference owns its own language selection.
- Clarified Reading Readiness messaging around Known vocabulary and book/chapter preparation paths.
- Removed header Due and streak indicators so progress information lives in Progress instead of the application chrome.
- Added a confirmed Mark Path as Known action for vocabulary paths so existing knowledge can update Reading Readiness and Progress without creating due review cards.
- Added a Back to Reader action near the top of Word Pages while preserving the existing bottom action.
- Removed duplicate visible entry points for Vocabulary, Flashcards, Parsing, Dashboard, and Profile from the top navigation.
- Tightened terminology around Known, Learning, Due, Study, Recognition, Reference, and Readiness.
- Smoothed learning session flows with clearer complete and empty states that lead back to useful next actions.
- Updated button labels and shortcut labels for more consistent capitalization and action language.
- Updated navigation, Learn, and Word Page tests for the refined UX pass.
- Left accounts, sync, Reader Examples, advanced syntax, weak-verb drills, gamification, statistics expansion, and new study modes out of scope.

## v4.2.8

- Refined Word Pages into a scannable word-first explanation surface: word, lemma, gloss, learning status, parsing, morphology, frequency, occurrences, related information, and links.
- Added clearer Greek morphology rows for tense, voice, mood, person, number, gender, case, and principal part when those fields already exist.
- Added clearer Hebrew morphology rows for prefixes, suffixes, stem, conjugation, person, gender, and number where source token data already provides them.
- Preserved the Reader popup workflow while passing existing token metadata through to Word Pages for better Hebrew prefix handling.
- Kept Word Pages connected to existing Vocabulary Learning, Reference grammar links, Reader search occurrences, and parser decoding rather than creating duplicate services.
- Prepared the Word Page occurrence area for future Reader Examples without implementing Reader Examples in this release.
- Added tests for Greek morphology, Hebrew morphology, prefix handling, suffix handling, Word Page layout, and existing Reader integration.
- Left Reader redesign, Reference redesign, advanced syntax, weak-verb expansion, accounts, sync, and gamification out of scope.

## v4.2.7

- Added a new Progress section with Overview as the default page and Statistics as a quieter secondary page.
- Introduced a reusable Progress service that reads Vocabulary Learning, Reading Readiness, Paradigm Recognition, and available Reader activity data without duplicating source tracking.
- Added Overview summaries for Known, Learning, Due Today, closest books and chapters, Old Testament readiness, New Testament readiness, and recognition practice.
- Added practical recommendations based on real local data, such as due vocabulary, closest unfinished books, readiness thresholds, and stale paradigm practice.
- Added Statistics totals where existing tracking supports them and displays `Not yet tracked` where the app does not yet persist a category.
- Recorded completed paradigm recognition sessions as local user progress for Progress and Statistics.
- Kept the design quiet and typographic: no badges, trophies, confetti, leaderboards, streak requirements, or progress bars.
- Added tests for progress calculations, recommendation generation, statistics display, empty-state handling, learning-data integration, and navigation.

## v4.2.6

- Added the first reusable Paradigm Recognition engine for Learn.
- Made Learn → Paradigms functional for Greek Verbs, Greek Nouns, Hebrew Verbs, and Hebrew Nouns.
- Added one-form-at-a-time recognition sessions with Reveal Answer, I recognized it, and I missed it actions.
- Kept progress deliberately simple: recognized and missed counts only.
- Generated recognition items from Reference-backed paradigm material instead of duplicating grammar explanations in Learn.
- Added quiet View Reference navigation from each recognition item back to the authoritative Reference page.
- Included Greek verb recognition across audited tense-form, voice, mood, infinitive, and participle material, including Pluperfect anchors from the Reference paradigm source.
- Included limited verified Hebrew recognition for Qal, Niphal, Piel, Hiphil, Hithpael, Perfect, Imperfect, Wayyiqtol, Weqatal, Imperative, Participles, Infinitive Absolute, Infinitive Construct, and verified noun material.
- Excluded Hebrew Pual/Hophal drill material, weak-verb snapshots, and `Needs review` cells from recognition sessions.
- Added tests for Greek sessions, Hebrew sessions, View Reference navigation, unverified Hebrew exclusions, reusable engine behavior, and existing Learn navigation.
- Left typing exercises, parsing production, weak-verb drills, statistics redesign, dashboard work, accounts, and sync out of scope.

## v4.2.5 Phase A

- Reorganized Reference around practical use, with verb paradigms first for Greek and Hebrew.
- Grouped Greek Reference as Verbs, Nouns, Articles, Pronouns, and Other paradigms; grouped Hebrew as Verbs, Nouns, and Other paradigms.
- Added a reusable `referenceParadigmGroups()` foundation so future Paradigm Recognition can consume existing Reference material instead of duplicating paradigm charts.
- Corrected obvious Hebrew strong-verb paradigm aliasing where non-Qal stems reused Qal-looking imperative, infinitive, and participle forms.
- Marked uncertain passive-stem non-finite material as needing Phase B scholarly review instead of presenting forced Qal forms.
- Simplified Learn → Vocabulary → New Words to choose Greek or Hebrew first, then show the existing frequency choices.
- Removed the separate Reference language selector so Reference follows the global Greek/Hebrew toggle.
- Updated tests for Reference navigation, paradigm organization, New Words language selection, Hebrew paradigm corrections, existing Reference pages, and Learn navigation.
- Left Scholarly Grammar Audit, Paradigm Recognition, Statistics, Dashboard work, Catch Up Review, accounts, and sync out of scope.

## v4.2.4

- Added a quiet Learning section to Word Pages that shows Not Learned, Learning, or Known from the shared Vocabulary Learning model.
- Connected Learn This Word to the existing vocabulary introduction flow without creating a separate word-page learning state.
- Connected Review This Word and Review Again to the existing Learn review interface with a focused word review.
- Added a Reader action to open Reading Readiness for the current book through the existing Book Progress pages.
- Simplified Learn → Vocabulary → New Words so Greek and Hebrew frequency choices appear directly, removing the separate By Frequency navigation level.
- Kept book and chapter preparation exclusively inside Reading Readiness.
- Left Paradigm Recognition, grammar audits, statistics, dashboards, Catch Up Review, accounts, and sync out of scope.

## v4.2.3

- Added reusable Book Progress calculations for book, book-frequency, chapter, and chapter-frequency scopes.
- Connected Reading Readiness to Reader manifests so Old Testament and New Testament book preparation opens real Book Progress views.
- Moved book and chapter preparation under Reading Readiness while keeping Vocabulary focused on Review, New Words, and By Frequency study.
- Added quiet scoped frequency choices and custom frequency entry for book and chapter preparation.
- Kept readiness objective: known vocabulary, total vocabulary, and remaining words only; no percentages, progress bars, or gamified labels.
- Left Word Page learning status, Paradigm Recognition, Progress redesign, Statistics, Catch Up Review, accounts, and sync out of scope.

## v4.2.2

- Added the first working Vocabulary recognition flow for frequency study paths.
- Introduced a reusable local-first vocabulary learning model with lemma status, review history, success counts, due dates, and simple scheduling.
- Connected Greek and Hebrew frequency paths to Start Learning, one-word-at-a-time introduction, Learn Another Word, and remaining-path counts.
- Made the Learn Review page show due vocabulary, reveal meanings, and accept Recognized or Missed self-grades.
- Split Vocabulary Review into Greek Review and Hebrew Review sessions while keeping one shared learning model.
- Polished review cards so the headword, revealed gloss, quiet frequency metadata, and review actions are easier to use.
- Kept vocabulary learning as one global review system rather than separate study-path decks.
- Left book/chapter vocabulary paths, Paradigm practice, Reading Readiness, Word Page learning status, Catch Up Review, accounts, sync, and gamification out of scope.

## v4.2.0

- Added the permanent Learn shell as a primary navigation area.
- Created durable homes for Vocabulary, Paradigms, and Reading Readiness.
- Added placeholder subpages for vocabulary study paths, paradigm recognition, and Testament-level readiness.
- Kept the release architectural only: no SRS changes, scheduling, review logic, recognition engine, or readiness calculations.
- Added navigation and smoke coverage for Learn pages and Back navigation.

## v4.1.1

- Documented the educational philosophy behind Puritan Parser.
- Captured the conceptual design for the Learn system before v4.2 implementation.
- Recorded the recognition-first philosophy for paradigm practice.
- Captured the vocabulary study paths and Reading Readiness model.
- Clarified the distinction between progress as reading ability and statistics as app activity.

## v4.1

- Added project foundation documentation:
  - Product philosophy
  - Roadmap
  - Architecture guide
  - AI development guide
  - Human-readable changelog
- Established documentation as part of the product, not a separate afterthought.
- Clarified that future work should protect the quiet companion philosophy and update docs when meaningful features land.

## v4.0

- Completed the Hebrew Bible Reader.
- Consolidated Greek and Hebrew reading into shared Reader architecture.
- Added Word Pages for focused word-level study.
- Added Read in Context flows that return users from word study to the biblical text.
- Continued generated Reader data pipelines and audit tooling.

## v3.x

- Built the Grammar Handbook / Reference Library with Greek and Hebrew reference topics.
- Added Greek Reader foundations, chapter loading, Reader search, word popups, and generated Greek Reader data.
- Added expanded morphology-driven vocabulary and parsing data.
- Improved gloss architecture with primary glosses, alternate glosses, and custom user glosses.
- Added content pipeline conventions, manifests, attribution rules, lazy-loading boundaries, and service-worker caching rules.
- Added routing, schema migrations, and modular feature boundaries.

## v2.x

- Established the modular app structure under `src/`.
- Separated static/source data from local user progress.
- Added storage adapters, model helpers, and core data-loading boundaries.
- Expanded parser, filter, SRS, import/export, and dashboard test coverage.

## v1.x

- Established the original local-first vocabulary, flashcard, and parsing workflows.
- Stored study progress in the browser.
- Kept the app deployable as a static web app.
