# Stages 1–2: clean runtime and legacy compatibility

This directory remains intentionally isolated from the production presentation/export path while the two-repository architecture is evaluated.

Stage 1 proved that the presentations can run on the official `reveal.js@6.0.1` package with Vite instead of maintaining Reveal framework source in this repository. Stage 2 adds a compatibility adapter so existing deck HTML can be consumed with minimal rewriting.

## What Stage 2 adds

The adapter now reads real conventions from each legacy deck instead of assuming every presentation is identical:

- Reveal root classes and a safe subset of per-deck `Reveal.initialize` options
- standard Reveal themes from the official package
- custom compiled themes such as `AND.css` as presentation-owned compatibility assets
- inline deck CSS
- external stylesheets and scripts such as Font Awesome, Chart.js and Base64
- referenced `assets/` files and local support files such as `output/bigbus.html`
- capability detection for focus backgrounds, GPT input, pie charts, Markdown, canvases and iframes
- classification of legacy inline scripts and non-standard local scripts for Stage 3 review

Three real decks are built and browser-smoked through this adapter:

- `ai-connections.html` — the Stage 1 baseline
- `anti-ai.html` — an older conventional deck
- `bigbus.html` — a richer deck with the custom AND theme, external dependencies and `<gpt-input>`

The old GPT component still expects a singleton `Reveal` global. Stage 2 contains a narrowly scoped compatibility bridge that exposes the new Reveal 6 deck instance only for decks that actually contain `<gpt-input>`. This is transitional: the control itself will become a first-class `presentation-runtime` module before the old stack is removed.

## Compare old and compatibility runtimes

Run the existing presentation server:

```bash
npm start
```

For example, open:

```text
http://localhost:8000/bigbus.html
```

Then run the compatibility runtime:

```bash
npm run stage1:install
npm run stage1:dev
```

Open the matching deck:

```text
http://localhost:5173/bigbus.html
```

The compatibility versions have a `Stage 2 · Reveal.js 6.0.1` badge in the top-right corner.

## Validation

```bash
npm run stage1:check
npm run stage1:smoke
npm --prefix stage1 run audit:legacy
```

`stage1:check` runs unit/extraction tests, audits the complete legacy presentation corpus, builds all Stage 2 compatibility pages and verifies the output. `stage1:smoke` opens all three compatibility decks in headless Chrome and checks that Reveal reaches `ready`, expected controls register and no local request returns 404.

The legacy compatibility audit does not execute arbitrary old inline JavaScript. It inventories custom scripts instead, so Stage 3 can migrate them explicitly rather than silently losing behaviour.

## Still deliberately deferred

Stage 3 will migrate the complete deck corpus into the new presentation structure using this adapter and its audit as the migration checklist. Later stages will replace the old exporter, wire the new build into `digiguru.github.io`, port/remove remaining transitional control shims and finally delete/archive-clean the Reveal fork and inherited QUnit/Puppeteer machinery.
