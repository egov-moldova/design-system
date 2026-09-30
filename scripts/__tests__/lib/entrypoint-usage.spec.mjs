/**
 * Every CLI script under scripts/ guards its `main()` with `isEntrypoint` from
 * scripts/lib/is-entrypoint.mjs; a hand-rolled `import.meta.url` vs `process.argv[1]`
 * comparison silently skips `main()` when the script is started through a symlinked path.
 *
 * Exempt: scripts/git/**, which the Dockerfile copies alone (`COPY scripts/git ./scripts/git`)
 * before the rest of the tree, so it must not import from scripts/lib; and argv[1] used as data
 * rather than as the entrypoint check (validate-package.mjs builds a child script that parses it).
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const SCRIPTS = fileURLToPath(new URL('../../', import.meta.url));
const EXEMPT_DIRS = [path.join(SCRIPTS, 'git'), path.join(SCRIPTS, '__tests__'), path.join(SCRIPTS, 'lib')];
const ENTRYPOINT_CHECK = /import\.meta\.url[^\n]*process\.argv\[1\]|process\.argv\[1\][^\n]*import\.meta\.url/;

function* scriptFiles(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!EXEMPT_DIRS.includes(full) && entry.name !== 'node_modules') yield* scriptFiles(full);
    } else if (entry.name.endsWith('.mjs')) {
      yield full;
    }
  }
}

describe('scripts/ entrypoint guards', () => {
  it('use isEntrypoint, never a hand-rolled import.meta.url / argv[1] comparison', () => {
    const offenders = [];
    for (const file of scriptFiles(SCRIPTS)) {
      fs.readFileSync(file, 'utf8')
        .split('\n')
        .forEach((line, index) => {
          if (ENTRYPOINT_CHECK.test(line)) offenders.push(`${path.relative(SCRIPTS, file)}:${index + 1}`);
        });
    }
    assert.deepEqual(offenders, []);
  });
});
