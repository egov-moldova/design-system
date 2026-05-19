#!/usr/bin/env node
/**
 * Audit foundation documentation pages for legacy classes, inline styles, and Romanian copy.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const PAGES = [
  'layout-grids.html',
  'colors.html',
  'typography-desktop.html',
  'typography-mobile.html',
  'spacings.html',
  'borders.html',
  'icons.html',
  'elevation.html',
  'cursors.html',
  'semantic-colors.html',
  'flags.html',
  'displays.html',
  'spacings-margins.html',
  'spacings-paddings.html',
  'width.html',
];

const ALLOWED_PREFIXES = [
  'mud-',
  'token-name',
  'font-mono',
  'icon',
  'icon-card__media',
  'typo-table',
  'typo-table__',
  'flags-doc-item',
  'flags-doc-item__',
  'mud-doc-lg-',
  'mud-doc-spacing-preview',
  'mud-doc-border-width-tokens',
  'mud-doc-section-head',
  'mud-doc-main',
  'mud-sprite-defs',
  'component-card',
  'foundation-card',
  'foundations-hub',
  'nav__',
  'mainNav__',
];

const LEGACY_PATTERNS = [
  /mud-doc-spacings-tokens/,
  /mud-doc-spacing-token-preview/,
  /icons-grid/,
  /cursors-grid/,
  /cursor-card/,
  /spacing-table/,
  /spacings-table/,
  /lg-breakpoint-chip/,
  /flags-doc-item__copy/,
  /mud-sheet__/,
  /mud-spec__/,
  /mud-preview-tile/,
  /mud-sheet--3col/,
];

const RO_PATTERNS = [
  /\bElementul\b/i,
  /\bActivează\b/i,
  /\bafișat\b/i,
  /\bascuns\b/i,
  /\butilizator/i,
  /\bpentru a\b/i,
  /\bRem\s/i,
  /\bpx\)\s*—/,
];

function extractClasses(html) {
  const classes = new Set();
  const re = /class="([^"]*)"/g;
  let m;
  while ((m = re.exec(html))) {
    m[1].split(/\s+/).filter(Boolean).forEach((c) => classes.add(c));
  }
  return [...classes];
}

function isAllowed(className) {
  if (ALLOWED_PREFIXES.some((p) => className === p || className.startsWith(p))) return true;
  if (className.startsWith('mud-')) return true;
  return false;
}

function auditPage(file) {
  const filePath = path.join(ROOT, file);
  if (!fs.existsSync(filePath)) return { file, missing: true };

  const html = fs.readFileSync(filePath, 'utf8');
  const issues = [];

  for (const pat of LEGACY_PATTERNS) {
    if (pat.test(html)) issues.push({ type: 'legacy', detail: pat.source });
  }

  if (/style="/.test(html)) {
    const count = (html.match(/style="/g) || []).length;
    issues.push({ type: 'inline-style', detail: `${count} occurrence(s)` });
  }

  for (const pat of RO_PATTERNS) {
    if (pat.test(html)) issues.push({ type: 'romanian', detail: pat.source });
  }

  const badClasses = extractClasses(html).filter((c) => !isAllowed(c));
  if (badClasses.length) {
    issues.push({
      type: 'non-mud-class',
      detail: [...new Set(badClasses)].slice(0, 15).join(', ') +
        (badClasses.length > 15 ? ` … (+${badClasses.length - 15})` : ''),
    });
  }

  if (!/<html[^>]*lang="en"/i.test(html)) {
    issues.push({ type: 'lang', detail: 'missing lang="en"' });
  }

  return { file, issues, ok: issues.length === 0 };
}

console.log('Foundation pages audit\n');
const results = PAGES.map(auditPage);
let fail = 0;
for (const r of results) {
  if (r.missing) {
    console.log(`MISSING  ${r.file}`);
    fail++;
    continue;
  }
  if (r.ok) {
    console.log(`OK       ${r.file}`);
  } else {
    console.log(`ISSUES   ${r.file}`);
    for (const i of r.issues) console.log(`           [${i.type}] ${i.detail}`);
    fail++;
  }
}
console.log(`\n${results.length - fail}/${results.length} pages OK`);
process.exit(fail > 0 ? 1 : 0);
