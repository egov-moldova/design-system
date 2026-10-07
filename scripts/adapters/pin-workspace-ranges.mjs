#!/usr/bin/env node
/**
 * Rewrites every `workspace:` specifier in a built package manifest to the range Yarn itself
 * would publish, reading each version from the workspace that carries the package's name.
 *
 *   node scripts/adapters/pin-workspace-ranges.mjs <path/to/package.json>
 *
 * Why it exists: ng-packagr copies the source manifest into `dist/package.json` verbatim
 * (it strips `devDependencies` and nothing else), and `dist/` is not a Yarn workspace, so
 * `yarn pack` cannot pack it and `npm pack` does not rewrite `workspace:`. Without this step
 * the Angular adapter's packed manifest would ask a consumer's installer for
 * `@egov-moldova/mud@workspace:^`, which no registry serves. The consumer-fixture runner's
 * guard reads the packed tarball and fails on any `workspace:` it finds.
 *
 * The version is read, never typed: a source manifest keeps `workspace:^`, so the core's
 * version stays in one place (the root `package.json`). Yarn's own mapping:
 *   `workspace:^` → `^<version>`, `workspace:~` → `~<version>`, `workspace:*` → `<version>`,
 *   `workspace:<range>` → `<range>`.
 * A `workspace:` dependency whose name is not a workspace of this repo fails the build.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { isEntrypoint } from '../lib/is-entrypoint.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const FIELDS = ['dependencies', 'peerDependencies', 'optionalDependencies', 'devDependencies'];

const readJson = file => JSON.parse(readFileSync(file, 'utf8'));

/** name → version of the root package and every workspace it lists (literal paths only). */
function workspaceVersions() {
  const root = readJson(join(ROOT, 'package.json'));
  const versions = new Map([[root.name, root.version]]);
  for (const entry of root.workspaces ?? []) {
    if (entry.includes('*')) throw new Error(`workspace entry "${entry}" is a glob: list workspaces by path`);
    const pkg = readJson(join(ROOT, entry, 'package.json'));
    versions.set(pkg.name, pkg.version);
  }
  return versions;
}

export function pinWorkspaceRanges(manifest, versions) {
  const rewritten = [];
  for (const field of FIELDS) {
    for (const [name, range] of Object.entries(manifest[field] ?? {})) {
      if (!String(range).startsWith('workspace:')) continue;
      const version = versions.get(name);
      if (!version) throw new Error(`${field}.${name} = ${range}: ${name} is not a workspace of this repository`);
      const spec = range.slice('workspace:'.length);
      const pinned = spec === '^' || spec === '~' ? `${spec}${version}` : spec === '*' ? version : spec;
      manifest[field][name] = pinned;
      rewritten.push(`${field}.${name}: ${range} → ${pinned}`);
    }
  }
  return rewritten;
}

if (isEntrypoint(import.meta.url)) {
  const target = process.argv[2];
  if (!target) {
    console.error('usage: pin-workspace-ranges.mjs <package.json>');
    process.exit(2);
  }
  const file = resolve(target);
  const manifest = readJson(file);
  const rewritten = pinWorkspaceRanges(manifest, workspaceVersions());
  writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`);
  for (const line of rewritten) console.log(`[pin-workspace-ranges] ${line}`);
  if (rewritten.length === 0) console.log(`[pin-workspace-ranges] ${target}: no workspace: specifier`);
}
