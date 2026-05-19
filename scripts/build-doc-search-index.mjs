/**
 * Builds Components/data/doc-search-index.json from compiled CSS class names.
 * Maps each .mud-* utility to a documentation page + short snippet (Bootstrap-style lookup).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const cssPath = path.join(root, 'Components', 'css', 'main.css');
const outDir = path.join(root, 'Components', 'data');
const outPath = path.join(outDir, 'doc-search-index.json');

function route(q) {
  const href = (file, hash = '') => (hash ? `${file}#${hash}` : file);

  if (q === 'mud-container') {
    return {
      url: href('layout-grids.html', 'doc-layout-shell'),
      snippet: 'Responsive max-width wrapper; centres content at each breakpoint.',
    };
  }
  if (q === 'mud-row') {
    return {
      url: href('layout-grids.html', 'doc-layout-shell'),
      snippet: 'Row shell for columns — horizontal track with gutter alignment.',
    };
  }
  if (/^mud-col/.test(q)) {
    return {
      url: href('layout-grids.html', 'layout-columns-heading'),
      snippet: 'Column span inside the 12-column grid (e.g. mud-col-6, mud-col-md-8).',
    };
  }
  if (/^mud-gap-/.test(q)) {
    return { url: href('spacings.html'), snippet: 'Gap utility between flex/grid items from the spacing scale.' };
  }
  if (/^mud-m[trblxy]?-/.test(q) || /^mud-m-/.test(q)) {
    return { url: href('spacings-margins.html'), snippet: 'Margin utility from the shared spacing token scale.' };
  }
  if (/^mud-p[trblxy]?-/.test(q) || /^mud-p-/.test(q)) {
    return { url: href('spacings-paddings.html'), snippet: 'Padding utility (inset) from the spacing token scale.' };
  }
  if (/^mud-(w|min-w|max-w|h|min-h|max-h)-/.test(q) || /^mud-size-/.test(q)) {
    return { url: href('width.html'), snippet: 'Width, height, or square sizing utility.' };
  }
  if (/^mud-text-/.test(q) || /^mud-bg-/.test(q)) {
    if (/alpha|white-\d|black-\d|gray-\d.*-alpha/.test(q)) {
      return { url: href('colors.html'), snippet: 'Colour / alpha token utility.' };
    }
    return { url: href('semantic-colors.html'), snippet: 'Semantic text or surface colour token.' };
  }
  if (/^mud-radius/.test(q) || /^mud-border/.test(q)) {
    return { url: href('borders.html'), snippet: 'Border radius or border width / style utility.' };
  }
  if (/^mud-shadow|^mud-elevation/.test(q)) {
    return { url: href('elevation.html'), snippet: 'Drop-shadow / elevation token.' };
  }
  if (/^mud-(type|desktop|mobile)-/.test(q) || /^mud-font-/.test(q)) {
    return /mobile/i.test(q)
      ? { url: href('typography-mobile.html'), snippet: 'Mobile typography style or token.' }
      : { url: href('typography-desktop.html'), snippet: 'Desktop typography style or token.' };
  }
  if (/^mud-btn/.test(q)) {
    return { url: href('buttons.html'), snippet: 'Button variant or size utility.' };
  }
  if (/^mud-icon|^icon-/.test(q)) {
    return { url: href('icons.html'), snippet: 'Icon sizing or layout helper.' };
  }
  if (/^mud-(flex|inline-flex|grid|block|inline|hidden|table|d-)/.test(q)) {
    return { url: href('displays.html'), snippet: 'Display, flex, or visibility utility.' };
  }
  if (/^mud-(items|justify|content|self|place)-/.test(q) || /^mud-flex-/.test(q)) {
    return { url: href('displays.html'), snippet: 'Flexbox / grid alignment utility.' };
  }
  if (/^mud-overflow/.test(q)) {
    return { url: href('displays.html'), snippet: 'Overflow behaviour utility.' };
  }
  if (/^mud-cursor/.test(q)) {
    return { url: href('cursors.html'), snippet: 'Cursor token mapped to CSS cursor value.' };
  }
  if (/^mud-sheet|^mud-spec|^mud-card/.test(q)) {
    return { url: href('index.html'), snippet: 'Documentation layout / card pattern utility.' };
  }
  return {
    url: href('index.html'),
    snippet: 'MUD utility or helper — open the foundations or components index to browse.',
  };
}

function main() {
  const css = fs.readFileSync(cssPath, 'utf8');
  const set = new Set();
  const re = /\.(mud-[a-z0-9-]+)\b/g;
  let m;
  while ((m = re.exec(css))) {
    set.add(m[1]);
  }

  const entries = [];
  for (const q of [...set].sort()) {
    const { url, snippet } = route(q);
    const title = q.replace(/^mud-/, '').replace(/-/g, ' ');
    entries.push({ q, title, url, snippet });
  }

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify({ version: 1, generated: new Date().toISOString(), entries }, null, 0), 'utf8');
  console.log(`Wrote ${entries.length} entries to ${path.relative(root, outPath)}`);
}

main();
