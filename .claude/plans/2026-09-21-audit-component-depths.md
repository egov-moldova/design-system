# audit-component — depth levels, deterministic verdict, fix brief

**Reviewed:** none

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

| Depth | Runs | Highest verdict it can issue | Budget |
|---|---|---|---|
| `quick` | Env preflight, lint, Wave A scripts (01 02 04 05 07 14 16 + new 17), no build, no browser, no AI judgment except rendering | `CLEAN-STATIC` | < 5 s |
| `standard` | quick + prerequisites built automatically (tokens, the component's own coverage, a dev build) + Wave B + Wave C + the new scripted interaction checks (BX1–BX7) + Figma parity (11, 15) + AI judgment for archetype checks (CX) | `MERGE-READY` | ~1–2 min scripts + one AI synthesis pass |
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

The manifest change is a persisted format and costs little now: one optional key, read by
`lib/figma-manifest.mjs` and ignored by the current readers. It keeps open the known next step
of per-state waivers, which `figma.skip` already covers per variant.

**Who may set a waiver or a correction.** A waiver lifts the verdict ceiling, so it must be
reviewed like code, and the audit must not be able to grant one to itself:

- The audit is read-only. No script and no AI leg writes `*.figma.json` (the skill already
  "never auto-fixes"). A fix brief may *propose* a waiver or an override, as text.
- `verdict.mjs` reads `figma.design` and every `override` from the committed manifest
  (`git show HEAD:<path>`), never from the working tree. An uncommitted waiver is reported as
  `pending waiver — not honoured` and changes nothing. A committed one reaches review as a
  visible manifest diff in the PR.
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
   the interaction-script results, and the AI judgment findings (same finding schema). States, first
   match wins: `INCOMPLETE` (any row crashed, missing a prerequisite, or skipped without a
   flag reason) → `FAIL` (any blocking finding) → `NEEDS-DECISION` (open design question, or no
   Figma manifest at `standard` or deeper) → `PASS@<depth>`. AI findings can add to the
   verdict but can never clear a script `FAIL`. AI legs write only
   `audit/<component>/<run>/ai-findings.json`, which uses the shared finding schema. Only
   `verdict.mjs` writes `verdict.json`, and it rebuilds the file from its inputs on every run,
   so a hand-edited or AI-written `verdict.json` never survives the next run.
2. **Fix brief** (`audit/<component>/<timestamp>/fix-brief.md` + `verdict.json`, git-ignored).
   One block per finding, in this shape:
   `ID · severity · check · location file:line · expected (value + source: Figma node id / rule file:line) · actual · verify: <exact command> · owner: <command/agent>`.
   Open questions go in their own section. Each one cites the Figma node, states what is
   ambiguous, and gives the options. The audit never picks one. The brief is self-contained:
   pasting it into a new session is enough to start fixing.
3. **Re-check loop**: `run-all.mjs --recheck <verdict.json>` re-runs only the checks behind the
   open findings and rewrites the verdict. Once those pass, the last step is a full run at the
   same depth, so a fix cannot hide a regression elsewhere.
4. **Adapter contract** (`17-adapter-contract.mjs`, static, Wave A). It reads the output of 14 plus
   the CEM entry. It checks that the CEM entry exists and matches the source contract (props, events, slots,
   parts, CSS properties). Event names must carry the `mud` prefix and must not collide with native DOM
   events. Event `detail` must be structured-clone / JSON-serialisable (no functions, elements,
   or class instances). Non-primitive props must be property-only (not `reflect`) and documented as
   such. Prop names must not shadow `HTMLElement` members. `@Method` must be async. Every
   framework-specific rule is confirmed against current docs in Phase 0 before it is
   encoded.
5. **Interaction checks move to a script** (`19-interaction.mjs`, Wave C, a local Playwright
   instance that is not the shared MCP browser). It covers BX1–BX7 as fixed assertions. The AI
   keeps CX (archetype judgment), deep-depth DX, and cross-check synthesis only.
6. **The skill gets thinner**. The manual Wave 1–3 fallback is removed (F10). If the
   orchestrator cannot run, the verdict is `INCOMPLETE` with the preflight reason. The
   procedure is `yarn audit:component <name> --depth <d>`, so any tool (Codex, Cursor, CI) gets
   the same verdict. The skill adds only the AI legs and the synthesis.
7. **Model / effort**. The skill does not pin a model: it runs in the caller's session.
   The AI legs it dispatches are existing agents that already pin a model
   (`a11y-verifier`, `pixel-perfect-verifier`: sonnet; `audit-production`: opus). The
   recommended tier per leg goes in a table in the skill. The pins stay (Decision §4). A
   teammate who overrides one locally gets a verdict line naming the override, because the
   leg's model is part of what makes a run reproducible.

## Acceptance bar

Zero-tolerance (graded by `yarn test:scripts` — `node --test "scripts/__tests__/**/*.spec.mjs"`, the existing home of every audit script test — one fixture test per line):

- `run-all.spec.mjs` + `verdict.spec.mjs`: a check that crashed, is missing a prerequisite, or
  was skipped without a flag reason yields `INCOMPLETE`. It never yields any other verdict.
- Two runs over the same inputs produce byte-identical `verdict.json` (timestamps excluded).
  Graded by `verdict.spec.mjs`.
- An AI finding cannot turn a script `FAIL` into anything else. Graded by `verdict.spec.mjs`.
- `PRODUCTION-READY` requires a Figma manifest or a `design: "none"` declaration committed at
  `HEAD`, and never appears under `--no-figma`. A waiver or override present only in the working
  tree changes nothing. Graded by `verdict.spec.mjs`.
- A `verdict.json` that claims PASS but was written by hand is replaced on the next
  `verdict.mjs` run with the verdict its inputs produce. Graded by `verdict.spec.mjs`.
- Every caller stops on `INCOMPLETE`, `FAIL` and `NEEDS-DECISION`. Graded by
  `callers.spec.mjs`, which stubs each state (Phase 5).
- Every non-PASS entry in `fix-brief.md` has location, expected + source, actual, and a
  `verify:` command. If any field is missing, the renderer test fails. Graded by `fix-brief.spec.mjs`.
- `pre-pr-check` still runs unchanged with `--fast` until Phase 5 migrates it. Graded by
  `node scripts/audit/run-all.mjs mud-button --fast --json` (exit 0 or 1, never 2).

Tolerances. Every number is set by a Phase 0 measurement, and until then is `TBD`. No number
here was typed from an estimate:

- Seeded defects (Phase 6): 3 of 3 surface in the fix brief, and each `verify:` command exits
  non-zero before the fix and zero after it. Graded by `node scripts/audit/seeded-defects.mjs`
  (written in Phase 6).
- `quick` wall-clock on `mud-button`, warm cache: `TBD` = Phase 0 static-wave time × 1.5.
  Graded by `node scripts/audit/run-all.mjs mud-button --depth quick --json` →
  `meta.totalDurationMs`.
- AI tokens per `standard` audit: ≤ the Phase 0 baseline. Graded by
  `node scripts/audit/measure-prompt-cost.mjs`.

## Global constraints

- Branch off `main`; never commit on `danzubco/tang` directly to `main`.
- Envelope schema changes are additive (`schemaVersion` minor bump); existing consumers
  (`audit-production`, `pre-pr-check`, `a11y-verifier`) keep working until migrated in Phase 5.
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
- [ ] Baseline: token and wall-clock cost of one current `standard`-equivalent audit on
  `mud-button` and `mud-checkbox` (`node scripts/audit/measure-prompt-cost.mjs`). This is the
  denominator for every later claim and sets the `TBD` tolerances. Verify: numbers recorded in
  the Acceptance bar.
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
- Modify: `package.json`

- [ ] Define the finding and row-status schema once, in `lib/json-output.mjs`. Every producer
  (01–17, 19, the AI legs) and the only consumer (`verdict.mjs`) build against it. Phase 2 and
  Phase 3 both depend on this schema, so it lands first. Verify: a schema unit test over one
  fixture per producer kind.
- [ ] Env preflight: `node_modules`, Node version vs `engines`, resolvable deps → one-line
  `INCOMPLETE: <cause>`. Verify: `scripts/__tests__/audit/run-all.spec.mjs` case with a missing dep.
- [ ] Crashed / prerequisite-missing rows → status `crashed` / `missing-prereq`, listed in
  `blockers`, counted in `summary.incomplete`. Verify: `aggregate()` unit test.
- [ ] Automatic prerequisites at `standard`+ (tokens, the component's own coverage, a dev build), wireit-cached.
  Verify: fresh worktree run produces 06 and 08 rows.

### Phase 2 — depth + verdict + fix brief (F7 F8 F9)
**Executor**: opus, high effort · wave 3 (after Phase 1's schema)

**Files**:
- Modify: `scripts/audit/run-all.mjs`
- Modify: `scripts/audit/lib/cli-args.mjs`
- Modify: `scripts/audit/lib/figma-manifest.mjs`
- Modify: `scripts/audit/15-style-parity.mjs`
- Create: `scripts/audit/verdict.mjs`
- Create: `scripts/audit/lib/fix-brief.mjs`
- Create: `scripts/__tests__/audit/verdict.spec.mjs`
- Create: `scripts/__tests__/audit/fix-brief.spec.mjs`
- Modify: `scripts/__tests__/audit/15-style-parity.spec.mjs`
- Modify: `scripts/__tests__/audit/figma-manifest.spec.mjs`
- Create: `scripts/__tests__/audit/__fixtures__/verdict/`
- Modify: `.gitignore`
- Modify: `package.json`

- [ ] `--depth` in `run-all.mjs` (+ `--fast` alias, `--e2e` folded into `deep`).
- [ ] `verdict.mjs` + `fix-brief.md` renderer + `--recheck`. Verify: fixture envelopes →
  golden verdicts, byte-identical across two runs.
- [ ] Figma gate: no manifest at `standard`+ → `NEEDS-DECISION` with the question
  pre-filled. Verify: fixture without manifest.
- [ ] `--no-figma` flag + `figma.design: "none"` manifest key (additive, parsed in
  `lib/figma-manifest.mjs`). Verify: three fixtures — flag (capped, gap listed), declared
  none (full ceiling, reason printed), neither (`NEEDS-DECISION`).
- [ ] `expect[].override` (Figma corrections), read by `15-style-parity`, and listed in the
  verdict. Verify: a fixture where an override passes and the override is printed.

### Phase 3 — new scripts (F5 F6)
**Executor**: sonnet, high effort · wave 3 (parallel with Phase 2; both build against Phase 1's schema)

**Files**:
- Create: `scripts/audit/17-adapter-contract.mjs`
- Create: `scripts/audit/19-interaction.mjs`
- Create: `scripts/__tests__/audit/17-adapter-contract.spec.mjs`
- Create: `scripts/__tests__/audit/19-interaction.spec.mjs`
- Create: `scripts/__tests__/audit/__fixtures__/adapter-contract/`
- Create: `scripts/__tests__/audit/__fixtures__/interaction/`
- Read only: `scripts/audit/14-component-contract.mjs`
- Read only: `.storybook/custom-elements.json`

- [ ] `17-adapter-contract.mjs` + fixtures (one pass, one per rule failure).
- [ ] `19-interaction.mjs` (BX1–BX7) + fixtures; run against 3 archetypes.

### Phase 4 — skill rewrite
**Executor**: opus, medium effort · wave 4

**Files**:
- Modify: `.claude/skills/audit-component/SKILL.md`
- Modify: `.claude/skills/audit-component/references/layer-2-browser-checklists.md`
- Modify: `.claude/skills/audit-component/references/report-template.md`
- Modify: `.claude/skills/audit-component/references/wave-2-static-analysis.md`
- Modify: `scripts/audit/README.md`

- [ ] SKILL.md: depth table, AI-only steps, model/effort table, remove the manual fallback.
  The references shrink to CX/DX judgment and the report contract. Verify: `yarn test` on
  `scripts/__tests__/check-ai-docs.spec.mjs`.

### Phase 5 — callers
**Executor**: haiku, low effort · wave 4 (after Phase 2 freezes the flags)

**Files**:
- Modify: `.claude/commands/pre-pr-check.md`
- Modify: `.claude/commands/audit-component.md`
- Modify: `.claude/commands/README.md`
- Modify: `.claude/commands/migrate-component.md`
- Modify: `.claude/agents/audit-production.md`
- Modify: `.claude/agents/new-component.md`
- Modify: `.claude/agents/refactor-component.md`
- Modify: `.claude/skills/LOCAL-SETUP.md`
- Create: `scripts/__tests__/audit/callers.spec.mjs`

- [ ] `pre-pr-check`, `audit-production`, `/audit-component`, `LOCAL-SETUP.md`,
  `commands/README.md`, `migrate-component`, `new-component`, `refactor-component` → new flags.
  Verify: `rg -- "--fast|--deep|--e2e" .claude` shows only the documented alias.
- [ ] Each caller reads `verdict.json.state` and stops on `INCOMPLETE` / `FAIL` /
  `NEEDS-DECISION`: `pre-pr-check` exits non-zero, and `audit-production` reports Block. Verify:
  `callers.spec.mjs` stubs each state and asserts that the caller stops. A renamed flag alone
  proves nothing about whether the new states are enforced.

### Phase 6 — prove it
**Executor**: session model, medium effort · wave 5

**Files**:
- Create: `scripts/audit/seeded-defects.mjs`
- Modify: `.claude/plans/2026-09-21-audit-component-depths.md`

- [ ] Re-run the Phase 0 probe; report the before/after tokens and wall-clock, with denominators.
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
| 5 | mechanical | haiku, low | 4 (parallel with 4 after its flags freeze) |
| 6 | verification | session model, medium | 5 |

## Open questions (owner)

None blocking. The four questions were answered on 2026-09-21 (see Decision).

## Not verified

- The Wave A crashes in F1 came from a worktree with no `node_modules`. Script behaviour on a
  healthy install was not re-run here; F1 is about aggregation, which holds either way.
- The framework adapter rules in Design §4 are not yet checked against docs (Phase 0).
- The time budgets per depth are estimates until Phase 0 measures them.
- Angular / Vue / Blazor adapter rules are deliberately out of scope (Decision §3).
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
