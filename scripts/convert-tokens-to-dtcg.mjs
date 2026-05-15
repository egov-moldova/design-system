#!/usr/bin/env node
/**
 * One-shot converter: rewrites Style Dictionary legacy token files
 * (`{ "value": ..., "type": ... }`) to the W3C DTCG format
 * (`{ "$value": ..., "$type": ... }`).
 *
 * Behaviours:
 *   - `value` → `$value`
 *   - `type`  → `$type`
 *   - numeric dimensions become string with px suffix (12 → "12px") so SD v4
 *     doesn't need the `size/px` transform on `category === 'size'`
 *   - the legacy `attributes` field is dropped (SD v4 derives CTI from path);
 *     pass `--preserve-attributes` to migrate it into `$extensions["com.cor.attributes"]`
 *   - already-DTCG leaves (`$value`/`$type` present) are left untouched
 *
 * Usage:
 *   node scripts/convert-tokens-to-dtcg.mjs              # apply to defaults
 *   node scripts/convert-tokens-to-dtcg.mjs --dry-run    # preview only
 *   node scripts/convert-tokens-to-dtcg.mjs --report tmp/dtcg.json
 *   node scripts/convert-tokens-to-dtcg.mjs --root tokens/core
 *   node scripts/convert-tokens-to-dtcg.mjs --preserve-attributes
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Command } from 'commander';

const SCRIPT_FILE = fileURLToPath(import.meta.url);
const PROJECT_ROOT = path.resolve(path.dirname(SCRIPT_FILE), '..');

const DEFAULT_ROOTS = ['tokens/core', 'tokens/core.dark'];

// ── LEAF DETECTION + CONVERSION ───────────────────────────────────────────────

function isLegacyLeaf(obj) {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    !Array.isArray(obj) &&
    'value' in obj &&
    !('$value' in obj) &&
    !('$type' in obj)
  );
}

function isDtcgLeaf(obj) {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    !Array.isArray(obj) &&
    '$value' in obj &&
    '$type' in obj
  );
}

function convertLeaf(leaf, options) {
  // When the legacy file omits `type`, treat the leaf as a dimension by default.
  // Tokens authored without an explicit type are almost always sizes/lengths in
  // this codebase (e.g. screen.tokens.json), and DTCG requires `$type` to be set
  // somewhere in the lineage for SD v4 to emit the variable.
  const inferredType = leaf.type ?? 'dimension';
  const out = { $value: leaf.value, $type: inferredType };

  if (inferredType === 'dimension' && typeof out.$value === 'number') {
    out.$value = `${out.$value}px`;
  }

  if (leaf.attributes && options.preserveAttributes) {
    out.$extensions = { 'com.cor.attributes': leaf.attributes };
  }

  return out;
}

function transformTree(node, options, stats) {
  if (isLegacyLeaf(node)) {
    stats.leavesConverted += 1;
    stats.typesEncountered.set(node.type, (stats.typesEncountered.get(node.type) ?? 0) + 1);
    if (node.attributes && !options.preserveAttributes) {
      stats.attributesDropped += 1;
    }
    return convertLeaf(node, options);
  }

  if (isDtcgLeaf(node)) {
    stats.leavesAlreadyDtcg += 1;
    return node;
  }

  if (Array.isArray(node)) {
    return node.map(item => transformTree(item, options, stats));
  }

  if (node !== null && typeof node === 'object') {
    const out = {};
    for (const [key, value] of Object.entries(node)) {
      out[key] = transformTree(value, options, stats);
    }
    return out;
  }

  return node;
}

// ── FILE WALK ─────────────────────────────────────────────────────────────────

function collectTokenFiles(rootDir) {
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
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        // Skip nested style-dictionary config or generated folders.
        if (entry.name === 'node_modules' || entry.name === '.git') continue;
        stack.push(full);
        continue;
      }
      if (!entry.name.endsWith('.tokens.json')) continue;
      out.push(full);
    }
  }

  return out;
}

// ── REWRITE PER FILE ──────────────────────────────────────────────────────────

function serializeTokenFile(obj) {
  return JSON.stringify(obj, null, 2) + '\n';
}

function convertFile(filePath, options) {
  const original = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(original);
  const stats = {
    leavesConverted: 0,
    leavesAlreadyDtcg: 0,
    attributesDropped: 0,
    typesEncountered: new Map(),
  };
  const updated = transformTree(data, options, stats);
  const serialized = serializeTokenFile(updated);
  return { original, serialized, stats };
}

// ── CLI ───────────────────────────────────────────────────────────────────────

function createProgram() {
  return new Command()
    .name('convert-tokens-to-dtcg')
    .description('Convert legacy Style Dictionary token files to the W3C DTCG format')
    .option('--root <dir>', 'Token root to scan (repeatable)', collectRoot, [])
    .option('--dry-run', 'Preview without modifying any file')
    .option('--report <file>', 'Write a machine-readable JSON report')
    .option('--preserve-attributes', 'Migrate the legacy `attributes` field into `$extensions["com.cor.attributes"]` (default: drop)')
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
  const preserveAttributes = Boolean(opts.preserveAttributes);
  const options = { preserveAttributes };

  const allFiles = roots.flatMap(collectTokenFiles);
  if (allFiles.length === 0) {
    console.warn('No *.tokens.json files found under:', roots.join(', '));
    return 0;
  }

  console.log(`Converting tokens to DTCG (${dryRun ? 'DRY RUN' : 'WRITE'})`);
  console.log(`Roots: ${roots.join(', ')}`);
  console.log(`Files discovered: ${allFiles.length}`);
  console.log(`Preserve attributes: ${preserveAttributes ? 'yes (→ $extensions)' : 'no (dropped)'}\n`);

  const fileReports = [];
  let totalLeavesConverted = 0;
  let totalLeavesAlreadyDtcg = 0;
  let totalAttributesDropped = 0;
  const aggregateTypes = new Map();

  for (const filePath of allFiles) {
    const relativePath = path.relative(PROJECT_ROOT, filePath);

    let result;
    try {
      result = convertFile(filePath, options);
    } catch (error) {
      console.warn(`  failed ${relativePath}: ${error.message}`);
      fileReports.push({ relativePath, error: error.message });
      continue;
    }

    const { original, serialized, stats } = result;
    const changed = original !== serialized;

    if (!changed) {
      // Already DTCG or no leaves at all.
      continue;
    }

    if (!dryRun) {
      fs.writeFileSync(filePath, serialized, 'utf8');
    }

    totalLeavesConverted += stats.leavesConverted;
    totalLeavesAlreadyDtcg += stats.leavesAlreadyDtcg;
    totalAttributesDropped += stats.attributesDropped;
    for (const [t, n] of stats.typesEncountered) {
      aggregateTypes.set(t, (aggregateTypes.get(t) ?? 0) + n);
    }

    fileReports.push({
      relativePath,
      leavesConverted: stats.leavesConverted,
      leavesAlreadyDtcg: stats.leavesAlreadyDtcg,
      attributesDropped: stats.attributesDropped,
      typesEncountered: Object.fromEntries(stats.typesEncountered),
    });

    const action = dryRun ? 'planned' : 'rewrote';
    console.log(`  ${action} ${relativePath} (${stats.leavesConverted} leaves)`);
  }

  console.log('');
  console.log('Summary:');
  console.log(`  files touched: ${fileReports.filter(r => r.leavesConverted > 0).length}`);
  console.log(`  leaves converted: ${totalLeavesConverted}`);
  console.log(`  leaves already DTCG (skipped): ${totalLeavesAlreadyDtcg}`);
  console.log(`  attributes dropped: ${totalAttributesDropped}`);
  console.log('  types encountered:');
  for (const [t, n] of [...aggregateTypes.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${t}: ${n}`);
  }

  if (opts.report) {
    const reportPath = path.isAbsolute(opts.report) ? opts.report : path.resolve(PROJECT_ROOT, opts.report);
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      dryRun,
      preserveAttributes,
      roots,
      totalLeavesConverted,
      totalLeavesAlreadyDtcg,
      totalAttributesDropped,
      types: Object.fromEntries(aggregateTypes),
      files: fileReports,
    }, null, 2) + '\n', 'utf8');
    console.log(`\nReport written: ${path.relative(PROJECT_ROOT, reportPath)}`);
  }

  return 0;
}

const isEntrypoint = process.argv[1] && path.resolve(process.argv[1]) === SCRIPT_FILE;
if (isEntrypoint) {
  process.exit(main());
}

export { convertFile, convertLeaf, isLegacyLeaf, isDtcgLeaf, transformTree };
