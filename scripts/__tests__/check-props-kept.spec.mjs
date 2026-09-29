/**
 * check-props-kept.mjs — a `--base` ref that does not resolve must fail loudly, not print OK.
 *
 * Before the fix, `readAtBase()` treated every `git show` failure (including "unknown
 * revision") as "component born after base" and returned `null` for every component,
 * so the script printed OK on a typo'd/nonexistent `--base` ref.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const SCRIPT = fileURLToPath(new URL('../check-props-kept.mjs', import.meta.url));
const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));

function run(args) {
  try {
    const stdout = execFileSync('node', [SCRIPT, ...args], { cwd: REPO_ROOT, encoding: 'utf8', stdio: 'pipe' });
    return { status: 0, stdout, stderr: '' };
  } catch (error) {
    return { status: error.status ?? 1, stdout: error.stdout ?? '', stderr: error.stderr ?? '' };
  }
}

describe('check-props-kept.mjs — --base ref validation', () => {
  it('exits non-zero with a clear message on a nonexistent --base ref', () => {
    const result = run(['--base', 'refs/does-not-exist-anywhere-xyz']);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /does not resolve to a commit/);
  });

  it('exits 0 on a real --base ref (HEAD)', () => {
    const result = run(['--base', 'HEAD']);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /OK/);
  });
});
