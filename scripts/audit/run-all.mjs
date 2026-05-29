#!/usr/bin/env node
/**
 * run-all.mjs
 *
 * Master orchestrator for the audit suite. Dispatches every Tier-1 audit
 * script in 2 waves (the browser-based Tier-2 scripts join in Sprint 3) and
 * produces a single combined JSON envelope:
 *
 *   Wave A (parallel, no browser, no build):
 *     01-component-structure
 *     02-stencil-antipatterns
 *     03-git-hygiene
 *     04-jsdoc-completeness
 *     05-story-exports
 *     07-integration-usage
 *     14-component-contract
 *
 *   Wave B (parallel, depend on existing build artifacts):
 *     06-test-coverage         (reads coverage/coverage-summary.json)
 *     08-bundle-size           (reads dist/design-system/*)
 *     13-token-diff            (component mode requires tokens-tokenhaus.json)
 *
 *   Wave C — defer to Sprint 3:
 *     09-a11y-tree, 10-contrast-pairs, 11-pixel-diff-states, 12-console-errors
 *
 * Why this exists:
 *   AI agents call ONE script (this) instead of 10+ commands. Saves tokens
 *   spent on dispatching, parsing per-script output, and stitching reports.
 *
 * Usage:
 *   node scripts/audit/run-all.mjs mud-button [--json] [--out report.json]
 *   node scripts/audit/run-all.mjs --all --json
 *   node scripts/audit/run-all.mjs mud-button --skip 06,08 --json
 *   node scripts/audit/run-all.mjs mud-button --only 01,02,03 --json
 */
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { writeFileSync, mkdirSync } from 'node:fs';
import { REPO_ROOT, normalizeComponentName } from './lib/component-paths.mjs';
import { EXIT_INTERNAL } from './lib/exit-codes.mjs';
import { SCHEMA_VERSION } from './lib/json-output.mjs';

const TOOL = 'run-all';

const USAGE = `Usage: node scripts/audit/run-all.mjs <component | --all | --changed> [options]

Run every Tier-1 audit script in parallel waves and aggregate the results into
a single JSON envelope. AI agents should call this instead of dispatching each
script individually.

Targets (choose one):
  <mud-name>          Audit one component (e.g. mud-button or button)
  --all               Audit every cor-* component
  --changed           Audit components touched in git diff vs main

Options:
  --json              Emit the combined JSON envelope to stdout (default human summary)
  --out <file>        Write the combined JSON envelope to a file
  --skip <ids>        Comma-separated list of script ids to skip (e.g. 06,08)
  --only <ids>        Comma-separated list — only run these scripts
  --no-browser        Skip Wave C (browser scripts: 09, 10, 11, 12). Equivalent to
                      --skip 09,10,11,12. Used by CI before Playwright is installed.
  --ci                Skip Wave C AND set meta.ciDetected: true in the envelope.
                      Also auto-enabled when process.env.CI is set. Layer 2 (MCP)
                      checks in the audit-component skill are NOT executed in CI.
  --figma-dir <dir>   Forwarded to 11-pixel-diff-states (required to run that script)
  --no-color          Disable ANSI colors
  --help, -h          Show this help

Script ids:
  Wave A (fast, no browser, no build):
    01 structure, 02 antipatterns, 03 git-hygiene, 04 jsdoc,
    05 story-exports, 07 integration-usage, 14 component-contract
  Wave B (depends on existing build artifacts):
    06 test-coverage, 08 bundle-size, 13 token-diff
  Wave C (browser; needs Storybook + Playwright):
    09 a11y-tree, 10 contrast-pairs, 11 pixel-diff-states, 12 console-errors`;

const AUDIT_SCRIPTS = [
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
  { id: '03', wave: 'A', file: '03-git-hygiene.mjs', name: 'git-hygiene', perComponent: false, requiresBuild: false },
  { id: '04', wave: 'A', file: '04-jsdoc-completeness.mjs', name: 'jsdoc', perComponent: true, requiresBuild: false },
  {
    id: '05',
    wave: 'A',
    file: '05-story-exports.mjs',
    name: 'story-exports',
    perComponent: true,
    requiresBuild: false,
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
    id: '06',
    wave: 'B',
    file: '06-test-coverage.mjs',
    name: 'test-coverage',
    perComponent: true,
    requiresBuild: 'coverage',
  },
  { id: '08', wave: 'B', file: '08-bundle-size.mjs', name: 'bundle-size', perComponent: true, requiresBuild: 'dist' },
  { id: '13', wave: 'B', file: '13-token-diff.mjs', name: 'token-diff', perComponent: true, requiresBuild: false },
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
    extraArgsKey: 'figmaDir',
  },
  {
    id: '12',
    wave: 'C',
    file: '12-console-errors.mjs',
    name: 'console-errors',
    perComponent: true,
    requiresBuild: 'browser',
  },
];

function parseCli() {
  let parsed;
  try {
    parsed = parseArgs({
      args: process.argv.slice(2),
      options: {
        'all': { type: 'boolean', default: false },
        'changed': { type: 'boolean', default: false },
        'json': { type: 'boolean', default: false },
        'out': { type: 'string' },
        'skip': { type: 'string', default: '' },
        'only': { type: 'string', default: '' },
        'no-browser': { type: 'boolean', default: false },
        'ci': { type: 'boolean', default: false },
        'figma-dir': { type: 'string' },
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
  // CI mode: either the explicit --ci flag or any truthy CI env var
  // (GitHub Actions, GitLab CI, CircleCI, etc. all set CI=true). When in CI
  // we skip Wave C (browser scripts) AND signal to the audit-component skill
  // that Layer 2 (MCP browser checks) should be skipped — there's no AI to
  // run them in a headless workflow.
  const ci = parsed.values.ci || !!process.env.CI;
  return {
    component,
    all,
    changed,
    json: parsed.values.json,
    out: parsed.values.out ?? null,
    skip: splitIds(parsed.values.skip),
    only: splitIds(parsed.values.only),
    noBrowser: parsed.values['no-browser'],
    ci,
    figmaDir: parsed.values['figma-dir'] ?? null,
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

async function main() {
  const args = parseCli();
  const t0 = Date.now();

  const scriptsToRun = selectScripts(args);
  if (scriptsToRun.length === 0) {
    process.stderr.write(`${TOOL}: no scripts selected (after --only/--skip filtering).\n`);
    process.exit(EXIT_INTERNAL);
  }

  // Resolve the target argument that each script will receive.
  let targetArg;
  if (args.all) targetArg = '--all';
  else if (args.changed) targetArg = '--changed';
  else {
    const name = normalizeComponentName(args.component);
    if (!name) {
      process.stderr.write(`${TOOL}: invalid component name "${args.component}".\n`);
      process.exit(EXIT_INTERNAL);
    }
    targetArg = name;
  }

  // Dispatch each wave sequentially, parallel within a wave.
  const waveA = scriptsToRun.filter(s => s.wave === 'A');
  const waveB = scriptsToRun.filter(s => s.wave === 'B');
  const waveC = scriptsToRun.filter(s => s.wave === 'C');

  const waveAResults = await Promise.all(waveA.map(s => runScript(s, targetArg, args)));
  const waveBResults = await Promise.all(waveB.map(s => runScript(s, targetArg, args)));
  const waveCResults = await Promise.all(waveC.map(s => runScript(s, targetArg, args)));

  const allResults = [...waveAResults, ...waveBResults, ...waveCResults];

  const combined = aggregate({
    targetArg,
    results: allResults,
    durationMs: Date.now() - t0,
    ci: args.ci,
    noBrowser: args.noBrowser,
  });

  await emit(combined, args);
  process.exit(combined.ok ? 0 : 1);
}

function selectScripts(args) {
  let scripts = AUDIT_SCRIPTS.slice();
  if (args.only.size > 0) scripts = scripts.filter(s => args.only.has(s.id));
  if (args.skip.size > 0) scripts = scripts.filter(s => !args.skip.has(s.id));
  // CI and --no-browser both skip Wave C (the browser-driven scripts). CI
  // additionally signals the SKILL to skip Layer 2 (see meta.layer2Required).
  if (args.noBrowser || args.ci) scripts = scripts.filter(s => s.wave !== 'C');
  // 11-pixel-diff requires --figma-dir; silently drop it if not provided so
  // run-all stays useful in environments where the reference set isn't synced.
  if (!args.figmaDir) scripts = scripts.filter(s => s.id !== '11');
  return scripts;
}

/**
 * Run a single audit script as a subprocess. Returns a normalized result entry.
 * Pure I/O — exported for tests via process injection (unused here; we test
 * aggregate() directly).
 */
function runScript(script, targetArg, args = {}) {
  const t0 = Date.now();
  const scriptPath = join(REPO_ROOT, 'scripts', 'audit', script.file);
  const extraArgs = [];
  if (script.id === '11' && args.figmaDir) {
    extraArgs.push('--figma-dir', args.figmaDir);
  }

  return new Promise(resolve => {
    let stdout = '';
    let stderr = '';
    const proc = spawn(process.execPath, [scriptPath, targetArg, '--json', ...extraArgs], {
      windowsHide: true,
    });
    proc.stdout.on('data', chunk => {
      stdout += chunk;
    });
    proc.stderr.on('data', chunk => {
      stderr += chunk;
    });
    proc.on('error', err => {
      resolve({
        id: script.id,
        name: script.name,
        wave: script.wave,
        ok: false,
        exitCode: null,
        durationMs: Date.now() - t0,
        error: err.message,
      });
    });
    proc.on('close', exitCode => {
      const durationMs = Date.now() - t0;
      if (exitCode === EXIT_INTERNAL) {
        resolve({
          id: script.id,
          name: script.name,
          wave: script.wave,
          ok: false,
          exitCode,
          durationMs,
          error: stderr.trim().slice(0, 500),
        });
        return;
      }
      let envelope;
      try {
        envelope = JSON.parse(stdout || '{}');
      } catch (err) {
        resolve({
          id: script.id,
          name: script.name,
          wave: script.wave,
          ok: false,
          exitCode,
          durationMs,
          error: `failed to parse output JSON: ${err.message}`,
        });
        return;
      }
      resolve({
        id: script.id,
        name: script.name,
        wave: script.wave,
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
export function aggregate({ targetArg, results, durationMs, ci = false, noBrowser = false }) {
  const summary = { errors: 0, warnings: 0, info: 0 };
  const blockers = [];
  const findingsByTool = {};

  for (const r of results) {
    if (r.summary) {
      summary.errors += r.summary.errors ?? 0;
      summary.warnings += r.summary.warnings ?? 0;
      summary.info += r.summary.info ?? 0;
    }
    if (r.findings) {
      findingsByTool[r.name] = r.findings;
      for (const f of r.findings) {
        if (f.severity === 'error') blockers.push(`${r.name}/${f.code}`);
      }
    }
  }

  const ok = summary.errors === 0 && results.every(r => r.ok !== false);

  return {
    schemaVersion: SCHEMA_VERSION,
    tool: TOOL,
    target: targetArg,
    ok,
    summary,
    blockers,
    results: results.map(r => ({
      id: r.id,
      name: r.name,
      wave: r.wave,
      ok: r.ok,
      exitCode: r.exitCode,
      durationMs: r.durationMs,
      summary: r.summary ?? null,
      error: r.error ?? null,
    })),
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

async function emit(combined, args) {
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
    `\n${C.bold('run-all')} on ${C.bold(combined.target)}: ${status} — ${combined.summary.errors} error(s), ${combined.summary.warnings} warning(s), ${combined.summary.info} info\n\n`,
  );
  for (const r of combined.results) {
    const dur = `${r.durationMs}ms`;
    const sym = r.ok ? C.green('✓') : C.red('✗');
    const s = r.summary ?? { errors: 0, warnings: 0, info: 0 };
    process.stdout.write(
      `  ${sym} ${r.id} ${r.name.padEnd(22)} ${C.gray(dur.padStart(7))}  ${s.errors}E / ${s.warnings}W / ${s.info}I${r.error ? '  ' + C.red('(' + r.error + ')') : ''}\n`,
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
  process.stdout.write(`\nTotal: ${combined.meta.totalDurationMs}ms (${combined.meta.scriptsRun} scripts, parallel)\n`);
  if (combined.meta.ciDetected) {
    process.stdout.write(`${C.gray('CI mode detected — Layer 2 (MCP browser checks) skipped.')}\n`);
  } else if (combined.meta.layer2Required) {
    process.stdout.write(
      `${C.bold('Next:')} run Layer 2 — see .claude/skills/audit-component/SKILL.md §BX (mandatory MCP browser checks) + §CX (archetype-specific).\n`,
    );
  }
  process.stdout.write('\n');
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
