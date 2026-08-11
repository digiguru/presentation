# Digiguru presentations

This repository is the source of truth for presentation files used by the Digiguru website. It contains the presentation HTML and assets plus the customized Reveal.js runtime used to render them.

## Local setup

The supported runtime is pinned in `.node-version` and must satisfy the `package.json` engine range. With a compatible Node 24 installation:

```bash
npm ci
npm start
```

`npm start` serves the repository with the built-in Node static server used by the test suite and watches the Reveal source for changes. The default address is <http://localhost:8000/>. You can override the host, port or served root with the existing Gulp arguments, for example:

```bash
npm start -- --port 3000
```

Before opening a PR, run the same important checks used by CI:

```bash
npm run presentations:check
npm run presentations:assets
npm run presentations:accessibility
npm run lint
npm run test:tooling
npm run build
gulp qunit
npm run presentations:smoke
npm audit --audit-level=high
```

## Adding a presentation

Create a new Reveal presentation as a root-level `.html` file. There is **no registry file to update**.

A presentation is discovered automatically when the HTML contains both the Reveal `reveal` and `slides` containers.

The easiest metadata convention is to include the version and date in the document title:

```html
<title>My new talk - v6.2 - 11/08/2026</title>
```

The filename automatically becomes the published URL, for example:

```text
my-new-talk.html -> /presentation/my-new-talk.html
```

For unusual titles, add explicit metadata in the `<head>`:

```html
<meta name="presentation-name" content="My new talk">
<meta name="presentation-version" content="v6.2">
<meta name="presentation-date" content="11/08/2026">
<meta name="presentation-attendance" content="40">
```

`presentation-name`, `presentation-version`, and `presentation-date` are required logically, but can be inferred from the title or frozen legacy metadata. Validation is deliberately strict:

- versions use `vX.Y`, for example `v6.2`;
- dates must be real calendar dates in `DD/MM/YYYY` format;
- attendance is optional, but when supplied it must be a non-negative integer.

Run:

```bash
npm run presentations:check
```

CI runs the same validation. A newly added Reveal deck with missing or malformed metadata fails the build rather than silently disappearing from the website.

The website build calls `scripts/presentations.mjs` to generate its Jekyll data and export the presentation runtime at build time. There is no runtime GitHub API dependency.

`legacy-presentations.yml` is a frozen compatibility source for historical display names and attendance values. **Do not add new presentations to it.** Git history preserves the old manually maintained registry.

## Images and accessibility

Every `<img>` in a presentation must have an `alt` attribute. Prefer a short description that communicates what the image contributes to the slide; use `alt=""` only when an image is genuinely decorative.

Check the full presentation set with:

```bash
npm run presentations:accessibility
```

For the historical cleanup there is also a bootstrap fixer:

```bash
npm run presentations:accessibility:fix
```

It derives an initial description from explicit hints, useful asset names and nearby slide context. Automatically added descriptions are marked with `data-generated-alt="true"`. Treat those as a useful baseline: when editing that slide, replace a generated description with a more precise human-written one where the visual meaning needs more context.

Local asset references are validated separately with:

```bash
npm run presentations:assets
```

That validator checks image, script, stylesheet, background, `srcset` and CSS URL references without applying generic HTML link rules that conflict with Reveal's hash-based navigation.

## Tests and CI

The `tests` workflow uses the pinned Node version and runs, in order:

1. `npm ci` with the repository's reviewed install-script policy.
2. `npm audit --audit-level=high`.
3. `actionlint` against the GitHub Actions workflows.
4. Node unit tests for the custom metadata, accessibility and server tooling.
5. Presentation metadata, local-asset and image-alt validation.
6. ESLint.
7. The Reveal build.
8. The Reveal QUnit browser suite.
9. A headless-Chrome smoke test that opens every exported deck and fails on local 404s or a Reveal runtime that never reaches the ready state.

The `build` job is intentionally the single required CI status to use for branch protection on `master`.

### Dependency install scripts

Dependency lifecycle scripts are reviewed explicitly in the `allowScripts` section of `package.json`, and `.npmrc` enables strict enforcement. A new dependency that introduces an unreviewed install script should fail installation until it has been deliberately reviewed and either approved or denied.

The current policy permits the native setup required by `@parcel/watcher` and Puppeteer and denies the non-essential `core-js` postinstall script. Do not use `--dangerously-allow-all-scripts` to bypass this policy in CI.

Dependabot runs weekly for npm and GitHub Actions. Minor and patch updates are grouped; major versions remain separate so breaking changes are reviewed independently.

## Vercel preview deployments

The repository can be connected directly to Vercel to provide a browser-accessible deployment for `master` and automatic Preview Deployments for pull requests and branches.

The Vercel build configuration is version-controlled in `vercel.json`. It runs:

```bash
npm ci
npm run preview:build
```

`npm run preview:build` builds the Reveal runtime and exports the same self-contained static presentation site used by the smoke tests into `preview-site/`. Vercel serves that directory as the deployment output.

Because `vercel.json` owns the install command, build command and output directory, do not duplicate or shorten those commands in the Vercel dashboard. Repository configuration intentionally overrides dashboard Build & Development command values.

For a pull request, use Vercel's branch/PR Preview Deployment to review real presentation behaviour before merging. This is especially useful for Reveal runtime upgrades and visual changes that pass automated smoke tests but still need human browser review.

## Website deployment

Changes to `master` are deployed to the main Digiguru website through an event-driven GitHub Actions flow:

1. The `tests` workflow validates the complete presentation source and runtime.
2. If the `build` job succeeds on a push to `master`, `dispatch-website` runs.
3. It uses the `WEBSITE_DISPATCH_TOKEN` repository secret to trigger the `jekyll.yml` workflow in `digiguru/digiguru.github.io` and passes the exact presentation commit SHA that just passed CI.
4. The website workflow checks out that exact presentation commit, verifies the checkout matches the requested SHA, generates the manifest, exports the presentation files and deploys the static site to GitHub Pages.

Pinning the source SHA makes deployments deterministic: a newer presentation commit landing while a website build is queued cannot silently change the contents of the earlier release.

The website can still be rebuilt manually with its `workflow_dispatch` action. If no `presentation_sha` is supplied for a manual website build, the website intentionally falls back to the current `presentation/master`. There is no hourly polling job.

### Website dispatch token

`WEBSITE_DISPATCH_TOKEN` is a fine-grained GitHub personal access token. Keep its access deliberately narrow:

- Resource owner: `digiguru`.
- Repository access: only `digiguru.github.io`.
- Repository permission: **Actions — Read and write**.
- Store the token only as the `WEBSITE_DISPATCH_TOKEN` Actions secret in this repository; never commit it to the repository.

To rotate or replace the token:

1. In GitHub, open **Settings → Developer settings → Personal access tokens → Fine-grained tokens**.
2. Generate a replacement token with the repository and permission scope above.
3. Open this repository's **Settings → Secrets and variables → Actions**.
4. Update the `WEBSITE_DISPATCH_TOKEN` repository secret with the new token value.
5. Merge a small safe change to `master` and confirm the `tests` workflow completes successfully, including the `dispatch-website` job.
6. Confirm `digiguru/digiguru.github.io` starts its Jekyll workflow for the exact presentation SHA and deploys successfully.
7. Revoke the old token after the replacement has been verified.

If the source CI is green but `dispatch-website` fails with an authentication or authorization error, check the token expiry, repository selection and **Actions — Read and write** permission first.

## Branch protection

`master` should be protected so changes cannot bypass the validation above. Require the `build` status check before merge and keep direct pushes restricted according to the repository's normal ownership model. This is a repository setting rather than source-controlled workflow configuration.

## Reveal.js maintenance

This repository started as a Reveal.js fork and preserves the upstream Reveal copyright and MIT licence. The package is marked `private` because this repository is an application/source repository rather than an npm package intended for publication.

The build uses Dart Sass's modern JavaScript API and the Sass module system. When changing inherited Reveal styles, keep the source free of deprecated Sass `@import`, global built-ins and legacy color helpers so future Sass upgrades do not turn warnings into build failures.

Reveal.js is an open-source HTML presentation framework. Documentation is available at <https://revealjs.com/>.
