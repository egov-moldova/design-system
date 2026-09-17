/**
 * Pixelmatch comparison of two decoded PNGs — the one place the diff algorithm,
 * canvas preparation and thresholds live. Used by `scripts/visual-diff.mjs`
 * (CLI) and, through it, by `11-pixel-diff-states.mjs`.
 *
 * Two preparation steps decide whether the percentage means anything:
 *
 * 1. Flatten onto the page background. Figma exports are RGBA with a
 *    transparent surround; browser captures are opaque. pixelmatch 7 blends
 *    translucent pixels against a synthetic checkerboard, not white, so every
 *    transparent pixel of a Figma export counts as a difference — the whole
 *    shadow margin of a component turned red in the diff image. Both images
 *    are composited over the same opaque background first.
 *
 * 2. Share one canvas. Captures from `11-pixel-diff-states` include the same
 *    shadow bleed Figma adds to exported render bounds, so both images start at
 *    the same origin and `top-left` keeps them aligned even when the capture is
 *    taller (an extra footer shifts nothing above it). `center` is for images
 *    whose margins are symmetric but unmatched. The size difference itself is
 *    always reported separately so it is never hidden inside a percentage.
 */
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

export const ALIGN_MODES = ['top-left', 'center'];
export const WHITE = [255, 255, 255];

/** Percent diff below which a comparison is PASS, and below which it is still WARNING. */
export const DEFAULT_PASS = 0.5;
export const DEFAULT_WARN = 2.0;

export function classifyDiff(diffPercent, { passThreshold = DEFAULT_PASS, warnThreshold = DEFAULT_WARN } = {}) {
  if (diffPercent === null || diffPercent === undefined || Number.isNaN(diffPercent)) {
    return { status: 'UNKNOWN', requiresReview: true };
  }
  if (diffPercent < passThreshold) return { status: 'PASS', requiresReview: false };
  if (diffPercent < warnThreshold) return { status: 'WARNING', requiresReview: true };
  return { status: 'FAIL', requiresReview: false };
}

/** Offset that places an image of size `inner` inside a canvas of size `outer`. */
export function alignOffset(outer, inner, align = 'top-left') {
  if (!ALIGN_MODES.includes(align)) throw new Error(`unknown align "${align}" (expected ${ALIGN_MODES.join(' | ')})`);
  if (align === 'top-left') return 0;
  return Math.floor((outer - inner) / 2);
}

/** `#rrggbb` → [r, g, b]. */
export function parseHexColor(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex ?? '').trim());
  if (!m) throw new Error(`background must be #rrggbb, got "${hex}"`);
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Composite every pixel over an opaque background; the result has no transparency. */
export function flattenImage(img, background = WHITE) {
  const out = new PNG({ width: img.width, height: img.height });
  const [br, bg, bb] = background;
  for (let i = 0; i < img.data.length; i += 4) {
    const a = img.data[i + 3] / 255;
    out.data[i] = Math.round(img.data[i] * a + br * (1 - a));
    out.data[i + 1] = Math.round(img.data[i + 1] * a + bg * (1 - a));
    out.data[i + 2] = Math.round(img.data[i + 2] * a + bb * (1 - a));
    out.data[i + 3] = 255;
  }
  return out;
}

/** Copy `img` onto a `width`×`height` canvas filled with `background`, at the aligned offset. */
export function padImage(img, width, height, align = 'top-left', background = WHITE) {
  if (img.width === width && img.height === height) return img;
  const padded = new PNG({ width, height });
  for (let i = 0; i < padded.data.length; i += 4) {
    padded.data[i] = background[0];
    padded.data[i + 1] = background[1];
    padded.data[i + 2] = background[2];
    padded.data[i + 3] = 255;
  }
  const dx = alignOffset(width, img.width, align);
  const dy = alignOffset(height, img.height, align);
  PNG.bitblt(img, padded, 0, 0, img.width, img.height, dx, dy);
  return padded;
}

/**
 * Diff two decoded PNGs.
 *
 * @param {PNG} reference   — Figma export
 * @param {PNG} capture     — browser capture
 * @param {object} [opts]
 * @param {number} [opts.threshold=0.1]        — pixelmatch colour sensitivity (0–1, lower = stricter)
 * @param {'top-left'|'center'} [opts.align='top-left']
 * @param {number[]} [opts.background=[255,255,255]] — page background both images are flattened onto
 * @returns {{ width, height, diffPixels, totalPixels, diffPercent, sizeMismatch, diffImage }}
 */
export function diffImages(reference, capture, { threshold = 0.1, align = 'top-left', background = WHITE } = {}) {
  // Validate up front: with equally sized images padImage never runs, and an
  // unknown mode would otherwise be echoed back as if it had been applied.
  alignOffset(0, 0, align);
  const width = Math.max(reference.width, capture.width);
  const height = Math.max(reference.height, capture.height);
  const sizeMismatch =
    reference.width !== capture.width || reference.height !== capture.height
      ? {
          reference: { width: reference.width, height: reference.height },
          capture: { width: capture.width, height: capture.height },
        }
      : null;

  const a = padImage(flattenImage(reference, background), width, height, align, background);
  const b = padImage(flattenImage(capture, background), width, height, align, background);
  const diffImage = new PNG({ width, height });
  const diffPixels = pixelmatch(a.data, b.data, diffImage.data, width, height, {
    threshold,
    includeAA: false,
    alpha: 0.1,
    diffColor: [255, 0, 0],
    diffColorAlt: [0, 255, 0],
  });
  const totalPixels = width * height;
  return {
    width,
    height,
    diffPixels,
    totalPixels,
    diffPercent: Number(((diffPixels / totalPixels) * 100).toFixed(2)),
    sizeMismatch,
    diffImage,
  };
}

/**
 * Describe a size mismatch in CSS pixels. Figma exports and captures are both
 * taken at `scale`, so dividing by it gives numbers comparable to the design.
 */
export function describeSizeMismatch(sizeMismatch, scale = 1) {
  if (!sizeMismatch) return null;
  const css = v => Math.round((v / scale) * 100) / 100;
  const { reference, capture } = sizeMismatch;
  const dw = css(capture.width - reference.width);
  const dh = css(capture.height - reference.height);
  const signed = v => (v > 0 ? `+${v}` : `${v}`);
  return (
    `capture ${css(capture.width)}×${css(capture.height)} vs Figma ${css(reference.width)}×${css(reference.height)} ` +
    `(${signed(dw)} × ${signed(dh)} CSS px at scale ${scale})`
  );
}
