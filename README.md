# Digiguru presentations

This repository contains Digiguru's presentation content and the **Pure** Reveal.js runtime. Pure is the only runtime/build path.

Stage 6 removed the inherited framework/build stack. Stage 7 migrated all 25 presentation sources to the canonical `pure-v1` content format and removed the historical HTML compatibility parser and frozen metadata registry.

## Architecture

- Root `*.html` files are canonical `pure-v1` presentation sources.
- `pure/src/` contains the shared runtime and UI.
- `pure/src/presentation-runtime/stack-backgrounds.js` preserves shared backgrounds declared on vertical stacks while respecting explicit child backgrounds.
- `pure/build/deck-source.mjs` reads canonical content/configuration.
- `pure/build/audit-sources.mjs` rejects historical runtime wiring and checks the corpus capability/theme footprint.
- `pure/deck.html` is the shared HTML shell for every built deck.
- `scripts/presentations.mjs` discovers sources, validates metadata and exports the built artifact.
- `scripts/presentation-accessibility.mjs` validates accessibility.
- `scripts/smoke-presentations.mjs` browser-tests the exported website artifact.
- `pure/package.json` and `pure/package-lock.json` define the npm dependency graph.
- `pure/dist/` is generated output; never edit it manually.

Presentation sources contain content and declarative configuration, not their own runtime.

## Setup and validation

Use the Node version pinned by `.node-version`.

Start the development server with:

```bash
npm start
```

`npm start` performs a deterministic `npm ci --prefix pure` from the committed lockfile before starting Vite.

For a fresh production build:

```bash
npm run pure:install
npm run build
```

Useful checks:

```bash
npm test
npm run pure:audit
npm run presentations:check
npm run presentations:accessibility
npm --prefix pure run audit:sources
npm run pure:smoke
npm run presentations:smoke
```

`npm run build` produces the static product in `pure/dist/` and assumes the locked Pure dependencies are already installed. `npm test`, `npm start` and `npm run pure:check` are self-contained and install them when needed.

## Canonical presentation source format

Every presentation declares metadata and content explicitly:

```html
<!doctype html>
<title>My new talk</title>
<meta name="presentation-format" content="pure-v1">
<meta name="presentation-name" content="My new talk">
<meta name="presentation-version" content="v6.2">
<meta name="presentation-date" content="11/08/2026">
<meta name="presentation-attendance" content="25">
<meta name="presentation-reveal-classes" content="reveal">
<meta name="presentation-theme" content="black">

<script type="application/json" id="presentation-options">
{
  "hash": true
}
</script>

<div class="slides">
  <section>...</section>
</div>
```

`presentation-name`, `presentation-version` and `presentation-date` are required. `presentation-attendance` is optional. Multiple `presentation-theme` tags are allowed.

Sources may contain inline `<style>` blocks and explicitly required external HTTP(S) styles/scripts. Reveal configuration belongs in the JSON `presentation-options` block.

Do not add document wrappers, a deck-owned `.reveal` wrapper, local Reveal/plugin runtime links, or executable deck-owned initialization code. `npm --prefix pure run audit:sources` guards against those historical patterns.

Every image needs an `alt` attribute. Keep backgrounds declarative:

```html
<section data-background-image="assets/example.png" data-background-size="1696px 928px">
```

A background declared on the outer section of a vertical stack is inherited by children that do not declare their own background. Explicit child backgrounds win. Unit tests cover this rule and the Chrome corpus smoke verifies the rendered BigBus opening background so this regression cannot silently return.

Shared runtime behaviour belongs in `pure/`; presentation-specific content belongs in the root source file.

## Build and export

The Pure build discovers canonical sources, loads them through `deck-source.mjs`, renders every deck through the shared Pure shell, preserves required assets, and emits `build-info.json` plus `presentations.json`.

The website-facing exporter remains:

```bash
node scripts/presentations.mjs --manifest /path/to/presentations.yml --export /path/to/site
```

The generated YAML is an export artifact only; there is no repository-owned presentation registry. Metadata lives in each source file.

## CI and deployment

GitHub Actions validates workflow syntax, repository tooling, all 25 canonical metadata records, accessibility, ESLint, the locked dependency graph, source purity/capability preservation, the production build, all 25 built decks in Chrome, and the exported catalogue plus all 25 exported decks in Chrome.

CI installs the locked Pure dependency graph once per job and reuses it for lint/build/smoke work. After a successful push to `master`, the workflow dispatches `digiguru/digiguru.github.io` with the exact presentation SHA that passed CI.

Vercel uses the same deterministic path from `vercel.json`:

```text
install: npm run pure:install
build:   npm run build
output:  pure/dist
```

The Vercel install step runs `npm ci --prefix pure` once; the build step does not reinstall dependencies.

## Dependencies and security

Runtime/build npm dependencies belong in `pure/package.json`; dependency changes must update `pure/package-lock.json`. `npm run pure:audit` audits the dependency graph that actually builds and runs Pure.

There is no inherited framework dependency tree and no presentation compatibility runtime to maintain.
