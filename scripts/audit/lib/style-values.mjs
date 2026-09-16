/**
 * Normalise and compare CSS values so a Figma spec (`#F5F5F5`, `12px`,
 * `0px 1px 3px 0px rgba(0, 0, 0, 0.08)`) can be checked against what
 * `getComputedStyle` returns (`rgb(245, 245, 245)`, `12px`,
 * `rgba(0, 0, 0, 0.08) 0px 1px 3px 0px`). Pure — no DOM.
 */

const HEX_RE = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const RGB_RE = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)$/i;
const LENGTH_RE = /^(-?\d*\.?\d+)(px)?$/i;

const hex2 = n =>
  Math.round(Math.min(255, Math.max(0, n)))
    .toString(16)
    .padStart(2, '0');

/** Any supported colour → `#rrggbb`, or `#rrggbbaa` when not fully opaque. `null` if not a colour. */
export function normalizeColor(value) {
  if (typeof value !== 'string') return null;
  const v = value.trim().toLowerCase();
  if (v === 'transparent') return '#00000000';
  const hex = v.match(HEX_RE);
  if (hex) {
    let h = hex[1];
    if (h.length <= 4) h = [...h].map(c => c + c).join('');
    if (h.length === 8 && h.endsWith('ff')) h = h.slice(0, 6);
    return `#${h}`;
  }
  const rgb = v.match(RGB_RE);
  if (rgb) {
    const [r, g, b] = [rgb[1], rgb[2], rgb[3]].map(Number);
    let a = 1;
    if (rgb[4] !== undefined) a = rgb[4].endsWith('%') ? parseFloat(rgb[4]) / 100 : Number(rgb[4]);
    const base = `#${hex2(r)}${hex2(g)}${hex2(b)}`;
    return a >= 1 ? base : `${base}${hex2(a * 255)}`;
  }
  return null;
}

/** Split on `sep` at parenthesis depth 0. */
export function splitTopLevel(value, sep = ',') {
  const parts = [];
  let depth = 0;
  let current = '';
  for (const ch of value) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    const isSep = sep === ' ' ? /\s/.test(ch) : ch === sep;
    if (isSep && depth === 0) {
      if (current.trim()) parts.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

/** `12px` / `12` → 12; anything else → null. */
export function parseLength(token) {
  const m = typeof token === 'string' ? token.trim().match(LENGTH_RE) : null;
  return m ? Number(m[1]) : null;
}

/** box-shadow → [{ inset, lengths: [x, y, blur, spread], color }]. `none` → []. */
export function parseShadow(value) {
  if (typeof value !== 'string' || value.trim() === '' || value.trim() === 'none') return [];
  return splitTopLevel(value, ',').map(layer => {
    const tokens = splitTopLevel(layer, ' ');
    const lengths = [];
    let color = '#000000';
    let inset = false;
    for (const t of tokens) {
      if (t.toLowerCase() === 'inset') inset = true;
      else if (parseLength(t) !== null) lengths.push(parseLength(t));
      else if (normalizeColor(t)) color = normalizeColor(t);
    }
    while (lengths.length < 4) lengths.push(0);
    return { inset, lengths, color };
  });
}

/**
 * How far a box-shadow paints outside the border box, per side — the same
 * extent Figma adds to an exported node's render bounds. Inset layers paint
 * inside, so they are ignored.
 */
export function shadowExtents(value) {
  const ext = { top: 0, right: 0, bottom: 0, left: 0 };
  for (const { inset, lengths } of parseShadow(value)) {
    if (inset) continue;
    const [x, y, blur, spread] = lengths;
    const reach = blur + spread;
    ext.left = Math.max(ext.left, reach - x);
    ext.right = Math.max(ext.right, reach + x);
    ext.top = Math.max(ext.top, reach - y);
    ext.bottom = Math.max(ext.bottom, reach + y);
  }
  for (const k of Object.keys(ext)) ext[k] = Math.max(0, Math.ceil(ext[k]));
  return ext;
}

const within = (a, b, tolerance) => Math.abs(a - b) <= tolerance + 1e-9;

/**
 * Compare one expected (Figma) value with one computed value.
 * @returns {{ pass: boolean, expected: string, actual: string }} — normalised forms for reporting.
 */
export function compareStyleValue(prop, expected, actual, { tolerance = 0.01 } = {}) {
  const exp = String(expected).trim();
  const act = String(actual ?? '').trim();

  if (/shadow$/i.test(prop)) {
    const a = parseShadow(exp);
    const b = parseShadow(act);
    const pass =
      a.length === b.length &&
      a.every(
        (layer, i) =>
          layer.inset === b[i].inset &&
          layer.color === b[i].color &&
          layer.lengths.every((n, k) => within(n, b[i].lengths[k], tolerance)),
      );
    const fmt = layers =>
      layers.length === 0
        ? 'none'
        : layers.map(l => `${l.inset ? 'inset ' : ''}${l.lengths.join('px ')}px ${l.color}`).join(', ');
    return { pass, expected: fmt(a), actual: fmt(b) };
  }

  if (/^fontfamily$/i.test(prop)) {
    const first = v => (splitTopLevel(v, ',')[0] ?? '').replace(/["']/g, '').trim().toLowerCase();
    return { pass: first(exp) === first(act), expected: first(exp), actual: first(act) };
  }

  const expColor = normalizeColor(exp);
  if (expColor) {
    const actColor = normalizeColor(act);
    return { pass: expColor === actColor, expected: expColor, actual: actColor ?? act };
  }

  const expTokens = splitTopLevel(exp, ' ');
  const actTokens = splitTopLevel(act, ' ');
  const pass =
    expTokens.length === actTokens.length &&
    expTokens.every((t, i) => {
      const n1 = parseLength(t);
      const n2 = parseLength(actTokens[i]);
      if (n1 !== null && n2 !== null) return within(n1, n2, tolerance);
      return t.toLowerCase() === actTokens[i].toLowerCase();
    });
  return { pass, expected: exp, actual: act };
}
