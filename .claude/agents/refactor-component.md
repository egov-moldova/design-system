---
name: refactor-component
description: Refactor an existing component to align with latest AGENTS.md patterns. Runs audit first, captures baseline screenshots, then applies changes in strict token-first order with regression checks. Requires explicit approval for breaking changes. Use for code smells, outdated patterns, member-order violations.
tools: Read, Write, Edit, Glob, Grep, Bash, mcp__playwright__browser_navigate, mcp__playwright__browser_snapshot, mcp__playwright__browser_take_screenshot, mcp__playwright__browser_evaluate, mcp__playwright__browser_console_messages, mcp__playwright__browser_wait_for, mcp__image-compare__compare_images, Skill
model: opus
---

# Refactor Component

Refactor an existing component to align with latest patterns from `AGENTS.md`. Audit first → baseline → categorize → approval gate (if breaking) → apply (token-first order) → regression check → verify.

## Step 1: Run Audit First

Invoke `/audit-component` (or follow `audit-component.md` steps inline) on the target component. Wait for the audit report before proceeding.

## Step 1.5: Capture Pre-Refactor Baseline

Capture baseline screenshots of all states **before any changes**:

```text
mcp__playwright__browser_navigate({ url: "http://localhost:6007/iframe.html?id=...--default" })
mcp__playwright__browser_wait_for({ time: 2 })
mcp__playwright__browser_take_screenshot({ type: "png", filename: "pre-refactor-default.png" })

// Repeat for each state: hover, disabled, invalid, etc.
mcp__playwright__browser_take_screenshot({ type: "png", filename: "pre-refactor-{state}.png" })
```

These screenshots are the regression baseline for Step 6.

## Step 2: Stencil Best Practices Check

1. Determine if component is a form element (input, select, textarea, checkbox, radio, toggle).
2. If form element, verify Stencil form-associated requirements (see `src/components/_agents/form-associated.md`):
   - `formAssociated: true` in `@Component`
   - `@AttachInternals() internals!: ElementInternals`
   - `internals.setFormValue()` called in handlers
   - Lifecycle callbacks: `formResetCallback`, `formDisabledCallback`, `formStateRestoreCallback`
   - `updateValidity()` method for HTML5 validation sync
3. If missing form association → add to refactor plan as CRITICAL.

## Step 3: Categorize Findings

Categorize audit findings:

1. **Breaking changes** → flag for Human Approval Gate (prop renames, event changes, slot restructuring)
2. **Non-breaking improvements** → safe to apply (member reorder, CSS refactor, token migration)
3. **Style-only changes** → safe, apply in batch (formatting, naming, comments)
4. **Stencil compliance** → form association, lifecycle callbacks (CRITICAL for form elements)

Present categorized list and **wait for approval** on which items to address.

## Step 3.5: Human Approval Gate (if breaking changes)

If any breaking changes were identified:

**STOP** — present:

- What changes would break existing consumers
- Migration path for consumers
- Whether a version bump is needed

Do NOT proceed with breaking changes without explicit approval.

## Step 4: Apply Changes — Token-First Order

Strict dependency order:

1. **Tokens** → update/create `tokens/core/components/<name>.tokens.json`
   - Remove hardcoded values
   - Add missing token references
   - Fix naming convention: `{component}-{element}-{property}-{scale/state}`
   - DTCG format: `$value` / `$type`
   - Dark mode DEFERRED — skip `tokens/core.dark/`
2. **Build tokens**: `yarn tokens.build`
3. **CSS** → refactor `cor-<name>.css`
   - Switch to correct pattern (A: Slotted or B: Internal DOM)
   - Replace hardcoded values with `var(--token-name)`
   - Replace `var(--palette-*)` fallbacks with `--color-*` semantic equivalents
   - Replace direct `var(--palette-*)` usages with `--color-*` semantic tokens
   - See `tokens/AGENTS.md` for full palette→semantic mapping table
   - Fix selector patterns (`:host([attr])` over class toggling)
   - Standardize transitions to `property 150ms ease-in-out`
4. **TSX** → refactor `cor-<name>.tsx`
   - Reorder members to match convention
   - Add `{ reflect: true }` to visual props
   - Add missing JSDoc
   - Fix event naming to `cor` prefix
   - Add proper TypeScript types (remove `any`)
5. **Types/Enums** → create or update `.types.ts` and `.enums.ts`
   - Extract string literals into enums
   - Create interfaces for event payloads
6. **Stories** → update `cor-<name>.stories.ts`
   - Switch to CSF3 if not already
   - Use `@storybook/web-components-vite` imports
   - Add missing story variants (AllVariants, AllSizes, States)
7. **Tests** → update `test/cor-<name>.spec.tsx`
   - Add missing test coverage identified by audit

## Step 4.5: Parallel Auxiliary Tasks (refactor-3 set)

Once the refactored component renders without console errors, invoke the **`parallel-aux-tasks` skill** with the **refactor-3** subagent set:

```
Agent(subagent_type="pixel-perfect-verifier", prompt="componentName=cor-<name>, figmaNodeId=<id-if-available>, threshold=0.5, useBaseline=true")
Agent(subagent_type="a11y-verifier",          prompt="componentName=cor-<name>")
Agent(subagent_type="integration-checker",    prompt="componentName=cor-<name>, changeKind=refactor, apiChanges=<list-if-any>")
```

A refactor SHOULD NOT change the visual or API. The reports should be all-PASS:

- `pixel-perfect-verifier`: every state matches the pre-refactor baseline (Step 1.5) within `< 0.5%`
- `a11y-verifier`: no new violations vs pre-refactor
- `integration-checker`: no stale callsites (unless approved breaking change in Step 3.5)

If any report flags an unexpected change, **STOP** — the refactor introduced an unintended regression. Diagnose and fix before continuing.

This phase does NOT dispatch `story-writer` or `test-writer` because a refactor preserves the existing stories/tests structurally. Hand-edit if specific stories need updating.

## Step 5: Verify After Each Change Group

After each group (tokens, CSS, TSX, stories):

```text
mcp__playwright__browser_navigate({ url: "http://localhost:6007/iframe.html?id=..." })
mcp__playwright__browser_wait_for({ time: 2 })
mcp__playwright__browser_take_screenshot({ type: "png", filename: "refactor-step-{N}.png" })
```

Compare against previous screenshot to catch visual regressions immediately.

## Step 6: Visual Regression Check

For each state captured in Step 1.5, diff before vs after:

```text
mcp__image-compare__compare_images({
  image1_path: "pre-refactor-{state}.png",
  image2_path: "post-refactor-{state}.png",
  diff_output_path: "regression-{state}.png"
})
```

Every variant and state should look identical. Any visual difference is a regression — fix before proceeding.

Use `mcp__playwright__browser_evaluate` for computed style comparison if visual diff is ambiguous.

## Step 6.5: Accessibility Regression Check — WCAG 2.1 AA

A refactor must not regress accessibility. Run:

```bash
yarn audit:contrast
```

For every captured state (including focus-visible), confirm:

- Focus ring still visible with ≥ 3:1 contrast
- ARIA states unchanged (or improved)
- Keyboard navigation still works (Tab, Enter, Esc, arrows)
- jest-axe spec still passes

Open the component in Storybook, check a11y panel in BOTH light and dark mode — zero violations.

Canonical reference: Skill [`accessibility-compliance`](../skills/accessibility-compliance/SKILL.md).

## Step 7: Final Verification

Invoke `verification-before-completion` skill.

```bash
yarn lint
yarn test
yarn sp.build
yarn audit:contrast
```

```text
mcp__playwright__browser_console_messages({ level: "error" })
```

## Step 8: Summary

```text
## Refactor Summary: cor-<name>

### Changes Applied
- [ ] Member order corrected
- [ ] CSS migrated to Pattern A/B
- [ ] X hardcoded values replaced with tokens
- [ ] Y new tokens created
- [ ] Event naming fixed
- [ ] Stories updated to CSF3
- [ ] Test coverage added for: [list]

### Visual Regression: PASS (no visual changes detected)
### Lint: PASS
### Tests: PASS
### Storybook build: PASS
```

## Auto-generated file handling

`yarn sp.build` regenerates these tracked files in your worktree:

- `src/components.d.ts`
- `src/components/<your-component>/readme.md`
- `.storybook/custom-elements.json`, `tokens/generated/**`

**Do not stage them manually.** The pre-commit hook auto-unstages them (`.husky/pre-commit`), the `.gitattributes` `merge=ours` driver auto-resolves cross-branch conflicts, and the CI `Validate (PR)` job rebuilds + verifies on PR. If that CI step fails ("Verify no stale generated files"), run `yarn build` locally and commit only the residual diff. Never hand-edit these files. See `AGENTS.md` -> "Merge driver for auto-generated files".

## Return to Main Agent

Report final status with summary above + any breaking changes that required approval + any deferred follow-up tasks.
