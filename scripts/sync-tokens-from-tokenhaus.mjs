#!/usr/bin/env node
/**
 * Converts a Tokenhaus Figma export (tokens-tokenhaus.json — 2026+ schema)
 * to Style Dictionary legacy-schema token files.
 *
 * Figma Plugin: https://www.figma.com/community/plugin/1578065513743190845/tokenhaus-variable-import-export-with-links
 *
 * Usage:
 *   node scripts/sync-tokens-from-tokenhaus.mjs --input <file> [-o <dir>] [--dry-run] [--report <file>] [--strict]
 *
 * Default output base is tokens/figma-export (staging, manual diff).
 * Pass --output tokens to clean-break overwrite tokens/core and tokens/core.dark.
 *
 * Generated files (under <output base>):
 *   core/palette.tokens.json              ← 2. Primitive Colors: Do not use directly
 *   core/color.tokens.json                ← 1. Semantic Colors (Light Mode)
 *   core.dark/color.tokens.json           ← 1. Semantic Colors (Dark Mode)
 *   core/font.tokens.json                 ← 4. Typography Primitives (FF + FS + FW + LH + LS placeholder)
 *   core/sizes.tokens.json                ← 3. Sizes (spacing + borderRadius + borderWidth)
 *
 * Not generated (authored manually or out of Tokenhaus scope):
 *   effects.tokens.json                   ← dropShadow.100..500 from Figma Foundations elevation
 *   screen.tokens.json                    ← breakpoints (no longer in Tokenhaus export)
 *   size.tokens.json                      ← component-level sizing
 *   zIndex.tokens.json                    ← manual
 *   linearGradient.tokens.json            ← manual
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Command, CommanderError } from 'commander';

const SCRIPT_FILE = fileURLToPath(import.meta.url);
const SCRIPT_DIR = path.dirname(SCRIPT_FILE);
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, '..');

const DEFAULT_OUTPUT_BASE = 'tokens/figma-export';
const DEFAULT_INPUT_FILE = 'tokens-tokenhaus.json';
const REPORT_VERSION = 3;
const OUTPUT_FORMAT = 'dtcg';

const EXIT_CODES = {
  success: 0,
  runtime: 1,
  usage: 2,
};

// Tokenhaus top-level section names (2026+ schema)
const SECTION_PRIMITIVE_COLORS = '2. Primitive Colors: Do not use directly';
const SECTION_SEMANTIC_COLORS = '1. Semantic Colors';
const SECTION_SIZES = '3. Sizes';
const SECTION_TYPOGRAPHY = '4. Typography Primitives';

const REQUIRED_TOP_LEVEL_SECTIONS = [
  SECTION_SEMANTIC_COLORS,
  SECTION_PRIMITIVE_COLORS,
  SECTION_SIZES,
  SECTION_TYPOGRAPHY,
];

// [section, subPath] tuples — section names contain '.' so we cannot split on it naively.
const OPTIONAL_EXPECTED_PATHS = [
  [SECTION_SEMANTIC_COLORS, 'background'],
  [SECTION_SEMANTIC_COLORS, 'border'],
  [SECTION_SEMANTIC_COLORS, 'text'],
  [SECTION_SEMANTIC_COLORS, 'icon'],
  [SECTION_PRIMITIVE_COLORS, 'alpha'],
];

const MODE_LIGHT = 'Light Mode';
const MODE_DARK = 'Dark Mode';

// Figma prefixes stripped when emitting token keys (fs-12 → 12, spacing-2 → 2).
const FIGMA_KEY_PREFIXES = ['fs-', 'lh-', 'fw-', 'spacing-', 'radius-', 'border-'];

// When --apply is used we overwrite tokens/core and tokens/core.dark directly. Files
// listed here are leftovers from the pre-2026 schema that no longer have a generator;
// they must be deleted to avoid stale tokens shadowing the new structure.
const ORPHAN_FILES_CORE = [
  'space.tokens.json',
  'spacing.tokens.json',
  'radius.tokens.json',
  'border.tokens.json',
  'lineHeight.tokens.json',
  'letterSpacing.tokens.json',
  'shadow.tokens.json',
];

const ORPHAN_FILES_DARK = [];

// Forced output base when --apply is set.
const APPLY_OUTPUT_BASE = 'tokens';

class CliError extends Error {
  constructor(message, exitCode = EXIT_CODES.runtime, details = {}) {
    super(message);
    this.name = 'CliError';
    this.exitCode = exitCode;
    Object.assign(this, details);
  }
}

// ── CLI ───────────────────────────────────────────────────────────────────────

function createProgram() {
  return new Command()
    .name('sync-tokens-from-tokenhaus')
    .description('Convert a Tokenhaus Figma export (2026+ schema) to Style Dictionary token files')
    .requiredOption('--input <file>', 'Path to tokens-tokenhaus.json', DEFAULT_INPUT_FILE)
    .option('-o, --output <dir>', 'Output base directory (parent of core/ and core.dark/)', DEFAULT_OUTPUT_BASE)
    .option(
      '--apply',
      `Clean-break mode: force output to ${APPLY_OUTPUT_BASE}/ and delete legacy orphan files in tokens/core. Destructive — combine with --dry-run to preview.`,
    )
    .option('--dry-run', 'Preview generated output without writing any token files')
    .option('--report <file>', 'Write a machine-readable JSON report to the specified file')
    .option('--strict', 'Fail when recoverable warnings or skipped sections are detected')
    .showHelpAfterError();
}

function resolveProjectPath(targetPath) {
  return path.isAbsolute(targetPath) ? path.resolve(targetPath) : path.resolve(PROJECT_ROOT, targetPath);
}

function parseCliOptions(argv = process.argv) {
  const program = createProgram();
  program.exitOverride();

  try {
    program.parse(argv);
  } catch (error) {
    if (error instanceof CommanderError && error.code === 'commander.helpDisplayed') {
      return { shouldExit: true, exitCode: EXIT_CODES.success };
    }
    if (error instanceof CommanderError) {
      throw new CliError(error.message, EXIT_CODES.usage);
    }
    throw error;
  }

  const options = program.opts();
  const apply = Boolean(options.apply);

  // --apply forces the output base. If the user also passed --output explicitly with a
  // different path, refuse rather than silently overriding — the combination is ambiguous.
  if (apply && program.getOptionValueSource('output') === 'cli' && options.output !== APPLY_OUTPUT_BASE) {
    throw new CliError(
      `--apply forces output to ${APPLY_OUTPUT_BASE}/ — remove the explicit --output or set it to "${APPLY_OUTPUT_BASE}".`,
      EXIT_CODES.usage,
    );
  }

  const outputOption = apply ? APPLY_OUTPUT_BASE : options.output;

  return {
    shouldExit: false,
    inputFile: resolveProjectPath(options.input),
    outputBase: resolveProjectPath(outputOption),
    apply,
    dryRun: Boolean(options.dryRun),
    reportFile: options.report ? resolveProjectPath(options.report) : null,
    strict: Boolean(options.strict),
  };
}

// ── UTILITIES ─────────────────────────────────────────────────────────────────

const isLeaf = obj => obj !== null && typeof obj === 'object' && '$value' in obj;

const sanitizeKey = key =>
  String(key)
    .replace(/,/g, '-')
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, '-');

const token = (value, type) => {
  // DTCG-native emission: numeric dimensions become string with `px` suffix so
  // Style Dictionary v4 (usesDtcg: true) doesn't need the `size/px` transform.
  if (type === 'dimension' && typeof value === 'number') {
    return { $value: `${value}px`, $type: type };
  }
  return { $value: value, $type: type };
};

function stripFigmaPrefix(key) {
  for (const prefix of FIGMA_KEY_PREFIXES) {
    if (key.startsWith(prefix)) return key.slice(prefix.length);
  }
  return key;
}

function createRunContext(options) {
  return {
    options,
    generated: [],
    skipped: [],
    warnings: [],
    unresolvedReferences: [],
    prunedPaths: [],
    fallbacks: [],
    notGenerated: [],
    deletedOrphans: [],
    seenWarningKeys: new Set(),
  };
}

function recordWarning(ctx, warning) {
  if (!ctx) return;
  const fingerprint = warning.fingerprint ?? `${warning.code}:${warning.path ?? warning.ref ?? warning.message}`;
  if (ctx.seenWarningKeys.has(fingerprint)) return;
  ctx.seenWarningKeys.add(fingerprint);
  ctx.warnings.push({ ...warning, fingerprint: undefined });
}

function recordUnresolvedReference(ctx, ref) {
  if (!ctx) return;
  recordWarning(ctx, {
    code: 'unresolved-reference',
    ref,
    message: `Unresolved reference namespace encountered: {${ref}}`,
    fingerprint: `unresolved-reference:${ref}`,
  });
  if (!ctx.unresolvedReferences.includes(ref)) {
    ctx.unresolvedReferences.push(ref);
  }
}

function recordFallback(ctx, fallback) {
  if (!ctx) return;
  ctx.fallbacks.push(fallback);
}

function getModeValue(valueField, mode, ctx = null, meta = {}) {
  if (typeof valueField !== 'object' || valueField === null) return valueField;
  if (mode in valueField) return valueField[mode];

  recordWarning(ctx, {
    code: 'missing-mode',
    path: meta.path,
    requestedMode: mode,
    availableModes: Object.keys(valueField),
    message: `Missing mode "${mode}"${meta.path ? ` for ${meta.path}` : ''}`,
    fingerprint: `missing-mode:${mode}:${meta.path ?? 'unknown'}`,
  });

  return '';
}

function serializeTokenFile(obj) {
  return JSON.stringify(obj, null, 2) + '\n';
}

function prepareTokenFile(outDir, filename, obj) {
  const filePath = path.join(outDir, filename);
  const content = serializeTokenFile(obj);

  return {
    filePath,
    relativePath: path.relative(PROJECT_ROOT, filePath),
    bytes: Buffer.byteLength(content),
    content,
  };
}

function writePreparedFile(file) {
  fs.mkdirSync(path.dirname(file.filePath), { recursive: true });
  fs.writeFileSync(file.filePath, file.content, 'utf8');
}

function formatPathForLog(targetPath) {
  const relative = path.relative(PROJECT_ROOT, targetPath);
  return relative && !relative.startsWith('..') ? relative : targetPath;
}

function getLineColumnFromOffset(text, offset) {
  const safeOffset = Math.max(0, Math.min(offset, text.length));
  const before = text.slice(0, safeOffset);
  const lines = before.split(/\r\n|\n/);
  return {
    line: lines.length,
    column: lines[lines.length - 1].length + 1,
  };
}

function formatJsonParseError(filePath, raw, error) {
  const message = error instanceof Error ? error.message : String(error);
  const positionMatch = /position\s+(\d+)/i.exec(message);
  if (!positionMatch) {
    return `Invalid JSON in ${formatPathForLog(filePath)}: ${message}`;
  }

  const position = Number(positionMatch[1]);
  const { line, column } = getLineColumnFromOffset(raw, position);
  return `Invalid JSON in ${formatPathForLog(filePath)} at line ${line}, column ${column}: ${message}`;
}

function readJsonWithContext(filePath) {
  let raw;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    throw new CliError(`Unable to read ${formatPathForLog(filePath)}: ${error.message}`);
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new CliError(formatJsonParseError(filePath, raw, error));
  }
}

function findExistingAncestor(targetPath) {
  let current = path.resolve(targetPath);
  while (!fs.existsSync(current)) {
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
  return current;
}

function assertReadableFile(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new CliError(`${label} not found: ${filePath}`);
  }
  const stats = fs.statSync(filePath);
  if (!stats.isFile()) {
    throw new CliError(`${label} must be a file: ${filePath}`);
  }
  try {
    fs.accessSync(filePath, fs.constants.R_OK);
  } catch {
    throw new CliError(`${label} is not readable: ${filePath}`);
  }
}

function assertDirectoryTarget(directoryPath, label) {
  if (fs.existsSync(directoryPath) && !fs.statSync(directoryPath).isDirectory()) {
    throw new CliError(`${label} must be a directory path: ${directoryPath}`);
  }
  const writableAncestor = findExistingAncestor(directoryPath);
  if (!writableAncestor) {
    throw new CliError(`Unable to find a writable parent for ${label}: ${directoryPath}`);
  }
  try {
    fs.accessSync(writableAncestor, fs.constants.W_OK);
  } catch {
    throw new CliError(`${label} is not writable: ${directoryPath}`);
  }
}

function assertFileTarget(filePath, label) {
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    throw new CliError(`${label} must be a file path: ${filePath}`);
  }
  const parentDir = path.dirname(filePath);
  const writableAncestor = findExistingAncestor(parentDir);
  if (!writableAncestor) {
    throw new CliError(`Unable to find a writable parent for ${label}: ${filePath}`);
  }
  try {
    fs.accessSync(writableAncestor, fs.constants.W_OK);
  } catch {
    throw new CliError(`${label} is not writable: ${filePath}`);
  }
}

function validateCliOptions(options) {
  assertReadableFile(options.inputFile, 'Input file');

  if (!options.dryRun) {
    assertDirectoryTarget(options.outputBase, 'Output directory');
  }

  if (options.reportFile) {
    assertFileTarget(options.reportFile, 'Report file');
  }
}

// ── INPUT VALIDATION ──────────────────────────────────────────────────────────

function hasObjectAtSectionPath(root, section, subPath) {
  const sectionData = root[section];
  if (sectionData == null || typeof sectionData !== 'object') return undefined;
  return subPath.split('.').reduce((current, segment) => {
    if (current == null || typeof current !== 'object') return undefined;
    return current[segment];
  }, sectionData);
}

function validateInputStructure(data) {
  const missingTopLevel = REQUIRED_TOP_LEVEL_SECTIONS.filter(section => !(section in data));
  if (missingTopLevel.length) {
    throw new CliError(
      `Tokenhaus export is missing required top-level sections: ${missingTopLevel.join(', ')}. ` +
        `Check that the input file is a complete Tokenhaus export (2026+ schema).`,
    );
  }

  return {
    missingOptionalPaths: OPTIONAL_EXPECTED_PATHS.filter(
      ([section, subPath]) => hasObjectAtSectionPath(data, section, subPath) === undefined,
    ).map(([section, subPath]) => `${section}.${subPath}`),
  };
}

// ── REFERENCE REWRITING ───────────────────────────────────────────────────────

function rewriteRef(value, ctx) {
  if (typeof value !== 'string') return value;
  return value.replace(/\{([^}]+)\}/g, (_, tokenPath) => `{${rewritePath(tokenPath, ctx)}}`);
}

function rewritePath(tokenPath, ctx) {
  // Primitive colors → palette
  if (tokenPath.startsWith(`${SECTION_PRIMITIVE_COLORS}.`)) {
    return `palette.${tokenPath.slice(SECTION_PRIMITIVE_COLORS.length + 1)}`;
  }

  // Typography primitives
  if (tokenPath.startsWith(`${SECTION_TYPOGRAPHY}.font-size.`)) {
    return `fontSize.${stripFigmaPrefix(tokenPath.slice(SECTION_TYPOGRAPHY.length + 11))}`;
  }
  if (tokenPath.startsWith(`${SECTION_TYPOGRAPHY}.line-height.`)) {
    return `lineHeight.${stripFigmaPrefix(tokenPath.slice(SECTION_TYPOGRAPHY.length + 13))}`;
  }
  if (tokenPath.startsWith(`${SECTION_TYPOGRAPHY}.font-weight.`)) {
    return `fontWeight.${stripFigmaPrefix(tokenPath.slice(SECTION_TYPOGRAPHY.length + 13))}`;
  }
  if (tokenPath.startsWith(`${SECTION_TYPOGRAPHY}.font-family.`)) {
    const key = tokenPath.slice(SECTION_TYPOGRAPHY.length + 13);
    return `fontFamily.${key === 'primary-font' ? 'primary' : stripFigmaPrefix(key)}`;
  }

  // Sizes
  if (tokenPath.startsWith(`${SECTION_SIZES}.spacings.`)) {
    return `spacing.${stripFigmaPrefix(tokenPath.slice(SECTION_SIZES.length + 10))}`;
  }
  if (tokenPath.startsWith(`${SECTION_SIZES}.border-radius.`)) {
    return `borderRadius.${stripFigmaPrefix(tokenPath.slice(SECTION_SIZES.length + 15))}`;
  }
  if (tokenPath.startsWith(`${SECTION_SIZES}.border-width.`)) {
    return `borderWidth.${sanitizeKey(stripFigmaPrefix(tokenPath.slice(SECTION_SIZES.length + 14)))}`;
  }

  recordUnresolvedReference(ctx, tokenPath);
  return tokenPath;
}

// ── EXTRACTORS ────────────────────────────────────────────────────────────────

function extractPalette(data, ctx) {
  const src = data[SECTION_PRIMITIVE_COLORS];
  if (!src) throw new Error(`Missing "${SECTION_PRIMITIVE_COLORS}" in export`);

  const palette = {};

  for (const [groupName, group] of Object.entries(src)) {
    if (groupName.startsWith('$')) continue;
    if (typeof group !== 'object' || group === null) continue;

    if (groupName === 'alpha') {
      const alphaOut = {};
      for (const [channelName, channelGroup] of Object.entries(group)) {
        if (typeof channelGroup !== 'object' || channelGroup === null) continue;
        const channelOut = {};
        for (const [step, leaf] of Object.entries(channelGroup)) {
          if (!isLeaf(leaf) || leaf.$type !== 'color') continue;
          const raw = leaf.$value;
          if (raw === '' || raw === null || raw === undefined) continue;
          channelOut[sanitizeKey(step)] = token(raw, 'color');
        }
        if (Object.keys(channelOut).length > 0) alphaOut[sanitizeKey(channelName)] = channelOut;
      }
      if (Object.keys(alphaOut).length > 0) palette.alpha = alphaOut;
      continue;
    }

    const ramp = {};
    for (const [step, leaf] of Object.entries(group)) {
      if (!isLeaf(leaf) || leaf.$type !== 'color') continue;
      const raw = leaf.$value;
      if (raw === '' || raw === null || raw === undefined) continue;
      ramp[sanitizeKey(step)] = token(raw, 'color');
    }
    if (Object.keys(ramp).length > 0) palette[sanitizeKey(groupName)] = ramp;
  }

  return { palette };
}

function extractSemanticColors(data, modeName, ctx) {
  const src = data[SECTION_SEMANTIC_COLORS];
  if (!src) throw new Error(`Missing "${SECTION_SEMANTIC_COLORS}" in export`);

  function walk(node, pathParts) {
    if (isLeaf(node)) {
      if (node.$type !== 'color') return undefined;
      const raw = getModeValue(node.$value, modeName, ctx, {
        path: `${SECTION_SEMANTIC_COLORS}.${pathParts.join('.')}`,
      });
      if (raw === '' || raw === null || raw === undefined) return undefined;
      const normalized = typeof raw === 'string' ? rewriteRef(raw, ctx) : raw;
      return token(normalized, 'color');
    }

    if (node === null || typeof node !== 'object') return undefined;

    const out = {};
    for (const [key, value] of Object.entries(node)) {
      if (key.startsWith('$')) continue;
      const result = walk(value, [...pathParts, key]);
      if (result === undefined) continue;
      out[sanitizeKey(key)] = result;
    }
    return Object.keys(out).length > 0 ? out : undefined;
  }

  const color = {};
  for (const [groupName, group] of Object.entries(src)) {
    if (groupName.startsWith('$')) continue;
    if (groupName === 'hack') {
      recordFallback(ctx, {
        kind: 'skipped-section',
        path: `${SECTION_SEMANTIC_COLORS}.hack`,
        reason: 'Figma placeholder (do-not-implement) — intentionally excluded from generated tokens',
      });
      continue;
    }
    const result = walk(group, [groupName]);
    if (result !== undefined) color[sanitizeKey(groupName)] = result;
  }

  if (Object.keys(color).length === 0) {
    throw new Error(`No semantic colors found for mode "${modeName}"`);
  }

  return { color };
}

function readLeafScalar(leaf, ctx, pathLabel) {
  if (!isLeaf(leaf)) return undefined;
  const raw = typeof leaf.$value === 'object' && leaf.$value !== null
    ? getModeValue(leaf.$value, MODE_LIGHT, ctx, { path: pathLabel })
    : leaf.$value;
  if (raw === '' || raw === null || raw === undefined) return undefined;
  return raw;
}

function extractTypography(data, ctx) {
  const src = data[SECTION_TYPOGRAPHY];
  if (!src) throw new Error(`Missing "${SECTION_TYPOGRAPHY}" in export`);

  const fontFamily = {};
  for (const [key, leaf] of Object.entries(src['font-family'] ?? {})) {
    const raw = readLeafScalar(leaf, ctx, `${SECTION_TYPOGRAPHY}.font-family.${key}`);
    if (raw === undefined) continue;
    const outKey = key === 'primary-font' ? 'primary' : stripFigmaPrefix(key);
    fontFamily[outKey] = token(raw, 'fontFamily');
  }

  const fontSize = {};
  for (const [key, leaf] of Object.entries(src['font-size'] ?? {})) {
    const raw = readLeafScalar(leaf, ctx, `${SECTION_TYPOGRAPHY}.font-size.${key}`);
    if (raw === undefined) continue;
    fontSize[stripFigmaPrefix(key)] = token(raw, 'dimension');
  }

  const fontWeight = {};
  for (const [key, leaf] of Object.entries(src['font-weight'] ?? {})) {
    const raw = readLeafScalar(leaf, ctx, `${SECTION_TYPOGRAPHY}.font-weight.${key}`);
    if (raw === undefined) continue;
    fontWeight[stripFigmaPrefix(key)] = token(raw, 'fontWeight');
  }

  const lineHeight = {};
  for (const [key, leaf] of Object.entries(src['line-height'] ?? {})) {
    const raw = readLeafScalar(leaf, ctx, `${SECTION_TYPOGRAPHY}.line-height.${key}`);
    if (raw === undefined) continue;
    lineHeight[stripFigmaPrefix(key)] = token(raw, 'dimension');
  }

  // letterSpacing is not in the Tokenhaus export. Kept as an empty placeholder so consumers
  // can extend manually until Figma adds the variable.
  const letterSpacing = {};

  return { fontFamily, fontSize, fontWeight, lineHeight, letterSpacing };
}

function extractSizes(data, ctx) {
  const src = data[SECTION_SIZES];
  if (!src) throw new Error(`Missing "${SECTION_SIZES}" in export`);

  const spacing = {};
  for (const [key, leaf] of Object.entries(src.spacings ?? {})) {
    const raw = readLeafScalar(leaf, ctx, `${SECTION_SIZES}.spacings.${key}`);
    const outKey = stripFigmaPrefix(key);
    if (raw === undefined) {
      // spacing-0 ships as $value:"" in Figma — emit 0 explicitly so the scale stays complete.
      if (outKey === '0' || key === 'spacing-0') {
        spacing[outKey] = token(0, 'dimension');
        recordFallback(ctx, {
          kind: 'generated-zero',
          path: `${SECTION_SIZES}.spacings.${key}`,
          outputKey: `spacing.${outKey}`,
          reason: 'Blank Tokenhaus spacing-0 mapped to 0 to preserve the zero rung',
        });
      }
      continue;
    }
    spacing[outKey] = token(raw, 'dimension');
  }

  const borderRadius = {};
  for (const [key, leaf] of Object.entries(src['border-radius'] ?? {})) {
    const raw = readLeafScalar(leaf, ctx, `${SECTION_SIZES}.border-radius.${key}`);
    const outKey = stripFigmaPrefix(key);
    if (outKey === 'full') {
      borderRadius.full = token('9999px', 'dimension');
      continue;
    }
    if (raw === undefined) {
      if (outKey === '0' || key === 'radius-0') {
        borderRadius[outKey] = token(0, 'dimension');
        recordFallback(ctx, {
          kind: 'generated-zero',
          path: `${SECTION_SIZES}.border-radius.${key}`,
          outputKey: `borderRadius.${outKey}`,
          reason: 'Blank Tokenhaus radius-0 mapped to 0 to preserve the zero rung',
        });
      }
      continue;
    }
    if (typeof raw === 'number' && raw >= 999) {
      // Figma emits 999 for the "full" rung in some exports — coerce to a string with explicit unit.
      borderRadius[outKey] = token('9999px', 'dimension');
      continue;
    }
    borderRadius[outKey] = token(raw, 'dimension');
  }

  const borderWidth = {};
  for (const [key, leaf] of Object.entries(src['border-width'] ?? {})) {
    const raw = readLeafScalar(leaf, ctx, `${SECTION_SIZES}.border-width.${key}`);
    if (raw === undefined) continue;
    const outKey = sanitizeKey(stripFigmaPrefix(key));
    borderWidth[outKey] = token(raw, 'dimension');
  }

  // mobile/desktop scalars at the top of "3. Sizes" are Figma artifacts (no consumer in
  // this pipeline). They are intentionally skipped.

  return { spacing, borderRadius, borderWidth };
}

// ── PIPELINE ──────────────────────────────────────────────────────────────────

function runExtraction(ctx, label, outDir, filename, producer) {
  try {
    const obj = producer();
    const prepared = prepareTokenFile(outDir, filename, obj);

    if (!ctx.options.dryRun) {
      writePreparedFile(prepared);
      console.log(`  wrote ${prepared.relativePath}`);
    } else {
      console.log(`  planned ${prepared.relativePath}`);
    }

    ctx.generated.push({
      label,
      filePath: prepared.filePath,
      relativePath: prepared.relativePath,
      bytes: prepared.bytes,
      written: !ctx.options.dryRun,
    });

    return prepared;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.warn(`  skipped ${label}: ${reason}`);
    ctx.skipped.push({ label, reason });
    return null;
  }
}

function cleanOrphanFiles(ctx, outCore, outDark) {
  const targets = [
    ...ORPHAN_FILES_CORE.map(name => ({ dir: outCore, name })),
    ...ORPHAN_FILES_DARK.map(name => ({ dir: outDark, name })),
  ];

  console.log(`\nOrphan cleanup (${ctx.options.dryRun ? 'DRY RUN' : 'WRITE'}):`);

  for (const { dir, name } of targets) {
    const filePath = path.join(dir, name);
    const relativePath = path.relative(PROJECT_ROOT, filePath);
    const exists = fs.existsSync(filePath);

    if (!exists) {
      console.log(`  skipped (not present): ${relativePath}`);
      ctx.deletedOrphans.push({ relativePath, status: 'absent' });
      continue;
    }

    if (ctx.options.dryRun) {
      console.log(`  planned delete: ${relativePath}`);
      ctx.deletedOrphans.push({ relativePath, status: 'planned' });
      continue;
    }

    fs.unlinkSync(filePath);
    console.log(`  deleted: ${relativePath}`);
    ctx.deletedOrphans.push({ relativePath, status: 'deleted' });
  }
}

function buildReport(ctx, metadata) {
  return {
    version: REPORT_VERSION,
    timestamp: new Date().toISOString(),
    schemaVersion: 'tokenhaus-2026',
    outputFormat: OUTPUT_FORMAT,
    apply: metadata.options.apply,
    dryRun: metadata.options.dryRun,
    strict: metadata.options.strict,
    inputFile: metadata.options.inputFile,
    outputBase: metadata.options.outputBase,
    reportFile: metadata.options.reportFile,
    generatedCount: ctx.generated.length,
    skippedCount: ctx.skipped.length,
    warningCount: ctx.warnings.length,
    unresolvedReferenceCount: ctx.unresolvedReferences.length,
    prunedCount: ctx.prunedPaths.length,
    deletedOrphanCount: ctx.deletedOrphans.filter(entry => entry.status === 'deleted').length,
    generated: ctx.generated.map(({ content, ...entry }) => entry),
    skipped: ctx.skipped,
    warnings: ctx.warnings,
    unresolvedReferences: ctx.unresolvedReferences,
    prunedPaths: ctx.prunedPaths,
    fallbacks: ctx.fallbacks,
    notGenerated: ctx.notGenerated,
    deletedOrphans: ctx.deletedOrphans,
  };
}

function writeReport(filePath, report) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(report, null, 2) + '\n', 'utf8');
}

function getStrictViolationCount(ctx) {
  const strictWarnings = ctx.warnings.filter(
    warning => warning.code === 'missing-mode' || warning.code === 'unresolved-reference',
  );
  return ctx.skipped.length + strictWarnings.length;
}

function printSummary(ctx, metadata) {
  const deletedCount = ctx.deletedOrphans.filter(entry => entry.status === 'deleted').length;
  const plannedDeletes = ctx.deletedOrphans.filter(entry => entry.status === 'planned').length;

  console.log('\nSummary:');
  console.log(`  generated: ${ctx.generated.length} ${metadata.options.dryRun ? '(planned)' : '(written)'}`);
  console.log(`  skipped: ${ctx.skipped.length}`);
  console.log(`  warnings: ${ctx.warnings.length}`);
  console.log(`  unresolved refs: ${ctx.unresolvedReferences.length}`);
  console.log(`  fallbacks: ${ctx.fallbacks.length}`);
  if (metadata.options.apply) {
    console.log(`  orphans: ${metadata.options.dryRun ? `${plannedDeletes} (planned)` : `${deletedCount} (deleted)`}`);
  }

  if (ctx.skipped.length > 0) {
    console.log('\nSkipped outputs:');
    for (const { label, reason } of ctx.skipped) {
      console.log(`  ${label}: ${reason}`);
    }
  }

  if (ctx.unresolvedReferences.length > 0) {
    console.log('\nUnresolved reference namespaces:');
    for (const ref of ctx.unresolvedReferences) {
      console.log(`  {${ref}}`);
    }
  }

  const optionalWarnings = ctx.warnings.filter(warning => warning.code === 'missing-optional-section');
  if (optionalWarnings.length > 0) {
    console.log('\nOptional export sections not found:');
    for (const warning of optionalWarnings) {
      console.log(`  ${warning.path}`);
    }
  }

  const missingModeWarnings = ctx.warnings.filter(warning => warning.code === 'missing-mode');
  if (missingModeWarnings.length > 0) {
    console.log(`\nMode lookups that failed (${missingModeWarnings.length}):`);
    for (const warning of missingModeWarnings.slice(0, 10)) {
      console.log(`  ${warning.requestedMode} @ ${warning.path}`);
    }
    if (missingModeWarnings.length > 10) {
      console.log(`  ... and ${missingModeWarnings.length - 10} more`);
    }
  }

  if (ctx.options.reportFile) {
    console.log(`\nReport: ${formatPathForLog(ctx.options.reportFile)}`);
  }
}

function printNextSteps(options) {
  const outCore = formatPathForLog(path.join(options.outputBase, 'core'));
  const outDark = formatPathForLog(path.join(options.outputBase, 'core.dark'));

  if (options.apply) {
    const action = options.dryRun
      ? 'would overwrite tokens/core and tokens/core.dark, and remove legacy orphans'
      : 'wrote directly to tokens/core and tokens/core.dark, and removed legacy orphans';
    console.log(`
Done. Apply mode ${action}.
Next steps:
  1. Verify tokens/core/effects.tokens.json exists (carry-forward from shadow.tokens.json).
     If missing, author it manually before yarn tokens.build (drop-shadow.100..500).
  2. yarn tokens.build && yarn tokens.lint.all
  3. Run yarn test:scripts to confirm regression suite passes.
  4. Update src/components/ CSS variable references — see plan PR D for migration script.`);
    return;
  }

  console.log(`
Done. Next steps:
  1. Inspect generated foundation files:
     - ${outCore}/palette.tokens.json
     - ${outCore}/color.tokens.json
     - ${outCore}/font.tokens.json
     - ${outCore}/sizes.tokens.json
     - ${outDark}/color.tokens.json
  2. Diff against current tokens/core:
     diff -r ${outCore} tokens/core
  3. For a clean break, re-run with --apply to overwrite tokens/core and tokens/core.dark
     and delete legacy orphan files automatically.
  4. Author tokens/core/effects.tokens.json manually with drop-shadow.100..500 (Figma elevation 1-5).
  5. yarn tokens.build && yarn tokens.lint.all`);
}

async function main(argv = process.argv) {
  const options = parseCliOptions(argv);
  if (options.shouldExit) {
    return { exitCode: options.exitCode };
  }

  validateCliOptions(options);

  const modeLabel = `${options.dryRun ? 'DRY RUN' : 'WRITE'}${options.apply ? ' + APPLY (clean-break)' : ''}`;
  console.log(`Reading: ${formatPathForLog(options.inputFile)}`);
  console.log(`Output:  ${formatPathForLog(options.outputBase)}`);
  console.log(`Mode:    ${modeLabel}`);
  if (options.reportFile) {
    console.log(`Report:  ${formatPathForLog(options.reportFile)}`);
  }
  console.log('');

  const data = readJsonWithContext(options.inputFile);
  const structure = validateInputStructure(data);
  const ctx = createRunContext(options);

  for (const dotPath of structure.missingOptionalPaths) {
    recordWarning(ctx, {
      code: 'missing-optional-section',
      path: dotPath,
      message: `Optional Tokenhaus section not found: ${dotPath}`,
      fingerprint: `missing-optional-section:${dotPath}`,
    });
  }

  const outCore = path.join(options.outputBase, 'core');
  const outDark = path.join(options.outputBase, 'core.dark');

  runExtraction(ctx, 'palette.tokens.json', outCore, 'palette.tokens.json',
    () => extractPalette(data, ctx));

  runExtraction(ctx, 'color.tokens.json (Light)', outCore, 'color.tokens.json',
    () => extractSemanticColors(data, MODE_LIGHT, ctx));

  runExtraction(ctx, 'core.dark/color.tokens.json', outDark, 'color.tokens.json',
    () => extractSemanticColors(data, MODE_DARK, ctx));

  runExtraction(ctx, 'font.tokens.json', outCore, 'font.tokens.json',
    () => extractTypography(data, ctx));

  runExtraction(ctx, 'sizes.tokens.json', outCore, 'sizes.tokens.json',
    () => extractSizes(data, ctx));

  if (options.apply) {
    cleanOrphanFiles(ctx, outCore, outDark);
  }

  ctx.notGenerated = [
    { file: 'effects.tokens.json', reason: 'not in Tokenhaus export — author manually (drop-shadow.100..500 from Figma elevation 1-5)' },
    { file: 'screen.tokens.json', reason: 'not in Tokenhaus export — breakpoints removed from Figma' },
    { file: 'size.tokens.json', reason: 'not in Tokenhaus export — component sizing authored manually' },
    { file: 'zIndex.tokens.json', reason: 'not in Tokenhaus export — authored manually' },
    { file: 'linearGradient.tokens.json', reason: 'not in Tokenhaus export — authored manually' },
    { file: 'letterSpacing (in font.tokens.json)', reason: 'not in Tokenhaus export — emitted as empty placeholder' },
  ];

  const report = buildReport(ctx, { options });

  if (options.reportFile) {
    writeReport(options.reportFile, report);
  }

  printSummary(ctx, { options });

  if (ctx.notGenerated.length > 0) {
    console.log('\nNot generated (existing canonical files untouched):');
    for (const entry of ctx.notGenerated) {
      console.log(`  ${entry.file}: ${entry.reason}`);
    }
  }

  const strictViolationCount = getStrictViolationCount(ctx);
  if (options.strict && strictViolationCount > 0) {
    console.error(
      `\nStrict mode failed due to ${strictViolationCount} recoverable issue(s). Review the warnings above or rerun without --strict.`,
    );
    return {
      exitCode: EXIT_CODES.runtime,
      report,
      context: ctx,
      options,
    };
  }

  printNextSteps(options);

  return {
    exitCode: EXIT_CODES.success,
    report,
    context: ctx,
    options,
  };
}

function isEntrypoint() {
  return process.argv[1] ? path.resolve(process.argv[1]) === SCRIPT_FILE : false;
}

function printFatalError(error) {
  if (error instanceof CliError) {
    console.error(`Error: ${error.message}`);
    process.exit(error.exitCode ?? EXIT_CODES.runtime);
  }
  console.error(`Fatal error: ${error.message}`);
  console.error(error);
  process.exit(EXIT_CODES.runtime);
}

export {
  APPLY_OUTPUT_BASE,
  CliError,
  MODE_DARK,
  MODE_LIGHT,
  ORPHAN_FILES_CORE,
  ORPHAN_FILES_DARK,
  PROJECT_ROOT,
  SECTION_PRIMITIVE_COLORS,
  SECTION_SEMANTIC_COLORS,
  SECTION_SIZES,
  SECTION_TYPOGRAPHY,
  cleanOrphanFiles,
  createRunContext,
  extractPalette,
  extractSemanticColors,
  extractSizes,
  extractTypography,
  getModeValue,
  main,
  parseCliOptions,
  readJsonWithContext,
  rewritePath,
  rewriteRef,
  stripFigmaPrefix,
  validateInputStructure,
};

if (isEntrypoint()) {
  main()
    .then(result => process.exit(result.exitCode))
    .catch(printFatalError);
}
