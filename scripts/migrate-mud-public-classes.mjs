/**
 * Migrate public class names in HTML → `mud-*` (matches updated SCSS utilities).
 * Usage: node scripts/migrate-mud-public-classes.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const components = path.join(__dirname, '..', 'Components');

function walkHtml(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walkHtml(p, acc);
    else if (ent.name.endsWith('.html')) acc.push(p);
  }
  return acc;
}

function applyRules(s) {
  let o = s;

  const dMap = {
    none: 'hidden',
    block: 'block',
    inline: 'inline',
    'inline-block': 'inline-block',
    flex: 'flex',
    'inline-flex': 'inline-flex',
    grid: 'grid',
    'inline-grid': 'inline-grid',
    table: 'table',
    'table-cell': 'table-cell',
  };

  o = o.replace(/\bd-(xs|sm|md|lg|xl|xxl)-([a-z-]+)\b/g, (_, bp, rest) => {
    const cls = dMap[rest] ?? rest;
    return `mud-${bp}-${cls}`;
  });
  const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const dKeys = Object.keys(dMap).sort((a, b) => b.length - a.length);
  for (const d of dKeys) {
    const cls = dMap[d];
    o = o.replace(new RegExp(`\\bd-${escRe(d)}\\b`, 'g'), `mud-${cls}`);
  }

  const sp = 'p|pt|pb|pl|pr|px|py|m|mt|mb|ml|mr|mx|my|gap|row-gap|column-gap';
  o = o.replace(new RegExp(`\\b(${sp})-(xs|sm|md|lg|xl|xxl)-(\\d+)\\b`, 'g'), 'mud-$1-$2-$3');
  o = o.replace(new RegExp(`\\b(${sp})-(\\d+)\\b`, 'g'), 'mud-$1-$2');

  o = o.replace(/\bflex-column-reverse\b/g, 'mud-flex-column-reverse');
  o = o.replace(/\bflex-column\b/g, 'mud-flex-col');
  o = o.replace(/\bflex-row-reverse\b/g, 'mud-flex-row-reverse');
  o = o.replace(/\bflex-row\b/g, 'mud-flex-row');
  o = o.replace(/\bflex-wrap-reverse\b/g, 'mud-flex-wrap-reverse');
  o = o.replace(/\bflex-wrap\b/g, 'mud-flex-wrap');
  o = o.replace(/\bflex-nowrap\b/g, 'mud-flex-nowrap');
  o = o.replace(/\bflex-reverse\b/g, 'mud-flex-wrap-reverse');
  o = o.replace(/\bflex-(xs|sm|md|lg|xl|xxl)-(wrap-reverse|wrap|nowrap|row-reverse|column-reverse|col|row)\b/g, 'mud-flex-$1-$2');

  o = o.replace(/\bflex-grow-0\b/g, 'mud-flex-grow-0');
  o = o.replace(/\bflex-grow-1\b/g, 'mud-flex-grow-1');
  o = o.replace(/\bflex-shrink-0\b/g, 'mud-flex-shrink-0');
  o = o.replace(/\bflex-shrink-1\b/g, 'mud-flex-shrink-1');

  o = o.replace(/\balign-items-start\b/g, 'mud-items-start');
  o = o.replace(/\balign-items-end\b/g, 'mud-items-end');
  o = o.replace(/\balign-items-center\b/g, 'mud-items-center');
  o = o.replace(/\balign-items-baseline\b/g, 'mud-items-baseline');
  o = o.replace(/\balign-items-stretch\b/g, 'mud-items-stretch');
  o = o.replace(/\balign-items-(xs|sm|md|lg|xl|xxl)-(start|end|center|baseline|stretch)\b/g, 'mud-items-$1-$2');

  o = o.replace(/\bjustify-content-start\b/g, 'mud-justify-start');
  o = o.replace(/\bjustify-content-end\b/g, 'mud-justify-end');
  o = o.replace(/\bjustify-content-center\b/g, 'mud-justify-center');
  o = o.replace(/\bjustify-content-between\b/g, 'mud-justify-between');
  o = o.replace(/\bjustify-content-around\b/g, 'mud-justify-around');
  o = o.replace(/\bjustify-content-evenly\b/g, 'mud-justify-evenly');
  o = o.replace(/\bjustify-start\b/g, 'mud-justify-start');
  o = o.replace(/\bjustify-end\b/g, 'mud-justify-end');
  o = o.replace(/\bjustify-center\b/g, 'mud-justify-center');
  o = o.replace(/\bjustify-between\b/g, 'mud-justify-between');
  o = o.replace(/\bjustify-around\b/g, 'mud-justify-around');
  o = o.replace(/\bjustify-evenly\b/g, 'mud-justify-evenly');
  o = o.replace(/\bjustify-(xs|sm|md|lg|xl|xxl)-(start|end|center|between|around|evenly)\b/g, 'mud-justify-$1-$2');

  o = o.replace(/\btext-desktop-/g, 'mud-desktop-');
  o = o.replace(/\btext-mobile-/g, 'mud-mobile-');
  o = o.replace(/\btext-documentation-mono-xl\b/g, 'mud-documentation-mono-xl');

  o = o.replace(/\btext-body-/g, 'mud-type-body-');
  o = o.replace(/\btext-display-/g, 'mud-type-display-');
  o = o.replace(/\btext-heading-/g, 'mud-type-heading-');
  o = o.replace(/\btext-caption-/g, 'mud-type-caption-');

  const palette = [
    'gray',
    'blue-sky',
    'lavender',
    'purple',
    'magenta',
    'forest-green',
    'green',
    'apricot',
    'red',
    'black',
    'white',
  ];
  for (const c of palette) {
    o = o.replace(new RegExp(`\\btext-${c}-`, 'g'), `mud-text-${c}-`);
    o = o.replace(new RegExp(`\\bbg-${c}-`, 'g'), `mud-bg-${c}-`);
    o = o.replace(new RegExp(`\\bborder-${c}-`, 'g'), `mud-border-${c}-`);
  }
  o = o.replace(/\bbg-transparent\b/g, 'mud-bg-transparent');

  o = o.replace(/\btext-left\b/g, 'mud-text-left');
  o = o.replace(/\btext-right\b/g, 'mud-text-right');
  o = o.replace(/\btext-center\b/g, 'mud-text-center');
  o = o.replace(/\btext-justify\b/g, 'mud-text-justify');
  o = o.replace(/\btext-uppercase\b/g, 'mud-text-uppercase');
  o = o.replace(/\btext-lowercase\b/g, 'mud-text-lowercase');
  o = o.replace(/\btext-capitalize\b/g, 'mud-text-capitalize');

  o = o.replace(/\btext-black\b/g, 'mud-text-black');
  o = o.replace(/\btext-white\b/g, 'mud-text-white');

  o = o.replace(/\bcolor-background-/g, 'mud-color-background-');
  o = o.replace(/\bcolor-border-/g, 'mud-color-border-');
  o = o.replace(/\bcolor-text-/g, 'mud-color-text-');
  o = o.replace(/\bcolor-icon-/g, 'mud-color-icon-');

  o = o.replace(/\bborder-top-style-/g, 'mud-border-top-style-');
  o = o.replace(/\bborder-right-style-/g, 'mud-border-right-style-');
  o = o.replace(/\bborder-bottom-style-/g, 'mud-border-bottom-style-');
  o = o.replace(/\bborder-left-style-/g, 'mud-border-left-style-');
  o = o.replace(/\bborder-style-/g, 'mud-border-style-');
  o = o.replace(/\bborder-top-solid\b/g, 'mud-border-top-solid');
  o = o.replace(/\bborder-right-solid\b/g, 'mud-border-right-solid');
  o = o.replace(/\bborder-bottom-solid\b/g, 'mud-border-bottom-solid');
  o = o.replace(/\bborder-left-solid\b/g, 'mud-border-left-solid');
  o = o.replace(/\bborder-top-dashed\b/g, 'mud-border-top-dashed');
  o = o.replace(/\bborder-bottom-dashed\b/g, 'mud-border-bottom-dashed');
  o = o.replace(/\bborder-dashed\b/g, 'mud-border-dashed');
  o = o.replace(/\bborder-solid\b/g, 'mud-border-solid');
  o = o.replace(/\bborder-dotted\b/g, 'mud-border-dotted');
  o = o.replace(/\bborder-bottom-1\b/g, 'mud-border-bottom-1');
  o = o.replace(/\bborder-bottom-2\b/g, 'mud-border-bottom-2');
  o = o.replace(/\bborder-top-1\b/g, 'mud-border-top-1');
  o = o.replace(/\bborder-top-2\b/g, 'mud-border-top-2');
  o = o.replace(/\bborder-left-1\b/g, 'mud-border-left-1');
  o = o.replace(/\bborder-right-1\b/g, 'mud-border-right-1');
  o = o.replace(/\bborder-1\b/g, 'mud-border-1');
  o = o.replace(/\bborder-2\b/g, 'mud-border-2');
  o = o.replace(/\bborder-0\b/g, 'mud-border-0');
  o = o.replace(/\bborder-bottom\b/g, 'mud-border-bottom');
  o = o.replace(/\bborder-top\b/g, 'mud-border-top');
  o = o.replace(/\bradius-/g, 'mud-radius-');
  o = o.replace(/\bborder\b/g, (m, offset, str) => {
    const prev = str[offset - 1];
    const next = str[offset + m.length];
    if (prev === '-' || next === '-') return m;
    if (str.slice(Math.max(0, offset - 4), offset) === 'mud-') return m;
    return 'mud-border';
  });

  o = o.replace(/\bw-(\d+)\b/g, 'mud-w-$1');
  o = o.replace(/\bw-(xs|sm|md|lg|xl)-(\d+)\b/g, 'mud-w-$1-$2');
  o = o.replace(/\bw-auto\b/g, 'mud-w-auto');
  o = o.replace(/\bw-full\b/g, 'mud-w-full');
  o = o.replace(/\bdrop-shadow-/g, 'mud-shadow-');

  const btnVariants = [
    'primary',
    'secondary',
    'strict',
    'neutral',
    'destructive',
    'outline-primary',
    'outline-secondary',
    'outline-strict',
    'outline-neutral',
    'outline-destructive',
    'text-primary',
    'text-secondary',
    'text-strict',
    'text-neutral',
    'text-destructive',
    'filled',
    'outlined',
    'text',
    'icon',
    'loading',
    'label',
    'pill',
    'rounded',
    'group',
    'sm',
    'md',
    'lg',
  ];
  for (const v of btnVariants) {
    o = o.split(`btn-${v}`).join(`mud-btn-${v}`);
  }
  o = o.replace(/(^|[\s"'=])btn([\s"'])/g, '$1mud-btn$2');

  o = o.replace(/\bfw-regular\b/g, 'mud-font-regular');
  o = o.replace(/\bfw-medium\b/g, 'mud-font-medium');
  o = o.replace(/\bfw-semibold\b/g, 'mud-font-semibold');
  o = o.replace(/\bfw-bold\b/g, 'mud-font-bold');

  o = o.replace(/\bmud-mud-/g, 'mud-');

  return o;
}

function main() {
  const files = walkHtml(components);
  let n = 0;
  for (const f of files) {
    const before = fs.readFileSync(f, 'utf8');
    const after = applyRules(before);
    if (after !== before) {
      fs.writeFileSync(f, after, 'utf8');
      console.log(f);
      n++;
    }
  }
  console.log(`Updated ${n} HTML file(s).`);
}

main();
