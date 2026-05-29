#!/usr/bin/env node
/**
 * 06-test-coverage.mjs
 *
 * Reports Vitest test coverage for a `cor-*` component by reading the existing
 * `coverage/coverage-summary.json` (produced by `@vitest/coverage-v8` when
 * `stencil-test --project spec --coverage` is run). With `--run`, executes
 * the test runner first; otherwise expects the report to be present.
 *
 * Strategy:
 *   1. (Optional `--run`) execute `yarn test.dev --coverage` and wait.
 *   2. Read `coverage/coverage-summary.json` (Istanbul-format summary, same
 *      shape produced by Vitest's v8 / istanbul coverage providers).
 *   3. Filter entries to the target component(s) — match by absolute TSX path.
 *   4. Emit { statements, branches, functions, lines, pass80 } per component.
 *
 * Replaces AI work in:
 *   - `.claude/agents/audit-production.md` Phase 5a (unit tests + coverage parse)
 *   - `.claude/skills/audit-component/SKILL.md` Wave 2.10.1 (coverage report)
 *
 * Why default is read-only (no auto-run):
 *   Running the full test suite takes 30-60s. Audit orchestrator callers want
 *   fast scripts; coverage is typically generated once per CI/pre-PR pipeline.
 *
 * Usage:
 *   yarn test.dev --coverage              # generate coverage report (once)
 *   node scripts/audit/06-test-coverage.mjs mud-button --json
 *   node scripts/audit/06-test-coverage.mjs --all --json
 *   node scripts/audit/06-test-coverage.mjs mud-button --run    # force fresh run
 */
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseAuditArgs, defaultUsage } from './lib/cli-args.mjs';
import { resolveComponentPaths, listAllComponents, relativeToRepo, REPO_ROOT } from './lib/component-paths.mjs';
import { buildResult, emit, finding } from './lib/json-output.mjs';
import { EXIT_INTERNAL, exitCodeFromSummary } from './lib/exit-codes.mjs';
import { listChangedComponents } from './lib/changed-components.mjs';

const TOOL = 'test-coverage';

const USAGE = defaultUsage(
  '06-test-coverage',
  'Read existing Vitest coverage report and report per-component coverage % (statements / branches / functions / lines).',
  [
    '',
    'Extra options:',
    '  --run               Run `yarn test.dev --coverage` first (slow; 30-60s)',
    '  --threshold <N>     Pass threshold for each metric (default: 80)',
  ],
);

const DEFAULT_THRESHOLD = 80;
const COVERAGE_REPORT_REL = 'coverage/coverage-summary.json';

async function main() {
  const args = parseAuditArgs({
    toolName: TOOL,
    usage: USAGE,
    extra: {
      run: { type: 'boolean', default: false },
      threshold: { type: 'string', default: String(DEFAULT_THRESHOLD) },
    },
  });
  const t0 = Date.now();
  const threshold = Number(args.extras.threshold);
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 100) {
    process.stderr.write(`${TOOL}: --threshold must be a number 0..100.\n`);
    process.exit(EXIT_INTERNAL);
  }

  const targets = await resolveTargets(args);
  if (!targets.length) {
    if (args.changed) {
      await emit(
        buildResult({
          tool: TOOL,
          target: 'changed',
          findings: [],
          meta: { durationMs: Date.now() - t0, componentsScanned: 0 },
        }),
        args,
      );
      process.exit(0);
    }
    process.stderr.write(`${TOOL}: no components matched.\n`);
    process.exit(EXIT_INTERNAL);
  }

  if (args.extras.run) {
    const runRes = runVitestCoverage();
    if (!runRes.ok) {
      process.stderr.write(`${TOOL}: test runner failed (exit ${runRes.exitCode}). Aborting coverage parse.\n`);
      process.exit(EXIT_INTERNAL);
    }
  }

  const summaryPath = join(REPO_ROOT, COVERAGE_REPORT_REL);
  if (!existsSync(summaryPath)) {
    process.stderr.write(
      `${TOOL}: ${COVERAGE_REPORT_REL} not found. Run \`yarn test --coverage\` first, or pass --run.\n`,
    );
    process.exit(EXIT_INTERNAL);
  }

  let summary;
  try {
    summary = JSON.parse(readFileSync(summaryPath, 'utf8'));
  } catch (err) {
    process.stderr.write(`${TOOL}: failed to parse ${COVERAGE_REPORT_REL}: ${err.message}\n`);
    process.exit(EXIT_INTERNAL);
  }

  const perComponent = targets.map(t => analyzeComponent(t, summary, threshold));
  const findings = perComponent.flatMap(c => c.findings);

  const result = buildResult({
    tool: TOOL,
    target: args.all ? 'all' : args.changed ? 'changed' : targets[0].name,
    findings,
    meta: {
      durationMs: Date.now() - t0,
      componentsScanned: targets.length,
      threshold,
    },
  });

  if (!args.all && !args.changed && perComponent.length === 1) {
    result.meta.coverage = perComponent[0].coverage;
  } else {
    result.meta.coverage = perComponent.map(c => ({
      component: c.componentName,
      coverage: c.coverage,
    }));
  }

  await emit(result, args);
  process.exit(exitCodeFromSummary(result.summary));
}

/**
 * Compute a single component's coverage from the loaded summary. Pure function.
 * Exported for tests.
 *
 * Returns { findings, coverage, componentName }.
 */
export function analyzeComponent(target, summary, threshold = DEFAULT_THRESHOLD) {
  if (!target.found) {
    return {
      findings: [
        finding({
          severity: 'error',
          code: 'STRUCTURE-NOT-FOUND',
          message: `Component "${target.name ?? target.input}" not found.`,
        }),
      ],
      coverage: null,
      componentName: target.name ?? null,
    };
  }

  const tsxAbs = target.paths.tsx;
  // Vitest summaries use absolute paths; on Windows they may have forward or backward slashes
  const normalizedTsx = tsxAbs.replace(/\\/g, '/');
  const matchedKey = Object.keys(summary).find(k => k.replace(/\\/g, '/') === normalizedTsx);

  if (!matchedKey) {
    return {
      findings: [
        finding({
          severity: 'warning',
          code: 'COVERAGE-COMPONENT-MISSING',
          file: relativeToRepo(tsxAbs),
          message: `${target.name}: not present in coverage report — no tests ran against ${relativeToRepo(tsxAbs)}.`,
          fix: 'Add a test/cor-X.spec.tsx file or run yarn test --coverage to regenerate.',
        }),
      ],
      coverage: null,
      componentName: target.name,
    };
  }

  const entry = summary[matchedKey];
  const coverage = {
    statements: percentOf(entry.statements),
    branches: percentOf(entry.branches),
    functions: percentOf(entry.functions),
    lines: percentOf(entry.lines),
  };
  const pass = {
    statements: coverage.statements >= threshold,
    branches: coverage.branches >= threshold,
    functions: coverage.functions >= threshold,
    lines: coverage.lines >= threshold,
  };
  coverage.passAll = Object.values(pass).every(Boolean);

  const findings = [];
  if (!coverage.passAll) {
    const failing = Object.entries(pass)
      .filter(([, v]) => !v)
      .map(([k]) => `${k}=${coverage[k]}%`);
    findings.push(
      finding({
        severity: 'warning',
        code: 'COVERAGE-BELOW-THRESHOLD',
        file: relativeToRepo(tsxAbs),
        message: `${target.name}: coverage below ${threshold}% — ${failing.join(', ')}.`,
        fix: 'Add tests to lift the listed metrics, or lower --threshold when running.',
      }),
    );
  }

  return { findings, coverage, componentName: target.name };
}

function percentOf(metric) {
  if (!metric) return 0;
  if (typeof metric.pct === 'number') return metric.pct;
  if (typeof metric.covered === 'number' && typeof metric.total === 'number' && metric.total > 0) {
    return Number(((metric.covered / metric.total) * 100).toFixed(2));
  }
  return 0;
}

function runVitestCoverage() {
  // `yarn test.dev` invokes `stencil-test --project spec` (Vitest under the hood).
  // Vitest reads coverage providers from package.json devDeps; @vitest/coverage-v8
  // produces a `coverage/coverage-summary.json` compatible with the parsing below.
  const res = spawnSync('yarn', ['stencil-test', '--project', 'spec', '--coverage'], {
    stdio: 'inherit',
    shell: true,
  });
  return { ok: res.status === 0, exitCode: res.status };
}

async function resolveTargets(args) {
  if (args.all) return listAllComponents().map(c => resolveComponentPaths(c.name));
  if (args.changed) return listChangedComponents().map(n => resolveComponentPaths(n));
  return [resolveComponentPaths(args.component)];
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isDirectRun) {
  main().catch(err => {
    process.stderr.write(`${TOOL}: internal error — ${err.stack ?? err.message ?? err}\n`);
    process.exit(EXIT_INTERNAL);
  });
}

export { TOOL, DEFAULT_THRESHOLD, percentOf };
