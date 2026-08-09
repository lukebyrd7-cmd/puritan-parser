# Data source ledger

This ledger distinguishes imported fields, verification-only use, and Puritan Parser-authored lexical data. It records repository behavior rather than making broader legal conclusions.

| Source | Version / edition | License recorded by project | Imported or consulted fields | Derived files and transformations |
| --- | --- | --- | --- | --- |
| Puritan Parser Greek lexical glosses | Checked-in `data/glosses/greek-glosses.json` | CC0-1.0 | Contributor-authored primary and alternate lemma glosses plus record-level attribution | Normalized only at presentation/index time; source strings remain unchanged |
| Puritan Parser Hebrew lexical glosses; Strong’s Hebrew Dictionary consulted | Strong’s Hebrew Dictionary (1890); checked-in `data/glosses/hebrew-glosses.json` | Contributor records are CC0-1.0 | Contributor-authored primary and alternate lemma glosses; Strong’s is consultation support, not an imported field-level lexicon | Exact lemma-key merge during vocabulary generation or in-memory audit; `hb-28058` remains explicitly unavailable |
| MorphGNT SBLGNT Edition | Repository `morphgnt/sblgnt`, downloaded by `scripts/download-source-data.js` | Morphology/lemmatization CC BY-SA; SBLGNT text subject to its EULA, as recorded in About & Sources | Surface text, normalized form, lemma, part of speech, morphology | Greek Reader chapters, search index, and vocabulary form rows |
| Open Scriptures Hebrew Bible / MorphHB WLC | Repository `openscriptures/morphhb`, downloaded by `scripts/download-source-data.js` | Morphology CC BY 4.0; WLC text unrestricted/public domain, as recorded in About & Sources | Pointed text, lemma expression, morphology, qere/ketiv identity | Hebrew Reader chapters, search index, and vocabulary form rows |
| MACULA Hebrew Linguistic Datasets | `47db250bd55d0d8577f2a94fba114ef16c35b23c` | CC BY 4.0 | `xml:id`, `ref`, `class`, `text`, `after`, `english`, `morph`, `lemma` | Chapter-scoped Hebrew interlinear records; whitespace collapse and ordered same-reference morpheme joining |
| Cherith Glosses for the Hebrew Old Testament, Andi Wu / Cherith Analytics | Included in the pinned MACULA TSV retrieved 2026-07-24 | CC BY 4.0 | Occurrence-level `english` word or morpheme gloss | Contextual Reader interlinear only; never promoted to a lexical lemma gloss |
| STEPBible Data | `b86d26cdb1f51729e73b5b4eb7f7ccadc5dfba39` | No distributed fields; repository used only for verification | None | Schema, qere policy, and license verification only |
| Open English Bible | Checked-in translation manifest | CC0-1.0 | Verse text and canonical references | Chapter-scoped translation JSON |
| World English Bible | Checked-in translation manifest | Public domain | Verse text and canonical references | Chapter-scoped translation JSON |
| Machen, *New Testament Greek for Beginners* | 1923 first edition, printed-page references in `docs/reference-sources.md` | Public-domain edition consulted | Paradigm forms and organization described in the Reference ledger | Reference data only; no lexical gloss import |
| Gesenius-Kautzsch-Cowley, *Hebrew Grammar* | 1910 second English edition, exact pages in `docs/reference-sources.md` | Public-domain edition consulted | Paradigm forms and grammatical organization | Reference data only; no lexical gloss import |
| Pratico and Van Pelt; Merkle and coauthors | Editions identified in `docs/reference-sources.md` | Consultation only; no copied dataset | Classroom terminology and organizational guidance | No imported fields |
| Van Pelt, Miles V., and Gary D. Pratico, *The Vocabulary Guide to Biblical Hebrew and Aramaic* | Second Edition (Zondervan, 2019) | Private verification-only consultation; no redistribution claim | Lexical identity, frequency, gloss quality, homonym distinctions, and sense prioritization were audited; no definitions imported | No source transcription or derivative definition dataset is distributed; source-backed corrections use the separately approved PP sources recorded above |

## Corrections and unavailable records

Source-backed semantic corrections belong in `data/glosses/corrections.json`. Each correction identifies a stable vocabulary ID, expected source value, corrected senses, reason, supporting publishable reference, verification trigger, and manifest version. VGBH may trigger review, but it is never the sole support for distributed wording.

`data/glosses/unavailable-glosses.json` is a separate, reviewable list of records that cannot responsibly receive a standard gloss. These records remain excluded from flashcard eligibility and visible in audit output.

## Update procedure

1. Pin and document any upstream revision before import.
2. Confirm the source-supplied license and attribution in the relevant manifest.
3. Run the source-specific generator in a bounded scope and review its diff.
4. Run `npm run gloss:audit`, `npm run reader:audit`, and `npm test`.
5. Verify that biblical corpus files and their aggregate hash remain unchanged unless a separately authorized corpus update is being reviewed.
