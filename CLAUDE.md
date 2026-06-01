# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This repository contains a collection of HTML presentations built on reveal.js, a powerful open-source presentation framework. The project includes:

- **HTML Presentations**: Individual `.html` files (one per presentation) in the root directory
- **Presentation Registry**: `presentations.yml` tracks all presentations with metadata (name, version, date, attendance)
- **reveal.js Framework**: Core framework source in `/js`, `/plugin`, `/css`
- **Assets**: Images and other media in `/assets`
- **Build System**: Gulp-based build pipeline with Rollup for bundling

## Development Environment

### Setup
```bash
npm install  # Install dependencies
```

### Running the Server
```bash
npm start    # Runs `gulp serve` on port 8000 (default)
```
The server watches for changes and reloads automatically. Access presentations at `http://localhost:8000/presentation-name.html`

Alternative: `python -m http.server 3000` for a simple Python server on port 3000 (noted in README).

### Building
```bash
npm run build  # Compiles JS and CSS, generates dist/ artifacts
```
This runs `gulp build`, which:
- Bundles reveal.js in ES5 (UMD) and ES6 (ESM) formats to `/dist`
- Compiles Sass themes to `/dist/theme`
- Minifies and autoprefixes CSS
- Minifies JavaScript with Terser

### Testing & Linting
```bash
npm test       # Runs eslint and QUnit tests
npm run build  # CI also runs this before tests
```

## Architecture

### Presentation Files
Each `.html` file in the root is a standalone presentation:
- Embeds reveal.js and custom CSS
- Can have associated `.css` and `.js` files (e.g., `presentation-name.css`, `presentation-name.js`)
- Example: `christmas-lego-movie-sets.html` has `christmas-lego-movie-sets.css` and `christmas-lego-movie-sets.js`

### presentations.yml Registry
Maintains metadata for all presentations:
- **Version scheme**: `vX.Y` where X = last digit of year (3=2023, 4=2024, 5=2025) and Y = sequential talk index
- **Fields**: name, version, date (DD/MM/YYYY), url (filename), attendance
- **Purpose**: Tracking presentation history and analytics
- When adding a new presentation, update `presentations.yml` per the `PRESENTATIONS.md` guide

### reveal.js Framework Structure
- `/js`: Core JavaScript (controllers, components, utils)
- `/plugin`: Optional plugins (highlight, markdown, notes, search, math, zoom)
- `/css`: Base reveal.js styles and theme source files (in `/css/theme/source/*.scss`)
- `/dist`: Compiled output (JavaScript and CSS bundles)

### Build Pipeline
- **Input**: `/js/**/*.js`, `/css/**/*.scss`, `/plugin/**/plugin.js`
- **Processing**: Rollup (with Babel for ES5 transpiling), Sass compilation, Terser minification
- **Output**: `/dist/reveal.js`, `/dist/reveal.esm.js`, `/dist/reveal.css`, `/dist/theme/*.css`

## Common Tasks

### Adding a New Presentation
1. Create a new `.html` file in the root (e.g., `my-talk.html`)
2. Add an entry to `presentations.yml` following the format in `PRESENTATIONS.md`
3. Optionally create associated `.css` and `.js` files if custom styling/scripting is needed
4. Test locally: `npm start` then open `http://localhost:8000/my-talk.html`

### Updating reveal.js Framework
- Modify source files in `/js`, `/plugin`, `/css`
- Run `npm run build` to regenerate `/dist` artifacts
- All presentations will use the built framework when deployed

### Adding reveal.js Plugins
- Plugins live in `/plugin/**/plugin.js`
- Each plugin is bundled separately into `/dist/plugin/*`
- Include in presentations via `<script>` tags linking to the built plugin files in `/dist/plugin`

### Modifying Themes
- Sass theme sources are in `/css/theme/source/*.scss`
- Edit the relevant `.scss` file
- Run `npm run build` to compile to `/dist/theme/*.css`
- Presentations reference themes from `/dist/theme`

## Deployment

The project is deployed via GitHub Pages to `art.digiguru.co.uk/presentation/*`

**CI/CD**: GitHub Actions workflow (`.github/workflows/*.yml`) runs on every push:
1. Checks out code
2. Installs dependencies with npm
3. Runs `npm run build`
4. Runs `npm test` (linting + unit tests)

Ensure all tests pass before merging to keep the deployment clean.

## Code Style & Quality

- **Linting**: ESLint with custom configuration in `package.json` (no curly-bracket requirement, requires `eqeqeq`)
- **Testing**: QUnit tests (see `/test` directory)
- Run `npm test` to check both linting and tests before commits

## Notes for Future Work

- The repository is based on reveal.js v4.4.0 (see `package.json`)
- When modifying reveal.js source, be aware that built files in `/dist` need to be regenerated
- The presentations.yml file should be kept in sync with actual presentation files in the root
- Attendance data in presentations.yml can be updated as numbers become available (currently many marked with `?`)
