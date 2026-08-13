function backgroundContent(deck, slide) {
  const background = deck.getSlideBackground?.(slide);
  return background?.querySelector?.('.slide-background-content')
    || slide?.slideBackgroundContentElement
    || null;
}

export function updateFocusBackground(deck, slide = deck.getCurrentSlide()) {
  if (!slide) return;

  const content = backgroundContent(deck, slide);
  if (!content) return;

  const focused = slide.dataset.state === 'focus-bg';
  content.classList.toggle('focus', focused);
  content.classList.toggle('blur', !focused);
}

export function installFocusBackground(deck) {
  deck.on('ready', event => updateFocusBackground(deck, event.currentSlide));
  deck.on('slidechanged', event => updateFocusBackground(deck, event.currentSlide));
}
