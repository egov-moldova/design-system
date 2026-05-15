---
description: Refactor an existing component to align with latest AGENTS.md patterns — member order, CSS architecture, token compliance, story format
---

> **MIGRATED**: This workflow has been ported to [`.claude/agents/refactor-component.md`](../../.claude/agents/refactor-component.md). New edits should be made there. Kept here for Windsurf users.

# Refactor Component

## Step 1: Run Audit First

Invoke `/audit-component` on the target component to identify all deviations from current standards.

Wait for the audit report before proceeding.

## Step 1.5: Capture Pre-Refactor Baseline

**Before making any changes**, capture baseline screenshots of all states for regression comparison later:

```text
browser_navigate({ url: "http://localhost:6007/iframe.html?id=...--default" })
browser_wait_for({ time: 2 })
browser_take_screenshot({ type: "png", filename: "pre-refactor-default.png" })

// Repeat for each state: hover, disabled, invalid, etc.
browser_take_screenshot({ type: "png", filename: "pre-refactor-{state}.png" })
```

These screenshots are the regression baseline for Step 6.

## Step 2: Stencil Best Practices Check

**Identify component type and verify Stencil compliance:**

1. **Determine if component is a form element** (input, select, textarea, checkbox, radio, toggle)
2. **If form element, check Stencil form-associated requirements:**
   - Read `https://stenciljs.com/docs/form-associated` using `read_url_content` **only if unfamiliar** — skip if you already know the pattern from `src/components/AGENTS.md`
   - Verify component has `formAssociated: true` in `@Component`
   - Verify component has `@AttachInternals() internals: ElementInternals`
   - Verify `internals.setFormValue()` is called in handlers
   - Verify lifecycle callbacks exist: `formResetCallback`, `formDisabledCallback`, `formStateRestoreCallback`
   - Verify `updateValidity()` method exists for HTML5 validation sync

3. **If missing form association → add to refactor plan as CRITICAL**

## Step 3: Categorize Findings

Categorize audit findings into:

1. **Breaking changes** → flag for Human Oversight Gate (prop renames, event changes, slot restructuring)
2. **Non-breaking improvements** → safe to apply (member reorder, CSS refactor, token migration)
3. **Style-only changes** → safe, apply in batch (formatting, naming, comments)
4. **Stencil compliance** → form association, lifecycle callbacks (CRITICAL for form elements)

Present the categorized list and **wait for approval** on which items to address.

## Step 3.5: Human Approval Gate (if breaking changes)

If any breaking changes were identified:

**STOP** — present:

- What changes would break existing consumers
- Migration path for consumers
- Whether a version bump is needed

Do NOT proceed with breaking changes without explicit approval.

## Step 4: Apply Changes — Token-First Order

Changes MUST follow this strict dependency order:

- **Tokens** → update/create `tokens/core/components/{name}.tokens.json`
  - Remove hardcoded values
  - Add missing token references
  - Fix naming convention violations (align to `{component}-{element}-{property}-{scale/state}`)
  - ~~**Dark mode**~~: ⏸️ DEFERRED — `tokens/core.dark/` updates are out of scope until the dark mode phase.
- **Build tokens** after token changes:

// turbo

```bash
yarn tokens.build
```

- **CSS** → refactor `cor-{name}.css`
  - Switch to correct pattern (A: Slotted or B: Internal DOM)
  - Replace hardcoded values with `var(--token-name)`
  - Replace any `var(--palette-*)` fallbacks with `--color-*` semantic equivalents: `var(--component-token, var(--palette-ui-gray-9))` → `var(--component-token, var(--color-neutral-text-weak))`
  - Replace any direct `var(--palette-*)` usages with `--color-*` semantic tokens: `color: var(--palette-ui-gray-13)` → `color: var(--color-neutral-text-default)`
  - See `tokens/AGENTS.md` for the full palette→semantic mapping table
  - Fix selector patterns (`:host([attr])` over class toggling)
  - Standardize transitions to `property 150ms ease-in-out`
- **TSX** → refactor `cor-{name}.tsx`
  - Reorder members to match convention
  - Add `{ reflect: true }` to visual props
  - Add missing JSDoc
  - Fix event naming to `cor` prefix
  - Add proper TypeScript types (remove `any`)
- **Types/Enums** → create or update `.types.ts` and `.enums.ts`
  - Extract string literals into enums
  - Create interfaces for event payloads
- **Stories** → update `cor-{name}.stories.ts`
  - Switch to CSF3 if not already
  - Use `@storybook/web-components` imports
  - Add missing story variants (AllVariants, AllSizes, States)
- **Tests** → update `test/cor-{name}.spec.tsx`
  - Add missing test coverage identified by audit

## Step 5: Verify After Each Change Group

After each change group (tokens, CSS, TSX, stories):

```text
browser_navigate({ url: "http://localhost:6007/iframe.html?id=..." })
browser_wait_for({ time: 2 })
browser_take_screenshot({ type: "png", filename: "refactor-step-{N}.png" })
```

Compare against the previous screenshot to catch visual regressions immediately.

## Step 6: Visual Regression Check

Compare final result against the pre-refactor state:

1. Screenshot before refactor (from Step 1 audit) vs after
2. Every variant and state should look identical
3. Use `browser_evaluate` for computed style comparison if unsure

Any visual difference is a regression — fix before proceeding.

## Step 7: Final Verification

// turbo

```bash
yarn lint
```

// turbo

```bash
yarn test
```

// turbo

```bash
yarn sp.build
```

```text
browser_console_messages({ level: "error" })
```

## Step 8: Summary

```text
## Refactor Summary: cor-{name}

### Changes Applied
- [ ] Member order corrected
- [ ] CSS migrated to Pattern A/B
- [ ] X hardcoded values replaced with tokens
- [ ] Y new tokens created
- [ ] Event naming fixed
- [ ] Stories updated to CSF3
- [ ] Test coverage added for: [list]

### Visual Regression: PASS (no visual changes)
### Lint: PASS
### Tests: PASS
### Storybook build: PASS
```
