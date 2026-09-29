#!/usr/bin/env node
/**
 * measure-run-cost.mjs
 *
 * What one `yarn audit:component` run costs: wall-clock, peak memory, and the
 * per-row `durationMs` the envelope already records — repeated N times so a
 * claim rests on a median rather than one sample. The companion to
 * `measure-prompt-cost.mjs`, which measures the static prompt side.
 *
 * It also re-reads `verdict.json` after every repetition and compares it byte
 * for byte against the first one. That is the half a stopwatch cannot give:
 * a speed-up that changed a verdict is not a speed-up, and the acceptance bar
 * for this suite is byte-identical verdicts across identical runs.
 *
 * Use it around a change, never only after: `--out before.json`, change,
 * `--out after.json`, then `--compare before.json`. A percentage with no
 * denominator is not a measurement.
 *
 * Peak memory comes from the child's own `maxRSS` (`process.resourceUsage()`
 * in the harness would only report this process); it is read via `/usr/bin/time -l`
 * on macOS and `/usr/bin/time -v` on Linux, and reported as `null` where
 * neither is present rather than guessed.
 *
 * Usage:
 *   node scripts/audit/measure-run-cost.mjs --component mud-button --depth quick,standard
 *   node scripts/audit/measure-run-cost.mjs --component mud-banner --repeat 5 --out reports/run-cost.json
 *   node scripts/audit/measure-run-cost.mjs --compare reports/run-cost-before.json
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { platform } from 'node:os';
import { REPO_ROOT, normalizeComponentName } from './lib/component-paths.mjs';

const TOOL = 'measure-run-cost';
const EXIT_USAGE = 2;

const USAGE = `Usage: node scripts/audit/measure-run-cost.mjs [options]

Measures what an audit run costs and proves the verdict did not move.

  --component <name>[,<name>…]  Components to run (default: mud-button)
  --depth <d>[,<d>…]            quick | standard | deep (default: quick,standard)
  --repeat <n>                  Repetitions per cell, median reported (default: 3)
  --warm-up                     Run once per component before measuring, untimed
  --out <file>                  Write the JSON result here
  --compare <file>              Read an earlier --out file and print the delta
  --json                        Print the JSON result on stdout
  --help, -h                    This text

Each cell reports median wall-clock ms, median peak RSS, the slowest rows, and
whether every repetition produced a byte-identical verdict.json.`;

/** Median of a numeric list; null for an empty one. Pure. */
export function median(values) {
  const sorted = values.filter(v => typeof v === 'number' && Number.isFinite(v)).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

/**
 * Peak RSS in bytes from `/usr/bin/time`'s stderr. macOS `-l` prints bytes
 * ("maximum resident set size"), GNU `-v` prints kilobytes ("Maximum resident
 * set size (kbytes)"). Null when neither line is there. Pure.
 */
export function parseMaxRss(stderr, os = platform()) {
  const text = String(stderr ?? '');
  const gnu = text.match(/Maximum resident set size \(kbytes\):\s*(\d+)/);
  if (gnu) return Number(gnu[1]) * 1024;
  const bsd = text.match(/(\d+)\s+maximum resident set size/);
  if (bsd) return Number(bsd[1]) * (os === 'darwin' ? 1 : 1024);
  return null;
}

/** `time` invocation for this platform, or null where none is usable. Pure. */
export function timeCommand(os = platform()) {
  if (!existsSync('/usr/bin/time')) return null;
  return { bin: '/usr/bin/time', flag: os === 'darwin' ? '-l' : '-v' };
}

/** The rows that took longest, as `id=ms`, from a run's envelope. Pure. */
export function slowestRows(envelope, limit = 5) {
  return (envelope?.results ?? [])
    .filter(r => typeof r.durationMs === 'number')
    .sort((a, b) => b.durationMs - a.durationMs)
    .slice(0, limit)
    .map(r => `${r.id}=${r.durationMs}`);
}

function latestRunDir(component) {
  const runs = join(REPO_ROOT, 'audit', component, 'runs');
  const entries = existsSync(runs) ? readdirSync(runs).sort() : [];
  return entries.length ? join(runs, entries[entries.length - 1]) : null;
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

function runOnce(component, depth) {
  const time = timeCommand();
  const args = [join(REPO_ROOT, 'scripts', 'audit', 'verdict.mjs'), component, '--depth', depth];
  const started = Date.now();
  const res = time
    ? spawnSync(time.bin, [time.flag, process.execPath, ...args], { encoding: 'utf8', cwd: REPO_ROOT })
    : spawnSync(process.execPath, args, { encoding: 'utf8', cwd: REPO_ROOT });
  const wallMs = Date.now() - started;
  const runDir = latestRunDir(component);
  return {
    wallMs,
    maxRssBytes: parseMaxRss(res.stderr),
    exitCode: res.status,
    // The bytes, not the parsed object: the acceptance bar is byte-identity.
    verdict: (() => {
      try {
        return readFileSync(join(REPO_ROOT, 'audit', component, 'verdict.json'), 'utf8');
      } catch {
        return null;
      }
    })(),
    rows: slowestRows(runDir && readJson(join(runDir, 'envelope.json'))),
  };
}

function measureCell(component, depth, repeat) {
  const runs = [];
  for (let i = 0; i < repeat; i += 1) runs.push(runOnce(component, depth));
  const first = runs[0]?.verdict ?? null;
  return {
    component,
    depth,
    repeat,
    exitCodes: [...new Set(runs.map(r => r.exitCode))],
    wallMsMedian: median(runs.map(r => r.wallMs)),
    wallMsAll: runs.map(r => r.wallMs),
    maxRssMedian: median(runs.map(r => r.maxRssBytes)),
    slowestRows: runs[runs.length - 1].rows,
    // The claim that matters beside the stopwatch: nothing moved.
    verdictIdentical: first !== null && runs.every(r => r.verdict === first),
  };
}

function formatCell(c) {
  const rss = c.maxRssMedian === null ? 'rss n/a' : `${Math.round(c.maxRssMedian / 1e6)} MB`;
  const identical = c.verdictIdentical ? 'verdict identical' : 'VERDICT MOVED';
  return `${c.component} @ ${c.depth}: ${c.wallMsMedian} ms (median of ${c.repeat}) · ${rss} · exit ${c.exitCodes.join('/')} · ${identical}\n  rows: ${c.slowestRows.join(' ')}`;
}

function compare(previous, current) {
  const key = c => `${c.component}@${c.depth}`;
  const before = new Map((previous?.cells ?? []).map(c => [key(c), c]));
  const lines = [];
  for (const cell of current.cells) {
    const prior = before.get(key(cell));
    if (!prior) {
      lines.push(`${key(cell)}: ${cell.wallMsMedian} ms (no earlier sample)`);
      continue;
    }
    const delta = cell.wallMsMedian - prior.wallMsMedian;
    const pct = prior.wallMsMedian ? Math.round((delta / prior.wallMsMedian) * 100) : 0;
    lines.push(
      `${key(cell)}: ${prior.wallMsMedian} → ${cell.wallMsMedian} ms (${delta >= 0 ? '+' : ''}${delta} ms, ${pct >= 0 ? '+' : ''}${pct}%), denominator: median of ${prior.repeat} vs ${cell.repeat} runs`,
    );
  }
  return lines;
}

function main() {
  let parsed;
  try {
    parsed = parseArgs({
      args: process.argv.slice(2),
      options: {
        'component': { type: 'string', default: 'mud-button' },
        'depth': { type: 'string', default: 'quick,standard' },
        'repeat': { type: 'string', default: '3' },
        'warm-up': { type: 'boolean', default: false },
        'out': { type: 'string' },
        'compare': { type: 'string' },
        'json': { type: 'boolean', default: false },
        'help': { type: 'boolean', short: 'h', default: false },
      },
      strict: true,
    });
  } catch (err) {
    process.stderr.write(`${TOOL}: ${err.message}\n\n${USAGE}\n`);
    return EXIT_USAGE;
  }
  if (parsed.values.help) {
    process.stdout.write(`${USAGE}\n`);
    return 0;
  }

  const components = parsed.values.component.split(',').map(s => normalizeComponentName(s.trim()));
  if (components.some(c => !c)) {
    process.stderr.write(`${TOOL}: invalid component name in "${parsed.values.component}"\n\n${USAGE}\n`);
    return EXIT_USAGE;
  }
  const depths = parsed.values.depth.split(',').map(s => s.trim());
  const bad = depths.find(d => !['quick', 'standard', 'deep'].includes(d));
  if (bad) {
    process.stderr.write(`${TOOL}: invalid depth "${bad}"\n\n${USAGE}\n`);
    return EXIT_USAGE;
  }
  const repeat = Number(parsed.values.repeat);
  if (!Number.isInteger(repeat) || repeat < 1) {
    process.stderr.write(`${TOOL}: --repeat must be a positive integer\n\n${USAGE}\n`);
    return EXIT_USAGE;
  }

  if (parsed.values['warm-up']) {
    for (const c of components) runOnce(c, depths[0]);
  }

  const cells = [];
  for (const component of components) {
    for (const depth of depths) {
      const cell = measureCell(component, depth, repeat);
      cells.push(cell);
      process.stderr.write(`${formatCell(cell)}\n`);
    }
  }

  const result = {
    tool: TOOL,
    node: process.version,
    platform: platform(),
    rssSource: timeCommand() ? '/usr/bin/time' : 'unavailable',
    cells,
  };

  if (parsed.values.compare) {
    const previous = readJson(parsed.values.compare);
    if (!previous) {
      process.stderr.write(`${TOOL}: cannot read --compare file "${parsed.values.compare}"\n`);
      return EXIT_USAGE;
    }
    process.stderr.write(`\n${compare(previous, result).join('\n')}\n`);
  }
  if (parsed.values.out) {
    mkdirSync(dirname(parsed.values.out), { recursive: true });
    writeFileSync(parsed.values.out, `${JSON.stringify(result, null, 2)}\n`);
  }
  if (parsed.values.json) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);

  // A moved verdict is a failed measurement, not a slow one.
  return cells.every(c => c.verdictIdentical) ? 0 : 1;
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isDirectRun) process.exitCode = main();

export { TOOL };
