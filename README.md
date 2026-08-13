# Digiguru presentations

This repository contains Digiguru's presentation sources and the **Pure** Reveal.js runtime. Pure is the only maintained runtime/build path. The inherited Reveal.js source tree, Gulp/Rollup build, QUnit tests and Puppeteer tooling were removed in Stage 6.

## Current architecture

- The 25 root-level `*.html` files are presentation sources.
- `pure/` contains the shared Vite/Reveal.js runtime, build logic and tests.
- `pure/package.json` plus committed `pure/package-lock.json` define the runtime dependency graph.
- `pure/build/legacy-deck.mjs` is an intentional compatibility parser for historical source HTML. It extracts slide content/options and ignores obsolete historical runtime wiring.
- `legacy-presentations.yml` contains compatibility metadata for historical decks; it is not a registry for new presentations.
- `scripts/presentations.mjs` discovers decks, validates metadata and exports the validated Pure artifact.
- `scripts/presentation-accessibility.mjs` validates presentation accessibility.
- `scripts/smoke-presentations.mjs` browser-tests the exported site.
- `pure/dist/` is generated output and must not be edited by hand.

Pure is the product. The legacy parser is only an input compatibility boundary.

## Setup and commands

Use the Node version pinned by `.node-version`.

```bash
npm run pure:install
npm start
```

`pure:install` uses `npm ci --prefix pure`, so local, CI and Vercel installs use the committed Pure lockfile.

Useful checks:

```bash
npm test
npm run pure:audit
npm run presentations:check
npm run presentations:accessibility
npm run pure:smoke
npm run presentations:smoke
```

`npm run build` produces the static product in `pure/dist/`. The Chrome smoke tests require Chrome/Chromium; GitHub Actions provides it.

## Presentation sources

Presentations are discovered automatically from root HTML files. A typical title supplies metadata directly:

```html
<title>My new talk - v6.2 - 11/08/2026</title>
```

For exceptional titles use the `presentation-name`, `presentation-version`, `presentation-date` and optional `presentation-attendance` meta tags. New presentations should not add compatibility entries to `legacy-presentations.yml`.

Every image needs an `alt` attribute. Backgrounds should be declarative, for example:

```html
<section data-background-image="assets/example.png" data-background-size="1696px 928px">
```

Do not reintroduce a deck-owned Reveal.js runtime. Shared runtime behaviour belongs in `pure/`; deck content belongs in the source HTML.

## Build, CI and deployment

The Pure build discovers all presentation sources, parses them through the compatibility boundary, renders them through the shared Pure shell, preserves required presentation assets, and emits `build-info.json` plus `presentations.json`.

GitHub Actions validates tooling, metadata, accessibility, linting, the Pure dependency graph, the production build, all 25 Pure decks in Chrome, and the exported-site catalogue plus all 25 exported decks. Browser smoke checks require Reveal to reach ready state and reject missing local resources.

After a successful push to `master`, the workflow dispatches `digiguru/digiguru.github.io` with the exact presentation SHA that passed CI. The website exports only the validated Pure artifact.

Vercel uses the same path declared in `vercel.json`:

```text
install: npm run pure:install
build:   npm run build
output:  pure/dist
```

The Pure index exposes its build commit SHA so preview deployments can be matched to the branch revision being reviewed.

## Dependencies and security

Runtime/build npm dependencies belong in `pure/package.json`; dependency changes must update `pure/package-lock.json`. The old Puppeteer/QUnit tree and its historical `extract-zip` finding are no longer part of the current dependency graph. `npm run pure:audit` checks the dependencies that actually ship/build Pure.

## Future cleanup

`pure/build/legacy-deck.mjs` and `legacy-presentations.yml` remain deliberately. A future Stage 7 can migrate all 25 source decks to a simpler canonical content format and then remove the compatibility layer. Keep that migration separate from dependency, documentation and routine runtime work.
