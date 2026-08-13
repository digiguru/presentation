import { installFocusBackground } from './focus-background.js';
export { installLegacyControls } from './legacy-controls.js';
export { addSlide } from './slides.js';

export function installPresentationRuntime(deck, capabilities = {}) {
  if (capabilities.focusBackground) installFocusBackground(deck);
  return deck;
}
