# Digiguru presentations

This repository is the source of truth for presentation files used by the Digiguru website.

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

`presentation-name`, `presentation-version`, and `presentation-date` are required logically, but can be inferred from the title/legacy metadata. Attendance is optional.

Run:

```bash
npm run presentations:check
```

CI runs the same validation. A newly added Reveal deck that cannot provide its metadata will fail the build rather than silently disappearing from the website.

The website build calls `scripts/presentations.mjs` to generate its Jekyll data and export the presentation runtime at build time. There is no runtime GitHub API dependency.

`legacy-presentations.yml` is a frozen compatibility source for historical display names and attendance values. **Do not add new presentations to it.** Git history preserves the old manually maintained registry.

## Website deployment

Changes to `master` are deployed to the main Digiguru website through an event-driven GitHub Actions flow:

1. The `tests` workflow validates presentation metadata, linting, the build and tests.
2. If that build succeeds on a push to `master`, the `dispatch-website` job runs.
3. That job uses the `WEBSITE_DISPATCH_TOKEN` repository secret to trigger the `jekyll.yml` workflow in `digiguru/digiguru.github.io`.
4. The website workflow checks out this repository at `master`, generates the presentation manifest, exports the presentation files and deploys the resulting static site to GitHub Pages.

The website can still be rebuilt manually with its `workflow_dispatch` action. There is no hourly polling job.

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
6. Confirm `digiguru/digiguru.github.io` starts a `Deploy Jekyll site to Pages` run with the `workflow_dispatch` event and deploys successfully.
7. Revoke the old token after the replacement has been verified.

If the source CI is green but `dispatch-website` fails with an authentication or authorization error, check the token expiry, repository selection and **Actions — Read and write** permission first.

## Local presentation server

```bash
python -m http.server 3000
```

or:

```bash
python3 -m http.server 3000
```

## reveal.js

reveal.js is an open source HTML presentation framework. Documentation is available at <https://revealjs.com/>.
