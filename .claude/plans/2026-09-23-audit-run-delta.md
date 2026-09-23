# Audit: show what changed since the previous run (issue #126)

**Reviewed:** none
**Base:** PR #139 (`70439fa`, result icons in `lib/fix-brief.mjs`) — this branch sits on it; rebase onto
`upstream/main` once #139 merges. Nothing here edits the lines #139 changed except by adding beside them.

## Goal

`audit/<component>/fix-brief.md` gains a script-rendered `## Changes since the previous run` section
inside the report block. It shows what differs between this run and the previous run of the same
component at the same depth, and never says "fixed" or "resolved".

## Problem

Issue #126. PR #115 tried this by recomputing the previous run's verdict from its kept inputs and
pairing findings by position. Each of its three sentinel rounds reproduced a new false report
(`.claude/plans/2026-09-23-audit-report-summary-and-delta.md` § Sentinel rounds). Root cause: the
comparison **inferred** from a recomputed verdict what the previous run graded. The fix is to
**record** it when the run happens.

## Decision

### Options

| Option | Complexity added now | Cost to build | Cost to maintain | Cost to reverse | Risk | Value |
| --- | --- | --- | --- | --- | --- | --- |
| A. Per-run record written at verdict time (`runs/<run>/record.json`: graded scopes, row results, finding identities) and compared as data | med — 1 module, 1 persisted file | med | low — compare logic reads a frozen, versioned format | low — git-ignored, disposable, versioned; delete the file and the module | New persisted format; runs before this change have no record, so the first run after it compares nothing | Meets all five constraints of #126 by construction |
| B. Recompute the baseline verdict from kept inputs (PR #115's approach) | med | med | high — every verdict rule change silently alters the baseline | low | Reproduced false claims in 3 of 3 sentinel rounds | Works on existing runs with no record |
| C. Copy each run's `verdict.json` into the run dir and diff two verdicts at compare time | low | low | med — identity and graded-scope logic re-derived from verdict shape on every compare; the verdict does not record which AI legs wrote or which rows were report-only | low | Leg writes with no findings and report-only rows are invisible, so round 3's "advisory drops to 0" returns | Simplest |

Recommendation: **A**. B has already failed three times. C cannot see what was graded, which is
constraint 2 of the issue.

### Design (option A)

1. **The record.** `lib/run-record.mjs` exports `buildRunRecord({ run, verdict, envelope, aiFiles })`.
   It is pure and returns:
   ```
   { schemaVersion: RUN_RECORD_SCHEMA_VERSION, run, component, depth, state, headline,
     rows:     [{ id, name, result }],        // rowResults(verdict), in verdict.rows order
     scopes:   ['figma-gate', 'leg:<leg>', 'row:<id>', …],   // sorted: what THIS run graded
     findings: [{ scope, key, label }] }      // sorted by scope, key; duplicates kept (multiset)
   ```
   `RUN_RECORD_SCHEMA_VERSION = '1.0.0'` lives in `lib/json-output.mjs` beside the other schema
   versions.
2. **Graded scopes: recorded, never inferred.** Every scope needs a valid envelope: present,
   `schemaMajor` matching, and `preflight.ok !== false`. Beyond that:
   - `row:<id>`: an envelope result row with `status === 'ok'`, `blocking !== false`, no
     `deferred`, and no finding with `noTarget === true` in `findingsByTool[row.name]`. So a row
     that was excused, crashed, missing-prereq, skipped, deferred, report-only, dropped by
     `--only`/`--skip`, or resolved no target is not graded.
   - `leg:<leg>`: one per `aiFiles` entry whose data is readable at a matching schema major, zero
     findings included.
   - `figma-gate`: `depth !== 'quick' && !noFigma`. This covers the "no manifest" NEEDS-DECISION.
3. **Finding identity.** `key` is a JSON array string. `fileOf(location)` strips a trailing
   `:<line>` or `:<line>:<col>`:
   - FAIL entry: `['fail', code, fileOf(location), actual, expected.value]`, scope `row:<rowIdOf(check)>`.
   - warning: `['warning', code, message]`, scope `row:<rowIdOf(check)>`.
   - Figma-gate NEEDS-DECISION entry: `['decision', node, question]`, scope `figma-gate`.
   - advisory FAIL: `['fail', code, fileOf(location), actual]`, scope `leg:<owner>`.
   - advisory NEEDS-DECISION: `['decision', node, question]`, scope `leg:<owner>`. To make this
     possible, `aiFailOrDecision` adds `owner: leg` to the decision shape (additive).
     `VERDICT_SCHEMA_VERSION` 2.0.0 → 2.1.0. The index table's Owner column then shows the leg
     where it shows `—` today.
   - INCOMPLETE entries are not keyed. Their row's result change carries them.
   - `label` is human text made from the same fields plus the check (`<check> · <code> · <file> — <actual>`,
     or `<node> — <question>`). Equal keys always have equal labels.

   The line is deliberately NOT in the key. A shift caused by an unrelated edit leaves the finding
   unchanged. Findings that share a key cannot be told apart, so they are **counted, never paired**:
   the comparison reports "reported 2 → 1 times" and never which one went. This rules out
   positional pairing by construction.
4. **The baseline.** `findPreviousRecord(componentDir, currentRun, depth)` lists `runs/*` names
   `< currentRun` (string order; `defaultRunId` is an ISO timestamp, so it is chronological), from
   newest to oldest. It skips a dir with no readable `record.json`, or whose record lacks a `depth`
   string. It skips a record at another depth. The first remaining one is the baseline. If that
   record's `schemaVersion` major differs, the result is `{ incompatible: { run, schemaVersion } }`.
   It never falls through to an older record. None found → `null`.
5. **The comparison.** `compareRecords(current, previous)` is pure and returns
   `{ baseline: null } | { incompatible } | { baseline: { run, headline }, headline, rowChanges,
   notCompared, added, gone, countChanged, unchanged }`:
   - `rowChanges`: every row id in either record whose result differs, with `'—'` for a row
     absent on one side. A check made required after the baseline ran therefore reads as
     "— → incomplete", with no claim about its findings.
   - `notCompared`: every scope graded in exactly one run, with what each side recorded (a row's
     result, or `not in that run`; a leg `wrote` / `did not write`; the figma gate `checked` /
     `not checked`).
   - Findings are compared only within scopes graded in both runs, as multisets by `(scope, key)`:
     `added` (count 0 → n), `gone` (n → 0), `countChanged` (n → m), `unchanged` (a number).
   - All lists are sorted by `(scope, key)`. The output is deterministic.
6. **Rendering.** `renderFixBrief(verdict, changes = null)` renders `renderChanges(changes)` after
   the summary tables, before `REPORT_END`. `null` renders nothing, so existing callers and specs
   stay valid. Wording:
   - no baseline: `No earlier run at <depth> left a record under audit/<c>/runs/ — nothing to compare.`
   - incompatible: `The previous run at <depth> (<run>) was recorded in format <v>; this run writes <v>. Not compared.`
   - otherwise: `Compared with run <run>: <prev headline> → <headline>`, a `| # | Check | Previous | Now |`
     table of `rowChanges` (icons via `resultIcon` for real results only), a `Not compared` list,
     and the counts line `Findings in checks both runs graded: n newly reported · n no longer reported
     · n reported a different number of times · n unchanged`. Then bullets `- newly reported: <label>`
     (`×n` when n > 1), `- no longer reported: <label>`, `- reported <n> → <m> times: <label>`. Last,
     one line: `"No longer reported" means the check that reported it last time did not report it
     this time; the audit does not say why.`
   - A not-compared leg line names the re-render command: `yarn audit:component --rerender <c>`.
   - Every value goes through `line()` / `cell()`. The words `fixed` and `resolved` never appear.
7. **Writing.** `writeVerdictForRun` computes the verdict, the record, the baseline, the changes
   and the brief first, then writes `verdict.json`, `fix-brief.md` and `runs/<run>/record.json`.
   A render failure writes none of them. `readRunInputs` does not read `record.json`, so
   `verdict.json` stays a pure function of `envelope.json` + `ai/`. `--rerender` goes through the
   same function, so a leg that writes after the run is picked up then.

## Acceptance bar

Zero tolerance (each item has a spec in `scripts/__tests__/audit/run-record.spec.mjs` unless
noted):
- Each false case from PR #115's rounds reports no claim about the affected finding and lists the
  scope under Not compared: a row excused, crashed, deferred, report-only, dropped by `--only`, or
  noTarget this run; a leg that wrote last run and not yet this run; `--no-figma` now vs not then.
- Two findings with the same code in one file with no line, one gone → `reported 2 → 1 times`,
  and no line says which one. The same finding at a shifted line → `unchanged`.
- A row absent in the baseline record (made required later) → a row change with `—` and no
  finding claim.
- A settled figma-gate NEEDS-DECISION (both runs checked it) → `no longer reported`.
- Baseline selection: newest older same-depth record; another depth skipped; unreadable skipped;
  newer run name never used; incompatible major → "Not compared", no fall-through.
- No `fixed` / `resolved` in any rendered section across the spec's fixtures.
- Hostile text (`|`, `\|`, newline, ESC) in a label cannot add a column, row or heading.
- `verdict.json` is byte-identical with and without a previous run present (purity). The existing
  byte-identical spec in `verdict.spec.mjs` stays green.
- Re-rendering the same run twice → byte-identical `fix-brief.md` and `record.json`.
- Commands, each exit 0:
  - `node --test "scripts/__tests__/audit/*.spec.mjs"`
  - `npx eslint scripts/audit scripts/__tests__/audit`
  - `npx prettier --check scripts/audit scripts/__tests__/audit .claude/skills/audit-component .claude/plans/2026-09-23-audit-run-delta.md`
  - `yarn docs:check`

Tolerances: none. The output is deterministic.

## Global constraints

- Node 24 (`.nvmrc`); run everything under `fnm exec --using 24`. `node:test` specs.
- English in every authored file. No change to exit codes or `summary.json`. `verdict.json` changes
  only by the additive `owner` on AI decision entries (schema 2.1.0).
- Do not touch `resultIcon` / the Result cell lines from #139 beyond calling `resultIcon`.
- No changelog fragment: this is audit tooling, not a change a package consumer notices
  (`changes/README.md`).
- Dispatched legs run no git that discards or hides worktree state; the controller commits.

## Tasks

### Phase 1: record, compare, render (implementer)

**Files:** `scripts/audit/lib/run-record.mjs` (new), `scripts/audit/lib/json-output.mjs`,
`scripts/audit/lib/fix-brief.mjs`, `scripts/audit/verdict.mjs`,
`scripts/__tests__/audit/run-record.spec.mjs` (new), plus existing specs under
`scripts/__tests__/audit/` only where they pin `VERDICT_SCHEMA_VERSION` or the AI decision's
Owner cell.

1. `json-output.mjs`: `RUN_RECORD_SCHEMA_VERSION`; `VERDICT_SCHEMA_VERSION` → `2.1.0`.
2. `run-record.mjs`: `buildRunRecord`, `findPreviousRecord`, `compareRecords` (Design 1–5).
   Reuse `rowResults` from `fix-brief.mjs`; export `rowIdOf` from there rather than copying it.
3. `verdict.mjs`: `owner: leg` on the AI decision; `writeVerdictForRun` per Design 7; update the
   layout comment at the file head.
4. `fix-brief.mjs`: `renderChanges`, and `renderFixBrief(verdict, changes = null)` (Design 6).
5. Specs per the acceptance bar, TDD: write each failing case first.

### Phase 2: docs (implementer)

**Files:** `scripts/audit/README.md`, `.claude/skills/audit-component/references/report-template.md`,
`.claude/skills/audit-component/SKILL.md` (only if step 4's wording needs the new section named).

1. The layout tables gain `audit/<component>/runs/<run>/record.json`: written by `verdict.mjs`,
   read only by the next run's comparison, not an input.
2. The report-block description gains `## Changes since the previous run`: what the words mean,
   that only checks graded in both runs are compared, that the first run after an upgrade
   compares nothing, and that deleting `runs/` resets the baseline.

## Execution matrix

| Phase | Owner | Model | Effort | Wave | Depends on | Gate |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | implementer | sonnet | high | 1 | — | acceptance-bar commands green |
| 2 | implementer | sonnet | medium | 2 | 1 | `yarn docs:check`, prettier |
| Grade | main session | — | — | 3 | 1, 2 | `code-review` then `dan-fresh-eyes` verify |

Phase 2 waits for Phase 1 because the docs describe the rendered wording. The two phases share no
file.

## Not verified (to fill at close)
