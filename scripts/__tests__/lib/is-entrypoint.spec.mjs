/**
 * scripts/lib/is-entrypoint.mjs — the `isEntrypoint` guard: true only for the module Node was
 * invoked to run, including through a symlinked path and under `--preserve-symlinks-main`.
 * The last cases spawn a real Node process, so the premise the helper rests on (how Node
 * resolves the main module's URL) is tested, not imitated.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, it } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { isEntrypoint } from '../../lib/is-entrypoint.mjs';

const HELPER = fileURLToPath(new URL('../../lib/is-entrypoint.mjs', import.meta.url));

const tempDirs = [];
afterEach(() => {
  for (const dir of tempDirs.splice(0).reverse()) {
    fs.chmodSync(dir, 0o700);
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

/** A fresh realpath'd temp dir holding `script.mjs`. */
function scratch() {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'is-entrypoint-')));
  tempDirs.push(root);
  const script = path.join(root, 'script.mjs');
  fs.writeFileSync(script, '');
  return { root, script };
}

/** Runs `fn` with `process.argv[1]` set to `value`, restoring it afterwards. */
function withArgv1(value, fn) {
  const original = process.argv[1];
  process.argv[1] = value;
  try {
    return fn();
  } finally {
    process.argv[1] = original;
  }
}

describe('is-entrypoint.mjs — isEntrypoint', () => {
  it('is true when argv[1] names the module directly', () => {
    const { script } = scratch();
    assert.equal(
      withArgv1(script, () => isEntrypoint(pathToFileURL(script).href)),
      true,
    );
  });

  it('is true when argv[1] is a symlink to the module', () => {
    const { root, script } = scratch();
    const link = path.join(root, 'link.mjs');
    fs.symlinkSync(script, link);
    assert.equal(
      withArgv1(link, () => isEntrypoint(pathToFileURL(script).href)),
      true,
    );
  });

  it('is true when the module URL keeps the link (--preserve-symlinks-main)', () => {
    const { root, script } = scratch();
    const link = path.join(root, 'link.mjs');
    fs.symlinkSync(script, link);
    assert.equal(
      withArgv1(script, () => isEntrypoint(pathToFileURL(link).href)),
      true,
    );
  });

  it('is false for a different module', () => {
    const { root, script } = scratch();
    const other = path.join(root, 'other.mjs');
    fs.writeFileSync(other, '');
    assert.equal(
      withArgv1(other, () => isEntrypoint(pathToFileURL(script).href)),
      false,
    );
  });

  it('is false when argv[1] is missing (a REPL)', () => {
    const { script } = scratch();
    assert.equal(
      withArgv1(undefined, () => isEntrypoint(pathToFileURL(script).href)),
      false,
    );
  });

  it('is false when argv[1] does not exist on disk (ENOENT)', () => {
    const { root, script } = scratch();
    const ghost = path.join(root, 'ghost.mjs');
    assert.equal(
      withArgv1(ghost, () => isEntrypoint(pathToFileURL(script).href)),
      false,
    );
  });

  it('rethrows a realpath failure other than ENOENT instead of reporting "not the entrypoint"', t => {
    if (process.getuid?.() === 0) return t.skip('root ignores directory permissions');
    const { root, script } = scratch();
    const locked = path.join(root, 'locked');
    fs.mkdirSync(locked);
    const inside = path.join(locked, 'x.mjs');
    fs.writeFileSync(inside, '');
    fs.chmodSync(locked, 0o000);
    tempDirs.push(locked);
    assert.throws(
      () => withArgv1(inside, () => isEntrypoint(pathToFileURL(script).href)),
      error => error.code === 'EACCES',
    );
  });

  for (const flags of [[], ['--preserve-symlinks-main']]) {
    it(`a real run through a symlinked path reaches main()${flags.length ? ` (${flags[0]})` : ''}`, () => {
      const { root } = scratch();
      const real = path.join(root, 'real.mjs');
      fs.writeFileSync(
        real,
        `import { isEntrypoint } from ${JSON.stringify(pathToFileURL(HELPER).href)};\n` +
          `if (isEntrypoint(import.meta.url)) console.log('main');\n`,
      );
      const link = path.join(root, 'linked.mjs');
      fs.symlinkSync(real, link);
      const run = spawnSync(process.execPath, [...flags, link], { encoding: 'utf8' });
      assert.equal(run.status, 0, run.stderr);
      assert.equal(run.stdout.trim(), 'main');
    });
  }
});
