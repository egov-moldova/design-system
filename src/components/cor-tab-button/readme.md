# cor-tab-button



<!-- Auto Generated Below -->


## Overview

A tab button segment used inside `cor-tabs`. Supports 3 visual styles, 3 sizes,
and multiple states: selected, disabled, error, skeleton.

## Properties

| Property    | Attribute    | Description                                                             | Type                                                       | Default            |
| ----------- | ------------ | ----------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------ |
| `disabled`  | `disabled`   | Whether this tab is disabled (not interactive).                         | `boolean`                                                  | `false`            |
| `iconLabel` | `icon-label` | Accessible label for icon-only tabs. Required when iconOnly is true.    | `string \| undefined`                                      | `undefined`        |
| `iconOnly`  | `icon-only`  | Whether this tab is icon-only (no text label).                          | `boolean`                                                  | `false`            |
| `selected`  | `selected`   | Whether this tab is currently selected/active.                          | `boolean`                                                  | `false`            |
| `size`      | `size`       | Visual size of the tab button.                                          | `TabSize.LG \| TabSize.MD \| TabSize.SM`                   | `TabSize.MD`       |
| `skeleton`  | `skeleton`   | Whether to render the tab in skeleton loading state.                    | `boolean`                                                  | `false`            |
| `tabStyle`  | `tab-style`  | Visual style variant matching the parent cor-tabs style.                | `TabStyle.STYLE_1 \| TabStyle.STYLE_2 \| TabStyle.STYLE_3` | `TabStyle.STYLE_1` |
| `value`     | `value`      | Unique identifier for this tab, used in the corTabSelect event payload. | `string`                                                   | `''`               |


## Events

| Event          | Description | Type                              |
| -------------- | ----------- | --------------------------------- |
| `corTabSelect` |             | `CustomEvent<{ value: string; }>` |


## Slots

| Slot           | Description                        |
| -------------- | ---------------------------------- |
|                | Label content (text, default slot) |
| `"icon-left"`  | Leading icon content               |
| `"icon-right"` | Trailing icon content              |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
