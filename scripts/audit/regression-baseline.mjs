#!/usr/bin/env node
/**
 * regression-baseline.mjs
 *
 * Captures a deterministic snapshot of `run-all.mjs` output for the canonical
 * regression-test components (mud-button, mud-input, mud-tooltip per the
 * approved plan) and writes it to `reports/regression-baseline.json`.
 *
 * The snapshot is NORMALIZED: timestamps, durations, and similar non-stable
 * fields are stripped so the diff command can compare findings only.
 *
 * Companion: `regression-check.mjs` re-runs the orchestrator and asserts
 * critical + high findings haven't changed vs the saved baseline.
 *
 * Usage:
 *   node scripts/audit/regression-baseline.mjs                       # capture default 3 components
 *   node scripts/audit/regression-baseline.mjs --components mud-button,mud-icon
 *   node scripts/audit/regression-baseline.mjs --out reports/baseline-v2.json
 *   node scripts/audit/regression-baseline.mjs --include-browser     # also capture Wave C (needs Storybook+Playwright)
 */
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { REPO_ROOT } from './lib/component-paths.mjs';

const TOOL = 'regression-baseline';

const DEFAULT_COMPONENTS = ['mud-button', 'mud-input', 'mud-tooltip'];
const DEFAULT_OUT = 'reports/regression-baseline.json';

const USAGE = `Usage: node scripts/audit/regression-baseline.mjs [options]

Capture a normalized snapshot of \`run-all.mjs\` output for one or more
components. Used as the input for regression-check.mjs.

Options:
  --components <list>     Comma-separated mud-* names (default: ${DEFAULT_COMPONENTS.join(',')})
  --out <file>            Output path (default: ${DEFAULT_OUT})
  --include-browser       Run Wave C scripts too (needs Storybook + Playwright)
  --skip <ids>            Comma-separated audit ids to skip (default: 06,08 — no coverage / build deps)
  --help, -h              Show this help`;

function parseCli() {
  let parsed;
  try {
    parsed = parseArgs({
      args: process.argv.slice(2),
      options: {
        'components': { type: 'string' },
        'out': { type: 'string', default: DEFAULT_OUT },
        'include-browser': { type: 'boolean', default: false },
        'skip': { type: 'string', default: '06,08' },
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
  return {
    components: parsed.values.components ? parsed.values.components.split(',').map(s => s.trim()) : DEFAULT_COMPONENTS,
    out: parsed.values.out,
    includeBrowser: parsed.values['include-browser'],
    skip: parsed.values.skip,
  };
}

async function main() {
  const args = parseCli();
  const t0 = Date.now();

  process.stderr.write(`${TOOL}: capturing baseline for ${args.components.length} component(s)...\n`);

  const components = {};
  for (const name of args.components) {
    process.stderr.write(`${TOOL}:   ${name}...`);
    const t = Date.now();
    const envelope = await runOrchestrator(name, args);
    components[name] = normalizeEnvelope(envelope);
    process.stderr.write(
      ` ${Date.now() - t}ms (${components[name].summary.errors}E / ${components[name].summary.warnings}W / ${components[name].summary.info}I)\n`,
    );
  }

  const snapshot = {
    schemaVersion: '1.0.0',
    tool: TOOL,
    capturedAt: new Date().toISOString(),
    components,
    meta: {
      durationMs: Date.now() - t0,
      includeBrowser: args.includeBrowser,
      skip: args.skip,
    },
  };

  const outPath = join(REPO_ROOT, args.out);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(snapshot, null, 2), 'utf8');
  process.stderr.write(`${TOOL}: wrote ${outPath}\n`);
}

function runOrchestrator(componentName, args) {
  const scriptPath = join(REPO_ROOT, 'scripts', 'audit', 'run-all.mjs');
  const cliArgs = [scriptPath, componentName, '--json'];
  if (!args.includeBrowser) cliArgs.push('--no-browser');
  if (args.skip) cliArgs.push('--skip', args.skip);

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

/**
 * Strip non-deterministic fields from an envelope so two captures of the same
 * state diff cleanly. Pure — exported for tests.
 */
export function normalizeEnvelope(envelope) {
  if (!envelope || typeof envelope !== 'object') return envelope;
  const cleaned = JSON.parse(JSON.stringify(envelope));
  stripTimings(cleaned);
  return cleaned;
}

function stripTimings(node) {
  if (Array.isArray(node)) {
    for (const item of node) stripTimings(item);
    return;
  }
  if (node && typeof node === 'object') {
    delete node.durationMs;
    delete node.totalDurationMs;
    delete node.capturedAt;
    // contract.props[*].line is stable (file content driven); keep it.
    // run-all.meta also includes totalDurationMs (covered above).
    for (const v of Object.values(node)) stripTimings(v);
  }
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isDirectRun) {
  main().catch(err => {
    process.stderr.write(`${TOOL}: internal error — ${err.stack ?? err.message ?? err}\n`);
    process.exit(2);
  });
}

export { TOOL, DEFAULT_COMPONENTS, DEFAULT_OUT };
