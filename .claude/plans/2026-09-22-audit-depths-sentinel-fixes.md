# audit-component depths — fixes from the PR #115 merge gate

**Reviewed:** preflight cfb1f13, critic de4695d

## Goal

Make PR #115 (issue #114, `yarn audit:component <name> --depth quick|standard|deep`) pass its
merge gate: every Must-fix finding of the 2026-09-22 `dan-sentinel` round fixed with a test that
failed before the fix, every Improve-later recommendation either fixed or given a recorded
disposition, and the branch in sync with `upstream/main`. Then a second sentinel round, and the
draft PR marked ready for review (owner request, 2026-09-22).

## Problem

The first sentinel round over `3463699..e63c311` returned REQUEST-CHANGES (correctness FAIL,
api-types FAIL). Three defects were reproduced with a probe; the rest were found by reading the
code. They share one theme: the verdict can still be wrong or unreachable on inputs the plan
`2026-09-21-audit-component-depths.md` promised it would handle — a waiver nobody validates, a
fix brief that crashes on an empty value, a `deep` flow its own callers cannot finish, a PASS
issued when nothing was checked.

## Spec / issue link

Owner request 2026-09-22 ("fix and apply the recommendations, pass sentinel, then mark the PR
ready for review"). Gate record: `gate-ledger.jsonl` sentinel rows at `e63c311`, artifact
`.claude/plans/2026-09-21-audit-component-depths.md`. Parent plan:
`.claude/plans/2026-09-21-audit-component-depths.md` (its Decisions §1–§9 still hold).

## Findings (sentinel round 1, 2026-09-22, HEAD e63c311)

Must-fix (above the parent plan's bar):

| # | Finding | Location | Evidence |
|---|---|---|---|
| S1 | `figma.design: "none"` is granted without validating the manifest: no `reason`, no `decidedBy`, `states`/`fileKey` alongside it; 11/15/figma-refs are then excused, so `deep` can PASS `PRODUCTION-READY`. | `scripts/audit/lib/figma-manifest.mjs:435` (`resolveHeadManifest`) | probe (code-review) |
| S2 | `present()` treats `''` as missing, so `renderEntry` throws on a legitimate empty `actual` / `expected.value` / `node`; `writeVerdictForRun` throws, the real FAIL and (under `--all`) every other verdict is lost. | `scripts/audit/lib/fix-brief.mjs:26` | probe |
| S3 | A question-shaped AI finding (`question` + `options`, no severity) is routed through `failEntry` at quick/standard and makes `renderFixBrief` throw; `--run-dir` exits 2 writing nothing. | `scripts/audit/verdict.mjs:471` | probe |
| S4 | `deep` callers say "run the gate and STOP on non-zero"; the first `deep` run always exits 3 (AI rows open), so legs are never dispatched; "re-run the gate above" opens new rows in a new run dir. | `.claude/agents/audit-production.md:40,63`, `.claude/commands/audit-component.md:32-46`, `.claude/commands/migrate-component.md:44-56` | read (critic + code-review) |
| S5 | `--changed` selecting zero components → `worstState([])` = PASS, exit 0; the note is not printed in text mode; repo-level rows (03) never reach any state; a failed changed-set detector reads the same. | `scripts/audit/verdict.mjs:628-643`, `scripts/audit/lib/changed-components.mjs:38` | live repro (errors lens) |
| S6 | A required browser check that resolves no story emits a `warning` and its row is `ok`; the verdict counts only errors, so 09/10/11/12/19 can PASS having checked nothing. Codes: `A11Y-NO-STORY`, `CONTRAST-NO-STORY`, `PIXEL-NO-STORIES`, `CONSOLE-NO-STORIES`, `INTERACTION-NO-STORY`. | `scripts/audit/verdict.mjs:383` | read (critic) |
| S7 | `renderEntry` interpolates every field (and `code` in the heading) raw; a newline-bearing value forges a heading + `verify:` line or breaks the brief's structure. | `scripts/audit/lib/fix-brief.mjs:44-56` | read; refuted to LOW as security, stands as integrity |
| S8 | `--run-dir` accepts any path; a bare run id writes `verdict.json`/`fix-brief.md` outside the repo. | `scripts/audit/verdict.mjs:603-616` | read |
| S9 | A usage error in fresh mode (e.g. `--depth depp`) exits 3 (INCOMPLETE) instead of the documented 2. | `scripts/audit/verdict.mjs:692` | read |
| S10 | `rowStatus` labels any summary-less result of a `requiresBuild` script `missing-prereq`, even after prerequisites succeeded — a crash is sent to "rebuild". | `scripts/audit/run-all.mjs:1200` | read |
| S11 | The coverage prerequisite is one vitest run over all selected components; one failing spec makes every component's 06 `missing-prereq`. | `scripts/audit/run-all.mjs:356` | read |
| S12 | 19-interaction: BX4 calls the first `/open/i` method with no argument and never checks the overlay opened (`:281`); BX1 counts the audit's own injected `<style data-audit-no-motion>` as rendered content (`:184`); BX7 checks the FormData key exists but never compares its value (`:480`). | `scripts/audit/19-interaction.mjs` | read |
| S13 | Envelope doc says `schemaVersion 1.1.0`; code emits `1.2.0`. | `scripts/audit/lib/json-output.mjs:4,8,31` | grep |
| S14 | `pixel-perfect-verifier` deep procedure preflights "Storybook on 6007" and runs 15/11/figma-refs without `--port`/HEAD manifest, contradicting its own line 29 and the HEAD-only rule. | `.claude/agents/pixel-perfect-verifier.md:65,126` | grep |

Improve-later (beyond the bar; owner asked for them too):

| # | Finding | Location |
|---|---|---|
| R1 | `a11y-verifier` lacks the `.audit-storybook.json` port note; failure mode still names 6007. | `.claude/agents/a11y-verifier.md:22,263` |
| R2 | `inputHash` never binds: legs copy the stored hash, recompute never re-hashes sources, an omitted hash closes the row. | `scripts/audit/verdict.mjs:240-264` |
| R3 | Concurrent audits in one worktree race on `audit/_run/summary.json`, the worktree Storybook record and `dist/`. | `scripts/audit/verdict.mjs:674-697` |
| R4 | Script warnings are neither graded nor rendered; the brief says "Nothing to fix." over coverage and borderline pixel warnings. | `scripts/audit/lib/fix-brief.mjs:111-123` |
| R5 | `pre-pr-check` runs the quick audit twice with two judges. | `.claude/commands/pre-pr-check.md:44,61` |
| R6 | Untested: 09's BX2/BX3 status assembly; `selectScripts` with `figmaDir` + absent manifest + browser waiver. | `scripts/audit/09-a11y-tree.mjs:214-230`, `scripts/audit/run-all.mjs:520-522` |
| R7 | AI-leg row status `'open'`/`'closed'` has no frozen enum, unlike its siblings. | `scripts/audit/lib/json-output.mjs:105-133`, `scripts/audit/verdict.mjs:435` |
| R8 | AI-leg contracts tell legs to write `ai-findings.json` via Bash without requiring a quoted heredoc. | `.claude/agents/a11y-verifier.md`, `.claude/agents/pixel-perfect-verifier.md` |
| R9 | `seeded-defects` signals a recorded PID with no ownership check. | `scripts/audit/seeded-defects.mjs:191-208` |
| R10 | After upstream #110, A4 overlaps `@stencil/reserved-member-names` (`eslint.config.mjs:64`, level `error`). | `scripts/audit/17-adapter-contract.mjs:534`, `.claude/skills/audit-component/SKILL.md:168` |
| R11 | The fix loop trusts `verify:` text in the brief; it should run only commands the verdict wrote. | `.claude/skills/audit-component/SKILL.md:138` |

## Options

### Options

Deep two-phase flow (S4):

| Option | Shape | Cost |
|---|---|---|
| A (chosen) | `verdict.json` gains `awaitingLegs: true` when every INCOMPLETE entry is an opened `ai-*` row; state stays INCOMPLETE / exit 3. Callers: exit 3 + `awaitingLegs` → dispatch legs → `yarn audit:component --run-dir <run>` → stop on non-zero. | One additive field + ~3 lines per caller; the branch is readable by a caller, not inferred. |
| B | New state `AWAITING-LEGS`, exit 5. | Changes the state enum, exit table, every caller and test. |
| C | Prose only. | Branch rests on a model reading a rule, not a field. |

Recommendation: A — the only option whose branch a caller can read from a field without changing the state enum.

Zero-component selection (S5):

| Option | Shape | Cost |
|---|---|---|
| A (chosen) | Nothing changed → PASS stays, but "no components selected" is printed; repo-level rows (03) enter the summary state; a detector failure (no base ref, git diff failed) → INCOMPLETE. | Tooling-only PRs (this one) still pass `pre-pr-check`; a broken detector fails closed. |
| B | Always INCOMPLETE. | Every tooling-only PR fails `pre-pr-check`. |

Recommendation: A — it fails closed exactly where the input is broken and keeps tooling-only PRs passable.

## Decision

1. S4 → Option A (`awaitingLegs`), owner 2026-09-22.
2. S5 → Option A (visible PASS, repo rows count, detector failure INCOMPLETE), owner 2026-09-22.
3. R3 → one worktree-level lock (`audit/_run/.lock`, created `wx`, holds pid + start time read
   with `ps -o lstart= -p <pid>`). Stale when the pid is dead or its start time differs (pid
   reuse); a live lock → INCOMPLETE naming the pid and the lock path. Taken in `runAudit`
   (so a direct `run-all` call — including a fix brief's own `verify:` command — holds it while
   it runs prerequisites and writes `dist/`) and by `--run-dir` recompute (it writes the same
   `_run/summary.json` and `verdict.json`); the fresh `verdict.mjs` path gets it through
   `runAudit`. No self-block: a fresh run releases the lock before any leg is dispatched. One
   lock closes all three races (summary, Storybook record, `dist/`).
4. R10 → Phase 2 compares A4's reserved set with the set `@stencil/reserved-member-names`
   enforces (read from the installed plugin source, cite file:line). Equal or A4 ⊆ eslint →
   delete A4 and map P11 to eslint; A4 covers names eslint does not → keep A4 for that
   difference only and say so in 17's header. Either result is recorded in Phase 2 results.
5. S6 → a finding field, not a code list: a script marks "this required row checked nothing"
   with `noTarget: true`, and `verdict.mjs` maps that field to an INCOMPLETE entry (cause: no
   target resolved; prerequisite named per script). The seven emit sites today:
   `A11Y-NO-STORY` (09), `CONTRAST-NO-STORY` (10), `PIXEL-NO-STORIES` (11),
   `CONSOLE-NO-STORIES` (12), `INTERACTION-NO-STORY` (19), `COVERAGE-COMPONENT-MISSING` (06),
   `TOKEN-DIFF-NO-CURRENT` (13). Not a FAIL, because the fix is a missing input.
6. S11 → keep one vitest coverage run (one startup), add `--coverage.reportOnFailure` and a
   JSON test reporter (`--reporter=json --outputFile=<run dir>/vitest-results.json`). Failed spec
   files map to their component by path (`src/components/<name>/`); that component's 06 row gets
   an error finding `COVERAGE-TESTS-FAILED` (a FAIL owned by the fixer, pointing at the failing
   spec); every other component's 06 reads its own entry from the one summary as today.
   Per-component `reportsDirectory` was rejected: N vitest startups on `--all`/`--changed`.
7. R2 → the binding is the opened row's recorded hash vs. a re-hash of the current sources at
   recompute; the leg's own `inputHash` is no longer consulted (a self-report adds nothing once
   the recompute re-hashes). The source walk and `hashLegInput` move from `run-all.mjs` to a new
   `lib/leg-input.mjs` (run-all imports verdict.mjs, so verdict importing run-all would cycle);
   `readRunInputs` computes the current hashes and passes them into the pure `computeVerdict`.
8. S9 → `verdict.mjs` validates the run-all flags before spawning, with the parser `run-all.mjs`
   exports (`parseCli` / `resolveDepth`), and exits 2 on a usage error. A summary-less run-all
   exit stays INCOMPLETE / 3 (a crash), unchanged.
9. S5's detector → a new `detectChangedComponents()` in `lib/changed-components.mjs` returns
   `{ ok, cause, names }`; `listChangedComponents()` stays a wrapper returning `names`, so the 16
   standalone scripts that call it are untouched.

## Acceptance bar

Zero-tolerance (graded by `yarn test:scripts`; each line has at least one test that fails on
`e63c311` and passes after):

- S1 (`figma-manifest.spec.mjs`): a HEAD manifest with `design: "none"` and no `reason` or no
  `decidedBy`, or with `states` / `fileKey` beside it, or a control character in `reason` /
  `decidedBy` → `MANIFEST-INVALID`, not the waiver.
- S2 (`fix-brief.spec.mjs`): an entry with `actual: ''` (and `expected.value: ''`, `node: ''`)
  renders as `(empty)`; `renderFixBrief` does not throw.
- S3 (`verdict.spec.mjs`): a question-shaped AI finding at quick/standard renders as an
  advisory decision entry and never throws; at deep it yields NEEDS-DECISION.
- S4 (`verdict.spec.mjs`, `callers.spec.mjs`): `awaitingLegs` is true only when state is
  INCOMPLETE, the INCOMPLETE list is non-empty, and every entry is an opened `ai-*` row; a PASS
  fixture and a FAIL fixture assert `false`. `callers.spec.mjs` asserts each deep caller names
  `awaitingLegs` and `--run-dir` and no longer says "re-run the gate above".
- S5 (`verdict.spec.mjs`, `lib-changed-components.spec.mjs`): zero selected + nothing changed →
  PASS with the note on stdout; zero selected + a 03 error → FAIL; a failing git in
  `detectChangedComponents` → INCOMPLETE exit 3.
- S6 (`verdict.spec.mjs`, per-script specs): a `noTarget: true` finding on a required row →
  INCOMPLETE; each of the seven emit sites in Decision 5 carries `noTarget: true` (one assertion
  per script spec, or a source test that parses each site's finding object).
- S7 (`fix-brief.spec.mjs`): every interpolated string in `renderFixBrief` (entry fields, `code`,
  headline, excused and override sections) renders on one line; a value containing `\n### F99`
  leaves the brief's `###` heading count equal to its entry count.
- S8 (`callers.spec.mjs`): `--run-dir` must match `<auditRoot>/mud-*/runs/<run>`, where
  `auditRoot` is `--audit-dir` or the repo's `audit/`; the run segment rejects `.`, `..` and `/`.
  Cases, each → exit 2 with nothing written: a bare run id, `<auditRoot>/mud-x/runs/..`, a
  directory outside `auditRoot`. The existing exit-code cases pass with `--audit-dir <tmp>`.
- S9 (`callers.spec.mjs`): `--depth depp` → exit 2 before run-all is spawned; a run-all that
  exits without a summary → 3.
- S10 (`run-all.spec.mjs`): prerequisites ok + script crash → `crashed`, not `missing-prereq`.
- S11 (`run-all.spec.mjs`): a JSON-reporter fixture with one failed spec under
  `src/components/mud-b/` → only mud-b's 06 row carries `COVERAGE-TESTS-FAILED`; mud-a reads its
  coverage from the summary file the test writes to a real path (not a stubbed `runCommand`).
- S12 (`19-interaction.spec.mjs`): pure `countRenderedChildren(nodes)` excludes
  `[data-audit-no-motion]`; pure `judgeBx4Opened(state)` — opened means the host's `open` property
  is `true` or a `dialog[open]` / `[role="dialog"]` element is visible — and BX4 records
  `not-applicable` with the reason when it is false; `judgeBx7(submitted, expected)` fails when
  the submitted value ≠ the value set. `page.evaluate` bodies call only these.
- S13 (`grep -c "schemaVersion 1\.2\.0\|SCHEMA_VERSION = '1\.2\.0'" scripts/audit/lib/json-output.mjs`
  → 2, and `grep -c '"schemaVersion": "1\.1\.0"' scripts/audit/lib/json-output.mjs` → 0).
- S14 / R1 (`grep -c "audit-storybook.json" .claude/agents/a11y-verifier.md
  .claude/agents/pixel-perfect-verifier.md` → ≥1 each; `grep -c "on port 6007\|Storybook on 6007"`
  over both → 0): both legs take the port from the worktree record, and the pixel-perfect
  procedure passes `--port` and reads the HEAD manifest.
- Every R-row (`awk '/^#### Phase . results/,/^### /' .claude/plans/2026-09-22-audit-depths-sentinel-fixes.md | grep -oE 'R(1[01]|[1-9])\b' | sort -u | wc -l`
  → 11): each R-row fixed with a test, or given a one-line disposition, in a `#### Phase N results`.
- Regression floor: `yarn test:scripts` all pass, `yarn test` all pass, `yarn lint` clean,
  `node scripts/audit/seeded-defects.mjs` 4/4, two `--depth standard` runs on `mud-banner`
  byte-identical `verdict.json` (`cmp`), `quick` on `mud-button` median over n=5 runs
  (`/usr/bin/time` around `node scripts/audit/verdict.mjs mud-button --depth quick`) ≤ the
  Phase 0 re-baseline × 1.5, recorded in a `derived` fence. `--depth standard --changed` with two
  components is timed once and recorded (S11 changes that path; no threshold, a measurement).

Numeric tolerances: none beyond the floor above.

## Global constraints

- Branch `danzubco/make-the-component-audit-deterministic-and-depth`; never `main`.
- Node 24 (`fnm use 24`), Yarn 4, Stencil ~4.45, Vitest 4.1.x; re-read `package.json` after the
  Phase 0 merge.
- Nothing under `src/`, `tokens/`, `react/` changes.
- Envelope/verdict changes are additive; `awaitingLegs`, `warnings` and `noTarget` bump
  `VERDICT_SCHEMA_VERSION` (`scripts/audit/lib/json-output.mjs:82`) one minor.
- Callers branch on `verdict.mjs`'s exit status, never on their own reading of an envelope
  (`callers.spec.mjs` header).
- Test first: each task writes its failing test before the fix.
- Dispatched legs run no git that discards worktree state and never commit; the controller
  stages explicit paths.

## reuse-candidates: fixes

Homes swept: `scripts/audit/`, `scripts/audit/lib/`, `scripts/__tests__/audit/`.

| New unit | Nearest existing | Match tier | Verdict |
|---|---|---|---|
| design-none validation | `validateManifest` / `validateDesignNone` in `lib/figma-manifest.mjs` | exact | extend: call them from `resolveHeadManifest` |
| single-line render | none | — | one local helper in `fix-brief.mjs`, used by every interpolation |
| no-target mapping | `excuseFor` / `errorClass` in `verdict.mjs` | partial | map the finding field beside them |
| worktree lock | pid + liveness handling in `lib/storybook-helpers.mjs` | pattern | reuse `isProcessAlive`; lock helper in the same lib |
| coverage failure mapping | the coverage prerequisite in `run-all.mjs` | exact | extend the one run with a JSON reporter |
| leg input hashing | `hashLegInput` / `defaultReadSources` in `run-all.mjs` | exact | move to `lib/leg-input.mjs`; both importers use it |
| changed-set status | `listChangedComponents` in `lib/changed-components.mjs` | exact | add `detectChangedComponents`; keep the old export as a wrapper |
| flag validation | `parseCli` / `resolveDepth` in `run-all.mjs` | exact | export and call from `verdict.mjs` |
| AI-leg status enum | `ROW_STATUS` in `lib/json-output.mjs` | exact pattern | add `AI_LEG_STATUS` beside it |

## Tasks

### Phase 0 — sync with upstream
**Executor**: session model, medium effort · wave 1

**Files**:
- Modify: `.claude/skills/stencil-compliance/SKILL.md`
- Modify: `.claude/plans/2026-09-22-audit-depths-sentinel-fixes.md`
- Read only: `package.json`

- [ ] `git merge upstream/main` (the repo's convention for this, e.g. `a06df23`); the only file
  changed on both sides is `.claude/skills/stencil-compliance/SKILL.md`, and the merge-tree probe
  is clean. Verify: `yarn test:scripts` and `yarn lint` pass on the merge commit.
- [ ] Re-baseline `quick` on `mud-button` on the merged tree (n=5 median, the acceptance bar's
  instrument); record it under `#### Phase 0 results` in a `derived` fence with the command.

### Phase 1 — verdict core
**Executor**: sonnet, high effort · wave 2

**Files**:
- Modify: `scripts/audit/verdict.mjs`
- Modify: `scripts/audit/run-all.mjs`
- Create: `scripts/audit/lib/leg-input.mjs`
- Modify: `scripts/audit/lib/fix-brief.mjs`
- Modify: `scripts/audit/lib/json-output.mjs`
- Modify: `scripts/audit/lib/figma-manifest.mjs`
- Modify: `scripts/__tests__/audit/verdict.spec.mjs`
- Modify: `scripts/__tests__/audit/fix-brief.spec.mjs`
- Modify: `scripts/__tests__/audit/figma-manifest.spec.mjs`
- Modify: `scripts/__tests__/audit/lib-json-output.spec.mjs`
- Modify: `scripts/__tests__/audit/callers.spec.mjs`
- Modify: `scripts/__tests__/audit/run-all.spec.mjs`

- [ ] S1 design-none validated at HEAD, control characters rejected. Verify: acceptance S1.
- [ ] S2 empty values render `(empty)`. Verify: acceptance S2.
- [ ] S3 question-shaped AI finding → decision entry. Verify: acceptance S3.
- [ ] S4 `awaitingLegs` computed and written. Verify: acceptance S4 (verdict half).
- [ ] S6 verdict maps `noTarget: true` → INCOMPLETE (Decision 5); such findings never also
  appear under R4's warnings. Verify: acceptance S6 (verdict half).
- [ ] S7 one single-line helper applied to every interpolation in `renderFixBrief`. Verify:
  acceptance S7.
- [ ] S8 `--run-dir` shape rooted at `--audit-dir`. Verify: acceptance S8.
- [ ] S9 flags validated before spawning (Decision 8). Verify: acceptance S9.
- [ ] S13 envelope doc says 1.2.0 and what 1.1.0 / 1.2.0 each added in prose that does not
  repeat the `"schemaVersion": "1.1.0"` example. Verify: acceptance S13.
- [ ] R2 per Decision 7 (`lib/leg-input.mjs`, re-hash in `readRunInputs`); a mismatch leaves the
  row unclosed with cause "source changed since run <run>".
- [ ] R4 `verdict.json` carries a `warnings` list; the brief renders "Warnings (non-blocking)"
  with row and verify command; state unchanged.
- [ ] R7 `AI_LEG_STATUS` frozen enum used at every site.
- [ ] `VERDICT_SCHEMA_VERSION` one minor bump for `awaitingLegs` / `warnings` / `noTarget`.

### Phase 2 — orchestrator and scripts
**Executor**: sonnet, high effort · wave 3

**Files**:
- Modify: `scripts/audit/run-all.mjs`
- Modify: `scripts/audit/verdict.mjs`
- Modify: `scripts/audit/lib/changed-components.mjs`
- Modify: `scripts/audit/lib/storybook-helpers.mjs`
- Modify: `scripts/audit/06-test-coverage.mjs`
- Modify: `scripts/audit/09-a11y-tree.mjs`
- Modify: `scripts/audit/10-contrast-pairs.mjs`
- Modify: `scripts/audit/11-pixel-diff-states.mjs`
- Modify: `scripts/audit/12-console-errors.mjs`
- Modify: `scripts/audit/13-token-diff.mjs`
- Modify: `scripts/audit/19-interaction.mjs`
- Modify: `scripts/audit/seeded-defects.mjs`
- Modify: `scripts/audit/17-adapter-contract.mjs`
- Modify: `scripts/__tests__/audit/run-all.spec.mjs`
- Modify: `scripts/__tests__/audit/verdict.spec.mjs`
- Modify: `scripts/__tests__/audit/lib-changed-components.spec.mjs`
- Modify: `scripts/__tests__/audit/06-test-coverage.spec.mjs`
- Modify: `scripts/__tests__/audit/09-a11y-tree.spec.mjs`
- Modify: `scripts/__tests__/audit/10-contrast-pairs.spec.mjs`
- Modify: `scripts/__tests__/audit/11-pixel-diff-states.spec.mjs`
- Modify: `scripts/__tests__/audit/12-console-errors.spec.mjs`
- Modify: `scripts/__tests__/audit/13-token-diff.spec.mjs`
- Modify: `scripts/__tests__/audit/19-interaction.spec.mjs`
- Modify: `scripts/__tests__/audit/seeded-defects.spec.mjs`
- Modify: `scripts/__tests__/audit/17-adapter-contract.spec.mjs`
- Modify: `.claude/plans/2026-09-22-audit-depths-sentinel-fixes.md`
- Read only: `eslint.config.mjs`
- Read only: `node_modules/@stencil/eslint-plugin/`
- Read only: `node_modules/vitest/`

- [ ] S5 zero selection per Decision 2 and Decision 9 (`writeSummary`, `printSummary`,
  repo-level rows into the summary state). Verify: acceptance S5.
- [ ] S6 the seven emit sites carry `noTarget: true` (Decision 5). Verify: acceptance S6
  (script half).
- [ ] S10 crash vs missing-prereq. Verify: acceptance S10.
- [ ] S11 per Decision 6; confirm `--coverage.reportOnFailure` and the JSON reporter options in
  the installed Vitest (cite file:line) before relying on them. Verify: acceptance S11.
- [ ] S12 extract `countRenderedChildren`, `judgeBx4Opened`, `judgeBx7`. Verify: acceptance S12.
- [ ] R3 lock per Decision 3; tests: a second fresh run is refused while the first holds the
  lock; a stale lock (dead pid, or matching pid with a different start time) is taken over;
  `--run-dir` recompute takes and releases it.
- [ ] R5 support: `runFresh` removes a stale `audit/_run/envelope.json` beside `summary.json`
  before spawning.
- [ ] R6 extract 09's BX2/BX3 status assembly into a pure function with tests; add the
  `figmaDir` + absent + waiver `selectScripts` case.
- [ ] R9 the start time is written where `.audit-storybook.json` is written
  (`storybook-helpers.mjs`, via `ps -o lstart= -p`); `seeded-defects` signals only when pid and
  start time match; a record without a start time (legacy) is signalled and the fact logged.
- [ ] R10 per Decision 4; record the comparison and its citation under `#### Phase 2 results`.

### Phase 3 — callers and legs
**Executor**: sonnet, medium effort · wave 3 (parallel with Phase 2; disjoint files; needs Phase 1's `awaitingLegs`)

**Files**:
- Modify: `.claude/agents/audit-production.md`
- Modify: `.claude/commands/audit-component.md`
- Modify: `.claude/commands/migrate-component.md`
- Modify: `.claude/commands/pre-pr-check.md`
- Modify: `.claude/agents/a11y-verifier.md`
- Modify: `.claude/agents/pixel-perfect-verifier.md`
- Modify: `.claude/skills/audit-component/SKILL.md`
- Modify: `.claude/skills/stencil-compliance/SKILL.md`
- Modify: `scripts/__tests__/audit/callers.spec.mjs`

- [ ] S4 deep callers: exit 3 + `awaitingLegs` → dispatch legs → `--run-dir <run>` → stop on
  non-zero; remove "re-run the gate above". Verify: acceptance S4 (callers half).
- [ ] S14 + R1 port from `.audit-storybook.json`, `--port` passed, HEAD manifest read. Verify:
  acceptance S14 / R1.
- [ ] R2 follow-through: the three leg contracts (`a11y-verifier.md`, `pixel-perfect-verifier.md`,
  `stencil-compliance/SKILL.md`) say `inputHash` is optional and informational — the verdict
  re-hashes the sources itself.
- [ ] R5 `pre-pr-check` runs the audit once and branches on `verdict.mjs`'s exit status; the
  envelope is read only to display blockers.
- [ ] R8 both AI-leg contracts require `cat <<'EOF' > …` (quoted delimiter) for `ai-findings.json`.
- [ ] R11 fix loop: run only `verify` values read from `verdict.json`; brief field values are
  display text.

### Phase 4 — docs, prove it, grade, gate, ready
**Executor**: session model, high effort · wave 4

**Files**:
- Modify: `scripts/audit/README.md`
- Modify: `.claude/skills/audit-component/SKILL.md`
- Modify: `.claude/skills/audit-component/references/wave-2-static-analysis.md`
- Modify: `.claude/plans/2026-09-22-audit-depths-sentinel-fixes.md`
- Read only: `scripts/audit/seeded-defects.mjs`

- [ ] Docs, after the wave-3 join: S5 (zero selection), S6 (`noTarget` → INCOMPLETE), R3 (one
  audit per worktree; `audit/<component>/runs/` is disposable and safe to delete — no retention
  is automated), R4 (warnings section), S11 (`COVERAGE-TESTS-FAILED`), R10's recorded outcome
  (the SKILL.md:168 and wave-2 mapping rows).
- [ ] Regression floor from the acceptance bar; record numbers under `#### Phase 4 results`.
- [ ] Grade: `scope-check.mjs` per phase, `/code-review`, then fresh-eyes verify against this plan.
- [ ] `dan-sentinel` round 2 over `e63c311..HEAD`; APPROVE or APPROVE-WITH-NITS with nits
  recorded → `gh pr ready 115 --repo egov-moldova/design-system` (owner asked for this).
  REQUEST-CHANGES → fix, round 3 at most (sentinel cap), then back to the owner.

## Execution matrix

| Phase | Shape | Model / effort | Wave |
|---|---|---|---|
| 0 | mechanical (merge) | session model, medium | 1 |
| 1 | implementer (verdict contract, decisions fixed) | sonnet, high | 2 |
| 2 | implementer | sonnet, high | 3 |
| 3 | implementer (prose that must match the code) | sonnet, medium | 3 (parallel with 2) |
| 4 | docs + verification + gate | session model, high | 4 |

## Not verified

- A live `--depth deep` run (needs dispatched AI legs and `FIGMA_TOKEN`); the two-phase flow is
  proven by fixtures and caller-text assertions only.
- Findings S8–S12 and R2–R3 were found by reading code, not reproduced; each task's first test
  is the reproduction.
- AI legs keep unrestricted Bash; the write target for `ai-findings.json` is bounded by prompt
  convention only. Pre-existing, out of this plan's scope (preflight leg 2, finding 2); a
  separate hardening issue.

## Self-refute log

| # | Question | Instance + fix, or no instance + what was scanned |
|---|---|---|
| 1 | Does a fix reuse the defect's own mechanism class? | S6's allowlist relies on each script naming its no-target code; a new script with a new code would be `ok` again — the same silent pass. Round 2 showed a code list is itself a naming convention (it already missed two codes); fix: Decision 5 moves the mechanism to a `noTarget` finding field set at each emit site, with a per-site assertion. R2 drops the leg-supplied hash from the trust path entirely (Decision 7): the recompute re-hashes the sources and compares with the opened row. S4's `awaitingLegs` is a field, but whether a caller obeys it stays prose — the parent plan's accepted limit, restated under Not verified. |
| 2 | Can a rule's letter be met with its intent violated? | S5: "detector failure → INCOMPLETE" is met vacuously if `listChangedComponents` keeps returning `[]` on a failed `git diff`. Fix: Phase 2 S5 task makes the detector return its status, and the test drives a failing git. S4: `awaitingLegs` must be false when any non-`ai-*` row is INCOMPLETE — acceptance S4 says "iff". |
| 3 | Every numeric target has a denominator, a minimum n and an instrument outside what it grades? | The only number is the quick median; it had no n. Fix: acceptance floor now says n=5 and names the instrument. Byte-identity is a boolean over two runs, instrument `cmp`. |
| 4 | Do two of the plan's own rules interact into an unintended pass? | S6 (no-target → INCOMPLETE) × browser waiver: a waived browser row never runs, so it emits no code and stays excused — intended. S3 (question → decision entry) × S4 (`awaitingLegs`): at deep a question closes its row as NEEDS-DECISION, so `awaitingLegs` is false — intended. R3 (lock) × S4 (`--run-dir`): recompute takes the lock too (it writes the same summary and verdict); it cannot self-block because the fresh run released the lock before the legs were dispatched — a test pins take-and-release (Phase 2 R3). R5 × S6: gating `pre-pr-check` on the envelope's `ok` would miss `noTarget` INCOMPLETE — so R5 branches on the verdict's exit status. R4 (warnings) × S6: a no-target code would appear twice — fixed by the S6 task's "never also listed". |

## Review log

- 2026-09-22 preflight cfb1f13, two legs (leg 1 ran twice: the first dispatch carried an
  unexpanded question file; both copies returned `ok`). Leg 1: FORTIFY ×2 — S8 run segment
  must reject `.`/`..` (folded, acceptance S8); R-row coverage needed a command (folded); the
  quick-median bar needed a post-merge re-baseline (folded, Phase 0); the lock needed pid-reuse
  handling (folded, Phase 2 R3). Leg 2: CONFIRM — `runs/` retention note (folded, Phase 3
  docs); AI-leg Bash scope (trade-off, out of scope, § Not verified).
- 2026-09-22 critic de4695d (round 2, widened to correctness + goal-fit over the current code):
  FORTIFY, 16 findings, all folded. Above the bar: S13's grep could not pass (bar rewritten);
  S8 broke the existing CLI tests (rooted at `--audit-dir`, Decision 8 area); S11's per-component
  runs would overwrite one coverage report (Decision 6). Beyond, folded: R2 drops the leg hash
  and moves hashing to `lib/leg-input.mjs` (Decision 7); the lock moves into `runAudit` and
  covers recompute (Decision 3); R5 branches on the exit status; S9 validates flags before
  spawning (Decision 8); `detectChangedComponents` keeps the old export (Decision 9); S4's `iff`
  made non-vacuous; the docs step moves after the wave-3 join (Phase 4); S6 becomes a `noTarget`
  field covering 06 and 13 too (Decision 5); S12 names its pure extractions; S7 covers every
  interpolation; the R-row and S14 checks are runnable commands; R9 writes the start time where
  the record is written.
