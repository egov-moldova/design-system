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
 * "Resolved" is claimed only for a row that ran again: a finding whose row was
 * excused, crashed, skipped or never ran this time is "not re-checked" — the
 * difference between "fixed" and "not looked at" is the whole point of the
 * section.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { rowIdOf, rowResults } from './fix-brief.mjs';
import { SCHEMA_VERSION, STATE } from './json-output.mjs';

/** Row results that mean the row produced no result this run. */
const NOT_CHECKED = new Set(['excused', 'skipped', 'crashed', 'missing-prereq', 'incomplete', 'absent']);

const major = v => String(v ?? '').split('.')[0];
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
 * Whether a run's envelope can stand on either side of a comparison: same
 * major envelope schema, same depth, unfiltered, preflight not aborted, and at
 * least one check ran. An aborted run's verdict is near-empty and would report
 * every finding of the other side as resolved or new.
 */
export function isComparableRun(envelope, depth) {
  if (!envelope || typeof envelope !== 'object') return false;
  if (major(envelope.schemaVersion) !== major(SCHEMA_VERSION)) return false;
  if ((envelope.audit?.depth ?? 'standard') !== depth) return false;
  if (isFiltered(envelope.audit)) return false;
  if (envelope.preflight?.ok === false) return false;
  return Array.isArray(envelope.results) && envelope.results.length > 0;
}

/**
 * The baseline for the run at `runDir`, whose parsed `envelope` the caller
 * already holds: the newest sibling run whose name sorts before it (run names
 * are ISO timestamps + pid) and that `isComparableRun` accepts. The current
 * run must itself be comparable.
 *
 * @returns {{ run: string, dir: string } | { reason: string }}
 */
export function findBaselineRun(runDir, envelope) {
  const depth = envelope?.audit?.depth ?? 'standard';
  if (isFiltered(envelope?.audit)) return { reason: 'this run was filtered by --only / --skip' };
  if (!isComparableRun(envelope, depth))
    return { reason: 'this run did not complete (preflight failed or no check ran)' };
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
    if (isComparableRun(readEnvelope(dir), depth)) return { run, dir };
  }
  return { reason: `no earlier complete, unfiltered ${depth} run of this component` };
}

/** A `file:line[:col]` location without its line: an edit above a finding moves the line, not the finding. */
const withoutLine = location => String(location ?? '').replace(/:\d+(?::\d+)?$/, '');

/**
 * The identity an entry keeps across runs. Its id (`F3`) is positional, its
 * `actual` carries the measured value and its line moves with unrelated
 * edits, so none of them is part of a scripted FAIL's key. An advisory FAIL
 * keys on check and code — an AI leg re-words and re-locates the same finding
 * between dispatches — or, lacking a code, on its text. A NEEDS-DECISION has
 * no code, so its question is its identity; a node alone would pair two
 * different questions on one node (a leg's default node is `n/a`).
 */
export function entryKey(entry, { advisory = false } = {}) {
  if (entry.kind === STATE.NEEDS_DECISION) {
    return [advisory ? 'advisory' : '', entry.kind, entry.node, entry.question].join('·');
  }
  if (advisory) return ['advisory', entry.kind, entry.check, entry.code ?? entry.actual].join('·');
  if (entry.kind === STATE.INCOMPLETE) return [entry.kind, entry.check, entry.cause].join('·');
  return [entry.kind, entry.check, entry.code, withoutLine(entry.location)].join('·');
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

/** What a "changed" entry compares: the measured value (or the cause) and where it is. */
const valueOf = e => e.actual ?? e.cause ?? e.question ?? null;

/** A row's result with its counts, so a row going from 1 FAIL to 4 still shows. */
function rowLabel(r) {
  if (!r) return 'absent';
  return r.fails || r.warns ? `${r.result} (${r.fails} fail, ${r.warns} warn)` : r.result;
}

/**
 * Compare two verdicts of the same component and depth. `compareAdvisory` is
 * false when this run's AI legs have not written yet: the baseline's advisory
 * items would otherwise all read as resolved. Pure.
 */
export function diffVerdicts(prev, cur, { run, compareAdvisory = true }) {
  const before = rowResults(prev);
  const now = rowResults(cur);
  // A row the baseline lacks entirely — a check added to this depth after it
  // ran — is recomputed as skipped + INCOMPLETE under today's rules. That is
  // a state the baseline never had: read it as absent, and drop its entry.
  const neverRan = new Set([...before].filter(([, r]) => r.result === 'skipped').map(([id]) => id));
  for (const id of neverRan) before.delete(id);
  const prevEntries = (prev.entries ?? []).filter(
    e => !(e.kind === STATE.INCOMPLETE && neverRan.has(rowIdOf(e.check))),
  );

  const names = new Map();
  for (const r of [...(cur.rows ?? []), ...(prev.rows ?? [])]) if (!names.get(r.id)) names.set(r.id, r.name);
  const rows = [];
  for (const id of [...new Set([...before.keys(), ...now.keys()])].sort()) {
    const from = rowLabel(before.get(id));
    const to = rowLabel(now.get(id));
    if (from !== to) rows.push({ id, name: names.get(id) ?? null, from, to });
  }

  const resolved = [];
  const unchecked = [];
  const added = [];
  const changed = [];
  const sides = [[prevEntries, cur.entries, false]];
  if (compareAdvisory) sides.push([prev.advisory, cur.advisory, true]);
  for (const [prevList, curList, advisory] of sides) {
    const a = keyed(prevList, advisory);
    const b = keyed(curList, advisory);
    for (const [key, e] of a) {
      if (b.has(key)) continue;
      const rowNow = now.get(rowIdOf(e.check))?.result ?? 'absent';
      if (!advisory && NOT_CHECKED.has(rowNow)) unchecked.push(e);
      else resolved.push(e);
    }
    for (const [key, e] of b) {
      const old = a.get(key);
      if (!old) added.push(e);
      else if (!advisory && (valueOf(old) !== valueOf(e) || old.location !== e.location)) {
        changed.push({ id: e.id, entry: e, from: valueOf(old), to: valueOf(e), fromLocation: old.location });
      }
    }
  }
  return {
    status: 'compared',
    baseline: { run, depth: prev.depth, headline: prev.headline },
    state: { from: prev.headline, to: cur.headline },
    warnings: { from: (prev.warnings ?? []).length, to: (cur.warnings ?? []).length },
    advisoryCompared: compareAdvisory,
    rows,
    resolved,
    unchecked,
    added,
    changed,
  };
}
