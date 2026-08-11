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
