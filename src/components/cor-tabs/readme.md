# cor-tabs



<!-- Auto Generated Below -->


## Overview

Tab container. Wraps `cor-tab-button` segments and propagates shared props.
Emits `corTabChange` when a child tab is selected — does NOT manage active state internally.

## Properties

| Property   | Attribute   | Description                                                                                                                                                      | Type                                                       | Default            |
| ---------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------ |
| `disabled` | `disabled`  | Disables all child tab buttons.                                                                                                                                  | `boolean`                                                  | `false`            |
| `error`    | `error`     | Container-level error indicator (e.g. red border on the tabs container).                                                                                         | `boolean`                                                  | `false`            |
| `label`    | `label`     | Accessible label for the tab list. Required for accessibility.                                                                                                   | `string \| undefined`                                      | `undefined`        |
| `size`     | `size`      | Size applied to all child tab buttons.                                                                                                                           | `TabSize.LG \| TabSize.MD \| TabSize.SM`                   | `TabSize.MD`       |
| `tabStyle` | `tab-style` | Visual style variant for all child tab buttons.                                                                                                                  | `TabStyle.STYLE_1 \| TabStyle.STYLE_2 \| TabStyle.STYLE_3` | `TabStyle.STYLE_1` |
| `value`    | `value`     | Value of the currently selected tab. Propagated to children as `selected`. When set, the matching child (by `value`) gets `selected`, all others are unselected. | `string`                                                   | `''`               |


## Events

| Event          | Description | Type                              |
| -------------- | ----------- | --------------------------------- |
| `corTabChange` |             | `CustomEvent<{ value: string; }>` |


## Slots

| Slot | Description                           |
| ---- | ------------------------------------- |
|      | One or more `cor-tab-button` elements |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
