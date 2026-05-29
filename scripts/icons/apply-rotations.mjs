#!/usr/bin/env node
/**
 * Apply rotation / flip transforms to icons that Figma renders by transforming
 * a shared base vector.
 *
 * Background: `get_design_context` returns one canonical vector URL even for
 * direction-pair icons (arrow-left/right, chevron-top/bottom, etc.). The CSS
 * transform that flips/rotates the displayed icon lives on the wrapper div
 * (e.g. `-scale-x-100`, `-rotate-90`) and was lost during initial extraction.
 *
 * For each affected icon we wrap the SVG inner content in a `<g transform="…">`
 * computed from its viewBox center.
 *
 * The transform map below was harvested by querying `get_design_context` on
 * each non-canonical direction node and reading the Tailwind class. The
 * canonical icons (no transform) keep their downloaded SVG untouched.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const ASSETS_ROOT = path.join(PROJECT_ROOT, 'src/components/mud-icon/assets');

/**
 * Each entry: { size, name, transform } where transform is one of:
 *   'rotate-90' | '-rotate-90' | 'rotate-180' | 'scale-x' | 'scale-y'
 */
const MAP = [
  { size: 16, name: 'arrow-right', transform: 'scale-x' },
  { size: 16, name: 'chevron-right-small', transform: '-rotate-90' },
  { size: 16, name: 'chevron-top-small', transform: 'scale-y' },

  { size: 20, name: 'arrow-down', transform: '-rotate-90' },
  { size: 20, name: 'arrow-right', transform: 'scale-x' },
  { size: 20, name: 'arrow-up', transform: 'rotate-90' },
  { size: 20, name: 'chevron-right', transform: '-rotate-90' },
  { size: 20, name: 'chevron-top', transform: 'scale-y' },
  { size: 20, name: 'chevron-left-small', transform: 'scale-x' },

  { size: 24, name: 'arrow-right', transform: 'scale-x' },
  { size: 24, name: 'chevron-top', transform: 'scale-y' },
  { size: 24, name: 'chevron-right', transform: 'scale-x' },
  { size: 24, name: 'more-vertical', transform: '-rotate-90' },
];

const VIEWBOX_RE = /viewBox="\s*([-\d.]+)\s+([-\d.]+)\s+([\d.]+)\s+([\d.]+)\s*"/;

function buildTransform(kind, vx, vy, w, h) {
  const cx = vx + w / 2;
  const cy = vy + h / 2;
  const fmt = n => String(Number(n.toFixed(5)));
  switch (kind) {
    case 'rotate-90':
      return `rotate(90 ${fmt(cx)} ${fmt(cy)})`;
    case '-rotate-90':
      return `rotate(-90 ${fmt(cx)} ${fmt(cy)})`;
    case 'rotate-180':
      return `rotate(180 ${fmt(cx)} ${fmt(cy)})`;
    case 'scale-x':
      // Horizontal flip around the vertical line x=cx
      return `matrix(-1 0 0 1 ${fmt(2 * cx)} 0)`;
    case 'scale-y':
      // Vertical flip around the horizontal line y=cy
      return `matrix(1 0 0 -1 0 ${fmt(2 * cy)})`;
    default:
      throw new Error(`Unknown transform kind: ${kind}`);
  }
}

function applyTransform(svg, kind) {
  const m = svg.match(VIEWBOX_RE);
  if (!m) throw new Error('no viewBox');
  const [, vxS, vyS, wS, hS] = m;
  const t = buildTransform(kind, Number(vxS), Number(vyS), Number(wS), Number(hS));

  // Insert `<g transform="…">` right after the opening <svg ...> tag and
  // close it before </svg>.
  const openClose = /(<svg\b[^>]*>)([\s\S]*?)(<\/svg>)/i;
  return svg.replace(openClose, (_match, open, body, close) => {
    // If the body already starts with a top-level <g transform="..."> that we
    // emitted previously, replace it rather than nesting.
    const existingG = /^\s*<g transform="[^"]*">[\s\S]*<\/g>\s*$/i;
    let inner = body.trim();
    if (existingG.test(inner)) {
      inner = inner.replace(/^\s*<g transform="[^"]*">/, '').replace(/<\/g>\s*$/, '');
    }
    return `${open}\n<g transform="${t}">\n${inner.trim()}\n</g>\n${close}`;
  });
}

async function main() {
  let changed = 0;
  for (const { size, name, transform } of MAP) {
    const file = path.join(ASSETS_ROOT, String(size), `${name}.svg`);
    let svg;
    try {
      svg = await fs.readFile(file, 'utf8');
    } catch (err) {
      console.error(`[transforms] MISSING ${size}/${name}.svg — skipping`);
      continue;
    }
    const next = applyTransform(svg, transform);
    if (next !== svg) {
      await fs.writeFile(file, next, 'utf8');
      changed++;
      console.log(`[transforms] ${size}/${name} ← ${transform}`);
    }
  }
  console.log(`[transforms] Applied ${changed}/${MAP.length} transforms.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
