---
name: token-creation
description: Create and validate design tokens for Stencil web components following the project's 3-tier token hierarchy.
allowed-tools: [Read, Write, Edit, Glob, Grep, skill, figma_get_variable_defs, figma_get_design_context]
---

# Token Creation Skill

## Purpose

Guide the creation of design tokens for new or existing components, ensuring correct file structure, naming conventions, reference syntax, and validation.

---

## 1. Token File Location

| Token Type | Location | CSS Output |
| --- | --- | --- |
| Core (light) | `tokens/core/components/{name}.tokens.json` | `dist/design-system/tokens/core.tokens.css` |
| Dark mode | `tokens/core.dark/components/{name}.tokens.json` | `dist/design-system/tokens/core.dark.tokens.css` |
| AGE theme | `tokens/age/components/{name}.tokens.json` | AGE theme CSS |

---

## 2. File Template

```json
{
  "{component-name}": {
    "{base-property}": {
      "value": "{core.token.reference}",
      "type": "{type}"
    },
    "{variant}": {
      "default": {
        "background": { "value": "{color.primary.background.default}", "type": "color" },
        "border": { "value": "{color.primary.border.default}", "type": "color" },
        "color": { "value": "{color.primary.text.default}", "type": "color" }
      },
      "hover": {
        "background": { "value": "{color.primary.background.hover}", "type": "color" }
      },
      "active": {
        "background": { "value": "{color.primary.background.active}", "type": "color" }
      },
      "focus": {
        "background": { "value": "{color.primary.background.default}", "type": "color" },
        "outline": { "value": "{color.primary.border.focus}", "type": "color" }
      },
      "disabled": {
        "background": { "value": "{color.neutral.background.subtle}", "type": "color" },
        "color": { "value": "{color.neutral.text.weakest}", "type": "color" }
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

### CSS Variable Output Pattern

```text
JSON path:  {component}.{element}.{property}.{scale/state}
CSS output: --{component}-{element}-{property}-{scale/state}

Rule: scale/state (sm, md, lg, hover, active, disabled, focus, selected) MUST be last.

Examples:
  button.primary.default.background  →  --button-primary-default-background  ✅
  input.height.lg                    →  --input-height-lg                    ✅
  badge.font-size                    →  --badge-font-size                    ✅
  label.font-size.md                 →  --label-font-size-md                 ✅

Common violations:
  input.lg.height      →  --input-lg-height       ❌  (scale before property)
  label.md.font-size   →  --label-md-font-size    ❌  (scale before property)
  input.focus.border   →  --input-focus-border    ❌  (state before property)
```

### Common Property Names

| Property | Type | Common References |
| --- | --- | --- |
| `background` | `color` | `{color.neutral.background.default}` |
| `color` | `color` | `{color.neutral.text.default}` |
| `border` | `color` | `{color.neutral.border.default}` |
| `border-radius` | `dimension` | `{radius.md}` |
| `font-family` | `fontFamily` | `{fontFamily.body}` |
| `font-size` | `fontSize` | `{fontSize.sm}` |
| `font-weight` | `fontWeight` | `{fontWeight.medium}` |
| `line-height` | `lineHeight` | `{lineHeight.normal}` |
| `padding-inline` | `spacing` | `{spacing.md}` |
| `padding-block` | `spacing` | `{spacing.sm}` |
| `height` | `dimension` | `{size.md}` |
| `gap` | `spacing` | `{spacing.sm}` |

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

When extracting from Figma using `figma_get_variable_defs`:

```text
Figma variable               →  Token reference
─────────────────────────────────────────────────
color/neutral/text/weak      →  {color.neutral.text.weak}         ✅
color/primary/background     →  {color.primary.background.default} ✅
palette/ui/gray/9            →  {color.neutral.text.weak}         ✅ (map via semantic table)
palette/ui/gray/9            →  {palette.ui.gray.9}               ❌ NEVER
#515967 (raw hex)            →  find semantic match first          ✅
```

See `tokens/AGENTS.md` § Palette → Semantic Token Mapping for the full mapping table.

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
