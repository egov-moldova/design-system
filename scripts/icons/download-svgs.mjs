#!/usr/bin/env node
/**
 * Read asset-urls.json (produced by the Figma extraction loop) and download each
 * referenced SVG into src/components/mud-icon/assets/{size}/{name}.svg.
 *
 * asset-urls.json shape:
 *   { "<size>/<name>": "<figma asset url>", ... }
 *
 * Normalization applied to each downloaded SVG:
 *   - strip width/height attributes (size is controlled by the host element)
 *   - replace `fill="var(--fill-0, #xxxxxx)"` → `fill="currentColor"`
 *   - drop preserveAspectRatio overrides (default xMidYMid meet is fine)
 *   - drop inline `style="..."` on the root <svg>
 *   - collapse whitespace
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const ASSETS_ROOT = path.join(PROJECT_ROOT, 'src/components/mud-icon/assets');
const URLS_FILE = path.join(__dirname, 'asset-urls.json');

function normalizeSvg(svg) {
  let out = svg.trim();

  // Drop XML prolog if present
  out = out.replace(/<\?xml[^?]*\?>\s*/i, '');

  // Strip width="..." and height="..." on the root <svg>
  out = out.replace(/(<svg\b[^>]*?)\s+width="[^"]*"/i, '$1');
  out = out.replace(/(<svg\b[^>]*?)\s+height="[^"]*"/i, '$1');

  // Drop preserveAspectRatio + style + overflow attrs on root
  out = out.replace(/(<svg\b[^>]*?)\s+preserveAspectRatio="[^"]*"/i, '$1');
  out = out.replace(/(<svg\b[^>]*?)\s+style="[^"]*"/i, '$1');
  out = out.replace(/(<svg\b[^>]*?)\s+overflow="[^"]*"/i, '$1');

  // Force currentColor: any `fill="var(--fill-X, #xxxxxx)"` -> fill="currentColor"
  out = out.replace(/fill="var\(--fill-\d+,\s*#[0-9a-fA-F]{3,8}\)"/g, 'fill="currentColor"');
  // Also bare hex fills (no var) -> currentColor, except fill="none"
  out = out.replace(/fill="#[0-9a-fA-F]{3,8}"/g, 'fill="currentColor"');

  // Drop id="..." from inner elements (collisions when multiple inline SVGs share the DOM)
  out = out.replace(/(<(?:path|g|circle|rect|ellipse|polygon|polyline|line)\b[^>]*?)\s+id="[^"]*"/g, '$1');

  // Collapse repeated whitespace
  out = out.replace(/\n\s*\n/g, '\n');
  out = out.replace(/\s+\/>/g, ' />');

  return out;
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function downloadOne(key, url) {
  const [sizeStr, name] = key.split('/');
  const size = Number(sizeStr);
  if (!Number.isFinite(size) || !name) {
    throw new Error(`Bad key (expected "<size>/<name>"): ${key}`);
  }
  // Preserve Figma source names exactly. Filled-variant suffix harmonization
  // (e.g. -fill vs -filled) happens later in the registry builder, where we
  // can detect and report collisions instead of silently overwriting files.
  const targetDir = path.join(ASSETS_ROOT, String(size));
  await ensureDir(targetDir);
  const targetFile = path.join(targetDir, `${name}.svg`);

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${key} @ ${url}`);
  }
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('svg')) {
    throw new Error(`Expected SVG content-type for ${key}, got "${ct}"`);
  }
  const raw = await res.text();
  const normalized = normalizeSvg(raw);
  await fs.writeFile(targetFile, normalized + '\n', 'utf8');
  return { key, size, name, bytes: normalized.length };
}

async function main() {
  const json = await fs.readFile(URLS_FILE, 'utf8');
  const map = JSON.parse(json);
  const entries = Object.entries(map);

  console.log(`[icons] Downloading ${entries.length} SVGs from Figma...`);

  let ok = 0;
  let failed = [];

  // Bound concurrency to avoid hammering Figma CDN
  const POOL = 8;
  let i = 0;
  async function worker() {
    while (i < entries.length) {
      const idx = i++;
      const [key, url] = entries[idx];
      try {
        const r = await downloadOne(key, url);
        ok++;
        if (idx % 20 === 0 || idx === entries.length - 1) {
          console.log(`[icons] ${idx + 1}/${entries.length} ${r.size}/${r.name}.svg (${r.bytes} bytes)`);
        }
      } catch (err) {
        failed.push({ key, error: String(err.message || err) });
      }
    }
  }
  await Promise.all(Array.from({ length: POOL }, worker));

  console.log(`[icons] ✓ ${ok} succeeded, ✗ ${failed.length} failed`);
  if (failed.length) {
    console.log('[icons] failures:');
    for (const f of failed.slice(0, 20)) console.log(`  - ${f.key}: ${f.error}`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
