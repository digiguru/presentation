# CLAUDE.md

Guidance for coding agents working in this repository.

## Product boundary

This repository contains Digiguru's canonical presentation sources and the **Pure** Reveal.js runtime. Pure is the only runtime/build path. Do not recreate the deleted Reveal.js framework fork, Gulp/Rollup build, QUnit/Puppeteer tooling, or the Stage-7 historical HTML compatibility layer.

Do not redesign the Pure runtime unless the task explicitly requires it.

## Architecture

- Root `*.html` files: 25 canonical `pure-v1` content sources.
- `pure/src/`: shared runtime/UI implementation.
- `pure/src/presentation-runtime/stack-backgrounds.js`: vertical-stack background inheritance for canonical decks.
- `pure/build/deck-source.mjs`: strict parser for canonical presentation content/configuration.
- `pure/build/audit-sources.mjs`: source-purity and corpus-footprint audit.
- `pure/deck.html`: shared output shell used for every deck.
- `pure/package.json` and `pure/package-lock.json`: runtime/build dependency graph.
- `scripts/presentations.mjs`: canonical source discovery, metadata validation and website export.
- `scripts/presentation-accessibility.mjs`: accessibility validation.
- `scripts/smoke-presentations.mjs`: exported-site Chrome smoke test.
- `pure/dist/`: generated product output; never edit manually.

There is no legacy presentation parser or metadata registry. Source metadata lives in each presentation file.

## Canonical source contract

Every presentation must include:

```html
<!doctype html>
<title>Presentation title</title>
<meta name="presentation-format" content="pure-v1">
<meta name="presentation-name" content="Presentation name">
<meta name="presentation-version" content="v6.2">
<meta name="presentation-date" content="11/08/2026">
<meta name="presentation-theme" content="black">
<script type="application/json" id="presentation-options">{}</script>
<div class="slides">...</div>
```

`presentation-attendance` is optional. `presentation-reveal-classes` defaults to `reveal`. Multiple `presentation-theme` tags are allowed.

Sources may contain inline `<style>` blocks and explicitly required external HTTP(S) styles/scripts. Reveal settings belong in the JSON options block.

Do not add `<html>`, `<head>` or `<body>` wrappers, a deck-owned `.reveal` wrapper, `Reveal.initialize(...)`, local `dist/` or `plugin/` runtime links, or local runtime scripts. Shared behaviour belongs in Pure.

Keep backgrounds declarative and every image accessible with an `alt` attribute. A `data-background-*` value on an outer vertical stack is inherited by child slides that do not declare an explicit background; explicit child backgrounds always win. Keep the unit and Chrome regression tests for this behaviour intact.

## Dependency policy

Use the committed Pure lockfile:

```bash
npm run pure:install
```

This runs `npm ci --prefix pure`. Dependency changes to `pure/package.json` must update `pure/package-lock.json`.

CI and Vercel install the locked Pure dependency graph once before lint/build work. `npm run build` and `npm run lint` therefore assume dependencies are already installed. `npm start`, `npm test` and `npm run pure:check` are self-contained and install the locked dependencies when needed.

## Canonical commands

```bash
npm start
npm run pure:install
npm run build
npm test
npm run pure:audit
npm run presentations:check
npm run presentations:accessibility
npm --prefix pure run audit:sources
npm run pure:smoke
npm run presentations:smoke
```

Use the Node version in `.node-version`.

## Validation expectations

For runtime, build, dependency or presentation-source changes, require:

1. Repository tooling tests.
2. Canonical metadata and accessibility validation.
3. ESLint.
4. Pure dependency audit.
5. Canonical source-purity/corpus audit.
6. Pure production build.
7. Chrome smoke for all 25 built decks, including the rendered BigBus background regression check.
8. Exported catalogue plus all 25 decks in Chrome.

A browser smoke failure is meaningful even when a static build succeeds.

## CI, Vercel and website deployment

`.github/workflows/js.yml` validates pull requests and pushes to `master`. A successful `master` build dispatches `digiguru/digiguru.github.io` with the exact presentation commit SHA that passed CI.

`vercel.json` installs with `npm run pure:install`, builds with `npm run build`, and publishes `pure/dist`. Keep Vercel and CI on the same deterministic build path and do not add a second install inside the build command.
