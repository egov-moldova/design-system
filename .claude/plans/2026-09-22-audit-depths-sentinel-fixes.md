# audit-component depths — fixes from the PR #115 merge gate

**Reviewed:** preflight cfb1f13, critic de4695d, critic 938c59a, critic 78d432c — round cap reached, a fourth round ordered by the owner, then the loop brake; closed by the owner, who said go to implementation 2026-09-22

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
| A (chosen) | `verdict.json` gains `awaitingLegs: true` when every INCOMPLETE entry is an opened `ai-*` row; state stays INCOMPLETE / exit 3. Callers: exit 3 + `awaitingLegs` → dispatch legs → `yarn audit:component --run-dir <runDir>` (from `audit/_run/summary.json`) → stop on non-zero. | One additive field + ~3 lines per caller; the branch is readable by a caller, not inferred. |
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
3. R3 → two locks, each over what it protects. Both are files created `wx` holding pid + start
   time (`ps -o lstart= -p <pid>`) + a random nonce; stale when the pid is dead or its start time
   differs (pid reuse); a live one → INCOMPLETE naming the pid and the lock path.
   - **Worktree lock** `<repoRoot>/audit/_run/.worktree.lock` — guards `dist/` and the worktree
     Storybook record. Taken by every run that builds or starts Storybook: `runAudit` (so a
     direct `run-all`, including a fix brief's `verify:` command, holds it). Never taken by
     `--run-dir` recompute, which writes neither.
   - **Audit-dir lock** `<auditDir>/_run/.lock` — guards `_run/summary.json`,
     `_run/envelope.json`, `_run/vitest-results.json` and each `verdict.json`. Taken by
     `runFresh` around deleting those files, spawning run-all and reading the summary, and by
     `--run-dir` recompute. Rooted at `--audit-dir` when given, so the CLI tests over temp audit
     dirs never touch the real worktree's lock — no override knob exists.
   `runFresh` hands its audit-dir lock to the child through `AUDIT_LOCK_TOKEN`; `runAudit`
   accepts the token only if the lock file exists, its nonce equals the token and its pid is
   alive — otherwise it takes the lock itself. No self-block: a fresh run releases both locks
   before any leg is dispatched.
4. R10 → Phase 2 compares A4's reserved set with the set `@stencil/reserved-member-names`
   enforces (read from the installed plugin source, cite file:line). Equal or A4 ⊆ eslint →
   delete A4 and map P11 to eslint; A4 covers names eslint does not → keep A4 for that
   difference only and say so in 17's header. Either result is recorded in Phase 2 results.
5. S6 → a finding field, not a code list: a script marks "this required row checked nothing"
   with `noTarget: true`, and `verdict.mjs` maps that field to an INCOMPLETE entry (cause: no
   target resolved; prerequisite named per script). The seven emit sites today:
   `A11Y-NO-STORY` (09), `CONTRAST-NO-STORY` (10), `PIXEL-NO-STORIES` (11),
   `CONSOLE-NO-STORIES` (12), `INTERACTION-NO-STORY` (19), `COVERAGE-COMPONENT-MISSING` (06),
   `TOKEN-DIFF-NO-CURRENT` (13), plus `TOKEN-DIFF-NO-FIGMA-EXPORT` (13), `PIXEL-NO-REFERENCES`
   (11) and BX4's overlay-did-not-open case (19) — ten in all. The shared `finding()` builder
   (`lib/json-output.mjs:262`) copies a fixed field list, so it gains `noTarget` first. Not a
   FAIL, because the fix is a missing input.
6. S11 → keep one vitest coverage run (one startup), add `--coverage.reportOnFailure` and a
   JSON test reporter (`--reporter=json --outputFile=<run dir>/vitest-results.json`). Failed spec
   files map to their component by path (`src/components/<name>/`); that component's 06 row gets
   an error finding `COVERAGE-TESTS-FAILED` (a FAIL owned by the fixer, pointing at the failing
   spec); every other component's 06 reads its own entry from the one summary as today.
   The prerequisite is `ok` iff the results JSON parsed and (vitest exited 0, or every failed
   spec maps to a selected component); otherwise `missing-prereq` — a vitest crash that writes no
   JSON never lets 06 read a stale summary. Results go to `<auditDir>/_run/vitest-results.json`
   (the run dir does not exist yet when prerequisites run), and the file is deleted before vitest
   is spawned, so a crash can never leave the previous run's results to be parsed. Per-component `reportsDirectory` was
   rejected: N vitest startups on `--all`/`--changed`.
7. R2 → the binding is the opened row's recorded hash vs. a re-hash of the current sources at
   recompute; the leg's own `inputHash` is no longer consulted (a self-report adds nothing once
   the recompute re-hashes). The source walk, `hashLegInput` and the leg→prompt table (today in
   `AUDIT_SCRIPTS`, run-all.mjs:303-321) move to a new `lib/leg-input.mjs`, so `verdict.mjs`
   never imports `run-all.mjs` (which pulls in figma-refs and the whole registry);
   `readRunInputs` computes the current hashes and passes them into the pure `computeVerdict`.
   A row left open because its hash no longer matches is not "awaiting legs" (Decision 1):
   `awaitingLegs` is false there and the entry says to start a fresh run.
8. S9 → `parseCli` and its usage text move from `run-all.mjs` to `lib/cli-args.mjs`, beside
   `resolveDepth`; `verdict.mjs` validates the run-all flags with it before spawning and exits 2
   on a usage error. A summary-less run-all
   exit stays INCOMPLETE / 3 (a crash), unchanged.
9. S5's detector → a new `detectChangedComponents()` in `lib/changed-components.mjs` returns
   `{ ok, cause, names }`; `listChangedComponents()` stays a wrapper returning `names`, so the 16
   standalone scripts that call it are untouched.
10. Callers read two computed fields besides the exit status: `awaitingLegs` in `verdict.json`,
   and the component's `runDir` in `audit/_run/summary.json` (repo-relative
   `audit/<component>/runs/<run>`, absolute when `--audit-dir` is outside the repo — the value
   they pass to `--run-dir`). `runDir` is per-run, so it stays out of `verdict.json`, which must
   be byte-identical across runs (owner, 2026-09-22, when the stage found the two in conflict).
   This is a stated carve-out from the parent plan's Design §1 ("callers branch on the verdict's exit
   status, never on their own reading of the verdict"): the field is computed by the verdict, not
   re-derived by the caller. `callers.spec.mjs`'s header records it.

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
  INCOMPLETE, the INCOMPLETE list is non-empty, and every entry is an opened `ai-*` row whose
  hash still matches. Fixtures: only opened `ai-*` rows INCOMPLETE → `true`; opened `ai-*` rows
  plus one non-ai INCOMPLETE entry → `false`; an `ai-*` row open on a stale hash → `false`;
  PASS and FAIL → `false`. `callers.spec.mjs` asserts each deep caller names `awaitingLegs`,
  passes `--run-dir` the summary's `runDir` and names `audit/_run/summary.json` as its source,
  never `verdict.runDir` (the full `audit/<component>/runs/<run>` form — a
  bare run id is rejected by S8), and no longer says "re-run the gate above".
- S5 (`verdict.spec.mjs`, `lib-changed-components.spec.mjs`): zero selected + nothing changed →
  PASS with the note on stdout; zero selected + a 03 error → FAIL; a failing git in
  `detectChangedComponents` → INCOMPLETE exit 3.
- S6 (`verdict.spec.mjs`, `lib-json-output.spec.mjs`, per-script specs): `finding({noTarget:
  true})` emits the field; a `noTarget: true` finding on a required row → INCOMPLETE; each of the
  ten sites in Decision 5 is asserted on the finding object as emitted through `finding()` (the
  script's exported function or its `--json` output), never on source text.
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
  coverage from the summary file the test writes to a real path (not a stubbed `runCommand`);
  a vitest exit with no results JSON → every selected 06 `missing-prereq`, including when a
  previous run's results file (with no failures) is present before the run.
- S12 (`19-interaction.spec.mjs`): pure `countRenderedChildren(nodes)` excludes
  `[data-audit-no-motion]`; BX4's open step calls a boolean-parameter open method with `true`;
  pure `judgeBx4Opened(before, after)` means a rendered change — the visible shadow + light tree
  differs, or an `aria-expanded` flipped to `true` — never the host's `open` property, which the
  audit itself sets; pure `declaresPopup(contract, dom)` is true for a `dialog`, `popover`,
  `aria-haspopup` or `aria-modal`. Not opened + declares a popup → a `noTarget` finding
  (INCOMPLETE); not opened + no popup → `not-applicable` with the reason. Fixtures:
  `mud-accordion-item` (opens via `setOpen(true)`, panel `role="region"` → judged, not blocked),
  `mud-tooltip` (`role="tooltip"`), `mud-breadcrumb-item` (`active` is not an overlay →
  `not-applicable`); `judgeBx7(submitted, expected)` fails when
  the submitted value ≠ the value set. `page.evaluate` bodies call only these.
- S13 (`lib-json-output.spec.mjs`): the version the module's doc block states equals the
  `SCHEMA_VERSION` constant, and the doc's example envelope carries that same version.
- S14 / R1 (graded by its own commands: `grep -c "audit-storybook.json" .claude/agents/a11y-verifier.md
  .claude/agents/pixel-perfect-verifier.md` → ≥1 each; `grep -c "on port 6007\|Storybook on 6007"`
  over both → 0): both legs take the port from the worktree record, and the pixel-perfect
  procedure passes `--port` and reads the HEAD manifest.
- Every R-row (graded by its own commands: `grep -oE '^- R(1[01]|[1-9]):' .claude/plans/2026-09-22-audit-depths-sentinel-fixes.md | sort -u | wc -l`
  → 11 distinct ids, and `grep -cE '^- R(1[01]|[1-9]): ' <plan>` equals `grep -cE '^- R(1[01]|[1-9]): (fixed|deferred|dropped) — ' <plan>`): the Phase 4 controller writes one line per R-row, in that exact shape, under
  `#### Phase 4 results`, citing the test or the reason.
- Regression floor: `yarn test:scripts` all pass, `yarn test` all pass, `yarn lint` clean,
  `node scripts/audit/seeded-defects.mjs` 4/4, two `--depth standard` runs on `mud-banner`
  byte-identical `verdict.json` (`cmp`), `quick` on `mud-button` median over n=5 runs
  (the Phase 0 results command, one warm-up discarded) ≤ 3240 ms (the Phase 0 median 2160 ms ×
  1.5). `--depth standard --changed` with two
  components is timed once and recorded (S11 changes that path; no threshold, a measurement).

Numeric tolerances: none beyond the floor above.

## Global constraints

- Branch `danzubco/make-the-component-audit-deterministic-and-depth`; never `main`.
- Node 24 (`fnm use 24`), Yarn 4, Stencil ~4.45, Vitest 4.1.x; re-read `package.json` after the
  Phase 0 merge.
- Nothing under `src/`, `tokens/`, `react/` changes.
- Envelope/verdict changes are additive: `noTarget` on envelope findings bumps `SCHEMA_VERSION`
  (`scripts/audit/lib/json-output.mjs:31`) one minor; `awaitingLegs` and `warnings` in
  `verdict.json` bump `VERDICT_SCHEMA_VERSION` (`:82`) one minor.
- Callers branch on `verdict.mjs`'s exit status, never on their own reading of the verdict,
  except `awaitingLegs` and `runDir` (Decision 10).
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
| flag validation | `parseCli` in `run-all.mjs`, `resolveDepth` in `lib/cli-args.mjs` | exact | move `parseCli` to `lib/cli-args.mjs` (Decision 8); both CLIs import it |
| AI-leg status enum | `ROW_STATUS` in `lib/json-output.mjs` | exact pattern | add `AI_LEG_STATUS` beside it |

## Tasks

### Phase 0 — sync with upstream
**Executor**: session model, medium effort · wave 1

**Files**:
- Modify: `.claude/skills/stencil-compliance/SKILL.md`
- Modify: `.claude/plans/2026-09-22-audit-depths-sentinel-fixes.md`
- Read only: `package.json`

- [x] `git merge upstream/main` (the repo's convention for this, e.g. `a06df23`); the only file
  changed on both sides is `.claude/skills/stencil-compliance/SKILL.md`, and the merge-tree probe
  is clean. Verify: `yarn test:scripts` and `yarn lint` pass on the merge commit.
- [x] Re-baseline `quick` on `mud-button` on the merged tree (n=5 median, the acceptance bar's
  instrument); record it under `#### Phase 0 results` in a `derived` fence with the command.

#### Phase 0 results (2026-09-22, Node 24.19.0, merge commit 222165c)

- Merge of `upstream/main` (d2da933): clean; `yarn test:scripts` 1204/1204, `yarn lint` exit 0.
- `quick` baseline, one warm-up run discarded, then n=5:

```derived
command: for i in 1 2 3 4 5; do s=$(node -e 'console.log(Date.now())'); node scripts/audit/verdict.mjs mud-button --depth quick >/dev/null 2>&1; e=$?; t=$(node -e 'console.log(Date.now())'); echo "$((t-s)) exit=$e"; done
output: 2160 2147 2207 2183 2145 (ms), all exit=0
median: 2160 ms → bar = 2160 × 1.5 = 3240 ms
```

### Phase 1 — verdict core
**Executor**: sonnet, high effort · wave 2

**Files**:
- Modify: `scripts/audit/verdict.mjs`
- Modify: `scripts/audit/run-all.mjs`
- Create: `scripts/audit/lib/leg-input.mjs`
- Modify: `scripts/audit/lib/cli-args.mjs`
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
- [ ] S6 `finding()` accepts and emits `noTarget`; the verdict maps `noTarget: true` →
  INCOMPLETE (Decision 5); such findings never also appear under R4's warnings. Verify:
  acceptance S6 (builder and verdict halves).
- [ ] S7 one single-line helper applied to every interpolation in `renderFixBrief`. Verify:
  acceptance S7.
- [ ] S8 `--run-dir` shape rooted at `--audit-dir`. Verify: acceptance S8.
- [ ] S9 flags validated before spawning (Decision 8). Verify: acceptance S9.
- [ ] S13 envelope doc says 1.2.0 and what 1.1.0 / 1.2.0 each added in prose that does not
  repeat the `"schemaVersion": "1.1.0"` example. Verify: acceptance S13.
- [ ] R2 per Decision 7 (`lib/leg-input.mjs` with the leg→prompt table, re-hash in
  `readRunInputs`); a mismatch leaves the row unclosed with cause "source changed since run
  <run> — start a fresh run", and `awaitingLegs` is false.
- [ ] R4 `verdict.json` carries a `warnings` list; the brief renders "Warnings (non-blocking)"
  with row and verify command; state unchanged.
- [ ] R7 `AI_LEG_STATUS` frozen enum used at every site.
- [x] `runDir` in `audit/_run/summary.json`, never in `verdict.json` (Decision 10).
- [ ] Version bumps per § Global constraints (`SCHEMA_VERSION` for `noTarget`,
  `VERDICT_SCHEMA_VERSION` for `awaitingLegs` / `warnings`).

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
- [ ] S6 the ten sites carry `noTarget: true` (Decision 5). Verify: acceptance S6 (script
  half).
- [ ] S10 crash vs missing-prereq. Verify: acceptance S10.
- [ ] S11 per Decision 6; confirm `--coverage.reportOnFailure` and the JSON reporter options in
  the installed Vitest (cite file:line) before relying on them. Verify: acceptance S11.
- [ ] S12 extract `countRenderedChildren`, `judgeBx4Opened`, `declaresPopup`, `judgeBx7`; call a
  boolean-parameter open method with `true`. Verify: acceptance S12.
- [ ] R3 locks per Decision 3; tests: two concurrent fresh runs → the second is refused and the
  first's summary survives; a stale lock (dead pid, or matching pid with a different start time)
  is taken over; `--run-dir` recompute takes and releases the audit-dir lock and never the
  worktree lock; a forged or stale `AUDIT_LOCK_TOKEN` is not honoured; the CLI tests over temp
  audit dirs leave `<repoRoot>/audit/_run/` untouched.
- [ ] R5 support: `runFresh` removes a stale `audit/_run/envelope.json` beside `summary.json`,
  inside the lock (Decision 3).
- [ ] R6 extract 09's BX2/BX3 status assembly into a pure function with tests; add the
  `figmaDir` + absent + waiver `selectScripts` case.
- [ ] R9 the start time is written where `.audit-storybook.json` is written
  (`storybook-helpers.mjs`, via `ps -o lstart= -p`); `seeded-defects` signals only when pid and
  start time match; a record without a start time (legacy) is signalled and the fact logged.
- [ ] R10 per Decision 4; record the comparison and its citation under `#### Phase 2 results`.

#### Phase 2 results (2026-09-22, Node 24.19.0)

- S11 Vitest option citations (confirmed in the installed `node_modules/vitest` before relying
  on them, per the task): `coverage.reportOnFailure` —
  `node_modules/vitest/dist/chunks/reporters.d.DtoKVV2s.d.ts:799` (`reportOnFailure?: boolean`,
  inside the coverage config type); `--reporter` and `--outputFile` — both listed by
  `node_modules/.bin/vitest --help` (`--reporter <name> ... json ...`,
  `--outputFile <filename/-s>`). One vitest run per `runAudit` call, JSON reporter output at
  `<auditDir>/_run/vitest-results.json` (`run-all.mjs` `VITEST_RESULTS_REL`), deleted before
  spawning (`runPrerequisites`'s `coverage` branch). `evaluateCoverageResults` (pure, exported)
  decides the prerequisite's `ok`: parsed AND (exit 0 OR every failed spec's component is in the
  selection); a crash with no parseable JSON is never `ok`. `06-test-coverage.mjs` reads the same
  file (`--vitest-results`, default `audit/_run/vitest-results.json`) and adds
  `COVERAGE-TESTS-FAILED` (error) for the failing component only, via the pure
  `failedSpecsForComponent`.
- R10 per Decision 4: A4's `RESERVED_PUBLIC_MEMBERS` compared against
  `@stencil/eslint-plugin`'s `reserved-member-names` rule
  (`node_modules/@stencil/eslint-plugin/dist/index.js:873-950`; enforced at `error` in
  `eslint.config.mjs:64`). Neither set is a subset of the other — 44 names A4 catches that
  eslint's jsdom-based walk does not (e.g. `onfocusout`, `requestfullscreen`,
  `scrollintoview`), 80 names eslint catches that A4 does not (its `GLOBAL_ATTRIBUTES` list —
  `class`, `id`, `style`, `slot`, `part`, every `aria-*`); the eslint rule also fires only on
  `@Prop`/`@Method` (`:873`), never `@Event`, which A4 also checks. **A4 is kept, not deleted**;
  P11 stays mapped to A4, not remapped to eslint. Full citation and the counts:
  `scripts/audit/17-adapter-contract.mjs`'s header comment above `RESERVED_PUBLIC_MEMBERS`;
  re-derivable via the test `17-adapter-contract.spec.mjs` § "neither A4's set nor eslint's
  reserved-member-names set is a subset of the other".
- Additional `noTarget` emit site found beyond Decision 5's ten, NOT added per the brief's "report
  rather than silently add" instruction: `15-style-parity.mjs:218` `STYLE-NO-MANIFEST` (a warning,
  "nothing to verify") — same shape as the ten sites, but unreached through `run-all.mjs`'s normal
  selection because `15` is in `FIGMA_IDS` and is excused via `excuseFor` before it would ever run
  with no manifest; only a standalone/manual invocation of `15-style-parity.mjs` can reach it.
  Left to Phase 4 / the owner to decide whether it is worth a second review round.
- `--depth standard --changed` with two components, timed once (S11 changes this path; no
  threshold, a measurement): NOT TAKEN this session — `node -e "import('./scripts/audit/lib/
  changed-components.mjs').then(m=>console.log(m.listChangedComponents()))"` → `[]` on this
  branch (no `src/` diff against `main`, and `src/`/`tokens/`/`react/` are out of this phase's
  scope to seed one). The mechanism this measurement would exercise — one vitest startup
  regardless of selected-component count — is covered instead by `run-all.spec.mjs`'s "builds
  only what standard needs, in order" test (asserts exactly one `yarn vitest run …` in
  `p.commands`) and by the S11 `evaluateCoverageResults` tests above. Left for a session with a
  real multi-component `--changed` diff, or Phase 4, to record the wall-clock number.
- Regression floor (this phase's slice): `node --test "scripts/__tests__/**/*.spec.mjs"` —
  1324/1324 pass. `node node_modules/eslint/bin/eslint.js <files this phase touched>` — 0 new
  errors (1 pre-existing, `12-console-errors.mjs:29` `DEFAULT_BASE_URL` unused, dated 2026-05-17,
  before this plan). `node node_modules/prettier/bin/prettier.cjs --check <files this phase
  touched>` — clean.

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

- [ ] S4 deep callers: exit 3 + `awaitingLegs` → dispatch legs → `--run-dir <runDir>` (summary) → stop on
  non-zero; exit 3 without it → stop; remove "re-run the gate above"; `callers.spec.mjs`'s
  header records Decision 10's carve-out. Verify: acceptance S4 (callers half).
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
- [ ] Write the eleven `- R<n>: fixed|deferred|dropped — <test or reason>` lines under
  `#### Phase 4 results` (Phases 1–3 own the work; this controller records it).
- [ ] Grade: `scope-check.mjs` per phase, `/code-review`, then fresh-eyes verify against this plan.
- [ ] Close with the completion report. The outward steps are NOT this phase's: the launching
  session pushes, runs `dan-sentinel` round 2 over `e63c311..HEAD` and, on APPROVE or
  APPROVE-WITH-NITS, runs `gh pr ready 115 --repo egov-moldova/design-system` (owner asked for
  this); REQUEST-CHANGES → fix, sentinel round 3 at most, then back to the owner.

#### Phase 4 results (2026-09-22, Node 24.19.0, Phases 1–3 at 3abe94b, 864dfd2, 5e83c61)

Regression floor:

- `node --test "scripts/__tests__/**/*.spec.mjs"`: 1324/1324 pass (1204 at Phase 0).
- `node node_modules/vitest/vitest.mjs run --project spec`: 48 files, 1987/1987 pass.
- Lint: `eslint "src/**/*.{ts,tsx}" --max-warnings 0` (the `lint.js` scope) exit 0;
  `prettier --check .` clean. `eslint scripts .claude` reports 26 errors, all in files no phase
  touched (fixtures and older scripts; the one in `12-console-errors.mjs:29` predates this plan).
- `node scripts/audit/seeded-defects.mjs`: 4/4 — only after the INCOMPLETE seed moved. S11 made
  a failing spec its component's own `COVERAGE-TESTS-FAILED` (a FAIL), so the old seed (a
  throwing spec) no longer reached INCOMPLETE (3/4). The seed is now a type error in the
  component, which fails the `dx:stencil:once` prerequisite; entry `I3`, `09` `missing-prereq`,
  verify flips 1 → 0.
- Byte-identity, two `--depth standard` runs on `mud-banner`: **`cmp` differs**, at one line —
  `runDir` (`audit/mud-banner/runs/<run>`, Decision 10). With `runDir` removed the two files are
  identical. Decision 10 and this bar conflicted; the owner chose to move `runDir` into
  `audit/_run/summary.json` (2026-09-22). Re-measured after the move: both runs exit 0,
  `PASS@standard · MERGE-READY`, `cmp` identical, no `runDir` in `verdict.json`; the summary
  carries `audit/mud-banner/runs/<run>`. Script specs 1335/1335.
- `quick` on `mud-button`, one warm-up discarded, n=5 (Phase 0 command): 2193 2164 2118 2149
  2165 ms, all exit 0; median 2164 ms ≤ 3240 ms.
- `--depth standard --changed` with two components: not measured — `listChangedComponents()`
  returns `[]` on this branch (no `src/` diff against `main`) and `src/` is out of scope.

R-rows:

- R1: fixed — `a11y-verifier.md` names `.audit-storybook.json`; the S14/R1 grep pair reads 4/3 and 0/0.
- R2: fixed — `verdict.spec.mjs` S4 stale-hash fixture; `lib/leg-input.mjs` re-hash in `readRunInputs`.
- R3: fixed — `run-all.spec.mjs` "R3 locks" and "R3 worktree lock", `verdict.spec.mjs` "R3: takeAuditLock".
- R4: fixed — `verdict.spec.mjs` "R4" and the fix-brief warnings case.
- R5: fixed — `pre-pr-check.md` runs the audit once; `verdict.spec.mjs` "R5" (stale envelope removed).
- R6: fixed — `09-a11y-tree.spec.mjs` `bx2StatusFor` / `bx3StatusFor`; `run-all.spec.mjs` waiver + `--figma-dir` case.
- R7: fixed — `AI_LEG_STATUS` in `lib/json-output.mjs`; `lib-json-output.spec.mjs` and `verdict.spec.mjs` "R7".
- R8: fixed — both AI-leg contracts write `ai-findings.json` through `cat <<'EOF' >`.
- R9: fixed — `seeded-defects.spec.mjs` `shouldSignalRecordedPid` cases; `startTime` in `.audit-storybook.json`.
- R10: fixed — A4 kept for the names eslint misses; `17-adapter-contract.spec.mjs` subset test.
- R11: fixed — `audit-component/SKILL.md` fix loop runs only `verdict.json`'s `verify` values.

Grade (6809fe4..9f6e749, then 5fb9328):

- Scope: every phase's changed paths are inside its **Files** list (no stray path).
- `/code-review medium`: 6 findings. Fixed in 9f6e749: `src/hidden/` specs unmapped by the
  coverage prerequisite, lock double-holder paths, standalone 06 reading a stale results file,
  zero selection + crashed repo row read as FAIL. Open: BX7 writes a string into a number-typed
  `value` (`mud-numeric-input`), latent while no story sets `name`.
- `fresh-eyes-verify`: FORTIFY (med), 2 above-bar. The stale-source cause printed a literal
  `<run>` — fixed in 5fb9328 (1333/1333). The byte-identity bar vs Decision 10's `runDir` —
  closed by moving `runDir` to the summary (owner's call).

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
- Decision 5's sites are still an enumeration (ten, found by two review rounds). A structural
  backstop — each script reports a `checked` count and a required row with zero checked items is
  INCOMPLETE — would catch the next one; deferred, one meta field per script.
- AI legs keep unrestricted Bash; the write target for `ai-findings.json` is bounded by prompt
  convention only. Pre-existing, out of this plan's scope (preflight leg 2, finding 2); a
  separate hardening issue.

## Self-refute log

| # | Question | Instance + fix, or no instance + what was scanned |
|---|---|---|
| 1 | Does a fix reuse the defect's own mechanism class? | S6's allowlist relies on each script naming its no-target code; a new script with a new code would be `ok` again — the same silent pass. Round 2 showed a code list is itself a naming convention (it already missed two codes); fix: Decision 5 moves the mechanism to a `noTarget` finding field set at each emit site, with a per-site assertion. R2 drops the leg-supplied hash from the trust path entirely (Decision 7): the recompute re-hashes the sources and compares with the opened row. S4's `awaitingLegs` is a field, but whether a caller obeys it stays prose — the parent plan's accepted limit, restated under Not verified. |
| 2 | Can a rule's letter be met with its intent violated? | S5: "detector failure → INCOMPLETE" is met vacuously if `listChangedComponents` keeps returning `[]` on a failed `git diff`. Fix: Phase 2 S5 task makes the detector return its status, and the test drives a failing git. S4: `awaitingLegs` must be false when any non-`ai-*` row is INCOMPLETE or an `ai-*` row is open on a stale hash — acceptance S4 now carries a positive fixture and those two negative ones (round 3 showed "true only when" alone passes a constant `false`). |
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
- 2026-09-22 critic 938c59a (round 3, the cap): FORTIFY, 11 findings, all folded. Above the bar:
  S4's bar passed a constant `false` (positive and mixed fixtures added); the R-row count read
  the logs (fixed line shape, written by the Phase 4 controller); `finding()` drops `noTarget`
  (builder task added, scripts graded on emitted findings); BX4's `open`-prop predicate was true
  by construction (rendered evidence only, not-opened → `noTarget`). Beyond, folded: the lock
  covers `runFresh` with an env-token hand-off, rooted at the repo; the leg→prompt table moves
  to `lib/leg-input.mjs`; `parseCli` moves to `lib/cli-args.mjs`; the coverage prerequisite's
  gate is stated and a no-JSON crash handled; stale-hash rows are not awaiting legs; Decision 10
  records the callers carve-out; two more no-target sites; S13's count loosened. The structural
  `checked`-count backstop is deferred (§ Not verified).
- 2026-09-22 critic 78d432c (round 4, past the cap by the owner's call, scoped to the round-3
  diff): FORTIFY, 8 findings, all folded. Above the bar: BX4's new predicate would block
  accordion-item / tooltip / breadcrumb-item forever (rendered-change predicate, `noTarget` only
  for declared popups, fixtures named); the S4 callers bar passed a bare run id S8 rejects
  (`runDir` in the verdict, full form asserted); a stale `vitest-results.json` could satisfy the
  prerequisite (deleted before vitest, bar case added); S13's literal failed a correct
  `noTarget` bump (doc-equals-constant spec, `noTarget` assigned to `SCHEMA_VERSION`); the R-row
  count accepted duplicates (distinct ids + shape). Beyond, folded: two lock scopes (worktree vs
  audit dir) so tests never touch the live lock; a nonce-validated `AUDIT_LOCK_TOKEN`; the reuse
  row for `parseCli`. Loop brake: rounds 3 and 4 found above-bar defects only in text earlier
  rounds wrote, so no further plan round — the owner decides whether to implement.
