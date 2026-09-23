#!/usr/bin/env node
/**
 * regression-check.mjs
 *
 * Re-runs the orchestrator against the components captured in a baseline
 * snapshot, normalizes the output, and asserts:
 *
 *   - Same critical (error-severity) findings        — exit 1 if mismatch
 *   - Same high findings                              — exit 1 if mismatch
 *   - Warnings may differ by ≤ N% (default 5)         — exit 1 above threshold
 *   - Info-level changes are ignored                  — pass-through
 *
 * Use this BEFORE merging any slim-down PR. The plan's quality bar is:
 * "If the script misses a finding the AI used to catch, NU migrăm acea
 * bucată — rămâne la AI."
 *
 * Usage:
 *   node scripts/audit/regression-baseline.mjs     # capture baseline
 *   # ... do slim-down work ...
 *   node scripts/audit/regression-check.mjs        # verify no regression
 *
 * Exit codes:
 *   0  All checks pass; no critical/high regression
 *   1  Regression detected (or warnings beyond tolerance)
 *   2  Internal error (missing baseline, invalid JSON, a depth mismatch, etc.)
 *
 * Runs at the depth the baseline recorded (`resolveCheckDepth`) — comparing
 * across depths is refused rather than silently diffing mismatched runs.
 */
import { spawn } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { REPO_ROOT } from './lib/component-paths.mjs';
import { DEPTHS } from './lib/cli-args.mjs';
import { normalizeEnvelope, DEFAULT_OUT as DEFAULT_BASELINE } from './regression-baseline.mjs';

const TOOL = 'regression-check';

const USAGE = `Usage: node scripts/audit/regression-check.mjs [options]

Re-run the orchestrator on the components captured in a baseline snapshot and
fail if critical/high findings changed or warnings drift beyond tolerance.

Options:
  --baseline <file>       Path to baseline JSON (default: ${DEFAULT_BASELINE})
  --depth <d>             quick | standard | deep. Must match the depth the
                          baseline was captured at — comparing across depths
                          is refused (see resolveCheckDepth). Default: the
                          baseline's own recorded depth.
  --warning-tolerance <%> Allowed warning drift (default: 5)
  --json                  Emit comparison result as JSON to stdout
  --help, -h              Show this help`;

/**
 * Resolve the depth `regression-check` re-runs at (plan
 * `2026-09-21-audit-component-depths.md` Phase 5 task 3): the baseline's own
 * recorded depth, unless the caller names a depth that disagrees with it —
 * comparing across depths is refused rather than silently diffing mismatched
 * runs (a `quick` re-run against a `standard` baseline would report every
 * Wave B/C row as a newly-`skipped` regression, which is a depth mismatch,
 * not a real one). Pure.
 *
 * @returns {{ depth: string } | { error: string }}
 */
export function resolveCheckDepth({ baselineDepth, requestedDepth } = {}) {
  if (!baselineDepth) {
    return {
      error: 'baseline has no recorded depth (captured before Phase 5) — re-capture with regression-baseline.mjs',
    };
  }
  if (requestedDepth !== undefined && requestedDepth !== baselineDepth) {
    return {
      error: `baseline was captured at depth "${baselineDepth}"; --depth "${requestedDepth}" given — refusing to compare across depths`,
    };
  }
  return { depth: baselineDepth };
}

function parseCli() {
  let parsed;
  try {
    parsed = parseArgs({
      args: process.argv.slice(2),
      options: {
        'baseline': { type: 'string', default: DEFAULT_BASELINE },
        'depth': { type: 'string' },
        'warning-tolerance': { type: 'string', default: '5' },
        'json': { type: 'boolean', default: false },
        'help': { type: 'boolean', short: 'h', default: false },
      },
      allowPositionals: false,
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
  if (parsed.values.depth !== undefined && !DEPTHS.includes(parsed.values.depth)) {
    process.stderr.write(`${TOOL}: --depth must be one of ${DEPTHS.join(', ')} (got "${parsed.values.depth}").\n`);
    process.exit(2);
  }
  const tol = Number(parsed.values['warning-tolerance']);
  if (!Number.isFinite(tol) || tol < 0) {
    process.stderr.write(`${TOOL}: --warning-tolerance must be >= 0.\n`);
    process.exit(2);
  }
  return {
    baseline: parsed.values.baseline,
    depth: parsed.values.depth,
    warningTolerance: tol,
    json: parsed.values.json,
  };
}

async function main() {
  const args = parseCli();
  const t0 = Date.now();

  const baselinePath = join(REPO_ROOT, args.baseline);
  if (!existsSync(baselinePath)) {
    process.stderr.write(
      `${TOOL}: baseline ${args.baseline} not found. Run \`node scripts/audit/regression-baseline.mjs\` first.\n`,
    );
    process.exit(2);
  }

  const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
  const baselineComponents = Object.keys(baseline.components ?? {});
  if (baselineComponents.length === 0) {
    process.stderr.write(`${TOOL}: baseline has no components recorded.\n`);
    process.exit(2);
  }

  const resolvedDepth = resolveCheckDepth({ baselineDepth: baseline.meta?.depth, requestedDepth: args.depth });
  if (resolvedDepth.error) {
    process.stderr.write(`${TOOL}: ${resolvedDepth.error}\n`);
    process.exit(2);
  }
  const depth = resolvedDepth.depth;
  const includeBrowser = !!baseline.meta?.includeBrowser;
  const skip = baseline.meta?.skip ?? '06,08';

  process.stderr.write(
    `${TOOL}: re-running orchestrator for ${baselineComponents.length} component(s) from baseline ` +
      `(${args.baseline}, depth ${depth})...\n`,
  );

  const perComponent = [];
  let hasRegression = false;

  for (const name of baselineComponents) {
    const t = Date.now();
    const current = await runOrchestrator(name, { depth, includeBrowser, skip });
    const normalized = normalizeEnvelope(current);
    const diff = compareEnvelopes(baseline.components[name], normalized, { warningTolerance: args.warningTolerance });
    perComponent.push({ component: name, diff, durationMs: Date.now() - t });

    const status = diff.regressed ? 'REGRESSION' : 'OK';
    process.stderr.write(
      `${TOOL}:   ${name}: ${status} — ` +
        `E ${diff.errors.unchanged}/${diff.errors.added}/${diff.errors.removed} ` +
        `H ${diff.warnings.unchanged}/${diff.warnings.added}/${diff.warnings.removed} ` +
        `(unchanged/added/removed)\n`,
    );

    if (diff.regressed) hasRegression = true;
  }

  const result = {
    schemaVersion: '1.0.0',
    tool: TOOL,
    baseline: args.baseline,
    capturedAt: new Date().toISOString(),
    regressed: hasRegression,
    perComponent,
    meta: { durationMs: Date.now() - t0, depth, warningTolerance: args.warningTolerance },
  };

  if (args.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    process.stdout.write(renderSummary(result));
  }

  process.exit(hasRegression ? 1 : 0);
}

/**
 * Diff two normalized orchestrator envelopes. Pure — exported for tests.
 *
 * Returns:
 *   {
 *     regressed: bool,
 *     errors: { added: [...], removed: [...], unchanged: count, reasons: [...] },
 *     warnings: { ... same shape },
 *     blockers: { addedDelta: [...], removedDelta: [...] }
 *   }
 *
 * A finding is identified by (toolName, code, file) — the trio that makes it
 * stable across re-runs. Line numbers may shift if code is reformatted, so
 * they're excluded from the identity.
 */
export function compareEnvelopes(baselineEnv, currentEnv, { warningTolerance = 5 } = {}) {
  const baseErrors = collectFindings(baselineEnv, 'error');
  const baseWarnings = collectFindings(baselineEnv, 'warning');
  const curErrors = collectFindings(currentEnv, 'error');
  const curWarnings = collectFindings(currentEnv, 'warning');

  const errors = diffFindingSets(baseErrors, curErrors);
  const warnings = diffFindingSets(baseWarnings, curWarnings);

  const blockers = {
    added: (currentEnv.blockers ?? []).filter(b => !(baselineEnv.blockers ?? []).includes(b)),
    removed: (baselineEnv.blockers ?? []).filter(b => !(currentEnv.blockers ?? []).includes(b)),
  };

  const rows = diffRowStatuses(baselineEnv.results ?? [], currentEnv.results ?? []);

  // Quality rule from the plan:
  //   - critical/high (error) changes are always regression
  //   - warnings: drift up to N% allowed if direction is "more" (script catches more, never fewer)
  const baselineWarningCount = baseWarnings.size;
  const warningDriftPct =
    baselineWarningCount > 0
      ? (Math.abs(warnings.removed.length - warnings.added.length) / baselineWarningCount) * 100
      : 0;

  const reasons = [];
  if (errors.added.length > 0) reasons.push(`+${errors.added.length} new error(s)`);
  if (errors.removed.length > 0) reasons.push(`${errors.removed.length} error(s) silently disappeared (CRITICAL)`);
  if (warnings.removed.length > 0) reasons.push(`${warnings.removed.length} warning(s) silently disappeared`);
  if (warningDriftPct > warningTolerance)
    reasons.push(`warning drift ${warningDriftPct.toFixed(1)}% exceeds tolerance ${warningTolerance}%`);
  if (rows.length > 0) {
    reasons.push(
      `${rows.length} row(s) newly ${rows.map(r => r.to).join('/')}: ${rows.map(r => `${r.name}(${r.from}→${r.to})`).join(', ')}`,
    );
  }

  const regressed =
    errors.added.length > 0 ||
    errors.removed.length > 0 ||
    warnings.removed.length > 0 ||
    warningDriftPct > warningTolerance ||
    rows.length > 0;

  return { regressed, errors, warnings, blockers, rows, warningDriftPct, reasons };
}

/**
 * A row that used to run (`status: 'ok'`, i.e. it produced a summary —
 * including a baseline captured before `run-all.mjs` wrote `status`, where a
 * present `summary` means the same thing) and now doesn't — `crashed`,
 * `missing-prereq`, or `skipped` — is a regression even when its baseline had
 * zero findings (plan Phase 1 task 2): the earlier bug (F1) was exactly a
 * crashed row that no findings-based diff could ever see. Pure — exported for
 * tests.
 */
const REGRESSED_ROW_STATUSES = new Set(['crashed', 'missing-prereq', 'skipped']);

export function diffRowStatuses(baselineRows, currentRows) {
  const baseById = new Map(baselineRows.map(r => [r.id, r]));
  const newlyBroken = [];
  for (const cur of currentRows) {
    const base = baseById.get(cur.id);
    if (!base) continue; // a row absent from the baseline entirely is not "newly" anything
    const fromStatus = rowStatusOf(base);
    const toStatus = rowStatusOf(cur);
    if (fromStatus === 'ok' && REGRESSED_ROW_STATUSES.has(toStatus)) {
      newlyBroken.push({ id: cur.id, name: cur.name, from: fromStatus, to: toStatus });
    }
  }
  return newlyBroken;
}

function rowStatusOf(row) {
  if (row.status) return row.status;
  // Pre-status baselines (captured before this field existed): a present
  // `summary` is exactly what `run-all.mjs`'s own classifier treats as 'ok'.
  return row.summary ? 'ok' : 'crashed';
}

/**
 * Walk findingsByTool and collect a Map keyed by `${tool}|${code}|${file}` so
 * duplicate identical findings (same file, multiple lines) collapse to one
 * entry. Line numbers are appended to the value for context but ignored in the
 * key — keeps the diff stable across formatter shuffles.
 */
function collectFindings(envelope, severity) {
  const result = new Map();
  const byTool = envelope.findingsByTool ?? {};
  for (const [toolName, findings] of Object.entries(byTool)) {
    for (const f of findings) {
      if (f.severity !== severity) continue;
      const key = `${toolName}|${f.code}|${f.file ?? ''}`;
      if (!result.has(key)) {
        result.set(key, { key, tool: toolName, code: f.code, file: f.file, messages: [], lines: [] });
      }
      const entry = result.get(key);
      entry.messages.push(f.message);
      if (f.line !== undefined) entry.lines.push(f.line);
    }
  }
  return result;
}

function diffFindingSets(baseSet, curSet) {
  const added = [];
  const removed = [];
  let unchanged = 0;
  for (const [key, val] of curSet) {
    if (baseSet.has(key)) unchanged++;
    else added.push(val);
  }
  for (const [key, val] of baseSet) {
    if (!curSet.has(key)) removed.push(val);
  }
  return { added, removed, unchanged };
}

function runOrchestrator(componentName, { depth, includeBrowser, skip }) {
  const scriptPath = join(REPO_ROOT, 'scripts', 'audit', 'run-all.mjs');
  const cliArgs = [scriptPath, componentName, '--json', '--depth', depth];
  if (!includeBrowser) cliArgs.push('--no-browser');
  if (skip) cliArgs.push('--skip', skip);

  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    const proc = spawn(process.execPath, cliArgs, { windowsHide: true });
    proc.stdout.on('data', chunk => {
      stdout += chunk;
    });
    proc.stderr.on('data', chunk => {
      stderr += chunk;
    });
    proc.on('error', reject);
    proc.on('close', () => {
      try {
        resolve(JSON.parse(stdout));
      } catch (err) {
        reject(new Error(`failed to parse run-all output: ${err.message}\nstderr: ${stderr.slice(0, 500)}`));
      }
    });
  });
}

function renderSummary(result) {
  const lines = [];
  const status = result.regressed ? 'REGRESSION DETECTED' : 'PASS — no critical/high regression';
  lines.push('');
  lines.push(`Regression check: ${status}`);
  lines.push(`Baseline: ${result.baseline}`);
  lines.push(`Components checked: ${result.perComponent.length}`);
  lines.push('');
  for (const c of result.perComponent) {
    const sym = c.diff.regressed ? '✗' : '✓';
    lines.push(`  ${sym} ${c.component}`);
    if (c.diff.errors.added.length > 0) {
      lines.push(`    ↑ NEW errors:`);
      for (const e of c.diff.errors.added) lines.push(`      + ${e.tool}/${e.code} ${e.file ?? ''}`);
    }
    if (c.diff.errors.removed.length > 0) {
      lines.push(`    ↓ MISSING errors (script regressed):`);
      for (const e of c.diff.errors.removed) lines.push(`      - ${e.tool}/${e.code} ${e.file ?? ''}`);
    }
    if (c.diff.warnings.removed.length > 0) {
      lines.push(`    ↓ MISSING warnings:`);
      for (const e of c.diff.warnings.removed) lines.push(`      - ${e.tool}/${e.code} ${e.file ?? ''}`);
    }
    if ((c.diff.rows ?? []).length > 0) {
      lines.push(`    ↓ NEWLY broken rows:`);
      for (const r of c.diff.rows) lines.push(`      - ${r.name} (${r.id}): ${r.from} → ${r.to}`);
    }
    if (c.diff.reasons.length > 0) {
      lines.push(`    Reason(s): ${c.diff.reasons.join('; ')}`);
    }
  }
  lines.push('');
  return lines.join('\n');
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isDirectRun) {
  main().catch(err => {
    process.stderr.write(`${TOOL}: internal error — ${err.stack ?? err.message ?? err}\n`);
    process.exit(2);
  });
}

export { TOOL };
