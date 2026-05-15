#!/usr/bin/env node
// Generates re-export shim files at <root>/components/ that point at <root>/dist/components/.
// Needed because ng-packagr's ngc invocation doesn't always honor exports-map subpath
// resolution, so consumers (and the wrapper itself during build) get TS2307 when importing
// '@age/design-system/components/cor-*.js'. Plain physical files resolve under any mode.

import { readdirSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const distDir = resolve(root, 'dist/components');
const outDir = resolve(root, 'components');

if (!existsSync(distDir)) {
  console.error(`[shims] dist/components not found at ${distDir}; run stencil build first`);
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });

const entries = readdirSync(distDir);
const dtsBaseNames = new Set(entries.filter(f => f.endsWith('.d.ts')).map(f => f.replace(/\.d\.ts$/, '')));

let shimCount = 0;
for (const base of dtsBaseNames) {
  const jsPath = resolve(outDir, `${base}.js`);
  const dtsPath = resolve(outDir, `${base}.d.ts`);
  writeFileSync(jsPath, `export * from '../dist/components/${base}.js';\n`);
  writeFileSync(dtsPath, `export * from '../dist/components/${base}';\n`);
  shimCount++;
}

console.log(`[shims] wrote ${shimCount * 2} files (.js + .d.ts) for ${shimCount} components → ${outDir}`);
