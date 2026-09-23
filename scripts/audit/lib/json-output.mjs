/**
 * Standard JSON envelope produced by every scripts/audit/* tool.
 *
 * Shape (schemaVersion 1.4.0 — additive over every earlier minor; existing
 * fields keep their meaning):
 *   {
 *     "schemaVersion": "1.4.0",
 *     "tool": "stencil-antipatterns",
 *     "target": "mud-button",               // component name OR "all" OR a glob
 *     "ok": true,                            // false iff summary.errors > 0
 *     "summary": { "errors": 0, "warnings": 2, "info": 5 },
 *     "findings": [ { severity, code, file, line, column?, message, snippet?, fix?, noTarget?, notApplicable? } ],
 *     "meta": { "durationMs": 230, "filesScanned": 12, "tool": "stencil-antipatterns" }
 *   }
 *
 * What each minor added, over the `1.0.0` baseline:
 *   1.1.0 — `run-all.mjs`'s combined envelope also carries a `status` per row
 *           (`ROW_STATUS`, below).
 *   1.2.0 — no shape change; the constant was bumped for the AI-leg row and
 *           verdict schemas this module also defines (see below).
 *   1.3.0 — a finding may carry `noTarget: true`: "this required row checked
 *           nothing" (plan `2026-09-22-audit-depths-sentinel-fixes.md`
 *           Decision §5). `verdict.mjs` maps it to an INCOMPLETE entry on a
 *           required row, never a counted error or warning; on a row the
 *           depth does not require, to a warning, counted as one.
 *   1.4.0 — a finding may carry `notApplicable: true` (severity `info`): the
 *           check does not apply to this component, and the message says why
 *           (Decision 13). `verdict.mjs` shows it as the row's `note`.
 *
 * Severity is one of: "error" | "warning" | "info".
 *
 * Callers should NOT add fields outside the envelope; AI workflows consume this
 * schema directly and a stable shape is part of the quality contract.
 *
 * This module also defines the shared schema `verdict.mjs` (Phase 2) and the
 * AI legs (Phase 2/3) build against — `state`, `level`, per-row `status`, and
 * their own `schemaVersion`s. Landing it here, ahead of
 * any consumer, is deliberate (plan `2026-09-21-audit-component-depths.md`
 * Phase 1): every producer and the one consumer read the same enum.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';

export const SCHEMA_VERSION = '1.4.0';

/**
 * The major number of a `<major>.<minor>.<patch>` schema version, or null for
 * anything else — the one rule for "is this document a version I can read".
 */
export function schemaMajor(version) {
  const m = String(version ?? '').match(/^(\d+)\./);
  return m ? Number(m[1]) : null;
}

/**
 * `verdict.json`'s overall state (Design §1). First match wins, decided by
 * `verdict.mjs` (Phase 2) — this module only names the four values.
 */
export const STATE = Object.freeze({
  INCOMPLETE: 'INCOMPLETE',
  FAIL: 'FAIL',
  NEEDS_DECISION: 'NEEDS-DECISION',
  PASS: 'PASS',
});
export const STATES = Object.freeze(Object.values(STATE));

/** `verdict.json`'s `level`, present only on `state: PASS` (Design §1). */
export const LEVEL = Object.freeze({
  CLEAN_STATIC: 'CLEAN-STATIC',
  MERGE_READY: 'MERGE-READY',
  PRODUCTION_READY: 'PRODUCTION-READY',
});
export const LEVELS = Object.freeze(Object.values(LEVEL));

/**
 * Per-row status a producer (an audit script, or `run-all.mjs` aggregating
 * them) can report, distinct from the row's `ok` — a row can be `status:
 * 'ok'` (it ran) and still carry error-severity findings. `crashed` and
 * `missing-prereq` are both "no summary reached us"; `run-all.mjs` tells
 * them apart by whether the script declares `requiresBuild`. `skipped` is a
 * required-for-this-depth check that did not run (Phase 2's `--depth`).
 */
export const ROW_STATUS = Object.freeze({
  OK: 'ok',
  CRASHED: 'crashed',
  MISSING_PREREQ: 'missing-prereq',
  SKIPPED: 'skipped',
});
export const ROW_STATUSES = Object.freeze(Object.values(ROW_STATUS));

export function isValidState(state) {
  return STATES.includes(state);
}

export function isValidLevel(level) {
  return LEVELS.includes(level);
}

export function isValidRowStatus(status) {
  return ROW_STATUSES.includes(status);
}

/**
 * `schemaVersion` written into `audit/<component>/verdict.json` (Phase 2).
 * 1.1.0 (plan `2026-09-22-audit-depths-sentinel-fixes.md`) added `awaitingLegs`
 * and `warnings`. 2.0.0 (Decision 12 of that plan) removes `awaitingLegs` and
 * `aiLegs` — breaking, but no released reader uses either: AI legs are advisory
 * at every depth now. Also 2.0.0: a row may carry `note` (Decision 13, a
 * not-applicable check's reason). The run directory is not here: it is
 * per-run, so it lives in `_run/summary.json`.
 */
export const VERDICT_SCHEMA_VERSION = '2.0.0';

/**
 * `schemaVersion` an AI leg writes into its own `ai-findings.json` (Phase
 * 2/3). A file with an unknown major version is ignored and named in the
 * verdict's notes; an unknown minor is accepted — `verdict.mjs` owns that check.
 */
export const AI_FINDINGS_SCHEMA_VERSION = '1.0.0';

/**
 * Build a normalized result object from raw findings.
 *
 * @param {object} opts
 * @param {string} opts.tool      — short kebab-case tool name (e.g. "stencil-antipatterns")
 * @param {string} opts.target    — component name, "all", or glob
 * @param {Array<{severity:string, code:string, file?:string, line?:number, column?:number, message:string, snippet?:string, fix?:string}>} opts.findings
 * @param {object} [opts.meta]    — extra metadata (durationMs, filesScanned, etc.)
 * @returns {object} normalized result
 */
export function buildResult({ tool, target, findings = [], meta = {} }) {
  const summary = summarize(findings);
  return {
    schemaVersion: SCHEMA_VERSION,
    tool,
    target,
    ok: summary.errors === 0,
    summary,
    findings,
    meta: { ...meta, tool },
  };
}

function summarize(findings) {
  const summary = { errors: 0, warnings: 0, info: 0 };
  for (const f of findings) {
    if (f.severity === 'error') summary.errors++;
    else if (f.severity === 'warning') summary.warnings++;
    else if (f.severity === 'info') summary.info++;
  }
  return summary;
}

/**
 * Print result to stdout or write to file. Honors --json (compact) vs human-readable.
 *
 * @param {object} result          — output of buildResult()
 * @param {object} opts
 * @param {boolean} [opts.json]    — emit JSON (default true if no --out and no TTY)
 * @param {string}  [opts.out]     — write JSON to this file (also still echo summary line to stderr)
 * @param {boolean} [opts.vscode]  — append vscode://file links to findings in human mode
 * @param {boolean} [opts.noColor] — disable ANSI colors
 */
export async function emit(result, opts = {}) {
  await writeResult(result, opts);
  await flushStdout();
}

/**
 * Resolve once everything queued on stdout has been handed to the OS.
 *
 * On a pipe, `process.stdout.write` is asynchronous, and every audit script
 * calls `process.exit()` right after `await emit(...)`. Exiting drops whatever
 * the kernel pipe buffer had not yet accepted, so an envelope larger than that
 * buffer arrived cut off at exactly 65536 bytes, with exit 0 — and `run-all.mjs`,
 * which reads each script's `--json` through a pipe, then failed to parse it.
 * An empty write's callback fires only after every earlier write has flushed.
 * Baseline: `node scripts/audit/10-contrast-pairs.mjs mud-date-picker --json | wc -c`
 * -> 65536 before this, while `--out` wrote the full 75560-byte envelope.
 */
export function flushStdout() {
  return new Promise(resolve => process.stdout.write('', resolve));
}

async function writeResult(result, opts) {
  if (opts.out) {
    await fs.mkdir(path.dirname(path.resolve(opts.out)), { recursive: true });
    await fs.writeFile(opts.out, JSON.stringify(result, null, 2), 'utf8');
    process.stderr.write(`${result.tool}: wrote ${result.findings.length} finding(s) to ${opts.out}\n`);
    return;
  }

  if (opts.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  // Human-readable
  const C = colorize(opts.noColor);
  const { summary } = result;
  process.stdout.write(
    `\n${C.bold(result.tool)} on ${C.bold(result.target)}: ` +
      `${C.red(`${summary.errors} error`)}${summary.errors === 1 ? '' : 's'}, ` +
      `${C.yellow(`${summary.warnings} warning`)}${summary.warnings === 1 ? '' : 's'}, ` +
      `${C.gray(`${summary.info} info`)}\n\n`,
  );

  if (result.findings.length === 0) {
    process.stdout.write(C.gray('  No findings.\n\n'));
    return;
  }

  for (const f of result.findings) {
    const sevColor = f.severity === 'error' ? C.red : f.severity === 'warning' ? C.yellow : C.gray;
    const location = formatLocation(f, opts.vscode);
    process.stdout.write(`  ${sevColor(`[${f.severity}]`)} ${C.bold(f.code)} ${location}\n`);
    process.stdout.write(`    ${f.message}\n`);
    if (f.snippet) process.stdout.write(`    ${C.gray('→ ' + f.snippet)}\n`);
    if (f.fix) process.stdout.write(`    ${C.gray('fix: ' + f.fix)}\n`);
    process.stdout.write('\n');
  }
}

function formatLocation(f, vscode) {
  if (!f.file) return '';
  const base = f.line ? `${f.file}:${f.line}${f.column ? ':' + f.column : ''}` : f.file;
  if (!vscode) return base;
  const abs = path.resolve(f.file);
  return `${base}  vscode://file/${abs.replace(/\\/g, '/')}${f.line ? ':' + f.line : ''}`;
}

function colorize(noColor) {
  if (noColor || process.env.NO_COLOR || !process.stdout.isTTY) {
    return { red: s => s, yellow: s => s, gray: s => s, bold: s => s };
  }
  return {
    red: s => `\x1b[31m${s}\x1b[0m`,
    yellow: s => `\x1b[33m${s}\x1b[0m`,
    gray: s => `\x1b[90m${s}\x1b[0m`,
    bold: s => `\x1b[1m${s}\x1b[0m`,
  };
}

/**
 * Helper to make a finding with sensible defaults. `noTarget: true` (Decision
 * §5) marks "this required row checked nothing" — `verdict.mjs` maps it to an
 * INCOMPLETE entry instead of grading it as an error or a warning.
 * `notApplicable: true` (Decision 13) marks "this check does not apply here",
 * its `message` the reason — shown, never state-changing. It FORCES severity
 * `info`: a check that did not apply cannot also have failed, and an `error`
 * carrying the flag would otherwise be graded and noted at once.
 * `noTarget` wins when a caller sets both — "checked nothing but should have"
 * is the stronger claim, and `verdict.mjs` grades it as INCOMPLETE.
 */
export function finding({ severity, code, file, line, column, message, snippet, fix, noTarget, notApplicable }) {
  const applies = notApplicable && !noTarget;
  const f = { severity: applies ? 'info' : severity, code, message };
  if (file) f.file = file;
  if (line !== undefined) f.line = line;
  if (column !== undefined) f.column = column;
  if (snippet) f.snippet = snippet;
  if (fix) f.fix = fix;
  if (noTarget) f.noTarget = true;
  if (applies) f.notApplicable = true;
  return f;
}
