#!/usr/bin/env node
// Cross-platform dispatcher for the AGE merge-driver setup.
// Invoked by package.json "prepare" after `husky install`.
// Detects platform and delegates to the matching .sh / .ps1 script.
// Idempotent; safe to run multiple times.

import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const here = dirname(fileURLToPath(import.meta.url));
const isWindows = process.platform === 'win32';
const script = resolve(here, isWindows ? 'setup-merge-drivers.ps1' : 'setup-merge-drivers.sh');

if (!existsSync(script)) {
  console.error(`[setup-merge-drivers] missing companion script: ${script}`);
  process.exit(1);
}

const result = isWindows
  ? spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script], { stdio: 'inherit' })
  : spawnSync('sh', [script], { stdio: 'inherit' });

if (result.error) {
  console.error(`[setup-merge-drivers] failed to spawn: ${result.error.message}`);
  process.exit(1);
}
process.exit(result.status ?? 0);
