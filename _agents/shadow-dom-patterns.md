# Shadow DOM Dual Selector Pattern

## Scope

CSS pattern for slots with default content — must target both externally slotted AND shadow DOM children. **Read when writing CSS for components with slot defaults.**

---

## The Problem

`::slotted()` **only** targets elements slotted from outside the component. It does **NOT** target default elements rendered inside the shadow DOM.

**TSX with slot + default:**

```tsx
<slot name="badge-icon">
  <cor-icon name="warning" size="xs" />  {/* Default — in shadow DOM */}
</slot>
```

**❌ WRONG** (only targets external):

```css
::slotted(cor-icon) { --icon-color: var(--badge-icon-color); }
/* Default cor-icon NOT styled! */
```

**✅ CORRECT** (targets both):

```css
::slotted(cor-icon) { --icon-color: var(--badge-icon-color); }
.badge cor-icon { --icon-color: var(--badge-icon-color); }
```

---

## When to Use

Use dual selectors whenever:

1. You have a `<slot>` with default content
2. The default content is a styled element (cor-icon, img, span, etc.)
3. The element needs state-specific styling (hover, selected, disabled)

| Scenario | TSX | Required CSS |
|---|---|---|
| Icon slot with default | `<slot name="icon"><cor-icon /></slot>` | `::slotted(cor-icon)` + `.parent cor-icon` |
| Image slot with default | `<slot name="avatar"><img /></slot>` | `::slotted(img)` + `.parent img` |
| Badge with icon | `<slot name="badge-icon"><cor-icon /></slot>` | `::slotted(cor-icon)` + `.badge cor-icon` |

---

## Every State Needs Dual Selectors

**❌ WRONG** (only default state has dual):

```css
::slotted(cor-icon) { --icon-color: var(--default-color); }
.badge cor-icon { --icon-color: var(--default-color); }

:host([selected]) .badge ::slotted(cor-icon) { --icon-color: var(--selected-color); }
/* Missing: :host([selected]) .badge cor-icon */
```

**✅ CORRECT** (every state has dual):

```css
/* Default */
::slotted(cor-icon) { --icon-color: var(--default-color); }
.badge cor-icon { --icon-color: var(--default-color); }

/* Selected */
:host([selected]) .badge ::slotted(cor-icon) { --icon-color: var(--selected-color); }
:host([selected]) .badge cor-icon { --icon-color: var(--selected-color); }

/* Disabled */
:host([disabled]) .badge ::slotted(cor-icon) { --icon-color: var(--disabled-color); }
:host([disabled]) .badge cor-icon { --icon-color: var(--disabled-color); }
```

**Rule**: If you write a `::slotted()` selector for a state, ALWAYS write the corresponding direct child selector.

---

## Verification

- [ ] Every `<slot>` with default content has dual CSS selectors
- [ ] Both `::slotted()` and direct child selectors use identical property values
- [ ] All interactive states have dual selectors
- [ ] Test with BOTH externally slotted element AND default element

```html
<!-- Test 1: Default element (no slot content) -->
<cor-select-item badge badge-icon="true" />

<!-- Test 2: Externally slotted -->
<cor-select-item badge>
  <cor-icon slot="badge-icon" name="custom-icon" />
</cor-select-item>
```

Both must render identically in all states.
