# AGENTS.md — Puritan Parser repository guide

This file is the operating guide for Codex and other coding agents working in this repository. Keep it concise, repository-specific, and subordinate to explicit task prompts.

## 1. Product mission

- Puritan Parser is a local-first, offline-first biblical Greek and Hebrew reading and learning application.
- Its mission is to help Christians become increasingly independent readers of the Greek New Testament and Hebrew Bible through:
  - progressive learning;
  - intelligent assistance;
  - thoughtful reading tools;
  - transparent review systems.
- The product should feel calm, scholarly, trustworthy, restrained, and reading-centered.
- It should not feel gamified, social, motivational, or like a general-purpose Bible software suite.
- Success means users gradually need less assistance while reading.

## 2. Product boundaries

Current model:

- Reader applies language knowledge to biblical text.
- Learn practices vocabulary, reading readiness, paradigms, and review workflows.
- Reference explains grammar and supports consultation.
- Progress measures learning and reading readiness.
- Word Pages explain a specific lemma or form in context.
- Study Sets are collections and sources, not independent SRS decks.

Anti-goals:

- Do not turn the app into Logos or Accordance.
- Do not add social features, gamification, cloud accounts, or synchronization without explicit approval.
- Do not make AI-generated content central to the product.
- Do not duplicate full features across Reader, Learn, Reference, and Word Pages.
- Do not add deck-specific SRS state for Study Sets.
- Do not add large new feature areas without explicit scope.

## 3. Current Reference direction

After v1.3.2, Reference is organized around:

1. **Paradigm Charts** — primary; show forms.
2. **Grammar Handbook** — secondary; explains forms, grammar, morphology, and syntax.

Reference rules:

- Paradigm views should contain little or no explanatory prose.
- Reference should not return to one enormous continuously scrolling page.
- Prefer focused pages, selectors, tabs, or meaningful collapsible chart groups.
- Paradigm and Handbook pages may link to each other.
- Supplemental Reference and Additional Tools should not return as competing top-level categories.
- Expansion planning lives in `docs/reference-audit.md` and `docs/reference-sources.md`.

## 4. Architecture map

- `index.html` — static application shell and startup script tag for `src/main.js`.
- `styles.css` — global visual system and responsive styles.
- `src/main.js` — sequential startup module list; keep it aligned with `sw.js` precache tests.
- `src/bootstrap.js` — bootstraps app readiness after modules load.
- `src/core/router.js` — lightweight route-to-view map; root currently opens Learn.
- `src/app-state.js` — legacy shared state and older localStorage keys.
- `src/features/reader/index.js` — shared Greek/Hebrew Reader, lazy chapter loading, popups, translation controls, location/settings persistence.
- `src/features/learn/index.js` — Learn shell, Review Queue, Learning Paths, Reading Readiness, Study Sets entry points, preferences.
- `src/features/learn/recognition-engine.js` — reusable paradigm recognition items from Reference data.
- `src/features/vocab/index.js`, `src/features/flashcards/index.js`, `src/features/parsing/index.js` — vocabulary and legacy/internal practice views used by Learn routes.
- `src/features/grammar/reference-data.js` — static Reference topics, paradigms, aliases, and search data.
- `src/features/grammar/index.js` — Reference rendering, language selector, search, and navigation.
- `src/features/progress/index.js` and `src/core/progress-service.js` — Progress UI and shared progress summaries/history.
- `src/features/settings/index.js`, `src/features/settings/events.js`, `src/models/preferences.js`, `src/core/storage/prefs-storage.js` — settings and preferences.
- `src/core/storage/`, `src/core/migrations/`, `src/models/vocabulary-learning.js`, `src/models/study-sets.js`, `src/models/saved-vocabulary.js`, `src/models/onboarding.js` — localStorage wrappers, migrations, and user-data models.
- `src/core/source-data/`, `src/core/data-loader.js`, `src/core/parser-core.js`, `src/models/parse-data.js`, `src/models/word-entry.js`, `src/models/gloss.js` — vocabulary, parser, gloss, and word-entry infrastructure.
- `data/greek/`, `data/hebrew/` — generated Reader manifests and search indexes; chapter data is loaded at runtime.
- `data/glosses/` — Greek and Hebrew gloss sources.
- `data/translations/<id>/` — generated translation manifests and chapter files for providers such as OEB and WEB.
- `data/metadata/content-manifest.json` and `src/core/content/` — lightweight content metadata/loader.
- `scripts/` — data download, generation, gloss audit, Reader audit, and translation generation utilities.
- `tests/` — Node test suite, including storage, routing, Reader, Learn, Reference, service-worker, and data integrity tests.
- `sw.js` — service worker and app-shell/runtime JSON cache behavior.
- `docs/` — product, architecture, Reader, Reference, audit, roadmap, and data-source documentation.
- `vercel.json` — app-shell fallback for direct deep-link loads.

## 5. Required commands

Before editing:

```bash
git status
npm test
```

After editing:

```bash
npm test
git diff --check
```

Verified project commands from `package.json`:

```bash
npm run dev
npm run gloss:audit
npm run reader:audit
npm run data:download
npm run data:build
npm run data:refresh
npm run reader:generate
npm run hebrew:reader:generate
npm run translation:oeb:generate
npm run translation:web:generate
npm run reader:update
```

- There are currently no `build`, `lint`, or `typecheck` npm scripts.
- Known preexisting audit failures must be reported honestly; do not claim a task introduced them unless the task changed affected data.
- Do not suppress, weaken, or delete an audit merely to make a command green.

## 6. Development rules

- Make the smallest cohesive change that satisfies the task.
- Inspect existing patterns before introducing abstractions.
- Do not refactor unrelated areas or add dependencies without explicit approval.
- Preserve existing routes and aliases where practical.
- Preserve browser Back behavior, mobile behavior, keyboard accessibility, and offline behavior.
- Do not weaken tests merely to pass.
- Do not hide errors with silent catch blocks.
- Never expose `undefined`, `null`, raw objects, unexplained IDs, or debug strings to users.
- Use calm, concise, user-facing copy; avoid development-process language in product UI.
- Do not create empty future placeholders or present partial data as comprehensive.
- Report uncertainty honestly.

## 7. Persisted data safety

- Existing-user data compatibility is a high priority.
- Preserve localStorage schemas wherever possible.
- Add safe migrations when persisted structures must change.
- Existing preferences and progress must remain readable.
- Do not rename or delete storage keys casually.
- Review import/export implications when persisted data changes.
- Keep Greek and Hebrew review state separated where currently designed.
- Study Sets share underlying word/card review state rather than receiving separate deck SRS state.
- Reader language, book, chapter, location, and scroll restoration must not regress.
- Important current keys include `pp_vocab_learning`, `pp_study_sets`, `pp_reader_location`, `pp_reader_adaptive_settings`, `pp_learn_review_targets`, `pp_learn_practice_srs_preference`, and `pp_recognition_history`; verify code before changing any key.

## 8. Greek and Hebrew data safety

- Do not invent Greek or Hebrew forms.
- Do not infer missing paradigms by analogy unless explicitly authorized and supported by an approved source.
- Do not change Greek accents, breathing marks, or Hebrew vowel pointing speculatively.
- Do not mark plausible-looking data as verified.
- Preserve raw internal source values when needed, while displaying readable labels.
- Structural tests do not prove scholarly correctness.
- Unknown provenance must be reported honestly.
- Large linguistic data expansions should be divided into small reviewable changes.
- Every major paradigm expansion should identify its source and representative lemma or root.
- Do not regenerate language datasets unless explicitly requested.
- Do not synthesize missing biblical text or forms absent from the source tradition.
- See `docs/reference-audit.md` and `docs/reference-sources.md` before Reference or paradigm data changes.

## 9. Reader safety

- Reader is the heart of the product.
- Never lose the user's place.
- Preserve language, book, chapter, explicit navigation, restored state, and scroll restoration.
- Explicit navigation must override restored state.
- Preserve word popups, translation controls, deep links, Word Page handoff, and offline behavior.
- Do not load an entire biblical book when incremental chapter loading is sufficient.
- Reader data should remain lazy-loaded where designed.
- Do not synthesize missing verses.
- Paragraph breaks should use reliable source metadata rather than invented divisions.
- Planned, not current behavior: optional side-panel word details, optional full Word Page in the side panel, and chapter/continuous reading modes.

## 10. Service worker and offline rules

- `sw.js` uses a named cache and an app-shell precache list; JSON data is network-first runtime cached.
- Update the service-worker cache identifier when startup assets change.
- Keep `sw.js` startup module entries aligned with `src/main.js`.
- Update cache-version and app-shell tests accordingly; relevant coverage is in `tests/smoke.test.js` and `tests/reference-integrity.test.js`.
- Update cache-busting query strings in `index.html` where the existing architecture requires them.
- Avoid precaching large chapter, search-index, gloss, grammar, or language datasets unnecessarily.
- Preserve runtime loading and offline behavior.
- Consider stale service-worker state during manual QA; use a fresh browser context or clear local site data when validating startup changes.

## 11. UI and accessibility principles

- Preserve the calm, scholarly visual style.
- Avoid excessive cards and competing hierarchy.
- Prefer sentence-case copy.
- Essential controls must not rely on hover.
- Interactive elements must be keyboard accessible.
- Tabs and collapsible controls need appropriate ARIA state.
- Wide Greek and Hebrew tables should use contained horizontal scrolling.
- Do not shrink script text until it becomes unreadable.
- Mobile layouts must not create page-level horizontal overflow.
- Paradigm views should prioritize consultation speed.
- Long pages should use focused views or meaningful collapsible groups.

## 12. Git and task workflow

- Start from the latest `main` branch when the environment provides it.
- Use a task-specific branch; do not commit directly to `main`.
- One feature or fix per branch/PR.
- Do not include unrelated modified files.
- Do not run overlapping write tasks in the same feature area.
- Keep `main` deployable.
- Use GitHub as the handoff point between Codex Web and local development.
- Run the full test suite before finalizing.
- Report when the environment lacks an origin remote, browser automation, or another required capability.
- “PR metadata created” does not necessarily mean a branch was pushed or a PR was opened; verify publication before claiming completion.

## 13. Expected completion report

Future agents should report:

1. Baseline state and test result.
2. Cause or implementation approach.
3. Files changed.
4. Tests added or updated.
5. Final test result.
6. `git diff --check` result.
7. Manual or browser checks completed.
8. Checks unavailable in the environment.
9. Persisted-data or migration impact.
10. Service-worker/cache impact.
11. Known limitations.
12. Intentionally deferred work.
13. Scholarly uncertainty where linguistic data changed.

For bug fixes, include root cause. For data changes, include source/provenance and verification limitations.

## 14. Roadmap context

Planning context only; this is not permanent architecture:

- v1.3.3 — Greek core indicative paradigms.
- v1.3.4 — Greek additional moods and non-finite forms.
- v1.3.5 — Hebrew strong-verb paradigms.
- v1.4.1 — Reader side-panel details.
- v1.4.2 — Continuous reading.
- v1.5 — Stabilization and release QA.

The roadmap may change. Task prompts and current audit documents override this summary. Do not implement future roadmap items during an unrelated task.
