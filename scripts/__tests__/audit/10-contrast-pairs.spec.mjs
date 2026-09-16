/**
 * Smoke tests for scripts/audit/10-contrast-pairs.mjs
 *
 * Focus is on the pure WCAG math + color parsers. The browser-driving flow is
 * verified manually with Storybook running + Playwright installed.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  parseColor,
  relativeLuminance,
  compositeOver,
  contrastRatio,
  classifyContrast,
  buildPair,
  formatColor,
  resolveBackground,
  DEFAULT_CANVAS,
} from '../../audit/10-contrast-pairs.mjs';

describe('10-contrast-pairs: parseColor', () => {
  it('parses 6-digit hex', () => {
    assert.deepEqual(parseColor('#ff0000'), { r: 255, g: 0, b: 0, a: 1 });
    assert.deepEqual(parseColor('#000000'), { r: 0, g: 0, b: 0, a: 1 });
  });

  it('parses 3-digit hex shorthand', () => {
    assert.deepEqual(parseColor('#f00'), { r: 255, g: 0, b: 0, a: 1 });
  });

  it('parses 8-digit hex with alpha', () => {
    const c = parseColor('#ff000080');
    assert.equal(c.r, 255);
    assert.equal(c.g, 0);
    assert.equal(c.b, 0);
    assert.ok(Math.abs(c.a - 128 / 255) < 0.01);
  });

  it('parses rgb() and rgba()', () => {
    assert.deepEqual(parseColor('rgb(255, 0, 0)'), { r: 255, g: 0, b: 0, a: 1 });
    assert.deepEqual(parseColor('rgba(0, 0, 0, 0.5)'), { r: 0, g: 0, b: 0, a: 0.5 });
  });

  it('parses the color(srgb …) spelling Chromium gives a color-mix()', () => {
    assert.deepEqual(parseColor('color(srgb 0 0 0)'), { r: 0, g: 0, b: 0, a: 1 });
    const mixed = parseColor('color(srgb 0 0.345098 0.823529 / 0.4)');
    assert.deepEqual({ r: mixed.r, g: mixed.g, b: mixed.b }, { r: 0, g: 88, b: 210 });
    assert.ok(Math.abs(mixed.a - 0.4) < 0.001);
  });

  it('clamps an out-of-gamut channel to a real one', () => {
    // color-mix() in a wide-gamut space can serialize srgb components outside
    // 0..1; unclamped they drive the ratio past WCAG's 21:1 ceiling, which
    // passes every threshold.
    assert.deepEqual(parseColor('color(srgb 1.2 1.2 1.2)'), { r: 255, g: 255, b: 255, a: 1 });
    assert.equal(contrastRatio('color(srgb 1.2 1.2 1.2)', 'rgb(0, 0, 0)'), 21);
  });

  it('refuses a color spelling it cannot convert, rather than guessing', () => {
    // display-p3 needs a gamut matrix and oklch a full conversion; returning
    // null is what routes them to the unmeasurable path instead of a number.
    assert.equal(parseColor('color(display-p3 0.2 0.4 0.6)'), null);
    assert.equal(parseColor('oklch(0.7 0.1 250)'), null);
  });

  it('treats "transparent" as fully transparent black', () => {
    assert.deepEqual(parseColor('transparent'), { r: 0, g: 0, b: 0, a: 0 });
  });

  it('returns null for unparseable input', () => {
    assert.equal(parseColor('not a color'), null);
    assert.equal(parseColor(null), null);
    assert.equal(parseColor(''), null);
  });
});

describe('10-contrast-pairs: relativeLuminance', () => {
  it('white = 1.0, black = 0.0', () => {
    assert.equal(relativeLuminance({ r: 255, g: 255, b: 255 }), 1);
    assert.equal(relativeLuminance({ r: 0, g: 0, b: 0 }), 0);
  });

  it('mid-gray is around 0.21', () => {
    const lum = relativeLuminance({ r: 128, g: 128, b: 128 });
    assert.ok(lum > 0.2 && lum < 0.25, `expected ~0.21, got ${lum}`);
  });
});

describe('10-contrast-pairs: compositeOver', () => {
  it('returns fg unchanged when fg is fully opaque', () => {
    const fg = { r: 100, g: 50, b: 25, a: 1 };
    assert.deepEqual(compositeOver(fg, { r: 0, g: 0, b: 0, a: 1 }), fg);
  });

  it('blends transparent fg toward bg', () => {
    const fg = { r: 0, g: 0, b: 0, a: 0.5 };
    const bg = { r: 255, g: 255, b: 255, a: 1 };
    const result = compositeOver(fg, bg);
    assert.deepEqual(result, { r: 128, g: 128, b: 128, a: 1 });
  });
});

describe('10-contrast-pairs: contrastRatio', () => {
  it('black on white = 21:1', () => {
    assert.equal(contrastRatio('#000000', '#ffffff'), 21);
  });

  it('white on black = 21:1 (symmetric)', () => {
    assert.equal(contrastRatio('#ffffff', '#000000'), 21);
  });

  it('same color on same color = 1:1', () => {
    assert.equal(contrastRatio('#ff0000', '#ff0000'), 1);
  });

  it('returns null on unparseable inputs', () => {
    assert.equal(contrastRatio('not a color', '#ffffff'), null);
    assert.equal(contrastRatio('#ffffff', 'broken'), null);
  });

  it('accepts already-parsed color objects', () => {
    const fg = { r: 0, g: 0, b: 0, a: 1 };
    const bg = { r: 255, g: 255, b: 255, a: 1 };
    assert.equal(contrastRatio(fg, bg), 21);
  });

  it('handles rgb() syntax from getComputedStyle', () => {
    assert.equal(contrastRatio('rgb(0, 0, 0)', 'rgb(255, 255, 255)'), 21);
  });
});

describe('10-contrast-pairs: classifyContrast', () => {
  it('normal text passes at 4.5:1, fails below', () => {
    assert.equal(classifyContrast(4.5, 'normal').pass, true);
    assert.equal(classifyContrast(4.49, 'normal').pass, false);
  });

  it('large text passes at 3:1', () => {
    assert.equal(classifyContrast(3, 'large').pass, true);
    assert.equal(classifyContrast(2.99, 'large').pass, false);
  });

  it('UI components pass at 3:1', () => {
    assert.equal(classifyContrast(3, 'ui').pass, true);
  });

  it('disabled elements are exempt regardless of ratio', () => {
    const result = classifyContrast(1.5, 'normal', { disabled: true });
    assert.equal(result.pass, true);
    assert.equal(result.exempt, true);
  });

  it('does not let the disabled exemption swallow an unreadable color', () => {
    // SC 1.4.3 exempts disabled elements from a CONTRAST requirement. It does
    // not make a color the parser cannot read measurable — and the repo's
    // color-mix() tints live on disabled and hover rows, which is precisely
    // where a parser gap would stay invisible.
    const result = classifyContrast(null, 'normal', { disabled: true });
    assert.equal(result.error, 'unmeasurable');
    assert.equal(result.pass, false);
  });

  it('unmeasurable ratio returns pass=false with error', () => {
    const result = classifyContrast(null, 'normal');
    assert.equal(result.pass, false);
    assert.equal(result.error, 'unmeasurable');
  });
});

describe('10-contrast-pairs: resolveBackground', () => {
  it('uses the nearest opaque layer', () => {
    const bg = resolveBackground(['rgb(0, 88, 210)', 'rgb(255, 255, 255)']);
    assert.deepEqual(bg, { r: 0, g: 88, b: 210, a: 1 });
  });

  it('sees through a fully transparent element to the layer behind it', () => {
    // The issue-49 shape: <mud-tab> paints nothing, the story canvas is white.
    const bg = resolveBackground(['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0)', 'rgb(255, 255, 255)']);
    assert.equal(formatColor(bg), 'rgb(255, 255, 255)');
  });

  it('composites a partially transparent layer over what is behind it', () => {
    const bg = resolveBackground(['rgba(0, 0, 0, 0.5)', 'rgb(255, 255, 255)']);
    assert.equal(formatColor(bg), 'rgb(128, 128, 128)');
  });

  it('composites every partially transparent layer, farthest first', () => {
    const bg = resolveBackground(['rgba(0, 0, 0, 0.5)', 'rgba(0, 0, 0, 0.5)', 'rgb(255, 255, 255)']);
    assert.equal(formatColor(bg), 'rgb(64, 64, 64)');
  });

  it('falls back to the canvas when no layer paints anything', () => {
    assert.equal(formatColor(resolveBackground(['rgba(0, 0, 0, 0)'])), DEFAULT_CANVAS);
    assert.equal(formatColor(resolveBackground([])), DEFAULT_CANVAS);
  });

  it('takes the dark canvas when the page reports one', () => {
    const bg = resolveBackground(['rgba(0, 0, 0, 0)'], { fallback: 'rgb(18, 18, 18)' });
    assert.equal(formatColor(bg), 'rgb(18, 18, 18)');
  });

  it('holds the fallback to the same bar as a layer', () => {
    // Substituting white for an unreadable canvas, or promoting a transparent
    // one to opaque black, would invert every verdict in a run rather than
    // one row — and do it with no unmeasurable signal.
    assert.equal(resolveBackground(['rgba(0, 0, 0, 0)'], { fallback: 'oklch(0.2 0 0)' }), null);
    assert.equal(resolveBackground(['rgba(0, 0, 0, 0)'], { fallback: 'rgba(0, 0, 0, 0)' }), null);
  });

  it('does not consult the fallback when a layer already paints', () => {
    const bg = resolveBackground(['rgb(0, 0, 0)'], { fallback: 'not a canvas' });
    assert.equal(formatColor(bg), 'rgb(0, 0, 0)');
  });

  it('reports an unreadable layer instead of dropping it', () => {
    // Dropping it would score the element against the layer BEHIND the one
    // that could not be read, and report a confident wrong ratio for it.
    assert.equal(resolveBackground(['oklch(0.7 0.1 250)', 'rgb(255, 255, 255)']), null);
    assert.equal(resolveBackground(['not a color']), null);
  });

  it('ignores an unreadable layer hidden behind an opaque one', () => {
    // Nothing behind an opaque layer is visible, so nothing behind it is read.
    const bg = resolveBackground(['rgb(255, 255, 255)', 'color(display-p3 0.2 0.4 0.6)']);
    assert.equal(formatColor(bg), 'rgb(255, 255, 255)');
  });

  it('accepts a single layer that is not an array', () => {
    assert.equal(formatColor(resolveBackground('rgb(255, 255, 255)')), 'rgb(255, 255, 255)');
  });
});

describe('10-contrast-pairs: buildPair', () => {
  it('combines sample + ratio + classification', () => {
    const sample = {
      tag: 'mud-button',
      fg: 'rgb(0, 0, 0)',
      bg: 'rgb(255, 255, 255)',
      kind: 'ui',
      disabled: false,
      theme: 'light',
    };
    const pair = buildPair(sample);
    assert.equal(pair.ratio, 21);
    assert.equal(pair.threshold, 3);
    assert.equal(pair.pass, true);
    assert.equal(pair.exempt, false);
  });

  it('flags failing pair', () => {
    const pair = buildPair({
      tag: 'span',
      fg: 'rgb(180, 180, 180)',
      bg: 'rgb(255, 255, 255)',
      kind: 'normal',
      disabled: false,
      theme: 'light',
    });
    assert.equal(pair.pass, false);
    assert.equal(pair.threshold, 4.5);
  });

  it('scores a transparent element against the backdrop, not against transparency', () => {
    // Issue #49: measured on molecules-tabs--default, the selected tab is
    // rgb(0, 88, 210) on the white story canvas — 6.31:1, which passes AA.
    // Scoring it against its own rgba(0, 0, 0, 0) reported 3.33:1 and failed.
    const pair = buildPair({
      tag: 'mud-tab',
      fg: 'rgb(0, 88, 210)',
      bg: 'rgba(0, 0, 0, 0)',
      bgStack: ['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0)', 'rgb(255, 255, 255)'],
      canvas: 'rgb(255, 255, 255)',
      kind: 'normal',
      disabled: false,
      theme: 'light',
    });
    assert.equal(pair.bg, 'rgb(255, 255, 255)');
    assert.equal(pair.bgOwn, 'rgba(0, 0, 0, 0)');
    assert.equal(pair.ratio, 6.31);
    assert.equal(pair.pass, true);
  });

  it('still fails a genuinely low-contrast pair once the backdrop is resolved', () => {
    const pair = buildPair({
      tag: 'mud-tab',
      fg: 'rgb(200, 200, 200)',
      bg: 'rgba(0, 0, 0, 0)',
      bgStack: ['rgba(0, 0, 0, 0)', 'rgb(255, 255, 255)'],
      canvas: 'rgb(255, 255, 255)',
      kind: 'normal',
      disabled: false,
      theme: 'light',
    });
    assert.equal(pair.bg, 'rgb(255, 255, 255)');
    assert.equal(pair.pass, false);
    assert.ok(pair.ratio < 4.5, `expected a failing ratio, got ${pair.ratio}`);
  });

  it('reports unmeasurable rather than a ratio when a layer is unreadable', () => {
    const pair = buildPair({
      tag: 'mud-banner',
      fg: 'rgb(0, 0, 0)',
      bg: 'rgba(0, 0, 0, 0)',
      bgStack: ['rgba(0, 0, 0, 0)', 'oklch(0.7 0.1 250)', 'rgb(255, 255, 255)'],
      canvas: 'rgb(255, 255, 255)',
      kind: 'normal',
      disabled: false,
      theme: 'light',
    });
    assert.equal(pair.bg, null);
    assert.equal(pair.ratio, null);
    assert.equal(pair.error, 'unmeasurable');
    assert.equal(pair.pass, false);
  });

  it('separates an unreadable foreground from an unreadable backdrop', () => {
    // Both land on `unmeasurable`, but they send the reader to different
    // layers, so `bg` — not the error — is what tells them apart.
    const pair = buildPair({
      tag: 'mud-toast',
      fg: 'oklab(0.54 0.096 -0.093)',
      bg: 'rgb(255, 255, 255)',
      bgStack: ['rgb(255, 255, 255)'],
      canvas: 'rgb(255, 255, 255)',
      kind: 'normal',
      disabled: false,
      theme: 'light',
    });
    assert.equal(pair.bg, 'rgb(255, 255, 255)');
    assert.equal(pair.ratio, null);
    assert.equal(pair.error, 'unmeasurable');
  });

  it('measures a transparent element on a dark canvas against that canvas', () => {
    const pair = buildPair({
      tag: 'mud-tab',
      fg: 'rgb(241, 241, 241)',
      bg: 'rgba(0, 0, 0, 0)',
      bgStack: ['rgba(0, 0, 0, 0)', 'rgb(30, 30, 30)'],
      canvas: 'rgb(18, 18, 18)',
      kind: 'normal',
      disabled: false,
      theme: 'dark',
    });
    assert.equal(pair.bg, 'rgb(30, 30, 30)');
    assert.equal(pair.pass, true);
  });
});
