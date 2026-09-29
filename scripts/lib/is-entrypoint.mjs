/**
 * Whether the module at `importMetaUrl` is the script Node was invoked to run — the guard every
 * dual CLI/importable script needs around its `main()` call, so importing the module for one of
 * its exports (as a spec does) never triggers a real run.
 *
 * `import.meta.url === pathToFileURL(process.argv[1]).href` looks like the same check but is
 * not: Node resolves symlinks for `import.meta.url` by default but never for `argv[1]`, so
 * invoking the script through a symlinked path (macOS `/tmp` -> `/private/tmp`, or any symlinked
 * entrypoint) makes the two sides diverge — the script silently skips `main()` and exits 0
 * having done nothing. `--preserve-symlinks-main` flips the other side too: it leaves
 * `import.meta.url` pointed at the link instead of resolving it, so a naive "realpath argv[1]
 * only" fix still diverges under that flag. `realpathSync` on BOTH sides is the fix; this is the
 * one place that comparison lives, replacing four copies that had drifted into two different
 * call shapes.
 */
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export function isEntrypoint(importMetaUrl) {
  if (!process.argv[1]) return false;
  let modulePath;
  try {
    modulePath = realpathSync(fileURLToPath(importMetaUrl));
  } catch {
    return false;
  }
  try {
    return modulePath === realpathSync(process.argv[1]);
  } catch {
    // argv[1] does not exist on disk (e.g. a REPL or an eval) — never the running module.
    return false;
  }
}
