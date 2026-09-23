/**
 * Tests for scripts/audit/15-style-parity.mjs — pure comparison. The browser
 * flow is exercised against Storybook with the committed mud-date-picker
 * manifest.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  PSEUDO_PROPS,
  absenceResult,
  compareExpectation,
  componentTokenNames,
  mismatchFinding,
  mismatchTokens,
  targetComponent,
} from '../../audit/15-style-parity.mjs';
import { expectedStyles } from '../../audit/lib/figma-manifest.mjs';

describe('15-style-parity: compareExpectation', () => {
  it('returns one check per property with normalised values', () => {
    const checks = compareExpectation(
      { backgroundColor: '#F5F5F5', borderTopLeftRadius: '6px', boxHeight: '40px' },
      { backgroundColor: 'rgb(232, 240, 251)', borderTopLeftRadius: '6px', boxHeight: '40px' },
    );
    assert.deepEqual(checks, [
      { prop: 'backgroundColor', expected: '#f5f5f5', actual: '#e8f0fb', pass: false },
      { prop: 'borderTopLeftRadius', expected: '6px', actual: '6px', pass: true },
      { prop: 'boxHeight', expected: '40px', actual: '40px', pass: true },
    ]);
  });

  it('fails a property the page did not return', () => {
    const [check] = compareExpectation({ columnGap: '4px' }, {});
    assert.equal(check.pass, false);
  });

  it('passes the tolerance through', () => {
    assert.equal(compareExpectation({ boxWidth: '320px' }, { boxWidth: '320.3px' })[0].pass, false);
    assert.equal(compareExpectation({ boxWidth: '320px' }, { boxWidth: '320.3px' }, { tolerance: 0.5 })[0].pass, true);
  });

  it('exposes the element-derived pseudo properties', () => {
    assert.deepEqual(PSEUDO_PROPS, ['boxWidth', 'boxHeight', 'textContent']);
  });
});

describe('15-style-parity: absenceResult', () => {
  const exp = { target: 'mud-x .footer', node: '157:4570' };

  it('passes when the element Figma does not have is not rendered', () => {
    const { check, message } = absenceResult(exp, 0, 'default');
    assert.equal(check.pass, true);
    assert.equal(check.absent, true);
    assert.equal(message, null);
  });

  it('fails with the node cited when the element is rendered', () => {
    const { check, message } = absenceResult(exp, 1, 'default');
    assert.equal(check.pass, false);
    assert.equal(check.count, 1);
    assert.equal(message, 'default: rendered 1 × mud-x .footer, which Figma 157:4570 does not have');
  });
});

describe('15-style-parity: mismatchTokens', () => {
  const vars = { '--a': '#0058d2', '--b': '#0046a8' };
  it('attributes a failing style check', () => {
    const check = { prop: 'backgroundColor', pass: false };
    const t = mismatchTokens(
      check,
      { styles: { backgroundColor: '#0046A8' } },
      { backgroundColor: 'rgb(0, 88, 210)' },
      vars,
    );
    assert.deepEqual(t, { expectedTokens: ['--b'], observedTokens: ['--a'] });
  });
  it('returns null for a passing check or a pseudo property', () => {
    assert.equal(mismatchTokens({ prop: 'backgroundColor', pass: true }, { styles: {} }, {}, vars), null);
    assert.equal(
      mismatchTokens({ prop: 'boxWidth', pass: false }, { styles: { boxWidth: '1px' } }, { boxWidth: '2px' }, vars),
      null,
    );
  });
});

describe('15-style-parity: token scope', () => {
  it('scopes a target to the innermost mud-* element it selects', () => {
    assert.equal(targetComponent('mud-table tbody tr td.td--selection mud-checkbox .box', 'mud-table'), 'mud-checkbox');
    assert.equal(
      targetComponent("mud-date-picker button.day-cell[data-iso='2025-01-08']", 'mud-date-picker'),
      'mud-date-picker',
    );
    assert.equal(targetComponent('mud-x > mud-icon', 'mud-x'), 'mud-icon');
    assert.equal(targetComponent('.mud-fake .inner', 'mud-x'), 'mud-x');
  });

  it('lists the component token files of this repo without their suffix', () => {
    const names = componentTokenNames();
    assert.ok(names.includes('date-picker'), 'date-picker.tokens.json should be listed');
    assert.ok(names.every(n => !n.endsWith('.json')));
  });
});

describe('15-style-parity: expect[].override (Figma corrections)', () => {
  const figma = { target: 'mud-x', node: '1:2', styles: { color: '#000000' } };
  const corrected = { ...figma, override: { value: '#111111', reason: 'Figma typo', decidedBy: 'Dan' } };
  const rendered = { color: 'rgb(17, 17, 17)' };

  it('a committed override passes when the render matches the corrected value', () => {
    const [check] = compareExpectation(expectedStyles(corrected), rendered);
    assert.equal(check.pass, true);
  });

  it('without the override (e.g. uncommitted, so absent from the HEAD copy) the Figma value is checked', () => {
    const [check] = compareExpectation(expectedStyles(figma), rendered);
    assert.equal(check.pass, false);
    const f = mismatchFinding({ state: 'a', exp: figma, check, manifestRel: 'm.json' });
    assert.deepEqual(f.expected, { value: '#000000', source: 'Figma 1:2' });
    assert.equal(f.actual, '#111111');
    assert.match(f.message, /Figma 1:2 = #000000, rendered #111111/);
  });

  it('a failing check against an override cites the override and who decided it', () => {
    const [check] = compareExpectation(expectedStyles(corrected), { color: 'rgb(0, 0, 0)' });
    const f = mismatchFinding({ state: 'a', exp: corrected, check, manifestRel: 'm.json' });
    assert.equal(f.expected.value, '#111111');
    assert.match(f.expected.source, /override \(Figma typo; decided by Dan\) over Figma 1:2/);
  });
});
