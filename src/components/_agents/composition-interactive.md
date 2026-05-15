# Composition & Interactive Patterns

## Scope

Organism/template composition patterns and required states/behaviors for interactive components. **Read when building molecules or organisms.**

---

## Organism & Template Composition — Section Mapping

When building an **organism** or **template**, create a Section Mapping Table before implementation:

```markdown
| # | Figma Section | Sub-Component | Level | Props Needed | Notes |
|---|---------------|---------------|-------|--------------|-------|
| 1 | Search bar | cor-search | Atom | placeholder, size="lg" | Has clear button |
| 2 | Filter row | cor-filter-group | Molecule | filters[], onFilterChange | Horizontal layout |
| 3 | Data rows | cor-data-row | Molecule | columns, data, sortable | Repeating pattern |
| 4 | Pagination | cor-pagination | Atom | currentPage, totalPages | Bottom of table |
```

**Workflow:**

1. **Map** each Figma section to an existing sub-component
2. **Verify** each in Storybook matches Figma
3. **If missing** → build first (bottom-up rule)
4. **Compose** using slots or internal DOM
5. **Test** assembled organism against full Figma design

**Slot-based** (preferred for flexible organisms):

```html
<cor-data-table>
  <cor-search slot="toolbar"></cor-search>
  <cor-pagination slot="footer"></cor-pagination>
</cor-data-table>
```

**Internal** (when organism owns all markup):

```tsx
render() {
  return (
    <Host>
      <div class="toolbar"><slot name="toolbar" /></div>
      <div class="body">{this.renderRows()}</div>
      <div class="footer"><slot name="footer" /></div>
    </Host>
  );
}
```

---

## Interactive Component Patterns — Required States & Behaviors

Every interactive component must implement **all applicable states**.

| Component Type | Required Props | Required States | Required Behaviors |
| --- | --- | --- | --- |
| **Button** | `variant`, `size`, `disabled` | default, hover, active, focus-visible, disabled | Click via slotted `<button>`, loading spinner via slot |
| **Input** | `value`, `type`, `disabled`, `invalid`, `size` | empty, filled, focused, error, disabled, skeleton | `@Listen` focus/blur/input, floating label, icon slots |
| **Select/Dropdown** | `value`, `options`, `disabled`, `invalid` | closed, open, selected, disabled, error | Open on click, close on outside click, keyboard ↑↓ Enter Escape |
| **Checkbox/Radio/Toggle** | `checked`, `disabled`, `name` | unchecked, checked, indeterminate, disabled, focused | `@Event` change, keyboard Space, label association |
| **Tabs** | `activeTab`, `tabs` | active highlighted, inactive default | Click switches, keyboard ←→, `@Event` tab change |
| **Search** | `value`, `placeholder` | empty, typing, has-value (show clear) | Real-time input, clear button, Escape clears |
| **Pagination** | `currentPage`, `totalPages` | current highlighted, disabled prev/next at edges | Click navigates, `@Event` page change |
| **Table** | `columns`, `data`, `sortable` | default, sorted-asc, sorted-desc, row-hover | Column click sorts, direction indicator |

### General Rules

- **Accessibility**: Semantic HTML + ARIA (`role`, `aria-label`, `aria-expanded`, `aria-selected`)
- **Keyboard**: All interactive reachable via Tab, activatable via Enter/Space, dismissible via Escape
- **Focus**: Visible `:focus-visible` ring on keyboard nav, no ring on mouse click
- **Disabled**: `pointer-events: none` on container, `cursor: not-allowed` on host, reduced opacity via token
- **Events**: `@Event()` with `cor` prefix (`corInputChange`, `corSelectChange`)
- **Controlled**: Props drive state, events notify parent — no internal mutation of `@Prop()` values
