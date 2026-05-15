---
description: Deep accessibility audit of a component — keyboard testing, ARIA validation, contrast checks, screen reader compatibility
---

> **MIGRATED**: This workflow has been ported to [`.claude/commands/audit-accessibility.md`](../../.claude/commands/audit-accessibility.md). New edits should be made there. Kept here for Windsurf users.

# Accessibility Audit

## Step 0: Environment Check

**Reference**: See `AGENTS.md` and `_agents/verification-git.md` for accessibility patterns, ARIA implementation guidance, and screen reader compatibility rules.

```bash
# Windows (PowerShell)
netstat -ano | findstr :6007

# macOS / Linux (Unix)
lsof -i :6007
```

- If LISTENING → reuse it, do NOT start another
- If not running → `yarn sp.dev.watch` (non-blocking, wait ~10s)

Check browser session: `browser_snapshot()` — if it returns content, reuse it. Otherwise navigate to `http://localhost:6007`.

Check tokens: verify `dist/design-system/tokens/*.css` files exist. If missing:

// turbo

```powershell
yarn tokens.build
```

## Step 1: Read Component Source

Read the component `.tsx` and `.css` files to understand:

- Which ARIA attributes are set
- Which keyboard handlers exist (`@Listen`)
- Which focus/disabled styles are defined
- Which slots accept interactive content

## Step 2: Accessibility Tree Snapshot

Navigate to the default story and capture the accessibility tree:

```text
browser_navigate({ url: "http://localhost:6007/iframe.html?id=..." })
browser_wait_for({ time: 2 })
browser_snapshot()
```

Analyze the tree for:

- [ ] All interactive elements have accessible names (text content, `aria-label`, or `aria-labelledby`)
- [ ] Roles are correct (`button`, `textbox`, `checkbox`, `combobox`, etc.)
- [ ] Grouping/landmarks used where appropriate (`group`, `region`)
- [ ] No unnamed interactive elements
- [ ] No redundant roles (e.g., `role="button"` on `<button>`)

## Step 3: Keyboard Navigation — Full Flow

Test with sequential key presses, taking snapshots after each:

**Tab order:**

```text
browser_press_key({ key: "Tab" })
browser_snapshot()
browser_take_screenshot({ type: "png", filename: "focus-1.png" })
```

- [ ] Component is reachable via Tab
- [ ] Focus indicator is visible (screenshot shows ring/outline)
- [ ] Tab order follows logical reading order

**Activation:**

```text
browser_press_key({ key: "Enter" })
browser_snapshot()
```

- [ ] Enter activates buttons/links
- [ ] Space activates checkboxes/toggles
- [ ] No unexpected side effects

**Dismissal:**

```text
browser_press_key({ key: "Escape" })
browser_snapshot()
```

- [ ] Escape closes overlays, dropdowns, modals (if applicable)
- [ ] Focus returns to trigger element after close

**Arrow keys (for composite widgets):**

- [ ] Arrow keys navigate within groups (tabs, menus, radio groups)
- [ ] Home/End jump to first/last item

**Focus trap check:**

```text
browser_press_key({ key: "Tab" })
browser_press_key({ key: "Tab" })
browser_press_key({ key: "Tab" })
browser_snapshot()
```

- [ ] Focus moves past the component (no trap)
- [ ] Shift+Tab moves backward correctly

## Step 4: State ARIA Verification

For each interactive state, set the prop and verify ARIA in the snapshot:

| State | Set Prop | Expected ARIA | Verify |
| --- | --- | --- | --- |
| **Disabled** | `disabled="true"` | `aria-disabled="true"` or native `disabled` | Snapshot |
| **Invalid** | `invalid="true"` | `aria-invalid="true"` + `aria-describedby` pointing to error | Snapshot |
| **Loading** | `skeleton="true"` | `aria-busy="true"` (if interactive) | Snapshot |
| **Expanded** | Toggle open | `aria-expanded="true"` on trigger | Snapshot |
| **Selected** | Select item | `aria-selected="true"` on item | Snapshot |
| **Required** | `required="true"` | `aria-required="true"` or native `required` | Snapshot |
| **Read-only** | `readonly="true"` | `aria-readonly="true"` | Snapshot |

Navigate to each state's story variant (or modify props via story args) and:

```text
browser_snapshot()
```

Report any missing or incorrect ARIA attributes.

## Step 5: Color Contrast Verification

Use `browser_evaluate` to extract foreground/background colors for each variant:

```javascript
browser_evaluate({
  function: `() => {
    const el = document.querySelector('cor-{name}')?.shadowRoot?.querySelector('.target')
      || document.querySelector('cor-{name}');
    const s = window.getComputedStyle(el);
    return {
      color: s.color,
      backgroundColor: s.backgroundColor,
      fontSize: s.fontSize,
      fontWeight: s.fontWeight,
      borderColor: s.borderColor,
      outlineColor: s.outlineColor
    };
  }`
})
```

**WCAG AA contrast requirements:**

- **Normal text** (< 18px or < 14px bold): minimum **4.5:1**
- **Large text** (≥ 18px or ≥ 14px bold): minimum **3:1**
- **UI components** (borders, focus rings, icons): minimum **3:1**
- **Disabled elements**: exempt from contrast requirements

Test across all variants: primary, secondary, ghost, destructive, etc.

Test in both light and dark mode if dark tokens exist.

## Step 6: Focus Indicator Audit

For each interactive variant, Tab to the element and screenshot:

```text
browser_press_key({ key: "Tab" })
browser_take_screenshot({ type: "png", filename: "focus-variant-{name}.png" })
```

Verify:

- [ ] Focus ring is visible against background
- [ ] Focus ring has ≥ 3:1 contrast ratio against adjacent colors
- [ ] Focus style uses `:focus-visible` (not `:focus`) — no ring on mouse click
- [ ] Focus ring does not clip or overlap other elements

## Step 7: Screen Reader Announcements

Check that dynamic content is announced:

- [ ] Error messages use `role="alert"` or `aria-live="assertive"`
- [ ] Status updates use `aria-live="polite"`
- [ ] Loading states announce start/end
- [ ] Content changes are reflected in accessible name

## Step 8: CSS Accessibility Check

Read the `.css` file and verify:

- [ ] No `outline: none` without replacement focus style
- [ ] No `display: none` on accessible content (use `visibility: hidden` or `clip` pattern)
- [ ] Hover styles also applied to `:focus-visible` where meaningful
- [ ] `prefers-reduced-motion` media query for animations (if any)
- [ ] Text is not truncated without accessible alternative (`title` or `aria-label`)

## Step 9: Report

```text
## Accessibility Audit Report: cor-{name}

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
