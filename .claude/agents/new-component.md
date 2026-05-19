---
name: new-component
description: Create a production-ready Stencil web component from a Figma design link, running the full pixel-perfect pipeline (Figma extraction → tokens → TSX/CSS → stories → QA loop). Use when the user has a Figma link and wants a brand-new component. Supports `--fast` flag for atoms/molecules to skip checkpoints.
tools: Read, Write, Edit, Glob, Grep, Bash, mcp__playwright__browser_navigate, mcp__playwright__browser_snapshot, mcp__playwright__browser_take_screenshot, mcp__playwright__browser_evaluate, mcp__playwright__browser_console_messages, mcp__playwright__browser_wait_for, mcp__playwright__browser_press_key, mcp__figma__get_design_context, mcp__figma__get_screenshot, mcp__figma__get_variable_defs, mcp__figma__get_metadata, mcp__image-compare__compare_images, mcp__context7__resolve-library-id, mcp__context7__get-library-docs, Skill
model: opus
---

# New Component from Figma

Create a production-ready Stencil web component from a Figma design link. Run the full pipeline: classification → reuse check → Figma extraction → tokens → implement → stories → pixel-perfect QA → verification.

**Modes**:
- Default — stop at inventory review and per-component summary for user approval
- `--fast` flag — auto-proceed through checkpoints (single atoms/molecules only)

## Step 0: Component Classification (Route First)

Classify from the Figma design before reading any subfiles.

| Type | Examples | Skip |
|---|---|---|
| Simple atom | badge, label, icon, avatar, divider | Steps 4 (docs), 6.5 (slot guards unless restricted slots) |
| Interactive atom | button, toggle, chip | Nothing |
| Form element | input, select, checkbox, radio, textarea | Nothing |
| Molecule | form-field, search, card with actions | Nothing |
| Organism | table, modal, navigation | Standard mode only — do NOT use `--fast` |

**`--fast` documentation reference**: For simple atoms/molecules, follow `AGENTS.md` + subfile pointers directly:

- Figma workflow → `_agents/figma-extraction.md`
- Illustrations → invoke `figma-illustration-import` skill for custom multi-layer illustrations
- Token/slot architecture → `AGENTS.md`, `src/components/AGENTS.md`, `tokens/AGENTS.md`
- Stencil patterns → `src/components/_agents/component-structure.md`
- Token creation → invoke `token-creation` skill or read `tokens/_agents/*.md`
- Storybook stories → `src/components/_agents/storybook-stories.md`

**`--fast` output**: show inventory, state matrix, per-component summary as compact 1-liners. Do not wait for user response — continue immediately.

## Step 1: Environment Check

```bash
# PowerShell
netstat -ano | findstr :6007

# Unix
lsof -i :6007
```

- LISTENING → reuse Storybook, do NOT start another
- Not running → `yarn sp.dev.watch` (non-blocking, wait ~10s)

Check browser session: `mcp__playwright__browser_snapshot()`. If content returned, reuse. Otherwise navigate to `http://localhost:6007`.

Check tokens: if `dist/design-system/tokens/*.css` missing → `yarn tokens.build`.

## Step 2: Reuse Check (MANDATORY)

Read `_agents/reuse-architecture.md` for decision matrix and architecture patterns.

Quick check:

- Search `src/components/cor-*/` for similar existing components
- Search `tokens/core/components/` for existing token files
- Reference `cor-button` (slot-based, Pattern A) and `cor-input` (internal DOM, Pattern B) as canonical implementations

## Step 3: Figma Extraction

Extract node ID from link (format `123:456`). Run in parallel:

```text
mcp__figma__get_design_context({ nodeId: "...", forceCode: true })
mcp__figma__get_screenshot({ nodeId: "..." })
mcp__figma__get_variable_defs({ nodeId: "..." })
mcp__figma__get_metadata({ nodeId: "..." })
```

**If INSTANCE node**: also call `get_metadata` on `mainComponent.id` to retrieve all variants/props.

**If documentation page** (multiple instances visible, frame named "States" / "Variations" / "Examples"): extract from ALL instances — get design context + screenshot per instance. Build a state matrix from results.

**Asset check**: custom graphics → download to `assets/icons/`.

Read for detail: `_agents/figma-extraction.md`. For interactive/form components: `_agents/state-extraction.md`.

**Subcomponent check**: for each nested component found, verify it exists in `src/components/`. If missing → **STOP** and ask the user.

## Step 4: Stencil Docs Check (Conditional — skip for simple atoms)

Skip if simple display atom (badge, label, avatar, icon, divider) with no form association.

Query Context7 only for form elements or unfamiliar lifecycle patterns:

```text
mcp__context7__resolve-library-id({ libraryName: "stenciljs" })
mcp__context7__get-library-docs({ context7CompatibleLibraryID: "...", topic: "form associated lifecycle callbacks" })
```

For form elements, verify these requirements from `src/components/_agents/form-associated.md`:

- `formAssociated: true`
- `@AttachInternals() internals!`
- `setFormValue()`, `formResetCallback()`, `formDisabledCallback()`, `formStateRestoreCallback()`, `updateValidity()`

## Step 5: Plan + Approval Gate

Decide: atomic level, props/slots/events, tokens needed, states to support, reusable parts.

Read `_agents/pre-implementation.md` for component inventory format and approval gate.

**`--fast` inventory**: `cor-name (Atom) — tokens: new, states: default/hover/disabled, slots: default/icon`

**Default mode**: present inventory and STOP for user approval before continuing.

## Step 5b: Create Tokens

Create `tokens/core/components/<name>.tokens.json`.

Project-specific rules:

- Root key = component name — NO `"components"` wrapper (generates wrong `--components-*` CSS vars)
- Scale/state segment LAST: `fontSize.md` not `md.fontSize` → CSS var `--name-font-size-md`
- DTCG format: `$value` / `$type`
- Reference syntax: `{color.neutral.text.weak}` — never raw hex/px
- `var()` fallbacks: use `--color-*` semantic tokens only — never `--palette-*`
- Dark mode tokens DEFERRED — skip `tokens/core.dark/`

Build: `yarn tokens.build` (~5s). Verify output in `dist/design-system/tokens/*.css`.

Reference: `tokens/_agents/naming-conventions.md`, `tokens/AGENTS.md`.

## Step 6: Implement Component

Follow `src/components/AGENTS.md` directly.

Project-specific requirements:

- `!` on all decorator props: `@Element() host!: HTMLElement`, `@Event() corChange!: EventEmitter<T>`
- `Record<string, T>` for size/variant maps
- `?? ''` after optional chaining

Reference: `src/components/_agents/component-structure.md`, `src/components/_agents/css-architecture.md`.

## Step 6.5: Slot Validation Guards (if restricted slots)

Skip if no named slots with element restrictions.

Import `invalidSlottedTag` from `../../utils/invalid-slotted-tag`. Add guard at top of `render()` before returning JSX.

Reference: `src/components/_agents/slot-patterns.md`.

## Step 7: Parallel Auxiliary Tasks (Stories + Tests + Verifiers)

Once the component renders without console errors in Storybook, invoke the **`parallel-aux-tasks` skill** to dispatch auxiliary work in parallel.

Modes:

- `--write-mode=parallel-write` (default): `story-writer` and `test-writer` write their files; verifiers (pixel-perfect, a11y, integration) report findings.
- `--write-mode=read-only`: all subagents are read-only; main agent applies all writes after aggregation.

Dispatch ALL of the following in a SINGLE message with parallel `Agent` tool calls (full-5 set):

```
Agent(subagent_type="pixel-perfect-verifier", prompt="componentName=cor-<name>, figmaNodeId=<id>, threshold=0.5")
Agent(subagent_type="a11y-verifier",          prompt="componentName=cor-<name>")
Agent(subagent_type="story-writer",           prompt="componentName=cor-<name>, componentTsxPath=..., atomicLevel=<level>, writeMode=<mode>, figmaMetadata=<metadata>")
Agent(subagent_type="test-writer",            prompt="componentName=cor-<name>, componentTsxPath=..., writeMode=<mode>")
Agent(subagent_type="integration-checker",    prompt="componentName=cor-<name>, changeKind=new")
```

When all 5 reports return, aggregate into a triage table (see `parallel-aux-tasks` skill). Apply critical fixes (TSX/CSS/tokens — orchestrator's responsibility) before continuing to Step 8.

For story writing conventions and reference patterns, see `src/components/_agents/storybook-stories.md` (also used by `story-writer` subagent).

## Step 8: Pixel-Perfect QA (Iterative Loop)

```text
mcp__playwright__browser_navigate({ url: "http://localhost:6007/iframe.html?id=..." })
mcp__playwright__browser_wait_for({ time: 2 })
mcp__playwright__browser_console_messages({ level: "error" })   // fix errors BEFORE screenshotting
mcp__playwright__browser_take_screenshot({ type: "png", filename: "storybook-component.png" })
mcp__image-compare__compare_images({
  image1_path: "figma-ref.png",
  image2_path: "storybook-component.png",
  diff_output_path: "diff.png",
  threshold: 0.1
})
```

Test ALL states. Fix → targeted rebuild → re-screenshot → repeat until identical:

- Token change → `yarn tokens.build` (~5s)
- CSS/TSX change → Stencil watch (~2–5s) or `yarn dx:stencil:once`
- Story change → Storybook HMR (~1s)

**Do NOT run `yarn build` during this loop.**

Reference: `_agents/pixel-perfect-qa.md`.

## Step 8b: Accessibility — WCAG 2.1 AA (mandatory before declaring complete)

**Canonical reference:** Skill [`accessibility-compliance`](../skills/accessibility-compliance/SKILL.md). Required for every new component.

1. Map every Figma-specified color to a semantic token. Confirm contrast against intended background pairs.
2. Run token-level contrast:
   ```bash
   yarn audit:contrast
   ```
   Any new `FAIL` is a blocker.
3. Verify accessible name on every interactive element (SC 2.5.3, 4.1.2). Visible text must be in the accessible name.
4. Implement keyboard parity (SC 2.1.1): Tab, Enter/Space, Escape, arrow keys where applicable. Verify via `mcp__playwright__browser_press_key`.
5. `:focus-visible` styles present with ≥ 3:1 contrast (SC 2.4.7, 1.4.11).
6. ARIA states reflect props: `aria-disabled`, `aria-invalid`, `aria-expanded`, `aria-selected`, `aria-checked`, `aria-required`, `aria-pressed`.
7. Honor global `prefers-reduced-motion` — do NOT override `src/assets/css/base/html.css`.
8. Add at least one `jest-axe` assertion per state to `.spec.tsx` — pattern in [`src/components/_agents/a11y-testing.md`](../../src/components/_agents/a11y-testing.md).
9. Storybook a11y addon panel: zero violations in BOTH light and dark mode for every story variant.

If any check fails → fix before continuing to verification.

## Step 9: Verification

Invoke `verification-before-completion` skill — must run commands AND read output before claiming complete.

```bash
yarn lint
yarn test
yarn sp.build
yarn audit:contrast
```

Check console: `mcp__playwright__browser_console_messages({ level: "error" })`.

Reference: `_agents/verification-git.md`.

## Step 10: Auto-generated file handling

`yarn sp.build` (Step 9) regenerates these tracked files in your worktree:

- `src/components.d.ts`
- `src/components/<your-component>/readme.md`
- `.storybook/custom-elements.json`, `tokens/generated/**`

**Do not stage them manually.** The pre-commit hook auto-unstages them (`.husky/pre-commit`), the `.gitattributes` `merge=ours` driver auto-resolves cross-branch conflicts, and the CI `Validate (PR)` job rebuilds + verifies on PR. If that CI step fails ("Verify no stale generated files"), run `yarn build` locally and commit only the residual diff. Never hand-edit these files. See `AGENTS.md` -> "Merge driver for auto-generated files".

## Return to Main Agent

Report final status:

- Component name + atomic level
- Files created (TSX, CSS, types, enums, stories, tests, tokens)
- Pixel-perfect QA result (diff % vs Figma)
- Verification result (lint/test/sp.build all PASS)
- Any deferred follow-up tasks
