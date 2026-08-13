# Stage 1: clean presentation runtime

This directory is an intentionally isolated proof of the two-repository architecture.

It does **not** replace the current presentation build or website export. The existing Reveal.js fork remains the production path while this branch is evaluated.

## What this proves

- Reveal.js is consumed as the official `reveal.js@6.0.1` package rather than maintained as framework source in this repository.
- Vite owns the clean presentation build.
- Presentation-specific behaviour has an explicit runtime boundary in `src/presentation-runtime/` instead of patching the global Reveal object.
- `ai-connections.html` is used as the representative deck because it exercises nested slides, fragments, background images, auto-animate, custom CSS and the custom focus/blur background behaviour.
- The Stage 1 build consumes the existing deck content at build time, so the old and new versions can be compared without duplicating or editing the source presentation yet. Moving presentation source into the new structure is deliberately Stage 2 work.

## Compare before and after

Run the existing presentation server in one terminal:

```bash
npm start
```

Open the existing deck using the URL printed by the Gulp server, for example:

```text
http://localhost:8000/ai-connections.html
```

Then run the Stage 1 runtime in another terminal:

```bash
npm run stage1:install
npm run stage1:dev
```

Open:

```text
http://localhost:5173/ai-connections.html
```

The Stage 1 version has a small `Stage 1 · Reveal.js 6.0.1` badge in the top-right corner so it is obvious which runtime you are viewing.

## Validation

```bash
npm run stage1:check
```

This runs focused source/extraction tests, a Vite production build and post-build checks that ensure the representative deck and its assets were emitted without falling back to legacy Reveal runtime paths.

## Deliberately deferred

Stages 2–6 will handle migrating all deck source, porting the remaining custom components such as GPT input, replacing the legacy exporter, wiring the new build into `digiguru.github.io`, and finally deleting/archive-cleaning the old Reveal.js fork machinery.
