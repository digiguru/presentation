# Pure presentation runtime

`pure/` is the clean presentation runtime built on official `reveal.js@6.0.1` and Vite.

The top-level presentation HTML files remain content sources during the migration. Pure reads their slides, themes, supported Reveal options and content dependencies at build time, but the generated site runs the Pure runtime rather than the repository's old Reveal/GPT implementation.

## Stage 3 corpus

Pure now discovers and builds the complete current presentation corpus: 25 presentations.

A single checked-in `deck.html` provides the page shell. `vite.config.mjs` generates the individual entry pages before Vite starts, preserving existing URLs such as `/bigbus.html` without maintaining a wrapper file for every presentation.

The generated index lists every presentation and the exact Git commit SHA. Each deck also includes the same SHA and source name in its generated page.

## Pure runtime

Presentation-specific behaviour lives under `src/presentation-runtime/`:

- focus/background behaviour
- dynamic slide insertion
- the Pure `<gpt-input>` component and bundled template

GPT requests use the same-origin `/api/prompt/*` boundary. Pure does not require the old global Reveal object or the old GPT component files.

The audit found historical inline GPT implementations in `agile-reading.html`, `lightning.html` and `nationwide.html`. Pure classifies those as superseded and does not carry them into generated presentation pages. The current corpus has zero unported custom inline scripts and zero non-standard local support scripts.

## Current compatibility audit

- presentations: 25
- black theme: 25
- custom AND theme: 3
- focus backgrounds: 25
- GPT input: 23
- iframes: 19
- canvases: 6
- historical GPT implementations superseded: 3
- unported custom runtime scripts: 0
- non-standard local runtime scripts: 0

## Validation

`pure:check` audits and builds the complete corpus and verifies every generated presentation in the manifest. `pure:smoke` opens all 25 built presentations in headless Chrome and verifies Reveal readiness, commit/source markers, expected GPT registration and local asset requests.

Vercel previews publish `pure/dist` directly. Stage 3 does not yet replace the old exporter, update `digiguru.github.io`, or remove the old Reveal/Gulp/QUnit stack; those remain Stages 4–6.
