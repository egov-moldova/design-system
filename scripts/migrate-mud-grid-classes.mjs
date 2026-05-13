/**
 * Prefix grid/layout tokens in HTML `class="…"` lists with `mud-` (Moldova Unified Design).
 *
 * Do NOT run a blind project-wide string replace (e.g. all `"container"` → `"mud-container"`):
 * you would corrupt `toast-container`, `cookie-detail-container`, BEM names like `footer__container`,
 * JS identifiers, comments, URLs, etc. This script only renames whole class tokens (space-separated).
 *
 * Rules worth keeping if you extend this:
 * - Match `container-fluid` before `container` (handled by exact-token order in `mapToken`).
 * - colors.html: bare `col` in legacy markup → `mud-col` (same as other pages). Alpha rows keep
 *   `mud-tile` / `mud-tile--alpha` (wide tiles, not the 10-column square grid).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const componentsRoot = path.join(__dirname, '..', 'Components');

function walkHtmlFiles(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walkHtmlFiles(p, acc);
    else if (ent.name.endsWith('.html')) acc.push(p);
  }
  return acc;
}

function mapToken(token, isColorsFile) {
  if (!token || token.startsWith('mud-')) return token;
  if (token === 'container') return 'mud-container';
  if (token === 'container-fluid') return 'mud-container-fluid';
  if (token === 'row') return 'mud-row';
  if (token.startsWith('col--')) {
    return isColorsFile ? token.replace(/^col/, 'mud-tile') : token.replace(/^col/, 'mud-col');
  }
  if (token.startsWith('col-')) return `mud-${token}`;
  if (token === 'col') return 'mud-col';
  if (token.startsWith('offset-')) return `mud-${token}`;
  if (token.startsWith('order-')) return `mud-${token}`;
  if (token.startsWith('row-cols-')) return `mud-${token}`;
  if (/^g-(xs|sm|md|lg|xl|xxl)$/.test(token)) return `mud-${token}`;
  return token;
}

function transformClassAttrValue(value, isColorsFile) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => mapToken(t, isColorsFile))
    .join(' ');
}

function processHtml(source, isColorsFile) {
  const repl = (quote) => (match, inner) => {
    const next = transformClassAttrValue(inner, isColorsFile);
    return `class=${quote}${next}${quote}`;
  };
  return source
    .replace(/class\s*=\s*"([^"]*)"/g, repl('"'))
    .replace(/class\s*=\s*'([^']*)'/g, repl("'"));
}

function main() {
  const files = walkHtmlFiles(componentsRoot);
  let changed = 0;
  for (const file of files) {
    const isColors = path.basename(file) === 'colors.html';
    const before = fs.readFileSync(file, 'utf8');
    const after = processHtml(before, isColors);
    if (after !== before) {
      fs.writeFileSync(file, after, 'utf8');
      changed++;
    }
  }
  console.log(`Updated ${changed} HTML file(s) under Components/`);
}

main();
