import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const COMMITLINT = path.join(ROOT, 'node_modules', '.bin', 'commitlint');
const SETUP = path.join(ROOT, 'scripts', 'git', 'setup-merge-drivers.mjs');

function commitlint(message) {
  return spawnSync(COMMITLINT, ['--config', path.join(ROOT, 'commitlint.config.mjs')], {
    cwd: ROOT,
    input: message,
    encoding: 'utf8',
  }).status;
}

function git(cwd, ...args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
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
  return spawnSync('git', ['-c', 'rerere.enabled=false', 'merge', '--no-edit', 'other'], {
    cwd: dir,
    encoding: 'utf8',
  }).status;
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
    execFileSync(process.execPath, [SETUP], { cwd: dir, stdio: 'ignore' });
    assert.equal(git(dir, 'config', '--get', 'merge.ours.driver').trim(), 'true');
    assert.equal(merge(dir), 0);
    assert.equal(fs.readFileSync(path.join(dir, 'generated.txt'), 'utf8'), 'ours\n');
  });

  it('exits 0 outside a git work tree, as in the Docker install stage', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-hooks-nogit-'));
    const { status } = spawnSync(process.execPath, [SETUP], { cwd: dir, encoding: 'utf8' });
    assert.equal(status, 0);
  });
});
