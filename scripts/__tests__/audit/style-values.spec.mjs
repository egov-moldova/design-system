/**
 * Tests for scripts/audit/lib/style-values.mjs — normalising Figma spec values
 * and computed styles so 15-style-parity compares like with like.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  compareStyleValue,
  normalizeColor,
  parseLength,
  parseShadow,
  shadowExtents,
  splitTopLevel,
} from '../../audit/lib/style-values.mjs';

const DROP_SHADOW_300 =
  '0px 1px 3px 0px rgba(0, 0, 0, 0.08), 0px 5px 12px 0px rgba(0, 0, 0, 0.08), 0px 0px 0.5px 0px rgba(0, 0, 0, 0.15)';

describe('style-values: normalizeColor', () => {
  it('normalises hex forms', () => {
    assert.equal(normalizeColor('#F5F5F5'), '#f5f5f5');
    assert.equal(normalizeColor('#fff'), '#ffffff');
    assert.equal(normalizeColor('#0058D2FF'), '#0058d2');
    assert.equal(normalizeColor('#00000080'), '#00000080');
  });

  it('normalises rgb() and rgba()', () => {
    assert.equal(normalizeColor('rgb(245, 245, 245)'), '#f5f5f5');
    assert.equal(normalizeColor('rgba(0, 0, 0, 0.08)'), '#00000014');
    assert.equal(normalizeColor('rgba(0, 88, 210, 1)'), '#0058d2');
    assert.equal(normalizeColor('rgb(0 88 210 / 50%)'), '#0058d280');
  });

  it('maps transparent to fully transparent black, like getComputedStyle', () => {
    assert.equal(normalizeColor('transparent'), '#00000000');
    assert.equal(normalizeColor('rgba(0, 0, 0, 0)'), '#00000000');
  });

  it('returns null for non-colours', () => {
    assert.equal(normalizeColor('12px'), null);
    assert.equal(normalizeColor('Onest'), null);
  });
});

describe('style-values: splitTopLevel / parseLength', () => {
  it('splits on commas outside parentheses', () => {
    assert.deepEqual(splitTopLevel('rgba(0, 0, 0, 0.1) 0px, 1px'), ['rgba(0, 0, 0, 0.1) 0px', '1px']);
  });

  it('splits on whitespace outside parentheses', () => {
    assert.deepEqual(splitTopLevel('rgb(1, 2, 3) 0px  4px', ' '), ['rgb(1, 2, 3)', '0px', '4px']);
  });

  it('parses px and unitless numbers only', () => {
    assert.equal(parseLength('12px'), 12);
    assert.equal(parseLength('0.5px'), 0.5);
    assert.equal(parseLength('500'), 500);
    assert.equal(parseLength('50%'), null);
    assert.equal(parseLength('auto'), null);
  });
});

describe('style-values: parseShadow / shadowExtents', () => {
  it('reads layers regardless of where the colour sits', () => {
    const figma = parseShadow('0px 5px 12px 0px rgba(0, 0, 0, 0.08)');
    const computed = parseShadow('rgba(0, 0, 0, 0.08) 0px 5px 12px 0px');
    assert.deepEqual(figma, computed);
    assert.deepEqual(figma[0], { inset: false, lengths: [0, 5, 12, 0], color: '#00000014' });
  });

  it('treats none as no layers', () => {
    assert.deepEqual(parseShadow('none'), []);
  });

  it('computes the render bleed Figma adds for Drop Shadow/300', () => {
    // Verified against the Figma export of date-picker 157:4570: 320×368 → 344×392.
    assert.deepEqual(shadowExtents(DROP_SHADOW_300), { top: 7, right: 12, bottom: 17, left: 12 });
  });

  it('ignores inset layers', () => {
    assert.deepEqual(shadowExtents('inset 0 0 0 4px #000'), { top: 0, right: 0, bottom: 0, left: 0 });
  });
});

describe('style-values: compareStyleValue', () => {
  it('compares colours across notations', () => {
    assert.equal(compareStyleValue('backgroundColor', '#F5F5F5', 'rgb(245, 245, 245)').pass, true);
    const miss = compareStyleValue('backgroundColor', '#F5F5F5', 'rgb(232, 240, 251)');
    assert.equal(miss.pass, false);
    assert.equal(miss.expected, '#f5f5f5');
    assert.equal(miss.actual, '#e8f0fb');
  });

  it('compares lengths within the tolerance', () => {
    assert.equal(compareStyleValue('borderTopWidth', '1.5px', '1px').pass, false);
    assert.equal(compareStyleValue('height', '40px', '40.004px').pass, true);
    assert.equal(compareStyleValue('height', '40px', '40.5px', { tolerance: 0.5 }).pass, true);
  });

  it('compares multi-value properties token by token', () => {
    assert.equal(compareStyleValue('padding', '0px 16px', '0px 16px').pass, true);
    assert.equal(compareStyleValue('padding', '0px 16px', '0px 12px').pass, false);
    assert.equal(compareStyleValue('padding', '12px', '12px 12px').pass, false);
  });

  it('compares box-shadows layer by layer', () => {
    assert.equal(
      compareStyleValue(
        'boxShadow',
        DROP_SHADOW_300,
        'rgba(0, 0, 0, 0.08) 0px 1px 3px 0px, rgba(0, 0, 0, 0.08) 0px 5px 12px 0px, rgba(0, 0, 0, 0.15) 0px 0px 0.5px 0px',
      ).pass,
      true,
    );
    const ring = compareStyleValue(
      'boxShadow',
      '0px 0px 0px 1px #FFFFFF, 0px 0px 0px 3px #3379DB',
      'rgb(255, 255, 255) 0px 0px 0px 1px, rgb(51, 121, 219) 0px 0px 0px 4px',
    );
    assert.equal(ring.pass, false);
    assert.equal(compareStyleValue('boxShadow', 'none', 'none').pass, true);
  });

  it('compares the first font family only', () => {
    assert.equal(compareStyleValue('fontFamily', 'Onest', '"Onest", system-ui, sans-serif').pass, true);
    assert.equal(compareStyleValue('fontFamily', 'Onest', 'Inter, sans-serif').pass, false);
  });

  it('compares text exactly', () => {
    assert.equal(compareStyleValue('textContent', '2020-2030', '2020-2030').pass, true);
    assert.equal(compareStyleValue('textContent', '2020-2030', '2016 - 2027').pass, false);
  });
});
