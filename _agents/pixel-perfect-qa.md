# Pixel-Perfect QA Loop — Steps 1–8

## Scope

Core QA workflow: Figma vs Storybook visual comparison. **Every component MUST pass this before completion. Read during QA phase.**

## Contents

- Step 1: Extract Figma Design
- Step 1.25: agent-browser Pre-Flight (structural smoke test)
- Step 1.5: CSS Variable Existence Check (mandatory)
- Step 2: Capture Storybook Render
- Step 3: Compare & Identify Differences (tolerances)
- Step 4: Fix Discrepancies
- Step 5: Re-test After Fix (targeted builds)
- Step 6: Test ALL States (batch + individual + checklist)
- Step 7: Responsive Testing (molecules/organisms)
- Step 8: Per-Component Summary

---

## Step 1: Extract Figma Design

```text
1. figma_get_design_context({ nodeId: "...", forceCode: true })  → Exact specs
2. figma_get_screenshot({ nodeId: "..." })                       → Reference image
3. figma_get_variable_defs({ nodeId: "..." })                    → Token values
```

## Step 1.25: agent-browser Pre-Flight (structural smoke test)

**Before any Playwright/screenshot work**: confirm the component renders and has correct structure. Costs near-zero context — catches missing story exports, broken imports, or wrong element tag before spending screenshot tokens.

```bash
agent-browser open http://localhost:6007/iframe.html?id=atoms-cor-[name]--default&viewMode=story
```

**Check the output tree for**:
- Component element is present (not empty page or error)
- Correct ARIA role (e.g. `role="button"`, `role="textbox"`, `role="combobox"`)
- Accessible name / label rendered
- No obvious error nodes

**If tree is empty or shows error** → stop. Fix the story/component before proceeding to Playwright steps.

**If tree looks correct** → proceed to Step 1.5.

> See `_agents/mcp-tools.md` § Browser Tool Decision Guide for the full agent-browser vs Playwright MCP decision matrix.

---

## Step 1.5: CSS Variable Existence Check (MANDATORY)

**Before screenshots**: Verify all CSS variables resolve. Catches token/CSS mismatches immediately.

```javascript
browser_evaluate({
  function: `() => {
    const component = document.querySelector('cor-[name]');
    const container = component?.shadowRoot?.querySelector('.container');
    const s = container ? window.getComputedStyle(container) : null;
    return { backgroundColor: s?.backgroundColor, color: s?.color, fontSize: s?.fontSize };
  }`
})
```

**Check**: All values are NOT `rgba(0, 0, 0, 0)`, `initial`, or `inherit` (unless intentionally transparent).

If CSS variable doesn't exist:

1. Check `dist/design-system/tokens/core.tokens.css`
2. Verify token in `tokens/core/components/*.tokens.json`
3. Check naming (camelCase vs kebab-case per `_agents/pre-implementation.md`)
4. Fix → rebuild per `_agents/environment-commands.md` → retry

---

## Step 2: Capture Storybook Render

```text
1. Ensure Storybook on port 6007
2. browser_navigate({ url: "http://localhost:6007/iframe.html?id=atoms-cor-[name]--default&viewMode=story" })
3. browser_wait_for({ time: 2 })
4. browser_take_screenshot({ type: "png", filename: "storybook-render.png" })
```

## Step 3: Compare & Identify Differences

Use `browser_evaluate` to compare computed styles:

- [ ] **Dimensions**: width, height, min-height, min-width (px exact)
- [ ] **Spacing**: padding (all sides), margin, gap (px exact)
- [ ] **Typography**: font-family, font-size, font-weight, line-height, letter-spacing
- [ ] **Colors**: background-color, color, border-color (hex exact)
- [ ] **Borders**: border-width, border-style, border-radius
- [ ] **Shadows**: box-shadow
- [ ] **Icons**: size, color, spacing
- [ ] **Opacity**: for disabled states
- [ ] **Alignment**: flex alignment, text-align

### Tolerances

**Acceptable** (OS/browser rendering): Font kerning ±2px, line height ±1px, anti-aliasing ±0.5px

**Must match exactly** (zero tolerance): Colors, border radius, spacing, dimensions, shadows, opacity

Within tolerance → move on. Exceeds tolerance → fix before proceeding.

## Step 4: Fix Discrepancies

1. Re-extract from Figma if unclear — don't assume
2. Identify the controlling token
3. Check token in `tokens/core/components/`
4. Token exists → fix value → rebuild per `_agents/environment-commands.md`
5. Token missing → create → reference core tokens → rebuild per `_agents/environment-commands.md`
6. CSS issue → fix `.css` with correct `var(--token-name)`
7. **Never hardcode** — trace back to tokens
8. **Never round** — use exact Figma values

## Step 5: Re-test After Fix

Use minimal rebuild per `_agents/environment-commands.md`:

- Token fix → `yarn tokens.build` (~5s)
- CSS/TSX fix → wait for Stencil watch (~2-5s)
- Story fix → nothing (HMR ~1s)

Then: refresh → screenshot → compare again → REPEAT until identical.

## Step 6: Test ALL States

### 6a: Batch Check — AllStatesTable Story

Build grid story, screenshot entire grid, catch obvious mismatches early.

### 6b: Individual State Testing

| State | How to Trigger | What to Verify |
| --- | --- | --- |
| **Default** | Load story | Colors, spacing, typography |
| **Hover** | `browser_hover` | Background, border, text color |
| **Active** | `browser_click` (hold) | Darker/shifted colors |
| **Focus** | `browser_press_key({ key: "Tab" })` | Focus ring, background |
| **Disabled** | Set `disabled` prop | Muted colors, `cursor: not-allowed` |
| **Invalid** | Set `invalid` prop | Error border, helper text color |
| **Skeleton** | Set `skeleton` prop | Loading placeholder |
| **With content** | Slot text/icons | Alignment, gap, overflow |
| **Empty** | No slot content | Graceful empty state |

### 6c: Design Fidelity Checklist

- [ ] Container width matches Figma
- [ ] Padding matches all sides
- [ ] Font family, size, weight, line-height match
- [ ] Background, border, text colors match
- [ ] All interactive states verified
- [ ] Icons render correctly with correct size/color
- [ ] Color contrast ≥4.5:1 for text
- [ ] Focus indicators visible
- [ ] Touch targets ≥44×44px

## Step 7: Responsive Testing (Molecules & Organisms)

```text
browser_resize({ width: 375, height: 667 })   # Mobile
browser_resize({ width: 768, height: 1024 })   # Tablet
browser_resize({ width: 1440, height: 900 })   # Desktop
```

Verify: no horizontal scroll, no overflow, proper stacking, text ≥14px on mobile.

## Step 8: Per-Component Summary

```markdown
## cor-[name] — Implementation Complete
- **Tokens**: [created/reused] in `tokens/core/components/[name].tokens.json`
- **States verified**: default ✅, hover ✅, active ✅, focus ✅, disabled ✅
- **Responsive**: ✅ 375px | ✅ 768px | ✅ 1440px (atoms: N/A)
- **Console errors**: none
- **Story**: `src/components/cor-[name]/cor-[name].stories.ts`
```

**Auto-proceed** (single component, zero mismatches): show inline, continue to verification.
**Multi-component**: accumulate summaries, present all at once. **STOP and wait** per `_agents/workflow-rules.md`.

### Computed Style Verification

When screenshots aren't conclusive:

```javascript
browser_evaluate({
  function: `() => {
    const el = document.querySelector('cor-button')?.shadowRoot?.querySelector('.button')
      || document.querySelector('cor-button');
    const s = window.getComputedStyle(el);
    return { bg: s.backgroundColor, color: s.color, padding: s.padding,
             fontSize: s.fontSize, fontWeight: s.fontWeight, borderRadius: s.borderRadius };
  }`
})
```
