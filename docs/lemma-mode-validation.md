# Lemma Mode Validation

Date: 2026-06-20

## Scope

This validation checks whether lemma study mode is functioning correctly without modifying vocabulary data. It specifically verifies that the vocabulary list, flashcards, and search consume grouped study entries; that display resolves headwords with `lexicalForm → lemma → word` rather than `representativeForm`; and whether any observed issues are caused by grouping, display, or source data.

## Findings summary

- **Grouping is not broken.** Lemma mode builds grouped study entries through `getStudyEntries(..., 'lemma')`, which delegates to `groupEntriesByLemma`. Grouping keys are language plus lemma, so equivalent lemma text across languages is not merged.
- **Vocabulary list consumption is not broken.** The vocabulary list renders from `getCurrentStudyList()`, which uses grouped study entries in lemma mode.
- **Flashcard consumption is not broken.** Flashcards build the card pool by applying `getStudyEntries` to the filtered raw forms, then review every original form contained in the lemma study entry.
- **Search consumption is not broken.** List search uses `getStudyEntrySearchText` for study entries, and lemma search text includes the displayed headword, lemma, lexical form, glosses, contained forms, representative form, and POS.
- **Display logic is not broken.** Shared headword display helpers prefer `lexicalForm`, then `lemma`, then `word`. They do not prefer `representativeForm`.
- **Current source data is incomplete for lexical forms.** `vocab_all.json` currently has no entries with a `lexicalForm` field populated. Therefore, current lemma-mode headwords usually fall back to `lemma` rather than richer lexical/citation forms.

## Code path validation

### Grouped study entries

`getStudyEntries(entries, studyMode)` returns raw entries only when `studyMode === 'form'`; otherwise it returns `groupEntriesByLemma(entries)`. `groupEntriesByLemma` groups by `lang + lemma`, and `createLemmaStudyEntry` returns entries marked with `studyEntryType: 'lemma'`, `word: lemma`, `lexicalForm`, `representativeForm`, `forms`, `originalEntries`, and `representativeEntry`.

This means lemma study mode is designed to consume grouped entries, not individual inflected forms.

### Vocabulary list

The vocabulary list obtains its input via `getCurrentStudyList()`, which calls `getStudyEntries(getCurrentList(), state.prefs.studyMode || 'lemma')`. `renderList()` filters and sorts that study list, and table rows display `displayHeadwordForEntry(it)`.

Conclusion: the vocabulary list is consuming grouped study entries when preferences are in lemma mode.

### Flashcards

`startFlash()` starts from filtered raw forms, converts them to study entries with `getStudyEntries(rawPool, state.prefs.studyMode || 'lemma')`, and then filters for glossed cards. `renderFlashCard()` displays `displayHeadwordForEntry(cur)`. On review, `onRate()` calls `getStudyEntryOriginals(cur)` and schedules every original entry in the grouped lemma entry.

Conclusion: flashcards are consuming grouped entries in lemma mode and correctly map reviews back to original form rows.

### Search

`renderList()` uses `getStudyEntrySearchText(it)` when available. For lemma entries, `getStudyEntrySearchText()` includes:

- displayed headword
- lemma
- lexical form
- primary gloss
- alternate glosses
- all grouped forms
- representative form
- POS

Conclusion: search is consuming grouped lemma entries and preserving both lemma-level and form-level discoverability.

## Display validation

The display fallback chain is implemented as:

```js
lexicalForm || lemma || word
```

This appears in the shared `getDisplayHeadword` model helper and is duplicated as a local fallback in the vocabulary list, flashcards, and modal modules. The grouped lemma entry does include `representativeForm`, but display helpers do not prefer it. `representativeForm` is shown only as a detail row in the modal for transparency.

Conclusion: display uses `lexicalForm → lemma → word`, not `representativeForm`.

## Source data validation

A direct inspection of `vocab_all.json` showed:

- Total records: 75,852
- Records with populated `lexicalForm`: 0
- Greek form records: 19,049
- Greek grouped lemma entries: 5,478
- Total grouped study entries across languages: 14,630

Because source vocabulary records currently do not populate `lexicalForm`, the application cannot display richer lexical/citation forms in current lemma mode. It falls back to `lemma`, which is expected from the display chain.

## 10 current Greek lemma-mode display examples

The following examples were generated from current `vocab_all.json` by grouping entries with `groupEntriesByLemma` and applying the display fallback `lexicalForm || lemma || word`. These examples intentionally include entries where `representativeForm` differs from the displayed headword, confirming that representative form is not used as the headword.

| # | word | lemma | lexicalForm | representativeForm | displayed headword |
|---:|---|---|---|---|---|
| 1 | αὐτός | αὐτός | — | αὐτοῦ | αὐτός |
| 2 | εἰμί | εἰμί | — | ἐστί(ν) | εἰμί |
| 3 | θεός | θεός | — | θεοῦ | θεός |
| 4 | λέγω | λέγω | — | εἶπε(ν) | λέγω |
| 5 | Χριστός | Χριστός | — | Χριστοῦ | Χριστός |
| 6 | κύριος | κύριος | — | κυρίου | κύριος |
| 7 | πᾶς | πᾶς | — | πάντες | πᾶς |
| 8 | γῆ | γῆ | — | γῆς | γῆ |
| 9 | λόγος | λόγος | — | λόγον | λόγος |
| 10 | ἄνθρωπος | ἄνθρωπος | — | ἀνθρώπου | ἄνθρωπος |

## Determination

### Is grouping broken?

No. Grouping is functioning as intended. Lemma mode groups by language and lemma, creates a lemma study entry, preserves all original forms in `originalEntries`, stores all surface forms in `forms`, and preserves a separate `representativeForm` for reference.

### Is display broken?

No. Display is functioning as intended. The headword fallback chain is `lexicalForm → lemma → word`, and representative form is not used as the primary display value. The examples above show current displayed headwords falling back to lemma even when representative form differs.

### Is source data broken?

Partially/incompletely populated for the desired lexical-form display. There is no evidence that source grouping fields are structurally broken, but current vocabulary source data has no populated `lexicalForm` values in `vocab_all.json`. If the intended user-facing lemma-mode display requires richer citation forms, the missing lexical-form data is the limiting factor. Per task instructions, no vocabulary data was modified.

## Tests and checks run

- `npm test`
- `node - <<'NODE' ... inspect vocab_all.json lexicalForm counts and grouped example rows ... NODE`
