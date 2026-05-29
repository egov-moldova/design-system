---
name: accessibility-compliance
description: Use when designing, implementing, auditing, or modifying any component to ensure WCAG 2.1 Level AA conformance. Covers color contrast, keyboard navigation, ARIA, focus management, motion preferences, screen reader compatibility, and dark mode validation. Required reference for all `mud-*` components.
---

# Accessibility Compliance — WCAG 2.1 Level AA

**Target standard:** WCAG 2.1 Level AA. Every `mud-*` component must conform.

**Project source of truth:** [Figma Components — node 2753-5965](https://www.figma.com/design/doJ7tDY0PlQ0PqMgbpFVIC/Components?node-id=2753-5965&m=dev) (project-specific addendum to 2.1 AA — see Section 7).

**Both light and dark themes must conform independently.** Verify contrast in both modes via Storybook globals (`mode: light` and `mode: dark`).

---

## 1. Success Criteria Applicable to a Stencil Component Library

These are the WCAG 2.1 Level AA Success Criteria that apply to a UI component library (excludes page-level concerns like skip links, language attributes, video captions — those are application-layer):

### Principle 1 — Perceivable

| SC | Title | Level | Applies to |
|----|-------|-------|------------|
| 1.1.1 | Non-text Content | A | Icons, illustrations, decorative graphics |
| 1.3.1 | Info and Relationships | A | Form labels, table headers, grouping |
| 1.3.2 | Meaningful Sequence | A | Reading/tab order in composite widgets |
| 1.3.4 | Orientation | AA | No locked portrait/landscape |
| 1.3.5 | Identify Input Purpose | AA | `autocomplete` on form inputs |
| 1.4.1 | Use of Color | A | Errors, states never color-only |
| 1.4.3 | Contrast (Minimum) | **AA** | Text: 4.5:1 normal / 3:1 large |
| 1.4.4 | Resize Text | AA | Layout survives 200% zoom |
| 1.4.10 | Reflow | AA | No horizontal scroll at 320 CSS px |
| 1.4.11 | Non-text Contrast | **AA** | UI components & focus rings: 3:1 |
| 1.4.12 | Text Spacing | AA | Layout survives 1.5× line-height, 0.12em letter-spacing, 0.16em word-spacing, 2× paragraph spacing |
| 1.4.13 | Content on Hover or Focus | AA | Tooltips: dismissible, hoverable, persistent |

### Principle 2 — Operable

| SC | Title | Level | Applies to |
|----|-------|-------|------------|
| 2.1.1 | Keyboard | A | Every interactive control via keyboard |
| 2.1.2 | No Keyboard Trap | A | Focus always escapable |
| 2.1.4 | Character Key Shortcuts | A | Single-key shortcuts remappable/off |
| 2.4.3 | Focus Order | A | Tab follows visual/logical order |
| 2.4.6 | Headings and Labels | AA | Labels descriptive |
| 2.4.7 | Focus Visible | **AA** | `:focus-visible` always rendered |
| 2.5.1 | Pointer Gestures | A | No mandatory multi-finger/path gestures |
| 2.5.2 | Pointer Cancellation | A | Down-event doesn't trigger action |
| 2.5.3 | Label in Name | A | Accessible name includes visible text |
| 2.5.4 | Motion Actuation | A | Don't require device motion |

### Principle 3 — Understandable

| SC | Title | Level | Applies to |
|----|-------|-------|------------|
| 3.2.1 | On Focus | A | Focus doesn't trigger context change |
| 3.2.2 | On Input | A | Input doesn't auto-submit |
| 3.3.1 | Error Identification | A | Errors identified in text |
| 3.3.2 | Labels or Instructions | A | Inputs labeled |
| 3.3.3 | Error Suggestion | AA | Suggest fix when possible |
| 3.3.4 | Error Prevention (Legal/Financial) | AA | Reversible/confirmable for irreversible actions |

### Principle 4 — Robust

| SC | Title | Level | Applies to |
|----|-------|-------|------------|
| 4.1.2 | Name, Role, Value | A | All custom controls expose ARIA |
| 4.1.3 | Status Messages | AA | `role="status"` / `aria-live` for dynamic content |

**Reference:** [`references/wcag-guidelines.md`](references/wcag-guidelines.md) for detailed code examples per criterion.

---

## 2. Contrast Requirements (1.4.3 + 1.4.11)

| Element | Minimum ratio | Notes |
|---------|---------------|-------|
| Normal text (< 18pt or < 14pt bold) | **4.5 : 1** | Body, labels, captions |
| Large text (≥ 18pt or ≥ 14pt bold) | **3 : 1** | Headings, large UI text |
| UI components (borders, icons, control boundaries) | **3 : 1** | Adjacent colors |
| Focus indicator ring | **3 : 1** | Against background AND against adjacent enabled element |
| **Disabled elements** | Exempt | But document the exemption; do not rely on it for active states |

**How to verify:**
- Automated: `yarn audit:contrast` (runs `scripts/audit-token-contrast.mjs`) — must exit 0.
- Manual: Storybook a11y addon panel — zero violations on `color-contrast` and `color-contrast-non-text` rules.
- During development: `mcp__playwright__browser_evaluate` to extract computed colors; compute ratio.

**Both modes:** Re-run verification with `data-theme="dark"` set on `<html>`.

---

## 3. Keyboard Navigation Checklist

Every interactive component must:

- [ ] **Reachable via Tab** — focusable in normal tab order
- [ ] **Activated via Enter** (buttons, links) and **Space** (buttons, toggles, checkboxes)
- [ ] **Dismissed via Escape** (modals, dropdowns, popovers, tooltips)
- [ ] **Arrow keys** for composite widgets (tabs, menus, radio groups, listboxes)
- [ ] **Home/End** jump to first/last item in lists/grids
- [ ] **No keyboard trap** — Tab and Shift+Tab move past the component
- [ ] **Focus restored** to trigger after dismiss (modal closes → trigger button regains focus)
- [ ] **`:focus-visible` only** — no focus ring on mouse activation
- [ ] **Logical tab order** — matches visual reading order

**Composite widget patterns:** see [`references/aria-patterns.md`](references/aria-patterns.md).

---

## 4. ARIA Per Component Type

Quick checklist by component family. Full patterns in [`references/aria-patterns.md`](references/aria-patterns.md).

| Component | Required attributes |
|-----------|---------------------|
| **Button** | Accessible name (text content or `aria-label`); `aria-disabled` if disabled; `aria-pressed` if toggle |
| **Input** (text/email/etc.) | Associated `<label>` or `aria-label`; `aria-invalid` on error; `aria-describedby` pointing to error/hint; `aria-required` if required; `autocomplete` per 1.3.5 |
| **Checkbox / Radio** | Native input preferred; `aria-checked` if custom; group via `<fieldset>` + `<legend>` or `role="group"` + `aria-labelledby` |
| **Select / Combobox** | `role="combobox"`, `aria-expanded`, `aria-controls` pointing to listbox; `aria-activedescendant` for keyboard highlight |
| **Modal / Dialog** | `role="dialog"` or `role="alertdialog"`; `aria-modal="true"`; `aria-labelledby` → title; `aria-describedby` → body; focus trap; Escape closes; focus restored |
| **Tabs** | `role="tablist"` / `role="tab"` / `role="tabpanel"`; `aria-selected`; `aria-controls`; `tabIndex={-1}` on inactive tabs; arrow-key navigation |
| **Tooltip** | `role="tooltip"`; `aria-describedby` from trigger; dismissible via Escape; hoverable; persistent |
| **Toast / Notification** | `role="status"` (polite) or `role="alert"` (assertive); auto-dismiss ≥ 5s or user-controlled |
| **Menu** | `role="menu"` / `role="menuitem"`; `aria-haspopup`; arrow keys |
| **Accordion** | `aria-expanded` on trigger; `aria-controls` → panel; panel has `role="region"` + `aria-labelledby` |

---

## 5. Motion, Animation, and Reduced Motion (2.2.2, 2.3.1, 2.3.3)

- All animations longer than 5 seconds must be pausable/stoppable.
- No content flashes more than 3 times per second.
- **Honor `prefers-reduced-motion: reduce`** — disable non-essential transitions, keep functional state changes.
- The global rule in [`src/assets/css/base/html.css`](../../../src/assets/css/base/html.css) handles this. Components must NOT override it.

---

## 6. Dark Mode Validation

Every component must be audited in **both** themes:

1. In Storybook, set global `mode: light` → verify a11y panel = zero violations.
2. Set global `mode: dark` → verify a11y panel = zero violations.
3. Run `yarn audit:contrast` — script reads both `tokens/generated/core.tokens.json` and `tokens/generated/core.dark.tokens.json`.

Dark-mode contrast pairs that frequently fail: text on inverse backgrounds, focus ring on dark surface, disabled state visibility against dark surface.

---

## 7. Project-Specific Addendum from Figma

The Figma node [`2753-5965`](https://www.figma.com/design/doJ7tDY0PlQ0PqMgbpFVIC/Components?node-id=2753-5965&m=dev) defines proiect-specific accessibility requirements that supplement WCAG 2.1 AA. When working on a component, extract these via:

```text
mcp__figma__get_design_context({ nodeId: "2753-5965" })
```

If Figma requirements are stricter than 2.1 AA (e.g., 7:1 contrast, 44×44 target size), they override 2.1 AA minimums.

**Target size note:** WCAG 2.1 AA does **not** include criterion 2.5.5 Target Size as a Level AA requirement (it is Level AAA in 2.1; criterion 2.5.8 in WCAG 2.2 requires only 24×24). The existing `button` sm/xs and `checkbox` sm/md sizes are documented exceptions — see [`src/components/_agents/target-size-exceptions.md`](../../../src/components/_agents/target-size-exceptions.md).

---

## 8. Verification Workflow

When implementing or modifying a component:

1. **Before coding** — read this Skill + relevant component pattern in `references/aria-patterns.md`.
2. **During coding** — apply checklists from Sections 3 & 4.
3. **Before commit** — run `yarn audit:contrast` (token-level) + Storybook a11y addon (component-level).
4. **Before PR** — run `/audit-accessibility @mud-<name>` for deep audit (keyboard flow, ARIA states, focus contrast, both modes).
5. **Component migration** — `/migrate-component` blocks graduation from `src/hidden/` to `src/components/` if a11y audit fails.

---

## 9. Forward-Looking Recommendations (WCAG 2.2 — Opt-In, Not Required for 2.1 AA)

These are **not required** by WCAG 2.1 AA. Treat them as aspirational; do not block PRs for them.

| WCAG 2.2 SC | Title | Note |
|-------------|-------|------|
| 2.4.11 | Focus Not Obscured (Minimum) | Sticky headers/footers must not fully occlude the focused element |
| 2.4.13 | Focus Appearance | Stronger focus indicator definition (≥ 2 CSS px outline, 3:1 contrast change) |
| 2.5.7 | Dragging Movements | Single-pointer alternative for drag-and-drop |
| 2.5.8 | Target Size (Minimum) | 24×24 CSS px for non-inline targets |
| 3.2.6 | Consistent Help | Help mechanisms in consistent order |
| 3.3.7 | Redundant Entry | Don't re-prompt for previously entered info |
| 3.3.8 | Accessible Authentication (Minimum) | No cognitive function tests for auth |

Address these only when explicitly required by Figma project-spec or a downstream consumer (e.g., a customer with 2.2-AA contract).

---

## References

- [`references/wcag-guidelines.md`](references/wcag-guidelines.md) — full criteria with code examples (split: 2.1 AA mandatory + 2.2 future)
- [`references/aria-patterns.md`](references/aria-patterns.md) — ARIA roles, states, properties, composite widget patterns
- [`references/mobile-accessibility.md`](references/mobile-accessibility.md) — touch, gesture, screen-reader (VoiceOver/TalkBack) notes
- [WCAG 2.1 Quick Reference (W3C)](https://www.w3.org/WAI/WCAG21/quickref/)
- [Understanding WCAG 2.1 (W3C)](https://www.w3.org/WAI/WCAG21/Understanding/)
- [WAI-ARIA Authoring Practices (W3C)](https://www.w3.org/WAI/ARIA/apg/)
