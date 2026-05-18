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

  it('unmeasurable ratio returns pass=false with error', () => {
    const result = classifyContrast(null, 'normal');
    assert.equal(result.pass, false);
    assert.equal(result.error, 'unmeasurable');
  });
});

describe('10-contrast-pairs: buildPair', () => {
  it('combines sample + ratio + classification', () => {
    const sample = {
      tag: 'cor-button',
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
});
