#!/usr/bin/env node

/**
 * visual-diff.mjs — Mathematical pixel-level comparison between two PNG images.
 *
 * Uses pixelmatch (same algorithm as Playwright visual regression) to compare
 * Figma reference screenshots against Storybook browser captures. The diff
 * itself lives in `scripts/audit/lib/image-diff.mjs`.
 *
 * Usage:
 *   node scripts/visual-diff.mjs --figma <path> --browser <path> [--output <path>] [--threshold <0-1>] [--align top-left|center] [--background #rrggbb]
 *
 * Options:
 *   --figma      Path to Figma reference PNG
 *   --browser    Path to Storybook browser capture PNG
 *   --output     Path to save diff image (default: diff-result.png)
 *   --threshold  pixelmatch sensitivity 0-1 (default: 0.1, lower = stricter)
 *   --align      How to place images of different sizes on the shared canvas
 *                (default: top-left; center for symmetric but unmatched margins)
 *   --background Page background both images are flattened onto (default: #ffffff).
 *                Figma exports are transparent around the component; captures are not.
 *
 * Exit codes: 0 PASS/WARNING · 1 FAIL (diff >= 2%) · 2 usage error or unreadable
 * input (these were 1 before; 11-pixel-diff-states distinguishes them).
 *
 * Output (JSON to stdout):
 *   { figma, browser, dimensions, diffPixels, totalPixels, diffPercent, status, align, background, sizeMismatch, outputPath }
 *
 * Cross-platform: Windows, macOS, Linux — pure JS, zero native deps.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { PNG } from 'pngjs';
import { diffImages, parseHexColor } from './audit/lib/image-diff.mjs';

// --- Parse CLI args ---
const args = process.argv.slice(2);
function getArg(name, fallback) {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback;
}

const figmaPath = resolve(getArg('figma', ''));
const browserPath = resolve(getArg('browser', ''));
const outputPath = resolve(getArg('output', 'diff-result.png'));
const threshold = parseFloat(getArg('threshold', '0.1'));
const align = getArg('align', 'top-left');
const background = getArg('background', '#ffffff');

if (!getArg('figma', '') || !getArg('browser', '')) {
  console.error(
    'Usage: node scripts/visual-diff.mjs --figma <path> --browser <path> [--output <path>] [--threshold <0-1>] [--align top-left|center] [--background #rrggbb]',
  );
  process.exit(2);
}

// --- Read PNGs ---
let img1, img2;
try {
  img1 = PNG.sync.read(readFileSync(figmaPath));
} catch (e) {
  console.error(`ERROR: Cannot read Figma image: ${figmaPath}\n${e.message}`);
  process.exit(2);
}
try {
  img2 = PNG.sync.read(readFileSync(browserPath));
} catch (e) {
  console.error(`ERROR: Cannot read browser image: ${browserPath}\n${e.message}`);
  process.exit(2);
}

let diff;
try {
  diff = diffImages(img1, img2, { threshold, align, background: parseHexColor(background) });
} catch (e) {
  console.error(`ERROR: ${e.message}`);
  process.exit(2);
}

if (diff.sizeMismatch) {
  const { reference, capture } = diff.sizeMismatch;
  console.error(
    `WARNING: Size mismatch — Figma: ${reference.width}x${reference.height}, Browser: ${capture.width}x${capture.height}. ` +
      `Padding to ${diff.width}x${diff.height} (${align}).`,
  );
}

// --- Save diff image ---
writeFileSync(outputPath, PNG.sync.write(diff.diffImage));

// --- Output results ---
let status;
if (diff.diffPercent < 0.5) {
  status = 'PASS';
} else if (diff.diffPercent < 2.0) {
  status = 'WARNING';
} else {
  status = 'FAIL';
}

const result = {
  figma: basename(figmaPath),
  browser: basename(browserPath),
  dimensions: `${diff.width}x${diff.height}`,
  diffPixels: diff.diffPixels,
  totalPixels: diff.totalPixels,
  diffPercent: diff.diffPercent,
  status,
  align,
  background,
  sizeMismatch: diff.sizeMismatch,
  outputPath: resolve(outputPath),
};

console.log(JSON.stringify(result, null, 2));
process.exit(status === 'FAIL' ? 1 : 0);
