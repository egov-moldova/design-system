# Token Development — AGENTS.md

**Scope**: `tokens/**` — Design token creation, naming conventions, semantic hierarchy, and Style Dictionary build pipeline.

**Parent**: See root `AGENTS.md` for global rules. See `_agents/pre-implementation.md` for token-CSS variable validation.

**Modular documentation**: Detailed rules live in `_agents/*.md` subfiles. Load on-demand based on what you're doing.

---

## Subfile Index — When to Load Each

| File | What It Covers | When to Load |
| ---- | -------------- | ------------ |
| `_agents/token-structure.md` | File hierarchy, JSON reference syntax, Token→CSS→Component flow, CSS usage patterns, deviation gate | **When creating or modifying token JSON files** |
| `_agents/semantic-tokens.md` | 3-tier rule (component→semantic→palette), forbidden vs correct patterns, palette→semantic mapping table, Figma variable extraction | **When mapping Figma colors to tokens** |
| `_agents/naming-conventions.md` | camelCase for compound properties, token naming convention, CSS variable patterns, state ordering, JSON structure examples | **When naming new tokens or CSS variables** |

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

**Rules**:
- Always `$value` and `$type` (DTCG-prefixed) — never legacy `value`/`type`
- Dimensions are strings with explicit unit (`"12px"`, `"0px"`, `"9999px"`) — never bare numbers
- References use `{path.to.token}` syntax pointing at another `$value`
- `attributes.category` field is obsolete — SD v4 derives CTI from the token path
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
├── age/                           # AGE theme overrides
│   ├── base/
│   └── style-dictionary.config.json
```

---

## Build Commands

```bash
yarn tokens.build              # Build core + dark theme tokens (~5s)
yarn tokens.build.prod         # Production tokens (core + dark, optimized)
yarn tokens.build.age          # Build AGE theme tokens only
yarn tokens.watch              # Watch token files and rebuild on change
yarn tokens.audit              # Debug missing token references
```

**After token changes**: Run `yarn tokens.build`. No Stencil rebuild needed — token CSS is standalone, loaded at runtime via `<link>`. Components use `var(--name)` so new values apply on page refresh.

## Tokenhaus Sync Workflow

Two modes: **staging** (review) and **apply** (clean break to `tokens/core/`).

### Staging mode (safe, default)

Writes generated files under `tokens/figma-export/` so you can diff before promoting.

```bash
yarn sync:tokens
node scripts/sync-tokens-from-tokenhaus.mjs --input tokens-tokenhaus.json --dry-run
node scripts/sync-tokens-from-tokenhaus.mjs --input tokens-tokenhaus.json --dry-run --report reports/tokenhaus-sync.json
node scripts/sync-tokens-from-tokenhaus.mjs --input tokens-tokenhaus.json --dry-run --strict
```

### Apply mode (destructive, clean break)

`--apply` forces the output base to `tokens/`, overwrites `tokens/core/{palette,color,font,sizes}.tokens.json` and `tokens/core.dark/color.tokens.json`, and deletes legacy orphan files:

```text
tokens/core/space.tokens.json
tokens/core/spacing.tokens.json
tokens/core/radius.tokens.json
tokens/core/border.tokens.json
tokens/core/lineHeight.tokens.json
tokens/core/letterSpacing.tokens.json
tokens/core/shadow.tokens.json
```

Always preview first with `--apply --dry-run`. The script refuses an explicit `--output` other than `tokens/` when `--apply` is set.

```bash
node scripts/sync-tokens-from-tokenhaus.mjs --apply --dry-run     # preview deletions
yarn sync:tokens:apply                                            # real run
```

`tokens/core/effects.tokens.json` (drop-shadow.100..500) must be authored manually before the clean break — otherwise the shadow palette is lost. See `.claude/plans/analizeaza-structura-la-fisierul-breezy-tower.md` PR C.

### Flag reference

- **Staging vs apply**: default is staging (`tokens/figma-export/`); `--apply` overwrites canonical token folders and deletes legacy orphans
- **Dry-run first**: combine `--dry-run` with `--apply` to preview the clean break without writing or deleting anything
- **Strict mode**: use `--strict` to fail the run on skipped sections, missing modes, or unresolved reference namespaces
- **Reports**: `--report <file>` writes a machine-readable manifest of generated files, skips, warnings, and orphan deletions

---

## Critical Rules (Always Active)

1. **3-Tier Hierarchy**: Component CSS → semantic tokens → palette tokens. Never skip tiers.
2. **No palette in component tokens**: `{palette.*}` references forbidden in `tokens/core/components/*.tokens.json`. Use `{color.*}` semantic references.
3. **camelCase in JSON**: Compound properties like `fontSize`, `borderRadius`, `padding-inline`. Style Dictionary converts to kebab-case CSS vars.
4. **No "components" wrapper**: Component name at JSON root — `{ "button": {} }` not `{ "components": { "button": {} } }`.
5. **Always use references**: Component tokens must reference core tokens (`{color.neutral.text.default}`) — never raw hex/px values.

---

## Skill Corrections (Token-Specific)

| Skill Says | Correct |
| ---------- | ------- |
| `space.tokens.json` | `spacing.tokens.json` |
| `npm run tokens:build` | `yarn tokens.build` |
| `tokens/generated/*.css` | `dist/mud/tokens/*.css` |
