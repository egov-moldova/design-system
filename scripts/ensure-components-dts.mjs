#!/usr/bin/env node
/**
 * Make sure `src/components.d.ts` exists and matches the components on disk, so `tsc --noEmit`
 * can resolve the `mud-*` JSX and `HTMLMud*Element` types.
 *
 * The file is git-ignored (every Stencil build rewrites it, and the package ships its own copy in
 * dist/types/), so a fresh clone or a CI checkout starts without it, and switching branches no
 * longer swaps it. It is rebuilt when it is missing, when it imports a component file that no
 * longer exists, or when a component tag on disk is absent from it. Otherwise nothing runs, so the
 * pre-commit `yarn typecheck` costs what it did before; the first one after switching to a branch
 * that adds or removes a component pays for one full build.
 *
 * The rebuild is `yarn build`, not a bare `stencil build --dev`: wireit holds a cross-process lock
 * on `build`, so when `yarn check` runs this alongside its own `build` the two serialize instead
 * of writing dist/ at the same time, and wireit's record of `build` stays true. It also rewrites
 * the tracked readmes, which on a consistent branch match what is committed.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SRC = path.join(ROOT, 'src');

function* tsxFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* tsxFiles(full);
    else if (entry.name.endsWith('.tsx') && !entry.name.endsWith('.spec.tsx')) yield full;
  }
}

/** Why the declarations under `src` need rebuilding, or null when they are current. */
export function staleReason(src = SRC) {
  const dtsPath = path.join(src, 'components.d.ts');
  if (!existsSync(dtsPath)) return 'src/components.d.ts is missing';
  const dts = readFileSync(dtsPath, 'utf8');
  for (const [, rel] of dts.matchAll(/from "(\.\/components\/[^"]+)"/g)) {
    const base = path.join(src, rel);
    if (!['.ts', '.tsx', '.d.ts'].some(ext => existsSync(base + ext))) return `it imports ${rel}, which is gone`;
  }
  for (const file of tsxFiles(path.join(src, 'components'))) {
    for (const [, tag] of readFileSync(file, 'utf8').matchAll(/@Component\(\{[^}]*?\btag:\s*'([a-z0-9-]+)'/gs)) {
      if (!dts.includes(`"${tag}"`)) return `it does not declare <${tag}>`;
    }
  }
  return null;
}

// realpath on both sides: Node resolves symlinks for import.meta.url but not for argv[1], so a
// checkout reached through one (macOS /tmp -> /private/tmp) would otherwise skip the whole check.
if (process.argv[1] && fileURLToPath(import.meta.url) === realpathSync(process.argv[1])) {
  const reason = staleReason();
  if (reason) {
    console.log(`ensure-components-dts: ${reason}; running \`yarn build\``);
    const run = spawnSync('yarn', ['build'], { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32' });
    if (run.error) throw run.error;
    const after = run.status === 0 ? staleReason() : 'the build failed';
    if (after) {
      console.error(`ensure-components-dts: src/components.d.ts is still not current (${after})`);
      process.exitCode = run.status || 1;
    }
  }
}
