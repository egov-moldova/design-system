#!/usr/bin/env node
/**
 * Pre-build: empty every proxy output directory listed in `proxy-dirs.ts`.
 *
 * The root build runs with wireit `clean: false` (it must not wipe `dist/`), and
 * Stencil's output targets only write files, never delete them. A component that is
 * renamed or removed would therefore leave its old proxy behind, importing a module the
 * core no longer exports. Emptying the directories first makes the proxy set exactly
 * what the build generated. Idempotent; the output target recreates each directory.
 */
import { rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PROXY_OUT_DIRS } from './proxy-dirs.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

for (const dir of PROXY_OUT_DIRS) {
  await rm(resolve(root, dir), { recursive: true, force: true });
  console.log(`[clean-proxy-dirs] Emptied ${dir}`);
}
