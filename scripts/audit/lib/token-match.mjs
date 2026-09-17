/**
 * Name the design tokens behind a style value. A STYLE-MISMATCH row says the
 * Figma value and the rendered value; this adds which custom properties
 * resolve to each, so the fix is a token swap rather than a guess.
 *
 * `vars` is every custom property the element sees (`getComputedStyle`
 * enumerates inherited ones through shadow roots, with `var()` substituted).
 * Palette primitives are excluded: component CSS never references them
 * (AGENTS.md rule 5). Several names for one value are all listed — the
 * computed style cannot say which one the CSS used. Pure — no DOM.
 */
import { compareStyleValue, normalizeColor, splitTopLevel } from './style-values.mjs';

export const TOKEN_MATCH_LIMIT = 5;
const EXCLUDED = /^--palette-/;
const PX_OR_ZERO = /^(-?\d*\.?\d+px|0)$/i;
const NUMBER = /^-?\d*\.?\d+$/;

const kind = t => (normalizeColor(t) ? 'color' : PX_OR_ZERO.test(t) ? 'px' : NUMBER.test(t) ? 'number' : 'other');

function sameKind(prop, tokenValue, value) {
  if (/shadow$/i.test(prop) || /^fontfamily$/i.test(prop)) return true;
  const a = splitTopLevel(value, ' ');
  const b = splitTopLevel(tokenValue, ' ');
  return a.length === b.length && a.every((t, i) => kind(t) === kind(b[i]));
}

export function matchTokens(prop, value, vars, { tolerance = 0.01, limit = TOKEN_MATCH_LIMIT } = {}) {
  const v = String(value ?? '').trim();
  if (!v) return [];
  return Object.entries(vars ?? {})
    .filter(([name, raw]) => !EXCLUDED.test(name) && typeof raw === 'string' && raw.trim() !== '')
    .filter(([, raw]) => sameKind(prop, raw.trim(), v) && compareStyleValue(prop, raw.trim(), v, { tolerance }).pass)
    .map(([name]) => name)
    .sort()
    .slice(0, limit);
}

export function attributeTokens(prop, figmaValue, renderedValue, vars, opts = {}) {
  return {
    expectedTokens: matchTokens(prop, figmaValue, vars, opts),
    observedTokens: matchTokens(prop, renderedValue, vars, opts),
  };
}

export function formatTokens(tokens) {
  if (!tokens) return '';
  const list = names => (names.length ? names.join(', ') : 'none');
  return ` · tokens: rendered = ${list(tokens.observedTokens)}; Figma value = ${list(tokens.expectedTokens)}`;
}
