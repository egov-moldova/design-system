# Semantic Token Hierarchy — 3-Tier Rule & Palette Mapping

## Scope

The 3-tier token hierarchy rule, forbidden vs correct patterns, and palette→semantic mapping table. **Read when mapping Figma colors to tokens.**

---

## The 3-Tier Rule

Component CSS must ONLY reference **semantic** (`--color-*`) or **component** (`--{component}-*`) tokens. **Never reference `--palette-*` directly.**

```text
Figma variable  →  palette token       →  semantic token        →  component token   →  CSS var
(Figma source)     (--palette-ui-*)       (--color-neutral-*)      (--button-*)          .css file
                   ❌ FORBIDDEN            ✅ Allowed fallback      ✅ Preferred
                   in component CSS        in component CSS          in component CSS
```

---

## Forbidden vs Correct Patterns

```css
/* ❌ WRONG — hardcoded hex */
color: #515967;

/* ❌ WRONG — palette token as fallback */
color: var(--label-color, var(--palette-ui-gray-9));

/* ❌ WRONG — palette token directly */
color: var(--palette-ui-gray-13);

/* ✅ CORRECT — component token with semantic fallback */
color: var(--label-color, var(--color-neutral-text-weak));

/* ✅ CORRECT — semantic token directly (for group/layout components) */
color: var(--color-neutral-text-default);
```

---

## Palette Tokens FORBIDDEN in Component Token JSON

Component token files (`tokens/core/components/*.tokens.json`) **MUST NEVER** reference `{palette.*}`.

```json
// ❌ FORBIDDEN
{ "label": { "default": { "color": { "value": "{palette.ui.gray.9}" } } } }

// ✅ CORRECT
{ "label": { "default": { "color": { "value": "{color.neutral.text.weak}" } } } }
```

**Why**: Palette tokens are primitives. Component tokens must use semantic tokens for theming and dark mode.

**Validation**: Before committing, search for `{palette.` in token files — replace with semantic equivalent.

---

## Palette → Semantic Token Mapping

| Palette Token | Semantic Token | Meaning |
|---|---|---|
| `--palette-ui-gray-9` | `--color-neutral-text-weak` | Default text/icon |
| `--palette-ui-gray-13` | `--color-neutral-text-default` | Hover/active text |
| `--palette-ui-gray-7` | `--color-neutral-text-weaker` | Helper/secondary text |
| `--palette-ui-gray-6` | `--color-neutral-text-weakest` | Disabled text/icon |
| `--palette-white` | `--color-neutral-background-base` | Default background |
| `--palette-ui-gray-2` | `--color-neutral-background-hover` | Hover background |
| `--palette-ui-gray-3` | `--color-neutral-background-active` | Pressed/active bg |
| `--palette-ui-error-9` | `--color-system-error-icon` | Error/invalid color |
| `--palette-ui-brand-red-9` | `--color-primary-background-strong` | Primary selected |
| `--palette-ui-brand-red-8` | `--color-primary-border-active` | Primary hover/pressed |
| `--palette-ui-brand-red-6` | `--color-primary-border-default` | Primary default border |

---

## Figma Variable Extraction Rule

When `mcp3_get_variable_defs` returns Figma variables, map to **semantic** tokens:

```text
Figma: "color/neutral/text/weak"  →  var(--color-neutral-text-weak)   ✅
Figma: "palette/ui/gray/9"        →  var(--color-neutral-text-weak)   ✅ (map via table)
Figma: "palette/ui/gray/9"        →  var(--palette-ui-gray-9)         ❌ (never)
```
