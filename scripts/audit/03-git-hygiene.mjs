#!/usr/bin/env node
/**
 * 03-git-hygiene.mjs
 *
 * Verifies pre-PR git hygiene:
 *   - Branch name follows convention: feat/cor-X, fix/cor-X-desc, refactor/cor-X, redesign/cor-X, chore/..., docs/..., test/...
 *   - Recent commits (default last 10) follow Conventional Commits
 *   - No build artifacts or generated files staged (dist/, node_modules/, .stencil/, .wireit/, tokens/generated/, etc.)
 *   - No noisy untracked files like ".env" or "*.log"
 *
 * Replaces AI work in:
 *   - `.claude/commands/pre-pr-check.md` Wave 1 git checks
 *   - `.claude/agents/audit-production.md` Phase 9
 *
 * Usage:
 *   node scripts/audit/03-git-hygiene.mjs [--json] [--out file] [--commits 20]
 *
 * Unlike the other audit scripts, this one takes NO component name argument —
 * git state is global. The --all / --changed flags are accepted (ignored) so
 * the orchestrator can pass them uniformly.
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { buildResult, emit, finding } from './lib/json-output.mjs';
import { EXIT_INTERNAL, exitCodeFromSummary } from './lib/exit-codes.mjs';

const TOOL = 'git-hygiene';

const USAGE = `Usage: node scripts/audit/03-git-hygiene.mjs [options]

Audit git hygiene before opening a PR. Checks branch naming, conventional
commits, and staged/untracked files.

Options:
  --commits <N>    How many recent commits to validate (default: 10)
  --base <branch>  Base branch for diff comparison (default: main)
  --json           Emit JSON to stdout
  --out <file>     Write JSON envelope to file
  --vscode         Add vscode://file links to human output
  --no-color       Disable ANSI colors
  --all            Ignored (accepted for orchestrator uniformity)
  --changed        Ignored (accepted for orchestrator uniformity)
  --help, -h       Show this help`;

// Branch names that DON'T need to follow the cor-* convention (special branches)
const ALLOWED_BARE_BRANCHES = new Set(['main', 'master', 'develop', 'staging', 'production']);

// Conventional Commits regex — type(scope)?: subject
// types per the repo's commitlint.config.js (extends @commitlint/config-conventional)
const CONVENTIONAL_TYPES = [
  'feat',
  'fix',
  'docs',
  'style',
  'refactor',
  'perf',
  'test',
  'build',
  'ci',
  'chore',
  'revert',
];
const CONVENTIONAL_RE = new RegExp(`^(${CONVENTIONAL_TYPES.join('|')})(\\([^)]+\\))?!?: .+`);

// Branch naming convention. type/cor-name[-desc]  OR  type/desc-without-cor
const BRANCH_RE = /^(feat|fix|refactor|redesign|test|docs|chore|build|ci|perf|style)\/[a-z0-9][a-z0-9-]*$/;

// Paths that MUST NOT appear in the diff or in staged files
// (project's pre-commit hook already auto-unstages these — failure here means
// the hook was bypassed with --no-verify).
const FORBIDDEN_PATH_PATTERNS = [
  { pattern: /^dist\//, code: 'GIT-STAGED-DIST', message: 'Build output `dist/` should not be committed.' },
  { pattern: /^loader\//, code: 'GIT-STAGED-LOADER', message: 'Build output `loader/` should not be committed.' },
  { pattern: /^node_modules\//, code: 'GIT-STAGED-NODE-MODULES', message: 'Dependencies should not be committed.' },
  {
    pattern: /^\.stencil\//,
    code: 'GIT-STAGED-STENCIL-CACHE',
    message: 'Stencil cache `.stencil/` should not be committed.',
  },
  {
    pattern: /^\.wireit\//,
    code: 'GIT-STAGED-WIREIT-CACHE',
    message: 'Wireit cache `.wireit/` should not be committed.',
  },
  {
    pattern: /^tokens\/generated\//,
    code: 'GIT-STAGED-GENERATED-TOKENS',
    message: 'Generated token CSS should not be committed (built from source).',
  },
  {
    pattern: /^src\/components\.d\.ts$/,
    code: 'GIT-STAGED-COMPONENTS-DTS',
    message: 'src/components.d.ts is auto-generated; pre-commit hook auto-unstages it.',
  },
  {
    pattern: /^\.storybook\/custom-elements\.json$/,
    code: 'GIT-STAGED-CE-MANIFEST',
    message: 'custom-elements.json is auto-generated.',
  },
  { pattern: /\.log$/, code: 'GIT-STAGED-LOG', message: 'Log file should not be committed.' },
  {
    pattern: /^\.env(\..+)?$/,
    code: 'GIT-STAGED-ENV',
    message: 'Environment files should not be committed — risk of secret leakage.',
  },
];

async function main() {
  const args = parseCli();
  const t0 = Date.now();

  // Collect all git state in parallel
  const [branch, commits, staged, untracked] = await Promise.all([
    getCurrentBranch(),
    getRecentCommits(args.commits),
    getStagedFiles(),
    getUntrackedFiles(),
  ]);

  const findings = [];

  // 1. Branch naming
  findings.push(...checkBranchName(branch));

  // 2. Commit messages
  findings.push(...checkCommits(commits));

  // 3. Staged forbidden paths
  findings.push(...checkForbiddenPaths(staged, 'staged'));

  // 4. Untracked forbidden paths (warning — could be local-only mistake)
  findings.push(...checkForbiddenPaths(untracked, 'untracked'));

  const result = buildResult({
    tool: TOOL,
    target: branch ?? 'unknown-branch',
    findings,
    meta: {
      durationMs: Date.now() - t0,
      branch,
      commitsChecked: commits.length,
      stagedFiles: staged.length,
      untrackedFiles: untracked.length,
    },
  });

  await emit(result, args);
  process.exit(exitCodeFromSummary(result.summary));
}

// ─── Checks (pure, exported for tests) ─────────────────────────────────────

export function checkBranchName(branch) {
  if (!branch) {
    return [
      finding({
        severity: 'warning',
        code: 'GIT-BRANCH-UNKNOWN',
        message: 'Could not determine current branch (detached HEAD?).',
      }),
    ];
  }
  if (ALLOWED_BARE_BRANCHES.has(branch)) {
    // Working directly on main/master — caller decides if that's OK; we flag as warning.
    return [
      finding({
        severity: 'warning',
        code: 'GIT-BRANCH-PROTECTED',
        message: `On protected branch "${branch}" — usually you should work on a feature branch.`,
      }),
    ];
  }
  if (!BRANCH_RE.test(branch)) {
    return [
      finding({
        severity: 'warning',
        code: 'GIT-BRANCH-NAMING',
        message: `Branch "${branch}" does not match convention: type/desc (types: feat, fix, refactor, redesign, test, docs, chore, build, ci, perf, style).`,
        fix: 'Rename to e.g. feat/cor-button-add-loading or fix/cor-input-validation.',
      }),
    ];
  }
  return [];
}

export function checkCommits(commits) {
  const findings = [];
  for (const c of commits) {
    if (!CONVENTIONAL_RE.test(c.subject)) {
      findings.push(
        finding({
          severity: 'warning',
          code: 'GIT-COMMIT-CONVENTIONAL',
          message: `Commit ${c.hash}: "${c.subject}" does not follow Conventional Commits.`,
          snippet: c.subject.slice(0, 120),
          fix: 'Use type(scope)?: subject. Types: feat, fix, refactor, docs, test, chore, etc.',
        }),
      );
    }
    if (/^(wip\b|fixup!|squash!)/i.test(c.subject)) {
      findings.push(
        finding({
          severity: 'error',
          code: 'GIT-COMMIT-WIP',
          message: `Commit ${c.hash} is a WIP/fixup/squash — squash before opening the PR.`,
          snippet: c.subject.slice(0, 120),
        }),
      );
    }
  }
  return findings;
}

export function checkForbiddenPaths(files, kind) {
  const findings = [];
  for (const file of files) {
    for (const rule of FORBIDDEN_PATH_PATTERNS) {
      if (rule.pattern.test(file)) {
        // Staged forbidden = error (bypassed pre-commit hook); untracked = info-only
        const severity = kind === 'staged' ? 'error' : 'info';
        findings.push(
          finding({
            severity,
            code: `${rule.code}-${kind.toUpperCase()}`,
            file,
            message: `${rule.message} (${kind})`,
            fix:
              kind === 'staged'
                ? 'Run `git reset HEAD <file>` to unstage; investigate why pre-commit hook did not auto-unstage.'
                : undefined,
          }),
        );
        break;
      }
    }
  }
  return findings;
}

// ─── Git wrappers ───────────────────────────────────────────────────────────

function getCurrentBranch() {
  const res = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { encoding: 'utf8' });
  if (res.status !== 0) return null;
  const out = (res.stdout ?? '').trim();
  return out === 'HEAD' ? null : out;
}

function getRecentCommits(count) {
  const res = spawnSync('git', ['log', `-n${count}`, '--no-merges', '--pretty=format:%h%x09%s'], { encoding: 'utf8' });
  if (res.status !== 0) return [];
  return (res.stdout ?? '')
    .split('\n')
    .filter(Boolean)
    .map(line => {
      const [hash, ...subjectParts] = line.split('\t');
      return { hash, subject: subjectParts.join('\t') };
    });
}

function getStagedFiles() {
  const res = spawnSync('git', ['diff', '--name-only', '--cached'], { encoding: 'utf8' });
  if (res.status !== 0) return [];
  return (res.stdout ?? '').split('\n').filter(Boolean);
}

function getUntrackedFiles() {
  const res = spawnSync('git', ['ls-files', '--others', '--exclude-standard'], { encoding: 'utf8' });
  if (res.status !== 0) return [];
  return (res.stdout ?? '').split('\n').filter(Boolean);
}

// ─── CLI ────────────────────────────────────────────────────────────────────

function parseCli() {
  let parsed;
  try {
    parsed = parseArgs({
      args: process.argv.slice(2),
      options: {
        'commits': { type: 'string', default: '10' },
        'base': { type: 'string', default: 'main' },
        'json': { type: 'boolean', default: false },
        'out': { type: 'string' },
        'vscode': { type: 'boolean', default: false },
        'no-color': { type: 'boolean', default: false },
        'all': { type: 'boolean', default: false },
        'changed': { type: 'boolean', default: false },
        'help': { type: 'boolean', short: 'h', default: false },
      },
      allowPositionals: true,
      strict: true,
    });
  } catch (err) {
    process.stderr.write(`${TOOL}: ${err.message}\n\n${USAGE}\n`);
    process.exit(2);
  }
  if (parsed.values.help) {
    process.stdout.write(`${USAGE}\n`);
    process.exit(0);
  }
  const commits = Number(parsed.values.commits);
  if (!Number.isFinite(commits) || commits <= 0) {
    process.stderr.write(`${TOOL}: --commits must be a positive integer.\n`);
    process.exit(2);
  }
  return {
    commits,
    base: parsed.values.base,
    json: parsed.values.json,
    out: parsed.values.out ?? null,
    vscode: parsed.values.vscode,
    noColor: parsed.values['no-color'],
  };
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isDirectRun) {
  main().catch(err => {
    process.stderr.write(`${TOOL}: internal error — ${err.stack ?? err.message ?? err}\n`);
    process.exit(EXIT_INTERNAL);
  });
}

export { TOOL, CONVENTIONAL_RE, BRANCH_RE, ALLOWED_BARE_BRANCHES, FORBIDDEN_PATH_PATTERNS };
