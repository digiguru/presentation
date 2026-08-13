import Reveal from 'reveal.js';
import Highlight from 'reveal.js/plugin/highlight';
import Markdown from 'reveal.js/plugin/markdown';
import Notes from 'reveal.js/plugin/notes';

import 'reveal.js/reset.css';
import 'reveal.js/reveal.css';
import 'reveal.js/plugin/highlight/monokai.css';
import '../../custom.css';
import './stage1.css';

import { installPresentationRuntime } from './presentation-runtime/index.js';

function readCompatibilityConfig() {
  const element = document.querySelector('#legacy-deck-config');
  if (!element) return { options: {}, capabilities: {} };
  try {
    return JSON.parse(element.textContent || '{}');
  } catch (error) {
    throw new Error(`Could not parse legacy deck compatibility config: ${error.message}`);
  }
}

const revealRoot = document.querySelector('.reveal');
if (!revealRoot) throw new Error('Stage 2 presentation is missing its .reveal root.');

const compatibility = readCompatibilityConfig();
const deck = new Reveal(revealRoot, {
  hash: true,
  ...compatibility.options,
  plugins: [Markdown, Highlight, Notes],
  autoAnimateStyles: [
    'opacity',
    'color',
    'background-color',
    'padding',
    'font-size',
    'line-height',
    'letter-spacing',
    'border-width',
    'border-color',
    'border-radius',
    'outline',
    'outline-offset',
    'grid-template-columns',
    'width',
    'height',
    'transform',
    'margin-top'
  ]
});

installPresentationRuntime(deck, compatibility.capabilities);
await deck.initialize();

document.documentElement.dataset.compatibilitySource = compatibility.source || 'unknown';
document.documentElement.dataset.revealReady = String(deck.isReady());
window.stage2Deck = deck;
