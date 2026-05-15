#!/usr/bin/env node

/**
 * visual-diff.mjs — Mathematical pixel-level comparison between two PNG images.
 *
 * Uses pixelmatch (same algorithm as Playwright visual regression) to compare
 * Figma reference screenshots against Storybook browser captures.
 *
 * Usage:
 *   node scripts/visual-diff.mjs --figma <path> --browser <path> [--output <path>] [--threshold <0-1>]
 *
 * Options:
 *   --figma      Path to Figma reference PNG
 *   --browser    Path to Storybook browser capture PNG
 *   --output     Path to save diff image (default: diff-result.png)
 *   --threshold  pixelmatch sensitivity 0-1 (default: 0.1, lower = stricter)
 *
 * Output (JSON to stdout):
 *   { diffPixels, totalPixels, diffPercent, status, outputPath }
 *
 * Cross-platform: Windows, macOS, Linux — pure JS, zero native deps.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

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

if (!getArg('figma', '') || !getArg('browser', '')) {
  console.error(
    'Usage: node scripts/visual-diff.mjs --figma <path> --browser <path> [--output <path>] [--threshold <0-1>]',
  );
  process.exit(1);
}

// --- Read PNGs ---
let img1, img2;
try {
  img1 = PNG.sync.read(readFileSync(figmaPath));
} catch (e) {
  console.error(`ERROR: Cannot read Figma image: ${figmaPath}\n${e.message}`);
  process.exit(1);
}
try {
  img2 = PNG.sync.read(readFileSync(browserPath));
} catch (e) {
  console.error(`ERROR: Cannot read browser image: ${browserPath}\n${e.message}`);
  process.exit(1);
}

// --- Handle size mismatch (pad smaller image) ---
const width = Math.max(img1.width, img2.width);
const height = Math.max(img1.height, img2.height);

function padImage(img, targetWidth, targetHeight) {
  if (img.width === targetWidth && img.height === targetHeight) return img;
  const padded = new PNG({ width: targetWidth, height: targetHeight, fill: true });
  // Fill with white background
  for (let i = 0; i < padded.data.length; i += 4) {
    padded.data[i] = 255; // R
    padded.data[i + 1] = 255; // G
    padded.data[i + 2] = 255; // B
    padded.data[i + 3] = 255; // A
  }
  // Copy original image data
  PNG.bitblt(img, padded, 0, 0, img.width, img.height, 0, 0);
  return padded;
}

if (img1.width !== img2.width || img1.height !== img2.height) {
  console.error(
    `WARNING: Size mismatch — Figma: ${img1.width}x${img1.height}, Browser: ${img2.width}x${img2.height}. Padding to ${width}x${height}.`,
  );
  img1 = padImage(img1, width, height);
  img2 = padImage(img2, width, height);
}

// --- Run pixelmatch ---
const diff = new PNG({ width, height });
const diffPixels = pixelmatch(img1.data, img2.data, diff.data, width, height, {
  threshold,
  includeAA: false, // Ignore anti-aliasing differences
  alpha: 0.1, // Blend original image into diff output
  diffColor: [255, 0, 0], // Red for mismatched pixels
  diffColorAlt: [0, 255, 0], // Green for anti-aliased pixels (when includeAA is true)
});

// --- Save diff image ---
writeFileSync(outputPath, PNG.sync.write(diff));

// --- Output results ---
const totalPixels = width * height;
const diffPercent = ((diffPixels / totalPixels) * 100).toFixed(2);

let status;
if (parseFloat(diffPercent) < 0.5) {
  status = 'PASS';
} else if (parseFloat(diffPercent) < 2.0) {
  status = 'WARNING';
} else {
  status = 'FAIL';
}

const result = {
  figma: basename(figmaPath),
  browser: basename(browserPath),
  dimensions: `${width}x${height}`,
  diffPixels,
  totalPixels,
  diffPercent: parseFloat(diffPercent),
  status,
  outputPath: resolve(outputPath),
};

console.log(JSON.stringify(result, null, 2));
process.exit(status === 'FAIL' ? 1 : 0);
