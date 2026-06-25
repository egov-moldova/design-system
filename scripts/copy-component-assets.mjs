#!/usr/bin/env node
/**
 * Post-build: mirror dist/mud/assets/ → dist/components/assets/.
 *
 * Stencil's `dist-custom-elements` output target does NOT copy `assetsDirs`
 * declared on components, despite the `copy` option being documented. The
 * `dist` (lazy) target copies them to `dist/mud/assets/` correctly,
 * but the standalone components bundled at `dist/components/` (consumed by the
 * React wrappers via `@egov-moldova/mud-react`) call
 * `getAssetPath('./assets/foo.svg')` and resolve a path adjacent to themselves
 * — i.e. `dist/components/assets/foo.svg` — which doesn't exist without this
 * step. The component renders empty silently. cor-logo is the first asset-
 * driven component but any future one (icons, illustrations) will be hit by
 * the same bug.
 *
 * Idempotent: removes the destination first.
 */
import { rm, mkdir, cp, access } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const src = resolve(root, 'dist/mud/assets');
const dst = resolve(root, 'dist/components/assets');

try {
  await access(src);
} catch {
  console.error(`[copy-component-assets] Source missing: ${src}`);
  console.error('Run `stencil build` first so the lazy output writes assets.');
  process.exit(1);
}

await rm(dst, { recursive: true, force: true });
await mkdir(dirname(dst), { recursive: true });
await cp(src, dst, { recursive: true });
console.log(`[copy-component-assets] Mirrored ${src} → ${dst}`);
