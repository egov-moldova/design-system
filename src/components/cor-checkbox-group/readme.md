# cor-checkbox-group



<!-- Auto Generated Below -->


## Overview

Checkbox group component - organizes multiple checkboxes in vertical, horizontal, or multi-column layouts.

## Properties

| Property      | Attribute     | Description                                                                                                                | Type                                                                                                     | Default                             |
| ------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| `columns`     | `columns`     | Number of columns for multi-column vertical layout                                                                         | `number`                                                                                                 | `1`                                 |
| `disabled`    | `disabled`    | Disabled state propagated to all child checkboxes                                                                          | `boolean \| undefined`                                                                                   | `undefined`                         |
| `gap`         | `gap`         | Custom gap override (CSS value)                                                                                            | `string \| undefined`                                                                                    | `undefined`                         |
| `helperText`  | `helper-text` | Helper text displayed below the group                                                                                      | `string \| undefined`                                                                                    | `undefined`                         |
| `invalid`     | `invalid`     | Invalid state propagated to all child checkboxes                                                                           | `boolean \| undefined`                                                                                   | `undefined`                         |
| `legend`      | `legend`      | Group label (renders as legend)                                                                                            | `string \| undefined`                                                                                    | `undefined`                         |
| `name`        | `name`        | Shared name attribute for all child checkboxes                                                                             | `string \| undefined`                                                                                    | `undefined`                         |
| `orientation` | `orientation` | Layout orientation                                                                                                         | `"horizontal" \| "vertical" \| CheckboxGroupOrientation.HORIZONTAL \| CheckboxGroupOrientation.VERTICAL` | `CheckboxGroupOrientation.VERTICAL` |
| `size`        | `size`        | Size propagated to all child checkboxes                                                                                    | `string \| undefined`                                                                                    | `undefined`                         |
| `value`       | `value`       | Array of selected checkbox values (controlled mode). When set via HTML attribute, accepts a JSON string: value='["a","b"]' | `string \| string[] \| undefined`                                                                        | `undefined`                         |


## Events

| Event       | Description                                               | Type                    |
| ----------- | --------------------------------------------------------- | ----------------------- |
| `corChange` | Emitted when checkbox selection changes (controlled mode) | `CustomEvent<string[]>` |


## Slots

| Slot | Description                            |
| ---- | -------------------------------------- |
|      | Default slot for cor-checkbox elements |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
