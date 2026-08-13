# CLAUDE.md

Guidance for coding agents working in this repository.

## Product boundary

This repository contains Digiguru presentation sources and the **Pure** Reveal.js runtime. Pure is the only maintained runtime/build path. Do not recreate or depend on the deleted Reveal.js framework fork, Gulp/Rollup build, QUnit suite, Puppeteer tooling, `/js`, `/plugin`, `/css` or inherited `/dist` structure.

Do not redesign the Pure runtime unless the task explicitly requires it.

## Architecture

- Root `*.html` files: 25 historical presentation sources.
- `pure/src/`: shared runtime/UI implementation.
- `pure/build/`: source parsing, compatibility audit, build verification and Chrome smoke tests.
- `pure/build/legacy-deck.mjs`: intentional compatibility boundary that reads historical Reveal-style source HTML and extracts supported content/options while ignoring obsolete runtime references.
- `pure/package.json` and `pure/package-lock.json`: the runtime/build dependency graph.
- `legacy-presentations.yml`: historical compatibility metadata only.
- `scripts/presentations.mjs`: source discovery, metadata validation and website export.
- `scripts/presentation-accessibility.mjs`: accessibility validation.
- `scripts/smoke-presentations.mjs`: exported-site Chrome smoke test.
- `pure/dist/`: generated product output; never edit manually.

The legacy parser does not mean there is a legacy runtime. Pure owns runtime behaviour for every deck.

## Dependency policy

Use the committed Pure lockfile. The canonical install is:

```bash
npm run pure:install
```

which runs `npm ci --prefix pure`. Do not use `npm install --no-package-lock`, delete the lockfile, or add a second root dependency graph without an architectural reason.

When changing `pure/package.json`, regenerate and commit `pure/package-lock.json`, then run the full validation suite.

## Canonical commands

```bash
npm start                         # install and start Pure Vite dev server
npm run build                     # install and build Pure into pure/dist
npm test                          # lint, tooling tests and Pure validation/build
npm run pure:audit                # npm security audit for Pure dependencies
npm run presentations:check       # validate discovery and metadata
npm run presentations:accessibility
npm run pure:smoke                # Chrome smoke of all 25 Pure decks
npm run presentations:smoke       # exported-site catalogue + all-deck Chrome smoke
```

Use the Node version in `.node-version`.

## Presentation changes

Presentation sources are discovered automatically. Prefer metadata in the source title or presentation meta tags; do not add new entries to `legacy-presentations.yml` unless a task specifically concerns historical compatibility data.

Keep backgrounds declarative and ensure every image has an `alt` attribute. Do not add deck-specific runtime copies or old Reveal initialization code for new behaviour. Shared behaviour belongs in Pure.

Historical source files may still contain dead runtime links and old `Reveal.initialize(...)` calls. `legacy-deck.mjs` handles those deliberately. Do not clean them up incidentally while doing dependency, docs or routine runtime work.

## Validation expectations

For runtime, build, dependency or presentation-source changes, run or require CI coverage for:

1. Repository tooling tests.
2. Presentation metadata and accessibility checks.
3. ESLint.
4. `npm audit` of the Pure dependency graph.
5. Pure unit/compatibility checks and production build.
6. Chrome smoke for all 25 built Pure decks.
7. Exported-site smoke for the catalogue and all 25 decks.

A browser smoke failure is meaningful even if the static build succeeds.

## CI, Vercel and website deployment

`.github/workflows/js.yml` validates pull requests and pushes to `master`. A successful `master` build dispatches `digiguru/digiguru.github.io` with the exact presentation commit SHA that passed CI.

`vercel.json` installs with `npm run pure:install`, builds with `npm run build`, and publishes `pure/dist`. Keep Vercel on the same deterministic install/build path as CI.

## Future Stage 7

A later, separate migration may normalize all 25 presentation sources into a simpler canonical format and then remove or rename `legacy-deck.mjs`; `legacy-presentations.yml` can disappear once its historical metadata lives in the sources.

Treat that as a dedicated migration. Do not mix compatibility-layer removal into unrelated cleanup because it makes regressions harder to isolate.
