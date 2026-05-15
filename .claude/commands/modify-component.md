---
description: Add a variant, prop, size, or state to an existing component using strict token-first change order
argument-hint: "@cor-<name> <change description> [Figma URL]"
---

# /modify-component

Modify existing component `$ARGUMENTS`. Strict token-first change order. Pixel-perfect QA if visual.

## Step 0: Classify the Change

Identify type:

- **Add new variant** → new `variant` prop value (e.g., `variant='ghost'`)
- **Add new size** → new `size` prop value (e.g., `size='xl'`)
- **Add new state** → new boolean prop (e.g., `loading`, `invalid`)
- **Add new prop** → new functionality (e.g., `icon`, `badge`)
- **Refactor** → improve code structure without changing behavior
- **Update tokens** → change colors, spacing, typography

If fixing a visual bug → use `/fix-visual-bug` instead.

## Step 1: Environment Check

If a Figma link was provided, extract first (parallel calls OK):

```text
mcp__figma__get_design_context({ nodeId: "...", forceCode: true })  → target state specs
mcp__figma__get_screenshot({ nodeId: "..." })                       → reference image for QA
mcp__figma__get_variable_defs({ nodeId: "..." })                    → any new token values
```

Check Storybook:

```bash
# PowerShell
netstat -ano | findstr :6007

# Unix
lsof -i :6007
```

- LISTENING → reuse
- not running → `yarn sp.dev.watch`

## Step 2: Read All Component Files

- `src/components/cor-<name>/cor-<name>.tsx` — component class
- `src/components/cor-<name>/cor-<name>.css` — styles
- `src/components/cor-<name>/cor-<name>.enums.ts` — enum values
- `src/components/cor-<name>/cor-<name>.types.ts` — TypeScript interfaces
- `src/components/cor-<name>/cor-<name>.constants.ts` — static constants
- `src/components/cor-<name>/cor-<name>.stories.ts` — Storybook stories

## Step 3: Read Existing Tokens

Read `tokens/core/components/<name>.tokens.json` to understand current structure.

## Step 4: Make Changes (strict order + targeted builds)

Dependency order — use targeted build per change type:

1. **Tokens JSON** → update/add tokens in `tokens/core/components/<name>.tokens.json`
   - Naming: `--{component}-{element}-{property}-{scale/state}` — scale/state MUST be last
   - DTCG: `$value` / `$type`
   - Dark mode: DEFERRED
2. **Build tokens** → `yarn tokens.build` (~5s) — no Stencil rebuild needed
3. **CSS** → update `cor-<name>.css` using `var(--token-name)` → Stencil watch (~2–5s) or `yarn dx:stencil:once`
4. **TSX** → update props, state, render logic → Stencil watch (~2–5s)
5. **Stories** → update `.stories.ts` to cover new variants/states → Storybook HMR (~1s)

**Do NOT run full `yarn build` during development.** Reserve full build for Step 6 final verification.

## Step 5: Pixel-Perfect QA (if visual change)

1. Navigate to story:

```text
mcp__playwright__browser_navigate({ url: "http://localhost:6007/iframe.html?id=..." })
```

2. Screenshot:

```text
mcp__playwright__browser_take_screenshot({ type: "png", filename: "after-change.png" })
```

3. Compare vs Figma reference (from Step 1) or expected appearance:

```text
mcp__image-compare__compare_images({
  image1_path: "figma-ref.png",
  image2_path: "after-change.png",
  diff_output_path: "diff.png"
})
```

4. Verify computed styles via `mcp__playwright__browser_evaluate`
5. Fix → rebuild → re-screenshot → REPEAT until correct
6. **Test ALL states** — not just the new/changed variant. Verify no regressions in: default, hover, active, focus, disabled. A change to one variant can break another.

## Step 6: Verification

```bash
yarn lint
yarn test
yarn sp.build
```

Report change summary: files modified, tokens added, stories updated, QA result.
