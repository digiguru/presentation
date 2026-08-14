# Digiguru presentations

Source, runtime and build tooling for the Digiguru presentation archive.

**Production:** https://art.digiguru.co.uk/presentation/

This repository owns the presentation content and the shared **Pure** Reveal.js runtime. It does **not** directly host the production `/presentation/` site. Production is assembled and deployed by [`digiguru/digiguru.github.io`](https://github.com/digiguru/digiguru.github.io), which checks out an exact commit from this repository and exports the presentation build into its GitHub Pages artifact.

## What lives here

- Root `*.html` files are the canonical `pure-v1` presentation sources.
- `pure/src/` contains the shared Reveal.js runtime, UI and presentation behaviour.
- `pure/build/deck-source.mjs` reads and validates canonical presentation source.
- `pure/deck.html` is the shared HTML shell used by every built deck.
- `scripts/presentations.mjs` discovers presentations, validates metadata and exports the built site.
- `scripts/presentation-accessibility.mjs` validates presentation accessibility.
- `scripts/smoke-presentations.mjs` browser-tests the exported website artifact.
- `pure/package.json` and `pure/package-lock.json` define the runtime/build dependency graph.
- `pure/dist/` is generated output. Never edit it manually.

Presentation source files contain content and declarative configuration; they do not own their own Reveal runtime.

## Local development

Use the Node version pinned by `.node-version` (the repository currently requires Node `>=24.11.0 <25`).

Start the development server:

```bash
npm start
```

`npm start` performs a deterministic `npm ci --prefix pure` from the committed lockfile before starting Vite.

For a clean production build:

```bash
npm run pure:install
npm run build
```

The build output is written to:

```text
pure/dist/
```

Useful validation commands:

```bash
npm test
npm run pure:audit
npm run presentations:check
npm run presentations:accessibility
npm --prefix pure run audit:sources
npm run pure:smoke
npm run presentations:smoke
```

`npm run build` assumes the locked Pure dependencies are already installed. `npm test`, `npm start` and `npm run pure:check` install them when needed.

## How production deployment works

Production is deliberately a **two-repository build**.

```text
presentation/master
      │
      │ push
      ▼
GitHub Actions: digiguru/presentation/.github/workflows/js.yml
      │
      ├─ Pure validation / audit / browser smoke
      ├─ tooling + metadata + accessibility + lint
      ├─ npm run build
      └─ dispatch-website
            │
            │ workflow_dispatch with exact presentation SHA
            ▼
digiguru/digiguru.github.io/.github/workflows/jekyll.yml
      │
      ├─ checkout digiguru.github.io
      ├─ checkout digiguru/presentation at that exact SHA
      ├─ generate presentation metadata
      ├─ build Jekyll site
      ├─ export Pure into _site/presentation
      ├─ stamp release metadata
      ├─ validate generated site/assets
      ├─ deploy GitHub Pages
      └─ smoke-test deployed site
            │
            ▼
https://art.digiguru.co.uk/presentation/
```

### 1. Presentation CI

On pull requests and pushes to `master`, `.github/workflows/js.yml` runs the presentation checks and production build.

The build job installs the locked Pure dependency graph once, then validates workflow syntax, custom tooling, presentation metadata, accessibility and lint before running `npm run build` and the exported-site Chrome smoke tests.

A separate `pure` job runs the Pure checks, dependency audit and direct Pure Chrome smoke tests.

### 2. Cross-repository dispatch

After a push to `master`, `dispatch-website` calls the `digiguru/digiguru.github.io` `jekyll.yml` workflow using the `WEBSITE_DISPATCH_TOKEN` secret.

The dispatch passes the **full 40-character presentation commit SHA** that triggered the build. This is important: the website does not need to guess which presentation revision should be deployed.

### 3. Website build

The website workflow checks out this repository at the supplied SHA under `presentation-source/`, generates the presentation manifest, builds the main Jekyll site, then runs:

```bash
node presentation-source/scripts/presentations.mjs --export _site/presentation
```

That places the Pure output under the website's `/presentation/` path. Release metadata records both the website SHA and the presentation SHA so a deployed build can be traced back to both repositories.

### 4. GitHub Pages deploy

The completed website artifact is deployed by `actions/deploy-pages`. The website repo then runs a deployed-site smoke test.

The canonical public URL is:

**https://art.digiguru.co.uk/presentation/**

## Vercel previews

Vercel is useful for previews, but it is **not the production hosting path** for `art.digiguru.co.uk/presentation/`.

`vercel.json` uses the same deterministic Pure build:

```text
install: npm run pure:install
build:   npm run build
output:  pure/dist
```

Vercel therefore previews this repository directly, while production embeds the exported build inside the `digiguru.github.io` Pages artifact.

## Key watch-outs

### Do not enable GitHub Pages on this repository

`digiguru/presentation` must not independently claim the production presentation path. Production Pages belongs to `digiguru/digiguru.github.io`.

This previously caused routing conflicts where the old presentation Pages site intercepted `art.digiguru.co.uk/presentation/` instead of the website's exported Pure artifact.

### The website dispatch secret is production infrastructure

`WEBSITE_DISPATCH_TOKEN` must remain configured in this repository and must be allowed to dispatch the website's `jekyll.yml` workflow. If that secret is missing, expired or loses permission, presentation CI can build successfully but the production website will not be asked to rebuild.

### The dispatch currently waits for `build`, not the separate `pure` job

In `.github/workflows/js.yml`, `dispatch-website` currently has:

```yaml
needs: build
```

It does **not** currently depend on the separate `pure` job. A failing `pure` job therefore does not, by itself, prevent the website dispatch if `build` succeeds. If the intention is "every CI job must be green before production dispatch", change the dependency to include both jobs rather than assuming that is already enforced.

### Website pushes can also consume `presentation/master`

The website's `jekyll.yml` also runs for pushes to `digiguru.github.io/main`. When no `presentation_sha` input is supplied, it deliberately checks out `presentation/master`. This is useful for normal website releases, but it means the website repository is also capable of deploying the current presentation `master` independently of this repository's dispatch.

### Keep source and runtime responsibilities separate

Root presentation files are canonical `pure-v1` content. Shared behaviour belongs in `pure/`.

Do not reintroduce:

- deck-owned Reveal runtime bundles
- local Reveal/plugin runtime links
- executable deck-owned Reveal initialization
- a second presentation registry
- hand-edited files in `pure/dist/`

`npm --prefix pure run audit:sources` guards against the historical runtime patterns that the Pure migration removed.

### Preserve presentation metadata

Every presentation must declare at least:

```html
<meta name="presentation-format" content="pure-v1">
<meta name="presentation-name" content="My talk">
<meta name="presentation-version" content="v1.0">
<meta name="presentation-date" content="14/08/2026">
```

`presentation-attendance` is optional. Multiple `presentation-theme` tags are allowed.

### Keep accessibility and background behaviour covered

Every image requires an `alt` attribute.

Backgrounds should remain declarative:

```html
<section data-background-image="assets/example.png" data-background-size="1696px 928px">
```

For vertical stacks, an outer-section background is inherited by children that do not explicitly declare their own background; explicit child backgrounds win. Unit and browser regression tests cover this behaviour.

### Dependency changes must update the Pure lockfile

Runtime/build npm dependencies live in `pure/package.json`. Any dependency change must update `pure/package-lock.json`, and CI/Vercel install with `npm ci --prefix pure`.

## Canonical presentation source format

A minimal source looks like this:

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

Sources may contain inline `<style>` blocks and explicitly required external HTTP(S) styles/scripts. Reveal configuration belongs in the JSON `presentation-options` block.

Do not add document wrappers, a deck-owned `.reveal` wrapper, local Reveal/plugin runtime links or executable deck-owned initialization code.

## Export contract

The website-facing exporter is:

```bash
node scripts/presentations.mjs --manifest /path/to/presentations.yml --export /path/to/site
```

The generated YAML is an export artifact only. There is no repository-owned presentation registry; metadata lives in each canonical source file.

## Dependencies and security

Use:

```bash
npm run pure:audit
```

to audit the dependency graph that actually builds and runs Pure.

The old inherited Reveal.js framework/build tree and historical compatibility parser have been removed. The repository now maintains one presentation source format and one shared runtime.