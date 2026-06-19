# The Puritan Parser Architecture

Phase 1 splits the previous monolithic `app.js` into small browser-loaded modules while preserving the local-first, static-app behavior.

## Current app structure

- `index.html` owns the page markup and loads one modular entry point, `src/main.js`.
- `src/main.js` loads the Phase 1 modules in dependency order.
- `src/app-state.js` contains shared constants and application state only.
- `src/bootstrap.js` initializes preferences, data, events, language, and the default view.
- `src/core/` contains app logic that is not tied to a single screen.
- `src/ui/` contains reusable DOM/UI helpers.
- `src/features/` contains screen- or workflow-specific behavior.
- Static vocabulary data remains in `vocab_all.json` and related generated data files.
- PWA/service-worker behavior remains in `sw.js` and is registered from the event wiring module.

## Module responsibilities

### Core

- `src/core/parser-core.js`: parse decoding, imported payload normalization, and vocabulary-item validation. This is also the module used by Node tests.
- `src/core/storage.js`: localStorage keys, preference persistence, vocabulary progress persistence, and dashboard persistence.
- `src/core/srs.js`: SRS defaults applied to items and scheduling algorithms.
- `src/core/data-loader.js`: JSON fetch/loading, fallback sample loading, and import/export handling.
- `src/core/filters.js`: list filters, part-of-speech filters, parsing-filter option generation, parse summaries, and drillability checks.
- `src/core/sample-data.js`: fallback sample vocabulary used only when static JSON/local data is unavailable.

### UI

- `src/ui/dom.js`: shared DOM query helpers, HTML escaping, date/utility helpers, debounce, and basic toast DOM creation.
- `src/ui/toast.js`: reserved for future toast-specific expansion; current toast helper is still colocated with shared DOM utilities for minimal Phase 1 movement.
- `src/ui/theme.js`: theme selection, accent color computation, and accent picker rendering.
- `src/ui/modal.js`: word-detail modal rendering and close behavior.

### Features

- `src/features/vocab/index.js`: view switching, language switching, due badge, mastery display, and vocabulary-list rendering.
- `src/features/flashcards/index.js`: flashcard queue creation, card rendering, flip/rating behavior, swipe support, and review tracking.
- `src/features/parsing/index.js`: parsing pool creation, lemma picker, parsing sessions, answer checking, parsing explanations, and parsing-progress review updates.
- `src/features/dashboard/index.js`: dashboard metric rendering, sparkline, heatmap, upcoming due cards, and part-of-speech due breakdown.
- `src/features/settings/index.js`: settings UI synchronization.
- `src/features/settings/events.js`: event wiring for navigation, filters, flashcards, parsing, modal controls, settings, import/export, reset/clear, keyboard shortcuts, and service-worker registration.

## Planned feature areas

- Future Grammar work belongs in `src/features/grammar/` and should add grammar-specific data and UI there rather than expanding `app.js`.
- Future Bible work belongs in `src/features/bible/`. Bible text should not be added until that feature is explicitly requested.
- Future Profile work belongs in `src/features/profile/`. Do not add account/backend behavior unless explicitly requested.

## Architecture rules

1. Keep static source data separate from user progress. Static vocabulary/source files should stay in data JSON files or dedicated source-data modules; local user progress should remain in localStorage persistence helpers.
2. Avoid putting new features back into one giant `app.js`. Add feature code under `src/features/<feature>/` and shared behavior under `src/core/` or `src/ui/`.
3. Preserve local-first behavior unless explicitly asked to add a backend. Import/export and localStorage are the persistence model for this phase.
4. Prefer incremental moves over rewrites. The Phase 1 modules intentionally retain the existing function names and browser-global loading pattern behind `src/main.js` to keep review simple and behavior stable.

## Smoke-test checklist

- [ ] App loads.
- [ ] Greek/Hebrew switch works.
- [ ] Word list renders.
- [ ] Filters work.
- [ ] Flashcards start and complete.
- [ ] Parsing starts and completes.
- [ ] Parsing filters display.
- [ ] Dashboard renders.
- [ ] Settings open and save.
- [ ] Import/export still works.
