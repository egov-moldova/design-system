---
description: Diagnose and fix a visual bug by tracing root cause through token → CSS → TSX layers
argument-hint: "@mud-<name> <bug description> [Figma URL]"
---

# /fix-visual-bug

Fix a visual bug in component `$ARGUMENTS`. Trace root cause through token → CSS → TSX layers. Use targeted rebuilds, never full `yarn build` during iteration.

## Step 0: Invoke Systematic Debugging Skill

Invoke the `systematic-debugging` skill **before touching any code**. Enforces 4-phase root-cause discipline — no fixes without root cause.

## Step 0.5: Classify the Problem

Identify the problem type:

- **Visual discrepancy** → color, spacing, size, typography doesn't match Figma/spec
- **State bug** → hover, focus, disabled, selected state renders incorrectly
- **Responsive bug** → layout breaks at certain viewport sizes
- **Dark mode bug** → DEFERRED (skip)
- **Interaction bug** → click, keyboard, focus behavior broken

If no specific visual bug → use `/modify-component` instead.

## Step 1: Environment Check

```bash
# PowerShell
netstat -ano | findstr :6007

# Unix
lsof -i :6007
```

- LISTENING → reuse Storybook
- not running → `yarn sp.dev.watch`

## Step 1.5: Figma Reference Extraction (if link provided)

```text
mcp__figma__get_design_context({ nodeId: "...", forceCode: true })  → expected specs
mcp__figma__get_screenshot({ nodeId: "..." })                       → reference image for Step 6
```

No Figma link → rely on computed style expectations.

## Step 2: Screenshot Current State

```text
mcp__playwright__browser_navigate({ url: "http://localhost:6007/iframe.html?id=..." })
mcp__playwright__browser_wait_for({ time: 2 })
mcp__playwright__browser_take_screenshot({ type: "png", filename: ".playwright-mcp/before-fix.png" })
```

## Step 3: Identify the Problem

Read computed styles of the broken element via `mcp__playwright__browser_evaluate`:

```javascript
() => {
  const el = document.querySelector('mud-<name>')?.shadowRoot?.querySelector('.target')
    || document.querySelector('mud-<name>');
  const s = window.getComputedStyle(el);
  return {
    bg: s.backgroundColor, color: s.color, border: s.border,
    padding: s.padding, fontSize: s.fontSize, fontWeight: s.fontWeight,
    lineHeight: s.lineHeight, borderRadius: s.borderRadius,
    minHeight: s.minHeight, gap: s.gap, opacity: s.opacity
  };
}
```

Compare returned values against expected (from Figma or design spec).

## Step 4: Trace the Root Cause

Identify which layer is wrong:

1. **Token JSON** → is the value correct in `tokens/core/components/<name>.tokens.json`?
2. **Token build** → is the CSS variable generated correctly in `dist/mud/tokens/*.css`?
3. **Component CSS** → is the correct `var(--token-name)` being used?
4. **Component TSX** → is the correct prop/state being applied?

## Step 5: Fix + Targeted Rebuild

Apply the minimal fix at the correct layer:

| Layer wrong | Action | Rebuild | Time |
| --- | --- | --- | --- |
| Token JSON | edit `.tokens.json` | `yarn tokens.build` | ~5s |
| CSS | edit `.css` (use `var(--token)`) | Stencil watch or `yarn dx:stencil:once` | ~2–5s / 20s |
| TSX | edit `.tsx` (props, state, class binding) | Stencil watch | ~2–5s |
| Story | edit `.stories.ts` | none (Storybook HMR) | ~1s |

**Never hardcode** — always trace back to tokens. **Do NOT run full `yarn build` during iteration.**

## Step 6: Verify Fix

1. Wait for hot-reload or targeted rebuild
2. Screenshot after fix:

```text
mcp__playwright__browser_take_screenshot({ type: "png", filename: ".playwright-mcp/after-fix.png" })
```

3. Diff before vs after:

```text
mcp__image-compare__compare_images({
  image1_path: ".playwright-mcp/before-fix.png",
  image2_path: ".playwright-mcp/after-fix.png",
  diff_output_path: ".playwright-mcp/diff-fix.png"
})
```

4. Diff vs Figma reference (if available) — confirm pixel-perfect:

```text
mcp__image-compare__compare_images({
  image1_path: ".playwright-mcp/figma-ref.png",
  image2_path: ".playwright-mcp/after-fix.png",
  diff_output_path: ".playwright-mcp/diff-figma.png"
})
```

5. Verify other states haven't regressed (hover, disabled, focus)

## Step 6a: WCAG 2.1 AA Re-Check (mandatory when fix touches color, focus, or state visibility)

If the bug or fix touched:

- a color token / palette value,
- a focus ring or `:focus-visible` style,
- a disabled / error / state-driven visual style,
- contrast between any two adjacent surfaces,

then run accessibility verification before claiming the fix done:

```bash
yarn audit:contrast
```

Open the component story in Storybook, check the a11y panel in BOTH light and dark mode. Zero new violations.

Canonical reference: Skill [`accessibility-compliance`](../skills/accessibility-compliance/SKILL.md).

## Step 7: Verification

Invoke `verification-before-completion` skill, then:

```bash
yarn lint
yarn test
```

Report fix summary: root cause layer, file changed, before/after diff, regression check result.
