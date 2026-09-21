/**
 * Standard JSON envelope produced by every scripts/audit/* tool.
 *
 * Shape (schemaVersion 1.1.0 — additive over 1.0.0; existing fields keep
 * their meaning, `run-all.mjs`'s combined envelope now also carries a
 * `status` per row, see below):
 *   {
 *     "schemaVersion": "1.1.0",
 *     "tool": "stencil-antipatterns",
 *     "target": "mud-button",               // component name OR "all" OR a glob
 *     "ok": true,                            // false iff summary.errors > 0
 *     "summary": { "errors": 0, "warnings": 2, "info": 5 },
 *     "findings": [ { severity, code, file, line, column?, message, snippet?, fix? } ],
 *     "meta": { "durationMs": 230, "filesScanned": 12, "tool": "stencil-antipatterns" }
 *   }
 *
 * Severity is one of: "error" | "warning" | "info".
 *
 * Callers should NOT add fields outside the envelope; AI workflows consume this
 * schema directly and a stable shape is part of the quality contract.
 *
 * This module also defines the shared schema `verdict.mjs` (Phase 2) and the
 * AI legs (Phase 2/3) build against — `state`, `level`, per-row `status`, the
 * AI-leg row shape, and their own `schemaVersion`s. Landing it here, ahead of
 * any consumer, is deliberate (plan `2026-09-21-audit-component-depths.md`
 * Phase 1): every producer and the one consumer read the same enum.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';

export const SCHEMA_VERSION = '1.1.0';

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

/** `schemaVersion` written into `audit/<component>/verdict.json` (Phase 2). */
export const VERDICT_SCHEMA_VERSION = '1.0.0';

/**
 * `schemaVersion` an AI leg writes into its own `ai-findings.json` (Phase
 * 2/3). An unknown major version leaves the row it closes `INCOMPLETE`; an
 * unknown minor is accepted (Design §1) — `verdict.mjs` owns that check.
 */
export const AI_FINDINGS_SCHEMA_VERSION = '1.0.0';

/**
 * Build an AI-leg row (Design §1): opened by the orchestrator when it
 * dispatches a `deep`-depth AI leg (`status: 'open'`), closed by that leg's
 * own `ai-findings.json` (`status: 'closed'`) naming the leg and the CX/DX
 * ids it judged. An unclosed row is `missing-prereq` to `verdict.mjs` — this
 * builder only shapes the row, it never decides that.
 *
 * @param {object} opts
 * @param {string} opts.leg          — the agent/skill leg name (e.g. "a11y-verifier")
 * @param {string[]} opts.idsJudged  — the CX/DX ids this leg is responsible for
 * @param {'open'|'closed'} [opts.status]
 * @param {string|null} [opts.inputHash] — sha256 of the leg's source input + prompt
 * @param {Array} [opts.findings]    — findings in the same shape as `finding()` below
 */
export function buildAiLegRow({ leg, idsJudged, status = 'open', inputHash = null, findings = [] }) {
  if (!leg) throw new Error('buildAiLegRow: leg is required');
  if (!Array.isArray(idsJudged) || idsJudged.length === 0) {
    throw new Error('buildAiLegRow: idsJudged must be a non-empty array');
  }
  if (status !== 'open' && status !== 'closed') {
    throw new Error(`buildAiLegRow: status must be "open" or "closed", got "${status}"`);
  }
  return {
    schemaVersion: AI_FINDINGS_SCHEMA_VERSION,
    leg,
    idsJudged,
    status,
    inputHash,
    findings,
  };
}

/** Structural check for an AI-leg row — not full schemaVersion validation (Phase 2 owns that). */
export function isValidAiLegRow(row) {
  return (
    !!row &&
    typeof row.leg === 'string' &&
    row.leg.length > 0 &&
    Array.isArray(row.idsJudged) &&
    row.idsJudged.length > 0 &&
    (row.status === 'open' || row.status === 'closed') &&
    Array.isArray(row.findings)
  );
}

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
 * Helper to make a finding with sensible defaults.
 */
export function finding({ severity, code, file, line, column, message, snippet, fix }) {
  const f = { severity, code, message };
  if (file) f.file = file;
  if (line !== undefined) f.line = line;
  if (column !== undefined) f.column = column;
  if (snippet) f.snippet = snippet;
  if (fix) f.fix = fix;
  return f;
}
