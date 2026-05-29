# Token Naming Convention Migration Guide

This document tracks the migration from the legacy token naming pattern to the new standardized `{component}-{element}-{property}-{scale/state}` convention.

---

## Migration Overview

**Goal**: Refactor 14 components to align with the standard naming convention for consistency, maintainability, and scalability.

**Timeline**: Incremental migration — components refactored as needed, starting with simple low-risk components.

**Status**: 🚧 In Progress

---

## Naming Convention Changes

### Legacy Pattern (Pre-Refactor)

```css
/* Variant-based pattern */
--button-primary-hover-background
--button-secondary-default-color

/* Size-based pattern */
--input-lg-height
--input-md-padding

/* Mixed patterns */
--avatar-md-size
--avatar-default-background
```

**Issues**:
- Inconsistent ordering (variant-state-property vs size-property)
- Missing element layer for multi-element components
- No clear distinction between simple and complex components

### New Standard Pattern

#### Multi-Element Components

Use `--{component}-{element}-{property}-{scale/state}` when a component has multiple distinct elements:

```css
/* Avatar (container element) */
--avatar-container-size-md
--avatar-container-background-default
--avatar-container-background-hover

/* Input (multiple elements: container, label, helper, icon) */
--input-container-height-lg
--input-label-font-size-md
--input-helper-color-invalid
--input-icon-color-disabled

/* Toggle (track and thumb elements) */
--toggle-track-width-md
--toggle-track-background-checked-default
--toggle-thumb-size-md
--toggle-thumb-background-disabled
```

**Element examples**: `container`, `label`, `helper`, `icon`, `track`, `thumb`, `square`, `circle`

#### Simple Components (Property-First)

Use `--{component}-{property}-{scale/state}` when a component is a single visual element:

```css
/* Skeleton */
--skeleton-background-color
--skeleton-border-radius
--skeleton-width
--skeleton-height

/* Label */
--label-color-default
--label-color-disabled
--label-font-size-md
--label-font-size-sm
```

**When to use**: Single-element components like `mud-skeleton`, `mud-label`, `mud-link` (when not using nested elements).

#### Shared Base Tokens

Use `--{shared}-{property}-{scale/state}` for tokens shared across multiple components:

```css
/* Controls (used by checkbox, radio-button, toggle) */
--controls-size-md
--controls-size-sm
--controls-color-default
--controls-color-hover

/* Controls Group (used by checkbox-group, radio-button-group) */
--controls-group-gap-vertical
--controls-group-gap-horizontal
```

---

## Hybrid Approach: Shared vs Component-Specific

### Rationale

Following Style Dictionary best practices, we use a **hybrid approach**:

- **Shared base tokens** (`controls`, `controls-group`) provide common patterns
- **Component-specific tokens** reference shared tokens or define unique properties
- This ensures consistency while allowing flexibility

### Example: Checkbox

**Shared tokens** (controls.tokens.json):
```json
{
  "controls": {
    "size-md": { "value": "20px", "type": "dimension" },
    "color-default": { "value": "{color.neutral.text.weak}", "type": "color" }
  }
}
```

**Component-specific tokens** (checkbox.tokens.json):
```json
{
  "checkbox": {
    "square": {
      "size-md": { "value": "{controls.size-md}", "type": "dimension" }
    },
    "indeterminate": {
      "background-default": { "value": "{color.primary.background.strong}", "type": "color" }
    }
  }
}
```

**Benefits**:
- Checkbox, radio-button, and toggle share consistent sizing via `controls.*`
- Each component can define unique properties (e.g., checkbox's indeterminate state)
- Changes to shared tokens propagate to all components automatically

---

## State Ordering: Property-State Pattern

**Always use property-state order** (not state-property):

| ✅ Correct (property-state) | ❌ Wrong (state-property) |
|----------------------------|--------------------------|
| `--avatar-container-background-default` | `--avatar-container-default-background` |
| `--input-label-font-size-md` | `--input-label-md-font-size` |
| `--toggle-track-background-checked-default` | `--toggle-track-checked-default-background` |

**Why**: Aligns with the convention `{component}-{element}-{property}-{scale/state}` where state/scale is always last.

---

## Migration Status by Component

| Component | Status | Complexity | Token Keys | CSS Variables | Notes |
|-----------|--------|------------|------------|---------------|-------|
| mud-skeleton | ✅ Compliant | LOW | 0 | 0 | Already follows property-first naming |
| mud-avatar-group | 🚧 Pending | LOW | ~2 | ~2 | Minimal changes |
| mud-checkbox-group | 🚧 Pending | LOW | ~3 | ~3 | References shared tokens |
| mud-radio-button-group | 🚧 Pending | LOW | ~3 | ~3 | References shared tokens |
| mud-label | 🚧 Pending | MEDIUM | ~25 | ~20 | **PRIORITY** — fix palette token violations |
| mud-avatar | 🚧 Pending | MEDIUM | ~30 | ~40 | Add element layer |
| mud-link | 🚧 Pending | MEDIUM | ~45 | ~40 | Add element layer for text/icon |
| mud-badge-interactive | 🚧 Pending | HIGH | ~50 | ~35 | Complex state combinations |
| mud-checkbox | 🚧 Pending | MEDIUM | ~20 | ~45 | Hybrid: shared + component-specific |
| mud-radio-button | 🚧 Pending | MEDIUM | ~15 | ~40 | Hybrid: shared + component-specific |
| mud-toggle | 🚧 Pending | MEDIUM | ~55 | ~40 | Hybrid: shared + component-specific |
| mud-select-item | 🚧 Pending | HIGH | ~50 | ~45 | Complex nested elements |
| mud-input | 🚧 Pending | VERY HIGH | ~120 | ~80 | Many nested elements |
| mud-textarea | 🚧 Pending | VERY HIGH | ~80 | ~70 | Similar to input |

**Legend**:
- ✅ Compliant — already follows new convention
- 🚧 Pending — awaiting refactor
- 🔴 Blocked — depends on other components

---

## Token JSON Structure Examples

### Before (Legacy)

```json
{
  "avatar": {
    "md": {
      "size": { "value": "40px", "type": "dimension" },
      "radius": { "value": "50%", "type": "dimension" }
    },
    "default": {
      "background": { "value": "{color.neutral.background.base}", "type": "color" },
      "border": { "value": "{color.neutral.border.default}", "type": "color" }
    }
  }
}
```

**Generated CSS variables**:
```css
--avatar-md-size: 40px;
--avatar-md-radius: 50%;
--avatar-default-background: #FFFFFF;
--avatar-default-border: #E0E0E0;
```

### After (New Convention)

```json
{
  "avatar": {
    "container": {
      "size-md": { "value": "40px", "type": "dimension" },
      "size-sm": { "value": "32px", "type": "dimension" },
      "radius-md": { "value": "50%", "type": "dimension" },
      "background-default": { "value": "{color.neutral.background.base}", "type": "color" },
      "background-hover": { "value": "{color.neutral.background.hover}", "type": "color" },
      "border-default": { "value": "{color.neutral.border.default}", "type": "color" }
    }
  }
}
```

**Generated CSS variables**:
```css
--avatar-container-size-md: 40px;
--avatar-container-size-sm: 32px;
--avatar-container-radius-md: 50%;
--avatar-container-background-default: #FFFFFF;
--avatar-container-background-hover: #F5F5F5;
--avatar-container-border-default: #E0E0E0;
```

---

## CSS Variable Updates

### Before (Legacy)

```css
.avatar {
  width: var(--avatar-md-size);
  height: var(--avatar-md-size);
  border-radius: var(--avatar-md-radius);
  background-color: var(--avatar-default-background);
  border: 1px solid var(--avatar-default-border);
}

.avatar:hover {
  background-color: var(--avatar-hover-background);
}
```

### After (New Convention)

```css
.avatar {
  width: var(--avatar-container-size-md);
  height: var(--avatar-container-size-md);
  border-radius: var(--avatar-container-radius-md);
  background-color: var(--avatar-container-background-default);
  border: 1px solid var(--avatar-container-border-default);
}

.avatar:hover {
  background-color: var(--avatar-container-background-hover);
}
```

---

## Breaking Changes

### For Component Consumers

**CSS variable names have changed**. If you're using component tokens directly in your CSS (not recommended), you'll need to update variable names:

```css
/* ❌ OLD (will break) */
color: var(--label-default-color);
font-size: var(--input-lg-height);

/* ✅ NEW (correct) */
color: var(--label-color-default);
font-size: var(--input-container-height-lg);
```

**Recommendation**: Use component CSS classes instead of directly referencing tokens. Component internals are implementation details.

### For Token Consumers

If you're building custom components that reference design system tokens, update your references:

```json
// ❌ OLD
{
  "my-component": {
    "size": { "value": "{avatar.md.size}", "type": "dimension" }
  }
}

// ✅ NEW
{
  "my-component": {
    "size": { "value": "{avatar.container.size-md}", "type": "dimension" }
  }
}
```

---

## Rollback Plan

If issues arise during migration:

1. **Per-component rollback**: Revert individual component token files via git
2. **Full rollback**: Revert entire branch to pre-migration state
3. **Verification**: Run `yarn tokens.build && yarn build && yarn test` after rollback

**Git branch**: `refactor/token-naming-convention`

---

## References

- **Full specification**: `tokens/AGENTS.md` § Component Token Naming Convention
- **Workflow guidance**: `.claude/commands/update-tokens.md`
- **Refactor workflow**: `.claude/agents/refactor-component.md`
- **Root documentation**: `AGENTS.md` § 4. Token-First Development Pipeline

---

## Questions & Support

For questions about the migration:

1. Check `tokens/AGENTS.md` for detailed naming rules
2. Review examples in this document

---

## Phase 5 — DTCG Migration (W3C Design Tokens Format)

**Status**: ✅ Complete

All token files migrated from Style Dictionary legacy format (`value`/`type`) to the **W3C DTCG format** (`$value`/`$type`).

### Changes

- **JSON shape**: every leaf in `tokens/core/**/*.tokens.json` and `tokens/core.dark/**/*.tokens.json` now uses `$value` and `$type` keys.
- **Dimensions as strings**: bare numeric dimensions (`12`) became strings with explicit unit (`"12px"`). Eliminates the destructive `size/px` transform that previously stripped non-`px` units (e.g. `0.1em` → `0.1px`).
- **`attributes.category` dropped**: SD v4 derives CTI from the token path. The legacy `attributes: { category: 'size' }` field is no longer required.
- **SD config**: `"usesDtcg": true` added at the root of all Style Dictionary configs (`tokens/core/`, `tokens/core.dark/`, plus their `*.prod.config.json` counterparts).
- **`size/px` transform removed**: no longer needed since dimensions now ship with units.

### Tooling

- `scripts/convert-tokens-to-dtcg.mjs` — one-shot bulk converter (supports `--dry-run`, `--report`, `--root <dir>`)
- `scripts/sync-tokens-from-tokenhaus.mjs` — now emits DTCG natively (no internal `value`/`type` → `$value`/`$type` conversion)
- `scripts/debug-missing-token-references.mjs` — DTCG-aware (reads `$value`/`$type`)

### Notable Side-Effects

Phase 5 surfaced four pre-existing bugs where the legacy `size/px` transform was destructively rewriting authored units. The DTCG build is now correct:

| Token | Pre-DTCG (wrong) | Post-DTCG (correct) |
| ----- | ---------------- | ------------------- |
| `--breadcrumbs-ellipsis-ellipsis-letter-spacing` | `0.1px` | `0.1em` |
| `--chip-gap-sm` | `0px` | `0` |
| `--textarea-label-inside-padding-top` | `0px` | `0` |
| `--upload-area-file-item-error-message-line-height` | `1.4px` | `1.4` (unitless) |

### Verification

```bash
yarn tokens.build && yarn tokens.lint.all && yarn tokens.audit && yarn tokens.audit.dark
yarn test:scripts   # 29 tests pass with DTCG assertions
diff tmp/pre-dtcg.core.tokens.css tokens/generated/core.tokens.css
# Expected: only the 4 bugfix lines above
```

---

## Consolidation Cleanup (post-Phase 5)

**Status**: ✅ Complete

Three legacy token files removed after auditing usage:

| File | Reason | Migration |
|------|--------|-----------|
| `tokens/core/size.tokens.json` | 11 tokens, 2 consumers in component tokens, 0 CSS var consumers | `{size.md}` → `{spacing.16}` in `input.tokens.json`; `{size.5xl}` → inline `"216px"` in `pagination.tokens.json` |
| `tokens/core/linearGradient.tokens.json` | 7 tokens, **0 consumers anywhere** | Deleted directly — no migration needed |
| `tokens/core/zIndex.tokens.json` | 15 tokens, 4 source CSS consumers, 0 component token consumers | Values inlined directly into the 4 CSS files (no token replacement) |

### zIndex inlining map

| File | Was | Now |
|------|-----|-----|
| `mud-avatar.css` | `var(--z-index-popout)` | `950` |
| `mud-pagination-item.css` | `var(--z-index-dropdown, 1000)` | `600` |
| `mud-select.css` | `var(--z-index-dropdown, 1000)` | `600` |
| `mud-toast-notification.css` | `var(--z-index-toast, 500)` | `500` |

### Net effect

- ~34 CSS variables removed from generated output (`--size-*` × 11, `--linear-gradient-*` × 7, `--z-index-*` × 16)
- `scripts/sync-tokens-from-tokenhaus.mjs` `notGenerated` list trimmed accordingly (no longer references the deleted files)
