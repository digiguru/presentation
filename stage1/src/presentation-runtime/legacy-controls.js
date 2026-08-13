function loadClassicScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Could not load legacy control script: ${src}`));
    document.head.appendChild(script);
  });
}

function withTimeout(promise, timeoutMs, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(message)), timeoutMs)),
  ]);
}

export async function installLegacyControls(deck, capabilities = {}) {
  if (!capabilities.gptInput) return;

  // Transitional Stage 2 bridge only. The old GPT custom element expects the
  // singleton Reveal global. Reveal 6 keeps the legacy event API on instances,
  // so exposing this one instance lets us prove deck compatibility without
  // carrying forward a fork of Reveal itself. The GPT control will be made a
  // first-class presentation-runtime module before the legacy stack is retired.
  window.Reveal = deck;
  document.documentElement.dataset.legacyRevealGlobal = 'true';

  await loadClassicScript(new URL('js/gpt-component.js', window.location.href).href);
  await withTimeout(
    customElements.whenDefined('gpt-input'),
    5000,
    'Legacy <gpt-input> did not register within 5 seconds.',
  );

  document.documentElement.dataset.gptInputReady = 'true';
}
