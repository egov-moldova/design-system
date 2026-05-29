# Reuse-First Protocol & Architecture Decisions

## Scope

How to check for existing components before building, and how to choose the right architecture pattern. **Read before creating any component.**

---

## Reuse-First Protocol

**Before creating ANY new component or pattern, check what exists:**

1. **Search existing components**: `src/components/mud-*/` — read `.tsx`, `.css`, `.enums.ts`, `.constants.ts`, `.types.ts`
2. **Check existing tokens**: `tokens/core/components/` — component-specific token files
3. **Study reference implementations**:
   - `mud-button`: slot-based (`<slot />`), `::slotted(*)` CSS, `:host([variant])` + `:host([size])`, variant/state token mapping
   - `mud-input`: `@Listen` for focus/blur/input, `@State()` for `isFocused`/`hasValue`, floating label, skeleton state, icon slots
4. **Reuse enums/types**: Check if `ButtonVariant`, `InputSize`, `IconColor`, etc. already define needed values
5. **Reuse utilities**: `src/utils/` — `invalidSlottedTag()`, `flattenTokens()`

**Copy patterns, not code.** Match the existing component architecture exactly.

### Reuse Decision Matrix

| Storybook vs Figma Match | Action |
| --- | --- |
| **Exact match** | ✅ Use as-is with existing props |
| **~80% match** (needs variant/prop) | ✅ Extend — add new `@Prop` or enum value |
| **~50% match** (similar concept, different structure) | ⚠️ **Ask user** — propose extending vs creating new |
| **<50% match** or no candidate | 🔴 Create new — follow pre-implementation protocol |

**Never create a duplicate component.** If one exists with similar purpose, extend it.

---

## Architecture Decision Tree

**Before implementing ANY component, determine the correct pattern:**

```text
Is this a form-associated element (input, select, textarea, checkbox, radio)?
├─ YES → Internal DOM Pattern (MANDATORY)
│         - formAssociated: true
│         - @AttachInternals() internals
│         - Component renders the form element internally
│         - Validate icon/helper-text slots if present
│         - Reference: mud-input, mud-textarea
│
└─ NO → Is this a wrapper/container component?
          ├─ YES → Slot-Based Pattern
          │         - User provides entire element via <slot />
          │         - Style with ::slotted(*)
          │         - Validate slotted element type
          │         - Reference: mud-button
          │
          └─ NO → Internal DOM Pattern
                    - Component owns markup
                    - Style with class selectors
                    - Reference: mud-card, mud-badge
```

**Critical Rule:** Form-associated components **CANNOT** use slot-based pattern — they require direct control of the form element for `ElementInternals` API integration.

**Why:**

- **Form elements** need `internals.setFormValue()`, `formResetCallback()`, and validation sync — only possible with internal elements
- **Wrapper components** (buttons, links) let users control the HTML element while providing styling
- **Display components** (badges, cards) own markup for consistent structure
