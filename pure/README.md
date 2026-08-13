# Pure presentation runtime

`pure/` is the only presentation runtime in this repository. It builds the 25 canonical `pure-v1` presentation sources with official `reveal.js@6.0.1` and Vite.

For the repository-wide architecture, source contract, validation and deployment flow, see the root [`README.md`](../README.md).

## What lives here

- `src/presentation.js` initializes Reveal and the shared presentation runtime.
- `src/presentation-runtime/` contains shared behaviours such as focus backgrounds, GPT input, dynamic slide insertion and vertical-stack background inheritance.
- `build/deck-source.mjs` parses canonical presentation sources.
- `build/audit-sources.mjs` rejects historical runtime wiring and verifies the expected corpus footprint.
- `build/verify-build.mjs` verifies the generated manifest and all 25 built decks.
- `build/smoke.mjs` opens every built deck in headless Chrome and verifies Reveal readiness, source/commit markers, GPT registration, rendered BigBus background behaviour and local asset requests.
- `deck.html` is the shared shell used for every presentation.
- `themes/AND.css` is the optional AND theme layered on top of the standard Reveal theme.
- `package.json` and `package-lock.json` are the complete runtime/build dependency graph.
- `dist/` is generated output and must not be edited or committed.

## Background compatibility rule

Some canonical sources intentionally put a shared `data-background-*` value on the outer section of a vertical slide stack. Reveal 6 treats each vertical child as a separate background target, so `src/presentation-runtime/stack-backgrounds.js` copies stack background settings to children that do not define their own background before Reveal initializes.

Explicit child backgrounds always win. This behaviour is covered by unit tests and by a real Chrome regression assertion against the BigBus opening background.

## Commands

From the repository root:

```bash
npm start
npm test
npm run pure:audit
npm run build
npm run pure:smoke
```

`npm start`, `npm test` and `npm run pure:check` perform a deterministic `npm ci --prefix pure` when they need a self-contained environment. CI and Vercel install the locked dependencies once, then run lint/build commands without reinstalling them.

For direct Pure work after dependencies are installed:

```bash
npm --prefix pure run test
npm --prefix pure run audit:sources
npm --prefix pure run build
npm --prefix pure run smoke
```

There is no legacy Reveal fork, compatibility parser, Gulp/Rollup stack, QUnit/Puppeteer suite or repository-owned presentation registry to maintain.
