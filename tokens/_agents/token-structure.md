# Token Structure — Hierarchy, Reference Syntax, CSS Flow

## Scope

Token file hierarchy, JSON reference syntax, Token→CSS→Component flow, and CSS usage patterns. **Read when creating or modifying token JSON files.**

---

## Token File Hierarchy

```text
tokens/
├── core/                          # Foundation tokens
│   ├── color.tokens.json          # Palette + semantic colors
│   ├── spacing.tokens.json        # Space scale
│   ├── font.tokens.json           # Font families
│   ├── fontSize.tokens.json       # Font size scale
│   ├── lineHeight.tokens.json     # Line height scale
│   ├── fontWeight.tokens.json     # Weight scale
│   ├── radius.tokens.json         # Border radius scale
│   ├── components/                # Component-specific tokens
│   │   ├── button.tokens.json     # --button-{variant}-{state}-{property}
│   │   └── input.tokens.json      # --input-{size}-{property}
│   └── style-dictionary.config.json
├── core.dark/                     # Dark mode overrides (same structure)
├── age/                          # AGE theme overrides
│   ├── base/
│   ├── components/
│   └── style-dictionary.config.json
```

---

## Token Reference Syntax (JSON)

Component tokens follow `{component}.{element}.{property}.{variant}` and reference semantic tokens, which themselves follow the [Figma Foundations](https://www.figma.com/design/wkHMxgDWxZKaXQ7zNxhSxN/Foundations) 4-part scheme `{category}.{type}.{role}.{variant}`:

```json
{
  "button": {
    "primary": {
      "background": {
        "default": { "$value": "{color.background.brand.default}", "$type": "color" },
        "hover":   { "$value": "{color.background.brand.hover}",   "$type": "color" }
      },
      "border": {
        "default": { "$value": "{color.border.brand.default}", "$type": "color" }
      }
    }
  }
}
```

- **Always reference** core tokens using `{token.path}` — never raw hex/px in component tokens
- Component tokens generate CSS vars: `--button-primary-background-default`, `--button-primary-border-default`

---

## Current Structure Pattern

Primitives and semantic references coexist in core token files:

```json
{
  "color": {
    "gray": {
      "100": { "value": "#171717", "type": "color" }           // Primitive
    },
    "neutral": {
      "background": {
        "default": { "value": "{color.gray.5}", "type": "color" }  // Semantic reference
      }
    }
  }
}
```

Component tokens reference existing core tokens:

```json
{
  "button": {
    "backgroundColor": { "value": "{color.neutral.background.default}", "type": "color" },
    "fontFamily": { "value": "{fontFamily.body}", "type": "fontFamily" }
  }
}
```

**Rule**: Component tokens reference `color.tokens.json`, `font.tokens.json`, etc. — never create duplicates.

### Deviation Gate

**⚠️** If Figma suggests a different structure:

1. **STOP** before creating new token files
2. **Document** proposed vs current
3. **Wait** for user confirmation

Default: follow current structure.

---

## Token → CSS Variable → Component CSS Flow

```text
tokens/core/components/button.tokens.json    →  Style Dictionary build
    ↓                                              ↓
{color.background.brand.default}             →  dist/mud/tokens/core.tokens.css
    ↓                                              ↓
--button-primary-background-default: #hex    →  Used in mud-button.css
```

---

## CSS Token Usage Pattern

```css
/* Variant tokens — NO fallback hardcoded values */
:host([variant='primary']) {
  ::slotted(*:not(:disabled)) {
    background-color: var(--button-primary-default-background);
    border-color: var(--button-primary-default-border);
  }
}

/* Base properties CAN have fallbacks to core tokens */
::slotted(*) {
  font-family: var(--button-font-family, var(--font-family-sans));
  border-radius: var(--button-border-radius, var(--radius-md));
}
```

**Note**: Proper fallbacks eliminate the need for `!important`.

---

## Build Commands

```bash
yarn tokens.build              # All themes (core + core.dark + age)
yarn tokens.build.core         # Core tokens only
yarn tokens.watch              # Watch and rebuild on change
```

**After token changes**: Run `yarn tokens.build` (~5s). No Stencil rebuild needed — token CSS is standalone, loaded at runtime via `<link>`. Components use `var(--name)` so new values apply on refresh.

---

## Skill Corrections (Token-Specific)

| Skill Says | Correct |
| --- | --- |
| `space.tokens.json` | `spacing.tokens.json` |
| `npm run tokens:build` | `yarn tokens.build` |
| `tokens/generated/*.css` | `dist/mud/tokens/*.css` |
| `npm run build` | `yarn build` |
