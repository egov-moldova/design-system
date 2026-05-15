# Token Architecture — `@age/design-system`

## 1. Purpose

Design tokens are the **single source of truth** for visual properties in `@age/design-system`. This document describes the 3-tier hierarchy, the DTCG file format, the Figma-aligned naming convention, the Style Dictionary build pipeline, and the Tokenhaus sync workflow.

For day-to-day token authoring rules (anti-patterns, validation, build commands), see [`tokens/AGENTS.md`](../tokens/AGENTS.md) and its `_agents/*.md` subfiles.

## 2. 3-Tier Hierarchy

```
Component CSS  →  Component tokens  →  Semantic tokens  →  Palette primitives
                     (per-component         (cross-component        (raw colors,
                      overrides)             reusable values)        spacings, etc.)
```

| Tier | Path | Example |
|---|---|---|
| **Palette** | `palette.{family}.{shade}` | `{palette.blue.500}` → `--palette-blue-500: #2563eb` |
| **Semantic** | `{category}.{type}.{role}.{variant}` | `{color.background.brand.default}` → `--color-background-brand-default` |
| **Component** | `{component}.{element}.{property}.{scale/state}` | `button.primary.background.hover` → `--button-primary-background-hover` |

**Rules**:

1. Component CSS uses ONLY component tokens (`var(--button-*)`) and semantic tokens (`var(--color-*)`).
2. Component tokens reference ONLY semantic tokens via `{color.*}` — never `{palette.*}` directly.
3. Semantic tokens reference palette primitives.
4. Tiers cannot be skipped from below: component CSS must never reference `--palette-*` directly.

See [`tokens/_agents/semantic-tokens.md`](../tokens/_agents/semantic-tokens.md) for the palette → semantic mapping table.

## 3. DTCG File Format

All token JSON files use the **W3C Design Tokens Community Group (DTCG)** format with `$value` and `$type` keys. Style Dictionary v4.4+ is configured with `usesDtcg: true` in all platform configs.

```json
{
  "color": {
    "background": {
      "base": {
        "default": {
          "$value": "{palette.white.1000}",
          "$type": "color"
        }
      }
    }
  },
  "spacing": {
    "12": {
      "$value": "12px",
      "$type": "dimension"
    }
  }
}
```

**Mandatory**:

- Use `$value` and `$type` (DTCG-prefixed) — never legacy `value` / `type`
- Dimensions are strings with explicit unit: `"12px"`, `"0px"`, `"9999px"` — never bare numbers
- References use `{path.to.token}` syntax pointing at another `$value`
- `attributes.category` is obsolete — Style Dictionary v4 derives CTI from the token path
- `fontWeight` values are numeric (`400`, `600`) — never strings

For legacy → DTCG bulk migration, see `scripts/convert-tokens-to-dtcg.mjs`.

## 4. Component Token Naming Convention

Component CSS variables follow the canonical pattern:

```
--{component}-{element}-{property}-{scale/state}
```

The **scale/state segment is always last**: `sm`, `md`, `lg`, `xl`, `hover`, `active`, `focus`, `disabled`, `selected`.

| ✅ Correct | ❌ Wrong |
|---|---|
| `--label-font-size-md` | `--label-md-font-size` |
| `--input-border-color-focus` | `--input-focus-border-color` |
| `--button-primary-background-hover` | `--button-primary-hover-background` |
| `--button-size-sm` | `--button-sm-size` |

### JSON Structure

The state/scale lives **under** the property, never above it:

```json
{
  "button": {
    "primary": {
      "background": {
        "default": { "$value": "{color.background.brand.default}", "$type": "color" },
        "hover":   { "$value": "{color.background.brand.hover}",   "$type": "color" },
        "active":  { "$value": "{color.background.brand.active}",  "$type": "color" }
      }
    }
  }
}
```

This generates `--button-primary-background-default`, `--button-primary-background-hover`, `--button-primary-background-active`.

### Root Wrapper Rule

The root key is the **component name**, never a `"components"` wrapper:

```json
// ✅ CORRECT — generates --button-* CSS vars
{ "button": { ... } }

// ❌ WRONG — adds unwanted --components-button-* prefix to all CSS vars
{ "components": { "button": { ... } } }
```

A `"components"` wrapper makes Style Dictionary emit `--components-button-*` and silently breaks every token reference in component CSS.

### Property Naming (camelCase in JSON)

Use camelCase for compound properties (2+ words) inside JSON — Style Dictionary converts to kebab-case in CSS:

| ✅ JSON | ❌ JSON | Generated CSS |
|---|---|---|
| `fontSize` | `font-size` | `--*-font-size` |
| `lineHeight` | `line-height` | `--*-line-height` |
| `borderRadius` | `border-radius` | `--*-border-radius` |
| `backgroundColor` | `background-color` | `--*-background-color` |
| `iconColor` | `icon-color` | `--*-icon-color` |

See [`tokens/_agents/naming-conventions.md`](../tokens/_agents/naming-conventions.md) for the complete reference.

## 5. Figma → Token → CSS Variable Terminology

Semantic tokens follow [Figma Foundations](https://www.figma.com/design/wkHMxgDWxZKaXQ7zNxhSxN/Foundations) 4-part naming:

| Position | Figma term | Examples |
|---|---|---|
| 1 | category | `color`, `palette`, `spacing`, `borderRadius`, `fontSize` |
| 2 | type | `background`, `text`, `border`, `icon` |
| 3 | role | `base`, `brand`, `danger`, `positive`, `warning`, `info`, `disabled` |
| 4 | variant | `default`, `hover`, `active`, `focus`, `selected`, `secondary`, ... |

- JSON path: `color.background.brand.default`
- CSS var: `--color-background-brand-default`

Palette primitives use a 3-part variant: `palette.{family}.{shade}` → `--palette-{family}-{shade}`.

Component tokens extend with an element layer: `{component}.{element}.{property}.{variant}` → `--{component}-{element}-{property}-{variant}`.

## 6. File Hierarchy

```text
tokens/
├── core/                              # Foundation tokens (light theme)
│   ├── color.tokens.json              # Palette + semantic colors
│   ├── spacing.tokens.json            # Space scale
│   ├── font.tokens.json               # Font families
│   ├── fontSize.tokens.json           # Font size scale
│   ├── effects.tokens.json            # Drop shadows, etc.
│   ├── components/                    # Per-component tokens
│   │   ├── button.tokens.json
│   │   ├── input.tokens.json
│   │   └── ...
│   └── style-dictionary.config.json
├── core.dark/                         # Dark mode overrides (DEFERRED — out of scope)
│   ├── color.tokens.json
│   └── ...
├── age/                               # AGE client theme overrides
│   ├── base/
│   └── style-dictionary.config.json
├── figma-export/                      # Tokenhaus staging area (gitignored)
└── MIGRATION.md                       # Current naming-convention migration status
```

## 7. Build Pipeline (Style Dictionary v4)

Token CSS is produced by Style Dictionary, orchestrated by Wireit. Inputs: `tokens/**/*.tokens.json`. Outputs: `dist/design-system/tokens/*.css`.

| Command | Effect | Time |
|---|---|---|
| `yarn tokens.build` | Build core + dark tokens | ~5s |
| `yarn tokens.build.prod` | Production tokens (optimized) | ~5s |
| `yarn tokens.build.age` | AGE theme only | ~5s |
| `yarn tokens.watch` | Watch + rebuild | service |
| `yarn tokens.audit` | Debug missing references | ~2s |

After token edits, run `yarn tokens.build`. **No Stencil rebuild needed** — token CSS is standalone, loaded at runtime via `<link>`. Components use `var(--name)` so new values apply on page refresh.

### Generated Outputs

```text
dist/design-system/tokens/
├── core.tokens.css           # Light theme: --color-*, --spacing-*, --button-*, --input-*, ...
├── core.dark.tokens.css      # Dark theme overrides (DEFERRED)
├── age.tokens.css            # AGE theme overrides
└── ...
```

Theme switching: `<html data-theme="age">` or `<html data-theme="dark">` (DEFERRED).

## 8. Tokenhaus Sync Workflow

Tokenhaus is the upstream Figma → tokens pipeline. Two modes: **staging** (review) and **apply** (clean break to `tokens/core/`).

### Staging mode (safe, default)

Writes generated files under `tokens/figma-export/` so the result can be diffed before promoting.

```bash
yarn sync:tokens
node scripts/sync-tokens-from-tokenhaus.mjs --input tokens-tokenhaus.json --dry-run
node scripts/sync-tokens-from-tokenhaus.mjs --input tokens-tokenhaus.json --dry-run --report reports/tokenhaus-sync.json
node scripts/sync-tokens-from-tokenhaus.mjs --input tokens-tokenhaus.json --dry-run --strict
```

### Apply mode (destructive, clean break)

`--apply` forces the output base to `tokens/`, overwrites `tokens/core/{palette,color,font,sizes}.tokens.json` and `tokens/core.dark/color.tokens.json`, and deletes legacy orphan files (`space.tokens.json`, `radius.tokens.json`, `border.tokens.json`, `lineHeight.tokens.json`, `letterSpacing.tokens.json`, `shadow.tokens.json`).

```bash
node scripts/sync-tokens-from-tokenhaus.mjs --apply --dry-run     # preview deletions
yarn sync:tokens:apply                                            # real run
```

Always preview first with `--apply --dry-run`. The script refuses `--output` other than `tokens/` when `--apply` is set.

### Flags

- **Staging vs apply**: default is staging; `--apply` overwrites canonical token folders and deletes legacy orphans
- **Dry-run**: combine with `--apply` to preview without writing or deleting
- **Strict**: `--strict` fails the run on skipped sections, missing modes, or unresolved reference namespaces
- **Report**: `--report <file>` writes a machine-readable manifest of generated files, skips, warnings, deletions

See [`tokens/AGENTS.md`](../tokens/AGENTS.md) (Tokenhaus Sync Workflow section) for the operational checklist.

## 9. Migration State

A naming-convention migration is in progress — see [`tokens/MIGRATION.md`](../tokens/MIGRATION.md) for current status, component-by-component progress, and remaining items. The target is universal `{component}-{element}-{property}-{scale/state}` ordering across all 20+ components.

## 10. Token Categories (Reference)

Top-level categories the system uses today:

- **color**: `palette` (primitives) + `background`, `text`, `border`, `icon` (semantic)
- **spacing**: scale (`0`, `1`, `2`, ..., `64`) and aliases (`gap`, `paddingInline`, `paddingBlock`)
- **font**: `family`, `weight`
- **fontSize**: scale (`xs`, `sm`, `md`, `lg`, `xl`, `2xl`, ...)
- **lineHeight**: scale
- **letterSpacing**: scale
- **borderRadius**: scale
- **border**: width, style
- **effects**: drop-shadow scale (drop-shadow.100..500)
- **breakpoints**: viewport widths
- **zIndex**: layering scale
- **opacity**: scale
- **duration / easing**: motion tokens

Each category lives in its own `tokens/core/*.tokens.json`. Component-level tokens live in `tokens/core/components/`.

## 11. Anti-Patterns (Forbidden)

- `var(--palette-*)` directly in component CSS — always use semantic `--color-*` or component-specific tokens
- `var(--palette-*)` as fallback inside component CSS — use `--color-*` semantic equivalent
- Raw hex / px / rgb / hsl in component CSS — must be a `var(--token-name)` reference
- Component token wrapper `{ "components": { "x": ... } }` — generates `--components-x-*` prefix that breaks references
- State/scale segment NOT last in CSS var name — `--input-focus-border-color` is wrong; use `--input-border-color-focus`
- kebab-case keys in JSON (`"font-size"`) — use camelCase (`"fontSize"`)
- Legacy `"value"` / `"type"` keys — must be `"$value"` / `"$type"` (DTCG)

## 12. References

- [`tokens/AGENTS.md`](../tokens/AGENTS.md) — runtime token rules, critical 5-rule list, skill corrections
- [`tokens/_agents/token-structure.md`](../tokens/_agents/token-structure.md) — file hierarchy and JSON syntax
- [`tokens/_agents/semantic-tokens.md`](../tokens/_agents/semantic-tokens.md) — palette → semantic mapping
- [`tokens/_agents/naming-conventions.md`](../tokens/_agents/naming-conventions.md) — CSS variable naming reference
- [`tokens/MIGRATION.md`](../tokens/MIGRATION.md) — current convention migration status
- [`PROJECT-SPECIFICATION.md`](PROJECT-SPECIFICATION.md) — overall project architecture
