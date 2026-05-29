# Shadow DOM Dual Selector Pattern

## Scope

CSS pattern for slots with default content — must target both externally slotted AND shadow DOM children. **Read when writing CSS for components with slot defaults.**

---

## The Problem

`::slotted()` **only** targets elements slotted from outside the component. It does **NOT** target default elements rendered inside the shadow DOM.

**TSX with slot + default:**

```tsx
<slot name="badge-icon">
  <mud-icon name="warning" size="xs" />  {/* Default — in shadow DOM */}
</slot>
```

**❌ WRONG** (only targets external):

```css
::slotted(mud-icon) { --icon-color: var(--badge-icon-color); }
/* Default mud-icon NOT styled! */
```

**✅ CORRECT** (targets both):

```css
::slotted(mud-icon) { --icon-color: var(--badge-icon-color); }
.badge mud-icon { --icon-color: var(--badge-icon-color); }
```

---

## When to Use

Use dual selectors whenever:

1. You have a `<slot>` with default content
2. The default content is a styled element (mud-icon, img, span, etc.)
3. The element needs state-specific styling (hover, selected, disabled)

| Scenario | TSX | Required CSS |
|---|---|---|
| Icon slot with default | `<slot name="icon"><mud-icon /></slot>` | `::slotted(mud-icon)` + `.parent mud-icon` |
| Image slot with default | `<slot name="avatar"><img /></slot>` | `::slotted(img)` + `.parent img` |
| Badge with icon | `<slot name="badge-icon"><mud-icon /></slot>` | `::slotted(mud-icon)` + `.badge mud-icon` |

---

## Every State Needs Dual Selectors

**❌ WRONG** (only default state has dual):

```css
::slotted(mud-icon) { --icon-color: var(--default-color); }
.badge mud-icon { --icon-color: var(--default-color); }

:host([selected]) .badge ::slotted(mud-icon) { --icon-color: var(--selected-color); }
/* Missing: :host([selected]) .badge mud-icon */
```

**✅ CORRECT** (every state has dual):

```css
/* Default */
::slotted(mud-icon) { --icon-color: var(--default-color); }
.badge mud-icon { --icon-color: var(--default-color); }

/* Selected */
:host([selected]) .badge ::slotted(mud-icon) { --icon-color: var(--selected-color); }
:host([selected]) .badge mud-icon { --icon-color: var(--selected-color); }

/* Disabled */
:host([disabled]) .badge ::slotted(mud-icon) { --icon-color: var(--disabled-color); }
:host([disabled]) .badge mud-icon { --icon-color: var(--disabled-color); }
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
<mud-select-item badge badge-icon="true" />

<!-- Test 2: Externally slotted -->
<mud-select-item badge>
  <mud-icon slot="badge-icon" name="custom-icon" />
</mud-select-item>
```

Both must render identically in all states.
