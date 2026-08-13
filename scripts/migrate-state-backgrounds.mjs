import { readFile, writeFile } from 'node:fs/promises';

const files = ['agile-reading.html', 'lightning.html', 'nationwide.html'];
const backgrounds = {
  intro: ['assets/adamhall.jpg', '1578px 1578px'],
  robots: ['assets/robot-wannabe.png', '1696px 928px'],
  art: ['assets/robot-art.png', '1696px 928px'],
  openai: ['assets/robot-welcome.png', '1696px 928px'],
  app: ['assets/robot-dance.png', '1696px 928px'],
  upskilling: ['assets/celebrate2.png', '1696px 928px'],
  sterotypes: ['assets/robot-bully.png', '1696px 928px'],
  misinformation: ['assets/robot-sad.png', '1696px 928px'],
  jobs: ['assets/robot-worry.png', '1696px 928px'],
  conclusion: ['assets/robot-future.png', '1728px 864px'],
  future: ['assets/robot-future2.png', '1696px 928px'],
  links: ['assets/robot-admin.png', '1456px 816px'],
};

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function addDeclarativeBackground(html, state, image, size) {
  const pattern = new RegExp(`<section\\s+data-state=["']${escapeRegExp(state)}["']([^>]*)>`, 'g');
  return html.replace(pattern, (tag, rest) => {
    if (/data-background-image=/.test(tag)) return tag;
    return `<section data-state="${state}" data-background-image="${image}" data-background-size="${size}"${rest}>`;
  });
}

function removeParallaxListener(html, state) {
  const pattern = new RegExp(
    `\\s*Reveal\\.addEventListener\\s*\\(\\s*["']${escapeRegExp(state)}["'][\\s\\S]*?\\n\\s*\\}\\);\\s*\\n\\s*\\}\\);`,
    'g',
  );
  return html.replace(pattern, '');
}

for (const file of files) {
  let html = await readFile(file, 'utf8');

  for (const [state, [image, size]] of Object.entries(backgrounds)) {
    if (new RegExp(`data-state=["']${escapeRegExp(state)}["']`).test(html)) {
      html = addDeclarativeBackground(html, state, image, size);
    }
    html = removeParallaxListener(html, state);
  }

  html = html.replace(/^\s*parallaxBackground(?:Image|Size|Horizontal)\s*:[^\n]*\n/gm, '');

  if (html.includes('parallaxBackgroundImage')) {
    throw new Error(`${file} still contains parallaxBackgroundImage`);
  }

  await writeFile(file, html, 'utf8');
  console.log(`Migrated declarative backgrounds in ${file}`);
}
