#!/usr/bin/env node
/**
 * version-bump.mjs
 *
 * Sets `version` in the root package.json to the next release or development
 * version. The Storybook sidebar shows that version, and the release PR
 * commits it: the Azure pipeline stamps its own copy at publish time and
 * never commits back (CONTRIBUTING.md, "Publishing").
 *
 * Versions follow the scheme the pipelines publish: `x.y.z` under `latest`,
 * `x.y.z-dev.N` under `dev`. The strategies follow SemVer's increment rules:
 *
 *   dev     1.2.0-dev.1 → 1.2.0-dev.2     1.2.0 → 1.2.1-dev.1
 *   patch   1.2.0-dev.2 → 1.2.0           1.2.0 → 1.2.1
 *   minor   1.3.0-dev.2 → 1.3.0           1.2.1-dev.2 → 1.3.0
 *   major   2.0.0-dev.2 → 2.0.0           1.2.0 → 2.0.0
 *   x.y.z or x.y.z-dev.N                  exactly that; it must be higher
 *
 * A prerelease that is not `-dev.N` (the old `0.0.0-development` placeholder,
 * for one) has no next step: pass the version to set.
 *
 * Only the `version` line changes; the rest of package.json keeps its bytes.
 * The `web-components` and `react` workspaces version themselves.
 *
 * Usage:
 *   node scripts/version-bump.mjs dev              # write package.json
 *   node scripts/version-bump.mjs minor --dry-run  # print the change, write nothing
 *   node scripts/version-bump.mjs 1.3.0-dev.1 --root <dir>
 *
 * Exit codes: 0 success, 1 invalid input.
 */

import fs from 'node:fs';
import path from 'node:path';

import { isEntrypoint } from './lib/is-entrypoint.mjs';

export const STRATEGIES = ['dev', 'patch', 'minor', 'major'];

const VERSION = /^(\d+)\.(\d+)\.(\d+)(?:-dev\.(\d+))?$/;

class InputError extends Error {}

/** `{ major, minor, patch, dev }` (`dev` null for a release), or null when the version is not in the scheme. Pure. */
export function parseVersion(version) {
  const match = VERSION.exec(version ?? '');
  if (!match) return null;
  const [major, minor, patch, dev] = match.slice(1).map(part => (part === undefined ? null : Number(part)));
  return { major, minor, patch, dev };
}

const format = ({ major, minor, patch, dev }) => `${major}.${minor}.${patch}${dev === null ? '' : `-dev.${dev}`}`;

/** Negative, zero or positive as `a` sorts before, with or after `b`; a release outranks its prereleases. Pure. */
export function compareVersions(a, b) {
  const [x, y] = [parseVersion(a), parseVersion(b)];
  for (const part of ['major', 'minor', 'patch']) {
    if (x[part] !== y[part]) return x[part] - y[part];
  }
  if (x.dev === y.dev) return 0;
  if (x.dev === null) return 1;
  if (y.dev === null) return -1;
  return x.dev - y.dev;
}

/** The version after `current` for a strategy, or the exact version given. Throws InputError. Pure. */
export function nextVersion(current, target) {
  if (!STRATEGIES.includes(target)) {
    if (!parseVersion(target)) {
      throw new InputError(`"${target}" is neither ${STRATEGIES.join(', ')} nor a version (x.y.z or x.y.z-dev.N)`);
    }
    if (parseVersion(current) && compareVersions(target, current) <= 0) {
      throw new InputError(`${target} is not higher than the current ${current}`);
    }
    return target;
  }

  const v = parseVersion(current);
  if (!v) {
    throw new InputError(
      `package.json carries "${current}", which has no next ${target} version; pass one, e.g. 1.2.0-dev.1`,
    );
  }
  const pre = v.dev !== null;
  switch (target) {
    case 'dev':
      return format(pre ? { ...v, dev: v.dev + 1 } : { ...v, patch: v.patch + 1, dev: 1 });
    case 'patch':
      return format(pre ? { ...v, dev: null } : { ...v, patch: v.patch + 1 });
    case 'minor':
      return format(
        pre && v.patch === 0 ? { ...v, dev: null } : { major: v.major, minor: v.minor + 1, patch: 0, dev: null },
      );
    default:
      return format(
        pre && v.minor === 0 && v.patch === 0
          ? { ...v, dev: null }
          : { major: v.major + 1, minor: 0, patch: 0, dev: null },
      );
  }
}

/** package.json text with its top-level `version` replaced and nothing else touched. Pure. */
export function setVersion(packageText, from, to) {
  const line = new RegExp(`^(\\s*"version"\\s*:\\s*)"${from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'm');
  if (!line.test(packageText)) throw new InputError(`package.json has no "version": "${from}" line`);
  return packageText.replace(line, `$1"${to}"`);
}

function parseArgs(argv) {
  const opts = { target: undefined, root: process.cwd(), dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--dry-run') opts.dryRun = true;
    else if (arg === '--root') {
      const value = argv[++i];
      if (value === undefined || value.startsWith('--')) throw new InputError('--root requires a value');
      opts.root = path.resolve(value);
    } else if (arg.startsWith('--')) throw new InputError(`unknown option ${arg}`);
    else if (opts.target === undefined) opts.target = arg;
    else throw new InputError(`unexpected argument ${arg}`);
  }
  if (opts.target === undefined) {
    throw new InputError(`usage: yarn version.bump <${STRATEGIES.join('|')}|x.y.z|x.y.z-dev.N> [--dry-run]`);
  }
  return opts;
}

function main(argv) {
  const opts = parseArgs(argv);
  const file = path.join(opts.root, 'package.json');
  const text = fs.readFileSync(file, 'utf8');
  const current = JSON.parse(text).version;
  const next = nextVersion(current, opts.target);
  const updated = setVersion(text, current, next);

  if (!opts.dryRun) fs.writeFileSync(file, updated);
  console.log(`package.json: ${current} → ${next}${opts.dryRun ? ' (dry run, not written)' : ''}`);
  if (parseVersion(next).dev === null) {
    console.log(`A release version: cut the changelog in the same PR with \`yarn changelog.release ${next}\`.`);
  }
}

if (isEntrypoint(import.meta.url)) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    if (!(error instanceof InputError)) throw error;
    console.error(error.message);
    process.exit(1);
  }
}
