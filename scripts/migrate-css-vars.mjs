#!/usr/bin/env node
/**
 * Rewrites legacy CSS variable references in source files to the new
 * Tokenhaus-2026 naming. Reuses the MAPPING table from
 * `migrate-component-token-refs.mjs` and converts each entry to its CSS form
 * (`--name-with-dashes`) before applying.
 *
 * Run AFTER `yarn sync:tokens:apply` and `migrate-component-token-refs.mjs`
 * have updated foundation + component token files — otherwise the rewritten
 * variables in source will not resolve when CSS is loaded.
 *
 * Usage:
 *   node scripts/migrate-css-vars.mjs                   # apply to default roots
 *   node scripts/migrate-css-vars.mjs --dry-run         # preview only
 *   node scripts/migrate-css-vars.mjs --report <file>   # JSON manifest of changes
 *   node scripts/migrate-css-vars.mjs --root src/components/mud-button
 *   node scripts/migrate-css-vars.mjs --root .storybook --root src/components/mud-button
 *
 * The CSS variable match anchors a negative lookahead on the next character so
 * that `--space-md` does not collide with hypothetical `--space-md-extra`.
 *
 * Substitution is exact: `var(--old, fallback)` becomes `var(--new, fallback)`.
 * Component-prefixed vars (`--button-*`, `--input-*`) are intentionally left
 * untouched — their JSON keys did not change.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Command } from 'commander';

import { MAPPING as TOKEN_MAPPING } from './migrate-component-token-refs.mjs';

const SCRIPT_FILE = fileURLToPath(import.meta.url);
const PROJECT_ROOT = path.resolve(path.dirname(SCRIPT_FILE), '..');

const DEFAULT_ROOTS = ['src/components', '.storybook'];

const SUPPORTED_EXTENSIONS = new Set(['.scss', '.css', '.tsx', '.ts', '.svg', '.mdx', '.md']);

// Directories we never descend into.
const SKIP_DIRECTORIES = new Set(['node_modules', 'dist', 'build', 'tokens', 'generated', '.git']);

// ── CSS NAME TRANSFORM ────────────────────────────────────────────────────────

// Convert a Style Dictionary token path (e.g. `color.neutral.text.default`,
// `fontSize.12`, `borderRadius.full`) into the CSS variable name Style
// Dictionary emits via the `name/kebab` transform: dots become dashes and
// camelCase boundaries get split with dashes.
function tokenPathToCssVar(tokenPath) {
  return (
    '--' +
    tokenPath
      .replace(/\./g, '-')
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
      .toLowerCase()
  );
}

function buildCssMapping(tokenMapping) {
  const cssMapping = {};
  for (const [oldPath, newPath] of Object.entries(tokenMapping)) {
    const oldVar = tokenPathToCssVar(oldPath);
    const newVar = tokenPathToCssVar(newPath);
    if (oldVar === newVar) continue;
    cssMapping[oldVar] = newVar;
  }
  for (const [oldVar, newVar] of Object.entries(EXTRA_CSS_MAPPING)) {
    cssMapping[oldVar] = newVar;
  }
  return cssMapping;
}

// CSS-only legacy variables that don't have a clean Style Dictionary reference
// counterpart. These are typically:
//   - Typos that crept in (e.g. `--color-neutral-text-inverse` for `inverted`)
//   - Variant suffixes never defined as tokens (`--color-system-info-background-weakest-active`)
//   - Aspirational names from the in-progress design (`color.system.critical-*`)
//   - Bare role/property references that omit a leaf (`--color-system-info-icon`)
//
// Pure literal/non-token names (`--font-family-sans`, `--font-family-pro-display`)
// are intentionally NOT mapped — they aren't foundation tokens.
const EXTRA_CSS_MAPPING = {
  // system role default icon (no suffix) — old code treated it as "the icon color for this state"
  '--color-system-info-icon': '--color-icon-brand-default',
  '--color-system-warning-icon': '--color-icon-warning-default',
  '--color-system-success-icon': '--color-icon-positive-default',

  // `critical` was an alias for error/danger in some places
  '--color-system-critical-text-weak': '--color-text-danger-default',

  // Variants that referenced non-existent leaves (gracefully fell back to hard-coded hex)
  '--color-system-info-background-transparent': '--color-background-brand-secondary',
  '--color-system-info-background-weakest-active': '--color-background-brand-secondary-active',

  // Neutral aliases that drifted from the canonical scale
  '--color-neutral-background-weak': '--color-background-base-secondary',
  '--color-neutral-background-fill': '--color-background-base-default',
  '--color-neutral-text-disabled': '--color-text-disabled-default',
  '--color-neutral-text-inverse': '--color-text-base-inverse-default',
  '--color-neutral-text': '--color-text-base-default',
  '--color-neutral-border-stronger': '--color-border-base-strong',

  // Primary border strong fallback used as accent line
  '--color-primary-border-strong': '--color-border-brand-default',

  // Spacing/palette fallbacks
  '--spacing-lg': '--spacing-24',
  '--palette-ui-gray-4': '--palette-gray-200',
};

// ── FILE WALK ─────────────────────────────────────────────────────────────────

function walkSourceFiles(rootDir) {
  const absRoot = path.isAbsolute(rootDir) ? rootDir : path.resolve(PROJECT_ROOT, rootDir);
  if (!fs.existsSync(absRoot)) return [];

  const out = [];
  const stack = [absRoot];

  while (stack.length > 0) {
    const current = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (SKIP_DIRECTORIES.has(entry.name)) continue;
        stack.push(path.join(current, entry.name));
        continue;
      }
      const ext = path.extname(entry.name).toLowerCase();
      if (!SUPPORTED_EXTENSIONS.has(ext)) continue;
      out.push(path.join(current, entry.name));
    }
  }

  return out;
}

// ── REWRITE ───────────────────────────────────────────────────────────────────

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function rewriteText(text, cssMapping) {
  let updated = text;
  const replacements = {};
  for (const [oldVar, newVar] of Object.entries(cssMapping)) {
    // Negative lookahead prevents `--space-md` matching inside `--space-md-extra`.
    const pattern = new RegExp(`${escapeRegex(oldVar)}(?![a-zA-Z0-9_-])`, 'g');
    let count = 0;
    updated = updated.replace(pattern, () => {
      count += 1;
      return newVar;
    });
    if (count > 0) replacements[oldVar] = count;
  }
  return { updated, replacements };
}

// Prefixes that only exist in the legacy namespace. A variable that starts with
// any of these but isn't a known mapping key is suspect.
const STRICT_LEGACY_PREFIXES = [
  '--color-neutral-',
  '--color-primary-',
  '--color-secondary-',
  '--color-system-',
  '--space-',
  '--radius-',
  '--shadow-sm',
  '--shadow-md',
  '--shadow-lg',
  '--shadow-xl',
  '--shadow-2xl',
  '--shadow-inner',
  '--palette-ui-',
  '--palette-ux-',
  '--palette-transparent-',
];

function findRemainingLegacyVars(text, cssMapping) {
  // Anything we know how to migrate is "legacy and handled" — flag only when we
  // see something legacy-looking that didn't get rewritten (e.g. variant we forgot).
  const handled = new Set(Object.keys(cssMapping));
  const remaining = new Set();
  for (const match of text.matchAll(/--[a-z][a-z0-9-]+/g)) {
    const v = match[0];
    if (handled.has(v)) continue;
    if (STRICT_LEGACY_PREFIXES.some(prefix => v.startsWith(prefix))) {
      remaining.add(v);
    }
  }
  return [...remaining];
}

// ── CLI ───────────────────────────────────────────────────────────────────────

function createProgram() {
  return new Command()
    .name('migrate-css-vars')
    .description('Rewrite legacy CSS variable references in source files to the Tokenhaus-2026 naming')
    .option('--root <dir>', 'Source root to scan (repeatable)', collectRoot, [])
    .option('--dry-run', 'Preview rewrites without modifying any file')
    .option('--report <file>', 'Write a machine-readable JSON report')
    .showHelpAfterError();
}

function collectRoot(value, previous) {
  return [...previous, value];
}

function main(argv = process.argv) {
  const program = createProgram();
  program.parse(argv);
  const opts = program.opts();
  const roots = opts.root.length > 0 ? opts.root : DEFAULT_ROOTS;
  const dryRun = Boolean(opts.dryRun);

  const cssMapping = buildCssMapping(TOKEN_MAPPING);
  console.log(`Migrating CSS variable references (${dryRun ? 'DRY RUN' : 'WRITE'})`);
  console.log(`Roots: ${roots.join(', ')}`);
  console.log(`Mapping entries: ${Object.keys(cssMapping).length}\n`);

  const allFiles = roots.flatMap(walkSourceFiles);
  console.log(`Files discovered: ${allFiles.length}\n`);

  const fileReports = [];
  let totalSubs = 0;
  const unmatchedAggregate = new Map();

  for (const filePath of allFiles) {
    const relativePath = path.relative(PROJECT_ROOT, filePath);
    const original = fs.readFileSync(filePath, 'utf8');
    const { updated, replacements } = rewriteText(original, cssMapping);
    const subTotal = Object.values(replacements).reduce((acc, n) => acc + n, 0);
    const unmatched = findRemainingLegacyVars(updated, cssMapping);

    if (subTotal === 0 && unmatched.length === 0) continue;

    if (subTotal > 0 && !dryRun) {
      fs.writeFileSync(filePath, updated, 'utf8');
    }

    fileReports.push({ relativePath, replacements, unmatched, subTotal, changed: subTotal > 0 });
    totalSubs += subTotal;
    for (const v of unmatched) {
      unmatchedAggregate.set(v, (unmatchedAggregate.get(v) ?? 0) + 1);
    }

    const label = dryRun ? 'planned' : 'rewrote';
    console.log(`  ${subTotal > 0 ? label : 'unchanged'} ${relativePath} (${subTotal} subs)`);
    if (unmatched.length > 0) {
      console.log(`    UNMATCHED: ${unmatched.join(', ')}`);
    }
  }

  console.log('');
  console.log('Summary:');
  console.log(`  files touched: ${fileReports.filter(r => r.changed).length}`);
  console.log(`  total substitutions: ${totalSubs}`);
  console.log(`  unmatched legacy vars: ${unmatchedAggregate.size}`);

  if (unmatchedAggregate.size > 0) {
    console.log('\nUnmatched legacy vars (need manual handling or MAPPING extension):');
    const entries = [...unmatchedAggregate.entries()].sort((a, b) => b[1] - a[1]);
    for (const [v, count] of entries) {
      console.log(`  ${v} (${count} file${count === 1 ? '' : 's'})`);
    }
  }

  if (opts.report) {
    const reportPath = path.isAbsolute(opts.report) ? opts.report : path.resolve(PROJECT_ROOT, opts.report);
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(
      reportPath,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          dryRun,
          roots,
          mappingEntries: Object.keys(cssMapping).length,
          totalSubstitutions: totalSubs,
          unmatched: Object.fromEntries(unmatchedAggregate),
          files: fileReports,
        },
        null,
        2,
      ) + '\n',
      'utf8',
    );
    console.log(`\nReport written: ${path.relative(PROJECT_ROOT, reportPath)}`);
  }

  return unmatchedAggregate.size > 0 ? 1 : 0;
}

const isEntrypoint = process.argv[1] && path.resolve(process.argv[1]) === SCRIPT_FILE;
if (isEntrypoint) {
  process.exit(main());
}

export { buildCssMapping, rewriteText, findRemainingLegacyVars, tokenPathToCssVar };
