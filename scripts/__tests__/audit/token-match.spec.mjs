/**
 * Tests for scripts/audit/lib/token-match.mjs — naming the design token behind
 * a STYLE-MISMATCH value.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  TOKEN_MATCH_LIMIT,
  attributeTokens,
  formatTokens,
  matchTokens,
  propertyWords,
  tokenOwner,
} from '../../audit/lib/token-match.mjs';

const vars = {
  '--color-background-primary-default': '#0058D2',
  '--color-background-primary-hover': '#0046a8',
  '--palette-blue-500': '#0058d2',
  '--spacing-4': '16px',
  '--font-weight-semibold': '16',
  '--radius-md': '6px',
  '--shadow-100': '0px 1px 3px 0px rgba(0, 0, 0, 0.08)',
};

describe('token-match: matchTokens', () => {
  it('matches colours across notations and excludes palette primitives', () => {
    assert.deepEqual(matchTokens('backgroundColor', 'rgb(0, 88, 210)', vars), ['--color-background-primary-default']);
  });

  it('matches a length only against a px (or 0) token, never a unitless number', () => {
    assert.deepEqual(matchTokens('paddingLeft', '16px', vars), ['--spacing-4']);
  });

  it('matches shadows layer by layer regardless of colour position', () => {
    assert.deepEqual(matchTokens('boxShadow', 'rgba(0, 0, 0, 0.08) 0px 1px 3px 0px', vars), ['--shadow-100']);
  });

  it('returns [] when nothing matches or the value is empty', () => {
    assert.deepEqual(matchTokens('backgroundColor', '#123456', vars), []);
    assert.deepEqual(matchTokens('backgroundColor', '', vars), []);
  });

  it('caps the list', () => {
    const many = Object.fromEntries(Array.from({ length: 8 }, (_, i) => [`--alias-${i}`, '6px']));
    assert.equal(matchTokens('borderTopLeftRadius', '6px', many, { limit: 5 }).length, 5);
  });
});

describe('token-match: attributeTokens + formatTokens', () => {
  it('names the rendered token and the token the Figma value would need', () => {
    const t = attributeTokens('backgroundColor', '#0046A8', 'rgb(0, 88, 210)', vars);
    assert.deepEqual(t, {
      expectedTokens: ['--color-background-primary-hover'],
      observedTokens: ['--color-background-primary-default'],
    });
    assert.equal(
      formatTokens(t),
      ' · tokens: rendered = --color-background-primary-default; Figma value = --color-background-primary-hover',
    );
  });

  it('says none, and formats null as empty', () => {
    assert.equal(
      formatTokens({ expectedTokens: [], observedTokens: [] }),
      ' · tokens: rendered = none; Figma value = none',
    );
    assert.equal(formatTokens(null), '');
  });
});

describe('token-match: component scope and ranking', () => {
  const components = ['badge', 'date', 'date-picker', 'button', 'button-group'];
  const scoped = {
    '--badge-offset': '8px',
    '--date-gap': '8px',
    '--date-picker-header-gap': '8px',
    '--date-picker-container-padding': '8px',
    '--spacing-8': '8px',
    '--gap-8': '8px',
    '--_container-gap': '8px',
  };

  it('names the property words, dropping directions and the colour of a background', () => {
    assert.deepEqual(propertyWords('borderTopLeftRadius'), ['border', 'radius']);
    assert.deepEqual(propertyWords('rowGap'), ['gap']);
    assert.deepEqual(propertyWords('backgroundColor'), ['background']);
    assert.deepEqual(propertyWords('paddingLeft'), ['padding']);
  });

  it('attributes a token to the longest component name it starts with', () => {
    assert.equal(tokenOwner('--button-group-gap', components), 'button-group');
    assert.equal(tokenOwner('--button-gap', components), 'button');
    assert.equal(tokenOwner('--date-picker-header-gap', components), 'date-picker');
    assert.equal(tokenOwner('--spacing-8', components), null);
  });

  it("excludes other components' tokens and ranks own, then named, then semantic", () => {
    assert.deepEqual(matchTokens('rowGap', '8px', scoped, { component: 'mud-date-picker', components }), [
      '--_container-gap',
      '--date-picker-header-gap',
      '--date-picker-container-padding',
      '--gap-8',
      '--spacing-8',
    ]);
  });

  it('keeps every value match when no component is given', () => {
    assert.equal(matchTokens('rowGap', '8px', scoped).length, 7);
  });

  it('caps at TOKEN_MATCH_LIMIT by default', () => {
    const many = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`--alias-${i}`, '6px']));
    assert.equal(TOKEN_MATCH_LIMIT, 8);
    assert.equal(matchTokens('borderTopLeftRadius', '6px', many).length, 8);
  });
});
