# Slot Patterns — Validation Guards & Slot-Based Architecture

## Scope

Slot validation, valid-tag constants, and the rule against boolean slot-control props. **Read when designing slot APIs or validating slots.**

## Contents

- Slot Validation Guards (pattern + example)
- Valid Slot Element Constants (in the component's `.types.ts`)
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
