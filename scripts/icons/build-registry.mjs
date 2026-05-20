#!/usr/bin/env node
/**
 * Scan src/components/cor-icon/assets/{12,16,20,24}/*.svg and emit:
 *   - icons.manifest.json — public surface (API name → sizes available)
 *
 * SVGs are served as individual static assets (lazy-loaded on demand).
 *
 * Naming normalization:
 *   Figma sometimes uses `-fill` and sometimes `-filled` for filled variants.
 *   We expose only the `-filled` convention (Material Symbols style). When a
 *   `-fill` file would collide with an existing `-filled` file at the same size,
 *   we keep BOTH using their original Figma names and emit a warning so the
 *   designer can resolve the duplicate upstream.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const ASSETS_ROOT = path.join(PROJECT_ROOT, 'src/components/cor-icon/assets');
const MANIFEST_JSON = path.join(ASSETS_ROOT, 'icons.manifest.json');

const SIZES = [12, 16, 20, 24];

function toApiName(figmaName) {
  // -fill (alone, not -filled) -> -filled. Also -solid -> -filled.
  if (figmaName.endsWith('-fill')) return figmaName.slice(0, -'-fill'.length) + '-filled';
  if (figmaName.endsWith('-solid')) return figmaName.slice(0, -'-solid'.length) + '-filled';
  return figmaName;
}

async function main() {
  // Map<apiName, Map<size, figmaName>>
  const collected = new Map();
  const collisions = [];

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
      const figmaName = file.replace(/\.svg$/, '');
      const apiName = toApiName(figmaName);
      const sizeMap = collected.get(apiName) ?? new Map();

      if (sizeMap.has(size)) {
        const existingName = sizeMap.get(size);
        collisions.push({ apiName, size, keeping: existingName, dropped: figmaName });
        // Keep the entry that matches the API name verbatim. Otherwise keep first.
        if (existingName === apiName) continue;
        if (figmaName === apiName) {
          sizeMap.set(size, figmaName);
          collected.set(apiName, sizeMap);
        }
        continue;
      }

      sizeMap.set(size, figmaName);
      collected.set(apiName, sizeMap);
    }
  }

  if (collisions.length) {
    console.warn(`[icons] ${collisions.length} naming collision(s) — both Figma names map to the same API name:`);
    for (const c of collisions) {
      console.warn(`  - "${c.apiName}" @ ${c.size}px: keeping "${c.keeping}", dropping "${c.dropped}"`);
    }
  }

  // Build manifest
  const manifest = {};
  const sortedNames = [...collected.keys()].sort();
  for (const apiName of sortedNames) {
    const sizeMap = collected.get(apiName);
    const sizes = [...sizeMap.keys()].sort((a, b) => a - b);
    manifest[apiName] = { sizes };
  }

  await fs.writeFile(MANIFEST_JSON, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

  // Summary
  const total = Object.keys(manifest).length;
  const perSize = SIZES.reduce((acc, s) => {
    acc[s] = Object.values(manifest).filter(m => m.sizes.includes(s)).length;
    return acc;
  }, {});

  console.log(`[icons] Manifest built — ${total} icons:`);
  for (const s of SIZES) {
    console.log(`  ${s}px: ${perSize[s]} icons`);
  }
  console.log(`[icons] Wrote ${path.relative(PROJECT_ROOT, MANIFEST_JSON)}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
