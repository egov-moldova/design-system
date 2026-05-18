---
description: Full pre-PR validation pipeline with parallel waves — lint, test, build, story check, console errors, git hygiene
---

# /pre-pr-check

Run the full pre-PR validation pipeline on the current branch using **parallel waves** where commands are independent. Report pass/fail summary. Do NOT auto-fix.

Invoke the `verification-before-completion` skill before presenting the final report — must confirm all commands ran AND output was read.

## Execution Model

The pipeline runs in **5 waves**. Within a wave, all bash commands MUST be dispatched in a single message with multiple parallel `Bash` tool calls. Between waves, results must be aggregated before proceeding (later waves depend on earlier outputs).

```text
Wave 1 (parallel):  git status  +  git log  +  yarn lint  +  yarn test  +  Stencil grep gates  +  git diff --stat HEAD~1
                                            │
                                            ▼
Wave 2 (single):                       yarn tokens.build
                                            │
                                            ▼
Wave 3 (parallel):                yarn build  +  yarn audit:contrast
                                            │
                                            ▼
Wave 4 (single):                        yarn sp.build
                                            │
                                            ▼
Wave 5 (parallel):       console check  +  storybook a11y panel  +  commit message audit
                                            │
                                            ▼
                                       Final Report
```

## Fast Path — replaces Wave 1 grep gates (preferred)

Instead of running 6 individual `rg` calls and parsing each result, dispatch
the local audit orchestrator. It runs every static check in parallel and
returns ONE JSON envelope you can read in a single tool call:

```bash
# Covers structure, anti-patterns, git hygiene, jsdoc, story exports,
# integration usage, component contract, token diff — across the components
# touched in this branch's git diff vs main.
node scripts/audit/run-all.mjs --changed --no-browser --json
```

Read the result. The `blockers` array lists every error-severity finding;
each entry is `tool/CODE` (e.g. `antipatterns/ANTIPATTERN-005-ARRAY-MUTATION`).
If `blockers` is non-empty, STOP and report — do not proceed to Wave 2.

If you also want git + branch + commit hygiene as part of Wave 1, you already
have it: the orchestrator includes `03-git-hygiene` automatically.

The fallback grep gates below remain valid when the orchestrator is unavailable.

## Wave 1: Static Analysis & Test (parallel)

Dispatch ALL of the following in a single message with parallel `Bash` calls:

```bash
git status
```

```bash
git log --oneline -10
```

```bash
yarn lint
```

```bash
yarn test
```

```bash
git diff --stat HEAD~1
```

### Wave 1 — Stencil anti-pattern + git hygiene gates

Already covered by the Fast Path orchestrator above (`run-all --changed --no-browser`)
via scripts `02-stencil-antipatterns` (14+ patterns paralelle) and
`03-git-hygiene` (branch + commits + forbidden staged paths). If for any
reason you skip Fast Path, individual scripts are still callable:

```bash
node scripts/audit/02-stencil-antipatterns.mjs --changed --json
node scripts/audit/03-git-hygiene.mjs --json
```

For full anti-pattern catalogue see [`stencil-compliance/references/anti-patterns.md`](../skills/stencil-compliance/references/anti-patterns.md). For per-component deep audit invoke `/audit-component @cor-<name> --fast` after Wave 5.

**Verify after Wave 1 results land**:

- Lint: zero violations
- Tests: zero failures; report any with `test file → test name → error message`
- Diff: no unrelated files, no debug `console.log`, no commented-out code blocks, no stray `TODO`s
- Orchestrator `blockers`: empty (or escalate any listed `tool/CODE` immediately)
- Merge driver + pre-commit hook still in place — `git check-attr merge -- src/components.d.ts` returns `merge: ours`; if not, run `node scripts/git/setup-merge-drivers.mjs`

## Wave 2: Token Build (single command)

```bash
yarn tokens.build
```

Verify no build errors. Check output exists:

```bash
# PowerShell
Get-ChildItem dist/design-system/tokens/*.css -ErrorAction SilentlyContinue
```

```bash
# Unix
ls dist/design-system/tokens/*.css
```

## Wave 3: Compile & Contrast (parallel)

Dispatch in a single message with parallel `Bash` calls:

```bash
yarn build
```

```bash
yarn audit:contrast
```

**Verify**:

- `yarn build`: no TypeScript or Stencil errors
- `yarn audit:contrast`: exit 0 required; new `FAIL` entries outside `ACCEPTED_EXCEPTIONS` block the PR
  - If a legitimate exception is needed, add it to `scripts/audit-token-contrast.mjs` `ACCEPTED_EXCEPTIONS` with rationale; reviewers must approve

## Wave 4: Storybook Production Build (single)

```bash
yarn sp.build
```

Strictest gate — if this succeeds, all stories, components, and tokens are wired correctly.

## Wave 5: Runtime Checks (parallel)

Start Storybook if not running:

```bash
# PowerShell
netstat -ano | findstr :6007
```

```bash
# Unix
lsof -i :6007
```

If not LISTENING → start `yarn sp.dev.watch` in background; wait ~10s.

Then dispatch in parallel (single message, multiple tool calls):

### 5a. Console Errors

Preferred — the deterministic script visits every story of every changed
component, captures `console.error` + `pageerror`, and returns one JSON:

```bash
node scripts/audit/12-console-errors.mjs --changed --json
```

Fallback (when Playwright isn't installed) — manual via MCP:

```text
mcp__playwright__browser_navigate({ url: "http://localhost:6007" })
mcp__playwright__browser_wait_for({ time: 3 })
mcp__playwright__browser_console_messages({ level: "error" })
```

Navigate to each modified component's story and verify no runtime errors or warnings.

### 5b. Storybook A11y Panel — WCAG 2.1 AA (mandatory)

**Canonical reference:** Skill [`accessibility-compliance`](../skills/accessibility-compliance/SKILL.md).

For each modified component:

1. Open `http://localhost:6007/?path=/story/atoms-cor-<name>--default`.
2. Open the "Accessibility" panel.
3. Verify zero **Violations** in light mode.
4. Switch global `Mode → Dark` (top toolbar).
5. Verify zero **Violations** in dark mode.

Record any violation as blocking.

For component-level deep audit, optionally run `/audit-accessibility @cor-<name>` after the pipeline.

### 5c. Commit Message Audit

From the `git log --oneline -10` output captured in Wave 1, verify:

- Prefix follows Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`
- Scope is descriptive (optional but recommended)
- Message is meaningful (not "wip", "fix", "update")
- No typos

## Final Report

Invoke `verification-before-completion` skill, then present:

```text
## Pre-PR Check Report

| Wave | Check | Status | Notes |
| ---  | ---   | ---    | ---   |
| 1    | Branch naming      | PASS/FAIL  |  |
| 1    | Lint               | PASS/FAIL  | X warnings |
| 1    | Tests              | PASS/FAIL  | X pass, Y fail |
| 1    | Changed files      | PASS/FAIL  |  |
| 2    | Token build        | PASS/FAIL  |  |
| 3    | Stencil build      | PASS/FAIL  |  |
| 3    | WCAG 2.1 AA contrast | PASS/FAIL | obligatory pairs both modes |
| 4    | Storybook build    | PASS/FAIL  |  |
| 5    | Console errors     | PASS/FAIL  |  |
| 5    | Storybook a11y panel | PASS/FAIL | per modified component, both modes |
| 5    | Commit messages    | PASS/FAIL  |  |

### Blocking Issues
1. ...

### Warnings (non-blocking)
1. ...

### Pipeline timing
- Total wall-clock time: ~Xs
- Sequential equivalent (estimate): ~Ys
```

## Notes on Parallelism

- **Within a wave**, fire all commands in a single message with multiple parallel `Bash` tool calls. PowerShell tool too if mixed shell needed.
- **Between waves**, wait for prior results — Wave 2+ depends on Wave 1's tokens? No: Wave 2 (tokens.build) is independent of Wave 1 lint/test, but the user expects lint/test results before moving forward. If both Wave 1 and Wave 2 succeed, you can technically start them together — but keeping the wave separation makes failure isolation easier and avoids running expensive token build if lint already fails. Optimize only if speed-critical.
- **Fail-fast**: if Wave 1 reports critical failures (lint errors, test failures), STOP and report — don't proceed to Wave 2+.
