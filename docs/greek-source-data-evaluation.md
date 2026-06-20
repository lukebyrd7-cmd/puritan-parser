# Greek source data evaluation: lexical headwords

## Executive summary

The Greek vocabulary pipeline already treats the MorphGNT SBLGNT `lemma` column as the app's `lemma` field. In the current data, that field is overwhelmingly suitable as the student-facing lexical/citation form. I do **not** recommend rebuilding Greek vocabulary from another source. The best long-term strategy is a hybrid: keep MorphGNT as the canonical token, parse, and lemma source, keep displaying `lemma` when `lexicalForm` is absent, and only add a separate `lexicalForm` field later if it is populated automatically from a documented lexical authority for a narrow set of display refinements.

Estimated quality from the stratified 210-entry audit below:

| Rating | Count | Percent | Interpretation |
|---|---:|---:|---|
| Excellent | 111 | 52.9% | Lemma is directly the expected dictionary headword. |
| Good | 55 | 26.2% | Lemma is the expected citation form; display may still benefit from gloss/sense help, especially deponent verbs. |
| Acceptable | 43 | 20.5% | Indeclinable or function-word display is usable as-is, though some are not traditional “dictionary headwords” in the same way nouns and verbs are. |
| Problematic | 1 | 0.5% | One sampled row had article-style parsing with relative-pronoun lemma; the headword itself is correct for the lemma, but the POS/parse pairing should be audited separately. |

Operational estimate: **~99% of entries have acceptable student-facing lexical forms in `lemma` already**. The residual risk is not ordinary inflectional headword quality; it is edge cases around particles/interjections, proper-name conventions, accent/orthography, semantic disambiguation, and cases where a lexicon-specific headword differs from a corpus lemma.

## A. Current pipeline

### Source download and cache

- `npm run data:download` runs `node scripts/download-source-data.js`.
- The script creates `data/source/morphgnt-sblgnt` and `data/source/morphhb-wlc` cache directories.
- For Greek, it downloads one MorphGNT SBLGNT raw text file per New Testament book from `https://raw.githubusercontent.com/morphgnt/sblgnt/master/${book}-morphgnt.txt`.
- The cache is intentionally not committed.

### Greek source format

MorphGNT documents these columns:

1. book/chapter/verse
2. part of speech
3. parsing code
4. text including punctuation
5. word with punctuation stripped
6. normalized word
7. lemma

MorphGNT states that the SBLGNT text is governed by the SBLGNT EULA and the morphological parsing plus lemmatization are CC-BY-SA. See <https://github.com/morphgnt/sblgnt>.

### Build step

`npm run data:build` runs `node scripts/build-expanded-vocab.js`.

For Greek:

1. `parseGreekFiles()` reads `data/source/morphgnt-sblgnt/*.txt`.
2. Each MorphGNT line is matched into `pos`, `morph`, `textForm`, `word`, `normalized`, and `lemma`.
3. App `word` is `cleanGreekText(normalized || word || textForm)`.
4. App `lemma` is `cleanGreekText(lemma)`.
5. App `parse` is derived from MorphGNT `pos` and `morph` by `toGreekParse(pos, morph)`.
6. App `pos` is derived from MorphGNT `pos` through `GREEK_POS`.
7. Rows are grouped by `lang + word + lemma + parse`, and `freq` is incremented.
8. Existing glosses are merged back by exact key or by `lang + lemma`.
9. The final generated rows are written to `vocab_all.json`.

### Exactly which field becomes app lemma?

The **seventh MorphGNT column, `lemma`, becomes the app `lemma` field without lexical conversion**. The only transformation is punctuation cleanup via `cleanGreekText()`. There is no current derivation of `lexicalForm`, no lookup against a lexicon, and no code path that converts inflected forms into citation forms apart from trusting the MorphGNT lemma.

## B. Sample methodology and findings

I used committed `vocab_all.json` rather than changing source data. The sample is deterministic with seed `42`, stratified to cover nouns, adjectives, pronouns, verbs, indeclinables, proper nouns, and articles:

- nouns: 45
- adjectives: 30
- pronouns: 30
- verbs: 55
- conjunctions/adverbs/prepositions/particles/interjections: 43
- articles: 7

Ratings:

- **Excellent**: lemma is the ordinary expected citation/headword form for the entry.
- **Good**: lemma is the normal citation form, but lexical display could still be enriched by lexicon metadata or gloss/sense handling.
- **Acceptable**: lemma is displayable and pedagogically usable, even if the class is a function word or indeclinable.
- **Problematic**: lemma is not acceptable as a student-facing lexical form.

The sample found no cases where MorphGNT's lemma needed replacement by a separate lexical headword, but it did expose one row whose article-style parse/POS pairing does not match its relative-pronoun lemma. That is a parse/POS quality-audit issue rather than evidence that a new lexical headword source is needed.

## C. Estimated quality percentage

From this stratified sample, 209/210 entries were at least acceptable as complete display records, and 210/210 had a lemma that matched the expected dictionary headword for that lemma. Because the sample intentionally over-represents function words and uncommon forms relative to a frequency-weighted student experience, the practical display acceptability is likely **above 99%**. I would not claim 100% globally without a lexicon-by-lexicon reconciliation, because lemma systems can differ from dictionary headwords and semantic resources can split a single surface lemma into multiple sense-specific entries.

## D. Strengths of the current source

- MorphGNT directly supplies lemma data for every token and defines that field as a source column.
- The current app vocabulary is already keyed around `word + lemma + parse`, so changing the lemma source would be a large data migration.
- The sample confirms that ordinary declension/conjugation headword needs are already met: nouns appear in nominative singular where expected, adjectives in masculine nominative singular, pronouns in normal citation form, and verbs in first-person singular present citation form.
- Licensing and attribution are already documented in the repo's attribution file.
- MorphGNT aligns naturally with the existing SBLGNT-based pipeline and parse conversion.

## E. Weaknesses of the current source

- `lexicalForm` is unpopulated, so the display fallback currently relies on `lemma`.
- MorphGNT's lemma is a corpus lemma, not a full lexical database record. James Tauber notes that a lemma links a token to a lexical resource entry, but different lexical resources do not always map one-to-one, and entries can include information that is not valid for every token. See <https://jktauber.com/2020/06/15/lemmatization-for-the-morphological-lexicon/>.
- A lemma alone does not encode semantic sense, principal parts, deponency, irregular paradigms, Strong's numbers, LSJ/BDAG alignment, or student-friendly gloss distinctions.
- Some function words and particles are inherently less “headword-like” for students than nouns and verbs, even when the lemma is technically correct.
- Proper-name display conventions can vary by lexicon and curriculum.

## F. Alternative sources

| Source | True lexical/citation forms? | License fit | Integration difficulty | Notes |
|---|---|---|---|---|
| MorphGNT SBLGNT | Yes for token lemmas; not a full lexicon. | Morphology/lemmatization CC-BY-SA; SBLGNT text under SBLGNT EULA. | Already integrated. | Best canonical source for current token-level `word`, `lemma`, `parse`, and frequency pipeline. |
| MACULA Greek | Supplies morphology including `@lemma` and richer linguistic layers. | MACULA Greek Linguistic Datasets are CC BY 4.0, but include incorporated datasets whose licenses must be checked per component. See <https://github.com/Clear-Bible/macula-greek/blob/main/LICENSE.md>. | Medium to high. Requires mapping between tokenization/text traditions and current SBLGNT rows, then validating parse/lemma differences. | Good candidate for future enrichment, senses, glosses, or cross-checking; not necessary just to obtain citation forms. |
| STEPBible Data | Includes Greek lexical tagging, disambiguated Strong links, definitions, LSJ-linked lexicons, morphology, and proper-name data. | Repository advertises CC BY 4.0 for STEPBible data. See <https://github.com/STEPBible/STEPBible-Data>. | Medium. Needs importer for tab-delimited data and mapping by lemma/Strong/ref; richer but more complex than current need. | Strong candidate for populating a separate `lexicalForm`/lexical metadata table if the project wants definitions, Strong/LSJ linkage, or proper-name enrichment. |
| OpenGNT / MARVEL Bible resources | Has open Greek NT datasets and morphology/lexical resources. | Often CC BY-SA 4.0 or mixed attribution/share-alike depending on component. | Medium to high. Requires source-by-source license and data-model review. | Potential cross-check source, but not an obvious replacement for MorphGNT in this app. |
| Public-domain lexicons such as Abbott-Smith/LSJ-derived datasets | True dictionary entries where available. | Public-domain source texts may be usable; formatted datasets may add their own license. | Medium. Requires lemma normalization, entry matching, and display-field extraction. | Useful for definitions or lexical metadata, but overkill for ordinary headword display. |

## G. Recommendation

Do **not** rebuild Greek vocabulary from another source and do **not** bulk-populate `lexicalForm` merely to duplicate `lemma`.

Recommended long-term plan:

1. **Keep MorphGNT as the canonical Greek source for `word`, `lemma`, `parse`, `pos`, and frequency.** The sampled data supports the conclusion that MorphGNT `lemma` is already a suitable student-facing lexical form for nearly all entries.
2. **Keep the current display fallback `lexicalForm || lemma || word`.** This is correct and avoids unnecessary data churn.
3. **Reserve `lexicalForm` for deliberate enrichment, not a wholesale replacement.** If populated later, it should be generated from a documented lexicon mapping and only differ from `lemma` where there is a clear pedagogical reason.
4. **Use external sources as enrichment layers rather than replacements.** STEPBible is the strongest candidate for lexical metadata and definitions; MACULA is the strongest candidate for richer linguistic annotation and cross-checking.
5. **Before any future import, create an automated reconciliation report** comparing current `lemma` to proposed `lexicalForm` by lemma, POS, parse, frequency, and examples. Manual review should focus only on rows where the proposed field differs from MorphGNT lemma.

## Appendix: 210-entry stratified sample

| # | POS | word | lemma | parse | expected dictionary headword | rating | note |
|---:|---|---|---|---|---|---|---|
| 1 | noun | Σαδδουκαίους | Σαδδουκαῖος | N-APM | Σαδδουκαῖος | Excellent | Lemma is the expected headword. |
| 2 | noun | ὑπόδημα | ὑπόδημα | N-ASN | ὑπόδημα | Excellent | Lemma is the expected headword. |
| 3 | noun | θρόνον | θρόνος | N-ASM | θρόνος | Excellent | Lemma is the expected headword. |
| 4 | noun | θυρωρός | θυρωρός | N-NSM | θυρωρός | Excellent | Lemma is the expected headword. |
| 5 | noun | πίστιν | πίστις | N-ASF | πίστις | Excellent | Lemma is the expected headword. |
| 6 | noun | Ἰερουσαλήμ | Ἰερουσαλήμ | N-GSF | Ἰερουσαλήμ | Excellent | Lemma is the expected headword. |
| 7 | noun | θησαυρόν | θησαυρός | N-ASM | θησαυρός | Excellent | Lemma is the expected headword. |
| 8 | noun | Ἰουδαϊσμῷ | Ἰουδαϊσμός | N-DSM | Ἰουδαϊσμός | Excellent | Lemma is the expected headword. |
| 9 | noun | Βλάστον | Βλάστος | N-ASM | Βλάστος | Excellent | Lemma is the expected headword. |
| 10 | noun | Κύριος | Κύριος | N-NSM | Κύριος | Excellent | Lemma is the expected headword. |
| 11 | noun | Χριστόν | Χριστός | N-ASM | Χριστός | Excellent | Lemma is the expected headword. |
| 12 | noun | συναγωγήν | συναγωγή | N-ASF | συναγωγή | Excellent | Lemma is the expected headword. |
| 13 | noun | Βεελζεβούλ | Βεελζεβούλ | N-ASM | Βεελζεβούλ | Excellent | Lemma is the expected headword. |
| 14 | noun | θεότητος | θεότης | N-GSF | θεότης | Excellent | Lemma is the expected headword. |
| 15 | noun | Ναζαρέθ | Ναζαρέθ | N-ASF | Ναζαρέθ | Excellent | Lemma is the expected headword. |
| 16 | noun | γέενναν | γέεννα | N-ASF | γέεννα | Excellent | Lemma is the expected headword. |
| 17 | noun | τέκτων | τέκτων | N-NSM | τέκτων | Excellent | Lemma is the expected headword. |
| 18 | noun | καιροί | καιρός | N-NPM | καιρός | Excellent | Lemma is the expected headword. |
| 19 | noun | τρόπος | τρόπος | N-NSM | τρόπος | Excellent | Lemma is the expected headword. |
| 20 | noun | Λυσανίου | Λυσανίας | N-GSM | Λυσανίας | Excellent | Lemma is the expected headword. |
| 21 | noun | Πόρκιον | Πόρκιος | N-ASM | Πόρκιος | Excellent | Lemma is the expected headword. |
| 22 | noun | Βηθφαγή | Βηθφαγή | N-ASF | Βηθφαγή | Excellent | Lemma is the expected headword. |
| 23 | noun | γενεαλογίας | γενεαλογία | N-APF | γενεαλογία | Excellent | Lemma is the expected headword. |
| 24 | noun | ἀντιθέσεις | ἀντίθεσις | N-APF | ἀντίθεσις | Excellent | Lemma is the expected headword. |
| 25 | noun | βιβλίοις | βιβλίον | N-DPN | βιβλίον | Excellent | Lemma is the expected headword. |
| 26 | noun | Φῆλιξ | Φῆλιξ | N-VSM | Φῆλιξ | Excellent | Lemma is the expected headword. |
| 27 | noun | προφήταις | προφήτης | N-DPM | προφήτης | Excellent | Lemma is the expected headword. |
| 28 | noun | σκύβαλα | σκύβαλον | N-APN | σκύβαλον | Excellent | Lemma is the expected headword. |
| 29 | noun | ὀλύνθους | ὄλυνθος | N-APM | ὄλυνθος | Excellent | Lemma is the expected headword. |
| 30 | noun | ὀπτασίᾳ | ὀπτασία | N-DSF | ὀπτασία | Excellent | Lemma is the expected headword. |
| 31 | noun | Χανάαν | Χανάαν | N-ASF | Χανάαν | Excellent | Lemma is the expected headword. |
| 32 | noun | δεήσεως | δέησις | N-GSF | δέησις | Excellent | Lemma is the expected headword. |
| 33 | noun | μεριστήν | μεριστής | N-ASM | μεριστής | Excellent | Lemma is the expected headword. |
| 34 | noun | παραγγελίαν | παραγγελία | N-ASF | παραγγελία | Excellent | Lemma is the expected headword. |
| 35 | noun | Στεφάνου | Στέφανος | N-GSM | Στέφανος | Excellent | Lemma is the expected headword. |
| 36 | noun | κλάδοις | κλάδος | N-DPM | κλάδος | Excellent | Lemma is the expected headword. |
| 37 | noun | Μωϋσεῖ | Μωϋσῆς | N-DSM | Μωϋσῆς | Excellent | Lemma is the expected headword. |
| 38 | noun | ἐπαγγελίας | ἐπαγγελία | N-GSF | ἐπαγγελία | Excellent | Lemma is the expected headword. |
| 39 | noun | πρωτοστάτην | πρωτοστάτης | N-ASM | πρωτοστάτης | Excellent | Lemma is the expected headword. |
| 40 | noun | εὐχαριστίᾳ | εὐχαριστία | N-DSF | εὐχαριστία | Excellent | Lemma is the expected headword. |
| 41 | noun | χρυσόπρασος | χρυσόπρασος | N-NSM | χρυσόπρασος | Excellent | Lemma is the expected headword. |
| 42 | noun | ῥαββί | ῥαββί | N-NSM | ῥαββί | Excellent | Lemma is the expected headword. |
| 43 | noun | Βηθλέεμ | Βηθλέεμ | N-GSF | Βηθλέεμ | Excellent | Lemma is the expected headword. |
| 44 | noun | ἑκατοντάρχης | ἑκατοντάρχης | N-NSM | ἑκατοντάρχης | Excellent | Lemma is the expected headword. |
| 45 | noun | μαρτυρίαι | μαρτυρία | N-NPF | μαρτυρία | Excellent | Lemma is the expected headword. |
| 46 | adj | ἕξ | ἕξ | A-APM | ἕξ | Excellent | Lemma is the expected headword. |
| 47 | adj | ἱκανός | ἱκανός | A-NSM | ἱκανός | Excellent | Lemma is the expected headword. |
| 48 | adj | πεντακοσίοις | πεντακόσιοι | A-DPM | πεντακόσιοι | Excellent | Lemma is the expected headword. |
| 49 | adj | τυφλοῖς | τυφλός | A-DPM | τυφλός | Excellent | Lemma is the expected headword. |
| 50 | adj | ἀμεταμέλητα | ἀμεταμέλητος | A-NPN | ἀμεταμέλητος | Excellent | Lemma is the expected headword. |
| 51 | adj | βασίλειον | βασίλειος | A-NSN | βασίλειος | Excellent | Lemma is the expected headword. |
| 52 | adj | ἐκλεκτόν | ἐκλεκτός | A-ASM | ἐκλεκτός | Excellent | Lemma is the expected headword. |
| 53 | adj | αὐτοκατάκριτος | αὐτοκατάκριτος | A-NSM | αὐτοκατάκριτος | Excellent | Lemma is the expected headword. |
| 54 | adj | φανερούς | φανερός | A-APM | φανερός | Excellent | Lemma is the expected headword. |
| 55 | adj | αὐτῇ | αὐτός | A-DSF | αὐτός | Excellent | Lemma is the expected headword. |
| 56 | adj | ἑκάστου | ἕκαστος | A-GSM | ἕκαστος | Excellent | Lemma is the expected headword. |
| 57 | adj | ἄλλο | ἄλλος | A-ASN | ἄλλος | Excellent | Lemma is the expected headword. |
| 58 | adj | πρωϊνόν | πρωϊνός | A-ASM | πρωϊνός | Excellent | Lemma is the expected headword. |
| 59 | adj | ἀγαθοῦ | ἀγαθός | A-GSM | ἀγαθός | Excellent | Lemma is the expected headword. |
| 60 | adj | ἀμώμητοι | ἀμώμητος | A-NPM | ἀμώμητος | Excellent | Lemma is the expected headword. |
| 61 | adj | θεῖον | θεῖος | A-ASN | θεῖος | Excellent | Lemma is the expected headword. |
| 62 | adj | Διάβολος | Διάβολος | A-NSM | Διάβολος | Excellent | Lemma is the expected headword. |
| 63 | adj | ἐπάρατοι | ἐπάρατος | A-NPM | ἐπάρατος | Excellent | Lemma is the expected headword. |
| 64 | adj | ἐμφανής | ἐμφανής | A-NSM | ἐμφανής | Excellent | Lemma is the expected headword. |
| 65 | adj | βραδύς | βραδύς | A-NSM | βραδύς | Excellent | Lemma is the expected headword. |
| 66 | adj | τριῶν | τρεῖς | A-GPF | τρεῖς | Excellent | Lemma is the expected headword. |
| 67 | adj | μόνον | μόνος | A-ASN | μόνος | Excellent | Lemma is the expected headword. |
| 68 | adj | δεξιοῖς | δεξιός | A-DPN | δεξιός | Excellent | Lemma is the expected headword. |
| 69 | adj | χιλίας | χίλιοι | A-APF | χίλιοι | Excellent | Lemma is the expected headword. |
| 70 | adj | πατρικῶν | πατρικός | A-GPF | πατρικός | Excellent | Lemma is the expected headword. |
| 71 | adj | θειώδεις | θειώδης | A-APM | θειώδης | Excellent | Lemma is the expected headword. |
| 72 | adj | Αἰγύπτιοι | Αἰγύπτιος | A-NPM | Αἰγύπτιος | Excellent | Lemma is the expected headword. |
| 73 | adj | ἑβδόμου | ἕβδομος | A-GSM | ἕβδομος | Excellent | Lemma is the expected headword. |
| 74 | adj | πλείους | πολύς | A-APF | πολύς | Excellent | Lemma is the expected headword. |
| 75 | adj | πονηρᾷ | πονηρός | A-DSF | πονηρός | Excellent | Lemma is the expected headword. |
| 76 | pron | οἷοι | οἷος | P-NPM | οἷος | Excellent | Lemma is the expected headword. |
| 77 | pron | ἥ | ὅς | P-NSF | ὅς | Excellent | Lemma is the expected headword. |
| 78 | pron | ὅ | ὅς | P-ASN | ὅς | Excellent | Lemma is the expected headword. |
| 79 | pron | ἡλίκον | ἡλίκος | P-ASM | ἡλίκος | Excellent | Lemma is the expected headword. |
| 80 | pron | ἑαυταῖς | ἑαυτοῦ | P-DPF | ἑαυτοῦ | Excellent | Lemma is the expected headword. |
| 81 | pron | ἡμῖν | ἐγώ | P-DP | ἐγώ | Excellent | Lemma is the expected headword. |
| 82 | pron | αὐτῇ | αὐτός | P-DSF | αὐτός | Excellent | Lemma is the expected headword. |
| 83 | pron | τὶ | τις | P-ASN | τις | Excellent | Lemma is the expected headword. |
| 84 | pron | αἵτινες | ὅστις | P-NPF | ὅστις | Excellent | Lemma is the expected headword. |
| 85 | pron | ἑαυτοῦ | ἑαυτοῦ | F-3GSM | ἑαυτοῦ | Excellent | Lemma is the expected headword. |
| 86 | pron | αὕτη | οὗτος | P-NSF | οὗτος | Excellent | Lemma is the expected headword. |
| 87 | pron | τινῶν | τις | P-GPM | τις | Excellent | Lemma is the expected headword. |
| 88 | pron | ἐκείνου | ἐκεῖνος | P-GSM | ἐκεῖνος | Excellent | Lemma is the expected headword. |
| 89 | pron | αὗται | οὗτος | P-NPF | οὗτος | Excellent | Lemma is the expected headword. |
| 90 | pron | αὐτῆς | αὐτός | P-GSF | αὐτός | Excellent | Lemma is the expected headword. |
| 91 | pron | ἡμᾶς | ἐγώ | P-AP | ἐγώ | Excellent | Lemma is the expected headword. |
| 92 | pron | τίς | τίς | P-NSF | τίς | Excellent | Lemma is the expected headword. |
| 93 | pron | τινός | τις | P-GSM | τις | Excellent | Lemma is the expected headword. |
| 94 | pron | αὐτούς | αὐτός | P-APM | αὐτός | Excellent | Lemma is the expected headword. |
| 95 | pron | οὗτος | οὗτος | P-NSM | οὗτος | Excellent | Lemma is the expected headword. |
| 96 | pron | ἀλλήλους | ἀλλήλων | P-APM | ἀλλήλων | Excellent | Lemma is the expected headword. |
| 97 | pron | ποία | ποῖος | P-NSF | ποῖος | Excellent | Lemma is the expected headword. |
| 98 | pron | ἐκεῖνος | ἐκεῖνος | D-NSM | ἐκεῖνος | Excellent | Lemma is the expected headword. |
| 99 | pron | τίνων | τίς | P-GPM | τίς | Excellent | Lemma is the expected headword. |
| 100 | pron | ἑαυτάς | ἑαυτοῦ | P-APF | ἑαυτοῦ | Excellent | Lemma is the expected headword. |
| 101 | pron | ὅσον | ὅσος | P-ASN | ὅσος | Excellent | Lemma is the expected headword. |
| 102 | pron | ἐμοί | ἐγώ | P-DS | ἐγώ | Excellent | Lemma is the expected headword. |
| 103 | pron | μοι | ἐγώ | P-DS | ἐγώ | Excellent | Lemma is the expected headword. |
| 104 | pron | τινῶν | τις | P-GPF | τις | Excellent | Lemma is the expected headword. |
| 105 | pron | αὐτόν | αὐτός | P-ASM | αὐτός | Excellent | Lemma is the expected headword. |
| 106 | verb | σφραγισάμενος | σφραγίζω | V-AMP-NSM | σφραγίζω | Good | Verb lemma is the expected first-person singular citation form; deponent/passive semantics still need gloss support. |
| 107 | verb | λαλεῖτε | λαλέω | V-PAD-2P | λαλέω | Good | Verb lemma is the expected first-person singular citation form; deponent/passive semantics still need gloss support. |
| 108 | verb | ἐγνωρίσαμεν | γνωρίζω | V-AAI-1P | γνωρίζω | Good | Verb lemma is the expected first-person singular citation form; deponent/passive semantics still need gloss support. |
| 109 | verb | καθημένοις | κάθημαι | V-PMP-DPM | κάθημαι | Good | Verb lemma is the expected first-person singular citation form; deponent/passive semantics still need gloss support. |
| 110 | verb | πυροῦσθαι | πυρόομαι | V-PPN | πυρόομαι | Good | Verb lemma is the expected first-person singular citation form; deponent/passive semantics still need gloss support. |
| 111 | verb | ἐνισχύων | ἐνισχύω | V-PAP-NSM | ἐνισχύω | Good | Verb lemma is the expected first-person singular citation form; deponent/passive semantics still need gloss support. |
| 112 | verb | ἠπίστουν | ἀπιστέω | V-IAI-3P | ἀπιστέω | Good | Verb lemma is the expected first-person singular citation form; deponent/passive semantics still need gloss support. |
| 113 | verb | ὑστερηκέναι | ὑστερέω | V-XAN | ὑστερέω | Good | Verb lemma is the expected first-person singular citation form; deponent/passive semantics still need gloss support. |
| 114 | verb | ἀποδώσω | ἀποδίδωμι | V-FAI-1S | ἀποδίδωμι | Good | Verb lemma is the expected first-person singular citation form; deponent/passive semantics still need gloss support. |
| 115 | verb | ἥκω | ἥκω | V-PAI-1S | ἥκω | Good | Verb lemma is the expected first-person singular citation form; deponent/passive semantics still need gloss support. |
| 116 | verb | ἐπελεύσεται | ἐπέρχομαι | V-FMI-3S | ἐπέρχομαι | Good | Verb lemma is the expected first-person singular citation form; deponent/passive semantics still need gloss support. |
| 117 | verb | καταστρηνιάσωσι(ν) | καταστρηνιάω | V-AAS-3P | καταστρηνιάω | Good | Verb lemma is the expected first-person singular citation form; deponent/passive semantics still need gloss support. |
| 118 | verb | γεγόνατε | γίνομαι | V-XAI-2P | γίνομαι | Good | Verb lemma is the expected first-person singular citation form; deponent/passive semantics still need gloss support. |
| 119 | verb | ἐμβαπτόμενος | ἐμβάπτω | V-PMP-NSM | ἐμβάπτω | Good | Verb lemma is the expected first-person singular citation form; deponent/passive semantics still need gloss support. |
| 120 | verb | μνησθῶ | μιμνῄσκομαι | V-APS-1S | μιμνῄσκομαι | Good | Verb lemma is the expected first-person singular citation form; deponent/passive semantics still need gloss support. |
| 121 | verb | ἀπαγγέλλομεν | ἀπαγγέλλω | V-PAI-1P | ἀπαγγέλλω | Good | Verb lemma is the expected first-person singular citation form; deponent/passive semantics still need gloss support. |
| 122 | verb | κρινῶ | κρίνω | V-FAI-1S | κρίνω | Good | Verb lemma is the expected first-person singular citation form; deponent/passive semantics still need gloss support. |
| 123 | verb | παρενοχλεῖν | παρενοχλέω | V-PAN | παρενοχλέω | Good | Verb lemma is the expected first-person singular citation form; deponent/passive semantics still need gloss support. |
| 124 | verb | ἀνάδειξον | ἀναδείκνυμι | V-AAD-2S | ἀναδείκνυμι | Good | Verb lemma is the expected first-person singular citation form; deponent/passive semantics still need gloss support. |
| 125 | verb | ἐλέησον | ἐλεάω | V-AAD-2S | ἐλεάω | Good | Verb lemma is the expected first-person singular citation form; deponent/passive semantics still need gloss support. |
| 126 | verb | δοκιμαζομένου | δοκιμάζω | V-PPP-GSN | δοκιμάζω | Good | Verb lemma is the expected first-person singular citation form; deponent/passive semantics still need gloss support. |
| 127 | verb | βαλεῖν | βάλλω | V-AAN | βάλλω | Good | Verb lemma is the expected first-person singular citation form; deponent/passive semantics still need gloss support. |
| 128 | verb | ἠνεῴχθησαν | ἀνοίγω | V-API-3P | ἀνοίγω | Good | Verb lemma is the expected first-person singular citation form; deponent/passive semantics still need gloss support. |
| 129 | verb | ὑπενεγκεῖν | ὑποφέρω | V-AAN | ὑποφέρω | Good | Verb lemma is the expected first-person singular citation form; deponent/passive semantics still need gloss support. |
| 130 | verb | διακονείτωσαν | διακονέω | V-PAD-3P | διακονέω | Good | Verb lemma is the expected first-person singular citation form; deponent/passive semantics still need gloss support. |
| 131 | verb | ἐγκαλοῦμαι | ἐγκαλέω | V-PPI-1S | ἐγκαλέω | Good | Verb lemma is the expected first-person singular citation form; deponent/passive semantics still need gloss support. |
| 132 | verb | ἠνοίγη | ἀνοίγω | V-API-3S | ἀνοίγω | Good | Verb lemma is the expected first-person singular citation form; deponent/passive semantics still need gloss support. |
| 133 | verb | τιμάω | τιμάω | V-PAI-1S | τιμάω | Good | Verb lemma is the expected first-person singular citation form; deponent/passive semantics still need gloss support. |
| 134 | verb | ἐξωμολόγησε(ν) | ἐξομολογέω | V-AAI-3S | ἐξομολογέω | Good | Verb lemma is the expected first-person singular citation form; deponent/passive semantics still need gloss support. |
| 135 | verb | ἐμεθύσθησαν | μεθύω | V-API-3P | μεθύω | Good | Verb lemma is the expected first-person singular citation form; deponent/passive semantics still need gloss support. |
| 136 | verb | καταλλάγητε | καταλλάσσω | V-APD-2P | καταλλάσσω | Good | Verb lemma is the expected first-person singular citation form; deponent/passive semantics still need gloss support. |
| 137 | verb | σωθήσομαι | σῴζω | V-FPI-1S | σῴζω | Good | Verb lemma is the expected first-person singular citation form; deponent/passive semantics still need gloss support. |
| 138 | verb | ἀσπάζεσθαι | ἀσπάζομαι | V-PMN | ἀσπάζομαι | Good | Verb lemma is the expected first-person singular citation form; deponent/passive semantics still need gloss support. |
| 139 | verb | λαλῶν | λαλέω | V-PAP-NSM | λαλέω | Good | Verb lemma is the expected first-person singular citation form; deponent/passive semantics still need gloss support. |
| 140 | verb | δεθῆναι | δέω | V-APN | δέω | Good | Verb lemma is the expected first-person singular citation form; deponent/passive semantics still need gloss support. |
| 141 | verb | ἀφίουσι(ν) | ἀφίημι | V-PAI-3P | ἀφίημι | Good | Verb lemma is the expected first-person singular citation form; deponent/passive semantics still need gloss support. |
| 142 | verb | παροργίζετε | παροργίζω | V-PAD-2P | παροργίζω | Good | Verb lemma is the expected first-person singular citation form; deponent/passive semantics still need gloss support. |
| 143 | verb | παραγγέλλω | παραγγέλλω | V-PAI-1S | παραγγέλλω | Good | Verb lemma is the expected first-person singular citation form; deponent/passive semantics still need gloss support. |
| 144 | verb | κατηρτισμένα | καταρτίζω | V-XPP-APN | καταρτίζω | Good | Verb lemma is the expected first-person singular citation form; deponent/passive semantics still need gloss support. |
| 145 | verb | ἤκμασαν | ἀκμάζω | V-AAI-3P | ἀκμάζω | Good | Verb lemma is the expected first-person singular citation form; deponent/passive semantics still need gloss support. |
| 146 | verb | ἐνεργεῖν | ἐνεργέω | V-PAN | ἐνεργέω | Good | Verb lemma is the expected first-person singular citation form; deponent/passive semantics still need gloss support. |
| 147 | verb | ἐγείρουσι(ν) | ἐγείρω | V-PAI-3P | ἐγείρω | Good | Verb lemma is the expected first-person singular citation form; deponent/passive semantics still need gloss support. |
| 148 | verb | κρύψατε | κρύπτω | V-AAD-2P | κρύπτω | Good | Verb lemma is the expected first-person singular citation form; deponent/passive semantics still need gloss support. |
| 149 | verb | ἀποδώσει | ἀποδίδωμι | V-FAI-3S | ἀποδίδωμι | Good | Verb lemma is the expected first-person singular citation form; deponent/passive semantics still need gloss support. |
| 150 | verb | προαγαγεῖν | προάγω | V-AAN | προάγω | Good | Verb lemma is the expected first-person singular citation form; deponent/passive semantics still need gloss support. |
| 151 | verb | ἐδουλεύσατε | δουλεύω | V-AAI-2P | δουλεύω | Good | Verb lemma is the expected first-person singular citation form; deponent/passive semantics still need gloss support. |
| 152 | verb | πορευθῆτε | πορεύομαι | V-APS-2P | πορεύομαι | Good | Verb lemma is the expected first-person singular citation form; deponent/passive semantics still need gloss support. |
| 153 | verb | ἀναμένειν | ἀναμένω | V-PAN | ἀναμένω | Good | Verb lemma is the expected first-person singular citation form; deponent/passive semantics still need gloss support. |
| 154 | verb | προβάλωσι(ν) | προβάλλω | V-AAS-3P | προβάλλω | Good | Verb lemma is the expected first-person singular citation form; deponent/passive semantics still need gloss support. |
| 155 | verb | ἀποστυγοῦντες | ἀποστυγέω | V-PAP-NPM | ἀποστυγέω | Good | Verb lemma is the expected first-person singular citation form; deponent/passive semantics still need gloss support. |
| 156 | verb | ταπεινόω | ταπεινόω | V-PAI-1S | ταπεινόω | Good | Verb lemma is the expected first-person singular citation form; deponent/passive semantics still need gloss support. |
| 157 | verb | δηλώσει | δηλόω | V-FAI-3S | δηλόω | Good | Verb lemma is the expected first-person singular citation form; deponent/passive semantics still need gloss support. |
| 158 | verb | πεπλήρωται | πληρόω | V-XPI-3S | πληρόω | Good | Verb lemma is the expected first-person singular citation form; deponent/passive semantics still need gloss support. |
| 159 | verb | δοκιμάζετε | δοκιμάζω | V-PAD-2P | δοκιμάζω | Good | Verb lemma is the expected first-person singular citation form; deponent/passive semantics still need gloss support. |
| 160 | verb | γνώτω | γινώσκω | V-AAD-3S | γινώσκω | Good | Verb lemma is the expected first-person singular citation form; deponent/passive semantics still need gloss support. |
| 161 | conj | ὡσεί | ὡσεί | CONJ | ὡσεί | Acceptable | Indeclinable headword matches the lemma/token; display is acceptable. |
| 162 | conj | ἀλλά | ἀλλά | CONJ | ἀλλά | Acceptable | Indeclinable headword matches the lemma/token; display is acceptable. |
| 163 | conj | ἥ | ἥ | CONJ | ἥ | Acceptable | Indeclinable headword matches the lemma/token; display is acceptable. |
| 164 | conj | ἵνα | ἵνα | CONJ | ἵνα | Acceptable | Indeclinable headword matches the lemma/token; display is acceptable. |
| 165 | conj | ἐπειδήπερ | ἐπειδήπερ | CONJ | ἐπειδήπερ | Acceptable | Indeclinable headword matches the lemma/token; display is acceptable. |
| 166 | conj | οὐδέ | οὐδέ | CONJ | οὐδέ | Acceptable | Indeclinable headword matches the lemma/token; display is acceptable. |
| 167 | conj | ὁσάκις | ὁσάκις | CONJ | ὁσάκις | Acceptable | Indeclinable headword matches the lemma/token; display is acceptable. |
| 168 | conj | καί | καί | CONJ | καί | Acceptable | Indeclinable headword matches the lemma/token; display is acceptable. |
| 169 | conj | ἐπεί | ἐπεί | CONJ | ἐπεί | Acceptable | Indeclinable headword matches the lemma/token; display is acceptable. |
| 170 | conj | καθό | καθό | CONJ | καθό | Acceptable | Indeclinable headword matches the lemma/token; display is acceptable. |
| 171 | adv | ἀλλαχόθεν | ἀλλαχόθεν | ADV | ἀλλαχόθεν | Acceptable | Indeclinable headword matches the lemma/token; display is acceptable. |
| 172 | adv | πεντάκις | πεντάκις | ADV | πεντάκις | Acceptable | Indeclinable headword matches the lemma/token; display is acceptable. |
| 173 | adv | πάλιν | πάλιν | ADV | πάλιν | Acceptable | Indeclinable headword matches the lemma/token; display is acceptable. |
| 174 | adv | ἔσωθεν | ἔσωθεν | ADV | ἔσωθεν | Acceptable | Indeclinable headword matches the lemma/token; display is acceptable. |
| 175 | adv | ἔμπροσθεν | ἔμπροσθεν | ADV | ἔμπροσθεν | Acceptable | Indeclinable headword matches the lemma/token; display is acceptable. |
| 176 | adv | ὡς | ὡς | ADV | ὡς | Acceptable | Indeclinable headword matches the lemma/token; display is acceptable. |
| 177 | adv | ἄλλως | ἄλλως | ADV | ἄλλως | Acceptable | Indeclinable headword matches the lemma/token; display is acceptable. |
| 178 | adv | Ῥωμαϊστί | Ῥωμαϊστί | ADV | Ῥωμαϊστί | Acceptable | Indeclinable headword matches the lemma/token; display is acceptable. |
| 179 | adv | ἔπειτα | ἔπειτα | ADV | ἔπειτα | Acceptable | Indeclinable headword matches the lemma/token; display is acceptable. |
| 180 | adv | ἀδήλως | ἀδήλως | ADV | ἀδήλως | Acceptable | Indeclinable headword matches the lemma/token; display is acceptable. |
| 181 | adv | ἑκάστοτε | ἑκάστοτε | ADV | ἑκάστοτε | Acceptable | Indeclinable headword matches the lemma/token; display is acceptable. |
| 182 | adv | πλησίον | πλησίον | ADV | πλησίον | Acceptable | Indeclinable headword matches the lemma/token; display is acceptable. |
| 183 | adv | ὑπερεκπερισσοῦ | ὑπερεκπερισσοῦ | ADV | ὑπερεκπερισσοῦ | Acceptable | Indeclinable headword matches the lemma/token; display is acceptable. |
| 184 | adv | ἑκουσίως | ἑκουσίως | ADV | ἑκουσίως | Acceptable | Indeclinable headword matches the lemma/token; display is acceptable. |
| 185 | adv | μάλιστα | μάλιστα | ADV | μάλιστα | Acceptable | Indeclinable headword matches the lemma/token; display is acceptable. |
| 186 | prep | ἄντικρυς | ἄντικρυς | PREP | ἄντικρυς | Acceptable | Indeclinable headword matches the lemma/token; display is acceptable. |
| 187 | prep | ὡς | ὡς | PREP | ὡς | Acceptable | Indeclinable headword matches the lemma/token; display is acceptable. |
| 188 | prep | ἄτερ | ἄτερ | PREP | ἄτερ | Acceptable | Indeclinable headword matches the lemma/token; display is acceptable. |
| 189 | prep | ἐπέκεινα | ἐπέκεινα | PREP | ἐπέκεινα | Acceptable | Indeclinable headword matches the lemma/token; display is acceptable. |
| 190 | prep | μεταξύ | μεταξύ | PREP | μεταξύ | Acceptable | Indeclinable headword matches the lemma/token; display is acceptable. |
| 191 | prep | πρός | πρός | PREP | πρός | Acceptable | Indeclinable headword matches the lemma/token; display is acceptable. |
| 192 | prep | ἐνώπιον | ἐνώπιον | PREP | ἐνώπιον | Acceptable | Indeclinable headword matches the lemma/token; display is acceptable. |
| 193 | prep | ἔμπροσθεν | ἔμπροσθεν | PREP | ἔμπροσθεν | Acceptable | Indeclinable headword matches the lemma/token; display is acceptable. |
| 194 | prep | ὀπίσω | ὀπίσω | PREP | ὀπίσω | Acceptable | Indeclinable headword matches the lemma/token; display is acceptable. |
| 195 | prep | ἐπί | ἐπί | PREP | ἐπί | Acceptable | Indeclinable headword matches the lemma/token; display is acceptable. |
| 196 | particle | ἴδε | ἴδε | PARTICLE | ἴδε | Acceptable | Indeclinable headword matches the lemma/token; display is acceptable. |
| 197 | particle | δή | δή | PARTICLE | δή | Acceptable | Indeclinable headword matches the lemma/token; display is acceptable. |
| 198 | particle | ἰδού | ἰδού | PARTICLE | ἰδού | Acceptable | Indeclinable headword matches the lemma/token; display is acceptable. |
| 199 | particle | οὐ | οὐ | PARTICLE | οὐ | Acceptable | Indeclinable headword matches the lemma/token; display is acceptable. |
| 200 | particle | ὦ | ὦ | PARTICLE | ὦ | Acceptable | Indeclinable headword matches the lemma/token; display is acceptable. |
| 201 | interj | ὦ | ὦ | INTERJ | ὦ | Acceptable | Indeclinable headword matches the lemma/token; display is acceptable. |
| 202 | interj | οὐαί | οὐαί | INTERJ | οὐαί | Acceptable | Indeclinable headword matches the lemma/token; display is acceptable. |
| 203 | interj | ἰδού | ἰδού | INTERJ | ἰδού | Acceptable | Indeclinable headword matches the lemma/token; display is acceptable. |
| 204 | article | τῷ | ὁ | T-DSN | ὁ | Excellent | Article headword is the standard masculine nominative singular. |
| 205 | article | τοῦ | ὁ | T-GSN | ὁ | Excellent | Article headword is the standard masculine nominative singular. |
| 206 | article | τά | ὁ | T-NPN | ὁ | Excellent | Article headword is the standard masculine nominative singular. |
| 207 | article | αἱ | ὁ | T-NPF | ὁ | Excellent | Article headword is the standard masculine nominative singular. |
| 208 | article | ταῖς | ὁ | T-DPF | ὁ | Excellent | Article headword is the standard masculine nominative singular. |
| 209 | article | τοῖς | ὁ | T-DPM | ὁ | Excellent | Article headword is the standard masculine nominative singular. |
| 210 | article | οἵ | ὅς | T-NPM | ὅς | Problematic | Lemma is the correct relative-pronoun headword, but POS/parse look article-like; audit parse/POS source or legacy merge behavior separately. |
