/**
 * Name the design tokens behind a style value. A STYLE-MISMATCH row says the
 * Figma value and the rendered value; this adds which custom properties
 * resolve to each, so the fix is a token swap rather than a guess.
 *
 * `vars` is every custom property the element sees (`getComputedStyle`
 * enumerates inherited ones through shadow roots, with `var()` substituted) —
 * about 2,800 in this repo, because every component's tokens sit on `:root`.
 * Matching by value alone therefore names other components' tokens, so:
 *
 * - Palette primitives are excluded: component CSS never references them
 *   (AGENTS.md rule 5).
 * - With `component` and `components` (the names under
 *   `tokens/core/components/`), tokens owned by another component are
 *   excluded. A token belongs to the longest component name it starts with,
 *   so `--button-group-*` is not a `button` token.
 * - Candidates are ranked: the component's own tokens (including its private
 *   `--_*` properties) before semantic ones, and within each, names that carry
 *   the property's words (`gap`, `border` + `radius`, `background`) first.
 *
 * Several names for one value are all listed — the computed style cannot say
 * which one the CSS used. Pure — no DOM, no filesystem.
 */
import { compareStyleValue, normalizeColor, splitTopLevel } from './style-values.mjs';

export const TOKEN_MATCH_LIMIT = 8;
const EXCLUDED = /^--palette-/;
const PX_OR_ZERO = /^(-?\d*\.?\d+px|0)$/i;
const NUMBER = /^-?\d*\.?\d+$/;
const DIRECTION_WORDS = new Set(['top', 'right', 'bottom', 'left', 'row', 'column', 'inline', 'block', 'box']);

const kind = t => (normalizeColor(t) ? 'color' : PX_OR_ZERO.test(t) ? 'px' : NUMBER.test(t) ? 'number' : 'other');

function sameKind(prop, tokenValue, value) {
  if (/shadow$/i.test(prop) || /^fontfamily$/i.test(prop)) return true;
  const a = splitTopLevel(value, ' ');
  const b = splitTopLevel(tokenValue, ' ');
  return a.length === b.length && a.every((t, i) => kind(t) === kind(b[i]));
}

/** `borderTopLeftRadius` → `['border', 'radius']`; `backgroundColor` → `['background']`. */
export function propertyWords(prop) {
  const words = prop
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .split('-')
    .filter(w => !DIRECTION_WORDS.has(w));
  return words.includes('background') ? words.filter(w => w !== 'color') : words;
}

/** The component a token belongs to (longest matching name), or null for a semantic token. */
export function tokenOwner(name, components = []) {
  let owner = null;
  for (const c of components) {
    if (name.startsWith(`--${c}-`) && (owner === null || c.length > owner.length)) owner = c;
  }
  return owner;
}

export function matchTokens(
  prop,
  value,
  vars,
  { tolerance = 0.01, limit = TOKEN_MATCH_LIMIT, component = null, components = [] } = {},
) {
  const v = String(value ?? '').trim();
  if (!v) return [];
  const own = component ? component.replace(/^mud-/, '') : null;
  const words = propertyWords(prop);
  const rank = name => {
    const segments = name.replace(/^--_?/, '').split('-');
    const isOwn = name.startsWith('--_') || (own !== null && tokenOwner(name, components) === own);
    const named = words.every(w => segments.includes(w));
    return (isOwn ? 0 : 2) + (named ? 0 : 1);
  };
  return Object.entries(vars ?? {})
    .filter(([name, raw]) => !EXCLUDED.test(name) && typeof raw === 'string' && raw.trim() !== '')
    .filter(([name]) => {
      const owner = own === null ? null : tokenOwner(name, components);
      return owner === null || owner === own;
    })
    .filter(([, raw]) => sameKind(prop, raw.trim(), v) && compareStyleValue(prop, raw.trim(), v, { tolerance }).pass)
    .map(([name]) => ({ name, rank: rank(name) }))
    .sort((a, b) => a.rank - b.rank || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
    .slice(0, limit)
    .map(t => t.name);
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
