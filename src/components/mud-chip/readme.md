# mud-chip



<!-- Auto Generated Below -->


## Overview

Chip — compact, pill-shaped control for filter selection or token display.

Pattern B (atom-interactive): renders its own `<button>` inside shadow DOM
so it participates in tab order and exposes a real accessible role.

Two modes:
- `type="filter"` (default) — toggleable filter chip. Click flips `selected`
  and emits `mudSelect`. Best used inside a chip group for mono- or
  multi-selection filtering.
- `type="input"` — a discrete value entered by a user (e.g. a tag inside
  a search field). When `removable`, a trailing close button is rendered;
  activating it emits `mudRemove`.

## Properties

| Property        | Attribute        | Description                                                                                                                                                                                                                                        | Type                  | Default     |
| --------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ----------- |
| `count`         | `count`          | Optional numeric badge rendered after the label (e.g. a result count). The badge colour inverts with the chip surface so it stays legible in both the default and selected states. Omit (or pass a non-number) to hide it.                         | `number \| undefined` | `undefined` |
| `disabled`      | `disabled`       | Disables interactivity. Reflects `aria-disabled` and removes the chip from pointer/keyboard activation paths.                                                                                                                                      | `boolean`             | `false`     |
| `label`         | `label`          | Accessible-name fallback. Used as `aria-label` on the internal `<button>` when the default slot is empty (and no explicit `aria-label` is set). Does NOT render visible text — use the default slot for that. Matches the `mud-button` convention. | `string \| undefined` | `undefined` |
| `removable`     | `removable`      | When `type="input"`, renders a trailing close button that emits `mudRemove` on activation. Ignored when `type="filter"`.                                                                                                                           | `boolean`             | `false`     |
| `selected`      | `selected`       | Selected state for `type="filter"`. Ignored when `type="input"`.                                                                                                                                                                                   | `boolean`             | `false`     |
| `selectionMode` | `selection-mode` | Selection behaviour for `type="filter"`. In `multi` mode a leading ✓ is rendered automatically when `selected` (no need to slot a checkmark icon). Ignored when `type="input"`.                                                                    | `"mono" \| "multi"`   | `'mono'`    |
| `size`          | `size`           | Visual size rung.                                                                                                                                                                                                                                  | `"md" \| "sm"`        | `'md'`      |
| `type`          | `type`           | Behavioral mode. - `filter` — toggle on click, emits `mudSelect` - `input` — represents a user-entered value; combine with `removable` for a trailing × button                                                                                     | `"filter" \| "input"` | `'filter'`  |


## Events

| Event       | Description                                                                    | Type                                 |
| ----------- | ------------------------------------------------------------------------------ | ------------------------------------ |
| `mudRemove` | Fires when the user activates the remove button on a `type="input"` chip.      | `CustomEvent<void>`                  |
| `mudSelect` | Fires when `type="filter"` is toggled. Payload reports the new selected state. | `CustomEvent<ChipSelectEventDetail>` |


## Slots

| Slot           | Description                                                                                                                                                                   |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|                | (default) The label content. Plain text or rich inline content.         Falls back to the `label` prop when empty.                                                            |
| `"avatar"`     | Optional leading avatar (`mud-avatar` or `<img>`), rendered         flush to the leading edge and sized to ~chip height. Best for         `type="input"` person/entity chips. |
| `"icon-start"` | Optional leading visual: `mud-icon` or any 20×20 element.         Inherits text color via `currentColor`.                                                                     |


## Shadow Parts

| Part      | Description |
| --------- | ----------- |
| `"count"` |             |


## Dependencies

### Depends on

- [mud-icon](../mud-icon)

### Graph
```mermaid
graph TD;
  mud-chip --> mud-icon
  style mud-chip fill:#f9f,stroke:#333,stroke-width:4px
```

----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
