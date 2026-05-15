# Token Naming Conventions — Property & CSS Variable Patterns

## Scope

camelCase for compound JSON properties, token naming patterns, CSS variable naming, and JSON structure examples. **Read when naming new tokens or CSS variables.**

## Contents

- Property Naming: camelCase for Compound Properties
- Token Naming: No "components" Wrapper Object
- CSS Variable Naming Patterns (multi-element, simple, shared)
- State Ordering Convention
- Complete JSON Structure Example

---

## Property Naming: camelCase for Compound Properties

In token JSON files, compound properties **MUST** use camelCase:

```json
// ✅ CORRECT — camelCase compound properties
{
  "button": {
    "fontSize": { "value": "{fontSize.sm}", "type": "fontSizes" },
    "fontWeight": { "value": "{fontWeight.semibold}", "type": "fontWeights" },
    "lineHeight": { "value": "{lineHeight.tight}", "type": "lineHeights" },
    "borderRadius": { "value": "{radius.md}", "type": "borderRadius" },
    "paddingInline": { "value": "{spacing.md}", "type": "spacing" },
    "paddingBlock": { "value": "{spacing.sm}", "type": "spacing" },
    "borderWidth": { "value": "{border.width.sm}", "type": "borderWidth" },
    "icon": { 
      "color": { "value": "{color.neutral.icon.default}", "type": "color" }
    },
    "badge-icon": {
      "color": { "value": "{color.system.warning.icon}", "type": "color" }
    }
  }
}

// ❌ WRONG — kebab-case, snake_case, or inconsistent
{
  "button": {
    "font-size": { "value": "..." },
    "font_weight": { "value": "..." },
    "FontSize": { "value": "..." }
  }
}
```

**Why**: Style Dictionary converts `camelCase` → `kebab-case` during build. Writing kebab in JSON causes double-kebab in output.

| JSON Key | Generated CSS Variable |
|---|---|
| `fontSize` | `--button-font-size` ✅ |
| `font-size` | `--button-font-size` ⚠️ (works but non-standard in JSON) |
| `font_size` | `--button-font_size` ❌ (underscore preserved) |

---

## Token Naming: No "components" Wrapper Object

**❌ WRONG** — wrapping in `"components"`:

```json
{ "components": { "button": { "fontSize": { "value": "..." } } } }
// Generates: --components-button-font-size ❌
```

**✅ CORRECT** — component name at root:

```json
{ "button": { "fontSize": { "value": "..." } } }
// Generates: --button-font-size ✅
```

---

## CSS Variable Naming Patterns

All token names align with the [Figma Foundations](https://www.figma.com/design/wkHMxgDWxZKaXQ7zNxhSxN/Foundations) 4-part scheme:

| Position | Figma term | Token examples |
| --- | --- | --- |
| 1 | category | `color`, `palette`, `spacing`, `borderRadius`, `fontSize` |
| 2 | type | `background`, `text`, `border`, `icon` (component layer: `container`, `label`, `track`, …) |
| 3 | role | `base`, `brand`, `danger`, `positive`, `warning`, `info`, `disabled` |
| 4 | variant | `default`, `hover`, `active`, `focus`, `selected`, `disabled` |

→ Semantic: `color.background.brand.default` → `--color-background-brand-default`.
→ Component: `{component}.{element}.{property}.{variant}` → `--{component}-{element}-{property}-{variant}`.

### Multi-Element Component (e.g., select-item)

```text
--{component}.{element}.{property}[.{state}]
--select-item.label.color.default
--select-item.description.font-size
--select-item.badge.background.selected
--select-item.badge-icon.color.selected
```

JSON:

```json
{
  "select-item": {
    "label": {
      "color": {
        "default": { "value": "{color.neutral.text.weak}" },
        "hover": { "value": "{color.neutral.text.default}" },
        "selected": { "value": "{color.neutral.text.strong}" }
      },
      "fontWeight": {
        "default": { "value": "{fontWeight.regular}" },
        "selected": { "value": "{fontWeight.semibold}" }
      }
    },
    "badge": {
      "background": { "value": "{color.neutral.background.fill}" },
      "iconColor": {
        "default": { "value": "{color.neutral.icon.default}" },
        "selected": { "value": "{color.system.warning.icon}" }
      }
    }
  }
}
```

### Simple Component (e.g., badge)

```text
--{component}.{property}[.{variant}][.{state}]
--badge.background.default
--badge.font-size.sm
--badge.border-radius
```

### Shared/Inherited Properties

```text
--{component}.{property}           (base — all variants)
--{component}.{variant}.{property} (variant-specific)
```

---

## State Ordering Convention

When a token has multiple states, order them:

1. `default` (or omit for the base value)
2. `hover`
3. `active` / `pressed`
4. `focus`
5. `selected`
6. `selected.hover`
7. `selected.active`
8. `disabled`
9. `selected.disabled`

---

## Complete JSON Structure Example

```json
{
  "input": {
    "height": {
      "lg": { "value": "48px", "type": "sizing" },
      "md": { "value": "40px", "type": "sizing" },
      "sm": { "value": "32px", "type": "sizing" }
    },
    "paddingInline": {
      "lg": { "value": "{spacing.lg}", "type": "spacing" },
      "md": { "value": "{spacing.md}", "type": "spacing" },
      "sm": { "value": "{spacing.sm}", "type": "spacing" }
    },
    "borderColor": {
      "default": { "value": "{color.border.default}", "type": "color" },
      "hover": { "value": "{color.border.hover}", "type": "color" },
      "focus": { "value": "{color.primary.border.default}", "type": "color" },
      "error": { "value": "{color.system.error.border}", "type": "color" },
      "disabled": { "value": "{color.border.disabled}", "type": "color" }
    },
    "label": {
      "color": { "value": "{color.neutral.text.default}", "type": "color" },
      "fontSize": { "value": "{fontSize.sm}", "type": "fontSizes" }
    }
  }
}
```

Generated CSS:

```css
--input-height-lg: 48px;
--input-padding-inline-lg: var(--spacing-lg);
--input-border-color-default: var(--color-neutral-border-weaker);
--input-label-color: var(--color-neutral-text-default);
--input-label-font-size: var(--font-size-sm);
```
