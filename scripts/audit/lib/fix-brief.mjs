/**
 * fix-brief.mjs — renders `audit/<component>/fix-brief.md` from a verdict
 * (plan `2026-09-21-audit-component-depths.md` Design §2). One block per
 * non-PASS entry, one shape per state, so pasting the brief into a new
 * session is enough to start fixing without re-running the audit:
 *
 *   FAIL            ID · severity · check · location · expected (value + source) · actual · verify · owner
 *   INCOMPLETE      ID · check · cause · prerequisite (or, for a crash, log) · verify
 *   NEEDS-DECISION  ID · node (or "no manifest") · question · options — the audit never picks one
 *   Advisory        AI findings, at every depth, in the FAIL shape; they never change the state
 *
 * A missing field is a renderer error, not an empty line: a brief that drops
 * the verify command or the expected value's source is the failure F8 names.
 *
 * The brief opens with a report block (plan
 * `2026-09-23-audit-report-summary-and-delta.md`): `## Summary` — one row per
 * check and an index of every entry — closed by REPORT_END. The terminal prints that block and the skill pastes it
 * inline, so no session ever rebuilds the table in its own words.
 */
import { ROW_STATUS, STATE } from './json-output.mjs';

/** The fields each entry kind must carry (Design §2). */
export const BRIEF_FIELDS = Object.freeze({
  [STATE.FAIL]: Object.freeze(['severity', 'check', 'location', 'expected', 'actual', 'verify', 'owner']),
  [STATE.INCOMPLETE]: Object.freeze(['check', 'cause', 'prerequisite', 'verify']),
  [STATE.NEEDS_DECISION]: Object.freeze(['node', 'question', 'options']),
});

/** A field another field may stand in for: a crashed row has a log to read, not a prerequisite to run (T10). */
const FIELD_ALTERNATE = Object.freeze({ prerequisite: 'log' });

function fieldFor(entry, field) {
  const alt = FIELD_ALTERNATE[field];
  return alt && !present(entry[field]) && present(entry[alt]) ? alt : field;
}

// A field is "present" once it is set — an empty string is a legitimate value
// (an empty `actual`, e.g.), never a missing one (S2). Only `undefined` /
// `null`, an empty array, or an `{ value, source }` pair missing either half
// count as missing.
function present(value) {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return true;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return present(value.value) && present(value.source);
  return true;
}

/**
 * Render any interpolated value as one line (S7): an empty string renders as
 * `(empty)` rather than a blank that reads like a rendering bug, and a
 * newline is replaced so a finding's own text can never forge a new `###`
 * heading or another field's `- field:` line. Applied to every interpolation
 * in this module — entry fields, `code` in the heading, the headline, and the
 * excused/not-applicable/deferred/notes/override/warning sections in
 * `renderFixBrief`. Pure.
 */
export function line(value) {
  if (value === '') return '(empty)';
  // Control characters are neutralised too: this text reaches a terminal
  // (printSummary), where an ESC sequence from a story's console message or an
  // AI leg's finding could move the cursor and overwrite the real headline.
  return String(value)
    .replace(/\r\n|\r|\n/g, ' ⏎ ')
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/g, '�');
}

/**
 * Render one entry block. Throws when the entry lacks a field its kind
 * requires. Pure — exported for tests.
 */
export function renderEntry(entry) {
  const fields = BRIEF_FIELDS[entry.kind];
  if (!fields) throw new Error(`fix-brief: unknown entry kind "${entry.kind}"`);
  if (!present(entry.id)) throw new Error('fix-brief: entry has no id');
  const resolved = fields.map(f => fieldFor(entry, f));
  const missing = resolved.filter(f => !present(entry[f]));
  if (missing.length) {
    throw new Error(`fix-brief: ${entry.kind} entry ${entry.id} is missing ${missing.join(', ')}`);
  }
  const codeSuffix = entry.code ? ` · ${line(entry.code)}` : '';
  const lines = [`### ${entry.id} · ${entry.kind}${codeSuffix}`, ''];
  for (const field of resolved) {
    const value = entry[field];
    if (field === 'expected') {
      lines.push(`- expected: ${line(value.value)} (source: ${line(value.source)})`);
    } else if (field === 'options') {
      lines.push('- options:');
      value.forEach((o, i) => lines.push(`  ${i + 1}. ${line(o)}`));
    } else if (field === 'verify') {
      lines.push(`- verify: \`${line(value)}\``);
    } else {
      lines.push(`- ${field}: ${line(value)}`);
    }
  }
  return `${lines.join('\n')}\n`;
}

/** Closes the report block — the part `printSummary` prints and the skill pastes inline. */
export const REPORT_END = '<!-- end of report -->';

/** One table cell: `line()` plus an escaped `|`, so no value can add a column or a row. */
function cell(value) {
  if (value === undefined || value === null) return '—';
  // Backslashes first: `a\|b` would otherwise become `a\\|b`, an escaped
  // backslash followed by a real column separator.
  return line(value).replace(/\\/g, '\\\\').replace(/\|/g, '\\|');
}

/** The row id an entry or warning belongs to: `check` is `<id> <name>` or a bare `<id>`. */
function rowIdOf(check) {
  return String(check ?? '').split(' ')[0];
}

/**
 * Each row's result, derived from the verdict itself so the table can never
 * disagree with the entries below it: `excused` · `deferred` (run-all emits a
 * deferred row as `skipped`, which must not read as a required check that did
 * not run) · a non-ok status (`crashed`, `missing-prereq`, `skipped`) ·
 * `incomplete` · `fail` · `warn` · `not graded (<n> errors, <n> warnings)` —
 * the script counted findings that became no entry or warning (a
 * `blocking: false` row, or findings filed under another name), shown from
 * the row's own counts so they are never hidden behind a `pass` — · `pass`,
 * first match wins.
 * `fails` / `warns` count this row's FAIL entries and warnings. Pure.
 *
 * @returns {Map<string, { result: string, fails: number, warns: number }>}
 */
export function rowResults(verdict) {
  const count = (list, pred) => {
    const byRow = new Map();
    for (const x of list ?? []) {
      if (!pred(x)) continue;
      const id = rowIdOf(x.check);
      byRow.set(id, (byRow.get(id) ?? 0) + 1);
    }
    return byRow;
  };
  const fails = count(verdict.entries, e => e.kind === STATE.FAIL);
  const incomplete = count(verdict.entries, e => e.kind === STATE.INCOMPLETE);
  const warns = count(verdict.warnings, () => true);
  const out = new Map();
  for (const r of verdict.rows ?? []) {
    const f = fails.get(r.id) ?? 0;
    const w = warns.get(r.id) ?? 0;
    let result = 'pass';
    if (r.excuse) result = 'excused';
    else if (r.deferred) result = 'deferred';
    else if (r.status !== ROW_STATUS.OK) result = r.status;
    else if (incomplete.get(r.id)) result = 'incomplete';
    else if (f) result = 'fail';
    else if (w) result = 'warn';
    else if (r.errors || r.warnings) result = `not graded (${r.errors} errors, ${r.warnings} warnings)`;
    out.set(r.id, { result, fails: f, warns: w });
  }
  return out;
}

/**
 * The icon a result carries in the table's Result column, so a reader finds the
 * rows that want attention without reading every word: green for a row with
 * nothing to do, a warning sign for one worth a look, a cross for one that
 * blocks or never produced a judgement, and a dash for one deliberately not run.
 * The word stays — the icon only makes it scannable. Pure.
 */
export function resultIcon(result) {
  if (result === 'pass') return '✅';
  if (result === 'excused' || result === 'deferred') return '➖';
  if (result === 'warn' || result.startsWith('not graded')) return '⚠️';
  return '❌';
}

/**
 * The `## Summary` section: counts, one table row per `verdict.rows[]` entry,
 * and an index of every entry and advisory item. Pure.
 */
export function renderSummary(verdict) {
  const entries = verdict.entries ?? [];
  const advisory = verdict.advisory ?? [];
  const kinds = [STATE.FAIL, STATE.INCOMPLETE, STATE.NEEDS_DECISION];
  const results = rowResults(verdict);
  const tally = new Map();
  for (const { result } of results.values()) tally.set(result, (tally.get(result) ?? 0) + 1);
  const out = [
    '## Summary',
    '',
    results.size
      ? `Checks: ${results.size} — ${[...tally].map(([k, n]) => `${n} ${k}`).join(' · ')}`
      : 'Checks: none ran — see the INCOMPLETE entries below',
    `Entries: ${kinds.map(k => `${entries.filter(e => e.kind === k).length} ${k}`).join(' · ')} · ` +
      `${(verdict.warnings ?? []).length} warnings · ${advisory.length} advisory`,
  ];
  if (results.size) {
    out.push(
      '',
      '| # | Check | Required | Result | Fail | Warn | Note |',
      '| --- | --- | --- | --- | --- | --- | --- |',
    );
  }
  for (const r of verdict.rows ?? []) {
    const { result, fails, warns } = results.get(r.id);
    out.push(
      `| ${cell(r.id)} | ${cell(r.name)} | ${r.required ? 'yes' : 'no'} | ${resultIcon(result)} ${result} | ${fails} | ${warns} | ` +
        `${r.excuse || r.deferred || r.note ? cell(r.excuse ?? r.deferred ?? r.note) : ''} |`,
    );
  }
  const indexed = [...entries.map(e => [e, e.kind]), ...advisory.map(e => [e, `advisory ${e.kind}`])];
  if (indexed.length) {
    out.push('', '| ID | Kind | Check | Where | Actual | Owner |', '| --- | --- | --- | --- | --- | --- |');
    for (const [e, kind] of indexed) {
      out.push(
        `| ${cell(e.id)} | ${kind} | ${cell(e.check)} | ${cell(e.location ?? e.node)} | ` +
          `${cell(e.actual ?? e.cause ?? e.question)} | ${cell(e.owner)} |`,
      );
    }
  }
  return out;
}

/** Render the whole brief. Pure — exported for tests. */
export function renderFixBrief(verdict) {
  const c = verdict.component;
  const out = [
    `# Fix brief — ${c} @ ${verdict.depth}`,
    '',
    `State: **${line(verdict.headline)}**`,
    '',
    ...renderSummary(verdict),
    '',
    REPORT_END,
    '',
    `Verdict: \`audit/${c}/verdict.json\`. When every \`verify:\` below passes, re-run the whole audit at the same`,
    `depth — only that run can write a PASS: \`yarn audit:component ${c} --depth ${verdict.depth}\`.`,
    '',
  ];

  const excused = (verdict.rows ?? []).filter(r => r.excuse);
  if (excused.length) {
    out.push('## Checks not run (excused)', '');
    for (const r of excused) out.push(`- ${r.id} — ${line(r.excuse)}`);
    out.push('');
  }
  const notApplicable = (verdict.rows ?? []).filter(r => r.note);
  if (notApplicable.length) {
    out.push('## Not applicable', '');
    for (const r of notApplicable) out.push(`- ${r.id} ${line(r.name)} — ${line(r.note)}`);
    out.push('');
  }
  const deferred = (verdict.rows ?? []).filter(r => r.deferred);
  if (deferred.length) {
    out.push('## Deferred', '');
    for (const r of deferred) out.push(`- ${r.id} — ${line(r.deferred)}`);
    out.push('');
  }
  if (verdict.notes?.length) {
    out.push('## Notes', '');
    for (const n of verdict.notes) out.push(`- ${line(n)}`);
    out.push('');
  }
  const overrides = verdict.figma?.overrides ?? [];
  if (overrides.length) {
    out.push('## Figma overrides honoured (from HEAD)', '');
    for (const o of overrides) {
      out.push(
        `- ${line(o.where)} › ${line(o.target)} › ${line(o.prop)}: Figma ${line(o.figma)} → ${line(o.value)} — ` +
          `${line(o.reason)}; decided by ${line(o.decidedBy)}; commit ${line(o.commit)}`,
      );
    }
    out.push('');
  }
  // Script warnings (R4): non-blocking, never counted toward the state, and
  // never a finding already reported as INCOMPLETE via `noTarget` (S6).
  const warnings = verdict.warnings ?? [];
  if (warnings.length) {
    out.push(`## Warnings (non-blocking) (${warnings.length})`, '');
    for (const w of warnings) {
      out.push(`- ${line(w.check)} — ${line(w.message)} (verify: \`${line(w.verify)}\`)`);
    }
    out.push('');
  }

  const sections = [
    [STATE.INCOMPLETE, 'INCOMPLETE — checks that did not produce a result'],
    [STATE.FAIL, 'FAIL — blocking findings'],
    [STATE.NEEDS_DECISION, 'NEEDS-DECISION — the audit does not pick an option'],
  ];
  const entries = verdict.entries ?? [];
  for (const [kind, title] of sections) {
    const list = entries.filter(e => e.kind === kind);
    if (!list.length) continue;
    out.push(`## ${title} (${list.length})`, '');
    for (const e of list) out.push(renderEntry(e));
  }
  if (!entries.length) out.push('Nothing to fix.', '');

  const advisory = verdict.advisory ?? [];
  if (advisory.length) {
    out.push(`## Advisory — AI findings, they do not change the state at ${verdict.depth} (${advisory.length})`, '');
    for (const e of advisory) out.push(renderEntry(e));
  }
  return `${out.join('\n').replace(/\n+$/, '')}\n`;
}
