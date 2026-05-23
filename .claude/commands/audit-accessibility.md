---
description: Deep WCAG 2.1 AA audit — keyboard navigation, ARIA validation, color contrast (light + dark mode), focus indicators, screen reader compatibility
argument-hint: "@cor-<component-name>"
---

# /audit-accessibility

Deep WCAG 2.1 Level AA audit for `$ARGUMENTS`. Do **not** auto-fix — report findings, wait for approval.

**Canonical reference:** [Skill `accessibility-compliance`](../skills/accessibility-compliance/SKILL.md) — Success Criteria, ARIA patterns, dark mode requirements, contrast tables. Invoke that Skill before starting this audit.

**Stencil-side companion:** [Skill `stencil-compliance`](../skills/stencil-compliance/SKILL.md) covers `@Prop` ↔ ARIA mirroring, `delegatesFocus` (SC 2.4.7), and `:host(:state(...))` for invalid/required states (SC 4.1.2/4.1.3). When in doubt about how a Stencil decorator should reflect accessibility state, consult [`stencil-compliance/references/decorators.md`](../skills/stencil-compliance/references/decorators.md) and [`stencil-compliance/references/jsx-styling.md`](../skills/stencil-compliance/references/jsx-styling.md).

**Also reference:** [`AGENTS.md`](../../AGENTS.md), `_agents/` files for project-specific patterns.

**Relation to `/audit-component`**: the §BX block of [`audit-component`](../skills/audit-component/SKILL.md) (BX2 Tab order, BX3 focus-visible, BX4 Escape) is a subset of this command's keyboard-nav coverage. Use `/audit-component` for the BX/CX/DX gate during a full audit; use `/audit-accessibility` here for the deeper WCAG 2.1 AA pass when a component fails BX or needs explicit accessibility sign-off.

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
mcp__playwright__browser_take_screenshot({ type: "png", filename: ".playwright-mcp/focus-1.png" })
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

> **Stencil-side mirror**: `@Prop`-driven states should reflect to attributes via `@Prop({ reflect: true })`, then sync to ARIA via `<Host aria-X={...}>`. For custom states (`:host(:state(invalid))`) use `@AttachInternals({ states: { ... } })`. See [`stencil-compliance/references/decorators.md#prop`](../skills/stencil-compliance/references/decorators.md#prop) and [`form-reactivity.md#form-associated`](../skills/stencil-compliance/references/form-reactivity.md#form-associated).

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

## Step 5: Color Contrast Verification — Light Mode

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

**WCAG 2.1 AA contrast requirements** (criteria 1.4.3 + 1.4.11):

- Normal text (< 18px or < 14px bold): minimum **4.5:1**
- Large text (≥ 18px or ≥ 14px bold): minimum **3:1**
- UI components (borders, focus rings, icons): minimum **3:1**
- Disabled elements: exempt from contrast requirements

Test across all variants.

## Step 5b: Color Contrast Verification — Dark Mode

Toggle Storybook to dark mode and re-run contrast extraction:

```javascript
() => {
  document.documentElement.dataset.theme = 'dark';
  // Allow CSS recompute
  return new Promise(r => requestAnimationFrame(() => r(true)));
}
```

Then repeat the contrast extraction from Step 5. Both light and dark must pass independently.

Also run the token-level script:

```bash
yarn audit:contrast
```

This validates every documented token pair against `tokens/generated/core.tokens.json` (light) and `tokens/generated/core.dark.tokens.json` (dark). Exit code ≠ 0 means failure.

## Step 6: Focus Indicator Audit

For each interactive variant, Tab to the element and screenshot:

```text
mcp__playwright__browser_press_key({ key: "Tab" })
mcp__playwright__browser_take_screenshot({ type: "png", filename: ".playwright-mcp/focus-variant-X.png" })
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

> **Stencil-side mirror**: `::part(...)` exposure for focus-visible targets, `prefers-reduced-motion` handling, and shadow DOM styling rules live in [`stencil-compliance/references/jsx-styling.md#styling`](../skills/stencil-compliance/references/jsx-styling.md#styling).

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

| Category            | SC ref(s)        | Light  | Dark   | Issues |
| ---                 | ---              | ---    | ---    | ---    |
| Keyboard nav        | 2.1.1, 2.4.3     | P/F    | P/F    | X      |
| No keyboard trap    | 2.1.2            | P/F    | n/a    | X      |
| Focus visible       | 2.4.7, 1.4.11    | P/F    | P/F    | X      |
| ARIA name/role/val. | 4.1.2            | P/F    | n/a    | X      |
| ARIA states         | 4.1.2, 4.1.3     | P/F    | n/a    | X      |
| Text contrast       | 1.4.3            | P/F    | P/F    | X      |
| Non-text contrast   | 1.4.11           | P/F    | P/F    | X      |
| Use of color        | 1.4.1            | P/F    | P/F    | X      |
| Label in name       | 2.5.3            | P/F    | n/a    | X      |
| Status messages     | 4.1.3            | P/F    | n/a    | X      |
| Reduced motion      | 2.3.3            | P/F    | n/a    | X      |
| Text spacing        | 1.4.12           | P/F    | n/a    | X      |
| Token audit:contrast| 1.4.3 + 1.4.11   | P/F    | P/F    | X      |

### Critical (blocks users — must fix before merge)
1. ...

### High (significant barrier)
1. ...

### Medium (inconvenience)
1. ...

### Recommendations (WCAG 2.2 forward-looking, opt-in)
1. ...
```

Present report. **Do NOT auto-fix** — wait for approval. Every Critical/High issue blocks PR merge.
