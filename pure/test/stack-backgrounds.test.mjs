import assert from 'node:assert/strict';
import test from 'node:test';
import { inheritStackBackgrounds } from '../src/presentation-runtime/stack-backgrounds.js';

function element(attributes = {}, children = [], tagName = 'SECTION') {
  const values = new Map(Object.entries(attributes));
  return {
    tagName,
    children,
    get attributes() {
      return [...values].map(([name, value]) => ({ name, value }));
    },
    hasAttribute(name) { return values.has(name); },
    getAttribute(name) { return values.get(name) ?? null; },
    setAttribute(name, value) { values.set(name, String(value)); },
  };
}

test('inherits stack backgrounds onto vertical children', () => {
  const first = element();
  const second = element({ 'data-background-size': 'contain' });
  const stack = element({
    'data-background-image': 'assets/adamhall.jpg',
    'data-background-size': 'cover',
    'data-background-position': 'center',
    'data-preload': '',
  }, [first, second]);

  const inherited = inheritStackBackgrounds(element({}, [stack], 'DIV'));

  assert.equal(inherited, 2);
  assert.equal(first.getAttribute('data-background-image'), 'assets/adamhall.jpg');
  assert.equal(first.getAttribute('data-background-size'), 'cover');
  assert.equal(first.getAttribute('data-background-position'), 'center');
  assert.equal(first.getAttribute('data-preload'), '');
  assert.equal(second.getAttribute('data-background-image'), 'assets/adamhall.jpg');
  assert.equal(second.getAttribute('data-background-size'), 'contain');
});

test('does not replace an explicit child background', () => {
  const inheritedChild = element();
  const overrideChild = element({ 'data-background': 'black' });
  const stack = element({
    'data-background-image': 'assets/adamhall.jpg',
    'data-background-size': 'cover',
  }, [inheritedChild, overrideChild]);

  inheritStackBackgrounds(element({}, [stack], 'DIV'));

  assert.equal(inheritedChild.getAttribute('data-background-image'), 'assets/adamhall.jpg');
  assert.equal(overrideChild.getAttribute('data-background'), 'black');
  assert.equal(overrideChild.getAttribute('data-background-image'), null);
  assert.equal(overrideChild.getAttribute('data-background-size'), null);
});

test('ignores horizontal slides and stacks without backgrounds', () => {
  const horizontal = element({ 'data-background-image': 'assets/standalone.jpg' });
  const child = element();
  const stack = element({}, [child]);

  const inherited = inheritStackBackgrounds(element({}, [horizontal, stack], 'DIV'));

  assert.equal(inherited, 0);
  assert.equal(child.getAttribute('data-background-image'), null);
  assert.equal(horizontal.getAttribute('data-background-image'), 'assets/standalone.jpg');
});
