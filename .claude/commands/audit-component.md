---
description: Deterministic production-readiness audit of a Stencil component. `yarn audit:component <name> --depth <d>` (`scripts/audit/verdict.mjs`) computes the verdict from the scripts alone — never the model. This command is a thin wrapper around the `audit-component` skill, which dispatches the AI-only legs; their findings are advisory at every depth. Depths: `quick | standard | deep` (default `standard`). `--fast` is a deprecated alias of `--depth quick`; `--e2e` folds into `--depth deep`.
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
  - `deep` — standard + adapter smoke builds (React + vanilla), the live Figma reference check (`figma-refs`), E2E when present (deferred). `PRODUCTION-READY` means those scripted rows passed; the headline says `ai-legs: advisory`. The AI legs (`stencil-compliance` manual rows, full WCAG + media conditions, every Figma state × both themes, archetype CX, security) are optional follow-ups: their findings render under "Advisory" and never change `state` (Decision 12, `2026-09-22-audit-depths-sentinel-fixes.md`). Highest level: `PRODUCTION-READY`.
- `--fast` — deprecated alias of `--depth quick`, kept for `pre-pr-check`.
- `--e2e` — deprecated alias, folds into `--depth deep`.
- `--no-figma` — skip Figma parity checks (`11`, `15`, `figma-refs`) for this run. Caps the level at `MERGE-READY` even at `--depth deep`; the fix brief lists what did not run.
- `--no-browser` / `--ci` — excuse the browser-dependent checks (Wave C, `11`, `15`, BX). Caps the level at `CLEAN-STATIC`.

## Execution

1. Run the gate once, and STOP on a non-zero exit:

   ```bash
   yarn audit:component $ARGUMENTS --json
   ```

   Exit codes (`scripts/audit/lib/exit-codes.mjs`): `0` PASS, `1` FAIL, `3` INCOMPLETE, `4` NEEDS-DECISION, `2` usage/internal error. On a non-zero exit read `audit/<component>/verdict.json` (`state`, `level`, `headline`, `rows`, `entries`) and `audit/<component>/fix-brief.md` — never re-derive the verdict by hand. The verdict never waits on an AI leg, at any depth.

2. At `standard`/`deep`, invoke the skill for the judgment the gate cannot script (archetype CX rows, cross-layer synthesis, and — at `deep` — the optional AI legs), telling it the caller already ran the gate and the component's `runDir` (from `components[].runDir` in `audit/_run/summary.json`) so it never starts a second fresh run:

   ```text
   Skill('audit-component', { args: '$ARGUMENTS --run-dir <components[].runDir from audit/_run/summary.json>' })
   ```

   Pass `--run-dir` for real, with the value read from the summary — the rule that the skill starts no second fresh run is only carried by that argument, and without it the skill has nothing to tell the two cases apart. The skill never invokes `verdict.mjs` fresh and never stops on its exit code; each leg it dispatches writes `<runDir>/ai/<leg>/ai-findings.json`.

3. When a leg wrote its file, re-render the brief so its findings appear under "Advisory" (the state does not change):

   ```bash
   yarn audit:component --rerender <component> --json
   ```

   `--rerender` looks the component's current run up in `audit/_run/summary.json`. With `--changed` / `--all`, pass one `--rerender` per component; each invocation's exit speaks only for the runs it names.

## Output

The verdict's `headline` (`<state>@<depth> · <level> · <excuses>`) plus the fix brief: one block per `INCOMPLETE` / `FAIL` / `NEEDS-DECISION` entry, each with `verify:` (the exact command that re-runs that one row) and, for a `FAIL`, `owner:`. At every depth, AI findings render under "Advisory" and never change `state`.

## Related

- [`audit-component` skill](../skills/audit-component/SKILL.md) — the AI-only legs and Layer 2 synthesis
- [`scripts/audit/verdict.mjs`](../../scripts/audit/verdict.mjs) — the verdict computation, the only writer of `verdict.json`
- [`stencil-compliance` skill](../skills/stencil-compliance/SKILL.md) — rule catalog; its manual rows are an advisory leg at `--depth deep`
- [`accessibility-compliance` skill](../skills/accessibility-compliance/SKILL.md) — WCAG 2.1 AA
- [`/audit-accessibility`](audit-accessibility.md) — deep accessibility audit
- [`audit-production` agent](../agents/audit-production.md) — full production readiness gate; runs `yarn audit:component <name> --depth deep`
- [`/pre-pr-check`](pre-pr-check.md) — branch-level validation (uses `--depth quick`)

**Do NOT auto-fix.** Present findings and wait for user approval on which issues to address.
