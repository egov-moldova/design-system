---
name: carbon-icons
description: Use when implementing any Stencil component that includes a standard UI icon. Use `cor-icon` for Carbon or local icons, apply token-based size and color, and follow slot and `currentColor` patterns instead of inline SVG.
---

# Carbon Icons

## Rules

- Use `<cor-icon>` for standard UI icons.
- Do not inline `<svg>` for standard icons.
- Do not extract standard UI icons from Figma.
- Use `carbon:` prefix for Carbon icons when writing literal icon names.
- When the repo provides shared icon constants such as `ICON_NAMES.ADD`, pass that constant directly to `name`.
- Use plain names only for icons already added to local icon assets.

## Use

- Inside buttons, use `color="currentColor"`.
- For standalone icons, pass a semantic color token following the Figma 4-part scheme `--color-icon-{role}-{variant}` (e.g. `--color-icon-brand-default`, `--color-icon-danger-default`).
- Use token sizes via the `size` prop.
- Keep icon color aligned with adjacent text.
- Ensure interactive icon affordances remain accessible.

## TSX Pattern

- For internal component rendering and stories, prefer names from `src/components/cor-icon/assets/carbon-icon-names.json`.
- Pass constants such as `ICON_NAMES.ADD` directly to `name`.
- Do not hardcode raw icon strings in TSX or stories when a shared constant exists.

## Slots

- For components with icon slots, pass `<cor-icon>` through slots such as `icon-left` and `icon-right`.
- Style slotted icons through the host and CSS custom properties; do not target internal `svg` markup from outside `cor-icon`.

## Where To Look

- `src/components/cor-icon/`
- `src/components/cor-icon/assets/carbon-icon-names.json`
- `src/components/cor-icon/assets/local-icons.json`
