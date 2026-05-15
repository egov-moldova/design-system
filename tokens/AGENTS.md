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

Use the Tokenhaus sync script to stage imported token changes under `tokens/figma-export/` for review.

```bash
yarn sync:tokens
node scripts/sync-tokens-from-tokenhaus.mjs --input tokens-tokenhaus.json --dry-run
node scripts/sync-tokens-from-tokenhaus.mjs --input tokens-tokenhaus.json --dry-run --report reports/tokenhaus-sync.json
node scripts/sync-tokens-from-tokenhaus.mjs --input tokens-tokenhaus.json --dry-run --strict
```

- **Staging only**: The sync script writes to `tokens/figma-export/` and must never auto-promote files into `tokens/core/` or `tokens/core.dark/`
- **Review required**: Diff staged output, lint it, and copy only approved files into canonical token folders
- **Dry-run first**: Prefer `--dry-run` when validating a new Tokenhaus export or brand mode
- **Strict mode**: Use `--strict` when you want skipped sections, missing modes, or unresolved reference namespaces to fail the run
- **Reports**: Use `--report <file>` when you need a machine-readable manifest of generated files, skips, warnings, and pruned groups

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
| `tokens/generated/*.css` | `dist/design-system/tokens/*.css` |
