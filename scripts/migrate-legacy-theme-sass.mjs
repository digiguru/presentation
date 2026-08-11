import { readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const templateDir = path.join(root, 'css', 'theme', 'template');
const sourceDir = path.join(root, 'css', 'theme', 'source');
const oldSettings = await readFile(path.join(templateDir, 'settings.scss'), 'utf8');
const configurable = new Set([...oldSettings.matchAll(/^\s*(\$[A-Za-z0-9_-]+)\s*:/gm)].map(match => match[1]));

const modernSettings = `// Base settings for all themes that can optionally be overridden.
@use 'sass:color';

$backgroundColor: #2b2b2b !default;
$mainFont: 'Lato', sans-serif !default;
$mainFontSize: 40px !default;
$mainColor: #eee !default;
$blockMargin: 20px !default;
$headingMargin: 0 0 $blockMargin 0 !default;
$headingFont: 'League Gothic', Impact, sans-serif !default;
$headingColor: #eee !default;
$headingLineHeight: 1.2 !default;
$headingLetterSpacing: normal !default;
$headingTextTransform: uppercase !default;
$headingTextShadow: none !default;
$headingFontWeight: normal !default;
$heading1TextShadow: $headingTextShadow !default;
$heading1Size: 3.77em !default;
$heading2Size: 2.11em !default;
$heading3Size: 1.55em !default;
$heading4Size: 1.00em !default;
$codeFont: monospace !default;
$linkColor: #13DAEC !default;
$linkColorHover: color.adjust($linkColor, $lightness: 20%) !default;
$selectionBackgroundColor: #FF5E99 !default;
$selectionColor: #fff !default;

@mixin bodyBackground() {
  background: $backgroundColor;
}

:root {
  --r-background-color: #{$backgroundColor};
  --r-main-font: #{$mainFont};
  --r-main-font-size: #{$mainFontSize};
  --r-main-color: #{$mainColor};
  --r-block-margin: #{$blockMargin};
  --r-heading-margin: #{$headingMargin};
  --r-heading-font: #{$headingFont};
  --r-heading-color: #{$headingColor};
  --r-heading-line-height: #{$headingLineHeight};
  --r-heading-letter-spacing: #{$headingLetterSpacing};
  --r-heading-text-transform: #{$headingTextTransform};
  --r-heading-text-shadow: #{$headingTextShadow};
  --r-heading-font-weight: #{$headingFontWeight};
  --r-heading1-text-shadow: #{$heading1TextShadow};
  --r-heading1-size: #{$heading1Size};
  --r-heading2-size: #{$heading2Size};
  --r-heading3-size: #{$heading3Size};
  --r-heading4-size: #{$heading4Size};
  --r-code-font: #{$codeFont};
  --r-link-color: #{$linkColor};
  --r-link-color-dark: #{color.adjust($linkColor, $lightness: -15%)};
  --r-link-color-hover: #{$linkColorHover};
  --r-selection-background-color: #{$selectionBackgroundColor};
  --r-selection-color: #{$selectionColor};
}
`;

await writeFile(path.join(templateDir, 'settings.scss'), modernSettings);

const themePath = path.join(templateDir, 'theme.scss');
let theme = await readFile(themePath, 'utf8');
theme = theme
  .replace(/^\s*@import\s+["']\.\/exposer["'];\s*$/m, '')
  .replace('@include bodyBackground();', '@include settings.bodyBackground();');
if (!theme.includes("@use './settings' as settings;")) {
  theme = `@use './settings' as settings;\n\n${theme}`;
}
await writeFile(themePath, theme);
await rm(path.join(templateDir, 'exposer.scss'), { force: true });

const sassImports = /^\s*@import\s+["']\.\.\/template\/(?:mixins|settings|theme)["'];\s*$/gm;
const variableDeclaration = /^\s*(\$[A-Za-z0-9_-]+)\s*:\s*([^;]+);(?:\s*\/\/.*)?\s*$/gm;
const mixins = ['vertical-gradient', 'horizontal-gradient', 'radial-gradient', 'light-bg-text-color', 'dark-bg-text-color'];

for (const entry of await readdir(sourceDir, { withFileTypes: true })) {
  if (!entry.isFile() || !/\.s[ac]ss$/i.test(entry.name)) continue;

  const filePath = path.join(sourceDir, entry.name);
  let source = await readFile(filePath, 'utf8');
  source = source.replace(sassImports, '');

  const declarations = [];
  source = source.replace(variableDeclaration, (full, name, value) => {
    declarations.push({ name, value: value.trim() });
    return '';
  });

  for (const mixin of mixins) {
    source = source.replace(new RegExp(`@include\\s+${mixin}\\s*\\(`, 'g'), `@include mixins.${mixin}(`);
  }

  const configuration = declarations.filter(declaration => configurable.has(declaration.name));
  const localVariables = declarations.map(declaration => `${declaration.name}: ${declaration.value};`).join('\n');
  const withClause = configuration.length
    ? ` with (\n${configuration.map(declaration => `  ${declaration.name}: ${declaration.name}`).join(',\n')}\n)`
    : '';

  const header = [
    "@use 'sass:color';",
    "@use '../template/mixins' as mixins;",
    '',
    localVariables,
    '',
    `@use '../template/settings'${withClause};`,
    "@use '../template/theme';",
    ''
  ].join('\n');

  source = source
    .replace(/\n{3,}/g, '\n\n')
    .trimStart();

  await writeFile(filePath, `${header}${source}\n`);
}

console.log('Migrated legacy Reveal theme sources to configurable Sass modules.');
