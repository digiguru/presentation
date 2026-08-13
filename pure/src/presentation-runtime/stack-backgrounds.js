const backgroundSourceAttributes = [
  'data-background',
  'data-background-image',
  'data-background-video',
  'data-background-iframe',
  'data-background-color',
  'data-background-gradient',
];

function inheritedBackgroundAttributes(stack) {
  return [...stack.attributes].filter(({ name }) => (
    name === 'data-background'
    || name.startsWith('data-background-')
    || name === 'data-preload'
  ));
}

function hasExplicitBackground(slide) {
  return backgroundSourceAttributes.some(name => slide.hasAttribute(name));
}

/**
 * Reveal treats each vertical child as its own slide background target. Older
 * decks often place a shared background on the outer vertical stack instead.
 * Copy that shared background onto children before Reveal initializes, while
 * preserving any child that explicitly defines its own background.
 */
export function inheritStackBackgrounds(slidesElement) {
  if (!slidesElement?.children) return 0;

  let inheritedSlides = 0;

  for (const stack of slidesElement.children) {
    if (stack.tagName !== 'SECTION') continue;

    const children = [...stack.children].filter(child => child.tagName === 'SECTION');
    if (children.length === 0) continue;

    const attributes = inheritedBackgroundAttributes(stack);
    if (attributes.length === 0) continue;

    for (const slide of children) {
      if (hasExplicitBackground(slide)) continue;

      let inherited = false;
      for (const { name, value } of attributes) {
        if (slide.hasAttribute(name)) continue;
        slide.setAttribute(name, value);
        inherited = true;
      }
      if (inherited) inheritedSlides += 1;
    }
  }

  return inheritedSlides;
}
