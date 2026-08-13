export function addSlide(deck, content = '') {
  const currentSlide = deck.getCurrentSlide();
  if (!currentSlide) throw new Error('Cannot add a slide before Reveal is ready.');

  const newSlide = document.createElement('section');
  newSlide.classList.add('future');
  newSlide.dataset.autoAnimate = '';
  newSlide.innerHTML = content;
  currentSlide.insertAdjacentElement('afterend', newSlide);
  deck.sync();
  return newSlide;
}
