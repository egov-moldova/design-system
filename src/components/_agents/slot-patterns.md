# Slot Patterns — Validation Guards & Slot-Based Architecture

## Scope

Slot validation, valid-tag constants, and the rule against boolean slot-control props. **Read when designing slot APIs or validating slots.**

## Contents

- Slot Validation Guards (pattern + example)
- Valid Slot Element Constants (in the component's `.types.ts`)
- No Boolean Props for Slot Visibility (CSS :empty rule)
- Prop, Slot or Hybrid (content API rule, one meaning for `label`, collection precedence)
- Dual Selector Pattern (slot with default content)

---

## Slot Validation Guards

**All components with named slots MUST validate slotted elements.**

### Pattern

```typescript
import { invalidSlottedTag } from '../../utils/invalid-slotted-tag';

render() {
  const slottedElement = this.host.querySelector('[slot="slot-name"]');
  const VALID_TAGS = ['span', 'div', 'mud-icon'];

  if (slottedElement && !VALID_TAGS.includes(slottedElement.tagName.toLowerCase())) {
    return <Host>{invalidSlottedTag(slottedElement.tagName.toLowerCase(), VALID_TAGS)}</Host>;
  }
  return <Host><slot name="slot-name" /></Host>;
}
```

### Declare Valid Tags in the Component's `.types.ts`

Export the list as a named `readonly string[]` constant from the component's own
`.types.ts` and import it in the `.tsx`, as `mud-tooltip` does with `VALID_TRIGGER_TAGS`:

```typescript
// mud-tooltip.types.ts
export const VALID_TRIGGER_TAGS: readonly string[] = ['button', 'a', 'span', 'div', 'mud-button', 'mud-icon' /* … */];

// mud-tooltip.tsx
import { VALID_TRIGGER_TAGS } from './mud-tooltip.types';
```

### Validation Rules by Slot Type

| Slot Type | Valid Elements |
|---|---|
| Icon slots | `mud-icon` only |
| Helper text | `span`, `small`, `div`, `p` |
| Button content | `button`, `a` |

### When to Validate

- ✅ Named slots with specific element requirements
- ✅ Component is part of public API
- ❌ Default slot accepting any content
- ❌ Internal/private components

---

## Slot-Based Architecture — No Boolean Props for Layout

**CRITICAL**: Never use boolean props to control slot rendering/visibility.

### ❌ Forbidden

```typescript
@Prop() iconLeft: boolean = false;
@Prop() showHelper: boolean = false;

render() {
  return <Host>{this.iconLeft && <slot name="icon-left" />}</Host>;
}
```

**Problems**: Redundant API, confusing behavior, violates composition.

### ✅ Pattern 1: CSS `:empty` (Simple Cases)

Use when slots are always in the same position, just hidden when empty:

```typescript
render() {
  return (
    <Host>
      <span class="icon icon--left"><slot name="icon-left"></slot></span>
      <span class="label"><slot></slot></span>
      <span class="icon icon--right"><slot name="icon-right"></slot></span>
    </Host>
  );
}
```

```css
.icon:empty { display: none; }
```

### ✅ Pattern 2: Slot Detection (Complex Layouts)

Use when layout changes based on slot content (e.g., icon-only mode):

```typescript
@Element() host!: HTMLMud<Name>Element;
@State() private hasDefaultSlotContent: boolean = true;

componentDidLoad() {
  this.checkDefaultSlotContent();
  const slots = this.host.shadowRoot?.querySelectorAll('slot');
  slots?.forEach(slot => {
    slot.addEventListener('slotchange', () => {
      if (!slot.name) this.checkDefaultSlotContent();
    });
  });
}

private checkDefaultSlotContent() {
  const children = Array.from(this.host.childNodes);
  this.hasDefaultSlotContent = children.some(node => {
    if (node.nodeType === Node.ELEMENT_NODE) return !(node as HTMLElement).getAttribute('slot');
    if (node.nodeType === Node.TEXT_NODE) return node.textContent?.trim() !== '';
    return true;
  });
}

private get isIconOnly(): boolean { return !this.hasDefaultSlotContent; }
```

### Decision Tree

```text
Does layout change based on slot content?
├─ NO → CSS :empty selector (e.g., mud-text-input icons)
└─ YES → Slot detection + conditional rendering (e.g., mud-link icon-only)
```

### Checklist for New Components

- [ ] Identify all named slots
- [ ] Define valid element types per slot
- [ ] Add validation at start of `render()`
- [ ] Import `invalidSlottedTag` utility
- [ ] Declare valid tags as a named constant in the component's `.types.ts` (not an inline array)
- [ ] Test with invalid elements

---

## Prop, Slot or Hybrid — Content API Rule

Decided in [#165](https://github.com/egov-moldova/design-system/issues/165) (Option C of
[`docs/backlog/2026-05-27-slot-first-content-refactor.md`](../../../docs/backlog/2026-05-27-slot-first-content-refactor.md),
plus one meaning for `label`). Content a component supplies itself, its built-in copy, is a
separate matter: see [`_agents/localization.md`](../../../_agents/localization.md).

| Content | Channel | Examples |
| --- | --- | --- |
| Plain text the component must wire itself inside its shadow root (`<label for>`, `aria-describedby`, `aria-live`) | **Prop** | `errorText` |
| Structured data (lists, form values) and configuration | **Prop** | `columns` / `rows`, `steps`, `segments`, `value`, `href` |
| Rich content (links, icons, formatted text) | **Slot** | `mud-button`'s content, `actions` |
| `mud-*` children the parent coordinates (keyboard, active state) | **Slot** (compound) | `mud-menu` → `mud-menu-item`, `mud-sidebar` |
| Field labels and helper text, short plain text | **Hybrid**: a text prop renders, a slot overrides it | `mud-text-input` `label` / `helperText`, `mud-tag` `label` |

### `label` always means visible text

A `label` prop renders. It is never an accessible name alone. An accessible-name-only
override comes from the native `aria-label` attribute on the host, which the component
forwards to its internal control with `observeAriaLabel` (`src/utils/aria-label.ts`). The
one exception is a group or container name (`mud-button-group`, `mud-accordion`,
`mud-breadcrumb`, `mud-modal`, `mud-pagination`), where there is no visible text to show.

### Hybrid — the documented pattern

```typescript
/** Visible label. The `label` slot overrides it for rich content. */
@Prop() label?: string;

render() {
  return (
    <label class="label" htmlFor={this.inputId}>
      <slot name="label" onSlotchange={this.onLabelSlotChange}>
        {this.label?.trim()}
      </slot>
    </label>
  );
}
```

When both are set, the slot wins. Keep the wiring (`for`, `aria-describedby`) on the
component's own element, so it holds whichever source fills it.

### Collections with two APIs: the prop wins

A collection that takes both an array prop and declarative children (`mud-accordion`
`items`, `mud-breadcrumb` `items`, `mud-tabs` `tabs`) renders the prop when both are set, and
warns once with `console.warn`. Pick one API per instance.

### Detection

`scripts/audit/02-stencil-antipatterns.mjs` reports `ANTIPATTERN-026-PROP-CONTENT-SLOT-FALLBACK`
(warning) for a slot whose fallback renders text from a JSX expression, or for text rendered
beside a slot behind a `has*Slot` guard, in any component not listed in
`HYBRID_CONTENT_COMPONENTS` in the same file. The list names each hybrid and its reason. A new
hybrid is added there deliberately, never silenced in place. Attribute values of a default
element (`<slot name="icon"><mud-icon name={iconName} /></slot>`) are not text and do not count.

### Not yet conforming

Tracked in #165, one PR per phase:

- `mud-radio`: `label` / `supportingText` are an accessible name only; it becomes a hybrid like
  `mud-checkbox` and `mud-switch` (phase 3, after #167).
- `mud-button`, `mud-service-button`, `mud-chip`: `label` is still an accessible name only,
  deprecated in favour of the native `aria-label`, which they forward; it goes away in the next
  major.
