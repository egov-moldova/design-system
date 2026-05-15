# Slot Patterns — Validation Guards & Slot-Based Architecture

## Scope

Slot validation, shared constants, and the rule against boolean slot-control props. **Read when designing slot APIs or validating slots.**

## Contents

- Slot Validation Guards (pattern + example)
- Shared Constants for Valid Slot Elements
- No Boolean Props for Slot Visibility (CSS :empty rule)
- Dual Selector Pattern (slot with default content)

---

## Slot Validation Guards

**All components with named slots MUST validate slotted elements.**

### Pattern

```typescript
import { invalidSlottedTag } from '../../utils/invalid-slotted-tag';

render() {
  const slottedElement = this.host.querySelector('[slot="slot-name"]');
  const VALID_TAGS = ['span', 'div', 'cor-icon'];

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
- `VALID_ICON_SLOT_TAGS` — `['cor-icon']`

### Validation Rules by Slot Type

| Slot Type | Valid Elements | Constant |
|---|---|---|
| Icon slots | `cor-icon` only | `VALID_ICON_SLOT_TAGS` |
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
├─ NO → CSS :empty selector (e.g., cor-input icons)
└─ YES → Slot detection + conditional rendering (e.g., cor-link icon-only)
```

### Checklist for New Components

- [ ] Identify all named slots
- [ ] Define valid element types per slot
- [ ] Add validation at start of `render()`
- [ ] Import `invalidSlottedTag` utility
- [ ] Use shared constants (not inline arrays)
- [ ] Test with invalid elements
