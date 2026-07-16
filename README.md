# Puritan Parser

A reading-first companion for learning Biblical Greek and Hebrew.

Puritan Parser brings reading, vocabulary learning, grammar reference, and progress tracking together in one offline-first application. It is designed for students and readers who want a practical way to work with the biblical texts while keeping their study data on their own device.

## Philosophy

The purpose of Puritan Parser is to help users read Scripture in its original languages. Vocabulary learning, grammar review, and spaced repetition support that goal; they are tools for developing reading competence, not substitutes for sustained reading.

## Features

### Adaptive Reader

- Greek New Testament
- Hebrew Bible
- Adjustable reading assistance
- Translation display
- Word lookup
- Mobile-friendly interface

### Learn

- Review Queue
- Spaced-repetition (SRS) vocabulary learning
- Reading Readiness
- Vocabulary learning paths
- Study Sets
- Saved words
- Paradigm Recognition
- Grammar practice

### Word Pages

- Glosses
- Morphology
- Frequency
- Usage examples
- Read in Context
- Grammar links
- Learning status
- Study Set integration

### Reference

- Grammar Handbook
- Paradigm Charts
- Morphology Guide
- Searchable reference library

### Progress

- Vocabulary growth
- Reading readiness
- Reading history
- Learning statistics

### Global Search

- Greek lemmas
- Hebrew lemmas
- English glosses
- Greek transliteration search
- References

## Highlights

- Offline-first Progressive Web App
- Local-first data storage
- No account required
- Responsive desktop and mobile design
- Automated test suite

## Running Locally

Clone the repository and install its development dependency:

```sh
git clone https://github.com/lukebyrd7-cmd/puritan-parser.git
cd puritan-parser
npm install
```

Start the local development server:

```sh
npm run dev
```

Open the localhost URL shown in the terminal. The development server uses an application-shell fallback, so routes within the app load directly.

Run the automated tests with:

```sh
npm test
```

### Data Maintenance

To download the source data and rebuild the expanded morphology dataset:

```sh
npm run data:refresh
```

This stores downloaded source files in the ignored `data/source/` directory and regenerates `vocab_all.json`. See [data/ATTRIBUTION.md](data/ATTRIBUTION.md) for data sources and licensing notes.

### Deployment

The included GitHub Actions workflow deploys the static application to GitHub Pages on pushes to `main`. Configure GitHub Pages to use GitHub Actions as its source.

Study progress is stored locally in the browser. Export your data before clearing browser storage or moving to another device.

## Roadmap

- Hebrew interlinear
- Improved learning workflows
- Expanded reference material
- Optional cloud sync

## Status

**Current Version:** v1.0.0

Puritan Parser has reached its first stable public milestone and will continue in active development.

## License

Puritan Parser is available under the [MIT License](LICENSE).
