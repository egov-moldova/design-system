# Slot Patterns — Validation Guards & Slot-Based Architecture

## Scope

Slot validation, shared constants, and the rule against boolean slot-control props. **Read when designing slot APIs or validating slots.**

## Contents

- Slot Validation Guards (pattern + example)
- Shared Constants for Valid Slot Elements
- No Boolean Props for Slot Visibility (CSS :empty rule)
- No String Content Props as Slot Fallback (slot-first content rule)
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

### Use Shared Constants

```typescript
import { VALID_HELPER_TEXT_TAGS, VALID_ICON_SLOT_TAGS } from '../shared.constants';
```

**Available** (from `src/components/shared.constants.ts`):
- `VALID_HELPER_TEXT_TAGS` — `['span', 'small', 'div', 'p']`
- `VALID_ICON_SLOT_TAGS` — `['mud-icon']`

### Validation Rules by Slot Type

| Slot Type | Valid Elements | Constant |
|---|---|---|
| Icon slots | `mud-icon` only | `VALID_ICON_SLOT_TAGS` |
| Helper text | `span`, `small`, `div`, `p` | `VALID_HELPER_TEXT_TAGS` |
| Button content | `button`, `a` | Component-level `BUTTON_TAGS` |

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
@Element() el!: HTMLElement;
@State() private hasDefaultSlotContent: boolean = true;

componentDidLoad() {
  this.checkDefaultSlotContent();
  const slots = this.el.shadowRoot?.querySelectorAll('slot');
  slots?.forEach(slot => {
    slot.addEventListener('slotchange', () => {
      if (!slot.name) this.checkDefaultSlotContent();
    });
  });
}

private checkDefaultSlotContent() {
  const children = Array.from(this.el.childNodes);
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
├─ NO → CSS :empty selector (e.g., mud-input icons)
└─ YES → Slot detection + conditional rendering (e.g., mud-link icon-only)
```

### Checklist for New Components

- [ ] Identify all named slots
- [ ] Define valid element types per slot
- [ ] Add validation at start of `render()`
- [ ] Import `invalidSlottedTag` utility
- [ ] Use shared constants (not inline arrays)
- [ ] Test with invalid elements

---

## No String Content Props as Slot Fallback — Slot-First Content Rule

**CRITICAL**: When a slot accepts visible content, **the slot is the only content source**. Do not declare a parallel `@Prop() xxx?: string` that gets rendered as the slot's fallback child.

The reference components (`mud-button`, `mud-service-button`) follow the inverse pattern: visible content comes exclusively from the default `<slot>`; the `label` prop, when it exists, is used only as `aria-label` for icon-only mode.

### ❌ Forbidden — content prop with slot fallback

```typescript
@Prop() label?: string;

render() {
  const labelText = this.label?.trim();
  return (
    <span class="label">
      <slot name="label">{labelText}</slot>  {/* ← content-prop-as-fallback */}
    </span>
  );
}
```

**Problems:**
- Two ways to set the same content — consumers must learn which wins.
- Prop value can never live in light DOM, breaking copy/paste, screen-reader inspection, and `querySelector('mud-x [slot=label]')` discovery.
- Rich content (links, icons, formatted text) requires the slot anyway, so the prop is a half-API.
- Diverges from `mud-button` / `mud-service-button` where `label` is ARIA-only.

### ✅ Allowed — slot is the sole content source

```typescript
render() {
  return (
    <span class="label">
      <slot name="label" />
    </span>
  );
}
```

```html
<!-- consumer markup -->
<mud-checkbox>
  <span slot="label">Acord</span>
</mud-checkbox>
```

### ✅ Allowed — prop is ARIA-only, matches reference

```typescript
/** Accessible name for icon-only / visually-hidden cases. NOT rendered as text. */
@Prop() label?: string;

render() {
  return (
    <Host>
      <button class="control" aria-label={this.label}>
        <slot />  {/* visible content lives here */}
      </button>
    </Host>
  );
}
```

### When is a string prop OK?

- ARIA-only (`label` for icon-only, `aria-label`, `aria-describedby`).
- Form metadata (`name`, `value`, `placeholder`).
- Non-rendered configuration (`href`, `type`, etc.).
- **Never** as the source of visible text that has a matching `<slot>`.

### Detection

`scripts/audit/02-stencil-antipatterns.mjs` flags pattern `ANTIPATTERN-026-PROP-CONTENT-SLOT-FALLBACK`: any `<slot ...>{...}</slot>` whose fallback expression dereferences a `this.*` prop. Audit verdict downgrades to **Review — partial** when this fires.
