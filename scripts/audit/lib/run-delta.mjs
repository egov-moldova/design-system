/**
 * run-delta.mjs — what changed since the previous run of the same depth (plan
 * `2026-09-23-audit-report-summary-and-delta.md` Decision §2). Rendered into
 * the fix brief's "Changes since" section; `verdict.json` never carries it, so
 * it stays a pure function of its own run's inputs.
 *
 * No state file: runs are kept under `audit/<component>/runs/<run>`, and the
 * caller recomputes the baseline's verdict from that run's inputs with today's
 * rules. Re-rendering a run therefore finds the same baseline every time.
 *
 * The section reports, it never concludes. An entry missing from this run is
 * "no longer reported", shown beside its row's result now — never "resolved",
 * because why it went (fixed, excused, crashed, turned report-only, a design
 * decision settled) is not something a diff of two verdicts can know. Two
 * sentinel rounds proved every attempt to infer it wrong in a new case
 * (plan § Sentinel rounds). Advisory items are counted, not paired: an AI
 * leg's wording, location and very presence vary between dispatches.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { rowIdOf, rowResults } from './fix-brief.mjs';
import { SCHEMA_VERSION, STATE, schemaMajor } from './json-output.mjs';

const isFiltered = audit => Boolean(audit?.filters?.only?.length || audit?.filters?.skip?.length);

function readEnvelope(runDir) {
  try {
    return JSON.parse(readFileSync(join(runDir, 'envelope.json'), 'utf8'));
  } catch {
    // A missing or corrupt envelope is a run that cannot be a baseline — the
    // same outcome as an aborted one, so no separate reason is kept for it.
    return null;
  }
}

/**
 * Whether a run's envelope can stand on either side of a comparison: a major
 * schema version this code reads, same depth, unfiltered, preflight not
 * aborted, and at least one check ran. An aborted run's verdict is near-empty
 * and would list every finding of the other side as gone or new.
 */
export function isComparableRun(envelope, depth) {
  if (!envelope || typeof envelope !== 'object') return false;
  if (schemaMajor(envelope.schemaVersion) !== schemaMajor(SCHEMA_VERSION)) return false;
  if ((envelope.audit?.depth ?? 'standard') !== depth) return false;
  if (isFiltered(envelope.audit)) return false;
  if (envelope.preflight?.ok === false) return false;
  return Array.isArray(envelope.results) && envelope.results.length > 0;
}

/**
 * The baseline for the run at `runDir`, whose parsed `envelope` the caller
 * already holds: the newest sibling run whose name sorts before it (run names
 * are ISO timestamps + pid) and that `isComparableRun` accepts, returned with
 * its parsed envelope. The current run must itself be comparable.
 *
 * @returns {{ run: string, dir: string, envelope: object } | { reason: string }}
 */
export function findBaselineRun(runDir, envelope) {
  const depth = envelope?.audit?.depth ?? 'standard';
  if (isFiltered(envelope?.audit)) return { reason: 'this run was filtered by --only / --skip' };
  if (!isComparableRun(envelope, depth)) {
    return { reason: 'this run did not complete (unreadable envelope, preflight failed or no check ran)' };
  }
  const runsDir = dirname(runDir);
  const name = basename(runDir);
  let siblings;
  try {
    siblings = readdirSync(runsDir).filter(n => n < name && statSync(join(runsDir, n)).isDirectory());
  } catch (err) {
    return { reason: `earlier runs could not be listed (${err.code ?? err.message})` };
  }
  siblings.sort().reverse();
  for (const run of siblings) {
    const dir = join(runsDir, run);
    const candidate = readEnvelope(dir);
    if (isComparableRun(candidate, depth)) return { run, dir, envelope: candidate };
  }
  return { reason: `no earlier complete, unfiltered ${depth} run of this component` };
}

/**
 * The identity an entry keeps across runs. Its id (`F3`) is positional and its
 * `actual` carries the measured value, so neither is part of it. The location
 * keeps its line: pairing two same-code findings in one file by position was
 * wrong whenever one of them went, while an edit above a finding only makes it
 * read as gone + new — noise, never a false pairing.
 */
export function entryKey(entry) {
  if (entry.kind === STATE.INCOMPLETE) return [entry.kind, entry.check, entry.cause].join('·');
  if (entry.kind === STATE.NEEDS_DECISION) return [entry.kind, entry.node, entry.question].join('·');
  return [entry.kind, entry.check, entry.code, entry.location].join('·');
}

/** Key → entry, with a `#n` suffix on a repeated key so no entry is lost. */
function keyed(list) {
  const map = new Map();
  for (const e of list ?? []) {
    const base = entryKey(e);
    let key = base;
    for (let n = 2; map.has(key); n += 1) key = `${base}#${n}`;
    map.set(key, e);
  }
  return map;
}

/** What a "changed" entry compares: the measured value, or why it did not run. */
const valueOf = e => e.actual ?? e.cause ?? e.question ?? null;

/** A row's result with its counts, so a row going from 1 FAIL to 4 still shows. */
function rowLabel(r) {
  if (!r) return 'absent';
  return r.fails || r.warns ? `${r.result} (${r.fails} fail, ${r.warns} warn)` : r.result;
}

/** Compare two verdicts of the same component and depth. Pure. */
export function diffVerdicts(prev, cur, { run }) {
  const before = rowResults(prev);
  const now = rowResults(cur);
  const names = new Map();
  for (const r of [...(cur.rows ?? []), ...(prev.rows ?? [])]) if (!names.get(r.id)) names.set(r.id, r.name);
  const rows = [];
  for (const id of [...new Set([...before.keys(), ...now.keys()])].sort()) {
    const from = rowLabel(before.get(id));
    const to = rowLabel(now.get(id));
    if (from !== to) rows.push({ id, name: names.get(id) ?? null, from, to });
  }

  const a = keyed(prev.entries);
  const b = keyed(cur.entries);
  const gone = [];
  const added = [];
  const changed = [];
  for (const [key, e] of a) {
    if (b.has(key)) continue;
    // A NEEDS-DECISION has no row; everything else names the row whose result
    // now tells the reader why it may be gone.
    const rowNow = e.check === undefined ? null : rowLabel(now.get(rowIdOf(e.check)));
    gone.push({ entry: e, rowNow });
  }
  for (const [key, e] of b) {
    const old = a.get(key);
    if (!old) added.push(e);
    else if (valueOf(old) !== valueOf(e)) changed.push({ id: e.id, entry: e, from: valueOf(old), to: valueOf(e) });
  }
  return {
    status: 'compared',
    baseline: { run, depth: prev.depth, headline: prev.headline },
    state: { from: prev.headline, to: cur.headline },
    warnings: { from: (prev.warnings ?? []).length, to: (cur.warnings ?? []).length },
    advisory: { from: (prev.advisory ?? []).length, to: (cur.advisory ?? []).length },
    rows,
    gone,
    added,
    changed,
  };
}
