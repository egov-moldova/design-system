#!/usr/bin/env node
/**
 * Converts a Tokenhaus Figma export (tokens-tokenhaus.json) to Style Dictionary
 * legacy-schema token files matching the tokens/core and tokens/core.dark structure.
 *
 * Figma Plugin: https://www.figma.com/community/plugin/1578065513743190845/tokenhaus-variable-import-export-with-links
 *
 * Usage:
 *   node scripts/sync-tokens-from-tokenhaus.mjs --input <file> [-o <dir>] [--brand <mode>] [--dry-run] [--report <file>] [--strict]
 *
 * Generated files land in tokens/figma-export/ (never overwrites tokens/core/).
 * Review and diff, then manually copy whichever files pass.
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
const REPORT_VERSION = 1;

const EXIT_CODES = {
  success: 0,
  runtime: 1,
  usage: 2,
};

const REQUIRED_TOP_LEVEL_SECTIONS = ['Core colors palette', 'Color tokens', 'Core numbers', 'Typography', 'Screen'];

const OPTIONAL_EXPECTED_PATHS = ['Screen.Spacing', 'Screen.Border.Width', 'Typography.Font.line-height'];

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
    .description('Convert a Tokenhaus Figma export to Style Dictionary token files')
    .requiredOption('--input <file>', 'Path to tokens-tokenhaus.json', DEFAULT_INPUT_FILE)
    .option('-o, --output <dir>', 'Output base directory', DEFAULT_OUTPUT_BASE)
    .option('--brand <mode>', 'Brand mode for palette values')
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
      return {
        shouldExit: true,
        exitCode: EXIT_CODES.success,
      };
    }

    if (error instanceof CommanderError) {
      throw new CliError(error.message, EXIT_CODES.usage);
    }

    throw error;
  }

  const options = program.opts();

  return {
    shouldExit: false,
    inputFile: resolveProjectPath(options.input),
    outputBase: resolveProjectPath(options.output),
    brand: options.brand ?? null,
    dryRun: Boolean(options.dryRun),
    reportFile: options.report ? resolveProjectPath(options.report) : null,
    strict: Boolean(options.strict),
  };
}

// ── NAMING MAPS ───────────────────────────────────────────────────────────────

const SPACE_KEY_MAP = {
  '6Xsm': '6xs',
  '5Xsm': '5xs',
  '4Xsm': '4xs',
  '3Xsm': '3xs',
  '2Xsm': '2xs',
  'Xsm': 'xs',
  'sm': 'sm',
  'md': 'md',
  'lg': 'lg',
  'Xlg': 'xl',
  '2Xlg': '2xl',
  '3Xlg': '3xl',
  '4Xlg': '4xl',
  '5Xlg': '5xl',
  '6Xlg': '6xl',
  '7Xlg': '7xl',
  '8Xlg': '8xl',
  '96px (6rem)': '9xl',
};

const SPACE_ORDER = [
  'none',
  '6xs',
  '5xs',
  '4xs',
  '3xs',
  '2xs',
  'xs',
  'sm',
  'md',
  'lg',
  'xl',
  '2xl',
  '3xl',
  '4xl',
  '5xl',
  '6xl',
  '7xl',
  '8xl',
  '9xl',
];

const RADIUS_KEY_MAP = {
  '0': 'none',
  'Xsm': 'xs',
  'sm': 'sm',
  'md': 'md',
  'lg': 'lg',
  'Xlg': 'xl',
  '2Xlg': '2xl',
  '3Xlg': '3xl',
  '100%': 'full',
};

const RADIUS_ORDER = ['none', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', 'full'];

const FONTSIZE_KEY_MAP = {
  '3XS': '3xs',
  '2XS': '2xs',
  'XS': 'xs',
  'S': 'sm',
  'M': 'md',
  'L': 'lg',
  'XL': 'xl',
  '2XL': '2xl',
  '3XL': '3xl',
  '4XL': '4xl',
  '5XL': '5xl',
};

const LINEHEIGHT_KEY_MAP = {
  '2XS': '2xs',
  'XS': 'xs',
  'S': 'sm',
  'M': 'md',
  'L': 'lg',
  'XL': 'xl',
  '2XL': '2xl',
  '3XL': '3xl',
  '4XL': '4xl',
  '5XL': '5xl',
};

// Only font weights present in the Tokenhaus export
const FONTWEIGHT_MAP = {
  'light': { key: 'light', value: 300 },
  'regular': { key: 'normal', value: 400 },
  'semi-bold': { key: 'semiBold', value: 600 },
};

// Full font-family stacks (Tokenhaus only exports the bare family name)
const FONT_FAMILY_STACK = {
  body: "'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  heading: "'Bebas Neue', sans-serif",
};

// ── POST-PROCESSING: PRUNE UNWANTED PATHS ─────────────────────────────────────
//
// Dot-notation paths to remove from the generated color token files.
// Both color.tokens.json (light) and core.dark/color.tokens.json share this list.
// Use per-file overrides via COLOR_PRUNE_EXTRA if a section only exists in one theme.
//
// Examples:
//   'color.system'                 — remove entire system section
//   'color.primary.transparent'    — remove one sub-group
//   'color.neutral.background'     — remove one category
//
const COLOR_PRUNE_PATHS = [
  'color.components',
  'color.attributes',
  // 'color.system',
  // 'color.primary.transparent',
];

// Per-file extra removals (applied on top of COLOR_PRUNE_PATHS).
// Keys must match the label passed to runExtraction(): 'color.tokens.json (light)' or 'core.dark/color.tokens.json'
const COLOR_PRUNE_EXTRA = {
  'color.tokens.json (light)': [
    // 'color.neutral.transparent',
  ],
  'core.dark/color.tokens.json': [
    // 'color.neutral.transparent',
  ],
};

// ── UTILITIES ─────────────────────────────────────────────────────────────────

const isLeaf = obj => obj !== null && typeof obj === 'object' && '$value' in obj;

const sanitizeKey = key =>
  key
    .toLowerCase()
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, '-');

const token = (value, type, attributes) => {
  const out = { value, type };
  if (attributes) out.attributes = attributes;
  return out;
};

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

function deleteAtPath(obj, dotPath) {
  const keys = dotPath.split('.');
  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    if (current == null || typeof current !== 'object') return false;
    current = current[keys[i]];
  }

  if (current != null && typeof current === 'object' && keys[keys.length - 1] in current) {
    delete current[keys[keys.length - 1]];
    return true;
  }

  return false;
}

function pruneColorTokens(obj, label, ctx) {
  const paths = [...COLOR_PRUNE_PATHS, ...(COLOR_PRUNE_EXTRA[label] ?? [])];
  for (const dotPath of paths) {
    if (deleteAtPath(obj, dotPath) && ctx) {
      ctx.prunedPaths.push({ label, path: dotPath });
    }
  }
  return obj;
}

const stripLeadingZero = str => String(str).replace(/^0+(\d)/, '$1');

// Numeric step keys may carry an annotation suffix (e.g. "07 -brand" → "7-brand").
// Descriptive keys (e.g. "Dark warm gray") get kebab-cased via sanitizeKey.
const normalizeRampKey = key => (/^\d/.test(key) ? stripLeadingZero(sanitizeKey(key)) : sanitizeKey(key));

const extractPct = key => {
  const match = key.match(/-(\d+)%$/);
  return match ? match[1] : key.replace('%', '').replace(/^0+(\d)/, '$1');
};

function hex8ToRgba(hex) {
  const match = /^#([0-9a-fA-F]{6})([0-9a-fA-F]{2})$/i.exec(hex);
  if (!match) return hex;

  const r = parseInt(match[1].slice(0, 2), 16);
  const g = parseInt(match[1].slice(2, 4), 16);
  const b = parseInt(match[1].slice(4, 6), 16);
  const a = Math.round((parseInt(match[2], 16) / 255) * 100) / 100;

  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function reorder(obj, order) {
  const out = {};
  for (const key of order) {
    if (key in obj) out[key] = obj[key];
  }
  for (const key of Object.keys(obj)) {
    if (!(key in out)) out[key] = obj[key];
  }
  return out;
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

function validateOutputSafety(outputBase) {
  const canonicalCore = path.resolve(PROJECT_ROOT, 'tokens/core');
  const canonicalDark = path.resolve(PROJECT_ROOT, 'tokens/core.dark');
  const outputCore = path.resolve(outputBase, 'core');
  const outputDark = path.resolve(outputBase, 'core.dark');

  if (outputCore === canonicalCore || outputDark === canonicalDark) {
    throw new CliError(
      `Refusing to write directly into canonical token directories. Choose an output base other than ${formatPathForLog(
        path.resolve(PROJECT_ROOT, 'tokens'),
      )}.`,
    );
  }
}

function validateCliOptions(options) {
  assertReadableFile(options.inputFile, 'Input file');
  validateOutputSafety(options.outputBase);

  if (!options.dryRun) {
    assertDirectoryTarget(options.outputBase, 'Output directory');
  }

  if (options.reportFile) {
    assertFileTarget(options.reportFile, 'Report file');
  }
}

function hasObjectAtPath(root, dotPath) {
  return dotPath.split('.').reduce((current, segment) => {
    if (current == null || typeof current !== 'object') return undefined;
    return current[segment];
  }, root);
}

function validateInputStructure(data) {
  const missingTopLevel = REQUIRED_TOP_LEVEL_SECTIONS.filter(section => !(section in data));
  if (missingTopLevel.length) {
    throw new CliError(
      `Tokenhaus export is missing required top-level sections: ${missingTopLevel.join(', ')}. Check that the input file is a complete Tokenhaus export.`,
    );
  }

  return {
    missingOptionalPaths: OPTIONAL_EXPECTED_PATHS.filter(dotPath => hasObjectAtPath(data, dotPath) === undefined),
  };
}

function collectPaletteModeInfo(node, orderedModes = [], seenModes = new Set(), hasModeObjects = { value: false }) {
  if (isLeaf(node)) {
    const valueField = node.$value;
    if (valueField && typeof valueField === 'object' && !Array.isArray(valueField)) {
      hasModeObjects.value = true;
      for (const key of Object.keys(valueField)) {
        if (!seenModes.has(key)) {
          seenModes.add(key);
          orderedModes.push(key);
        }
      }
    }
    return { orderedModes, hasModeObjects: hasModeObjects.value };
  }

  if (node && typeof node === 'object') {
    for (const value of Object.values(node)) {
      collectPaletteModeInfo(value, orderedModes, seenModes, hasModeObjects);
    }
  }

  return { orderedModes, hasModeObjects: hasModeObjects.value };
}

function detectAvailableBrands(data) {
  const paletteSection = data['Core colors palette'];
  if (!paletteSection) {
    return { orderedModes: [], hasModeObjects: false };
  }

  return collectPaletteModeInfo(paletteSection);
}

function resolveBrand(data, requestedBrand) {
  const { orderedModes, hasModeObjects } = detectAvailableBrands(data);
  const availableBrands = orderedModes;
  const brand = requestedBrand ?? availableBrands[0] ?? null;

  if (requestedBrand && availableBrands.length > 0 && !availableBrands.includes(requestedBrand)) {
    throw new CliError(`Brand "${requestedBrand}" not found. Available brands: ${availableBrands.join(', ')}`);
  }

  if (!brand && hasModeObjects) {
    throw new CliError('Unable to detect a palette brand. Provide --brand explicitly or verify the Tokenhaus export.');
  }

  return { brand, availableBrands };
}

function buildReport(ctx, metadata) {
  return {
    version: REPORT_VERSION,
    timestamp: new Date().toISOString(),
    dryRun: metadata.options.dryRun,
    strict: metadata.options.strict,
    brand: metadata.brand,
    availableBrands: metadata.availableBrands,
    inputFile: metadata.options.inputFile,
    outputBase: metadata.options.outputBase,
    reportFile: metadata.options.reportFile,
    generatedCount: ctx.generated.length,
    skippedCount: ctx.skipped.length,
    warningCount: ctx.warnings.length,
    unresolvedReferenceCount: ctx.unresolvedReferences.length,
    prunedCount: ctx.prunedPaths.length,
    generated: ctx.generated.map(({ content, ...entry }) => entry),
    skipped: ctx.skipped,
    warnings: ctx.warnings,
    unresolvedReferences: ctx.unresolvedReferences,
    prunedPaths: ctx.prunedPaths,
    fallbacks: ctx.fallbacks,
    notGenerated: ctx.notGenerated,
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

// ── REFERENCE REWRITING ───────────────────────────────────────────────────────

function rewriteRef(value, ctx) {
  if (typeof value !== 'string') return value;
  return value.replace(/\{([^}]+)\}/g, (_, tokenPath) => `{${rewritePath(tokenPath, ctx)}}`);
}

function rewritePath(tokenPath, ctx) {
  if (tokenPath.startsWith('Core colors palette.')) return rewritePalettePath(tokenPath.slice(20));

  if (tokenPath.startsWith('Core numbers.space.')) {
    const key = tokenPath.slice(19);
    const mapped = SPACE_KEY_MAP[key];
    return `space.${mapped ?? key.toLowerCase()}`;
  }

  if (tokenPath.startsWith('Core numbers.radius.')) {
    const key = tokenPath.slice(20);
    const mapped = RADIUS_KEY_MAP[key];
    return `radius.${mapped ?? key.toLowerCase()}`;
  }

  if (tokenPath.startsWith('Color tokens.')) return rewriteColorTokensPath(tokenPath.slice(13));

  recordUnresolvedReference(ctx, tokenPath);
  return tokenPath;
}

function rewritePalettePath(subPath) {
  if (subPath === 'black') return 'palette.black';
  if (subPath === 'white') return 'palette.white';

  if (subPath.startsWith('UI.')) {
    const rest = subPath.slice(3);
    const lastDot = rest.lastIndexOf('.');
    const group = sanitizeKey(rest.slice(0, lastDot));
    const step = stripLeadingZero(sanitizeKey(rest.slice(lastDot + 1)));
    return `palette.ui.${group}.${step}`;
  }

  if (subPath.startsWith('UX.')) {
    return `palette.ux.${stripLeadingZero(subPath.slice(3))}`;
  }

  if (subPath.startsWith('Transparent.')) {
    return rewriteTransparentRef(subPath.slice(12));
  }

  return `palette.${subPath.toLowerCase()}`;
}

function rewriteTransparentRef(subPath) {
  if (subPath.startsWith('Gray alpha.')) {
    return `palette.transparent.grayAlpha.${extractPct(subPath.slice(11))}`;
  }
  if (subPath.startsWith('White alpha.')) {
    return `palette.transparent.whiteAlpha.${extractPct(subPath.slice(12))}`;
  }
  if (subPath.startsWith('Theme alpha.')) {
    const rest = subPath.slice(12);
    const dot = rest.indexOf('.');
    const name = rest.slice(0, dot);
    const key = rest.slice(dot + 1);
    return `palette.transparent.themeAlpha-${name}.${extractPct(key)}`;
  }
  return `palette.transparent.${subPath.toLowerCase()}`;
}

// Rewrites a "Color tokens.*" reference path using the same normalization rules
// as processNode: duplicate segment → "default", parent-prefix → strip,
// hoisted inverted sub-groups (e.g. inverted.icon-inverted → inverted).
function rewriteColorTokensPath(rawPath) {
  const segments = rawPath.split('.').map(sanitizeKey);
  const out = [];

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const parent = out.length > 0 ? out[out.length - 1] : null;

    if (parent && segment === parent) {
      // text.text → text.default
      out.push('default');
    } else if (parent && segment.startsWith(`${parent}-`)) {
      // text.text-weak → text.weak
      out.push(segment.slice(parent.length + 1));
    } else if (parent && i + 1 < segments.length) {
      const next = segments[i + 1];
      const hoistPrefix = `${parent}-${segment}`;
      if (next === hoistPrefix) {
        // icon.inverted.icon-inverted → icon.inverted  (leaf, skip intermediate)
        out.push(segment);
        i++;
      } else if (next.startsWith(`${hoistPrefix}-`)) {
        // icon.inverted.icon-inverted-weak → icon.inverted-weak
        out.push(next.slice(parent.length + 1));
        i++;
      } else {
        out.push(segment);
      }
    } else {
      out.push(segment);
    }
  }

  return `color.${out.join('.')}`;
}

// ── EXTRACTORS ────────────────────────────────────────────────────────────────

function extractPalette(data, brandMode, ctx) {
  const src = data['Core colors palette'];
  if (!src) throw new Error('Missing "Core colors palette" in export');

  const palette = {};

  // ux ramp
  palette.ux = {};
  for (const [key, value] of Object.entries(src['UX'] ?? {})) {
    if (!isLeaf(value)) continue;
    const raw = getModeValue(value.$value, brandMode, ctx, { path: `Core colors palette.UX.${key}` });
    if (raw === '' || raw === null || raw === undefined) continue;
    palette.ux[normalizeRampKey(key)] = token(raw, 'color');
  }

  // ui ramps
  palette.ui = {};
  const uiSrc = src['UI'] ?? {};
  for (const [groupName, group] of Object.entries(uiSrc)) {
    if (typeof group !== 'object' || group === null) continue;
    const targetKey = sanitizeKey(groupName);
    const ramp = {};
    for (const [key, value] of Object.entries(group)) {
      if (!isLeaf(value)) continue;
      const raw = getModeValue(value.$value, brandMode, ctx, { path: `Core colors palette.UI.${groupName}.${key}` });
      if (raw === '' || raw === null || raw === undefined) continue;
      ramp[normalizeRampKey(key)] = token(raw, 'color');
    }
    if (Object.keys(ramp).length) palette.ui[targetKey] = ramp;
  }

  // transparent
  palette.transparent = {};
  const transparentSource = src['Transparent'] ?? {};

  const grayAlpha = {};
  for (const [key, value] of Object.entries(transparentSource['Gray alpha'] ?? {})) {
    if (!isLeaf(value)) continue;
    const raw = getModeValue(value.$value, brandMode, ctx, {
      path: `Core colors palette.Transparent.Gray alpha.${key}`,
    });
    if (raw === '' || raw === null || raw === undefined) continue;
    grayAlpha[extractPct(key)] = token(hex8ToRgba(raw), 'color');
  }
  if (Object.keys(grayAlpha).length) palette.transparent.grayAlpha = grayAlpha;

  const whiteAlpha = {};
  for (const [key, value] of Object.entries(transparentSource['White alpha'] ?? {})) {
    if (!isLeaf(value)) continue;
    const raw = getModeValue(value.$value, brandMode, ctx, {
      path: `Core colors palette.Transparent.White alpha.${key}`,
    });
    if (raw === '' || raw === null || raw === undefined) continue;
    whiteAlpha[extractPct(key)] = token(hex8ToRgba(raw), 'color');
  }
  if (Object.keys(whiteAlpha).length) palette.transparent.whiteAlpha = whiteAlpha;

  const themeAlpha = transparentSource['Theme alpha'] ?? {};
  for (const [themeName, themeGroup] of Object.entries(themeAlpha)) {
    if (typeof themeGroup !== 'object' || themeGroup === null) continue;
    const key = `themeAlpha-${themeName.toLowerCase()}`;
    const group = {};
    for (const [step, value] of Object.entries(themeGroup)) {
      if (!isLeaf(value)) continue;
      const raw = getModeValue(value.$value, brandMode, ctx, {
        path: `Core colors palette.Transparent.Theme alpha.${themeName}.${step}`,
      });
      if (raw === '' || raw === null || raw === undefined) continue;
      group[extractPct(step)] = token(hex8ToRgba(raw), 'color');
    }
    if (Object.keys(group).length) palette.transparent[key] = group;
  }

  const blackLeaf = src.black;
  if (blackLeaf && isLeaf(blackLeaf)) {
    const raw = getModeValue(blackLeaf.$value, brandMode, ctx, { path: 'Core colors palette.black' });
    if (raw !== '' && raw !== null && raw !== undefined) palette.black = token(raw, 'color');
  }

  const whiteLeaf = src.white;
  if (whiteLeaf && isLeaf(whiteLeaf)) {
    const raw = getModeValue(whiteLeaf.$value, brandMode, ctx, { path: 'Core colors palette.white' });
    if (raw !== '' && raw !== null && raw !== undefined) palette.white = token(raw, 'color');
  }

  return { palette };
}

function extractColor(data, themeMode, ctx) {
  const src = data['Color tokens'];
  if (!src) throw new Error('Missing "Color tokens" in export');

  // path = ancestor key chain leading to this node (last entry = parentKey)
  function processNode(node, pathParts = []) {
    const parentKey = pathParts.length > 0 ? pathParts[pathParts.length - 1] : null;
    const grandparentKey = pathParts.length > 1 ? pathParts[pathParts.length - 2] : null;
    // Under system.{category} dissolve sub-groups flat, restoring the prefix:
    //   info.text.{default, inverted} → info.{text, text-inverted}
    const flattenSubGroups = grandparentKey === 'system';

    if (isLeaf(node)) {
      if (node.$type !== 'color') return undefined;
      const raw = getModeValue(node.$value, themeMode, ctx, { path: `Color tokens.${pathParts.join('.')}` });
      if (raw === '' || raw === null || raw === undefined) return undefined;
      const normalized = typeof raw === 'string' ? rewriteRef(raw, ctx) : raw;
      return { value: normalized, type: 'color' };
    }

    const out = {};
    for (const [key, value] of Object.entries(node)) {
      if (key.startsWith('$')) continue;
      const sanitized = sanitizeKey(key);
      let outputKey;
      if (sanitized === parentKey) {
        outputKey = 'default';
      } else if (parentKey && sanitized.startsWith(`${parentKey}-`)) {
        outputKey = sanitized.slice(parentKey.length + 1);
      } else {
        outputKey = sanitized;
      }
      const result = processNode(value, [...pathParts, sanitized]);
      if (result === undefined) continue;

      if (flattenSubGroups && result !== null && typeof result === 'object' && !('value' in result)) {
        for (const [childKey, childValue] of Object.entries(result)) {
          out[childKey === 'default' ? outputKey : `${outputKey}-${childKey}`] = childValue;
        }
      } else {
        out[outputKey] = result;
      }
    }

    if (parentKey) {
      const parentPrefix = `${parentKey}-`;
      for (const [key, value] of [...Object.entries(out)]) {
        if (key === 'transparent') continue;
        if (value === null || typeof value !== 'object' || 'value' in value) continue;
        const childKeys = Object.keys(value);
        if (childKeys.length === 0 || !childKeys.every(childKey => childKey.startsWith(parentPrefix))) continue;
        delete out[key];
        for (const [childKey, childValue] of Object.entries(value)) {
          out[childKey.slice(parentPrefix.length)] = childValue;
        }
      }
    }

    const keys = Object.keys(out);
    if (keys.length === 1 && keys[0] === 'default') return out.default;

    return keys.length > 0 ? out : undefined;
  }

  const color = processNode(src);
  if (!color) throw new Error(`No color tokens found for mode "${themeMode}"`);

  for (const group of Object.values(color)) {
    if (!group || typeof group !== 'object' || 'value' in group) continue;
    const backgroundTransparent = group.background?.transparent;
    if (!backgroundTransparent || 'value' in backgroundTransparent) continue;
    const prefix = 'background-transparent';
    const transparent = {};
    for (const [key, value] of Object.entries(backgroundTransparent)) {
      if (key === prefix) transparent.default = value;
      else if (key.startsWith(`${prefix}-`)) transparent[key.slice(prefix.length + 1)] = value;
      else transparent[key] = value;
    }
    group.transparent = transparent;
    delete group.background.transparent;
  }

  return { color };
}

function buildSpaceScale(src, mode, ctx, treatEmptyAsZero = false) {
  const out = {};
  for (const [key, value] of Object.entries(src)) {
    if (!isLeaf(value)) continue;
    const mapped = SPACE_KEY_MAP[key];
    if (!mapped) continue;
    const raw = getModeValue(value.$value, mode, ctx, { path: `Core numbers.space.${key}` });
    if (raw === '' || raw === null || raw === undefined) {
      if (treatEmptyAsZero) {
        out[mapped] = token('0px', 'dimension');
        recordFallback(ctx, {
          kind: 'generated-zero',
          path: `Core numbers.space.${key}`,
          requestedMode: mode,
          outputKey: mapped,
          reason: 'Blank condensed spacing maps to 0px to preserve current repo behavior',
        });
      }
      continue;
    }
    out[mapped] = token(`${raw}px`, 'dimension');
  }
  return out;
}

function extractSpace(data, ctx) {
  const src = data['Core numbers']?.space;
  if (!src) throw new Error('Missing "Core numbers.space" in export');

  const main = buildSpaceScale(src, 'Default', ctx);
  const wide = buildSpaceScale(src, 'Wide', ctx);
  const condensed = buildSpaceScale(src, 'Condensed', ctx, true);

  const space = reorder(
    {
      none: token('0px', 'dimension'),
      ...main,
      wide: reorder({ none: token('0px', 'dimension'), ...wide }, SPACE_ORDER),
      condensed: reorder({ 0: token('0px', 'dimension'), ...condensed }, SPACE_ORDER),
    },
    SPACE_ORDER,
  );

  return { space };
}

function extractSpacing(data, ctx) {
  const src = data['Screen']?.Spacing;
  const spacing = {
    0: { value: 0, type: 'dimension', attributes: { category: 'size' } },
    px: { value: '1px', type: 'dimension' },
  };

  if (src) {
    for (const [key, value] of Object.entries(src)) {
      if (!isLeaf(value)) continue;
      const raw = getModeValue(value.$value, 'Desktop', ctx, { path: `Screen.Spacing.${key}` });
      if (raw === '' || raw === null || raw === undefined) continue;
      const normalized = typeof raw === 'string' ? rewriteRef(raw, ctx) : `${raw}px`;
      spacing[key] = token(normalized, 'dimension', { category: 'size' });
    }
  }

  if (!spacing.md) spacing.md = token('{space.md}', 'dimension', { category: 'size' });

  return { spacing };
}

function extractScreen(data, ctx) {
  const display = data['Screen']?.Display;
  if (!display) throw new Error('Missing "Screen.Display" in export');

  const breakpointEntry = (leaf, label) => {
    if (!leaf || !isLeaf(leaf)) {
      throw new Error(`Missing "Screen.Display.${label}" in export`);
    }

    const values = {};
    for (const mode of ['Desktop', 'Laptop', 'Tablet', 'Mobile']) {
      const raw = getModeValue(leaf.$value, mode, ctx, { path: `Screen.Display.${label}` });
      if (raw === '' || raw === null || raw === undefined) {
        throw new Error(`Missing mode "${mode}" for Screen.Display.${label}`);
      }
      values[mode.toLowerCase()] = { value: `${raw}px` };
    }

    return values;
  };

  return {
    screen: {
      width: {
        'fixed': breakpointEntry(display['screen width fixed'], 'screen width fixed'),
        'min-fluid': breakpointEntry(display['screen min-width fluid'], 'screen min-width fluid'),
        'max-fluid': breakpointEntry(display['screen max-width fluid'], 'screen max-width fluid'),
      },
      height: {
        fixed: breakpointEntry(display['screen height fixed'], 'screen height fixed'),
      },
    },
  };
}

function extractBorder(data, ctx) {
  const src = data['Screen']?.Border?.Width;
  const widths = {
    0: token('0px', 'dimension'),
    8: token('8px', 'dimension'),
  };

  if (src) {
    for (const [, value] of Object.entries(src)) {
      if (!isLeaf(value)) continue;
      const raw = getModeValue(value.$value, 'Desktop', ctx, { path: 'Screen.Border.Width' });
      if (typeof raw !== 'number') continue;
      widths[raw] = token(`${raw}px`, 'dimension');
    }
  }

  const sorted = {};
  for (const key of Object.keys(widths).sort((a, b) => Number(a) - Number(b))) {
    sorted[key] = widths[key];
  }

  return { border: { width: sorted } };
}

function buildRadiusRamp(src, mode, ctx) {
  const sizeAttributes = { category: 'size' };
  const out = {};
  for (const [key, value] of Object.entries(src)) {
    if (!isLeaf(value)) continue;
    const mapped = RADIUS_KEY_MAP[key];
    if (!mapped) continue;
    if (mapped === 'full') {
      out.full = { value: '100%', type: 'other' };
      continue;
    }
    if (mapped === 'none') {
      out.none = token(0, 'dimension', sizeAttributes);
      continue;
    }
    const raw = getModeValue(value.$value, mode, ctx, { path: `Core numbers.radius.${key}` });
    if (raw === '' || raw === null || raw === undefined) continue;
    out[mapped] = token(raw, 'dimension', sizeAttributes);
  }
  if (!out.none) out.none = token(0, 'dimension', sizeAttributes);
  return reorder(out, RADIUS_ORDER);
}

function extractRadius(data, ctx) {
  const src = data['Core numbers']?.radius;
  if (!src) throw new Error('Missing "Core numbers.radius" in export');

  const sizeAttributes = { category: 'size' };
  const main = buildRadiusRamp(src, 'Default', ctx);
  const wide = buildRadiusRamp(src, 'Wide', ctx);

  const condensed = {};
  for (const key of RADIUS_ORDER) {
    if (!(key in main)) continue;
    condensed[key] = token(`{radius.${key}}`, 'dimension', sizeAttributes);
  }

  return {
    'radius': main,
    'radius.wide': wide,
    'radius.condensed': condensed,
  };
}

function extractFont(data, ctx) {
  const src = data['Typography']?.Font;
  if (!src) throw new Error('Missing "Typography.Font" in export');

  const sizeAttributes = { category: 'size' };

  const fontFamily = {};
  for (const [key, value] of Object.entries(src.family ?? {})) {
    if (!isLeaf(value)) continue;
    const raw =
      typeof value.$value === 'object'
        ? getModeValue(value.$value, 'Default', ctx, { path: `Typography.Font.family.${key}` })
        : value.$value;
    const name = key.toLowerCase();
    fontFamily[name] = token(FONT_FAMILY_STACK[name] ?? `'${raw}', sans-serif`, 'fontFamily');
  }

  const fontSize = {
    base: { value: '{fontSize.md}', type: 'dimension', attributes: sizeAttributes },
  };
  for (const [key, value] of Object.entries(src.size ?? {})) {
    if (!isLeaf(value)) continue;
    const mapped = FONTSIZE_KEY_MAP[key];
    if (!mapped) continue;
    const raw =
      typeof value.$value === 'object'
        ? getModeValue(value.$value, 'Default', ctx, { path: `Typography.Font.size.${key}` })
        : value.$value;
    if (raw === '' || raw === null || raw === undefined) continue;
    fontSize[mapped] = token(raw, 'dimension', sizeAttributes);
  }

  const fontWeight = {};
  for (const [key, value] of Object.entries(src.weight ?? {})) {
    if (!isLeaf(value)) continue;
    const entry = FONTWEIGHT_MAP[key.toLowerCase()];
    if (!entry) continue;
    fontWeight[entry.key] = token(entry.value, 'fontWeight');
  }

  return { fontFamily, fontSize, fontWeight };
}

function extractLineHeight(data, ctx) {
  const src = data['Typography']?.Font?.['line-height'];
  if (!src) throw new Error('Missing "Typography.Font.line-height" in export');

  const sizeAttributes = { category: 'size' };
  const lineHeight = {};
  for (const [key, value] of Object.entries(src)) {
    if (!isLeaf(value)) continue;
    const mapped = LINEHEIGHT_KEY_MAP[key];
    if (!mapped) continue;
    const raw =
      typeof value.$value === 'object'
        ? getModeValue(value.$value, 'Default', ctx, { path: `Typography.Font.line-height.${key}` })
        : value.$value;
    if (raw === '' || raw === null || raw === undefined) continue;
    lineHeight[mapped] = token(`${raw}px`, 'dimension', sizeAttributes);
  }
  return { lineHeight };
}

// ── EXECUTION ─────────────────────────────────────────────────────────────────

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

function printSummary(ctx, metadata) {
  console.log('\nSummary:');
  console.log(`  generated: ${ctx.generated.length} ${metadata.options.dryRun ? '(planned)' : '(written)'}`);
  console.log(`  skipped: ${ctx.skipped.length}`);
  console.log(`  warnings: ${ctx.warnings.length}`);
  console.log(`  unresolved refs: ${ctx.unresolvedReferences.length}`);
  console.log(`  pruned groups: ${ctx.prunedPaths.length}`);

  if (ctx.skipped.length > 0) {
    console.log('\nSkipped outputs:');
    for (const { label, reason } of ctx.skipped) {
      console.log(`  ${label}: ${reason}`);
    }
  }

  if (ctx.prunedPaths.length > 0) {
    console.log('\nPruned Tokenhaus groups:');
    const seen = new Set();
    for (const entry of ctx.prunedPaths) {
      const fingerprint = `${entry.label}:${entry.path}`;
      if (seen.has(fingerprint)) continue;
      seen.add(fingerprint);
      console.log(`  ${entry.label}: ${entry.path}`);
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

  console.log(`\nBrand:  ${metadata.brand ?? '(none)'}`);
  if (metadata.availableBrands.length > 0) {
    console.log(`Available brands: ${metadata.availableBrands.join(', ')}`);
  }

  if (ctx.options.reportFile) {
    console.log(`Report: ${formatPathForLog(ctx.options.reportFile)}`);
  }
}

function printNextSteps(options) {
  console.log(`
Done. Next steps:
  1. diff -r ${formatPathForLog(path.join(options.outputBase, 'core'))} tokens/core
  2. node scripts/tokens-lint.mjs --root ${formatPathForLog(path.join(options.outputBase, 'core'))}
  3. Copy approved files to tokens/core/ and tokens/core.dark/
  4. yarn tokens.build && yarn tokens.lint.all`);
}

async function main(argv = process.argv) {
  const options = parseCliOptions(argv);
  if (options.shouldExit) {
    return { exitCode: options.exitCode };
  }

  validateCliOptions(options);

  console.log(`Reading: ${formatPathForLog(options.inputFile)}`);
  console.log(`Output:  ${formatPathForLog(options.outputBase)}`);
  console.log(`Mode:    ${options.dryRun ? 'DRY RUN' : 'WRITE'}`);
  if (options.reportFile) {
    console.log(`Report:  ${formatPathForLog(options.reportFile)}`);
  }
  console.log('');

  const data = readJsonWithContext(options.inputFile);
  const structure = validateInputStructure(data);
  const { brand, availableBrands } = resolveBrand(data, options.brand);
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

  runExtraction(ctx, 'palette.tokens.json', outCore, 'palette.tokens.json', () => extractPalette(data, brand, ctx));

  runExtraction(ctx, 'color.tokens.json (light)', outCore, 'color.tokens.json', () =>
    pruneColorTokens(extractColor(data, 'Light', ctx), 'color.tokens.json (light)', ctx),
  );

  runExtraction(ctx, 'core.dark/color.tokens.json', outDark, 'color.tokens.json', () =>
    pruneColorTokens(extractColor(data, 'Dark (classic swap)', ctx), 'core.dark/color.tokens.json', ctx),
  );

  runExtraction(ctx, 'space.tokens.json', outCore, 'space.tokens.json', () => extractSpace(data, ctx));
  runExtraction(ctx, 'spacing.tokens.json', outCore, 'spacing.tokens.json', () => extractSpacing(data, ctx));
  runExtraction(ctx, 'screen.tokens.json', outCore, 'screen.tokens.json', () => extractScreen(data, ctx));
  runExtraction(ctx, 'border.tokens.json', outCore, 'border.tokens.json', () => extractBorder(data, ctx));
  runExtraction(ctx, 'radius.tokens.json', outCore, 'radius.tokens.json', () => extractRadius(data, ctx));
  runExtraction(ctx, 'font.tokens.json', outCore, 'font.tokens.json', () => extractFont(data, ctx));
  runExtraction(ctx, 'lineHeight.tokens.json', outCore, 'lineHeight.tokens.json', () => extractLineHeight(data, ctx));

  ctx.notGenerated = [
    { file: 'shadow.tokens.json', reason: 'no color data in Tokenhaus export — existing file preserved' },
    { file: 'linearGradient.tokens.json', reason: 'not in Tokenhaus export' },
    { file: 'letterSpacing.tokens.json', reason: 'not in Tokenhaus export' },
    { file: 'zIndex.tokens.json', reason: 'not in Tokenhaus export' },
    { file: 'size.tokens.json', reason: 'not in Tokenhaus export' },
  ];

  const report = buildReport(ctx, {
    options,
    brand,
    availableBrands,
  });

  if (options.reportFile) {
    writeReport(options.reportFile, report);
  }

  printSummary(ctx, { options, brand, availableBrands });

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
  CliError,
  PROJECT_ROOT,
  createRunContext,
  detectAvailableBrands,
  extractBorder,
  extractColor,
  extractFont,
  extractLineHeight,
  extractPalette,
  extractRadius,
  extractScreen,
  extractSpace,
  extractSpacing,
  getModeValue,
  main,
  parseCliOptions,
  readJsonWithContext,
  rewritePath,
  validateInputStructure,
};

if (isEntrypoint()) {
  main()
    .then(result => process.exit(result.exitCode))
    .catch(printFatalError);
}
