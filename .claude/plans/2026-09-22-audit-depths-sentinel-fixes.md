# audit-component depths — fixes from the PR #115 merge gate

**Reviewed:** none

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
3. R3 → one worktree-level lock (`audit/_run/.lock`, created `wx`, holds pid + start time; a
   stale lock whose pid is dead is removed; a live one → INCOMPLETE "another audit is running in
   this worktree (pid N)"). One lock closes all three races (summary, Storybook record, `dist/`);
   a per-run summary path alone would leave the other two.
4. R10 → Phase 2 compares A4's reserved set with the set `@stencil/reserved-member-names`
   enforces (read from the installed plugin source, cite file:line). Equal or A4 ⊆ eslint →
   delete A4 and map P11 to eslint; A4 covers names eslint does not → keep A4 for that
   difference only and say so in 17's header. Either result is recorded in Phase 2 results.
5. S6 → a closed allowlist `NO_TARGET_CODES` in `verdict.mjs` maps those five codes to an
   INCOMPLETE entry (cause: no story resolved; prerequisite: add a story or a `storyId`) — not a
   FAIL, because the fix is a missing input.

## Acceptance bar

Zero-tolerance (graded by `yarn test:scripts`; each line has at least one test that fails on
`e63c311` and passes after):

- S1: a HEAD manifest with `design: "none"` and no `reason` or no `decidedBy`, or with `states`
  / `fileKey` beside it → `MANIFEST-INVALID`, not the waiver (`figma-manifest.spec.mjs`).
- S2: an entry with `actual: ''` (and `expected.value: ''`, `node: ''`) renders as
  `(empty)`; `renderFixBrief` does not throw (`fix-brief.spec.mjs`).
- S3: a question-shaped AI finding at quick/standard renders as an advisory decision entry and
  never throws; at deep it yields NEEDS-DECISION (`verdict.spec.mjs`).
- S4: `computeVerdict` sets `awaitingLegs: true` iff every INCOMPLETE entry is an opened
  `ai-*` row; `callers.spec.mjs` asserts each deep caller names `awaitingLegs` and `--run-dir`
  and no longer says "re-run the gate above".
- S5: zero selected + nothing changed → PASS with the note on stdout; zero selected + a 03 error
  → FAIL; detector failure → INCOMPLETE exit 3 (`verdict.spec.mjs`, `lib-changed-components.spec.mjs`).
- S6: each of the five no-target codes on a required row → INCOMPLETE (`verdict.spec.mjs`).
- S7: a field value containing `\n### F99` renders on one line; the brief's `###` heading count
  equals the entry count (`fix-brief.spec.mjs`).
- S8: `--run-dir` not matching `<audit>/<mud-*>/runs/<run>` → exit 2 and nothing written.
- S9: `--depth depp` → exit 2 (`callers.spec.mjs`).
- S10: prerequisites ok + script crash → `crashed`, not `missing-prereq` (`run-all.spec.mjs`).
- S11: two components, one failing spec → only that component's 06 is non-ok (`run-all.spec.mjs`).
- S12: BX4 not run when the overlay did not open (recorded `not-applicable` with the reason);
  BX1 ignores `[data-audit-no-motion]`; BX7 fails when the submitted value ≠ the set value
  (`19-interaction.spec.mjs`).
- S13: `grep -c "1\.1\.0" scripts/audit/lib/json-output.mjs` → 0.
- S14 / R1: `grep -n "6007" .claude/agents/a11y-verifier.md .claude/agents/pixel-perfect-verifier.md`
  shows only the documented default, each file names `.audit-storybook.json`, and the
  pixel-perfect procedure passes `--port` and reads the HEAD manifest.
- Every R-row: fixed with a test, or a one-line disposition in this plan's Phase results.
- Regression floor: `yarn test:scripts` all pass, `yarn test` all pass, `yarn lint` clean,
  `node scripts/audit/seeded-defects.mjs` 4/4, two `--depth standard` runs on `mud-banner`
  byte-identical `verdict.json`, `quick` on `mud-button` median ≤ 4,480 ms.

Numeric tolerances: none beyond the floor above.

## Global constraints

- Branch `danzubco/make-the-component-audit-deterministic-and-depth`; never `main`.
- Node 24 (`fnm use 24`), Yarn 4, Stencil ~4.45; re-read `package.json` after the Phase 0 merge.
- Nothing under `src/`, `tokens/`, `react/` changes.
- Envelope/verdict changes are additive; `awaitingLegs` and the warnings list bump
  `VERDICT_SCHEMA_VERSION` minor.
- Test first: each task writes its failing test before the fix.
- Dispatched legs run no git that discards worktree state and never commit; the controller
  stages explicit paths.

## reuse-candidates: fixes

Homes swept: `scripts/audit/`, `scripts/audit/lib/`, `scripts/__tests__/audit/`.

| New unit | Nearest existing | Match tier | Verdict |
|---|---|---|---|
| design-none validation | `validateManifest` / `validateDesignNone` in `lib/figma-manifest.mjs` | exact | extend: call them from `resolveHeadManifest` |
| single-line field render | none | — | a local helper in `fix-brief.mjs` |
| no-target mapping | `excuseFor` / `errorClass` in `verdict.mjs` | partial | a sibling constant beside them |
| worktree lock | `ensureWorktreeStorybook` record handling in `lib/storybook-helpers.mjs` (pid + liveness) | pattern | reuse `isProcessAlive`; new lock helper in the same lib |
| per-component coverage prerequisite | the existing coverage prerequisite in `run-all.mjs` | exact | extend: one run per component |
| AI-leg status enum | `ROW_STATUS` in `lib/json-output.mjs` | exact pattern | add `AI_LEG_STATUS` beside it |

## Tasks

### Phase 0 — sync with upstream
**Executor**: session model, medium effort · wave 1

**Files**:
- Modify: `.claude/skills/stencil-compliance/SKILL.md`
- Read only: `package.json`

- [ ] `git merge upstream/main` (the repo's convention for this, e.g. `a06df23`); the only
  overlapping path is `.claude/skills/stencil-compliance/SKILL.md`, which merged cleanly in the
  probe. Verify: `yarn test:scripts` and `yarn lint` pass on the merge commit.

### Phase 1 — verdict core
**Executor**: sonnet, high effort · wave 2

**Files**:
- Modify: `scripts/audit/verdict.mjs`
- Modify: `scripts/audit/lib/fix-brief.mjs`
- Modify: `scripts/audit/lib/json-output.mjs`
- Modify: `scripts/audit/lib/figma-manifest.mjs`
- Modify: `scripts/__tests__/audit/verdict.spec.mjs`
- Modify: `scripts/__tests__/audit/fix-brief.spec.mjs`
- Modify: `scripts/__tests__/audit/figma-manifest.spec.mjs`
- Modify: `scripts/__tests__/audit/lib-json-output.spec.mjs`
- Modify: `scripts/__tests__/audit/callers.spec.mjs`

- [ ] S1 design-none validated at HEAD. Verify: acceptance S1.
- [ ] S2 empty values render `(empty)`. Verify: acceptance S2.
- [ ] S3 question-shaped AI finding → decision entry. Verify: acceptance S3.
- [ ] S4 `awaitingLegs` computed and written; `VERDICT_SCHEMA_VERSION` minor bump. Verify:
  acceptance S4 (computeVerdict half).
- [ ] S6 `NO_TARGET_CODES` → INCOMPLETE. Verify: acceptance S6.
- [ ] S7 single-line field rendering, `code` included. Verify: acceptance S7.
- [ ] S8 `--run-dir` shape check → exit 2. Verify: acceptance S8.
- [ ] S9 usage errors exit 2 in fresh mode (distinguish run-all's usage exit from a
  summary-less crash). Verify: acceptance S9.
- [ ] S13 envelope doc says 1.2.0 and what 1.1.0 / 1.2.0 each added.
- [ ] R2 recompute re-hashes each opened row's inputs (`hashLegInput`); a mismatch or a missing
  `inputHash` leaves the row unclosed with cause "source changed since run" / "no inputHash".
- [ ] R4 `verdict.json` carries a `warnings` list; the brief renders "Warnings (non-blocking)"
  with row and verify command; state unchanged.
- [ ] R7 `AI_LEG_STATUS` frozen enum used at every site.

### Phase 2 — orchestrator and browser scripts
**Executor**: sonnet, high effort · wave 3

**Files**:
- Modify: `scripts/audit/run-all.mjs`
- Modify: `scripts/audit/verdict.mjs`
- Modify: `scripts/audit/lib/changed-components.mjs`
- Modify: `scripts/audit/lib/storybook-helpers.mjs`
- Modify: `scripts/audit/19-interaction.mjs`
- Modify: `scripts/audit/09-a11y-tree.mjs`
- Modify: `scripts/audit/seeded-defects.mjs`
- Modify: `scripts/audit/17-adapter-contract.mjs`
- Modify: `scripts/__tests__/audit/run-all.spec.mjs`
- Modify: `scripts/__tests__/audit/verdict.spec.mjs`
- Modify: `scripts/__tests__/audit/lib-changed-components.spec.mjs`
- Modify: `scripts/__tests__/audit/19-interaction.spec.mjs`
- Modify: `scripts/__tests__/audit/09-a11y-tree.spec.mjs`
- Modify: `scripts/__tests__/audit/seeded-defects.spec.mjs`
- Modify: `scripts/__tests__/audit/17-adapter-contract.spec.mjs`
- Modify: `.claude/plans/2026-09-22-audit-depths-sentinel-fixes.md`
- Read only: `eslint.config.mjs`
- Read only: `node_modules/@stencil/eslint-plugin/`

- [ ] S5 zero selection per Decision 2 (`writeSummary`, `printSummary`, repo-level rows into
  the summary state, detector failure surfaced by `listChangedComponents`). Verify: acceptance S5.
- [ ] S10 crash vs missing-prereq. Verify: acceptance S10.
- [ ] S11 per-component coverage prerequisite. Verify: acceptance S11.
- [ ] S12 BX4 / BX1 / BX7. Verify: acceptance S12.
- [ ] R3 worktree lock per Decision 3 (in `runFresh`, helper in `storybook-helpers.mjs`).
- [ ] R6 extract 09's BX2/BX3 status assembly into a pure function with tests; add the
  `figmaDir` + absent + waiver `selectScripts` case.
- [ ] R9 `seeded-defects` records pid + start time and signals only when both match.
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
- Modify: `.claude/skills/audit-component/references/wave-2-static-analysis.md`
- Modify: `scripts/audit/README.md`
- Modify: `scripts/__tests__/audit/callers.spec.mjs`

- [ ] S4 deep callers: exit 3 + `awaitingLegs` → dispatch legs → `--run-dir <run>` → stop on
  non-zero; remove "re-run the gate above". Verify: acceptance S4 (callers half).
- [ ] S14 + R1 port from `.audit-storybook.json`, `--port` passed, HEAD manifest read. Verify:
  acceptance S14 / R1.
- [ ] R5 `pre-pr-check` runs the audit once (`verdict.mjs --json`) and reads `ok`/`blockers`
  from `audit/_run/envelope.json`.
- [ ] R8 both AI-leg contracts require `cat <<'EOF' > …` (quoted delimiter) for `ai-findings.json`.
- [ ] R11 fix loop: run only `verify` values read from `verdict.json`; brief field values are
  display text.
- [ ] Docs reflect S5 (zero selection), S6 (no-target INCOMPLETE), R3 (one audit per worktree),
  R4 (warnings section), R10's outcome (after Phase 2 records it; else leave the mapping row).

### Phase 4 — prove it, grade, gate, ready
**Executor**: session model, high effort · wave 4

**Files**:
- Modify: `.claude/plans/2026-09-22-audit-depths-sentinel-fixes.md`
- Read only: `scripts/audit/seeded-defects.mjs`

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
| 4 | verification + gate | session model, high | 4 |

## Not verified

- A live `--depth deep` run (needs dispatched AI legs and `FIGMA_TOKEN`); the two-phase flow is
  proven by fixtures and caller-text assertions only.
- Findings S8–S12 and R2–R3 were found by reading code, not reproduced; each task's first test
  is the reproduction.

## Review log
