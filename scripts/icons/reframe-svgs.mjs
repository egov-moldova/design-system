#!/usr/bin/env node
/**
 * Re-frame each extracted icon SVG to its nominal Figma size.
 *
 * Why: `get_design_context` returns the vector content alone (tight-cropped
 * bounding box). Figma frames the icon inside a nominal 12/16/20/24 canvas
 * with padding. Our downloads lose that canvas, so a 12px icon with content
 * 7.97×9 ends up scaling to fill the host (looking too big).
 *
 * Fix: rewrite each SVG's viewBox to `0 0 N N` while centering the existing
 * content. We achieve that by setting viewBox origin to negative padding:
 *   viewBox="-padX -padY N N"
 * which works without modifying any path coordinates.
 *
 * Limitations:
 *   - Assumes symmetric padding (centered icon). Off by ≤1px for icons that
 *     Figma intentionally offset within their frame.
 *   - If content is larger than the nominal size on any axis, we widen the
 *     viewBox to fit the content (no scaling, no cropping) and log a warning.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const ASSETS_ROOT = path.join(PROJECT_ROOT, 'src/components/mud-icon/assets');
const SIZES = [12, 16, 20, 24];

const VIEWBOX_RE = /viewBox="\s*([-\d.]+)\s+([-\d.]+)\s+([\d.]+)\s+([\d.]+)\s*"/;

function reframe(svg, nominal) {
  const m = svg.match(VIEWBOX_RE);
  if (!m) return { svg, changed: false, reason: 'no viewBox' };

  const [, vxStr, vyStr, wStr, hStr] = m;
  const vx = Number(vxStr);
  const vy = Number(vyStr);
  const w = Number(wStr);
  const h = Number(hStr);
  if (!Number.isFinite(w) || !Number.isFinite(h)) {
    return { svg, changed: false, reason: 'unparsable viewBox' };
  }

  // If viewBox already matches the nominal size, skip.
  if (Math.abs(w - nominal) < 0.5 && Math.abs(h - nominal) < 0.5 && Math.abs(vx) < 0.5 && Math.abs(vy) < 0.5) {
    return { svg, changed: false, reason: 'already nominal' };
  }

  // Compute padding that centers content within the nominal box.
  const newW = Math.max(w, nominal);
  const newH = Math.max(h, nominal);
  const padX = (newW - w) / 2;
  const padY = (newH - h) / 2;
  const newVx = vx - padX;
  const newVy = vy - padY;

  const fmt = n => {
    // Trim trailing zeros, keep up to 5 decimals.
    const r = Number(n.toFixed(5));
    return String(r);
  };

  const newViewBox = `viewBox="${fmt(newVx)} ${fmt(newVy)} ${fmt(newW)} ${fmt(newH)}"`;
  const next = svg.replace(VIEWBOX_RE, newViewBox);

  return {
    svg: next,
    changed: true,
    oversize: newW > nominal || newH > nominal,
    before: { vx, vy, w, h },
    after: { vx: newVx, vy: newVy, w: newW, h: newH },
  };
}

async function main() {
  let total = 0;
  let changed = 0;
  let unchanged = 0;
  const oversize = [];

  for (const size of SIZES) {
    const dir = path.join(ASSETS_ROOT, String(size));
    let files;
    try {
      files = await fs.readdir(dir);
    } catch (err) {
      if (err.code === 'ENOENT') continue;
      throw err;
    }
    for (const file of files) {
      if (!file.endsWith('.svg')) continue;
      total++;
      const filePath = path.join(dir, file);
      const before = await fs.readFile(filePath, 'utf8');
      const r = reframe(before, size);
      if (r.changed) {
        changed++;
        await fs.writeFile(filePath, r.svg, 'utf8');
        if (r.oversize) {
          oversize.push({ size, file, ...r });
        }
      } else {
        unchanged++;
      }
    }
  }

  console.log(`[reframe] ${changed}/${total} SVGs re-framed; ${unchanged} unchanged.`);
  if (oversize.length) {
    console.warn(
      `[reframe] ⚠ ${oversize.length} icon(s) had content larger than nominal — viewBox was widened to fit:`,
    );
    for (const o of oversize.slice(0, 20)) {
      console.warn(
        `  - ${o.size}/${o.file}: content ${o.before.w.toFixed(2)}×${o.before.h.toFixed(2)} → viewBox ${o.after.w.toFixed(2)}×${o.after.h.toFixed(2)}`,
      );
    }
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
