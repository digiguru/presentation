import { installFocusBackground } from './focus-background.js';
import { installGptInput } from './gpt-input.js';
export { addSlide } from './slides.js';

export function installPresentationRuntime(deck, capabilities = {}) {
  if (capabilities.focusBackground) installFocusBackground(deck);
  if (capabilities.gptInput) installGptInput(deck);
  return deck;
}
