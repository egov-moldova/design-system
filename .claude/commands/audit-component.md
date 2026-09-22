---
description: Deterministic production-readiness audit of a Stencil component. `yarn audit:component <name> --depth <d>` (`scripts/audit/verdict.mjs`) computes the verdict from L1 scripts and, at `deep`, declared AI-leg rows — never the model. This command is a thin wrapper around the `audit-component` skill, which dispatches the depth's AI-only legs. Depths: `quick | standard | deep` (default `standard`). `--fast` is a deprecated alias of `--depth quick`; `--e2e` folds into `--depth deep`.
argument-hint: "@mud-<component-name> [--depth quick|standard|deep] [--no-figma] [--no-browser] [--ci]"
---

# /audit-component

Audit the component identified by `$ARGUMENTS` (folder name plus optional flags). The verdict is computed by a script (`scripts/audit/verdict.mjs`), never by the model — this command runs the gate, then invokes the [`audit-component`](../skills/audit-component/SKILL.md) skill for the judgment-only legs the script cannot run.

## Usage

```text
/audit-component mud-button
/audit-component mud-checkbox --depth deep
/audit-component mud-input --depth quick
/audit-component mud-accordion --no-figma
```

## Flags

- `--depth quick|standard|deep` — default `standard`.
  - `quick` — env preflight, lint, Wave A scripts. No build, no browser, no AI judgment except rendering. Highest level a PASS can carry: `CLEAN-STATIC`.
  - `standard` — quick + prerequisites built automatically (tokens, coverage, dev build, Storybook) + Wave B/C + the scripted interaction checks (`19-interaction`) + Figma parity (`11`, `15`). AI judgment (archetype CX) is advisory only and never changes `state`. Highest level: `MERGE-READY`.
  - `deep` — standard + `stencil-compliance` manual rows, full WCAG, every Figma state × both themes, adapter smoke builds (React + vanilla), the live Figma reference check, a security leg, E2E when present. AI legs are declared rows opened by the orchestrator; an AI finding here may set `FAIL` / `NEEDS-DECISION`, never clear a script `FAIL`. Highest level: `PRODUCTION-READY`.
- `--fast` — deprecated alias of `--depth quick`, kept for `pre-pr-check`.
- `--e2e` — deprecated alias, folds into `--depth deep`.
- `--no-figma` — skip Figma parity checks (`11`, `15`, `figma-refs`, the Figma-themes AI leg) for this run. Caps the level at `MERGE-READY` even at `--depth deep`; the fix brief lists what did not run.
- `--no-browser` / `--ci` — excuse the browser-dependent checks (Wave C, `11`, `15`, BX). Caps the level at `CLEAN-STATIC`.

## Execution

1. Run the gate once — skip this step when a caller already ran it and its `--json` stdout says `components[].awaitingLegs: true` (a second fresh run would open new rows and orphan the legs already dispatched):

   ```bash
   yarn audit:component $ARGUMENTS --json
   ```

   Exit codes (`scripts/audit/lib/exit-codes.mjs`): `0` PASS, `1` FAIL, `3` INCOMPLETE, `4` NEEDS-DECISION, `2` usage/internal error. At `--depth deep`, an exit `3` with this invocation's `--json` stdout carrying `components[].awaitingLegs: true` means every `INCOMPLETE` entry is an opened `ai-*` row (Decision §11, `2026-09-22-audit-depths-sentinel-fixes.md`) — go to step 2, then step 3. Never read `awaitingLegs` from a `verdict.json` an earlier run left behind. Any other non-zero exit — STOP. Read `audit/<component>/verdict.json` (`state`, `level`, `headline`, `rows`, `entries`) and `audit/<component>/fix-brief.md` — never re-derive the verdict by hand.

2. At `standard`/`deep`, invoke the skill for the legs the gate itself cannot run (archetype CX rows, cross-layer synthesis, and — at `deep` — the AI-leg rows the orchestrator opened):

   ```text
   Skill('audit-component', { args: '$ARGUMENTS' })
   ```

   The skill never invokes `verdict.mjs` and never stops on its exit code; each leg it dispatches writes `audit/<component>/runs/<run>/ai/<leg>/ai-findings.json`.

3. At `deep`, once every opened row is closed, recompute and STOP on a non-zero exit:

   ```bash
   yarn audit:component --recompute <component> --json
   ```

   `<component>` is the component name alone — `$ARGUMENTS` also carries `--depth` and the
   other flags, which `--recompute` rejects (exit 2). With `--changed` / `--all`, recompute
   each component whose `awaitingLegs` was true; each invocation's exit speaks only for the
   component it recomputed. `--recompute <component>` always targets that component's latest run (read from
   `audit/_run/summary.json`) — a fixed string, never a `<run>` placeholder. Do not start a
   second fresh run (`yarn audit:component $ARGUMENTS`) while a run is already
   `awaitingLegs`; `--run-dir <runDir>` stays available for explicitly targeting an older run.

## Output

The verdict's `headline` (`<state>@<depth> · <level> · <excuses>`) plus the fix brief: one block per `INCOMPLETE` / `FAIL` / `NEEDS-DECISION` entry, each with `verify:` (the exact command that re-runs that one row) and, for a `FAIL`, `owner:`. At `quick`/`standard`, AI findings render under "Advisory" and never change `state`.

## Related

- [`audit-component` skill](../skills/audit-component/SKILL.md) — the AI-only legs and Layer 2 synthesis
- [`scripts/audit/verdict.mjs`](../../scripts/audit/verdict.mjs) — the verdict computation, the only writer of `verdict.json`
- [`stencil-compliance` skill](../skills/stencil-compliance/SKILL.md) — rule catalog, dispatched as the `ai-stencil` leg at `--depth deep`
- [`accessibility-compliance` skill](../skills/accessibility-compliance/SKILL.md) — WCAG 2.1 AA
- [`/audit-accessibility`](audit-accessibility.md) — deep accessibility audit
- [`audit-production` agent](../agents/audit-production.md) — full production readiness gate; runs `yarn audit:component <name> --depth deep`
- [`/pre-pr-check`](pre-pr-check.md) — branch-level validation (uses `--depth quick`)

**Do NOT auto-fix.** Present findings and wait for user approval on which issues to address.
