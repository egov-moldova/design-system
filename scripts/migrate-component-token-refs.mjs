#!/usr/bin/env node
/**
 * Rewrites legacy token references in component token files to the new
 * Tokenhaus-2026 namespace (palette/color.{background|border|text|icon}.{role},
 * spacing.N, borderRadius.N, fontSize.N, lineHeight.N, dropShadow.N).
 *
 * Run AFTER `yarn sync:tokens:apply` has overwritten tokens/core foundation files —
 * otherwise the rewritten references will not resolve in `yarn tokens.build`.
 *
 * Usage:
 *   node scripts/migrate-component-token-refs.mjs              # apply
 *   node scripts/migrate-component-token-refs.mjs --dry-run    # preview
 *   node scripts/migrate-component-token-refs.mjs --report <file>
 *   node scripts/migrate-component-token-refs.mjs --root tokens/core/components
 *
 * Lossy substitutions: any pair with `(lossy)` in the comment loses fidelity
 * (e.g. fontSize.3xl = 30px → fontSize.32 = 32px). Reviewed in plan PR D Anexa A.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Command } from 'commander';

const SCRIPT_FILE = fileURLToPath(import.meta.url);
const PROJECT_ROOT = path.resolve(path.dirname(SCRIPT_FILE), '..');

const DEFAULT_ROOTS = ['tokens/core/components', 'tokens/core.dark/components'];

// ── MAPPING TABLE ─────────────────────────────────────────────────────────────
//
// Keys are LEGACY token paths inside `{...}` braces. Values are the NEW paths.
// Substitution is exact match on `{<old>}` → `{<new>}`. Order does not matter
// because braces delimit each match (no prefix/substring collisions).
//
// Lossy entries map an old value to the nearest Figma scale; mark with `lossy:`
// in the inline comment so future audits can find the drift.

const MAPPING = {
  // ── Spacing scale: space.* → spacing.N (numeric)
  'space.none': 'spacing.0',
  'space.6xs': 'spacing.2',
  'space.5xs': 'spacing.4',
  'space.4xs': 'spacing.6',
  'space.3xs': 'spacing.8',
  'space.2xs': 'spacing.12', // lossy: 10 → 12
  'space.xs': 'spacing.12',
  'space.sm': 'spacing.16',
  'space.md': 'spacing.20',
  'space.lg': 'spacing.24',
  'space.xl': 'spacing.32',
  'space.2xl': 'spacing.32', // lossy: 36 → 32
  'space.3xl': 'spacing.40',
  'space.4xl': 'spacing.48', // lossy: 44 → 48
  'space.5xl': 'spacing.48',
  'space.6xl': 'spacing.56',
  'space.7xl': 'spacing.64',
  'space.8xl': 'spacing.80',
  'space.9xl': 'spacing.96',
  'space.condensed.sm': 'spacing.12', // lossy: condensed scale collapsed
  'space.condensed.2xl': 'spacing.32', // lossy

  // ── Aliased spacing.* (current spacing.tokens.json wraps space.*)
  'spacing.px': 'spacing.2', // lossy: 1 → 2 (Figma has no spacing-1)
  'spacing.3xs': 'spacing.8',
  'spacing.2xs': 'spacing.12', // lossy: 10 → 12
  'spacing.xs': 'spacing.12',
  'spacing.sm': 'spacing.16',
  'spacing.ms': 'spacing.16',
  'spacing.md': 'spacing.20',
  'spacing.2xl': 'spacing.32', // lossy: 36 → 32
  // spacing.0 stays as spacing.0 (identity, no entry needed)

  // ── Border radius scale: radius.* → borderRadius.N
  'radius.none': 'borderRadius.0',
  'radius.xs': 'borderRadius.4', // lossy: 2 → 4
  'radius.sm': 'borderRadius.4',
  'radius.md': 'borderRadius.8',
  'radius.lg': 'borderRadius.12',
  'radius.xl': 'borderRadius.16',
  'radius.2xl': 'borderRadius.24',
  'radius.3xl': 'borderRadius.32',
  'radius.full': 'borderRadius.full',

  // ── Border width: border.width.N → borderWidth.N
  'border.width.1': 'borderWidth.1',
  'border.width.2': 'borderWidth.2',

  // ── Font size: fontSize.* → fontSize.N
  'fontSize.2xs': 'fontSize.10',
  'fontSize.xs': 'fontSize.12',
  'fontSize.sm': 'fontSize.14',
  'fontSize.md': 'fontSize.16',
  'fontSize.lg': 'fontSize.18',
  'fontSize.xl': 'fontSize.20',
  'fontSize.2xl': 'fontSize.24',
  'fontSize.3xl': 'fontSize.32', // lossy: 30 → 32
  'fontSize.4xl': 'fontSize.40', // lossy: 36 → 40
  'fontSize.5xl': 'fontSize.48', // lossy: 44 → 48

  // ── Line height: lineHeight.* → lineHeight.N
  'lineHeight.2xs': 'lineHeight.12',
  'lineHeight.xs': 'lineHeight.12', // lossy: 14 → 12
  'lineHeight.sm': 'lineHeight.16',
  'lineHeight.md': 'lineHeight.20',
  'lineHeight.lg': 'lineHeight.24',
  'lineHeight.xl': 'lineHeight.28',
  'lineHeight.2xl': 'lineHeight.32',
  'lineHeight.3xl': 'lineHeight.36',
  'lineHeight.4xl': 'lineHeight.40',
  'lineHeight.5xl': 'lineHeight.48',

  // ── Font family: body/heading → primary (collapsed)
  'fontFamily.body': 'fontFamily.primary',
  'fontFamily.heading': 'fontFamily.primary', // lossy: distinct heading family lost

  // ── Font weight
  'fontWeight.normal': 'fontWeight.regular',
  'fontWeight.semiBold': 'fontWeight.semibold',

  // ── Shadow → dropShadow.100..500
  'shadow.sm': 'dropShadow.100',
  'shadow.md': 'dropShadow.200',
  'shadow.lg': 'dropShadow.300',
  'shadow.xl': 'dropShadow.400',
  'shadow.2xl': 'dropShadow.500',

  // ── Color semantic: neutral → base
  'color.neutral.background.default': 'color.background.base.default',
  'color.neutral.background.base': 'color.background.base.default',
  'color.neutral.background.hover': 'color.background.base.default-hover',
  'color.neutral.background.active': 'color.background.base.default-active',
  'color.neutral.background.base-inverted': 'color.background.base-inverse.default',
  'color.neutral.background.strong': 'color.background.base.tertiary',
  'color.neutral.background.stronger': 'color.background.base.tertiary-active',
  'color.neutral.background.strongest': 'color.background.base-inverse.default',

  'color.neutral.border.default': 'color.border.base.default',
  'color.neutral.border.strong': 'color.border.base.strong',
  'color.neutral.border.weak': 'color.border.base.secondary',
  'color.neutral.border.weaker': 'color.border.base.tertiary',
  'color.neutral.border.weakest': 'color.border.base.subtle',

  'color.neutral.icon.default': 'color.icon.base.default',
  'color.neutral.icon.weak': 'color.icon.base.secondary',
  'color.neutral.icon.weaker': 'color.icon.base.tertiary',
  'color.neutral.icon.weakest': 'color.icon.base.tertiary', // lossy
  'color.neutral.icon.inverted': 'color.icon.base-inverse.default',
  'color.neutral.icon.inverted-weak': 'color.icon.base-inverse.default', // lossy

  'color.neutral.text.default': 'color.text.base.default',
  'color.neutral.text.weak': 'color.text.base.secondary',
  'color.neutral.text.weaker': 'color.text.base.tertiary',
  'color.neutral.text.weakest': 'color.text.base.tertiary', // lossy
  'color.neutral.text.inverted': 'color.text.base-inverse.default',
  'color.neutral.text.inverted-weak': 'color.text.base-inverse.default', // lossy
  'color.neutral.text.inverted-static': 'color.text.base-inverse.on-color',

  'color.neutral.transparent.backdrop': 'color.background.alpha.overlay-dark',
  'color.neutral.transparent.default': 'color.background.alpha.overlay-light',
  'color.neutral.transparent.strong': 'color.background.alpha.overlay-dark',
  'color.neutral.transparent.weak': 'color.background.alpha.overlay-light',
  'color.neutral.transparent.weaker': 'color.background.alpha.large-surface',

  // ── Color semantic: primary → brand
  'color.primary.background.default': 'color.background.brand.default',
  'color.primary.background.active': 'color.background.brand.default-active',
  'color.primary.background.strong': 'color.background.brand.default-hover',
  'color.primary.background.stronger': 'color.background.brand.default-active',
  'color.primary.background.strongest': 'color.background.brand.default-active',

  'color.primary.border.default': 'color.border.brand.default',
  'color.primary.border.active': 'color.border.brand.default',
  'color.primary.border.disabled': 'color.border.disabled.default',
  'color.primary.border.hover': 'color.border.brand.default',

  'color.primary.icon.default': 'color.icon.brand.default',
  'color.primary.icon.weak': 'color.icon.brand.on-secondary',
  'color.primary.icon.weaker': 'color.icon.brand.on-secondary', // lossy
  'color.primary.icon.weakest': 'color.icon.brand.on-secondary', // lossy

  'color.primary.text.default': 'color.text.brand.default',
  'color.primary.text.weak': 'color.text.brand.on-secondary',
  'color.primary.text.weaker': 'color.text.brand.on-secondary', // lossy

  'color.primary.transparent.default': 'color.background.brand.secondary',
  'color.primary.transparent.strong': 'color.background.brand.secondary-hover',
  'color.primary.transparent.weak': 'color.background.brand.secondary',
  'color.primary.transparent.weaker': 'color.background.brand.secondary', // lossy

  // ── Color semantic: secondary → brand (collapsed — brand-yellow lost)
  'color.secondary.background.default': 'color.background.brand.default',
  'color.secondary.background.strong': 'color.background.brand.default-active',
  'color.secondary.border': 'color.border.brand.default',
  'color.secondary.icon.weak': 'color.icon.brand.on-secondary',

  // ── Color semantic: system.error → danger
  'color.system.error.background': 'color.background.danger.default',
  'color.system.error.background-hover': 'color.background.danger.default-hover',
  'color.system.error.background-transparent': 'color.background.danger.secondary',
  'color.system.error.background-weakest': 'color.background.danger.secondary',
  'color.system.error.border': 'color.border.danger.default',
  'color.system.error.icon': 'color.icon.danger.default',
  'color.system.error.icon-inverted': 'color.icon.base-inverse.on-color',
  'color.system.error.icon-weak': 'color.icon.danger.on-secondary',
  'color.system.error.text': 'color.text.danger.default',

  // ── Color semantic: system.info → brand (collapsed; info shares blue)
  'color.system.info.background': 'color.background.brand.secondary',
  'color.system.info.background-hover': 'color.background.brand.secondary-hover',
  'color.system.info.background-weakest': 'color.background.brand.secondary',
  'color.system.info.border': 'color.border.brand.default',
  'color.system.info.icon-inverted': 'color.icon.base-inverse.on-color',
  'color.system.info.icon-weak': 'color.icon.brand.on-secondary',
  'color.system.info.text': 'color.text.brand.default',

  // ── Color semantic: system.success → positive
  'color.system.success.background': 'color.background.positive.default',
  'color.system.success.background-hover': 'color.background.positive.default-hover',
  'color.system.success.background-transparent': 'color.background.positive.secondary',
  'color.system.success.background-weakest': 'color.background.positive.secondary',
  'color.system.success.border': 'color.border.positive.default',
  'color.system.success.icon-inverted': 'color.icon.base-inverse.on-color',
  'color.system.success.icon-weak': 'color.icon.positive.on-secondary',
  'color.system.success.text': 'color.text.positive.default',

  // ── Color semantic: system.warning → warning
  'color.system.warning.background': 'color.background.warning.default',
  'color.system.warning.background-transparent': 'color.background.warning.secondary',
  'color.system.warning.background-weakest': 'color.background.warning.secondary',
  'color.system.warning.border': 'color.border.warning.default',
  'color.system.warning.icon-inverted': 'color.icon.base-inverse.on-color',
  'color.system.warning.icon-weak': 'color.icon.warning.on-secondary',
  'color.system.warning.text': 'color.text.warning.default',

  // ── Special — single ref, best-guess placeholder for empty states
  'color.system.fill-empty-state': 'color.background.disabled.default',
};

// ── PIPELINE ──────────────────────────────────────────────────────────────────

function collectTokenFiles(rootDir) {
  const absRoot = path.isAbsolute(rootDir) ? rootDir : path.resolve(PROJECT_ROOT, rootDir);
  if (!fs.existsSync(absRoot)) return [];
  return fs
    .readdirSync(absRoot, { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.endsWith('.tokens.json'))
    .map(entry => path.join(absRoot, entry.name));
}

function rewriteFile(filePath, mapping) {
  const original = fs.readFileSync(filePath, 'utf8');
  let updated = original;
  const replacements = {};
  for (const [oldPath, newPath] of Object.entries(mapping)) {
    const needle = `{${oldPath}}`;
    const replacement = `{${newPath}}`;
    if (!updated.includes(needle)) continue;
    const before = updated;
    updated = updated.split(needle).join(replacement);
    const count =
      (before.length - updated.length + (replacement.length - needle.length) * estimateCount(before, needle)) /
      Math.max(1, replacement.length - needle.length || 1);
    // Simpler: recount by splitting.
    replacements[oldPath] = (before.match(new RegExp(escapeRegex(needle), 'g')) || []).length;
  }
  return { original, updated, replacements };
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function estimateCount(text, needle) {
  return (text.match(new RegExp(escapeRegex(needle), 'g')) || []).length;
}

function findRemainingLegacyRefs(text, mapping) {
  // Any {<legacy path>} that did not match the mapping (and is not a brand-new path)
  // gets reported so the operator can extend MAPPING.
  const known = new Set(Object.values(mapping));
  // Add known new namespaces so we don't flag them.
  const newNamespacePrefixes = [
    'palette.',
    'color.background.',
    'color.border.',
    'color.text.',
    'color.icon.',
    'spacing.',
    'borderRadius.',
    'borderWidth.',
    'fontFamily.',
    'fontSize.',
    'fontWeight.',
    'lineHeight.',
    'letterSpacing.',
    'dropShadow.',
    'size.',
    'screen.',
    'zIndex.',
    'linearGradient.',
  ];
  const remaining = new Set();
  for (const match of text.matchAll(/\{([^}]+)\}/g)) {
    const ref = match[1];
    if (known.has(ref)) continue;
    if (newNamespacePrefixes.some(prefix => ref.startsWith(prefix))) continue;
    // Allow local refs like {button.something}, {controls-group.gap.column}.
    // We flag only legacy foundation namespaces (color.neutral, color.primary, etc.).
    const legacyPrefixes = [
      'color.neutral',
      'color.primary',
      'color.secondary',
      'color.system',
      'space.',
      'spacing.',
      'radius.',
      'fontSize.',
      'lineHeight.',
      'fontFamily.',
      'fontWeight.',
      'shadow.',
      'border.width.',
    ];
    if (legacyPrefixes.some(prefix => ref.startsWith(prefix))) {
      remaining.add(ref);
    }
  }
  return [...remaining];
}

function createProgram() {
  return new Command()
    .name('migrate-component-token-refs')
    .description('Rewrite legacy token references in component token files to the new Tokenhaus-2026 namespace')
    .option('--root <dir>', 'Component token root directory (repeatable)', collectRoot, [])
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

  const allFiles = roots.flatMap(collectTokenFiles);
  if (allFiles.length === 0) {
    console.warn('No component token files found under:', roots.join(', '));
    return 0;
  }

  console.log(`Migrating component token references (${dryRun ? 'DRY RUN' : 'WRITE'})`);
  console.log(`Roots: ${roots.join(', ')}`);
  console.log(`Files: ${allFiles.length}\n`);

  const fileReports = [];
  let totalSubs = 0;
  const unmatchedAggregate = new Set();

  for (const filePath of allFiles) {
    const relativePath = path.relative(PROJECT_ROOT, filePath);
    const { original, updated, replacements } = rewriteFile(filePath, MAPPING);
    const subTotal = Object.values(replacements).reduce((acc, n) => acc + n, 0);
    const unmatched = findRemainingLegacyRefs(updated, MAPPING);

    if (subTotal === 0 && unmatched.length === 0) {
      continue;
    }

    if (subTotal > 0 && !dryRun) {
      fs.writeFileSync(filePath, updated, 'utf8');
    }

    fileReports.push({ relativePath, replacements, unmatched, subTotal, changed: subTotal > 0 });
    totalSubs += subTotal;
    for (const ref of unmatched) unmatchedAggregate.add(ref);

    const label = dryRun ? 'planned' : 'rewrote';
    console.log(`${subTotal > 0 ? '  ' + label : '  unchanged'} ${relativePath} (${subTotal} subs)`);
    if (unmatched.length > 0) {
      console.log(`    UNMATCHED legacy refs: ${unmatched.join(', ')}`);
    }
  }

  console.log('');
  console.log('Summary:');
  console.log(`  files touched: ${fileReports.filter(r => r.changed).length}`);
  console.log(`  total substitutions: ${totalSubs}`);
  console.log(`  unmatched legacy refs: ${unmatchedAggregate.size}`);
  if (unmatchedAggregate.size > 0) {
    console.log('\nUnmatched (extend MAPPING to handle):');
    for (const ref of [...unmatchedAggregate].sort()) {
      console.log(`  ${ref}`);
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
          totalSubstitutions: totalSubs,
          unmatched: [...unmatchedAggregate].sort(),
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

export { MAPPING, rewriteFile, findRemainingLegacyRefs };
