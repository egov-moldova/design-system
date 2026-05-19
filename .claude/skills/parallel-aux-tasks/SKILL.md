---
name: parallel-aux-tasks
description: Use when an orchestrator agent (new-component, refactor-component, redesign-component, custom-component) has completed Core Build (tokens → CSS → TSX) and needs to dispatch auxiliary verification + writing tasks in parallel. Defines the standard subagent set, write-mode flag handling, and report aggregation.
---

# Parallel Auxiliary Tasks Skill

## Purpose

Orchestrator agents own the **critical path**: Figma → tokens → CSS → TSX. Once the component renders in Storybook, several auxiliary tasks become independent of each other:

- Pixel-perfect verification (screenshot + diff vs Figma)
- WCAG 2.1 AA accessibility audit
- Story writing (`*.stories.ts`)
- Test writing (`*.spec.tsx`)
- Integration checking (exports, types, where used)

This skill defines the **standard dispatch pattern** so all orchestrators behave identically and so adding/removing a subagent only requires one edit here.

**Pre-condition for invocation**: the component must render without console errors in Storybook on `http://localhost:6007`. If it does not, fix that first and re-invoke this skill afterwards.

## When to invoke

| Orchestrator | When | Subagent set |
|---|---|---|
| `new-component` | After Step 6 (Implement) and before Step 9 (Verification) | full-5 |
| `redesign-component` | After Phase 5 (Core build update) and before Phase 7 (Aggregate fixes) | full-5 |
| `refactor-component` | After Step 4 (Apply changes) and before Step 6 (Visual regression) | refactor-3 |
| `custom-component` | After Step 7 (Implementation) and before Step 9 (Verification) | full-5 |
| `modify-component` (variant add) | After variant CSS+TSX done, before final QA | modify-2 |

## Subagent sets

### full-5 (new + redesign + custom)

```
pixel-perfect-verifier   (read-only)
a11y-verifier            (read-only)
story-writer             (writes *.stories.ts | reports)
test-writer              (writes *.spec.tsx   | reports)
integration-checker      (read-only)
```

### refactor-3 (refactor, no new variants/sizes)

```
pixel-perfect-verifier   (read-only)  — vs pre-refactor baseline
a11y-verifier            (read-only)  — regression check
integration-checker      (read-only)  — exports unchanged?
```

### modify-2 (single variant or prop addition)

```
pixel-perfect-verifier   (read-only)  — vs Figma for the new variant
story-writer             (writes added story rows | reports)
```

## Modes

The orchestrator reads `--write-mode` from its invocation argument (default: `parallel-write`).

| Mode | Default | Behavior |
|---|---|---|
| `parallel-write` | ✅ | `story-writer` and `test-writer` write to `*.stories.ts` and `*.spec.tsx` respectively. Read-only subagents (pixel-perfect-verifier, a11y-verifier, integration-checker) operate normally. Main agent NEVER touches `*.stories.ts` or `*.spec.tsx` during this phase. |
| `read-only` | Fallback (safe) | ALL subagents are read-only. `story-writer` and `test-writer` produce drafts in their reports; main agent applies them sequentially after aggregation. |

**When to fall back to `read-only`**:

- Pattern is new and unproven for this component family.
- A previous `parallel-write` run produced a conflict or invalid file.
- Debugging a specific subagent's output.

## Dispatch pattern (single message, parallel)

The orchestrator dispatches subagents using the `Agent` tool with multiple parallel tool calls in a SINGLE message. Example:

```
[full-5, parallel-write mode]

Agent(description="Pixel-perfect verify cor-button", subagent_type="pixel-perfect-verifier", prompt="...")
Agent(description="A11y verify cor-button",         subagent_type="a11y-verifier",          prompt="...")
Agent(description="Write stories for cor-button",   subagent_type="story-writer",           prompt="... --write-mode=parallel-write ...")
Agent(description="Write tests for cor-button",     subagent_type="test-writer",            prompt="... --write-mode=parallel-write ...")
Agent(description="Integration check cor-button",   subagent_type="integration-checker",    prompt="...")
```

**All five Agent tool calls go in ONE assistant message** so they run in parallel.

## Subagent prompt template

For each subagent, the orchestrator's prompt MUST include:

1. **Component identifier**: `cor-<name>` (the folder under `src/components/`)
2. **Storybook URL**: `http://localhost:6007` (assume running; subagent verifies)
3. **Figma reference**: node ID or URL when relevant (pixel-perfect, story-writer)
4. **Component contract**: brief summary of props/slots/events (paste from TSX `@Prop()` declarations)
5. **Write mode**: `parallel-write` or `read-only` (for writers only)
6. **Acceptance criteria**: what counts as a pass (e.g., diff < 0.5%, zero a11y violations, coverage > 80%)

Each subagent's own agent file documents its specific I/O contract — this skill only describes how the orchestrator drives them.

## Non-overlapping file ownership (parallel-write mode)

| Subagent | Writes to | Forbidden from |
|---|---|---|
| `story-writer` | `src/components/cor-<name>/cor-<name>.stories.ts` | TSX, CSS, tokens, spec |
| `test-writer` | `src/components/cor-<name>/test/cor-<name>.spec.tsx` | TSX, CSS, tokens, stories |
| `pixel-perfect-verifier` | nothing | always read-only |
| `a11y-verifier` | nothing | always read-only |
| `integration-checker` | nothing | always read-only |

Main orchestrator NEVER writes to `*.stories.ts` or `*.spec.tsx` while the subagents are running. After they complete, the orchestrator may edit those files for fix-up (e.g., adding a missing story for an a11y-flagged state), but the bulk of the content comes from the subagents.

## Aggregation (Phase 4 of orchestrator)

After all subagents return, the orchestrator collects findings into a **single triage table**:

```text
| Source            | Severity   | Finding                                              | Action |
|-------------------|------------|------------------------------------------------------|--------|
| pixel-perfect     | critical   | Default state diff 2.3% — color off                  | Fix CSS |
| pixel-perfect     | warning    | Hover state diff 0.6% — shadow softer in Figma       | Defer to QA |
| a11y              | critical   | Focus ring 2.1:1 contrast (need 3:1)                 | Update token |
| a11y              | warning    | Disabled element missing aria-disabled               | Fix TSX |
| story-writer      | info       | Generated 6 stories: Default, Variants, Sizes, ...   | Verify |
| test-writer       | info       | Coverage 86%, 12 tests, WCAG contract assertions added | Verify |
| integration       | warning    | Used in src/app/login.tsx — variant `primary` only   | Note in PR |
```

**Severity rules**:

- `critical` — blocks completion (functional defect, a11y violation, > 0.5% pixel diff)
- `warning` — fix recommended before PR but not blocking
- `info` — informational, no action

## Conflict resolution

If two subagents recommend contradictory changes (rare but possible):

1. **Token > CSS > TSX** — fixes propagate upstream. If a11y says "darker text" and pixel-perfect says "lighter text matches Figma", check the token's intent — Figma is the source of truth for visuals, but a11y trumps Figma if WCAG would fail.
2. **a11y always wins** in WCAG 2.1 AA failures — escalate to user if Figma design itself fails WCAG.
3. **Read-only beats write** — if `a11y-verifier` flags an issue that requires changing a prop that `story-writer` already stubbed in a story, the orchestrator fixes the prop and updates the story (or has story-writer re-run).

## After aggregation

Main orchestrator:

1. Applies critical fixes (TSX, CSS, tokens) — these are main-agent's exclusive territory.
2. If any subagent's output needs revision (e.g., story-writer missed a state), the orchestrator either:
   - Edits the file directly (small fix), OR
   - Re-dispatches the writer subagent with refined prompt (large fix).
3. Re-screenshots the affected states (pixel-perfect re-verify on just the changed states).
4. Records the aggregated triage table in the final report.

## Token economy notes

- Subagents run on `sonnet` (cheap, focused), not `opus`. Save opus for the orchestrator's reasoning.
- Each subagent's context is bounded — they only read what they need (their own file path scope + Storybook URL).
- Parallel dispatch increases TOTAL tokens (5 contexts) but reduces wall-clock time and **avoids the orchestrator burning context on every aux file**.

## Verification

Before claiming the parallel phase complete, the orchestrator runs `verification-before-completion` and confirms:

- ✅ Every subagent returned a report (no crashes, no timeouts).
- ✅ All `critical` findings have been addressed (fix applied + re-verified).
- ✅ All written files (`*.stories.ts`, `*.spec.tsx`) pass `yarn lint`.
- ✅ `*.stories.ts` renders in Storybook (no console errors).
- ✅ `*.spec.tsx` passes `yarn test`.

## Generated-file safety in parallel worktrees

When N worktrees (3-5 per Cline Kanban session) each run `yarn sp.build`, they all regenerate `src/components.d.ts`, per-component `readme.md`, `.storybook/custom-elements.json`, and `tokens/generated/**`.

These paths are governed by:

- `.gitattributes` `merge=ours` -> cross-branch merges silently keep the current branch's version (no conflict markers).
- `.husky/pre-commit` GENERATED_PATTERNS block -> auto-unstages these paths so a stray `git add -A` is harmless.
- `.github/workflows/ci.yml` `Validate (PR)` job -> rebuilds and `git diff --exit-code` verifies the committed snapshot matches a fresh build. This is the single canonical regeneration point.

**Subagent contract:** subagents must NEVER add these paths to commits. If a subagent reports "regenerated N files" it is informational only — the pre-commit hook will discard them before they enter history. Subagents must NEVER hand-edit `components.d.ts` or any other auto-generated file.

If you see conflict markers (`<<<<<<<`) in any of these files locally, treat it as a bug in the merge driver setup — run `node scripts/git/setup-merge-drivers.mjs` and `git check-attr merge -- src/components.d.ts` (expect `merge: ours`). See `AGENTS.md` -> "Merge driver for auto-generated files".

## Failure modes

| Symptom | Likely cause | Recommended action |
|---|---|---|
| Subagent timeout | Storybook not running on 6007 | Start `yarn sp.dev.watch` and retry |
| `story-writer` produces JSX errors | Mismatch between TSX prop types and CSF3 expectations | Fall back to `read-only`, hand-write the failing story |
| Two subagents edit the same file | `parallel-write` violated non-overlap rule | This is a bug — file an issue; fall back to `read-only` |
| Pixel-perfect FAIL on every state | Figma reference image stale or wrong node | Re-extract Figma node and re-run |
| A11y FAIL but Figma matches | Figma design itself fails WCAG | Escalate to user; design fix needed, not code fix |
