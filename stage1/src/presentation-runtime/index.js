import { installFocusBackground } from './focus-background.js';
export { addSlide } from './slides.js';

export function installPresentationRuntime(deck) {
  installFocusBackground(deck);
  return deck;
}
