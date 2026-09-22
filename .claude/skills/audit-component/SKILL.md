---
name: audit-component
description: Use when auditing a `mud-*` Stencil component (one name, `--changed` or `--all`) for production readiness. Runs `yarn audit:component <name> --depth quick|standard|deep`, whose script-computed verdict (PASS / FAIL / INCOMPLETE / NEEDS-DECISION, exit 0 / 1 / 3 / 4) and `audit/<name>/fix-brief.md` are the result; at `deep` the skill adds the advisory AI legs (stencil-compliance manual rows, full WCAG + media conditions, Figma states in both themes, archetype CX checks, security) and a synthesis. Flags `--no-figma`, `--no-browser` / `--ci`; `--fast` is a deprecated alias of `--depth quick`. Never auto-fixes; never writes the verdict.
---

# audit-component — Skill

Audits one `mud-*` component (or `--changed` / `--all`). The checks are scripts under
`scripts/audit/`; the verdict is computed by `scripts/audit/verdict.mjs`, the only writer of
`audit/<component>/verdict.json`. The model never writes or restates a verdict. This skill adds
two things only: the AI judgment legs at `deep` — advisory, they never move the state — and a
synthesis over the results.

## Procedure

1. **Run the audit** — unless a caller already ran the gate and handed over the component's `runDir`;
   then skip to step 2 and never start a second fresh run.

   ```bash
   yarn audit:component <mud-name> --depth <quick|standard|deep> [--no-figma] [--no-browser]
   ```

   The command runs `run-all.mjs --verdict` and exits with the state's code:

   | Exit | State | Meaning |
   | --- | --- | --- |
   | 0 | `PASS` | Every required check ran and nothing blocks. Carries a `level`. |
   | 1 | `FAIL` | At least one blocking finding. |
   | 3 | `INCOMPLETE` | A required check crashed, lacked its prerequisite, did not run without an excuse, or found nothing to check (a `noTarget` finding: no story, no reference, no coverage entry). |
   | 4 | `NEEDS-DECISION` | An open design question — the audit never picks an option. |
   | 2 | — | Usage or internal error. |

   Precedence, first match wins: `INCOMPLETE` → `FAIL` → `NEEDS-DECISION` → `PASS`. On several
   components the worst state decides, and `audit/_run/summary.json` lists each one.
2. **Read `audit/<component>/fix-brief.md`** — one block per non-PASS entry, each with its
   `verify:` command. `verdict.json` carries the same data for machines.
3. **At `deep` only, run the AI legs** (§ AI legs) into the run's `runDir`
   (`components[].runDir` in `audit/_run/summary.json`), then re-render the brief with
   `node scripts/audit/verdict.mjs --run-dir <runDir>`: their findings land under "Advisory" and
   the state does not change.
4. **Report the synthesis** ([report-template](references/report-template.md)): the headline
   line verbatim, the brief's path, cross-check correlations, and what was not verified.

**If the orchestrator cannot run** (no `node_modules`, wrong Node, a failed prerequisite), the
state is `INCOMPLETE` and the brief names the cause and the command that fixes it. Report that.
Never fall back to reading files and grepping by hand: a hand-run audit has no verdict writer,
so it can only produce the unreproducible prose verdict this design exists to remove.

## Depths

Required ids per depth are the one table `REQUIRED_CHECKS` in `scripts/audit/verdict.mjs`;
print it with `node -e "import('./scripts/audit/verdict.mjs').then(m => console.log(m.REQUIRED_CHECKS))"`.

| Depth | Runs | Highest `level` on PASS |
| --- | --- | --- |
| `quick` | env preflight, `lint`, Wave A (01 02 03 04 05 07 14 16 17). No build, no browser, no Figma. | `CLEAN-STATIC` |
| `standard` (default) | quick + prerequisites built automatically + Wave B (06 08 13 18) + Wave C (09 10 11 12 15 19). Figma parity reads the committed manifest only. | `MERGE-READY` |
| `deep` | standard + `figma-refs --check` (live Figma, file version recorded) + `adapter-react` / `adapter-vanilla` builds + `e2e` (deferred: no E2E test project) | `PRODUCTION-READY` |

`level` is computed, never chosen: `CLEAN-STATIC` for `quick` or any browser-waived run,
`MERGE-READY` for `standard` or `deep --no-figma`, `PRODUCTION-READY` for `deep` with Figma
evidence or a committed `design: "none"`.

## Flags and excuses

| Flag | Effect |
| --- | --- |
| `--depth <d>` | `quick` / `standard` / `deep`. `--fast` is a deprecated alias of `--depth quick`; `--e2e` folds into `deep`. |
| `--no-figma` | Excuses 11, 15, `figma-refs` for this run. `deep` is capped at `MERGE-READY`. |
| `--no-browser`, `--ci`, or `CI` set in the environment | Excuses Wave C; the headline prints `browser: waived (flag)` or `(CI env)`; level capped at `CLEAN-STATIC`. |
| `--changed` / `--all` | One pipeline and one `verdict.json` per component; repo-level rows run once and count toward the state. `--changed` selecting nothing is `PASS` with "no components selected" printed; a changed-set detector that failed is `INCOMPLETE`. One audit per worktree: a second one finding the lock live is `INCOMPLETE`. |
| `--skip` / `--only` | Local iteration. Dropping a required id makes the state `INCOMPLETE`, never `PASS`. |

A component with no design commits `{ "figma": { "design": "none", "reason": "…", "decidedBy": "…" } }`
as its manifest: same checks excused, full ceiling, reason printed. With neither that nor a
manifest at `HEAD`, `standard`+ is `NEEDS-DECISION`. Every Figma input is read from the
committed manifest (`git show HEAD:<path>`); an uncommitted change is reported as
`not honoured` and changes nothing. The audit never writes a `*.figma.json`.

## AI legs (`deep`)

The AI legs are advisory at every depth (Decision 12, `2026-09-22-audit-depths-sentinel-fixes.md`):
no row is opened for them, the verdict never waits on them, and a leg's findings never move the
state. `deep`'s `PRODUCTION-READY` means its scripted rows passed; the headline says
`ai-legs: advisory`. Run a leg only for the judgment it adds; skip the browser legs when the
browser was waived and the Figma leg when Figma was.

| Leg (directory name) | ids it lists | Runs as | Model | Effort |
| --- | --- | --- | --- | --- |
| `stencil-compliance` | `DX-stencil-manual` | the [`stencil-compliance`](../stencil-compliance/SKILL.md) skill in this session: judge its `manual` rows | session's | session's |
| `a11y-verifier` | `DX-wcag`, `DX-media` | agent, dispatched | `sonnet` (pinned) | agent default, not pinned |
| `pixel-perfect-verifier` | `DX-figma-themes` | agent, dispatched | `sonnet` (pinned) | agent default, not pinned |
| `audit-component` | `CX1`–`CX4`, `DX-security` | this session ([checklists](references/layer-2-browser-checklists.md)) | session's | session's |

The pins stay so that two people's `deep` runs use the same tiers; a teammate may override one
locally and knowingly — the audit cannot detect it. The session running this skill pins nothing:
it is the caller's. **`audit-production` is never a leg**: it runs this audit at `deep`, so
dispatching it from here would recurse.

**Dispatch rules.**
- Browser legs run **one at a time**: the `mcp__playwright__*` browser is one instance shared by
  every session, and two legs driving it read each other's pages. `stencil-compliance` (no
  browser) may run alongside one browser leg.
- Each brief carries: the component, the Storybook port from `.audit-storybook.json` (this
  worktree's server, not 6007), the `idsJudged` it lists, and the output path
  `<runDir>/ai/<leg>/ai-findings.json`. Before reading any value in the
  browser, the leg confirms the page URL names that port.
- A leg may run `node scripts/audit/run-all.mjs <component> --only <ids> --json` for evidence. It
  never runs `verdict.mjs` or `yarn audit:component`, and never stops on their exit code.
- A leg writes only its `ai-findings.json` — never source, never a manifest, never `verdict.json`.

**`ai-findings.json`** — one file per leg directory, listing every id the leg judged:

```json
{
  "schemaVersion": "1.0.0",
  "leg": "a11y-verifier",
  "idsJudged": ["DX-wcag", "DX-media"],
  "findings": [
    { "severity": "error", "code": "WCAG-1.4.11-FOCUS-RING", "file": "src/components/mud-x/mud-x.css", "line": 40,
      "message": "…", "expected": { "value": "≥ 3:1", "source": "WCAG 2.1 SC 1.4.11" }, "actual": "1.9:1" },
    { "node": "Figma 12:34", "question": "…", "options": ["…", "…"] }
  ]
}
```

A file with an unknown major `schemaVersion`, or a finding missing `severity` and both
`message` / `actual` (a question-shaped finding needs neither), is ignored and named in the
verdict's notes. Every valid finding — `severity: "error"`, a `question` + `options`, anything —
renders under "Advisory" and never changes the state, at any depth.

When every leg has written its file, re-render: `node scripts/audit/verdict.mjs --run-dir <runDir>`
— its exit is the unchanged state's.

## Fix loop

1. Fix one entry at a time. Run the exact string in that entry's `verify` field as read from
   `verdict.json`'s `entries[]` — a fixed command, never a `<run>` placeholder (Decision 11) and
   never a command retyped or paraphrased from `fix-brief.md`'s prose, which renders the same
   field for a human and is display text, not the source of truth.
2. When every `verify:` passes, re-run the whole audit at the same depth. Only a full run can
   write `PASS`.

There is no re-check mode: a partial run that rewrote the verdict would be a second writer able
to print `PASS` over stale rows. The audit never auto-fixes; the user picks what to address.

## Where the old manual checks went

The manual Wave 1–3 fallback, the WCAG quick-check and the Security & Performance spot-check are
gone. Every check they carried, and its home. "ref judgment" = the
[static-judgment reference](references/wave-2-static-analysis.md), recorded as findings in the
session's `audit-component` file (advisory). A leg named as a home is advisory too (Decision 12).

| # | Old check | Home |
| --- | --- | --- |
| 1 | Read TSX / CSS / types / enums / constants / stories / spec | `01` (file set), `14` (contract); legs read what they judge |
| 2 | Read the E2E spec (`--e2e`) | `e2e` row at `deep`, deferred: no E2E test project |
| 3 | Read the component tokens file | `01` `STRUCTURE-MISSING-TOKENS`, `13` |
| 4 | Read `mud-button` / `mud-text-input` for comparison | dropped: a comparison source, not a check; the rules they illustrate are in `02`, `16`, `17` and lint |
| 5 | Anti-pattern grep, CSS + TSX | `02` |
| 6 | `yarn lint` | `lint` row: ESLint + Stylelint on the component's files (Prettier stays in repo-wide `yarn lint`) |
| 7 | `yarn tokens.build` | prerequisite `yarn dx:prepare` (`standard`+) |
| 8 | Probe port 6007 / start Storybook | orchestrator: this worktree's Storybook, `.audit-storybook.json` |
| 9 | File structure | `01` |
| 10 | Member order, `@Watch` rules | `16` (report-only) |
| 11 | `!` on decorated fields, no implicit `any` | `tsc` strict in the `dx:stencil:once` prerequisite (a failure leaves Wave B/C rows `INCOMPLETE`); `02` `ANTIPATTERN-TS-ANY` |
| 12 | Generated `HTMLMud…Element` type | lint `@stencil/element-type` |
| 13 | `import type` | lint `consistent-type-imports` |
| 14 | `Record<>` maps, `?.` with `??`, `?` on optional props | ref judgment |
| 15 | Stencil decorator audit | `02`, `16`, `17` (A3, A4 — A4 checks the reserved names lint `@stencil/reserved-member-names` misses, and `@Event` names, which that rule never checks); `manual` rows → the `stencil-compliance` leg |
| 16 | Lifecycle leak / re-attach safety | `02` `ANTIPATTERN-007-LIFECYCLE-LEAK`; LC2 → the `stencil-compliance` leg |
| 17 | Reactivity mutation, `@State` only for render | `02` `ANTIPATTERN-005-ARRAY-MUTATION`; S1–S3 → the `stencil-compliance` leg |
| 18 | Form callbacks present | `16` `STENCIL-FORM-CALLBACKS` |
| 19 | `setFormValue` with two arguments | `02` `ANTIPATTERN-010-SETFORMVALUE-1ARG`, `19` BX7 |
| 20 | Reset / restore / validity behaviour | CX1–CX3 (FORM), the CX leg |
| 21 | DTCG shape, references resolve, tier purity, generated CSS vars exist | CI job `tokens-validate` (`yarn tokens.validate`, repo-wide, not an audit row) |
| 22 | Token naming order, root key | ref judgment |
| 23 | Token values vs the Figma export | `13` |
| 24 | CSS pattern A / B, universal selectors, disabled `pointer-events` / cursor, nesting | ref judgment |
| 25 | `:host { display }` | `02` `ANTIPATTERN-HOST-DISPLAY` |
| 26 | `transition: all`, `!important` | lint (Stylelint) |
| 27 | Prop mirrored as slot fallback | `02` `ANTIPATTERN-026-PROP-CONTENT-SLOT-FALLBACK` |
| 28 | Slot tag validation, `::slotted` rules, slot JSDoc and story | ref judgment |
| 29 | Story lineup and title | `05` |
| 30 | `docs.source` dynamic / typed / composite override | `05` |
| 31 | Story typing (`Meta<Args>`, `args: any`, `typeof meta`, eslint wrap), raw story values, argTypes | ref judgment |
| 32 | Spec anti-patterns, test content | ref judgment |
| 33 | Coverage gate | `06` (warning below its threshold, listed under the brief's "Warnings (non-blocking)"; a failing spec of the component is `COVERAGE-TESTS-FAILED`, an error) |
| 34 | Spec file missing | `01` `STRUCTURE-MISSING-REQUIRED` |
| 35 | Navigate to the story, snapshot | `09`, `19` BX1 |
| 36 | Console messages | `12` (errors; `console.warn` is info) |
| 37 | `yarn audit:contrast`, computed colours light + dark | `10`; per Figma state and theme `15` |
| 38 | Deep `stencil-compliance` pass | `02` + `16` rows; `manual` rows → the `stencil-compliance` leg |
| 39 | Deep `/audit-accessibility` | the `a11y-verifier` leg |
| 40 | Roles, redundant ARIA, `aria-disabled` | `09` captures the tree; judgment → the `a11y-verifier` leg |
| 41 | Accessible name without visible text | `09` `A11Y-MISSING-ACCESSIBLE-NAME` |
| 42 | `aria-invalid` + `aria-describedby` on error | CX1 (FORM) |
| 43 | `role="status"` / `alert` | CX1 (STATUS) |
| 44 | Focusable via Tab | `09` BX2 |
| 45 | Visible focus ring | `09` BX3 |
| 46 | Enter / Space activates | CX1–CX2 (ACTION); other archetypes the `a11y-verifier` leg |
| 47 | Escape closes overlays, no trap | `19` BX4 |
| 48 | Shift+Tab walks back | the `a11y-verifier` leg (not scripted) |
| 49 | Text contrast 4.5:1 / 3:1, both themes | `10` |
| 50 | UI and focus-ring contrast 3:1 (SC 1.4.11) | the `a11y-verifier` leg (`10` does not evaluate it) |
| 51 | Disabled distinguishable, no colour-only information | the `a11y-verifier` leg |
| 52 | Inline styles | `02` `ANTIPATTERN-001-INLINE-STYLE` |
| 53 | `innerHTML` | `02` `ANTIPATTERN-SECURITY-INNERHTML` |
| 54 | Dynamic code execution, unsanitised URLs, slot content validation, secrets in props / events, cookie / storage access, leaking payloads | the security leg (DX-security) |
| 55 | `@State` only for render values | the `stencil-compliance` leg (S1) |
| 56 | Heavy work in `render()`, DOM queries in loops | ref judgment |
| 57 | `shadow: true` | `16` `STENCIL-SHADOW-REQUIRED` |
| 58 | Scoped `window` / `document` listeners | `02` `ANTIPATTERN-007-LIFECYCLE-LEAK` |
| 59 | `transition: all` | lint (Stylelint) |
| 60 | Large inline SVG | `02` `ANTIPATTERN-021-RAW-SVG` |
| 61 | Large dependencies | `08` |

## Failure modes

Observed before this design; each is why a rule above exists.

- **A crashed script read as zero errors.** In a worktree without `node_modules`, 5 of 8 Wave A
  scripts crashed while the envelope said `errors: 0`. Now a crashed row is `INCOMPLETE`.
- **A component with no Figma evidence was called "Ready to merge".** 11 and 15 were dropped
  silently when there was no manifest. Now `standard`+ is `NEEDS-DECISION` without one.
- **Two runs could disagree**: the model wrote the verdict as prose and drove the shared MCP
  browser for fixed assertions. Now the verdict is computed and BX1–BX7 are scripts; browser
  legs run one at a time.
- **The manual fallback restated the scripts** and drifted from them. It is removed; the table
  above is the only record of where each check went.

## References — load on demand

| File | Covers | Load when |
| --- | --- | --- |
| [references/layer-2-browser-checklists.md](references/layer-2-browser-checklists.md) | BX ids → their scripts; CX archetype checks; the DX ids each deep leg judges | Running the `audit-component` leg, or writing a leg brief |
| [references/wave-2-static-analysis.md](references/wave-2-static-analysis.md) | Static judgment no script covers (ref judgment rows above) | Judging the component's source at any depth |
| [references/report-template.md](references/report-template.md) | Verdict files, states, levels, exit codes, the synthesis report | Reading a verdict or writing the synthesis |

Callers — `/audit-component`, `/pre-pr-check`, `/migrate-component`, and the `new-component`,
`refactor-component` and `audit-production` agents — run `yarn audit:component` and stop on a
non-zero exit. From another skill: `Skill('audit-component', { args: 'mud-button --depth quick' })`.
