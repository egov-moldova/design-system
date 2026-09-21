#!/usr/bin/env node
/**
 * sync-main.mjs — bring a feature branch up to date with main right before it merges.
 *
 * GitHub never runs the `merge=ours` driver `.gitattributes` declares for generated files
 * (it is registered in local git config only), so every PR that lands on main leaves the
 * others conflicting on `src/components.d.ts`, component readmes and the top of the
 * CHANGELOG. This script does the mechanical part of fixing that:
 *
 *   1. fetch the base branch and rebase onto it;
 *   2. resolve conflicts that are not real: a generated file (any path `.gitattributes`
 *      marks `merge=ours`) takes main's copy and is rebuilt in step 3, and CHANGELOG.md
 *      keeps both sides of each conflicting hunk, the branch's entry first;
 *   3. run `yarn build` and commit the generated files it changed, nothing else;
 *   4. run `yarn lint` and `yarn test`.
 *
 * Any other conflict stops the run with the rebase left in progress, so you resolve it by
 * hand. It never pushes: the last line tells you the push to run.
 *
 * Usage:
 *   yarn sync:main                       # upstream/main if an `upstream` remote exists, else origin/main
 *   yarn sync:main --remote origin --base main
 *   yarn sync:main --skip-checks         # stop after the regenerate commit
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CHANGELOG = 'CHANGELOG.md';
const REGEN_MESSAGE = 'chore: regenerate generated files after syncing with main';

/**
 * Resolve every conflict hunk in `text` by keeping both sides, the incoming side (the
 * branch's commit during a rebase) first, then the current side (main). A diff3 base
 * section is dropped. Throws on markers that do not form complete hunks, so a mangled file
 * is reported as a real conflict instead of being written back half-resolved.
 */
export function resolveUnionConflicts(text) {
  const lines = text.split('\n');
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
    const incoming = [];
    let section = current;
    let closed = false;
    for (i += 1; i < lines.length; i += 1) {
      const line = lines[i];
      if (line.startsWith('||||||| ') || line === '|||||||') section = null;
      else if (line === '=======') section = incoming;
      else if (line.startsWith('>>>>>>> ') || line === '>>>>>>>') {
        closed = true;
        i += 1;
        break;
      } else if (line.startsWith('<<<<<<< ')) throw new Error(`nested conflict hunk at line ${i + 1}`);
      else if (section) section.push(line);
    }
    if (!closed) throw new Error('unterminated conflict hunk');
    out.push(...joinBlocks(incoming, current));
  }
  return out.join('\n');
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
  const opts = { remote: null, base: 'main', fetch: true, build: true, checks: true, upstream: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--remote') opts.remote = argv[++i];
    else if (arg === '--base') opts.base = argv[++i];
    else if (arg === '--upstream') opts.upstream = argv[++i];
    else if (arg === '--no-fetch') opts.fetch = false;
    else if (arg === '--skip-build') opts.build = false;
    else if (arg === '--skip-checks') opts.checks = false;
    else if (arg === '--help' || arg === '-h') opts.help = true;
    else throw new Error(`unknown option: ${arg}`);
  }
  return opts;
}

class Stop extends Error {}

function git(args, { allowFail = false, cwd } = {}) {
  const run = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (run.error) throw run.error;
  if (run.status !== 0 && !allowFail) {
    throw new Stop(`git ${args.join(' ')} failed:\n${(run.stderr || run.stdout).trim()}`);
  }
  return run;
}

function out(args, opts) {
  return git(args, opts).stdout.trim();
}

function yarn(script, cwd) {
  const run = spawnSync('yarn', [script], { cwd, stdio: 'inherit', shell: process.platform === 'win32' });
  if (run.error) throw run.error;
  if (run.status !== 0) throw new Stop(`yarn ${script} failed (exit ${run.status}). Fix it, commit, and rerun.`);
}

/** Paths `.gitattributes` marks `merge=ours` — the repo's own definition of "generated". */
function generatedLookup(cwd) {
  return p => out(['check-attr', 'merge', '--', p], { cwd }).endsWith(': merge: ours');
}

function listPaths(args, cwd) {
  return out(args, { cwd }).split('\0').filter(Boolean);
}

function preflight(cwd, base) {
  const branch = out(['rev-parse', '--abbrev-ref', 'HEAD'], { cwd });
  if (branch === 'HEAD') throw new Stop('HEAD is detached; check out your feature branch first.');
  if (branch === base) throw new Stop(`you are on ${base}; run this on a feature branch.`);
  const inRebase = ['rebase-merge', 'rebase-apply'].some(d =>
    existsSync(path.resolve(cwd, out(['rev-parse', '--git-path', d], { cwd }))),
  );
  if (inRebase) throw new Stop('a rebase is already in progress; finish it or run `git rebase --abort` first.');
  const dirty = listPaths(['status', '--porcelain', '-z', '--untracked-files=no'], cwd);
  if (dirty.length) throw new Stop('the working tree has uncommitted changes; commit or set them aside first.');
  return branch;
}

function resolveRound(cwd, isGenerated) {
  const conflicted = listPaths(['diff', '--name-only', '--diff-filter=U', '-z'], cwd);
  if (conflicted.length === 0) return false;
  const { generated, changelog, real } = classifyConflicts(conflicted, isGenerated);
  if (real.length) {
    const at = out(['log', '-1', '--format=%h %s', 'REBASE_HEAD'], { cwd, allowFail: true });
    throw new Stop(
      [
        `real conflicts while replaying ${at || 'a commit'}:`,
        ...real.map(p => `  ${p}`),
        'The rebase is left in progress. Resolve those files, `git add` them, run',
        '`git rebase --continue`, then run `yarn sync:main` again — or `git rebase --abort`.',
      ].join('\n'),
    );
  }
  for (const p of generated) {
    // During a rebase "ours" is the base branch being rebased onto; the build rewrites it anyway.
    const taken = git(['checkout', '--ours', '--', p], { cwd, allowFail: true });
    if (taken.status !== 0) {
      throw new Stop(`could not take main's copy of generated file ${p}; resolve it by hand.`);
    }
    git(['add', '--', p], { cwd });
  }
  for (const p of changelog) {
    let merged;
    try {
      merged = resolveUnionConflicts(readFileSync(path.join(cwd, p), 'utf8'));
    } catch (err) {
      throw new Stop(`${p} could not be merged automatically (${err.message}); resolve it by hand.`);
    }
    writeFileSync(path.join(cwd, p), merged);
    git(['add', '--', p], { cwd });
  }
  console.log(`sync:main: resolved ${generated.length + changelog.length} mechanical conflict(s)`);
  return true;
}

function rebase(cwd, target, isGenerated) {
  let run = git(['rebase', target], { cwd, allowFail: true });
  // Each round replays at most one commit, so the branch's commit count bounds the loop.
  let rounds = Number(out(['rev-list', '--count', `${target}..HEAD`], { cwd })) + 2;
  while (run.status !== 0) {
    if (rounds-- <= 0) throw new Stop('the rebase did not converge; inspect it with `git status`.');
    if (!resolveRound(cwd, isGenerated)) {
      throw new Stop(`git rebase stopped without conflicts:\n${(run.stderr || run.stdout).trim()}`);
    }
    run = git(['-c', 'core.editor=true', 'rebase', '--continue'], { cwd, allowFail: true });
  }
}

function commitRegenerated(cwd, isGenerated) {
  const changed = [
    ...listPaths(['diff', '--name-only', '-z', 'HEAD'], cwd),
    ...listPaths(['ls-files', '--others', '--exclude-standard', '-z'], cwd),
  ];
  if (changed.length === 0) {
    console.log('sync:main: generated files already match the build');
    return;
  }
  const other = changed.filter(p => !isGenerated(p));
  if (other.length) {
    throw new Stop(
      ['the build changed files that are not generated (left uncommitted):', ...other.map(p => `  ${p}`)].join('\n'),
    );
  }
  git(['add', '--', ...changed], { cwd });
  git(['commit', '-q', '-m', REGEN_MESSAGE], { cwd });
  console.log(`sync:main: committed ${changed.length} regenerated file(s)`);
}

export function main(argv = process.argv.slice(2), cwd = process.cwd()) {
  const opts = parseArgs(argv);
  if (opts.help) {
    console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0]);
    return 0;
  }
  try {
    const root = out(['rev-parse', '--show-toplevel'], { cwd });
    const branch = preflight(root, opts.base);
    let target = opts.upstream;
    if (!target) {
      const remote =
        opts.remote ??
        (git(['remote', 'get-url', 'upstream'], { cwd: root, allowFail: true }).status === 0 ? 'upstream' : 'origin');
      if (opts.fetch) git(['fetch', '-q', remote, opts.base], { cwd: root });
      target = `${remote}/${opts.base}`;
    }
    const isGenerated = generatedLookup(root);
    console.log(`sync:main: rebasing ${branch} onto ${target}`);
    rebase(root, target, isGenerated);
    if (opts.build) {
      yarn('build', root);
      commitRegenerated(root, isGenerated);
    }
    if (opts.checks) {
      yarn('lint', root);
      yarn('test', root);
    }
    console.log(`sync:main: ${branch} is on ${target}. Push with: git push --force-with-lease`);
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
