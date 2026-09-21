# audit-component — depth levels, deterministic verdict, fix brief

**Reviewed:** preflight 3463699 · critic a82d255

## Goal

Make `audit-component` an end-to-end, reproducible production-readiness gate for one `mud-*`
component: three named depths, a verdict computed by a script rather than by the model, Figma as
the source of truth, consumer-adapter readiness (React now, Angular / Vue / Blazor / vanilla
later), and a failure report a fresh session can act on without re-running the audit to learn
what broke.

## Problem

Today a passing audit does not prove what it appears to prove. A crashed check reads as zero
errors. A component with no Figma evidence can still be called "Ready to merge". The verdict is
prose written by the model, so two runs can disagree. A failure report has to be re-derived
before anyone can fix it. The findings below are the evidence.

## Spec / issue link

Owner request, 2026-09-21 — issue #114.

## Findings (measured 2026-09-21 on `danzubco/tang` @ 3463699)

| # | Finding | Evidence |
|---|---|---|
| F1 | A crashed script does not count as a failure anywhere a reader looks first. `run-all` sets `ok:false`, but `summary.errors` stays 0 and `blockers` stays `[]`. The report template derives row status from `summary.errors` and has no rule for a row without a summary. | `node scripts/audit/run-all.mjs mud-button --no-browser --json` in a worktree without `node_modules`: 5 of 8 Wave A scripts exit with `ERR_MODULE_NOT_FOUND`; envelope `summary {errors:0}`, `blockers []`. Aggregation: `scripts/audit/run-all.mjs` `aggregate()`. |
| F2 | No environment preflight. Node 26.3 ran against `engines >=24 <25`, and the missing `typescript` / `postcss` packages surfaced as JSON-parse errors rather than as one line naming the cause. | same run |
| F3 | Wave B prerequisites are never produced. `06` needs `coverage/coverage-summary.json` and `08` needs `dist/mud`; the skill only runs `yarn tokens.build`, so both rows are missing by default. | `06`/`08` stderr in the same run; SKILL.md Wave 1 Bash block |
| F4 | Figma is not enforced as the source of truth. `11` and `15` are dropped silently when a component has no state manifest, and the verdict rules still allow "Ready to merge". Only 9 of 44 components have a manifest. | `selectScripts()` in `run-all.mjs`; `ls src/components/*/test/*.figma.json` → 9, `ls -d src/components/mud-*` → 44; report-template.md verdict rules 1–4 |
| F5 | Nothing checks consumer adapters. `14` extracts `bubbles`/`composed` and prop types, but no rule reads them. `.storybook/custom-elements.json` (the manifest every adapter generator consumes) is not checked against the source contract. | `rg composed scripts/audit` → only `14-component-contract.mjs:368-370` |
| F6 | The mandatory browser checks (BX1–BX7) are deterministic assertions run by the model through MCP one call at a time. Playwright MCP is shared across parallel sessions, so the runs are not reproducible. | layer-2-browser-checklists.md §BX; project memory "Playwright MCP is shared" |
| F7 | The verdict is written by the model from a template. There are four verdict strings, no depth, and no "needs a decision" state, so an open design question is either invented or dropped. | report-template.md § Verdict rules |
| F8 | The failure output is a prose list (`<code> in <file:line> — <message> — fix: <hint>`). It carries no expected value with a source, no command that proves the fix, and no owner, so a new session has to run the whole audit again to start work. | report-template.md § Critical Issues |
| F9 | The flag set mixes depth (`--fast`, `--deep`, `--e2e`) and environment (`--ci`). `--e2e` refers to a Vitest project that does not exist. | SKILL.md § Inputs; wave-2 §2.10.2 |
| F10 | Duplicated procedure. The manual Wave 1–3 fallback restates what the scripts do, which gives the procedure two sources of truth that drift apart. | SKILL.md § Wave 1 / Wave 3 vs `scripts/audit/*` |

## Options — depth naming

| Option | Flags | Cost |
|---|---|---|
| A (recommended) | `--depth quick \| standard \| deep`, default `standard`; `--fast` kept as a deprecated alias of `quick` for `pre-pr-check` | One flag, one ordered axis. Each depth sets a ceiling on the verdict it can issue. |
| B | `--level low \| medium \| high` | Matches the owner's wording, but "medium" says nothing about what was proven. |
| C | Purpose names: `--for commit \| pr \| release` | Very clear, but it ties depth to the workflow, and a new purpose would need a new name. |

Depth contents (cumulative):

| Depth | Runs | Highest `level` a `PASS` can carry (Design §1) | Budget |
|---|---|---|---|
| `quick` | Env preflight, lint, Wave A scripts (01 02 03 04 05 07 14 16 + the source part of new 17), no build, no browser, no AI judgment except rendering | `CLEAN-STATIC` | < 5 s (estimate; Phase 0 sets the tolerance) |
| `standard` | quick + prerequisites built automatically (tokens, the component's own coverage, a dev build, Storybook) + Wave B (incl. 17's CEM part) + Wave C + the scripted interaction checks (BX1–BX7) + Figma parity (11, 15) + AI judgment for archetype checks (CX), advisory only (Decision §5) | `MERGE-READY` | ~1–2 min scripts + one AI synthesis pass |
| `deep` | standard + `stencil-compliance` manual rows + full WCAG pass + every Figma state × both themes + reduced-motion / forced-colors / 320 px / RTL as mandatory rather than discretionary + adapter smoke build (React wrapper typecheck, vanilla demo) + a security leg + E2E when present | `PRODUCTION-READY` | minutes; AI legs in parallel |

`--ci` stays orthogonal. It is an environment, not a depth: no browser AI legs, and the verdict
is capped at whatever the scripts alone can prove.

## Decision

Owner answers, 2026-09-21:

1. Depth naming: **Option A** (`--depth quick | standard | deep`).
2. Missing manifest at `standard`+: **`NEEDS-DECISION`**, plus a way to run everything that
   does not need Figma (see "Figma waiver" below).
3. Adapter scope: **generic rules + React**; Angular / Vue / Blazor are added when their first
   consumer appears, each rule citing its docs.
4. Model pins in the dispatched legs: **kept**. Reproducibility outranks per-person setup; a
   teammate can override them locally and knowingly.
5. AI findings and the verdict state: **advisory at `quick` / `standard`**. The state there is
   computed from scripts only, so the same commit gives the same verdict every run and from
   every tool. At `deep`, AI legs are declared rows and may set `FAIL` / `NEEDS-DECISION`, with
   each leg's input hash recorded. Cost accepted: `MERGE-READY` rests on scripts alone, and an
   AI-found blocker at `standard` is reported, not enforced.

### Figma waiver

There are two cases. They get two mechanisms because one is a per-run choice and the other is
a fact about the component.

| Case | Mechanism | Effect on the run | Effect on the verdict |
|---|---|---|---|
| "Audit everything else now, Figma later" (design exists but is not the concern of this run) | `--no-figma` flag, per run | Skips 11, 15, `figma-refs --check`, and the Figma-backed CX rows; every other check still runs at the chosen depth | `PASS@<depth> · figma: waived (flag)`. Never `PRODUCTION-READY`: `deep --no-figma` is capped at `MERGE-READY`. The fix brief lists the Figma checks that did not run, so the gap stays visible. |
| The component has no design (AGENTS.md Figma-First exception: utility / internal) | Declared once in the existing manifest, additive: `"figma": { "design": "none", "reason": "…", "decidedBy": "…" }` | Same checks skipped, with no flag needed | Full ceiling (`PRODUCTION-READY` at `deep`). The reason and the person who decided are printed in the verdict, so the waiver is a recorded decision rather than a silence. |

With neither: at `standard`+, a missing manifest → `NEEDS-DECISION`, and the fix brief carries
the question (Figma URL + node id, or declare `design: none`). With `quick`, Figma checks are
never run, so no waiver is needed.

The manifest change is a persisted format and costs little now: one optional shape,
`{ figma: { design: "none", reason, decidedBy } }` with no `fileKey` and no `states`. Today's
`validateManifest` rejects it (it requires `figma.fileKey` and a non-empty `states`), so Phase 2
adds that one branch and teaches `selectScripts` to skip 11 / 15 for it. It keeps open the
known next step of per-state waivers, which `figma.skip` already covers per variant.

**Who may set a waiver or a correction.** A waiver lifts the verdict ceiling, so it must be
reviewed like code, and the audit must not be able to grant one to itself:

- The audit is read-only. No script and no AI leg writes `*.figma.json` (the skill already
  "never auto-fixes"). A fix brief may *propose* a waiver or an override, as text.
- Every Figma input — manifest presence, `figma.design`, `expect` values, every `override` —
  is read from the committed manifest (`git show HEAD:<path>`), never from the working tree
  (Design §8). An uncommitted change is reported as `pending manifest change — not honoured`
  and changes nothing. A committed one reaches review as a visible manifest diff in the PR.
- Every honoured waiver or override is printed in the verdict with its commit hash, so a
  reviewer sees exactly which ceiling it raised.

### Figma corrections

The request says Figma is the truth "unless told otherwise or correction instructions are
given". A correction is a single value that the owner decides differs from the node, for
example a Figma typo. It is recorded where the value lives: an `expect` entry may carry
`"override": { "value": …, "reason": "…", "decidedBy": "…" }` (additive). `15-style-parity`
compares against `override.value`. The verdict lists every active override with its reason
and who decided it, so a correction is never a silent edit to a value that claims to be
copied from Figma. A correction given only in chat is not applied: the audit reports the
Figma value, and the fix brief shows the override entry needed to record it.

## Design

1. **Verdict is computed by a script** (`scripts/audit/verdict.mjs`). It reads the L1 envelope,
   the interaction-script results, and — at `deep` only — the AI judgment findings (same finding
   schema). One enum, defined once in the Phase 1 schema:
   - `state`, first match wins: `INCOMPLETE` → `FAIL` (any blocking finding) →
     `NEEDS-DECISION` (open design question, or no Figma manifest at `standard` or deeper) →
     `PASS`.
   - `INCOMPLETE` means any row crashed, is missing a prerequisite, or any check the depth
     REQUIRES did not run. Each depth declares its required check ids in one table in
     `verdict.mjs`; a required id is excused only by `--no-figma` (Figma ids) or a committed
     `design: "none"` (Figma ids). `--skip` / `--only` stay for local iteration, but a run that
     used them to drop a required id is `INCOMPLETE`, never a PASS.
   - `level` exists only on `PASS` and is computed, never chosen: `CLEAN-STATIC` (quick),
     `MERGE-READY` (standard, or deep with `--no-figma`, or deep under `--ci`),
     `PRODUCTION-READY` (deep with Figma evidence or a committed `design: "none"`). The strings
     `CLEAN-STATIC` / `MERGE-READY` / `PRODUCTION-READY` used elsewhere in this plan are values
     of `level`, nothing else.
   - **AI findings and the state (Decision §5).** At `quick` and `standard` the state is
     computed from script rows only; AI findings are rendered in the fix brief under
     "Advisory" and cannot change `state`. At `deep` every required AI leg is a declared row
     that the orchestrator opens when it dispatches the leg. The leg's `ai-findings.json` closes
     it only when it names the leg and lists the CX/DX ids it judged; an unclosed row is
     `missing-prereq`, so `INCOMPLETE`. At `deep` AI findings may set `FAIL` or
     `NEEDS-DECISION`, never clear a script `FAIL`, and the verdict records, for each leg, the
     SHA-256 of its input (the component's source files plus the leg prompt).
   - AI legs write only `audit/<component>/<run>/ai-findings.json`. Only `verdict.mjs` writes
     `verdict.json`, and it rebuilds the file from its inputs on every run, so a hand-edited or
     AI-written `verdict.json` never survives the next run. Both files carry `schemaVersion`.
   - `--changed` / `--all`: one `verdict.json` per component, plus
     `audit/_run/<run>/summary.json` whose `state` is the worst component state under the same
     precedence.
   - **Exit codes carry the state.** `verdict.mjs` (and `yarn audit:component`) exit 0 only on
     `PASS`, with a distinct non-zero code per other state, mapped in `lib/exit-codes.mjs`. On a
     multi-component run the worst state decides the exit code. Callers branch on this exit
     status, never on their own reading of the verdict.
   - `verdict.json` excludes every value that varies between identical runs: timestamps,
     `durationMs`, `meta.totalDurationMs`, and raw stderr text (it keeps the error class only).
2. **Fix brief** (`audit/<component>/<timestamp>/fix-brief.md` + `verdict.json`, git-ignored).
   One block per finding, in this shape:
   `ID · severity · check · location file:line · expected (value + source: Figma node id / rule file:line) · actual · verify: <exact command> · owner: <command/agent>`.
   Open questions go in their own section. Each one cites the Figma node, states what is
   ambiguous, and gives the options. The audit never picks one. The brief is self-contained:
   pasting it into a new session is enough to start fixing.
3. **Fix loop, no re-check mode.** Each finding's `verify:` command is the per-fix check. When
   they all pass, the fixer runs the full audit again at the same depth, and only that run can
   write a `PASS`. There is no `--recheck` mode: a partial re-run that rewrote the verdict would
   be a second writer able to print `PASS` over stale rows.
4. **Adapter contract** (`17-adapter-contract.mjs`), split by what each part reads:
   - Wave A, source only, `quick`+: it calls 14's extractor in-process (no dependency on 14's
     output file). Rules: event names carry the `mud` prefix and do not collide with native
     DOM events; event `detail` is structured-clone / JSON-serialisable (no functions,
     elements, or class instances); non-primitive props are property-only (not `reflect`) and
     documented as such; prop names do not shadow `HTMLElement` members; `@Method` is async.
   - Wave B, `standard`+, after the build prerequisite: CEM parity. The CEM entry
     (`.storybook/custom-elements.json`, a git-ignored build output) exists, is newer than every
     file under the component's source directory, and matches the source contract (props,
     events, slots, parts, CSS properties). A stale or missing CEM is `missing-prereq`.
   - Every framework-specific rule is confirmed against current docs in Phase 0 before it is
     encoded.
5. **Interaction checks move to a script** (`19-interaction.mjs`, Wave C, a local Playwright
   instance that is not the shared MCP browser). It reuses what exists instead of duplicating
   it: `12-console-errors` stays the console check (BX6), and the Tab-walk and focus-ring
   assertions (BX2, BX3) extend `09-a11y-tree`'s interactive census. `19` covers BX1, BX4, BX5
   and BX7 as fixed assertions. The AI keeps CX (archetype judgment), deep-depth DX, and
   cross-check synthesis only.
6. **The skill gets thinner**. The manual Wave 1–3 fallback is removed (F10), after every check
   it carries is mapped to a new home (Phase 4). If the orchestrator cannot run, the verdict is
   `INCOMPLETE` with the preflight reason. The procedure is
   `yarn audit:component <name> --depth <d>` (a new `package.json` script), so any tool (Codex,
   Cursor, CI) gets the same state up to `standard`. At `deep`, a caller that cannot dispatch
   the AI legs gets `INCOMPLETE` naming the unclosed rows. The skill adds only the AI legs and
   the synthesis.
7. **Model / effort**. The skill does not pin a model: it runs in the caller's session.
   The AI legs it dispatches are existing agents that already pin a model
   (`a11y-verifier`, `pixel-perfect-verifier`: sonnet; `audit-production`: opus). The
   recommended tier per leg goes in a table in the skill. The pins stay (Decision §4). The
   audit does not claim to detect a local override: the model a leg actually ran on has no
   source outside the leg's own report.
8. **One source for every Figma input.** The orchestrator resolves each manifest once from
   `git show HEAD:<path>` into a temp file and passes it to 11, 15 and `figma-refs` through
   their existing `--manifest` option. Manifest presence, `design`, `expect` values, `override`
   and `skip` are therefore all read from `HEAD`. A manifest that differs from `HEAD` is
   reported as `pending manifest change — not honoured`; one that exists only in the working
   tree counts as absent, so `NEEDS-DECISION` with the note "manifest present, uncommitted".

## Acceptance bar

Zero-tolerance (graded by `yarn test:scripts` — `node --test "scripts/__tests__/**/*.spec.mjs"`, the existing home of every audit script test — one fixture test per line):

- `run-all.spec.mjs` + `verdict.spec.mjs`: a check that crashed, is missing a prerequisite, or
  is a required id for the depth that did not run (including one dropped by `--skip` / `--only`)
  yields `INCOMPLETE`. It never yields any other state.
- Two runs over the same inputs produce byte-identical `verdict.json`. Graded by
  `verdict.spec.mjs` over fixtures whose envelopes differ only in the excluded fields
  (timestamps, durations, stderr text).
- At `quick` and `standard`, an AI finding never changes `state`: a fixture with a blocking AI
  finding and clean script rows yields `PASS`, and the finding appears under "Advisory" in the
  fix brief. At `deep`, an AI finding cannot turn a script `FAIL` into anything else, and an
  unclosed AI-leg row yields `INCOMPLETE`. Graded by `verdict.spec.mjs`.
- `deep --no-figma` yields exactly `PASS` with `level: MERGE-READY`, never `PRODUCTION-READY`.
  Graded by `verdict.spec.mjs`.
- A Figma input present only in the working tree changes nothing: `run-all.spec.mjs` fixtures
  with (a) an uncommitted `override`, (b) an edited `expect` value, (c) an uncommitted manifest
  each produce the same row 15 / verdict as `HEAD` alone, plus the "not honoured" note.
- A `verdict.json` that claims PASS but was written by hand is replaced on the next
  `verdict.mjs` run with the verdict its inputs produce. Graded by `verdict.spec.mjs`.
- Every non-PASS state maps to its own non-zero exit code, and the worst component decides on a
  multi-component run. Graded by `callers.spec.mjs`, which EXECUTES `verdict.mjs` over a fixture
  per state and asserts the exit code, then asserts that every caller file listed in Phase 5
  invokes `yarn audit:component` (or `verdict.mjs`) and restates no verdict criteria of its own.
- Every non-PASS entry in `fix-brief.md` has location, expected + source, actual, and a
  `verify:` command. If any field is missing, the renderer test fails. Graded by `fix-brief.spec.mjs`.
- The command `pre-pr-check` actually runs keeps working through every phase:
  `node scripts/audit/run-all.mjs --changed --no-browser --json` exits 0 or 1 (never 2), and its
  envelope still carries `ok`, `blockers` and `results[].error` (the fields
  `.claude/commands/pre-pr-check.md` reads). Graded by a `run-all.spec.mjs` case. After Phase 2,
  a separate case asserts that `--fast` resolves to `--depth quick`.

Tolerances. Every number is set by a Phase 0 measurement, and until then is `TBD`. No number
here was typed from an estimate:

- Seeded defects (Phase 6): 3 of 3 surface in the fix brief, and each `verify:` command exits
  non-zero before the fix and zero after it. Graded by `node scripts/audit/seeded-defects.mjs`
  (written in Phase 6).
- `quick` wall-clock on `mud-button`, warm cache: `TBD` = Phase 0 Wave A time × 1.5, where the
  Phase 0 time is `meta.totalDurationMs` of `node scripts/audit/run-all.mjs mud-button
  --no-browser --only 01,02,03,04,05,07,14,16 --json`, median of 3 runs. Graded by
  `node scripts/audit/run-all.mjs mud-button --depth quick --json` → `meta.totalDurationMs`.
- Prompt text the skill loads: ≤ the Phase 0 baseline. Graded by
  `node scripts/audit/measure-prompt-cost.mjs` (a static size count of the `.claude/` prompt
  files; it measures prompt size, not billed tokens).
- Billed AI tokens per `deep` audit on `mud-button`: reported in Phase 6 against the Phase 0
  baseline, as the sum of the dispatched legs' reported token usage, N=1 per side. Reported, not
  gated: one run per side cannot bound variance.
- Two real runs agree: `yarn audit:component mud-button --depth standard` run twice on the same
  commit produce byte-identical `verdict.json`. Graded in Phase 6.

## Global constraints

- Implement on `danzubco/make-the-component-audit-deterministic-and-depth` (branched off
  `main`); never commit to `main` directly.
- Envelope schema changes are additive (`schemaVersion` minor bump); existing consumers
  (`audit-production`, `pre-pr-check`, `a11y-verifier`, `stencil-compliance`,
  `regression-check.mjs`) keep working until migrated in Phase 5.
- No new runtime dependencies; Playwright, pixelmatch and the TypeScript compiler API are
  already pinned.
- Stencil `~4.45.0` is the rule baseline; re-read `package.json` before encoding any rule.

## reuse-candidates: verdict

Homes swept: `scripts/audit/`, `scripts/audit/lib/`, `scripts/__tests__/audit/`, `scripts/`
(`rg -l "engines|node_modules|custom-elements.json|verdict" scripts`), `package.json` scripts.

| New unit | Nearest existing | Match tier | Verdict |
|---|---|---|---|
| `scripts/audit/verdict.mjs` | `run-all.mjs` `aggregate()` | partial (aggregates, decides nothing) | create; it consumes `aggregate()`'s output, never re-aggregates |
| `scripts/audit/lib/fix-brief.mjs` | report-template.md (prose) | none in code | create |
| `scripts/audit/lib/env-preflight.mjs` | `scripts/check-lane-resolution.mjs` (resolves `node_modules` for one lane) | name-only | create; different question (is the install usable), no shared code |
| `scripts/audit/17-adapter-contract.mjs` | `14-component-contract.mjs` (extracts the contract) | partial | create; reads 14's output — extending 14 would mix extraction with rules |
| `scripts/audit/19-interaction.mjs` | `lib/browser-context.mjs`, `lib/state-page.mjs` | building blocks | create on top of both; no browser plumbing re-written |
| `scripts/audit/seeded-defects.mjs` | `__tests__/audit/pixel-perfect.mutations.mjs` | pattern | create; follow its mutation shape |
| test files | `scripts/__tests__/audit/*.spec.mjs` (runner `yarn test:scripts`) | exact home | extend `run-all.spec.mjs` and `lib-json-output.spec.mjs`; new files only for new units |

## Tasks

### Phase 0 — ground truth
**Executor**: session model, medium effort · wave 1

**Files**:
- Modify: `.claude/plans/2026-09-21-audit-component-depths.md`
- Read only: `scripts/audit/run-all.mjs`
- Read only: `scripts/audit/measure-prompt-cost.mjs`

- [ ] On a healthy install (`yarn install`, Node 24), re-run
  `node scripts/audit/run-all.mjs mud-button --no-browser --json`. This confirms F1 holds
  outside a broken worktree: stop and re-plan Phase 1 if every script ran clean and the
  aggregation cannot be made to show the defect.
- [ ] Baselines, each with its own instrument, recorded in the Acceptance bar:
  - Wave A wall-clock on `mud-button`: the command named in Tolerances, median of 3.
  - Prompt size: `node scripts/audit/measure-prompt-cost.mjs`.
  - Billed tokens: one current `/audit-component mud-button --deep` run, summing the dispatched
    legs' reported token usage.
  Verify: the three numbers replace their `TBD`s.
- [ ] Interaction spike: BX2 + BX3 on one interactive component (`mud-button`) through a local
  Playwright script, 5 runs, identical results. If they differ, re-scope `19-interaction` before
  Phase 1 fixes the schema around it. Verify: the 5 result files compared with `cmp`.
- [ ] Confirm the generic adapter rules and the React 19 rules against current docs
  (Decision §3: Angular / Vue / Blazor wait for their first consumer). Rules without a doc
  citation are not encoded. Verify: a citation per rule in the `17-adapter-contract.mjs` header.

### Phase 1 — orchestrator honesty (F1 F2 F3)
**Executor**: sonnet, high effort · wave 2

**Files**:
- Modify: `scripts/audit/lib/json-output.mjs`
- Modify: `scripts/audit/run-all.mjs`
- Create: `scripts/audit/lib/env-preflight.mjs`
- Modify: `scripts/__tests__/audit/lib-json-output.spec.mjs`
- Modify: `scripts/__tests__/audit/run-all.spec.mjs`
- Create: `scripts/__tests__/audit/__fixtures__/envelopes/`
- Modify: `scripts/audit/regression-check.mjs`
- Create: `scripts/__tests__/audit/regression-check.spec.mjs`
- Modify: `package.json`

- [ ] Define the finding, row-status and verdict schema once, in `lib/json-output.mjs`: the
  `state` enum, the `level` enum, the row statuses (`ok`, `crashed`, `missing-prereq`,
  `skipped`), the AI-leg row, and `schemaVersion` for `verdict.json` and `ai-findings.json`.
  Every producer (01–17, 19, the AI legs) and the only consumer (`verdict.mjs`) build against
  it. Phase 2 and Phase 3 both depend on this schema, so it lands first. Verify: a schema unit
  test over one fixture per producer kind.
- [ ] `regression-check.mjs` treats a row that is newly `crashed` or `missing-prereq` as a
  regression, even when its baseline had zero findings. Verify: a case in the new
  `regression-check.spec.mjs`.
- [ ] Env preflight: `node_modules`, Node version vs `engines`, resolvable deps → one-line
  `INCOMPLETE: <cause>`. Verify: `scripts/__tests__/audit/run-all.spec.mjs` case with a missing dep.
- [ ] Crashed / prerequisite-missing rows → status `crashed` / `missing-prereq`, listed in
  `blockers`, counted in `summary.incomplete`. Verify: `aggregate()` unit test.
- [ ] Automatic prerequisites at `standard`+ (tokens, the component's own coverage, a dev build,
  and Storybook on :6007 — reused when `storybook-helpers.mjs` `isStorybookReachable` says so,
  started and awaited otherwise), wireit-cached where wireit owns the step.
  Verify: fresh worktree run produces 06, 08 and Wave C rows.

### Phase 2 — depth + verdict + fix brief (F7 F8 F9)
**Executor**: opus, high effort · wave 3 (after Phase 1's schema)

**Files**:
- Modify: `scripts/audit/run-all.mjs`
- Modify: `scripts/audit/lib/cli-args.mjs`
- Modify: `scripts/audit/lib/figma-manifest.mjs`
- Modify: `scripts/audit/15-style-parity.mjs`
- Create: `scripts/audit/verdict.mjs`
- Create: `scripts/audit/lib/fix-brief.mjs`
- Modify: `scripts/audit/lib/exit-codes.mjs`
- Modify: `scripts/audit/11-pixel-diff-states.mjs`
- Modify: `scripts/audit/figma-refs.mjs`
- Create: `scripts/__tests__/audit/callers.spec.mjs`
- Create: `scripts/__tests__/audit/verdict.spec.mjs`
- Create: `scripts/__tests__/audit/fix-brief.spec.mjs`
- Modify: `scripts/__tests__/audit/15-style-parity.spec.mjs`
- Modify: `scripts/__tests__/audit/figma-manifest.spec.mjs`
- Create: `scripts/__tests__/audit/__fixtures__/verdict/`
- Modify: `.gitignore`
- Modify: `package.json`

- [ ] `--depth` in `run-all.mjs` (+ `--fast` alias of `quick`, `--e2e` folded into `deep`), plus
  the per-depth required-check table (`quick` includes 03 git-hygiene with the other Wave A
  scripts). Add `"audit:component"` to `package.json` scripts. Verify: `run-all.spec.mjs` cases
  for the alias and for a `--skip` that drops a required id.
- [ ] `verdict.mjs` + `fix-brief.md` renderer (with an "Advisory" section for AI findings at
  `quick` / `standard`) + the state → exit-code map in `lib/exit-codes.mjs` + the
  multi-component `summary.json`. Verify: fixture envelopes → golden verdicts, byte-identical
  across two runs; `callers.spec.mjs` exit-code cases.
- [ ] AI-leg rows at `deep`: opened by the orchestrator, closed by `ai-findings.json`, input
  hash recorded. Verify: fixtures for a closed row, an unclosed row (`INCOMPLETE`), and an
  empty-but-closed row (`PASS`).
- [ ] HEAD-resolved manifests (Design §8) for 11, 15 and `figma-refs`. Verify: the three
  working-tree fixtures from the Acceptance bar.
- [ ] Figma gate: no manifest at `HEAD` at `standard`+ → `NEEDS-DECISION` with the question
  pre-filled. Verify: fixture without manifest.
- [ ] `--no-figma` flag + `figma.design: "none"` manifest key. `validateManifest` accepts
  `{ figma: { design: "none", reason, decidedBy } }` with no `fileKey` and no `states`, and
  `selectScripts` treats it as "no Figma checks, reason recorded" instead of scheduling 11 / 15.
  Verify: three fixtures run through `selectScripts` and `verdict.mjs` — flag (`MERGE-READY`,
  gap listed), declared none (`PRODUCTION-READY` at `deep`, reason printed), neither
  (`NEEDS-DECISION`); plus a `figma-manifest.spec.mjs` case for the new shape.
- [ ] `expect[].override` (Figma corrections), applied by `15-style-parity` from the
  HEAD-resolved manifest and listed in the verdict with its commit. Verify: a fixture where a
  committed override passes and is printed, and one where the same override is uncommitted and
  row 15 still reports the Figma value.
- [ ] `deep` contents, each item mapped to what implements it (a script id, an existing agent
  or skill leg, or deferred with a reason): `stencil-compliance` manual rows, full WCAG,
  every Figma state × both themes, reduced-motion / forced-colors / 320 px / RTL, adapter
  smoke build (React wrapper typecheck, vanilla demo), security leg, E2E when present. Verify:
  `--depth deep` on `mud-button` emits one row per mapped item.

### Phase 3 — new scripts (F5 F6)
**Executor**: sonnet, high effort · wave 3 (parallel with Phase 2; both build against Phase 1's schema)

**Files**:
- Create: `scripts/audit/17-adapter-contract.mjs`
- Create: `scripts/audit/19-interaction.mjs`
- Create: `scripts/__tests__/audit/17-adapter-contract.spec.mjs`
- Create: `scripts/__tests__/audit/19-interaction.spec.mjs`
- Create: `scripts/__tests__/audit/__fixtures__/adapter-contract/`
- Create: `scripts/__tests__/audit/__fixtures__/interaction/`
- Modify: `scripts/audit/09-a11y-tree.mjs`
- Modify: `scripts/__tests__/audit/09-a11y-tree.spec.mjs`
- Read only: `scripts/audit/14-component-contract.mjs`
- Read only: `.storybook/custom-elements.json`

- [ ] `17-adapter-contract.mjs` in two parts (Design §4): source rules in Wave A calling 14's
  extractor in-process, CEM parity in Wave B with the freshness check. Fixtures: one pass, one
  per rule failure, one stale CEM (`missing-prereq`).
- [ ] BX2 + BX3 (Tab walk, focus ring) added to `09-a11y-tree`; `19-interaction.mjs` covers
  BX1, BX4, BX5, BX7; BX6 stays `12-console-errors`. Fixtures; run against 3 archetypes.

### Phase 4 — skill rewrite
**Executor**: opus, medium effort · wave 4

**Files**:
- Modify: `.claude/skills/audit-component/SKILL.md`
- Modify: `.claude/skills/audit-component/references/layer-2-browser-checklists.md`
- Modify: `.claude/skills/audit-component/references/report-template.md`
- Modify: `.claude/skills/audit-component/references/wave-2-static-analysis.md`
- Modify: `scripts/audit/README.md`

- [ ] Before deleting the manual fallback, a table in SKILL.md maps every check it and the
  WCAG quick-check / Security & Performance spot-check sections carry to its new home: a
  script id, a CX / DX row, a `deep` item, or "dropped: <reason>". Nothing leaves without a row.
- [ ] SKILL.md: depth table, AI-only steps, model/effort table, remove the manual fallback.
  The references shrink to CX/DX judgment and the report contract. Verify:
  `node --test scripts/__tests__/check-ai-docs.spec.mjs`.

### Phase 5 — callers
**Executor**: sonnet, medium effort · wave 4 (after Phase 2 freezes the flags and exit codes)

**Files**:
- Modify: `.claude/commands/pre-pr-check.md`
- Modify: `.claude/commands/audit-component.md`
- Modify: `.claude/commands/README.md`
- Modify: `.claude/commands/migrate-component.md`
- Modify: `.claude/agents/audit-production.md`
- Modify: `.claude/agents/a11y-verifier.md`
- Modify: `.claude/agents/new-component.md`
- Modify: `.claude/agents/refactor-component.md`
- Modify: `.claude/skills/stencil-compliance/SKILL.md`
- Modify: `.claude/skills/LOCAL-SETUP.md`
- Modify: `scripts/__tests__/audit/callers.spec.mjs`

- [ ] `pre-pr-check`, `audit-production`, `a11y-verifier`, `stencil-compliance`,
  `/audit-component`, `LOCAL-SETUP.md`, `commands/README.md`, `migrate-component`,
  `new-component`, `refactor-component` → new flags and the new row statuses.
  Verify: `rg -- "--fast|--deep|--e2e" .claude` shows only the documented alias.
- [ ] Each caller runs `yarn audit:component` (or `verdict.mjs`) and stops on a non-zero exit
  status. `audit-production`'s own PASS/FAIL/WARN criteria are replaced by the verdict's
  `state` + `level`, and the fallback paragraphs in `audit-production` and `pre-pr-check` are
  removed. Verify: `callers.spec.mjs` (the invocation and no-restated-criteria assertions from
  the Acceptance bar) passes over the final caller files.

### Phase 6 — prove it
**Executor**: session model, medium effort · wave 5

**Files**:
- Create: `scripts/audit/seeded-defects.mjs`
- Modify: `.claude/plans/2026-09-21-audit-component-depths.md`

- [ ] Re-run the Phase 0 probes; report the before/after wall-clock, prompt size and billed
  tokens, each with its denominator.
- [ ] Run `yarn audit:component mud-button --depth standard` twice on the same commit and `cmp`
  the two `verdict.json` files.
- [ ] Seed three known defects (one per layer) in a scratch branch; each must surface in the
  fix brief with a working `verify:` command.

## Execution matrix

| Phase | Shape | Model / effort | Wave |
|---|---|---|---|
| 0 | research + measurement | session model, medium | 1 |
| 1 | implementer (shared schema first) | sonnet, high | 2 |
| 2 | judgment (verdict contract) | opus, high | 3 |
| 3 | implementer | sonnet, high | 3 (parallel with 2; 17 and 19 in parallel) |
| 4 | judgment (prose contract) | opus, medium | 4 |
| 5 | implementer (caller prose that must invoke the gate) | sonnet, medium | 4 (parallel with 4 after its flags freeze) |
| 6 | verification | session model, medium | 5 |

## Open questions (owner)

None blocking. The five questions were answered on 2026-09-21 (see Decision).

## Not verified

- The Wave A crashes in F1 came from a worktree with no `node_modules`. Script behaviour on a
  healthy install was not re-run here; F1 is about aggregation, which holds either way.
- The framework adapter rules in Design §4 are not yet checked against docs (Phase 0).
- The time budgets per depth are estimates until Phase 0 measures them.
- Angular / Vue / Blazor adapter rules are deliberately out of scope (Decision §3).
- The owner's original request list (the "items" the Review log cites) lives in the analysis
  session, not in this plan; coverage is graded against issue #114 and the Goal section.
- The HEAD-only waiver rule stops the audit from granting a waiver to itself. It does not stop
  an agent that both edits and commits the manifest. That case is caught in PR review, where
  the verdict prints the waiver's commit, not by a mechanism.

## Review log

- 2026-09-21 preflight, 2 legs, both FORTIFY. Applied:
  - Phase 0 adapter scope matched to Decision §3.
  - Tolerances marked `TBD` until Phase 0 sets them, each naming its instrument.
  - Shared finding schema moved to Phase 1, ahead of `verdict.mjs` and `19-interaction.mjs`.
  - Waiver / override honoured only from `HEAD`.
  - `verdict.json` written only by `verdict.mjs`.
  - Phase 5 check that callers stop on every non-PASS state.
- Self-review, same day: added Figma corrections (`expect[].override`). Request item 9 ("unless
  … correction instructions are given") had no mechanism.
- 2026-09-21 critic round 2 at `a82d255`, 4 legs: goal-fit RETHINK (goal-scope), correctness /
  alternatives / enforceability FORTIFY. Owner decided the goal-scope item (Decision §5).
  Applied:
  - AI findings advisory at `quick` / `standard`; declared AI-leg rows at `deep` (Design §1, §6).
  - One `state` + `level` enum; `deep --no-figma` graded positively.
  - Required-check table per depth; `--skip` / `--only` cannot raise the level; `--recheck`
    dropped.
  - Every Figma input read from `HEAD` through the existing `--manifest` option (Design §8).
  - Exit code per state; callers branch on it; `callers.spec.mjs` executes the mapping.
  - `pre-pr-check` bar line graded on the command it actually runs.
  - Tolerance instruments corrected (`measure-prompt-cost` measures prompt size only); two real
    runs compared in Phase 6.
  - `17` split into a source part (Wave A) and a CEM part (Wave B, freshness-checked).
  - `design: "none"` accepted by `validateManifest` and `selectScripts`.
  - Multi-component `summary.json`; `schemaVersion` on `verdict.json` / `ai-findings.json`.
  - BX2 / BX3 moved into `09`, BX6 stays `12`; Phase 0 interaction spike.
  - Storybook prerequisite and the `audit:component` script tasked; `deep` contents mapped.
  - Fallback removal gated on a check-to-home table; Phase 5 gains `a11y-verifier`,
    `stencil-compliance`, `regression-check.mjs`, and replaces `audit-production`'s own criteria.
  - Model-override detection claim dropped; branch constraint and Phase 4 runner corrected.
