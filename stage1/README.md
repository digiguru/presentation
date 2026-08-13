# Stages 1–2: clean runtime and legacy compatibility

This directory remains intentionally isolated from the production presentation/export path while the two-repository architecture is evaluated.

Stage 1 proved that the presentations can run on the official `reveal.js@6.0.1` package with Vite instead of maintaining Reveal framework source in this repository. Stage 2 adds a compatibility adapter so existing deck HTML can be consumed with minimal rewriting.

## What Stage 2 adds

The adapter now reads real conventions from each legacy deck instead of assuming every presentation is identical:

- Reveal root classes and a safe subset of per-deck `Reveal.initialize` options
- standard Reveal themes from the official package
- custom compiled themes such as `AND.css` as presentation-owned compatibility assets, including their referenced images
- inline deck CSS
- external stylesheets and scripts such as Font Awesome, Chart.js and Base64
- referenced `assets/` files and local support files such as `output/bigbus.html`
- capability detection for focus backgrounds, GPT input, pie charts, Markdown, canvases and iframes
- classification of legacy inline scripts and non-standard local scripts for Stage 3 review

Three real decks are built and browser-smoked through this adapter:

- `ai-connections.html` — the Stage 1 baseline
- `anti-ai.html` — an older conventional deck
- `bigbus.html` — a richer deck with the custom AND theme, external dependencies and `<gpt-input>`

## Presentation runtime boundary

The compatibility audit showed that 23 of the 25 current decks contain `<gpt-input>`, so Stage 2 ports that control instead of carrying a global-Reveal shim into Stage 3.

`src/presentation-runtime/gpt-input.js` now owns the GPT custom element and receives the Reveal deck instance explicitly. Its HTML template is bundled at build time from `gpt-input.html`; the clean build no longer ships or runtime-fetches `js/gpt-component.js` or `js/gpt-component.html`, and it does not expose `window.Reveal`.

The focus/background behaviour and dynamic-slide helper remain in the same explicit `presentation-runtime` boundary, giving the eventual two-repository design one clear home for presentation-specific behaviour while Reveal.js remains an external dependency.

## Compatibility audit findings

The Stage 2 audit currently discovers 25 presentations:

- black theme: 25 decks
- custom AND theme: 3 decks
- focus-background behaviour: 25 decks
- GPT input: 23 decks
- iframes: 19 decks
- canvases: 6 decks
- custom inline scripts needing explicit Stage 3 review: only `agile-reading.html`, `lightning.html`, and `nationwide.html`
- non-standard local support scripts: none

This gives Stage 3 a concrete migration checklist rather than requiring another discovery pass.

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

Stage 3 will migrate the complete deck corpus into the new presentation structure using this adapter and its audit as the migration checklist. Later stages will replace the old exporter, wire the new build into `digiguru.github.io`, clean up any now-unused external deck dependencies and finally delete/archive-clean the Reveal fork and inherited QUnit/Puppeteer machinery.
