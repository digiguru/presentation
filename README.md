# Digiguru presentations

This repository is the source of truth for Digiguru presentation content and the **Pure** runtime. Pure uses the official `reveal.js` npm package and Vite. The inherited Reveal/Gulp runtime remains only as temporary regression coverage until the final cleanup stage.

## Local setup

Use the Node version pinned in `.node-version`:

```bash
npm ci
npm start
```

The normal product commands are:

```bash
npm start       # Pure Vite development server
npm run build   # build Pure into pure/dist
npm test        # lint, tooling tests and Pure validation/build
```

The inherited framework commands are explicitly legacy:

```bash
npm run start:legacy
npm run build:legacy
npm run test:legacy
```

Do not use those legacy commands for new runtime work.

Before opening a PR, run:

```bash
npm run presentations:check
npm run presentations:assets
npm run presentations:accessibility
npm test
npm run presentations:smoke
```

`presentations:smoke` requires Chrome/Chromium. GitHub Actions provides Chrome, so Codespaces without a browser can rely on CI for that check.

## Adding a presentation

Create a root-level `.html` file containing Reveal `reveal` and `slides` containers. Presentations are discovered automatically; there is no registry to update.

The easiest metadata convention is:

```html
<title>My new talk - v6.2 - 11/08/2026</title>
```

The filename becomes the published URL. For unusual titles use `presentation-name`, `presentation-version`, `presentation-date`, and optional `presentation-attendance` meta tags.

Run `npm run presentations:check` to validate metadata. `legacy-presentations.yml` is frozen compatibility data for historical presentations; do not add new entries.

## Pure runtime

Pure lives under `pure/`. The build discovers the presentation corpus, renders every deck through the shared `pure/deck.html` shell, preserves existing `assets/...`, `themes/...` and `output/...` URLs, and emits `build-info.json` plus `presentations.json`.

Presentation backgrounds should be declarative:

```html
<section data-background-image="assets/example.png" data-background-size="1696px 928px">
```

Do not add presentation-specific `Reveal.configure()` listeners to switch backgrounds.

Every `<img>` must have an `alt` attribute. Validate presentation assets and accessibility with:

```bash
npm run presentations:assets
npm run presentations:accessibility
```

## Build and export

`npm run build` is the product build and writes the static site to `pure/dist/`.

The website-facing CLI remains:

```bash
node scripts/presentations.mjs --manifest /path/to/presentations.yml --export /path/to/site
```

Export builds Pure and copies **only the validated Pure artifact**. It no longer copies the repository tree or inherited Reveal/Gulp implementation. The exporter verifies that `presentations.json` matches metadata discovery and that every expected presentation exists.

## Tests and CI

During migration the workflow has two layers. The Pure job validates the product and opens all decks in Chrome. The main build job validates tooling/content, builds Pure, then temporarily builds/tests the inherited runtime as regression coverage before smoke-testing the exported Pure site.

```text
npm run build         -> Pure product
npm run build:legacy  -> temporary inherited framework regression build
```

The exported-site smoke test validates `index.html` as a catalogue and then opens every deck listed by `presentations.json`, failing on missing local requests or Reveal not reaching `ready`.

The known high-severity `extract-zip` audit finding comes through the retained QUnit/Puppeteer stack. It remains visible and non-blocking until the final legacy cleanup removes that stack.

## Vercel previews

`vercel.json` runs:

```bash
npm ci
npm run build
```

and publishes `pure/dist`. It also provides the same-origin `/api/prompt/*` boundary used by the Pure GPT control.

The Pure index shows the exact build commit SHA. Check that SHA when reviewing a preview so a stale immutable Vercel deployment is not mistaken for the latest branch build.

## Website deployment

A successful push to `master` dispatches `digiguru/digiguru.github.io` with the exact presentation commit SHA that passed CI. The website checks out that SHA, generates its manifest, exports the validated Pure artifact and deploys it.

`WEBSITE_DISPATCH_TOKEN` should remain narrowly scoped to `digiguru.github.io` with **Actions — Read and write**, stored only as an Actions secret.

## Reveal.js relationship

Pure uses Reveal.js as a dependency, not as repository-owned product code. The inherited Reveal/Gulp/QUnit source remains temporarily for migration regression coverage only. New product behaviour belongs in Pure or presentation content.

The final cleanup stage will remove the unused framework source, Gulp/QUnit/Puppeteer dependencies and legacy package metadata after the website integration proves the Pure export end to end.
