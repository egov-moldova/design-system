import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  STORY_BLOCK_SELECTOR,
  VISIBLE_ATTRIBUTE,
  installDocsStoryOverflow,
  markFittingStoryBlocks,
} from '../../.storybook/docs-story-overflow.mjs';

// A `.docs-story` box: `contentWidth` is how wide its story renders, `width` the box.
function storyBlock({ width = 800, contentWidth = 800 } = {}) {
  const attributes = new Set();
  return {
    width,
    contentWidth,
    hasAttribute: name => attributes.has(name),
    toggleAttribute(name, force) {
      if (force) attributes.add(name);
      else attributes.delete(name);
    },
    get clientWidth() {
      return this.width;
    },
    get scrollWidth() {
      return Math.max(this.width, this.contentWidth);
    },
  };
}

// Answers only the story-block selector, so a wrong selector finds nothing.
const documentWith = blocks => ({
  querySelectorAll: selector => (selector === STORY_BLOCK_SELECTOR ? blocks : []),
  body: {},
});

// An event target that removes a listener only when handed the same function.
function eventTarget() {
  const listeners = new Map();
  return {
    listeners,
    addEventListener: (type, fn) => listeners.set(type, fn),
    removeEventListener(type, fn) {
      if (listeners.get(type) === fn) listeners.delete(type);
    },
  };
}

// A window whose frames, listeners and observers are queues the test drains by hand.
function fakeWindow(blocks) {
  const frames = new Map();
  const observers = [];
  const fonts = eventTarget();
  const events = eventTarget();
  let nextFrame = 1;
  const win = {
    ...events,
    document: { ...documentWith(blocks), fonts },
    requestAnimationFrame(callback) {
      frames.set(nextFrame, callback);
      return nextFrame++;
    },
    cancelAnimationFrame: id => frames.delete(id),
    MutationObserver: class {
      constructor(callback) {
        this.callback = callback;
        this.connected = false;
        observers.push(this);
      }
      observe(target, options) {
        this.connected = true;
        this.options = options;
      }
      disconnect() {
        this.connected = false;
      }
    },
  };
  const flushFrames = () => {
    const pending = [...frames.values()];
    frames.clear();
    for (const callback of pending) callback();
  };
  return { win, frames, listeners: events.listeners, fontListeners: fonts.listeners, observers, flushFrames };
}

describe('markFittingStoryBlocks', () => {
  it('lets a story that fits its box overflow it', () => {
    const block = storyBlock();

    markFittingStoryBlocks(documentWith([block]));

    assert.equal(block.hasAttribute(VISIBLE_ATTRIBUTE), true);
  });

  it('leaves a story wider than its box in the scrolling box', () => {
    const block = storyBlock({ width: 760, contentWidth: 1576 });

    markFittingStoryBlocks(documentWith([block]));

    assert.equal(block.hasAttribute(VISIBLE_ATTRIBUTE), false);
  });

  it('ignores a sub-pixel difference', () => {
    const block = storyBlock({ width: 760, contentWidth: 760.5 });

    markFittingStoryBlocks(documentWith([block]));

    assert.equal(block.hasAttribute(VISIBLE_ATTRIBUTE), true);
  });

  it('follows the viewport in both directions', () => {
    const block = storyBlock({ width: 1200, contentWidth: 1000 });
    markFittingStoryBlocks(documentWith([block]));
    assert.equal(block.hasAttribute(VISIBLE_ATTRIBUTE), true);

    block.width = 760;
    markFittingStoryBlocks(documentWith([block]));
    assert.equal(block.hasAttribute(VISIBLE_ATTRIBUTE), false);

    block.width = 1200;
    markFittingStoryBlocks(documentWith([block]));
    assert.equal(block.hasAttribute(VISIBLE_ATTRIBUTE), true);
  });
});

describe('installDocsStoryOverflow', () => {
  it('marks the blocks already on the page on the next frame', () => {
    const block = storyBlock();
    const { win, flushFrames } = fakeWindow([block]);

    installDocsStoryOverflow(win);
    assert.equal(block.hasAttribute(VISIBLE_ATTRIBUTE), false);
    flushFrames();

    assert.equal(block.hasAttribute(VISIBLE_ATTRIBUTE), true);
  });

  it('re-measures after a story mounts or hydrates, fonts load, or the viewport resizes', () => {
    const block = storyBlock();
    const { win, listeners, fontListeners, observers, flushFrames } = fakeWindow([block]);
    installDocsStoryOverflow(win);
    flushFrames();

    block.contentWidth = 1200;
    observers[0].callback([]);
    flushFrames();
    assert.equal(block.hasAttribute(VISIBLE_ATTRIBUTE), false);

    block.width = 1400;
    listeners.get('resize')();
    flushFrames();
    assert.equal(block.hasAttribute(VISIBLE_ATTRIBUTE), true);

    block.contentWidth = 1500;
    fontListeners.get('loadingdone')();
    flushFrames();
    assert.equal(block.hasAttribute(VISIBLE_ATTRIBUTE), false);
  });

  it('watches mounts and the hydration class, never its own attribute', () => {
    const { win, observers } = fakeWindow([]);

    installDocsStoryOverflow(win);

    assert.deepEqual(observers[0].options, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    });
  });

  it('coalesces a burst of changes into one pass per frame', () => {
    const { win, frames, observers, flushFrames } = fakeWindow([]);
    installDocsStoryOverflow(win);
    flushFrames();

    observers[0].callback([]);
    observers[0].callback([]);
    observers[0].callback([]);

    assert.equal(frames.size, 1);
  });

  it('removes the exact listeners it added once uninstalled', () => {
    const { win, frames, listeners, fontListeners, observers } = fakeWindow([]);

    const uninstall = installDocsStoryOverflow(win);
    uninstall();

    assert.equal(observers[0].connected, false);
    assert.equal(listeners.has('resize'), false);
    assert.equal(fontListeners.has('loadingdone'), false);
    assert.equal(frames.size, 0);
  });
});
