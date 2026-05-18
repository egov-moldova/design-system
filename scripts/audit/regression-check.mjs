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
 *   2  Internal error (missing baseline, invalid JSON, etc.)
 */
import { spawn } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { REPO_ROOT } from './lib/component-paths.mjs';
import { normalizeEnvelope, DEFAULT_OUT as DEFAULT_BASELINE } from './regression-baseline.mjs';

const TOOL = 'regression-check';

const USAGE = `Usage: node scripts/audit/regression-check.mjs [options]

Re-run the orchestrator on the components captured in a baseline snapshot and
fail if critical/high findings changed or warnings drift beyond tolerance.

Options:
  --baseline <file>       Path to baseline JSON (default: ${DEFAULT_BASELINE})
  --warning-tolerance <%> Allowed warning drift (default: 5)
  --json                  Emit comparison result as JSON to stdout
  --help, -h              Show this help`;

function parseCli() {
  let parsed;
  try {
    parsed = parseArgs({
      args: process.argv.slice(2),
      options: {
        'baseline': { type: 'string', default: DEFAULT_BASELINE },
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
  const tol = Number(parsed.values['warning-tolerance']);
  if (!Number.isFinite(tol) || tol < 0) {
    process.stderr.write(`${TOOL}: --warning-tolerance must be >= 0.\n`);
    process.exit(2);
  }
  return {
    baseline: parsed.values.baseline,
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

  const includeBrowser = !!baseline.meta?.includeBrowser;
  const skip = baseline.meta?.skip ?? '06,08';

  process.stderr.write(
    `${TOOL}: re-running orchestrator for ${baselineComponents.length} component(s) from baseline (${args.baseline})...\n`,
  );

  const perComponent = [];
  let hasRegression = false;

  for (const name of baselineComponents) {
    const t = Date.now();
    const current = await runOrchestrator(name, { includeBrowser, skip });
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
    meta: { durationMs: Date.now() - t0, warningTolerance: args.warningTolerance },
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

  const regressed =
    errors.added.length > 0 ||
    errors.removed.length > 0 ||
    warnings.removed.length > 0 ||
    warningDriftPct > warningTolerance;

  return { regressed, errors, warnings, blockers, warningDriftPct, reasons };
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

function runOrchestrator(componentName, { includeBrowser, skip }) {
  const scriptPath = join(REPO_ROOT, 'scripts', 'audit', 'run-all.mjs');
  const cliArgs = [scriptPath, componentName, '--json'];
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
