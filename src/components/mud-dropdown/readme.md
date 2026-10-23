# mud-dropdown



<!-- Auto Generated Below -->


## Overview

Dropdown — opens a `mud-menu` from a trigger, as the Figma Menu page draws it
(Dismissal, 430:25768): the menu 4px under the trigger, lined up with its left
edge (or its right edge with `align="end"`).

It closes when the trigger is pressed again, when an item is chosen, on a
press outside it, when focus leaves it, and on Escape — the last two return
focus to the trigger. Opening moves focus to the first item, and ArrowDown /
ArrowUp on the trigger open it too (WAI-ARIA menu button pattern). The menu is
placed with `position: fixed`, so a scrolling container such as a table does
not clip it, and it flips above the trigger and shifts sideways to stay in the
viewport.

The trigger gets `aria-haspopup="menu"` and `aria-expanded`; a `mud-button`
moves both onto its inner control. Give an icon-only trigger an `aria-label`,
and the menu one too.

## Properties

| Property | Attribute | Description                                                                                                    | Type               | Default   |
| -------- | --------- | -------------------------------------------------------------------------------------------------------------- | ------------------ | --------- |
| `align`  | `align`   | Which edge of the trigger the menu lines up with: `start` (Figma) or `end`, for a trigger at the end of a row. | `"end" \| "start"` | `'start'` |
| `open`   | `open`    | Whether the menu is shown. Set it to open or close the menu from outside.                                      | `boolean`          | `false`   |


## Events

| Event       | Description                                          | Type                                |
| ----------- | ---------------------------------------------------- | ----------------------------------- |
| `mudToggle` | Fires when the menu opens or closes, from any cause. | `CustomEvent<DropdownToggleDetail>` |


## Slots

| Slot        | Description                                              |
| ----------- | -------------------------------------------------------- |
|             | The `mud-menu`.                                          |
| `"trigger"` | The control that opens the menu, usually a `mud-button`. |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
