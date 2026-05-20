#!/usr/bin/env node
/**
 * Restore `viewBox` on every SVG inside
 * `src/components/cor-icon/assets/{12,16,20,24}/*.svg` based on the SVG's own
 * `width` and `height` attributes.
 *
 * Why: SVGO and other optimizers strip `viewBox` aggressively (they assume
 * the consumer sets it). cor-icon depends on `viewBox` to scale the icon
 * correctly inside the host element. Run this script after any optimization
 * pass to re-attach the canonical `viewBox`.
 *
 * Rules:
 *   - Reads `width` and `height` from the existing <svg> root.
 *   - Forces viewBox="0 0 {width} {height}" — overwrites whatever was there.
 *   - `width` and `height` themselves are NOT modified.
 *   - Preserves all other attributes (xmlns, fill, etc.).
 *   - If `width` or `height` is missing/non-numeric → reports an error,
 *     leaves the file untouched.
 *
 * Usage:
 *   node scripts/icons/fix-viewbox.mjs            # rescrie toate folder-ele
 *   node scripts/icons/fix-viewbox.mjs --dry      # arată ce s-ar schimba, nu scrie
 *   node scripts/icons/fix-viewbox.mjs --size 16  # doar folder-ul 16
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const ASSETS_ROOT = path.join(PROJECT_ROOT, 'src/components/cor-icon/assets');
const SIZES = [12, 16, 20, 24];

const SVG_OPEN_TAG_RE = /<svg\b([^>]*?)(\s*\/?)>/i;
const ATTR_RE = /([\w:-]+)\s*=\s*("([^"]*)"|'([^']*)')/g;

function parseSvgOpenTag(svg) {
  const openMatch = svg.match(SVG_OPEN_TAG_RE);
  if (!openMatch) return null;
  const [, rawAttrs, trailing] = openMatch;
  const attrs = new Map();
  for (const m of rawAttrs.matchAll(ATTR_RE)) {
    const name = m[1];
    const value = m[3] ?? m[4] ?? '';
    attrs.set(name, value);
  }
  return { attrs, fullMatch: openMatch[0], selfClosing: trailing.includes('/') };
}

function serializeSvgOpenTag(attrs, selfClosing) {
  const parts = [];
  for (const [name, value] of attrs) {
    parts.push(`${name}="${value}"`);
  }
  return `<svg ${parts.join(' ')}${selfClosing ? ' /' : ''}>`;
}

/**
 * Parse a dimension string like "12", "12px", "12.5" into a finite number.
 * Returns null when no numeric value can be extracted.
 */
function parseDim(value) {
  if (value === undefined || value === null) return null;
  const m = String(value)
    .trim()
    .match(/^(-?\d+(?:\.\d+)?)/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

function fixSvg(svgText) {
  const parsed = parseSvgOpenTag(svgText);
  if (!parsed) return { text: svgText, changed: false, reason: 'no <svg> root' };

  const { attrs, fullMatch, selfClosing } = parsed;

  const width = parseDim(attrs.get('width'));
  const height = parseDim(attrs.get('height'));

  if (width === null && height === null) {
    return { text: svgText, changed: false, reason: 'missing width AND height — cannot derive viewBox' };
  }
  // If only one dimension is present, mirror it to the other (square icon assumption).
  const finalW = width ?? height;
  const finalH = height ?? width;

  const desiredViewBox = `0 0 ${finalW} ${finalH}`;
  const beforeViewBox = attrs.get('viewBox');

  if (beforeViewBox === desiredViewBox) {
    // Already correct — no rewrite needed.
    return { text: svgText, changed: false };
  }

  // Replace or insert viewBox. Strategy:
  //   - If viewBox already present → replace value in place (preserves order).
  //   - If absent → insert directly after xmlns (or as first attr).
  const newAttrs = new Map();
  if (attrs.has('viewBox')) {
    for (const [name, value] of attrs) {
      newAttrs.set(name, name === 'viewBox' ? desiredViewBox : value);
    }
  } else {
    if (attrs.has('xmlns')) {
      for (const [name, value] of attrs) {
        newAttrs.set(name, value);
        if (name === 'xmlns') newAttrs.set('viewBox', desiredViewBox);
      }
    } else {
      newAttrs.set('viewBox', desiredViewBox);
      for (const [name, value] of attrs) newAttrs.set(name, value);
    }
  }

  const newOpenTag = serializeSvgOpenTag(newAttrs, selfClosing);
  if (newOpenTag === fullMatch) return { text: svgText, changed: false };

  const newText = svgText.replace(fullMatch, newOpenTag);
  return {
    text: newText,
    changed: true,
    before: { viewBox: beforeViewBox, width: attrs.get('width'), height: attrs.get('height') },
    after: { viewBox: desiredViewBox },
  };
}

function parseArgs(argv) {
  const args = { dry: false, sizes: SIZES };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry' || a === '--dry-run') args.dry = true;
    else if (a === '--size') {
      const n = Number(argv[++i]);
      if (!SIZES.includes(n)) {
        console.error(`[fix-viewbox] --size must be one of ${SIZES.join(', ')}`);
        process.exit(1);
      }
      args.sizes = [n];
    } else if (a === '--help' || a === '-h') {
      console.log('Usage: node scripts/icons/fix-viewbox.mjs [--dry] [--size N]');
      console.log('  Reads width/height from each SVG and sets viewBox="0 0 {w} {h}".');
      process.exit(0);
    }
  }
  return args;
}

async function processSize(size, dry) {
  const dir = path.join(ASSETS_ROOT, String(size));
  let files;
  try {
    files = await fs.readdir(dir);
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.warn(`[fix-viewbox] ${size}px folder missing — skipping`);
      return { scanned: 0, changed: 0, skipped: 0, errors: 0 };
    }
    throw err;
  }
  files = files.filter(f => f.endsWith('.svg')).sort();

  let scanned = 0;
  let changed = 0;
  let skipped = 0;
  let errors = 0;

  for (const file of files) {
    scanned++;
    const filePath = path.join(dir, file);
    let raw;
    try {
      raw = await fs.readFile(filePath, 'utf8');
    } catch (err) {
      console.error(`[fix-viewbox] ${size}/${file}: read error — ${err.message}`);
      errors++;
      continue;
    }

    const result = fixSvg(raw);
    if (result.reason) {
      console.error(`[fix-viewbox] ${size}/${file}: ${result.reason}`);
      errors++;
      continue;
    }
    if (!result.changed) {
      skipped++;
      continue;
    }

    changed++;
    if (dry) {
      console.log(
        `[dry] ${size}/${file}: viewBox="${result.before.viewBox ?? '∅'}" → "${result.after.viewBox}" (from width="${result.before.width ?? '∅'}" height="${result.before.height ?? '∅'}")`,
      );
    } else {
      await fs.writeFile(filePath, result.text, 'utf8');
    }
  }

  return { scanned, changed, skipped, errors };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  console.log(
    `[fix-viewbox] Root: ${path.relative(PROJECT_ROOT, ASSETS_ROOT)} | sizes: ${args.sizes.join(', ')} | mode: ${args.dry ? 'DRY RUN' : 'WRITE'}`,
  );

  const total = { scanned: 0, changed: 0, skipped: 0, errors: 0 };
  for (const size of args.sizes) {
    const r = await processSize(size, args.dry);
    total.scanned += r.scanned;
    total.changed += r.changed;
    total.skipped += r.skipped;
    total.errors += r.errors;
    console.log(`  ${size}px → scanned ${r.scanned}, changed ${r.changed}, ok ${r.skipped}, errors ${r.errors}`);
  }

  console.log(
    `[fix-viewbox] Done: scanned ${total.scanned}, changed ${total.changed}, ok ${total.skipped}, errors ${total.errors}` +
      (args.dry ? ' (no files written — dry run)' : ''),
  );

  if (total.errors > 0) process.exit(1);
}

main().catch(err => {
  console.error('[fix-viewbox] fatal:', err);
  process.exit(1);
});
