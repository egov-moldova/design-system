# cor-radio-button-group



<!-- Auto Generated Below -->


## Overview

Radio button group component - organizes multiple radio buttons in vertical or horizontal layouts with keyboard navigation.

## Properties

| Property            | Attribute     | Description                                                  | Type                                                                             | Default                                |
| ------------------- | ------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------- | -------------------------------------- |
| `disabled`          | `disabled`    | Disabled state propagated to all child radio buttons         | `boolean \| undefined`                                                           | `undefined`                            |
| `gap`               | `gap`         | Custom gap override (CSS value)                              | `string \| undefined`                                                            | `undefined`                            |
| `helperText`        | `helper-text` | Helper text displayed below the group                        | `string \| undefined`                                                            | `undefined`                            |
| `invalid`           | `invalid`     | Invalid state propagated to all child radio buttons          | `boolean \| undefined`                                                           | `undefined`                            |
| `legend`            | `legend`      | Group label (renders as legend)                              | `string \| undefined`                                                            | `undefined`                            |
| `name` _(required)_ | `name`        | Shared name attribute for all child radio buttons (required) | `string`                                                                         | `undefined`                            |
| `orientation`       | `orientation` | Layout orientation                                           | `RadioButtonGroupOrientation.HORIZONTAL \| RadioButtonGroupOrientation.VERTICAL` | `RadioButtonGroupOrientation.VERTICAL` |
| `size`              | `size`        | Size propagated to all child radio buttons                   | `RadioButtonSize.MD \| RadioButtonSize.SM \| undefined`                          | `undefined`                            |
| `value`             | `value`       | Selected radio button value (controlled mode)                | `string \| undefined`                                                            | `undefined`                            |


## Events

| Event       | Description                                                   | Type                  |
| ----------- | ------------------------------------------------------------- | --------------------- |
| `corChange` | Emitted when radio button selection changes (controlled mode) | `CustomEvent<string>` |


## Slots

| Slot | Description                                |
| ---- | ------------------------------------------ |
|      | Default slot for cor-radio-button elements |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
