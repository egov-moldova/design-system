# cor-column-action



<!-- Auto Generated Below -->


## Overview

Interactive icon button for table column headers.
Used for actions like sorting, filtering, and menus within cor-column.

## Properties

| Property        | Attribute         | Description                                                                                   | Type                  | Default     |
| --------------- | ----------------- | --------------------------------------------------------------------------------------------- | --------------------- | ----------- |
| `active`        | `active`          | Sets the action button to active state                                                        | `boolean`             | `false`     |
| `disabled`      | `disabled`        | Disables the action button                                                                    | `boolean`             | `false`     |
| `hideFocusRing` | `hide-focus-ring` | Whether to hide the focus ring when focused. When true, focus still bubbles to parent column. | `boolean`             | `false`     |
| `tabbable`      | `tabbable`        | Whether the action button is tabbable (can receive keyboard focus via Tab)                    | `boolean`             | `true`      |
| `type`          | `type`            | Optional semantic type for analytics/debugging (not used for styling)                         | `string \| undefined` | `undefined` |


## Events

| Event           | Description                                                        | Type                      |
| --------------- | ------------------------------------------------------------------ | ------------------------- |
| `corAction`     | Emitted when the action button is clicked                          | `CustomEvent<MouseEvent>` |
| `corActionBlur` | Emitted when the action button loses focus or click-outside occurs | `CustomEvent<void>`       |


## Slots

| Slot | Description                            |
| ---- | -------------------------------------- |
|      | Default slot for cor-icon element only |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
