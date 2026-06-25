# mud-separator



<!-- Auto Generated Below -->


## Overview

Separator — visual divider between groups of content or UI components.

Pattern B (atom-visual): renders a 1D rule, optionally with an inline label.
No events, no interactivity. ARIA `separator` semantics.

## Properties

| Property      | Attribute     | Description                                                                                                                                                                                           | Type                                            | Default        |
| ------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | -------------- |
| `ariaLabel`   | `aria-label`  | Accessible label for screen readers. Most separators are decorative and do not need this; provide it only when the separator conveys a discrete semantic boundary that benefits from an announcement. | `string \| undefined`                           | `undefined`    |
| `inset`       | `inset`       | Adds outer spacing on the cross axis. Typical when the separator sits between items in a list or menu.                                                                                                | `boolean`                                       | `false`        |
| `label`       | `label`       | Optional plain-text label rendered inline at the center of the separator. For richer label content (e.g. an icon plus text), use the default slot instead.                                            | `string \| undefined`                           | `undefined`    |
| `orientation` | `orientation` | Layout orientation of the separator.                                                                                                                                                                  | `"horizontal" \| "vertical"`                    | `'horizontal'` |
| `size`        | `size`        | Visual thickness of the rule.                                                                                                                                                                         | `"extra-thin" \| "medium" \| "thick" \| "thin"` | `'thin'`       |
| `variant`     | `variant`     | Color treatment / emphasis.                                                                                                                                                                           | `"mild" \| "strong" \| "subtle"`                | `'subtle'`     |


## Slots

| Slot | Description                                                                                                                   |
| ---- | ----------------------------------------------------------------------------------------------------------------------------- |
|      | Optional rich label content (e.g. icon + text). Use either the   `label` prop for plain text or this slot for richer content. |


## Shadow Parts

| Part       | Description |
| ---------- | ----------- |
| `"label"`  |             |
| `"layout"` |             |
| `"line"`   |             |


## Dependencies

### Used by

 - [mud-cookie-banner](../mud-cookie-banner)
 - [mud-header-mega-menu](../mud-header)
 - [mud-header-mobile](../mud-header)
 - [mud-sidebar-group](../mud-sidebar)

### Graph
```mermaid
graph TD;
  mud-cookie-banner --> mud-separator
  mud-header-mega-menu --> mud-separator
  mud-header-mobile --> mud-separator
  mud-sidebar-group --> mud-separator
  style mud-separator fill:#f9f,stroke:#333,stroke-width:4px
```

----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
