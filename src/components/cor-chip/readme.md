# cor-chip



<!-- Auto Generated Below -->


## Overview

Chip — compact, pill-shaped control for filter selection or token display.

Pattern B (atom-interactive): renders its own `<button>` inside shadow DOM
so it participates in tab order and exposes a real accessible role.

Two modes:
- `type="filter"` (default) — toggleable filter chip. Click flips `selected`
  and emits `corSelect`. Best used inside a chip group for mono- or
  multi-selection filtering.
- `type="input"` — a discrete value entered by a user (e.g. a tag inside
  a search field). When `removable`, a trailing close button is rendered;
  activating it emits `corRemove`.

## Properties

| Property    | Attribute   | Description                                                                                                                                                                                                                                        | Type                  | Default     |
| ----------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ----------- |
| `disabled`  | `disabled`  | Disables interactivity. Reflects `aria-disabled` and removes the chip from pointer/keyboard activation paths.                                                                                                                                      | `boolean`             | `false`     |
| `label`     | `label`     | Accessible-name fallback. Used as `aria-label` on the internal `<button>` when the default slot is empty (and no explicit `aria-label` is set). Does NOT render visible text — use the default slot for that. Matches the `cor-button` convention. | `string \| undefined` | `undefined` |
| `removable` | `removable` | When `type="input"`, renders a trailing close button that emits `corRemove` on activation. Ignored when `type="filter"`.                                                                                                                           | `boolean`             | `false`     |
| `selected`  | `selected`  | Selected state for `type="filter"`. Ignored when `type="input"`.                                                                                                                                                                                   | `boolean`             | `false`     |
| `size`      | `size`      | Visual size rung.                                                                                                                                                                                                                                  | `"md" \| "sm"`        | `'md'`      |
| `type`      | `type`      | Behavioral mode. - `filter` — toggle on click, emits `corSelect` - `input` — represents a user-entered value; combine with `removable` for a trailing × button                                                                                     | `"filter" \| "input"` | `'filter'`  |


## Events

| Event       | Description                                                                    | Type                                 |
| ----------- | ------------------------------------------------------------------------------ | ------------------------------------ |
| `corRemove` | Fires when the user activates the remove button on a `type="input"` chip.      | `CustomEvent<void>`                  |
| `corSelect` | Fires when `type="filter"` is toggled. Payload reports the new selected state. | `CustomEvent<ChipSelectEventDetail>` |


## Slots

| Slot           | Description                                                                                                           |
| -------------- | --------------------------------------------------------------------------------------------------------------------- |
|                | (default) The label content. Plain text or rich inline content.         Falls back to the `label` prop when empty.    |
| `"icon-start"` | Optional leading visual: `cor-icon`, an avatar, or any         20×20 element. Inherits text color via `currentColor`. |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
