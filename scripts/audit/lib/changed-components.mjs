/**
 * Resolve the list of `mud-*` components touched in the current branch's git
 * diff against `main`. Shared by every audit script that accepts `--changed`.
 *
 * Returns a sorted, de-duplicated array of component names (e.g. ["mud-button",
 * "mud-text-input"]). If git is unavailable or returns non-zero, returns []. Callers
 * should treat empty as "no work needed" — not an error.
 */
import { spawnSync } from 'node:child_process';

export function listChangedComponents({ base = 'main' } = {}) {
  const res = spawnSync('git', ['diff', '--name-only', `${base}...HEAD`], { encoding: 'utf8' });
  if (res.status !== 0) return [];
  const names = new Set();
  for (const line of (res.stdout ?? '').split('\n')) {
    const m = line.match(/^src\/(components|hidden)\/(mud-[a-z0-9-]+)\//);
    if (m) names.add(m[2]);
  }
  return [...names].sort();
}
