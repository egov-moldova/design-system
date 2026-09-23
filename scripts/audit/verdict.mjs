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
 *   audit/<component>/runs/<run>/ai/<leg>/ai-findings.json  written by an AI leg, advisory at every depth
 *   audit/<component>/runs/<run>/record.json  written by this module (plan
 *     2026-09-23-audit-run-delta.md Design §1); read only by a later run's
 *     comparison (lib/run-record.mjs), never an input to verdict.json itself
 *   audit/_run/summary.json                 worst state over the components of the last run
 *
 * State, first match wins: INCOMPLETE → FAIL → NEEDS-DECISION → PASS.
 * `level` exists only on PASS and is computed from the depth and the excuses.
 *
 * Usage:
 *   node scripts/audit/verdict.mjs <component | --changed | --all> [--depth quick|standard|deep] [run-all options]
 *     Runs run-all.mjs with --verdict, then exits with the worst state's code.
 *   node scripts/audit/verdict.mjs --rerender <component> [--rerender …] [--json]
 *     Re-renders that component's current run (from audit/_run/summary.json), e.g.
 *     to fold in the advisory ai-findings.json an AI leg wrote after the run.
 *   node scripts/audit/verdict.mjs --run-dir audit/<component>/runs/<run> [--run-dir …] [--json]
 *     The same, with the run named explicitly. Refused when the named run is not
 *     the component's current one.
 *
 * Exit codes (lib/exit-codes.mjs STATE_EXIT_CODES): 0 PASS, 1 FAIL, 3 INCOMPLETE,
 * 4 NEEDS-DECISION, 2 usage / internal error. On several components the worst state decides.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { REPO_ROOT, normalizeComponentName } from './lib/component-paths.mjs';
import { EXIT_INTERNAL, exitCodeForState } from './lib/exit-codes.mjs';
import { headManifestRelPath, manifestRelPath } from './lib/figma-manifest.mjs';
import {
  AI_FINDINGS_SCHEMA_VERSION,
  LEVEL,
  ROW_STATUS,
  SCHEMA_VERSION,
  STATE,
  SUMMARY_SCHEMA_VERSION,
  VERDICT_SCHEMA_VERSION,
  schemaMajor,
} from './lib/json-output.mjs';
import { REPORT_END, code, renderChanges, renderFixBrief, rerenderCommand } from './lib/fix-brief.mjs';
import {
  buildRunRecord,
  compareRecords,
  findPreviousRecord,
  listRunNames,
  runsComparableTo,
} from './lib/run-record.mjs';
import { parseCli as parseRunAllCli } from './lib/cli-args.mjs';
import { acquireLock, releaseLock } from './lib/storybook-helpers.mjs';

const TOOL = 'verdict';

// ─── The one table: what each depth requires ─────────────────────────────

const QUICK = ['lint', '01', '02', '03', '04', '05', '07', '14', '16', '17'];
const STANDARD = [...QUICK, '06', '08', '13', '18', '09', '10', '11', '12', '15', '19'];
/**
 * `deep` contents, each mapped to what implements it:
 *   live Figma reference check           → figma-refs (`figma-refs.mjs --check`, file version recorded)
 *   adapter smoke build, React           → adapter-react (`yarn build.react`: wrapper + its typecheck)
 *   adapter smoke build, vanilla         → adapter-vanilla (`yarn build.web` only; no vanilla-specific rules)
 *   E2E when present                     → e2e, deferred (DEFERRED_CHECKS)
 * The AI legs (stencil-compliance manual rows, full WCAG, media conditions,
 * Figma states × themes, archetype, security) are advisory at every depth,
 * `deep` included — no row is opened for them and they never move `state`
 * (Decision 12 of `2026-09-22-audit-depths-sentinel-fixes.md`).
 */
const DEEP = [...STANDARD, 'figma-refs', 'adapter-react', 'adapter-vanilla'];

export const REQUIRED_CHECKS = Object.freeze({ quick: QUICK, standard: STANDARD, deep: DEEP });

/** Items a depth reports as a row but cannot run yet, each with its reason. */
export const DEFERRED_CHECKS = Object.freeze({
  quick: [],
  standard: [],
  deep: [{ id: 'e2e', reason: 'no E2E test project exists (plan F9); --e2e folds into deep and is recorded here' }],
});

/** Ids that compare against Figma — excused by --no-figma, a committed design "none", or no manifest at HEAD. */
export const FIGMA_IDS = Object.freeze(['11', '15', 'figma-refs']);
/** Ids that need a browser — excused by --ci, the CI env var, or --no-browser (Decision §6). */
export const BROWSER_IDS = Object.freeze(['09', '10', '11', '12', '15', '19']);

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

function freshRunCommand(component, depth) {
  return `yarn audit:component ${component} --depth ${depth}`;
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
  // Tie-break on the text the brief renders (`message || fix`) and then `fix`,
  // so two findings that differ only in their fix never sort by input order.
  const key = f =>
    [f.file ?? '', String(f.line ?? '').padStart(8, '0'), f.code ?? '', f.message || f.fix || '', f.fix ?? ''].join(
      '\u0000',
    );
  return key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0;
}

function failEntry({ f, check, component, source, verify, owner }) {
  const expected =
    f.expected && typeof f.expected === 'object'
      ? { value: String(f.expected.value), source: mapManifestPath(f.expected.source, component) }
      : { value: f.fix ? `no ${f.code} finding — ${f.fix}` : `no ${f.code} finding`, source };
  const entry = {
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
  // Additive, VERDICT_SCHEMA_VERSION 2.1.0: `run-record.mjs`'s finding-identity
  // key needs the finding's own message, never `actual` — for 15-style-parity
  // `actual` is the bare rendered value and every finding sits on the manifest
  // file, so only `message` carries `state › target › prop` (Design §3;
  // `15-style-parity.mjs` `mismatchFinding`, and run-record.spec.mjs § finding
  // identity pins it with findings built by that same function).
  // `renderEntry` prints only `BRIEF_FIELDS`, so the brief is unchanged. Only
  // when `actual` came from elsewhere: otherwise `actual` already IS the
  // message, and the identity key falls back to it.
  if (f.message !== undefined && f.actual !== undefined) {
    entry.message = mapManifestPath(String(f.message), component);
  }
  return entry;
}

function aiFailOrDecision(f, leg, component) {
  if (typeof f.question === 'string' && f.question) {
    return {
      kind: STATE.NEEDS_DECISION,
      node: f.node ?? 'n/a',
      question: f.question,
      options: Array.isArray(f.options) && f.options.length ? f.options.map(String) : ['(the leg listed no options)'],
      // Additive, 2.1.0: lets run-record.mjs scope this decision to `leg:<leg>`.
      owner: leg,
    };
  }
  return failEntry({
    f,
    check: `ai ${leg}`,
    component,
    source: `AI leg ${leg}`,
    verify: `re-dispatch the ${leg} leg, then: ${rerenderCommand(component)}`,
    owner: leg,
  });
}

/**
 * A finding whose kind renderFixBrief renders as FAIL needs `severity` and
 * (`message` or `actual`) — BRIEF_FIELDS[FAIL] in fix-brief.mjs. A finding
 * carrying a non-empty `question` renders as NEEDS-DECISION instead, whose
 * fields (`node`, `options`) are always defaulted by aiFailOrDecision, so it
 * needs no shape check here. Pure. Returns a cause string, or null when the
 * finding's shape is safe to render — an AI finding that fails it is listed as
 * a note, never rendered.
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
 * Per-leg grading for `run-record.mjs`'s `leg:<leg>` scope (Design §2), using
 * this module's own `findingShapeIssue` and AI schema check — the one place
 * that rule lives, so `run-record.mjs` never imports this module (a cycle).
 * A leg is graded only when its file is readable at a matching schema major,
 * its `findings` is an array (zero findings is fine), and no finding fails
 * `findingShapeIssue` — stricter than `computeVerdict`'s advisory rendering,
 * which still lists the well-shaped findings of a leg that also wrote a bad
 * one. Pure. Sorted by leg for determinism.
 *
 * @param {Array<{leg: string, data: object|null}>} aiFiles
 * @returns {Array<{leg: string, graded: boolean, cause: string|null}>}
 */
export function computeLegRecords(aiFiles = []) {
  return [...aiFiles]
    .map(({ leg, data }) => {
      if (!data || schemaMajor(data.schemaVersion) !== schemaMajor(AI_FINDINGS_SCHEMA_VERSION)) {
        return { leg, graded: false, cause: 'unreadable or unknown schema' };
      }
      if (!Array.isArray(data.findings)) {
        return { leg, graded: false, cause: 'findings is not a list' };
      }
      const badCount = data.findings.filter((f, i) => findingShapeIssue(f, i)).length;
      if (badCount > 0) {
        return { leg, graded: false, cause: `${badCount} ${badCount === 1 ? 'finding' : 'findings'} ignored` };
      }
      return { leg, graded: true, cause: null };
    })
    .sort((a, b) => (a.leg < b.leg ? -1 : a.leg > b.leg ? 1 : 0));
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
 */
export function computeVerdict({ envelope, aiFiles = [], component: fallbackComponent = null }) {
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
  const addIncomplete = entry => incomplete.push(entry);
  const addWarnings = (list, check, verify) => {
    for (const f of [...list].sort(compareFindings)) {
      warnings.push({ check, code: f.code, message: f.message || f.fix || 'warning', verify });
    }
  };

  if (!envelope) {
    addIncomplete({
      kind: STATE.INCOMPLETE,
      check: 'run-all',
      cause: 'no envelope for this run — the orchestrator did not finish',
      prerequisite: 'none',
      verify: freshRunCommand(component, depth),
    });
  } else if (schemaMajor(envelope.schemaVersion) !== schemaMajor(SCHEMA_VERSION)) {
    addIncomplete({
      kind: STATE.INCOMPLETE,
      check: 'run-all',
      cause: `envelope schemaVersion ${envelope.schemaVersion} has an unknown major version`,
      prerequisite: 'none',
      verify: freshRunCommand(component, depth),
    });
  }
  if (envelope?.preflight && envelope.preflight.ok === false) {
    addIncomplete({
      kind: STATE.INCOMPLETE,
      check: 'env-preflight',
      cause: envelope.preflight.cause,
      prerequisite: envelope.preflight.command,
      verify: freshRunCommand(component, depth),
    });
  }

  const required = REQUIRED_CHECKS[depth] ?? REQUIRED_CHECKS.standard;
  const resultRows = envelope?.results ?? [];
  const byId = new Map(resultRows.map(r => [r.id, r]));
  const findingsByTool = envelope?.findingsByTool ?? {};
  const scriptIds = [
    ...required,
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
      // T10: a prerequisite is only the fix for `missing-prereq`; a crash is
      // diagnosed from the script's stderr, which the envelope keeps (the
      // verdict keeps only its class — stderr varies between identical runs).
      const fix =
        row.status === ROW_STATUS.MISSING_PREREQ
          ? { prerequisite: row.prerequisite ?? 'none' }
          : { log: `results[id="${id}"].error in envelope.json of the runDir listed in audit/_run/summary.json` };
      addIncomplete({
        kind: STATE.INCOMPLETE,
        check: `${id} ${row.name}`,
        cause: `${row.status} (${out.errorClass})`,
        ...fix,
        verify: verifyCommand(component, depth, id),
      });
    } else if (row.status === ROW_STATUS.OK) {
      const allFindings = findingsByTool[row.name] ?? [];
      // Decision 13: a check that does not apply says why, on its row — never
      // a state change, never a warning. `noTarget` wins when a finding
      // carries both, so "checked nothing but should have" is never demoted
      // to a note; `finding()` cannot produce that pair, but a row's own
      // literal object or an advisory file can.
      const doesNotApply = f => f.notApplicable === true && f.noTarget !== true;
      const notApplicable = allFindings.filter(doesNotApply);
      if (notApplicable.length) out.note = notApplicable.map(f => f.message).join('; ');
      // A required row that checked nothing (Decision §5): INCOMPLETE, not a
      // FAIL — the fix is a missing input, and it never also lands in R4's
      // warnings below. On a row the depth does not require it is a warning
      // (T23): nothing was owed, but nothing was checked either.
      const noTargetFindings = allFindings.filter(f => f.noTarget === true);
      const graded = allFindings.filter(f => f.noTarget !== true && !doesNotApply(f));
      // The row's counts come from the same groups that produce its entries —
      // graded errors and warnings, plus every noTarget finding where it is
      // reported as a warning — never from the script's own summary, which
      // counts not-applicable and noTarget findings too. Subtracting each
      // exclusion from that summary drifted every time a finding kind was
      // added (plan `2026-09-23-audit-report-summary-and-delta.md`).
      out.errors = graded.filter(f => f.severity === 'error').length;
      out.warnings = graded.filter(f => f.severity === 'warning').length + (isRequired ? 0 : noTargetFindings.length);
      if (!isRequired) addWarnings(noTargetFindings, `${id} ${row.name}`, verifyCommand(component, depth, id));
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
        const found = graded.filter(f => f.severity === 'error').sort(compareFindings);
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
        addWarnings(
          graded.filter(f => f.severity === 'warning'),
          `${id} ${row.name}`,
          verifyCommand(component, depth, id),
        );
      }
    }
    rows.push(out);
  }

  // AI legs: advisory at every depth, deep included (Decision 12) — a leg's
  // findings are listed, never state-changing.
  for (const file of [...aiFiles].sort((a, b) => (a.leg < b.leg ? -1 : a.leg > b.leg ? 1 : 0))) {
    if (!file.data || schemaMajor(file.data.schemaVersion) !== schemaMajor(AI_FINDINGS_SCHEMA_VERSION)) {
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
    // A question-shaped finding renders as an advisory decision entry rather
    // than being forced through the FAIL shape (S3): `aiFailOrDecision`
    // picks the shape and never needs severity/actual for one.
    for (const f of validFindings.sort(compareFindings)) {
      advisory.push(aiFailOrDecision(f, file.leg, component));
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

  const number = (list, prefix) => list.map((e, i) => ({ id: `${prefix}${i + 1}`, ...e }));
  const entries = [...number(incomplete, 'I'), ...number(fails, 'F'), ...number(decisions, 'D')];

  const headlineParts = [`${state}@${depth}`];
  if (level) headlineParts.push(level);
  headlineParts.push(...excuses);
  if (depth === 'deep') headlineParts.push('ai-legs: advisory');

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

/** Read a run directory's inputs: its envelope and every leg's ai-findings.json. */
export function readRunInputs(runDir) {
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
  return { envelope, aiFiles };
}

/**
 * Whether `run` is the newest run directory under `<componentDir>/runs`
 * (Design §7) — record.json is written only then, so re-rendering an older
 * run (`--run-dir`) never overwrites the baseline a later run already
 * compared against. Missing `runs/` (a fresh component dir) reads as "yes":
 * this run is the only one there.
 */
function isNewestRun(componentDir, run) {
  // A listing that fails is not proof the run is newest: writing its record
  // then could overwrite a baseline a later run already compared against, so
  // the answer fails closed. A missing runs/ is [] (listRunNames), not a failure.
  try {
    const newer = runsComparableTo(listRunNames(componentDir), run).filter(n => n > run);
    if (newer.length === 0) return true;
    // Expected for a --run-dir re-render of an older run; named so an
    // unexpected entry (e.g. an unreadable folder sorting last) is findable.
    process.stderr.write(`${TOOL}: record.json not written for ${run}: newer run ${newer.at(-1)} exists\n`);
    return false;
  } catch (err) {
    process.stderr.write(
      `${TOOL}: record.json not written for ${run}: runs/ cannot be listed: ${err.code ?? err.message}\n`,
    );
    return false;
  }
}

/**
 * Compute and write `verdict.json` + `fix-brief.md` for one run directory
 * (`<auditDir>/<component>/runs/<run>`). The component directory is two
 * levels up, so the stable paths never depend on the run name. Also builds
 * that run's `record.json` (written only when the run is the newest under
 * `runs/`) and always renders the brief's `## Changes since the previous run`
 * section, whose text names the case when there is nothing to compare (plan
 * `2026-09-23-audit-run-delta.md` Design §7).
 */
export function writeVerdictForRun(runDir) {
  const absRun = resolve(runDir);
  const componentDir = resolve(absRun, '..', '..');
  const component = basename(componentDir);
  const run = basename(absRun);
  const { envelope, aiFiles } = readRunInputs(absRun);
  const verdict = computeVerdict({ envelope, aiFiles, component });

  // Building the record, finding the baseline, comparing AND rendering the
  // Changes section all run inside one try: a throw from any of them — a
  // readdir/read failure under runs/, or a baseline record.json whose values
  // the renderer cannot shape — must never block verdict.json or the rest of
  // the brief, and renders as `Not compared: <cause>` instead (Design §7).
  let record = null;
  let changes = null;
  try {
    const legs = computeLegRecords(aiFiles);
    record = buildRunRecord({ run, verdict, envelope, legs });
    const found = findPreviousRecord(componentDir, run, verdict.depth);
    changes = found.unusable
      ? { unusable: found.unusable, depth: verdict.depth, component: verdict.component }
      : {
          // The header names the directory the baseline was found in, not the
          // `run` the file claims: a copied or hand-edited record could lie.
          ...compareRecords(record, found.record && { ...found.record, run: found.run }),
          skippedEmpty: found.skippedEmpty,
          depth: verdict.depth,
          component: verdict.component,
        };
    renderChanges(changes);
  } catch (err) {
    // A record that built before the lookup or comparison threw is still
    // written: it is valid on its own, and skipping it would leave the same
    // broken baseline in place for every later run.
    changes = { error: err.message ?? String(err) };
    // The brief carries only the message; stderr carries where it happened,
    // since exit codes deliberately do not change and nothing else reports it.
    process.stderr.write(
      `${TOOL}: changes since the previous run not compared for ${component} ${run}: ${err.stack ?? err}\n`,
    );
  }

  // Render before writing either stable file: a render failure (an entry the
  // renderer cannot shape) must never leave a freshly-written verdict.json
  // beside a stale fix-brief.md — throwing here leaves both exactly as they
  // were, and skips writing record.json too.
  const brief = renderFixBrief(verdict, changes);
  mkdirSync(componentDir, { recursive: true });
  writeFileSync(join(componentDir, 'verdict.json'), `${JSON.stringify(verdict, null, 2)}\n`);
  writeFileSync(join(componentDir, 'fix-brief.md'), brief);

  if (record && isNewestRun(componentDir, run)) {
    try {
      writeFileSync(join(absRun, 'record.json'), `${JSON.stringify(record, null, 2)}\n`);
    } catch (err) {
      // A failure writing record.json alone changes no exit code (Design §7):
      // the next run then names an older baseline, or none.
      process.stderr.write(`${TOOL}: record.json not written for ${run}: ${err.message ?? err}\n`);
    }
  }
  return verdict;
}

/**
 * The run directory in the form a caller passes straight back to `--run-dir`
 * (Decision §10): repo-relative with forward slashes when the run sits inside
 * the repo, absolute otherwise (an `--audit-dir` outside it). It lives in
 * summary.json, never in verdict.json, which stays a pure function of the
 * run's inputs and so byte-identical across runs.
 */
export function callerRunDir(absRun, repoRoot = REPO_ROOT) {
  const rel = relative(repoRoot, absRun);
  if (rel === '' || rel.startsWith('..') || isAbsolute(rel)) return absRun;
  return rel.split(sep).join('/');
}

/**
 * Write `<auditDir>/_run/summary.json`: every component's state plus the
 * worst one. `repoLevel` (S5 / Decision §2) is set only when zero components
 * were selected: `{ ok: boolean }` for run-all's combined envelope of the
 * repo-level rows (03, the adapter builds) that ran regardless — a failure
 * there still moves the summary state off PASS even with no per-component
 * verdict to carry it.
 */
export function writeSummary(auditDir, { depth, runs, preflight = null, repoLevel = null, kept = [] }) {
  const fresh = runs.map(({ verdict, runDir }) => ({
    component: verdict.component,
    state: verdict.state,
    ...(verdict.level ? { level: verdict.level } : {}),
    headline: verdict.headline,
    runDir: callerRunDir(resolve(runDir)),
  }));
  const components = [...kept, ...fresh].sort((a, b) =>
    a.component < b.component ? -1 : a.component > b.component ? 1 : 0,
  );
  const states = components.map(c => c.state);
  if (preflight) states.push(STATE.INCOMPLETE);
  if (repoLevel?.incomplete) states.push(STATE.INCOMPLETE);
  else if (repoLevel && !repoLevel.ok) states.push(STATE.FAIL);
  const summary = {
    schemaVersion: SUMMARY_SCHEMA_VERSION,
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
  node scripts/audit/verdict.mjs --rerender <component> [--rerender …] [--audit-dir <dir>] [--json]
  node scripts/audit/verdict.mjs --run-dir audit/<component>/runs/<run> [--run-dir …] [--audit-dir <dir>] [--json]

The first form runs run-all.mjs with --verdict and exits with the worst state's
code. The other two re-render a run's verdict and fix brief from its inputs (e.g.
after an AI leg wrote its advisory ai-findings.json): --rerender looks the run up
in audit/_run/summary.json, --run-dir names it and is refused when it is not the
component's current run. Exit: 0 PASS, 1 FAIL, 3 INCOMPLETE, 4 NEEDS-DECISION,
2 usage or internal error.`;

/**
 * The report block of a component's fix brief — `## Summary` up to
 * REPORT_END — or null when the brief is absent or has none; any other read
 * error throws. Both markers are matched as whole lines: `line()` maps every
 * newline inside a value, so no finding's text can forge one and end the
 * block early. Exported for tests.
 */
export function readReportBlock(auditDir, component) {
  let brief;
  try {
    brief = readFileSync(join(auditDir, component, 'fix-brief.md'), 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
  const start = brief.indexOf('\n## Summary\n');
  const end = brief.indexOf(`\n${REPORT_END}\n`);
  if (start < 0 || end < start) return null;
  return brief.slice(start + 1, end).trimEnd();
}

/**
 * Render `summary.json` to stdout — exported so S5's text-mode note is unit-tested.
 * In text mode, with `auditDir`, each component's report block follows its
 * headline, so the terminal shows the same table the brief and the chat carry.
 */
export function printSummary(summary, json, auditDir = null) {
  if (json) {
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
    return;
  }
  for (const c of summary.components) {
    // The headline carries manifest text (a design-none reason, a skip reason),
    // so it gets the same control-character neutralising as the block below.
    process.stdout.write(`${c.component}: ${code(c.headline)} — audit/${c.component}/fix-brief.md\n`);
    if (!auditDir) continue;
    try {
      const block = readReportBlock(auditDir, c.component);
      if (block) process.stdout.write(`\n${block}\n\n`);
    } catch (err) {
      process.stdout.write(`  (report block unavailable: ${err.code ?? err.message})\n`);
    }
  }
  if (summary.note) process.stdout.write(`${summary.note}\n`);
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

/**
 * R3: the audit-dir lock path, rooted at `auditDir` — `--audit-dir` in tests
 * keeps every CLI test's lock under a temp dir, never the real worktree's
 * `audit/_run/`.
 */
function auditLockPathFor(auditDir) {
  return join(auditDir, '_run', '.lock');
}

/** Take the audit-dir lock or exit 3 (INCOMPLETE) naming the live pid and path. Exported for tests. */
export function takeAuditLock(auditDir) {
  const lock = acquireLock(auditLockPathFor(auditDir));
  if (!lock.ok) {
    process.stderr.write(`${TOOL}: INCOMPLETE: ${lock.cause}\n`);
    return { ok: false, exitCode: exitCodeForState(STATE.INCOMPLETE) };
  }
  return { ok: true, token: lock.token };
}

function readSummaryFile(auditDir) {
  try {
    return JSON.parse(readFileSync(join(auditDir, '_run', 'summary.json'), 'utf8'));
  } catch {
    return null;
  }
}

/**
 * The run `summary.json` currently lists for a component, absolute, or null
 * when the file or the component is not there. Runs are kept, so a component
 * directory holds older ones too; this names the one whose verdict is the
 * component's. The single answer to "which run is current" — `--rerender`
 * resolves through it and `--run-dir` is refused against it.
 */
export function currentRunDirFor(auditDir, component) {
  const entry = (readSummaryFile(auditDir)?.components ?? []).find(c => c.component === component);
  return entry?.runDir ? resolve(REPO_ROOT, entry.runDir) : null;
}

/** When a run's inputs were written — the envelope is written once, at the end of the run. */
function runWrittenAt(runDirAbs) {
  try {
    return statSync(join(runDirAbs, 'envelope.json')).mtimeMs;
  } catch {
    return null;
  }
}

/**
 * Refuse a `--run-dir` that names a run OLDER than the component's current
 * one. Re-rendering it rewrites `verdict.json` from that run's inputs,
 * replacing the current verdict with a stale one and exiting on the stale
 * state — which a caller branching on the exit code then acts on. A newer run
 * is how the current one is promoted in the first place, so only "older" is
 * refused, and only when both timestamps are readable: an unknown age, an
 * absent summary or a component the summary does not list leave no claim to
 * contradict (a fresh clone, a pruned summary).
 */
export function staleRunDirReason(runDirAbs, auditDir) {
  const abs = resolve(runDirAbs);
  const component = basename(resolve(abs, '..', '..'));
  const current = currentRunDirFor(auditDir, component);
  if (!current || current === abs) return null;
  const [named, currentAge] = [runWrittenAt(abs), runWrittenAt(current)];
  if (named === null || currentAge === null || named >= currentAge) return null;
  return `--run-dir names ${basename(abs)}, which is older than ${component}'s current run ${callerRunDir(current)} (audit/_run/summary.json). Re-rendering it would replace the current verdict with the older run's; pass --rerender ${component} to re-render the current one.`;
}

/**
 * The summary an early exit prints (Decision 11): a caller parsing `--json`
 * stdout always gets a document, never an empty stdout it would have to tell
 * apart from a crash.
 */
function earlyExitSummary(depth, cause) {
  return { schemaVersion: SUMMARY_SCHEMA_VERSION, depth, state: STATE.INCOMPLETE, components: [], cause };
}

/**
 * Re-render each run dir, then rewrite the summary. The components the
 * previous summary listed and this invocation did not touch are kept, so a
 * `--changed` run's components can be re-rendered one at a time.
 */
function rerender(runDirs, json, auditDir) {
  const lock = takeAuditLock(auditDir);
  if (!lock.ok) return lock.exitCode;
  try {
    const runs = runDirs.map(runDir => ({ runDir, verdict: writeVerdictForRun(runDir) }));
    const rendered = new Set(runs.map(r => r.verdict.component));
    const kept = (readSummaryFile(auditDir)?.components ?? []).filter(c => !rendered.has(c.component));
    const summary = writeSummary(auditDir, { depth: runs[0].verdict.depth, runs, kept });
    // The file keeps every component; this invocation's stdout and exit speak
    // only for the runs it re-rendered, so a caller never stops on another
    // component's state.
    const own = summary.components.filter(c => rendered.has(c.component));
    const ownSummary = { ...summary, state: worstState(own.map(c => c.state)), components: own };
    delete ownSummary.note;
    printSummary(ownSummary, json, auditDir);
    return exitCodeForState(ownSummary.state);
  } finally {
    releaseLock(auditLockPathFor(auditDir), lock.token);
  }
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
  const { depth, component, all, changed } = parseRunAllCli(forwarded);
  // U5: a name run-all cannot resolve exits 2 here too — spawned, it would
  // exit without a summary, which reads as INCOMPLETE / 3.
  if (!all && !changed && !normalizeComponentName(component)) {
    process.stderr.write(`${TOOL}: invalid component name "${component}".\n\n${USAGE}\n`);
    return EXIT_INTERNAL;
  }
  // R3: the audit-dir lock guards summary.json/envelope.json/verdict.json —
  // taken around deleting the stale files below, spawning run-all, and
  // reading the summary; released before this function returns, so an AI leg
  // a caller dispatches afterwards never waits on it (Decision §3).
  const lock = takeAuditLock(auditDir);
  if (!lock.ok) {
    printSummary(earlyExitSummary(depth, 'the audit-dir lock is held by another audit'), json);
    return lock.exitCode;
  }
  try {
    const summaryPath = join(auditDir, '_run', 'summary.json');
    const envelopePath = join(auditDir, '_run', 'envelope.json');
    // R5: a summary OR envelope left by an earlier run must never stand in for
    // this one — both live beside each other under `_run/`.
    rmSync(summaryPath, { force: true });
    rmSync(envelopePath, { force: true });
    const extra = ['--verdict'];
    if (json) extra.push('--out', envelopePath);
    const res = spawnSync(
      process.execPath,
      [join(REPO_ROOT, 'scripts', 'audit', 'run-all.mjs'), ...forwarded, ...extra],
      {
        stdio: ['ignore', json ? 'ignore' : 'inherit', 'inherit'],
        // R3: hand the audit-dir lock this process already holds to the
        // spawned run-all.mjs, so it never re-acquires (and cannot self-block
        // on) the same lock this process is about to release once it returns.
        env: { ...process.env, AUDIT_LOCK_TOKEN: lock.token },
      },
    );
    if (!existsSync(summaryPath)) {
      const cause = `run-all exited ${res.status} without writing ${summaryPath}`;
      process.stderr.write(`${TOOL}: ${cause} — INCOMPLETE.\n`);
      printSummary(earlyExitSummary(depth, cause), json);
      return exitCodeForState(STATE.INCOMPLETE);
    }
    const summary = JSON.parse(readFileSync(summaryPath, 'utf8'));
    printSummary(summary, json, auditDir);
    return exitCodeForState(summary.state);
  } finally {
    releaseLock(auditLockPathFor(auditDir), lock.token);
  }
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--help') || argv.includes('-h')) {
    process.stdout.write(`${USAGE}\n`);
    return 0;
  }
  if (argv.includes('--run-dir') || argv.includes('--rerender')) {
    let parsed;
    try {
      parsed = parseArgs({
        args: argv,
        options: {
          'run-dir': { type: 'string', multiple: true },
          'rerender': { type: 'string', multiple: true },
          'json': { type: 'boolean', default: false },
          'audit-dir': { type: 'string' },
        },
        strict: true,
      });
    } catch (err) {
      process.stderr.write(`${TOOL}: ${err.message}\n\n${USAGE}\n`);
      return EXIT_INTERNAL;
    }
    const usageError = reason => {
      process.stderr.write(`${TOOL}: ${reason}\n\n${USAGE}\n`);
      return EXIT_INTERNAL;
    };
    const auditRoot = parsed.values['audit-dir'] ? resolve(parsed.values['audit-dir']) : join(REPO_ROOT, 'audit');
    const runDirs = [...(parsed.values['run-dir'] ?? [])];
    // `--rerender <component>` is `--run-dir` with the lookup done here: the
    // entry's `verify` command names the component, which does not vary
    // between runs, so verdict.json stays byte-identical.
    for (const name of parsed.values.rerender ?? []) {
      const component = normalizeComponentName(name);
      if (!component) return usageError(`--rerender needs a component name (got "${name}")`);
      const current = currentRunDirFor(auditRoot, component);
      if (!current) {
        return usageError(`--rerender ${component}: audit/_run/summary.json lists no run for it — run the audit first`);
      }
      runDirs.push(callerRunDir(current));
    }
    for (const runDirArg of runDirs) {
      const check = validateRunDirArg(runDirArg, auditRoot);
      if (!check.ok) return usageError(check.reason);
      // T5: a run dir with no envelope is a mistyped or pruned run — re-rendering
      // it would write an INCOMPLETE verdict over the component's real one.
      if (!existsSync(join(runDirArg, 'envelope.json'))) {
        return usageError(`--run-dir has no envelope.json (got "${runDirArg}")`);
      }
      const stale = staleRunDirReason(resolve(runDirArg), auditRoot);
      if (stale) return usageError(stale);
    }
    return rerender(runDirs, parsed.values.json, auditRoot);
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
