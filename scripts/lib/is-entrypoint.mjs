/**
 * Whether the module at `importMetaUrl` is the script Node was invoked to run — the guard every
 * dual CLI/importable script needs around its `main()` call, so importing the module for one of
 * its exports (as a spec does) never triggers a real run.
 *
 * `import.meta.url === pathToFileURL(process.argv[1]).href` looks like the same check but is
 * not: Node resolves symlinks for `import.meta.url` but never for `argv[1]`, so invoking the
 * script through a symlinked path (macOS `/tmp` -> `/private/tmp`, or any symlinked entrypoint)
 * makes the two sides diverge — the script silently skips `main()` and exits 0 having done
 * nothing. Comparing `realpathSync` of both sides is the fix; this is the one place that
 * comparison lives, replacing three copies that had drifted into two different call shapes.
 */
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export function isEntrypoint(importMetaUrl) {
  if (!process.argv[1]) return false;
  let modulePath;
  try {
    modulePath = fileURLToPath(importMetaUrl);
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
