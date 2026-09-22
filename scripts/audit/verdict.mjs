#!/usr/bin/env node
/**
 * verdict.mjs
 *
 * Computes the audit verdict for a component from the inputs of one run, and
 * is the ONLY writer of `audit/<component>/verdict.json` (plan
 * `2026-09-21-audit-component-depths.md` Design §1). It rebuilds the file from
 * its inputs on every run, so a hand-edited or AI-written verdict never
 * survives the next one.
 *
 * Layout (git-ignored):
 *   audit/<component>/verdict.json          stable path, rewritten every run
 *   audit/<component>/fix-brief.md          stable path, rewritten every run
 *   audit/<component>/runs/<run>/envelope.json              run-all's per-component envelope
 *   audit/<component>/runs/<run>/ai/<leg>/ai-findings.json  written by an AI leg, nothing else
 *   audit/_run/summary.json                 worst state over the components of the last run
 *
 * State, first match wins: INCOMPLETE → FAIL → NEEDS-DECISION → PASS.
 * `level` exists only on PASS and is computed from the depth and the excuses.
 *
 * Usage:
 *   node scripts/audit/verdict.mjs <component | --changed | --all> [--depth quick|standard|deep] [run-all options]
 *     Runs run-all.mjs with --verdict, then exits with the worst state's code.
 *   node scripts/audit/verdict.mjs --run-dir audit/<component>/runs/<run> [--run-dir …] [--json]
 *     Recomputes from a run's inputs — e.g. after the deep AI legs wrote their ai-findings.json.
 *
 * Exit codes (lib/exit-codes.mjs STATE_EXIT_CODES): 0 PASS, 1 FAIL, 3 INCOMPLETE,
 * 4 NEEDS-DECISION, 2 usage / internal error. On several components the worst state decides.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { basename, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { REPO_ROOT } from './lib/component-paths.mjs';
import { EXIT_INTERNAL, exitCodeForState } from './lib/exit-codes.mjs';
import { headManifestRelPath, manifestRelPath } from './lib/figma-manifest.mjs';
import {
  AI_FINDINGS_SCHEMA_VERSION,
  AI_LEG_STATUS,
  LEVEL,
  ROW_STATUS,
  SCHEMA_VERSION,
  STATE,
  VERDICT_SCHEMA_VERSION,
} from './lib/json-output.mjs';
import { renderFixBrief } from './lib/fix-brief.mjs';
import { currentLegHashes, defaultReadPrompt, defaultReadSources } from './lib/leg-input.mjs';
import { parseCli as parseRunAllCli } from './lib/cli-args.mjs';

const TOOL = 'verdict';

// ─── The one table: what each depth requires ─────────────────────────────

const QUICK = ['lint', '01', '02', '03', '04', '05', '07', '14', '16', '17'];
const STANDARD = [...QUICK, '06', '08', '13', '18', '09', '10', '11', '12', '15', '19'];
/**
 * `deep` contents, each mapped to what implements it:
 *   live Figma reference check           → figma-refs (`figma-refs.mjs --check`, file version recorded)
 *   adapter smoke build, React           → adapter-react (`yarn build.react`: wrapper + its typecheck)
 *   adapter smoke build, vanilla         → adapter-vanilla (`yarn build.web` only; no vanilla-specific rules)
 *   stencil-compliance manual rows       → ai-stencil      (leg: stencil-compliance skill)
 *   full WCAG                            → ai-wcag         (leg: a11y-verifier)
 *   reduced-motion / forced-colors / 320 px / RTL → ai-media (leg: a11y-verifier)
 *   every Figma state × both themes      → ai-figma-themes (leg: pixel-perfect-verifier)
 *   archetype judgment (CX)              → ai-archetype    (leg: audit-component, the skill session)
 *   security                             → ai-security     (leg: audit-component, the skill session)
 *   E2E when present                     → e2e, deferred (DEFERRED_CHECKS)
 */
const DEEP = [
  ...STANDARD,
  'figma-refs',
  'adapter-react',
  'adapter-vanilla',
  'ai-stencil',
  'ai-wcag',
  'ai-media',
  'ai-figma-themes',
  'ai-archetype',
  'ai-security',
];

export const REQUIRED_CHECKS = Object.freeze({ quick: QUICK, standard: STANDARD, deep: DEEP });

/** Items a depth reports as a row but cannot run yet, each with its reason. */
export const DEFERRED_CHECKS = Object.freeze({
  quick: [],
  standard: [],
  deep: [{ id: 'e2e', reason: 'no E2E test project exists (plan F9); --e2e folds into deep and is recorded here' }],
});

/** Ids that compare against Figma — excused by --no-figma, a committed design "none", or no manifest at HEAD. */
export const FIGMA_IDS = Object.freeze(['11', '15', 'figma-refs', 'ai-figma-themes']);
/** Ids that need a browser — excused by --ci, the CI env var, or --no-browser (Decision §6). */
export const BROWSER_IDS = Object.freeze([
  '09',
  '10',
  '11',
  '12',
  '15',
  '19',
  'ai-wcag',
  'ai-media',
  'ai-figma-themes',
  'ai-archetype',
]);

/**
 * The excuse that lets a required id not run, or null. These and nothing
 * else (Design §1). Shared with run-all.mjs, which does not schedule an
 * excused id. Pure.
 *
 * @param {string} id
 * @param {{ noFigma?: boolean, figma?: object|null, browserWaiver?: string|null }} ctx
 */
export function excuseFor(id, { noFigma = false, figma = null, browserWaiver = null } = {}) {
  if (FIGMA_IDS.includes(id)) {
    if (noFigma) return 'figma: waived (flag)';
    if (figma?.status === 'design-none') {
      return `figma: design none (${figma.design.reason}; decided by ${figma.design.decidedBy}; commit ${figma.commit})`;
    }
    if (figma?.status === 'absent') return 'figma: no manifest at HEAD';
  }
  if (BROWSER_IDS.includes(id) && browserWaiver) return `browser: waived (${browserWaiver})`;
  return null;
}

// ─── Pure computation ────────────────────────────────────────────────────

const STATE_ORDER = [STATE.INCOMPLETE, STATE.FAIL, STATE.NEEDS_DECISION, STATE.PASS];

/** The worse of several states under the verdict precedence; no states → PASS. Pure. */
export function worstState(states) {
  let worst = STATE.PASS;
  for (const s of states) if (STATE_ORDER.indexOf(s) < STATE_ORDER.indexOf(worst)) worst = s;
  return worst;
}

function major(version) {
  const m = String(version ?? '').match(/^(\d+)\./);
  return m ? Number(m[1]) : null;
}

/** Stderr text varies between identical runs; the verdict keeps only its class. */
function errorClass(row) {
  if (row.errorClass) return row.errorClass;
  const error = String(row.error ?? '');
  if (error.startsWith('failed to parse output JSON')) return 'invalid-json';
  if (error.startsWith('no result envelope')) return 'no-envelope';
  if (row.exitCode === null || row.exitCode === undefined) return 'spawn-error';
  return `exit-${row.exitCode}`;
}

function verifyCommand(component, depth, id) {
  return `node scripts/audit/run-all.mjs ${component} --depth ${depth} --only ${id} --json`;
}

function rerunVerdictCommand(component) {
  return `node scripts/audit/verdict.mjs --run-dir audit/${component}/runs/<run>`;
}

/** Map the orchestrator's HEAD copy back to the manifest a fixer edits (Design §8). */
function mapManifestPath(text, component) {
  if (typeof text !== 'string') return text;
  return text.split(headManifestRelPath(component)).join(manifestRelPath(component));
}

function locationOf(f, component) {
  const file = mapManifestPath(f.file, component);
  if (!file) return `src/components/${component}/`;
  return f.line !== undefined ? `${file}:${f.line}` : file;
}

function compareFindings(a, b) {
  const key = f => [f.file ?? '', String(f.line ?? '').padStart(8, '0'), f.code ?? '', f.message ?? ''].join('\u0000');
  return key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0;
}

function failEntry({ f, check, component, source, verify, owner }) {
  const expected =
    f.expected && typeof f.expected === 'object'
      ? { value: String(f.expected.value), source: mapManifestPath(f.expected.source, component) }
      : { value: f.fix ? `no ${f.code} finding — ${f.fix}` : `no ${f.code} finding`, source };
  return {
    kind: STATE.FAIL,
    severity: f.severity,
    check,
    code: f.code,
    location: locationOf(f, component),
    expected,
    actual: mapManifestPath(f.actual !== undefined ? String(f.actual) : f.message, component),
    verify,
    owner,
  };
}

function aiFailOrDecision(f, leg, component) {
  if (typeof f.question === 'string' && f.question) {
    return {
      kind: STATE.NEEDS_DECISION,
      node: f.node ?? 'n/a',
      question: f.question,
      options: Array.isArray(f.options) && f.options.length ? f.options.map(String) : ['(the leg listed no options)'],
    };
  }
  return failEntry({
    f,
    check: `ai ${leg}`,
    component,
    source: `AI leg ${leg}`,
    verify: `re-dispatch the ${leg} leg, then: ${rerunVerdictCommand(component)}`,
    owner: leg,
  });
}

/**
 * A finding whose kind renderFixBrief renders as FAIL needs `severity` and
 * (`message` or `actual`) — BRIEF_FIELDS[FAIL] in fix-brief.mjs. A finding
 * carrying a non-empty `question` renders as NEEDS-DECISION instead, whose
 * fields (`node`, `options`) are always defaulted by aiFailOrDecision, so it
 * needs no shape check here. Pure. Returns a cause string, or null when the
 * finding's shape is safe to render.
 */
function findingShapeIssue(f, index) {
  if (!f || typeof f !== 'object') return `finding[${index}] is not an object`;
  if (typeof f.question === 'string' && f.question) return null;
  const missing = [];
  if (typeof f.severity !== 'string' || !f.severity) missing.push('severity');
  if (f.message === undefined && f.actual === undefined) missing.push('message or actual');
  return missing.length ? `finding[${index}] (${f.code ?? 'no code'}) missing ${missing.join(', ')}` : null;
}

/**
 * Close an opened AI-leg row with its leg's ai-findings.json (Design §1). A
 * row closes only when the file names the leg, lists every id the row
 * judges, carries a known major schemaVersion, and — when it states one —
 * the input hash the row was opened with. A finding whose shape would make
 * the fix brief unrenderable (missing `severity`, or missing both `message`
 * and `actual`) also leaves the row unclosed, named by its index. Pure.
 *
 * @returns {{ closed: true, file: object } | { closed: false, cause: string }}
 */
export function closeAiRow(row, aiFiles) {
  const file = aiFiles.find(a => a.leg === row.leg);
  if (!file) return { closed: false, cause: `no ai-findings.json from leg ${row.leg}` };
  if (!file.data) return { closed: false, cause: `ai-findings.json from leg ${row.leg} is unreadable` };
  const data = file.data;
  if (major(data.schemaVersion) !== major(AI_FINDINGS_SCHEMA_VERSION)) {
    return {
      closed: false,
      cause: `ai-findings.json schemaVersion ${data.schemaVersion} has an unknown major version`,
    };
  }
  if (data.leg !== row.leg) return { closed: false, cause: `ai-findings.json names leg ${data.leg}, not ${row.leg}` };
  const judged = new Set(Array.isArray(data.idsJudged) ? data.idsJudged : []);
  const missing = row.idsJudged.filter(id => !judged.has(id));
  if (missing.length) return { closed: false, cause: `ai-findings.json does not list ${missing.join(', ')}` };
  // The leg's own self-reported `inputHash` is never consulted (Decision §7,
  // plan `2026-09-22-audit-depths-sentinel-fixes.md`): a recompute re-hashes
  // the current sources itself and compares against the row's recorded hash
  // (computeVerdict's `currentHashes`), which a self-report cannot add to.
  if (!Array.isArray(data.findings)) return { closed: false, cause: 'ai-findings.json has no findings array' };
  for (const [i, f] of data.findings.entries()) {
    const issue = findingShapeIssue(f, i);
    if (issue) return { closed: false, cause: `ai-findings.json from leg ${row.leg}: ${issue}` };
  }
  return { closed: true, file: data };
}

/**
 * Compute a component's verdict from one run's inputs. Pure: the same inputs
 * give the same object, and nothing that varies between identical runs
 * (timestamps, durations, stderr text, the run directory) is read.
 *
 * @param {object} opts
 * @param {object|null} opts.envelope — run-all's per-component envelope
 * @param {Array<{leg: string, data: object|null}>} [opts.aiFiles]
 * @param {string} [opts.component] — used when the envelope is missing
 * @param {Record<string,string>|null} [opts.currentHashes] — id → current
 *   `sha256:...` of what an `ai-*` leg judges, as of right now (`lib/leg-input.mjs`
 *   `currentLegHashes`). `null` skips the staleness check entirely (Decision §7).
 */
export function computeVerdict({ envelope, aiFiles = [], component: fallbackComponent = null, currentHashes = null }) {
  const audit = envelope?.audit ?? {};
  const component = audit.component ?? fallbackComponent ?? envelope?.target ?? 'unknown';
  const depth = audit.depth ?? 'standard';
  const noFigma = Boolean(audit.noFigma);
  const browserWaiver = audit.browserWaiver ?? null;
  const figma = audit.figma ?? null;
  const filters = { only: audit.filters?.only ?? [], skip: audit.filters?.skip ?? [] };
  const ctx = { noFigma, figma, browserWaiver };

  const incomplete = [];
  const fails = [];
  const decisions = [];
  const advisory = [];
  const notes = [];
  const excuses = [];
  const rows = [];
  const warnings = [];
  const addExcuse = e => {
    if (!excuses.includes(e)) excuses.push(e);
  };
  // Parallel to `incomplete`: true for an entry that is an opened `ai-*` row
  // whose current source hash still matches — the only shape `awaitingLegs`
  // (Decision §1) counts. Every other INCOMPLETE cause (a non-ai row, a leg
  // never opened, a stale hash) pushes `false`.
  const awaitingFlags = [];
  const addIncomplete = (entry, awaiting = false) => {
    incomplete.push(entry);
    awaitingFlags.push(awaiting);
  };

  if (!envelope) {
    addIncomplete({
      kind: STATE.INCOMPLETE,
      check: 'run-all',
      cause: 'no envelope for this run — the orchestrator did not finish',
      prerequisite: 'none',
      verify: `yarn audit:component ${component} --depth ${depth}`,
    });
  } else if (major(envelope.schemaVersion) !== major(SCHEMA_VERSION)) {
    addIncomplete({
      kind: STATE.INCOMPLETE,
      check: 'run-all',
      cause: `envelope schemaVersion ${envelope.schemaVersion} has an unknown major version`,
      prerequisite: 'none',
      verify: `yarn audit:component ${component} --depth ${depth}`,
    });
  }
  if (envelope?.preflight && envelope.preflight.ok === false) {
    addIncomplete({
      kind: STATE.INCOMPLETE,
      check: 'env-preflight',
      cause: envelope.preflight.cause,
      prerequisite: envelope.preflight.command,
      verify: `yarn audit:component ${component} --depth ${depth}`,
    });
  }

  const required = REQUIRED_CHECKS[depth] ?? REQUIRED_CHECKS.standard;
  const resultRows = envelope?.results ?? [];
  const byId = new Map(resultRows.map(r => [r.id, r]));
  const findingsByTool = envelope?.findingsByTool ?? {};
  const aiRequired = required.filter(id => id.startsWith('ai-'));
  const scriptIds = [
    ...required.filter(id => !id.startsWith('ai-')),
    ...resultRows
      .map(r => r.id)
      .filter(id => !required.includes(id))
      .sort(),
  ];

  for (const id of scriptIds) {
    const row = byId.get(id);
    const isRequired = required.includes(id);
    if (!row) {
      if (!isRequired) continue;
      const excuse = envelope ? excuseFor(id, ctx) : null;
      if (excuse) {
        addExcuse(excuse);
        rows.push({ id, name: null, required: true, status: ROW_STATUS.SKIPPED, excuse });
        continue;
      }
      if (!envelope || envelope.preflight?.ok === false) continue;
      const cause = filters.skip.includes(id)
        ? 'required at this depth, dropped by --skip'
        : filters.only.length && !filters.only.includes(id)
          ? 'required at this depth, dropped by --only'
          : 'required at this depth, did not run';
      rows.push({ id, name: null, required: true, status: ROW_STATUS.SKIPPED });
      addIncomplete({
        kind: STATE.INCOMPLETE,
        check: id,
        cause,
        prerequisite: 'none',
        verify: verifyCommand(component, depth, id),
      });
      continue;
    }
    const summary = row.summary ?? null;
    const out = {
      id,
      name: row.name,
      required: isRequired,
      status: row.status,
      errors: summary?.errors ?? 0,
      warnings: summary?.warnings ?? 0,
    };
    if (row.deferred) out.deferred = row.deferred;
    if (row.status === ROW_STATUS.CRASHED || row.status === ROW_STATUS.MISSING_PREREQ) {
      out.errorClass = errorClass(row);
      addIncomplete({
        kind: STATE.INCOMPLETE,
        check: `${id} ${row.name}`,
        cause: `${row.status} (${out.errorClass})`,
        prerequisite: row.prerequisite ?? 'none',
        verify: verifyCommand(component, depth, id),
      });
    } else if (row.status === ROW_STATUS.OK) {
      const allFindings = findingsByTool[row.name] ?? [];
      // A required row that checked nothing (Decision §5): INCOMPLETE, not a
      // FAIL — the fix is a missing input, and it never also lands in R4's
      // warnings below.
      const noTargetFindings = allFindings.filter(f => f.noTarget === true);
      if (isRequired) {
        for (const f of noTargetFindings) {
          addIncomplete({
            kind: STATE.INCOMPLETE,
            check: `${id} ${row.name}`,
            cause: `no target resolved (${f.code ?? 'no code'}): ${f.message ?? 'no target to check'}`,
            prerequisite: f.fix || 'resolve the missing input named in the finding',
            verify: verifyCommand(component, depth, id),
          });
        }
      }
      if (row.blocking !== false) {
        const found = allFindings.filter(f => f.severity === 'error' && f.noTarget !== true).sort(compareFindings);
        for (const f of found) {
          fails.push(
            failEntry({
              f,
              check: `${id} ${row.name}`,
              component,
              source: `rule ${f.code} (${row.file ? `scripts/audit/${row.file}` : row.name})`,
              verify: verifyCommand(component, depth, id),
              owner: row.owner ?? '/modify-component',
            }),
          );
        }
        for (const f of allFindings.filter(f => f.severity === 'warning' && f.noTarget !== true)) {
          warnings.push({
            check: `${id} ${row.name}`,
            code: f.code,
            message: f.message || f.fix || 'warning',
            verify: verifyCommand(component, depth, id),
          });
        }
      }
    }
    rows.push(out);
  }

  // AI legs: declared rows at deep only; advisory everywhere else (Decision §5).
  const openedLegs = audit.aiLegs ?? [];
  const legs = [];
  // One leg can own several rows (a11y-verifier: ai-wcag + ai-media) from a single file;
  // its findings are read once, not once per row it closes.
  const legsRead = new Set();
  if (depth === 'deep') {
    for (const id of aiRequired) {
      const excuse = excuseFor(id, ctx);
      const opened = openedLegs.find(r => r.id === id);
      if (excuse) {
        addExcuse(excuse);
        rows.push({ id, name: null, required: true, status: ROW_STATUS.SKIPPED, excuse });
        continue;
      }
      if (!opened) {
        rows.push({ id, name: null, required: true, status: ROW_STATUS.SKIPPED });
        if (envelope && envelope.preflight?.ok !== false) {
          // Never opened at all is not "awaiting" a leg's return (Decision §1
          // of this plan) — it is a leg the orchestrator should have dispatched.
          addIncomplete({
            kind: STATE.INCOMPLETE,
            check: id,
            cause: 'required AI leg was never opened by the orchestrator',
            prerequisite: 'none',
            verify: verifyCommand(component, depth, id),
          });
        }
        continue;
      }
      // R2 (Decision §7): the recompute's own re-hash of the current sources
      // decides staleness, never the leg's self-reported inputHash. A mismatch
      // leaves the row unclosed and is not "awaiting legs" — the sources moved
      // under it, so re-dispatching the same leg would judge stale code.
      const currentHash = currentHashes ? (currentHashes[id] ?? null) : null;
      const hashStale = currentHash !== null && Boolean(opened.inputHash) && currentHash !== opened.inputHash;
      const closure = hashStale
        ? { closed: false, cause: 'source changed since run <run> — start a fresh run' }
        : closeAiRow(opened, aiFiles);
      legs.push({
        id,
        leg: opened.leg,
        idsJudged: opened.idsJudged,
        inputHash: opened.inputHash,
        status: closure.closed ? AI_LEG_STATUS.CLOSED : AI_LEG_STATUS.OPEN,
      });
      rows.push({
        id,
        name: opened.leg,
        required: true,
        status: closure.closed ? ROW_STATUS.OK : ROW_STATUS.MISSING_PREREQ,
      });
      if (!closure.closed) {
        addIncomplete(
          {
            kind: STATE.INCOMPLETE,
            check: `${id} ${opened.leg}`,
            cause: hashStale ? closure.cause : `missing-prereq (${closure.cause})`,
            prerequisite: hashStale
              ? `a fresh run: yarn audit:component ${component} --depth ${depth}`
              : `dispatch the ${opened.leg} leg; it writes audit/${component}/runs/<run>/ai/${opened.leg}/ai-findings.json`,
            verify: rerunVerdictCommand(component),
          },
          !hashStale,
        );
        continue;
      }
      if (legsRead.has(opened.leg)) continue;
      legsRead.add(opened.leg);
      for (const f of [...closure.file.findings].sort(compareFindings)) {
        const entry = aiFailOrDecision(f, opened.leg, component);
        if (entry.kind === STATE.NEEDS_DECISION) decisions.push(entry);
        else if (f.severity === 'error') fails.push(entry);
        else advisory.push(entry);
      }
    }
  } else {
    for (const file of [...aiFiles].sort((a, b) => (a.leg < b.leg ? -1 : a.leg > b.leg ? 1 : 0))) {
      if (!file.data || major(file.data.schemaVersion) !== major(AI_FINDINGS_SCHEMA_VERSION)) {
        notes.push(`ai-findings.json from leg ${file.leg} ignored: unreadable or unknown major schemaVersion`);
        continue;
      }
      const rawFindings = Array.isArray(file.data.findings) ? file.data.findings : [];
      const validFindings = [];
      rawFindings.forEach((f, i) => {
        const issue = findingShapeIssue(f, i);
        if (issue) notes.push(`ai-findings.json from leg ${file.leg}: ${issue} — finding ignored`);
        else validFindings.push(f);
      });
      // Advisory only — never state-changing at quick/standard (Decision §5).
      // A question-shaped finding renders as an advisory decision entry
      // rather than being forced through the FAIL shape (S3): `aiFailOrDecision`
      // already picks the right shape and never needs severity/actual for one.
      for (const f of validFindings.sort(compareFindings)) {
        advisory.push(aiFailOrDecision(f, file.leg, component));
      }
    }
  }

  // Figma gate: no manifest at HEAD at standard or deeper → NEEDS-DECISION (Decision §2).
  if (depth !== 'quick' && !noFigma && figma?.status === 'absent') {
    decisions.unshift({
      kind: STATE.NEEDS_DECISION,
      node: 'no manifest',
      question: `${component} has no Figma state manifest at HEAD${figma.workingTreeOnly ? ' (manifest present, uncommitted)' : ''}. Which design does it follow?`,
      options: [
        `Commit ${manifestRelPath(component)} citing the Figma file key and a node id per state (see .claude/skills/pixel-perfect/SKILL.md).`,
        `Commit ${manifestRelPath(component)} as { "figma": { "design": "none", "reason": "…", "decidedBy": "…" } } if the component has no design.`,
        'Run this audit with --no-figma to check everything else now (the level is capped at MERGE-READY).',
      ],
    });
    if (figma.workingTreeOnly) notes.push('manifest present, uncommitted — not honoured');
  }
  if (figma?.pending) notes.push('pending manifest change — not honoured');

  for (const s of figma?.skips ?? []) addExcuse(`figma: skip ${s.node} (${s.reason}; commit ${figma.commit})`);

  // First match wins.
  const state = incomplete.length
    ? STATE.INCOMPLETE
    : fails.length
      ? STATE.FAIL
      : decisions.length
        ? STATE.NEEDS_DECISION
        : STATE.PASS;
  const level = state === STATE.PASS ? levelFor({ depth, browserWaiver, noFigma }) : null;
  // Decision §1: true only when every INCOMPLETE entry is an opened `ai-*`
  // row whose hash still matches — never a constant, never vacuous over an
  // empty list (a PASS/FAIL run has no INCOMPLETE entries at all).
  const awaitingLegs = incomplete.length > 0 && awaitingFlags.every(Boolean);

  const number = (list, prefix) => list.map((e, i) => ({ id: `${prefix}${i + 1}`, ...e }));
  const entries = [...number(incomplete, 'I'), ...number(fails, 'F'), ...number(decisions, 'D')];

  const headlineParts = [`${state}@${depth}`];
  if (level) headlineParts.push(level);
  headlineParts.push(...excuses);
  if (depth === 'deep') headlineParts.push('ai-legs: self-attested');

  const verdict = {
    schemaVersion: VERDICT_SCHEMA_VERSION,
    component,
    depth,
    state,
  };
  if (level) verdict.level = level;
  verdict.headline = headlineParts.join(' · ');
  verdict.excuses = excuses;
  verdict.notes = notes;
  verdict.awaitingLegs = awaitingLegs;
  verdict.warnings = warnings;
  verdict.figma = figma
    ? {
        manifest: figma.rel ?? manifestRelPath(component),
        status: figma.status,
        commit: figma.commit ?? null,
        design: figma.design ?? null,
        overrides: (figma.overrides ?? []).map(o => ({ ...o, commit: figma.commit ?? null })),
        skips: figma.skips ?? [],
        fileVersion: figmaFileVersion(resultRows),
      }
    : null;
  if (depth === 'deep') verdict.aiLegs = { attestation: 'self-attested', legs };
  verdict.rows = rows;
  verdict.entries = entries;
  verdict.advisory = number(advisory, 'A');
  return verdict;
}

function figmaFileVersion(rows) {
  const row = rows.find(r => r.id === 'figma-refs');
  return row?.meta?.version ?? null;
}

/** `level`, computed never chosen (Design §1). Pure. */
export function levelFor({ depth, browserWaiver, noFigma }) {
  if (depth === 'quick' || browserWaiver) return LEVEL.CLEAN_STATIC;
  if (depth === 'standard' || noFigma) return LEVEL.MERGE_READY;
  return LEVEL.PRODUCTION_READY;
}

// ─── I/O: the only writer ────────────────────────────────────────────────

/**
 * Read a run directory's inputs, plus the current input hash of every `ai-*`
 * id (R2, Decision §7) — computed here, the I/O layer, and handed to the
 * pure `computeVerdict` as `currentHashes`. `repoRoot` / `readSources` /
 * `readPrompt` are an injection seam for tests; production always re-hashes
 * the real, current source tree.
 */
export function readRunInputs(
  runDir,
  { component = null, repoRoot = REPO_ROOT, readSources = defaultReadSources, readPrompt = defaultReadPrompt } = {},
) {
  const envelopePath = join(runDir, 'envelope.json');
  let envelope = null;
  if (existsSync(envelopePath)) {
    try {
      envelope = JSON.parse(readFileSync(envelopePath, 'utf8'));
    } catch {
      envelope = null;
    }
  }
  const aiDir = join(runDir, 'ai');
  const aiFiles = [];
  if (existsSync(aiDir)) {
    for (const leg of readdirSync(aiDir).sort()) {
      const file = join(aiDir, leg, 'ai-findings.json');
      if (!existsSync(file)) continue;
      let data = null;
      try {
        data = JSON.parse(readFileSync(file, 'utf8'));
      } catch {
        data = null;
      }
      aiFiles.push({ leg, data });
    }
  }
  const resolvedComponent = component ?? envelope?.audit?.component ?? basename(resolve(runDir, '..', '..'));
  const currentHashes = currentLegHashes(repoRoot, resolvedComponent, { readSources, readPrompt });
  return { envelope, aiFiles, currentHashes };
}

/**
 * Compute and write `verdict.json` + `fix-brief.md` for one run directory
 * (`<auditDir>/<component>/runs/<run>`). The component directory is two
 * levels up, so the stable paths never depend on the run name. `legDeps`
 * (`repoRoot` / `readSources` / `readPrompt`) forwards to `readRunInputs`'s
 * re-hash — an injection seam for tests, unset in production.
 */
export function writeVerdictForRun(runDir, legDeps = {}) {
  const absRun = resolve(runDir);
  const componentDir = resolve(absRun, '..', '..');
  const component = basename(componentDir);
  const { envelope, aiFiles, currentHashes } = readRunInputs(absRun, { component, ...legDeps });
  const verdict = computeVerdict({ envelope, aiFiles, component, currentHashes });
  // Decision §10: the repo-relative form a caller can pass straight back to
  // `--run-dir` (S8 validates that shape). Computed here, not in the pure
  // computeVerdict, since only the I/O layer knows the run directory.
  verdict.runDir = relative(REPO_ROOT, absRun).split(sep).join('/');
  // Render before writing either file: a render failure (an entry the renderer
  // cannot shape) must never leave a freshly-written verdict.json beside a
  // stale fix-brief.md — throwing here leaves both files exactly as they were.
  const brief = renderFixBrief(verdict, { run: basename(absRun) });
  mkdirSync(componentDir, { recursive: true });
  writeFileSync(join(componentDir, 'verdict.json'), `${JSON.stringify(verdict, null, 2)}\n`);
  writeFileSync(join(componentDir, 'fix-brief.md'), brief);
  return verdict;
}

/** Write `<auditDir>/_run/summary.json`: every component's state plus the worst one. */
export function writeSummary(auditDir, { depth, runs, preflight = null }) {
  const components = runs.map(({ verdict, runDir }) => ({
    component: verdict.component,
    state: verdict.state,
    ...(verdict.level ? { level: verdict.level } : {}),
    headline: verdict.headline,
    runDir: relative(auditDir, resolve(runDir)),
  }));
  const states = components.map(c => c.state);
  if (preflight) states.push(STATE.INCOMPLETE);
  const summary = {
    schemaVersion: VERDICT_SCHEMA_VERSION,
    depth,
    state: worstState(states),
    components,
  };
  if (preflight) summary.preflight = preflight;
  if (components.length === 0 && !preflight) summary.note = 'no components selected';
  const dir = join(auditDir, '_run');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
  return summary;
}

// ─── CLI ─────────────────────────────────────────────────────────────────

const USAGE = `Usage:
  node scripts/audit/verdict.mjs <component | --changed | --all> [--depth quick|standard|deep] [run-all options]
  node scripts/audit/verdict.mjs --run-dir audit/<component>/runs/<run> [--run-dir …] [--json]

The first form runs run-all.mjs with --verdict and exits with the worst state's
code; the second recomputes the verdict from a run's inputs (after the deep AI
legs wrote ai-findings.json). Exit: 0 PASS, 1 FAIL, 3 INCOMPLETE,
4 NEEDS-DECISION, 2 usage or internal error.`;

function printSummary(summary, json) {
  if (json) {
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
    return;
  }
  for (const c of summary.components) {
    process.stdout.write(`${c.component}: ${c.headline} — audit/${c.component}/fix-brief.md\n`);
  }
  if (summary.preflight) process.stdout.write(`${summary.preflight.message}\n`);
  process.stdout.write(`state: ${summary.state}\n`);
}

/**
 * S8: `--run-dir` must resolve to exactly `<auditRoot>/<mud-component>/runs/<run>`
 * — never a bare id, never a path that climbs out via `..`, never a component
 * or run segment that is itself `.` / `..` / carries a path separator. Pure.
 *
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
export function validateRunDirArg(runDirArg, auditRoot) {
  const abs = resolve(runDirArg);
  const rootAbs = resolve(auditRoot);
  const rel = relative(rootAbs, abs);
  if (rel === '' || rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
    return { ok: false, reason: `--run-dir must be under ${rootAbs} (got "${runDirArg}")` };
  }
  const parts = rel.split(sep);
  if (parts.length !== 3 || parts[1] !== 'runs') {
    return { ok: false, reason: `--run-dir must match <auditRoot>/mud-*/runs/<run> (got "${runDirArg}")` };
  }
  const [component, , run] = parts;
  if (!/^mud-[a-z0-9-]+$/.test(component)) {
    return { ok: false, reason: `--run-dir's component segment must look like "mud-*" (got "${component}")` };
  }
  if (!run || run === '.' || run === '..' || run.includes('/') || run.includes(sep)) {
    return { ok: false, reason: `--run-dir's run segment is invalid (got "${run}")` };
  }
  return { ok: true };
}

function recompute(runDirs, json) {
  const runs = runDirs.map(runDir => ({ runDir, verdict: writeVerdictForRun(runDir) }));
  const auditDir = resolve(runDirs[0], '..', '..', '..');
  const summary = writeSummary(auditDir, { depth: runs[0].verdict.depth, runs });
  printSummary(summary, json);
  return exitCodeForState(summary.state);
}

function runFresh(argv) {
  const json = argv.includes('--json');
  const forwarded = argv.filter(a => a !== '--json');
  const auditDirIndex = forwarded.indexOf('--audit-dir');
  const auditDir = auditDirIndex >= 0 ? resolve(forwarded[auditDirIndex + 1]) : join(REPO_ROOT, 'audit');
  // S9: validate the run-all flags before spawning — a usage error (e.g.
  // `--depth depp`) must exit 2 before any child process starts, never fall
  // through to "run-all exited without a summary" (which is INCOMPLETE / 3).
  // `parseRunAllCli` exits 2 itself on a usage error (lib/cli-args.mjs).
  parseRunAllCli(forwarded);
  const summaryPath = join(auditDir, '_run', 'summary.json');
  // A summary left by an earlier run must never stand in for this one.
  rmSync(summaryPath, { force: true });
  const extra = ['--verdict'];
  if (json) extra.push('--out', join(auditDir, '_run', 'envelope.json'));
  const res = spawnSync(
    process.execPath,
    [join(REPO_ROOT, 'scripts', 'audit', 'run-all.mjs'), ...forwarded, ...extra],
    {
      stdio: ['ignore', json ? 'ignore' : 'inherit', 'inherit'],
    },
  );
  if (!existsSync(summaryPath)) {
    process.stderr.write(`${TOOL}: run-all exited ${res.status} without writing ${summaryPath} — INCOMPLETE.\n`);
    return exitCodeForState(STATE.INCOMPLETE);
  }
  const summary = JSON.parse(readFileSync(summaryPath, 'utf8'));
  printSummary(summary, json);
  return exitCodeForState(summary.state);
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--help') || argv.includes('-h')) {
    process.stdout.write(`${USAGE}\n`);
    return 0;
  }
  if (argv.includes('--run-dir')) {
    let parsed;
    try {
      parsed = parseArgs({
        args: argv,
        options: {
          'run-dir': { type: 'string', multiple: true },
          'json': { type: 'boolean', default: false },
          'audit-dir': { type: 'string' },
        },
        strict: true,
      });
    } catch (err) {
      process.stderr.write(`${TOOL}: ${err.message}\n\n${USAGE}\n`);
      return EXIT_INTERNAL;
    }
    const auditRoot = parsed.values['audit-dir'] ? resolve(parsed.values['audit-dir']) : join(REPO_ROOT, 'audit');
    for (const runDirArg of parsed.values['run-dir']) {
      const check = validateRunDirArg(runDirArg, auditRoot);
      if (!check.ok) {
        process.stderr.write(`${TOOL}: ${check.reason}\n\n${USAGE}\n`);
        return EXIT_INTERNAL;
      }
    }
    return recompute(parsed.values['run-dir'], parsed.values.json);
  }
  if (argv.length === 0) {
    process.stderr.write(`${USAGE}\n`);
    return EXIT_INTERNAL;
  }
  return runFresh(argv);
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isDirectRun) {
  try {
    process.exitCode = main();
  } catch (err) {
    process.stderr.write(`${TOOL}: internal error — ${err.stack ?? err.message ?? err}\n`);
    process.exitCode = EXIT_INTERNAL;
  }
}

export { TOOL };
