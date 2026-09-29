/**
 * Whether the module at `importMetaUrl` is the script Node was invoked to run — the guard a
 * dual CLI/importable script needs around its `main()` call, so importing the module for one of
 * its exports (as a spec does) never triggers a real run.
 *
 * `import.meta.url === pathToFileURL(process.argv[1]).href` looks like the same check but is
 * not: Node resolves symlinks for `import.meta.url` by default but never for `argv[1]`, so a
 * script started through a symlinked path (macOS `/tmp` -> `/private/tmp`, a linked worktree, a
 * bin link) sees the two sides differ, skips `main()` and exits 0 having done nothing.
 * `--preserve-symlinks-main` flips it: `import.meta.url` then keeps the link, so resolving only
 * `argv[1]` still differs. Both sides are realpath'd here, after a string-equality fast path.
 *
 * A path that does not exist (an eval, a stale `argv[1]`) is never the running module. Any other
 * realpath failure (EACCES, ELOOP) is rethrown: returning false would silently turn a gate
 * script into a no-op that exits 0, which is the failure this helper exists to prevent.
 *
 * DEBT(node-floor): Node >= 24.2 has `import.meta.main`, which answers this directly; the
 * package's `engines` still admits 24.0 and 24.1. Replace this helper with `import.meta.main`
 * once the floor is raised.
 */
import { realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function isEntrypoint(importMetaUrl) {
  const argvPath = process.argv[1];
  if (!argvPath) return false;
  const modulePath = fileURLToPath(importMetaUrl);
  const argvAbsolute = path.resolve(argvPath);
  if (modulePath === argvAbsolute) return true;
  try {
    return realpathSync(modulePath) === realpathSync(argvAbsolute);
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}
