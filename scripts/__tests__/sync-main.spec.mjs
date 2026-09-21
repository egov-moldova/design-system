import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

import { withoutGitLocation } from '../git/env.mjs';
import { classifyConflicts, parseArgs, resolveUnionConflicts } from '../git/sync-main.mjs';

const SCRIPT = fileURLToPath(new URL('../git/sync-main.mjs', import.meta.url));

// Same isolation as git-hooks.spec.mjs: no inherited GIT_DIR, no developer global config —
// in particular no global merge.ours.driver, so generated files conflict as plain text here.
function scratchEnv() {
  return { ...withoutGitLocation(), GIT_CONFIG_GLOBAL: os.devNull, GIT_CONFIG_NOSYSTEM: '1' };
}

function git(cwd, ...args) {
  const run = spawnSync('git', args, { cwd, env: scratchEnv(), encoding: 'utf8' });
  assert.equal(run.error, undefined);
  assert.equal(run.status, 0, `git ${args.join(' ')}: ${run.stderr}`);
  return run.stdout.trim();
}

function write(cwd, file, text) {
  fs.writeFileSync(path.join(cwd, file), text);
}

function read(cwd, file) {
  return fs.readFileSync(path.join(cwd, file), 'utf8');
}

function sync(cwd, ...extra) {
  const run = spawnSync(process.execPath, [SCRIPT, '--upstream', 'main', '--skip-build', '--skip-checks', ...extra], {
    cwd,
    env: scratchEnv(),
    encoding: 'utf8',
  });
  assert.equal(run.error, undefined);
  return run;
}

/** main and feat both touched the CHANGELOG top and a generated file; `code.txt` is shared. */
function scratchRepo({ conflictInCode = false } = {}) {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-main-'));
  git(cwd, 'init', '-q', '-b', 'main');
  git(cwd, 'config', 'user.name', 'Spec');
  git(cwd, 'config', 'user.email', 'spec@example.com');
  write(cwd, '.gitattributes', 'gen.txt merge=ours\n');
  write(cwd, 'CHANGELOG.md', '# Changelog\n\n## Unreleased\n\n### Older\n');
  write(cwd, 'gen.txt', 'v0\n');
  write(cwd, 'code.txt', 'a\n');
  git(cwd, 'add', '.');
  git(cwd, 'commit', '-q', '-m', 'base');

  git(cwd, 'checkout', '-q', '-b', 'feat');
  write(cwd, 'CHANGELOG.md', '# Changelog\n\n## Unreleased\n\n### Feat A\n\n### Older\n');
  write(cwd, 'gen.txt', 'feat\n');
  if (conflictInCode) write(cwd, 'code.txt', 'feat\n');
  git(cwd, 'commit', '-q', '-am', 'feat');

  git(cwd, 'checkout', '-q', 'main');
  write(cwd, 'CHANGELOG.md', '# Changelog\n\n## Unreleased\n\n### Main B\n\n### Older\n');
  write(cwd, 'gen.txt', 'main\n');
  if (conflictInCode) write(cwd, 'code.txt', 'main\n');
  git(cwd, 'commit', '-q', '-am', 'main');
  git(cwd, 'checkout', '-q', 'feat');
  return cwd;
}

describe('sync-main — resolveUnionConflicts', () => {
  it('keeps both sides, the incoming (branch) side first', () => {
    const text = ['top', '<<<<<<< HEAD', 'main', '=======', 'branch', '>>>>>>> abc (feat)', 'end'].join('\n');
    assert.equal(resolveUnionConflicts(text), ['top', 'branch', '', 'main', 'end'].join('\n'));
  });

  it('drops a diff3 base section', () => {
    const text = ['<<<<<<< HEAD', 'main', '||||||| base', 'old', '=======', 'branch', '>>>>>>> abc'].join('\n');
    assert.equal(resolveUnionConflicts(text), ['branch', '', 'main'].join('\n'));
  });

  it('does not double a blank line one side already carries', () => {
    const text = ['<<<<<<< HEAD', 'main', '=======', 'branch', '', '>>>>>>> abc'].join('\n');
    assert.equal(resolveUnionConflicts(text), ['branch', '', 'main'].join('\n'));
  });

  it('refuses markers that do not form a hunk', () => {
    assert.throws(() => resolveUnionConflicts('a\n=======\nb\n'), /outside a hunk/);
    assert.throws(() => resolveUnionConflicts('<<<<<<< HEAD\na\n=======\nb\n'), /unterminated/);
  });
});

describe('sync-main — classifyConflicts', () => {
  it('separates the CHANGELOG, generated paths and real conflicts', () => {
    const isGenerated = p => p === 'src/components.d.ts';
    assert.deepEqual(classifyConflicts(['CHANGELOG.md', 'src/components.d.ts', 'src/a.tsx'], isGenerated), {
      changelog: ['CHANGELOG.md'],
      generated: ['src/components.d.ts'],
      real: ['src/a.tsx'],
    });
  });
});

describe('sync-main — parseArgs', () => {
  it('rejects an unknown option instead of ignoring it', () => {
    assert.throws(() => parseArgs(['--forse']), /unknown option/);
  });
});

describe('sync-main — rebase', () => {
  it('resolves CHANGELOG and generated-file conflicts and finishes the rebase', () => {
    const cwd = scratchRepo();
    const run = sync(cwd);
    assert.equal(run.status, 0, run.stderr);

    assert.equal(git(cwd, 'rev-parse', 'HEAD~1'), git(cwd, 'rev-parse', 'main'));
    assert.equal(read(cwd, 'gen.txt'), 'main\n');
    const changelog = read(cwd, 'CHANGELOG.md');
    assert.doesNotMatch(changelog, /^(<<<<<<<|=======|>>>>>>>)/m);
    assert.ok(changelog.indexOf('### Feat A') < changelog.indexOf('### Main B'), changelog);
    assert.match(changelog, /### Main B\n\n### Older/);
  });

  it('stops on a real conflict and leaves the rebase for a person', () => {
    const cwd = scratchRepo({ conflictInCode: true });
    const run = sync(cwd);
    assert.equal(run.status, 1);
    assert.match(run.stderr, /real conflicts/);
    assert.match(run.stderr, / {2}code\.txt/);
    assert.doesNotMatch(run.stderr, / {2}gen\.txt|CHANGELOG\.md\n/);
    assert.ok(fs.existsSync(path.join(cwd, git(cwd, 'rev-parse', '--git-path', 'rebase-merge'))));
  });

  it('refuses to start on the base branch or with uncommitted changes', () => {
    const cwd = scratchRepo();
    write(cwd, 'code.txt', 'dirty\n');
    assert.match(sync(cwd).stderr, /uncommitted changes/);
    git(cwd, 'checkout', '-q', '--', 'code.txt');
    git(cwd, 'checkout', '-q', 'main');
    assert.match(sync(cwd).stderr, /you are on main/);
  });
});
