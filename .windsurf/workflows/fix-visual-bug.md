---
description: Fix a visual bug in a Stencil component by tracing the root cause through tokens and CSS
---

> **MIGRATED**: This workflow has been ported to [`.claude/commands/fix-visual-bug.md`](../../.claude/commands/fix-visual-bug.md). New edits should be made there. Kept here for Windsurf users.

# Fix Visual Bug

## Step 0: Invoke Systematic Debugging Skill

Invoke `skill({ SkillName: "systematic-debugging" })` **before touching any code**. Enforces 4-phase root-cause discipline — no fixes without root cause.

## Step 0.5: Classify the Problem

Before debugging, identify the problem type:

- **Visual discrepancy** → color, spacing, size, typography doesn't match Figma/spec
- **State bug** → hover, focus, disabled, selected state renders incorrectly
- **Responsive bug** → layout breaks at certain viewport sizes
- **Dark mode bug** → component doesn't render correctly in dark theme
- **Interaction bug** → click, keyboard, focus behavior is broken

**If you don't have a specific visual bug to fix** → use `/modify-component` instead.

## Step 1: Environment Check

Check if Storybook is already running on port 6007:

```bash
# Windows (PowerShell)
netstat -ano | findstr :6007

# macOS / Linux (Unix)
lsof -i :6007
```

- If LISTENING → reuse it
- If not running → start: `yarn sp.dev.watch`

## Step 1.5: Figma Reference Extraction (if link provided)

**If a Figma link was provided** showing the correct expected state, extract it now for comparison:

```text
figma_get_design_context({ nodeId: "...", forceCode: true })  → expected specs
figma_get_screenshot({ nodeId: "..." })                       → reference image (use in Step 6 comparison)
```

If no Figma link → skip and rely on computed style expectations.

## Step 2: Screenshot Current State

Navigate to the affected story and capture the current (broken) state:

```text
browser_navigate({ url: "http://localhost:6007/iframe.html?id=..." })
browser_wait_for({ time: 2 })
browser_take_screenshot({ type: "png", filename: "before-fix.png" })
```

## Step 3: Identify the Problem

Use `browser_evaluate` to read computed styles of the broken element:

```javascript
browser_evaluate({
  function: `() => {
    const el = document.querySelector('cor-{name}')?.shadowRoot?.querySelector('.target')
      || document.querySelector('cor-{name}');
    const s = window.getComputedStyle(el);
    return {
      bg: s.backgroundColor, color: s.color, border: s.border,
      padding: s.padding, fontSize: s.fontSize, fontWeight: s.fontWeight,
      lineHeight: s.lineHeight, borderRadius: s.borderRadius,
      minHeight: s.minHeight, gap: s.gap, opacity: s.opacity
    };
  }`
})
```

Compare returned values against expected values (from Figma or design spec).

## Step 4: Trace the Root Cause

Identify which layer is wrong:

1. **Token JSON** → is the value correct in `tokens/core/components/{name}.tokens.json`?
2. **Token build** → is the CSS variable generated correctly in `dist/design-system/tokens/*.css`?
3. **Component CSS** → is the correct `var(--token-name)` being used?
4. **Component TSX** → is the correct prop/state being applied?

## Step 5: Fix + Targeted Rebuild

Apply the minimal fix at the correct layer, then use the **targeted build command** (see `AGENTS.md` → build quick reference):

- **Token wrong** → fix in `.tokens.json` → `yarn tokens.build` (~5s) — no Stencil rebuild needed
- **CSS wrong** → fix `var()` reference in `.css` → wait for Stencil watch (~2-5s) or `yarn dx:stencil:once` if no watch
- **TSX wrong** → fix prop reflection, state logic, or class binding → wait for Stencil watch (~2-5s)
- **Story wrong** → fix `.stories.ts` → nothing (Storybook HMR, ~1s)
- **Never hardcode** — always trace back to tokens

**Do NOT run full `yarn build` for bug fixes.** Use targeted commands above.

## Step 6: Verify Fix

1. Wait for hot-reload or rebuild
2. Screenshot after fix:

```text
browser_take_screenshot({ type: "png", filename: "after-fix.png" })
```

3. Compare before vs after using `compare_images`:
   ```text
   compare_images({ image1_path: "before-fix.png", image2_path: "after-fix.png", diff_output_path: "diff-fix.png" })
   ```
4. Compare vs Figma screenshot if available — confirm pixel-perfect:
   ```text
   compare_images({ image1_path: "figma-ref.png", image2_path: "after-fix.png", diff_output_path: "diff-figma.png" })
   ```
5. Check other states haven't regressed (hover, disabled, focus)

## Step 7: Verification

Invoke `skill({ SkillName: "verification-before-completion" })` before claiming the fix is complete — must run commands AND read output.

// turbo

```bash
yarn lint
```

// turbo

```bash
yarn test
```
