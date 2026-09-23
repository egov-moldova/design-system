/**
 * run-delta.mjs — what changed since the previous run of the same depth (plan
 * `2026-09-23-audit-report-summary-and-delta.md` Decision §2). Rendered into
 * the fix brief's "Changes since" section; `verdict.json` never carries it, so
 * it stays a pure function of its own run's inputs.
 *
 * No state file: runs are kept under `audit/<component>/runs/<run>`, and the
 * caller recomputes the baseline's verdict from that run's inputs with today's
 * rules. Re-rendering a run therefore finds the same baseline every time.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { rowResults } from './fix-brief.mjs';
import { STATE } from './json-output.mjs';

const isFiltered = audit => Boolean(audit?.filters?.only?.length || audit?.filters?.skip?.length);

function readEnvelope(runDir) {
  try {
    return JSON.parse(readFileSync(join(runDir, 'envelope.json'), 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Whether a run can stand as a comparison baseline: a readable envelope of the
 * same depth, unfiltered, whose preflight did not abort and that ran at least
 * one check. An aborted run's recomputed verdict is near-empty, and would
 * report every current entry as new against a report nobody ever saw.
 */
export function isComparableRun(envelope, depth) {
  if (!envelope || typeof envelope !== 'object') return false;
  if ((envelope.audit?.depth ?? 'standard') !== depth) return false;
  if (isFiltered(envelope.audit)) return false;
  if (envelope.preflight?.ok === false) return false;
  return Array.isArray(envelope.results) && envelope.results.length > 0;
}

/**
 * The baseline for the run at `runDir`: the newest sibling run whose name
 * sorts before it (run names are ISO timestamps + pid) and that
 * `isComparableRun` accepts. `accept(dir)` lets the caller reject one it
 * cannot compute a verdict for; the search then moves to the next older run.
 *
 * @returns {{ run: string, dir: string } | { reason: string }}
 */
export function findBaselineRun(runDir, { accept = () => true } = {}) {
  const current = readEnvelope(runDir);
  const depth = current?.audit?.depth ?? 'standard';
  if (isFiltered(current?.audit)) return { reason: 'this run was filtered by --only / --skip' };
  const runsDir = dirname(runDir);
  const name = basename(runDir);
  let siblings = [];
  try {
    siblings = readdirSync(runsDir).filter(n => n < name && statSync(join(runsDir, n)).isDirectory());
  } catch {
    siblings = [];
  }
  siblings.sort().reverse();
  for (const run of siblings) {
    const dir = join(runsDir, run);
    if (isComparableRun(readEnvelope(dir), depth) && accept(dir)) return { run, dir };
  }
  return { reason: `no earlier complete, unfiltered ${depth} run of this component` };
}

/**
 * The identity an entry keeps across runs. Its id (`F3`) is positional and
 * its `actual` carries the measured value, so neither is part of it. An
 * advisory FAIL keys on check and code only: an AI leg re-words and re-locates
 * the same finding between dispatches. A NEEDS-DECISION (advisory or not) has
 * no code, so its question is its identity — a node alone would pair two
 * different questions on one node (a leg's default node is `n/a`) and hide
 * both; a re-worded question shows as resolved + new instead, visibly.
 */
export function entryKey(entry, { advisory = false } = {}) {
  if (entry.kind === STATE.NEEDS_DECISION) {
    return [advisory ? 'advisory' : '', entry.kind, entry.node, entry.question].join('·');
  }
  if (advisory) return ['advisory', entry.kind, entry.check, entry.code].join('·');
  if (entry.kind === STATE.INCOMPLETE) return [entry.kind, entry.check, entry.cause].join('·');
  return [entry.kind, entry.check, entry.code, entry.location].join('·');
}

/** Key → entry, with a `#n` suffix on a repeated key so no entry is lost. */
function keyed(list, advisory) {
  const map = new Map();
  for (const e of list ?? []) {
    const base = entryKey(e, { advisory });
    let key = base;
    for (let n = 2; map.has(key); n += 1) key = `${base}#${n}`;
    map.set(key, e);
  }
  return map;
}

/** The value a "changed" entry compares: what was measured, or why it did not run. */
function valueOf(e) {
  return e.actual ?? e.cause ?? e.question ?? null;
}

/**
 * Compare two verdicts of the same component and depth. Pure.
 *
 * @returns {{ status: 'compared', baseline: object, state: { from, to }, warnings: { from, to },
 *   rows: object[], resolved: object[], added: object[], changed: object[] }}
 */
export function diffVerdicts(prev, cur, { run }) {
  const before = rowResults(prev);
  const now = rowResults(cur);
  const names = new Map([...(prev.rows ?? []), ...(cur.rows ?? [])].map(r => [r.id, r.name]));
  const rows = [];
  for (const id of [...new Set([...before.keys(), ...now.keys()])].sort()) {
    const from = before.get(id)?.result ?? 'absent';
    const to = now.get(id)?.result ?? 'absent';
    if (from !== to) rows.push({ id, name: names.get(id) ?? null, from, to });
  }
  const resolved = [];
  const added = [];
  const changed = [];
  for (const advisory of [false, true]) {
    const a = keyed(advisory ? prev.advisory : prev.entries, advisory);
    const b = keyed(advisory ? cur.advisory : cur.entries, advisory);
    for (const [key, e] of a) if (!b.has(key)) resolved.push(e);
    for (const [key, e] of b) {
      if (!a.has(key)) added.push(e);
      else if (!advisory && valueOf(a.get(key)) !== valueOf(e)) {
        changed.push({ id: e.id, entry: e, from: valueOf(a.get(key)), to: valueOf(e) });
      }
    }
  }
  return {
    status: 'compared',
    baseline: { run, depth: prev.depth, headline: prev.headline },
    state: { from: prev.headline, to: cur.headline },
    warnings: { from: (prev.warnings ?? []).length, to: (cur.warnings ?? []).length },
    rows,
    resolved,
    added,
    changed,
  };
}
