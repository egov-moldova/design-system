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

**When to use**: Single-element components like `cor-skeleton`, `cor-label`, `cor-link` (when not using nested elements).

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
| cor-skeleton | ✅ Compliant | LOW | 0 | 0 | Already follows property-first naming |
| cor-avatar-group | 🚧 Pending | LOW | ~2 | ~2 | Minimal changes |
| cor-checkbox-group | 🚧 Pending | LOW | ~3 | ~3 | References shared tokens |
| cor-radio-button-group | 🚧 Pending | LOW | ~3 | ~3 | References shared tokens |
| cor-label | 🚧 Pending | MEDIUM | ~25 | ~20 | **PRIORITY** — fix palette token violations |
| cor-avatar | 🚧 Pending | MEDIUM | ~30 | ~40 | Add element layer |
| cor-link | 🚧 Pending | MEDIUM | ~45 | ~40 | Add element layer for text/icon |
| cor-badge-interactive | 🚧 Pending | HIGH | ~50 | ~35 | Complex state combinations |
| cor-checkbox | 🚧 Pending | MEDIUM | ~20 | ~45 | Hybrid: shared + component-specific |
| cor-radio-button | 🚧 Pending | MEDIUM | ~15 | ~40 | Hybrid: shared + component-specific |
| cor-toggle | 🚧 Pending | MEDIUM | ~55 | ~40 | Hybrid: shared + component-specific |
| cor-select-item | 🚧 Pending | HIGH | ~50 | ~45 | Complex nested elements |
| cor-input | 🚧 Pending | VERY HIGH | ~120 | ~80 | Many nested elements |
| cor-textarea | 🚧 Pending | VERY HIGH | ~80 | ~70 | Similar to input |

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
- **Workflow guidance**: `.windsurf/workflows/update-tokens.md`
- **Refactor workflow**: `.windsurf/workflows/refactor-component.md`
- **Root documentation**: `AGENTS.md` § 4. Token-First Development Pipeline

---

## Questions & Support

For questions about the migration:

1. Check `tokens/AGENTS.md` for detailed naming rules
2. Review examples in this document
3. Consult the refactoring plan at `C:\Users\Dan\.windsurf\plans\token-naming-refactor-1939bd.md`
