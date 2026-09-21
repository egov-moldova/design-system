/**
 * fix-brief.mjs — renders `audit/<component>/fix-brief.md` from a verdict
 * (plan `2026-09-21-audit-component-depths.md` Design §2). One block per
 * non-PASS entry, one shape per state, so pasting the brief into a new
 * session is enough to start fixing without re-running the audit:
 *
 *   FAIL            ID · severity · check · location · expected (value + source) · actual · verify · owner
 *   INCOMPLETE      ID · check · cause · prerequisite · verify
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

function present(value) {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return present(value.value) && present(value.source);
  return true;
}

/**
 * Render one entry block. Throws when the entry lacks a field its kind
 * requires. Pure — exported for tests.
 */
export function renderEntry(entry) {
  const fields = BRIEF_FIELDS[entry.kind];
  if (!fields) throw new Error(`fix-brief: unknown entry kind "${entry.kind}"`);
  if (!present(entry.id)) throw new Error('fix-brief: entry has no id');
  const missing = fields.filter(f => !present(entry[f]));
  if (missing.length) {
    throw new Error(`fix-brief: ${entry.kind} entry ${entry.id} is missing ${missing.join(', ')}`);
  }
  const lines = [`### ${entry.id} · ${entry.kind}${entry.code ? ` · ${entry.code}` : ''}`, ''];
  for (const field of fields) {
    const value = entry[field];
    if (field === 'expected') {
      lines.push(`- expected: ${value.value} (source: ${value.source})`);
    } else if (field === 'options') {
      lines.push('- options:');
      value.forEach((o, i) => lines.push(`  ${i + 1}. ${o}`));
    } else if (field === 'verify') {
      lines.push(`- verify: \`${value}\``);
    } else {
      lines.push(`- ${field}: ${value}`);
    }
  }
  return `${lines.join('\n')}\n`;
}

function substituteRun(entry, run) {
  if (!run || typeof entry.verify !== 'string') return entry;
  return { ...entry, verify: entry.verify.replace('<run>', run) };
}

/**
 * Render the whole brief. `run` (the run directory name) only fills the
 * `<run>` placeholder in re-verdict commands; it never reaches verdict.json.
 * Pure — exported for tests.
 */
export function renderFixBrief(verdict, { run = null } = {}) {
  const c = verdict.component;
  const out = [
    `# Fix brief — ${c} @ ${verdict.depth}`,
    '',
    `State: **${verdict.headline}**`,
    '',
    `Verdict: \`audit/${c}/verdict.json\`. When every \`verify:\` below passes, re-run the whole audit at the same`,
    `depth — only that run can write a PASS: \`yarn audit:component ${c} --depth ${verdict.depth}\`.`,
    '',
  ];

  const excused = (verdict.rows ?? []).filter(r => r.excuse);
  if (excused.length) {
    out.push('## Checks not run (excused)', '');
    for (const r of excused) out.push(`- ${r.id} — ${r.excuse}`);
    out.push('');
  }
  const deferred = (verdict.rows ?? []).filter(r => r.deferred);
  if (deferred.length) {
    out.push('## Deferred', '');
    for (const r of deferred) out.push(`- ${r.id} — ${r.deferred}`);
    out.push('');
  }
  if (verdict.notes?.length) {
    out.push('## Notes', '');
    for (const n of verdict.notes) out.push(`- ${n}`);
    out.push('');
  }
  const overrides = verdict.figma?.overrides ?? [];
  if (overrides.length) {
    out.push('## Figma overrides honoured (from HEAD)', '');
    for (const o of overrides) {
      out.push(
        `- ${o.where} › ${o.target} › ${o.prop}: Figma ${o.figma} → ${o.value} — ${o.reason}; decided by ${o.decidedBy}; commit ${o.commit}`,
      );
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
    for (const e of list) out.push(renderEntry(substituteRun(e, run)));
  }
  if (!entries.length) out.push('Nothing to fix.', '');

  const advisory = verdict.advisory ?? [];
  if (advisory.length) {
    out.push(`## Advisory — AI findings, they do not change the state at ${verdict.depth} (${advisory.length})`, '');
    for (const e of advisory) out.push(renderEntry(substituteRun(e, run)));
  }
  return `${out.join('\n').replace(/\n+$/, '')}\n`;
}
