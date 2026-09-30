import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, describe, it } from 'node:test';

import { withoutGitLocation } from '../git/env.mjs';
import { classifyConflicts, parseArgs, printable, resolveUnionConflicts } from '../git/sync-main.mjs';

const SCRIPT = fileURLToPath(new URL('../git/sync-main.mjs', import.meta.url));
const scratch = [];
after(() => {
  for (const dir of scratch) fs.rmSync(dir, { recursive: true, force: true });
});

// Same isolation as git-hooks.spec.mjs: no inherited GIT_DIR, no developer global config —
// in particular no global merge.ours.driver, so generated files conflict as plain text here.
// GIT_EDITOR is set on purpose: the script must not open an editor even when one is exported.
function scratchEnv(extra = {}) {
  return {
    ...withoutGitLocation(),
    GIT_CONFIG_GLOBAL: os.devNull,
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_EDITOR: 'false',
    ...extra,
  };
}

function git(cwd, ...args) {
  const run = spawnSync('git', args, { cwd, env: scratchEnv(), encoding: 'utf8' });
  assert.equal(run.error, undefined);
  assert.equal(run.status, 0, `git ${args.join(' ')}: ${run.stderr}`);
  return run.stdout.trim();
}

function tryGit(cwd, ...args) {
  return spawnSync('git', args, { cwd, env: scratchEnv(), encoding: 'utf8' }).status;
}

function write(cwd, file, text) {
  fs.writeFileSync(path.join(cwd, file), text);
}

function read(cwd, file) {
  return fs.readFileSync(path.join(cwd, file), 'utf8');
}

function sync(cwd, args = ['--upstream', 'main', '--skip-build', '--skip-checks'], env = {}) {
  const run = spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd,
    env: scratchEnv(env),
    encoding: 'utf8',
    timeout: 60_000,
  });
  assert.equal(run.error, undefined);
  return run;
}

function changelog(...entries) {
  return ['# Changelog', '', '## Unreleased', '', ...entries.flatMap(e => [e, '']), '### Older', ''].join('\n');
}

/** A repo on `feat`, one commit ahead of a `main` that moved too. `edits` shape both sides. */
function scratchRepo({ feat = [], main = [] } = {}) {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-main-'));
  scratch.push(cwd);
  git(cwd, 'init', '-q', '-b', 'main');
  git(cwd, 'config', 'user.name', 'Spec');
  git(cwd, 'config', 'user.email', 'spec@example.com');
  write(cwd, '.gitattributes', 'gen.txt merge=ours\ngen2.txt merge=ours\n');
  write(cwd, 'CHANGELOG.md', changelog());
  write(cwd, 'gen.txt', 'v0\n');
  write(cwd, 'gen2.txt', 'v0\n');
  write(cwd, 'code.txt', 'a\n');
  git(cwd, 'add', '.');
  git(cwd, 'commit', '-q', '-m', 'base');
  git(cwd, 'checkout', '-q', '-b', 'feat');
  for (const step of feat) {
    step(cwd);
    git(cwd, 'add', '-A');
    git(cwd, 'commit', '-q', '-m', 'feat step');
  }
  git(cwd, 'checkout', '-q', 'main');
  for (const step of main) {
    step(cwd);
    git(cwd, 'add', '-A');
    git(cwd, 'commit', '-q', '-m', 'main step');
  }
  git(cwd, 'checkout', '-q', 'feat');
  return cwd;
}

const featEntry = cwd => write(cwd, 'CHANGELOG.md', changelog('### Feat A'));
const mainEntry = cwd => write(cwd, 'CHANGELOG.md', changelog('### Main B'));
const genTo = (file, text) => cwd => write(cwd, file, text);

const inRebase = cwd => fs.existsSync(path.join(cwd, git(cwd, 'rev-parse', '--git-path', 'rebase-merge')));

describe('sync-main — resolveUnionConflicts', () => {
  const hunk = (current, base, incoming) => [
    '<<<<<<< HEAD',
    ...current,
    '||||||| base',
    ...base,
    '=======',
    ...incoming,
    '>>>>>>> abc (feat)',
  ];

  it('unions two pure insertions, the incoming (branch) side first', () => {
    const text = ['top', ...hunk(['main'], [], ['branch']), 'end'].join('\n');
    assert.equal(resolveUnionConflicts(text), ['top', 'branch', '', 'main', 'end'].join('\n'));
  });

  it('does not double a blank line one side already carries', () => {
    assert.equal(resolveUnionConflicts(hunk(['main'], [], ['branch', '']).join('\n')), 'branch\n\nmain');
  });

  it('refuses a hunk where an existing line was edited on either side', () => {
    assert.throws(
      () =>
        resolveUnionConflicts(hunk(['The button has 5 sizes.'], ['The button has 3 sizes.'], ['4 sizes']).join('\n')),
      /same existing CHANGELOG lines/,
    );
  });

  it('keeps CRLF line endings and still recognises the markers', () => {
    const text = ['a', ...hunk(['main'], [], ['branch']), 'b', ''].join('\r\n');
    assert.equal(resolveUnionConflicts(text), ['a', 'branch', '', 'main', 'b', ''].join('\r\n'));
  });

  it('refuses markers that do not form a diff3 hunk', () => {
    assert.throws(() => resolveUnionConflicts('a\n=======\nb\n'), /outside a hunk/);
    assert.throws(() => resolveUnionConflicts('<<<<<<< HEAD\na\n=======\nb\n'), /unterminated/);
    assert.throws(() => resolveUnionConflicts('<<<<<<< HEAD\na\n=======\nb\n>>>>>>> x\n'), /no base section/);
  });
});

describe('sync-main — helpers', () => {
  it('separates the CHANGELOG, generated paths and real conflicts', () => {
    const isGenerated = p => p === 'src/components/mud-x/readme.md';
    assert.deepEqual(classifyConflicts(['CHANGELOG.md', 'src/components/mud-x/readme.md', 'src/a.tsx'], isGenerated), {
      changelog: ['CHANGELOG.md'],
      generated: ['src/components/mud-x/readme.md'],
      real: ['src/a.tsx'],
    });
  });

  it('rejects an unknown option and an option missing its value', () => {
    assert.throws(() => parseArgs(['--forse']), /Unknown option/i);
    assert.throws(() => parseArgs(['--base']), /argument missing|needs a value/i);
    assert.throws(() => parseArgs(['--base', '--skip-checks']), /ambiguous|needs a value/);
    assert.throws(() => parseArgs(['--base=--skip-checks']), /needs a value/);
  });

  it('strips terminal control sequences from printed commit subjects', () => {
    assert.equal(printable('fix: title\u001b]0;pwned\u0007'), 'fix: title]0;pwned');
  });
});

describe('sync-main — rebase', () => {
  it('resolves CHANGELOG and generated-file conflicts and finishes the rebase', () => {
    const cwd = scratchRepo({
      feat: [featEntry, genTo('gen.txt', 'feat\n')],
      main: [mainEntry, genTo('gen.txt', 'main\n')],
    });
    const run = sync(cwd);
    assert.equal(run.status, 0, run.stderr);
    assert.equal(git(cwd, 'merge-base', 'HEAD', 'main'), git(cwd, 'rev-parse', 'main'));
    assert.equal(read(cwd, 'gen.txt'), 'main\n');
    const log = read(cwd, 'CHANGELOG.md');
    assert.doesNotMatch(log, /^(<<<<<<<|=======|>>>>>>>|\|\|\|\|\|\|\|)/m);
    assert.ok(log.indexOf('### Feat A') < log.indexOf('### Main B'), log);
  });

  it('resolves a conflict in every commit of a multi-commit branch', () => {
    const cwd = scratchRepo({
      feat: [genTo('gen.txt', 'f1\n'), genTo('gen.txt', 'f2\n'), genTo('gen.txt', 'f3\n'), genTo('gen.txt', 'f4\n')],
      main: [genTo('gen.txt', 'main\n')],
    });
    const run = sync(cwd);
    assert.equal(run.status, 0, run.stderr);
    assert.equal(inRebase(cwd), false);
  });

  it('keeps a generated file deleted when the branch deleted it and main changed it', () => {
    const cwd = scratchRepo({
      feat: [cwd2 => fs.rmSync(path.join(cwd2, 'gen.txt'))],
      main: [genTo('gen.txt', 'main\n')],
    });
    const run = sync(cwd);
    assert.equal(run.status, 0, run.stderr);
    assert.equal(git(cwd, 'ls-files', 'gen.txt'), '');
  });

  it('keeps a generated file deleted when main deleted it and the branch changed it', () => {
    const cwd = scratchRepo({
      feat: [genTo('gen.txt', 'feat\n')],
      main: [cwd2 => fs.rmSync(path.join(cwd2, 'gen.txt'))],
    });
    const run = sync(cwd);
    assert.equal(run.status, 0, run.stderr);
    assert.equal(git(cwd, 'ls-files', 'gen.txt'), '');
  });

  // src/components.d.ts's history: main deletes it, ignores it, and marks it linguist-generated.
  const untrackOnMain = (file, attrs) => cwd2 => {
    fs.rmSync(path.join(cwd2, file));
    write(cwd2, '.gitignore', `${file}\n`);
    if (attrs) fs.appendFileSync(path.join(cwd2, '.gitattributes'), `${file} linguist-generated=true\n`);
  };

  it('drops a generated file main stopped tracking, in every branch commit that touched it', () => {
    const cwd = scratchRepo({
      feat: [genTo('code.txt', 'types v1\n'), genTo('code.txt', 'types v2\n')],
      main: [untrackOnMain('code.txt', true)],
    });
    const run = sync(cwd);
    assert.equal(run.status, 0, run.stderr);
    assert.equal(git(cwd, 'ls-files', 'code.txt'), '');
  });

  it('keeps it a real conflict when the file main dropped is only ignored, not generated', () => {
    const cwd = scratchRepo({
      feat: [genTo('code.txt', 'my local config\n')],
      main: [untrackOnMain('code.txt', false)],
    });
    const run = sync(cwd);
    assert.equal(run.status, 1);
    assert.match(run.stderr, /real conflicts[^\n]*\n {2}code\.txt\n/);
  });

  it('treats a CHANGELOG line both sides edited as a real conflict', () => {
    const edit = text => cwd => write(cwd, 'CHANGELOG.md', changelog().replace('### Older', `### Older\n\n${text}`));
    const cwd = scratchRepo({ main: [edit('Base line.')] });
    git(cwd, 'rebase', '-q', 'main');
    edit('Branch line.')(cwd);
    git(cwd, 'commit', '-qam', 'feat edit');
    git(cwd, 'checkout', '-q', 'main');
    edit('Main line.')(cwd);
    git(cwd, 'commit', '-qam', 'main edit');
    git(cwd, 'checkout', '-q', 'feat');
    const run = sync(cwd);
    assert.equal(run.status, 1);
    assert.match(run.stderr, /CHANGELOG\.md \(both sides changed the same existing CHANGELOG lines\)/);
  });

  it('resolves the mechanical files of a round with a real conflict, then resumes with --continue', () => {
    const cwd = scratchRepo({
      feat: [
        cwd2 => (featEntry(cwd2), genTo('gen.txt', 'feat\n')(cwd2), write(cwd2, 'code.txt', 'feat\n')),
        genTo('gen2.txt', 'feat\n'),
      ],
      main: [
        cwd2 => (
          mainEntry(cwd2),
          genTo('gen.txt', 'main\n')(cwd2),
          write(cwd2, 'code.txt', 'main\n'),
          genTo('gen2.txt', 'main\n')(cwd2)
        ),
      ],
    });
    const stopped = sync(cwd);
    assert.equal(stopped.status, 1);
    assert.match(stopped.stderr, /real conflicts[^\n]*\n {2}code\.txt\n/);
    assert.match(stopped.stderr, /yarn sync:main --continue/);
    assert.equal(git(cwd, 'diff', '--name-only', '--diff-filter=U'), 'code.txt');

    assert.match(sync(cwd).stderr, /a rebase is already in progress/);
    write(cwd, 'code.txt', 'resolved\n');
    git(cwd, 'add', 'code.txt');
    const resumed = sync(cwd, ['--continue', '--skip-build', '--skip-checks']);
    assert.equal(resumed.status, 0, resumed.stderr);
    assert.equal(inRebase(cwd), false);
    assert.equal(read(cwd, 'gen2.txt'), 'main\n');
  });

  it('refuses to start dirty, on the base branch, or detached', () => {
    const cwd = scratchRepo({ feat: [featEntry] });
    write(cwd, 'code.txt', 'dirty\n');
    assert.match(sync(cwd).stderr, /uncommitted changes/);
    git(cwd, 'checkout', '-q', '--', 'code.txt');
    assert.match(sync(cwd, ['--continue']).stderr, /no rebase is in progress/);
    git(cwd, 'checkout', '-q', '--detach');
    assert.match(sync(cwd).stderr, /HEAD is detached/);
    git(cwd, 'checkout', '-q', 'main');
    assert.match(sync(cwd).stderr, /you are on main/);
  });

  it('refuses a branch with merge commits instead of flattening them', () => {
    const cwd = scratchRepo({ feat: [featEntry], main: [genTo('gen2.txt', 'main\n')] });
    git(cwd, 'merge', '-q', '--no-edit', 'main');
    git(cwd, 'checkout', '-q', 'main');
    genTo('gen2.txt', 'later\n')(cwd);
    git(cwd, 'commit', '-qam', 'later');
    git(cwd, 'checkout', '-q', 'feat');
    assert.match(sync(cwd).stderr, /contains merge commits/);
  });
});

describe('sync-main — regenerate commit', { skip: process.platform === 'win32' }, () => {
  // A stand-in `yarn` on PATH: `build` rewrites gen.txt (and code.txt when STRAY is set).
  function withFakeYarn(cwd) {
    const bin = path.join(cwd, '.fake-bin');
    fs.mkdirSync(bin);
    const yarn = path.join(bin, 'yarn');
    fs.writeFileSync(
      yarn,
      '#!/bin/sh\nif [ "$1" = build ]; then echo built > gen.txt; [ -n "$STRAY" ] && echo stray > code.txt; fi\nexit 0\n',
    );
    fs.chmodSync(yarn, 0o755);
    fs.appendFileSync(path.join(cwd, '.git', 'info', 'exclude'), '.fake-bin/\n');
    return { PATH: `${bin}${path.delimiter}${process.env.PATH}` };
  }

  it('commits only the generated files the build changed, ignoring untracked files that were already there', () => {
    const cwd = scratchRepo({ feat: [featEntry], main: [mainEntry] });
    const env = withFakeYarn(cwd);
    write(cwd, 'NOTES.txt', 'mine\n');
    const run = sync(cwd, ['--upstream', 'main'], env);
    assert.equal(run.status, 0, run.stderr);
    assert.equal(git(cwd, 'log', '-1', '--format=%s'), 'chore: regenerate generated files after syncing with main');
    assert.equal(git(cwd, 'show', '--name-only', '--format=', 'HEAD'), 'gen.txt');
    assert.equal(tryGit(cwd, 'ls-files', '--error-unmatch', 'NOTES.txt'), 1);
  });

  it('stops when the build changed a file that is not generated', () => {
    const cwd = scratchRepo({ feat: [featEntry], main: [mainEntry] });
    const run = sync(cwd, ['--upstream', 'main'], { ...withFakeYarn(cwd), STRAY: '1' });
    assert.equal(run.status, 1);
    assert.match(run.stderr, /not generated[^\n]*\n {2}code\.txt/);
  });
});
