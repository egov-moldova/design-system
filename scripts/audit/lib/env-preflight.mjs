/**
 * env-preflight.mjs
 *
 * Answers one question before any audit script runs: is this environment
 * usable at all? Today a missing install, a Node version outside
 * `engines.node`, or a resolvable-but-absent dependency surfaces as a
 * `JSON.parse` failure or an `ERR_MODULE_NOT_FOUND` buried in one script's
 * stderr (plan `2026-09-21-audit-component-depths.md` F2). `checkEnv()` turns
 * that into one line naming the cause and the exact command that fixes it —
 * `run-all.mjs` calls it once, before dispatching any wave.
 *
 * Required deps are the packages `scripts/audit/**` actually import outside
 * node: builtins and its own `lib/` modules — `typescript` (14, 16, figma-refs),
 * `postcss` (04, 12, 14), `playwright` (dynamic `import('playwright')` in
 * `lib/browser-context.mjs`, every Wave C script), `pixelmatch` and `pngjs`
 * (11-pixel-diff-states, image-diff). Re-derive with:
 *   rg -n "^import" scripts/audit/*.mjs scripts/audit/lib/*.mjs | grep -v "node:\|\./\|\.\./"
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { REPO_ROOT } from './component-paths.mjs';

export const REQUIRED_DEPS = ['typescript', 'postcss', 'playwright', 'pixelmatch', 'pngjs'];

/**
 * @param {object} [opts] — injection seam so tests never depend on the real machine
 * @param {string} [opts.repoRoot]
 * @param {string} [opts.nodeVersion]           — overrides `process.versions.node`
 * @param {(id: string) => string} [opts.resolve] — overrides the require-resolver
 * @param {(path: string) => boolean} [opts.exists] — overrides `existsSync`
 * @param {(path: string, enc: string) => string} [opts.readFile] — overrides `readFileSync`
 * @param {string[]} [opts.requiredDeps]
 * @returns {{ok: true} | {ok: false, cause: string, command: string}}
 */
export function checkEnv({
  repoRoot = REPO_ROOT,
  nodeVersion = process.versions.node,
  resolve = createRequire(join(REPO_ROOT, 'package.json')).resolve,
  exists = existsSync,
  readFile = (p, enc) => readFileSync(p, enc),
  requiredDeps = REQUIRED_DEPS,
} = {}) {
  if (!exists(join(repoRoot, 'node_modules'))) {
    return { ok: false, cause: 'node_modules is missing', command: 'yarn install' };
  }

  const pkg = JSON.parse(readFile(join(repoRoot, 'package.json'), 'utf8'));
  const range = pkg.engines?.node;
  if (range && !satisfiesRange(nodeVersion, range)) {
    return {
      ok: false,
      cause: `Node ${nodeVersion} does not satisfy engines.node "${range}"`,
      command: 'fnm use 24',
    };
  }

  for (const dep of requiredDeps) {
    try {
      resolve(dep);
    } catch {
      return { ok: false, cause: `dependency "${dep}" is not resolvable`, command: 'yarn install' };
    }
  }

  return { ok: true };
}

/**
 * Minimal comparator for `engines`-style ranges: space-separated clauses,
 * each `>=` / `<=` / `>` / `<` / `=` against an `X.Y.Z` version, ANDed
 * together. Not a general semver range parser — the repo pins exactly one
 * shape (`package.json` `engines.node`, currently `">=24.0.0 <25.0.0"`) and
 * this matches only that shape; an unrecognized clause is not enforced
 * rather than treated as a failure.
 */
export function satisfiesRange(version, range) {
  const v = parseVersion(version);
  const clauses = String(range).trim().split(/\s+/).filter(Boolean);
  return clauses.every(clause => {
    const m = clause.match(/^(>=|<=|>|<|=)?(\d+)\.(\d+)\.(\d+)$/);
    if (!m) return true;
    const [, op = '=', maj, min, pat] = m;
    const cmp = compareVersions(v, [Number(maj), Number(min), Number(pat)]);
    switch (op) {
      case '>=':
        return cmp >= 0;
      case '<=':
        return cmp <= 0;
      case '>':
        return cmp > 0;
      case '<':
        return cmp < 0;
      default:
        return cmp === 0;
    }
  });
}

function parseVersion(v) {
  const [maj, min = '0', pat = '0'] = String(v).split('.');
  return [Number(maj), Number(min), Number(pat)];
}

function compareVersions(a, b) {
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

/** The one-line message F2 asks for: `INCOMPLETE: <cause> — run: <exact command>`. */
export function formatIncomplete({ cause, command }) {
  return `INCOMPLETE: ${cause} — run: ${command}`;
}
