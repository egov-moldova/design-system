# Semantic Token Hierarchy — 3-Tier Rule & Palette Mapping

## Scope

The 3-tier token hierarchy rule, forbidden vs correct patterns, and palette→semantic mapping table. **Read when mapping Figma colors to tokens.**

---

## The 3-Tier Rule

Component CSS must ONLY reference **semantic** (`--color-{type}-{role}-{variant}`) or **component** (`--{component}-{element}-{property}-{variant}`) tokens. **Never reference `--palette-{family}-{shade}` directly.**

The 4-part scheme — **category · type · role · variant** — comes from [Figma Foundations](https://www.figma.com/design/wkHMxgDWxZKaXQ7zNxhSxN/Foundations) and applies to every semantic token in the system.

```text
Figma variable  →  palette token            →  semantic token                  →  component token              →  CSS var
(Figma source)     (--palette-{family}-N)      (--color-{type}-{role}-{var})      (--{component}-{el}-{prop})     .css file
                   ❌ FORBIDDEN                 ✅ Allowed fallback                ✅ Preferred
                   in component CSS             in component CSS                   in component CSS
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

**Validation**: `yarn tokens.validate` reports every `{palette.*}` reference in component tokens as `tier-purity`.

**No semantic token fits?** First look outside the Tokenhaus-generated files: `tokens/core/focusRing.tokens.json` is authored by hand and holds the field focus halos (`{focusRing.color.halo.brand|danger|warning|positive}`), because Figma ships them as effects, not variables. Add a new semantic token there rather than in `color.tokens.json`, which `sync:tokens:apply` regenerates. Moving a palette reference into such a file satisfies `tier-purity` but does not by itself theme the colour: `tokens.validate` checks dark-mode parity only for `color.*`, so give the new token a `tokens/core.dark` override, or state in its `$description` why it stays the same in dark mode. The `focusRing.color.halo.*` tokens have no dark override yet and render as before in dark mode.

**Deliberate exception** — a colour that must NOT follow the theme (a QR code must stay dark-on-light to scan). Keep the palette reference and record why on the token itself; `tokens.validate` accepts it only with a non-empty reason and warns if the marker outlives the palette reference:

```json
"background": {
  "$value": "{palette.white.1000}",
  "$type": "color",
  "$extensions": { "md.egov.mud": { "tierPurityException": "QR codes stay theme-locked so cameras can scan them in dark mode." } }
}
```

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
