/**
 * run-record.mjs — the per-run record `verdict.mjs` writes to
 * `audit/<component>/runs/<run>/record.json` (plan
 * `2026-09-23-audit-run-delta.md` Design §1), and the pure functions that find
 * a baseline record and compare two of them. It never imports `verdict.mjs`
 * — that would be a cycle, since `verdict.mjs` is this record's writer — so
 * every rule this module needs about what a run graded is either recomputed
 * here from the same raw inputs `verdict.mjs` used, or handed in already
 * decided (the per-leg `legs` list, `verdict.mjs`'s `computeLegRecords`).
 *
 * The record freezes, at the moment a run happens, what it graded and the
 * identity of every finding it reported — never inferred later from a
 * recomputed verdict (Problem, this plan). Comparing two records is then a
 * pure data operation with no knowledge of verdict-computation rules at all.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { rowIdOf, rowResults } from './fix-brief.mjs';
import {
  LEG_NOT_WRITTEN,
  ROW_STATUS,
  RUN_RECORD_SCHEMA_VERSION,
  SCHEMA_VERSION,
  STATE,
  schemaMajor,
} from './json-output.mjs';

// ─── Finding identity (Design §3) ─────────────────────────────────────────

const HEX_COLOR_RE = /#[0-9a-f]{3,8}\b/gi;
const DIGIT_RUN_RE = /\d+(?:\.\d+)?/g;

/**
 * Replace every hex colour literal by `#hex`, then every run of digits (with
 * an optional decimal part) by `#`, so a measured value never enters a
 * finding-identity key. The colour step runs first: a rendered colour such as
 * `#e8f0fb` would otherwise have its digits stabilised into `#e#f#fb`, which
 * still carries the measurement. Pure.
 */
export function stable(text) {
  if (text === undefined || text === null) return '';
  return String(text).replace(HEX_COLOR_RE, '#hex').replace(DIGIT_RUN_RE, '#');
}

/** Strip a trailing `:<line>` or `:<line>:<col>` from a location string. Pure. */
export function fileOf(location) {
  if (typeof location !== 'string') return location;
  return location.replace(/:\d+(?::\d+)?$/, '');
}

/**
 * The text a FAIL entry's identity keys on: its own `message` when present
 * (added to the entry by `verdict.mjs`'s `failEntry`, 2.1.0), else `actual`.
 * For `STYLE-MISMATCH` only the text before the first `: ` is kept — that is
 * `state › target › prop` (`15-style-parity.mjs` `mismatchFinding`); the rest
 * carries the Figma node, the rendered values and a token suffix that changes
 * with the rendered colour. Guarded by `run-record.spec.mjs` § finding
 * identity, which builds its findings with `mismatchFinding()` itself, and by
 * the golden record. Pure.
 */
function failKeyText(entry) {
  const text = entry.message !== undefined ? String(entry.message) : String(entry.actual);
  return entry.code === 'STYLE-MISMATCH' ? text.split(': ')[0] : text;
}

// The label's own `<file>` is `fileOf(location)`, never the raw location: the
// key already drops the line so a shift reads as unchanged (Design §3), and a
// label that still carried the line would make the same finding's text differ
// between two runs for no reason the identity claims to track.
function failLabel(entry) {
  const code = entry.code ? ` · ${entry.code}` : '';
  return `${entry.check}${code} · ${fileOf(entry.location)} — ${entry.message ?? entry.actual}`;
}

function decisionLabel(entry) {
  return `${entry.node} — ${entry.question}`;
}

/** Every finding-identity record from one verdict, unsorted. Pure. */
function findingsFrom(verdict) {
  const out = [];
  for (const e of verdict.entries ?? []) {
    if (e.kind === STATE.FAIL) {
      out.push({
        scope: `row:${rowIdOf(e.check)}`,
        key: JSON.stringify(['fail', e.code, fileOf(e.location), stable(failKeyText(e)), stable(e.expected?.value)]),
        label: failLabel(e),
      });
    } else if (e.kind === STATE.NEEDS_DECISION) {
      out.push({ scope: 'figma-gate', key: JSON.stringify(['decision', e.node]), label: decisionLabel(e) });
    }
  }
  for (const w of verdict.warnings ?? []) {
    out.push({
      scope: `row:${rowIdOf(w.check)}`,
      key: JSON.stringify(['warning', w.code, stable(w.message)]),
      label: `${w.check} · ${w.code} — ${w.message}`,
    });
  }
  for (const a of verdict.advisory ?? []) {
    const scope = `leg:${a.owner}`;
    // A leg's prose is reworded on every re-dispatch, so its code (and the
    // decision's node) is the identity. A leg need not give either
    // (`findingShapeIssue` requires neither): without one there is nothing
    // stable to key on, so the text is the identity — a reworded code-less
    // finding reads as gone + new, never as two unrelated findings merged.
    if (a.kind === STATE.FAIL) {
      const key = a.code
        ? ['fail', a.code, fileOf(a.location)]
        : ['fail', null, fileOf(a.location), stable(failKeyText(a))];
      out.push({ scope, key: JSON.stringify(key), label: failLabel(a) });
    } else if (a.kind === STATE.NEEDS_DECISION) {
      const key = a.node && a.node !== 'n/a' ? ['decision', a.node] : ['decision', null, stable(a.question)];
      out.push({ scope, key: JSON.stringify(key), label: decisionLabel(a) });
    }
  }
  return out.sort((x, y) =>
    x.scope === y.scope ? (x.key < y.key ? -1 : x.key > y.key ? 1 : 0) : x.scope < y.scope ? -1 : 1,
  );
}

// ─── Graded scopes (Design §2) ─────────────────────────────────────────────

/** Every scope needs a valid envelope: present, matching schema major, and a preflight that did not fail. */
function envelopeValid(envelope) {
  if (!envelope) return false;
  if (schemaMajor(envelope.schemaVersion) !== schemaMajor(SCHEMA_VERSION)) return false;
  if (envelope.preflight && envelope.preflight.ok === false) return false;
  return true;
}

function computeScopes({ verdict, envelope, legs }) {
  if (!envelopeValid(envelope)) return [];
  const scopes = [];
  const noFigma = Boolean(envelope.audit?.noFigma);
  if (verdict.depth !== 'quick' && !noFigma) scopes.push('figma-gate');
  for (const row of envelope.results ?? []) {
    if (row.status !== ROW_STATUS.OK) continue;
    if (row.blocking === false) continue;
    if (row.deferred) continue;
    const findings = envelope.findingsByTool?.[row.name] ?? [];
    if (findings.some(f => f.noTarget === true)) continue;
    scopes.push(`row:${row.id}`);
  }
  for (const l of legs ?? []) {
    if (l.graded) scopes.push(`leg:${l.leg}`);
  }
  return scopes.sort();
}

// ─── The record (Design §1) ────────────────────────────────────────────────

/**
 * Build one run's record. Pure — the same inputs give the same record.
 *
 * @param {object} opts
 * @param {string} opts.run — the run id (`runs/<run>`)
 * @param {object} opts.verdict — this run's computed verdict (`computeVerdict`'s return)
 * @param {object|null} opts.envelope — this run's envelope (as read by `readRunInputs`)
 * @param {Array<{leg: string, graded: boolean, cause: string|null}>} [opts.legs] —
 *   `verdict.mjs`'s `computeLegRecords(aiFiles)`
 */
export function buildRunRecord({ run, verdict, envelope, legs = [] }) {
  const results = rowResults(verdict);
  const rows = (verdict.rows ?? []).map(r => ({ id: r.id, name: r.name, result: results.get(r.id)?.result ?? 'pass' }));
  const sortedLegs = [...legs]
    .map(l => ({ leg: l.leg, graded: Boolean(l.graded), cause: l.cause ?? null }))
    .sort((a, b) => (a.leg < b.leg ? -1 : a.leg > b.leg ? 1 : 0));
  return {
    schemaVersion: RUN_RECORD_SCHEMA_VERSION,
    run,
    component: verdict.component,
    depth: verdict.depth,
    state: verdict.state,
    headline: verdict.headline,
    rows,
    scopes: computeScopes({ verdict, envelope, legs }),
    legs: sortedLegs,
    findings: findingsFrom(verdict),
  };
}

// ─── The baseline (Design §4) ──────────────────────────────────────────────

/**
 * A cause naming why `record` cannot be read as a `record.json` of this
 * module's own schema, or `null` when it can. A record without `depth` does
 * not parse into a usable record and stops the search with its cause.
 */
function recordShapeIssue(record) {
  if (!record || typeof record !== 'object') return 'record.json is not an object';
  if (schemaMajor(record.schemaVersion) !== schemaMajor(RUN_RECORD_SCHEMA_VERSION)) {
    return `schemaVersion ${record.schemaVersion} has an unknown major version`;
  }
  if (typeof record.depth !== 'string') return 'record.json has no depth';
  if (!Array.isArray(record.scopes)) return 'scopes is not a list';
  if (!Array.isArray(record.rows)) return 'rows is not a list';
  if (!Array.isArray(record.findings)) return 'findings is not a list';
  return null;
}

/**
 * The run directories under `<componentDir>/runs/`, sorted by name. A run is a
 * real directory (never a symlink: run-all never makes one, and following it
 * could reach another component's runs) that holds `envelope.json`, which
 * run-all writes before anything else in it. A file, a symlink or a folder
 * with no envelope (a Finder `.DS_Store`, a notes folder) is not a run. A
 * directory whose envelope cannot even be checked (EACCES, EIO) IS kept: it
 * looks like a run, and dropping it silently could let an older run pass as
 * newest. Kept, it surfaces by name — findPreviousRecord reports it unusable,
 * isNewestRun names it. One such entry never fails the whole listing. No
 * `runs/` yet → `[]`; a failure to list `runs/` itself throws.
 */
export function listRunNames(componentDir) {
  const runsDir = join(componentDir, 'runs');
  let entries;
  try {
    entries = readdirSync(runsDir, { withFileTypes: true });
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
  return entries
    .filter(e => e.isDirectory())
    .filter(e => {
      try {
        return statSync(join(runsDir, e.name, 'envelope.json')).isFile();
      } catch (err) {
        return err.code !== 'ENOENT' && err.code !== 'ENOTDIR';
      }
    })
    .map(e => e.name)
    .sort();
}

/** The shape of run-all's `defaultRunId`: an ISO timestamp with `:`/`.` as `-`, then the pid. */
const RUN_ID = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-\d+$/;

/**
 * The names that can be ordered against `run` by name. When `run` is a
 * run-all id, only other run-all ids: name order is time order only between
 * timestamps, and a hand-made folder (`runs/baseline/`, copied to keep it)
 * would otherwise sort after every id and pass as the newest run forever. A
 * run with any other name (a test's `r1`) compares against everything. Pure.
 */
export function runsComparableTo(names, run) {
  return RUN_ID.test(run) ? names.filter(n => RUN_ID.test(n)) : names;
}

/**
 * The previous run's record for `componentDir` at `depth`, searched
 * newest-to-oldest among `runs/*` names strictly less than `currentRun`
 * (string order; run ids are ISO timestamps, so this is chronological). Reads
 * files and writes none; its skip / unusable / baseline rules are Design §4.
 *
 * @returns {{ record: object|null, run: string|null, skippedEmpty: number } | { unusable: { run: string, cause: string } }}
 */
export function findPreviousRecord(componentDir, currentRun, depth) {
  // A listing failure other than a missing runs/ throws, for the caller to render as Not compared.
  const names = runsComparableTo(listRunNames(componentDir), currentRun)
    .filter(n => n < currentRun)
    .reverse();

  let skippedEmpty = 0;
  for (const name of names) {
    let raw;
    try {
      raw = readFileSync(join(componentDir, 'runs', name, 'record.json'), 'utf8');
    } catch (err) {
      // no record.json (a run from before this change, or a failed write) — skip
      if (err.code === 'ENOENT') continue;
      return { unusable: { run: name, cause: `record.json cannot be read: ${err.code ?? err.message}` } };
    }
    let record;
    try {
      record = JSON.parse(raw);
    } catch (err) {
      return { unusable: { run: name, cause: `record.json does not parse: ${err.message}` } };
    }
    // A record that names another depth is skipped before its shape is judged:
    // it could never be this depth's baseline, usable or not.
    if (typeof record?.depth === 'string' && record.depth !== depth) continue;
    const cause = recordShapeIssue(record);
    if (cause) return { unusable: { run: name, cause } };
    if (record.scopes.length === 0) {
      skippedEmpty++;
      continue;
    }
    return { record, run: name, skippedEmpty };
  }
  return { record: null, run: null, skippedEmpty };
}

// ─── The comparison (Design §5) ────────────────────────────────────────────

/** Row results that read as a grade; `crashed`, `excused`, `skipped` … already say nothing was graded. */
const LOOKS_GRADED = new Set(['pass', 'warn', 'fail', 'incomplete']);

/** What one side (`record`, whose rows are `rowsMap`) recorded for a scope graded on one side only. */
function describeScope(scope, present, record, rowsMap) {
  if (scope === 'figma-gate') return present ? 'checked' : 'not checked';
  if (scope.startsWith('leg:')) {
    if (present) return 'wrote';
    const leg = scope.slice('leg:'.length);
    const entry = (record.legs ?? []).find(l => l.leg === leg);
    if (!entry) return LEG_NOT_WRITTEN;
    // A leg graded on its own (no cause) that still lacks the scope means the
    // run itself graded nothing (an unreadable envelope, a failed preflight).
    return entry.cause ? `wrote a file not compared (${entry.cause})` : 'wrote, but that run graded nothing';
  }
  if (scope.startsWith('row:')) {
    const row = rowsMap.get(scope.slice('row:'.length));
    if (!row) return 'not in that run';
    // A row that ran but was not graded (report-only, or no target resolved)
    // can still read `pass`; say so, or "pass, pass, not compared" reads as a
    // contradiction.
    return present || !LOOKS_GRADED.has(row.result) ? row.result : `${row.result} (not graded)`;
  }
  return present ? 'present' : 'absent';
}

function groupFindings(findings) {
  const map = new Map();
  for (const f of findings) {
    const groupKey = `${f.scope}\u0000${f.key}`;
    let entry = map.get(groupKey);
    if (!entry) {
      entry = { scope: f.scope, key: f.key, count: 0, labels: [] };
      map.set(groupKey, entry);
    }
    entry.count++;
    entry.labels.push(f.label);
  }
  return map;
}

/**
 * Compare a run's record against a previous run's record. Pure — a data
 * operation over the two records, with no knowledge of how either was
 * graded and no knowledge of `findPreviousRecord`'s own bookkeeping
 * (`skippedEmpty`, an unusable baseline): those are that function's
 * concern, merged into the final `changes` object by the caller
 * (`verdict.mjs`'s `writeVerdictForRun`) before it reaches
 * `fix-brief.mjs`'s `renderChanges`.
 *
 * @param {object} current — this run's record (`buildRunRecord`'s return)
 * @param {object|null} previous — the baseline run's record, or `null` when none exists
 * @returns {{baseline: null} |
 *   {baseline: {run: string, headline: string}, headline: string,
 *    rowChanges: object[], notCompared: object[], added: object[], gone: object[],
 *    countChanged: object[], textChanged: object[], unchanged: number}}
 */
export function compareRecords(current, previous) {
  if (!previous) return { baseline: null };

  const curRows = new Map((current.rows ?? []).map(r => [r.id, r]));
  const prevRows = new Map((previous.rows ?? []).map(r => [r.id, r]));
  const rowIds = [...new Set([...curRows.keys(), ...prevRows.keys()])].sort();
  const rowChanges = [];
  for (const id of rowIds) {
    const c = curRows.get(id);
    const p = prevRows.get(id);
    const curResult = c ? c.result : '—';
    const prevResult = p ? p.result : '—';
    if (curResult !== prevResult) {
      // A row skipped or excused now carries `name: null`; the other run's name still says which check.
      rowChanges.push({ id, name: c?.name ?? p?.name ?? null, previous: prevResult, current: curResult });
    }
  }

  const curScopes = new Set(current.scopes ?? []);
  const prevScopes = new Set(previous.scopes ?? []);
  const allScopes = [...new Set([...curScopes, ...prevScopes])].sort();
  const bothScopes = new Set();
  const notCompared = [];
  for (const scope of allScopes) {
    if (curScopes.has(scope) && prevScopes.has(scope)) {
      bothScopes.add(scope);
      continue;
    }
    notCompared.push({
      scope,
      current: describeScope(scope, curScopes.has(scope), current, curRows),
      previous: describeScope(scope, prevScopes.has(scope), previous, prevRows),
    });
  }

  const curGroups = groupFindings((current.findings ?? []).filter(f => bothScopes.has(f.scope)));
  const prevGroups = groupFindings((previous.findings ?? []).filter(f => bothScopes.has(f.scope)));
  const allKeys = [...new Set([...curGroups.keys(), ...prevGroups.keys()])].sort();
  const added = [];
  const gone = [];
  const countChanged = [];
  const textChanged = [];
  let unchanged = 0;
  for (const groupKey of allKeys) {
    const c = curGroups.get(groupKey);
    const p = prevGroups.get(groupKey);
    const cCount = c?.count ?? 0;
    const pCount = p?.count ?? 0;
    const scope = (c ?? p).scope;
    const key = (c ?? p).key;
    if (pCount === 0) {
      added.push({ scope, key, label: c.labels[0], count: cCount });
    } else if (cCount === 0) {
      gone.push({ scope, key, label: p.labels[0], count: pCount });
    } else if (cCount !== pCount) {
      countChanged.push({ scope, key, previousCount: pCount, currentCount: cCount, label: c.labels[0] });
    } else {
      // Labels both sides share are dropped as a multiset, so the entry shows
      // only the text that actually differs, never the same label twice.
      const prevOnly = [...p.labels].sort();
      const curOnly = [];
      for (const label of [...c.labels].sort()) {
        const i = prevOnly.indexOf(label);
        if (i === -1) curOnly.push(label);
        else prevOnly.splice(i, 1);
      }
      if (curOnly.length > 0) {
        textChanged.push({ scope, key, previous: prevOnly.join('; '), current: curOnly.join('; ') });
      } else {
        unchanged++;
      }
    }
  }

  return {
    baseline: { run: previous.run, headline: previous.headline },
    headline: current.headline,
    rowChanges,
    notCompared,
    added,
    gone,
    countChanged,
    textChanged,
    unchanged,
  };
}
