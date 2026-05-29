# Redesign `mud-button` — AGE Design System

## Context

`mud-button` is the next legacy atom queued for redesign, following the spinner → icon → button order documented in `memory/legacy-components-migration.md`. The legacy implementation at [src/legacy/mud-button/](src/legacy/mud-button/) exposes 12 colour variants × 4 sizes using a flat CSS-variable API. The new AGE design system in Figma file `doJ7tDY0PlQ0PqMgbpFVIC` (primary node `653:14291`, state matrix `653:19201`) consolidates these into **5 filled variants × 3 sizes**, introduces a new `shape` axis (`rectangular`/`circular`), and adds first-class `loading` + slot-driven `icon-only` rendering.

The goal of this redesign is to ship a production-ready `src/components/mud-button/` that is Figma-pixel-perfect, follows the spinner/icon precedent (CSS Pattern A — slot-based, consumer-supplied `<button>`/`<a>`), uses the 3-tier token hierarchy, and unlocks the next wave of legacy-consumer migrations (`mud-calendar`, `mud-modal`, `mud-pagination-go-to`, `mud-upload-area`). The legacy folder stays untouched so existing consumers keep working until they are migrated one-by-one in follow-up PRs.

**Out of scope** (separate follow-up specs): Button Outlined · Button Text · Button w/ Badge.

**Dark-mode tokens are out of scope for this PR.** The light-mode work is large enough on its own; dark-mode is its own follow-up that mirrors the same JSON shape into `tokens/core.dark/components/button.tokens.json` after light is merged.

---

## Verified token paths (from `tokens/core/color.tokens.json`)

These semantic tokens **exist today** and will be the only references used by `button.tokens.json`. No new semantic colour tokens are needed.

| Figma role | Semantic token (verified) | Palette value (light) |
|---|---|---|
| Primary bg default | `{color.background.brand.default}` | `palette.blue-sky.600` (#0058d2) |
| Primary bg hover | `{color.background.brand.default-hover}` | `palette.blue-sky.700` (#0046a8) |
| Primary bg active | `{color.background.brand.default-active}` | `palette.blue-sky.800` (#00357e) |
| Secondary bg default | `{color.background.brand.secondary}` | `palette.blue-sky.100` (#e8f0fb) |
| Secondary bg hover | `{color.background.brand.secondary-hover}` | `palette.blue-sky.200` (#ccdef6) |
| Secondary bg active | `{color.background.brand.secondary-active}` | `palette.blue-sky.300` (#99bced) |
| Strict bg default | `{color.background.base-inverse.default}` | `palette.gray.900` (#1e1e1e) |
| Strict bg hover | `{color.background.base-inverse.default-hover}` | `palette.gray.700` (#383838) |
| Strict bg active | `{color.background.base-inverse.default-active}` | `palette.gray.600` (#444444) |
| Neutral bg default | `{color.background.base.tertiary}` | `palette.gray.200` (#f1f1f1) |
| Neutral bg hover | `{color.background.base.tertiary-hover}` | `palette.gray.250` (#d9d9d9) |
| Neutral bg active | `{color.background.base.tertiary-active}` | `palette.gray.300` (#b2b2b2) |
| Destructive bg default | `{color.background.danger.default}` | `palette.red.600` (#d92d20) |
| Destructive bg hover | `{color.background.danger.default-hover}` | `palette.red.700` (#b32318) |
| Destructive bg active | `{color.background.danger.default-active}` | `palette.red.800` (#912018) |
| Disabled bg (all variants) | `{color.background.disabled.default}` | `palette.gray.200` (#f1f1f1) |
| White label / icon | `{color.text.base-inverse.on-color}` / `{color.icon.base-inverse.on-color}` | `palette.white.1000` |
| Dark label (neutral variant) | `{color.text.base.default}` / `{color.icon.base.default}` | `palette.black.1000` |
| Brand label (secondary variant) | `{color.text.brand.on-secondary}` / `{color.icon.brand.on-secondary}` | `palette.blue-sky.600` |
| Disabled label / icon | `{color.text.disabled.on-disabled}` / `{color.icon.disabled.on-disabled}` | `palette.gray.300` |

---

## Critical files

### To create
| Path | Lines (approx) |
|---|---|
| `tokens/core/focus-ring.tokens.json` | ~20 |
| `tokens/core/components/button.tokens.json` | ~250 |
| `src/components/mud-button/mud-button.tsx` | ~140 |
| `src/components/mud-button/mud-button.css` | ~280 |
| `src/components/mud-button/mud-button.types.ts` | ~10 |
| `src/components/mud-button/mud-button.constants.ts` | ~3 |
| `src/components/mud-button/mud-button.stories.ts` | ~300 |
| `src/components/mud-button/test/mud-button.spec.tsx` | ~180 |

### To modify
| Path | Change |
|---|---|
| [src/index.ts](src/index.ts) | After the existing `mud-spinner` export block, append the two `mud-button` export lines (see § "Step 5"). |

### Reused as-is (no edits)
- [src/components/mud-spinner/mud-spinner.tsx](src/components/mud-spinner/mud-spinner.tsx) — loading overlay
- [src/utils/invalid-slotted-tag.ts](src/utils/invalid-slotted-tag.ts) — default-slot fallback
- [src/legacy/shared.constants.ts](src/legacy/shared.constants.ts) — `VALID_ICON_SLOT_TAGS = ['mud-icon']`

### Untouched
- [src/legacy/mud-button/](src/legacy/mud-button/)
- [tokens/legacy/components/button.tokens.json](tokens/legacy/components/button.tokens.json)

---

## API (final)

### Props (TSX member order)
```ts
@Prop({ reflect: true }) variant: ButtonVariant = 'primary';
@Prop({ reflect: true }) size: ButtonSize = 'md';
@Prop({ reflect: true }) shape: ButtonShape = 'rectangular';
@Prop({ reflect: true }) disabled: boolean = false;
@Prop({ reflect: true }) loading: boolean = false;
```

### Events
None. Pattern A — the consumer's slotted `<button>` / `<a>` bubbles its own native `click`.

### Slots
| Name | Required | Detection | Allowed tags |
|---|---|---|---|
| (default) | yes | `firstElementChild` tag check at render → `invalidSlottedTag()` fallback | `button`, `a` |
| `leading-icon` | no | `onSlotchange` → `@State hasLeading` → `.has-leading` host class | `VALID_ICON_SLOT_TAGS` |
| `trailing-icon` | no | `onSlotchange` → `@State hasTrailing` → `.has-trailing` host class | `VALID_ICON_SLOT_TAGS` |
| `icon-only` | no | `onSlotchange` → `@State hasIconOnly` → `.is-icon-only` host class | `VALID_ICON_SLOT_TAGS` |

### Exported types (`mud-button.types.ts`)
```ts
export const BUTTON_VARIANTS = ['primary', 'secondary', 'strict', 'neutral', 'destructive'] as const;
export const BUTTON_SIZES = ['sm', 'md', 'lg'] as const;
export const BUTTON_SHAPES = ['rectangular', 'circular'] as const;

export type ButtonVariant = (typeof BUTTON_VARIANTS)[number];
export type ButtonSize = (typeof BUTTON_SIZES)[number];
export type ButtonShape = (typeof BUTTON_SHAPES)[number];
```

### Constants (`mud-button.constants.ts`)
```ts
export const BUTTON_TAGS: readonly string[] = ['button', 'a'];
```

---

## Implementation order (strict token-first)

### Step 1 — `tokens/core/focus-ring.tokens.json` (new)
```json
{
  "focusRing": {
    "color": {
      "inner": { "$value": "{color.background.base.default}", "$type": "color" },
      "outer": { "$value": "{palette.blue-sky.500}", "$type": "color" }
    },
    "width": {
      "inner": { "$value": "2px", "$type": "dimension" },
      "outer": { "$value": "5px", "$type": "dimension" }
    }
  }
}
```
Foundation files (same tier as `color.tokens.json`) may reference palette directly; component files may not. This file is the single source of truth for the dual-ring; all interactive atoms will pull `--focus-ring-color-inner` / `--focus-ring-color-outer` / `--focus-ring-width-inner` / `--focus-ring-width-outer`.

### Step 2 — `tokens/core/components/button.tokens.json` (new)
Top-level shape (NO `components` wrapper, per [tokens/AGENTS.md](tokens/AGENTS.md) rule 4):
```json
{
  "button": {
    "container": {
      "height": {
        "sm": { "$value": "{spacing.32}", "$type": "dimension" },
        "md": { "$value": "{spacing.40}", "$type": "dimension" },
        "lg": { "$value": "{spacing.48}", "$type": "dimension" }
      },
      "minWidth": {
        "sm": { "$value": "52px", "$type": "dimension" },
        "md": { "$value": "56px", "$type": "dimension" },
        "lg": { "$value": "72px", "$type": "dimension" }
      },
      "paddingInline": {
        "sm": { "$value": "{spacing.12}", "$type": "dimension" },
        "md": { "$value": "{spacing.16}", "$type": "dimension" },
        "lg": { "$value": "{spacing.20}", "$type": "dimension" }
      },
      "gap": { "$value": "{spacing.6}", "$type": "dimension" },
      "borderRadius": {
        "sm": { "$value": "{borderRadius.6}", "$type": "dimension" },
        "md": { "$value": "{borderRadius.6}", "$type": "dimension" },
        "lg": { "$value": "{borderRadius.8}", "$type": "dimension" },
        "circular": { "$value": "9999px", "$type": "dimension" }
      },
      "transitionDuration": { "$value": "150ms", "$type": "duration" },
      "transitionTimingFunction": { "$value": "ease-in-out", "$type": "cubicBezier" },
      "disabledOpacity": { "$value": "1", "$type": "number" }
    },
    "label": {
      "fontFamily": { "$value": "{font.family.primary}", "$type": "fontFamily" },
      "fontWeight": { "$value": "{font.weight.medium}", "$type": "fontWeight" },
      "fontSize": {
        "sm": { "$value": "{font.size.14}", "$type": "dimension" },
        "md": { "$value": "{font.size.14}", "$type": "dimension" },
        "lg": { "$value": "{font.size.16}", "$type": "dimension" }
      },
      "lineHeight": {
        "sm": { "$value": "{font.lineHeight.20}", "$type": "dimension" },
        "md": { "$value": "{font.lineHeight.20}", "$type": "dimension" },
        "lg": { "$value": "{font.lineHeight.24}", "$type": "dimension" }
      }
    },
    "icon": {
      "size": {
        "sm": { "$value": "{spacing.16}", "$type": "dimension" },
        "md": { "$value": "{spacing.20}", "$type": "dimension" },
        "lg": { "$value": "{spacing.20}", "$type": "dimension" }
      }
    },
    "primary": {
      "background": {
        "default":  { "$value": "{color.background.brand.default}",        "$type": "color" },
        "hover":    { "$value": "{color.background.brand.default-hover}",  "$type": "color" },
        "active":   { "$value": "{color.background.brand.default-active}", "$type": "color" },
        "disabled": { "$value": "{color.background.disabled.default}",     "$type": "color" }
      },
      "label": {
        "default":  { "$value": "{color.text.base-inverse.on-color}",   "$type": "color" },
        "hover":    { "$value": "{color.text.base-inverse.on-color}",   "$type": "color" },
        "active":   { "$value": "{color.text.base-inverse.on-color}",   "$type": "color" },
        "disabled": { "$value": "{color.text.disabled.on-disabled}",    "$type": "color" }
      },
      "icon": {
        "default":  { "$value": "{color.icon.base-inverse.on-color}",   "$type": "color" },
        "hover":    { "$value": "{color.icon.base-inverse.on-color}",   "$type": "color" },
        "active":   { "$value": "{color.icon.base-inverse.on-color}",   "$type": "color" },
        "disabled": { "$value": "{color.icon.disabled.on-disabled}",    "$type": "color" }
      }
    },
    "secondary": {
      "background": {
        "default":  { "$value": "{color.background.brand.secondary}",         "$type": "color" },
        "hover":    { "$value": "{color.background.brand.secondary-hover}",   "$type": "color" },
        "active":   { "$value": "{color.background.brand.secondary-active}",  "$type": "color" },
        "disabled": { "$value": "{color.background.disabled.default}",        "$type": "color" }
      },
      "label": {
        "default":  { "$value": "{color.text.brand.on-secondary}",  "$type": "color" },
        "hover":    { "$value": "{color.text.brand.on-secondary}",  "$type": "color" },
        "active":   { "$value": "{color.text.brand.on-secondary}",  "$type": "color" },
        "disabled": { "$value": "{color.text.disabled.on-disabled}","$type": "color" }
      },
      "icon": {
        "default":  { "$value": "{color.icon.brand.on-secondary}",  "$type": "color" },
        "hover":    { "$value": "{color.icon.brand.on-secondary}",  "$type": "color" },
        "active":   { "$value": "{color.icon.brand.on-secondary}",  "$type": "color" },
        "disabled": { "$value": "{color.icon.disabled.on-disabled}","$type": "color" }
      }
    },
    "strict": {
      "background": {
        "default":  { "$value": "{color.background.base-inverse.default}",        "$type": "color" },
        "hover":    { "$value": "{color.background.base-inverse.default-hover}",  "$type": "color" },
        "active":   { "$value": "{color.background.base-inverse.default-active}", "$type": "color" },
        "disabled": { "$value": "{color.background.disabled.default}",            "$type": "color" }
      },
      "label": { "default": { "$value": "{color.text.base-inverse.on-color}", "$type": "color" }, "hover": { "$value": "{color.text.base-inverse.on-color}", "$type": "color" }, "active": { "$value": "{color.text.base-inverse.on-color}", "$type": "color" }, "disabled": { "$value": "{color.text.disabled.on-disabled}", "$type": "color" } },
      "icon":  { "default": { "$value": "{color.icon.base-inverse.on-color}", "$type": "color" }, "hover": { "$value": "{color.icon.base-inverse.on-color}", "$type": "color" }, "active": { "$value": "{color.icon.base-inverse.on-color}", "$type": "color" }, "disabled": { "$value": "{color.icon.disabled.on-disabled}", "$type": "color" } }
    },
    "neutral": {
      "background": {
        "default":  { "$value": "{color.background.base.tertiary}",        "$type": "color" },
        "hover":    { "$value": "{color.background.base.tertiary-hover}",  "$type": "color" },
        "active":   { "$value": "{color.background.base.tertiary-active}", "$type": "color" },
        "disabled": { "$value": "{color.background.disabled.default}",     "$type": "color" }
      },
      "label": { "default": { "$value": "{color.text.base.default}", "$type": "color" }, "hover": { "$value": "{color.text.base.default}", "$type": "color" }, "active": { "$value": "{color.text.base.default}", "$type": "color" }, "disabled": { "$value": "{color.text.disabled.on-disabled}", "$type": "color" } },
      "icon":  { "default": { "$value": "{color.icon.base.default}", "$type": "color" }, "hover": { "$value": "{color.icon.base.default}", "$type": "color" }, "active": { "$value": "{color.icon.base.default}", "$type": "color" }, "disabled": { "$value": "{color.icon.disabled.on-disabled}", "$type": "color" } }
    },
    "destructive": {
      "background": {
        "default":  { "$value": "{color.background.danger.default}",        "$type": "color" },
        "hover":    { "$value": "{color.background.danger.default-hover}",  "$type": "color" },
        "active":   { "$value": "{color.background.danger.default-active}", "$type": "color" },
        "disabled": { "$value": "{color.background.disabled.default}",      "$type": "color" }
      },
      "label": { "default": { "$value": "{color.text.base-inverse.on-color}", "$type": "color" }, "hover": { "$value": "{color.text.base-inverse.on-color}", "$type": "color" }, "active": { "$value": "{color.text.base-inverse.on-color}", "$type": "color" }, "disabled": { "$value": "{color.text.disabled.on-disabled}", "$type": "color" } },
      "icon":  { "default": { "$value": "{color.icon.base-inverse.on-color}", "$type": "color" }, "hover": { "$value": "{color.icon.base-inverse.on-color}", "$type": "color" }, "active": { "$value": "{color.icon.base-inverse.on-color}", "$type": "color" }, "disabled": { "$value": "{color.icon.disabled.on-disabled}", "$type": "color" } }
    }
  }
}
```
> If any of the `{font.family.primary}` / `{font.weight.medium}` / `{font.size.14}` / `{font.lineHeight.20}` references resolve to a different actual JSON path in `tokens/core/font.tokens.json`, swap the references to match — the implementer should **`yarn tokens.validate`** after writing and adjust until it passes. Do not invent new font tokens.

Then run:
```powershell
yarn tokens.build
yarn tokens.validate
```
Both must exit 0 before proceeding.

### Step 3 — `src/components/mud-button/mud-button.css` (new)
Skeleton (PostCSS nested syntax matches the legacy file). Replace `<variant>` and `<size>` with the actual values per the loop comments; do not factor with `@each` (PostCSS plugins available do not support that).

```css
:host {
  display: inline-block;

  /* Shared slotted-root styling — Pattern A */
  ::slotted(button),
  ::slotted(a) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    border: none;
    cursor: pointer;
    text-decoration: none;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-family: var(--mud-button-label-font-family);
    font-weight: var(--mud-button-label-font-weight);
    height: 100%;
    width: 100%;
    background-color: inherit;
    color: inherit;
    border-radius: inherit;
    padding-inline: inherit;
    padding-block: 0;
    gap: var(--mud-button-container-gap);
    transition:
      background-color var(--mud-button-container-transition-duration) var(--mud-button-container-transition-timing-function),
      color var(--mud-button-container-transition-duration) var(--mud-button-container-transition-timing-function),
      box-shadow var(--mud-button-container-transition-duration) var(--mud-button-container-transition-timing-function);
  }

  /* Focus-visible — dual ring, shared across all variants */
  ::slotted(button:focus-visible),
  ::slotted(a:focus-visible) {
    outline: none;
    box-shadow:
      0 0 0 var(--focus-ring-width-inner) var(--focus-ring-color-inner),
      0 0 0 calc(var(--focus-ring-width-inner) + var(--focus-ring-width-outer)) var(--focus-ring-color-outer);
  }
}

/* Container sets the bounding box; slotted root inherits */
:host {
  background-color: var(--mud-button-bg);
  color: var(--mud-button-label);
  border-radius: var(--mud-button-container-border-radius);
  padding-inline: var(--mud-button-container-padding-inline);
  height: var(--mud-button-container-height);
  min-width: var(--mud-button-container-min-width);
}

/* Size rungs — write all three explicitly */
:host([size='sm']) {
  --mud-button-container-height: var(--mud-button-container-height-sm);
  --mud-button-container-min-width: var(--mud-button-container-min-width-sm);
  --mud-button-container-padding-inline: var(--mud-button-container-padding-inline-sm);
  --mud-button-container-border-radius: var(--mud-button-container-border-radius-sm);
  --mud-button-label-font-size: var(--mud-button-label-font-size-sm);
  --mud-button-label-line-height: var(--mud-button-label-line-height-sm);
  --mud-button-icon-size: var(--mud-button-icon-size-sm);
}
/* Repeat for size='md' and size='lg' */

::slotted(button),
::slotted(a) {
  /* picked up after :host font-size cascade */
  font-size: var(--mud-button-label-font-size);
  line-height: var(--mud-button-label-line-height);
}

/* Shape */
:host([shape='circular']) {
  --mud-button-container-border-radius: var(--mud-button-container-border-radius-circular);
}

/* Icon-only (slot-detected via class) — squares the container */
:host(.is-icon-only) {
  --mud-button-container-padding-inline: 0;
  --mud-button-container-min-width: var(--mud-button-container-height);
}

/* Variants — write all five explicitly */
:host([variant='primary']) {
  --mud-button-bg: var(--mud-button-primary-background-default);
  --mud-button-label: var(--mud-button-primary-label-default);
  --mud-button-icon: var(--mud-button-primary-icon-default);
}
:host([variant='primary']:hover:not([disabled]):not([loading])) {
  --mud-button-bg: var(--mud-button-primary-background-hover);
}
:host([variant='primary']:active:not([disabled]):not([loading])) {
  --mud-button-bg: var(--mud-button-primary-background-active);
}
/* Repeat the trio for secondary, strict, neutral, destructive */

/* Disabled (any variant) */
:host([disabled]) {
  --mud-button-bg: var(--mud-button-primary-background-disabled);  /* same disabled tone for all variants */
  --mud-button-label: var(--mud-button-primary-label-disabled);
  --mud-button-icon: var(--mud-button-primary-icon-disabled);
  cursor: not-allowed;
}
:host([disabled]) ::slotted(button),
:host([disabled]) ::slotted(a) {
  pointer-events: none;
  cursor: not-allowed;
}

/* Loading */
:host([loading]) ::slotted(button),
:host([loading]) ::slotted(a) {
  pointer-events: none;
  color: transparent;
}
:host([loading]) ::slotted(*[slot='leading-icon']),
:host([loading]) ::slotted(*[slot='trailing-icon']),
:host([loading]) ::slotted(*[slot='icon-only']) {
  visibility: hidden;
}
.spinner-overlay {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  pointer-events: none;
}
:host { position: relative; }

/* Icon colour — mud-icon honours currentColor */
::slotted(mud-icon) {
  color: var(--mud-button-icon);
  --mud-icon-size: var(--mud-button-icon-size);
}

/* sm-touch-target boost (WCAG 2.5.5) — invisible ::before extends to 40×40 */
:host([size='sm'])::before {
  content: '';
  position: absolute;
  inset: -4px;
  pointer-events: auto;
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  :host ::slotted(button),
  :host ::slotted(a) {
    transition: none;
  }
}
```

### Step 4 — `src/components/mud-button/mud-button.tsx` (new)
Full file. Mirrors the [legacy mud-button.tsx](src/legacy/mud-button/mud-button.tsx) structure but adds slot-detection state, the spinner overlay, and ARIA mirroring.

```tsx
import { Component, Element, h, Host, Prop, State } from '@stencil/core';

import { invalidSlottedTag } from '../../utils/invalid-slotted-tag';
import { VALID_ICON_SLOT_TAGS } from '../../legacy/shared.constants';
import { BUTTON_TAGS } from './mud-button.constants';
import type { ButtonShape, ButtonSize, ButtonVariant } from './mud-button.types';

/**
 * Filled button — Pattern A (slot-based, consumer supplies <button> or <a>).
 *
 * @element mud-button
 * @slot - Default slot. Must be exactly one <button> or <a>.
 * @slot leading-icon - Optional <mud-icon> placed before the label.
 * @slot trailing-icon - Optional <mud-icon> placed after the label.
 * @slot icon-only - Optional <mud-icon>. When present and the default slot is empty, the button renders as an icon-only square.
 */
@Component({
  tag: 'mud-button',
  styleUrl: 'mud-button.css',
  shadow: true,
})
export class CorButton {
  @Prop({ reflect: true }) variant: ButtonVariant = 'primary';
  @Prop({ reflect: true }) size: ButtonSize = 'md';
  @Prop({ reflect: true }) shape: ButtonShape = 'rectangular';
  @Prop({ reflect: true }) disabled: boolean = false;
  @Prop({ reflect: true }) loading: boolean = false;

  @State() private hasLeading = false;
  @State() private hasTrailing = false;
  @State() private hasIconOnly = false;

  @Element() host!: HTMLCorButtonElement;

  componentDidLoad() {
    this.mirrorAriaStateToSlottedRoot();
    this.warnIfIconOnlyMissingLabel();
  }

  componentDidUpdate() {
    this.mirrorAriaStateToSlottedRoot();
  }

  private mirrorAriaStateToSlottedRoot = () => {
    const root = this.host.firstElementChild;
    if (!root) return;
    if (this.disabled) root.setAttribute('aria-disabled', 'true');
    else root.removeAttribute('aria-disabled');
    if (this.loading) root.setAttribute('aria-busy', 'true');
    else root.removeAttribute('aria-busy');
  };

  private warnIfIconOnlyMissingLabel = () => {
    if (!this.hasIconOnly) return;
    const root = this.host.firstElementChild;
    const hasName =
      root?.getAttribute('aria-label') ||
      root?.getAttribute('aria-labelledby') ||
      (root?.textContent?.trim().length ?? 0) > 0;
    if (!hasName) {
      // eslint-disable-next-line no-console
      console.warn(
        '[mud-button] icon-only button is missing an accessible name. Add aria-label to the slotted <button> or <a>.',
      );
    }
  };

  private onLeadingSlotChange = (e: Event) => {
    this.hasLeading = (e.target as HTMLSlotElement).assignedElements().length > 0;
  };

  private onTrailingSlotChange = (e: Event) => {
    this.hasTrailing = (e.target as HTMLSlotElement).assignedElements().length > 0;
  };

  private onIconOnlySlotChange = (e: Event) => {
    this.hasIconOnly = (e.target as HTMLSlotElement).assignedElements().length > 0;
  };

  private getHostClasses(): Record<string, boolean> {
    return {
      'has-leading': this.hasLeading,
      'has-trailing': this.hasTrailing,
      'is-icon-only': this.hasIconOnly,
    };
  }

  private mapSpinnerSize(): 'xs' | 'sm' {
    return this.size === 'sm' ? 'xs' : 'sm';
  }

  private mapSpinnerVariant(): 'light' | 'brand' | 'dark' {
    // 'primary' | 'strict' | 'destructive' have white labels → 'light' spinner
    // 'secondary' has brand-blue label → 'brand' spinner
    // 'neutral' has dark label → 'dark' spinner
    if (this.variant === 'secondary') return 'brand';
    if (this.variant === 'neutral') return 'dark';
    return 'light';
  }

  render() {
    const tag = this.host.firstElementChild?.tagName?.toLowerCase() ?? '';
    if (!BUTTON_TAGS.includes(tag)) {
      return <Host>{invalidSlottedTag(tag, BUTTON_TAGS)}</Host>;
    }

    return (
      <Host class={this.getHostClasses()}>
        <slot name="leading-icon" onSlotchange={this.onLeadingSlotChange} />
        <slot />
        <slot name="trailing-icon" onSlotchange={this.onTrailingSlotChange} />
        <slot name="icon-only" onSlotchange={this.onIconOnlySlotChange} />
        {this.loading && (
          <div class="spinner-overlay" aria-hidden="true">
            <mud-spinner size={this.mapSpinnerSize()} variant={this.mapSpinnerVariant()} />
          </div>
        )}
      </Host>
    );
  }
}
```

> **Note on the slot-detection slots**: the consumer puts the icon inline like `<button><mud-icon slot="leading-icon" name="check"/>Save</button>`. The `slot="leading-icon"` attribute on a *child of the slotted root* won't be picked up by Stencil's named slots — it would need to be a direct child of `<mud-button>`. Document this in the readme example: icons go as **siblings** of the `<button>`, not as children of it:
> ```html
> <mud-button>
>   <mud-icon slot="leading-icon" name="check"></mud-icon>
>   <button>Save</button>
> </mud-button>
> ```
> The default-slot validation must therefore look for the first `<button>` / `<a>` child (any position), not strictly `firstElementChild`. Update the render guard:
> ```ts
> const root = Array.from(this.host.children).find(
>   el => BUTTON_TAGS.includes(el.tagName.toLowerCase()),
> );
> if (!root) {
>   const firstTag = this.host.firstElementChild?.tagName?.toLowerCase() ?? '';
>   return <Host>{invalidSlottedTag(firstTag, BUTTON_TAGS)}</Host>;
> }
> ```
> And update `mirrorAriaStateToSlottedRoot` + `warnIfIconOnlyMissingLabel` to use the same lookup helper.

### Step 5 — Append exports to `src/index.ts`
After the existing `mud-spinner` export block:
```ts
export { CorButton } from './components/mud-button/mud-button';
export {
  BUTTON_SIZES,
  BUTTON_VARIANTS,
  BUTTON_SHAPES,
} from './components/mud-button/mud-button.types';
export type {
  ButtonSize,
  ButtonVariant,
  ButtonShape,
} from './components/mud-button/mud-button.types';
```

### Step 6 — Storybook smoke
```powershell
yarn dx:stencil:once
yarn sp.dev
```
Visit `http://localhost:6007/iframe.html?id=atoms-button--default` and confirm no console errors, the dual-ring focus appears on Tab, and the loading toggle renders the spinner overlay.

### Step 7 — Dispatch `parallel-aux-tasks` (skill)
Single message, full-5 subagent set in `parallel-write` mode:
- `pixel-perfect-verifier` (read-only): diff vs Figma nodes `653:19205`–`653:19304`, `653:21100`, `653:21110`, `653:19116/19120/19124/19128` — **light mode only** for this PR.
- `a11y-verifier` (read-only): WCAG 2.1 AA — keyboard, focus contrast, label contrast, ARIA reflection, reduced-motion.
- `story-writer` (parallel-write): writes `mud-button.stories.ts` per § "Stories".
- `test-writer` (parallel-write): writes `mud-button.spec.tsx` per § "Tests".
- `integration-checker` (read-only): confirms `src/index.ts` exports added; greps `mud-button` usages; flags legacy consumers as out-of-scope.

---

## Stories (`mud-button.stories.ts`)

Use [mud-spinner.stories.ts](src/components/mud-spinner/mud-spinner.stories.ts) as the formatting reference (CSF3, `@storybook/web-components-vite`, template literals via `/*html*/`). Required stories:

| Story | What it shows |
|---|---|
| `Default` | Single button with all argTypes controls; `docs.source.type: 'dynamic'` so the snippet updates with controls. |
| `AllVariants` | 5 buttons in a row, all `size='md' shape='rectangular'`, each with the variant name caption. |
| `AllSizes` | 3 buttons in a row, all `variant='primary'`. |
| `AllShapes` | `rectangular` next to `circular` (the circular cell uses an `icon-only` slot so it renders as a circle). |
| `SlotVariations` | 4 cells: text-only, leading-icon, trailing-icon, icon-only — all `variant='primary' size='md'`. |
| `States` | 6 cells for `primary md`: default, hover (forced via `pseudo-states` addon or a `data-force-hover` class + duplicated CSS), active, focus, loading, disabled. |
| `AllStatesTable` | 5 × 6 matrix (variant × state). `tags: ['!autodocs']`. This is the canonical pixel-perfect target. |
| `LoadingPlayground` | One button with a `loading` toggle bound via Storybook controls. |
| `IconOnlyA11yWarning` | An `icon-only` button without `aria-label`; documents that the console will warn. `tags: ['!autodocs']`. |
| `CoverageGuard` | Mirrors [mud-spinner.stories.ts:158-171](src/components/mud-spinner/mud-spinner.stories.ts#L158-L171) verbatim — change selector to `mud-button` and ensure default-slot `<button>` is present. |
| `ReducedMotion` | Wrapper overrides `--mud-button-container-transition-duration: 0ms`; demonstrates the static state. |

For forced-state stories, if [storybook-addon-pseudo-states](https://storybook.js.org/addons/storybook-addon-pseudo-states) is not installed, use this trick: add a `data-force-state="hover"` attribute on the slotted `<button>` and a CSS rule in the story's `<style>` block: `[data-force-state="hover"] { /* duplicate the :hover declarations */ }`. The story-writer subagent should pick whichever approach is already present in the project — if neither, use the data-attribute fallback.

---

## Tests (`test/mud-button.spec.tsx`)

Use [mud-spinner.spec.tsx](src/components/mud-spinner/test/mud-spinner.spec.tsx) as the formatting reference. `@stencil/vitest` + `render(<jsx>)`. Coverage target ≥ 80% on `mud-button.tsx`.

Required cases:
```ts
import { render, h, describe, it, expect, vi } from '@stencil/vitest';
import '../mud-button';
import { BUTTON_SIZES, BUTTON_VARIANTS, BUTTON_SHAPES } from '../mud-button.types';

describe('mud-button', () => {
  // — Rendering & prop reflection —
  it('renders with defaults', async () => {
    const { root } = await render(<mud-button><button>Hi</button></mud-button>);
    expect(root?.getAttribute('variant')).toBe('primary');
    expect(root?.getAttribute('size')).toBe('md');
    expect(root?.getAttribute('shape')).toBe('rectangular');
  });
  it.each(BUTTON_VARIANTS)('reflects variant="%s"', async v => { /* … */ });
  it.each(BUTTON_SIZES)('reflects size="%s"', async s => { /* … */ });
  it.each(BUTTON_SHAPES)('reflects shape="%s"', async sh => { /* … */ });

  // — Default-slot validation —
  it('renders the slotted <button>', async () => { /* … */ });
  it('renders the slotted <a>', async () => { /* … */ });
  it('renders fallback string for invalid slotted tag', async () => {
    const { root } = await render(<mud-button><p>x</p></mud-button>);
    expect(root?.textContent).toContain('is invalid');
  });

  // — Disabled / loading mirroring —
  it('mirrors aria-disabled to slotted root when disabled', async () => { /* assert slotted button has aria-disabled="true" */ });
  it('mirrors aria-busy to slotted root when loading', async () => { /* assert aria-busy="true" */ });
  it('renders mud-spinner overlay when loading', async () => {
    const { root } = await render(<mud-button loading={true}><button>x</button></mud-button>);
    const spinner = root?.shadowRoot?.querySelector('mud-spinner');
    expect(spinner).toBeTruthy();
  });
  it.each([
    ['sm', 'xs'],
    ['md', 'sm'],
    ['lg', 'sm'],
  ])('maps button size=%s to spinner size=%s', async (btnSize, spinSize) => { /* … */ });
  it.each([
    ['primary', 'light'],
    ['secondary', 'brand'],
    ['strict', 'light'],
    ['neutral', 'dark'],
    ['destructive', 'light'],
  ])('maps variant=%s to spinner variant=%s', async (v, sv) => { /* … */ });

  // — Slot detection —
  it('adds .has-leading when leading-icon slot has content', async () => { /* … */ });
  it('adds .has-trailing when trailing-icon slot has content', async () => { /* … */ });
  it('adds .is-icon-only when icon-only slot has content', async () => { /* … */ });

  // — A11y warning —
  it('warns when icon-only button has no accessible name', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await render(
      <mud-button>
        <mud-icon slot="icon-only" name="check" />
        <button></button>
      </mud-button>,
    );
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('icon-only button is missing an accessible name'));
    warn.mockRestore();
  });

  // — Coverage guard parity with spinner —
  it('constructs without registering a host when registerHost=false', () => {
    const Ctor = customElements.get('mud-button') as unknown as new (registerHost: boolean) => unknown;
    expect(Ctor).toBeTruthy();
    expect(new Ctor(false)).toBeTruthy();
  });
});
```

---

## Acceptance criteria

**Visual** (light mode only this PR):
- `mcp__image-compare__compare_images` diff < 0.5% for every variant × state × size × shape × slot-configuration node listed in § "Step 7".

**Functional**:
- Slotted `<button>`/`<a>` receives native `click`; invalid root renders fallback string.
- `disabled` blocks click + mirrors to slotted root; `loading` blocks click + sets `aria-busy`.
- `:focus-visible` dual ring shows on keyboard focus only (Tab), not mouse click.
- Text truncates with ellipsis at one line; `min-width` 52/56/72 px enforces baseline.

**A11y (WCAG 2.1 AA)**:
- Accessible name on every interactive element; icon-only without `aria-label` triggers dev warning (SC 2.5.3, 4.1.2).
- Keyboard parity — Tab focuses, Enter/Space activates natively (SC 2.1.1).
- Focus ring ≥ 3:1 vs adjacent surfaces (SC 2.4.7, 1.4.11).
- Text contrast ≥ 4.5:1 per variant per state via `yarn audit:contrast` (SC 1.4.3).
- ARIA reflects state: `aria-disabled`, `aria-busy` (SC 4.1.2).
- Touch target ≥ 48 px (md/lg); sm (32 px) extended to 40×40 via invisible `::before` (SC 2.5.5).
- `prefers-reduced-motion` disables transitions (SC 2.3.3).

**Quality**:
- `yarn tokens.build` exit 0
- `yarn tokens.validate` exit 0
- `yarn audit:contrast` exit 0
- `yarn lint` + `yarn lint.css` exit 0
- `yarn test` exit 0 with ≥ 80% coverage on `mud-button.tsx`
- `yarn sp.build` exit 0

---

## Migration map (for PR description)

| Legacy variant | New variant |
|---|---|
| `primary` | `primary` |
| `primary-gray` | `strict` |
| `primary-promo` | _(no equivalent — drop or flag as gap)_ |
| `secondary` | `secondary` |
| `secondary-gray` | `neutral` |
| `tertiary` | `neutral` |
| `ghost` | _(no equivalent — drop or flag as gap)_ |
| `positive` | _(no equivalent in this PR — Outlined/Text covers it later)_ |
| `positive-active` | _(same)_ |
| `negative` | `destructive` |
| `negative-active` | `destructive` |

| Legacy size | New size |
|---|---|
| `tiny` | _(dropped — no Figma equivalent)_ |
| `small` | `sm` |
| `medium` | `md` |
| `large` | `lg` |

| Legacy prop | New prop |
|---|---|
| `iconOnly: boolean` | _(removed — derived from `icon-only` slot; combine with `shape="circular"` for a round button)_ |

CSS-var rename: `--button-*` → `--mud-button-*`. List the deprecation in the PR body.

---

## Verification (run from repo root, PowerShell)

```powershell
yarn tokens.build
yarn tokens.validate
yarn audit:contrast
yarn lint
yarn lint.css
yarn test
yarn sp.dev    # background — visit http://localhost:6007
```

Browser checks (manual, via Playwright MCP if scripted):
1. `?path=/story/atoms-button--all-states-table` — pixel-diff vs Figma `653:19201`.
2. `?path=/story/atoms-button--slot-variations` — Tab through each cell, confirm dual-ring focus.
3. `?path=/story/atoms-button--loading-playground` — toggle `loading`, confirm `aria-busy` and spinner.
4. `?path=/story/atoms-button--icon-only-a-11-y-warning` — open DevTools console, confirm `console.warn` fires.
5. OS-level `prefers-reduced-motion: reduce` (or the `ReducedMotion` story) — spinner static.

Open the PR as **draft** with the migration map above pasted into the body. The actual legacy-consumer migrations (`mud-calendar`, `mud-modal`, `mud-pagination-go-to`, `mud-upload-area`) are separate follow-up PRs and not part of this scope.
