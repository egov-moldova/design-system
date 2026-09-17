/**
 * Tests for scripts/audit/lib/state-page.mjs — pure helpers. The browser flow
 * is exercised by running 11/15 against Storybook.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { captureClip, maskRects, stateUrl } from '../../audit/lib/state-page.mjs';

describe('state-page: stateUrl', () => {
  it('builds the story iframe url', () => {
    const url = new URL(stateUrl({ story: 'molecules-date-picker--default', theme: 'light' }, 'http://localhost:6007'));
    assert.equal(url.pathname, '/iframe.html');
    assert.equal(url.searchParams.get('id'), 'molecules-date-picker--default');
    assert.equal(url.searchParams.get('viewMode'), 'story');
    assert.equal(url.searchParams.get('globals'), null);
  });

  it('switches the Storybook theme and background globals for dark states', () => {
    const url = new URL(stateUrl({ story: 'a--b', theme: 'dark' }, 'http://localhost:6007'));
    assert.equal(url.searchParams.get('globals'), 'mode:dark;backgrounds.value:dark');
  });
});

describe('state-page: captureClip', () => {
  const viewport = { width: 1280, height: 900 };
  const bleed = { top: 7, right: 12, bottom: 17, left: 12 };

  it('grows the element box by the shadow bleed', () => {
    // Drop Shadow/300 on a 320×368 picker → the 344×392 canvas Figma exports.
    const clip = captureClip({ x: 100, y: 100, width: 320, height: 368 }, bleed, viewport);
    assert.deepEqual(clip, { x: 88, y: 93, width: 344, height: 392 });
  });

  it('clamps to the viewport edges instead of asking for pixels outside it', () => {
    const clip = captureClip({ x: 4, y: 2, width: 100, height: 50 }, bleed, viewport);
    assert.deepEqual(clip, { x: 0, y: 0, width: 116, height: 69 });
  });

  it('never exceeds the viewport size', () => {
    const clip = captureClip({ x: 1200, y: 860, width: 100, height: 60 }, bleed, viewport);
    assert.equal(clip.x + clip.width <= viewport.width, true);
    assert.equal(clip.y + clip.height <= viewport.height, true);
  });

  it('is a no-op box when there is no shadow', () => {
    const none = { top: 0, right: 0, bottom: 0, left: 0 };
    assert.deepEqual(captureClip({ x: 10, y: 20, width: 30, height: 40 }, none, viewport), {
      x: 10,
      y: 20,
      width: 30,
      height: 40,
    });
  });
});

describe('state-page: maskRects', () => {
  it('maps element boxes into capture pixels relative to the clip', () => {
    assert.deepEqual(
      maskRects([{ x: 110, y: 60, width: 20, height: 10 }], { x: 100, y: 50, width: 200, height: 100 }, 2),
      [{ x: 20, y: 20, width: 40, height: 20 }],
    );
  });

  it('clips boxes to the capture and drops boxes outside it', () => {
    const clip = { x: 100, y: 50, width: 200, height: 100 };
    assert.deepEqual(
      maskRects(
        [
          { x: 90, y: 140, width: 30, height: 30 },
          { x: 100, y: 200, width: 50, height: 10 },
        ],
        clip,
        1,
      ),
      [{ x: 0, y: 90, width: 20, height: 10 }],
    );
  });

  it('rounds the start down and the end up, so edge pixels stay masked', () => {
    assert.deepEqual(
      maskRects([{ x: 10.3, y: 0, width: 5.2, height: 1 }], { x: 0, y: 0, width: 100, height: 100 }, 2),
      [{ x: 20, y: 0, width: 11, height: 2 }],
    );
  });
});
