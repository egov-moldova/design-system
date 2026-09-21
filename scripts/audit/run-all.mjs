#!/usr/bin/env node
/**
 * run-all.mjs
 *
 * Master orchestrator for the audit suite. Runs the checks a depth requires
 * (`verdict.mjs` REQUIRED_CHECKS — the one table) in waves and produces a
 * single combined JSON envelope:
 *
 *   quick     env preflight, lint, Wave A — no build, no browser
 *   standard  quick + prerequisites built automatically + Wave B + Wave C
 *   deep      standard + Wave D (figma-refs --check, adapter smoke builds,
 *             E2E deferred) + the AI-leg rows it opens for the skill
 *
 *   Wave A (parallel, no browser, no build):
 *     lint, 01 structure, 02 antipatterns, 03 git-hygiene, 04 jsdoc,
 *     05 story-exports, 07 integration-usage, 14 component-contract,
 *     16 stencil-contract, 17 adapter-contract (source part)
 *   Wave B (parallel, need build artifacts):
 *     06 test-coverage, 08 bundle-size, 13 token-diff, 18 adapter-contract (CEM part)
 *   Wave C (browser; this worktree's Storybook + Playwright):
 *     09 a11y-tree, 10 contrast-pairs, 11 pixel-diff-states, 12 console-errors,
 *     15 style-parity, 19 interaction
 *   Wave D (deep only): figma-refs --check, adapter-react, adapter-vanilla, e2e
 *
 * Prerequisites at standard+ (only those the selected rows need):
 *   `yarn dx:prepare`, `yarn dx:stencil:once` (writes dist/mud and the CEM),
 *   the component's own coverage, and a Storybook owned by this worktree
 *   (`.audit-storybook.json`, lib/storybook-helpers.mjs) passed via `--port`.
 *
 * Figma inputs come from HEAD only (Design §8): each manifest is resolved
 * from `git show HEAD:<path>` into `.audit-figma/<component>/manifest@HEAD.json`
 * and passed to 11, 15 and figma-refs via `--manifest`.
 *
 * `--changed` / `--all` resolve the component list once and run the
 * per-component pipeline for each; repo-level rows (03, the adapter builds)
 * run once and are shared.
 *
 * `--verdict` also writes each component's run inputs under
 * `audit/<component>/runs/<run>/` and has `verdict.mjs` write the verdict,
 * the fix brief and `audit/_run/summary.json`. This script's own exit code
 * keeps its meaning — 0 ok, 1 not ok, 2 internal error; only `verdict.mjs`
 * maps the verdict state to an exit code.
 *
 * Usage:
 *   node scripts/audit/run-all.mjs mud-button [--depth quick|standard|deep] [--json]
 *   node scripts/audit/run-all.mjs --changed --depth quick --no-browser --json
 *   node scripts/audit/run-all.mjs mud-button --only 01,02,03 --json
 */
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { REPO_ROOT, listAllComponents, normalizeComponentName } from './lib/component-paths.mjs';
import { EXIT_INTERNAL } from './lib/exit-codes.mjs';
import { ROW_STATUS, SCHEMA_VERSION, buildAiLegRow, finding, flushStdout } from './lib/json-output.mjs';
import { resolveHeadManifest } from './lib/figma-manifest.mjs';
import { checkEnv, formatIncomplete } from './lib/env-preflight.mjs';
import { resolveDepth } from './lib/cli-args.mjs';
import { listChangedComponents } from './lib/changed-components.mjs';
import { ensureWorktreeStorybook } from './lib/storybook-helpers.mjs';
import { figmaToken } from './figma-refs.mjs';
import { DEFERRED_CHECKS, REQUIRED_CHECKS, excuseFor, writeSummary, writeVerdictForRun } from './verdict.mjs';

const TOOL = 'run-all';

const USAGE = `Usage: node scripts/audit/run-all.mjs <component | --all | --changed> [options]

Run the audit checks a depth requires in waves and aggregate the results into
a single JSON envelope. AI agents should call this instead of dispatching each
script individually; gate callers use \`yarn audit:component\` (verdict.mjs).

Targets (choose one):
  <mud-name>          Audit one component (e.g. mud-button or button)
  --all               Audit every mud-* component, one pipeline each
  --changed           Audit components touched in git diff vs main, one pipeline each

Depth:
  --depth <d>         quick | standard | deep (default: standard)
                        quick     lint + Wave A; no build, no browser
                        standard  quick + prerequisites + Waves B and C
                        deep      standard + figma-refs --check, adapter builds,
                                  E2E (deferred) and the AI-leg rows
  --fast              Deprecated alias of --depth quick
  --e2e               Folded into --depth deep

Options:
  --json              Emit the combined JSON envelope to stdout (default human summary)
  --out <file>        Write the combined JSON envelope to a file
  --skip <ids>        Comma-separated list of check ids to skip (e.g. 06,08)
  --only <ids>        Comma-separated list — only run these checks. A required id dropped
                      by --skip / --only makes the verdict INCOMPLETE.
  --no-browser        Excuse the browser checks (Wave C and the browser AI legs);
                      the verdict level is capped at CLEAN-STATIC.
  --ci                Same as --no-browser, and sets meta.ciDetected. Also enabled
                      when process.env.CI is set.
  --no-figma          Excuse the Figma checks (11, 15, figma-refs, the Figma AI leg)
                      for this run; deep is then capped at MERGE-READY.
  --figma-dir <dir>   Forwarded to 11-pixel-diff-states (reference PNGs)
  --verdict           Also write audit/<component>/runs/<run>/, verdict.json,
                      fix-brief.md and audit/_run/summary.json (verdict.mjs does this)
  --audit-dir <dir>   Root for --verdict output (default: audit/)
  --no-color          Disable ANSI colors
  --help, -h          Show this help`;

/**
 * The check registry. `kind` defaults to 'script' (an audit script spawned
 * with `<target> --json [...args]`); 'lint' runs ESLint + Stylelint on the
 * component's files; 'command' runs a repo-level build; 'deferred' is a row
 * that reports its reason; 'ai-leg' is opened for the skill to close.
 * `requiresBuild` names the prerequisite a row needs (PREREQUISITES_FOR).
 */
const AUDIT_SCRIPTS = [
  { id: 'lint', wave: 'A', kind: 'lint', name: 'lint', perComponent: true, requiresBuild: false },
  {
    id: '01',
    wave: 'A',
    file: '01-component-structure.mjs',
    name: 'structure',
    perComponent: true,
    requiresBuild: false,
  },
  {
    id: '02',
    wave: 'A',
    file: '02-stencil-antipatterns.mjs',
    name: 'antipatterns',
    perComponent: true,
    requiresBuild: false,
  },
  {
    id: '03',
    wave: 'A',
    file: '03-git-hygiene.mjs',
    name: 'git-hygiene',
    perComponent: false,
    requiresBuild: false,
    owner: 'the branch author (git history and staging)',
  },
  { id: '04', wave: 'A', file: '04-jsdoc-completeness.mjs', name: 'jsdoc', perComponent: true, requiresBuild: false },
  {
    id: '05',
    wave: 'A',
    file: '05-story-exports.mjs',
    name: 'story-exports',
    perComponent: true,
    requiresBuild: false,
    owner: 'story-writer',
  },
  {
    id: '07',
    wave: 'A',
    file: '07-integration-usage.mjs',
    name: 'integration-usage',
    perComponent: true,
    requiresBuild: false,
  },
  {
    id: '14',
    wave: 'A',
    file: '14-component-contract.mjs',
    name: 'component-contract',
    perComponent: true,
    requiresBuild: false,
  },
  {
    id: '16',
    wave: 'A',
    file: '16-stencil-contract.mjs',
    name: 'stencil-contract',
    perComponent: true,
    requiresBuild: false,
    // Report-only: its error-severity findings are quoted in the summary but never block.
    blocking: false,
  },
  {
    id: '17',
    wave: 'A',
    file: '17-adapter-contract.mjs',
    args: ['--part', 'source'],
    name: 'adapter-contract-source',
    perComponent: true,
    requiresBuild: false,
  },
  {
    id: '06',
    wave: 'B',
    file: '06-test-coverage.mjs',
    name: 'test-coverage',
    perComponent: true,
    requiresBuild: 'coverage',
    owner: 'test-writer',
  },
  { id: '08', wave: 'B', file: '08-bundle-size.mjs', name: 'bundle-size', perComponent: true, requiresBuild: 'dist' },
  {
    id: '13',
    wave: 'B',
    file: '13-token-diff.mjs',
    name: 'token-diff',
    perComponent: true,
    requiresBuild: false,
    owner: '/update-tokens',
  },
  {
    id: '18',
    wave: 'B',
    file: '17-adapter-contract.mjs',
    args: ['--part', 'cem'],
    name: 'adapter-contract-cem',
    perComponent: true,
    requiresBuild: 'cem',
  },
  { id: '09', wave: 'C', file: '09-a11y-tree.mjs', name: 'a11y-tree', perComponent: true, requiresBuild: 'browser' },
  {
    id: '10',
    wave: 'C',
    file: '10-contrast-pairs.mjs',
    name: 'contrast-pairs',
    perComponent: true,
    requiresBuild: 'browser',
  },
  {
    id: '11',
    wave: 'C',
    file: '11-pixel-diff-states.mjs',
    name: 'pixel-diff',
    perComponent: true,
    requiresBuild: 'browser',
    usesManifest: true,
    owner: '/fix-visual-bug',
  },
  {
    id: '12',
    wave: 'C',
    file: '12-console-errors.mjs',
    name: 'console-errors',
    perComponent: true,
    requiresBuild: 'browser',
  },
  {
    id: '15',
    wave: 'C',
    file: '15-style-parity.mjs',
    name: 'style-parity',
    perComponent: true,
    requiresBuild: 'browser',
    usesManifest: true,
    owner: '/fix-visual-bug',
  },
  {
    id: '19',
    wave: 'C',
    file: '19-interaction.mjs',
    name: 'interaction',
    perComponent: true,
    requiresBuild: 'browser',
  },
  {
    id: 'figma-refs',
    wave: 'D',
    file: 'figma-refs.mjs',
    args: ['--check'],
    name: 'figma-refs',
    perComponent: true,
    requiresBuild: 'figma-token',
    usesManifest: true,
    recordMeta: ['version'],
    owner: '/fix-visual-bug',
  },
  {
    id: 'adapter-react',
    wave: 'D',
    kind: 'command',
    command: ['yarn', 'build.react'],
    name: 'adapter-react',
    perComponent: false,
    requiresBuild: false,
    // Stencil build: writes dist/, loader/, .stencil and component readme.md — the
    // same output adapter-vanilla's build writes. Run one at a time (runWaves).
    exclusive: true,
  },
  {
    id: 'adapter-vanilla',
    wave: 'D',
    kind: 'command',
    command: ['yarn', 'build.web'],
    name: 'adapter-vanilla',
    perComponent: false,
    requiresBuild: false,
    // See adapter-react: shares the same Stencil build output, so it may not
    // overlap with it (or any other `exclusive` row) inside a wave.
    exclusive: true,
  },
  { id: 'e2e', wave: 'D', kind: 'deferred', name: 'e2e', perComponent: true, requiresBuild: false },
  {
    id: 'ai-stencil',
    wave: 'D',
    kind: 'ai-leg',
    name: 'stencil-compliance-manual',
    leg: 'stencil-compliance',
    idsJudged: ['DX-stencil-manual'],
    prompt: '.claude/skills/stencil-compliance/SKILL.md',
  },
  {
    id: 'ai-wcag',
    wave: 'D',
    kind: 'ai-leg',
    name: 'full-wcag',
    leg: 'a11y-verifier',
    idsJudged: ['DX-wcag'],
    prompt: '.claude/agents/a11y-verifier.md',
  },
  {
    id: 'ai-media',
    wave: 'D',
    kind: 'ai-leg',
    name: 'media-conditions',
    leg: 'a11y-verifier',
    idsJudged: ['DX-media'],
    prompt: '.claude/agents/a11y-verifier.md',
  },
  {
    id: 'ai-figma-themes',
    wave: 'D',
    kind: 'ai-leg',
    name: 'figma-states-both-themes',
    leg: 'pixel-perfect-verifier',
    idsJudged: ['DX-figma-themes'],
    prompt: '.claude/agents/pixel-perfect-verifier.md',
  },
  {
    id: 'ai-archetype',
    wave: 'D',
    kind: 'ai-leg',
    name: 'archetype',
    leg: 'audit-component',
    idsJudged: ['CX1', 'CX2', 'CX3', 'CX4'],
    prompt: '.claude/skills/audit-component/SKILL.md',
  },
  {
    id: 'ai-security',
    wave: 'D',
    kind: 'ai-leg',
    name: 'security',
    leg: 'audit-component',
    idsJudged: ['DX-security'],
    prompt: '.claude/skills/audit-component/SKILL.md',
  },
];

/** Prerequisite commands, in the order they run. `storybook` is started, not run. */
export const PREREQUISITES = Object.freeze({
  'dx:prepare': { command: ['yarn', 'dx:prepare'] },
  'dx:stencil:once': { command: ['yarn', 'dx:stencil:once'] },
  'coverage': { command: dirs => ['yarn', 'vitest', 'run', '--project', 'spec', '--coverage', ...dirs] },
  'storybook': { start: true },
});

/** What each `requiresBuild` value needs before its row can run. */
export const PREREQUISITES_FOR = Object.freeze({
  coverage: ['coverage'],
  dist: ['dx:stencil:once'],
  cem: ['dx:stencil:once'],
  browser: ['dx:prepare', 'dx:stencil:once', 'storybook'],
});

/** The command a fixer runs to produce a row's prerequisite, printed in the fix brief. */
function prerequisiteCommand(requires, componentDir) {
  switch (requires) {
    case 'coverage':
      return `yarn vitest run --project spec --coverage ${componentDir}`;
    case 'dist':
    case 'cem':
      return 'yarn dx:stencil:once';
    case 'browser':
      return "yarn dx:prepare && yarn dx:stencil:once, then this worktree's Storybook (run-all starts it; .audit-storybook.json)";
    case 'figma-token':
      return 'export FIGMA_TOKEN=<Figma personal access token>';
    default:
      return null;
  }
}

/**
 * Parse argv. `env` is injectable so a test can set `CI` without touching
 * the real environment.
 */
export function parseCli(argv = process.argv.slice(2), env = process.env) {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      options: {
        'all': { type: 'boolean', default: false },
        'changed': { type: 'boolean', default: false },
        'json': { type: 'boolean', default: false },
        'out': { type: 'string' },
        'skip': { type: 'string', default: '' },
        'only': { type: 'string', default: '' },
        'depth': { type: 'string' },
        'fast': { type: 'boolean', default: false },
        'e2e': { type: 'boolean', default: false },
        'no-browser': { type: 'boolean', default: false },
        'no-figma': { type: 'boolean', default: false },
        'ci': { type: 'boolean', default: false },
        'figma-dir': { type: 'string' },
        'verdict': { type: 'boolean', default: false },
        'audit-dir': { type: 'string' },
        'no-color': { type: 'boolean', default: false },
        'help': { type: 'boolean', short: 'h', default: false },
      },
      allowPositionals: true,
      strict: true,
    });
  } catch (err) {
    process.stderr.write(`${TOOL}: ${err.message}\n\n${USAGE}\n`);
    process.exit(EXIT_INTERNAL);
  }
  if (parsed.values.help) {
    process.stdout.write(`${USAGE}\n`);
    process.exit(0);
  }
  const component = parsed.positionals[0] ?? null;
  const all = parsed.values.all;
  const changed = parsed.values.changed;
  const targetCount = [component, all, changed].filter(Boolean).length;
  if (targetCount === 0) {
    process.stderr.write(`${TOOL}: choose a component, --all, or --changed.\n\n${USAGE}\n`);
    process.exit(EXIT_INTERNAL);
  }
  if (targetCount > 1) {
    process.stderr.write(`${TOOL}: choose exactly one of <component>, --all, --changed.\n`);
    process.exit(EXIT_INTERNAL);
  }
  const depth = resolveDepth({ depth: parsed.values.depth, fast: parsed.values.fast, e2e: parsed.values.e2e });
  if (depth.error) {
    process.stderr.write(`${TOOL}: ${depth.error}\n`);
    process.exit(EXIT_INTERNAL);
  }
  // CI mode: the explicit --ci flag or any truthy CI env var (GitHub Actions,
  // GitLab CI, CircleCI, … all set CI=true). Either excuses the browser checks
  // and caps the level (Decision §6); the verdict names which one.
  const ciEnv = Boolean(env.CI);
  const ci = parsed.values.ci || ciEnv;
  const noBrowser = parsed.values['no-browser'];
  const browserWaiver = ciEnv ? 'CI env' : parsed.values.ci || noBrowser ? 'flag' : null;
  return {
    component,
    all,
    changed,
    depth: depth.depth,
    json: parsed.values.json,
    out: parsed.values.out ?? null,
    skip: splitIds(parsed.values.skip),
    only: splitIds(parsed.values.only),
    noBrowser,
    noFigma: parsed.values['no-figma'],
    ci,
    browserWaiver,
    figmaDir: parsed.values['figma-dir'] ?? null,
    verdict: parsed.values.verdict,
    auditDir: parsed.values['audit-dir'] ?? null,
    noColor: parsed.values['no-color'],
  };
}

function splitIds(s) {
  return new Set(
    s
      .split(',')
      .map(x => x.trim())
      .filter(Boolean),
  );
}

/**
 * The registry entries to run for one component at `args.depth`: the
 * depth's required and deferred ids, minus `--only` / `--skip`, minus every
 * id with an excuse (`verdict.mjs` excuseFor). `--figma-dir` keeps 11 in
 * story mode for a component with no manifest. Pure.
 *
 * @param {object} args — parseCli() output (depth, only, skip, noFigma, browserWaiver, figmaDir)
 * @param {{ figma?: object|null, registry?: object[] }} [opts]
 */
export function selectScripts(args, { figma = null, registry = AUDIT_SCRIPTS } = {}) {
  const depth = args.depth ?? 'standard';
  const byId = new Map(registry.map(s => [s.id, s]));
  const ids = [...REQUIRED_CHECKS[depth], ...DEFERRED_CHECKS[depth].map(d => d.id)];
  const ctx = { noFigma: args.noFigma, figma, browserWaiver: args.browserWaiver ?? null };
  return ids
    .map(id => byId.get(id))
    .filter(Boolean)
    .filter(s => !(args.only?.size > 0 && !args.only.has(s.id)))
    .filter(s => !args.skip?.has(s.id))
    .filter(s => {
      if (!excuseFor(s.id, ctx)) return true;
      const storyMode = s.id === '11' && args.figmaDir && figma?.status === 'absent' && !args.noFigma;
      return storyMode && !args.browserWaiver;
    });
}

// ─── Default side effects (all injectable through runAudit's deps) ───────

function defaultRunCommand(cmd, cmdArgs, { cwd = REPO_ROOT, capture = false } = {}) {
  return new Promise(resolve => {
    let stdout = '';
    let stderr = '';
    // Prerequisite output goes to our stderr so `--json` stdout stays one envelope.
    const stdio = capture ? ['ignore', 'pipe', 'pipe'] : ['ignore', 2, 2];
    const proc = spawn(cmd, cmdArgs, { cwd, stdio, windowsHide: true });
    proc.stdout?.on('data', c => {
      stdout += c;
    });
    proc.stderr?.on('data', c => {
      stderr += c;
    });
    proc.on('error', err => resolve({ exitCode: null, stdout, stderr: err.message }));
    proc.on('close', exitCode => resolve({ exitCode, stdout, stderr }));
  });
}

function defaultGit(gitArgs) {
  const res = spawnSync('git', gitArgs, { cwd: REPO_ROOT, encoding: 'utf8' });
  return { status: res.status, stdout: res.stdout ?? '' };
}

function componentDirFor(repoRoot, component) {
  const hidden = `src/hidden/${component}`;
  return existsSync(join(repoRoot, hidden)) && !existsSync(join(repoRoot, 'src/components', component))
    ? hidden
    : `src/components/${component}`;
}

function walkFiles(root) {
  const out = [];
  if (!existsSync(root)) return out;
  for (const entry of readdirSync(root)) {
    const abs = join(root, entry);
    if (statSync(abs).isDirectory()) out.push(...walkFiles(abs));
    else out.push(abs);
  }
  return out;
}

/** Every source file of a component, as `{ path, content }` sorted by path. */
function defaultReadSources(repoRoot, component) {
  const root = join(repoRoot, componentDirFor(repoRoot, component));
  return walkFiles(root)
    .map(abs => ({ path: relative(repoRoot, abs), content: readFileSync(abs, 'utf8') }))
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}

/**
 * SHA-256 of what an AI leg judges: the component's source files plus the
 * leg prompt (Design §1). Recorded when the row is opened; a leg's
 * ai-findings.json that states a different hash does not close it. Pure.
 */
export function hashLegInput(sources, promptText) {
  const h = createHash('sha256');
  for (const s of sources) h.update(`${s.path}\u0000${s.content}\u0000`);
  h.update(`prompt\u0000${promptText ?? ''}`);
  return `sha256:${h.digest('hex')}`;
}

function defaultRunId() {
  return `${new Date().toISOString().replace(/[:.]/g, '-')}-${process.pid}`;
}

// ─── Running one row ─────────────────────────────────────────────────────

function baseResult(script, component) {
  return {
    id: script.id,
    name: script.name,
    wave: script.wave,
    component: script.perComponent === false ? null : component,
  };
}

function runScript(script, targetArg, opts) {
  const t0 = Date.now();
  const base = baseResult(script, opts.component);
  const scriptPath = join(opts.scriptsDir, script.file);
  if (!existsSync(scriptPath)) {
    // A registered check whose script is not on this branch yet is a crash, not a pass.
    return Promise.resolve({
      ...base,
      ok: false,
      status: ROW_STATUS.CRASHED,
      errorClass: 'script-missing',
      exitCode: null,
      durationMs: 0,
      error: `scripts/audit/${script.file} not found`,
    });
  }
  const extraArgs = [...(script.args ?? [])];
  if (script.usesManifest && opts.figma?.path) extraArgs.push('--manifest', join(opts.repoRoot, opts.figma.path));
  if (script.id === '11' && opts.figmaDir) extraArgs.push('--figma-dir', opts.figmaDir);
  if (script.requiresBuild === 'browser' && opts.port) extraArgs.push('--port', String(opts.port));

  return new Promise(resolve => {
    let stdout = '';
    let stderr = '';
    const proc = spawn(process.execPath, [scriptPath, targetArg, '--json', ...extraArgs], {
      cwd: opts.repoRoot,
      env: opts.env,
      windowsHide: true,
    });
    proc.stdout.on('data', chunk => {
      stdout += chunk;
    });
    proc.stderr.on('data', chunk => {
      stderr += chunk;
    });
    proc.on('error', err => {
      resolve({ ...base, ok: false, exitCode: null, durationMs: Date.now() - t0, error: err.message });
    });
    proc.on('close', exitCode => {
      const durationMs = Date.now() - t0;
      if (exitCode === EXIT_INTERNAL) {
        resolve({ ...base, ok: false, exitCode, durationMs, error: stderr.trim().slice(0, 500) });
        return;
      }
      let envelope;
      try {
        envelope = JSON.parse(stdout);
      } catch (err) {
        resolve({
          ...base,
          ok: false,
          exitCode,
          durationMs,
          error: `failed to parse output JSON: ${err.message}`,
        });
        return;
      }
      if (typeof envelope?.ok !== 'boolean' || !envelope.summary) {
        resolve({ ...base, ok: false, exitCode, durationMs, error: 'no result envelope in output' });
        return;
      }
      resolve({
        ...base,
        ok: envelope.ok,
        exitCode,
        durationMs,
        summary: envelope.summary,
        findings: envelope.findings ?? [],
        meta: envelope.meta ?? {},
      });
    });
  });
}

async function runCommandRow(script, opts) {
  const t0 = Date.now();
  const base = baseResult(script, opts.component);
  const [cmd, ...cmdArgs] = script.command;
  const res = await opts.runCommand(cmd, cmdArgs, { cwd: opts.repoRoot });
  const durationMs = Date.now() - t0;
  if (res.exitCode === null) return { ...base, ok: false, exitCode: null, durationMs, error: res.stderr };
  const findings =
    res.exitCode === 0
      ? []
      : [
          finding({
            severity: 'error',
            code: 'ADAPTER-BUILD-FAILED',
            message: `\`${script.command.join(' ')}\` exited ${res.exitCode}`,
            fix: `Run \`${script.command.join(' ')}\` and fix the first error it prints.`,
          }),
        ];
  return {
    ...base,
    ok: res.exitCode === 0,
    exitCode: res.exitCode,
    durationMs,
    summary: { errors: findings.length, warnings: 0, info: 0 },
    findings,
  };
}

function parseJsonOutput(...candidates) {
  for (const text of candidates) {
    const trimmed = String(text ?? '').trim();
    if (!trimmed.startsWith('[')) continue;
    try {
      return JSON.parse(trimmed);
    } catch {
      // try the next stream
    }
  }
  return null;
}

/**
 * ESLint (every message is a failure — `lint.js` runs with --max-warnings 0)
 * and Stylelint on the component's own files. Stylelint 17 writes its JSON
 * report to stderr, ESLint to stdout, so both streams are tried.
 */
async function runLintRow(script, opts) {
  const t0 = Date.now();
  const base = baseResult(script, opts.component);
  const dir = componentDirFor(opts.repoRoot, opts.component);
  const bin = name => join(opts.repoRoot, 'node_modules', '.bin', name);
  const [eslint, stylelint] = await Promise.all([
    opts.runCommand(bin('eslint'), [`${dir}/**/*.{ts,tsx}`, '--format', 'json', '--no-error-on-unmatched-pattern'], {
      cwd: opts.repoRoot,
      capture: true,
    }),
    opts.runCommand(bin('stylelint'), [`${dir}/**/*.css`, '--formatter', 'json', '--allow-empty-input'], {
      cwd: opts.repoRoot,
      capture: true,
    }),
  ]);
  const eslintReport = parseJsonOutput(eslint.stdout, eslint.stderr);
  const stylelintReport = parseJsonOutput(stylelint.stderr, stylelint.stdout);
  const durationMs = Date.now() - t0;
  if (!eslintReport || !stylelintReport) {
    return {
      ...base,
      ok: false,
      exitCode: eslintReport ? stylelint.exitCode : eslint.exitCode,
      durationMs,
      errorClass: 'invalid-json',
      error: `${eslintReport ? 'stylelint' : 'eslint'} did not produce a JSON report`,
    };
  }
  const findings = [];
  for (const file of eslintReport) {
    for (const m of file.messages ?? []) {
      findings.push(
        finding({
          severity: 'error',
          code: `ESLINT-${m.ruleId ?? 'PARSE'}`,
          file: relative(opts.repoRoot, file.filePath),
          line: m.line,
          column: m.column,
          message: m.message,
        }),
      );
    }
  }
  for (const file of stylelintReport) {
    for (const w of file.warnings ?? []) {
      findings.push(
        finding({
          severity: w.severity === 'warning' ? 'warning' : 'error',
          code: `STYLELINT-${w.rule}`,
          file: relative(opts.repoRoot, file.source),
          line: w.line,
          column: w.column,
          message: w.text,
        }),
      );
    }
  }
  const errors = findings.filter(f => f.severity === 'error').length;
  return {
    ...base,
    ok: errors === 0,
    exitCode: errors === 0 ? 0 : 1,
    durationMs,
    summary: { errors, warnings: findings.length - errors, info: 0 },
    findings,
  };
}

function deferredRow(script, component, depth) {
  const reason = DEFERRED_CHECKS[depth].find(d => d.id === script.id)?.reason ?? 'deferred';
  return { ...baseResult(script, component), ok: true, status: ROW_STATUS.SKIPPED, deferred: reason, durationMs: 0 };
}

function prerequisiteFailure(script, component, failed) {
  return {
    ...baseResult(script, component),
    ok: false,
    status: ROW_STATUS.MISSING_PREREQ,
    errorClass: 'prerequisite-failed',
    exitCode: null,
    durationMs: 0,
    error: `prerequisite ${failed.id} failed: ${failed.cause}`,
  };
}

async function runRow(script, opts) {
  const requires = script.requiresBuild;
  const failed = (PREREQUISITES_FOR[requires] ?? []).map(p => opts.prereqs.get(p)).find(p => p && !p.ok);
  if (failed) return prerequisiteFailure(script, opts.component, failed);
  if (requires === 'figma-token' && !figmaToken(opts.env)) {
    return prerequisiteFailure(script, opts.component, { id: 'figma-token', cause: 'FIGMA_TOKEN is not set' });
  }
  const kind = script.kind ?? 'script';
  if (kind === 'deferred') return deferredRow(script, opts.component, opts.depth);
  if (kind === 'command') return runCommandRow(script, opts);
  if (kind === 'lint') return runLintRow(script, opts);
  const targetArg = script.perComponent === false ? '--all' : opts.component;
  return runScript(script, targetArg, opts);
}

async function runWaves(scripts, opts) {
  const results = [];
  for (const wave of ['A', 'B', 'C', 'D']) {
    const inWave = scripts.filter(s => s.wave === wave);
    // `exclusive` rows write shared build output (dist/, loader/, .stencil, component
    // readme.md) and would race each other under Promise.all — run them one at a
    // time, after the rest of the wave.
    const parallel = inWave.filter(s => !s.exclusive);
    const exclusive = inWave.filter(s => s.exclusive);
    results.push(...(await Promise.all(parallel.map(s => runRow(s, opts)))));
    for (const s of exclusive) results.push(await runRow(s, opts));
  }
  return results;
}

// ─── Prerequisites ───────────────────────────────────────────────────────

async function runPrerequisites(needed, { components, deps }) {
  const prereqs = new Map();
  for (const id of Object.keys(PREREQUISITES)) {
    if (!needed.has(id)) continue;
    if (id === 'storybook') {
      const sb = await deps.ensureStorybook();
      prereqs.set(id, sb.ok ? { id, ok: true, port: sb.port } : { id, ok: false, cause: sb.cause });
      continue;
    }
    const spec = PREREQUISITES[id].command;
    const argv =
      typeof spec === 'function' ? spec(components.map(c => componentDirFor(deps.repoRoot, c))) : spec.slice();
    const res = await deps.runCommand(argv[0], argv.slice(1), { cwd: deps.repoRoot });
    prereqs.set(
      id,
      res.exitCode === 0
        ? { id, ok: true, command: argv.join(' ') }
        : { id, ok: false, command: argv.join(' '), cause: `\`${argv.join(' ')}\` exited ${res.exitCode}` },
    );
  }
  return prereqs;
}

// ─── The pipeline ────────────────────────────────────────────────────────

function resolveComponents(args, deps) {
  if (args.all) return deps.listAll();
  if (args.changed) return deps.listChanged();
  const name = normalizeComponentName(args.component);
  return name ? [name] : null;
}

function openAiLegs(scripts, component, deps) {
  const legs = scripts.filter(s => s.kind === 'ai-leg');
  if (!legs.length) return [];
  const sources = deps.readSources(component);
  return legs.map(s => ({
    id: s.id,
    ...buildAiLegRow({
      leg: s.leg,
      idsJudged: s.idsJudged,
      inputHash: hashLegInput(sources, deps.readPrompt(s.prompt)),
    }),
  }));
}

/**
 * Run the whole audit. Every side effect is a `deps` entry, so tests drive a
 * real pipeline (real fixture scripts, real envelope, real verdicts) without
 * touching git, starting servers or running builds.
 *
 * @returns {Promise<{ combined: object, perComponent: Array<{component, envelope}>, summary?: object }>}
 */
export async function runAudit(args, deps = {}) {
  const t0 = Date.now();
  const repoRoot = deps.repoRoot ?? REPO_ROOT;
  const d = {
    repoRoot,
    registry: AUDIT_SCRIPTS,
    scriptsDir: join(repoRoot, 'scripts', 'audit'),
    env: process.env,
    checkEnv: () => checkEnv({ repoRoot }),
    runCommand: defaultRunCommand,
    git: defaultGit,
    readWorkingTree: p => (existsSync(p) ? readFileSync(p, 'utf8') : null),
    writeFile: (p, text) => {
      mkdirSync(dirname(p), { recursive: true });
      writeFileSync(p, text);
    },
    listChanged: () => listChangedComponents(),
    listAll: () => listAllComponents().map(c => c.name),
    ensureStorybook: () => ensureWorktreeStorybook({ repoRoot }),
    readSources: component => defaultReadSources(repoRoot, component),
    readPrompt: rel => (existsSync(join(repoRoot, rel)) ? readFileSync(join(repoRoot, rel), 'utf8') : ''),
    runId: defaultRunId(),
    ...deps,
  };
  const auditDir = args.auditDir ?? join(repoRoot, 'audit');
  const targetArg = args.all ? '--all' : args.changed ? '--changed' : normalizeComponentName(args.component);
  const auditBase = {
    depth: args.depth,
    noFigma: Boolean(args.noFigma),
    browserWaiver: args.browserWaiver ?? null,
    filters: { only: [...(args.only ?? [])].sort(), skip: [...(args.skip ?? [])].sort() },
  };

  const envCheck = d.checkEnv();
  if (!envCheck.ok) {
    const message = formatIncomplete(envCheck);
    const combined = buildPreflightFailure({ args, envCheck, message, durationMs: Date.now() - t0 });
    const result = { combined, perComponent: [], preflight: true };
    if (args.verdict) {
      const runs = [];
      if (!args.all && !args.changed && targetArg) {
        const envelope = { ...combined, target: targetArg, audit: { ...auditBase, component: targetArg } };
        runs.push(writeRun(auditDir, targetArg, d.runId, envelope));
      }
      result.summary = writeSummary(auditDir, {
        depth: args.depth,
        runs,
        preflight: { cause: envCheck.cause, command: envCheck.command, message },
      });
    }
    return result;
  }

  const components = resolveComponents(args, d);
  if (!components) throw new UsageError(`invalid component name "${args.component}".`);

  // Per-component selection, with Figma inputs resolved from HEAD at standard+.
  const plans = components.map(component => {
    const figma =
      args.depth !== 'quick' && !args.noFigma
        ? resolveHeadManifest(component, {
            git: d.git,
            repoRoot,
            readWorkingTree: d.readWorkingTree,
            writeFile: d.writeFile,
          })
        : null;
    return { component, figma, scripts: selectScripts(args, { figma, registry: d.registry }) };
  });
  const sharedScripts = selectScripts(args, { figma: null, registry: d.registry }).filter(
    s => s.perComponent === false,
  );

  const needed = new Set();
  for (const s of [...sharedScripts, ...plans.flatMap(p => p.scripts)]) {
    for (const p of PREREQUISITES_FOR[s.requiresBuild] ?? []) needed.add(p);
  }
  const prereqs = await runPrerequisites(needed, { components, deps: d });
  const port = prereqs.get('storybook')?.port ?? null;
  const common = {
    repoRoot,
    scriptsDir: d.scriptsDir,
    env: d.env,
    runCommand: d.runCommand,
    prereqs,
    port,
    depth: args.depth,
    figmaDir: args.figmaDir,
  };

  // Repo-level rows run once. Wave D's builds rewrite dist/, so they run after every component.
  const sharedEarly = await runWaves(
    sharedScripts.filter(s => s.wave !== 'D'),
    { ...common, component: null },
  );
  const perComponentResults = [];
  for (const plan of plans) {
    const scripts = plan.scripts.filter(s => s.perComponent !== false && s.kind !== 'ai-leg');
    const t = Date.now();
    const results = await runWaves(scripts, { ...common, component: plan.component, figma: plan.figma });
    perComponentResults.push({ plan, results, durationMs: Date.now() - t });
  }
  const sharedLate = await runWaves(
    sharedScripts.filter(s => s.wave === 'D'),
    { ...common, component: null },
  );
  const shared = [...sharedEarly, ...sharedLate];

  const prerequisites = [...prereqs.values()].map(p => ({ id: p.id, ok: p.ok }));
  const perComponent = perComponentResults.map(({ plan, results, durationMs }) => {
    const envelope = aggregate({
      targetArg: plan.component,
      results: [...shared, ...results],
      durationMs,
      ci: args.ci,
      noBrowser: args.noBrowser,
      registry: d.registry,
    });
    envelope.audit = {
      ...auditBase,
      component: plan.component,
      figma: plan.figma,
      aiLegs: openAiLegs(plan.scripts, plan.component, d),
      prerequisites,
    };
    envelope.meta.depth = args.depth;
    return { component: plan.component, envelope };
  });

  const combined =
    perComponent.length === 1 && !args.all && !args.changed
      ? perComponent[0].envelope
      : aggregate({
          targetArg,
          results: [...shared, ...perComponentResults.flatMap(r => r.results)],
          durationMs: 0,
          ci: args.ci,
          noBrowser: args.noBrowser,
          registry: d.registry,
        });
  combined.components = components;
  combined.meta.depth = args.depth;
  combined.meta.totalDurationMs = Date.now() - t0;

  const result = { combined, perComponent };
  if (args.verdict) {
    const runs = perComponent.map(({ component, envelope }) => writeRun(auditDir, component, d.runId, envelope));
    result.summary = writeSummary(auditDir, { depth: args.depth, runs });
  }
  return result;
}

/** Write one component's run inputs and have verdict.mjs compute and write its verdict. */
function writeRun(auditDir, component, runId, envelope) {
  const runDir = join(auditDir, component, 'runs', runId);
  mkdirSync(runDir, { recursive: true });
  writeFileSync(join(runDir, 'envelope.json'), `${JSON.stringify(envelope, null, 2)}\n`);
  return { runDir, verdict: writeVerdictForRun(runDir) };
}

class UsageError extends Error {}

async function main() {
  const args = parseCli();
  let result;
  try {
    result = await runAudit(args);
  } catch (err) {
    if (err instanceof UsageError) {
      process.stderr.write(`${TOOL}: ${err.message}\n`);
      process.exit(EXIT_INTERNAL);
    }
    throw err;
  }
  if (result.preflight) {
    process.stderr.write(`${TOOL}: ${result.combined.preflight.message}\n`);
    await emit(result.combined, args);
    process.exit(EXIT_INTERNAL);
  }
  if (result.summary) {
    const auditDir = args.auditDir ?? join(REPO_ROOT, 'audit');
    for (const c of result.summary.components) {
      const brief = relative(process.cwd(), join(auditDir, c.component, 'fix-brief.md'));
      process.stderr.write(`${TOOL}: ${c.component} ${c.headline} — ${brief}\n`);
    }
  }
  await emit(result.combined, args);
  process.exit(result.combined.ok ? 0 : 1);
}

/**
 * The envelope emitted when `checkEnv()` fails: no script has run, so there
 * is nothing to aggregate — the envelope carries the preflight cause instead
 * of a synthetic per-script result (F2). Pure — exported for tests.
 */
export function buildPreflightFailure({ args, envCheck, message, durationMs }) {
  const target = args.all ? '--all' : args.changed ? '--changed' : (args.component ?? 'unknown');
  return {
    schemaVersion: SCHEMA_VERSION,
    tool: TOOL,
    target,
    ok: false,
    preflight: { ok: false, cause: envCheck.cause, command: envCheck.command, message },
    summary: { errors: 0, warnings: 0, info: 0, incomplete: 1 },
    blockers: [message],
    results: [],
    findingsByTool: {},
    meta: {
      totalDurationMs: durationMs,
      scriptsRun: 0,
      parallel: true,
      ciDetected: args.ci,
      layer2Required: false,
    },
  };
}

/**
 * Merge per-script results into a single envelope. Pure — exported for tests.
 *
 * `ci` and `noBrowser` drive two meta fields that the audit-component skill
 * reads to decide whether to execute Layer 2 (MCP browser checks):
 *
 *   meta.ciDetected      — true when --ci was passed OR process.env.CI was set
 *                          at the time of invocation. Surfaces to CI dashboards
 *                          so misconfigured runners are visible.
 *   meta.layer2Required  — true ONLY in interactive local runs (no CI, no
 *                          --no-browser). SKILL.md §BX gates on this flag.
 */
export function aggregate({ targetArg, results, durationMs, ci = false, noBrowser = false, registry = AUDIT_SCRIPTS }) {
  const summary = { errors: 0, warnings: 0, info: 0, incomplete: 0 };
  const blockers = [];
  const findingsByTool = {};
  const reportOnly = new Set(registry.filter(s => s.blocking === false).map(s => s.name));
  const scriptsById = new Map(registry.map(s => [s.id, s]));
  // A script's own `ok` is false whenever it has errors. A report-only script is excused only
  // when those errors are rule findings: it exited 1 with a summary and resolved its target. A
  // crash, a missing envelope or STRUCTURE-NOT-FOUND (a mistyped or missing component) still fails.
  const excused = r =>
    reportOnly.has(r.name) &&
    r.exitCode === 1 &&
    r.summary !== undefined &&
    !(r.findings ?? []).some(f => f.code === 'STRUCTURE-NOT-FOUND');
  let blockingErrors = 0;

  for (const r of results) {
    if (r.summary) {
      summary.errors += r.summary.errors ?? 0;
      summary.warnings += r.summary.warnings ?? 0;
      summary.info += r.summary.info ?? 0;
      if (!reportOnly.has(r.name)) blockingErrors += r.summary.errors ?? 0;
    }
    if (r.findings) {
      findingsByTool[r.name] = [...(findingsByTool[r.name] ?? []), ...r.findings];
      for (const f of r.findings) {
        if (f.severity === 'error' && !reportOnly.has(r.name)) blockers.push(`${r.name}/${f.code}`);
      }
    }
  }

  const ok = blockingErrors === 0 && results.every(r => r.ok || excused(r));

  const rows = results.map(r => {
    const script = scriptsById.get(r.id);
    const status = rowStatus(r, script);
    if (status === ROW_STATUS.CRASHED || status === ROW_STATUS.MISSING_PREREQ) {
      summary.incomplete += 1;
      blockers.push(`${r.name}/${status}`);
    }
    const row = {
      id: r.id,
      name: r.name,
      wave: r.wave,
      ok: r.ok || excused(r),
      status,
      exitCode: r.exitCode,
      durationMs: r.durationMs,
      summary: r.summary ?? null,
      error: r.error ?? null,
    };
    if (r.component !== undefined) row.component = r.component;
    if (r.errorClass) row.errorClass = r.errorClass;
    if (r.deferred) row.deferred = r.deferred;
    if (script?.file) row.file = script.file;
    if (script?.blocking === false) row.blocking = false;
    if (script?.owner) row.owner = script.owner;
    if (script?.requiresBuild) {
      row.requires = script.requiresBuild;
      row.prerequisite = prerequisiteCommand(
        script.requiresBuild,
        r.component ? `src/components/${r.component}` : 'src/components',
      );
    }
    if (script?.recordMeta && r.meta) {
      row.meta = Object.fromEntries(script.recordMeta.filter(k => k in r.meta).map(k => [k, r.meta[k]]));
    }
    return row;
  });

  return {
    schemaVersion: SCHEMA_VERSION,
    tool: TOOL,
    target: targetArg,
    ok,
    summary,
    blockers,
    results: rows,
    findingsByTool,
    meta: {
      totalDurationMs: durationMs,
      scriptsRun: results.length,
      parallel: true,
      ciDetected: ci,
      layer2Required: !ci && !noBrowser,
    },
  };
}

/**
 * Classify a per-script result into the shared row-status enum (F1, F3).
 * A status the runner already decided (a missing script file is `crashed`, a
 * failed prerequisite `missing-prereq`, a deferred item `skipped`) is kept.
 * Otherwise `status: 'ok'` means an envelope reached us — the script ran,
 * whatever its findings say. No summary reached us at all: a script that
 * declares `requiresBuild` is `missing-prereq`; anything else is `crashed`.
 */
function rowStatus(r, script) {
  if (r.status) return r.status;
  if (r.summary !== undefined && r.summary !== null) return ROW_STATUS.OK;
  return script?.requiresBuild ? ROW_STATUS.MISSING_PREREQ : ROW_STATUS.CRASHED;
}

async function emit(combined, args) {
  await writeCombined(combined, args);
  // The combined envelope aggregates every script's, so it is the likeliest to
  // outgrow the pipe buffer; see `flushStdout` for what exiting early drops.
  await flushStdout();
}

async function writeCombined(combined, args) {
  if (args.out) {
    mkdirSync(dirname(args.out), { recursive: true });
    writeFileSync(args.out, JSON.stringify(combined, null, 2), 'utf8');
    process.stderr.write(`${TOOL}: wrote ${args.out}\n`);
    return;
  }
  if (args.json) {
    process.stdout.write(`${JSON.stringify(combined, null, 2)}\n`);
    return;
  }
  // Human summary
  const C = colorize(args.noColor);
  const status = combined.ok ? C.green('OK') : C.red('FAIL');
  process.stdout.write(
    `\n${C.bold('run-all')} on ${C.bold(combined.target)} @ ${combined.meta.depth ?? 'standard'}: ${status} — ${combined.summary.errors} error(s), ${combined.summary.warnings} warning(s), ${combined.summary.info} info\n\n`,
  );
  for (const r of combined.results) {
    const dur = `${r.durationMs}ms`;
    const sym = r.ok ? C.green('✓') : C.red('✗');
    const s = r.summary ?? { errors: 0, warnings: 0, info: 0 };
    const who = r.component ? ` ${r.component}` : '';
    process.stdout.write(
      `  ${sym} ${r.id.padEnd(15)} ${`${r.name}${who}`.padEnd(40)} ${C.gray(dur.padStart(7))}  ${s.errors}E / ${s.warnings}W / ${s.info}I${r.error ? '  ' + C.red('(' + r.error + ')') : ''}\n`,
    );
  }
  if (combined.blockers.length > 0) {
    process.stdout.write(`\n${C.bold('Blockers')} (${combined.blockers.length}):\n`);
    for (const b of combined.blockers.slice(0, 10)) {
      process.stdout.write(`  • ${C.red(b)}\n`);
    }
    if (combined.blockers.length > 10) {
      process.stdout.write(`  ... and ${combined.blockers.length - 10} more.\n`);
    }
  }
  process.stdout.write(`\nTotal: ${combined.meta.totalDurationMs}ms (${combined.meta.scriptsRun} rows, parallel)\n\n`);
}

function colorize(noColor) {
  if (noColor || process.env.NO_COLOR || !process.stdout.isTTY) {
    return { red: s => s, green: s => s, gray: s => s, bold: s => s };
  }
  return {
    red: s => `\x1b[31m${s}\x1b[0m`,
    green: s => `\x1b[32m${s}\x1b[0m`,
    gray: s => `\x1b[90m${s}\x1b[0m`,
    bold: s => `\x1b[1m${s}\x1b[0m`,
  };
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isDirectRun) {
  main().catch(err => {
    process.stderr.write(`${TOOL}: internal error — ${err.stack ?? err.message ?? err}\n`);
    process.exit(EXIT_INTERNAL);
  });
}

export { TOOL, AUDIT_SCRIPTS };
