/**
 * Standard JSON envelope produced by every scripts/audit/* tool.
 *
 * Shape (schemaVersion 1.0.0):
 *   {
 *     "schemaVersion": "1.0.0",
 *     "tool": "stencil-antipatterns",
 *     "target": "cor-button",               // component name OR "all" OR a glob
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
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';

export const SCHEMA_VERSION = '1.0.0';

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
