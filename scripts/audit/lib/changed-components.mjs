/**
 * Resolve the list of `mud-*` components touched in the current branch's git
 * diff against `main`. Shared by every audit script that accepts `--changed`.
 *
 * Returns a sorted, de-duplicated array of component names (e.g. ["mud-button",
 * "mud-text-input"]). If git is unavailable or no base ref resolves, returns []. Callers
 * should treat empty as "no work needed" — not an error.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from './component-paths.mjs';

// A worktree or a fresh clone often has only `origin/main`; diffing against a missing `main`
// fails and would silently check nothing.
const BASE_CANDIDATES = ['main', 'origin/main'];

export function pickBase(refExists) {
  return BASE_CANDIDATES.find(refExists) ?? null;
}

const gitRefExists = ref =>
  spawnSync('git', ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`], { encoding: 'utf8' }).status === 0;

/**
 * Component names from `git diff --name-only` lines. A folder deleted or renamed on the branch
 * is still in the diff but has nothing left to audit, so only folders that exist are kept.
 */
export function componentsFromDiff(lines, folderExists) {
  const names = new Set();
  for (const line of lines) {
    const m = line.match(/^src\/(components|hidden)\/(mud-[a-z0-9-]+)\//);
    if (m && folderExists(`src/${m[1]}/${m[2]}`)) names.add(m[2]);
  }
  return [...names].sort();
}

export function listChangedComponents({ base = pickBase(gitRefExists) } = {}) {
  if (!base) return [];
  const res = spawnSync('git', ['diff', '--name-only', `${base}...HEAD`], { encoding: 'utf8' });
  if (res.status !== 0) return [];
  return componentsFromDiff((res.stdout ?? '').split('\n'), rel => existsSync(path.join(REPO_ROOT, rel)));
}
