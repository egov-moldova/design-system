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
 *             E2E deferred); AI legs are advisory and have no row
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
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { REPO_ROOT, componentOfSpec, listAllComponents, normalizeComponentName } from './lib/component-paths.mjs';
import { EXIT_INTERNAL, exitCodeForState } from './lib/exit-codes.mjs';
import { ROW_STATUS, SCHEMA_VERSION, STATE, finding, flushStdout } from './lib/json-output.mjs';
import { resolveHeadManifest } from './lib/figma-manifest.mjs';
import { checkEnv, formatIncomplete } from './lib/env-preflight.mjs';
import { parseCli } from './lib/cli-args.mjs';
import { detectChangedComponents } from './lib/changed-components.mjs';
import { acquireLock, ensureWorktreeStorybook, isValidLockToken, releaseLock } from './lib/storybook-helpers.mjs';
import { figmaToken } from './figma-refs.mjs';
import { DEFERRED_CHECKS, REQUIRED_CHECKS, excuseFor, writeSummary, writeVerdictForRun } from './verdict.mjs';

const TOOL = 'run-all';

/**
 * The check registry. `kind` defaults to 'script' (an audit script spawned
 * with `<target> --json [...args]`); 'lint' runs ESLint + Stylelint on the
 * component's files; 'command' runs a repo-level build; 'deferred' is a row
 * that reports its reason. AI legs have no row: their findings are advisory
 * (Decision 12 of `2026-09-22-audit-depths-sentinel-fixes.md`).
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
];

/** A component's own directory, `src/hidden/<name>` when it lives there instead. */
export function componentDirFor(repoRoot, component) {
  const hidden = `src/hidden/${component}`;
  return existsSync(join(repoRoot, hidden)) && !existsSync(join(repoRoot, 'src/components', component))
    ? hidden
    : `src/components/${component}`;
}

/** Prerequisite commands, in the order they run. `storybook` is started, not run;
 * `coverage` is handled specially in `runPrerequisites` (S11 — its command depends
 * on the run's `auditDir`, and its `ok` depends on parsing the JSON reporter output). */
export const PREREQUISITES = Object.freeze({
  'dx:prepare': { command: ['yarn', 'dx:prepare'] },
  'dx:stencil:once': { command: ['yarn', 'dx:stencil:once'] },
  'coverage': { special: true },
  'storybook': { start: true },
});

/** Relative path of the coverage prerequisite's JSON-reporter output (S11), under `<auditDir>/_run/`. */
export const VITEST_RESULTS_REL = join('_run', 'vitest-results.json');

/**
 * S11 (plan `2026-09-22-audit-depths-sentinel-fixes.md` Decision §6): whether
 * the one vitest run that covers every selected component is `ok` for 06's
 * prerequisite — the results JSON must have parsed, AND (the run exited 0, or
 * every failed spec's component is itself in the selection). A vitest crash
 * that wrote no parseable JSON is never `ok`, regardless of exit code — a
 * stale previous-run results file must never be read as this run's outcome
 * (the caller deletes it before spawning). Pure — exported for tests.
 *
 * @param {object|null} parsed — the JSON-reporter output, or null if unparseable/missing
 * @param {{ exitCode: number|null, components: string[] }} ctx
 * @returns {{ ok: boolean, failedComponents: string[], unmappedSpecs: string[] }}
 */
export function evaluateCoverageResults(parsed, { exitCode, components }) {
  if (!parsed || !Array.isArray(parsed.testResults)) return { ok: false, failedComponents: [], unmappedSpecs: [] };
  const failed = parsed.testResults.filter(t => t.status === 'failed');
  const owners = failed.map(t => componentOfSpec(t.name));
  const failedComponents = [...new Set(owners.filter(Boolean))];
  const unmappedSpecs = failed.filter((t, i) => owners[i] === null).map(t => t.name);
  // A non-zero exit is accounted for only by failed specs that each belong to
  // a selected component; an unmapped failure, or none at all, fails closed.
  const ok = exitCode === 0 || (owners.length > 0 && owners.every(c => c !== null && components.includes(c)));
  return { ok, failedComponents, unmappedSpecs };
}

/** Why the coverage prerequisite is not ok (U5): the cause names what actually failed. Pure. */
export function coverageFailureCause({ parsed, evaluated, exitCode, command, resultsPath, components }) {
  if (!parsed) return `\`${command}\` exited ${exitCode} without a parseable results JSON at ${resultsPath}`;
  if (evaluated.unmappedSpecs.length) {
    return `test(s) failed outside any component directory: ${evaluated.unmappedSpecs.join(', ')}`;
  }
  const foreign = evaluated.failedComponents.filter(c => !components.includes(c));
  if (foreign.length) return `test(s) failed in ${foreign.join(', ')} — not in this run's selection`;
  return `vitest exited ${exitCode} with no failed spec`;
}

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
      return `yarn vitest run --project spec --coverage ${componentDir}/`;
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
  // S11: 06 reads the coverage prerequisite's JSON-reporter output for the
  // COVERAGE-TESTS-FAILED mapping — same `auditDir` the prerequisite wrote it to.
  if (script.id === '06' && opts.auditDir) extraArgs.push('--vitest-results', join(opts.auditDir, VITEST_RESULTS_REL));

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

async function runPrerequisites(needed, { components, deps, auditDir }) {
  const prereqs = new Map();
  for (const id of Object.keys(PREREQUISITES)) {
    if (!needed.has(id)) continue;
    if (id === 'storybook') {
      const sb = await deps.ensureStorybook();
      prereqs.set(id, sb.ok ? { id, ok: true, port: sb.port } : { id, ok: false, cause: sb.cause });
      continue;
    }
    if (id === 'coverage') {
      // S11: one vitest run over every selected component, with a JSON
      // reporter (never per-component reportsDirectory — N startups on
      // --all/--changed). Deleted before spawning so a crash that writes no
      // JSON can never leave a PREVIOUS run's results to be parsed as this
      // one's (that stale-read is exactly the acceptance-bar case).
      const resultsPath = join(auditDir, VITEST_RESULTS_REL);
      rmSync(resultsPath, { force: true });
      // T14: vitest keeps a spec whose path CONTAINS a filter, so without the
      // trailing slash `src/components/mud-button` also runs mud-button-group's.
      const dirs = components.map(c => `${componentDirFor(deps.repoRoot, c)}/`);
      const argv = [
        'yarn',
        'vitest',
        'run',
        '--project',
        'spec',
        '--coverage',
        '--coverage.reportOnFailure',
        '--reporter=json',
        `--outputFile=${resultsPath}`,
        ...dirs,
      ];
      const res = await deps.runCommand(argv[0], argv.slice(1), { cwd: deps.repoRoot });
      let parsed = null;
      try {
        parsed = JSON.parse(readFileSync(resultsPath, 'utf8'));
      } catch {
        parsed = null;
      }
      const evaluated = evaluateCoverageResults(parsed, { exitCode: res.exitCode, components });
      prereqs.set(
        id,
        evaluated.ok
          ? { id, ok: true, command: argv.join(' ') }
          : {
              id,
              ok: false,
              command: argv.join(' '),
              cause: coverageFailureCause({
                parsed,
                evaluated,
                exitCode: res.exitCode,
                command: argv.join(' '),
                resultsPath,
                components,
              }),
            },
      );
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

/**
 * `{ ok: true, cause: null, names }` | `{ ok: false, cause }` — a `--changed`
 * detector failure (no base ref, `git diff` failed) is distinct from an empty
 * selection (Decision §9): `runAudit` maps `ok: false` to INCOMPLETE, never
 * to "nothing changed, PASS". Exported for tests.
 */
export function resolveComponents(args, deps) {
  if (args.all) return { ok: true, cause: null, names: deps.listAll() };
  if (args.changed) return deps.detectChanged();
  const name = normalizeComponentName(args.component);
  return { ok: true, cause: null, names: name ? [name] : null };
}

/** The one shape every refused run returns: no script ran, INCOMPLETE naming the lock (T7). */
function lockRefusal({ args, cause, lockPath, t0 }) {
  const message = `INCOMPLETE: ${cause} — run: (wait for the other audit to finish, or remove ${lockPath} if it is stale)`;
  const combined = buildPreflightFailure({
    args,
    envCheck: { cause, command: null },
    message,
    durationMs: Date.now() - t0,
  });
  return { combined, perComponent: [], preflight: true, lockRefused: true, message, cause };
}

/**
 * Whether this run writes under `<auditDir>/_run/` — the summary (`--verdict`)
 * or the coverage prerequisite's results file — and so must hold the audit-dir
 * lock (Decision §3). A leg's `--only 09` evidence run writes neither and never
 * contends with a sibling leg's.
 */
function writesRunDir(args, registry) {
  return (
    Boolean(args.verdict) ||
    selectScripts(args, { figma: null, registry }).some(s =>
      (PREREQUISITES_FOR[s.requiresBuild] ?? []).includes('coverage'),
    )
  );
}

/** Whether this run writes `dist/` or starts Storybook — a prerequisite, or an `exclusive` build row (T6). */
function touchesWorktree(needed, scripts) {
  return needed.size > 0 || scripts.some(s => s.exclusive);
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
    detectChanged: () => detectChangedComponents(),
    listAll: () => listAllComponents().map(c => c.name),
    ensureStorybook: () => ensureWorktreeStorybook({ repoRoot }),
    // R3: the worktree lock guards `dist/` and the worktree Storybook record —
    // taken only when this run will build or start Storybook
    // (`touchesWorktree`), never for a `quick` run that touches neither.
    worktreeLockPath: join(repoRoot, 'audit', '_run', '.worktree.lock'),
    acquireLock,
    releaseLock,
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

  // T7 / R3: the audit-dir lock guards everything this run writes under
  // `<auditDir>/_run/` and each `verdict.json`, so it is taken before any work
  // — a held lock is INCOMPLETE, never a late throw after the builds ran. When
  // `verdict.mjs`'s `runFresh` spawned this process it already holds that
  // lock and hands its token via `AUDIT_LOCK_TOKEN` — honoured only if the
  // lock file still names it (nonce, live pid, same start time); a forged or
  // stale token, or none at all, takes the lock here instead. Order: the
  // audit-dir lock first, the worktree lock inside it — the order runFresh
  // and its child already follow.
  const auditLockPath = join(auditDir, '_run', '.lock');
  let auditLockToken = null;
  if (writesRunDir(args, d.registry)) {
    let existingLock = null;
    try {
      existingLock = JSON.parse(readFileSync(auditLockPath, 'utf8'));
    } catch {
      existingLock = null;
    }
    if (!isValidLockToken(existingLock, d.env.AUDIT_LOCK_TOKEN)) {
      const lock = d.acquireLock(auditLockPath);
      if (!lock.ok) return lockRefusal({ args, cause: lock.cause, lockPath: auditLockPath, t0 });
      auditLockToken = lock.token;
    }
  }
  try {
    return await auditUnderLock({ args, d, repoRoot, auditDir, targetArg, auditBase, t0 });
  } finally {
    if (auditLockToken) d.releaseLock(auditLockPath, auditLockToken);
  }
}

/** `runAudit`'s body, run while the audit-dir lock (when this run needs it) is held. */
async function auditUnderLock({ args, d, repoRoot, auditDir, targetArg, auditBase, t0 }) {
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

  const detection = resolveComponents(args, d);
  if (!detection.ok) {
    // S5 / Decision §9: a broken `--changed` detector (no base ref, `git diff`
    // failed) is INCOMPLETE — never "nothing changed, PASS". Reuses the
    // preflight-failure shape: no script has run, so nothing to aggregate.
    const detectCheck = { cause: detection.cause, command: 'git diff <base>...HEAD' };
    const message = `INCOMPLETE: ${detection.cause} — run: ${detectCheck.command}`;
    const combined = buildPreflightFailure({ args, envCheck: detectCheck, message, durationMs: Date.now() - t0 });
    const result = { combined, perComponent: [], preflight: true };
    if (args.verdict) {
      result.summary = writeSummary(auditDir, {
        depth: args.depth,
        runs: [],
        preflight: { cause: detection.cause, command: detectCheck.command, message },
      });
    }
    return result;
  }
  const components = detection.names;
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

  // R3 / T6: take the worktree lock whenever this run builds `dist/` or starts
  // Storybook — a prerequisite or an `exclusive` build row. A `quick` run
  // touches neither and never blocks on, or is blocked by, one. Released in
  // `finally` below, before this function returns (Decision §3's "no self-block").
  let lockToken = null;
  if (touchesWorktree(needed, [...sharedScripts, ...plans.flatMap(p => p.scripts)])) {
    const lock = d.acquireLock(d.worktreeLockPath);
    if (!lock.ok) {
      const result = lockRefusal({ args, cause: lock.cause, lockPath: d.worktreeLockPath, t0 });
      if (args.verdict) {
        // The audit-dir lock is ours (taken in runAudit), so the summary may be written.
        result.summary = writeSummary(auditDir, {
          depth: args.depth,
          runs: [],
          preflight: { cause: lock.cause, command: null, message: result.message },
        });
      }
      return result;
    }
    lockToken = lock.token;
  }

  try {
    const prereqs = await runPrerequisites(needed, { components, deps: d, auditDir });
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
      auditDir,
    };

    // Repo-level rows run once. Wave D's builds rewrite dist/, so they run after every component.
    const sharedEarly = await runWaves(
      sharedScripts.filter(s => s.wave !== 'D'),
      { ...common, component: null },
    );
    const perComponentResults = [];
    for (const plan of plans) {
      const scripts = plan.scripts.filter(s => s.perComponent !== false);
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
        repoRoot,
      });
      envelope.audit = {
        ...auditBase,
        component: plan.component,
        figma: plan.figma,
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
            repoRoot,
          });
    combined.components = components;
    combined.meta.depth = args.depth;
    combined.meta.totalDurationMs = Date.now() - t0;

    const result = { combined, perComponent };
    if (args.verdict) {
      const runs = perComponent.map(({ component, envelope }) => writeRun(auditDir, component, d.runId, envelope));
      // S5 / Decision §2: with zero components selected, no per-component verdict
      // carries the repo-level rows' (03, ...) outcome — `combined` is the only
      // place it lives, so it is handed to writeSummary explicitly.
      const repoLevel =
        components.length === 0
          ? {
              ok: combined.ok,
              incomplete: combined.results.some(
                r => r.status === ROW_STATUS.CRASHED || r.status === ROW_STATUS.MISSING_PREREQ,
              ),
            }
          : null;
      result.summary = writeSummary(auditDir, { depth: args.depth, runs, repoLevel });
    }
    return result;
  } finally {
    if (lockToken) d.releaseLock(d.worktreeLockPath, lockToken);
  }
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
    // T7: another audit holding a lock is INCOMPLETE (3), not an internal error.
    process.exit(result.lockRefused ? exitCodeForState(STATE.INCOMPLETE) : EXIT_INTERNAL);
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
export function aggregate({
  targetArg,
  results,
  durationMs,
  ci = false,
  noBrowser = false,
  registry = AUDIT_SCRIPTS,
  repoRoot = REPO_ROOT,
}) {
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
    const status = rowStatus(r);
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
        r.component ? componentDirFor(repoRoot, r.component) : 'src/components',
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
 * Classify a per-script result into the shared row-status enum (F1, F3, S10).
 * A status the runner already decided (a missing script file is `crashed`, a
 * failed prerequisite `missing-prereq` — set by `prerequisiteFailure` in
 * `runRow`, before the script is even spawned — a deferred item `skipped`) is
 * kept as-is. Otherwise `status: 'ok'` means an envelope reached us — the
 * script ran, whatever its findings say. No summary and no status reached us
 * at all: the prerequisite already succeeded (or the row never had one) by
 * the time we get here, so this is always the script itself crashing —
 * `crashed`, never `missing-prereq` (a real prerequisite failure would have
 * set `r.status` already and returned above).
 */
function rowStatus(r) {
  if (r.status) return r.status;
  if (r.summary !== undefined && r.summary !== null) return ROW_STATUS.OK;
  return ROW_STATUS.CRASHED;
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

// `parseCli` now lives in lib/cli-args.mjs (Decision §8); re-exported here so
// existing importers of run-all.mjs keep working unchanged.
export { TOOL, AUDIT_SCRIPTS, parseCli };
