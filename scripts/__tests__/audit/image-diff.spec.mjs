/**
 * Tests for scripts/audit/lib/image-diff.mjs — canvas preparation and the
 * Pixelmatch wrapper used by scripts/visual-diff.mjs and 11-pixel-diff-states.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

import {
  DEFAULT_PASS,
  DEFAULT_WARN,
  alignOffset,
  classifyDiff,
  describeSizeMismatch,
  diffImages,
  flattenImage,
  padImage,
  parseHexColor,
} from '../../audit/lib/image-diff.mjs';

const SCRIPT = fileURLToPath(new URL('../../visual-diff.mjs', import.meta.url));

/** Solid image; `fill(x, y)` may override individual pixels. */
function image(width, height, rgba, fill) {
  const img = new PNG({ width, height });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const [r, g, b, a] = fill?.(x, y) ?? rgba;
      img.data[i] = r;
      img.data[i + 1] = g;
      img.data[i + 2] = b;
      img.data[i + 3] = a;
    }
  }
  return img;
}

const pixel = (img, x, y) => [...img.data.slice((y * img.width + x) * 4, (y * img.width + x) * 4 + 4)];

describe('image-diff: alignOffset', () => {
  it('top-left anchors at the origin', () => {
    assert.equal(alignOffset(100, 60, 'top-left'), 0);
  });

  it('center splits the spare space', () => {
    assert.equal(alignOffset(100, 60, 'center'), 20);
    assert.equal(alignOffset(101, 60, 'center'), 20);
  });

  it('defaults to top-left', () => {
    assert.equal(alignOffset(100, 60), 0);
  });

  it('rejects unknown modes', () => {
    assert.throws(() => alignOffset(10, 5, 'middle'), /unknown align/);
  });
});

describe('image-diff: parseHexColor', () => {
  it('parses #rrggbb with or without the hash', () => {
    assert.deepEqual(parseHexColor('#1e1e1e'), [30, 30, 30]);
    assert.deepEqual(parseHexColor('FFFFFF'), [255, 255, 255]);
  });

  it('rejects anything else', () => {
    assert.throws(() => parseHexColor('#fff'), /#rrggbb/);
    assert.throws(() => parseHexColor('white'), /#rrggbb/);
  });
});

describe('image-diff: flattenImage', () => {
  it('turns fully transparent pixels into the background colour', () => {
    const out = flattenImage(image(1, 1, [0, 0, 0, 0]), [30, 30, 30]);
    assert.deepEqual(pixel(out, 0, 0), [30, 30, 30, 255]);
  });

  it('keeps opaque pixels and blends translucent ones', () => {
    const out = flattenImage(image(2, 1, [0, 0, 0, 255], x => (x === 1 ? [0, 0, 0, 128] : null)));
    assert.deepEqual(pixel(out, 0, 0), [0, 0, 0, 255]);
    assert.deepEqual(pixel(out, 1, 0), [127, 127, 127, 255]);
  });
});

describe('image-diff: padImage', () => {
  it('fills the new area with the background and places the image at the aligned offset', () => {
    const out = padImage(image(2, 2, [0, 0, 0, 255]), 4, 4, 'center', [10, 20, 30]);
    assert.deepEqual(pixel(out, 0, 0), [10, 20, 30, 255]);
    assert.deepEqual(pixel(out, 1, 1), [0, 0, 0, 255]);
    assert.deepEqual(pixel(out, 3, 3), [10, 20, 30, 255]);
  });

  it('returns the same image when no padding is needed', () => {
    const img = image(3, 3, [1, 2, 3, 255]);
    assert.equal(padImage(img, 3, 3), img);
  });
});

describe('image-diff: diffImages', () => {
  it('reports 0% for identical images', () => {
    const r = diffImages(image(10, 10, [200, 10, 10, 255]), image(10, 10, [200, 10, 10, 255]));
    assert.equal(r.diffPixels, 0);
    assert.equal(r.diffPercent, 0);
    assert.equal(r.sizeMismatch, null);
  });

  it('treats a transparent Figma surround as the page background, not as a difference', () => {
    // Regression: pixelmatch 7 blends alpha against a checkerboard, so every
    // transparent pixel of a Figma export used to count as a diff.
    const figma = image(10, 10, [0, 0, 0, 0], (x, y) =>
      x >= 3 && x < 7 && y >= 3 && y < 7 ? [0, 88, 210, 255] : null,
    );
    const capture = image(10, 10, [255, 255, 255, 255], (x, y) =>
      x >= 3 && x < 7 && y >= 3 && y < 7 ? [0, 88, 210, 255] : null,
    );
    assert.equal(diffImages(figma, capture).diffPixels, 0);
  });

  it('flattens onto a dark background when asked', () => {
    const figma = image(4, 4, [0, 0, 0, 0]);
    const capture = image(4, 4, [30, 30, 30, 255]);
    assert.equal(diffImages(figma, capture, { background: [30, 30, 30] }).diffPixels, 0);
    assert.ok(diffImages(figma, capture).diffPixels > 0);
  });

  it('keeps content above an extra footer aligned with top-left and reports the size', () => {
    const figma = image(8, 6, [255, 255, 255, 255], (x, y) => (y < 2 ? [0, 0, 0, 255] : null));
    const capture = image(8, 10, [255, 255, 255, 255], (x, y) => (y < 2 || y >= 8 ? [0, 0, 0, 255] : null));
    const r = diffImages(figma, capture);
    assert.deepEqual(r.sizeMismatch, { reference: { width: 8, height: 6 }, capture: { width: 8, height: 10 } });
    // Only the footer rows differ; the header rows line up.
    assert.equal(r.diffPixels, 16);
  });
});

describe('image-diff: describeSizeMismatch', () => {
  it('reports CSS px at the capture scale', () => {
    const text = describeSizeMismatch(
      { reference: { width: 688, height: 784 }, capture: { width: 688, height: 876 } },
      2,
    );
    assert.equal(text, 'capture 344×438 vs Figma 344×392 (0 × +46 CSS px at scale 2)');
  });

  it('returns null without a mismatch', () => {
    assert.equal(describeSizeMismatch(null, 2), null);
  });
});

describe('image-diff: classifyDiff', () => {
  it('bands on the shared defaults, with the lower bound exclusive', () => {
    assert.equal(DEFAULT_PASS, 0.5);
    assert.equal(DEFAULT_WARN, 2.0);
    assert.equal(classifyDiff(0.49).status, 'PASS');
    assert.equal(classifyDiff(0.5).status, 'WARNING');
    assert.equal(classifyDiff(1.99).status, 'WARNING');
    assert.equal(classifyDiff(2.0).status, 'FAIL');
  });

  it('is the function 11-pixel-diff-states exports', async () => {
    const eleven = await import('../../audit/11-pixel-diff-states.mjs');
    assert.equal(eleven.classifyDiff, classifyDiff);
  });
});

describe('visual-diff CLI: status', () => {
  it('reports the status classifyDiff gives for the measured percent', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'visual-diff-'));
    const a = path.join(dir, 'a.png');
    const b = path.join(dir, 'b.png');
    fs.writeFileSync(a, PNG.sync.write(image(10, 10, [255, 255, 255, 255])));
    fs.writeFileSync(
      b,
      PNG.sync.write(image(10, 10, [255, 255, 255, 255], (x, y) => (x < 3 && y < 3 ? [0, 0, 0, 255] : null))),
    );
    const res = spawnSync(
      process.execPath,
      [SCRIPT, '--figma', a, '--browser', b, '--output', path.join(dir, 'd.png')],
      { encoding: 'utf8' },
    );
    const out = JSON.parse(res.stdout);
    assert.ok(out.diffPercent > 2, `expected a FAIL-band percent, got ${out.diffPercent}`);
    assert.equal(out.status, classifyDiff(out.diffPercent).status);
  });
});
