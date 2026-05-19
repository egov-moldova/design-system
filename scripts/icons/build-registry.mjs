#!/usr/bin/env node
/**
 * Scan src/components/cor-icon/assets/{12,16,20,24}/*.svg and emit:
 *   - icons.manifest.json — public surface (API name → sizes available)
 *   - icons.registry.ts   — static SVG strings keyed by name + size
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
const REGISTRY_TS = path.join(ASSETS_ROOT, 'icons.registry.ts');
const MANIFEST_JSON = path.join(ASSETS_ROOT, 'icons.manifest.json');

const SIZES = [12, 16, 20, 24];

function toApiName(figmaName) {
  // -fill (alone, not -filled) -> -filled. Also -solid -> -filled.
  if (figmaName.endsWith('-fill')) return figmaName.slice(0, -'-fill'.length) + '-filled';
  if (figmaName.endsWith('-solid')) return figmaName.slice(0, -'-solid'.length) + '-filled';
  return figmaName;
}

async function readSvg(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return raw.trim();
}

async function main() {
  /**
   * intermediate: Map<apiName, Map<size, { figmaName, svg }>>
   */
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
        const existing = sizeMap.get(size);
        collisions.push({
          apiName,
          size,
          keeping: existing.figmaName,
          dropped: figmaName,
        });
        // Keep the entry that matches the API name verbatim. Otherwise keep first.
        if (existing.figmaName === apiName) {
          continue;
        }
        if (figmaName === apiName) {
          const svg = await readSvg(path.join(dir, file));
          sizeMap.set(size, { figmaName, svg });
          collected.set(apiName, sizeMap);
          continue;
        }
        // Neither matches API exactly — drop the new one.
        continue;
      }

      const svg = await readSvg(path.join(dir, file));
      sizeMap.set(size, { figmaName, svg });
      collected.set(apiName, sizeMap);
    }
  }

  if (collisions.length) {
    console.warn(`[icons] ${collisions.length} naming collision(s) — both Figma names map to the same API name:`);
    for (const c of collisions) {
      console.warn(`  - "${c.apiName}" @ ${c.size}px: keeping "${c.keeping}", dropping "${c.dropped}"`);
    }
  }

  // Build manifest + registry payloads
  const manifest = {};
  const registryEntries = [];

  const sortedNames = [...collected.keys()].sort();
  for (const apiName of sortedNames) {
    const sizeMap = collected.get(apiName);
    const sizes = [...sizeMap.keys()].sort((a, b) => a - b);
    manifest[apiName] = { sizes };

    const svgsLiteral = sizes
      .map(s => {
        const { svg } = sizeMap.get(s);
        const escaped = svg.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');
        return `    ${s}: \`${escaped}\``;
      })
      .join(',\n');

    registryEntries.push(
      `  '${apiName.replace(/'/g, "\\'")}': {\n    sizes: [${sizes.join(', ')}],\n    svgs: {\n${svgsLiteral},\n    },\n  }`,
    );
  }

  const tsHeader = `// THIS FILE IS GENERATED — DO NOT EDIT BY HAND.
// Regenerate with: \`node scripts/icons/build-registry.mjs\`
// Source: src/components/cor-icon/assets/{12,16,20,24}/*.svg

import type { IconRegistry } from '../cor-icon.types';

export const iconRegistry: IconRegistry = {\n`;
  const tsFooter = `\n};\n`;

  const registryTs = tsHeader + registryEntries.join(',\n') + tsFooter;

  await fs.writeFile(REGISTRY_TS, registryTs, 'utf8');
  await fs.writeFile(MANIFEST_JSON, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

  // Summary
  const total = Object.keys(manifest).length;
  const perSize = SIZES.reduce((acc, s) => {
    acc[s] = Object.values(manifest).filter(m => m.sizes.includes(s)).length;
    return acc;
  }, {});

  console.log(`[icons] Registry built — ${total} icons:`);
  for (const s of SIZES) {
    console.log(`  ${s}px: ${perSize[s]} icons`);
  }
  console.log(`[icons] Wrote ${path.relative(PROJECT_ROOT, REGISTRY_TS)}`);
  console.log(`[icons] Wrote ${path.relative(PROJECT_ROOT, MANIFEST_JSON)}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
