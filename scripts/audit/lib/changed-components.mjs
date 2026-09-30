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

/**
 * Detect the changed-component set and say whether the detection itself
 * succeeded — distinct from "it succeeded and found nothing" (plan
 * `2026-09-22-audit-depths-sentinel-fixes.md` Decision §9). `run-all.mjs`
 * treats `ok: false` as INCOMPLETE (a broken detector), never as an empty
 * selection (a clean tree). `refExists` / `diff` are an injection seam for
 * tests that need to fail the underlying git calls; production always uses
 * the real ones.
 *
 * @returns {{ ok: boolean, cause: string|null, names: string[] }}
 */
export function detectChangedComponents({
  refExists = gitRefExists,
  diff = base => spawnSync('git', ['diff', '--name-only', `${base}...HEAD`], { encoding: 'utf8' }),
  folderExists = rel => existsSync(path.join(REPO_ROOT, rel)),
} = {}) {
  const base = pickBase(refExists);
  if (!base) return { ok: false, cause: 'no base ref resolved (tried: main, origin/main)', names: [] };
  const res = diff(base);
  if (res.status !== 0) return { ok: false, cause: `git diff ${base}...HEAD exited ${res.status}`, names: [] };
  return { ok: true, cause: null, names: componentsFromDiff((res.stdout ?? '').split('\n'), folderExists) };
}

/**
 * Wrapper kept for the 16 standalone scripts that only need the name list
 * and treat a broken detector the same as "nothing changed" (plan Decision
 * §9 — `run-all.mjs` is the one caller that needs `detectChangedComponents`'s
 * `ok`/`cause` to fail closed).
 */
export function listChangedComponents(opts = {}) {
  return detectChangedComponents(opts).names;
}
