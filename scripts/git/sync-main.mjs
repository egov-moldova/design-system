#!/usr/bin/env node
/**
 * sync-main.mjs — bring a feature branch up to date with main right before it merges.
 *
 * GitHub never runs the `merge=ours` driver `.gitattributes` declares for generated files
 * (it is registered in local git config only), so every PR that lands on main leaves the
 * others conflicting on component readmes and the top of the CHANGELOG
 * (`src/components.d.ts` is git-ignored, so it no longer takes part). This script does the
 * mechanical part of fixing that:
 *
 *   1. fetch the base branch and rebase onto it;
 *   2. resolve the conflicts that are not real:
 *      - a generated file (any path `.gitattributes` marks `merge=ours`) takes main's copy,
 *        or stays deleted when either side deleted it; the build in step 3 rewrites it;
 *      - CHANGELOG.md keeps both sides of a hunk where both sides only ADDED lines, the
 *        branch's entry first. A hunk where either side edited an existing line is real;
 *   3. run `yarn build` and commit the generated files it changed, nothing else;
 *   4. run `yarn lint`, `yarn typecheck` and `yarn test`.
 *
 * Any other conflict stops the run with the rebase left in progress: resolve those files,
 * `git add` them, and run `yarn sync:main --continue`. It never pushes; the last line tells
 * you the push to run.
 *
 * Usage:
 *   yarn sync:main                 upstream/main if an `upstream` remote exists, else origin/main
 *   yarn sync:main --continue      resume after resolving a real conflict by hand
 *   Options: --remote <name>  --base <branch>  --upstream <ref> (skip fetch, rebase onto <ref>)
 *            --no-fetch  --skip-build  --skip-checks  --help
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs as parseNodeArgs } from 'node:util';

const CHANGELOG = 'CHANGELOG.md';
const REGEN_MESSAGE = 'chore: regenerate generated files after syncing with main';

class Stop extends Error {}

/** One conflict hunk whose base is non-empty edited an existing line: not a mechanical union. */
export class RealHunkError extends Error {}

/**
 * Resolve every conflict hunk in `text` (written with `merge.conflictStyle=diff3`) by keeping
 * both sides, the incoming side (the branch's commit during a rebase) first, then the current
 * side (main). Only a hunk whose base section is empty — both sides purely inserted lines — is
 * unioned; a hunk with base lines means an existing line was edited on one side, and throws
 * RealHunkError. Malformed markers throw too, so a mangled file is never written back.
 */
export function resolveUnionConflicts(text) {
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const lines = text.split(/\r?\n/);
  const out = [];
  let i = 0;
  while (i < lines.length) {
    if (!lines[i].startsWith('<<<<<<< ')) {
      if (/^(\|\|\|\|\|\|\||=======|>>>>>>>)( |$)/.test(lines[i])) {
        throw new Error(`conflict marker outside a hunk at line ${i + 1}`);
      }
      out.push(lines[i]);
      i += 1;
      continue;
    }
    const current = [];
    const base = [];
    const incoming = [];
    let section = current;
    let sawBase = false;
    let closed = false;
    for (i += 1; i < lines.length; i += 1) {
      const line = lines[i];
      if (section !== incoming && (line.startsWith('||||||| ') || line === '|||||||')) {
        section = base;
        sawBase = true;
      } else if (section !== incoming && line === '=======') section = incoming;
      else if (line.startsWith('>>>>>>> ') || line === '>>>>>>>') {
        closed = true;
        i += 1;
        break;
      } else if (line.startsWith('<<<<<<< ')) throw new Error(`nested conflict hunk at line ${i + 1}`);
      else section.push(line);
    }
    if (!closed) throw new Error('unterminated conflict hunk');
    if (!sawBase) throw new Error('conflict hunk has no base section (expected merge.conflictStyle=diff3)');
    if (base.some(l => l.trim() !== '')) {
      throw new RealHunkError('both sides changed the same existing CHANGELOG lines');
    }
    out.push(...joinBlocks(incoming, current));
  }
  return out.join(eol);
}

/** Two blocks of lines, separated by one blank line unless either side already provides it. */
function joinBlocks(first, second) {
  if (first.length === 0) return second;
  if (second.length === 0) return first;
  const gap = first.at(-1) === '' || second[0] === '' ? [] : [''];
  return [...first, ...gap, ...second];
}

/**
 * Sort conflicted paths into what the script resolves and what it must hand back.
 * `isGenerated(path)` answers from `.gitattributes`, so the generated set has one home.
 */
export function classifyConflicts(paths, isGenerated) {
  const result = { generated: [], changelog: [], real: [] };
  for (const p of paths) {
    if (p === CHANGELOG) result.changelog.push(p);
    else if (isGenerated(p)) result.generated.push(p);
    else result.real.push(p);
  }
  return result;
}

export function parseArgs(argv) {
  const { values } = parseNodeArgs({
    args: argv,
    strict: true,
    allowPositionals: false,
    options: {
      'remote': { type: 'string' },
      'base': { type: 'string', default: 'main' },
      'upstream': { type: 'string' },
      'no-fetch': { type: 'boolean', default: false },
      'skip-build': { type: 'boolean', default: false },
      'skip-checks': { type: 'boolean', default: false },
      'continue': { type: 'boolean', default: false },
      'help': { type: 'boolean', short: 'h', default: false },
    },
  });
  for (const key of ['remote', 'base', 'upstream']) {
    if (values[key] !== undefined && (values[key] === '' || values[key].startsWith('-'))) {
      throw new Error(`--${key} needs a value`);
    }
  }
  return {
    remote: values.remote ?? null,
    base: values.base,
    upstream: values.upstream ?? null,
    fetch: !values['no-fetch'],
    build: !values['skip-build'],
    checks: !values['skip-checks'],
    resume: values.continue,
    help: values.help,
  };
}

/** Commit subjects are free text; keep terminal control sequences out of what we print. */
export function printable(text) {
  return text.replace(/[\u0000-\u001f\u007f-\u009f]/g, '');
}

function git(args, { allowFail = false, cwd, env } = {}) {
  const run = spawnSync('git', args, { cwd, encoding: 'utf8', env: env ?? process.env });
  if (run.error) throw run.error;
  if (run.status !== 0 && !allowFail) {
    throw new Stop(`git ${args.join(' ')} failed:\n${(run.stderr || run.stdout).trim()}`);
  }
  return run;
}

function out(args, opts) {
  return git(args, opts).stdout.trim();
}

function listPaths(args, cwd) {
  return git(args, { cwd }).stdout.split('\0').filter(Boolean);
}

function yarn(args, cwd) {
  const run = spawnSync('yarn', args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' });
  if (run.error) throw run.error;
  if (run.status !== 0)
    throw new Stop(`yarn ${args.join(' ')} failed (exit ${run.status}). Fix it, commit, and rerun.`);
}

/** Paths `.gitattributes` marks `merge=ours` — the repo's own definition of "generated". One git call. */
function generatedSet(paths, cwd) {
  if (paths.length === 0) return new Set();
  const run = spawnSync('git', ['check-attr', '--stdin', '-z', 'merge'], {
    cwd,
    input: paths.join('\0') + '\0',
    encoding: 'utf8',
  });
  if (run.error) throw run.error;
  if (run.status !== 0) throw new Stop(`git check-attr failed:\n${run.stderr.trim()}`);
  const fields = run.stdout.split('\0');
  const result = new Set();
  for (let k = 0; k + 2 < fields.length; k += 3) {
    if (fields[k + 2] === 'ours') result.add(fields[k]);
  }
  return result;
}

function rebaseInProgress(cwd) {
  return ['rebase-merge', 'rebase-apply'].some(d =>
    existsSync(path.resolve(cwd, out(['rev-parse', '--git-path', d], { cwd }))),
  );
}

function untrackedFiles(cwd) {
  return new Set(listPaths(['ls-files', '--others', '--exclude-standard', '-z'], cwd));
}

function preflight(cwd, opts) {
  // A rebase detaches HEAD, so this check comes before the detached-HEAD one.
  if (rebaseInProgress(cwd)) {
    if (opts.resume) return null;
    throw new Stop(
      'a rebase is already in progress. If you resolved its conflicts, run `yarn sync:main --continue`; otherwise `git rebase --abort`.',
    );
  }
  if (opts.resume) throw new Stop('--continue given, but no rebase is in progress.');
  const branch = out(['rev-parse', '--abbrev-ref', 'HEAD'], { cwd });
  if (branch === 'HEAD') throw new Stop('HEAD is detached; check out your feature branch first.');
  if (branch === opts.base) throw new Stop(`you are on ${opts.base}; run this on a feature branch.`);
  const dirty = listPaths(['status', '--porcelain', '-z', '--untracked-files=no'], cwd);
  if (dirty.length) throw new Stop('the working tree has uncommitted changes; commit or set them aside first.');
  return branch;
}

/** Which sides still have a path during a conflict: stage 2 = main (ours), stage 3 = the branch. */
function stagesOf(cwd, p) {
  const stages = new Set();
  for (const entry of listPaths(['ls-files', '-u', '-z', '--', p], cwd)) {
    stages.add(entry.split('\t')[0].split(' ')[2]);
  }
  return stages;
}

function resolveGenerated(cwd, p) {
  const stages = stagesOf(cwd, p);
  if (stages.has('2') && stages.has('3')) {
    git(['checkout', '--ours', '--', p], { cwd });
    git(['add', '--', p], { cwd });
  } else {
    // One side deleted it (a component was removed): the deletion is the intent on that side,
    // and the build does not recreate a readme for a component that no longer exists.
    git(['rm', '-q', '--', p], { cwd });
  }
}

function resolveRound(cwd) {
  const conflicted = listPaths(['diff', '--name-only', '--diff-filter=U', '-z'], cwd);
  if (conflicted.length === 0) return false;
  const generated = generatedSet(conflicted, cwd);
  const groups = classifyConflicts(conflicted, p => generated.has(p));
  const real = [...groups.real];
  let resolved = 0;
  for (const p of groups.generated) {
    resolveGenerated(cwd, p);
    resolved += 1;
  }
  for (const p of groups.changelog) {
    const file = path.join(cwd, p);
    let merged;
    try {
      merged = resolveUnionConflicts(readFileSync(file, 'utf8'));
    } catch (err) {
      real.push(`${p} (${err.message})`);
      continue;
    }
    writeFileSync(file, merged);
    git(['add', '--', p], { cwd });
    resolved += 1;
  }
  if (resolved) console.log(`sync:main: resolved ${resolved} mechanical conflict(s)`);
  if (real.length) {
    const at = printable(out(['log', '-1', '--format=%h %s', 'REBASE_HEAD'], { cwd, allowFail: true }));
    throw new Stop(
      [
        `real conflicts while replaying ${at || 'a commit'}:`,
        ...real.map(p => `  ${p}`),
        'The rebase is left in progress with every other conflict already resolved. Fix those files,',
        '`git add` them, then run `yarn sync:main --continue` — or `git rebase --abort` to go back.',
      ].join('\n'),
    );
  }
  return true;
}

function runRebase(cwd, args, rounds) {
  // diff3 gives CHANGELOG hunks a base section, which is how an edit is told from an insertion.
  // GIT_EDITOR wins over core.editor, so it is what stops `--continue` opening an editor.
  const env = { ...process.env, GIT_EDITOR: 'true' };
  let run = git(['-c', 'merge.conflictStyle=diff3', 'rebase', ...args], { cwd, allowFail: true, env });
  while (run.status !== 0) {
    if (rounds-- <= 0) throw new Stop('the rebase did not converge; inspect it with `git status`.');
    if (!resolveRound(cwd)) {
      throw new Stop(`git rebase stopped without conflicts:\n${(run.stderr || run.stdout).trim()}`);
    }
    run = git(['-c', 'merge.conflictStyle=diff3', 'rebase', '--continue'], { cwd, allowFail: true, env });
  }
}

function commitRegenerated(cwd, untrackedBefore, skipHook) {
  const changed = [
    ...listPaths(['diff', '--name-only', '-z', 'HEAD'], cwd),
    ...[...untrackedFiles(cwd)].filter(p => !untrackedBefore.has(p)),
  ];
  if (changed.length === 0) {
    console.log('sync:main: generated files already match the build');
    return;
  }
  const generated = generatedSet(changed, cwd);
  const other = changed.filter(p => !generated.has(p));
  if (other.length) {
    throw new Stop(
      ['the build changed files that are not generated (left uncommitted):', ...other.map(p => `  ${p}`)].join('\n'),
    );
  }
  git(['add', '--', ...changed], { cwd });
  // The pre-commit hook runs lint + typecheck; with checks on, the script runs both next.
  git(['commit', '-q', ...(skipHook ? ['--no-verify'] : []), '-m', REGEN_MESSAGE], { cwd });
  console.log(`sync:main: committed ${changed.length} regenerated file(s)`);
}

function helpText() {
  return readFileSync(fileURLToPath(import.meta.url), 'utf8')
    .split('*/')[0]
    .replace(/^#!.*\n\/\*\*\n/, '')
    .replace(/^ \* ?/gm, '');
}

export function main(argv = process.argv.slice(2), cwd = process.cwd()) {
  let opts;
  try {
    opts = parseArgs(argv);
  } catch (err) {
    console.error(`sync:main: ${err.message}. See --help.`);
    return 1;
  }
  if (opts.help) {
    console.log(helpText());
    return 0;
  }
  try {
    const root = out(['rev-parse', '--show-toplevel'], { cwd });
    let branch = preflight(root, opts);
    const untrackedBefore = untrackedFiles(root);
    let target = opts.upstream;
    let lockBefore = null;
    if (opts.resume) {
      const gitPath = name => path.resolve(root, out(['rev-parse', '--git-path', name], { cwd: root }));
      const headName = gitPath('rebase-merge/head-name');
      branch = existsSync(headName)
        ? readFileSync(headName, 'utf8')
            .trim()
            .replace(/^refs\/heads\//, '')
        : 'the branch';
      const todo = gitPath('rebase-merge/git-rebase-todo');
      const remaining = existsSync(todo)
        ? readFileSync(todo, 'utf8')
            .split('\n')
            .filter(l => l.trim() && !l.startsWith('#')).length
        : 0;
      console.log(`sync:main: continuing the rebase of ${branch}`);
      runRebase(root, ['--continue'], remaining + 1);
    } else {
      if (!target) {
        const hasUpstream = git(['remote', 'get-url', 'upstream'], { cwd: root, allowFail: true }).status === 0;
        const remote = opts.remote ?? (hasUpstream ? 'upstream' : 'origin');
        if (!opts.remote && !hasUpstream) {
          console.warn(
            'sync:main: no `upstream` remote, using origin. In a fork, origin/main is your fork: `git remote add upstream <canonical-repo-url>` first.',
          );
        }
        if (opts.fetch) git(['fetch', '-q', remote, opts.base], { cwd: root });
        target = `${remote}/${opts.base}`;
      }
      if (out(['rev-list', '--merges', '--count', `${target}..HEAD`], { cwd: root }) !== '0') {
        throw new Stop(
          `${branch} contains merge commits; a rebase would flatten them and replay their conflicts. Sync it by hand.`,
        );
      }
      lockBefore = out(['rev-parse', 'HEAD:yarn.lock'], { cwd: root, allowFail: true });
      // Each round replays at most one commit, so the branch's own commit count bounds the loop.
      const rounds = Number(out(['rev-list', '--count', `${target}..HEAD`], { cwd: root })) + 1;
      console.log(`sync:main: rebasing ${branch} onto ${target}`);
      runRebase(root, [target], rounds);
    }
    if (opts.build) {
      const lockAfter = out(['rev-parse', 'HEAD:yarn.lock'], { cwd: root, allowFail: true });
      if (opts.resume || lockBefore !== lockAfter) yarn(['install', '--immutable'], root);
      yarn(['build'], root);
      commitRegenerated(root, untrackedBefore, opts.checks);
    }
    if (opts.checks) {
      yarn(['lint'], root);
      yarn(['typecheck'], root);
      yarn(['test'], root);
    }
    if (!opts.build) {
      console.warn("sync:main: --skip-build left main's copies of generated files; run `yarn build` before pushing.");
    }
    console.log(`sync:main: ${branch} is rebased. Push with: git push --force-with-lease`);
    return 0;
  } catch (err) {
    if (!(err instanceof Stop)) throw err;
    console.error(`sync:main: ${err.message}`);
    return 1;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exitCode = main();
}
