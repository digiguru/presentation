import Reveal from 'reveal.js';
import Highlight from 'reveal.js/plugin/highlight/highlight.esm.js';
import Markdown from 'reveal.js/plugin/markdown/markdown.esm.js';
import Notes from 'reveal.js/plugin/notes/notes.esm.js';

import 'reveal.js/dist/reset.css';
import 'reveal.js/dist/reveal.css';
import 'reveal.js/dist/theme/black.css';
import 'reveal.js/dist/plugin/highlight/monokai.css';
import '../../custom.css';
import './stage1.css';

import { installPresentationRuntime } from './presentation-runtime/index.js';

const revealRoot = document.querySelector('.reveal');
if (!revealRoot) throw new Error('Stage 1 presentation is missing its .reveal root.');

const deck = new Reveal(revealRoot, {
  hash: true,
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

installPresentationRuntime(deck);
await deck.initialize();

// Deliberately not window.Reveal: Stage 1 proves our controls can depend on an
// explicit deck instance instead of a fork-specific global. Expose a clearly
// experimental handle only to make browser comparison/debugging easy.
window.stage1Deck = deck;
