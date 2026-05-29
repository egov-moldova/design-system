# mud-button-group



<!-- Auto Generated Below -->


## Overview

Button group — layout container for stacking multiple `mud-button` elements
with consistent spacing (12px gap) per the AGE Design System.

Pure layout primitive: does not propagate props to children, does not emit
events, does not manage focus order beyond the natural DOM tab sequence.
Each child `mud-button` controls its own size, variant, and full-width
behavior independently.

## Properties

| Property      | Attribute     | Description                                                                                                                                                                                                    | Type                         | Default        |
| ------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | -------------- |
| `label`       | `label`       | Accessible name for the group. Forwarded to `aria-label` on the host element so assistive technologies announce the buttons as a unit (e.g. "Form actions").                                                   | `string \| undefined`        | `undefined`    |
| `orientation` | `orientation` | Axis along which buttons are stacked. `horizontal` lays out children in a row; `vertical` stacks them in a column and stretches each child to the group's inline-size (so children with `full-width` fill it). | `"horizontal" \| "vertical"` | `'horizontal'` |


## Slots

| Slot | Description                                                                                                                  |
| ---- | ---------------------------------------------------------------------------------------------------------------------------- |
|      | (default) One or more `mud-button` elements (or any inline content         that should share the group's spacing semantics). |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
