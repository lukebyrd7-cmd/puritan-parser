# Greek lexical-form audit

## Scope

This is an investigation-only audit of Greek vocabulary headword quality for
lemma study mode. It does not rewrite `vocab_all.json`, change study-mode
architecture, or modify parsing behavior.

The display concern is that the current app data is form-based while lemma study
mode presents a representative lemma row. If a source `lemma` is not also a
student-facing dictionary/citation form, the UI can show forms such as an
accusative noun, an inflected adjective, or a finite verb where a lexical
headword is expected.

## Data inspected

- `vocab_all.json`, the active combined vocabulary payload.
- `scripts/build-expanded-vocab.js`, the generator for expanded Greek/Hebrew
  vocabulary data.
- `data/ATTRIBUTION.md`, which identifies the Greek source as MorphGNT SBLGNT
  and notes that downloaded source files are cached under ignored
  `data/source/`.
- Existing audit context in `docs/greek-verb-lemma-audit.md`.

The checked-out repository does not currently include `data/source/`, so this
audit could not inspect the raw downloaded MorphGNT rows directly. The build
script shows how those rows are consumed when present.

## Source field analysis

The active Greek records in `vocab_all.json` expose these fields, and no others:

| field | Greek entries populated | note |
| --- | ---: | --- |
| `id` | 19,049 | Generated stable row id for the current payload order. |
| `word` | 19,049 | Form displayed/parsed by form-based data. |
| `lemma` | 19,049 | Source lemma copied into app data and currently used for grouping/display. |
| `gloss` | 19,049 | Legacy gloss text. |
| `primaryGloss` | 19,049 | Normalized primary gloss. |
| `alternateGlosses` | 19,049 | Normalized alternate gloss array. |
| `pos` | 19,049 | App part-of-speech label derived from source POS. |
| `parse` | 19,049 | App parse code derived from source morphology. |
| `freq` | 19,049 | Aggregated frequency for the exact `word`/`lemma`/`parse` key. |
| `lang` | 19,049 | `greek`. |
| `source` | 19,049 | `MorphGNT SBLGNT` for generated Greek rows. |

No current Greek record has a separate `headword`, `lexicalForm`,
`dictionaryForm`, `citationForm`, or equivalent display-headword field.

For Greek rows, `scripts/build-expanded-vocab.js` parses MorphGNT columns as
`pos`, `morph`, `textForm`, `word`, `normalized`, and `lemma`. It stores
`normalized || word || textForm` as the app `word`, and stores the cleaned source
`lemma` directly as the app `lemma`. The generator does not currently map any
additional source field into a separate lexical/dictionary display form.

## Audit method

The suspicious-entry scan was intentionally heuristic. It counted Greek entries
where `word == lemma` and the parse code suggests that the visible form is not a
straight nominative singular noun/adjective/pronoun or a simple lexical verb
citation.

Rules used:

- Nouns, adjectives, and pronouns: `word == lemma` plus a parse indicating a
  non-nominative case or plural number.
- Verbs: `word == lemma` plus a finite person/number parse.

These counts are triage counts, not automatic correction counts. Greek has many
legitimate cases where `word == lemma` is expected even with a non-nominative or
finite-looking parse, including indeclinable proper nouns, neuter nominative and
accusative identity, cardinal numbers, reflexive-pronoun citation forms,
defective verbs, impersonal verbs, and first-person singular verb dictionary
forms.

## Summary counts

| category | total Greek entries | `word == lemma` entries | heuristic suspicious entries | unique suspicious lemmas |
| --- | ---: | ---: | ---: | ---: |
| nouns | 5,524 | 1,569 | 505 | 442 |
| adjectives | 2,512 | 470 | 111 | 49 |
| pronouns | 303 | 35 | 7 | 6 |
| verbs | 10,239 | 308 | 308 | 287 |

Overall, the active payload contains 19,049 Greek entries and 2,828 Greek entries
where `word == lemma`.

## Noun findings

The noun scan found 505 entries, covering 442 unique lemmas, where `word == lemma`
and the parse is non-nominative or plural. The most common parse buckets were:

| parse | count |
| --- | ---: |
| `N-ASN` | 244 |
| `N-GSM` | 102 |
| `N-ASM` | 50 |
| `N-ASF` | 21 |
| `N-GSF` | 16 |
| `N-VSM` | 16 |
| `N-VSF` | 15 |
| `N-DSM` | 12 |
| `N-DSF` | 11 |
| `N-APN` | 7 |

Examples:

| id | word | lemma | parse | gloss | note |
| --- | --- | --- | --- | --- | --- |
| `gk-00262` | `ὄνομα` | `ὄνομα` | `N-ASN` | name | Neuter nominative/accusative identity; probably not an error. |
| `gk-00269` | `πνεῦμα` | `πνεῦμα` | `N-ASN` | spirit | Neuter nominative/accusative identity; probably not an error. |
| `gk-00375` | `Ἰσραήλ` | `Ἰσραήλ` | `N-GSM` | Israel | Indeclinable proper noun; probably not an error. |
| `gk-00433` | `Ἰερουσαλήμ` | `Ἰερουσαλήμ` | `N-ASF` | Jerusalem | Indeclinable proper noun; probably not an error. |
| `gk-00457` | `πρόσωπον` | `πρόσωπον` | `N-ASN` | face | Lexical form is also neuter accusative singular. |
| `gk-00512` | `εὐαγγέλιον` | `εὐαγγέλιον` | `N-ASN` | gospel | Lexical form is also neuter accusative singular. |
| `gk-00606` | `πλοῖον` | `πλοῖον` | `N-ASN` | boat | Lexical form is also neuter accusative singular. |
| `gk-00496` | `Ἱεροσόλυμα` | `Ἱεροσόλυμα` | `N-APN` | Jerusalem | Plural place-name citation; likely legitimate but display-sensitive. |

The examples supplied in the issue, such as `λόγον` needing `λόγος`, are the
kind of display problem to guard against. In the current payload, however, that
kind of case should normally have `word != lemma`; the risk audited here is the
subset where the source lemma itself equals an inflected-looking surface form.

## Adjective findings

The adjective scan found 111 entries, covering 49 unique lemmas, where
`word == lemma` and the parse is non-nominative or plural. The most common parse
buckets were:

| parse | count |
| --- | ---: |
| `A-APM` | 19 |
| `A-ASN` | 18 |
| `A-APN` | 17 |
| `A-APF` | 13 |
| `A-GPM` | 9 |
| `A-GPN` | 8 |
| `A-GPF` | 8 |
| `A-DPM` | 5 |
| `A-DPF` | 5 |
| `A-DPN` | 5 |

Examples:

| id | word | lemma | parse | gloss | note |
| --- | --- | --- | --- | --- | --- |
| `gk-00361` | `δύο` | `δύο` | `A-APM` | two | Indeclinable/cardinal behavior; likely legitimate. |
| `gk-00792` | `δώδεκα` | `δώδεκα` | `A-APM` | twelve | Indeclinable/cardinal behavior; likely legitimate. |
| `gk-00797` | `ἑπτά` | `ἑπτά` | `A-APF` | seven | Indeclinable/cardinal behavior; likely legitimate. |
| `gk-00885` | `τρεῖς` | `τρεῖς` | `A-APF` | three | Plural cardinal citation; display-sensitive. |
| `gk-01075` | `πέντε` | `πέντε` | `A-APM` | five | Indeclinable/cardinal behavior; likely legitimate. |
| `gk-01736` | `τριάκοντα` | `τριάκοντα` | `A-APN` | thirty | Indeclinable/cardinal behavior; likely legitimate. |

The supplied example `ἀγαθόν` needing `ἀγαθός` is the target class of issue. As
with nouns, that problem should generally appear as `word != lemma` when source
lemmatization is already lexical; this audit focused on cases where source
`lemma` equals the form.

## Pronoun findings

The pronoun scan found 7 entries, covering 6 unique lemmas, where `word == lemma`
and the parse is non-nominative or plural.

| id | word | lemma | parse | gloss | note |
| --- | --- | --- | --- | --- | --- |
| `gk-00005` | `ἐγώ` | `ἐγώ` | `P-1NS` | I | Nominative singular personal pronoun; counted only because pronoun parse format differs from noun/adjective format. |
| `gk-00018` | `σύ` | `σύ` | `P-2NS` | you (sg.) | Nominative singular personal pronoun; counted only because pronoun parse format differs from noun/adjective format. |
| `gk-00418` | `ἑαυτοῦ` | `ἑαυτοῦ` | `P-GSM` | himself | Genitive-form reflexive citation; display-sensitive but often conventional. |
| `gk-00817` | `ἀλλήλων` | `ἀλλήλων` | `P-GPM` | one another | Genitive plural reciprocal citation; likely conventional. |
| `gk-01121` | `ἐμαυτοῦ` | `ἐμαυτοῦ` | `P-GSM` | myself | Genitive-form reflexive citation; display-sensitive but often conventional. |
| `gk-02315` | `ἑαυτοῦ` | `ἑαυτοῦ` | `P-GSN` | himself | Same reflexive lemma under another parse. |
| `gk-03007` | `σεαυτοῦ` | `σεαυτοῦ` | `P-GSM` | yourself | Genitive-form reflexive citation; display-sensitive but often conventional. |

The pronoun results show why automated rewriting would be risky: some
non-nominative-looking pronoun lemmas are conventional citation forms rather
than data defects.

## Verb findings

The verb scan found 308 entries, covering 287 unique lemmas, where
`word == lemma` and the parse is finite. The most common parse buckets were:

| parse | count |
| --- | ---: |
| `V-PAI-1S` | 216 |
| `V-PMI-1S` | 34 |
| `V-PNI-1S` | 29 |
| `V-PAS-1S` | 10 |
| `V-PAI-3S` | 6 |
| `V-XAI-1S` | 2 |
| `V-PPI-1S` | 2 |
| `V-AAD-2S` | 2 |
| `V-RAI-1S` | 1 |
| `V-AOI-1S` | 1 |

Examples:

| id | word | lemma | parse | gloss | note |
| --- | --- | --- | --- | --- | --- |
| `gk-00035` | `γίνομαι` | `γίνομαι` | `V-PNI-1S` | be | First-person lexical citation for a deponent/middle verb; not an error. |
| `gk-00046` | `ποιέω` | `ποιέω` | `V-PAI-1S` | do | Normal first-person singular dictionary form. |
| `gk-00073` | `οἶδα` | `οἶδα` | `V-RAI-1S` | know | Perfect-form lexical citation; display-sensitive but conventional. |
| `gk-00086` | `ἀποκρίνομαι` | `ἀποκρίνομαι` | `V-AOI-1S` | answer | Aorist/middle-looking parse with lexical citation equal to form. |
| `gk-00096` | `λέγω` | `λέγω` | `V-PAI-1S` | say | Normal first-person singular dictionary form. |
| `gk-00137` | `ἀγαπάω` | `ἀγαπάω` | `V-PAI-1S` | love | Normal first-person singular dictionary form. |

A previous verb-focused audit found a much smaller set of unusual verb lemmas
when applying a stricter lexical-ending heuristic. That stricter path is better
for identifying likely display exceptions than treating every finite
`word == lemma` verb as bad, because the ordinary Greek verb dictionary form is
itself finite first-person singular.

The supplied example `ἔλυσαν` needing `λύω` is still an important requirement:
finite surface forms should display a lexical headword when the source lemma is
available. The current data model has no separate display field for cases where
source `lemma` is not the desired pedagogical display form.

## Recommendation

Add a separate optional field named `lexicalForm` in a future data/display PR,
while preserving current `word` and `lemma` semantics:

```js
displayWord = lexicalForm || lemma || word;
```

Recommended semantics:

- Keep `word` as the surface/form entry used by form-based study and parsing.
- Keep `lemma` as the current source lemma and stable grouping/review key.
- Use `lexicalForm` only as a student-facing dictionary/citation display value
  when it differs from `lemma` or when the distinction needs to be explicit.
- Do not use `lexicalForm` for parser answer checking or existing progress keys.
- Keep `lemma` inspectable in audit/debug contexts so source lemmatization is not
  hidden.

This avoids breaking lemma-mode grouping and stored review data while creating a
safe path to improve display quality.

## Possible automated normalization path, not implemented

A clean automated path appears possible only as a staged, audited workflow:

1. Extend the build/audit tooling to emit candidate `lexicalForm` overrides, not
   to mutate `lemma`.
2. For nouns and adjectives, consider candidates where another row with the same
   source lemma has a nominative singular parse, or where an external
   open-licensed lexicon can supply a citation form.
3. For verbs, use a conservative allowlist/override table rather than broad
   morphology rewriting, because first-person singular forms are normal Greek
   lexical citations and because defective/impersonal/perfect-form lemmas may be
   conventional.
4. For pronouns, require manual review or a small curated list, because many
   reflexive and reciprocal pronoun citation forms are intentionally genitive or
   plural-looking.
5. Add tests that prove grouping remains keyed by `lemma`, while UI display
   prefers `lexicalForm` when present.

No automated normalization should rewrite broad Greek data until candidate
changes are reviewed against source morphology and a lexical authority.
