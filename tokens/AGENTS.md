# Token Development — AGENTS.md

**Scope**: `tokens/**` — Design token creation, naming conventions, semantic hierarchy, and Style Dictionary build pipeline.

**Parent**: See root `AGENTS.md` for global rules. See `../_agents/pre-implementation.md` for token-CSS variable validation.

**Modular documentation**: Detailed rules live in `_agents/*.md` subfiles. Load on-demand based on what you're doing.

---

## Subfile Index — When to Load Each

| File | What It Covers | When to Load |
| ---- | -------------- | ------------ |
| `_agents/token-structure.md` | File hierarchy, JSON reference syntax, Token→CSS→Component flow, CSS usage patterns, deviation gate | **When creating or modifying token JSON files** |
| `_agents/semantic-tokens.md` | 3-tier rule (component→semantic→palette), forbidden vs correct patterns, palette→semantic mapping table, Figma variable extraction | **When mapping Figma colors to tokens** |
| `_agents/naming-conventions.md` | camelCase for compound properties, token naming convention, CSS variable patterns, state ordering, JSON structure examples | **When naming new tokens or CSS variables** |
| `_agents/tokenhaus-sync.md` | Staging vs. apply modes, flag reference, orphan-file deletions, the manual `effects.tokens.json` step | **When running `yarn sync:tokens` or `yarn sync:tokens:apply`** |

---

## Token-First Principle

Design tokens are the **single source of truth** for all visual properties. Never hardcode colors, spacing, typography, or other visual values in component CSS.

---

## Figma → Token → CSS Variable Terminology

Semantic tokens follow [Figma Foundations](https://www.figma.com/design/wkHMxgDWxZKaXQ7zNxhSxN/Foundations)' 4-part naming:

| Position | Figma term | Examples                                                                |
| -------- | ---------- | ----------------------------------------------------------------------- |
| 1        | category   | `color`, `palette`, `spacing`, `borderRadius`, `fontSize`               |
| 2        | type       | `background`, `text`, `border`, `icon`                                  |
| 3        | role       | `base`, `brand`, `danger`, `positive`, `warning`, `info`, `disabled`    |
| 4        | variant    | `default`, `hover`, `active`, `focus`, `selected`, `secondary`, …       |

- JSON path: `color.background.brand.default`
- CSS var:   `--color-background-brand-default`

Palette primitives use a 3-part variant: `palette.{family}.{shade}` → `--palette-{family}-{shade}`.
Component tokens extend the scheme with an element layer: `{component}.{element}.{property}.{variant}` → `--{component}-{element}-{property}-{variant}`.

---

## Token File Format (DTCG)

All token JSON files use the **W3C Design Tokens Community Group (DTCG)** format with `$value` and `$type` keys. Style Dictionary 5 is configured with `usesDtcg: true` in all platform configs.

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

**Rules**:
- Always `$value` and `$type` (DTCG-prefixed) — never legacy `value`/`type`
- Dimensions are strings with explicit unit (`"12px"`, `"0px"`, `"9999px"`) — never bare numbers
- References use `{path.to.token}` syntax pointing at another `$value`
- `attributes.category` field is obsolete — Style Dictionary 5 derives CTI from the token path
- `fontWeight` values are numeric (`400`, `600`) — never strings

For legacy → DTCG bulk migration, see `scripts/convert-tokens-to-dtcg.mjs`.

---

## File Hierarchy (Quick Reference)

```text
tokens/
├── core/                          # Foundation tokens
│   ├── color.tokens.json          # Palette + semantic colors
│   ├── spacing.tokens.json        # Space scale
│   ├── font.tokens.json           # Font families
│   ├── fontSize.tokens.json       # Font size scale
│   ├── components/                # Component-specific tokens
│   │   ├── button.tokens.json
│   │   └── input.tokens.json
│   └── style-dictionary.config.json
├── core.dark/                     # Dark mode overrides
```

---

## Build Commands

```bash
yarn tokens.build              # Build core + dark theme tokens (~5s)
yarn tokens.build.prod         # Production tokens (core + dark, optimized)
yarn tokens.watch              # Watch token files and rebuild on change
yarn tokens.audit              # Debug missing token references
```

**After token changes**: Run `yarn tokens.build`. No Stencil rebuild needed — token CSS is standalone, loaded at runtime via `<link>`. Components use `var(--name)` so new values apply on page refresh.

## Tokenhaus Sync Workflow

Pulls a Figma Tokenhaus export into `tokens/`. Always preview a destructive apply first:

```bash
yarn sync:tokens                # staging mode (safe, default) — writes tokens/figma-export/
yarn sync:tokens:apply           # apply mode (destructive) — overwrites tokens/core/**
```

Preview any `--apply` run with `--apply --dry-run` first — it never writes or deletes. Full flag
reference, staging vs. apply, and the manual `effects.tokens.json` step: `_agents/tokenhaus-sync.md`.

---

## Critical Rules (Always Active)

1. **3-Tier Hierarchy**: Component CSS → semantic tokens → palette tokens. Never skip tiers.
2. **No palette in component tokens**: `{palette.*}` references forbidden in `tokens/core/components/*.tokens.json`. Use `{color.*}` semantic references. Deliberate, reasoned exceptions only: see `_agents/semantic-tokens.md`.
3. **camelCase in JSON**: Compound keys like `fontSize`, `borderRadius`, `paddingInline`, `searchInput`. Style Dictionary converts to kebab-case CSS vars. Only the files the Tokenhaus sync generates keep Figma's kebab-case names; `yarn tokens.lint.all` fails on kebab-case anywhere else. See `_agents/naming-conventions.md`.
4. **No "components" wrapper**: Component name at JSON root — `{ "button": {} }` not `{ "components": { "button": {} } }`.
5. **Always use references**: Component tokens must reference core tokens (`{color.neutral.text.default}`) — never raw hex/px values.

