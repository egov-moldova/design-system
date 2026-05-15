---
description: Modify an existing Stencil web component with proper token-first change order
---

# Modify Existing Component

## Step 0: Classify the Change

Before modifying, identify the change type:

- **Add new variant** → new `variant` prop value (e.g., `variant='ghost'`)
- **Add new size** → new `size` prop value (e.g., `size='xl'`)
- **Add new state** → new boolean prop (e.g., `loading`, `invalid`)
- **Add new prop** → new functionality (e.g., `icon`, `badge`)
- **Refactor** → improve code structure without changing behavior
- **Update tokens** → change colors, spacing, typography

**If you're fixing a visual bug** → use `/fix-visual-bug` instead.

## Step 1: Environment Check

**If a Figma link was provided for this change**, run these extraction calls before reading files (can be parallel):

```text
figma_get_design_context({ nodeId: "...", forceCode: true })  → target state specs
figma_get_screenshot({ nodeId: "..." })                       → reference image for QA
figma_get_variable_defs({ nodeId: "..." })                    → any new token values
```

Check if Storybook is already running on port 6007:

```bash
# Windows (PowerShell)
netstat -ano | findstr :6007

# macOS / Linux (Unix)
lsof -i :6007
```

- If LISTENING → reuse it
- If not running → start: `yarn sp.dev.watch`

## Step 2: Read All Component Files

Read the full component to understand current implementation:

- `src/components/cor-{name}/cor-{name}.tsx` — component class
- `src/components/cor-{name}/cor-{name}.css` — styles
- `src/components/cor-{name}/cor-{name}.enums.ts` — enum values
- `src/components/cor-{name}/cor-{name}.types.ts` — TypeScript interfaces
- `src/components/cor-{name}/cor-{name}.constants.ts` — static constants
- `src/components/cor-{name}/cor-{name}.stories.ts` — Storybook stories

## Step 3: Read Existing Tokens

Read `tokens/core/components/{name}.tokens.json` to understand current token structure.

## Step 4: Make Changes (strict order + targeted builds)

Changes MUST follow this dependency order. **Use targeted builds per change type** (see `AGENTS.md` → build quick reference):

1. **Tokens JSON** → update/add tokens in `tokens/core/components/{name}.tokens.json`
   - **Naming convention**: `{component}-{element}-{property}-{scale/state}` — scale/state MUST be last (✅ `--label-font-size-md` ❌ `--label-md-font-size`)
   - ~~**Dark mode**~~: ⏸️ DEFERRED — `tokens/core.dark/` updates are out of scope until the dark mode phase.
2. **Build tokens** → `yarn tokens.build` (~5s) — no Stencil rebuild needed
3. **CSS** → update `cor-{name}.css` using `var(--token-name)` references → wait for Stencil watch (~2-5s) or `yarn dx:stencil:once` if no watch
4. **TSX** → update `cor-{name}.tsx` (props, state, render logic) → wait for Stencil watch (~2-5s)
5. **Stories** → update `cor-{name}.stories.ts` to cover new variants/states → nothing needed (Storybook HMR, ~1s)

**Do NOT run full `yarn build` during development.** Full build is only for Step 6 final verification.

## Step 5: Pixel-Perfect QA (if visual change)

If the change affects visual appearance:

1. Navigate to story in Storybook
2. Screenshot: `browser_take_screenshot({ type: "png" })`
3. Compare vs Figma reference image (from Step 1 extraction) or expected appearance
4. Use `browser_evaluate` for computed style verification
5. Fix → rebuild → re-screenshot → REPEAT until correct
6. **Test ALL states** — not just the new/changed variant. Verify no regressions in: default, hover, active, focus, disabled (and any other existing states). A change to one variant can break another.

## Step 6: Verification

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
