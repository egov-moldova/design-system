import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

import { GIT_LOCATION_VARS, withoutGitLocation } from '../git/env.mjs';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
// The JS entry, run by node: the `.bin` shim needs a shell on Windows, and a child that
// never starts returns status null, which would pass every `notEqual(status, 0)`.
const COMMITLINT = path.join(ROOT, 'node_modules', '@commitlint', 'cli', 'cli.js');
const SETUP = path.join(ROOT, 'scripts', 'git', 'setup-merge-drivers.mjs');

/** Exit status of a child that must have started. */
function statusOf(run) {
  assert.equal(run.error, undefined);
  return run.status;
}

function commitlint(message) {
  return statusOf(
    spawnSync(process.execPath, [COMMITLINT, '--config', path.join(ROOT, 'commitlint.config.mjs')], {
      cwd: ROOT,
      input: message,
      encoding: 'utf8',
    }),
  );
}

// Every git this suite starts runs in scratchEnv(): under `.husky/pre-push` an inherited
// GIT_DIR would point these scratch repos at the real repository, and a developer's global
// config (commit.gpgsign, a global merge.ours.driver, core.hooksPath) would change results.
// Built per call, so a test that sets GIT_DIR sees it stripped.
function scratchEnv() {
  return { ...withoutGitLocation(), GIT_CONFIG_GLOBAL: os.devNull, GIT_CONFIG_NOSYSTEM: '1' };
}

function git(cwd, ...args) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: scratchEnv(),
  });
}

/** A repo whose one `merge=ours` file diverges on two branches. */
function divergedRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-hooks-'));
  git(dir, 'init', '-q', '-b', 'main');
  git(dir, 'config', 'user.email', 'spec@example.com');
  git(dir, 'config', 'user.name', 'spec');
  fs.writeFileSync(path.join(dir, '.gitattributes'), 'generated.txt merge=ours\n');
  fs.writeFileSync(path.join(dir, 'generated.txt'), 'base\n');
  git(dir, 'add', '.');
  git(dir, 'commit', '-qm', 'base');
  git(dir, 'switch', '-qc', 'other');
  fs.writeFileSync(path.join(dir, 'generated.txt'), 'theirs\n');
  git(dir, 'commit', '-qam', 'theirs');
  git(dir, 'switch', '-q', 'main');
  fs.writeFileSync(path.join(dir, 'generated.txt'), 'ours\n');
  git(dir, 'commit', '-qam', 'ours');
  return dir;
}

function merge(dir) {
  return statusOf(
    spawnSync('git', ['-c', 'rerere.enabled=false', 'merge', '--no-edit', 'other'], {
      cwd: dir,
      encoding: 'utf8',
      env: scratchEnv(),
    }),
  );
}

describe('commit-msg hook: commitlint config', () => {
  it('rejects a message that is not a Conventional Commit', () => {
    assert.notEqual(commitlint('bad message\n'), 0);
  });

  it('accepts a Conventional Commit', () => {
    assert.equal(commitlint('docs(agents): load AGENTS.md through CLAUDE.md\n'), 0);
  });
});

describe('setup-merge-drivers: merge=ours', () => {
  it('is not built in: without the driver registered the merge conflicts', () => {
    const dir = divergedRepo();
    assert.notEqual(merge(dir), 0);
  });

  it('keeps the current branch copy once the setup script has run', () => {
    const dir = divergedRepo();
    execFileSync(process.execPath, [SETUP], { cwd: dir, stdio: 'ignore', env: scratchEnv() });
    assert.equal(git(dir, 'config', '--get', 'merge.ours.driver').trim(), 'true');
    assert.equal(merge(dir), 0);
    assert.equal(fs.readFileSync(path.join(dir, 'generated.txt'), 'utf8'), 'ours\n');
  });

  it('exits 0 outside a git work tree, as in the Docker install stage', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-hooks-nogit-'));
    const { status } = spawnSync(process.execPath, [SETUP], { cwd: dir, encoding: 'utf8', env: scratchEnv() });
    assert.equal(status, 0);
  });
});

describe('scratch repos under a git hook', () => {
  it('.husky/pre-push unsets exactly the variables scripts/git/env.mjs strips', () => {
    const hook = fs.readFileSync(path.join(ROOT, '.husky', 'pre-push'), 'utf8');
    const unset = hook.match(/^unset (.+)$/m);
    assert.ok(unset, '.husky/pre-push has no unset line');
    assert.deepEqual(unset[1].trim().split(/\s+/).sort(), [...GIT_LOCATION_VARS].sort());
  });

  it('leave the repository named by an inherited GIT_DIR untouched', () => {
    const outer = fs.mkdtempSync(path.join(os.tmpdir(), 'git-hooks-outer-'));
    git(outer, 'init', '-q', '-b', 'work');
    git(
      outer,
      '-c',
      'user.name=outer',
      '-c',
      'user.email=outer@example.com',
      'commit',
      '-q',
      '--allow-empty',
      '-m',
      'outer',
    );
    const snapshot = () => [
      git(outer, 'for-each-ref'),
      git(outer, 'symbolic-ref', 'HEAD'),
      git(outer, 'config', '--local', '--list'),
    ];
    const before = snapshot();

    // `.husky/pre-push` runs this suite with GIT_DIR set, as git does for every hook.
    const saved = process.env.GIT_DIR;
    process.env.GIT_DIR = path.join(outer, '.git');
    try {
      const dir = divergedRepo();
      execFileSync(process.execPath, [SETUP], { cwd: dir, stdio: 'ignore', env: scratchEnv() });
      assert.equal(merge(dir), 0);
    } finally {
      if (saved === undefined) delete process.env.GIT_DIR;
      else process.env.GIT_DIR = saved;
    }

    assert.deepEqual(snapshot(), before);
  });
});
