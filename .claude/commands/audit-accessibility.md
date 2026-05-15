---
description: Deep WCAG 2.2 AA audit — keyboard navigation, ARIA validation, color contrast, focus indicators, screen reader compatibility
argument-hint: "@cor-<component-name>"
---

# /audit-accessibility

Deep accessibility audit for `$ARGUMENTS`. Do **not** auto-fix — report findings, wait for approval.

Reference: [`AGENTS.md`](../../AGENTS.md), `_agents/` files for accessibility patterns, ARIA implementation guidance, and screen reader compatibility rules.

## Step 0: Environment Check

```bash
# PowerShell
netstat -ano | findstr :6007

# Unix
lsof -i :6007
```

- If LISTENING → reuse Storybook, do NOT start another
- If not → `yarn sp.dev.watch` (non-blocking, wait ~10s)

Check browser session: `mcp__playwright__browser_snapshot()` — reuse if active, else navigate to `http://localhost:6007`.

Verify tokens built: check `dist/design-system/tokens/*.css` exists. If missing → `yarn tokens.build`.

## Step 1: Read Component Source

Read `src/components/$ARGUMENTS/$ARGUMENTS.tsx` and `.css` to understand:

- Which ARIA attributes are set
- Which keyboard handlers exist (`@Listen`)
- Which focus/disabled styles are defined
- Which slots accept interactive content

## Step 2: Accessibility Tree Snapshot

```text
mcp__playwright__browser_navigate({ url: "http://localhost:6007/iframe.html?id=..." })
mcp__playwright__browser_wait_for({ time: 2 })
mcp__playwright__browser_snapshot()
```

Analyze the tree:

- All interactive elements have accessible names (text content, `aria-label`, or `aria-labelledby`)
- Roles are correct (`button`, `textbox`, `checkbox`, `combobox`, etc.)
- Grouping/landmarks used where appropriate (`group`, `region`)
- No unnamed interactive elements
- No redundant roles (e.g., `role="button"` on `<button>`)

## Step 3: Keyboard Navigation — Full Flow

**Tab order**:

```text
mcp__playwright__browser_press_key({ key: "Tab" })
mcp__playwright__browser_snapshot()
mcp__playwright__browser_take_screenshot({ type: "png", filename: "focus-1.png" })
```

- Component is reachable via Tab
- Focus indicator is visible (screenshot shows ring/outline)
- Tab order follows logical reading order

**Activation**:

```text
mcp__playwright__browser_press_key({ key: "Enter" })
mcp__playwright__browser_snapshot()
```

- Enter activates buttons/links
- Space activates checkboxes/toggles
- No unexpected side effects

**Dismissal**:

```text
mcp__playwright__browser_press_key({ key: "Escape" })
mcp__playwright__browser_snapshot()
```

- Escape closes overlays, dropdowns, modals (if applicable)
- Focus returns to trigger element after close

**Arrow keys (composite widgets)**:

- Arrow keys navigate within groups (tabs, menus, radio groups)
- Home/End jump to first/last item

**Focus trap check**:

```text
mcp__playwright__browser_press_key({ key: "Tab" })
mcp__playwright__browser_press_key({ key: "Tab" })
mcp__playwright__browser_press_key({ key: "Tab" })
mcp__playwright__browser_snapshot()
```

- Focus moves past the component (no trap)
- Shift+Tab moves backward correctly

## Step 4: State ARIA Verification

For each interactive state, set the prop and verify ARIA in the snapshot:

| State | Set Prop | Expected ARIA |
| --- | --- | --- |
| Disabled | `disabled="true"` | `aria-disabled="true"` or native `disabled` |
| Invalid | `invalid="true"` | `aria-invalid="true"` + `aria-describedby` pointing to error |
| Loading | `skeleton="true"` | `aria-busy="true"` (if interactive) |
| Expanded | Toggle open | `aria-expanded="true"` on trigger |
| Selected | Select item | `aria-selected="true"` on item |
| Required | `required="true"` | `aria-required="true"` or native `required` |
| Read-only | `readonly="true"` | `aria-readonly="true"` |

Navigate to each state's story variant and snapshot. Report any missing or incorrect ARIA.

## Step 5: Color Contrast Verification

Extract foreground/background colors via `mcp__playwright__browser_evaluate`:

```javascript
() => {
  const el = document.querySelector('$ARGUMENTS')?.shadowRoot?.querySelector('.target')
    || document.querySelector('$ARGUMENTS');
  const s = window.getComputedStyle(el);
  return {
    color: s.color,
    backgroundColor: s.backgroundColor,
    fontSize: s.fontSize,
    fontWeight: s.fontWeight,
    borderColor: s.borderColor,
    outlineColor: s.outlineColor
  };
}
```

**WCAG AA contrast requirements**:

- Normal text (< 18px or < 14px bold): minimum **4.5:1**
- Large text (≥ 18px or ≥ 14px bold): minimum **3:1**
- UI components (borders, focus rings, icons): minimum **3:1**
- Disabled elements: exempt from contrast requirements

Test across all variants. Test in both light and dark mode if dark tokens exist.

## Step 6: Focus Indicator Audit

For each interactive variant, Tab to the element and screenshot:

```text
mcp__playwright__browser_press_key({ key: "Tab" })
mcp__playwright__browser_take_screenshot({ type: "png", filename: "focus-variant-X.png" })
```

Verify:

- Focus ring is visible against background
- Focus ring has ≥ 3:1 contrast against adjacent colors
- Focus style uses `:focus-visible` (not `:focus`) — no ring on mouse click
- Focus ring does not clip or overlap other elements

## Step 7: Screen Reader Announcements

Check dynamic content announces correctly:

- Error messages use `role="alert"` or `aria-live="assertive"`
- Status updates use `aria-live="polite"`
- Loading states announce start/end
- Content changes are reflected in accessible name

## Step 8: CSS Accessibility Check

Read `.css` and verify:

- No `outline: none` without replacement focus style
- No `display: none` on accessible content (use `visibility: hidden` or `clip` pattern)
- Hover styles also applied to `:focus-visible` where meaningful
- `prefers-reduced-motion` media query for animations
- Text not truncated without accessible alternative (`title` or `aria-label`)

## Step 9: Report

```text
## Accessibility Audit Report: $ARGUMENTS

### WCAG 2.1 AA Compliance Summary

| Category           | Status    | Issues |
| ---                | ---       | ---    |
| Keyboard nav       | PASS/FAIL | X      |
| Focus management   | PASS/FAIL | X      |
| ARIA attributes    | PASS/FAIL | X      |
| Color contrast     | PASS/FAIL | X      |
| Screen reader      | PASS/FAIL | X      |
| Motion/animation   | PASS/FAIL | X      |

### Critical (blocks users)
1. ...

### High (significant barrier)
1. ...

### Medium (inconvenience)
1. ...

### Recommendations
1. ...
```

Present report. **Do NOT auto-fix** — wait for approval.
