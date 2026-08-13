# Pure presentation runtime

`pure/` is the clean presentation runtime that replaces the need to maintain Reveal.js as framework source inside this repository.

It uses the official `reveal.js@6.0.1` package with Vite and a compatibility adapter for the existing presentation HTML. The legacy production/export path still exists elsewhere in the repository while the migration is evaluated, but Vercel previews on this PR build **Pure** directly.

## What Pure handles

The compatibility adapter reads the conventions used by the existing decks rather than assuming every presentation is identical:

- Reveal root classes and a safe subset of per-deck `Reveal.initialize` options
- standard Reveal themes from the official package
- presentation-owned custom themes such as `AND.css`, including referenced images
- inline deck CSS
- external stylesheets and scripts such as Font Awesome, Chart.js and Base64
- referenced `assets/` files and local support files such as `output/bigbus.html`
- capability detection for focus backgrounds, GPT input, pie charts, Markdown, canvases and iframes
- classification of legacy inline scripts and non-standard local scripts for later migration review

Three real decks currently build through Pure:

- `ai-connections.html`
- `anti-ai.html`
- `bigbus.html`

## Presentation runtime boundary

The compatibility audit showed that 23 of the 25 current decks contain `<gpt-input>`, so that control is already owned by `src/presentation-runtime/` rather than relying on the old global Reveal fork.

`src/presentation-runtime/gpt-input.js` receives the Reveal deck instance explicitly. Its HTML template is bundled at build time from `gpt-input.html`; Pure does not ship or runtime-fetch `js/gpt-component.js` or `js/gpt-component.html`, and it does not expose `window.Reveal`.

The focus/background behaviour and dynamic-slide helper live in the same runtime boundary, leaving Reveal.js as an external framework dependency rather than code we maintain.

## Compatibility audit findings

The current audit discovers 25 presentations:

- black theme: 25 decks
- custom AND theme: 3 decks
- focus-background behaviour: 25 decks
- GPT input: 23 decks
- iframes: 19 decks
- canvases: 6 decks
- custom inline scripts needing explicit later review: `agile-reading.html`, `lightning.html`, and `nationwide.html`
- non-standard local support scripts: none

## Local comparison

Run the existing legacy presentation server:

```bash
npm start
```

For example:

```text
http://localhost:8000/bigbus.html
```

Then run Pure:

```bash
npm run pure:install
npm run pure:dev
```

Open:

```text
http://localhost:5173/bigbus.html
```

Pure presentations have a `Pure · Reveal.js 6.0.1` badge in the top-right corner.

## Vercel preview

The repository's `vercel.json` points preview deployments at the Pure build. On the PR preview, these URLs therefore use the clean Reveal 6 runtime:

```text
/bigbus.html
/ai-connections.html
/anti-ai.html
```

This does not change the website repository or the current production presentation export.

## Validation

```bash
npm run pure:check
npm run pure:smoke
npm --prefix pure run audit:legacy
```

`pure:check` runs unit/extraction tests, audits the complete legacy presentation corpus, builds the Pure pages and verifies the output. `pure:smoke` opens all three Pure decks in headless Chrome and checks that Reveal reaches `ready`, expected controls register and no local request returns 404.

## Still deliberately deferred

The next migration stage will move the complete deck corpus into the Pure presentation structure using the adapter and compatibility audit as the checklist. Later work will replace the old exporter, wire the new build into `digiguru.github.io`, clean up unused external deck dependencies and finally remove/archive the Reveal fork and inherited QUnit/Puppeteer machinery.
