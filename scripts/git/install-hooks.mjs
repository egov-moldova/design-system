#!/usr/bin/env node
// Installs the Husky hooks, then registers the merge driver.
//
// Run by the `postinstall` of the private `react` workspace, not the root package: Yarn runs
// every workspace's `postinstall` on `yarn install`, while a root install script would travel
// with @egov-moldova/mud — `npm publish` sends the on-disk package.json as the registry
// manifest, so consumers would see an install script for a component library.
// Idempotent; safe to re-run by hand from any directory. `HUSKY=0` skips the hooks.

import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import husky from 'husky';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
// Husky resolves `.husky` and `.git` from the cwd, and the workspace runs this from react/.
process.chdir(root);

const message = husky();
if (message) console.log(`husky - ${message}`);

const setup = spawnSync(process.execPath, [resolve(root, 'scripts', 'git', 'setup-merge-drivers.mjs')], {
  stdio: 'inherit',
});
if (setup.error) {
  console.error(`[install-hooks] failed to spawn: ${setup.error.message}`);
  process.exit(1);
}
process.exit(setup.status ?? 1);
