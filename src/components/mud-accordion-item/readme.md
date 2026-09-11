# mud-accordion-item



<!-- Auto Generated Below -->


## Overview

Accordion item — a single collapsible row inside `mud-accordion`.

Pattern B (atom-interactive): renders its own header `<button>` and a
`<div role="region">` panel inside shadow DOM. The container manages
exclusivity in `mode="single"`; the item owns its visual state.

Disabled state and slotted content: this component never writes `disabled`
onto elements you slot into it. That attribute is yours, and a component that
writes into it cannot tell your value from its own — which is how an
independently disabled control used to come back enabled when the item was
re-enabled (issue #17). While the item is disabled, slotted header content is
dimmed and made non-interactive from this component's own shadow DOM instead.

Three slots, two mechanisms, and they do not cover the same ground. The
stylesheet dims (`opacity` plus `filter: grayscale(1)`) and blocks the mouse
on `heading`, `supporting` and `trailing` alike. `inert` — which is what
closes the KEYBOARD, since a disabled native `<button>` does not disable its
flat-tree slotted descendants — is applied to the `trailing` wrapper only.
Measured: with `heading` and `supporting` inert too, the header button loses
its accessible name entirely in Chromium's accessibility tree. So a focusable
control slotted into those two stays Tab-reachable while the item is disabled;
put controls in `trailing`, where the slot documentation already points them.

Override the dim's opacity with the `--accordion-item-slotted-opacity-disabled`
custom property (default `0.5`); the grayscale and the pointer guard are not
overridable. Note the `filter` also establishes a stacking context on each
slotted header element while the item is disabled.

## Properties

| Property         | Attribute         | Description                                                                                                                                                                                                                                                                    | Type                         | Default     |
| ---------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------- | ----------- |
| `appearance`     | `appearance`      | Visual treatment. - `default` — flat header, neutral background - `trail-sites` — open header gets a brand-tint background per Figma "Trail Sites"  Set by the parent `mud-accordion` via attribute; consumers should set `appearance` on the parent, not on individual items. | `"default" \| "trail-sites"` | `'default'` |
| `breakpoint`     | `breakpoint`      | Layout breakpoint (desktop ≥ 768px, mobile below). Owned by the parent `mud-accordion`, which assigns it on load and on every viewport crossing — setting it on an item is overwritten. Configure it on the parent instead.                                                    | `"desktop" \| "mobile"`      | `'desktop'` |
| `disabled`       | `disabled`        | Marks the item non-interactive. Header receives `aria-disabled`.                                                                                                                                                                                                               | `boolean`                    | `false`     |
| `heading`        | `heading`         | Header text. Overridden by the `heading` slot when provided.                                                                                                                                                                                                                   | `string \| undefined`        | `undefined` |
| `iconPosition`   | `icon-position`   | Trigger-icon placement relative to the header content. Set by the parent `mud-accordion`.                                                                                                                                                                                      | `"left" \| "right"`          | `'right'`   |
| `itemId`         | `item-id`         | Stable identifier used by the parent `mud-accordion` when emitting `mudChange`. Auto-generated if omitted.                                                                                                                                                                     | `string \| undefined`        | `undefined` |
| `open`           | `open`            | Whether the item is currently expanded.                                                                                                                                                                                                                                        | `boolean`                    | `false`     |
| `size`           | `size`            | Visual size rung — controls header height, font size, icon size, padding. Set by the parent `mud-accordion` via `size`; consumers should configure size at the container level.                                                                                                | `"md" \| "sm"`               | `'md'`      |
| `supportingText` | `supporting-text` | Secondary text shown beneath the heading. Overridden by the `supporting` slot.                                                                                                                                                                                                 | `string \| undefined`        | `undefined` |


## Events

| Event                 | Description                                                                                                                                                                                                   | Type                                              |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `mudAccordionItemKey` | Emitted on Arrow/Home/End keypress on the header. Consumed by the parent `mud-accordion` to implement WAI-ARIA Accordion Pattern traversal. Internal contract — consumers typically don't subscribe directly. | `CustomEvent<{ key: string; itemId: string; }>`   |
| `mudToggle`           | Emitted after the item has already toggled itself. The parent `mud-accordion` reacts by collapsing the other items in `mode="single"`; it cannot refuse or reverse this item's own change.                    | `CustomEvent<{ open: boolean; itemId: string; }>` |


## Methods

### `focusHeader() => Promise<void>`

Returns the focusable header element so the parent can implement the
Arrow/Home/End traversal contract from WAI-ARIA Accordion Pattern.

#### Returns

Type: `Promise<void>`



### `setOpen(open: boolean) => Promise<void>`

Programmatically toggle the item. Bypasses the click pipeline so the
parent `mud-accordion` does not receive a `mudToggle` event — used by
the parent itself to coordinate `mode="single"` exclusivity.

#### Parameters

| Name   | Type      | Description |
| ------ | --------- | ----------- |
| `open` | `boolean` |             |

#### Returns

Type: `Promise<void>`




## Slots

| Slot           | Description                                                                                                                                                                                                  |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
|                | (default) Panel body. Always in the DOM; the panel carries `hidden` while the item is closed, so slotted media still loads when collapsed.                                                                   |
| `"heading"`    | Optional rich heading content. Overrides the `heading` prop.                                                                                                                                                 |
| `"icon-start"` | Optional leading icon (`mud-icon` recommended).                                                                                                                                                              |
| `"supporting"` | Optional supporting text. Overrides the `supportingText` prop.                                                                                                                                               |
| `"trailing"`   | Optional trailing content (`mud-badge`, `mud-button`, label).             Sits between the heading group and the open/close trigger.             Made inert while the item is disabled — see the note above. |


## Shadow Parts

| Part       | Description                          |
| ---------- | ------------------------------------ |
| `"header"` | The button that toggles open/closed. |
| `"panel"`  | The region revealed when open.       |


## Dependencies

### Used by

 - [mud-accordion](../mud-accordion)

### Graph
```mermaid
graph TD;
  mud-accordion --> mud-accordion-item
  style mud-accordion-item fill:#f9f,stroke:#333,stroke-width:4px
```

----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
