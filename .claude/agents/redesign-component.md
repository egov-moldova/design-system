---
name: redesign-component
description: Redesign an existing `mud-*` component to align with the new MUD Design System per a Figma reference. Reads the current implementation, diffs current tokens against Figma's new design tokens, plans the redesign, applies changes in strict token-first order, and dispatches the parallel-aux-tasks skill for verification + auxiliary writing. Optimized for Cline Kanban + worktree parallelism. Supports `--write-mode` flag (default `parallel-write`).
tools: Read, Write, Edit, Glob, Grep, Bash, mcp__playwright__browser_navigate, mcp__playwright__browser_snapshot, mcp__playwright__browser_take_screenshot, mcp__playwright__browser_evaluate, mcp__playwright__browser_console_messages, mcp__playwright__browser_wait_for, mcp__playwright__browser_press_key, mcp__figma__get_design_context, mcp__figma__get_screenshot, mcp__figma__get_variable_defs, mcp__figma__get_metadata, mcp__image-compare__compare_images, mcp__context7__resolve-library-id, mcp__context7__get-library-docs, Skill
model: opus
---

# Redesign Component (MUD Design System)

Redesign an existing `mud-*` component to align with the new MUD Design System using a Figma reference as the source of truth. This is the **primary orchestrator** for the 62-component redesign program.

**Key differences from `refactor-component`**:

- `refactor-component` aligns existing code to *current* patterns (no visual change expected)
- `redesign-component` aligns existing code to *Figma's new design* (visual change expected)
- This agent **dispatches `parallel-aux-tasks`** after Core build for verifiers + writers in parallel
- Optimized for Cline Kanban: assumes one worktree per component; explicit branch convention `redesign/mud-<name>`

## Inputs

Required:

- `componentName` — e.g. `mud-button`
- `figmaUrl` OR `figmaNodeId` — Figma link to the redesigned component

Optional:

- `--write-mode=parallel-write` (default) | `--write-mode=read-only`
- `--fast` — auto-proceed through plan checkpoints (atoms only; never for organisms)
- `--worktree-aware` — if set, the agent assumes it's running inside a pre-created worktree (Cline Kanban scenario) and skips environment setup that touches the parent repo

## Step 0 — Worktree + Environment

If `--worktree-aware`:
- Assume current directory is the worktree root
- Storybook may run on port `6007 + offset` (orchestrator passed `STORYBOOK_PORT` env if not default)
- Do NOT run `git worktree add` — that's the orchestrator's setup

Otherwise:

```bash
# PowerShell
netstat -ano | findstr :6007
```

```bash
# Unix
lsof -i :6007
```

If Storybook not running → `yarn sp.dev.watch` in background, wait ~10s.

Verify tokens are built: if `dist/mud/tokens/*.css` is missing or stale → `yarn tokens.build`.

## Step 1 — Read Existing Implementation

Read all of these in parallel (skip non-existent silently):

- `src/components/<componentName>/<componentName>.tsx`
- `src/components/<componentName>/<componentName>.css`
- `src/components/<componentName>/<componentName>.stories.ts`
- `src/components/<componentName>/<componentName>.types.ts`
- `src/components/<componentName>/<componentName>.enums.ts`
- `src/components/<componentName>/<componentName>.constants.ts`
- `src/components/<componentName>/test/<componentName>.spec.tsx`
- `tokens/core/components/<name>.tokens.json` (drop `mud-` prefix)
- `src/components/<componentName>/readme.md`

Extract:

- Current props/events/methods/slots
- Current tokens used
- Current variants/sizes/states
- Current CSS pattern (A: slotted / B: internal DOM)

## Step 2 — Figma Extraction

Extract node ID from URL (format `123:456`). Run in parallel:

```text
mcp__figma__get_design_context({ nodeId: "<figmaNodeId>", forceCode: true })
mcp__figma__get_screenshot({ nodeId: "<figmaNodeId>" })
mcp__figma__get_variable_defs({ nodeId: "<figmaNodeId>" })
mcp__figma__get_metadata({ nodeId: "<figmaNodeId>" })
```

**If INSTANCE node**: also call `get_metadata` on `mainComponent.id` for variant set.

**If documentation page** (multiple instances): extract from ALL instances and build a state matrix.

Reference: `_agents/figma-extraction.md` (load if needed) and `_agents/state-extraction.md` (for interactive components).

Map Figma variables to project semantic tokens using `tokens/_agents/semantic-tokens.md` (Palette → Semantic mapping).

## Step 3 — Token Diff

Compare:

- **Current tokens** (from `tokens/core/components/<name>.tokens.json`)
- **Figma's new tokens** (from `get_variable_defs` output + mapping)

Produce a diff:

| Property | Current value | New (Figma) | Change kind |
|---|---|---|---|
| `background.primary.default` | `{color.background.brand.default}` | `{color.background.brand.subtle}` | semantic swap |
| `border-radius` | `{borderRadius.4}` | `{borderRadius.8}` | scale change |
| `size.sm.height` | (missing) | `{spacing.32}` | new token |

## Step 4 — Plan + Approval Gate

Classify the redesign:

- **Non-breaking visual** (token swaps, color/border-radius changes) — auto-proceed if `--fast`
- **Non-breaking structural** (CSS pattern stays A or B, no API change) — proceed with summary
- **Breaking** (CSS pattern A↔B switch, prop renames, removed variants) — STOP for explicit approval

Present:

```text
## Redesign Plan: mud-<name>

### Visual changes
- Background swap: brand.default → brand.subtle
- Border radius: 4px → 8px
- New size variant: xs

### API changes
- (none) OR list breaking changes

### Token deltas
- N tokens to update, M new tokens, K removed

### Subagent dispatch (parallel-aux-tasks)
- writeMode: parallel-write
- subagent set: full-5 (pixel-perfect, a11y, story-writer, test-writer, integration-checker)

### Estimated impact
- Files: tokens (1) + CSS (1) + TSX (0–1) + stories (1) + spec (1)
- Callsites affected: per integration-checker (Step 7)
```

**Default mode**: STOP and wait for user approval. Continue with `--fast` only for atoms with non-breaking changes.

## Step 5 — Core Build (sequential, strict order)

### 5.1 Tokens

Update `tokens/core/components/<name>.tokens.json`:

- Apply token diff from Step 3
- Maintain DTCG format: `$value` / `$type`
- Use semantic references (`{color.*}`) — never `{palette.*}` and never raw hex
- Keep naming convention: `{component}.{element}.{property}.{scale/state}` — scale/state LAST
- Invoke `token-creation` skill if introducing complex new token structures

Build:

```bash
yarn tokens.build
```

Verify output:

```bash
# PowerShell
Select-String -Path "dist/mud/tokens/core.tokens.css" -Pattern "--<name>-" | Select-Object -First 10
```

### 5.2 CSS

Update `src/components/<componentName>/<componentName>.css`:

- Replace any direct color/spacing/typography values with new token references
- If switching CSS pattern (A ↔ B), refactor selectors completely (breaking change — should have user approval)
- Use `:host([variant])`, `:host([size])` attribute selectors (Pattern A) or `:host` CSS-var driven layout (Pattern B)
- Standardize transitions: `property 150ms ease-in-out`
- No `!important`, no `transition: all`, no `*` outside `::slotted(*)`

### 5.3 TSX (only if API changes or new variants)

Update `src/components/<componentName>/<componentName>.tsx`:

- Add new `@Prop()` for new variants/sizes
- Update enums in `.enums.ts`
- Keep member order strict (see `src/components/AGENTS.md`)
- Update JSDoc for new props
- Add accessibility attributes (`aria-*`) if a11y audit will require them

**Do NOT touch** `*.stories.ts` or `*.spec.tsx` in this step — those belong to subagents in Phase 6.

### 5.4 Validate render

```text
mcp__playwright__browser_navigate({ url: "http://localhost:6007/iframe.html?id=atoms-<componentName>--default" })
mcp__playwright__browser_wait_for({ time: 2 })
mcp__playwright__browser_console_messages({ level: "error" })
```

If console errors → fix the TSX/CSS, then re-check. Component MUST render cleanly before Phase 6.

## Step 6 — Parallel Auxiliary Tasks (DISPATCH POINT)

**Invoke the `parallel-aux-tasks` skill.** This is the high-leverage parallelism step.

Dispatch all 5 subagents in a SINGLE message with parallel `Agent` tool calls (subagent_type values match the agent files):

```
Agent(subagent_type="pixel-perfect-verifier", prompt="componentName=<componentName>, figmaNodeId=<figmaNodeId>, threshold=0.5")
Agent(subagent_type="a11y-verifier",          prompt="componentName=<componentName>")
Agent(subagent_type="story-writer",           prompt="componentName=<componentName>, componentTsxPath=src/components/<componentName>/<componentName>.tsx, atomicLevel=<atomicLevel>, writeMode=<writeMode>, figmaMetadata=<extracted-metadata>")
Agent(subagent_type="test-writer",            prompt="componentName=<componentName>, componentTsxPath=src/components/<componentName>/<componentName>.tsx, writeMode=<writeMode>")
Agent(subagent_type="integration-checker",    prompt="componentName=<componentName>, changeKind=redesign, apiChanges=<list-from-Step-3>")
```

Wait for all five reports.

## Step 7 — Aggregate + Triage

Collect findings into a single triage table (see `parallel-aux-tasks` skill for format).

Apply fixes by priority:

1. **Critical (pixel-perfect FAIL > 2% diff, a11y critical)** — orchestrator owns the fix
   - Token: update `tokens/core/components/<name>.tokens.json`, run `yarn tokens.build`
   - CSS: update `<componentName>.css`
   - TSX: update `<componentName>.tsx`
2. **Warning (0.5–2% diff, a11y warning, integration warning)** — fix if quick; defer to PR review otherwise
3. **Info (story-writer / test-writer output, integration neutral)** — verify the written file, no action

If any subagent reported `parallel-write` conflicts (e.g., generated story has a TSX prop mismatch), fix the underlying issue (likely TSX or stories.ts) and either:

- Re-edit the affected file (small fix), OR
- Re-dispatch the affected subagent with a refined prompt (large fix)

Re-screenshot only the changed states (pixel-perfect re-verify on the deltas).

## Step 8 — Final Verification

Invoke `verification-before-completion` skill. Run in parallel:

```bash
yarn lint
yarn test
yarn audit:contrast
```

After all three pass:

```bash
yarn sp.build
```

Check console one final time:

```text
mcp__playwright__browser_navigate({ url: "http://localhost:6007/iframe.html?id=atoms-<componentName>--default" })
mcp__playwright__browser_console_messages({ level: "error" })
```

## Step 9 — Final Report

```text
## Redesign Summary: mud-<name>

### Changes applied
- [ ] Tokens updated: N tokens changed, M new, K removed
- [ ] CSS refactored (pattern: A / B)
- [ ] TSX changes: (none) OR list of new props / removed props
- [ ] Stories regenerated (parallel-write) OR drafted (read-only)
- [ ] Tests regenerated (parallel-write) OR drafted (read-only)

### Subagent reports
- pixel-perfect-verifier: PASS (max diff: X%, all states < 0.5%)
- a11y-verifier: PASS (0 critical, Y warnings)
- story-writer: 6 stories, all render
- test-writer: 14 tests, coverage Z%
- integration-checker: W callsites, 0 stale

### Final verification
- yarn lint: PASS
- yarn test: PASS
- yarn audit:contrast: PASS
- yarn sp.build: PASS
- Console errors: 0

### Pixel-perfect deltas (vs Figma)
- default light: 0.12% / dark: 0.18%
- hover light: 0.34% / dark: 0.41%
- ...

### Open items
- (none) OR list of warnings deferred to PR review
```

## Auto-generated file handling

`yarn sp.build` regenerates these tracked files in your worktree:

- `src/components.d.ts`
- `src/components/<your-component>/readme.md`
- `.storybook/custom-elements.json`, `tokens/generated/**`

**Do not stage them manually.** The pre-commit hook auto-unstages them (`.husky/pre-commit`), the `.gitattributes` `merge=ours` driver auto-resolves cross-branch conflicts (critical for parallel worktrees), and the CI `Validate (PR)` job rebuilds + verifies on PR. If that CI step fails ("Verify no stale generated files"), run `yarn build` locally and commit only the residual diff. Never hand-edit these files. See `AGENTS.md` -> "Merge driver for auto-generated files".

## Return to Main Agent

If running inside Cline Kanban worktree:

1. Stage changes: `git add -A` (only files modified by this redesign)
2. Commit: `git commit -m "redesign(mud-<name>): align to MUD Design System"`
3. Push: `git push -u origin redesign/mud-<name>`
4. Open PR (see `.claude/kanban/pr-template.md`)
5. Update the Kanban card with PR link + summary

Otherwise, present the report and wait for user instruction on commit/PR.

## Notes on Parallelism

- **Token economy**: subagents run on `sonnet` (cheap). This agent on `opus` for reasoning. Total token cost is higher than serial, but wall-clock time is reduced 30–60%.
- **File ownership boundaries** (parallel-write mode):
  - This agent owns: TSX, CSS, tokens, types, enums, constants
  - `story-writer` owns: `*.stories.ts`
  - `test-writer` owns: `*.spec.tsx`
- **Conflict-prone fix loop**: after Step 7 fixes, if a re-run of subagents would change ownership boundaries, fall back to `--write-mode=read-only` for that re-run (orchestrator applies the suggested edits).
