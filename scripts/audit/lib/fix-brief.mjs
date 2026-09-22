/**
 * fix-brief.mjs — renders `audit/<component>/fix-brief.md` from a verdict
 * (plan `2026-09-21-audit-component-depths.md` Design §2). One block per
 * non-PASS entry, one shape per state, so pasting the brief into a new
 * session is enough to start fixing without re-running the audit:
 *
 *   FAIL            ID · severity · check · location · expected (value + source) · actual · verify · owner
 *   INCOMPLETE      ID · check · cause · prerequisite (or, for a crash, log) · verify
 *   NEEDS-DECISION  ID · node (or "no manifest") · question · options — the audit never picks one
 *   Advisory        AI findings at quick / standard, in the FAIL shape; they never change the state
 *
 * A missing field is a renderer error, not an empty line: a brief that drops
 * the verify command or the expected value's source is the failure F8 names.
 */
import { STATE } from './json-output.mjs';

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
 * excused/deferred/notes/override/warning sections in `renderFixBrief`. Pure.
 */
function line(value) {
  if (value === '') return '(empty)';
  return String(value).replace(/\r\n|\r|\n/g, ' ⏎ ');
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

/** Render the whole brief. Pure — exported for tests. */
export function renderFixBrief(verdict) {
  const c = verdict.component;
  const out = [
    `# Fix brief — ${c} @ ${verdict.depth}`,
    '',
    `State: **${line(verdict.headline)}**`,
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
