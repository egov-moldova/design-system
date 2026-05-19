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

const ALLOWED_EXACT = new Set([
  'icon',
  'medium',
  'small',
  'extra-small',
  'token-table',
  'descriptor',
  'token-value',
  'typo-table',
  'typo-table__head',
  'typo-table__row',
  'icon-card',
  'icon-card--missing',
  'icon-card__media',
  'flags-doc-item',
  'flags-doc-item__flag',
  'flags-doc-item__flag-img',
  'flags-doc-item__flag--fallback',
  'mud-typo-spec-value',
  'mud-doc-spacing-preview',
  'mud-doc-spacing-preview__inner',
  'mud-doc-border-preview',
  'mud-doc-border-preview__inner',
  'mud-doc-section-head',
  'mud-doc-section-head--grid',
  'mud-doc-section-body',
  'mud-doc-prose',
  'mud-doc-main',
  'mud-doc-lg-wrap',
  'mud-sprite-defs',
  'component-card',
  'foundation-card',
  'foundations-hub',
]);

const ALLOWED_PREFIXES = ['mud-', 'token-name', 'font-mono', 'typo-table__', 'mud-doc-lg-', 'mud-sheet'];

const LEGACY_PATTERNS = [
  { re: /mud-doc-spacings-tokens/, msg: 'removed spacings BEM' },
  { re: /mud-doc-spacing-token-preview/, msg: 'removed spacing preview BEM' },
  { re: /icons-grid/, msg: 'use mud-grid' },
  { re: /cursors-grid/, msg: 'use mud-grid' },
  { re: /cursor-card/, msg: 'use mud-card + utilities' },
  { re: /spacing-table/, msg: 'use mud-row table' },
  { re: /spacings-table/, msg: 'use mud-row table' },
  { re: /lg-breakpoint-chip/, msg: 'use mud utilities' },
  { re: /flags-doc-item__copy/, msg: 'removed copy BEM' },
  { re: /mud-spec__/, msg: 'use mud-flex spec rows' },
  { re: /mud-preview-tile/, msg: 'use mud utilities' },
  { re: /mud-sheet--3col/, msg: 'use mud-row layout' },
  { re: /<section\b/, msg: 'prefer div + mud-doc-section-head' },
];

const RO_PATTERNS = [
  /\bElementul\b/i,
  /\bActivează\b/i,
  /\bafișat\b/i,
  /\bascuns\b/i,
  /\butilizatorul\b/i,
  /\bpentru a\s/i,
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
  if (ALLOWED_EXACT.has(className)) return true;
  if (ALLOWED_PREFIXES.some((p) => className === p || className.startsWith(p))) return true;
  if (className.startsWith('mud-')) return true;
  return false;
}

function auditPage(file) {
  const filePath = path.join(ROOT, file);
  if (!fs.existsSync(filePath)) return { file, missing: true };

  const html = fs.readFileSync(filePath, 'utf8');
  const issues = [];

  for (const { re, msg } of LEGACY_PATTERNS) {
    if (re.test(html)) issues.push({ type: 'legacy', detail: msg });
  }

  if (/style="/.test(html)) {
    issues.push({ type: 'inline-style', detail: `${(html.match(/style="/g) || []).length} occurrence(s)` });
  }

  for (const pat of RO_PATTERNS) {
    if (pat.test(html)) issues.push({ type: 'romanian', detail: pat.source });
  }

  const badClasses = extractClasses(html).filter((c) => !isAllowed(c));
  if (badClasses.length) {
    const uniq = [...new Set(badClasses)];
    issues.push({
      type: 'non-allowed-class',
      detail:
        uniq.slice(0, 12).join(', ') + (uniq.length > 12 ? ` … (+${uniq.length - 12} more)` : ''),
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
