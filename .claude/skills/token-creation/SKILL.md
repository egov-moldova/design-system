---
name: token-creation
description: Create and validate design tokens for Stencil web components. Follows the project's 3-tier hierarchy (palette → semantic → component) and the Figma Foundations 4-part naming scheme (`category-type-role-variant`).
allowed-tools: [Read, Write, Edit, Glob, Grep, skill, figma_get_variable_defs, figma_get_design_context]
---

# Token Creation Skill

## Purpose

Guide the creation of design tokens for new or existing components, ensuring correct file structure, naming conventions, reference syntax, and validation. All token names align with the [Figma Foundations](https://www.figma.com/design/wkHMxgDWxZKaXQ7zNxhSxN/Foundations) 4-part scheme: **category · type · role · variant**.

---

## 1. Token File Location

| Token Type | Location | CSS Output |
| --- | --- | --- |
| Core (light) | `tokens/core/components/{name}.tokens.json` | `dist/design-system/tokens/core.tokens.css` |
| Dark mode | `tokens/core.dark/components/{name}.tokens.json` | `dist/design-system/tokens/core.dark.tokens.css` |
| AGE theme | `tokens/age/components/{name}.tokens.json` | AGE theme CSS |

---

## 2. File Template

Reference semantic tokens following the `color.{type}.{role}.{variant}` scheme — never raw hex or `{palette.*}`:

```json
{
  "{component-name}": {
    "{base-property}": {
      "$value": "{core.token.reference}",
      "$type": "{type}"
    },
    "{variant}": {
      "background": {
        "default":  { "$value": "{color.background.brand.default}", "$type": "color" },
        "hover":    { "$value": "{color.background.brand.hover}",   "$type": "color" },
        "active":   { "$value": "{color.background.brand.active}",  "$type": "color" },
        "disabled": { "$value": "{color.background.disabled.default}", "$type": "color" }
      },
      "border": {
        "default": { "$value": "{color.border.brand.default}", "$type": "color" },
        "focus":   { "$value": "{color.border.brand.focus}",   "$type": "color" }
      },
      "text": {
        "default":  { "$value": "{color.text.base.inverse}",   "$type": "color" },
        "disabled": { "$value": "{color.text.disabled.default}", "$type": "color" }
      }
    }
  }
}
```

### Critical Rules

1. **No `"components"` wrapper** — the root key IS the component name
2. **Always use `{token.path}` references** — never raw hex/px values in component tokens
3. **Always include `"type"`** — valid types: `color`, `dimension`, `fontFamily`, `fontSize`, `fontWeight`, `lineHeight`, `opacity`, `spacing`
4. **kebab-case** for component names and properties

---

## 3. Naming Convention

### Semantic Tokens — Figma 4-Part Scheme

Semantic tokens (`tokens/core/color.tokens.json`) follow the [Figma Foundations](https://www.figma.com/design/wkHMxgDWxZKaXQ7zNxhSxN/Foundations) **category · type · role · variant** pattern:

```text
JSON path:  {category}.{type}.{role}.{variant}
CSS output: --{category}-{type}-{role}-{variant}

  category:  color | palette | spacing | borderRadius | fontSize | …
  type:      background | text | border | icon          (color tokens)
  role:      base | brand | danger | positive | warning | info | disabled | alpha
  variant:   default | hover | active | focus | selected | secondary | tertiary | …

Examples:
  color.background.brand.default   →  --color-background-brand-default
  color.text.danger.hover          →  --color-text-danger-hover
  color.border.base.focus          →  --color-border-base-focus
  color.icon.positive.default      →  --color-icon-positive-default
```

Palette primitives are `palette.{family}.{shade}` → `--palette-{family}-{shade}` (e.g. `--palette-blue-sky-600`).

### Component Tokens — Element Layer

Component tokens (`tokens/core/components/*.tokens.json`) extend the scheme with an element layer:

```text
JSON path:  {component}.{element}.{property}.{scale/state}
CSS output: --{component}-{element}-{property}-{scale/state}

Rule: scale/state (sm, md, lg, hover, active, disabled, focus, selected) MUST be last.

Examples:
  button.primary.background.default  →  --button-primary-background-default  ✅
  input.container.height.lg          →  --input-container-height-lg          ✅
  badge.font-size                    →  --badge-font-size                    ✅
  label.font-size.md                 →  --label-font-size-md                 ✅

Common violations:
  input.lg.height        →  --input-lg-height          ❌  (scale before property)
  label.md.font-size     →  --label-md-font-size       ❌  (scale before property)
  input.focus.border     →  --input-focus-border       ❌  (state before property)
  button.primary.default.background → --button-primary-default-background ❌  (state before property)
```

### Common Property Names

| Property | Type | Common References |
| --- | --- | --- |
| `background` | `color` | `{color.background.base.default}`, `{color.background.brand.default}` |
| `color` | `color` | `{color.text.base.default}`, `{color.text.brand.default}` |
| `border` | `color` | `{color.border.base.default}`, `{color.border.brand.default}` |
| `border-radius` | `dimension` | `{borderRadius.8}` |
| `border-width` | `dimension` | `{borderWidth.1}` |
| `font-family` | `fontFamily` | `{fontFamily.primary}` |
| `font-size` | `fontSize` | `{fontSize.14}` |
| `font-weight` | `fontWeight` | `{fontWeight.semibold}` |
| `line-height` | `lineHeight` | `{lineHeight.20}` |
| `padding-inline` | `dimension` | `{spacing.12}` |
| `padding-block` | `dimension` | `{spacing.8}` |
| `gap` | `dimension` | `{spacing.8}` |
| `box-shadow` | `shadow` | `{dropShadow.300}` |

---

## 4. State Coverage Matrix

Every interactive component MUST have tokens for all applicable states:

| State | CSS Pseudo | Required For |
| --- | --- | --- |
| `default` | `:not(:disabled)` | All components |
| `hover` | `:hover:not(:disabled)` | Buttons, inputs, links, interactive |
| `active` | `:active:not(:disabled)` | Buttons, links |
| `focus` | `:focus-visible:not(:disabled)` | All interactive |
| `disabled` | `:disabled` | All interactive |
| `selected` | `[aria-selected="true"]` | Tabs, toggles, checkboxes |
| `invalid` | `:invalid`, `[aria-invalid]` | Form elements |

### State × Variant Matrix Template

For a component with variants `primary` and `secondary`:

```
          default  hover  active  focus  disabled
primary      ✅      ✅      ✅     ✅      ✅
secondary    ✅      ✅      ✅     ✅      ✅
```

---

## 5. Figma → Token Mapping

When extracting from Figma using `figma_get_variable_defs`, map the variable name into the 4-part scheme:

```text
Figma variable                  →  Token reference
──────────────────────────────────────────────────────────
color/background/brand/default  →  {color.background.brand.default}  ✅
color/text/danger/hover         →  {color.text.danger.hover}         ✅
color/border/base/focus         →  {color.border.base.focus}         ✅
palette/blue-sky/600            →  {color.background.brand.default}  ✅ (map via semantic table)
palette/blue-sky/600            →  {palette.blue-sky.600}            ❌ NEVER inside component tokens
#0058d2 (raw hex)               →  find semantic match first         ✅
```

See `tokens/_agents/semantic-tokens.md` § Palette → Semantic Token Mapping for the full mapping table.

---

## 6. Pre-Build Validation

Before running `yarn tokens.build`, verify:

- [ ] JSON is valid (no trailing commas, correct brackets)
- [ ] Root key is component name (no `"components"` wrapper)
- [ ] All `{references}` point to existing tokens in `tokens/core/*.tokens.json`
- [ ] All entries have `"value"` and `"type"` fields
- [ ] Naming follows kebab-case convention
- [ ] State coverage is complete for all variants

---

## 7. Post-Build Validation

After `yarn tokens.build`:

```powershell
# 1. Check CSS output exists
Select-String -Path "dist/design-system/tokens/core.tokens.css" -Pattern "--{component-name}"

# 2. Run token reference audit
yarn tokens.audit

# 3. Verify no undefined values in CSS
Select-String -Path "dist/design-system/tokens/core.tokens.css" -Pattern "undefined"
```

**Pass criteria**: Variables present in CSS, zero missing references, zero `undefined` values.

---

## 8. Common Mistakes

| Mistake | Fix |
| --- | --- |
| `"components": { "button": { ... } }` wrapper | Remove wrapper — use `"button": { ... }` as root |
| Raw hex `"value": "#1976D2"` in component tokens | Use reference `"value": "{color.primary.background.default}"` |
| Missing `"type"` field | Always include: `"type": "color"`, `"type": "dimension"`, etc. |
| `camelCase` property names | Use `kebab-case`: `font-size` not `fontSize` (exception: top-level core tokens use camelCase per existing convention) |
| Scale/state before property: `label-md-font-size` | Move scale/state last: `label-font-size-md` |
| Size before property: `button-sm-size` | Move size last: `button-size-sm` |
| State before property: `input-focus-border-color` | Move state last: `input-border-color-focus` |
| Referencing `{palette.*}` in component tokens | Use `{color.*}` semantic tokens instead |
| Forgetting dark mode counterpart | Create matching file in `tokens/core.dark/components/` |
